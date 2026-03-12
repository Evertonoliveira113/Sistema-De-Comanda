import { supabase } from './supabaseClient';
import { Comanda, ComandaItem, Payment } from '../types/database.types';

export const comandaService = {
  async getActiveComandas() {
    const { data, error } = await supabase
      .from('comandas')
      .select('*')
      .eq('status', 'aberta')
      .order('numero_comanda');
    if (error) throw error;
    return data as Comanda[];
  },

  async getComandaById(id: string) {
    const { data, error } = await supabase
      .from('comandas')
      .select('*, comanda_itens(*, produto:produtos(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async openComanda(numero: number, userId: string) {
    const { data, error } = await supabase
      .from('comandas')
      .insert([{ numero_comanda: numero, usuario_id: userId }])
      .select();
    if (error) throw error;
    return data[0] as Comanda;
  },

  async addItem(comandaId: string, produtoId: string, quantidade: number, precoUnitario: number) {
    const subtotal = quantidade * precoUnitario;
    const { data, error } = await supabase
      .from('comanda_itens')
      .insert([{
        comanda_id: comandaId,
        produto_id: produtoId,
        quantidade,
        preco_unitario: precoUnitario,
        subtotal
      }])
      .select();
    
    if (error) {
      console.error('Erro ao inserir item na comanda:', error);
      throw error;
    }

    // Atualizar total da comanda
    try {
      await this.recalculateTotal(comandaId);
    } catch (e) {
      console.error('Erro ao recalcular total após adicionar item:', e);
      // Não lançamos o erro aqui para não travar a UI se o item foi inserido com sucesso
    }
    
    return data[0];
  },

  async removeItem(itemId: string, comandaId: string) {
    const { error } = await supabase
      .from('comanda_itens')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
    await this.recalculateTotal(comandaId);
  },

  async updateItemQuantity(itemId: string, comandaId: string, novaQuantidade: number, precoUnitario: number) {
    const subtotal = novaQuantidade * precoUnitario;
    const { error } = await supabase
      .from('comanda_itens')
      .update({ quantidade: novaQuantidade, subtotal })
      .eq('id', itemId);
    if (error) throw error;
    await this.recalculateTotal(comandaId);
  },

  async updateDiscount(comandaId: string, desconto: number) {
    const { error } = await supabase
      .from('comandas')
      .update({ desconto })
      .eq('id', comandaId);
    
    if (error) throw error;
    await this.recalculateTotal(comandaId);
  },

  async recalculateTotal(comandaId: string) {
    const { data: comanda, error: comandaError } = await supabase
      .from('comandas')
      .select('desconto')
      .eq('id', comandaId)
      .single();
    
    // Se der erro ao buscar desconto (ex: coluna não existe), assume 0
    const currentDiscount = comandaError ? 0 : (comanda?.desconto || 0);

    const { data: items, error: itemsError } = await supabase
      .from('comanda_itens')
      .select('subtotal')
      .eq('comanda_id', comandaId);
    
    if (itemsError) throw itemsError;

    const subtotal = items.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const total = Math.max(0, subtotal - currentDiscount);

    const { error: updateError } = await supabase
      .from('comandas')
      .update({ total })
      .eq('id', comandaId);
    
    if (updateError) throw updateError;
  },

  async closeComanda(comandaId: string, pagamento: Partial<Payment>) {
    try {
      // 1. Registrar pagamento
      const { error: payError } = await supabase
        .from('pagamentos')
        .insert([{ ...pagamento, comanda_id: comandaId }]);
      if (payError) {
        console.error('Erro ao registrar pagamento:', payError);
        throw payError;
      }

      // 2. Fechar comanda
      const { error: closeError } = await supabase
        .from('comandas')
        .update({ 
          status: 'fechada', 
          data_fechamento: new Date().toISOString() 
        })
        .eq('id', comandaId);
      if (closeError) {
        console.error('Erro ao fechar comanda no banco:', closeError);
        throw closeError;
      }
    } catch (error) {
      console.error('Erro completo no fechamento:', error);
      throw error;
    }
  },

  async cancelComanda(comandaId: string) {
    const { error } = await supabase
      .from('comandas')
      .update({ status: 'cancelada' })
      .eq('id', comandaId);
    if (error) throw error;
  },

  async deleteComanda(comandaId: string) {
    // Itens serão deletados automaticamente por causa do ON DELETE CASCADE
    const { error } = await supabase
      .from('comandas')
      .delete()
      .eq('id', comandaId);
    if (error) throw error;
  }
};
