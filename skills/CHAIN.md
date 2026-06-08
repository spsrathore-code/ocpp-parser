# Skill Chain — Quick Reference

> Full design: `docs/skill-chain.md` | Live state: `skills/WORKFLOW.md`

## 7-Phase Chain

| # | Phase   | Slash commands                                              | Prerequisite      |
|---|---------|-------------------------------------------------------------|-------------------|
| 1 | Think   | /office-hours → /spec → /autoplan                           | none              |
| 2 | Plan    | /plan-ceo-review, /plan-eng-review, /plan-design-review, /plan-devex-review | Think ✅ |
| 3 | Build   | /investigate, /design-consultation, /design-shotgun, /design-html → **/build-complete** | Plan ✅ |
| 4 | Review  | /review, /design-review, /devex-review, /cso                | Build ✅          |
| 5 | Test    | /qa, /qa-only, /benchmark                                   | Review ✅         |
| 6 | Ship    | /ship → /document-release → /land-and-deploy → /canary      | Test ✅           |
| 7 | Reflect | /retro, /learn                                              | Ship ✅           |

## Safety tools (any phase, any time)
/careful  /freeze  /guard  /unfreeze

## Starting a new feature
1. Run /office-hours
2. Run /spec
3. Run /plan-eng-review
4. Implement on feat/[name] branch
5. Run /build-complete
6. Run /review + /cso
7. Run /qa
8. Run /ship → /document-release → /land-and-deploy → /canary
9. Run /learn
