import { type IngredientCategoryOption } from '@/entities/ingredient-category';

/**
 * @description Claude Vision API에 전달할 영수증 분석 system 프롬프트를 생성한다.
 * 카테고리 목록을 API에서 가져와 동적으로 삽입하므로 하드코딩 없이 DB와 동기화된다.
 * 단위(count/unit) 계산은 클라이언트(parseProductNameUnit)가 담당하므로 여기서는 지시하지 않고,
 * 상품명 원문과 영수증 수량만 정확히 추출하도록 요구한다.
 */
export function buildReceiptPrompt(categories: IngredientCategoryOption[]): string {
  const categoryList = categories.map((c) => `${c.code}(${c.label})`).join(', ');

  return `당신은 영수증과 장보기 목록 사진을 분석해서 구조화된 JSON 데이터로 변환하는 도우미입니다.

주어진 이미지를 분석해 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력합니다.

출력 형식:
{
  "items": [
    {
      "name": "품목명",
      "price": 금액(숫자, 해당 품목에 지출한 총액),
      "count": 수량(숫자),
      "store": "구매처",
      "date": "YYYY-MM-DD",
      "category_code": "카테고리코드"
    }
  ]
}

카테고리 코드 목록:
${categoryList}

규칙:
- name은 영수증에 표기된 상품명을 그대로 사용 (용량/중량 표기가 있으면 반드시 포함, 예: "서울우유 1L", "삼겹살 500g")
- count는 영수증에 적힌 구매 수량(개수), 없으면 1
- price는 해당 품목에 실제로 지출한 총 금액(영수증의 '금액'/합계 열). 개당 단가가 아니라 수량이 반영된 합산 금액을 사용. 예: 단가 15,000원짜리를 2개 사면 price는 30,000
- date는 영수증에 적힌 구매 날짜 (YYYY-MM-DD). 영수증에서 날짜를 명확히 확인할 수 없으면 빈 문자열("")로 두고, 절대 임의로 날짜를 지어내지 마세요
- store는 구매처명, 없으면 빈 문자열
- 식품류만 포함 (쇼핑백, 비닐백, 포인트 적립, 부가세 등 비식품 항목 제외)
- JSON만 응답, 다른 설명 없음`;
}
