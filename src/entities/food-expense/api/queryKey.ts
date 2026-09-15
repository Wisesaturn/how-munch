/** query key factory */
export const foodExpenseKeys = {
  all: ['food-expenses'] as const,
  list: (householdId: string, startDate: string, endDate: string, kind: string) =>
    [...foodExpenseKeys.all, 'list', householdId, startDate, endDate, kind] as const,
  search: (householdId: string, startDate: string, endDate: string, kind: string, q: string) =>
    [...foodExpenseKeys.all, 'search', householdId, startDate, endDate, kind, q] as const,
  suggestions: (householdId: string, field: string, kind: string) =>
    [...foodExpenseKeys.all, 'suggestions', householdId, field, kind] as const,
};
