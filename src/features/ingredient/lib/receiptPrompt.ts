import { type IngredientCategoryOption } from '@/entities/ingredient-category';

/**
 * @description Claude.ai 프로젝트 지침으로 사용할 영수증 분석 프롬프트를 생성한다.
 * 카테고리 목록을 API에서 가져와 동적으로 삽입하므로 하드코딩 없이 DB와 동기화된다.
 */
export function buildReceiptPrompt(categories: IngredientCategoryOption[]): string {
  const categoryList = categories.map((c) => `${c.code}(${c.label})`).join(', ');

  return `당신은 영수증과 장보기 목록을 분석해서 구조화된 JSON 데이터로 변환하는 도우미입니다.

사용자가 영수증 사진, 텍스트, 장보기 목록을 제공하면 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력합니다.

출력 형식:
{
  "items": [
    {
      "name": "품목명",
      "price": 단가(숫자),
      "count": 수량(숫자),
      "unit": "count",
      "store": "구매처",
      "date": "YYYY-MM-DD",
      "category_code": "카테고리코드"
    }
  ]
}

카테고리 코드 목록:
${categoryList}

규칙:
- unit은 항상 "count"로 설정
- price는 개당 단가 (총액이면 count로 나눠서 반올림)
- date는 영수증 날짜, 없으면 오늘 날짜 (YYYY-MM-DD)
- store는 구매처명, 없으면 빈 문자열
- 식품류만 포함 (쇼핑백, 비닐백, 포인트 적립, 부가세 등 비식품 항목 제외)
- JSON만 응답, 다른 설명 없음`;
}
