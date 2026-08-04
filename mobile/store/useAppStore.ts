import { create } from 'zustand';
import { Profile, WeightLog, DailyLog, WeeklyPlan } from '../types';

interface AppState {
  profile: Profile | null;
  latestWeight: WeightLog | null;
  todayLog: DailyLog | null;
  weeklyPlan: WeeklyPlan | null;
  setProfile: (profile: Profile | null) => void;
  setLatestWeight: (log: WeightLog | null) => void;
  setTodayLog: (log: DailyLog | null) => void;
  setWeeklyPlan: (plan: WeeklyPlan | null) => void;
  updateWater: (water_ml: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  latestWeight: null,
  todayLog: null,
  weeklyPlan: null,
  setProfile: (profile) => set({ profile }),
  setLatestWeight: (latestWeight) => set({ latestWeight }),
  setTodayLog: (todayLog) => set({ todayLog }),
  setWeeklyPlan: (weeklyPlan) => set({ weeklyPlan }),
  updateWater: (water_ml) =>
    set((state) => ({
      todayLog: state.todayLog ? { ...state.todayLog, water_ml } : null,
    })),
}));
