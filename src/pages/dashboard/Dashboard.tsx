import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useComandas } from '../../hooks/useComandas';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatCurrency';
import { 
  TrendingUp, 
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  Package,
  CreditCard,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { comandas } = useComandas();
  const [stats, setStats] = useState({
    totalVendidoHoje: 0,
    ticketMedio: 0,
    comandasFechadasHoje: 0,
    descotosAplicados: 0,
    formasPagamento: [] as any[],
    topProdutos: [] as any[],
    topCategoria: '',
    horarioPico: 'Calculando...',
    garcomDestaque: '',
    vendasPorHora: [] as any[],
    itensEstoqueBaixo: [] as any[],
    dataAtual: new Date(),
    comandasAbertasAgora: 0,
    comandasFechadasAgora: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const hojeISO = hoje.toISOString();

        // 1. Comandas fechadas hoje
        const { data: fechadas, error: fechadasError } = await supabase
          .from('comandas')
          .select('total, desconto, usuario_id, usuarios(nome), data_fechamento')
          .eq('status', 'fechada')
          .gte('data_fechamento', hojeISO);

        if (fechadasError) throw fechadasError;

        const totalVendido = fechadas?.reduce((acc, c) => acc + Number(c.total), 0) || 0;
        const totalDescontos = fechadas?.reduce((acc, c) => acc + Number(c.desconto || 0), 0) || 0;
        const ticketMedio = fechadas?.length > 0 ? totalVendido / fechadas.length : 0;

        // 2. Formas de pagamento
        const { data: pagamentos } = await supabase
          .from('pagamentos')
          .select('valor, forma_pagamento')
          .gte('data_pagamento', hojeISO);

        const pagtoMap: Record<string, number> = {};
        pagamentos?.forEach(p => {
          pagtoMap[p.forma_pagamento] = (pagtoMap[p.forma_pagamento] || 0) + p.valor;
        });
        const formasPagamento = Object.entries(pagtoMap).map(([name, value], idx) => ({
          name,
          value,
          color: ['#10b981', '#3b82f6', '#f59e0b'][idx % 3]
        }));

        // 3. Top 5 produtos
        const { data: itens } = await supabase
          .from('comanda_itens')
          .select('quantidade, subtotal, produtos(nome)')
          .gte('created_at', hojeISO);

        const prodMap: Record<string, {qtd: number, valor: number}> = {};
        itens?.forEach(i => {
          const nome = (i.produtos as any)?.nome || 'Desconhecido';
          prodMap[nome] = {
            qtd: (prodMap[nome]?.qtd || 0) + i.quantidade,
            valor: (prodMap[nome]?.valor || 0) + i.subtotal
          };
        });

        const topProdutos = Object.entries(prodMap)
          .map(([name, {qtd, valor}]) => ({
            name,
            quantidade: qtd,
            valor,
            color: '#f97316'
          }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);

        // 4. Garçom destaque
        const garcomMap: Record<string, number> = {};
        fechadas?.forEach(c => {
          const nome = (c.usuarios as any)?.nome || 'Sistema';
          garcomMap[nome] = (garcomMap[nome] || 0) + 1;
        });
        const garcomDestaque = Object.entries(garcomMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';

        // 5. Vendas por hora
        const horaMap: Record<string, number> = {};
        fechadas?.forEach(c => {
          const hora = new Date(c.data_fechamento).getHours();
          const label = `${hora}:00`;
          horaMap[label] = (horaMap[label] || 0) + Number(c.total);
        });
        const vendasPorHora = Object.entries(horaMap)
          .map(([time, value]) => ({ time, value }))
          .sort((a, b) => parseInt(a.time) - parseInt(b.time));

        // 6. Comandas abertas e fechadas
        const { data: todasComandasHoje } = await supabase
          .from('comandas')
          .select('id, status')
          .gte('created_at', hojeISO);
        const comandasAbertasAgora = todasComandasHoje?.filter(c => c.status === 'aberta').length || 0;
        const comandasFechadasAgora = todasComandasHoje?.filter(c => c.status === 'fechada').length || 0;

        // 7. Estoque baixo
        const { data: allStock } = await supabase
          .from('estoque')
          .select('quantidade_atual, quantidade_minima, produtos(nome)');
        const lowStock = allStock?.filter(item => item.quantidade_atual <= item.quantidade_minima).slice(0, 5) || [];

        // 6. Encontrar horário de pico
        let horarioPicoCalc = 'Sem dados';
        if (vendasPorHora.length > 0) {
          const maxVendas = vendasPorHora.reduce((max, item) => 
            item.value > max.value ? item : max
          );
          const hora = parseInt(maxVendas.time);
          horarioPicoCalc = `${hora}:00`;
        }

        setStats({
          totalVendidoHoje: totalVendido,
          ticketMedio,
          comandasFechadasHoje: fechadas?.length || 0,
          descotosAplicados: totalDescontos,
          formasPagamento,
          topProdutos,
          topCategoria: 'Pratos Quentes',
          horarioPico: horarioPicoCalc,
          garcomDestaque,
          vendasPorHora,
          itensEstoqueBaixo: lowStock,
          dataAtual: new Date(),
          comandasAbertasAgora,
          comandasFechadasAgora,
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const kpiCards = [
    { 
      label: 'Faturamento', 
      value: formatCurrency(stats.totalVendidoHoje),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      change: '+15%'
    },
    { 
      label: 'Comandas', 
      value: stats.comandasFechadasHoje,
      icon: ShoppingCart,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      change: stats.comandasFechadasHoje + ' hoje'
    },
    { 
      label: 'Ticket Médio', 
      value: formatCurrency(stats.ticketMedio),
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      change: formatCurrency(stats.ticketMedio)
    },
    {
      label: 'Descontos',
      value: formatCurrency(stats.descotosAplicados),
      icon: Percent,
      color: 'text-red-600',
      bg: 'bg-red-50',
      change: stats.descotosAplicados > 0 ? '⚠ Atenção' : 'Sem desconto'
    }
  ];

  // Apenas admin pode acessar o dashboard
  if (!profile) {
    return <Layout><div className="text-center py-12"><p className="text-zinc-600">Carregando...</p></div></Layout>;
  }
  
  if (profile.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Acesso Negado</h1>
          <p className="text-zinc-600">Apenas administradores podem acessar o dashboard.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 font-medium mt-2">
            {stats.dataAtual.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Comandas Abertas/Fechadas - Destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-300 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-xs font-bold uppercase tracking-widest mb-1">Comandas Abertas</p>
                <h2 className="text-5xl font-black text-blue-900">{stats.comandasAbertasAgora}</h2>
                <p className="text-sm text-blue-700 mt-2">No momento</p>
              </div>
              <ShoppingCart size={48} className="text-blue-400 opacity-20" />
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-blue-700">Aguardando fechamento</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border-2 border-emerald-300 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-xs font-bold uppercase tracking-widest mb-1">Comandas Fechadas</p>
                <h2 className="text-5xl font-black text-emerald-900">{stats.comandasFechadasAgora}</h2>
                <p className="text-sm text-emerald-700 mt-2">Hoje</p>
              </div>
              <DollarSign size={48} className="text-emerald-400 opacity-20" />
            </div>
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-xs text-emerald-700">Acompanhe o faturamento nos KPI Cards</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className={cn("p-3 rounded-xl", card.bg)}>
                  <card.icon className={cn(card.color, 'font-bold')} size={20} />
                </div>
                <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full">{card.change}</span>
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mt-4">{card.label}</p>
              <h3 className="text-2xl font-black text-zinc-900 mt-1">{card.value}</h3>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vendas por Produto */}
            {stats.topProdutos.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-600" />
                  Produtos Mais Vendidos
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topProdutos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => value.toLocaleString('pt-BR')}
                        labelFormatter={() => 'Quantidade'}
                      />
                      <Bar dataKey="quantidade" fill="#f97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.topProdutos.map((prod, i) => (
                    <div key={i} className="p-3 bg-zinc-50 rounded-lg">
                      <p className="text-xs text-zinc-600 font-semibold uppercase">{prod.name}</p>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-sm font-bold text-zinc-900">{prod.quantidade} un.</span>
                        <span className="text-xs font-bold text-orange-600">{formatCurrency(prod.valor)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formas de Pagamento */}
            {stats.formasPagamento.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-blue-600" />
                  Formas de Pagamento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stats.formasPagamento.map((forma, i) => (
                    <div key={i} className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-lg border border-zinc-100">
                      <p className="text-xs font-bold text-zinc-500 uppercase">{forma.name}</p>
                      <p className="text-xl font-black text-zinc-900 mt-1">{formatCurrency(forma.value)}</p>
                      <div className="w-full h-1 bg-zinc-200 rounded-full mt-2">
                        <div 
                          className="h-1 rounded-full"
                          style={{
                            background: forma.color,
                            width: `${(forma.value / Math.max(...stats.formasPagamento.map(f => f.value))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Garçom Destaque */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Users size={20} className="text-orange-600" />
                <span className="text-xs font-bold text-orange-700 uppercase">Garçom Destaque</span>
              </div>
              <h3 className="text-2xl font-black text-orange-900">{stats.garcomDestaque}</h3>
              <p className="text-sm text-orange-700 mt-2">Mais comandas hoje</p>
            </div>

            {/* Horário de Pico */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={20} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase">Horário de Pico</span>
              </div>
              <h3 className="text-2xl font-black text-blue-900">{stats.horarioPico}</h3>
              <p className="text-sm text-blue-700 mt-2">Hora com mais vendas</p>
            </div>

            {/* Estoque Baixo */}
            {stats.itensEstoqueBaixo.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={20} className="text-red-600" />
                  <span className="text-xs font-bold text-red-700 uppercase">Estoque Baixo</span>
                </div>
                <div className="space-y-2">
                  {stats.itensEstoqueBaixo.slice(0, 3).map((item, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-bold text-red-900">{(item.produtos as any)?.nome}</p>
                      <div className="text-xs text-red-700 mt-1">
                        <span className="font-bold">{item.quantidade_atual}</span> un. (mín: {item.quantidade_minima})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo Rápido */}
            <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-zinc-700 uppercase mb-4">Resumo Rápido</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-600">Ativas agora</span>
                  <span className="font-black text-lg text-zinc-900">{comandas.length}</span>
                </div>
                <div className="w-full h-px bg-zinc-200" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-600">Horário de pico</span>
                  <span className="font-bold text-zinc-900">{stats.horarioPico}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
