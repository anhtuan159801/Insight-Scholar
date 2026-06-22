# Frontend Quality Guidelines

## Required Validation

Run the complete project gate with:

```powershell
python insight_scholar.py test
```

It must execute, in order:

1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run build`
4. `npm run test:e2e`

Vitest only owns `tests/unit/**/*.test.ts`; Playwright only owns `tests/e2e/`. Do not allow one runner to discover the other runner's files.

## Browser Testing

- Use deterministic fixtures for LLM-dependent UI flows; automated tests must not consume API quota.
- E2E fixture mode uses `E2E_MODE=true` env var to seed one V2 academic result and one legacy/policy result without real API calls. Default to `false` in production builds.
- Exercise desktop and mobile Chromium.
- Store traces, screenshots and reports in `output/playwright/`.
- Prefer `data-testid` for navigation/workflow contracts and accessible roles for user-facing controls.

## Security and Dependencies

- Run `npm audit --omit=dev` after changing document parsers or export libraries.
- Treat uploaded PDF/DOCX content as untrusted.
- Bundle the matching PDF.js worker locally; do not point a newer parser at a version-pinned external worker.
- Do not use unpatched document/export dependencies when a maintained replacement is available.

## Review Checklist

- [ ] Runtime input normalized before entering state
- [ ] Core projections are deterministic and do not call the LLM
- [ ] Legacy and policy union variants are guarded
- [ ] Excel contains Literature Matrix, Critical Appraisal and Metadata
- [ ] No projected value is `[object Object]` or JavaScript `undefined`
- [ ] Typecheck, unit, build and E2E pass
- [ ] Production audit has no known vulnerabilities
- [ ] No API keys, browser binaries or generated reports are committed
