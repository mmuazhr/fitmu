import { View, Text } from 'react-native';

interface StatCardProps {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ emoji, label, value, sub, accent }: StatCardProps) {
  return (
    <View className={`flex-1 rounded-2xl p-4 ${accent ? 'bg-green-500/15 border border-green-500/30' : 'bg-slate-800'}`}>
      <Text className="text-2xl mb-1">{emoji}</Text>
      <Text className="text-slate-400 text-xs mb-0.5">{label}</Text>
      <Text className={`text-xl font-bold ${accent ? 'text-green-400' : 'text-white'}`}>{value}</Text>
      {sub && <Text className="text-slate-500 text-xs mt-0.5">{sub}</Text>}
    </View>
  );
}
