import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { MealLog, DailyLog } from '../../types';
import { ProgressRing } from '../../components/shared/ProgressRing';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const WATER_TARGET = 3000;
const WATER_INCREMENT = 250;

export default function LogScreen() {
  const { todayLog, updateWater, setTodayLog } = useAppStore();
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [mealDesc, setMealDesc] = useState('');
  const [mealType, setMealType] = useState<typeof MEAL_TYPES[number]>('lunch');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      await loadTodayLog(session.user.id);
      await loadMealLogs(session.user.id);
    }
    init();
  }, []);

  async function loadTodayLog(uid: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', uid)
      .eq('log_date', today)
      .single();

    if (data) {
      setTodayLog(data as DailyLog);
    } else {
      // Create today's log row
      const { data: newLog } = await supabase
        .from('daily_logs')
        .insert({ user_id: uid, log_date: today })
        .select()
        .single();
      if (newLog) setTodayLog(newLog as DailyLog);
    }
  }

  async function loadMealLogs(uid: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', uid)
      .eq('log_date', today)
      .order('eaten_at', { ascending: true });

    if (data) setMealLogs(data as MealLog[]);
  }

  async function addWater() {
    if (!userId || !todayLog) return;
    const newWater = (todayLog.water_ml ?? 0) + WATER_INCREMENT;

    await supabase
      .from('daily_logs')
      .update({ water_ml: newWater })
      .eq('id', todayLog.id);

    updateWater(newWater);
  }

  async function updateMood(mood: number) {
    if (!userId || !todayLog) return;
    await supabase
      .from('daily_logs')
      .update({ mood })
      .eq('id', todayLog.id);
    setTodayLog({ ...todayLog, mood });
  }

  async function updateEnergy(energy_level: number) {
    if (!userId || !todayLog) return;
    await supabase
      .from('daily_logs')
      .update({ energy_level })
      .eq('id', todayLog.id);
    setTodayLog({ ...todayLog, energy_level });
  }

  async function addMeal() {
    if (!userId || !mealDesc.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('meal_logs')
      .insert({
        user_id: userId,
        log_date: today,
        meal_type: mealType,
        description: mealDesc.trim(),
        source: 'manual',
      })
      .select()
      .single();

    if (data) {
      setMealLogs((prev) => [...prev, data as MealLog]);
      setMealDesc('');
      setShowAddMeal(false);
    }
  }

  const water = todayLog?.water_ml ?? 0;
  const mood = todayLog?.mood;
  const energy = todayLog?.energy_level;

  const moodEmoji = ['😞', '😕', '😐', '😊', '😄'];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
        <Text className="text-white text-2xl font-bold pt-6 mb-5">Daily Log</Text>

        {/* Water tracker */}
        <View className="bg-slate-800 rounded-2xl p-5 mb-4">
          <Text className="text-white font-semibold text-base mb-4">Water Intake 💧</Text>
          <View className="items-center mb-4">
            <ProgressRing
              current={water}
              total={WATER_TARGET}
              label={`${water}ml of ${WATER_TARGET}ml`}
              unit="ml"
              size={120}
            />
          </View>
          <TouchableOpacity
            className="bg-blue-500/20 border border-blue-500/40 rounded-xl py-3 items-center"
            onPress={addWater}
          >
            <Text className="text-blue-300 font-semibold">+ {WATER_INCREMENT}ml</Text>
          </TouchableOpacity>
          {water >= WATER_TARGET && (
            <Text className="text-green-400 text-center text-sm mt-2">Target reached!</Text>
          )}
        </View>

        {/* Mood */}
        <View className="bg-slate-800 rounded-2xl p-5 mb-4">
          <Text className="text-white font-semibold text-base mb-3">How are you feeling? 😊</Text>
          <View className="flex-row justify-between">
            {moodEmoji.map((emoji, i) => (
              <TouchableOpacity
                key={i}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  mood === i + 1 ? 'bg-green-500' : 'bg-slate-700'
                }`}
                onPress={() => updateMood(i + 1)}
              >
                <Text className="text-2xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Energy */}
        <View className="bg-slate-800 rounded-2xl p-5 mb-4">
          <Text className="text-white font-semibold text-base mb-3">Energy Level ⚡</Text>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                className={`flex-1 py-3 rounded-xl items-center ${
                  energy === level ? 'bg-yellow-500' : 'bg-slate-700'
                }`}
                onPress={() => updateEnergy(level)}
              >
                <Text className={energy === level ? 'text-white font-bold' : 'text-slate-400'}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-slate-600 text-xs">Low</Text>
            <Text className="text-slate-600 text-xs">High</Text>
          </View>
        </View>

        {/* Meals today */}
        <View className="bg-slate-800 rounded-2xl p-5 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-semibold text-base">Meals Today 🍽️</Text>
            <TouchableOpacity
              className="bg-green-500 rounded-lg px-3 py-1.5"
              onPress={() => setShowAddMeal(true)}
            >
              <Text className="text-white text-sm font-medium">+ Add</Text>
            </TouchableOpacity>
          </View>

          {mealLogs.length === 0 ? (
            <Text className="text-slate-500 text-sm text-center py-4">No meals logged yet today</Text>
          ) : (
            mealLogs.map((meal) => (
              <View key={meal.id} className="flex-row gap-3 py-2 border-b border-slate-700">
                <View className="bg-slate-700 rounded-lg px-2 py-0.5 self-start">
                  <Text className="text-slate-400 text-xs capitalize">{meal.meal_type}</Text>
                </View>
                <Text className="text-white text-sm flex-1">{meal.description}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Meal Modal */}
      <Modal visible={showAddMeal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-slate-800 rounded-t-3xl p-6">
            <Text className="text-white text-xl font-bold mb-4">Add Meal</Text>

            <View className="flex-row gap-2 mb-4 flex-wrap">
              {MEAL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`rounded-full px-4 py-2 border ${
                    mealType === type ? 'border-green-500 bg-green-500/15' : 'border-slate-600 bg-slate-700'
                  }`}
                  onPress={() => setMealType(type)}
                >
                  <Text className={mealType === type ? 'text-green-400 capitalize' : 'text-slate-400 capitalize'}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              className="bg-slate-700 text-white rounded-xl px-4 py-3 mb-4"
              placeholder="What did you eat? (e.g. Nasi campur with ikan bakar)"
              placeholderTextColor="#64748b"
              value={mealDesc}
              onChangeText={setMealDesc}
              multiline
              autoFocus
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-700 rounded-xl py-4 items-center"
                onPress={() => setShowAddMeal(false)}
              >
                <Text className="text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-green-500 rounded-xl py-4 items-center"
                onPress={addMeal}
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
