export const mealKeys = {
  all: ['meals'] as const,
  listByDate: (householdId: string, date: string) =>
    [...mealKeys.all, 'list-by-date', householdId, date] as const,
  fridgeItems: (householdId: string) => [...mealKeys.all, 'fridge-items', householdId] as const,
};
