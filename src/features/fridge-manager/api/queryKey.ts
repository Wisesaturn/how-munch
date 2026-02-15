import { fridgeKeys as commonFridgeKeys } from '@/commons/query-key';

/** query key factory */
export const fridgeKeys = {
  all: commonFridgeKeys.all,
  list: (householdId: string) => [...fridgeKeys.all, 'list', householdId] as const,
  batchUsage: (batchId: string) => [...fridgeKeys.all, 'batch-usage', batchId] as const,
};
