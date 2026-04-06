import { type EditorDish } from './types';
import { parseIngredientAmount } from './unit';

/**
 * @description 비어있는 메뉴 1개를 dishes 배열 끝에 추가합니다.
 */
function appendDish(dishes: EditorDish[]) {
  return [...dishes, { name: '', ingredients: [] }];
}

/**
 * @description 지정한 메뉴 인덱스를 dishes 배열에서 제거합니다.
 */
function excludeDish(dishes: EditorDish[], dishIndex: number) {
  return dishes.filter((_, index) => index !== dishIndex);
}

/**
 * @description 지정한 메뉴의 이름을 갱신합니다.
 */
function renameDish(dishes: EditorDish[], dishIndex: number, name: string) {
  return dishes.map((dish, index) => (index === dishIndex ? { ...dish, name } : dish));
}

/**
 * @description 지정한 메뉴에 비어있는 재료 1개를 추가합니다.
 */
function appendIngredient(dishes: EditorDish[], dishIndex: number) {
  return dishes.map((dish, index) =>
    index === dishIndex
      ? {
          ...dish,
          ingredients: [...dish.ingredients, { fridge_item_id: '', amount: 0 }],
        }
      : dish,
  );
}

/**
 * @description 지정한 메뉴의 재료 인덱스를 제거합니다.
 */
function excludeIngredient(dishes: EditorDish[], dishIndex: number, ingredientIndex: number) {
  return dishes.map((dish, index) =>
    index === dishIndex
      ? {
          ...dish,
          ingredients: dish.ingredients.filter(
            (_, currentIndex) => currentIndex !== ingredientIndex,
          ),
        }
      : dish,
  );
}

/**
 * @description 지정한 메뉴/재료의 재고 품목 선택값을 교체하고 수량을 초기화합니다.
 */
function replaceIngredientItem(
  dishes: EditorDish[],
  dishIndex: number,
  ingredientIndex: number,
  value: string,
) {
  const fridgeItemId = value === '__none__' ? '' : value;

  return dishes.map((dish, index) => {
    if (index !== dishIndex) return dish;

    return {
      ...dish,
      ingredients: dish.ingredients.map((ingredient, currentIndex) =>
        currentIndex === ingredientIndex
          ? {
              ...ingredient,
              fridge_item_id: fridgeItemId,
              amount: 0,
            }
          : ingredient,
      ),
    };
  });
}

/**
 * @description 지정한 메뉴/재료의 수량을 숫자로 정규화해 교체합니다.
 */
function replaceIngredientAmount(
  dishes: EditorDish[],
  dishIndex: number,
  ingredientIndex: number,
  rawValue: string,
) {
  const parsedAmount = parseIngredientAmount(rawValue);

  return dishes.map((dish, index) => {
    if (index !== dishIndex) return dish;

    return {
      ...dish,
      ingredients: dish.ingredients.map((ingredient, currentIndex) =>
        currentIndex === ingredientIndex ? { ...ingredient, amount: parsedAmount } : ingredient,
      ),
    };
  });
}

/**
 * @description 드래그&드롭 결과를 반영해 dishes 배열의 순서를 변경합니다.
 * source 인덱스에서 destination 인덱스로 요소를 이동합니다.
 */
function reorderDishes(dishes: EditorDish[], sourceIndex: number, destinationIndex: number) {
  const result = [...dishes];
  const [removed] = result.splice(sourceIndex, 1);
  if (removed) {
    result.splice(destinationIndex, 0, removed);
  }
  return result;
}

export {
  appendDish,
  appendIngredient,
  excludeDish,
  excludeIngredient,
  renameDish,
  replaceIngredientAmount,
  replaceIngredientItem,
  reorderDishes,
};
