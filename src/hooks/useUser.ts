import { useState, useEffect } from 'react';
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
      setLoading(true);
      console.log('useUser: Fetching user');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('useUser: User not authenticated', { userError });
        setError('Usuário não autenticado');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, name, avatar_url')
        .eq('user_id', userData.user.id)
        .single();

      if (profileError) {
        console.error('useUser: Profile fetch failed', { profileError });
        setError('Erro ao carregar perfil: ' + profileError.message);
        setLoading(false);
        return;
      }

      console.log('useUser: Profile fetched', { profileData });
      setProfile(profileData);
      setError(null);
      setLoading(false);
    };

    fetchUser();
  }, []);

  return { profile, loading, error };
};