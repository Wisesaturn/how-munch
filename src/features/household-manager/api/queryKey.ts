/** query key factory */
export const householdKeys = {
  all: ['household'] as const,
  detail: (householdId: string) => [...householdKeys.all, 'detail', householdId] as const,
  members: (householdId: string) => [...householdKeys.all, 'members', householdId] as const,
  invites: (householdId: string) => [...householdKeys.all, 'invites', householdId] as const,
};
