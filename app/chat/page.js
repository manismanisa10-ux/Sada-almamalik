"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "@/components/useMe";
import ChatInput from "@/components/ChatInput";
import Media from "@/components/Media";
import "../chat.css";

const time = (d) => new Date(d).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });

export default function GroupChat() {
  const { me, ready } = useMe();
  const [msgs, setMsgs] = useState([]);
  const [names, setNames] = useState({});
  const [err, setErr] = useState("");
  const box = useRef(null);

  const load = useCallback(async () => {
    const c = sb();
    const { data, error } = await c
      .from("group_messages")
      .select("id, user_id, body, kind, media_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) { setErr("تعذّر تحميل الدردشة: " + error.message); return; }
    setErr("");
    const list = (data || []).reverse();
    const ids = [...new Set(list.map((m) => m.user_id))];
    if (ids.length) {
      const p = await c.from("profiles").select("id, nickname").in("id", ids);
      const m = {};
      (p.data || []).forEach((r) => { m[r.id] = r.nickname; });
      setNames((n) => ({ ...n, ...m }));
    }
    setMsgs(list);
  }, []);

  useEffect(() => {
    if (!me) return;
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [me, load]);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs.length]);

  async function send(msg) {
    const { error } = await sb().from("group_messages").insert({ user_id: me.id, ...msg });
    if (error) return /rate/i.test(error.message) ? "انتظر لحظة قبل الإرسال." : "تعذّر الإرسال: " + error.message;
    load();
    return null;
  }

  async function remove(id) {
    if (!confirm("حذف هذه الرسالة؟")) return;
    await sb().from("group_messages").delete().eq("id", id);
    load();
  }

  if (!ready) return <section className="wrap"><p>جارٍ التحميل...</p></section>;
  if (!me) {
    return (
      <section className="wrap">
        <h2>الدردشة الجماعية</h2>
        <p className="msg">للدخول إلى الدردشة <Link href="/auth">سجّل الدخول أو أنشئ حساباً</Link>.</p>
      </section>
    );
  }

  return (
    <section className="wrap">
      <h2>الدردشة الجماعية</h2>
      <div className="chat">
        <div className="chat-box" ref={box}>
          {msgs.length === 0 && !err && <p className="empty">لا توجد رسائل بعد. ابدأ الحديث.</p>}
          {msgs.map((m) => {
            const nick = names[m.user_id] || "قارئ";
            return (
              <div key={m.id} className={m.user_id === me.id ? "bub me" : "bub"}>
                <small>
                  <Link href={"/profile?u=" + encodeURIComponent(nick)}>{nick}</Link>
                  <span>{time(m.created_at)}</span>
                  {(m.user_id === me.id || me.role === "admin") && (
                    <button type="button" onClick={() => remove(m.id)}>حذف</button>
                  )}
                </small>
                <Media m={m} />
              </div>
            );
          })}
        </div>
        {err && <div className="msg" role="alert">{err}</div>}
        <ChatInput userId={me.id} onSend={send} />
      </div>
    </section>
  );
        }
