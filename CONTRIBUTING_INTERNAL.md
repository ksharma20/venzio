# Contributing to Venzio (Company Fork)

This guide is for **company developers** contributing to the company fork of Venzio.

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
node scripts/migrate.js
```

5. Run project:

```bash
npm run dev
```

---

## Development Workflow

### 1. Create a feature branch

```bash
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

Then open a PR in GitHub (company fork).

### 4. Code review

- Team reviews your PR
- Address feedback
- No force-pushes needed (we use merge commits, not squash)

### 5. Merge

- Use GitHub's "Create a merge commit" button (✓ default)
- Branch history is preserved for auditing
- PR is closed automatically

---

## Merging Strategy

**All PRs in company fork use merge commits (`--no-ff`).**

This means:

- Your branch is merged, not squashed
- Commit history is preserved
- You can see which commits came from which PR
- If you need to revert, you can revert the merge commit

**Why not squash?** Squash requires force-pushing your branch if you need to sync, which is confusing for contributors.

---

## Before Pushing

```bash
# Fetch latest from company fork
git fetch origin

# Sync with latest main (if needed)
git rebase origin/main

# Test your changes
npm run dev
npm run build  # (optional, check for build errors)
```

---

## Deployments

- **Staging:** Merges to `staging` branch auto-deploy
- **Production:** Merges to `main` branch auto-deploy

Always test on staging before merging to main:

1. Merge PR to `staging` branch
2. Verify changes on staging environment
3. Create PR from `staging` → `main` for production release

---

## Syncing with Open Source

Company contributions are synced back to the personal OSS repo periodically (at your discretion).

You don't need to do anything - the project maintainer handles this.

---

## Questions?

Reach out to the team or open an issue in the company fork.
