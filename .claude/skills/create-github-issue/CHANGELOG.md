# Changelog

이 스킬의 주요 변경 이력. 형식은 [Keep a Changelog](https://keepachangelog.com/), 버전은 [SemVer](https://semver.org/)를 따른다.

## [2.0.0] - 2026-06-23

1.0.0의 reference 나열형 스킬을 **grill + vertical slice** 프로세스형으로 전면 재설계. 동작 방식이 바뀌는 breaking change라 major 상향.

### Changed

- **성격 전환.** "무엇을 만들지 다 정해진 상태"를 전제하던 reference 나열형 → `grill-me`(미해소 결정을 한 문항씩, 추천답 동반) + `to-issues`(tracer bullet 분할 → 발행 전 요약 → 발행) **프로세스형**으로 재작성.
- **5단계 흐름**: ① 맥락 수집 → ② Grill(유형·도메인·범위 분기 해소) → ③ Vertical slice 초안(부모/sub-issue 구조·의존순서) → ④ 발행 전 요약(승인 게이트) → ⑤ 의존순서대로 발행.
- **단계별 완료 기준 명시.** 특히 ④는 "사용자가 명시적으로 승인. 승인 전 절대 발행 안 함"으로 premature completion(승인 없이 발행)을 차단.

### Added

- **sub-issue 지원.** 큰 작업은 부모 이슈 1개 + sub-issue N개로 구조화하고, 네이티브 REST API(`gh api .../sub_issues`, 자식의 REST `id`로 연결)로 부모에 붙인다.
- **프론트매터 정비.** grill/slice/sub-issue 트리거를 담은 description으로 교체하고 `version: 2.0.0`으로 갱신.

### Fixed

- **Duplication(sediment) 제거.** 제목 규칙·gh 명령이 `SKILL.md`와 reference 파일에 중복되던 것을, reference 파일을 single source of truth로 collapse. `SKILL.md`는 프로세스(steps)만 남김.
- **참조 파일 네이밍 명시화.** `rules/github-issue.md` → `rules/GUIDE.md`(폴더명 `create-github-issue`와 중복 해소).
- **선택적 로드.** `GUIDE.md` 상단에 "언제 필요한지"까지 붙인 섹션 목차를 추가하고, `SKILL.md` 포인터를 섹션 단위로 좁힘 — 물리적 분리 없이 발행 유형 1종 템플릿만 읽도록 유도.

## [1.0.0] - 2026-04-06

CHANGELOG 도입 이전 버전. 이력 추적을 위해 소급 기록한다.

### Added

- **reference 나열형 이슈 생성 스킬.** 유형 판단(Feature/Fix/Bug/Refactor/Chore) → 제목 작성 → 유형별 템플릿 본문 작성 → `gh issue create` → 브랜치 반영의 선형 절차.
- **유형별 템플릿·제목 규칙.** `rules/github-issue.md`에 한국어 문장형 제목 규칙과 유형별 본문 템플릿 정리.
