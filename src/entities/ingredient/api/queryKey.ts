/** query key factory */
export const ingredientKeys = {
  all: ['ingredients'] as const,
  list: (householdId: string, year: number, month: number) =>
    [...ingredientKeys.all, 'list', householdId, year, month] as const,
  stores: (householdId: string) => [...ingredientKeys.all, 'stores', householdId] as const,
  brands: (householdId: string) => [...ingredientKeys.all, 'brands', householdId] as const,
};
