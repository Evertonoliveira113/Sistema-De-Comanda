import { supabase } from './supabaseClient';

export const acompanhamentoService = {
  async create(nome: string, categoria_id: string, ativo = true) {
    const { data, error } = await supabase
      .from('acompanhamentos')
      .insert([{ nome, categoria_id, ativo }])
      .single();
    if (error) throw error;
    return data;
  },

  async listAll() {
    const { data, error } = await supabase
      .from('acompanhamentos')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('acompanhamentos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: { nome?: string; ativo?: boolean; categoria_id?: string }) {
    const { error } = await supabase
      .from('acompanhamentos')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase
      .from('acompanhamentos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Retorna apenas acompanhamentos ativos de uma categoria
  async getByCategoriaAtivos(categoria_id: string) {
    const { data, error } = await supabase
      .from('acompanhamentos')
      .select('nome')
      .eq('categoria_id', categoria_id)
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    // retorna apenas nomes (array de strings)
    return (data || []).map((r: any) => r.nome);
  }
  ,
  // Retorna acompanhamentos (todos) de uma categoria
  async getByCategoria(categoria_id: string) {
    const { data, error } = await supabase
      .from('acompanhamentos')
      .select('*')
      .eq('categoria_id', categoria_id)
      .order('nome');
    if (error) throw error;
    return data || [];
  }
};
