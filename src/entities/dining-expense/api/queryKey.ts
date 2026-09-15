/** query key factory */
export const diningExpenseKeys = {
  all: ['dining-expenses'] as const,
  suggestions: (householdId: string, field: string, kind: string) =>
    [...diningExpenseKeys.all, 'suggestions', householdId, field, kind] as const,
};
