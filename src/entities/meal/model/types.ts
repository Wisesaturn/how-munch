/** 식사 유형 — 아침, 점심, 저녁, 간식 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** 요리 재료 — 요리(Dish)에 사용된 냉장고 재료와 사용량 (N:M 해소 테이블) */
export interface DishIngredient {
  id: string;
  /** 소속 요리 ID */
  dish_id: string;
  /** 사용된 냉장고 재료 ID */
  fridge_item_id: string;
  /** 사용량 — 개 단위: 숫자, g/kg 단위: null */
  amount: number | null;
  /** 사용 상태 — g/kg 단위: 'used' | 'depleted', 개 단위: 'used' */
  usage_status: 'used' | 'depleted' | null;
  created_at: string;
}

/** 요리 — 개별 메뉴 (예: 김치찌개, 된장국) */
export interface Dish {
  id: string;
  /** 소속 식단 ID */
  meal_id: string;
  /** 요리 이름 */
  name: string;
  /** 정렬 순서 */
  sort_order: number;
  /** 사용된 재료 목록 (join 결과) */
  ingredients: DishIngredient[];
  created_at: string;
  updated_at: string;
}

/** 식단 — 날짜/식사 유형별 식사 기록 컨테이너 */
export interface Meal {
  id: string;
  /** 소속 가구 ID */
  household_id: string;
  /** 식사 날짜 (YYYY-MM-DD) */
  date: string;
  /** 식사 유형 */
  type: MealType;
  /** 포함된 요리 목록 (join 결과) */
  dishes: Dish[];
  created_at: string;
  updated_at: string;
}
