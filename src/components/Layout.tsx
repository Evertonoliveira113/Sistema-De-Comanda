import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  Tags, 
  LogOut,
  Menu,
  X,
  Flame,
  Users,
  History,
  BarChart3,
  Box
} from 'lucide-react';
import { Button } from './ui/Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', adminOnly: false },
    { icon: ClipboardList, label: 'Comandas', path: '/comandas', adminOnly: false },
    { icon: History, label: 'Histórico', path: '/historico', adminOnly: false },
    { icon: Package, label: 'Produtos', path: '/produtos', adminOnly: true },
    { icon: Tags, label: 'Categorias', path: '/categorias', adminOnly: true },
    { icon: Box, label: 'Estoque', path: '/estoque', adminOnly: true },
    { icon: Users, label: 'Usuários', path: '/usuarios', adminOnly: true },
    { icon: BarChart3, label: 'Relatórios', path: '/relatorios', adminOnly: true },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-zinc-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Flame className="text-orange-500 fill-orange-500" size={24} />
          <span className="font-bold tracking-tight">CANTO DO PICUÍ</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar / Mobile Menu */}
      <aside className={cn(
        "fixed inset-0 z-40 bg-zinc-900 text-white transition-transform md:relative md:translate-x-0 md:w-64 flex flex-col",
        isMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 hidden md:flex items-center gap-3">
          <Flame className="text-orange-500 fill-orange-500" size={32} />
          <div className="flex flex-col">
            <span className="font-black text-xl leading-none tracking-tighter">CANTO DO</span>
            <span className="font-black text-xl leading-none tracking-tighter text-orange-500">PICUÍ</span>
          </div>
        </div>

        <div className="px-6 py-4 mb-4 border-b border-zinc-800">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Logado como</p>
          <p className="font-bold text-white truncate">{profile?.nome || 'Carregando...'}</p>
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{profile?.role}</p>
        </div>

        <nav className="flex-1 px-4 py-4 md:py-0 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors",
                  isActive ? "bg-orange-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                <item.icon size={18} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
