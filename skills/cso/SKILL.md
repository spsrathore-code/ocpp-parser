---
name: cso
phase: 4 of 7 — REVIEW
triggers: "security review, CSO, OWASP, threat model, security audit, check for vulnerabilities"
ocpp-context: true
---

## Phase Banner

Read `skills/WORKFLOW.md`. Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OCPP Tool Suite — Skill Chain
Phase 4 of 7 — REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:   [active feature from WORKFLOW.md]
Previous:  /build-complete (Build)  [✅ Complete | ⚠ Not recorded]
Current:   /cso
Next:      /qa (Test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisite Check

Check `skills/WORKFLOW.md`: is Build marked ✅?
If NOT ✅, print:
  "⚠ WARNING: Build phase not marked complete in WORKFLOW.md.
   Expected /build-complete to have run first.
   Proceed anyway? (yes / no)"
  If no: stop here.

## Purpose

Security audit using OWASP Top 10 and a STRIDE threat model.
For the Parser: focuses on XSS via log content injection, file input sanitisation,
and credential leakage in log exports.

## Steps

1. Read the git diff: `git diff main...HEAD`
2. Check OWASP Top 10 (relevant to this project):
   - **A03 Injection / XSS:** Does any log content get rendered as innerHTML? (Must use textContent or DOMPurify.)
   - **A01 Broken Access Control:** Does the Parser expose any data the user should not see? (N/A for local tool — note and skip.)
   - **A05 Security Misconfiguration:** Are there any API keys, credentials, or internal URLs in the diff?
   - **A08 Software and Data Integrity:** If new libraries are added, are they from trusted sources?
3. STRIDE threat model (abbreviated for this project type):
   - **Spoofing:** Can a malicious log file impersonate a valid charger?
   - **Tampering:** Can log content alter the Parser's behaviour (script injection)?
   - **Information Disclosure:** Does the export expose anything sensitive?
4. Flag any finding. Propose a fix for each.
5. Apply fixes if user agrees.

## OCPP Considerations

- J06: AuthorizationKey MUST NOT appear in GetConfiguration response (J06 §6.2.2); HTTP Basic Auth key = 20 bytes as 40 hex chars; RSA cert ≤ 2048 bytes (J06 §6.2.1); TLS mandatory for internet-facing deployments.
- OCPP logs are operator-controlled input but may come from untrusted charger firmware. Treat all log content as untrusted. Never render OCPP payload fields as HTML.

## Output

Security audit summary. Any fixes committed.

## WORKFLOW.md Update

Mark Review ✅ with today's date (if /review also complete).
Append: "Security audit complete. N findings, M fixed."
Print: "skills/WORKFLOW.md updated ✓ — Review phase complete."

## End Banner

Print:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4 — REVIEW complete.
skills/WORKFLOW.md updated ✓
Next → run /qa (Test phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
