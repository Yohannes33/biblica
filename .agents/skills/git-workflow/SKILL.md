---
name: git-workflow
description: >-
  Standard development lifecycle for Biblica: create an issue for the task,
  branch from main referencing the issue (feat/#<id>-<desc> or fix/#<id>-<desc>),
  commit with conventional commits, create a pull request linking the issue,
  verify preview deployment, and squash-merge into main for production deployment.
---

# Git Workflow & Pull Request Deployment Lifecycle

To maintain high code quality and leverage preview deployments on Vercel, all changes to Biblica must follow this pull-request lifecycle. Direct commits to `main` are strictly forbidden.

## Standard Workflow Steps

### 1. Create or Identify an Issue
Every task starts with a GitHub issue describing the requirement, bug, or user request:
```bash
gh issue create --title "<Type>: <Short Title>" --body "<Detailed description and acceptance criteria>"
```
Note the generated issue number (e.g., `#12`).

### 2. Create and Switch to a Feature Branch
Create a branch named according to convention:
- Features: `feat/#<issue-id>-<short-description>`
- Fixes: `fix/#<issue-id>-<short-description>`
- Chore / Refactor: `chore/#<issue-id>-<short-description>`

```bash
git checkout main
git pull origin main
git checkout -b feat/#12-google-auth-integration
```

### 3. Implement & Test Locally
Make the changes and verify code quality:
```bash
npm run build
```
Ensure zero TypeScript compilation errors and clean bundle output.

### 4. Commit with Conventional Commits
Format commits clearly:
- `feat(auth): add google oauth sign-in provider`
- `fix(theme): fix light mode text contrast on mobile cards`
- `docs(readme): update deployment instructions`

```bash
git add .
git commit -m "feat(auth): add google oauth sign-in button and session handler"
```

### 5. Push Branch & Create Pull Request
Push the branch and open a PR linked to the issue:
```bash
git push -u origin feat/#12-google-auth-integration
gh pr create --title "feat(auth): add Google OAuth login" --body "Closes #12. Adds 1-click Google Sign-in via Supabase Auth."
```
Vercel automatically triggers a Preview Deployment for this PR.

### 6. Verify Preview & Squash Merge to Production
Verify the build passes, then squash and merge:
```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```
Merging to `main` automatically triggers the live production deployment on Vercel (`https://biblica-kohl.vercel.app`).
