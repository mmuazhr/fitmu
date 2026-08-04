import { useEffect, useState } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useWeightLog } from '../../hooks/useWeightLog';
import { useAppStore } from '../../store/useAppStore';
import { WeightLog } from '../../types';

const WIDTH = Dimensions.get('window').width - 64;
const HEIGHT = 100;
const PAD = 10;

export function WeightChart() {
  const { fetchHistory } = useWeightLog();
  const { profile } = useAppStore();
  const [logs, setLogs] = useState<WeightLog[]>([]);

  useEffect(() => {
    fetchHistory(30).then(setLogs);
  }, []);

  if (logs.length < 2) {
    return (
      <View className="bg-slate-800 rounded-2xl p-4 mb-3 items-center py-6">
        <Text className="text-slate-500 text-sm">Log 2+ weights to see your trend</Text>
      </View>
    );
  }

  const weights = logs.map((l) => l.weight_kg);
  const min = Math.min(...weights) - 2;
  const max = Math.max(...weights) + 2;
  const goalWeight = profile?.goal_weight;

  function toX(i: number): number {
    return PAD + (i / (logs.length - 1)) * (WIDTH - PAD * 2);
  }

  function toY(w: number): number {
    return HEIGHT - PAD - ((w - min) / (max - min)) * (HEIGHT - PAD * 2);
  }

  const points = logs.map((l, i) => `${toX(i)},${toY(l.weight_kg)}`).join(' ');
  const latest = weights[weights.length - 1];
  const first = weights[0];
  const delta = (latest - first).toFixed(1);
  const deltaSign = parseFloat(delta) > 0 ? '+' : '';

  // Goal line Y
  const goalY = goalWeight ? toY(goalWeight) : null;

  return (
    <View className="bg-slate-800 rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-white font-semibold">30-Day Trend</Text>
        <Text className={`text-sm font-semibold ${parseFloat(delta) <= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {deltaSign}{delta} kg
        </Text>
      </View>
      <Svg width={WIDTH} height={HEIGHT}>
        {/* Goal line */}
        {goalY !== null && goalY >= PAD && goalY <= HEIGHT - PAD && (
          <>
            <Line
              x1={PAD}
              y1={goalY}
              x2={WIDTH - PAD}
              y2={goalY}
              stroke="#22c55e"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <SvgText x={WIDTH - PAD - 30} y={goalY - 3} fill="#22c55e" fontSize={8}>
              Goal
            </SvgText>
          </>
        )}
        {/* Weight line */}
        <Polyline
          points={points}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Latest point */}
        <Circle
          cx={toX(logs.length - 1)}
          cy={toY(latest)}
          r={4}
          fill="#60a5fa"
        />
      </Svg>
      <View className="flex-row justify-between mt-1">
        <Text className="text-slate-600 text-xs">
          {new Date(logs[0].logged_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
        </Text>
        <Text className="text-slate-400 text-xs font-medium">{latest} kg</Text>
        <Text className="text-slate-600 text-xs">
          {new Date(logs[logs.length - 1].logged_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </View>
  );
}
