import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text className="text-xl">{emoji}</Text>
      <Text className={`text-xs mt-0.5 ${focused ? 'text-green-400' : 'text-slate-500'}`}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          height: 80,
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🤝" label="Coach" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💪" label="Workout" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🍽️" label="Meals" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" label="Log" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
