import { DB_VERSION, createSeed, type Database } from "@/lib/mocks/seed";

const DB_KEY = "wf.demo.database";
const SESSION_KEY = "wf.demo.session";

let memoryDb: Database | null = null;
let memoryUserId: string | null = null;

function storageAvailable() {
  return typeof window !== "undefined";
}

export function getDb() {
  if (!memoryDb) {
    memoryDb = readDb() ?? createSeed();
    if (storageAvailable()) persist(memoryDb);
  }
  return memoryDb;
}

export function saveDb() {
  if (memoryDb && storageAvailable()) persist(memoryDb);
}

export function resetDb() {
  memoryDb = createSeed();
  saveDb();
  return memoryDb;
}

export function nextSequence(prefix: string) {
  const db = getDb();
  db.sequence += 1;
  return `${prefix}_${db.sequence}`;
}

function readDb() {
  if (!storageAvailable()) return null;
  const raw = window.sessionStorage.getItem(DB_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Database;
    if (parsed.version !== DB_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(db: Database) {
  window.sessionStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function readSessionUserId() {
  if (!storageAvailable()) return memoryUserId;
  const session = window.sessionStorage.getItem(SESSION_KEY);
  if (session) return session;
  const remembered = window.localStorage.getItem(SESSION_KEY);
  return remembered || memoryUserId;
}

export function writeSession(userId: string, remember: boolean) {
  memoryUserId = userId;
  if (!storageAvailable()) return;
  if (remember) {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.setItem(SESSION_KEY, userId);
    return;
  }
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.setItem(SESSION_KEY, userId);
}

export function clearSession() {
  memoryUserId = null;
  if (!storageAvailable()) return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}
