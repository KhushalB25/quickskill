# everyai

Sharpen your cognitive skills with interactive training exercises.

## Features

- **Skill-based training**: Practice pattern recognition, vocabulary, mental math, memory recall, logic puzzles, and more
- **Question cards**: Multiple-choice and text-answer question types
- **Progress tracking**: Scores and progress persist per user via Firebase
- **Daily challenges**: Complete daily challenges for extra motivation
- **Leaderboard**: Compete with other users ranked by total correct answers
- **Admin panel**: Create and manage skills and questions (protected by admin secret)

## Tech Stack

- **Frontend**: React 18 + React Router 6 + Zustand (state) + Tailwind CSS 3
- **Backend**: Firebase (Auth, Firestore)
- **Build**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Auth (Email/Password + Google) and Firestore enabled

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example` and fill in your Firebase config values:

```bash
cp .env.example .env
```

3. Set up Firebase:
   - Enable **Email/Password** and **Google** sign-in methods in Firebase Authentication
   - Create a Firestore database (start in test mode, then update security rules for production)
   - Create composite index for leaderboard: `users` collection, `totalCorrect` descending

4. Start the dev server:

```bash
npm run dev
```

### Seeding Skills

To populate the app with initial skills and questions:

1. Generate a Firebase service account key:
   - Firebase Console → Project Settings → Service Accounts → Generate New Private Key
   - Save the JSON file as `serviceAccountKey.json` in the project root

2. Run the seed script:

```bash
npm run seed
```

This creates 6 skills (Pattern Recognition, Vocabulary Builder, Mental Math, Memory Recall, Logic Puzzles, Word Association) with 5 questions each.

### Admin Access

Set `VITE_ADMIN_SECRET` in `.env` to any non-empty value to enable the admin panel. Navigate to `/admin` in the app to manage skills.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run seed` | Seed Firestore with initial skills |
