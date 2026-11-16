"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "./useMe";
import "../app/social.css";

const fmt = (d) => new Date(d).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });

export default function Comments({ chapterId }) {
  const { me, ready } = useMe();
  const [items, setItems] = useState([]);
  const [names, setNames] = useState({});
  const [likes, setLikes] = useState([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const c = sb();
    const { data, error } = await c
      .from("comments")
      .select("id, body, created_at, parent_id, user_id")
      .eq("chapter_id", chapterId)
      .order("created_at");
    if (error) { setErr("تعذّر تحميل التعليقات: " + error.message); setLoaded(true); return; }
    const list = data || [];
    setItems(list);
    if (list.length) {
      const ids = [...new Set(list.map((x) => x.user_id))];
      const [p, l] = await Promise.all([
        c.from("profiles").select("id, nickname").in("id", ids),
        c.from("comment_likes").select("comment_id, user_id").in("comment_id", list.map((x) => x.id)),
      ]);
      const m = {};
      (p.data || []).forEach((r) => { m[r.id] = r.nickname; });
      setNames(m);
      setLikes(l.data || []);
    } else {
      setLikes([]);
    }
    setLoaded(true);
  }, [chapterId]);

  useEffect(() => { load(); }, [load]);

  async function send(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > 2000) { setErr("التعليق أطول من 2000 حرف."); return; }
    setBusy(true);
    setErr("");
    const { error } = await sb()
      .from("comments")
      .insert({ chapter_id: chapterId, user_id: me.id, parent_id: replyTo, body: text });
    if (error) setErr(/rate/i.test(error.message) ? "انتظر لحظات قبل إرسال تعليق آخر." : "تعذّر إرسال التعليق: " + error.message);
    else { setBody(""); setReplyTo(null); await load(); }
    setBusy(false);
  }

  async function like(id) {
    if (!me) return;
    const c = sb();
    const has = likes.some((l) => l.comment_id === id && l.user_id === me.id);
    if (has) await c.from("comment_likes").delete().eq("comment_id", id).eq("user_id", me.id);
    else await c.from("comment_likes").insert({ comment_id: id, user_id: me.id });
    load();
  }

  async function remove(id) {
    if (!confirm("حذف هذا التعليق؟")) return;
    await sb().from("comments").delete().eq("id", id);
    load();
  }

  const row = (c, isReply) => {
    const n = likes.filter((l) => l.comment_id === c.id).length;
    const mine = me && likes.some((l) => l.comment_id === c.id && l.user_id === me.id);
    const nick = names[c.user_id] || "قارئ";
    return (
      <div key={c.id} className={isReply ? "c-item reply" : "c-item"}>
        <div className="c-meta">
          <Link href={"/profile?u=" + encodeURIComponent(nick)}>{nick}</Link>
          <small>{fmt(c.created_at)}</small>
        </div>
        <p className="c-body">{c.body}</p>
        <div className="c-actions">
          <button type="button" className={mine ? "liked" : ""} disabled={!me} onClick={() => like(c.id)}>
            إعجاب ({n})
          </button>
          {me && <button type="button" onClick={() => setReplyTo(c.parent_id || c.id)}>رد</button>}
          {me && (me.id === c.user_id || me.role === "admin") && (
            <button type="button" onClick={() => remove(c.id)}>حذف</button>
          )}
        </div>
      </div>
    );
  };

  const roots = items.filter((c) => !c.parent_id);

  return (
    <section className="c-wrap">
      <h2>التعليقات ({items.length})</h2>

      {ready && !me && (
        <p className="msg">لقراءة التعليقات لا تحتاج حساباً، أما للتعليق والتفاعل فـ <Link href="/auth">سجّل الدخول أو أنشئ حساباً</Link>.</p>
      )}

      {me && (
        <form className="c-form" onSubmit={send}>
          {replyTo && (
            <div className="msg">
              أنت ترد على تعليق. <button type="button" onClick={() => setReplyTo(null)}>إلغاء الرد</button>
            </div>
          )}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="اكتب تعليقك" aria-label="تعليقك" />
          <button className="btn" type="submit" disabled={busy}>{busy ? "جارٍ الإرسال..." : "إرسال التعليق"}</button>
        </form>
      )}

      {err && <div className="msg" role="alert">{err}</div>}
      {loaded && roots.length === 0 && !err && <p className="empty">لا توجد تعليقات بعد. كن أول من يعلّق.</p>}
      {roots.map((r) => (
        <div key={r.id}>
          {row(r, false)}
          {items.filter((x) => x.parent_id === r.id).map((x) => row(x, true))}
        </div>
      ))}
    </section>
  );
  }
