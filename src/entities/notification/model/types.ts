import { type Database, type Json } from '@/commons/model/types/database';

import { type IngredientUnit } from '@/entities/ingredient/@x/notification';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationPreferenceRow =
  Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPushSubscriptionRow =
  Database['public']['Tables']['notification_push_subscriptions']['Row'];

export type NotificationType = 'expiry_soon' | 'fridge_item_added' | 'meal_added';
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

export interface FridgeItemAddedPayload {
  householdId: string;
  createdBy: string;
  createdByNickname: string;
  itemId: string;
  itemName: string;
  itemCount: number;
}

export interface MealAddedPayload {
  householdId: string;
  createdBy: string;
  createdByNickname: string;
  mealId: string;
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface NotificationItem extends Omit<NotificationRow, 'type' | 'payload'> {
  type: NotificationType;
  payload: Json;
}
