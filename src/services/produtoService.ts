import { supabase } from './supabaseClient';
import { Product, Category } from '../types/database.types';

export const produtoService = {
  async getProducts() {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, categoria:categorias(*), estoque:estoque(quantidade_minima)')
      .order('nome');
    if (error) throw error;
    
    // Flatten the data for easier use in the UI
    return (data as any[]).map(p => ({
      ...p,
      quantidade_minima: p.estoque?.[0]?.quantidade_minima || 0
    })) as Product[];
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data as Category[];
  },

  async createProduct(product: Partial<Product>) {
    const { 
      quantidade_minima, 
      categoria, 
      estoque, 
      created_at, 
      id,
      ...productData 
    } = product as any;

    const { data, error } = await supabase
      .from('produtos')
      .insert([productData])
      .select();
    
    if (error) throw error;
    
    if (quantidade_minima !== undefined) {
      // O trigger já deve ter criado a entrada no estoque, vamos atualizar o mínimo
      await supabase
        .from('estoque')
        .update({ quantidade_minima })
        .eq('produto_id', data[0].id);
    }
    
    return data[0];
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const { 
      quantidade_minima, 
      categoria, 
      estoque, 
      created_at, 
      id: _id, // Remove id from payload
      ...productData 
    } = updates as any;

    // Garantir que categoria_id seja enviado se presente
    if (updates.categoria_id) {
      productData.categoria_id = updates.categoria_id;
    }

    const { data, error } = await supabase
      .from('produtos')
      .update(productData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }

    if (quantidade_minima !== undefined) {
      const { error: stockError } = await supabase
        .from('estoque')
        .update({ quantidade_minima })
        .eq('produto_id', id);
      
      if (stockError) console.error('Erro ao atualizar estoque mínimo:', stockError);
    }

    return data[0];
  },

  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao excluir produto:', error);
      throw error;
    }
  }
};
