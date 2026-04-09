# Business Model & Go-to-Market

**Product:** Sendly  
**Last updated:** 2026-03-18  
**Status:** Directional — MVP pricing is locked; launch validation and GTM execution remain active business work  
**See also:** [Product Scope](product-scope.md) · [Roadmap](roadmap.md) · [Competitive Landscape](competitive-landscape.md) · [Open Decisions](../08-guardrails/open-decisions.md)

---

## 1. Positioning

Sendly launches with a **brand-first, trust-first homepage** targeted at Swiss consumers who need to send formal letters occasionally — people who know they need to write something but haven't started.

Marketing channels:
- Broad brand homepage
- **Use-case landing pages** for high-intent searches (e.g., "cancel gym membership Switzerland", "notice to landlord Switzerland")
- Calm, trustworthy Swiss positioning — privacy, honesty, simplicity
- SEO content strategy modelled on the SuperPost playbook and extended with AI-specific angles
- Direct validation channels before scale: beta cohort recruitment, interview-driven landing pages, and limited high-intent search acquisition

**Launch rule:** do not depend on SEO alone for initial traction. SEO is a compounding channel, not a day-one proof of demand.

See [SEO Strategy](../02-brand/seo-strategy.md) for content and keyword planning.

---

## 2. Initial GTM Wedge

**Best narrow operational wedge for early validation:**  
High-intent cancellation letters for consumers who know they need to send something serious but have not started writing yet.

This works because:
- High-intent users; clear urgency
- Clear drafting pain: users often know the goal before they know the wording
- Registered mail can strengthen the value story where provider support is ready, but it must not be the only launch shape
- Clear before/after: "I finally sent it in 3 minutes"
- SEO-rich content opportunity (cancellations are frequently searched)

**Launch focus rules:**
- The first launch story should emphasize one wedge, not six equal-priority use cases
- If provider onboarding delays registered mail, launch validation must still work with standard delivery
- If launch must narrow to one locale, the preferred pilot locale is **fr-CH**

**Expansion path (in order):**

| Phase | Use Cases |
|---|---|
| Pilot | Cancellation letters in the enabled launch locale(s) |
| Launch | Cancellations, then complaints and payment reminders |
| Early growth | Landlord and tenant notices |
| Maturity | Insurance, general formal correspondence |

---

## 3. Revenue Model

| Stream | Description |
|---|---|
| **Per-letter price** | Bundled fee covering drafting, PDF generation, provider submission, and operational margin |
| **Operational cost dependency** | Viability depends on provider pricing plus support/reconciliation costs, not provider fees alone |
| **Future: subscription** | Repeat or business use; not MVP scope |

### Pricing Considerations

- Reference point: CHF 2.50 (SuperPost, standard letter; verify before decisions)
- Sendly can justify a modest premium on AI drafting value
- Must not price above the "just do it yourself" threshold
- Transparent pricing at the surface level (before checkout) reduces abandonment
- The configured markup and resulting customer totals still require validation against real provider
  commercial terms before public launch

> **Locked MVP launch pricing:** provider quote plus a configurable Sendly markup.
>
> This is the locked product decision for initial public release. Markup values must be config-backed,
> and checkout totals must come from a real provider quote rather than hardcoded prices.
> See [Pricing Structure](../04-product/pricing-structure.md).

### Commercial gating rules

Before public launch:

- provider economics plus support/reconciliation overhead must be validated against the locked launch prices
- willingness to pay must be tested with real prospective users or beta users
- public trust claims and social proof must be factual, not aspirational
- launch acquisition must include at least one channel besides SEO

---

## 4. Key Early KPIs

These metrics measure whether the funnel and product are working:

| Metric | What It Tells You |
|---|---|
| Landing page → draft-start conversion | Whether users trust the product enough to begin |
| Draft-start → payment conversion | Whether the drafting flow delivers enough value to pay |
| Payment → successful dispatch conversion | Whether the dispatch flow is reliable |
| Refund rate | Whether dispatch failures or user regret are high |
| Support contact rate per dispatch | Whether something is confusing or broken post-send |
| Repeat-use rate | Whether users return; signals brand loyalty |
| Attachment use rate | Whether attachment scope is correctly sized |
| Registered vs standard mail split | Whether registered mail is driving premium volume |
| Launch locale conversion split | Whether each enabled locale actually converts well enough to justify ongoing support |

---

## 5. Business Model Risks

### The Core Risk

> The differentiation is **not** "we can send mail."  
> The differentiation is: fast mobile workflow, guided drafting, confidence and trust.

Pure B2C economics may stay thin without strong conversion, brand, or SEO. Per-letter margin in a
provider-submission product is structurally narrow. The product must be strong enough on AI drafting
quality that users pay the premium without hesitation.

### Risk Table

| Risk | Mitigation |
|---|---|
| SuperPost adds AI drafting | Build drafting quality that cannot be replicated quickly; invest in conversation quality and language depth |
| Price pressure from CHF 2.50 floor | Focus on use-case value ("sent in 3 minutes") not feature comparison |
| Low category awareness | Use-case SEO content strategy |
| Trust gap for AI-generated legal language | Make human review an unhurried, clear step; never auto-submit |
| Thin margins without scale or subscription | Layer subscription for repeat use in v2 |
| SEO takes longer than expected | Use beta cohorts, interviews, and limited intent capture channels before relying on organic search |
| Language breadth outruns QA capacity | Enable locales only after locale-specific review of drafting quality, copy, and support readiness |

See [Competitive Landscape](competitive-landscape.md) for the full competitive risk analysis.

---

## 6. Lessons from Competitors

### From SuperPost
- No-registration checkout dramatically reduces friction → confirms guest-first approach
- Use-case SEO pages (cancellation letters, notice letters) are a proven organic acquisition strategy
- Coupon codes may be useful later, but they are explicitly out of scope for launch
- QR receipt artifact gives users a verification token; consider equivalent

### From DocuPost
- "No post office" framing works — tell users what they *don't* have to do
- Social proof is critical — named testimonials build trust before checkout; we need a social proof strategy from day one
- Transparent surface pricing reduces abandonment

### From Pingen
- Real-time tracking UI sets expectations correctly — show what you actually know, step by step
- Design internal APIs with future B2B integration in mind from day one

See [Competitive Landscape](competitive-landscape.md) for full profiles.
