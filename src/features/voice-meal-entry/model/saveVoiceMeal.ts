import { type ParsedDish } from '../lib';

/** 식단 저장과 편집 화면이 받는 메뉴 모양 */
export interface VoiceDraftDish {
  name: string;
  ingredients: Array<{
    fridge_item_id: string;
    batch_id: string;
    amount: number;
    usage_status: 'used' | 'depleted';
    unit?: ParsedDish['ingredients'][number]['unit'];
  }>;
}

/** @description 결과 화면에서 고친 메뉴 중 저장할 수 있는 것만 남긴다. 재료를 고르지 않은 줄과 재료 없는 메뉴는 뺀다 */
export function toSavableDishes(dishes: VoiceDraftDish[]): VoiceDraftDish[] {
  return dishes
    .map((dish) => ({
      name: dish.name.trim(),
      ingredients: dish.ingredients.filter(
        (ingredient) => ingredient.fridge_item_id && ingredient.batch_id,
      ),
    }))
    .filter((dish) => dish.ingredients.length > 0);
}

/** @description 정리 결과의 메뉴를 결과 화면에서 고칠 모양으로 바꾼다. 재료를 고를 수 있게 재료 없는 메뉴도 남기고, 외식 메뉴만 뺀다 */
export function toDraftDishes(dishes: ParsedDish[]): VoiceDraftDish[] {
  return dishes
    .filter((dish) => !dish.isOut)
    .map((dish) => ({
      name: dish.name,
      ingredients: dish.ingredients.map(
        ({ fridge_item_id, batch_id, amount, usage_status, unit }) => ({
          fridge_item_id,
          batch_id,
          amount,
          usage_status,
          unit,
        }),
      ),
    }));
}
