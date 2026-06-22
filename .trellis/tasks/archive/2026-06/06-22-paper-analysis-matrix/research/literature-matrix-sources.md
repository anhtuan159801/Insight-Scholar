# Research: Literature Matrix and Evidence Extraction

## Sources reviewed

1. Li T, Higgins JPT, Deeks JJ. *Chapter 5: Collecting data*. Cochrane Handbook for Systematic Reviews of Interventions, version 6.5 (2024; chapter updated October 2019).
   - URL: https://training.cochrane.org/handbook/current/chapter-05
   - Recommends designing data-collection forms around planned tables/figures and collecting sufficient, unambiguous, source-faithful structured data.
   - Organizes extraction around study methods and bias, participants/setting, interventions, outcomes, results, and other study information.
   - Emphasizes accuracy, completeness, transparency, future accessibility, and explicit handling of inconsistent/missing sources.

2. Goldman KD, Schmalz KJ. *The Matrix Method of Literature Reviews*. Health Promotion Practice. 2004;5(1):5-7.
   - DOI: https://doi.org/10.1177/1524839903258885
   - PubMed: https://pubmed.ncbi.nlm.nih.gov/14965430/
   - Indexed as a literature-review and data-collection method. Supports treating the matrix as a systematic organizational/extraction device rather than free-form notes.

3. Jonnalagadda SR, Goyal P, Huffman MD. *Automating data extraction in systematic reviews: a systematic review*. Systematic Reviews. 2015;4:78.
   - DOI: https://doi.org/10.1186/s13643-015-0066-7
   - Establishes automated extraction as a recognized research problem and reinforces the need for structured fields plus human-verifiable source evidence.

4. Schmidt L, et al. *Data extraction methods for systematic review (semi)automation: A living systematic review*. F1000Research. 2021.
   - DOI: https://doi.org/10.12688/f1000research.51117.1
   - Relevant to AI-assisted extraction: output must remain auditable and should not collapse source extraction and reviewer judgment into one opaque summary.

5. JBI. *Critical Appraisal Tools*.
   - URL: https://jbi.global/critical-appraisal-tools
   - Provides design-specific checklists rather than one universal score. This supports recording study design first and evaluating applicable criteria without pretending every criterion applies to every design.

6. GRADE Working Group. *GRADE home and criteria for use*.
   - URL: https://www.gradeworkinggroup.org/
   - GRADE's high/moderate/low/very-low categories concern certainty in a body of evidence for an outcome. Applying the GRADE label directly to one paper across arbitrary disciplines would be methodologically misleading.

## Design implications

- One analyzed study maps to one normalized row in the main literature matrix.
- The matrix must separate reported facts from AI/reviewer appraisal.
- Missing data uses an explicit marker, never an inferred value.
- A wide matrix is useful for comparison; a second long-form sheet is needed for auditability and evidence references.
- Standard fields should be deterministic projections of the seven-step analysis. Avoid a second LLM call to build the matrix.
- Use a neutral single-study appraisal label (for example strong/moderate/limited/very limited with an explicit rationale), not the name `GRADE`.
- Recommended workbook:
  - `Literature Matrix`: one row per paper; bibliographic, context, question/gap, method, findings, appraisal, synthesis fields.
  - `Critical Appraisal`: seven rows per paper; phase, step, assessment, subcriteria, evidence/source locations.
  - Optional `Metadata`: generation date, source filename, analysis version, extraction limitations.

## Proposed main matrix columns

### Identification

- Study ID / source filename
- Title
- Authors
- Year
- APA citation
- DOI

### Scope and rationale

- Study type
- Research design
- Country
- Study location
- Study setting/context
- Population
- Research question
- Hypothesis
- Question status: explicit/inferred
- Knowledge gap
- Importance/relevance
- Theoretical framework when reported
- Conceptual framework when reported

### Methods

- Sample size
- Sample characteristics
- Sampling method
- Intervention
- Exposure
- Comparator/control group
- Independent variables
- Dependent variables
- Mediators
- Moderators
- Data collection
- Data analysis method
- Statistical techniques
- Design-question fit
- Sample-size appraisal
- Statistical-power appraisal
- Control-group appraisal
- Selection bias
- Measurement bias
- Other risk of bias
- Raw-data availability
- Analysis-code availability
- Reproducibility appraisal

### Results and appraisal

- Key reported findings
- Effect size when reported
- Confidence interval when reported
- P-value when reported
- Other uncertainty when reported
- Independent conclusion from data
- Author conclusion
- Agreement with author
- Disagreement with author
- Overclaiming
- Generalization beyond sample
- Causal overreach
- Strengths
- Limitations
- Confounders
- Alternative explanations
- Funding source
- Conflicts of interest
- Final evidence verdict
- Evidence-strength rating with rationale

### Synthesis

- Contribution to the field
- Theoretical implications
- Practical implications
- Future research
- Keywords
- Themes

Evidence/source locations remain in the long-form `Critical Appraisal` sheet and are deliberately excluded from the wide main matrix.

## Caveat

The current parser extracts PDF/DOCX text only. It cannot reliably inspect image-only figures or preserve table structure. The matrix must expose this limitation and label unavailable figure/table evidence rather than fabricating it.
