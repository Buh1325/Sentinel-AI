import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let ready: Promise<boolean> | null = null;

// Show banners even while the app is open (otherwise foreground notifications are silent).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setup(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('safety', {
        name: 'Safety alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.warn('Notification setup failed:', error);
    return false;
  }
}

/** Fires a local device notification. Safe to call anywhere: it never throws. */
export async function pushLocalNotification(title: string, body: string): Promise<void> {
  try {
    ready ??= setup();
    if (!(await ready)) return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: Platform.OS === 'android' ? { channelId: 'safety' } : null,
    });
  } catch (error) {
    console.warn('Local notification failed:', error);
  }
}
