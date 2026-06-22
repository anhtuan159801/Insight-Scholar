# Frontend Type Safety

## Scenario: Structured LLM Analysis Contract

### 1. Scope / Trigger

Apply this contract whenever an LLM response changes, a new analysis field is added, or a consumer reads academic-analysis data. LLM JSON is untrusted external input even when a provider supports response schemas.

### 2. Signatures

```ts
// LLM boundary
normalizeAcademicAnalysis(value: unknown, language: Language): AnalysisResult
isAcademicV2(value: unknown): value is AnalysisResult

// Evidence
EvidenceItem { claim: string; source: string }
EvidenceStrength = 'STRONG' | 'MODERATE' | 'LIMITED' | 'VERY_LIMITED' | 'NOT_ENOUGH_INFORMATION'

// Deterministic projections (never call LLM)
toLiteratureMatrixRow(doc: Document, language: Language): LiteratureMatrixRow | null
toCriticalAppraisalRows(doc: Document, language: Language): CriticalAppraisalRow[]
buildWorkbook(rows: LiteratureMatrixRow[], appraisalRows: CriticalAppraisalRow[], metadata: Metadata): ExcelJS.Workbook
```

`AnalysisResult` uses `type: 'ACADEMIC'` and `schema_version: 2`. Policy and legacy academic results remain distinct union variants.

The `synthesis` projection (contribution, theoretical/practical implications, future research, keywords, themes) is not an 8th appraisal step. It is the structured matrix output produced deterministically from the 7-step analysis data, never via a secondary LLM call.

### 3. Contracts

- Provider boundary input: `unknown`, parsed from JSON.
- Normalized output: all scalar fields are strings, list fields are arrays, and evidence is `{ claim, source }[]`.
- Missing scalar information uses an explicit localized marker; never use guessed values.
- Evidence strength is one of `STRONG | MODERATE | LIMITED | VERY_LIMITED | NOT_ENOUGH_INFORMATION`.
- React state stores only normalized V2 results for new academic analyses.
- UI, Excel, TXT/ZIP, bibliometric and folder classification consume normalized types or shared projections.
- `E2E_MODE` is optional and must default to `false` in production builds.

### 4. Validation & Error Matrix

| Condition | Behavior |
| --- | --- |
| Top-level value is not an object | Throw a clear analysis error |
| Valid object omits a scalar | Insert explicit missing marker |
| Valid object omits an array | Use an empty array |
| Evidence is a legacy string | Normalize to `{ claim, source: missing }` |
| Evidence-strength code is unknown | Use `NOT_ENOUGH_INFORMATION` |
| Legacy academic result reaches V2 export | Exclude it and request re-analysis |
| Policy result reaches academic projection | Return `null` / empty rows |

### 5. Good / Base / Bad Cases

- Good: complete V2 JSON preserves evidence locations and projects every core matrix column.
- Base: partial provider JSON renders safely with explicit missing markers.
- Bad: a top-level array/string is rejected rather than cast to `AnalysisResult`.

### 6. Tests Required

- Unit: complete and partial normalization; invalid top-level response; evidence conversion.
- Unit: every core matrix field exists and is a scalar string.
- Unit: critical-appraisal rows preserve evidence source.
- E2E: seven steps render; export action is enabled; matrix works on desktop and mobile.
- Typecheck: `tsc --noEmit` must pass independently of Vite build.

### 7. Wrong vs Correct

#### Wrong

```ts
const result = JSON.parse(text) as AnalysisResult;
setDocuments(docs => update(docs, result));
```

#### Correct

```ts
const raw: unknown = JSON.parse(text);
const result = normalizeAcademicAnalysis(raw, language);
setDocuments(docs => update(docs, result));
```

The correct pattern gives one owner to the provider contract and prevents every UI/export consumer from inventing its own fallback behavior.
