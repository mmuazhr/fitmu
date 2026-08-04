import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CoachMessage, CoachResponse } from '../types';
import { useAppStore } from '../store/useAppStore';

export function useCoach() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { setWeeklyPlan } = useAppStore();

  const loadHistory = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('coach_conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .limit(30);

    if (data) setMessages(data as CoachMessage[]);
  }, []);

  const sendMessage = useCallback(async (content: string, action?: 'chat' | 'generate_plan') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const userMsg: CoachMessage = {
      id: `temp-${Date.now()}`,
      user_id: session.user.id,
      role: 'user',
      content,
      tokens_used: null,
      model_used: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('ai-coach', {
        body: { message: content, action: action ?? 'chat' },
      });

      if (response.error) throw response.error;

      const data = response.data as CoachResponse;

      const assistantMsg: CoachMessage = {
        id: `temp-assistant-${Date.now()}`,
        user_id: session.user.id,
        role: 'assistant',
        content: data.reply,
        tokens_used: null,
        model_used: 'claude-sonnet-4-6',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.weekly_plan) {
        // Fetch updated plan from DB
        const { data: plan } = await supabase
          .from('weekly_plans')
          .select('*')
          .eq('user_id', session.user.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();
        if (plan) setWeeklyPlan(plan);
      }

      return data;
    } catch (err) {
      console.error('Coach error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, loadHistory, sendMessage };
}
