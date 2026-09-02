import { type IngredientCategoryOption } from '@/entities/ingredient-category';

/**
 * @description Claude Vision API에 전달할 영수증 분석 system 프롬프트를 생성한다.
 * 카테고리 목록을 API에서 가져와 동적으로 삽입하므로 하드코딩 없이 DB와 동기화된다.
 * 상품명 원문을 brand(브랜드) / product(품목명) / spec(규격 표기)으로 분해시키고,
 * 품목을 개수로 세는지 무게·부피로 덜어 쓰는지(unit)도 함께 판정시킨다.
 * 최종 이름 조립과 수량 계산은 클라이언트(parseAiResponse)가 담당한다.
 */
export function buildReceiptPrompt(categories: IngredientCategoryOption[]): string {
  const categoryList = categories.map((c) => `${c.code}(${c.label})`).join(', ');

  return `당신은 영수증과 장보기 목록 사진을 분석해서 구조화된 JSON 데이터로 변환하는 도우미입니다.

주어진 이미지를 분석해 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력합니다.

출력 형식:
{
  "items": [
    {
      "brand": "브랜드명",
      "product": "품목명",
      "spec": "규격 표기",
      "unit": "count",
      "count": 수량(숫자),
      "price": 금액(숫자, 해당 품목에 지출한 총액),
      "store": "구매처",
      "date": "YYYY-MM-DD",
      "category_code": "카테고리코드"
    }
  ]
}

카테고리 코드 목록:
${categoryList}

[brand — 브랜드명]
- 제조사·농장·유통 브랜드명만 넣습니다. 예: "서울우유", "산내들농원", "CJ", "풀무원"
- '농원', '유업', '식품', 'F&B', '축산' 같은 접미어가 붙은 고유명사는 브랜드로 봅니다
- 브랜드가 아닌 수식어는 절대 넣지 마세요: '유기농', '무항생제', '국내산', '수입산', '냉동', '손질', '산지직송', '특大'
- 브랜드인지 확신할 수 없으면 반드시 빈 문자열("")로 두고, 그 표현은 product에 그대로 남겨 두세요

[product — 품목명]
- 브랜드와 규격 표기를 뺀 순수한 품목 이름만 넣습니다. 예: "사양벌꿀", "삼겹살", "계란"
- 용량·중량·개수 표기는 여기 넣지 말고 spec으로 분리하세요

[spec — 규격 표기]
- 상품 1개당 규격 표기를 원문 그대로 넣습니다. 예: "1kg", "500g", "1L", "5개입"
- 표기가 없으면 빈 문자열("")
- 주문 수량("1개", "2개")은 spec이 아니라 count입니다. 상품 1개당 규격만 넣으세요

[unit — 재고 관리 단위]
- "count", "g", "kg", "ml", "l" 중 하나만 사용합니다
- 기본값은 "count"입니다. 통째로 세는 물건은 전부 "count"로 두세요
  (병·팩·봉지에 담겨 나오는 것 — 우유, 꿀, 계란, 라면, 두부, 요구르트 등)
- 무게·부피 단위는 저울로 덜어 쓰는 벌크 품목에만 사용합니다
  (덩어리 정육, 생선, 대용량 곡물·견과 등)
- 애매하면 반드시 "count"를 선택하세요

[나머지]
- count는 영수증에 적힌 구매 수량(개수), 없으면 1
- price는 해당 품목에 실제로 지출한 총 금액(영수증의 '금액'/합계 열). 개당 단가가 아니라 수량이 반영된 합산 금액을 사용. 예: 단가 15,000원짜리를 2개 사면 price는 30,000
- date는 영수증에 적힌 구매 날짜 (YYYY-MM-DD). 영수증에서 날짜를 명확히 확인할 수 없으면 빈 문자열("")로 두고, 절대 임의로 날짜를 지어내지 마세요
- store는 구매처명, 없으면 빈 문자열
- 식품류만 포함 (쇼핑백, 비닐백, 포인트 적립, 부가세 등 비식품 항목 제외)
- JSON만 응답, 다른 설명 없음

분해 예시:
"산내들농원 사양벌꿀, 1kg, 1개" → brand: "산내들농원", product: "사양벌꿀", spec: "1kg", unit: "count", count: 1
"삼겹살 500g" 2팩 → brand: "", product: "삼겹살", spec: "500g", unit: "g", count: 2
"무항생제 계란 5개입" → brand: "", product: "무항생제 계란", spec: "5개입", unit: "count", count: 1`;
}
