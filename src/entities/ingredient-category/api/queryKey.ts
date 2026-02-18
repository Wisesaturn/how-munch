export const ingredientCategoryKeys = {
  all: ['ingredient-categories'] as const,
  list: (householdId: string) => [...ingredientCategoryKeys.all, 'list', householdId] as const,
};
