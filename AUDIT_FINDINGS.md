# UX Documentation Audit — Executive Summary

**Date:** January 15, 2026  
**Scope:** Comprehensive review of `/docs/03-ux/` and `/docs/02-brand/`  
**Status:** 12 findings identified (3 HIGH, 6 MEDIUM, 3 LOW)

---

## Critical Findings (Must Fix Before Build)

### 🔴 A1: STAGGER TIMING INCONSISTENCY — Multiple Values
**Severity:** HIGH  
**Impact:** Implementation ambiguity across animations

The documentation specifies **50ms, 75ms, and 80ms** for stagger timing with no clear context:
- **50ms:** Within-app components (quick-reply chips, attachments)
- **75ms:** Marketing page sections (cards, feature blocks)
- **80ms:** Hero section cards (marketing-pages.md line 78 — appears to be a typo)

**Files:** micro-interactions.md, marketing-pages.md, page-specifications.md, component-library.md, mobile-patterns.md  
**Fix:** Consolidate to two canonical values (50ms for app, 75ms for marketing). Flag the 80ms as incorrect.

---

### 🔴 B1: BROKEN SECTION REFERENCE
**Severity:** HIGH  
**Impact:** Developer confusion about animation specifications

**File:** component-library.md, line 718  
**Issue:** References "micro-interactions.md §4.2 'Auto-Save Indicator'" but §4.2 is "Letter Preview" — Auto-Save Indicator is a subsection.

**Fix:** Change to: "see `micro-interactions.md` §4.2 "Letter Preview" (Auto-Save Indicator subsection)"

---

### 🟠 C2: ADDRESS VALIDATION CONTRADICTION
**Severity:** MEDIUM  
**Impact:** Unclear behavior for edge cases

**Conflict:**
- `user-flows.md` line 119: "Swiss PLZ format validation (soft — warnings shown, not blocking)"
- `page-specifications.md` line 998: "This is a hard block — the system cannot proceed with a non-Swiss recipient"

**Root Cause:** These describe different validation tiers, not clearly separated.

**Fix:** Define three tiers:
1. Non-Swiss addresses = hard block
2. Ambiguous Swiss addresses = warning + confirmation
3. PLZ mismatch = soft warning (overridable)

---

## Major Issues (Should Fix Before Release)

### 🟠 A3: CONFETTI DURATION MISMATCH
**Severity:** MEDIUM  
**Impact:** Animation timing inconsistency on confirmation page

- page-specifications.md §9 (line 1447): **1.5 seconds**
- micro-interactions.md §9 (line 1005): **800ms**

**Question:** Are these two separate animations (checkmark + celebration) or one? Unclear.

**Fix:** Clarify which is which, reconcile durations.

---

### 🟠 C1: SESSION EXPIRY — 72H VS CONFIGURABLE
**Severity:** MEDIUM  
**Impact:** Inconsistent configuration guidance

- `user-flows.md` line 174: "within 72h" (hardcoded fact)
- `page-specifications.md` line 558: "{configuredSessionRetentionLabel}" (configurable placeholder)

**Fix:** Choose one model and update both docs. If configurable, remove hardcoded 72h from user-flows.

---

### 🟠 B2: UNDEFINED CONFIGURATION VARIABLE
**Severity:** MEDIUM  
**Impact:** Developers don't know what to display

**Issue:** `{configuredSessionRetentionLabel}` used in page-specs but never defined.

**Files:** page-specifications.md lines 558, 1587  
**Fix:** Define the variable mapping (e.g., "= '72 hours'") with a cross-reference to open-decisions.md.

---

### 🟠 C3: TWO CONFETTI ANIMATIONS OR ONE?
**Severity:** MEDIUM  
**Impact:** Unclear animation scope

The documentation describes **checkmark confetti** (8 particles) and **full-celebration confetti** (30–40 particles, 800ms) but it's unclear if both fire on the confirmation page or just one.

**Fix:** Explicitly state the sequence: "Confirmation page has two confetti animations: (1) checkmark pulse at 0.4s, (2) full-page celebration at X seconds."

---

### 🟠 A2: CONFETTI PARTICLE COUNT VAGUENESS
**Severity:** MEDIUM  
**Impact:** Implementation uncertainty

- page-specifications.md: "~30 particles"
- micro-interactions.md: "30–40 particles"

**Fix:** Standardize to one value. If range is needed, specify device-based variation (e.g., "30 on mobile, 40 on desktop").

---

## Minor Issues (Nice to Have)

### 🟡 A4: MARKETING ANIMATION TIMING
**Severity:** LOW  
- marketing-pages.md line 76: **400ms**
- micro-interactions.md line 105: **300ms**

**Fix:** Verify if intentional; likely should be 300ms.

### 🟡 B3: VAGUE SECTION REFERENCE
**Severity:** LOW  
**File:** user-flows.md line 96  
**Fix:** Improve reference format from "§4.2 'First Draft Reveal Choreography'" to "§4.2 'Letter Preview' → 'First Draft Reveal Choreography'"

### 🟡 D1: MISSING COMPONENT DOCUMENTATION
**Severity:** LOW  
**Issue:** `<ConfirmationCard>` defined in page-specs but not in component-library.md

**Fix:** Add to component-library.md Part 2 with full spec.

### 🟡 D2: SPARSE MOBILE DOCUMENTATION
**Severity:** MEDIUM  
**Issue:** Mobile-specific behaviors (FAB glow, confirmation layout, session banner on mobile) not fully documented in mobile-patterns.md

**Fix:** Add sections for mobile confirmation page, session expiry warning, FAB animations.

---

## Action Items

| Priority | Finding | Owner | Deadline |
|---|---|---|---|
| P0 | Fix A1 (stagger timing) | Design/Frontend Lead | Before build sprint |
| P0 | Fix B1 (section reference) | Docs Maintainer | Before build sprint |
| P0 | Fix C2 (address validation) | Product Designer | Before build sprint |
| P1 | Fix A3 (confetti duration) | Designer | Before QA |
| P1 | Fix C1 (session expiry) | Product Manager | Before QA |
| P1 | Fix B2 (config variable) | Frontend Lead | Before QA |
| P2 | Fix A2, A4, B3 | Docs Maintainer | Polish pass |
| P2 | Add D1, D2 | Design/Frontend | Polish pass |

---

## Files to Update

1. **micro-interactions.md**
   - Add timing reference table (§2)
   - Reconcile confetti animations (§9)

2. **marketing-pages.md**
   - Change 80ms to 75ms (line 78)
   - Verify 400ms timing (line 76)

3. **page-specifications.md**
   - Clarify address validation tiers (§6)
   - Define session expiry (§5 top)
   - Clarify confetti animation scope (§9)

4. **component-library.md**
   - Fix section reference (line 718)
   - Add `<ConfirmationCard>` spec

5. **mobile-patterns.md**
   - Add mobile confirmation section
   - Add session expiry banner details
   - Add FAB animation details

6. **user-flows.md**
   - Update session expiry language

---

## Review Checklist

Before merging any pull request that touches animation, timing, or validation:

- [ ] Stagger timing uses only 50ms (within-app) or 75ms (marketing)
- [ ] All section references (§X.Y) point to actual section numbers
- [ ] Address validation describes all three tiers (hard block, warning+confirm, soft warning)
- [ ] Session expiry uses consistent terminology (72h or configurable, not both)
- [ ] Confetti animations clearly state particle count and duration
- [ ] Mobile patterns document all mobile-specific UI behavior

---

*This is the primary audit record. No separate detailed file exists.*
