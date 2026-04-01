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
    // Verificar se o produto já existe nesta comanda
    const { data: existingItems, error: checkError } = await supabase
      .from('comanda_itens')
      .select('id, quantidade, preco_unitario')
      .eq('comanda_id', comandaId)
      .eq('produto_id', produtoId)
      .single();
    
    if (!checkError && existingItems) {
      // Produto já existe, apenas incrementa a quantidade
      const novaQuantidade = existingItems.quantidade + quantidade;
      const subtotal = novaQuantidade * existingItems.preco_unitario;
      
      const { error: updateError } = await supabase
        .from('comanda_itens')
        .update({ quantidade: novaQuantidade, subtotal })
        .eq('id', existingItems.id);
      
      if (updateError) throw updateError;
    } else {
      // Produto não existe, cria novo item
      const subtotal = quantidade * precoUnitario;
      const { error: insertError } = await supabase
        .from('comanda_itens')
        .insert([{
          comanda_id: comandaId,
          produto_id: produtoId,
          quantidade,
          preco_unitario: precoUnitario,
          subtotal
        }]);
      
      if (insertError) {
        console.error('Erro ao inserir item na comanda:', insertError);
        throw insertError;
      }
    }
  },

  async removeItem(itemId: string, comandaId: string) {
    const { error } = await supabase
      .from('comanda_itens')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
  },

  async updateItemQuantity(itemId: string, comandaId: string, novaQuantidade: number, precoUnitario: number) {
    const subtotal = novaQuantidade * precoUnitario;
    const { error } = await supabase
      .from('comanda_itens')
      .update({ quantidade: novaQuantidade, subtotal })
      .eq('id', itemId);
    if (error) throw error;
  },

  async updateDiscount(comandaId: string, desconto: number) {
    const { error } = await supabase
      .from('comandas')
      .update({ desconto })
      .eq('id', comandaId);
    
    if (error) throw error;
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
