import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../services/supabaseClient';
import { formatCurrency } from '../../utils/formatCurrency';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Users, Clock, CreditCard, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// Get first day of current month and today
const getDefaultDates = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const formatDateISO = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  return {
    inicio: formatDateISO(firstDay),
    fim: formatDateISO(today)
  };
};

export default function Relatorios() {
  const defaultDates = getDefaultDates();
  const [dataInicio, setDataInicio] = useState(defaultDates.inicio);
  const [dataFim, setDataFim] = useState(defaultDates.fim);
  const [data, setData] = useState<any>({
    totalVendido: 0,
    ticketMedio: 0,
    produtoMaisVendido: 'Nenhum',
    horarioPico: 'Calculando...',
    vendasPorGarcom: [],
    formasPagamento: [],
    produtosVendidos: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      try {
        // Converter datas para timestamp (start of day e end of day)
        const inicioDate = new Date(dataInicio);
        const fimDate = new Date(dataFim);
        fimDate.setHours(23, 59, 59, 999); // End of day

        // 1. Total Vendido e Ticket Médio
        const { data: comandas, error: comandasError } = await supabase
          .from('comandas')
          .select('total, usuario_id, usuarios(nome)')
          .eq('status', 'fechada')
          .gte('data_fechamento', inicioDate.toISOString())
          .lte('data_fechamento', fimDate.toISOString());

        if (comandasError) throw comandasError;

        const totalVendido = comandas.reduce((acc, curr) => acc + (curr.total || 0), 0);
        const ticketMedio = comandas.length > 0 ? totalVendido / comandas.length : 0;

        // 2. Vendas por Garçom
        const vendasGarcomMap: Record<string, number> = {};
        comandas.forEach(c => {
          const nome = (c.usuarios as any)?.nome || 'Desconhecido';
          vendasGarcomMap[nome] = (vendasGarcomMap[nome] || 0) + (c.total || 0);
        });
        const vendasPorGarcom = Object.entries(vendasGarcomMap).map(([name, value]) => ({ name, value }));

        // 3. Formas de Pagamento
        const { data: pagamentos, error: pagamentosError } = await supabase
          .from('pagamentos')
          .select('valor, forma_pagamento')
          .gte('data_pagamento', inicioDate.toISOString())
          .lte('data_pagamento', fimDate.toISOString());

        if (pagamentosError) throw pagamentosError;

        const pagamentosMap: Record<string, number> = {};
        pagamentos.forEach(p => {
          pagamentosMap[p.forma_pagamento] = (pagamentosMap[p.forma_pagamento] || 0) + p.valor;
        });

        const colors = ['#3b82f6', '#8b5cf6', '#10b981'];
        const formasPagamento = Object.entries(pagamentosMap).map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length]
        }));

        // 4. Produto Mais Vendido
        const { data: itens, error: itensError } = await supabase
          .from('comanda_itens')
          .select('quantidade, produtos(nome), created_at')
          .gte('created_at', inicioDate.toISOString())
          .lte('created_at', fimDate.toISOString());

        if (itensError) throw itensError;

        const produtosMap: Record<string, number> = {};
        itens.forEach(i => {
          const nome = (i.produtos as any)?.nome || 'Desconhecido';
          produtosMap[nome] = (produtosMap[nome] || 0) + i.quantidade;
        });

        const produtoMaisVendido = Object.entries(produtosMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';

        // 5. Horário de Pico
        const horaMap: Record<number, number> = {};
        comandas.forEach(c => {
          const hora = new Date(c.data_fechamento).getHours();
          horaMap[hora] = (horaMap[hora] || 0) + (c.total || 0);
        });
        
        let horarioPicoCalc = 'Sem dados';
        if (Object.keys(horaMap).length > 0) {
          const maxHoraEntry = Object.entries(horaMap)
            .reduce((max, [hora, valor]) => valor > max.valor ? { hora: parseInt(hora), valor } : max, { hora: 0, valor: 0 });
          horarioPicoCalc = maxHoraEntry.valor > 0 ? `${maxHoraEntry.hora}:00` : 'Sem dados';
        }

        // 6. Produtos Vendidos (agrupado e ordenado)
        const produtosVendidosArray = Object.entries(produtosMap)
          .map(([nome, quantidade]) => ({ nome, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade);

        setData({
          totalVendido,
          ticketMedio,
          produtoMaisVendido,
          horarioPico: horarioPicoCalc,
          vendasPorGarcom,
          formasPagamento: formasPagamento.length > 0 ? formasPagamento : [],
          produtosVendidos: produtosVendidosArray
        });
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, [dataInicio, dataFim]);

  if (loading) return <Layout>Carregando...</Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Relatórios</h1>
          <p className="text-zinc-500 font-medium">Análise detalhada do seu negócio.</p>
        </div>

        {/* Period Filter */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-orange-600" />
            <h3 className="text-lg font-bold text-zinc-900">Período de Análise</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Data Inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full p-3 border border-zinc-200 rounded-lg bg-white text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Data Final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                min={dataInicio}
                className="w-full p-3 border border-zinc-200 rounded-lg bg-white text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <Button 
              variant="outline"
              onClick={() => {
                const defaults = getDefaultDates();
                setDataInicio(defaults.inicio);
                setDataFim(defaults.fim);
              }}
              className="whitespace-nowrap"
            >
              Resetar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="text-emerald-600" size={20} />
              <span className="text-xs font-bold text-emerald-700 bg-emerald-200 px-2 py-1 rounded">+12%</span>
            </div>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Faturamento Total</p>
            <h3 className="text-3xl font-black text-emerald-900 mt-2">{formatCurrency(data.totalVendido)}</h3>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <TrendingUp className="text-blue-600" size={20} />
              <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded">Média</span>
            </div>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Ticket Médio</p>
            <h3 className="text-3xl font-black text-blue-900 mt-2">{formatCurrency(data.ticketMedio)}</h3>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
            <div className="flex items-start justify-between mb-3">
              <ShoppingBag className="text-orange-600" size={20} />
              <span className="text-xs font-bold text-orange-700 bg-orange-200 px-2 py-1 rounded">Top</span>
            </div>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Produto Destaque</p>
            <h3 className="text-lg font-black text-orange-900 mt-2 line-clamp-2">{data.produtoMaisVendido}</h3>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
            <div className="flex items-start justify-between mb-3">
              <Users className="text-purple-600" size={20} />
              <span className="text-xs font-bold text-purple-700 bg-purple-200 px-2 py-1 rounded">Performance</span>
            </div>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Horário de Pico</p>
            <h3 className="text-2xl font-black text-purple-900 mt-2">{data.horarioPico}</h3>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendas por Garçom */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-5 flex items-center gap-2">
              <Users size={20} className="text-orange-600" />
              Performance por Garçom
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.vendasPorGarcom}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-5 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-600" />
              Distribuição de Pagamentos
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.formasPagamento}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.formasPagamento.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {data.formasPagamento.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-zinc-700">{item.name}</span>
                  </div>
                  <span className="font-black text-zinc-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Produtos Vendidos */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-5 flex items-center gap-2">
            <ShoppingBag size={20} className="text-emerald-600" />
            Produtos que Saíram
          </h3>
          
          {data.produtosVendidos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left py-3 px-4 font-bold text-zinc-600 uppercase tracking-widest text-xs">Produto</th>
                    <th className="text-right py-3 px-4 font-bold text-zinc-600 uppercase tracking-widest text-xs">Quantidade</th>
                    <th className="text-right py-3 px-4 font-bold text-zinc-600 uppercase tracking-widest text-xs">Percentual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.produtosVendidos.map((produto: any, index: number) => {
                    const totalQuantidade = data.produtosVendidos.reduce((sum: number, p: any) => sum + p.quantidade, 0);
                    const percentual = ((produto.quantidade / totalQuantidade) * 100).toFixed(1);
                    return (
                      <tr key={index} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-zinc-900">{produto.nome}</td>
                        <td className="text-right py-3 px-4 font-black text-orange-600">{produto.quantidade}</td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-orange-500" 
                                style={{ width: `${percentual}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-zinc-600 min-w-12">{percentual}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-zinc-500">Nenhum produto vendido neste período.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
