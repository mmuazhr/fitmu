import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { requestNotificationPermissions, scheduleAllReminders } from '../../lib/notifications';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Mostly sitting, little movement' },
  { value: 'light', label: 'Light', desc: 'Light walking, 1-2x exercise/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5x exercise/week' },
  { value: 'active', label: 'Active', desc: 'Daily exercise or physical job' },
] as const;

const DIETARY_OPTIONS = [
  { value: 'halal', label: 'Halal' },
  { value: 'no_pork', label: 'No Pork' },
  { value: 'low_carb', label: 'Low Carb' },
  { value: 'vegetarian', label: 'Vegetarian' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<string>('sedentary');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>(['halal', 'no_pork']);
  const [city, setCity] = useState('Kuala Lumpur');
  const [loading, setLoading] = useState(false);

  function toggleDiet(value: string) {
    setDietaryPrefs((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  function validateStep0(): boolean {
    const h = parseFloat(heightCm);
    const cw = parseFloat(currentWeight);
    const gw = parseFloat(goalWeight);

    if (!heightCm.trim() || isNaN(h) || h < 100 || h > 250) {
      Alert.alert('Height required', 'Please enter your height in cm (100–250).');
      return false;
    }
    if (!currentWeight.trim() || isNaN(cw) || cw < 30 || cw > 400) {
      Alert.alert('Current weight required', 'Please enter your current weight in kg (30–400).');
      return false;
    }
    if (!goalWeight.trim() || isNaN(gw) || gw < 30 || gw > 400) {
      Alert.alert('Goal weight required', 'Please enter your goal weight in kg (30–400).');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('City required', 'Please enter your city for meal suggestions.');
      return false;
    }
    return true;
  }

  function handleNext() {
    if (step === 0 && !validateStep0()) return;
    setStep(step + 1);
  }

  async function submit() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: name.trim() || null,
      height_cm: parseFloat(heightCm),
      current_weight: parseFloat(currentWeight),
      goal_weight: parseFloat(goalWeight),
      activity_level: activityLevel,
      dietary_pref: dietaryPrefs,
      city,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight_kg: parseFloat(currentWeight),
      note: 'Starting weight',
      source: 'manual',
    });

    const granted = await requestNotificationPermissions();
    if (granted) await scheduleAllReminders();

    supabase.functions.invoke('ai-coach', {
      body: {
        message: 'Generate my first weekly weight loss plan based on my profile.',
        action: 'generate_plan',
      },
    }).catch(() => {});

    setLoading(false);
    router.replace('/(tabs)');
  }

  const steps = [
    // Step 0 — name + stats
    <View key="stats" className="gap-4">
      <Text className="text-white text-2xl font-bold mb-2">Let's get started</Text>
      <Text className="text-slate-400 mb-4">Tell us a bit about yourself</Text>

      <View>
        <Text className="text-slate-300 text-sm mb-1">Your name (optional)</Text>
        <TextInput
          className="bg-slate-800 text-white rounded-xl px-4 py-3"
          placeholder="e.g. Alex"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-slate-300 text-sm mb-1">Height (cm) *</Text>
          <TextInput
            className="bg-slate-800 text-white rounded-xl px-4 py-3"
            keyboardType="numeric"
            placeholder="e.g. 165"
            placeholderTextColor="#64748b"
            value={heightCm}
            onChangeText={setHeightCm}
          />
        </View>
        <View className="flex-1">
          <Text className="text-slate-300 text-sm mb-1">Current weight (kg) *</Text>
          <TextInput
            className="bg-slate-800 text-white rounded-xl px-4 py-3"
            keyboardType="numeric"
            placeholder="e.g. 80"
            placeholderTextColor="#64748b"
            value={currentWeight}
            onChangeText={setCurrentWeight}
          />
        </View>
      </View>

      <View>
        <Text className="text-slate-300 text-sm mb-1">Goal weight (kg) *</Text>
        <TextInput
          className="bg-slate-800 text-white rounded-xl px-4 py-3"
          keyboardType="numeric"
          placeholder="e.g. 70"
          placeholderTextColor="#64748b"
          value={goalWeight}
          onChangeText={setGoalWeight}
        />
      </View>

      <View>
        <Text className="text-slate-300 text-sm mb-1">City *</Text>
        <TextInput
          className="bg-slate-800 text-white rounded-xl px-4 py-3"
          placeholder="e.g. Kuala Lumpur"
          placeholderTextColor="#64748b"
          value={city}
          onChangeText={setCity}
        />
      </View>
    </View>,

    // Step 1 — activity level
    <View key="activity" className="gap-3">
      <Text className="text-white text-2xl font-bold mb-2">Activity Level</Text>
      <Text className="text-slate-400 mb-4">Be honest — no judgment here</Text>

      {ACTIVITY_LEVELS.map((level) => (
        <TouchableOpacity
          key={level.value}
          onPress={() => setActivityLevel(level.value)}
          className={`rounded-xl p-4 border ${
            activityLevel === level.value
              ? 'border-green-500 bg-green-500/10'
              : 'border-slate-700 bg-slate-800'
          }`}
        >
          <Text className={`font-semibold ${activityLevel === level.value ? 'text-green-400' : 'text-white'}`}>
            {level.label}
          </Text>
          <Text className="text-slate-400 text-sm mt-0.5">{level.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>,

    // Step 2 — dietary prefs
    <View key="diet" className="gap-3">
      <Text className="text-white text-2xl font-bold mb-2">Dietary Preferences</Text>
      <Text className="text-slate-400 mb-4">Select all that apply</Text>

      <View className="flex-row flex-wrap gap-3">
        {DIETARY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => toggleDiet(opt.value)}
            className={`rounded-full px-5 py-2.5 border ${
              dietaryPrefs.includes(opt.value)
                ? 'border-green-500 bg-green-500'
                : 'border-slate-700 bg-slate-800'
            }`}
          >
            <Text className={dietaryPrefs.includes(opt.value) ? 'text-white font-semibold' : 'text-slate-300'}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="mt-4 p-4 bg-slate-800 rounded-xl">
        <Text className="text-slate-400 text-sm">
          Your meal suggestions will respect these preferences. The AI coach knows Malaysian halal food context.
        </Text>
      </View>
    </View>,
  ];

  return (
    <View className="flex-1 bg-slate-900">
      <ScrollView className="flex-1 px-6 pt-16" keyboardShouldPersistTaps="handled">
        {/* Progress dots */}
        <View className="flex-row gap-2 mb-8">
          {steps.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-green-500' : 'bg-slate-700'}`}
            />
          ))}
        </View>

        {steps[step]}

        <View className="h-32" />
      </ScrollView>

      {/* Bottom nav */}
      <View className="px-6 pb-10 pt-4 flex-row gap-3">
        {step > 0 && (
          <TouchableOpacity
            className="flex-1 bg-slate-800 rounded-xl py-4 items-center"
            onPress={() => setStep(step - 1)}
          >
            <Text className="text-white font-semibold">Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="flex-1 bg-green-500 rounded-xl py-4 items-center"
          onPress={step < steps.length - 1 ? handleNext : submit}
          disabled={loading}
        >
          <Text className="text-white font-semibold">
            {loading ? 'Saving...' : step < steps.length - 1 ? 'Next' : 'Start my journey'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
