/** query key factory */
export const searchSynonymKeys = {
  all: ['search-synonyms'] as const,
  list: () => [...searchSynonymKeys.all, 'list'] as const,
};
