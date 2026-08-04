import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  current: number;
  total: number;
  label: string;
  unit: string;
  color?: string;
  size?: number;
}

export function ProgressRing({
  current,
  total,
  label,
  unit,
  color = '#22c55e',
  size = 100,
}: ProgressRingProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / total, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#334155"
            strokeWidth={8}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-white font-bold text-base">{current}</Text>
          <Text className="text-slate-500 text-xs">{unit}</Text>
        </View>
      </View>
      <Text className="text-slate-400 text-xs mt-1">{label}</Text>
    </View>
  );
}
