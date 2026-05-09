# 공통 UI 컴포넌트 설계 가이드

how-munch 프로젝트의 `src/commons/ui/` 컴포넌트 작성 규칙을 정의한다.

---

## 1. 파일 구조

- 위치: `src/commons/ui/{ComponentName}.tsx`
- 파일명: PascalCase (예: `SegmentControl.tsx`, `BottomSheet.tsx`)
- 섹션 단위 주석 블록으로 역할을 구분한다:

```tsx
/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/

/* -------------------------------------------------------------------------------------------------
 * Export
 * -----------------------------------------------------------------------------------------------*/
```

---

## 2. Compound Pattern

컴파운드 패턴이 필요한 컴포넌트는 `Object.assign`으로 export한다.

**규칙:**
- **`Root` 컴포넌트는 반드시 `Object.assign` 안에 포함시킨다** (추후 RSC 호환을 위해)
- 컴파운드 패턴이 아닌 단일 컴포넌트는 일반 export 유지 (불필요한 `Object.assign` 지양)
- `Header`, `Content`, `Footer`는 항상 형제 구조로 분리 (`Content` 안에 `Header/Footer` 금지)
- `Content`는 본문 영역만 담당 — 타이틀/액션/요약 같은 역할 침범 금지

```tsx
/* -------------------------------------------------------------------------------------------------
 * Export
 * -----------------------------------------------------------------------------------------------*/

const SegmentControl = Object.assign(SegmentControlRoot, {
  Root: SegmentControlRoot,   // ← Root 반드시 포함
  Item: SegmentControlItem,
});

export { SegmentControl };
```

사용처:
```tsx
<SegmentControl value={v} onValueChange={setV}>
  <SegmentControl.Item value="used">사용</SegmentControl.Item>
  <SegmentControl.Item value="depleted">소진</SegmentControl.Item>
</SegmentControl>
```

---

## 3. 상태 관리

| 상황 | 도구 |
|------|------|
| Controlled/Uncontrolled 모두 지원 | `useControlledState` (react-simplikit) |
| Context 공유 | `createSafeContext` (`src/commons/lib/context.ts`) |
| 조건 분기 effect | `useConditionalEffect` (react-simplikit) |

```tsx
// Controlled/Uncontrolled
const [value, setValue] = useControlledState({
  value: valueProp,
  defaultValue,
  onChange: onValueChange,
});

// Context
const [FooProvider, useFoo] = createSafeContext<FooContextValue>('Foo');
```

Context 값으로 raw `Dispatch<SetStateAction<T>>`를 노출하지 않는다.
상태 변경은 목적형 래퍼 함수(`openModal`, `setValue` 등)로 감싸서 전달한다.

---

## 4. Props API 네이밍

### 공통 UI 컴포넌트 (commons/ui)

브라우저 이벤트 네이밍(`onChange`, `onClick`)을 외부 API로 노출하지 않는다.
의미 기반 네이밍을 사용한다:

| 용도 | 네이밍 |
|------|--------|
| 값 변경 | `onValueChange` |
| 체크 상태 변경 | `onCheckedChange` |
| 열림/닫힘 | `onOpenChange` |
| 선택 변경 | `onSelectedChange` |

### Feature 컴포넌트 콜백 props

`on + {도메인} + {동사}` 순서로 작성한다:

```tsx
// ✅ 올바른 패턴
onIngredientItemChange: (value: string) => void;
onIngredientAmountChange: (value: string) => void;
onUsageStatusChange: (status: IngredientUsageStatus) => void;
onIngredientRemove: () => void;

// ❌ 잘못된 패턴
onChangeIngredientItem: (value: string) => void;  // 동사가 앞에
handleIngredientChange: () => void;               // handle* 접두어
```

훅에서 외부로 노출하는 함수도 동일 — `handle*` 접두어 대신 목적이 명확한 동사형:
```tsx
// ✅
resendCode, verifyCode, openSheet
// ❌
handleResend, handleVerify, handleOpen
```

---

## 5. 스타일 / Variants

- `cva` + `cn` 조합을 기본으로 사용한다
- import: `import { cn, cva, type VariantProps } from '@/commons/lib'`
- `disabled`는 opacity 축소 대신 명시된 비활성 스타일(gray 배경/텍스트/보더)로 표현한다
- `invalid`는 props/API로 노출하고, `data-invalid`/`aria-invalid` 상태 기반 스타일을 제공한다

```tsx
const fooVariants = cva('base-classes', {
  variants: {
    size: {
      sm: '...',
      md: '...',
      lg: '...',
    },
    disabled: {
      true: 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed',
    },
  },
  defaultVariants: { size: 'md' },
});
```

---

## 6. data-slot 속성

DOM 식별 및 스타일 타겟팅을 위해 `data-slot` 속성을 부여한다:

```tsx
<div data-slot="segment-control" ...>
  <button data-slot="segment-control-item" ...>
  <span data-slot="segment-control-indicator" ...>
```

---

## 7. ARIA / 접근성

| 패턴 | 사용 |
|------|------|
| 선택형 그룹 | `role="group"` (root) + `role="radio"` + `aria-checked` (item) |
| 비활성화 | `aria-disabled` (root) + `disabled` (item button) |
| 시각적 전용 | `aria-hidden` (인디케이터 등 장식 요소) |

---

## 8. 폼 연동

공통 폼 UI는 `src/commons/ui/Form.tsx`의 compound API를 우선 사용한다:

```tsx
<Form.Field>
  <Form.Label>라벨</Form.Label>
  <Form.Control>
    <Input ... />
  </Form.Control>
  <Form.Error />
</Form.Field>
```

---

## 9. 실제 구현 예시

현재 `src/commons/ui/`에 구현된 컴포넌트:

| 컴포넌트 | 패턴 | 특이사항 |
|---------|------|---------|
| `BottomSheet` | Compound | `Root`, `Header`, `Content`, `Footer` |
| `SegmentControl` | Compound | 슬라이딩 인디케이터, `useControlledState` |
| `Chip` / `ChipRow` | 단일 | `cva` variants, `role="radio"` |
| `DatePicker` | Compound | `useControlledState` |
| `Form` | Compound | `Field`, `Label`, `Control`, `Error` |
| `WheelPicker` | Compound | `Root`, `Item` |
