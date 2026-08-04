import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { MealSuggestion } from '../../types';

const SAT_EMOJI: Record<string, string> = {
  filling: '🍽️',
  moderate: '🥗',
  light: '🥙',
};

function MealCard({ meal }: { meal: MealSuggestion }) {
  const [logged, setLogged] = useState(false);

  async function logMeal() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('meal_logs').insert({
      user_id: session.user.id,
      meal_type: 'lunch',
      description: meal.name,
      source: 'ai_suggestion',
    });
    setLogged(true);
  }

  return (
    <View className="bg-slate-800 rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-white font-semibold text-base flex-1 mr-2">{meal.name}</Text>
        <Text className="text-xl">{SAT_EMOJI[meal.estimated_satisfaction] ?? '🍽️'}</Text>
      </View>
      <Text className="text-slate-400 text-sm mb-2">{meal.description}</Text>
      <View className="bg-green-500/10 rounded-lg px-3 py-1.5 mb-2">
        <Text className="text-green-400 text-xs">✓ {meal.why_good}</Text>
      </View>
      <Text className="text-slate-500 text-xs mb-3">{meal.prep_or_order}</Text>
      <TouchableOpacity
        className={`rounded-lg py-2 items-center ${logged ? 'bg-slate-700' : 'bg-green-500/20'}`}
        onPress={logMeal}
        disabled={logged}
      >
        <Text className={logged ? 'text-slate-500 text-sm' : 'text-green-400 text-sm font-medium'}>
          {logged ? 'Logged ✓' : 'Log this meal'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

type MealMode = 'cook' | 'nearby' | 'takeaway';

export default function MealsScreen() {
  const [activeTab, setActiveTab] = useState<MealMode>('cook');
  const [suggestions, setSuggestions] = useState<Record<MealMode, MealSuggestion[]>>({
    cook: [],
    nearby: [],
    takeaway: [],
  });
  const [loading, setLoading] = useState<Record<MealMode, boolean>>({
    cook: false,
    nearby: false,
    takeaway: false,
  });
  const { profile } = useAppStore();

  async function fetchSuggestions(mode: MealMode) {
    setLoading((prev) => ({ ...prev, [mode]: true }));

    let city = profile?.city ?? 'Kuala Lumpur';

    if (mode === 'nearby') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const geo = await Location.reverseGeocodeAsync(loc.coords);
        if (geo[0]?.city) city = geo[0].city;
      }
    }

    const response = await supabase.functions.invoke('ai-meals', {
      body: {
        mode,
        context: getMealContext(),
        city,
        dietary_prefs: profile?.dietary_pref ?? ['halal'],
        count: 3,
      },
    });

    setLoading((prev) => ({ ...prev, [mode]: false }));

    if (response.error || !response.data?.suggestions) {
      Alert.alert('Error', 'Could not load suggestions. Try again.');
      return;
    }

    setSuggestions((prev) => ({ ...prev, [mode]: response.data.suggestions }));
  }

  function getMealContext(): string {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 17) return 'snack';
    return 'dinner';
  }

  // Single effect: fetch for the active tab once profile is loaded and tab has no data.
  // Guarding on profile prevents fetching with silent defaults (no city, no dietary prefs).
  useEffect(() => {
    if (!profile) return;
    if (suggestions[activeTab].length === 0) {
      fetchSuggestions(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profile]);

  const tabs: { key: MealMode; label: string; emoji: string }[] = [
    { key: 'cook', label: 'Cook', emoji: '👨‍🍳' },
    { key: 'nearby', label: 'Nearby', emoji: '📍' },
    { key: 'takeaway', label: 'Takeaway', emoji: '🛵' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
        <View className="pt-6 pb-2 flex-row justify-between items-center">
          <Text className="text-white text-2xl font-bold">Meals</Text>
          <TouchableOpacity
            className="bg-slate-800 rounded-xl px-3 py-1.5"
            onPress={() => fetchSuggestions(activeTab)}
          >
            <Text className="text-slate-300 text-sm">Refresh</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-slate-500 text-sm mb-4">
          {getMealContext().charAt(0).toUpperCase() + getMealContext().slice(1)} ideas for you
        </Text>

        {/* Tabs */}
        <View className="flex-row bg-slate-800 rounded-xl p-1 mb-5">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === tab.key ? 'bg-green-500' : ''}`}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text className={activeTab === tab.key ? 'text-white font-semibold text-sm' : 'text-slate-400 text-sm'}>
                {tab.emoji} {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading[activeTab] ? (
          <View className="items-center mt-12">
            <ActivityIndicator size="large" color="#22c55e" />
            <Text className="text-slate-500 text-sm mt-3">Finding the best options for you...</Text>
          </View>
        ) : suggestions[activeTab].length === 0 ? (
          <View className="items-center mt-12">
            <Text className="text-4xl mb-3">🍽️</Text>
            <Text className="text-slate-400 text-center">
              {profile ? 'Tap Refresh to load suggestions' : 'Loading your profile...'}
            </Text>
          </View>
        ) : (
          suggestions[activeTab].map((meal, i) => <MealCard key={i} meal={meal} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
