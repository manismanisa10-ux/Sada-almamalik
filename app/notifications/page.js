"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "@/components/useMe";
import "../feed.css";
import "../chat.css";

const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

function when(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "الآن";
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  if (s < 604800) return rtf.format(-Math.floor(s / 86400), "day");
  return new Date(d).toLocaleDateString("ar", { day: "numeric", month: "long" });
}

const ICON = { message: "💬", friend_request: "👥", friend_accept: "🤝", comment: "💭", chapter: "📜" };

export default function Notifications() {
  const { me, ready } = useMe();
  const [items, setItems] = useState([]);
  const [names, setNames] = useState({});
  const [seen, setSeen] = useState(null);
  const [state, setState] = useState("loading");
  const uid = me && me.id;

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const c = sb();
      const [n, s] = await Promise.all([
        c.from("notifications").select("id, actor, kind, ref, body, created_at").order("created_at", { ascending: false }).limit(50),
        c.from("notif_state").select("seen_at").maybeSingle(),
      ]);
      if (n.error) { setState("error"); return; }
      const list = (n.data || []).filter((x) => x.actor !== uid);
      const ids = [...new Set(list.map((x) => x.actor).filter(Boolean))];
      if (ids.length) {
        const p = await c.from("profiles").select("id, nickname").in("id", ids);
        const m = {};
        (p.data || []).forEach((r) => { m[r.id] = r.nickname; });
        setNames(m);
      }
      setSeen(s.data ? new Date(s.data.seen_at).getTime() : 0);
      setItems(list);
      setState("ok");
      await c.rpc("mark_notifs_seen");
      window.dispatchEvent(new Event("notif-seen"));
    })();
  }, [uid]);

  if (!ready) return <section className="wrap"><p>جارٍ التحميل...</p></section>;
  if (!me) {
    return (
      <section className="wrap">
        <h2>الإشعارات</h2>
        <p className="msg">لعرض الإشعارات <Link href="/auth">سجّل الدخول أو أنشئ حساباً</Link>.</p>
      </section>
    );
  }

  const nm = (n) => names[n.actor] || "عضو";
  const text = (n) => {
    if (n.kind === "chapter") return n.body || "نُشر فصل جديد";
    if (n.kind === "message") return nm(n) + " أرسل لك رسالة";
    if (n.kind === "friend_request") return nm(n) + " أرسل لك طلب صداقة";
    if (n.kind === "friend_accept") return nm(n) + " قبل طلب صداقتك";
    if (n.kind === "comment") return nm(n) + " علّق على منشورك";
    return "";
  };
  const href = (n) => {
    if (n.kind === "chapter") return "/chapters/" + n.ref;
    if (n.kind === "message") return "/messages?with=" + n.actor;
    if (n.kind === "friend_request") return "/messages";
    if (n.kind === "friend_accept") return "/profile?u=" + encodeURIComponent(nm(n));
    return "/profile?u=" + encodeURIComponent(me.nickname);
  };

  return (
    <section className="wrap">
      <h2>الإشعارات</h2>
      {state === "loading" && <p className="empty">جارٍ التحميل...</p>}
      {state === "error" && <p className="empty">تعذّر تحميل الإشعارات.</p>}
      {state === "ok" && items.length === 0 && <p className="empty">لا توجد إشعارات بعد.</p>}
      {items.map((n) => (
        <Link key={n.id} href={href(n)} className={"n-item" + (new Date(n.created_at).getTime() > seen ? " new" : "")}>
          <span className="n-ico">{ICON[n.kind] || "🔔"}</span>
          <span className="n-main">
            <strong>{text(n)}</strong>
            <small>{when(n.created_at)}</small>
          </span>
        </Link>
      ))}
    </section>
  );
        }
