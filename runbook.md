# Bayar's Coffee CRM — Runbook

Error log and solutions encountered during development. Newest entries at the top of each section.

---

## Setup

Project scaffolded with Next.js 16 (latest), TypeScript strict, Tailwind v4, shadcn/ui v4, pnpm 11.

### 2026-05-11 — Initial scaffold

**Action:** Ran `npx create-next-app@latest bayars-coffee-crm --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes`

**Note:** `create-next-app@latest` installed Next.js 16.2.6 (not 15 as originally planned — 16 is the current stable in May 2026). App Router patterns are identical.

**Files changed:** All files in project root, `src/app/`, `public/`

---

### 2026-05-11 — pnpm build script approvals

**Error:** `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: sharp@0.34.5, unrs-resolver@1.11.1, msw@2.14.5`

**Cause:** pnpm 11 requires explicit approval for packages that run build scripts (native addon compilation). Security feature introduced in pnpm 9.

**Fix:** Added `"pnpm": { "onlyBuiltDependencies": ["msw", "sharp", "unrs-resolver"] }` to `package.json`. Deleted `pnpm-lock.yaml` and re-ran `pnpm install`.

**Files changed:** `package.json`

---

### 2026-05-11 — shadcn toast deprecated

**Error:** `The toast component is deprecated. Use the sonner component instead.`

**Cause:** shadcn v4 replaced the Radix-based toast with Sonner.

**Fix:** Used `sonner` instead of `toast` in the component add command.

**Files changed:** `src/components/ui/sonner.tsx` added; no `toast.tsx`

---

## Future entries

Use this format:

### [DATE] — [Short description]
**Error:** ...
**Cause:** ...
**Fix:** ...
**Files changed:** ...
