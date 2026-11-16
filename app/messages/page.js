"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "@/components/useMe";
import ChatInput from "@/components/ChatInput";
import MessageList from "@/components/MessageList";
import Avatar from "@/components/Avatar";
import "../chat.css";

const prof = (n) => "/profile?u=" + encodeURIComponent(n);
const preview = (m) =>
  m.kind === "image" ? "🖼️ صورة" : m.kind === "voice" ? "🎤 رسالة صوتية" : m.kind === "video" ? "🎬 فيديو" : m.kind === "sticker" ? m.body : (m.body || "").slice(0, 60);
const stamp = (d) => {
  const x = new Date(d);
  return x.toDateString() === new Date().toDateString()
    ? x.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
    : x.toLocaleDateString("ar", { day: "numeric", month: "short" });
};

export default function Messages() {
  const { me, ready } = useMe();
  const [withId, setWithId] = useState(null);
  const [rows, setRows] = useState([]);
  const [convs, setConvs] = useState([]);
  const [names, setNames] = useState({});
  const [thread, setThread] = useState([]);
  const [find, setFind] = useState("");
  const [err, setErr] = useState("");

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

  async function send(msg) {
    const { error } = await sb().from("private_messages").insert({ sender: me.id, receiver: withId, ...msg });
    if (error) return /rate/i.test(error.message) ? "انتظر لحظة قبل الإرسال." : "تعذّر الإرسال: " + error.message;
    loadThread();
    loadAll();
    return null;
  }

  async function remove(id) {
    if (!confirm("حذف هذه الرسالة؟")) return;
    await sb().from("private_messages").delete().eq("id", id);
    loadThread();
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
      <section className="wrap chat-page">
        <div className="chat">
          <div className="chat-head">
            <button type="button" className="h-btn" onClick={() => { setWithId(null); setThread([]); }}>رجوع</button>
            <Avatar name={nick(withId)} size={40} />
            <div className="grow"><strong>{nick(withId)}</strong></div>
            <Link href={prof(nick(withId))} className="h-btn">الملف الشخصي</Link>
          </div>
          {!isFriend ? (
            <div className="chat-box">
              <p className="msg">لا تستطيع مراسلة هذا العضو قبل أن تصبحا صديقين. افتح <Link href={prof(nick(withId))}>ملفه الشخصي</Link> وأرسل له طلب صداقة.</p>
            </div>
          ) : (
            <>
              <MessageList
                msgs={thread}
                meId={me.id}
                names={names}
                group
                senderKey="sender"
                canDelete={(m) => m.sender === me.id}
                onDelete={remove}
                empty="لا توجد رسائل بعد."
              />
              {err && <div className="msg" role="alert">{err}</div>}
              <div className="chat-bar">
                <ChatInput userId={me.id} onSend={send} />
              </div>
            </>
          )}
        </div>
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
              <span className="who">
                <Avatar name={nick(r.requester)} />
                <Link href={prof(nick(r.requester))}>{nick(r.requester)}</Link>
              </span>
              <div className="acts">
                <button type="button" onClick={() => answer(r.id, true)}>قبول</button>
                <button type="button" onClick={() => answer(r.id, false)}>رفض</button>
              </div>
            </div>
          ))}
        </>
      )}

      <h3 className="m-sec">المحادثات</h3>
      {convs.length === 0 ? (
        <p className="empty">لا توجد محادثات بعد. افتح الملف الشخصي لصديق واضغط «مراسلة».</p>
      ) : (
        <div className="list-box">
          {convs.map((cv) => (
            <button key={cv.id} type="button" className="conv" onClick={() => setWithId(cv.id)}>
              <Avatar name={nick(cv.id)} size={46} />
              <span className="conv-main">
                <strong>{nick(cv.id)}</strong>
                <small
              </span>
              <span className="conv-time">{stamp(cv.last.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      <h3 className="m-sec">أصدقائي</h3>
      {friends.length === 0 && <p className="empty">لم تضف أصدقاء بعد.</p>}
      {friends.map((r) => (
        <div key={r.id} className="m-item">
          <span className="who">
            <Avatar name={nick(other(r))} />
            <Link href={prof(nick(other(r)))}>{nick(other(r))}</Link>
          </span>
          <div className="acts">
            <button type="button" onClick={() => setWithId(other(r))}>مراسلة</button>
          </div>
        </div>
      ))}
    </section>
  );
                  }
