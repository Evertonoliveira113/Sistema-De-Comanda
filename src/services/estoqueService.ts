import { supabase } from './supabaseClient';
import { Inventory } from '../types/database.types';

export const estoqueService = {
  async getInventory() {
    const { data, error } = await supabase
      .from('estoque')
      .select('*, produto:produtos(nome)')
      .order('quantidade_atual');
    if (error) throw error;
    return data;
  },

  async updateStock(produtoId: string, quantidade: number) {
    // Não permitir valores negativos
    const quantidadeFinal = Math.max(0, quantidade);
    
    const { data, error } = await supabase
      .from('estoque')
      .update({ quantidade_atual: quantidadeFinal, ultima_atualizacao: new Date().toISOString() })
      .eq('produto_id', produtoId)
      .select();
    if (error) throw error;
    
    // Se o estoque zerou, inativar o produto automaticamente
    if (quantidadeFinal <= 0) {
      await supabase
        .from('produtos')
        .update({ ativo: false })
        .eq('id', produtoId);
    }
    
    return data[0];
  },

  async checkLowStock() {
    const { data, error } = await supabase
      .from('estoque')
      .select('*, produto:produtos(nome)');
    
    if (error) throw error;
    
    // Filtragem no JS para evitar problemas de sintaxe de comparação de colunas no Supabase
    return data.filter(item => item.quantidade_atual <= item.quantidade_minima);
  }
};
