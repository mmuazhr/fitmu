import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fitmu', {
      name: 'fitmu reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Water reminders: every 2h from 8am to 10pm (hours: 8, 10, 12, 14, 16, 18, 20)
  const waterHours = [8, 10, 12, 14, 16, 18, 20];
  for (const hour of waterHours) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to drink water 💧',
        body: 'Stay hydrated — aim for 3,000ml today.',
        data: { type: 'water' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  }

  // Standing reminders: every hour 9am to 6pm
  const standHours = [9, 10, 11, 13, 14, 15, 16, 17];
  for (const hour of standHours) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Stand up & move 🚶',
        body: 'Take a 2-minute walk. Your body will thank you.',
        data: { type: 'standing' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 30,
      },
    });
  }

  // Snack reminder: 3pm daily
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Snack time 🍎',
      body: 'Have something light — fruit, nuts, or teh O kosong.',
      data: { type: 'snack' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 15,
      minute: 0,
    },
  });

  // Sunday weekly review: 8pm
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly review time 📊',
      body: 'Open fitmu to review this week and get your new plan.',
      data: { type: 'weekly_review' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 20,
      minute: 0,
    },
  });
}
