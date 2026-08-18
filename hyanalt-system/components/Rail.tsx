"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell, IconDashboard, IconList, IconLogout, IconSliders, Mark,
} from "@/components/icons";

const NAV = [
  { href: "/", label: "Хяналтын самбар", Icon: IconDashboard },
  { href: "/ajil", label: "Ажлын жагсаалт", Icon: IconList },
  { href: "/medegdel", label: "Мэдэгдлийн төв", Icon: IconBell },
  { href: "/tohirgoo", label: "Дүрэм, тохиргоо", Icon: IconSliders },
];

export function Rail({ attention }: { attention: number }) {
  const path = usePathname();

  return (
    <aside className="flex flex-none items-center gap-2 border-b border-line px-3 py-2 md:sticky md:top-0 md:h-screen md:w-14 md:flex-col md:gap-2 md:border-r md:border-b-0 md:px-0 md:py-3.5">
      <Link href="/" aria-label="Нүүр" className="grid size-8 place-items-center rounded-lg bg-surface-3 text-accent-2">
        <Mark className="size-4" />
      </Link>

      <nav className="flex items-center gap-1.5 md:mt-3 md:flex-col">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`relative grid size-8 place-items-center rounded-lg ${
                active ? "bg-surface-3 text-ink" : "text-ink-3 hover:bg-surface-2 hover:text-ink-2"
              }`}
            >
              <Icon className="size-4" />
              {href === "/medegdel" && attention > 0 && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-crit" />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        title="Гарах"
        aria-label="Гарах"
        className="ml-auto grid size-8 place-items-center rounded-lg text-ink-3 hover:text-ink-2 md:mt-auto md:ml-0"
      >
        <IconLogout className="size-4" />
      </button>
    </aside>
  );
}
