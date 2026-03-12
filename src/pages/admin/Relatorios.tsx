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
import { TrendingUp, DollarSign, ShoppingBag, Users, Clock, CreditCard } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Relatorios() {
  const [data, setData] = useState<any>({
    totalVendido: 0,
    ticketMedio: 0,
    produtoMaisVendido: 'Nenhum',
    horarioPico: '19:00 - 21:00',
    vendasPorGarcom: [],
    formasPagamento: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      try {
        // 1. Total Vendido e Ticket Médio
        const { data: comandas, error: comandasError } = await supabase
          .from('comandas')
          .select('total, usuario_id, usuarios(nome)')
          .eq('status', 'fechada');

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
          .select('valor, forma_pagamento');

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
          .select('quantidade, produtos(nome)');

        if (itensError) throw itensError;

        const produtosMap: Record<string, number> = {};
        itens.forEach(i => {
          const nome = (i.produtos as any)?.nome || 'Desconhecido';
          produtosMap[nome] = (produtosMap[nome] || 0) + i.quantidade;
        });

        const produtoMaisVendido = Object.entries(produtosMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';

        setData({
          totalVendido,
          ticketMedio,
          produtoMaisVendido,
          horarioPico: '19:00 - 21:00',
          vendasPorGarcom,
          formasPagamento: formasPagamento.length > 0 ? formasPagamento : []
        });
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, []);

  if (loading) return <Layout>Carregando...</Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Relatórios</h1>
          <p className="text-zinc-500 font-medium">Análise detalhada do seu negócio.</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4">
              <DollarSign size={24} />
            </div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Total Vendido</p>
            <h3 className="text-2xl font-black text-zinc-900">{formatCurrency(data.totalVendido)}</h3>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4">
              <TrendingUp size={24} />
            </div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Ticket Médio</p>
            <h3 className="text-2xl font-black text-zinc-900">{formatCurrency(data.ticketMedio)}</h3>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit mb-4">
              <ShoppingBag size={24} />
            </div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Mais Vendido</p>
            <h3 className="text-xl font-black text-zinc-900 truncate">{data.produtoMaisVendido}</h3>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-4">
              <Clock size={24} />
            </div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Horário Pico</p>
            <h3 className="text-xl font-black text-zinc-900">{data.horarioPico}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Garçons */}
          <div className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm">
            <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Users size={20} className="text-orange-500" />
              Vendas por Garçom
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.vendasPorGarcom}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Pagamentos */}
          <div className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm">
            <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <CreditCard size={20} className="text-orange-500" />
              Formas de Pagamento
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.formasPagamento}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.formasPagamento.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {data.formasPagamento.map((item: any) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
