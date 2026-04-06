---
name: pr-convention
description: >
  how-munch PR 컨벤션에 맞는 Pull Request를 생성한다.
  base는 항상 main, diff 분석 후 gh pr create까지 수행한다.
  PR 생성 후 code-review:code-review 스킬로 리뷰하고 결과를 라인 지정 PR Review로 등록한다.
license: MIT
metadata:
  author: how-munch
  version: '1.2.0'
---

# pr-convention

how-munch PR 컨벤션 ([전문](rules/pr-convention.md))에 따라 PR 본문을 작성하고 `gh pr create`로 PR을 생성한다.
PR 생성 후 `code-review:code-review` 스킬로 자동 리뷰를 수행하고 결과를 PR 코멘트로 등록한다.

## 실행 절차

**1. 현재 브랜치 및 이슈번호 확인**

```bash
git branch --show-current
# feat/#42 → closes #42
```

**2. diff 분석**

```bash
git diff main...HEAD --stat
git log --oneline --no-merges main..HEAD
```

**3. PR 제목 + 본문 작성** — [rules/pr-convention.md](rules/pr-convention.md) 참고

**4. 브랜치 push**

```bash
git push -u origin {current-branch}
```

**5. gh pr create 실행**

```bash
gh pr create \
  --base main \
  --title "{title}" \
  --body "$(cat <<'EOF'
{body}
EOF
)"
```

**6. 코드 리뷰 실행**

PR 생성 직후 `code-review:code-review` 스킬을 호출해 PR을 리뷰한다.

- 리뷰 대상: 생성된 PR 번호 (위 명령 출력 URL에서 추출)
- 검토 항목: 버그, 보안 취약점, 코드 품질, 프로젝트 컨벤션(CLAUDE.md) 준수 여부
- 리뷰 결과는 파일 경로(`path`), 라인 번호(`line`), 코멘트 내용(`body`) 단위로 수집한다

**7. 리뷰 결과를 라인 지정 PR Review로 게시**

`gh pr comment` 대신 `gh api`로 Pull Request Review를 생성해 특정 코드 라인에 코멘트를 단다.

```bash
# HEAD SHA 및 repo 추출
HEAD_SHA=$(git rev-parse HEAD)
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Review + line comments 한 번에 게시
gh api repos/$REPO/pulls/{PR번호}/reviews \
  --method POST \
  --field commit_id="$HEAD_SHA" \
  --field body="## 🤖 Code Review by Claude\n\n{전체 요약}" \
  --field event="COMMENT" \
  --field "comments[][path]"="{파일1}" \
  --field "comments[][line]"={라인1} \
  --field "comments[][body]"="{코멘트1}" \
  --field "comments[][path]"="{파일2}" \
  --field "comments[][line]"={라인2} \
  --field "comments[][body]"="{코멘트2}"
```

> `line`은 diff 내 변경된 라인(+로 표시된 라인)만 지정 가능하다.
> 변경되지 않은 라인은 제외하고, 전체 요약은 Review body에 포함한다.
