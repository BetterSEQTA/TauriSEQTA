import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  type Options as NotificationOptions,
} from '@tauri-apps/plugin-notification';

export interface UniversalNotificationOptions extends NotificationOptions {
  /**
   * Optionally override the notification channel (for Android).
   */
  channelId?: string;
}

/**
 * Sends a native notification using Tauri, with customizable options and sensible defaults.
 * Automatically requests permission if needed.
 */
export async function notify(options: Partial<UniversalNotificationOptions> = {}) {
  // Sensible defaults
  const defaultOptions: NotificationOptions = {
    title: 'Notification',
    body: 'You have a new notification.',
    icon: undefined, // You can set a default icon path here if you want
    sound: undefined,
    silent: false,
    // ...add more defaults as needed
  };

  // Merge user options with defaults
  const merged: NotificationOptions = { ...defaultOptions, ...options };

  // Check and request permission if needed
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  if (permissionGranted) {
    // Send the notification (with channel if provided)
    if (options.channelId) {
      sendNotification({ ...merged, channelId: options.channelId });
    } else {
      sendNotification(merged);
    }
  } else {
    // Optionally handle denied permission
    console.warn('Notification permission not granted.');
  }
}
