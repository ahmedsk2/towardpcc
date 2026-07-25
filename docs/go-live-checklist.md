# Go-live checklist

Run top-to-bottom. Nothing below the line ships without a ✅ or a consciously
accepted 🟡. Cross-reference: LAUNCH-BLOCKERS.md and
docs/security/readiness-scorecard.md.

## Built & verified (P0–P7) — done

- [x] 22 calculators, 100% engine coverage, clinically red-teamed
- [x] Client-side privacy invariant (static guard + airplane-mode e2e in CI)
- [x] Home + hero, all pillar pages + working forms, admin (auth/TOTP/inbox/audit)
- [x] Security headers + two-tier CSP; P5 + P7 audits, all findings fixed
- [x] Dependency audit gate (prod: zero high/critical); SHA-pinned CI, gitleaks
- [x] Data model + migrations + retention purge; legal pages; runbooks written
- [x] CI green across quality / deps / e2e / lighthouse / gitleaks

## Infrastructure (P8) — requires the founder + go-ahead

- [ ] OCI VM in a **verified KSA region** (me-riyadh-1/me-jeddah-1), encrypted
      block volume for the DB
- [ ] Production secrets generated + placed in the secret store (AUTH_SECRET,
      TOTP_ENC_KEY, SUBMISSION_IP_SALT, DB/Umami/SMTP)
- [ ] Image built for the VM architecture, pushed; `docker compose -f
    docker-compose.prod.yml up -d` per docs/runbooks/deploy.md
- [ ] Migrations applied; first admin created (TOTP URI + recovery codes saved)
- [ ] **Backup running + a restore drill actually rehearsed** (backup-restore.md)
- [ ] Monitoring live (Uptime Kuma) + error tracking configured (PII kept out)

## Domain, email, trust (P8) — before DNS / first send

- [ ] Domain registered; registrar + registry lock, DNSSEC, CAA (Let's Encrypt),
      auto-renew, renewal calendar with two owners (TM-008)
- [ ] Defensive sibling/typo domains registered and 301'd (Caddyfile)
- [ ] SPF, DKIM, DMARC `p=reject`, MTA-STS configured; a test send authenticates
- [ ] `info@towardpcc.com` mailbox verified to receive mail
- [ ] DNS points at the VM; `sec-web` A-grade on the live URL

## Content & compliance — before public launch

- [ ] Legal pages counsel-reviewed (remove TODO:counsel-review markers)
- [ ] PWA raster PNG icons generated (192/512 + maskable)
- [ ] Validator names added when review completes (or badge stays "pending")
- [ ] Full WCAG 2.2 AA pass; Lighthouse timing budgets confirmed on prod hardware

## Final

- [ ] Founder walkthrough of the live staging site
- [ ] LAUNCH-BLOCKERS.md cleared or every remaining item consciously accepted
- [ ] Announce.
