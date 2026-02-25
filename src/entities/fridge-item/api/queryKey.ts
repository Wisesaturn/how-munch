/** query key factory */
export const fridgeItemKeys = {
  all: ['fridge-items'] as const,
  list: (householdId: string, userId: string, searchKeyword: string) =>
    [...fridgeItemKeys.all, 'list', householdId, userId, searchKeyword] as const,
  batchUsage: (batchId: string) => [...fridgeItemKeys.all, 'batch-usage', batchId] as const,
  preferences: (userId: string) => [...fridgeItemKeys.all, 'preferences', userId] as const,
};
