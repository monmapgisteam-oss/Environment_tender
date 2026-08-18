"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { IconRefresh, IconSearch } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { reviewDate as reviewOf } from "@/lib/seed";
import { refresh, setReviewDate, useDB } from "@/lib/store";

const TITLES: Record<string, string> = {
  "/": "Хяналтын самбар",
  "/ajil": "Ажлын жагсаалт",
  "/medegdel": "Мэдэгдлийн төв",
  "/tohirgoo": "Дүрэм, тохиргоо",
};

export function TopBar() {
  const db = useDB();
  const client = db.program.client;
  const companies = db.companies.length;
  const reviewDateValue = reviewOf(db.settings);
  const path = usePathname();
  // Статик экспортод зам ард нь ташуу зураастай ирдэг (/ajil/) — гарчиг олдохгүй байхаас сэргийлнэ
  const pathKey = path.replace(/\/+$/, "") || "/";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Огноог бичиж байх үед завсрын утга бүрээр хөдөлгүүр ажиллуулахгүй */
  const applyDate = (v: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < "2026-01-01" || v > "2027-06-30") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => start(() => setReviewDate(v)), 500);
  };

  return (
    <header className="flex flex-none flex-wrap items-center gap-3 border-b border-line px-4 py-2.5 md:px-5 xl:h-[53px] xl:flex-nowrap xl:py-0">
      <div className="min-w-0">
        <h1 className="text-[15px] leading-tight font-semibold">{TITLES[pathKey] ?? "Хяналтын самбар"}</h1>
        <p className="text-[10.5px] text-ink-3">
          {client} · <span className="num">{companies}</span> гүйцэтгэгч байгууллага
        </p>
      </div>

      <form
        className="relative order-3 w-full md:order-2 md:ml-5 md:w-[240px]"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/ajil?q=${encodeURIComponent(q.trim())}` : "/ajil");
        }}
      >
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ажил, компани хайх…"
          aria-label="Ажил хайх"
          className="w-full rounded-lg border border-line bg-surface-2 py-1.5 pr-3 pl-9 text-[12.5px] text-ink placeholder:text-ink-3 hover:border-line-2"
        />
      </form>

      <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
        <label className="flex items-center gap-2 text-[10px] text-ink-3">
          <span className="eyebrow hidden sm:inline">Хяналтын огноо</span>
          <input
            type="date"
            aria-label="Хяналтын огноо"
            className="field"
            value={reviewDateValue}
            min="2026-01-01"
            max="2027-06-30"
            onChange={(e) => applyDate(e.target.value)}
          />
        </label>

        <button
          onClick={() => start(() => refresh())}
          disabled={pending}
          title="Хөдөлгүүрийг ажиллуулж мэдэгдлийг шинэчлэх"
          aria-label="Хөдөлгүүр ажиллуулах"
          className="grid size-8 place-items-center rounded-lg border border-line bg-surface-2 text-ink-3 hover:text-ink disabled:opacity-50"
        >
          <IconRefresh className={`size-4 ${pending ? "animate-spin" : ""}`} />
        </button>

        <ThemeToggle />

        <span className="hidden items-center gap-2 border-l border-line pl-3 lg:flex">
          <span className="grid size-7 place-items-center rounded-lg bg-surface-3 text-[10px] font-semibold text-ink-2">
            НБ
          </span>
          <span className="leading-tight">
            <b className="block text-[11.5px] font-medium">Хяналтын алба</b>
            <small className="block text-[10px] text-ink-3">НБОГ</small>
          </span>
        </span>
      </div>
    </header>
  );
}
