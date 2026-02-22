import { openDB, type DBSchema } from "idb";
import type { Bean, BrewLog } from "./types";

type BaristaDB = DBSchema & {
  beans: {
    key: string;
    value: Bean;
    indexes: { "by-updatedAt": number };
  };
  brews: {
    key: string;
    value: BrewLog;
    indexes: { "by-createdAt": number; "by-beanId": string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
};

const DB_NAME = "barista-pwa";
const DB_VERSION = 1;

export async function getDb() {
  return openDB<BaristaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const beans = db.createObjectStore("beans", { keyPath: "id" });
      beans.createIndex("by-updatedAt", "updatedAt");

      const brews = db.createObjectStore("brews", { keyPath: "id" });
      brews.createIndex("by-createdAt", "createdAt");
      brews.createIndex("by-beanId", "beanId");

      db.createObjectStore("settings", { keyPath: "key" });
    },
  });
}

export function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export async function seedIfEmpty() {
  const db = await getDb();
  const count = await db.count("beans");
  if (count > 0) return;

  const now = Date.now();
  const demo: Bean = {
    id: uuid(),
    name: "Demo Bean",
    roaster: "Demo Roaster",
    defaultMethodId: "aeropress",
    createdAt: now,
    updatedAt: now,
  };

  await db.put("beans", demo);
}

export async function listBeans() {
  const db = await getDb();
  const beans = await db.getAllFromIndex("beans", "by-updatedAt");
  return beans.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertBean(bean: Bean) {
  const db = await getDb();
  await db.put("beans", bean);
}

export async function deleteBean(beanId: string) {
  const db = await getDb();
  await db.delete("beans", beanId);
}

export async function listBrews(limit = 200) {
  const db = await getDb();
  const brews = await db.getAllFromIndex("brews", "by-createdAt");
  brews.sort((a, b) => b.createdAt - a.createdAt);
  return brews.slice(0, limit);
}

export async function listBrewsByBean(beanId: string, limit = 200) {
  const db = await getDb();
  const brews = await db.getAllFromIndex("brews", "by-beanId", beanId);
  brews.sort((a, b) => b.createdAt - a.createdAt);
  return brews.slice(0, limit);
}

export async function addBrew(brew: BrewLog) {
  const db = await getDb();
  await db.put("brews", brew);
}

export async function deleteBrew(brewId: string) {
  const db = await getDb();
  await db.delete("brews", brewId);
}
