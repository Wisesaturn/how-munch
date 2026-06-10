/** query key factory */
export const mealKeys = {
  all: ['meals'] as const,
  fridgeItemsAll: ['meals', 'fridge-items'] as const,
  listByDate: (householdId: string, date: string) =>
    [...mealKeys.all, 'list-by-date', householdId, date] as const,
  summaries: (householdId: string) => [...mealKeys.all, 'summary', householdId] as const,
  summaryByRange: (householdId: string, startDate: string, endDate: string) =>
    [...mealKeys.summaries(householdId), startDate, endDate] as const,
  fridgeItems: (householdId: string) => [...mealKeys.fridgeItemsAll, householdId] as const,
  fridgeItemsBySelected: (householdId: string, selectedItemIdsKey: string) =>
    [...mealKeys.fridgeItems(householdId), selectedItemIdsKey] as const,
};
