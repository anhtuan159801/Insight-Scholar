# Implementation Plan

## Implementation Status

Completed on 2026-06-22. Final validation: `python insight_scholar.py test` passed typecheck, 5 unit tests, production build, and 4 Playwright tests across desktop/mobile. `npm audit --omit=dev` reports 0 vulnerabilities. The `run` launcher smoke test returned HTTP 200 and terminated its process tree cleanly.

## Preconditions

- Preserve existing uncommitted OpenRouter/model-selector work.
- Install dependencies before validation because `node_modules` is currently absent.
- Read `prd.md`, `design.md`, and literature-matrix research before editing.

## Phase A: Stabilize the Domain Contract

- [ ] Inventory every consumer of legacy academic fields with `rg` and record the migration list.
- [ ] Define V2 evidence, seven-step, synthesis, legacy and union types in `types.ts`.
- [ ] Define the evidence-strength enum including `NOT_ENOUGH_INFORMATION`.
- [ ] Add `schema_version` and academic V2 type guard.
- [ ] Implement a single LLM-boundary normalizer with explicit missing-data handling.
- [ ] Expand `academicSchema` so every literature-matrix core value has a typed source field.
- [ ] Rewrite the academic prompt to enforce ordered seven-step appraisal and synthesis-after-verdict.
- [ ] Bound narrative lengths and retain the OpenRouter token increase/provider selection changes.
- [ ] Add normalization fixtures and unit tests.

Validation gate:

```powershell
npm run test:unit
npm run build
```

Rollback: revert V2 type/schema/normalizer together; do not leave schema and TypeScript contract mismatched.

## Phase B: Shared Projection and Workbook

- [ ] Add grouped immutable core-column definitions with VI/EN headers.
- [ ] Implement `toLiteratureMatrixRow` as a pure deterministic projection.
- [ ] Implement `toCriticalAppraisalRows`, emitting evidence claim/source rows.
- [ ] Implement safe join, missing value, year extraction and filename helpers once.
- [ ] Add an XLSX workbook builder for one or many papers.
- [ ] Apply header styling, widths, wrapping, autofilter and frozen panes where supported by the installed XLSX library.
- [ ] Add projection/workbook tests covering all columns and sheet names.

Validation gate:

```powershell
npm run test:unit
```

Rollback: projection/export modules are additive; disconnect imports if workbook behavior is invalid.

## Phase C: Detail UI and Exports

- [ ] Replace legacy academic rendering in `AnalysisView` with 3 phase sections and 7 step cards.
- [ ] Add reusable field/evidence/list components rather than repeating rendering logic.
- [ ] Add evidence-strength badge and final-verdict panel.
- [ ] Wire individual three-sheet Excel export through the shared workbook builder.
- [ ] Add guarded legacy academic rendering and re-analysis notice.
- [ ] Keep policy rendering intact and add null-safe arrays/keywords.
- [ ] Migrate App TXT export and Folder ZIP export to shared formatters.
- [ ] Fix unsafe policy/academic union property access in FolderManager.
- [ ] Fix touched-file Vietnamese mojibake.

Validation gate:

```powershell
npm run build
npm run test:unit
```

## Phase D: Literature Matrix UI

- [ ] Replace default LLM-generated rows with deterministic V2 projections.
- [ ] Render grouped core columns and protect them from deletion.
- [ ] Add group visibility controls, sticky study identity and useful empty states.
- [ ] Preserve custom-column creation/removal separately from core definitions.
- [ ] Add optional custom-field generation using source document content only after explicit action.
- [ ] Ensure a custom-field failure does not remove or regenerate core values.
- [ ] Export one or multiple rows using the shared three-sheet workbook.
- [ ] Localize all visible matrix controls and correct mojibake.

Validation gate:

```powershell
npm run build
npm run test:unit
```

## Phase E: Downstream Integration

- [ ] Update bibliometric input mapping for V2 study design and findings.
- [ ] Update folder classification summary for V2 overview/gap/themes.
- [ ] Keep fallback mapping for legacy academic and policy results.
- [ ] Update BibTeX year/author guards and remove hardcoded year.
- [ ] Search again for every removed legacy field and resolve remaining consumers.

Audit command:

```powershell
rg -n "thesis_background|theoretical_framework|conceptual_framework|definitions_variables|methodology|results_interpretation|scope_limitations|overall_conclusion" . -g "*.ts" -g "*.tsx"
```

## Phase F: Python Launcher and Automated Tests

- [ ] Add `vitest` scripts/configuration and pure-module unit tests.
- [ ] Add `@playwright/test`, Playwright config and deterministic E2E fixture mode.
- [ ] Add browser tests for detail, matrix, export action, desktop and mobile navigation.
- [ ] Store artifacts only under `output/playwright/`; update `.gitignore` as needed.
- [ ] Add `insight_scholar.py` with `run` and `test` modes using standard library.
- [ ] Verify dependency checks, server readiness, browser opening, signal cleanup and non-zero failures.
- [ ] Document both commands in README without exposing environment secrets.

Validation gate:

```powershell
python insight_scholar.py test
python insight_scholar.py --help
```

Manual `run` smoke test must confirm that Ctrl+C stops the Vite child process.

## Phase G: Final Review

- [ ] Run formatter only if an existing formatter is configured; do not introduce unrelated formatting churn.
- [ ] Run unit tests, production build and full Playwright suite.
- [ ] Inspect desktop/mobile screenshots and browser console output.
- [ ] Verify an exported workbook has three sheets and readable cells.
- [ ] Review diff for accidental secrets, generated browser binaries or unrelated source changes.
- [ ] Run Trellis check, update relevant specs with confirmed project conventions, and record the session.

## Final Acceptance Checklist

- [ ] New academic analysis completes all seven evidence-backed steps.
- [ ] A deterministic, fully split literature-matrix row is produced.
- [ ] Individual and multi-paper Excel exports use the same workbook contract.
- [ ] Legacy and policy results do not crash shared UI/export paths.
- [ ] Python `run` and `test` modes work from the repository root.
- [ ] Build, unit and browser tests pass.
