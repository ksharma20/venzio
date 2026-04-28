# GitHub Setup for Venzio (Company Fork vs Open Source)

This document explains the GitHub settings for the company fork and personal OSS repo.

---

## Overview

| Aspect | Company Fork | Personal OSS |
|--------|--------------|--------------|
| **Purpose** | Production deployment + internal development | Open source reference, external contributions |
| **Contributors** | Company team (direct collaborators) | Global community (forks) |
| **Merge Strategy** | `--no-ff` (merge commits) | `--no-ff` (merge commits) |
| **Deployments** | Staging + Production | None (reference only) |
| **Sync Direction** | Company → OSS (periodic, manual) | - |

---

## Company Fork Setup

### Settings → General
- **Repository visibility:** Private (if company-only) or Public (if referencing OSS)
- **Default branch:** `main`

### Settings → Collaborators and teams
- Add company developers as **Collaborators** (no fork needed)
- Assign permissions: **Maintain** or **Push** (depending on approval rights)

Example:
```
john@company.ai → Maintain (can approve PRs)
jane@company.ai → Push (can create/merge PRs)
```

### Settings → Branches → Branch protection rules

#### Main branch protection
- **Require a pull request before merging:** ✓
- **Require code reviews:** ✓ (1 approval minimum)
- **Require status checks to pass:** ✓
- **Allow merge commits:** ✓ (ONLY option enabled)
- **Allow squash merging:** ☐ (disabled)
- **Allow rebase merging:** ☐ (disabled)

**Why:** Enforces --no-ff merges (merge commits). No squashing = cleaner history, easier for contributors to sync.

#### Staging branch protection
- Same as main (or relaxed if staging is for testing)

---

## Personal OSS Repo Setup

### Settings → General
- **Repository visibility:** Public
- **Default branch:** `main`

### Settings → Collaborators and teams
- No internal team needed (external contributors use forks)
- Maintainer (you) is the owner

### Settings → Branches → Branch protection rules

#### Main branch protection
- **Require a pull request before merging:** ✓
- **Require code reviews:** ✓ (1-2 approvals, your discretion)
- **Require status checks to pass:** ✓
- **Allow merge commits:** ✓ (ONLY option enabled)
- **Allow squash merging:** ☐ (disabled)
- **Allow rebase merging:** ☐ (disabled)

**Why:** Same as company fork - consistent merge strategy, simpler for contributors.

---

## Merge Workflow

### Company developers → Company fork

```
1. Developer creates branch: feature/xyz
2. Developer pushes to company fork
3. Developer opens PR (company fork: feature/xyz → main)
4. Maintainer reviews & approves
5. Developer clicks "Create a merge commit" (GitHub default)
   → Creates merge commit, closes PR, deletes branch
6. Staging deployment triggered (CI/CD)
7. After testing, PR from staging → main
8. Production deployment triggered
```

### Company → OSS (periodic sync)

```
1. Maintainer reviews company fork for stable features
2. Maintainer creates PR: company-fork/main → personal-repo/main
   - Title: "Weekly sync: company contributions (week-of-2026-04-26)"
   - Body: Link to company fork roadmap, sprint details
3. GitHub merges as a merge commit (--no-ff)
4. Personal OSS updated, external contributors can sync
```

### External contributors → Personal OSS

```
1. Contributor forks personal-repo
2. Contributor creates branch: feature/xyz on their fork
3. Contributor opens PR (personal-repo: their-fork/feature → main)
4. Maintainer reviews & approves
5. GitHub merges as merge commit (--no-ff)
6. External contributor syncs their fork (if desired)
```

---

## Important Notes

### Why --no-ff everywhere?

- **Squash merge** requires force-pushing to update forks → confusing, error-prone
- **Rebase merge** flattens history, loses PR context
- **--no-ff (merge commits)** preserves branches, no force-pushes, auditable history

### Syncing forks

External contributors can sync their fork without issues:

```bash
git fetch upstream
git checkout main
git merge upstream/main  # Fast-forward or merge, not squash
git push origin main
```

No force-pushes needed because both repos use merge commits.

### Deployments

- **Company fork:** Vercel auto-deploys on push to `main` and `staging`
- **Personal OSS:** No deployments (reference only)

Configure Vercel to:
- Deploy `staging` → staging environment
- Deploy `main` → production environment

---

## Checklist

- [ ] Company fork: Set collaborators (Settings → Collaborators)
- [ ] Company fork: Enable branch protection on `main`
  - [ ] Require PR, reviews, status checks
  - [ ] Enable merge commits only (disable squash/rebase)
- [ ] Company fork: Enable branch protection on `staging`
- [ ] Personal OSS: Enable branch protection on `main`
  - [ ] Require PR, reviews, status checks
  - [ ] Enable merge commits only (disable squash/rebase)
- [ ] Vercel: Configure deployments
  - [ ] `staging` → staging environment
  - [ ] `main` → production environment
- [ ] Document in internal wiki/handbook

---

## Questions?

Contact the project maintainer.
