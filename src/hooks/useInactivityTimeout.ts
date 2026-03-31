import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Hook para monitorar a inatividade do usuário e realizar logout automático.
 * @param timeoutMs Tempo em milissegundos (padrão: 2 horas)
 */
export function useInactivityTimeout(timeoutMs: number = 2 * 60 * 60 * 1000) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // Redireciona para a tela de login e limpa o estado da aba
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao realizar logout por inatividade:', error);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleLogout, timeoutMs);
  }, [handleLogout, timeoutMs]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const onActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, onActivity));
    resetTimer(); // Inicia o contador assim que o hook é montado

    return () => {
      events.forEach(event => window.removeEventListener(event, onActivity));
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);
}