import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

export const useUser = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('useUser: auth.getUser', { user, authError });
        if (authError || !user) {
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        console.log('useUser: profile fetch', { data, error });
        if (error) {
          setError('Erro ao buscar perfil: ' + error.message);
        } else if (!data) {
          setError('Perfil não encontrado para o usuário');
        } else {
          setProfile(data);
          setError(null);
        }
      } catch (err) {
        console.error('useUser: unexpected error', err);
        setError('Erro inesperado: ' + (err as Error).message);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  return { profile, loading, error };
};