import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { Profile } from '../types';

interface UseProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const { profile, setProfile } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbError) {
        setError(dbError.message);
        return;
      }
      if (data) setProfile(data as Profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [setProfile]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!mounted) return;
        if (dbError) { setError(dbError.message); return; }
        if (data) setProfile(data as Profile);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [setProfile]);

  return { profile, isLoading, error, refetch };
}
