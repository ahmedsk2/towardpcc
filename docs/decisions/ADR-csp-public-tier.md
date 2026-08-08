# Public-tier CSP: why `script-src 'unsafe-inline'` is still there

Status: investigated 2026-08-08, **not changed**. Supersedes the open framing of
SPC-WEB-001, which read as a defect to fix rather than a trade to weigh.

## What SPC-WEB-001 asked for

Remove `'unsafe-inline'` from `script-src` on the public tier, replacing it with
hashes. `proxy.ts` already runs two tiers: `/admin` gets
`'nonce-…' 'strict-dynamic'` with no `unsafe-inline`, and everything else gets
`'self' 'unsafe-inline'`.

## Why it cannot be a nonce

A nonce must be unique per response. The public routes are statically
prerendered — twelve of them — so the HTML is generated once at build time and
served unchanged. A nonce baked into prerendered HTML is a constant, and a
constant nonce is exactly equivalent to `'unsafe-inline'` while looking stricter.
Making the routes dynamic to obtain a nonce would trade the perf budget for the
appearance of a control.

## What hashing would actually cost

Measured against the built output rather than estimated:

|                                       |                                                |
| ------------------------------------- | ---------------------------------------------- |
| prerendered routes                    | 12                                             |
| executable inline scripts across them | **63**                                         |
| on the home route alone               | 19 total — **17 are Next's `__next_f` chunks** |

The seventeen are the RSC flight payload, split across `self.__next_f.push(...)`
blocks. Their content is derived from the page's own rendered output, so every
hash changes whenever the page content or the build id changes — that is, on
every deploy.

So a hash-based policy needs a build step that walks `.next/server/app/*.html`,
computes 63 SHA-256 digests, writes a per-route manifest, and has `proxy.ts`
emit the right set per request. That is buildable. What makes it unattractive is
the failure mode: **a single stale or mismatched hash blocks hydration and the
page renders as a static shell with no interactivity** — a blank calculator, not
an error.

## The trap that makes a partial migration WORSE than none

Per CSP Level 3, a policy containing any hash-source or nonce-source causes
`'unsafe-inline'` to be **ignored** — not combined with. (W3C CSP3,
"allow-all-inline"; the keyword is only honoured when no hash or nonce is
present.)

So hashing _our_ two inline scripts while leaving `'unsafe-inline'` in place for
Next's would not be a cautious half-step. It would silently drop the allowance
the seventeen `__next_f` blocks depend on and break every public page. This is
all-or-nothing, and anyone attempting it incrementally will discover that in
production.

Stated from the specification. It was not verified in a browser here: the
obvious test — a page carrying both keywords — cannot be run through this app's
own dev server without `proxy.ts`'s header policy intersecting the meta policy
and confusing the result.

## Why the current position is defensible

The risk `'unsafe-inline'` carries is script injection, and injection needs an
injection point. On the public tier there is none:

- No public route renders user-supplied content. Submissions are written but
  only ever read back inside `/admin`, which is on the strict nonce tier.
- No `dangerouslySetInnerHTML` anywhere under `app/calculators/**` or
  `components/calculator/**` — the TM-001 guard in
  `content/privacy-invariant.test.ts` is a raw source scan that fails the build
  on it.
- **No third-party script executes at all any more.** Cloudflare's JS Detections
  injection, which caused TM-013, disappeared with the 2026-08-08 DNS cutover —
  the edge that injected it is no longer in the request path. The public tier's
  script surface is now entirely first-party.

That last point is new, and it moves this item in the opposite direction from
where it started: the strongest argument for hardening the public CSP used to be
an unremovable third-party script, and that script is gone.

## When to revisit

Two triggers, both concrete:

**A public route starts rendering user-supplied content.** Registry submissions
displayed publicly, a comment, an operator-editable page body — any of these
creates the injection point that is currently absent, and the trade flips.

**A governance review asks for it.** A hospital's information-security office may
require the absence of `'unsafe-inline'` as a checklist item regardless of
whether an injection surface exists. That is a legitimate reason to build the
manifest, and it should be costed as the day of work it is rather than argued
against.

Until one of those, the honest position is that this is a documented trade with
no exploitable path, not an outstanding defect.
