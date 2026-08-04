import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { WorkoutTemplate, Exercise } from '../../types';

function ExerciseRow({ ex }: { ex: Exercise }) {
  const duration = ex.duration_sec
    ? `${ex.duration_sec}s`
    : ex.sets
    ? `${ex.sets} sets × ${ex.reps} reps`
    : '';
  return (
    <View className="flex-row gap-3 py-2.5 border-b border-slate-700">
      <View className="w-14 items-center justify-center bg-slate-700 rounded-lg py-1">
        <Text className="text-green-400 text-xs font-semibold">{duration}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white text-sm font-medium">{ex.name}</Text>
        {ex.notes && <Text className="text-slate-500 text-xs mt-0.5">{ex.notes}</Text>}
      </View>
      {ex.rest_sec > 0 && (
        <Text className="text-slate-600 text-xs self-center">rest {ex.rest_sec}s</Text>
      )}
    </View>
  );
}

function WorkoutCard({ workout, onLog }: { workout: WorkoutTemplate; onLog: (w: WorkoutTemplate) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="bg-slate-800 rounded-2xl mb-3 overflow-hidden">
      <TouchableOpacity className="p-4" onPress={() => setExpanded(!expanded)}>
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-white font-semibold text-base">{workout.name}</Text>
            <View className="flex-row gap-2 mt-1 flex-wrap">
              <View className="bg-slate-700 rounded-full px-2 py-0.5">
                <Text className="text-slate-400 text-xs">{workout.duration_min} min</Text>
              </View>
              <View className="bg-slate-700 rounded-full px-2 py-0.5">
                <Text className="text-slate-400 text-xs">{workout.difficulty}</Text>
              </View>
              {workout.tags.slice(0, 2).map((tag) => (
                <View key={tag} className="bg-slate-700 rounded-full px-2 py-0.5">
                  <Text className="text-slate-400 text-xs">{tag}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text className="text-slate-500 text-xl">{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="px-4 pb-4">
          {workout.exercises.map((ex, i) => (
            <ExerciseRow key={i} ex={ex} />
          ))}
          <TouchableOpacity
            className="mt-4 bg-green-500 rounded-xl py-3 items-center"
            onPress={() => onLog(workout)}
          >
            <Text className="text-white font-semibold">Log as Complete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function WorkoutsScreen() {
  const [homeWorkouts, setHomeWorkouts] = useState<WorkoutTemplate[]>([]);
  const [gymWorkouts, setGymWorkouts] = useState<WorkoutTemplate[]>([]);
  const [randomWorkout, setRandomWorkout] = useState<(WorkoutTemplate & { vibe?: string; encouragement?: string }) | null>(null);
  const [generatingRandom, setGeneratingRandom] = useState(false);
  const [showRandom, setShowRandom] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'gym'>('home');

  useEffect(() => {
    async function load() {
      const { data: home } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('type', 'home')
        .eq('difficulty', 'beginner')
        .order('created_at', { ascending: true });

      const { data: gym } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('type', 'gym')
        .eq('difficulty', 'beginner')
        .order('created_at', { ascending: true });

      if (home) setHomeWorkouts(home as WorkoutTemplate[]);
      if (gym) setGymWorkouts(gym as WorkoutTemplate[]);
    }
    load();
  }, []);

  async function generateRandom() {
    setGeneratingRandom(true);
    const response = await supabase.functions.invoke('ai-workout');
    setGeneratingRandom(false);

    if (response.error) {
      Alert.alert('Error', 'Could not generate workout. Try again.');
      return;
    }

    setRandomWorkout(response.data);
    setShowRandom(true);
  }

  async function logWorkout(workout: WorkoutTemplate) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('workout_logs').insert({
      user_id: session.user.id,
      template_id: workout.id,
      source: 'manual',
    });
    Alert.alert('Workout logged!', 'Great work. Keep the streak going.');
  }

  const displayed = activeTab === 'home' ? homeWorkouts : gymWorkouts;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
        <Text className="text-white text-2xl font-bold pt-6 pb-4">Workouts</Text>

        {/* Surprise Me */}
        <TouchableOpacity
          className="bg-gradient-to-r from-green-600 to-green-400 bg-green-500 rounded-2xl p-5 mb-5 flex-row items-center justify-between"
          onPress={generateRandom}
          disabled={generatingRandom}
        >
          <View>
            <Text className="text-white text-lg font-bold">Surprise Me</Text>
            <Text className="text-green-100 text-sm">AI-generated 10-15 min workout</Text>
          </View>
          {generatingRandom
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-3xl">🎲</Text>
          }
        </TouchableOpacity>

        {/* Tab toggle */}
        <View className="flex-row bg-slate-800 rounded-xl p-1 mb-4">
          {(['home', 'gym'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === tab ? 'bg-green-500' : ''}`}
              onPress={() => setActiveTab(tab)}
            >
              <Text className={activeTab === tab ? 'text-white font-semibold' : 'text-slate-400'}>
                {tab === 'home' ? '🏠 Home' : '🏋️ Gym'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {displayed.map((w) => (
          <WorkoutCard key={w.id} workout={w} onLog={logWorkout} />
        ))}
      </ScrollView>

      {/* Random Workout Modal */}
      <Modal visible={showRandom} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-800 rounded-t-3xl p-6 max-h-[80%]">
            <ScrollView>
              {randomWorkout && (
                <>
                  <Text className="text-green-400 text-xs font-semibold mb-1">AI GENERATED</Text>
                  <Text className="text-white text-2xl font-bold">{randomWorkout.name}</Text>
                  {randomWorkout.vibe && (
                    <Text className="text-slate-400 text-sm italic mb-3">{randomWorkout.vibe}</Text>
                  )}
                  <Text className="text-slate-400 text-sm mb-4">
                    {randomWorkout.duration_min} minutes · beginner · no equipment
                  </Text>

                  {randomWorkout.exercises.map((ex, i) => (
                    <ExerciseRow key={i} ex={ex} />
                  ))}

                  {randomWorkout.encouragement && (
                    <View className="mt-4 bg-green-500/10 rounded-xl p-3">
                      <Text className="text-green-300 text-sm">{randomWorkout.encouragement}</Text>
                    </View>
                  )}

                  <View className="flex-row gap-3 mt-5">
                    <TouchableOpacity
                      className="flex-1 bg-slate-700 rounded-xl py-4 items-center"
                      onPress={() => setShowRandom(false)}
                    >
                      <Text className="text-white">Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-green-500 rounded-xl py-4 items-center"
                      onPress={() => {
                        logWorkout(randomWorkout as WorkoutTemplate);
                        setShowRandom(false);
                      }}
                    >
                      <Text className="text-white font-semibold">Log Complete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
