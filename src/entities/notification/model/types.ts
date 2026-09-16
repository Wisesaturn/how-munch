import { type Database, type Json } from '@/commons/model/types/database';

import { type IngredientUnit } from '@/entities/ingredient/@x/notification';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationPreferenceRow =
  Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPushSubscriptionRow =
  Database['public']['Tables']['notification_push_subscriptions']['Row'];

export type NotificationType =
  | 'expiry_soon'
  | 'fridge_item_added'
  | 'meal_added'
  | 'dining_expense_added'
  | 'budget_exceeded'
  | 'weekly_expense';
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

export interface DiningExpenseAddedPayload {
  householdId: string;
  createdBy: string;
  createdByNickname: string;
  diningExpenseId: string;
  date: string;
  kind: 'restaurant' | 'delivery';
  /** 가게명 — 외식 기록의 최소 식별자 */
  brand: string;
  /** 먹은 것 — 선택 입력이라 비어 있을 수 있다 */
  name: string | null;
  price: number;
}

export interface BudgetExceededPayload {
  householdId: string;
  /** 'YYYY-MM' */
  yearMonth: string;
  scope: 'total' | 'grocery' | 'restaurant' | 'delivery';
  budgetAmount: number;
  spentAmount: number;
}

export interface WeeklyExpensePayload {
  householdId: string;
  /** 지난주 월요일 (YYYY-MM-DD) */
  weekStart: string;
  /** 지난주 일요일 (YYYY-MM-DD) */
  weekEnd: string;
  weeklyTotal: number;
  /** 발송일이 속한 달 ('YYYY-MM') */
  yearMonth: string;
  monthlyTotal: number;
  /** total scope 예산 — 미설정이면 null */
  budgetAmount: number | null;
}

export interface NotificationItem extends Omit<NotificationRow, 'type' | 'payload'> {
  type: NotificationType;
  payload: Json;
}
