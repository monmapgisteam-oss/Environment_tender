"use client";

/**
 * Хөтөч дээрх өгөгдлийн сан.
 *
 * Бүх төлөвлөгөө (компани, ажил, үе шат) нь `buildSeed()`-ээр тогтмол үүсдэг тул
 * хөтөчид зөвхөн ХЭРЭГЛЭГЧИЙН ӨӨРЧЛӨЛТИЙГ (тохиргоо, гараар бүртгэсэн тайлан)
 * хадгална. Мэдэгдлийг ачаалах бүрд дүрмийн хөдөлгүүрээр дахин тооцно —
 * ижил огноонд ижил үр дүн гарна.
 */
import { useSyncExternalStore } from "react";
import { runEscalation } from "./escalation";
import { buildSeed, reviewDate } from "./seed";
import type { DB, NbogState, Settings, VendorState } from "./types";

const KEY = "hyanalt-state-v2";

interface Persisted {
  settings: Partial<Settings>;
  /** Хяналтын цэгийн дугаар → тайлан ирүүлсэн огноо (null = ирүүлээгүй) */
  overrides: Record<string, string | null>;
  /** Хяналтын цэг → гар удирдлагатай төлөв (НБОГ / Монмэп) */
  states: Record<string, { nbog?: NbogState; vendor?: VendorState }>;
}

let persisted: Persisted = { settings: {}, overrides: {}, states: {} };
let loaded = false;
let cache: DB | null = null;
let serverCache: DB | null = null;
const listeners = new Set<() => void>();

function loadPersisted() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      persisted = { settings: p.settings ?? {}, overrides: p.overrides ?? {}, states: p.states ?? {} };
    }
  } catch {
    // хадгалалт боломжгүй бол анхны төлөвөөр ажиллана
  }
}

function savePersisted() {
  try {
    localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    // хувийн горим — зөвхөн энэ хуудсанд үйлчилнэ
  }
}

/** Төлөвлөгөөг шинээр угсарч, хэрэглэгчийн өөрчлөлтийг тавиад хөдөлгүүрийг ажиллуулна */
function rebuild(): DB {
  const db = buildSeed();
  db.settings = { ...db.settings, ...persisted.settings };
  const byId = new Map(db.milestones.map((m) => [m.id, m]));
  for (const [id, value] of Object.entries(persisted.overrides)) {
    const m = byId.get(id);
    if (m) {
      m.submittedAt = value;
      m.manual = true;
    }
  }
  for (const [id, st] of Object.entries(persisted.states)) {
    const m = byId.get(id);
    if (m) {
      m.nbogState = st.nbog;
      m.vendorState = st.vendor;
    }
  }
  runEscalation(db, reviewDate(db.settings));
  return db;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): DB {
  if (!cache) {
    loadPersisted();
    cache = rebuild();
  }
  return cache;
}

/** Build/prerender үед хэрэглэгчийн өөрчлөлтгүй анхны төлөв */
function getServerSnapshot(): DB {
  serverCache ??= rebuild();
  return serverCache;
}

function commit() {
  savePersisted();
  cache = rebuild();
  listeners.forEach((l) => l());
}

/* ────────── Дэлгэцээс дуудагдах үйлдлүүд ────────── */

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setReviewDate(date: string) {
  persisted.settings = { ...persisted.settings, reviewDate: date, useReviewDate: true };
  commit();
}

export function markSubmitted(milestoneId: string) {
  persisted.overrides[milestoneId] = reviewDate(getSnapshot().settings);
  commit();
}

export function undoSubmit(milestoneId: string) {
  persisted.overrides[milestoneId] = null;
  commit();
}

export function updateSettings(patch: Partial<Settings>) {
  persisted.settings = { ...persisted.settings, ...patch };
  commit();
}

/** Хөдөлгүүрийг дахин ажиллуулж, дэлгэцийг шинэчилнэ */
export function refresh() {
  commit();
}

/** Захиалагч (НБОГ) талын төлөвийг тэмдэглэх */
export function setNbogState(milestoneId: string, value: NbogState | undefined) {
  persisted.states[milestoneId] = { ...persisted.states[milestoneId], nbog: value };
  commit();
}

/** Гүйцэтгэгч (Монмэп) талын төлөвийг тэмдэглэх */
export function setVendorState(milestoneId: string, value: VendorState | undefined) {
  persisted.states[milestoneId] = { ...persisted.states[milestoneId], vendor: value };
  commit();
}

/** Бүх өөрчлөлтийг устгаж анхны төлөвт буцаана */
export function resetAll() {
  persisted = { settings: {}, overrides: {}, states: {} };
  commit();
}
