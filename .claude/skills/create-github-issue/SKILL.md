---
name: create-github-issue
description: >
  how-munch GitHub 이슈를 일관된 형식으로 생성한다.
  유형 판단 → 제목 작성 → 본문 작성 → gh issue create 까지 수행한다.
license: MIT
metadata:
  author: how-munch
  version: '1.0.0'
---

# create-github-issue

GitHub 이슈를 유형별 템플릿에 맞게 생성한다.

## 실행 절차

### 1단계: 이슈 유형 판단

| 유형              | 판단 기준                                                          |
| ----------------- | ------------------------------------------------------------------ |
| 기능 구현 (`✨Feature`) | 존재하지 않던 기능 신규 추가                                |
| 상태 개선 (`🔨Fix`)     | 사용자가 체감하는 동작·결과가 달라짐 (UI, 로직, UX 개선)   |
| 버그 리포트 (`🐞Bug`)   | 의도치 않은 오동작                                          |
| 리팩토링 (`♻️Refactor`) | 외부 동작은 동일, 내부 코드·구조만 변경                    |
| 유지보수 (`🔧Chore`)    | 빌드 설정, 패키지, 문서 등                                  |

> **Fix vs Refactor 구분**: 사용자·QA가 변경을 눈치챌 수 있으면 Fix, 코드만 바뀌고 화면·동작이 100% 동일하면 Refactor

### 2단계: 이슈 제목 작성

이슈 제목은 **한국어 문장형**으로 작성한다.

| 유형      | 종결 형태                                          | 예시                                          |
| --------- | -------------------------------------------------- | --------------------------------------------- |
| 기능 구현 | `~를 구현한다` / `~를 추가한다`                    | `냉장고 아이템 유통기한 알림을 구현한다`      |
| 상태 개선 | `~를 조정한다` / `~이어야 한다`                    | `소진된 재고를 유통기한 알림에서 제외한다`    |
| 버그      | `~현상이 발생한다` / `~문제가 있다`                | `재고 차감이 두 번 발생하는 현상이 발생한다`  |
| 리팩토링  | `~를 리팩토링한다` / `~구조를 개선한다`            | `queryKey를 entities 레이어로 통합한다`       |
| 유지보수  | `~를 업데이트한다` / `~를 추가한다`                | `pnpm 의존성을 최신 버전으로 업데이트한다`    |

- 마침표(`.`) 없이 종결
- 영문 고유명사는 원문 그대로 사용 (예: `Supabase`, `RPC`, `QueryClient`)
- 30자 내외로 간결하게

### 3단계: 본문 작성

`rules/github-issue.md`의 유형별 템플릿을 사용한다.

### 4단계: 이슈 생성

```bash
gh issue create \
  --title "{이슈 제목}" \
  --body "$(cat <<'EOF'
{본문}
EOF
)"
```

### 5단계: 브랜치 생성

생성된 이슈 URL에서 번호를 확인하고 브랜치를 생성한다:

```bash
git checkout -b feat/#{이슈번호}   # Feature
git checkout -b fix/#{이슈번호}    # Fix / Bug
git checkout -b refactor/#{이슈번호}  # Refactor (선택)
```

---

## 규칙 참조

- 템플릿 상세: `rules/github-issue.md`
- 커밋 컨벤션: `.claude/skills/commit-convention/rules/commit-convention.md`
- PR 컨벤션: `.claude/skills/pr-convention/rules/pr-convention.md`

## 주의사항

- `gh` CLI가 설치되어 있어야 합니다: `brew install gh`
- 인증이 필요합니다: `gh auth login`
