import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { useComandas } from '../../hooks/useComandas';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';
import { Plus, Search, User, Hash, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { comandaService } from '../../services/comandaService';
import { useAuth } from '../../hooks/useAuth';

export default function Comandas() {
  const { comandas, loading, refresh } = useComandas();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newComanda, setNewComanda] = useState({ numero: '' });

  const filteredComandas = comandas.filter(c => 
    c.numero_comanda.toString().includes(searchTerm)
  );

  const handleOpenComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await comandaService.openComanda(
        parseInt(newComanda.numero), 
        user.id
      );
      setIsModalOpen(false);
      setNewComanda({ numero: '' });
      refresh();
    } catch (error: any) {
      if (error.message?.includes('unique')) {
        alert('Já existe uma comanda aberta com este número!');
      } else {
        alert('Erro ao abrir comanda');
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Comandas</h1>
            <p className="text-zinc-500 font-medium">Gerencie os pedidos ativos.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto">
            <Plus size={20} className="mr-2" />
            Nova Comanda
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-200 h-14 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Comandas Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-white animate-pulse rounded-[24px] border border-zinc-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredComandas.map((comanda) => (
              <Link 
                key={comanda.id} 
                to={`/comandas/${comanda.id}`}
                className="bg-white p-6 rounded-[24px] border border-zinc-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-zinc-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold">
                      {comanda.numero_comanda}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</span>
                      <span className="font-bold text-emerald-600">Ativa</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                    Aberta
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Total Acumulado</span>
                    <span className="font-bold text-zinc-900">{formatCurrency(comanda.total)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-full opacity-20" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                    <User size={12} />
                    <span>Garçom: Everton</span>
                  </div>
                </div>

                <Button variant="secondary" className="w-full mt-6 group-hover:bg-orange-600 group-hover:border-orange-600">
                  Ver Detalhes
                </Button>
              </Link>
            ))}
          </div>
        )}

        {/* Modal Nova Comanda */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-black text-zinc-900 mb-6">Abrir Nova Comanda</h2>
              <form onSubmit={handleOpenComanda} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Número da Comanda</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="number"
                      required
                      value={newComanda.numero}
                      onChange={(e) => setNewComanda({ ...newComanda, numero: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 h-14 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-lg font-bold"
                      placeholder="Ex: 42"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Abrir Comanda
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
