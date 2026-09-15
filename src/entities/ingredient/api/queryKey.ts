/** query key factory */
export const ingredientKeys = {
  all: ['ingredients'] as const,
  stores: (householdId: string) => [...ingredientKeys.all, 'stores', householdId] as const,
  brands: (householdId: string) => [...ingredientKeys.all, 'brands', householdId] as const,
};
