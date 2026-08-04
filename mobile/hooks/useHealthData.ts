import { useState, useEffect } from 'react';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import { Platform } from 'react-native';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.HeartRate,
    ],
    write: [],
  },
};

interface UseHealthDataResult {
  steps: number;
  caloriesBurned: number;
  isLoading: boolean;
  error: string | null;
}

export function useHealthData(): UseHealthDataResult {
  const [steps, setSteps] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(Platform.OS === 'ios');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
      if (err) {
        setError('HealthKit unavailable');
        setIsLoading(false);
        return;
      }
      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized || Platform.OS !== 'ios') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const options = { startDate: today.toISOString() };

    AppleHealthKit.getStepCount(options, (err, result: HealthValue) => {
      if (err) {
        setError('Could not read step count');
      } else if (result) {
        setSteps(Math.round(result.value));
      }
    });

    AppleHealthKit.getActiveEnergyBurned(
      { ...options, endDate: new Date().toISOString() },
      (err, results) => {
        if (err) {
          setError('Could not read calories');
        } else if (results?.length) {
          const total = results.reduce((sum, r) => sum + r.value, 0);
          setCaloriesBurned(Math.round(total));
        }
        setIsLoading(false);
      }
    );
  }, [initialized]);

  return { steps, caloriesBurned, isLoading, error };
}
