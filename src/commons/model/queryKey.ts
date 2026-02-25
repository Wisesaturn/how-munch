export const fridgeKeys = {
  all: ['fridge-items'] as const,
};

export const mealKeys = {
  all: ['meals'] as const,
  fridgeItems: ['meals', 'fridge-items'] as const,
};

export const ingredientKeys = {
  all: ['ingredients'] as const,
};
