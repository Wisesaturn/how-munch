/** query key factory */
import { ingredientKeys as commonIngredientKeys } from '@/commons/query-key';

export const ingredientKeys = {
  all: commonIngredientKeys.all,
  list: (householdId: string, year: number, month: number) =>
    [...ingredientKeys.all, 'list', householdId, year, month] as const,
  stores: (householdId: string) => [...ingredientKeys.all, 'stores', householdId] as const,
};
