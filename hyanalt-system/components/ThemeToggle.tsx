"use client";

import { useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@/components/icons";

type Theme = "dark" | "light";

/** Сонголтыг хөтөч дээр хадгална — layout доторх скрипт үүнийг зурахаас өмнө уншина */
const STORAGE_KEY = "hyanalt-theme";
const EVENT = "hyanalt-theme-change";

/** Горим нь DOM дээр (html[data-theme]) байрлах тул гадаад төлөв болгон уншина */
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, getSnapshot, () => "dark");

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // хувийн горимд бичих боломжгүй бол сонголт зөвхөн энэ хуудсанд үйлчилнэ
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Гэрэл горим руу шилжих" : "Харанхуй горим руу шилжих"}
      aria-label="Дэлгэцийн горим солих"
      className="grid size-8 place-items-center rounded-lg border border-line bg-surface-2 text-ink-3 hover:text-ink"
    >
      {theme === "dark" ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
    </button>
  );
}
