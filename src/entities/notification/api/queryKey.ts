/** query key factory */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread-count', userId] as const,
  preferences: (userId: string) => [...notificationKeys.all, 'preferences', userId] as const,
  pushSubscription: (userId: string) =>
    [...notificationKeys.all, 'push-subscription', userId] as const,
};
