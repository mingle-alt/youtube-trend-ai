export const DAILY_LIMIT = 10_000;

export const QUOTA_COST = {
  videos_list: 1,        // videos.list per page
  commentThreads_list: 10, // commentThreads.list per call
  videoCategories_list: 1,
} as const;

interface QuotaStore {
  date: string; // YYYY-MM-DD
  used: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): QuotaStore {
  if (typeof window === "undefined") return { date: today(), used: 0 };
  try {
    const raw = localStorage.getItem("yt_quota");
    if (!raw) return { date: today(), used: 0 };
    const store: QuotaStore = JSON.parse(raw);
    // Reset daily
    if (store.date !== today()) return { date: today(), used: 0 };
    return store;
  } catch {
    return { date: today(), used: 0 };
  }
}

function writeStore(store: QuotaStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("yt_quota", JSON.stringify(store));
}

export function addQuotaUsed(units: number): void {
  const store = readStore();
  store.used = store.used + units;
  writeStore(store);
}

export function getQuotaUsed(): number {
  return readStore().used;
}

export function resetQuota(): void {
  writeStore({ date: today(), used: 0 });
}
