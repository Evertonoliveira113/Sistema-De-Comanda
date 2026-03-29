import { useState, useEffect } from 'react';
import { comandaService } from '../services/comandaService';
import { Comanda } from '../types/database.types';
import { supabase } from '../services/supabaseClient';

export function useComandas() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComandas = async () => {
    try {
      const data = await comandaService.getActiveComandas();
      setComandas(data);
    } catch (error) {
      console.error('Erro ao buscar comandas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComandas();

    // Inscrição em tempo real para atualizações nas comandas
    const channel = supabase
      .channel('comandas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () => {
        fetchComandas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { comandas, loading, refresh: fetchComandas };
}
