-- Função para sincronizar o estoque automaticamente com base nos itens da comanda
-- 1. LIMPEZA TOTAL DE CONFLITOS
-- Removemos gatilhos antigos que podem estar causando subtração duplicada
DROP TRIGGER IF EXISTS trg_baixar_estoque ON public.comanda_itens;
DROP TRIGGER IF EXISTS tr_sincronizar_estoque ON public.comanda_itens;
DROP TRIGGER IF EXISTS tr_sincronizar_estoque_delete ON public.comanda_itens;
DROP TRIGGER IF EXISTS trg_gerenciar_item_comanda ON public.comanda_itens;
DROP FUNCTION IF EXISTS public.baixar_estoque_item();
DROP FUNCTION IF EXISTS public.proc_gerenciar_item_comanda();

-- 2. FUNÇÃO UNIFICADA
-- Gerencia validação, baixa de estoque e cálculo de total em uma única operação
CREATE OR REPLACE FUNCTION public.proc_gerenciar_item_comanda()
RETURNS TRIGGER AS $func$
DECLARE
    v_estoque_atual INTEGER;
    v_comanda_id UUID;
    v_subtotal_itens DECIMAL;
    v_desconto_atual DECIMAL;
BEGIN
    v_comanda_id := COALESCE(NEW.comanda_id, OLD.comanda_id);

    -- A. VALIDAÇÃO DE ESTOQUE
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.quantidade > OLD.quantidade)) THEN
        SELECT quantidade_atual INTO v_estoque_atual 
        FROM public.estoque WHERE produto_id = NEW.produto_id;

        IF (TG_OP = 'INSERT' AND v_estoque_atual < NEW.quantidade) OR 
           (TG_OP = 'UPDATE' AND v_estoque_atual < (NEW.quantidade - OLD.quantidade)) THEN
            RAISE EXCEPTION 'Estoque insuficiente! Disponível: %', v_estoque_atual;
        END IF;
    END IF;

    -- B. MOVIMENTAÇÃO DE ESTOQUE
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.estoque
        SET quantidade_atual = quantidade_atual - NEW.quantidade
        WHERE produto_id = NEW.produto_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.estoque
        SET quantidade_atual = quantidade_atual + (OLD.quantidade - NEW.quantidade)
        WHERE produto_id = NEW.produto_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.estoque
        SET quantidade_atual = quantidade_atual + OLD.quantidade
        WHERE produto_id = OLD.produto_id;
    END IF;

    -- D. INATIVAR PRODUTO SE ESTOQUE ZEROU
    UPDATE public.produtos
    SET ativo = false
    WHERE id IN (
        SELECT produto_id FROM public.estoque 
        WHERE quantidade_atual <= 0
    );

    -- C. RECALCULO DO TOTAL DA COMANDA
    SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal_itens 
    FROM public.comanda_itens 
    WHERE comanda_id = v_comanda_id;

    SELECT COALESCE(desconto, 0) INTO v_desconto_atual 
    FROM public.comandas 
    WHERE id = v_comanda_id;

    UPDATE public.comandas 
    SET total = GREATEST(0, v_subtotal_itens - v_desconto_atual)
    WHERE id = v_comanda_id;

    RETURN COALESCE(NEW, OLD);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CRIAÇÃO DO TRIGGER
CREATE TRIGGER trg_gerenciar_item_comanda
AFTER INSERT OR UPDATE OR DELETE ON public.comanda_itens
FOR EACH ROW EXECUTE FUNCTION public.proc_gerenciar_item_comanda();