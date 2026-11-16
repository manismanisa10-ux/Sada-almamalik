"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import "../app/feed.css";

export default function NotifBell({ userId }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const run = async () => {
      const { data } = await sb().rpc("unread_count");
      if (alive && typeof data === "number") setN(data);
    };
    run();
    const t = setInterval(run, 15000);
    window.addEventListener("notif-seen", run);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("notif-seen", run);
    };
  }, [userId]);

  return (
    <Link href="/notifications" className="bell" aria-label="الإشعارات">
      🔔{n > 0 && <span className="bell-dot">{n > 9 ? "9+" : n}</span>}
    </Link>
  );
}
