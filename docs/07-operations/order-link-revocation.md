# Order link revocation

## The problem this solves

An order page is reachable by a bearer credential with the lifetime of the
retention window — weeks. Two forms exist:

- an **opaque token**, whose SHA-256 hash lives in
  `payment_attempts.order_access_token_hash`;
- a **signed JWT**, stateless, naming a payment attempt and an expiry.

A customer story that had no answer before: _"I forwarded my receipt to the
wrong address"_ / _"that mailbox isn't mine any more"_. The opaque token could
in principle be replaced, but the signed form carried no server-side state at
all, so it could not be withdrawn by any means short of waiting weeks for it to
expire. Anyone who had ever held the link still had the letter.

## How it works now

Every signed token carries a `gen` claim:

```
gen = sha256("order-access-gen:" + order_access_token_hash).slice(0, 32)
```

The resolver recomputes the generation from the row's _current_ hash and refuses
any token whose claim disagrees. Both credential forms are therefore checked
against the same column, and replacing that column withdraws both at once. No
new table, no new column, no migration.

Two details that are load-bearing:

- The generation is a **re-hash**, not a prefix of the stored hash. The claim
  travels inside a base64 JWT that any link holder can read, so publishing the
  stored hash verbatim would give away more than the link already does. And 32
  hex characters is 128 bits, where a 16-character prefix would have been 64 —
  small enough that a future rotation colliding with a historical generation,
  and silently resurrecting a revoked link, would be worth worrying about.
- Rotation is a **compare-and-set** against the hash that authenticated the
  request. Without it, two requests carrying the same old link both authenticate
  and both rotate, and the second invalidates the link the first is already
  composing an email around — so the message that arrives last is the one that
  no longer opens the order. Losing the CAS returns 404 rather than minting a
  second replacement.

## The endpoint

`POST /orders/:orderToken/revoke-links` — rate limited to 5/hour per IP.

Authenticated by holding a working link. Anyone who can prove they hold it can
also take it out of circulation, and **the replacement goes to the order's email
rather than to the caller**, so a stolen link cannot be used to keep access
while cutting the owner out.

Refusals, in order:

| Condition                                                                     | Response                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------- |
| Token does not resolve                                                        | 404                                      |
| No session email or no stored receipt — nothing to deliver a replacement with | 409 `ORDER_LINK_REPLACEMENT_UNAVAILABLE` |
| Access window already closed, or another request rotated first                | 404                                      |
| Rotated, but the replacement email could not be enqueued                      | 503 `ORDER_LINK_REPLACEMENT_NOT_SENT`    |

The deliverability check happens **before** the rotation, never after: rotating
first would destroy the customer's only way in and hand them a promise of a new
link that never arrives.

The 503 case cannot be rolled back. Putting the old hash back would resurrect
links the customer just asked to kill, which is the one thing this endpoint must
never do — so the failure is reported with the recovery path in it instead.

## Email dedupe identity

The outbox `dedupe_key` is a UNIQUE column, so it is **permanent** — unlike the
Redis job id it replaced, which aged out in a day. That makes the key a policy
decision:

- `capture` — the automatic receipt. `payment-receipt-<id>-<generation>`. Stable
  forever, so a replayed Stripe webhook cannot mail a second copy.
- `customer_request` — someone pressed a button. Suffixed with the minute it was
  asked for, so a double-click is absorbed but asking again later actually
  sends.

Getting this wrong is not a subtle bug: giving both the same identity makes
`/orders/resend-link` a button that reports success and delivers nothing —
precisely the recovery path a customer needs when their link stopped working.

## Deploy note (2026-07-29)

**This release invalidates every signed link issued before it**, because tokens
minted without a `gen` claim cannot be revoked and are therefore refused rather
than tolerated.

That was checked against production before shipping, not assumed: exactly one
captured payment existed, with one live link, belonging to the operator. The
alternative — a numeric `order_access_generation` column that grandfathers
legacy links until first revocation — is the right design for a service with
real customers, and should be revisited the moment production holds more than a
handful of live links.

Customers who lose a link recover it with `POST /orders/resend-link`, which
takes an email address and always returns a generic 200 to avoid enumeration.
