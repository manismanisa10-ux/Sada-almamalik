"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "@/components/useMe";
import ChatInput from "@/components/ChatInput";
import MessageList from "@/components/MessageList";
import "../chat.css";

export default function GroupChat() {
  const { me, ready } = useMe();
  const [msgs, setMsgs] = useState([]);
  const [names, setNames] = useState({});
  const [err, setErr] = useState("");

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
    <section className="wrap chat-page">
      <div className="chat">
        <div className="chat-head">
          <span className="avatar gicon">👑</span>
          <div className="grow">
            <strong>الدردشة الجماعية</strong>
            <small>لكل أعضاء صدى الممالك</small>
          </div>
        </div>
        <MessageList
          msgs={msgs}
          meId={me.id}
          names={names}
          group
          senderKey="user_id"
          canDelete={(m) => m.user_id === me.id || me.role === "admin"}
          onDelete={remove}
          empty="لا توجد رسائل بعد. ابدأ الحديث."
        />
        {err && <div className="msg" role="alert">{err}</div>}
        <div className="chat-bar">
          <ChatInput userId={me.id} onSend={send} />
        </div>
      </div>
    </section>
  );
}
