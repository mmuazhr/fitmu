import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useCoach } from '../../hooks/useCoach';
import { useAppStore } from '../../store/useAppStore';

export default function CoachScreen() {
  const { messages, loading, loadHistory, sendMessage } = useCoach();
  const { weeklyPlan } = useAppStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await sendMessage(text);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 border-b border-slate-800">
          <Text className="text-white text-xl font-bold">AI Coach</Text>
          <Text className="text-slate-500 text-xs">Powered by Claude Sonnet</Text>
        </View>

        {/* Weekly Plan Card */}
        {weeklyPlan && (
          <View className="mx-5 mt-3 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <Text className="text-green-400 text-xs font-semibold">WEEKLY THEME</Text>
            <Text className="text-white text-sm font-medium mt-0.5">{weeklyPlan.plan_json.week_theme}</Text>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5"
          contentContainerClassName="py-4 gap-3"
        >
          {messages.length === 0 && (
            <View className="items-center mt-12">
              <Text className="text-4xl mb-3">🤝</Text>
              <Text className="text-white text-lg font-semibold text-center">Hey, I'm Fitmu</Text>
              <Text className="text-slate-400 text-sm text-center mt-1 px-6">
                Your personal weight loss coach. Ask me anything — workouts, meals, progress, or just how you're feeling.
              </Text>
              <View className="mt-6 gap-2 w-full">
                {[
                  'How am I doing this week?',
                  'Give me a workout for today',
                  'What should I eat for lunch?',
                  'Generate my weekly plan',
                ].map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    className="bg-slate-800 rounded-xl px-4 py-3"
                    onPress={() => sendMessage(prompt, prompt.includes('weekly plan') ? 'generate_plan' : 'chat')}
                  >
                    <Text className="text-slate-300 text-sm">{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => (
            <View
              key={msg.id ?? i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'self-end bg-green-600'
                  : 'self-start bg-slate-800'
              }`}
            >
              <Text className={msg.role === 'user' ? 'text-white' : 'text-slate-100'}>
                {msg.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View className="self-start bg-slate-800 rounded-2xl px-4 py-3 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#22c55e" />
              <Text className="text-slate-400 text-sm">Fitmu is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="px-4 py-3 border-t border-slate-800 flex-row gap-2 items-end">
          <TextInput
            className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-3 max-h-28"
            placeholder="Message your coach..."
            placeholderTextColor="#64748b"
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            className={`rounded-full w-11 h-11 items-center justify-center ${loading || !input.trim() ? 'bg-slate-700' : 'bg-green-500'}`}
            onPress={handleSend}
            disabled={loading || !input.trim()}
          >
            <Text className="text-white text-lg">↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
