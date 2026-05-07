import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const saPath = path.join(__dirname, 'serviceAccountKey.json');

let sa;
try {
  sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
} catch {
  // Try as path
  sa = { type: 'service_account' };
}

const app = admin.apps.length === 0
  ? admin.initializeApp({ credential: admin.credential.applicationDefault() })
  : admin.app();

const db = admin.firestore();

async function main() {
  // Find the user by querying auth
  const userQuery = await admin.auth().getUserByEmail('testuser@quickskill.com').catch(() => null);

  if (!userQuery) {
    console.log('No testuser found. Trying to find any user...');
    const users = await admin.auth().listUsers(1);
    if (users.users.length === 0) {
      console.log('No users in Firebase Auth');
      process.exit(1);
    }
    return checkUserQuestions(users.users[0].uid);
  }

  await checkUserQuestions(userQuery.uid);
}

async function checkUserQuestions(uid) {
  console.log(`Checking question bank for user: ${uid}`);

  // List all skill question banks
  const banksRef = db.collection('users').doc(uid).collection('questionBank');
  const banks = await banksRef.listDocuments();

  console.log(`Found ${banks.length} skills in question bank:\n`);

  for (const bankRef of banks) {
    const snap = await bankRef.get();
    if (snap.exists) {
      const data = snap.data();
      const qs = data.questions || [];
      const updated = data.updatedAt?.toDate?.() || data.updatedAt || 'unknown';
      console.log(`━━ ${bankRef.id} ━━`);
      console.log(`  Questions: ${qs.length}`);
      console.log(`  Updated: ${updated}`);
      console.log(`  Sample: ${qs[0]?.questionText?.substring(0, 60) || '(empty)'}`);
      console.log();
    }
  }

  // Also check progress
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    console.log(`\nUser progress:`);
    console.log(`  totalCorrect: ${data.totalCorrect || 0}`);
    console.log(`  skills: ${Object.keys(data.progress?.skills || {}).length}`);
  }
}

main().catch(console.error);
