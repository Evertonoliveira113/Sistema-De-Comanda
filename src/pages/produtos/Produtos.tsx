import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { produtoService } from '../../services/produtoService';
import { estoqueService } from '../../services/estoqueService';
import { supabase } from '../../services/supabaseClient';
import { Product, Category } from '../../types/database.types';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';
import { Plus, Search, Edit2, Trash2, Package, XCircle, Tags } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { acompanhamentoService } from '../../services/acompanhamentoService';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingStock, setEditingStock] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [selectedCategoryForAcompanhamentos, setSelectedCategoryForAcompanhamentos] = useState<string | null>(null);
  const [acompanhamentosList, setAcompanhamentosList] = useState<any[]>([]);
  const [loadingAcompanhamentos, setLoadingAcompanhamentos] = useState(false);
  const [newAcompanhamentoName, setNewAcompanhamentoName] = useState('');

  const fetchData = async () => {
    try {
      const [p, c, i] = await Promise.all([
        produtoService.getProducts(),
        produtoService.getCategories(),
        estoqueService.getInventory()
      ]);

      setProducts(p);
      setCategories(c);
      setInventory(i);
    } catch (error) {
      console.error(error);
      setErrorMessage('Erro ao carregar dados de produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryForAcompanhamentos) {
      setSelectedCategoryForAcompanhamentos(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    const fetchA = async () => {
      if (!selectedCategoryForAcompanhamentos) return setAcompanhamentosList([]);
      setLoadingAcompanhamentos(true);
      try {
        const data = await acompanhamentoService.getByCategoria(selectedCategoryForAcompanhamentos);
        setAcompanhamentosList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAcompanhamentos(false);
      }
    };
    fetchA();
  }, [selectedCategoryForAcompanhamentos]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir "${product.nome}"?`)) return;

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

      const savedProduct = editingProduct?.id
        ? await produtoService.updateProduct(editingProduct.id, editingProduct)
        : await produtoService.createProduct(editingProduct!);

      if (savedProduct?.id) {
        await estoqueService.updateStock(savedProduct.id, Number(editingStock));
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      setEditingStock(0);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      setErrorMessage(error.message || 'Erro ao salvar produto');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = newCategory.trim();

    if (!nome) {
      setErrorMessage('Informe o nome da categoria.');
      return;
    }

    try {
      if (editingCategoryId) {
        await supabase
          .from('categorias')
          .update({ nome })
          .eq('id', editingCategoryId);
      } else {
        await supabase.from('categorias').insert([{ nome }]);
      }

      setNewCategory('');
      setEditingCategoryId(null);
      setErrorMessage(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      setErrorMessage('Erro ao salvar categoria.');
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategory(category.nome);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setNewCategory('');
  };

  const handleDeleteCategory = async (category: Category) => {
    const hasProducts = products.some(product => product.categoria_id === category.id);

    if (hasProducts) {
      setErrorMessage('Não é possível excluir uma categoria com produtos vinculados.');
      return;
    }

    if (!confirm(`Deseja excluir a categoria "${category.nome}"?`)) return;

    try {
      await supabase.from('categorias').delete().eq('id', category.id);
      setEditingCategoryId(null);
      setNewCategory('');
      setErrorMessage(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      setErrorMessage('Erro ao excluir categoria.');
    }
  };

  const openCreateModal = () => {
    setEditingProduct({ ativo: true, quantidade_minima: 5 });
    setEditingStock(0);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    const stockItem = inventory.find(item => item.produto_id === product.id);
    setEditingProduct({
      ...product,
      quantidade_minima: product.quantidade_minima ?? stockItem?.quantidade_minima ?? 0
    });
    setEditingStock(stockItem?.quantidade_atual ?? 0);
    setIsModalOpen(true);
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
            <p className="text-zinc-500 font-medium">Gerencie produtos, categorias e estoque em um só lugar.</p>
          </div>

          <Button onClick={openCreateModal}>
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

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100">
                <h2 className="text-lg font-black text-zinc-900">Produtos</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Produto</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Estoque Atual</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Categoria</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Preço</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                          Carregando...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                          Nenhum produto encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-zinc-100 p-2 rounded-lg text-zinc-500">
                                <Package size={20} />
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900">{product.nome}</div>
                                <div className="text-xs text-zinc-500">
                                  Min: {inventory.find(item => item.produto_id === product.id)?.quantidade_minima ?? product.quantidade_minima ?? 0}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-semibold text-zinc-700">
                              {inventory.find(item => item.produto_id === product.id)?.quantidade_atual ?? 0}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-zinc-500">
                              {product.categoria?.nome || 'Sem categoria'}
                            </span>
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
                              <Button variant="ghost" size="icon" onClick={() => openEditModal(product)}>
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                  <Tags size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900">Categorias</h2>
                  <p className="text-sm text-zinc-500">Organize o cardápio por grupo</p>
                </div>
              </div>

              <form onSubmit={handleSaveCategory} className="flex flex-col gap-3 mb-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder={editingCategoryId ? 'Editar categoria' : 'Nova categoria'}
                  className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                />

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingCategoryId ? 'Salvar' : 'Adicionar'}
                  </Button>

                  {editingCategoryId && (
                    <Button type="button" variant="ghost" onClick={cancelEditCategory}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>

              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center justify-between bg-zinc-50 px-3 py-2 rounded-xl">
                    <span className="font-medium text-zinc-700">{category.nome}</span>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditCategory(category)}
                      >
                        <Edit2 size={16} />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteCategory(category)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seção de Acompanhamentos (Admin) */}
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                  <Tags size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900">Acompanhamentos</h2>
                  <p className="text-sm text-zinc-500">Gerencie acompanhamentos por categoria.</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-bold text-zinc-500">Categoria</label>
                <select
                  value={selectedCategoryForAcompanhamentos || ''}
                  onChange={e => setSelectedCategoryForAcompanhamentos(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-zinc-50 mt-2"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newAcompanhamentoName || !selectedCategoryForAcompanhamentos) return;
                try {
                  await acompanhamentoService.create(newAcompanhamentoName, selectedCategoryForAcompanhamentos, true);
                  setNewAcompanhamentoName('');
                  const data = await acompanhamentoService.getByCategoria(selectedCategoryForAcompanhamentos);
                  setAcompanhamentosList(data);
                  alert('Acompanhamento criado');
                } catch (err: any) {
                  alert('Erro ao criar: ' + (err.message || ''));
                }
              }} className="mb-4">
                <div className="flex gap-2">
                  <input value={newAcompanhamentoName} onChange={e => setNewAcompanhamentoName(e.target.value)} placeholder="Novo acompanhamento" className="flex-1 p-3 rounded-xl border bg-zinc-50" />
                  <Button type="submit">Adicionar</Button>
                </div>
              </form>

              <div>
                {loadingAcompanhamentos ? (
                  <div>Carregando...</div>
                ) : acompanhamentosList.length === 0 ? (
                  <div className="text-zinc-400">Nenhum acompanhamento nesta categoria.</div>
                ) : (
                  <div className="space-y-2">
                    {acompanhamentosList.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${a.ativo ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                          <div>{a.nome}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            try {
                              await acompanhamentoService.update(a.id, { ativo: !a.ativo });
                              const data = await acompanhamentoService.getByCategoria(selectedCategoryForAcompanhamentos!);
                              setAcompanhamentosList(data);
                            } catch (err: any) { alert('Erro ao atualizar: ' + (err.message || '')); }
                          }} className="p-2 bg-zinc-50 rounded-lg">{a.ativo ? 'Inativar' : 'Ativar'}</button>
                          <button onClick={async () => {
                            if (!confirm(`Excluir \"${a.nome}\"?`)) return;
                            try {
                              await acompanhamentoService.remove(a.id);
                              const data = await acompanhamentoService.getByCategoria(selectedCategoryForAcompanhamentos!);
                              setAcompanhamentosList(data);
                            } catch (err: any) { alert('Erro ao excluir: ' + (err.message || '')); }
                          }} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
                      value={editingProduct?.preco ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, preco: Number(e.target.value) || 0 })}
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
                    value={editingProduct?.quantidade_minima ?? 0}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      quantidade_minima: Number(e.target.value) || 0
                    })}
                    className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Estoque Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={editingStock}
                    onChange={(e) => setEditingStock(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
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
