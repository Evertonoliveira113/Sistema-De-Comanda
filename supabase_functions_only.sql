-- ============================================
-- APENAS AS FUNÇÕES RPC PARA ATUALIZAR
-- Execute este arquivo no SQL Editor do Supabase
-- Se receber erros sobre funções já existentes, ignore (CREATE OR REPLACE é seguro)
-- ============================================

-- DROP old function signatures to avoid conflicts
DROP FUNCTION IF EXISTS public.update_user_status(is_active boolean, user_id uuid);
DROP FUNCTION IF EXISTS public.update_user_name(new_name text, user_id uuid);
DROP FUNCTION IF EXISTS public.update_user_role(new_role text, user_id uuid);

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

-- Function to delete user
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.usuarios WHERE id = user_id;
END;
$$;
