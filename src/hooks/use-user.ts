'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

type Subscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
  stripe_subscription_id: string | null;
};

type Profile = {
  id: string;
  user_id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  subscription?: Subscription | null;
  [key: string]: any;
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshProfile = async (userId: string) => {
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, profile_photos(*), profile_interests(*)')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch active subscription data
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      // Combine profile and subscription data
      const updatedProfile = profileData
        ? { ...profileData, subscription: subscriptionData || null }
        : null;

      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Error refreshing profile or subscription:', err);
      setError(err as Error);
      return null;
    }
  };

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(session.user);

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, profile_photos(*), profile_interests(*)')
          .eq('user_id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // Fetch active subscription data
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .gte('ends_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          throw subscriptionError;
        }

        // Combine profile and subscription data
        const updatedProfile = profileData
          ? { ...profileData, subscription: subscriptionData || null }
          : null;

        setProfile(updatedProfile);
      } catch (err) {
        console.error('Erro ao buscar usuário ou assinatura:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndProfile();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setUser(session.user);

        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, profile_photos(*), profile_interests(*)')
          .eq('user_id', session.user.id)
          .single();

        // Fetch active subscription data
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .gte('ends_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('Erro ao buscar assinatura:', subscriptionError);
        }

        // Combine profile and subscription data
        const updatedProfile = profileData
          ? { ...profileData, subscription: subscriptionData || null }
          : null;

        setProfile(updatedProfile);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, isLoading, error, refreshProfile };
}
