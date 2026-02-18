import localforage from "localforage";

export const STORAGE_KEY = "do-not-wish-plan:v1";

localforage.config({
  name: "wish-plan",
  storeName: "wish_plan_store",
  description: "Local-only Wish Plan data",
});

export async function loadState<T>(): Promise<T | null> {
  try {
    const v = await localforage.getItem<T>(STORAGE_KEY);
    return v ?? null;
  } catch {
    return null;
  }
}

export async function saveState<T>(state: T): Promise<void> {
  await localforage.setItem(STORAGE_KEY, state);
}
