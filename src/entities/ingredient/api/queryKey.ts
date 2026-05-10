/** query key factory */
export const ingredientKeys = {
  all: ['ingredients'] as const,
  list: (householdId: string, startDate: string, endDate: string) =>
    [...ingredientKeys.all, 'list', householdId, startDate, endDate] as const,
  search: (householdId: string, startDate: string, endDate: string, q: string) =>
    [...ingredientKeys.all, 'search', householdId, startDate, endDate, q] as const,
  stores: (householdId: string) => [...ingredientKeys.all, 'stores', householdId] as const,
  brands: (householdId: string) => [...ingredientKeys.all, 'brands', householdId] as const,
};
