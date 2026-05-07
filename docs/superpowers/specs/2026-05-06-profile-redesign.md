# Profile Page — Gothic Tech Redesign

**Date:** 2026-05-06
**Project:** QuickSkill
**Status:** Approved design — ready for implementation

## Overview

Visual overhaul of the Profile page to match the Gothic Tech aesthetic already applied to Home, Training, and Leaderboard pages. Scope is cosmetic only — no new data features, no new stores. All tracked data (progress, achievements, streak, accuracy) is already being surfaced in current code; the redesign restyles the presentation.

## Layout Structure

```
Filigree Top Border (matching Home.jsx / LeaderboardPage.jsx)
│
Hero Header
├─ Avatar in gold-accent gradient frame (h-20 w-20, rounded-2xl)
├─ displayName in gradient-text-gold (text-3xl)
├─ email in white/30
├─ hero-title-rule (gold line + diamond + gold line)
└─ hero-badge: "Cognitive Athlete" with pulsing gold dot
│
Stats Bar (4-column, matching LeaderboardPage stats-bar pattern)
├─ Total Correct — gradient-text (crimson), value
├─ Skills Practiced — white value
├─ Day Streak — gradient-text-gold value with fire icon prefix
└─ Achievements — gradient-text-gold value like "5/12"
│
Streak Card (glass-card)
├─ Card header: "Training Streak" title + gold "Active" badge
├─ 3-column grid: Current Streak (gold) | divider | Longest Streak (crimson) | divider | Unlocked (white)
│
Achievements Card (glass-card)
├─ Card header: "Achievements" + count badge "5/12"
├─ 3-column grid of achievement badges
├─ Unlocked: gold border, gold hover glow, full-color icon
└─ Locked: dimmed, grayscale icon, opacity 0.4
│
Skill Progress Card (glass-card)
├─ Card header: "Skill Progress"
├─ Ornate divider (◆ ◇ ◆)
├─ Skill rows, each with:
│  ├─ Emoji icon in gold-accent container
│  ├─ Skill name (font-semibold)
│  ├─ Meta row: "X correct · Y% acc · Z sessions" in muted text
│  ├─ Gold progress bar (gradient from #C8A84E to #E8D4A0)
│  └─ Score percentage (gold, right-aligned)
└─ Hover highlight on rows
```

## Staggered Animation

Each section fades in with `fadeSlideUp` animation at increasing delays:
- Back link: 0.05s
- Filigree border: 0.1s
- Hero header: 0.15s
- Stats bar: 0.2s
- Streak card: 0.25s
- Achievements card: 0.3s
- Skill progress card: 0.35s

## Affected Files

| File | Changes |
|------|---------|
| `src/pages/Profile.jsx` | Full restyle — new hero section, stats bar, restructured cards, gold progress bars, filigree border, staggered animations |
| `src/index.css` | Add `.profile-hero`, `.stats-bar` (reuse existing), `.gold-progress`, `.achievement-gold` classes — approx 60 new lines |

## What Stays the Same

- **Data flow** unchanged — reads from `useProgressStore`, `useStreakStore`, `useAchievementStore`, `useSkillStore` as before
- **Stats** — same 4 values (totalCorrect, skillIds.length, currentStreak, unlockedAchievements.length)
- **Achievement grid logic** — same filter for unlocked/locked
- **Skill progress list** — same data from `Object.keys(progress)` mapped through `skills.find()`
- **No new stores, no new Firestore reads**

## CSS Additions Needed (index.css)

- `.profile-hero` — centered hero section
- `.avatar-frame` / `.avatar-frame-inner` — gold gradient border ring
- `.profile-name` — gradient-text-gold display name
- `.streak-grid` — 3-column streak layout
- `.gold-progress` / `.gold-progress-fill` — gold gradient progress bar variant
- `.achievement-unlocked` / `.achievement-locked` — achievement card variants with gold accents
- `.skill-icon-box` — gold-accent emoji container

## Self-Review

- ✅ No ambiguous requirements
- ✅ Scope is purely cosmetic — no data changes
- ✅ Consistent with existing Gothic Tech pattern (filigree, hero badge, stat bar, glass cards)
- ✅ Animation delays match LeaderboardPage convention
- ✅ No edge cases introduced — existing error/loading states remain unchanged
