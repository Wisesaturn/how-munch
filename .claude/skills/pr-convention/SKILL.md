---
name: pr-convention
description: >
  how-munch PR 컨벤션에 맞는 Pull Request를 생성한다.
  base는 항상 main, diff 분석 후 gh pr create까지 수행한다.
license: MIT
metadata:
  author: how-munch
  version: '1.0.0'
---

# pr-convention

how-munch PR 컨벤션 ([전문](rules/pr-convention.md))에 따라 PR 본문을 작성하고 `gh pr create`로 PR을 생성한다.

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
