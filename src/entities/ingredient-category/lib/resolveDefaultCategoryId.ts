interface CategoryLike {
  id: string;
  code: string;
}

/**
 * @description 기본 카테고리(기타) 우선 규칙으로 기본 category_id를 반환합니다.
 */
export function resolveDefaultCategoryId(
  categoryOptions: CategoryLike[],
  initialCategoryId?: string,
) {
  if (initialCategoryId) return initialCategoryId;
  return categoryOptions.find((category) => category.code === 'other')?.id ?? '';
}
