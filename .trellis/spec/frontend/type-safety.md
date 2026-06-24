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

## Scenario: Unified LLM Provider Proxy

### 1. Scope / Trigger

Apply this contract whenever the app changes LLM provider wiring, model selection, build-time env injection, or request/response parsing for document analysis. The provider boundary is external and untrusted even when the proxy is OpenAI-compatible.

### 2. Signatures

```ts
setUnifiedModel(model: string): void
generateContentWithFallback(request: {
  model: string;
  prompt: string;
  schema?: unknown;
  mimeType?: string;
  unifiedModel?: string;
}): Promise<string>
```

Runtime analysis functions call the shared LLM service only. UI, export, and projection code must not call provider endpoints directly.

### 3. Contracts

- Required env key: `UNIFIED_API_KEY` or `FREELLMAPI_API_KEY`.
- Supported aliases: `UNIFIED_API_KEYS`, `FREELLMAPI_API_KEYS`, numbered `UNIFIED_API_KEY_#` / `FREELLMAPI_API_KEY_#`, and `OPENAI_API_KEY`.
- Base URL defaults to `https://freellmapi-vercel.onrender.com/v1`; the service appends `/chat/completions`.
- Model defaults to `anthropic/claude-3.5-sonnet`; UI/env can override via `UNIFIED_MODEL` or `FREELLMAPI_MODEL`.
- Requests use OpenAI-compatible chat messages and request JSON-only output. Schema is passed as prompt guidance; it is not trusted as enforcement.
- Responses are read from `choices[0].message.content`, then parsed and normalized by the existing analysis boundary.

### 4. Validation & Error Matrix

| Condition | Behavior |
| --- | --- |
| No unified key configured | Throw a clear provider configuration error |
| HTTP response is not OK | Include provider status and response body in the thrown error |
| Provider returns empty content | Throw an empty-response error |
| Provider JSON is malformed | Surface parse failure and keep normalization as the single analysis contract owner |
| Quota/server error with multiple keys | Rotate to the next configured key |

### 5. Good / Base / Bad Cases

- Good: `.env.local` sets `UNIFIED_API_KEY`, optional `UNIFIED_MODEL`, and all analysis calls go through `llmService`.
- Base: `FREELLMAPI_API_KEY` alias is used with the default base URL and model.
- Bad: committing a real key, calling provider fetches from components, or reintroducing provider-specific SDK parsing in UI code.

### 6. Tests Required

- Typecheck: service signatures and env access compile under Vite.
- Unit: normalization tests still cover provider JSON as `unknown`.
- Build: Vite production build proves build-time env replacement is valid.
- E2E: fixture mode renders analysis without consuming real API quota.

### 7. Wrong vs Correct

#### Wrong

```ts
const response = await fetch(providerUrl, { body: JSON.stringify(prompt) });
setDocuments(docs => update(docs, JSON.parse(await response.text())));
```

#### Correct

```ts
const text = await generateContentWithFallback({ model: DEFAULT_UNIFIED_MODEL, prompt, schema });
const result = normalizeAcademicAnalysis(JSON.parse(text), language);
```
