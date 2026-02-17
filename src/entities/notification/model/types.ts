import { type Database, type Json } from '@/commons/types/database';

import { type IngredientUnit } from '@/entities/ingredient/@x/notification';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationPreferenceRow =
  Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPushSubscriptionRow =
  Database['public']['Tables']['notification_push_subscriptions']['Row'];

export type NotificationType = 'expiry_soon';
export type NotificationStatus = NotificationRow['status'];

export interface ExpirySoonPayload {
  householdId: string;
  itemId: string;
  batchId: string;
  itemName: string;
  expiryDate: string;
  daysLeft: number;
  remainingQuantity: number;
  unit: IngredientUnit;
}

export interface NotificationItem extends Omit<NotificationRow, 'type' | 'payload'> {
  type: NotificationType;
  payload: Json;
}
