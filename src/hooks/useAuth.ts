import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../types/database.types';
import { userService } from '../services/userService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeSetUp = useRef(false);

  const fetchProfile = async (currentUser: any) => {
    try {
      const userProfile = await userService.getProfile(currentUser.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      const profileData = {
        id: currentUser.id,
        email: currentUser.email,
        nome: currentUser.user_metadata?.nome || currentUser.email,
        role: currentUser.app_metadata?.role || 'garcom',
        ativo: true
      };
      setProfile(profileData as any);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      }
      setLoading(false);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Setup realtime only once per user
  useEffect(() => {
    if (!user || realtimeSetUp.current) return;
    
    realtimeSetUp.current = true;

    const channel = supabase
      .channel(`usuarios:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usuarios',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return { user, profile, loading, isAdmin: profile?.role === 'admin' };
}
