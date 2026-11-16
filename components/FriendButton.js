"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import { useMe } from "./useMe";
import "../app/chat.css";

export default function FriendButton({ userId }) {
  const { me, ready } = useMe();
  const [fr, setFr] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await sb()
      .from("friendships")
      .select("id, requester, addressee, status")
      .or(`and(requester.eq.${me.id},addressee.eq.${userId}),and(requester.eq.${userId},addressee.eq.${me.id})`)
      .maybeSingle();
    setFr(data || null);
    setLoaded(true);
  }, [me, userId]);

  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    setMsg("");
    const { error } = await fn(sb());
    if (error) setMsg("تعذّر تنفيذ الطلب: " + error.message);
    await load();
  }

  if (!ready) return null;
  if (!me) return <p className="msg">سجّل الدخول لإضافة أصدقاء ومراسلتهم.</p>;
  if (me.id === userId) return <Link href="/messages" className="m-btn">أصدقائي ورسائلي</Link>;
  if (!loaded) return null;

  let view;
  if (!fr) {
    view = <button type="button" className="m-btn" onClick={() => act((c) => c.from("friendships").insert({ requester: me.id, addressee: userId }))}>إرسال طلب صداقة</button>;
  } else if (fr.status === "pending" && fr.requester === me.id) {
    view = (
      <>
        <span>تم إرسال طلب الصداقة.</span>{" "}
        <button type="button" className="m-btn" onClick={() => act((c) => c.from("friendships").delete().eq("id", fr.id))}>إلغاء الطلب</button>
      </>
    );
  } else if (fr.status === "pending") {
    view = (
      <>
        <button type="button" className="m-btn" onClick={() => act((c) => c.from("friendships").update({ status: "accepted" }).eq("id", fr.id))}>قبول الطلب</button>{" "}
        <button type="button" className="m-btn" onClick={() => act((c) => c.from("friendships").delete().eq("id", fr.id))}>رفض</button>
      </>
    );
  } else {
    view = (
      <>
        <Link href={"/messages?with=" + userId} className="m-btn">مراسلة</Link>{" "}
        <button type="button" className="m-btn" onClick={() => confirm("إزالة من الأصدقاء؟") && act((c) => c.from("friendships").delete().eq("id", fr.id))}>إزالة من الأصدقاء</button>
      </>
    );
  }

  return (
    <div>
      {view}
      {msg && <div className="msg" role="alert">{msg}</div>}
    </div>
  );
      }
