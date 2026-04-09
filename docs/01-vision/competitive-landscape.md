# Competitive Landscape — Swiss Online Letter Sending

**Product:** Sendly  
**Last updated:** 2026-03-15  
**Status:** Living document — update when competitor features change or new entrants appear

---

## 1. Market Overview

The Swiss online letter-sending market is small but fragmented. No single player owns it, and most existing solutions were designed with a specific customer archetype in mind — not the general consumer who needs to occasionally send a formal letter from their phone.

**Market segments visible today:**

| Segment | Representative Players | Customer |
|---|---|---|
| Consumer one-off hybrid mail | SuperPost (Pingen GmbH) | Individuals, light business |
| B2B/API hybrid mail | Pingen (pingen.ch) | Companies, developers |
| US-style digital mailhouse | DocuPost | US SMBs, healthcare, legal |
| Institutional hybrid delivery | Swiss Post ePost | Enterprise, government, ERP users |

**Key observations:**
- The consumer segment in Switzerland is currently served primarily by SuperPost, which is a capable but limited product — it handles the dispatch workflow well but does not help users *write* the letter.
- The B2B/API tier (Pingen, ePost) is well-served and not our target for MVP.
- No competitor offers meaningful AI-assisted drafting. Users are expected to arrive with a letter already written.
- Mobile experience is an afterthought for all players except SuperPost, which is optimized for mobile uploading — but not mobile *composing*.
- Trust and data privacy are underexploited as differentiators despite being central Swiss values.

**Market opportunity:**  
There is a clear gap for a product that meets users *before* they have a document — at the moment when they know they need to write something formal but don't know how to start.

---

## 2. Competitor Profiles

### 2.1 SuperPost (superpost.com) — by Pingen GmbH

Consumer hybrid mail for Switzerland. Two paths: upload a PDF or use a basic letter generator (template-driven, not AI). Step wizard flow, no registration required, CHF 2.50 for 1–2 pages, coupon support. Font and stationery customization. QR digital receipt. Strong German SEO with use-case landing pages.

**Key strengths:** Clean no-friction consumer flow, Swiss-native trust, no-account model.  
**Key weaknesses:** No AI drafting, no voice input, limited beyond German, letter generator is template-filling not intelligent.

---

### 2.2 Pingen (pingen.ch)

B2B hybrid mail platform for companies and developers. REST API, real-time tracking, analytics, Swiss Post and DHL as carriers. Volume pricing, international support. SuperPost runs on Pingen infrastructure.

**Key strengths:** API-first, reliable tracking, multi-carrier.  
**Key weaknesses:** Not consumer-facing, no drafting, requires account, no mobile one-off use.

---

### 2.3 DocuPost (docupost.com)

US digital mailhouse. Letters, postcards, checks via web interface. Account balance/prepay model, bulk/mail merge, USPS tracking, HIPAA compliant. 80K+ customers, from $0.95.

**Key strengths:** Strong social proof, transparent pricing, niche verticals (legal, healthcare).  
**Key weaknesses:** US-only, no AI drafting, not mobile-first. Not a direct competitor, but useful reference for pricing transparency and social proof strategy.

---

### 2.4 Swiss Post ePost (epost.ch)

Institutional hybrid mail (Swiss Post subsidiary). SmartSend for business correspondence at scale, ERP integration, hybrid physical+digital delivery. Enterprise/volume pricing.

**Key strengths:** Institutional trust, Swiss government backing, data sovereignty.  
**Key weaknesses:** Consumer UX is poor, no drafting assistance, not guest-friendly, not mobile-optimized.

---

## 3. Feature Comparison Matrix

| Feature | Sendly | SuperPost | Pingen | DocuPost | ePost |
|---|:---:|:---:|:---:|:---:|:---:|
| **AI letter drafting** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Voice/dictation input** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Guided conversation UI** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **No account required** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Mobile-first UX** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Swiss market focus** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **4 Swiss languages (AI)** | ✅ | Partial | Partial | ❌ | ✅ |
| **Honest status comms** | ✅ | Partial | ✅ | Partial | Partial |
| **Swiss data privacy** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **PDF upload path** | Planned | ✅ | ✅ | ✅ | ✅ |
| **Real-time tracking** | Planned but provider-dependent | ❌ | ✅ | ✅ (USPS) | ✅ |
| **Registered mail** | Planned | ❌ | ✅ | ✅ | ✅ |
| **B2B / API access** | Future | ❌ | ✅ | ✅ | ✅ |
| **Bulk/mail merge** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Social proof / testimonials** | None yet | Moderate | Moderate | Strong | Institutional |
| **Coupon/discount system** | Not a launch basis | ✅ | ❌ | ❌ | ❌ |
| **QR digital receipt** | Not a launch basis | ✅ | ❌ | ❌ | Partial |
| **Consumer pricing visible** | Launch pricing pending approval | ✅ (CHF 2.50) | ❌ | ✅ ($0.95+) | ❌ |

> **Legend:** ✅ Yes / ❌ No / Partial / product-side note = current planning posture, not an implementation instruction

---

## 4. Gap Analysis

### Where competitors fall short

**1. No one helps users write the letter.**  
Every competitor — without exception — assumes the user arrives with a complete, ready-to-send document. The moment a user doesn't know how to phrase a formal cancellation, termination, or complaint, all current tools fail them. This is the largest unserved moment in the user journey.

**2. Mobile composition is absent.**  
SuperPost is mobile-optimized for *uploading* a document. None of the Swiss players are designed for composing a letter on a phone. Users who want to send something formal from their commute have no good option.

**3. Language support is shallow.**  
Swiss formal correspondence spans de-CH, fr-CH, it-CH, and en-CH. SuperPost leans heavily on German SEO content. No competitor offers AI-assisted drafting across all four Swiss languages.

**4. Voice input doesn't exist in this category.**  
Speaking a letter into existence and having an AI turn it into formal prose is not offered by any competitor. For phone users, this removes the biggest friction barrier.

**5. Trust communication is inconsistent.**  
Several players use language like "sent" or "delivered" when the actual status is "handed to postal carrier." ePost and Pingen (B2B) are more careful, but consumer-facing products are vague. There is an opportunity to build brand trust through radical honesty about what is actually known at each status step.

**6. No use-case-aware drafting.**  
SuperPost has use-case landing pages (cancellations, notices) but no actual guided experience. Users land on a page that says "write a cancellation letter" and are then dropped into a generic form.

---

## 5. Our Positioning

### How we think about this product

**Sendly is not a mail service. It is a premium formal-letter preparation tool with integrated dispatch.**

SuperPost is a dispatch service. You bring your document — they mail it. Sendly enters the
journey *before* the document exists. It helps users produce a properly structured, correctly toned,
professionally formatted letter, then submits the final PDF and metadata through the postal-provider
path. These are different products solving different problems.

### Where Sendly wins

**Primary position: The only product that helps you write a professional letter.**  
Sendly enters the user journey before any competitor does — when the user knows they need to write something formal but hasn't started. This is not a marginal improvement; it is a completely different product category.

**What the product actually delivers (in priority order):**
1. High-quality letter structure appropriate for each use case
2. Tone control — formal, neutral, or firm
3. Strong subject line generation
4. Real-time preview that matches what will be printed
5. Precise zone editing — change any part of the letter
6. Mobile review flow that builds confidence
7. Dispatch as the natural conclusion, not the product itself

**Secondary position: Swiss-native, mobile-native, honest.**  
- Swiss data privacy as an earned claim, not a badge
- Mobile-first with voice input as a first-class feature
- Status communication that reflects actual dispatch reality (not fake "delivered" states)
- Four Swiss languages, genuinely supported

**Target user archetype (MVP):**  
Someone who needs to send a formal Swiss letter where the stakes matter — a cancellation, a complaint, a landlord dispute, an insurance claim — and doesn't know how to write it properly. They speak German, French, Italian, or English. They are not a developer, not a bulk mailer, and not looking for an ERP integration.

**The high-stakes use cases that justify the premium:**
- Lease cancellations and tenancy disputes
- Insurance cancellations and claims
- Contract terminations with consequences
- Formal complaints that need to be taken seriously
- Demand letters and payment reminders
- Official correspondence with authorities

These are situations where people *want* the letter to be right. They will pay for the confidence that it is.

**Pricing positioning — quality premium, not price competition:**  
Competing dispatch tools set a lower reference point for send-only workflows. We do not compete on price alone. Sendly justifies a premium only if it delivers a *finished professional letter*, not just a send button. The public amount must stay below the "I'll just do it myself" threshold, but the justification is the quality of the result and the ease of producing it, not being cheaper than anyone else. See [Pricing Structure](../04-product/pricing-structure.md) for the canonical checkout truth.

**The business question is not "can we mail cheaper?" It is: "will enough users pay for a clearly more professional and reassuring result?"** Our conviction is yes — especially for the high-stakes use cases above.

### Where Sendly does not compete (MVP)

- Generic "send any letter online" → SuperPost is fine for this
- Bulk/mail merge senders → Pingen is the better tool
- API integrations → Pingen / ePost are appropriate
- US market → DocuPost owns this
- Heavy business correspondence automation → not our MVP
- Price-sensitive users who already have their document → SuperPost at CHF 2.50

---

## 6. Lessons Learned from Competitors

### From SuperPost
- **No-registration checkout** dramatically reduces friction — confirm our guest-first approach
- **Step wizard** (Content → Recipient → Attachment → Summary → Payment) is proven UX; adapt for our flow with an AI drafting step added before recipient capture
- **QR code for digital receipt** — users appreciate a verification artifact; consider equivalent
- **Use-case SEO pages** (cancellation letters, notice letters, etc.) are a proven organic acquisition strategy; build these as part of our content plan
- **Coupon codes** are a low-cost acquisition tool worth building at launch

### From DocuPost
- **"No post office"** framing works — tell users what they don't have to do
- **Social proof is critical** — 80K customers and named industry testimonials build trust before checkout; we need a social proof strategy from day one
- **Transparent pricing** at the surface level (before checkout) reduces abandonment
- **Balance/prepay** reduces per-transaction friction for repeat users — worth evaluating for v2

### From Pingen
- **Real-time tracking UI** sets user expectation correctly — show what you actually know, step by step
- **Analytics for B2B users** — relevant for v2, not MVP
- **API-first thinking** — even in MVP, design internal APIs with future B2B integration in mind

### From Swiss Post ePost
- **Swiss data privacy as a headline feature** — not a footnote; position it prominently in trust blocks
- **Hybrid delivery concept** (physical and digital) — worth understanding as a future feature; if recipient has a digital address, a copy could be delivered digitally too
- **Universal service obligation** — Swiss Post has regulatory reason to keep physical mail alive; our dispatch model is stable long-term

---

## 7. Competitive Risks

**1. SuperPost adds AI drafting.**  
Pingen GmbH has the infrastructure, the Swiss market position, and the consumer brand. If they add even a basic AI assistant to SuperPost, our primary differentiator narrows. Mitigation: build the quality of AI assistance to a level that cannot be replicated quickly; invest in conversation quality, language fidelity, and use-case depth.

**2. Swiss Post ePost pivots to consumer.**  
Swiss Post has the brand trust and the postal monopoly. If ePost improves its consumer UX and adds guided drafting, we face a significant credibility challenge. Mitigation: move fast on consumer experience; establish brand before ePost moves.

**3. International entrants (AI-native).**  
A well-funded AI-first product (e.g., from the US or Germany) could target Switzerland if the market proves valuable. They would have AI quality but lack Swiss postal integration and language nuance. Mitigation: Swiss-specific depth (languages, legal letter formats, postal integration) is our moat.

**4. Price pressure.**  
At CHF 2.50, SuperPost is already close to the minimum viable margin for physical dispatch. If we price at a premium and SuperPost adds AI features, we may struggle to justify the delta. Mitigation: focus on use-case value ("you got the letter sent in 3 minutes") rather than feature comparison.

**5. Low awareness of category.**  
Many users don't know online letter sending exists. Discovery and education are challenges. Mitigation: use-case SEO content strategy (take the SuperPost playbook and extend it with AI-specific angles).

**6. Trust in AI output.**  
Users sending formal legal letters may not trust AI-generated text without review. If the AI produces low-quality or incorrect formal language, it damages trust immediately. Mitigation: make human review a clear, unhurried step in the flow; never auto-submit without explicit user confirmation.

---

## 8. Open Questions

- [ ] **Pricing validation:** Do the locked launch prices still hold once Swiss Post commercial terms are confirmed?
- [ ] **Swiss Post product mapping:** Which exact Swiss Post product identifiers, payload fields, and acceptance signals map to standard and registered delivery?
- [ ] **Tracking depth:** What tracking data will actually be available? Do not build UI states that cannot be populated by real data. (See `docs/08-guardrails/provider-certainties.md`)
- [ ] **Registered mail availability at MVP:** Does our dispatch partner support Einschreiben/recommandé at launch?
- [ ] **QR receipt equivalent:** Is there a simple digital artifact we can offer as proof-of-submission (not delivery) that adds value without overclaiming?
- [ ] **Hybrid delivery future:** Is digital delivery to ePost-enrolled recipients worth investigating for v2?
- [ ] **SuperPost pricing stability:** Their CHF 2.50 price may change; verify before finalizing our own pricing model.
- [ ] **DocuPost-style balance system:** Would a prepay balance reduce friction for occasional repeat users in our context?
- [ ] **B2B readiness:** When is the right time to expose a basic API for SMBs? Does MVP internal architecture support it cleanly?

---

*This document is a living analysis. Revisit whenever: a competitor ships a notable feature, pricing changes, a new player enters, or we make a positioning decision that affects the competitive calculus.*
