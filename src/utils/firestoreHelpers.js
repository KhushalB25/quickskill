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
  runTransaction,
  serverTimestamp,
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

// ─── Username helpers ──────────────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
const NAME_CHANGE_LIMIT = 2;
const NAME_CHANGE_WINDOW_DAYS = 60;

export function validateUsernameFormat(username) {
  if (!username || typeof username !== 'string') return 'Username is required.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 20) return 'Username must be 20 characters or fewer.';
  if (!USERNAME_REGEX.test(username)) return 'Only letters, numbers, hyphens, and underscores allowed.';
  if (username.startsWith('-') || username.startsWith('_') || username.endsWith('-') || username.endsWith('_')) {
    return 'Username cannot start or end with a hyphen or underscore.';
  }
  return null; // valid
}

/**
 * Check if a username is available.
 * Returns { available: boolean, message?: string }
 */
export async function checkUsernameAvailability(username) {
  const key = username.toLowerCase().trim();
  try {
    const snap = await getDoc(doc(db, 'usernames', key));
    if (snap.exists()) {
      return { available: false, message: 'This username is already taken.' };
    }
    return { available: true };
  } catch (err) {
    console.error('Error checking username:', err);
    return { available: false, message: 'Could not verify username. Try again.' };
  }
}

/**
 * Claim a username for a user. Uses a Firestore transaction to avoid races.
 * If the user already has a username, the old one is released.
 */
export async function claimUsername(userId, newUsername) {
  const key = newUsername.toLowerCase().trim();
  const userRef = doc(db, 'users', userId);
  const usernameRef = doc(db, 'usernames', key);

  try {
    await runTransaction(db, async (transaction) => {
      // Check username availability
      const usernameDoc = await transaction.get(usernameRef);
      if (usernameDoc.exists() && usernameDoc.data().userId !== userId) {
        throw new Error('This username is already taken.');
      }

      // Get current user data to record the change
      const userDoc = await transaction.get(userRef);
      const currentUsername = userDoc.exists() ? userDoc.data().username : null;
      const existingChanges = userDoc.exists() ? (userDoc.data().usernameChanges || []) : [];

      // If changing from an existing username, release the old one
      if (currentUsername && currentUsername.toLowerCase() !== key) {
        const oldKey = currentUsername.toLowerCase().trim();
        transaction.delete(doc(db, 'usernames', oldKey));
      }

      // Add this change
      const newChanges = [...existingChanges, { changedAt: new Date().toISOString() }];

      // Update user doc
      transaction.set(userRef, {
        username: newUsername,
        displayName: newUsername,
        usernameChanges: newChanges,
      }, { merge: true });

      // Claim the username
      transaction.set(usernameRef, {
        userId,
        username: newUsername,
        createdAt: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to claim username.' };
  }
}

/**
 * Check whether a user can change their username.
 * Returns { allowed: boolean, remaining: number, message?: string }
 */
export function canChangeUsername(userData) {
  const changes = userData?.usernameChanges || [];
  const cutoff = Date.now() - NAME_CHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentChanges = changes.filter((c) => new Date(c.changedAt).getTime() > cutoff);
  const used = recentChanges.length;
  const remaining = Math.max(0, NAME_CHANGE_LIMIT - used);

  if (remaining <= 0) {
    // Find when the oldest change in the window expires
    const oldestRecent = recentChanges.reduce((earliest, c) => {
      const t = new Date(c.changedAt).getTime();
      return t < earliest ? t : earliest;
    }, Infinity);
    const resetDate = new Date(oldestRecent + NAME_CHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((resetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return {
      allowed: false,
      remaining: 0,
      used,
      limit: NAME_CHANGE_LIMIT,
      daysLeft,
      message: `You've used all ${NAME_CHANGE_LIMIT} name changes. You can change again in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
    };
  }

  return { allowed: true, remaining, used, limit: NAME_CHANGE_LIMIT };
}

/**
 * Set the initial username for a newly created account.
 * No change-limit tracking — just claims the name.
 */
export async function setInitialUsername(userId, username, email) {
  const key = username.toLowerCase().trim();
  const userRef = doc(db, 'users', userId);
  const usernameRef = doc(db, 'usernames', key);

  try {
    await runTransaction(db, async (transaction) => {
      const usernameDoc = await transaction.get(usernameRef);
      if (usernameDoc.exists()) {
        throw new Error('This username is already taken.');
      }

      transaction.set(userRef, {
        username,
        displayName: username,
        usernameChanges: [{ changedAt: new Date().toISOString() }],
        email: email || '',
      }, { merge: true });

      transaction.set(usernameRef, {
        userId,
        username,
        createdAt: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to set username.' };
  }
}
