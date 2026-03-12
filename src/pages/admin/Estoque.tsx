import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { estoqueService } from '../../services/estoqueService';
import { produtoService } from '../../services/produtoService';
import { Button } from '../../components/ui/Button';
import { AlertCircle, Package, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';

export default function Estoque() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await estoqueService.getInventory();
      setInventory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUpdateStock = async (produtoId: string, novaQtd: number) => {
    try {
      await estoqueService.updateStock(produtoId, novaQtd);
      fetchInventory();
    } catch (error) {
      alert('Erro ao atualizar estoque');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Estoque</h1>
            <p className="text-zinc-500 font-medium">Controle de insumos e produtos.</p>
          </div>
          <Button variant="outline" onClick={fetchInventory}>
            <RefreshCw size={18} className="mr-2" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map(item => {
            const isLow = item.quantidade_atual <= item.quantidade_minima;
            return (
              <div key={item.id} className={clsx(
                "bg-white p-6 rounded-[24px] border shadow-sm transition-all",
                isLow ? "border-red-200 bg-red-50/30" : "border-zinc-100"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "p-3 rounded-xl",
                      isLow ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-500"
                    )}>
                      <Package size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">{item.produto.nome}</h3>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">ID: {item.produto_id.slice(0,8)}</p>
                    </div>
                  </div>
                  {isLow && (
                    <div className="flex items-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-red-100">
                      <AlertCircle size={12} />
                      Baixo
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <input 
                      type="number"
                      value={item.quantidade_atual}
                      onChange={(e) => handleUpdateStock(item.produto_id, parseInt(e.target.value) || 0)}
                      className="text-4xl font-black text-zinc-900 bg-transparent border-none outline-none w-24 focus:ring-2 focus:ring-orange-500 rounded-lg"
                    />
                    <span className="text-zinc-400 font-bold text-sm ml-2">unidades</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateStock(item.produto_id, item.quantidade_atual - 1)}
                      className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-colors"
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button 
                      onClick={() => handleUpdateStock(item.produto_id, item.quantidade_atual + 1)}
                      className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
                    >
                      <ArrowUp size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Mínimo: {item.quantidade_minima}</span>
                  <span>Última: {new Date(item.ultima_atualizacao).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
