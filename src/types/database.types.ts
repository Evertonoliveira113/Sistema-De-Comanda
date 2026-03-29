export type UserRole = 'admin' | 'garcom';

export type UserProfile = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  nome: string;
  created_at: string;
};

export type Product = {
  id: string;
  nome: string;
  preco: number;
  categoria_id: string;
  ativo: boolean;
  quantidade_minima?: number;
  created_at: string;
  categoria?: Category;
  estoque?: Inventory;
};

export type Inventory = {
  id: string;
  produto_id: string;
  quantidade_atual: number;
  quantidade_minima: number;
  ultima_atualizacao: string;
};

export type ComandaStatus = 'aberta' | 'fechada' | 'cancelada';

export type Comanda = {
  id: string;
  numero_comanda: number;
  status: ComandaStatus;
  total: number;
  desconto: number;
  data_abertura: string;
  data_fechamento?: string;
  usuario_id: string;
  created_at: string;
  usuario?: UserProfile;
};

export type ComandaItem = {
  id: string;
  comanda_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  created_at: string;
  produto?: Product;
};

export type PaymentMethod = 'Dinheiro' | 'Pix' | 'Cartão';

export type Payment = {
  id: string;
  comanda_id: string;
  valor: number;
  forma_pagamento: PaymentMethod;
  data_pagamento: string;
};
