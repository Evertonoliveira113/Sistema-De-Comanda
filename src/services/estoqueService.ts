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
    const { data, error } = await supabase
      .from('estoque')
      .update({ quantidade_atual: quantidade, ultima_atualizacao: new Date().toISOString() })
      .eq('produto_id', produtoId)
      .select();
    if (error) throw error;
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
