import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { WeightLog } from '../types';

interface UseWeightLogResult {
  latestWeight: WeightLog | null;
  isLoading: boolean;
  error: string | null;
  logWeight: (weight_kg: number, note?: string) => Promise<void>;
  fetchHistory: (days?: number) => Promise<WeightLog[]>;
  refetch: () => Promise<void>;
}

export function useWeightLog(): UseWeightLogResult {
  const { latestWeight, setLatestWeight } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: dbError } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is not an error
        setError(dbError.message);
        return;
      }
      if (data) setLatestWeight(data as WeightLog);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load weight');
    } finally {
      setIsLoading(false);
    }
  }, [setLatestWeight]);

  const fetchHistory = useCallback(async (days = 30): Promise<WeightLog[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true });

    return (data ?? []) as WeightLog[];
  }, []);

  const logWeight = useCallback(async (weight_kg: number, note?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight_kg,
      note: note ?? null,
      source: 'manual',
    });

    await fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  return { latestWeight, isLoading, error, logWeight, fetchHistory, refetch: fetchLatest };
}
