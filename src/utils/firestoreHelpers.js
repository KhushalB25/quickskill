import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  db,
} from '../firebase';

/**
 * Fetch the daily challenge for a given date string (YYYY-MM-DD).
 */
export async function getDailyChallenge(dateStr) {
  try {
    const ref = doc(db, 'dailyChallenges', dateStr);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error('Error fetching daily challenge:', err);
    return null;
  }
}

/**
 * Check if a user has completed today's daily challenge.
 */
export async function hasCompletedDailyChallenge(userId, dateStr) {
  try {
    const ref = doc(db, 'users', userId, 'dailyChallenges', dateStr);
    const snap = await getDoc(ref);
    return snap.exists() && snap.data().completed === true;
  } catch (err) {
    console.error('Error checking daily challenge:', err);
    return false;
  }
}

/**
 * Generate a random question from a skill's question bank.
 */
export function getRandomQuestion(questionBank) {
  if (!questionBank || questionBank.length === 0) return null;
  const idx = Math.floor(Math.random() * questionBank.length);
  return { ...questionBank[idx], index: idx };
}

/**
 * Format date as YYYY-MM-DD for daily challenge keys.
 */
export function getTodayDateStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Verify the admin secret from env (legacy).
 */
export function isAdminFromEnv() {
  const secret = import.meta.env.VITE_ADMIN_SECRET;
  return secret && secret.length > 0;
}

/**
 * Check if a Firebase user is the admin by comparing their email
 * against VITE_ADMIN_EMAIL in .env
 */
export function isAdminUser(user) {
  if (!user?.email) return false;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!adminEmail) return false;
  return user.email.toLowerCase() === adminEmail.toLowerCase();
}
