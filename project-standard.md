The repository organization framework and standards used across all  Claude projects
Purpose: How the repository to be organized.

### Universal Repository Framework

➡️ **Root Folder = Repository Control Room**

* Keep only project-wide files in the root folder.
* Place all other files in meaningful subfolders.
* Improves clarity for humans, AI agents, and future maintenance.

➡️ **Repository Design Principle**

* Organized for **Humans + AI Agents + Future You**.
* **MD File Registry Rule:** Every MD file added to this repo must have an entry in `docs/md-registry.md` in the same commit. No MD file without a registry entry.

➡️ **Repository Creation Flow**

* Documentation → Planning → Implementation → Automation → Knowledge Preservation

➡️ **Repository Root Files (Project-Wide Impact)**

* `CLAUDE.md` → **Highest Priority** (Primary project guidance for Claude)
* `README.md` → **Medium Priority** (Project overview and understanding)
* `CHANGELOG.md` → Change history and release tracking
* `docs/` → **Low Priority** (Referenced only when additional details are needed)

➡️ **Claude Code File Priority**

1. `CLAUDE.md` → Project instructions and rules
2. `README.md` → Project context and overview
3. `CHANGELOG.md` → Historical changes
4. `docs/` → Detailed documentation (read when required)

Universal Folder structure Tree Plan → Build → Test → Document → Preserve Knowledge

```
Project-Name/
│
├── README.md                 ← Human entry point
│                              Purpose: Project overview
│                              Why: New user understands project in 2 minutes
│                              Memory Aid: "What is this project?"
│
├── CLAUDE.md                 ← AI entry point
│                              Purpose: Instructions for Claude
│                              Why: Gives project context every session
│                              Memory Aid: "How should AI work here?"
│
├── CHANGELOG.md              ← Change history
│                              Purpose: Track major updates
│                              Why: Understand what changed and when
│                              Memory Aid: "What changed?"
│
├── .gitignore                ← Git control
│                              Purpose: Exclude unwanted files
│                              Why: Prevent repository clutter
│                              Memory Aid: "What should Git ignore?"
│
├── specs/                    ← PLAN
│   │
│   ├── vision.md             ← Why project exists
│   ├── requirements.md       ← What to build
│   ├── roadmap.md            ← Future plans
│   └── tasks.md              ← Current work items
│
│   Purpose: Planning layer
│   Why: Prevents random development
│   Memory Aid: "What are we building?"
│
├── src/                      ← BUILD
│   │
│   ├── app/                  ← Main application
│   ├── services/             ← Business logic
│   ├── models/               ← Data structures
│   ├── integrations/         ← External APIs
│   └── utils/                ← Shared helpers
│
│   Purpose: Actual implementation
│   Why: Keeps code organized
│   Memory Aid: "Where is the real work happening?"
│
├── tests/                    ← TEST
│   │
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
│   Purpose: Verification
│   Why: Prevents regressions
│   Memory Aid: "How do we know it works?"
│
├── docs/                     ← DOCUMENT
│   │
│   ├── md-registry.md        ← MD file inventory (all MD files, role, status, purpose)
│   ├── overview.md           ← Business overview
│   ├── architecture.md       ← System design
│   ├── workflow.md           ← Process flow
│   └── user-guide.md         ← End-user instructions
│
│   Purpose: Human documentation
│   Why: Reduces repeated explanations
│   Memory Aid: "How does the project work?"
│
├── knowledge/                ← PRESERVE KNOWLEDGE
│   │
│   ├── decisions/
│   ├── lessons-learned/
│   ├── troubleshooting/
│   ├── research/
│   └── project-journal.md
│
│   Purpose: Long-term memory
│   Why: Prevent relearning same things
│   Memory Aid: "What have we learned?"
│
├── prompts/                  ← AI ASSETS
│   │
│   ├── planning/
│   ├── coding/
│   ├── debugging/
│   ├── documentation/
│   └── templates/
│
│   Purpose: Reusable AI prompts
│   Why: Save tokens and improve consistency
│   Memory Aid: "What can AI reuse?"
│
├── data/                     ← PROJECT DATA
│   │
│   ├── raw/
│   ├── processed/
│   ├── samples/
│   └── exports/
│
│   Purpose: Project data
│   Why: Separate data from code
│   Memory Aid: "Where is the project data?"
│
├── scripts/                  ← AUTOMATION
│   │
│   ├── setup/
│   ├── maintenance/
│   ├── backup/
│   └── deployment/
│
│   Purpose: Automation
│   Why: Avoid repetitive work
│   Memory Aid: "What can be automated?"
│
├── assets/                   ← VISUAL ASSETS
│   │
│   ├── images/
│   ├── diagrams/
│   └── presentations/
│
│   Purpose: Visual resources
│   Why: Centralized project assets
│   Memory Aid: "Where are project visuals?"
│
├── .claude/                  ← CLAUDE RUNTIME
│   │
│   ├── commands/
│   ├── workflows/
│   └── templates/
│
│   Purpose: Claude-specific assets
│   Why: Reusable Claude workflows
│   Memory Aid: "How is Claude customized?"
│
├── archive/                  ← HISTORICAL RECORDS
│   │
│   ├── old-docs/
│   ├── old-specs/
│   └── deprecated/
│
│   Purpose: Historical records
│   Why: Preserve without cluttering
│   Memory Aid: "What should never be lost?"
│
└── scratchpad/               ← EXPERIMENTATION AREA
    │
    ├── experiments/
    ├── temporary-notes/
    └── drafts/
    
    Purpose: Temporary work area
    Why: Keeps main repository clean
    Memory Aid: "Where can I safely experiment?"
```
