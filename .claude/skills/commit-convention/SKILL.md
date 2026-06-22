---
name: commit-convention
description: >
  how-munch 커밋 컨벤션에 맞는 커밋 메시지를 작성한다.
  변경 내용을 분석하고 type을 결정한 뒤 한국어로 커밋을 생성한다.
license: MIT
metadata:
  author: how-munch
  version: '1.0.0'
---

# commit-convention

how-munch 커밋 컨벤션 ([전문](rules/commit-convention.md))에 따라 커밋 메시지를 작성하고 커밋한다.

## 실행 절차

**1. 변경 파일 파악**

```bash
git diff --staged
git status
```

**2. type 결정**

변경 내용을 분석해 `feat / fix / refactor / chore / docs / style` 중 하나를 선택한다.

**3. 메시지 작성 후 커밋**

커밋 전 센티널 파일 생성 → 커밋 → 센티널 파일 삭제 순서로 실행한다.
훅(`~/.claude/hooks/block-dangerous-git.sh`)이 `~/.claude/.commit-convention-active` 파일 존재 여부로 `/commit-convention` 경유 여부를 검증한다.
센티널 파일 생성과 `git commit`은 훅이 명령 문자열만 보고 차단하지 않도록 **별도 명령으로 분리해 실행**한다.

```bash
# 1) 센티널 파일 먼저 생성 (별도 실행)
touch "$HOME/.claude/.commit-convention-active"

# 2) 커밋 후 센티널 파일 삭제
git commit -m "$(cat <<'EOF'
type/#{이슈번호}: 한 줄 요약

- 작업 내용 A
- 작업 내용 B
EOF
)"
rm -f "$HOME/.claude/.commit-convention-active"
```

> Co-Authored-By 추가하지 않는다.

## 작성 기준

| 항목    | 기준                                              |
| ------- | ------------------------------------------------- |
| 제목    | 한 줄, 마침표 없음, 한국어                        |
| 본문    | `- 변경 내용` 불릿 형식, 중요한 것 위주로 간결하게 |
| Co-author | 포함하지 않음                                  |
