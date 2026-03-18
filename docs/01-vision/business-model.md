# Business Model & Go-to-Market

**Product:** Swiss Mail  
**Last updated:** 2026-03-17  
**Status:** Directional — MVP pricing is locked; GTM and growth assumptions remain directional  
**See also:** [Product Scope](product-scope.md) · [Roadmap](roadmap.md) · [Competitive Landscape](competitive-landscape.md) · [Open Decisions](../08-guardrails/open-decisions.md)

---

## 1. Positioning

Swiss Mail launches with a **brand-first, trust-first homepage** targeted at Swiss consumers who need to send formal letters occasionally — people who know they need to write something but haven't started.

Marketing channels:
- Broad brand homepage
- **Use-case landing pages** for high-intent searches (e.g., "cancel gym membership Switzerland", "notice to landlord Switzerland")
- Calm, trustworthy Swiss positioning — privacy, honesty, simplicity
- SEO content strategy modelled on the SuperPost playbook and extended with AI-specific angles

See [SEO Strategy](../02-brand/seo-strategy.md) for content and keyword planning.

---

## 2. Initial GTM Wedge

**Best narrow operational wedge for early validation:**  
Registered cancellation letters sent from a phone.

This works because:
- High-intent users; clear urgency
- Registered mail is a verifiable, higher-value action
- Clear before/after: "I finally sent it in 3 minutes"
- SEO-rich content opportunity (cancellations are frequently searched)

**Expansion path (in order):**

| Phase | Use Cases |
|---|---|
| Launch | Registered cancellations (gym, telecom, subscriptions) |
| Early growth | Complaints, payment reminders |
| Growth | Landlord and tenant notices |
| Maturity | Insurance, general formal correspondence |

---

## 3. Revenue Model

| Stream | Description |
|---|---|
| **Per-letter margin** | Service fee on top of postal cost — primary MVP revenue |
| **Postal pass-through** | Postal fees shown transparently to the user; no hidden markup on postal cost |
| **Future: subscription** | Repeat or business use; not MVP scope |

### Pricing Considerations

- Reference point: CHF 2.50 (SuperPost, standard letter; verify before decisions)
- Swiss Mail can justify a modest premium on AI drafting value
- Must not price above the "just do it yourself" threshold
- Transparent pricing at the surface level (before checkout) reduces abandonment

> MVP launch pricing is locked at CHF 4.90 standard and CHF 8.90 registered. Keep these values
> config-backed in implementation and update this doc if the business revises pricing later. See
> [Pricing Structure](../04-product/pricing-structure.md).

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

---

## 5. Business Model Risks

### The Core Risk

> The differentiation is **not** "we can send mail."  
> The differentiation is: fast mobile workflow, guided drafting, confidence and trust.

Pure B2C economics may stay thin without strong conversion, brand, or SEO. Per-letter margin on physical dispatch is structurally narrow. The product must be strong enough on AI drafting quality that users pay the premium without hesitation.

### Risk Table

| Risk | Mitigation |
|---|---|
| SuperPost adds AI drafting | Build drafting quality that cannot be replicated quickly; invest in conversation quality and language depth |
| Price pressure from CHF 2.50 floor | Focus on use-case value ("sent in 3 minutes") not feature comparison |
| Low category awareness | Use-case SEO content strategy |
| Trust gap for AI-generated legal language | Make human review an unhurried, clear step; never auto-submit |
| Thin margins without scale or subscription | Layer subscription for repeat use in v2 |

See [Competitive Landscape](competitive-landscape.md) for the full competitive risk analysis.

---

## 6. Lessons from Competitors

### From SuperPost
- No-registration checkout dramatically reduces friction → confirms guest-first approach
- Use-case SEO pages (cancellation letters, notice letters) are a proven organic acquisition strategy
- Coupon codes are a low-cost acquisition tool worth building at launch
- QR receipt artifact gives users a verification token; consider equivalent

### From DocuPost
- "No post office" framing works — tell users what they *don't* have to do
- Social proof is critical — named testimonials build trust before checkout; we need a social proof strategy from day one
- Transparent surface pricing reduces abandonment

### From Pingen
- Real-time tracking UI sets expectations correctly — show what you actually know, step by step
- Design internal APIs with future B2B integration in mind from day one

See [Competitive Landscape](competitive-landscape.md) for full profiles.
