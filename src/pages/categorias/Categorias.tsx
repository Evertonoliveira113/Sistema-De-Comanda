import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { produtoService } from '../../services/produtoService';
import { Category } from '../../types/database.types';
import { Button } from '../../components/ui/Button';

export default function Categorias() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const cats = await produtoService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-zinc-900">Categorias</h1>
            <p className="text-zinc-500 font-medium">Gerencie categorias de produtos.</p>
          </div>
          <Button onClick={() => alert('Gerenciamento de categorias ainda não implementado aqui.')}>Nova Categoria</Button>
        </div>

        <div className="bg-white rounded-[24px] p-4 border">
          {categories.length === 0 ? (
            <div className="text-zinc-400 p-4">Nenhuma categoria encontrada.</div>
          ) : (
            <div className="grid gap-2">
              {categories.map(c => (
                <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>{c.nome}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
