import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { supabase } from '../lib/supabase';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    // Background session check — does not block render
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (!profile) router.replace('/(auth)/onboarding');
        else router.replace('/(tabs)');
      } catch {
        // ignore — stay on current screen
      }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) router.replace('/(auth)/login');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
