import { calculateBmi, calculateWeightToGoal, calculateStreak } from '../health-utils';

describe('calculateBmi', () => {
  test('returns correct BMI for typical values', () => {
    // Arrange
    const weightKg = 70;
    const heightCm = 175;
    // Act
    const result = calculateBmi(weightKg, heightCm);
    // Assert — 70 / (1.75^2) = 22.857...
    expect(result).toBeCloseTo(22.86, 1);
  });

  test('returns 0 when heightCm is 0 to avoid division by zero', () => {
    expect(calculateBmi(70, 0)).toBe(0);
  });

  test('BMI scales correctly with weight', () => {
    const bmi80 = calculateBmi(80, 175);
    const bmi90 = calculateBmi(90, 175);
    expect(bmi90).toBeGreaterThan(bmi80);
  });
});

describe('calculateWeightToGoal', () => {
  test('returns positive when above goal weight', () => {
    expect(calculateWeightToGoal(90, 70)).toBe(20);
  });

  test('returns negative when below goal weight', () => {
    expect(calculateWeightToGoal(60, 70)).toBe(-10);
  });

  test('returns zero when exactly at goal weight', () => {
    expect(calculateWeightToGoal(70, 70)).toBe(0);
  });
});

describe('calculateStreak', () => {
  test('returns 0 for empty log', () => {
    expect(calculateStreak([])).toBe(0);
  });

  test('counts a single entry logged today', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    expect(calculateStreak([todayStr], today)).toBe(1);
  });

  test('counts consecutive days correctly', () => {
    const ref = new Date('2025-01-10T12:00:00Z');
    const dates = ['2025-01-10', '2025-01-09', '2025-01-08', '2025-01-07'];
    expect(calculateStreak(dates, ref)).toBe(4);
  });

  test('breaks streak on a gap', () => {
    const ref = new Date('2025-01-10T12:00:00Z');
    // gap on 2025-01-09
    const dates = ['2025-01-10', '2025-01-08', '2025-01-07'];
    expect(calculateStreak(dates, ref)).toBe(1);
  });

  test('accepts yesterday as day 1 when today is not logged', () => {
    const ref = new Date('2025-01-10T12:00:00Z');
    const dates = ['2025-01-09', '2025-01-08'];
    expect(calculateStreak(dates, ref)).toBe(2);
  });
});
