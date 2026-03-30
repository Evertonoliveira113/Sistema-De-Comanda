import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Flame, Lock, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-600/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-zinc-900 rounded-3xl mb-6 border border-zinc-800">
            <Flame className="text-orange-500 fill-orange-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            CANTO DO <span className="text-orange-500">PICUÍ</span>
          </h1>
          <p className="text-zinc-400 mt-2">Nova Senha</p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4"
          >
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold text-emerald-900">Senha Redefinida!</h2>
            <p className="text-emerald-700">
              Sua senha foi alterada com sucesso.
            </p>
            <p className="text-sm text-emerald-600">
              Redirecionando para login...
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  minLength={6}
                  className="w-full bg-zinc-900 border border-zinc-700 h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-zinc-600 transition"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  minLength={6}
                  className="w-full bg-zinc-900 border border-zinc-700 h-12 pl-12 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-zinc-600 transition"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="text-xs text-zinc-400">
              ✓ Senha deve ter pelo menos 6 caracteres
            </div>

            <Button 
              type="submit"
              loading={loading}
              className="w-full"
            >
              Redefinir Senha
            </Button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-300 transition font-medium"
            >
              <ChevronLeft size={20} />
              Voltar ao Login
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
