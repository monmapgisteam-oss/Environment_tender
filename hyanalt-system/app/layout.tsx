import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import { Rail } from "@/components/Rail";
import { TopBar } from "@/components/TopBar";
import { readDB, reviewDate } from "@/lib/db";
import { buildViews } from "@/lib/escalation";

const display = Unbounded({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "600"],
  variable: "--f-display",
});
const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--f-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--f-mono",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Гүйцэтгэлийн хянагч",
  description: "Гэрээт ажлын үе шатны хугацаа, шатлан мэдээллэх хяналтын систем",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await readDB();
  const asOf = reviewDate(db.settings);
  const views = buildViews(db, asOf);
  const attention = views.filter((v) => v.status === "level2" || v.status === "level3").length;

  return (
    <html lang="mn" data-theme="dark" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Хадгалсан горимыг зурахаас өмнө тавина — эхний хормын анивчилтаас сэргийлнэ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("hyanalt-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`,
          }}
        />
      </head>
      <body>
        {/* Өргөн дэлгэцэд бүх мэдээлэл нэг дэлгэцэд багтана — хуудас өөрөө гүйхгүй.
            Нарийн дэлгэцэд багануудаас доош бууж, хэвийн гүйлгэлт болно. */}
        <div className="flex min-h-screen flex-col md:flex-row xl:h-screen xl:overflow-hidden">
          <Rail attention={attention} />
          <div className="flex min-w-0 flex-1 flex-col xl:overflow-hidden">
            <TopBar client={db.program.client} companies={db.companies.length} reviewDate={asOf} />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
