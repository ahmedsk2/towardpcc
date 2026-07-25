# P5 security report — admin, forms, auth

- Date: 2026-07-25
- Scope: the P5 attack surface — public submission pipeline + four forms, Auth.js
  admin authentication (Argon2id + mandatory TOTP), the admin inbox/triage/audit,
  calculator-meta management, email, and the security headers / CSP.
- Method: adversarial review across five dimensions (auth & session; authz /
  BOLA / BFLA; injection / output-encoding / email; input-validation / abuse /
  CSRF; secrets & crypto). Every raw finding was independently re-verified
  against the code — mitigations already present (server-side re-guards, Zod
  stripping unknown keys, Prisma parameterization, Server-Action Origin checks,
  Auth.js cookie defaults) were credited — before it counted. 10 raw findings →
  9 confirmed after verification.

## Findings and disposition — all fixed

| #   | Sev  | Finding                                                                                                                                                                         | Fix                                                                                                                                                                                                                   | Status                                                      |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | HIGH | Rate limiter keyed on spoofable leftmost XFF; rejected attempts counted toward the window; one shared global cap → single-host site-wide lockout DoS; `clear()` wiped all users | Trust proxy-set `x-real-ip` else rightmost XFF hop; only ACCEPTED requests consume the window; global cap checked after per-IP and accepted-only; bounded LRU eviction; HMAC-keyed IP hash; salt fails closed in prod | Fixed                                                       |
| 2   | MED  | TOTP codes replayable within the ±window (no one-time-use)                                                                                                                      | `lastTotpStep` column + atomic conditional update; each step consumable once                                                                                                                                          | Fixed + verified (consumed code rejected, fresh code works) |
| 3   | MED  | Non-atomic lockout counter (lost update) let parallel requests dodge lockout                                                                                                    | DB-atomic `{ increment: 1 }`, act on returned row                                                                                                                                                                     | Fixed                                                       |
| 4   | MED  | Recovery codes 40-bit + unsalted SHA-256 → offline-crackable on DB leak                                                                                                         | 80-bit entropy (2^80 out of reach)                                                                                                                                                                                    | Fixed                                                       |
| 5   | MED  | `SUBMISSION_IP_SALT` silently fell back to a shipped constant                                                                                                                   | Fail closed in production                                                                                                                                                                                             | Fixed                                                       |
| 6   | LOW  | Login timing oracle enumerated emails / leaked password-correctness                                                                                                             | Always run a password verify (dummy Argon2id when no user) + the 2FA path                                                                                                                                             | Fixed                                                       |
| 7   | LOW  | Admin bootstrap password passed as an argv arg                                                                                                                                  | Read from `ADMIN_BOOTSTRAP_PASSWORD` env                                                                                                                                                                              | Fixed                                                       |

(Findings 4/8 and 5/7 in the raw run were duplicates of the same issue.)

## Not vulnerabilities (verified false positives)

Candidates raised and dismissed on inspection: SQL injection (Prisma
parameterized only, no raw SQL), stored XSS in the admin (payload rendered as
React-escaped text, no `dangerouslySetInnerHTML`), CSRF on the forms (Server
Actions enforce Origin), mass-assignment (Zod strips unknown keys incl. Next's
`$ACTION_*` fields before persist), and missing admin authz (every page AND
Server Action re-checks `requireAdmin()`).

## Residual / follow-ups (not launch-blocking for the reviewed surface)

- Multi-replica correctness: the public-form limiter is in-memory (single
  instance); a shared store (Redis) is needed if the app scales out — tracked
  for P8. The login lockout is already DB-backed and shared-safe.
- Global-cap graceful degradation could escalate to a challenge (Turnstile,
  documented off-by-default) instead of waiting, if abuse warrants it.
- The full `security-pan-check:security-audit` + `prod-ready:audit --ci` run
  over the whole app is the P7 gate; this report covers the P5 module review.
