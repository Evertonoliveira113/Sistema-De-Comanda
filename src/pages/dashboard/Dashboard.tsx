import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useComandas } from '../../hooks/useComandas';
import { formatCurrency } from '../../utils/formatCurrency';
import { 
  TrendingUp, 
  ClipboardList, 
  CheckCircle2, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Package
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { comandas } = useComandas();
  const [stats, setStats] = useState({
    totalVendidoHoje: 0,
    comandasFechadasHoje: 0,
    vendasPorCategoria: [] as any[],
    itensEstoqueBaixo: [] as any[],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // 1. Buscar comandas fechadas hoje
        const { data: fechadas, error: fechadasError } = await supabase
          .from('comandas')
          .select('total')
          .eq('status', 'fechada')
          .gte('data_fechamento', hoje.toISOString());

        if (fechadasError) throw fechadasError;

        const total = fechadas?.reduce((acc, c) => acc + Number(c.total), 0) || 0;

        // 2. Buscar vendas por categoria (Real)
        const { data: itens, error: itensError } = await supabase
          .from('comanda_itens')
          .select('quantidade, produtos(categorias(nome))')
          .gte('created_at', hoje.toISOString());

        if (itensError) throw itensError;

        const catMap: Record<string, number> = {};
        itens?.forEach(i => {
          const catName = (i.produtos as any)?.categorias?.nome || 'Outros';
          catMap[catName] = (catMap[catName] || 0) + i.quantidade;
        });

        const colors = ['#f97316', '#18181b', '#3b82f6', '#8b5cf6'];
        const vendasPorCategoria = Object.entries(catMap).map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length]
        }));

        // 3. Buscar itens com estoque baixo
        const { data: allStock, error: stockError } = await supabase
          .from('estoque')
          .select('quantidade_atual, quantidade_minima, produtos(nome)');

        if (stockError) throw stockError;

        const lowStock = allStock?.filter(item => item.quantidade_atual <= item.quantidade_minima) || [];

        setStats({
          totalVendidoHoje: total,
          comandasFechadasHoje: fechadas?.length || 0,
          vendasPorCategoria: vendasPorCategoria.length > 0 ? vendasPorCategoria : [
            { name: 'Sem Vendas', value: 0, color: '#f4f4f5' }
          ],
          itensEstoqueBaixo: lowStock,
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { 
      label: 'Vendas Hoje', 
      value: formatCurrency(stats.totalVendidoHoje), 
      icon: TrendingUp, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: '+12%',
      trendUp: true
    },
    { 
      label: 'Comandas Abertas', 
      value: comandas.length, 
      icon: ClipboardList, 
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      trend: 'Ativas agora',
      trendUp: true
    },
    { 
      label: 'Fechadas Hoje', 
      value: stats.comandasFechadasHoje, 
      icon: CheckCircle2, 
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: 'Concluídas',
      trendUp: true
    },
    { 
      label: 'Ticket Médio', 
      value: formatCurrency(stats.comandasFechadasHoje > 0 ? stats.totalVendidoHoje / stats.comandasFechadasHoje : 0), 
      icon: Users, 
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      trend: '-2%',
      trendUp: false
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 font-medium">Visão geral do seu restaurante hoje.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="bg-white p-6 rounded-[24px] border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={cn("p-3 rounded-2xl", card.bg)}>
                  <card.icon className={card.color} size={24} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                  card.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {card.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.trend}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">{card.label}</p>
                <h3 className="text-2xl font-black text-zinc-900 mt-1">{card.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm">
              <h3 className="text-xl font-bold text-zinc-900 mb-6">Vendas por Categoria</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.vendasPorCategoria}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f4f4f5' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                      {stats.vendasPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alerta de Estoque Baixo */}
            {stats.itensEstoqueBaixo.length > 0 && (
              <div className="bg-red-50 p-6 rounded-[32px] border border-red-100">
                <h3 className="text-red-900 font-black flex items-center gap-2 mb-4">
                  <Package size={20} />
                  ALERTA DE ESTOQUE BAIXO
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.itensEstoqueBaixo.map((item: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-red-50">
                      <div>
                        <p className="font-bold text-zinc-900">{item.produtos.nome}</p>
                        <p className="text-xs text-zinc-500 font-medium">Mínimo: {item.quantidade_minima}</p>
                      </div>
                      <span className="text-red-600 font-black text-lg">{item.quantidade_atual}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
