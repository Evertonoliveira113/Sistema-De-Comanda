import { supabase } from './supabaseClient';
import { UserProfile } from '../types/database.types';

export const userService = {
  async getProfile(id: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as UserProfile;
  },

  async getAllUsers() {
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
      // Atualizar nome na tabela usuarios e na auth.users
      const { error } = await supabase.rpc('update_user_name', {
        user_id: id,
        new_name: updates.nome
      });
      if (error) throw error;
    }
    
    return { id, ...updates };
  },

  async createUser(userData: { email: string; password: string; nome: string; role: string }) {
    // Create user via Auth API
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          nome: userData.nome,
          role: userData.role
        }
      }
    });
    
    if (signUpError) throw signUpError;
    
    // Update the role in usuarios table
    if (data.user) {
      const { error: updateError } = await supabase.rpc('update_user_role', {
        user_id: data.user.id,
        new_role: userData.role
      });
      if (updateError) console.error('Erro ao atualizar role:', updateError);
    }
    
    return data;
  },

  async updateUserRole(id: string, role: string) {
    const { error } = await supabase.rpc('update_user_role', {
      user_id: id,
      new_role: role
    });
    if (error) throw error;
  },

  async deleteUser(id: string) {
    // Delete from public.usuarios (cascades from auth.users via foreign key)
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
