"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "@/components/useMe";
import ChatInput from "@/components/ChatInput";
import Media from "@/components/Media";
import "../chat.css";

const time = (d) => new Date(d).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
const prof = (n) => "/profile?u=" + encodeURIComponent(n);
const preview = (m) =>
  m.kind === "image" ? "🖼️ صورة" : m.kind === "voice" ? "🎤 رسالة صوتية" : m.kind === "sticker" ? m.body : (m.body || "").slice(0, 60);

export default function Messages() {
  const { me, ready } = useMe();
  const [withId, setWithId] = useState(null);
  const [rows, setRows] = useState([]);
  const [convs, setConvs] = useState([]);
  const [names, setNames] = useState({});
  const [thread, setThread] = useState([]);
  const [find, setFind] = useState("");
  const [err, setErr] = useState("");
  const box = useRef(null);

  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("with");
    if (w && /^[0-9a-f-]{36}$/i.test(w)) setWithId(w);
  }, []);

  const loadAll = useCallback(async () => {
    if (!me) return;
    const c = sb();
    const [f, pm] = await Promise.all([
      c.from("friendships").select("id, requester, addressee, status"),
      c.from("private_messages").select("sender, receiver, body, kind, created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const fr = f.data || [];
    setRows(fr);
    const seen = {};
    (pm.data || []).forEach((m) => {
      const other = m.sender === me.id ? m.receiver : m.sender;
      if (!seen[other]) seen[other] = m;
    });
    setConvs(Object.entries(seen).map(([id, last]) => ({ id, last })));
    const ids = new Set(Object.keys(seen));
    fr.forEach((r) => { ids.add(r.requester); ids.add(r.addressee); });
    if (withId) ids.add(withId);
    ids.delete(me.id);
    if (ids.size) {
      const p = await c.from("profiles").select("id, nickname").in("id", [...ids]);
      const m = {};
      (p.data || []).forEach((r) => { m[r.id] = r.nickname; });
      setNames((n) => ({ ...n, ...m }));
    }
  }, [me, withId]);

  const loadThread = useCallback(async () => {
    if (!me || !withId) return;
    const { data, error } = await sb()
      .from("private_messages")
      .select("id, sender, body, kind, media_url, created_at")
      .or(`and(sender.eq.${me.id},receiver.eq.${withId}),and(sender.eq.${withId},receiver.eq.${me.id})`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) { setErr("تعذّر تحميل المحادثة: " + error.message); return; }
    setErr("");
    setThread((data || []).reverse());
  }, [me, withId]);

  useEffect(() => {
    if (!me) return;
    loadAll();
    loadThread();
    const t = setInterval(() => { loadAll(); loadThread(); }, 5000);
    return () => clearInterval(t);
  }, [me, loadAll, loadThread]);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [thread.length]);

  async function send(msg) {
    const { error } = await sb().from("private_messages").insert({ sender: me.id, receiver: withId, ...msg });
    if (error) return /rate/i.test(error.message) ? "انتظر لحظة قبل الإرسال." : "تعذّر الإرسال: " + error.message;
    loadThread();
    loadAll();
    return null;
  }

  async function answer(id, accept) {
    const c = sb();
    if (accept) await c.from("friendships").update({ status: "accepted" }).eq("id", id);
    else await c.from("friendships").delete().eq("id", id);
    loadAll();
  }

  if (!ready) return <section className="wrap"><p>جارٍ التحميل...</p></section>;
  if (!me) {
    return (
      <section className="wrap">
        <h2>الرسائل</h2>
        <p className="msg">للوصول إلى الرسائل <Link href="/auth">سجّل الدخول أو أنشئ حساباً</Link>.</p>
      </section>
    );
  }

  const other = (r) => (r.requester === me.id ? r.addressee : r.requester);
  const incoming = rows.filter((r) => r.status === "pending" && r.addressee === me.id);
  const friends = rows.filter((r) => r.status === "accepted");
  const nick = (id) => names[id] || "عضو";

  if (withId) {
    const isFriend = friends.some((r) => other(r) === withId);
    return (
      <section className="wrap">
        <div className="m-head">
          <h2>{nick(withId)}</h2>
          <div>
            <Link href={prof(nick(withId))} className="m-btn">الملف الشخصي</Link>{" "}
            <button type="button" className="m-btn" onClick={() => { setWithId(null); setThread([]); }}>رجوع</button>
          </div>
        </div>
        {!isFriend ? (
          <p className="msg">لا تستطيع مراسلة هذا العضو قبل أن تصبحا صديقين. افتح <Link href={prof(nick(withId))}>ملفه الشخصي</Link> وأرسل له طلب صداقة.</p>
        ) : (
          <div className="chat">
            <div className="chat-box" ref={box}>
              {thread.length === 0 && !err && <p className="empty">لا توجد رسائل بعد.</p>}
              {thread.map((m) => (
                <div key={m.id} className={m.sender === me.id ? "bub me" : "bub"}>
                  <Media m={m} />
                  <small>{time(m.created_at)}</small>
                </div>
              ))}
            </div>
            {err && <div className="msg" role="alert">{err}</div>}
            <ChatInput userId={me.id} onSend={send} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="wrap">
      <h2>الرسائل والأصدقاء</h2>
      {err && <div className="msg" role="alert">{err}</div>}

      <form className="m-find" onSubmit={(e) => { e.preventDefault(); if (find.trim()) location.href = prof(find.trim()); }}>
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="ابحث عن عضو باسمه المستعار" aria-label="اسم العضو" />
        <button type="submit" className="m-btn">عرض الملف</button>
      </form>

      {incoming.length > 0 && (
        <>
          <h3 className="m-sec">طلبات الصداقة</h3>
          {incoming.map((r) => (
            <div key={r.id} className="m-item">
              <Link href={prof(nick(r.requester))}>{nick(r.requester)}</Link>
              <div>
                <button type="button" onClick={() => answer(r.id, true)}>قبول</button>
                <button type="button" onClick={() => answer(r.id, false)}>رفض</button>
              </div>
            </div>
          ))}
        </>
      )}

      <h3 className="m-sec">المحادثات</h3>
      {convs.length === 0 && <p className="empty">لا توجد محادثات بعد. افتح الملف الشخصي لصديق واضغط «مراسلة».</p>}
      {convs.map((cv) => (
        <div key={cv.id} className="m-item">
          <div style={{ display: "grid" }}>
            <Link href={prof(nick(cv.id))}>{nick(cv.id)}</Link>
            <small>{preview(cv.last)}</small>
          </div>
          <button type="button" onClick={() => setWithId(cv.id)}>فتح</button>
        </div>
      ))}

      <h3 className="m-sec">أصدقائي</h3>
      {friends.length === 0 && <p className="empty">لم تضف أصدقاء بعد.</p>}
      {friends.map((r) => (
        <div key={r.id} className="m-item">
          <Link href={prof(nick(other(r)))}>{nick(other(r))}</Link>
        </div>
      ))}
    </section>
  );
          }
