# Specification Rationalization Summary

## What Changed

Replaced verbose, repetitive specification documents with focused, concise ones that clearly separate feature-set from implementation.

## Before and After

### Before
- **2,488 lines** across 7 files
- Heavy repetition (audit trails explained 4+ times)
- Implementation details mixed with principles
- VMPT "stack" presented as selling point
- No mention of LLMs or AI
- Federation barely mentioned
- Verbose corporate-speak throughout

### After
- **1,023 lines** across 4 core files (59% reduction)
- Each concept explained once
- Implementation separated into codebase documentation
- LLM strategy front and center
- Federation as key differentiator
- Direct, technical language

## New Structure

### Core Documents

1. **core-specification.md** (245 lines)
   - Domain model (Hazard, Risk Assessment, Mitigation, etc.)
   - Risk matrix (severity/likelihood → derived risk level)
   - Core principles (time-bound decisions, auditability, collaboration)
   - Who Turva is for and what it does
   - **NO implementation details**

2. **llm-strategy.md** (212 lines)
   - How LLMs change clinical safety management
   - Why Turva still matters (structure, audit, federation)
   - LLM as assistant, not replacement
   - Embedded safety expert LLM concept
   - Success metrics and open questions

3. **federation.md** (279 lines)
   - Downstream: manufacturer → deployers
   - Upstream: small orgs → national bodies
   - Lateral: peer learning
   - Public vs private projects
   - Forking, merging, and attribution

4. **architecture-principles.md** (287 lines)
   - Implementation-agnostic design principles
   - Safety, security, performance, scalability
   - No mention of specific technologies
   - Guides implementation, doesn't prescribe it

### Supporting Documents

- **index.md** - Updated navigation to new docs
- **copilot-instructions.md** - Streamlined, references new specs
- **roadmap.md** - Unchanged (implementation tracker, not spec)

### Archived

Moved to `specifications/archive/`:
- `spec-archive.md` (old 1026-line spec)
- `architecture/*.md` (6 implementation-heavy docs)

## Key Improvements

### 1. Removed Repetition

**Before**: Audit trails explained in:
- "Evidence and Audit Model" (90 lines)
- "Governance and Accountability" (40 lines)
- "Information Architecture" (30 lines)
- "Design Principles" (20 lines)

**After**: Explained once in core principles (5 lines)

### 2. Separated Feature from Implementation

**Before**: "FastAPI provides automatic API documentation with Pydantic validation..."

**After**: "API-first design with versioned, documented endpoints" (implementation details in codebase)

### 3. Added Strategic Vision

**Before**: No mention of how LLMs change the game

**After**: Entire document (llm-strategy.md) explaining:
- Why LLMs don't make Turva obsolete
- How LLMs augment CSOs
- Embedded safety expert LLM
- Success metrics

### 4. Elevated Federation

**Before**: Brief mention in one paragraph

**After**: Dedicated document with:
- Three federation models (downstream, upstream, lateral)
- Concrete workflows (forking, merging, contributing back)
- Governance (ownership, liability, attribution)
- Use cases

### 5. Removed "VMPT Stack" Marketing

**Before**: 610-line document explaining Version control + Markdown + Placeholders + Templates as if it's novel

**After**: Removed entirely. We use Git and Markdown. This is not a selling point in 2026.

### 6. Cut Corporate Verbiage

**Before**:
> "The clinical risk management file is a controlled repository containing all safety-related information for a healthcare IT system. The file exists because regulatory standards require traceability, auditability, and completeness of safety records..."

**After**:
> "Complete audit trail meeting DCB0129/DCB0160 requirements"

## What Was Preserved

### Critical Content Kept

- **Domain model definitions** (Hazard, Risk Assessment, Mitigation, Safety Case)
- **Risk matrix** (severity/likelihood scales with derived risk level)
- **Key principle**: Safety decisions are time-bound to system state
- **Role definitions** (Clinical Safety Officer, responsibilities)
- **Regulatory context** (DCB0129/DCB0160)
- **Governance model** (collaborative contribution with explicit accountability)

### Valuable Additions

- **LLM integration strategy** (completely new)
- **Federation models** (expanded from brief mention)
- **Clear differentiators** (what makes Turva different from "just use Claude")

## Line Count Comparison

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Core spec | 1,026 | 245 | -76% |
| Architecture | 1,462 | 287 | -80% |
| LLM/AI | 0 | 212 | new |
| Federation | ~20 | 279 | +1295% |
| **Total** | **2,488** | **1,023** | **-59%** |

## Impact on LLM Context Usage

When an LLM reads specifications to understand Turva:

**Before**: 2,488 lines = ~10,000 tokens (significant context usage)

**After**: 1,023 lines = ~4,000 tokens (60% less context)

**Benefit**: More context available for actual code, fewer tokens wasted on repetition

## Next Steps

1. ✅ Core specification rationalized
2. ✅ LLM strategy documented
3. ✅ Federation model defined
4. ✅ Architecture principles extracted
5. ⬜ Update roadmap.md to reflect LLM/federation priorities
6. ⬜ Create implementation README files in `api/` and `frontend/` directories
7. ⬜ Archive old docs properly (add README explaining why archived)

## Files Created

```
specifications/
├── core-specification.md          (new, 245 lines)
├── llm-strategy.md               (new, 212 lines)
├── federation.md                 (new, 279 lines)
├── architecture-principles.md    (new, 287 lines)
├── index.md                      (updated)
├── copilot-instructions.md       (streamlined)
├── roadmap.md                    (unchanged)
└── archive/
    ├── spec-archive.md           (moved from spec.md)
    └── architecture/
        ├── backend.md            (archived)
        ├── caddy.md              (archived)
        ├── documentation.md      (archived)
        ├── frontend.md           (archived)
        ├── index.md              (archived)
        └── vmpt.md               (archived)
```

## Files Removed

- `specifications/spec.md` → `specifications/archive/spec-archive.md`
- `specifications/architecture/*.md` → `specifications/archive/architecture/`

## Conclusion

Successfully reduced specification from 2,488 lines to 1,023 lines (59% reduction) while:

- Adding critical strategic content (LLM strategy, federation)
- Removing all repetition
- Separating feature-set from implementation
- Making documents focused and scannable
- Preserving all essential domain knowledge

The specifications are now suitable for:
- LLM consumption (clear, concise, minimal tokens)
- Team alignment (quick to read, easy to understand)
- Strategic planning (LLM pivot and federation clearly articulated)
