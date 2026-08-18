/**
 * Мэдэгдлийг гадагш хүргэх сувгууд.
 *
 * Тохируулга (.env.local):
 *   NOTIFY_WEBHOOK_URL  — мэдэгдэл бүрийг JSON хэлбэрээр илгээх хаяг (Teams, Slack, дотоод API)
 *   RESEND_API_KEY      — и-мэйл илгээх түлхүүр (https://resend.com)
 *   NOTIFY_FROM         — илгээгчийн и-мэйл хаяг
 *   NOTIFY_INBOX        — туршилтын үед бүх и-мэйлийг хүлээн авах нэг хаяг
 *
 * Аль нь ч тохируулагдаагүй бол мэдэгдэл системд бүртгэгдэж, серверийн лог руу бичигдэнэ.
 */
import type { Notification } from "./types";

async function postWebhook(n: Notification): Promise<boolean> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule: n.rule,
        subject: n.subject,
        body: n.body,
        recipients: n.recipients.map((r) => `${r.name} — ${r.role}`),
        dueOn: n.dueOn,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[notify] webhook алдаа:", err);
    return false;
  }
}

async function sendEmail(n: Notification): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_INBOX;
  const from = process.env.NOTIFY_FROM;
  if (!key || !to || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: n.subject,
        text: `${n.body}\n\n— Хүлээн авагчид: ${n.recipients.map((r) => r.name).join(", ")}`,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[notify] и-мэйл алдаа:", err);
    return false;
  }
}

/** Мэдэгдлүүдийг хүргэж, delivered талбарыг тэмдэглэнэ */
export async function deliver(notifications: Notification[]): Promise<number> {
  let ok = 0;
  for (const n of notifications) {
    const results = await Promise.all([postWebhook(n), sendEmail(n)]);
    n.delivered = results.some(Boolean);
    if (n.delivered) ok++;
    console.log(
      `[мэдэгдэл] ${n.dueOn} · ${n.rule} · ${n.subject} → ${n.recipients.map((r) => r.name).join(", ")}` +
        (n.delivered ? "" : " (суваг тохируулаагүй — зөвхөн системд бүртгэв)"),
    );
  }
  return ok;
}
