import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendMagicLink() {
    if (!email.trim()) {
      Alert.alert('Enter your email first');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-5xl font-bold text-green-400 mb-2">fitmu</Text>
        <Text className="text-slate-400 text-base mb-12">
          Your personal weight loss companion
        </Text>

        {sent ? (
          <View>
            <Text className="text-white text-xl font-semibold mb-3">
              Check your email
            </Text>
            <Text className="text-slate-400 text-base">
              We sent a magic link to {email}. Tap it to sign in.
            </Text>
            <TouchableOpacity
              className="mt-8"
              onPress={() => setSent(false)}
            >
              <Text className="text-green-400 text-center">Wrong email?</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text className="text-slate-300 text-sm mb-2">Email address</Text>
            <TextInput
              className="bg-slate-800 text-white rounded-xl px-4 py-4 text-base mb-4"
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${loading ? 'bg-green-700' : 'bg-green-500'}`}
              onPress={sendMagicLink}
              disabled={loading}
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
