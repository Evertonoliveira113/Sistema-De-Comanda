import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { comandaService } from '../../services/comandaService';
import { acompanhamentoService } from '../../services/acompanhamentoService';
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
  , X
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
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null);
  const [availableAcompanhamentos, setAvailableAcompanhamentos] = useState<string[]>([]);
  const [selectedAcompanhamentos, setSelectedAcompanhamentos] = useState<string[]>([]);
  const [precisaPratoOption, setPrecisaPratoOption] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
              width: 48mm;
              max-width: 48mm;
              margin: 0; 
              padding: 2mm;
              font-size: 8.5pt;
              line-height: 1.2;
              box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .flex { display: flex; justify-content: space-between; gap: 4px; }
            .border-b { border-bottom: 1px dashed black; }
            .border-t { border-top: 1px dashed black; }
            .pb-2 { padding-bottom: 4px; }
            .mb-2 { margin-bottom: 4px; }
            .mt-4 { margin-top: 8px; }
            .font-bold { font-weight: bold; }
            p, div { margin: 0 0 2px 0; }
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
      const categoriaId = product.categoria?.id;
      if (!categoriaId) {
        // Sem categoria, adiciona direto
        await comandaService.addItem(id, product.id, 1, product.preco);
        setIsAddingItem(false);
        setSearchTerm('');
        fetchData();
        return;
      }

      // Buscar acompanhamentos ativos para a categoria
      const acompanhamentos = await acompanhamentoService.getByCategoriaAtivos(categoriaId);
      if (!acompanhamentos || acompanhamentos.length === 0) {
        // Nenhum acompanhamento: adiciona direto
        await comandaService.addItem(id, product.id, 1, product.preco);
        setIsAddingItem(false);
        setSearchTerm('');
        fetchData();
        return;
      }

      // Há acompanhamentos: abrir modal de opções com todos selecionados por padrão
      setOptionsProduct(product);
      setAvailableAcompanhamentos(acompanhamentos);
      setSelectedAcompanhamentos(acompanhamentos);
      setPrecisaPratoOption(true);
      setShowOptionsModal(true);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao adicionar item');
    }
  };

  const handleConfirmOptions = async () => {
    if (!id || !optionsProduct) return;
    try {
      await comandaService.addItem(id, optionsProduct.id, 1, optionsProduct.preco, {
        precisa_prato: !!precisaPratoOption,
        acompanhamentos: selectedAcompanhamentos
      });
      setShowOptionsModal(false);
      setOptionsProduct(null);
      setIsAddingItem(false);
      setSearchTerm('');
      fetchData();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao adicionar item com opções');
    }
  };

  const handleUpdateQuantity = async (item: ComandaItem, delta: number) => {
    if (!id) return;
    const novaQtd = item.quantidade + delta;
    if (novaQtd <= 0) {
      try {
        await comandaService.removeItem(item.id, id);
      } catch (error: any) {
        setErrorMessage('Erro ao remover item');
      }
    } else {
      try {
        await comandaService.updateItemQuantity(item.id, id, novaQtd, item.preco_unitario);
      } catch (error: any) {
        setErrorMessage(error.message || 'Erro ao atualizar quantidade');
      }
    }
    fetchData();
  };

  const handleRemoveOneFromProduct = async (productKey: string) => {
    if (!id) return;
    const row = comanda.comanda_itens.find((item: any) => (item.produto?.id || item.produto_id) === productKey && item.quantidade > 0);
    if (!row) return;

    const novaQtd = row.quantidade - 1;
    try {
      if (novaQtd <= 0) {
        await comandaService.removeItem(row.id, id);
      } else {
        await comandaService.updateItemQuantity(row.id, id, novaQtd, row.preco_unitario);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao atualizar quantidade');
    }
    fetchData();
  };

  const amountPaid = Number(amountReceived.replace(',', '.')) || 0;
  const changeAmount = amountPaid > comanda?.total ? amountPaid - comanda.total : 0;
  const totalWith10Percent = (comanda?.total || 0) * 1.1;
  const paymentStatus = amountPaid >= totalWith10Percent
    ? 'Pago com 10% ou mais'
    : amountPaid > (comanda?.total || 0)
      ? 'Pago com valor a mais'
      : amountPaid === (comanda?.total || 0)
        ? 'Pago exato'
        : 'Valor inferior ao total';
  const canConfirmPayment = selectedPaymentMethod !== null && amountPaid >= (comanda?.total || 0);

  const handleCloseComanda = async (metodo: PaymentMethod) => {
    if (!id || !comanda) return;
    if (profile?.role !== 'admin') {
      setErrorMessage('Apenas administradores podem fechar comandas.');
      return;
    }

    const confirmMessage = `Confirma o fechamento da comanda?\nTotal: ${formatCurrency(comanda.total)}\nForma: ${metodo}`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await comandaService.closeComanda(id, {
        valor: comanda.total,
        forma_pagamento: metodo
      });
      setSelectedPaymentMethod(null);
      setAmountReceived('');
      navigate('/comandas');
    } catch (error) {
      setErrorMessage('Erro ao fechar comanda. Verifique se a tabela de pagamentos existe.');
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentMethod) {
      setErrorMessage('Selecione uma forma de pagamento.');
      return;
    }

    if (!canConfirmPayment) {
      setErrorMessage('Informe um valor pago igual ou superior ao total.');
      return;
    }

    const confirmMessage = `Confirma o fechamento da comanda?\nTotal: ${formatCurrency(comanda?.total || 0)}\nValor pago: ${formatCurrency(amountPaid)}\nTroco: ${formatCurrency(changeAmount)}\nForma: ${selectedPaymentMethod}\n${paymentStatus}`;
    if (!window.confirm(confirmMessage)) return;

    await handleCloseComanda(selectedPaymentMethod);
  };

  const handleApplyDiscount = async () => {
    if (!id) return;
    if (profile?.role !== 'admin') {
      setErrorMessage('Apenas administradores podem aplicar descontos.');
      return;
    }
    try {
      await comandaService.updateDiscount(id, Number(discountValue) || 0);
      setIsApplyingDiscount(false);
      fetchData();
    } catch (error) {
      setErrorMessage('Erro ao aplicar desconto');
    }
  };

  if (loading) return <Layout><div className="animate-pulse space-y-4"><div className="h-12 bg-zinc-200 rounded-xl w-1/4"></div><div className="h-64 bg-zinc-200 rounded-3xl"></div></div></Layout>;

  const comandaTipo = comanda?.tipo || comanda?.tipo_comanda || 'local';
  const comandaTipoLabel = comandaTipo === 'retirada' ? 'Retirada' : 'Local';
  const comandaGarcom = comanda?.usuario?.nome || profile?.nome || 'N/A';

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) && p.ativo
  );

  // Agrupar produtos por categoria para exibição organizada
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const categoryName = product.categoria?.nome || 'Geral';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const groupedComandaItems = comanda.comanda_itens.reduce((acc: any[], item: any) => {
    const productKey = item.produto?.id || item.produto_id;
    const existing = acc.find(group => group.key === productKey);
    if (existing) {
      existing.quantidade += item.quantidade;
      existing.subtotal += Number(item.subtotal);
      existing.rows.push(item);
    } else {
      acc.push({
        ...item,
        key: productKey,
        quantidade: item.quantidade,
        subtotal: Number(item.subtotal),
        rows: [item]
      });
    }
    return acc;
  }, [] as any[]);

  const totalItemCount = comanda.comanda_itens.reduce((total: number, item: any) => total + item.quantidade, 0);

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: 48mm auto;
          margin: 0;
        }

        @media print {
          html, body {
            width: 48mm;
            margin: 0;
            padding: 0;
            background: white;
          }

          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 48mm;
            max-width: 48mm;
            padding: 2mm;
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
            font-size: 8.5pt;
            line-height: 1.2;
            color: black;
            background: white;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="max-w-5xl mx-auto space-y-4 pb-32 md:pb-8 md:space-y-6">
        <div className="flex items-center justify-between gap-4 no-print sticky top-0 z-10 bg-zinc-50 p-4 -mx-4 md:bg-transparent md:p-0 md:mx-0 md:relative">
          <div className="flex items-center gap-3 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/comandas')}>
              <ChevronLeft size={24} />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-zinc-900">Comanda #{comanda.numero_comanda}</h1>
              <p className="text-xs md:text-sm text-zinc-500 font-medium">Status: {comanda.status}</p>
              <p className="text-xs md:text-sm text-zinc-500 font-medium">Tipo: {comandaTipoLabel}</p>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="icon" onClick={handlePrint}>
              <Printer size={20} />
            </Button>
            {profile?.role === 'admin' && (
              <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={20} />
              </Button>
            )}
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

        {/* Modal de Opções (Precisa de prato + acompanhamentos dinâmicos) */}
        {showOptionsModal && optionsProduct && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm no-print">
            <div className="bg-white rounded-[24px] p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black">Opções — {optionsProduct.nome}</h3>
                <button onClick={() => setShowOptionsModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-zinc-500">Precisa de prato?</label>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setPrecisaPratoOption(true)}
                      className={`flex-1 p-3 rounded-2xl font-bold ${precisaPratoOption ? 'bg-emerald-50 border border-emerald-500 text-emerald-600' : 'bg-zinc-50 border border-zinc-200'}`}>
                      Sim
                    </button>
                    <button
                      onClick={() => {
                        setPrecisaPratoOption(false);
                        setSelectedAcompanhamentos([]);
                      }}
                      className={`flex-1 p-3 rounded-2xl font-bold ${!precisaPratoOption ? 'bg-rose-50 border border-zinc-200 text-zinc-600' : 'bg-zinc-50 border border-zinc-200'}`}>
                      Não
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-zinc-500">Acompanhamentos</label>
                  <div className="mt-2 grid gap-2">
                    {availableAcompanhamentos.map(name => (
                      <label key={name} className="flex items-center gap-3 p-2 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedAcompanhamentos.includes(name)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedAcompanhamentos(prev => [...prev, name]);
                            else setSelectedAcompanhamentos(prev => prev.filter(x => x !== name));
                          }}
                        />
                        <span className="font-medium">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConfirmOptions} className="flex-1">Adicionar</Button>
                  <Button variant="ghost" onClick={() => setShowOptionsModal(false)}>Cancelar</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Área de Impressão Oculta no Web, Visível no Print */}
        <div id="print-area" className="hidden">
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <h2 className="font-bold">CANTO DO PICUÍ</h2>
            <p>Comanda Nº {comanda.numero_comanda}</p>
            <p>Garçom: {comanda.usuario?.nome || profile?.nome}</p>
          </div>
          <div className="mb-2 text-xs">
            <div>Tipo: {comandaTipoLabel}</div>
            <div>Data: {new Date(comanda.data_abertura).toLocaleDateString('pt-BR')}</div>
          </div>
          <div className="mb-2">
            <p className="font-bold">ITENS:</p>
            {groupedComandaItems.map((item: any) => (
              <div key={item.key} className="flex justify-between text-sm">
                <span>{item.quantidade}x {item.produto?.nome || item.produto_id}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          
          {/* CÁLCULOS PARA TAXA DE SERVIÇO */}
          {(() => {
            const subtotal = comanda.comanda_itens.reduce((acc: number, i: any) => acc + Number(i.subtotal), 0);
            const desconto = comanda.desconto || 0;
            const totalAntesTaxa = subtotal - desconto;
            const taxaServico = totalAntesTaxa * 0.10;
            const totalComTaxa = totalAntesTaxa + taxaServico;

            return (
              <>
                {desconto > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span>DESCONTO:</span>
                    <span>-{formatCurrency(desconto)}</span>
                  </div>
                )}
              
                <div className="border-t border-dashed border-black pt-2 font-bold flex justify-between">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(totalAntesTaxa)}</span>
                </div> 
                 <div className="flex justify-between text-sm mb-2 border-t border-dashed border-black pt-2">
                  <span>TAXA SERVIÇO (10%):</span>
                  <span>{formatCurrency(taxaServico)}</span>
                </div>
                <div className="border-t border-dashed border-black pt-2 font-bold flex justify-between">
                  <span>TOTAL COM TAXA:</span>
                  <span>{formatCurrency(totalComTaxa)}</span>
                </div>
              </>
            );
          })()}
          
          <div className="text-center mt-4 text-[10pt]">
            <p>Data: {new Date(comanda.data_abertura).toLocaleDateString()}</p>
            <p>Obrigado pela preferência!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 no-print">
          {/* Itens da Comanda */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-4 md:p-6 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-orange-500" />
                  Itens
                </h3>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {totalItemCount}
                </span>
              </div>
              
              <div className="divide-y divide-zinc-50 max-h-[40vh] md:max-h-none overflow-y-auto">
                {totalItemCount === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-zinc-400 font-medium mb-4">Nenhum item adicionado.</p>
                    <Button variant="outline" size="sm" onClick={() => setIsAddingItem(true)}>
                      Adicionar Item
                    </Button>
                  </div>
                ) : (
                  groupedComandaItems.map((item: any) => (
                    <div key={item.key} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 text-sm md:text-base truncate">{item.produto?.nome || item.produto_id}</h4>
                        <p className="text-xs text-zinc-500 font-medium">{formatCurrency(item.preco_unitario)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 md:gap-4">
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleRemoveOneFromProduct(item.key)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-orange-100 hover:text-orange-600 transition"
                            aria-label="Remover quantidade"
                          >
                            <Minus size={14} />
                          </button>
                        )}
                        <div className="px-3 py-2 bg-zinc-100 rounded-2xl text-xs md:text-sm font-bold text-zinc-700">
                          x{item.quantidade}
                        </div>
                        <div className="text-right min-w-[60px] md:min-w-[80px]">
                          <p className="font-bold text-zinc-900 text-sm md:text-base">{formatCurrency(item.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 md:p-6 bg-zinc-50 space-y-2">
                <div className="flex justify-between items-center text-xs md:text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest">Subtotal</span>
                  <span className="font-bold text-zinc-900">
                    {formatCurrency(comanda.comanda_itens.reduce((acc: number, i: any) => acc + Number(i.subtotal), 0))}
                  </span>
                </div>
                {comanda.desconto > 0 && (
                  <div className="flex justify-between items-center text-xs md:text-sm text-red-600">
                    <span className="font-bold uppercase tracking-widest">Desconto</span>
                    <span className="font-bold">-{formatCurrency(comanda.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Total</span>
                  <span className="md:text-2xl font-black text-orange-600 text-lg">{formatCurrency(comanda.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ações Rápidas - Desktop */}
          <div className="hidden md:flex flex-col space-y-4">
            <Button className="w-full h-14 text-base" onClick={() => setIsAddingItem(true)}>
              <Plus size={20} className="mr-2" />
              Lançar Itens
            </Button>
            {profile?.role === 'admin' && (
              <Button variant="outline" className="w-full h-14 text-base" onClick={() => {
                setDiscountValue(comanda.desconto?.toString() || '');
                setIsApplyingDiscount(true);
              }}>
                <Minus size={20} className="mr-2" />
                Desconto
              </Button>
            )}
            {profile?.role === 'admin' && (
              <Button variant="secondary" className="w-full h-14 text-base" onClick={() => setIsClosing(true)}>
                <CreditCard size={20} className="mr-2" />
                Fechar
              </Button>
            )}
            {profile?.role === 'admin' && (
              <Button variant="ghost" className="w-full text-red-500 text-base" onClick={() => setShowCancelConfirm(true)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Ações Flutuante - Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 shadow-lg p-3 space-y-2">
          <div className={`grid gap-2 ${profile?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddingItem(true)}>
              <Plus size={16} className="mr-1" />
              {profile?.role === 'admin' ? 'Itens' : 'Adicionar Itens'}
            </Button>
            {profile?.role === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => {
                setDiscountValue(comanda.desconto?.toString() || '');
                setIsApplyingDiscount(true);
              }}>
                <Minus size={16} className="mr-1" />
                Desc.
              </Button>
            )}
            {profile?.role === 'admin' && (
              <Button size="sm" onClick={() => setIsClosing(true)}>
                <CreditCard size={16} className="mr-1" />
                Fechar
              </Button>
            )}
          </div>
          {profile?.role === 'admin' && (
            <Button variant="ghost" className="w-full text-red-500 text-xs" onClick={() => setShowCancelConfirm(true)}>
              Cancelar Comanda
            </Button>
          )}
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
            <div className="bg-white w-full max-w-2xl h-[95vh] md:h-auto md:max-h-[85vh] rounded-t-[32px] md:rounded-[32px] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg md:text-2xl font-black text-zinc-900">Adicionar Produtos</h2>
                <button 
                  onClick={() => {
                    setIsAddingItem(false);
                    setSearchTerm('');
                  }} 
                  className="p-2 hover:bg-zinc-100 rounded-full"
                >
                  <ChevronLeft size={24} className="rotate-[-90deg] md:rotate-0" />
                </button>
              </div>
              
              <div className="p-4 border-b border-zinc-100 sticky top-[60px] md:top-[72px] bg-white z-10">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full bg-zinc-50 border border-zinc-200 h-10 md:h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    Nenhum produto encontrado
                  </div>
                ) : (
                  Object.entries(groupedProducts).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                        {items.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleAddItem(product)}
                            className="flex items-center justify-between p-3 md:p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 hover:bg-orange-50 active:scale-95 transition-all text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-zinc-900 text-sm md:text-base line-clamp-2">{product.nome}</h4>
                              <p className="text-sm md:text-base text-orange-600 font-bold">{formatCurrency(product.preco)}</p>
                            </div>
                            <div className="bg-orange-100 p-2 rounded-lg shadow-sm flex-shrink-0">
                              <Plus size={18} className="text-orange-600" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Desconto */}
        {isApplyingDiscount && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 md:p-8 shadow-2xl">
              <h2 className="text-xl md:text-2xl font-black text-zinc-900 mb-4">Aplicar Desconto</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor (R$)</label>
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
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-md rounded-[32px] p-6 md:p-8 shadow-2xl">
              <div className="relative text-center mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsClosing(false);
                    setSelectedPaymentMethod(null);
                    setAmountReceived('');
                  }}
                  className="absolute right-0 top-0 p-3 rounded-full text-zinc-500 hover:bg-zinc-100"
                >
                  X
                </button>
                <div className="w-16 md:w-20 h-16 md:h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={32} className="text-orange-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-zinc-900">Fechar Comanda</h2>
                <p className="text-xs md:text-sm text-zinc-500 font-medium mt-2">Escolha o pagamento ou volte para lançar produtos.</p>
                <p className="text-xs md:text-sm text-zinc-500 font-medium mt-2">Total: <span className="text-orange-600 font-black text-lg md:text-2xl">{formatCurrency(comanda.total)}</span></p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setSelectedPaymentMethod('Dinheiro')}
                  className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 active:scale-95 transition-all"
                >
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 flex-shrink-0"><Banknote size={20} /></div>
                  <span className="font-bold text-zinc-900 flex-1">Dinheiro</span>
                </button>
                <button 
                  onClick={() => handleCloseComanda('Pix')}
                  className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 active:scale-95 transition-all"
                >
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600 flex-shrink-0"><QrCode size={20} /></div>
                  <span className="font-bold text-zinc-900 flex-1">Pix</span>
                </button>
                <button 
                  onClick={() => handleCloseComanda('Cartão')}
                  className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 active:scale-95 transition-all"
                >
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600 flex-shrink-0"><CreditCard size={20} /></div>
                  <span className="font-bold text-zinc-900 flex-1">Cartão</span>
                </button>
              </div>

              {selectedPaymentMethod && (
                <div className="mt-4 space-y-4 p-4 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor pago</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full bg-white border border-zinc-200 h-12 px-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-700">
                    <span>Total</span>
                    <span>{formatCurrency(comanda.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-700">
                    <span>Total com 10%</span>
                    <span>{formatCurrency(totalWith10Percent)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-700">
                    <span>Pagamento</span>
                    <span>{paymentStatus}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-green-700">
                    <span>Troco</span>
                    <span>{formatCurrency(changeAmount)}</span>
                  </div>
                  <Button disabled={!canConfirmPayment} onClick={handleConfirmPayment}>
                    Confirmar pagamento
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
