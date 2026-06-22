# Technical Design

## 1. Scope and Architecture

This change spans the complete client-side flow:

```text
PDF/DOCX/TXT
  -> text parser
  -> LLM academic-analysis request
  -> runtime normalization
  -> AcademicAnalysisV2 in React state
  -> shared deterministic projections
     -> seven-step detail UI
     -> literature matrix UI
     -> XLSX workbook
     -> TXT/ZIP exports
     -> bibliometric/classification inputs
```

The policy-analysis contract remains separate and unchanged except for defensive union handling in shared views/exports.

## 2. Domain Contract

### 2.1 Versioning

Add `schema_version: 2` to new academic results. Retain the existing `type: 'ACADEMIC'` discriminator. Never infer V2 merely from `type`; use a type guard checking version and required step objects.

Legacy academic results are accepted as `LegacyAnalysisResult`. They render through a compatibility adapter and display a notice recommending re-analysis. No destructive migration is attempted because old fields cannot reconstruct independent reviewer conclusions or evidence.

### 2.2 Evidence

Replace free-form evidence strings with:

```ts
interface EvidenceItem {
  claim: string;
  source: string; // section, table, figure, page, or "not available"
}
```

`source` appears in the detail UI and `Critical Appraisal` Excel sheet, but not in the wide `Literature Matrix` sheet.

### 2.3 Seven-step result

Each step owns both narrative assessment and normalized fields required by the matrix.

1. `overview`
   - study type, research design, country, location, setting, population, headline findings, assessment, evidence.
2. `research_question`
   - question, hypothesis, explicit/inferred status, assessment, evidence.
3. `knowledge_gap`
   - known knowledge, unknown knowledge, importance, theoretical framework, conceptual framework, assessment, evidence.
4. `method_evaluation`
   - sample size, sample characteristics, sampling method, intervention, exposure, comparator, independent/dependent/mediator/moderator variables, data collection, analysis method, statistical techniques, design fit, sample-size appraisal, power appraisal, control appraisal, selection bias, measurement bias, other bias, raw-data availability, code availability, reproducibility, assessment, evidence.
5. `independent_conclusion`
   - reported key findings, effect size, confidence interval, p-value, other uncertainty, practical significance, independent conclusion, assessment, evidence.
6. `author_comparison`
   - author conclusion, agreement, disagreement, overclaiming, generalization beyond sample, causal overreach, assessment, evidence.
7. `alternatives_and_verdict`
   - strengths, limitations, confounders, alternative explanations, funding, conflicts, final verdict, evidence-strength rating, rating rationale, assessment, evidence.

Add a final `synthesis` projection generated only after the verdict:

- contribution to field
- theoretical implications
- practical implications
- future research
- keywords
- themes

This is not an eighth appraisal step. It is the structured matrix output produced after all seven steps.

### 2.4 Missing data policy

Use a localized explicit missing marker in generated prose. Structured scalar fields use a consistent `not_reported` semantic value normalized for UI/export. Arrays default to empty. Never convert missing values to guessed values.

The normalizer at the LLM boundary:

- verifies object/array/scalar shapes;
- sets `type` and `schema_version` itself;
- supplies safe missing markers for partial OpenRouter JSON;
- rejects non-object/invalid top-level output with a clear analysis error;
- never hides invalid JSON parsing failures.

## 3. LLM Workflow

Use one structured generation call per paper to control cost and latency. The prompt imposes staged reasoning:

1. Steps 1-4 inspect abstract/introduction/methods and available table/figure text.
2. Step 5 explicitly ignores author discussion/conclusion and derives a result-only conclusion.
3. Steps 6-7 then compare against author discussion/conclusion and issue a calibrated verdict.
4. Synthesis fields are populated last.

The schema descriptions specify the exact meaning of each field. The prompt prohibits invented sample sizes, statistics, source locations, data/code availability, conflicts, and image-only figure content.

Token output allowance remains large enough for the expanded schema. Provider fallback behavior and runtime OpenRouter selection are preserved.

## 4. Literature Matrix Projection

Create a shared module such as `services/analysisProjection.ts` containing:

- core column definitions grouped by Identification, Scope, Methods, Results/Appraisal, Synthesis;
- `toLiteratureMatrixRow(document, language)`;
- `toCriticalAppraisalRows(document, language)`;
- legacy adapter/type guards;
- list joining and missing-value formatting;
- workbook row construction independent of React.

Core columns cannot be removed in the matrix UI. Users may add custom columns. Custom column values are optional and generated separately from source document content; failure must not invalidate core matrix rows.

The standard matrix projection never invokes an LLM.

## 5. Excel Workbook

Create `services/excelExport.ts` as the only XLSX owner.

### Sheet 1: Literature Matrix

- One row per selected academic paper.
- Stable core column order and human-readable localized headers.
- User-added columns appended after core columns.
- Frozen header row, autofilter, wrapped cells, top vertical alignment, sensible widths.

### Sheet 2: Critical Appraisal

- Seven rows per paper.
- Columns: Study ID, Title, Phase, Step, Criterion, Assessment, Evidence Claim, Evidence Source.
- Multiple evidence items may create additional rows so evidence remains auditable.

### Sheet 3: Metadata

- source file, generation timestamp, schema version, analysis language, parser limitation, application name.

Individual export writes one paper. Matrix-screen export writes all currently selected/available V2 academic papers using the same workbook builder.

## 6. UI/UX

### Analysis detail

- Show three phase headers and seven numbered cards.
- Step cards show normalized fields before the assessment and evidence list.
- Step 7 uses a visually distinct verdict panel and evidence-strength badge.
- Provide a prominent `Export Literature Matrix` action.
- Legacy result displays a compatibility banner and old content without crashing.
- Policy detail keeps its existing visual treatment.

### Matrix screen

- Replace AI-generated default columns with core projection columns.
- Provide group toggles and horizontal scrolling to manage the wide table.
- Keep title/study identity sticky.
- Core columns are protected; custom columns are removable.
- Generate custom values only on explicit user action.
- Empty, loading and error states are bilingual and actionable.

Fix mojibake in files touched by this feature. Do not perform a repository-wide copy rewrite unrelated to the task.

## 7. Other Consumers

- Bibliometric summaries use design/method and independent findings from V2.
- Folder classification uses overview, question, gap, themes, and keywords.
- TXT and folder ZIP exports use shared projections and include all seven steps.
- BibTeX keeps bibliographic metadata only and handles missing year without hardcoding 2024.
- Policy results are guarded before accessing authors/citation fields.

## 8. Python Entrypoint

Add repository-root `insight_scholar.py`, standard-library only.

### `python insight_scholar.py run`

1. Resolve repository root from the script location.
2. Verify `node` and `npm`; report exact remediation if absent.
3. Run `npm install` only when required dependencies are missing.
4. Start `npm run dev -- --host 127.0.0.1`.
5. Poll the configured HTTP endpoint until ready.
6. Open the browser once.
7. Forward Ctrl+C/termination and cleanly stop the child process.

### `python insight_scholar.py test`

1. Verify/install npm dependencies as above.
2. Ensure Playwright Chromium is available; install it only when missing.
3. Run unit tests, production build, then Playwright browser tests.
4. Let Playwright configuration own the Vite test server lifecycle.
5. Store screenshots, traces and HTML report under `output/playwright/`.
6. Return non-zero if any stage fails and print artifact paths.

Use `argparse`; unknown modes produce help. Do not read or print API secrets.

## 9. Testing Strategy

### Unit tests

- V2 normalization of complete, partial, malformed and missing-field responses.
- Literature matrix projection maps every core column.
- No projected value is `[object Object]` or JavaScript `undefined`.
- Critical appraisal rows preserve evidence source locations.
- Legacy result guard/adapter is non-crashing.
- Excel workbook contains the three expected sheet names and stable headers.

### Playwright tests

Use deterministic E2E fixtures rather than paid/external LLM calls. A test-only mode seeds one V2 academic result and one legacy/policy result without exposing production secrets.

- Landing/upload view loads without console errors.
- Academic analysis detail shows 3 phases and 7 steps.
- Matrix page shows protected core columns and permits adding/removing a custom column.
- Individual Excel export action is enabled.
- Responsive smoke checks desktop and mobile navigation.
- Capture screenshot and trace on failure.

## 10. Compatibility, Rollback, and Risks

### Compatibility

- In-memory results disappear on refresh today; there is no database migration.
- Legacy types remain until all legacy render/export paths are covered.
- Policy analysis stays on its existing schema.

### Risks

- Wide schema may exceed weak-model output limits: keep prose bounded and normalize partial output.
- PDF text extraction loses figures/tables: expose limitation explicitly.
- Large wide tables can degrade UX: group visibility, sticky identity, wrapping, and export-first workflow mitigate it.
- Custom-field LLM calls can fail independently: preserve core rows and show per-field errors.

### Rollback points

- Domain types/prompt can be reverted independently before UI migration.
- Projection/export module is additive and can be disconnected without data loss.
- Python launcher and test setup are additive.
- Never revert unrelated existing OpenRouter changes.
