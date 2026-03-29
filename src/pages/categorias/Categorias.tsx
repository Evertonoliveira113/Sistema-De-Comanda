import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { produtoService } from '../../services/produtoService';
import { Category } from '../../types/database.types';
import { Button } from '../../components/ui/Button';
import { Plus, Tags, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function Categorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');

  const fetchCategories = async () => {
    try {
      const data = await produtoService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) return;
    try {
      await supabase.from('categorias').insert([{ nome: newCategory }]);
      setNewCategory('');
      fetchCategories();
    } catch (error) {
      alert('Erro ao adicionar categoria');
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Categorias</h1>
          <p className="text-zinc-500 font-medium">Organize seu cardápio por grupos.</p>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            required
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nova categoria (ex: Bebidas)"
            className="flex-1 bg-white border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
          />
          <Button type="submit">
            <Plus size={20} className="mr-2" />
            Adicionar
          </Button>
        </form>

        <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-50">
            {categories.map(category => (
              <div key={category.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                    <Tags size={24} />
                  </div>
                  <span className="font-bold text-zinc-900 text-lg">{category.nome}</span>
                </div>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-600">
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
