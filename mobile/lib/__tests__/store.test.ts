import { useAppStore } from '../../store/useAppStore';
import { DailyLog } from '../../types';

const baseDailyLog: DailyLog = {
  id: 'test-id',
  user_id: 'user-1',
  log_date: '2025-01-10',
  water_ml: 500,
  steps: 1000,
  calories_burned: 200,
  active_minutes: 30,
  standing_hours: 4,
  mood: null,
  energy_level: null,
};

beforeEach(() => {
  // Reset store state between tests
  useAppStore.setState({
    profile: null,
    latestWeight: null,
    todayLog: null,
    weeklyPlan: null,
  });
});

describe('useAppStore — updateWater immutability', () => {
  test('updateWater returns a new todayLog object (does not mutate in-place)', () => {
    // Arrange
    useAppStore.getState().setTodayLog(baseDailyLog);
    const before = useAppStore.getState().todayLog!;

    // Act
    useAppStore.getState().updateWater(1500);
    const after = useAppStore.getState().todayLog!;

    // Assert — different object reference
    expect(after).not.toBe(before);
    expect(after.water_ml).toBe(1500);
    // Original snapshot unchanged
    expect(before.water_ml).toBe(500);
  });

  test('updateWater leaves todayLog null when no log is set', () => {
    // Arrange — todayLog is null (from beforeEach)
    // Act
    useAppStore.getState().updateWater(1000);
    // Assert
    expect(useAppStore.getState().todayLog).toBeNull();
  });

  test('updateWater preserves all other fields', () => {
    // Arrange
    useAppStore.getState().setTodayLog(baseDailyLog);
    // Act
    useAppStore.getState().updateWater(2000);
    const after = useAppStore.getState().todayLog!;
    // Assert
    expect(after.steps).toBe(1000);
    expect(after.user_id).toBe('user-1');
    expect(after.log_date).toBe('2025-01-10');
  });
});
