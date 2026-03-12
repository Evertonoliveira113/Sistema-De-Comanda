import { supabase } from './supabaseClient';
import { UserProfile } from '../types/database.types';

export const userService = {
  async getProfile(id: string) {
    // Agora buscamos da View 'usuarios' que reflete o auth.users
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as UserProfile;
  },

  async getAllUsers() {
    // A View 'usuarios' permite listar todos os usuários do auth.users
    const { data, error } = await supabase
      .from('usuarios')
      .select('*');
    if (error) throw error;
    return data as UserProfile[];
  },

  async updateUser(id: string, updates: Partial<UserProfile>) {
    if (updates.ativo !== undefined) {
      const { error } = await supabase.rpc('update_user_status', {
        user_id: id,
        is_active: updates.ativo
      });
      if (error) throw error;
    }
    
    if (updates.nome !== undefined) {
      // Atualizar nome nos metadados do usuário
      // Nota: Isso geralmente requer uma função RPC similar se não houver tabela editável
      const { error } = await supabase.rpc('update_user_name', {
        user_id: id,
        new_name: updates.nome
      });
      if (error) {
        console.warn('Falha ao atualizar nome via RPC, tentando via tabela se existir');
      }
    }
    
    return { id, ...updates };
  },

  async createUser(userData: { email: string; password: string; nome: string; role: string }) {
    const { data, error } = await supabase.rpc('create_new_user', {
      email: userData.email,
      password: userData.password,
      nome: userData.nome,
      role: userData.role
    });
    if (error) throw error;
    return data;
  },

  async updateUserRole(id: string, role: string) {
    // Usamos RPC para atualizar o app_metadata no auth.users
    const { error } = await supabase.rpc('update_user_role', {
      user_id: id,
      new_role: role
    });
    if (error) throw error;
  },

  async deleteUser(id: string) {
    const { error } = await supabase.rpc('delete_user', {
      user_id: id
    });
    if (error) throw error;
  }
};
