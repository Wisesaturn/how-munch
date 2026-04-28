# Stackflow 가이드라인

모바일 웹뷰 방식의 페이지 전환이 필요할 때 Stackflow를 사용한다.
iOS 스타일의 푸시/팝 스택 네비게이션을 제공하며, 브라우저 히스토리와 동기화된다.

## 핵심 개념

| 용어 | 설명 |
|------|------|
| **Activity** | Stackflow 스택 위에 올라가는 하나의 화면 단위. `StackFlow.tsx`에 등록. |
| **Screen** | Activity가 렌더링하는 실제 UI 컴포넌트. `AppScreen`으로 감싼다. |
| **AppBar** | `AppScreen`의 `appBar` prop으로 설정하는 상단 헤더. |

### 구조 관계

```
stackFlowActions.push('FooActivity', { ...params })
        │
        ▼
FooActivity (StackFlow.tsx 내부 함수)
  - useActions().pop → onClose로 주입
  - params 구조 정의
        │
        ▼
FooScreen (src/features/{domain}/ui/FooScreen.tsx)
  - AppScreen으로 래핑
  - appBar title/backButton/renderRight 설정
  - 실제 UI 렌더링
```

---

## Screen 컴포넌트 작성

### 위치

```
src/features/{domain}/ui/{Feature}Screen.tsx
```

### 기본 구조

```tsx
'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

interface FooScreenProps {
  onClose: () => void;
  // 필요한 props 추가
}

export function FooScreen({ onClose }: FooScreenProps) {
  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{ title: '화면 제목' }}
    >
      <div className="p-4">
        {/* 본문 내용 */}
      </div>
    </AppScreen>
  );
}
```

### 필수 규칙

- `AppScreen`에 `className="pointer-events-auto"` 필수 — 없으면 터치/클릭 이벤트가 차단됨
- `onClose: () => void` props를 받아 닫기 동작을 외부에서 주입
- `'use client'` 선언 필수 (Stackflow 훅은 클라이언트 전용)
- 스크롤 영역 하단에 고정 버튼이 있으면 본문에 `pb-28` 여백 적용

---

## AppBar 설정 패턴

`AppScreen`의 `appBar` prop으로 설정한다.

### 기본 제목

```tsx
<AppScreen appBar={{ title: '장보기 추가' }}>
```

### 커스텀 뒤로가기 버튼

기본 뒤로가기 대신 직접 핸들러를 연결할 때 사용한다.

```tsx
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/commons/ui';

<AppScreen
  appBar={{
    title: '설정',
    backButton: {
      render: () => (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="뒤로가기"
        >
          <ChevronLeft className="size-5" />
        </Button>
      ),
    },
  }}
>
```

### 우측 액션 버튼

```tsx
<AppScreen
  appBar={{
    title: '알림',
    renderRight: () => (
      <Button variant="ghost" size="sm" onClick={markAllRead}>
        모두 읽음
      </Button>
    ),
  }}
>
```

### AppBar title 네이밍 규칙

- 사용자 행동 기반: `'장보기 추가'`, `'냉장고 편집'`
- 페이지 이름 기반: `'설정'`, `'알림'`, `'프로필 수정'`
- 영문/코드명 그대로 쓰지 않음: `'FridgeItemAdd'` ❌ → `'냉장고 재료 추가'` ✅

---

## Activity 등록 (`StackFlow.tsx`)

모든 Activity는 `src/apps/stackflow/StackFlow.tsx` 한 파일에 정의하고 등록한다.

### 1. Activity 함수 작성

```tsx
function FooActivity({
  params,
}: {
  params: {
    householdId: string;
    // 필요한 params 타입 정의
  };
}) {
  const { pop } = useActions();

  return (
    <FooScreen
      onClose={pop}
      householdId={params.householdId}
    />
  );
}
```

### 2. `activities` 객체에 등록

```tsx
const appStackFlow = stackflow({
  activities: {
    // 기존 activities...
    FooActivity, // 추가
  },
  // ...
});
```

### 3. Activity 네이밍 규칙

- PascalCase + `Activity` 접미사: `FridgeItemAddActivity`, `ProfileEditActivity`
- Screen은 동일 도메인 + `Screen` 접미사: `FridgeItemAddScreen`, `ProfileEditScreen`
- 동사+명사 구조로 의도를 명확히: `Add`, `Edit`, `Settings`, `Editor`

---

## Route 등록

`historySyncPlugin`의 `routes`에 해시 경로를 추가한다.

```tsx
historySyncPlugin({
  routes: {
    // 기존 routes...
    FooActivity: '/foo/path', // 추가
  },
  fallbackActivity: () => 'IdleActivity',
  useHash: true,
}),
```

### 경로 네이밍 규칙

- kebab-case, 도메인/액션 계층 구조 반영
- `/{domain}/{sub-domain?}/{action}` 패턴

| Activity | Route |
|----------|-------|
| `IngredientAddActivity` | `/ingredient/add` |
| `FridgeItemEditActivity` | `/fridge/item/edit` |
| `NotificationSettingsActivity` | `/notifications/settings` |

---

## 네비게이션

### 화면 열기 (push)

```tsx
import { stackFlowActions } from '@/apps/stackflow/StackFlow';

// 파라미터 없음
stackFlowActions.push('ProfileSettingsActivity', {});

// 파라미터 있음
stackFlowActions.push('FridgeItemAddActivity', { householdId });
stackFlowActions.push('MealEditorActivity', { householdId, date, type, meal });
```

`stackFlowActions`는 React 컴포넌트 바깥(이벤트 핸들러, 유틸 함수)에서도 사용 가능하다.

### 화면 닫기 (pop)

Activity 함수에서 `useActions().pop`을 Screen의 `onClose`로 전달한다.

```tsx
// StackFlow.tsx Activity 함수 내부
const { pop } = useActions();
return <FooScreen onClose={pop} />;
```

Screen 컴포넌트 내부에서 `useActions`를 직접 호출하지 않는다.
닫기 동작은 항상 Activity에서 주입한다.

---

## 콜백 전달 패턴 (Activity → 검색 화면 → Activity)

Activity params는 URL history에 직렬화되므로 **함수를 param으로 넘길 수 없다**.
선택 결과를 이전 Activity로 돌려줘야 하는 화면(검색, 선택 등)은 모듈 레벨 단일 변수로 콜백을 보관한다.

### 구조

```
호출 Activity                           ProductNameSearchActivity
─────────────────────────────────────────────────────────────────
1. setPendingCallback(onSelect)
2. push('ProductNameSearchActivity',
        { fieldLabel, suggestions })  →  params 수신
                                         onSelectName = resolvePending + pop()
                                         onClose      = clearPending  + pop()
                                         ↓
                                         <ProductNameSearchScreen
                                           onSelectName={...}
                                           onClose={...}
                                         />
```

### 구현 예시

```tsx
// 호출 Activity (StackFlow.tsx)
function FooActivity({ params }) {
  const { pop, push } = useActions();

  function openProductNameSearch(_currentName: string, onSelect: (name: string) => void) {
    setPendingProductNameCallback(onSelect);   // 콜백 등록
    push('ProductNameSearchActivity', {
      fieldLabel: '품목명',
      suggestions: params.suggestions ?? [],
    });
  }

  return <FooScreen onClose={pop} onOpenProductNameSearch={openProductNameSearch} />;
}

// ProductNameSearchActivity (StackFlow.tsx)
function ProductNameSearchActivity({ params }) {
  const { pop } = useActions();

  function handleSelectName(name: string) {
    resolvePendingProductNameCallback(name);  // 콜백 실행 + 초기화
    pop();
  }

  function handleClose() {
    clearPendingProductNameCallback();        // 콜백 초기화 (취소)
    pop();
  }

  return (
    <ProductNameSearchScreen
      onClose={handleClose}
      onSelectName={handleSelectName}
      fieldLabel={params.fieldLabel}
      suggestions={params.suggestions}
    />
  );
}
```

### 규칙

- 콜백 저장소는 `src/features/ingredient/model/productNameSearchStore.ts` 사용
- 검색 Activity는 동시에 하나만 열리므로 단일 변수로 충분하다 (Map/UUID 불필요)
- `ProductNameSearchScreen`은 `useActions`를 직접 호출하지 않는다
- 선택(`onSelectName`)과 취소(`onClose`) 모두 콜백 초기화 후 `pop()`을 호출한다

---

## 새 Activity 추가 체크리스트

1. - [ ] `src/features/{domain}/ui/{Feature}Screen.tsx` 생성
   - `AppScreen` 래핑, `className="pointer-events-auto"`
   - `onClose: () => void` props 포함
   - `appBar.title` 한국어로 설정
2. - [ ] `src/features/{domain}/index.ts` public API export 추가
3. - [ ] `StackFlow.tsx`에 Activity 함수 추가
   - `useActions().pop` → `onClose` 주입
   - params 타입 인라인 정의
4. - [ ] `stackflow()` `activities` 객체에 Activity 등록
5. - [ ] `historySyncPlugin` `routes`에 해시 경로 추가
6. - [ ] 호출 지점에서 `stackFlowActions.push('XxxActivity', { ...params })` 사용
