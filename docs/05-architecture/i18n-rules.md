# Internationalization and Localization Rules

**Status:** Authoritative reference  
**Supersedes:** earlier localization planning notes

---

## 1. Objective

Keep the product Switzerland-ready without inventing localization completeness. Provide a correct, stable i18n foundation that supports all four Swiss locales without shipping unreviewed machine translations.

---

## 2. Supported Locales

| Locale | Language | Status |
|---|---|---|
| `de-CH` | German (Switzerland) | Target — primary market |
| `fr-CH` | French (Switzerland) | Target |
| `it-CH` | Italian (Switzerland) | Target |
| `en-CH` | English (Switzerland) | Target — fallback for international users |

All four locales must be supported in the i18n infrastructure from day one. Launch with approved copy for each active locale; hide or fall back for any locale where copy is not yet approved.

---

## 3. Documentation Language

Docs remain in English unless explicitly translated. This is not a localization gap — it is an internal working language decision.

---

## 4. String Externalization Rules

1. **No hardcoded user-facing copy inside components.** Every string a user reads must come from the message layer.
2. All user-facing strings belong in locale message files (e.g., `frontend/messages/{locale}.json` or equivalent).
3. Component props must not accept raw string literals for user-facing text — use message keys.
4. Error messages (from `docs/05-architecture/error-taxonomy.md` `userMessage` and `userAction` fields) must go through the message layer before display.
5. AI-generated letter content is NOT translated via the i18n layer — it is generated in the target locale directly by the AI. Do not mix draft generation with product UI copy translation.

---

## 5. Locale-Aware Formatting

All formatting must be locale-aware:

| Concern | Rule |
|---|---|
| Dates | Use `Intl.DateTimeFormat` with the active locale — no manual date string construction |
| Currency | CHF only. Format with `Intl.NumberFormat` (`currency: 'CHF'`, `style: 'currency'`) |
| Numbers | Use `Intl.NumberFormat` with active locale |
| Postal addresses | Format according to Swiss address conventions (see §6) |

---

## 6. Swiss Address Formatting

Swiss postal addresses follow this structure:

```
[FirstName] [LastName]
[Company]           ← optional
[AddressLine1]
[AddressLine2]      ← optional (floor, c/o, etc.)
[PostalCode] [City]
[Country]           ← omit if Switzerland; show for cross-border
```

- Postal codes are 4 digits (e.g., `3000 Bern`)
- No comma after street address line
- No period after postal code
- Country line: omit for Switzerland, include ISO country name for non-CH recipients

---

## 7. Currency Rule

CHF is the only supported currency. No EUR, USD, or multi-currency support in MVP.

Display format: Use `Intl.NumberFormat` with `{ style: 'currency', currency: 'CHF' }` and the active locale.
This produces locale-appropriate output (e.g., `CHF 12.50` for `en-CH`, `CHF 12.50` for `de-CH`).
Never manually format currency strings. Never use `Fr.`, `SFr.`, or bare numbers for prices.

Internal storage: integer cents. 1250 = CHF 12.50.

---

## 8. Anti-Hallucination Rule

**Do not ship machine-invented translations as approved copy.**

If a locale is not ready:
- Show approved fallback copy (e.g., `en-CH`), or
- Hide the incomplete locale entirely

Do not auto-translate product UI strings with an AI model and ship them without human review. AI-generated letter content (the letter itself) is a different concern and follows AI content generation rules.

---

## 9. Locale Detection and Switching

- Default locale: `de-CH` (primary market)
- Detection: browser `Accept-Language` header → map to nearest supported locale
- User can switch locale via UI selector; preference stored in session
- URL structure is locked to `/[locale]/...` using Next.js built-in locale routing. Query-param locale routing is rejected.

---

## 10. AI Letter Content vs. Product UI Copy

These are entirely separate concerns:

| Concern | Source | Pipeline |
|---|---|---|
| Product UI copy (labels, buttons, messages) | Locale message files | i18n layer in frontend |
| AI-generated letter content (body, subject) | LLM prompt output | Draft generation pipeline |
| Error messages | Backend + `shared/errors.ts` | Backend response → i18n display layer |

Do not route AI-generated letter text through the i18n message layer. Do not use the i18n layer to generate letters in different languages.

---

## Cross-References

| Document | Relationship |
|---|---|
| `docs/05-architecture/frontend-architecture.md` | Component conventions for string externalization |
| `docs/05-architecture/error-taxonomy.md` | Error messages that must go through i18n display layer |
| `docs/05-architecture/system-contracts.md` | `Locale` enum definition |
| `docs/05-architecture/database-schema.md` | `locale_enum` PostgreSQL type |
