import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../services/supabaseClient';
import { formatCurrency } from '../../utils/formatCurrency';
import { Search, Calendar, Filter, User as UserIcon, CreditCard, Eye, X } from 'lucide-react';

export default function Historico() {
  const [comandas, setComandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComanda, setSelectedComanda] = useState<any>(null);
  const [comandaItems, setComandaItems] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    data: '',
    status: '',
    forma_pagamento: ''
  });

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('comandas')
        .select(`
          *,
          usuario:usuarios(nome),
          pagamentos(forma_pagamento, valor)
        `)
        .neq('status', 'aberta')  // Excluir comandas abertas do histórico
        .order('data_fechamento', { ascending: false, nullsFirst: false });

      // Filtro por status
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      // Filtro por data (usando data_fechamento para histórico)
      if (filters.data) {
        // Criar intervalo do dia selecionado no timezone local
        const [year, month, day] = filters.data.split('-').map(Number);
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
        
        query = query
          .gte('data_fechamento', startOfDay.toISOString())
          .lte('data_fechamento', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];
      
      // Filtro por forma de pagamento (no JS já que é sub-tabela)
      if (filters.forma_pagamento) {
        filteredData = filteredData.filter(c => 
          c.pagamentos?.some((p: any) => p.forma_pagamento === filters.forma_pagamento)
        );
      }

      setComandas(filteredData);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [filters]);

  const openComandaDetails = async (comanda: any) => {
    try {
      const { data, error } = await supabase
        .from('comanda_itens')
        .select('*, produtos(nome, preco)')
        .eq('comanda_id', comanda.id);

      if (error) throw error;

      setSelectedComanda(comanda);
      setComandaItems(data || []);
      setModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Modal de Visualização */}
        {modalOpen && selectedComanda && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-zinc-900">Comanda #{selectedComanda.numero_comanda}</h2>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Informações Gerais */}
              <div className="bg-zinc-50 p-6 rounded-2xl mb-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Garçom</p>
                  <p className="text-lg font-bold text-zinc-900">{selectedComanda.usuario?.nome || 'Sistema'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-widest ${
                    selectedComanda.status === 'fechada' ? 'bg-emerald-100 text-emerald-700' :
                    selectedComanda.status === 'cancelada' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedComanda.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Data de Abertura</p>
                  <p className="text-sm text-zinc-700">{new Date(selectedComanda.data_abertura).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Data de Fechamento</p>
                  <p className="text-sm text-zinc-700">{selectedComanda.data_fechamento ? new Date(selectedComanda.data_fechamento).toLocaleString() : '-'}</p>
                </div>
              </div>

              {/* Itens */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Itens</h3>
                <div className="space-y-3">
                  {comandaItems.length === 0 ? (
                    <p className="text-zinc-400 py-4 text-center">Nenhum item</p>
                  ) : (
                    comandaItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-bold text-zinc-900">{item.produtos?.nome || 'Produto'}</p>
                          <p className="text-xs text-zinc-500">Qtd: {item.quantidade} × {formatCurrency(item.preco_unitario)}</p>
                        </div>
                        <p className="text-right">
                          <span className="block text-xs text-zinc-400 mb-1">Subtotal</span>
                          <span className="font-black text-orange-600">{formatCurrency(item.subtotal)}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Resumo */}
              <div className="border-t border-zinc-200 pt-6 space-y-3">
                {selectedComanda.desconto > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-semibold text-zinc-900">{formatCurrency(selectedComanda.total + selectedComanda.desconto)}</span>
                  </div>
                )}
                {selectedComanda.desconto > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Desconto</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(selectedComanda.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-zinc-900">Total</span>
                  <span className="font-black text-orange-600">{formatCurrency(selectedComanda.total)}</span>
                </div>
                {selectedComanda.pagamentos && selectedComanda.pagamentos.length > 0 && (
                  <div className="pt-4 border-t border-zinc-200">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Forma de Pagamento</p>
                    <p className="text-sm font-semibold text-zinc-900">{selectedComanda.pagamentos[0].forma_pagamento}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Histórico</h1>
          <p className="text-zinc-500 font-medium">Consulte comandas passadas.</p>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-[24px] border border-zinc-100 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Data
            </label>
            <input 
              type="date" 
              className="w-full bg-zinc-50 border border-zinc-200 h-11 px-4 rounded-xl outline-none"
              value={filters.data}
              onChange={(e) => setFilters({...filters, data: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} /> Status
            </label>
            <select 
              className="w-full bg-zinc-50 border border-zinc-200 h-11 px-4 rounded-xl outline-none"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="fechada">Fechada</option>
              <option value="cancelada">Cancelada</option>
              <option value="aberta">Aberta</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={14} /> Pagamento
            </label>
            <select 
              className="w-full bg-zinc-50 border border-zinc-200 h-11 px-4 rounded-xl outline-none"
              value={filters.forma_pagamento}
              onChange={(e) => setFilters({...filters, forma_pagamento: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Pix">Pix</option>
              <option value="Cartão">Cartão</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Nº</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Garçom</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Data/Hora</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Pagamento</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-zinc-400">Carregando...</td></tr>
              ) : comandas.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-zinc-400">Nenhuma comanda encontrada.</td></tr>
              ) : (
                comandas.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-black">#{c.numero_comanda}</td>
                    <td className="px-6 py-4 text-sm font-medium">{c.usuario?.nome || 'Sistema'}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(c.data_fechamento || c.data_abertura).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold bg-zinc-100 px-2 py-1 rounded-lg">
                        {c.pagamentos?.[0]?.forma_pagamento || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-orange-600">
                      {formatCurrency(c.total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => openComandaDetails(c)}
                        className="inline-flex items-center justify-center text-zinc-600 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-colors"
                        title="Visualizar detalhes"
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
