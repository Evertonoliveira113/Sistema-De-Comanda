import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { comandaService } from '../../services/comandaService';
import { produtoService } from '../../services/produtoService';
import { Comanda, Product, ComandaItem, PaymentMethod } from '../../types/database.types';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../../components/ui/Button';
import { 
  Plus, 
  Minus, 
  Trash2, 
  ChevronLeft, 
  CreditCard, 
  Banknote, 
  QrCode,
  Search,
  ShoppingCart,
  Printer
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function ComandaAtiva() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [comanda, setComanda] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [comandaData, productsData] = await Promise.all([
        comandaService.getComandaById(id),
        produtoService.getProducts()
      ]);
      setComanda(comandaData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handlePrint = () => {
    const printContent = document.getElementById('print-area');
    if (!printContent) return;
    
    const win = window.open('', '', 'width=800,height=600');
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Imprimir Comanda</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              margin: 0; 
              padding: 5mm;
              font-size: 10pt;
            }
            .text-center { text-align: center; }
            .flex { display: flex; justify-content: space-between; }
            .border-b { border-bottom: 1px dashed black; }
            .border-t { border-top: 1px dashed black; }
            .pb-2 { padding-bottom: 8px; }
            .mb-2 { margin-bottom: 8px; }
            .mt-4 { margin-top: 16px; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleCancelComanda = async () => {
    if (!id) return;
    if (profile?.role !== 'admin') {
      setErrorMessage('Apenas administradores podem cancelar comandas.');
      return;
    }
    try {
      await comandaService.cancelComanda(id);
      navigate('/comandas');
    } catch (error) {
      setErrorMessage('Erro ao cancelar comanda');
    }
  };

  const handleDeleteComanda = async () => {
    if (!id) return;
    if (profile?.role !== 'admin') {
      setErrorMessage('Apenas administradores podem excluir comandas.');
      return;
    }
    try {
      await comandaService.deleteComanda(id);
      navigate('/comandas');
    } catch (error) {
      setErrorMessage('Erro ao excluir comanda');
    }
  };

  const handleAddItem = async (product: Product) => {
    if (!id) return;
    try {
      await comandaService.addItem(id, product.id, 1, product.preco);
      fetchData();
    } catch (error) {
      setErrorMessage('Erro ao adicionar item');
    }
  };

  const handleUpdateQuantity = async (item: ComandaItem, delta: number) => {
    if (!id) return;
    const novaQtd = item.quantidade + delta;
    if (novaQtd <= 0) {
      try {
        await comandaService.removeItem(item.id, id);
      } catch (error) {
        setErrorMessage('Erro ao remover item');
      }
    } else {
      try {
        await comandaService.updateItemQuantity(item.id, id, novaQtd, item.preco_unitario);
      } catch (error) {
        setErrorMessage('Erro ao atualizar quantidade');
      }
    }
    fetchData();
  };

  const handleCloseComanda = async (metodo: PaymentMethod) => {
    if (!id || !comanda) return;
    try {
      await comandaService.closeComanda(id, {
        valor: comanda.total,
        forma_pagamento: metodo
      });
      navigate('/comandas');
    } catch (error) {
      setErrorMessage('Erro ao fechar comanda. Verifique se a tabela de pagamentos existe.');
    }
  };

  const handleApplyDiscount = async () => {
    if (!id) return;
    try {
      await comandaService.updateDiscount(id, Number(discountValue) || 0);
      setIsApplyingDiscount(false);
      fetchData();
    } catch (error) {
      setErrorMessage('Erro ao aplicar desconto');
    }
  };

  if (loading) return <Layout><div className="animate-pulse space-y-4"><div className="h-12 bg-zinc-200 rounded-xl w-1/4"></div><div className="h-64 bg-zinc-200 rounded-3xl"></div></div></Layout>;

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            color: black;
            background: white;
          }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
        <div className="flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/comandas')}>
              <ChevronLeft size={24} />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-zinc-900">Comanda #{comanda.numero_comanda}</h1>
              <p className="text-zinc-500 font-medium">Status: {comanda.status}</p>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={handlePrint}>
              <Printer size={20} className="mr-2" />
              Imprimir
            </Button>
            <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={20} />
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl flex justify-between items-center">
            <span className="font-medium">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <Plus size={18} className="rotate-45" />
            </button>
          </div>
        )}

        {/* Área de Impressão Oculta no Web, Visível no Print */}
        <div id="print-area" className="hidden">
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <h2 className="font-bold">CANTO DO PICUÍ</h2>
            <p>Comanda Nº {comanda.numero_comanda}</p>
            <p>Garçom: {comanda.usuario?.nome || profile?.nome}</p>
          </div>
          <div className="mb-2">
            <p className="font-bold">ITENS:</p>
            {comanda.comanda_itens.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.quantidade}x {item.produto.nome}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          {comanda.desconto > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span>DESCONTO:</span>
              <span>-{formatCurrency(comanda.desconto)}</span>
            </div>
          )}
          <div className="border-t border-dashed border-black pt-2 font-bold flex justify-between">
            <span>TOTAL:</span>
            <span>{formatCurrency(comanda.total)}</span>
          </div>
          <div className="text-center mt-4 text-[10pt]">
            <p>Data: {new Date(comanda.data_abertura).toLocaleDateString()}</p>
            <p>Obrigado pela preferência!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          {/* Itens da Comanda */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-orange-500" />
                  Itens Consumidos
                </h3>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {comanda.comanda_itens.length} itens
                </span>
              </div>
              
              <div className="divide-y divide-zinc-50">
                {comanda.comanda_itens.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-zinc-400 font-medium">Nenhum item adicionado ainda.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setIsAddingItem(true)}>
                      Adicionar Primeiro Item
                    </Button>
                  </div>
                ) : (
                  comanda.comanda_itens.map((item: any) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-bold text-zinc-900">{item.produto.nome}</h4>
                        <p className="text-xs text-zinc-500 font-medium">{formatCurrency(item.preco_unitario)} / un</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-zinc-100 rounded-xl p-1">
                          <button 
                            onClick={() => handleUpdateQuantity(item, -1)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-orange-600"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-bold text-zinc-900">{item.quantidade}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item, 1)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-orange-600"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-bold text-zinc-900">{formatCurrency(item.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-zinc-50 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest">Subtotal</span>
                  <span className="font-bold text-zinc-900">
                    {formatCurrency(comanda.comanda_itens.reduce((acc: number, i: any) => acc + Number(i.subtotal), 0))}
                  </span>
                </div>
                {comanda.desconto > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-600">
                    <span className="font-bold uppercase tracking-widest">Desconto</span>
                    <span className="font-bold">-{formatCurrency(comanda.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Total da Comanda</span>
                  <span className="text-2xl font-black text-orange-600">{formatCurrency(comanda.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="space-y-4">
            <Button className="w-full h-16 text-lg" onClick={() => setIsAddingItem(true)}>
              <Plus size={24} className="mr-2" />
              Lançar Itens
            </Button>
            <Button variant="outline" className="w-full h-16 text-lg" onClick={() => {
              setDiscountValue(comanda.desconto?.toString() || '');
              setIsApplyingDiscount(true);
            }}>
              <Minus size={24} className="mr-2" />
              Aplicar Desconto
            </Button>
            <Button variant="secondary" className="w-full h-16 text-lg" onClick={() => setIsClosing(true)}>
              <CreditCard size={24} className="mr-2" />
              Fechar Conta
            </Button>
            {profile?.role === 'admin' && (
              <Button variant="ghost" className="w-full text-red-500" onClick={() => setShowCancelConfirm(true)}>
                Cancelar Comanda
              </Button>
            )}
          </div>
        </div>

        {/* Modais de Confirmação */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center">
              <h3 className="text-xl font-black text-zinc-900 mb-2">Cancelar Comanda?</h3>
              <p className="text-zinc-500 mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex flex-col gap-2">
                <Button variant="danger" onClick={handleCancelComanda}>Sim, Cancelar</Button>
                <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>Voltar</Button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center">
              <h3 className="text-xl font-black text-zinc-900 mb-2">Excluir Comanda?</h3>
              <p className="text-zinc-500 mb-6">A comanda será removida permanentemente do sistema.</p>
              <div className="flex flex-col gap-2">
                <Button variant="danger" onClick={handleDeleteComanda}>Sim, Excluir</Button>
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Adicionar Itens */}
        {isAddingItem && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-zinc-950/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[80vh] rounded-t-[32px] md:rounded-[32px] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-zinc-900">Adicionar Produtos</h2>
                <button onClick={() => setIsAddingItem(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <ChevronLeft size={24} className="rotate-[-90deg] md:rotate-0" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleAddItem(product)}
                    className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 hover:bg-orange-50 transition-all text-left"
                  >
                    <div>
                      <h4 className="font-bold text-zinc-900">{product.nome}</h4>
                      <p className="text-sm text-orange-600 font-bold">{formatCurrency(product.preco)}</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Plus size={18} className="text-zinc-900" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Desconto */}
        {isApplyingDiscount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-zinc-900 mb-4">Aplicar Desconto</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor do Desconto (R$)</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0,00"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleApplyDiscount}>Aplicar</Button>
                  <Button variant="ghost" onClick={() => setIsApplyingDiscount(false)}>Cancelar</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Fechamento */}
        {isClosing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={40} className="text-orange-600" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900">Fechar Comanda</h2>
                <p className="text-zinc-500 font-medium">Total a pagar: <span className="text-orange-600 font-black">{formatCurrency(comanda.total)}</span></p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleCloseComanda('Dinheiro')}
                  className="flex items-center gap-4 p-5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 transition-all"
                >
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><Banknote size={24} /></div>
                  <span className="font-bold text-zinc-900">Dinheiro</span>
                </button>
                <button 
                  onClick={() => handleCloseComanda('Pix')}
                  className="flex items-center gap-4 p-5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 transition-all"
                >
                  <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><QrCode size={24} /></div>
                  <span className="font-bold text-zinc-900">Pix</span>
                </button>
                <button 
                  onClick={() => handleCloseComanda('Cartão')}
                  className="flex items-center gap-4 p-5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 transition-all"
                >
                  <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><CreditCard size={24} /></div>
                  <span className="font-bold text-zinc-900">Cartão de Crédito/Débito</span>
                </button>
              </div>

              <Button variant="ghost" className="w-full mt-6" onClick={() => setIsClosing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
