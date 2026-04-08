import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { produtoService } from '../../services/produtoService';
import { Product, Category } from '../../types/database.types';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';
import { Plus, Search, Edit2, Trash2, Package, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [lastQuantidadeMinima, setLastQuantidadeMinima] = useState<number>(5); // Valor padrão inicial
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [p, c] = await Promise.all([
        produtoService.getProducts(),
        produtoService.getCategories()
      ]);
      setProducts(p);
      setCategories(c);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir "${product.nome}"? Esta ação não pode ser desfeita.`)) return;
    
    try {
      await produtoService.deleteProduct(product.id);
      fetchData();
      alert('Produto excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      setErrorMessage(error.message || 'Erro ao excluir produto');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      if (editingProduct?.id) {
        await produtoService.updateProduct(editingProduct.id, editingProduct);
      } else {
        await produtoService.createProduct(editingProduct!);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      setErrorMessage(error.message || 'Erro ao salvar produto');
    }
  };

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Produtos</h1>
            <p className="text-zinc-500 font-medium">Gerencie o cardápio do restaurante.</p>
          </div>
          <Button onClick={() => { 
            setEditingProduct({ quantidade_minima: lastQuantidadeMinima }); 
            setIsModalOpen(true); 
          }}>
            <Plus size={20} className="mr-2" />
            Novo Produto
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-200 h-14 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
          />
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl font-bold flex items-center gap-2">
            <XCircle size={20} />
            {errorMessage}
          </div>
        )}

        <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Produto</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Preço</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-zinc-100 p-2 rounded-lg text-zinc-500">
                          <Package size={20} />
                        </div>
                        <span className="font-bold text-zinc-900">{product.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-zinc-500">{product.categoria?.nome}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-orange-600">{formatCurrency(product.preco)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                        product.ativo ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {product.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                        >
                          <Edit2 size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Produto */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-zinc-900 mb-6">
                {editingProduct?.id ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={editingProduct?.nome || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nome: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: Picanha na Brasa"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct?.preco || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, preco: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Categoria</label>
                    <select
                      required
                      value={editingProduct?.categoria_id || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoria_id: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Selecione...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Estoque Mínimo</label>
                  <input
                    type="number"
                    required
                    value={editingProduct?.quantidade_minima || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setEditingProduct({ ...editingProduct, quantidade_minima: value });
                      setLastQuantidadeMinima(value);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: 5"
                  />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={editingProduct?.ativo ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ativo: e.target.checked })}
                    className="w-5 h-5 accent-orange-500"
                  />
                  <label htmlFor="ativo" className="text-sm font-bold text-zinc-700">Produto Ativo</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Salvar Produto
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
