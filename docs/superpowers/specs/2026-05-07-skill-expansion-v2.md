# QuickSkill v2 — 14 New Skills Expansion

**Date:** 2026-05-07
**Status:** Approved

## Context

QuickSkill currently has 18 cognitive training skills (969 questions across 97 focus areas). This expansion adds 14 new skills covering high-demand knowledge domains — science, health, history, technology, business, arts, philosophy, communication, statistics, media literacy, environment, and coding.

Universal audience. No code changes needed — pure content expansion using existing AI pipeline.

## New Skills

| # | Skill | Type | Difficulty | Focus Areas (5 each) |
|---|-------|------|------------|----------------------|
| 1 | Science Explained | cognitive | medium | physics-everyday, chemistry-basics, biology-fundamentals, scientific-method, famous-experiments |
| 2 | Human Body & Health | cognitive | easy | anatomy-basics, nutrition-myths, disease-prevention, mental-wellness, exercise-science |
| 3 | World History | cognitive | medium | ancient-civilizations, modern-revolutions, world-wars, cold-war-era, leaders-reformers |
| 4 | Geography & Cultures | cognitive | easy | countries-capitals, physical-geography, cultural-traditions, world-religions, languages-demographics |
| 5 | How Technology Works | cognitive | medium | internet-infra, ai-ml-basics, cybersecurity, how-computers-work, emerging-tech |
| 6 | Money & Economics | cognitive | hard | macroeconomics, microeconomics, trade-globalization, personal-investing, economic-history |
| 7 | Entrepreneurship | cognitive | medium | startup-ideas, business-models, marketing-basics, leadership, failure-stories |
| 8 | Art & Creativity | cognitive | medium | art-history, music-theory, film-analysis, design-principles, creative-processes |
| 9 | Philosophy & Big Ideas | cognitive | hard | moral-ethics, logic-reasoning, famous-thinkers, political-philosophy, meaning-purpose |
| 10 | Communication & Persuasion | cognitive | medium | public-speaking, negotiation, storytelling, rhetoric-debate, body-language |
| 11 | Statistics & Probability | cognitive | hard | probability-basics, distributions, hypothesis-testing, bayesian-thinking, statistical-fallacies |
| 12 | Media Literacy | cognitive | easy | source-evaluation, fact-checking, bias-detection, social-media-literacy, data-visualization |
| 13 | Environmental Science | cognitive | medium | climate-science, ecology-basics, renewable-energy, conservation, sustainability |
| 14 | Coding Challenges | cognitive | hard | debug-the-code, predict-output, algorithms, data-structures, language-agnostic |

## Question Volume

- 14 skills × 5 focus areas = 70 focus areas
- 70 focus areas × 10 questions = 700 questions
- New total: 32 skills, ~1,669 questions, 167 focus areas

## Architecture

No code changes. Existing pipeline handles new skills identically:

- **Seed format:** Same `seed/seedSkills.js` — append 14 new entries
- **Firestore:** Same `skills/{skillId}` documents
- **Training flow:** Topic selector → question queue → session → review (unchanged)
- **AI rotation:** Pre-generation, mid-session, post-session, weak-topic boosting, dedup — all work for any skill

## Implementation Steps

1. Write 14 skill stubs (name, description, enhances, etc.) by hand
2. Create `seed/bulkGenerate-v2.mjs` — generates questions for new skills only
3. Run bulk generation (NVIDIA llama-3.1-8b)
4. Append generated skills to `seed/seedSkills.js`
5. Run `npm run seed` to push to Firestore
6. Quality check: each focus area has 10 questions with real options

## Quality Gate

- Each question must have 4 real options (not placeholder `["a","b","c","d"]`)
- `correctAnswer` must match an option exactly
- Retry on JSON parse failure (max 2 attempts)
- Target: 95%+ generation success rate per focus area

## Final Tally

| | Before | After |
|---|--------|-------|
| Skills | 18 | 32 |
| Questions | 969 | ~1,669 |
| Focus areas | 97 | 167 |
