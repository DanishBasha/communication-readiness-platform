# Contributing Guide

This guide applies to all engineers on the team. Read it before opening your first PR.

---

## Table of Contents

1. [Branch Strategy](#branch-strategy)
2. [Commit Conventions](#commit-conventions)
3. [Pull Request Process](#pull-request-process)
4. [Code Review Rules](#code-review-rules)
5. [Definition of Done](#definition-of-done)
6. [Style Guides](#style-guides)
7. [Versioning](#versioning)
8. [Raising Issues](#raising-issues)

---

## Branch Strategy

We use a **trunk-based workflow with a long-lived integration branch**.

| Branch | Purpose | Protected |
|---|---|---|
| `main` | Production-ready code only. Tagged releases live here. | Yes — requires 2 approvals + passing CI |
| `develop` | Integration branch. All feature branches merge here first. | Yes — requires 1 approval + passing CI |
| `feature/<ticket-id>-short-description` | New functionality | No |
| `fix/<ticket-id>-short-description` | Bug fixes targeting `develop` | No |
| `hotfix/<ticket-id>-short-description` | Critical production fixes targeting `main` directly | No |
| `release/v<version>` | Release stabilization cut from `develop` | No |
| `chore/<description>` | Dependency updates, tooling, non-functional changes | No |

**Rules:**

- Branch from `develop` for all normal work; branch from `main` for hotfixes only.
- Delete feature/fix branches after merge.
- Never commit directly to `main` or `develop`.
- Keep branches short-lived — aim to merge within 2 days. Long-running branches must rebase on `develop` daily.
- Release branches accept only bug fixes, not new features.

---

## Commit Conventions

We use **Conventional Commits** (`v1.0.0`).

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature visible to users or other services |
| `fix` | A bug fix |
| `refactor` | Code change that is neither a fix nor a feature |
| `test` | Adding or fixing tests only |
| `perf` | Performance improvement |
| `chore` | Build process, dependency updates, tooling |
| `ci` | CI/CD pipeline changes |
| `docs` | Documentation only |
| `revert` | Reverts a previous commit |

### Scopes

Use the app or layer affected: `api`, `web`, `ai-service`, `auth`, `interview`, `credits`, `agent`, `rag`, `jobs`, `infra`, `db`, `shared`.

### Examples

```
feat(interview): add adaptive difficulty transition logic
fix(credits): prevent double-consume on concurrent requests
test(auth): add cross-mentor isolation negative tests
chore(deps): upgrade fastapi to 0.115.x
ci: add trivy container scan to build workflow
```

**Rules:**

- Subject line: imperative mood, no trailing period, max 72 characters.
- Reference the ticket ID in the footer: `Refs: #123` or `Closes: #123`.
- Commits that include a breaking change must add `BREAKING CHANGE:` in the footer.

---

## Pull Request Process

1. **Open against `develop`** (or `main` for hotfixes).
2. Fill in the PR template completely — partial PRs will be returned.
3. Link the issue: use `Closes #<id>` in the PR description so GitHub closes it on merge.
4. Assign at least one reviewer from each affected area (see `CODEOWNERS`).
5. Resolve all CI failures before requesting review — do not ask reviewers to look at a red build.
6. Do not merge your own PR. The last approving reviewer merges.
7. Squash-merge feature branches into `develop`. Merge-commit from `release/*` into `main`.
8. After merging, delete the source branch.

### PR Size Guidelines

| Size | Lines changed | Notes |
|---|---|---|
| XS | < 50 | Ideal |
| S | 50–200 | Preferred |
| M | 200–500 | Acceptable with clear scope |
| L | 500–1000 | Requires justification in PR description |
| XL | > 1000 | Must be split unless a single atomic migration |

---

## Code Review Rules

**For reviewers:**

- Complete reviews within **1 business day** of assignment.
- Use GitHub suggestion blocks for line-level changes so the author can accept in one click.
- Distinguish blocking from non-blocking comments: prefix non-blocking with `nit:` or `optional:`.
- Approve only when you would be comfortable owning the change yourself.
- Never approve a PR that skips authorization checks, hard-codes secrets, or bypasses CI.

**For authors:**

- Respond to or resolve all comments before requesting re-review.
- Explain the "why" in the PR description, not in code comments.
- Do not force-push after a review has started — add fixup commits instead.

**Mandatory review gates:**

| Path | Required reviewers |
|---|---|
| `apps/api/src/auth/**` | 2 approvals including one from `@ORG/security-reviewers` |
| `apps/api/src/credits/**` | 2 approvals |
| `infra/**` | 1 approval from `@ORG/devops-team` |
| Database migrations | 1 approval from `@ORG/backend-team` |
| `CLAUDE.md`, `CONTRIBUTING.md` | 1 approval from `@ORG/tech-leads` |

---

## Definition of Done

A PR is only mergeable when **all** of the following are true:

- [ ] CI passes (lint, type-check, unit tests, integration tests, security scan)
- [ ] New code has tests — coverage must not decrease on the changed files
- [ ] Authorization-negative test added if the change touches auth, RBAC, credits, or agent tools
- [ ] No secrets, credentials, or PII in source or test fixtures
- [ ] API changes have OpenAPI schema updated
- [ ] Database changes have a new Alembic migration (never edits to existing migrations)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] `VERSION` bumped if the change is being released (see Versioning below)
- [ ] PR description explains the "why", not just the "what"
- [ ] All reviewer comments resolved

---

## Style Guides

### TypeScript / Node.js (`apps/api`, `apps/web`)

- ESLint + Prettier configuration in repo root — run `npm run lint` before pushing.
- No `any` type unless accompanied by a comment explaining why it cannot be avoided.
- Provider interfaces live in `packages/shared-types/`; no concrete provider logic leaks into business modules.
- Business rules (scoring, credit accounting, difficulty transitions) belong in `apps/api/src/domain/` — never in controllers or LLM prompts.

### Python / FastAPI (`apps/ai-service`)

- Ruff for linting, Black for formatting — run `ruff check . && black --check .` before pushing.
- All LLM output schemas defined as Pydantic models and validated before use.
- No business authorization logic in `apps/ai-service` — it receives pre-authorized requests from Node.js.
- Type annotations required on all public function signatures.

### React / Next.js (`apps/web`)

- Components use Tailwind utility classes; no inline styles.
- shadcn/ui components are the baseline — extend, do not re-implement.
- Authorization guards live on the server (Node.js API). Frontend hiding is display-only.
- No direct database or AI service calls from the frontend.

### General

- No commented-out code in merged PRs.
- No `TODO` comments without a linked issue number.
- Environment variable names in `SCREAMING_SNAKE_CASE`; never hard-coded.

---

## Versioning

We follow **Semantic Versioning** (`MAJOR.MINOR.PATCH`).

| Change type | Version bump |
|---|---|
| Breaking API or schema change | MAJOR |
| New feature, backwards compatible | MINOR |
| Bug fix, dependency update, refactor | PATCH |

**How to bump:**

1. Edit `VERSION` with the new version string.
2. Add a release entry to `CHANGELOG.md`.
3. On merge to `main`, create and push a tag: `git tag v$(cat VERSION) && git push origin v$(cat VERSION)`.
4. The `release.yml` workflow will create the GitHub Release automatically.

Pre-release versions use the format `0.x.y` until the v1.0.0 production baseline is shipped.

---

## Raising Issues

Use the issue templates in `.github/ISSUE_TEMPLATE/`:

| Template | Use for |
|---|---|
| `bug_report.yml` | Reproducible defects in existing behaviour |
| `feature_request.yml` | New functionality aligned with the roadmap |
| `task.yml` | Engineering tasks, chores, and infrastructure work |

Before opening an issue:

1. Search for duplicates.
2. Check the roadmap — if the item is already planned, comment on the existing tracking issue instead.
3. Do not open an issue to ask a question — use the team Slack channel for that.
