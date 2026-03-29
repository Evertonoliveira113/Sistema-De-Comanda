
-- 1. Tabela de Perfis (Usuários do Sistema)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'garcom')),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Categorias (Existente, mas garantindo)
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  categoria_id UUID REFERENCES categorias(id),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Estoque
CREATE TABLE estoque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE UNIQUE,
  quantidade_atual INTEGER NOT NULL DEFAULT 0,
  quantidade_minima INTEGER NOT NULL DEFAULT 5,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Comandas (Atualizada)
-- Removemos mesa como obrigatório e adicionamos UNIQUE parcial
CREATE TABLE IF NOT EXISTS comandas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_comanda INTEGER NOT NULL,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  total DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  data_abertura TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_fechamento TIMESTAMP WITH TIME ZONE,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint: Apenas uma comanda aberta por número
DROP INDEX IF EXISTS idx_unique_numero_aberta;
CREATE UNIQUE INDEX idx_unique_numero_aberta ON comandas (numero_comanda) WHERE (status = 'aberta');

-- 6. Tabela de Itens da Comanda
CREATE TABLE IF NOT EXISTS comanda_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comanda_id UUID REFERENCES comandas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comanda_id UUID REFERENCES comandas(id),
  valor DECIMAL(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('Dinheiro', 'Pix', 'Cartão')),
  data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FUNÇÃO E TRIGGER PARA BAIXA DE ESTOQUE AUTOMÁTICA
CREATE OR REPLACE FUNCTION baixar_estoque_item()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE estoque 
  SET quantidade_atual = quantidade_atual - NEW.quantidade,
      ultima_atualizacao = NOW()
  WHERE produto_id = NEW.produto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_baixar_estoque ON comanda_itens;

CREATE TRIGGER trg_baixar_estoque
AFTER INSERT ON comanda_itens
FOR EACH ROW
EXECUTE FUNCTION baixar_estoque_item();

-- RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON usuarios;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON usuarios;
DROP POLICY IF EXISTS "Admins podem atualizar usuários" ON usuarios;
DROP POLICY IF EXISTS "Admins podem deletar usuários" ON usuarios;
DROP POLICY IF EXISTS "Admins podem inserir usuários" ON usuarios;
DROP POLICY IF EXISTS "Admins podem gerenciar estoque" ON estoque;
DROP POLICY IF EXISTS "Garçons podem ver estoque" ON estoque;

-- Usuarios policies
CREATE POLICY "Usuários podem ver seus próprios perfis" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins podem ver todos os perfis" ON usuarios FOR SELECT USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins podem atualizar usuários" ON usuarios FOR UPDATE USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins podem deletar usuários" ON usuarios FOR DELETE USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins podem inserir usuários" ON usuarios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
);

-- Estoque policies
CREATE POLICY "Admins podem gerenciar estoque" ON estoque FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Garçons podem ver estoque" ON estoque FOR SELECT USING (auth.role() = 'authenticated');

-- TRIGGER PARA SINCRONIZAR AUTH.USERS COM PUBLIC.USUARIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, role, ativo)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), 
    NEW.email, 
    'garcom', 
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user status
CREATE OR REPLACE FUNCTION public.update_user_status(user_id uuid, is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update in usuarios table
  UPDATE public.usuarios
  SET ativo = is_active
  WHERE id = user_id;
  
  -- If deactivating, also update auth.users banned_until to block access
  IF NOT is_active THEN
    UPDATE auth.users
    SET banned_until = NOW() + INTERVAL '100 years'
    WHERE id = user_id;
  ELSE
    -- If activating, remove ban
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = user_id;
  END IF;
END;
$$;

-- Function to update user name and sync with auth.users metadata
CREATE OR REPLACE FUNCTION public.update_user_name(user_id uuid, new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update in usuarios table
  UPDATE public.usuarios
  SET nome = new_name
  WHERE id = user_id;
  
  -- Also update auth.users metadata (requires admin role)
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{nome}',
    to_jsonb(new_name)
  )
  WHERE id = user_id;
END;
$$;

-- Function to update user role and sync with auth.users
CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new_role NOT IN ('admin', 'garcom') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Update in usuarios table
  UPDATE public.usuarios
  SET role = new_role
  WHERE id = user_id;
  
  -- Also update auth.users app_metadata (requires admin role)
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  )
  WHERE id = user_id;
END;
$$;

-- Function to create new user
CREATE OR REPLACE FUNCTION public.create_new_user(email text, password text, nome text, role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  IF role NOT IN ('admin', 'garcom') THEN
    RAISE EXCEPTION 'Invalid role: %', role;
  END IF;
  
  -- Create user in auth.users
  new_user_id := auth.uid();
  
  -- Note: Direct user creation requires admin privileges
  -- This should be handled by a client-side signup or admin panel
  -- For now, we'll update the trigger to handle this
END;
$$;

-- Function to delete user
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.usuarios WHERE id = user_id;
  
  -- Note: Deleting from auth.users requires different approach
  -- This cascades from the foreign key constraint
END;
$$;
