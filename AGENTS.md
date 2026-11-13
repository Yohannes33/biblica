# Repository Guidelines & Agent Rules

## Git Workflow & Deployment Discipline
1. **Never commit directly to `main`**.
2. For every task, feature, or bug fix:
   - Create a GitHub issue (`gh issue create`).
   - Create a dedicated branch matching `feat/#<id>-<desc>` or `fix/#<id>-<desc>`.
   - Verify build passes with `npm run build`.
   - Push and open a Pull Request (`gh pr create --fill` with `Closes #<id>`).
   - Merge the PR (`gh pr merge --squash --delete-branch`) to trigger automatic Vercel production deployment.
3. Refer to the `.agents/skills/git-workflow/SKILL.md` skill for the complete step-by-step procedure.

## Code Standards
- Framework: Vite + React 19 + TypeScript + Tailwind CSS v4.
- High-contrast typography: always preserve crisp `#0f172a` text in Light Mode and `#f8fafc` in Dark Mode.
- Backend: Supabase (`ponffdglqwfwncoxzqia`). Never touch any non-Biblica databases.
