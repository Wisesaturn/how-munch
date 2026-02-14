/** query key factory */
export const fridgeKeys = {
  all: ['fridge-items'] as const,
  list: (householdId: string) => [...fridgeKeys.all, 'list', householdId] as const,
};
