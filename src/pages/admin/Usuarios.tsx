import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { userService } from '../../services/userService';
import { UserProfile, UserRole } from '../../types/database.types';
import { Button } from '../../components/ui/Button';
import { UserPlus, Shield, Mail, Trash2, Edit2, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Usuarios() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUser, setNewUser] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'garcom' as UserRole
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.createUser(newUser);
      setIsModalOpen(false);
      setNewUser({ nome: '', email: '', password: '', role: 'garcom' });
      fetchUsers();
      alert('Usuário criado com sucesso!');
    } catch (error: any) {
      alert('Erro ao criar usuário: ' + error.message);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    try {
      await userService.updateUser(user.id, { ativo: !user.ativo });
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      await userService.updateUser(editingUser.id, { nome: editingUser.nome });
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
      alert('Usuário atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    
    try {
      await userService.deleteUser(id);
      fetchUsers();
      alert('Usuário excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleUpdateRole = async (user: UserProfile, newRole: UserRole) => {
    try {
      await userService.updateUserRole(user.id, newRole);
      fetchUsers();
    } catch (error) {
      alert('Erro ao atualizar cargo');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Usuários</h1>
            <p className="text-zinc-500 font-medium">Gerencie a equipe do restaurante.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <UserPlus size={20} className="mr-2" />
            Novo Usuário
          </Button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-zinc-900">Novo Usuário</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={newUser.nome}
                    onChange={e => setNewUser({ ...newUser, nome: e.target.value })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">E-mail</label>
                  <input
                    required
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="exemplo@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Senha Inicial</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Cargo</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                  >
                    <option value="garcom">GARÇOM</option>
                    <option value="admin">ADMINISTRADOR</option>
                  </select>
                </div>

                <Button type="submit" className="w-full py-4 text-lg">
                  Criar Usuário
                </Button>
              </form>
            </div>
          </div>
        )}

        {isEditModalOpen && editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-zinc-900">Editar Usuário</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={editingUser.nome}
                    onChange={e => setEditingUser({ ...editingUser, nome: e.target.value })}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">E-mail (Não editável)</label>
                  <input
                    disabled
                    type="email"
                    value={editingUser.email}
                    className="w-full p-4 bg-zinc-100 border border-zinc-100 rounded-2xl outline-none text-zinc-500 cursor-not-allowed"
                  />
                </div>

                <Button type="submit" className="w-full py-4 text-lg">
                  Salvar Alterações
                </Button>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                    {(user.nome || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{user.nome || 'Usuário'}</h3>
                    <div className="flex items-center gap-1 text-zinc-400 text-xs font-medium">
                      <Mail size={12} />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                  user.ativo ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {user.ativo ? 'Ativo' : 'Bloqueado'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-700 uppercase tracking-widest">Cargo</span>
                  </div>
                  <select 
                    value={user.role || 'garcom'}
                    onChange={(e) => handleUpdateRole(user, e.target.value as UserRole)}
                    className="bg-transparent font-black text-orange-600 text-sm outline-none cursor-pointer"
                  >
                    <option value="admin">ADMIN</option>
                    <option value="garcom">GARÇOM</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleToggleStatus(user)}
                  >
                    {user.ativo ? (
                      <><XCircle size={18} className="mr-2" /> Bloquear</>
                    ) : (
                      <><CheckCircle2 size={18} className="mr-2" /> Ativar</>
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-zinc-500 hover:bg-zinc-50"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
