import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../services/supabaseClient';
import { formatCurrency } from '../../utils/formatCurrency';
import { Search, Calendar, Filter, User as UserIcon, CreditCard } from 'lucide-react';

export default function Historico() {
  const [comandas, setComandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    data: '',
    status: 'fechada',
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
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.data) {
        const start = new Date(filters.data);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.data);
        end.setHours(23, 59, 59, 999);
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      if (filters.forma_pagamento) {
        // Nota: Filtrar por sub-tabela no Supabase requer sintaxe específica ou filtragem no JS
        // Para simplificar, buscaremos e filtraremos no JS se necessário
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];
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

  return (
    <Layout>
      <div className="space-y-6">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-400">Carregando...</td></tr>
              ) : comandas.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-400">Nenhuma comanda encontrada.</td></tr>
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
