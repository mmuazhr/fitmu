import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { useProfile } from '../../hooks/useProfile';
import { useWeightLog } from '../../hooks/useWeightLog';
import { useHealthData } from '../../hooks/useHealthData';
import { StatCard } from '../../components/shared/StatCard';
import { ProgressRing } from '../../components/shared/ProgressRing';
import { calculateBmi, calculateStreak } from '../../lib/health-utils';

export default function DashboardScreen() {
  const { profile, error: profileError, refetch: refetchProfile } = useProfile();
  const { latestWeight, logWeight, error: weightError, refetch: refetchWeight } = useWeightLog();
  const { steps, caloriesBurned, error: healthError } = useHealthData();
  const { todayLog, weeklyPlan } = useAppStore();

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function calcStreak() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('daily_logs')
        .select('log_date')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(60);

      if (!data?.length) return;
      setStreak(calculateStreak(data.map((r) => r.log_date)));
    }
    calcStreak();
  }, []);

  const waterMl = todayLog?.water_ml ?? 0;
  const waterTarget = 3000;
  const todayHabit = weeklyPlan?.plan_json?.days?.find(
    (d) => d.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
  )?.daily_habit;

  async function handleLogWeight() {
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg < 30 || kg > 400) {
      Alert.alert('Enter a valid weight (30–400 kg)');
      return;
    }
    await logWeight(kg, noteInput.trim() || undefined);
    setShowWeightModal(false);
    setWeightInput('');
    setNoteInput('');
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchWeight()]);
    setRefreshing(false);
  }, [refetchProfile, refetchWeight]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const hasError = Boolean(profileError ?? weightError ?? healthError);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
      >
        {/* Header */}
        <View className="pt-6 pb-4">
          <Text className="text-slate-400 text-sm">{greeting()},</Text>
          <Text className="text-white text-2xl font-bold">
            {profile?.display_name ?? 'Champion'}
          </Text>
        </View>

        {/* Error banner */}
        {hasError && (
          <View className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 mb-3 flex-row items-center justify-between">
            <Text className="text-red-400 text-sm flex-1">Failed to load data. Pull down to retry.</Text>
            <TouchableOpacity onPress={() => Promise.all([refetchProfile(), refetchWeight()])}>
              <Text className="text-red-400 text-sm font-semibold ml-3">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Focus */}
        {todayHabit && (
          <View className="bg-green-500/15 border border-green-500/30 rounded-2xl p-4 mb-4">
            <Text className="text-green-400 text-xs font-semibold mb-1">TODAY'S FOCUS</Text>
            <Text className="text-white text-base">{todayHabit}</Text>
          </View>
        )}

        {/* Streak */}
        {streak > 0 && (
          <View className="bg-orange-500/15 border border-orange-500/30 rounded-2xl p-4 mb-3 flex-row items-center gap-3">
            <Text className="text-3xl">🔥</Text>
            <View>
              <Text className="text-orange-400 font-bold text-xl">{streak} day streak</Text>
              <Text className="text-slate-400 text-xs">Keep logging to keep it alive</Text>
            </View>
          </View>
        )}

        {/* Weight + Water row */}
        <View className="flex-row gap-3 mb-3">
          <StatCard
            emoji="⚖️"
            label="Current Weight"
            value={latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
            sub={profile?.goal_weight ? `Goal: ${profile.goal_weight} kg` : undefined}
          />
          <View className="flex-1 items-center justify-center bg-slate-800 rounded-2xl p-4">
            <ProgressRing
              current={Math.round(waterMl / 100) * 100 / 100}
              total={waterTarget}
              label="Water"
              unit="ml"
              size={90}
            />
          </View>
        </View>

        {/* Steps + Calories row */}
        <View className="flex-row gap-3 mb-3">
          <StatCard emoji="👟" label="Steps Today" value={steps.toLocaleString()} sub="from Apple Health" />
          <StatCard emoji="🔥" label="Calories Burned" value={`${caloriesBurned} kcal`} sub="active energy" />
        </View>

        {/* Log Weight button */}
        <TouchableOpacity
          className="bg-green-500 rounded-2xl py-4 items-center mb-3"
          onPress={() => setShowWeightModal(true)}
        >
          <Text className="text-white font-semibold text-base">Log Today's Weight</Text>
        </TouchableOpacity>

        {/* BMI info */}
        {latestWeight && profile && (
          <View className="bg-slate-800 rounded-2xl p-4 mb-3">
            <Text className="text-slate-400 text-xs mb-1">CURRENT BMI</Text>
            <Text className="text-white text-xl font-bold">
              {calculateBmi(latestWeight.weight_kg, profile.height_cm).toFixed(1)}
            </Text>
            <Text className="text-slate-500 text-xs mt-0.5">
              Target BMI: {calculateBmi(profile.goal_weight, profile.height_cm).toFixed(1)}
            </Text>
          </View>
        )}

        {/* Medical disclaimer */}
        <View className="bg-slate-800/50 rounded-xl p-3 mt-2">
          <Text className="text-slate-500 text-xs text-center">
            fitmu is not a medical device. Consult a doctor before starting any diet or exercise programme.
          </Text>
        </View>
      </ScrollView>

      {/* Weight Log Modal */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-slate-800 rounded-t-3xl p-6">
            <Text className="text-white text-xl font-bold mb-4">Log Weight</Text>
            <TextInput
              className="bg-slate-700 text-white rounded-xl px-4 py-3 text-lg mb-3"
              placeholder="e.g. 169.5"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <TextInput
              className="bg-slate-700 text-white rounded-xl px-4 py-3 mb-5"
              placeholder="Note (optional)"
              placeholderTextColor="#64748b"
              value={noteInput}
              onChangeText={setNoteInput}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-700 rounded-xl py-4 items-center"
                onPress={() => setShowWeightModal(false)}
              >
                <Text className="text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-green-500 rounded-xl py-4 items-center"
                onPress={handleLogWeight}
              >
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
