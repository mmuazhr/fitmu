// Pure calculation utilities — no React Native imports, fully testable.

const MS_PER_DAY = 86_400_000;

/**
 * Calculate BMI. Returns 0 if heightCm is 0 to avoid division by zero.
 */
export function calculateBmi(weightKg: number, heightCm: number): number {
  if (heightCm === 0) return 0;
  return weightKg / ((heightCm / 100) ** 2);
}

/**
 * kg remaining to goal (positive = above goal, negative = below goal).
 */
export function calculateWeightToGoal(currentWeight: number, goalWeight: number): number {
  return currentWeight - goalWeight;
}

/**
 * Count consecutive logged days up to and including referenceDate.
 * logDates must be an array of 'YYYY-MM-DD' strings sorted descending (most recent first).
 */
export function calculateStreak(
  logDates: string[],
  referenceDate: Date = new Date(),
): number {
  if (logDates.length === 0) return 0;

  let count = 0;
  let checkDate = new Date(referenceDate);
  checkDate.setHours(0, 0, 0, 0);

  for (const dateStr of logDates) {
    const rowDate = new Date(dateStr);
    rowDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((checkDate.getTime() - rowDate.getTime()) / MS_PER_DAY);
    if (diffDays === 0 || diffDays === 1) {
      count++;
      checkDate = rowDate;
    } else {
      break;
    }
  }

  return count;
}
