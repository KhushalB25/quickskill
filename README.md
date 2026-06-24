# QuickSkill — EveryAI

[![Live](https://img.shields.io/badge/live-everyai.in-2ea44f?style=flat-square)](https://www.everyai.in)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-ffca28?style=flat-square&logo=firebase)

**Live demo:** **[www.everyai.in](https://www.everyai.in)**

AI-powered cognitive training platform. Sharpen pattern recognition, vocabulary, mental math, memory recall, and logic with adaptive exercises across 30+ skill categories. Daily challenges, real-time progress tracking, and a competitive leaderboard.

---

## Features

- **Adaptive skill training** — pattern recognition, vocabulary, mental math, memory recall, logic puzzles, word association, and more
- **Question cards** — multiple-choice and text-answer formats
- **Real-time progress tracking** — scores and weak-area analysis persist per user in Firestore
- **Daily challenges** — keep streaks alive with rotating prompts
- **Leaderboard** — global ranking by total correct answers, indexed for fast reads
- **Admin panel** — gated skill + question authoring behind a secret env var

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router 6, Zustand, Tailwind CSS 3 |
| Backend | Firebase Auth (Email/Password + Google), Firestore |
| Build | Vite 5 |
| Seed / Admin | Node.js + firebase-admin |

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Auth (Email/Password + Google) and Firestore enabled

### Setup

```bash
git clone https://github.com/KhushalB25/quickskill.git
cd quickskill
npm install
cp .env.example .env
# fill in Firebase web app config in .env
npm run dev
```

### Firebase setup

- Enable **Email/Password** and **Google** sign-in in Firebase Auth
- Create a Firestore database (test mode → tighten with `firestore.rules` before prod)
- Composite index: `users` collection, `totalCorrect` desc (used by leaderboard query)

### Seeding skills

```bash
# Firebase Console → Project Settings → Service Accounts → Generate New Private Key
# Save as serviceAccountKey.json in repo root
npm run seed
```

Creates 6 starter skills (Pattern Recognition, Vocabulary Builder, Mental Math, Memory Recall, Logic Puzzles, Word Association) with 5 questions each.

### Admin access

Set `VITE_ADMIN_SECRET` to any non-empty value, then visit `/admin`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run seed` | Seed Firestore with starter skills |

## License

MIT
