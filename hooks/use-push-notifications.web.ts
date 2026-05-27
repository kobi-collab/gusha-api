export function usePushNotifications() {
  return { expoPushToken: null, permissionStatus: null };
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}
