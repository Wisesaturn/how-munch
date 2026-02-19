import { fridgeKeys as commonFridgeKeys } from '@/commons/model/queryKey';

/** query key factory */
export const fridgeKeys = {
  all: commonFridgeKeys.all,
  list: (householdId: string, searchKeyword: string) =>
    [...fridgeKeys.all, 'list', householdId, searchKeyword] as const,
  batchUsage: (batchId: string) => [...fridgeKeys.all, 'batch-usage', batchId] as const,
  preferences: (userId: string) => [...fridgeKeys.all, 'preferences', userId] as const,
};
