# Contributing to Venzio (Company Repo)

This guide is for **company developers** working in the company repo.

The key idea:

- **OSS `main` is the source of truth**
- **Company `main` is a protected mirror of OSS `main`** (no human merges)
- **Company `develop` is the only human PR target** (preview/staging)
- Company changes flow **Company `develop` → OSS `main` → Company `main` → Company `develop`**

---

## Getting Started

1. **No fork needed** - You'll be added as a direct collaborator to the company repo

2. Clone the company fork:

```bash
git clone https://github.com/company-account/venzio.git
cd venzio
```

3. Install dependencies:

```bash
npm install
```

4. Migrate DB:

```bash
npm run migrate
```

5. Run project:

```bash
npm run dev
```

---

## Branch Model (Company)

### `main` (mirror-only)
- Production deploy branch
- **No direct PRs / no human merges**
- Updated only by the OSS sync automation (fast-forward or hard-reset mirror)

### `develop` (preview/staging)
- Preview/staging deploy branch
- **All human PRs target `develop`**
- Periodically updated from `main` via an automated PR (keeps it current)

---

## Development Workflow (Company)

### 1. Create a feature branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

Use descriptive names: `feature/signal-verification-fix`, `fix/dashboard-counts`, etc.

### 2. Make commits

Write clear commit messages:

```bash
git commit -m "Signal verification: hide location badge for unverified events

- Update EventCard.tsx to filter by matched_by
- Fix dashboard office count to exclude 'none' status
- Add Remote badge for partial/none signal states"
```

### 3. Push and open PR

```bash
git push origin feature/your-feature-name
```

Then open a PR in GitHub (company repo).

### 4. Code review

- Team reviews your PR
- Address feedback
- Avoid force-pushes on shared branches (`main`, `develop`)

### 5. Merge

- Merge the PR into `develop`
- Prefer **Squash & merge** for small, focused PRs (keeps `develop` readable)

---

## Before Pushing

```bash
# Fetch latest from company fork
git fetch origin

# Keep your feature branch current (optional)
git rebase origin/develop

# Test your changes
npm run dev
npm run build  # (optional, check for build errors)
```

---

## Deployments

- **Preview/Staging:** Merges to `develop` auto-deploy
- **Production:** `main` auto-deploy (mirror of OSS `main`)

Production releases happen when OSS `main` is updated (see “Syncing with OSS”).

---

## Syncing with Open Source

### Company → OSS (automatic PR)
We use **fully-automatic upstreaming** with one exception to avoid “echo loops” from sync merges.

Automation opens/updates a PR to **OSS `main`** for **any merged PR** into company `develop`,
except PRs labeled:

- `sync` (branch sync bookkeeping only)

- You review/merge that PR in OSS
- OSS `main` remains the single source of truth

#### Maintainers: one-time setup (company repo)
To enable automation in the company fork, add this secret in the **company repo**:

- `OSS_UPSTREAM_PAT`: a GitHub Personal Access Token with access to the OSS repo (`ksharma20/venzio`)

> Do not put tokens directly in workflow files. Anything committed to git is readable by anyone with repo access.

The company repo uses the workflow template:

- `.github/workflows/upstream_company_develop_to_oss.yaml`

Enable GitHub Actions on the company fork, then add the secret above.

### OSS → Company (automatic sync)
When OSS `main` changes, automation syncs company `main` to match OSS `main`.

### Company `main` → Company `develop` (automatic PR)
After company `main` updates, automation opens a PR from company `main` to company `develop`
so the preview branch stays current.

You don't need to do anything - the project maintainer handles this.

---

## Questions?

Reach out to the team or open an issue in the company fork.
