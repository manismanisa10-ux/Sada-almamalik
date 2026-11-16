"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/browser";
import "./chapters.css";

export default function Chapters() {
  const [chapters, setChapters] = useState([]);
  const [parts, setParts] = useState([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState("loading");

  useEffect(() => {
    (async () => {
      const c = sb();
      const [a, b] = await Promise.all([
        c.from("chapters").select("id, number, title, cover_url, sort_order, part_id").eq("status", "published"),
        c.from("parts").select("id, title, sort_order"),
      ]);
      if (a.error) { setState("error"); return; }
      setChapters(a.data || []);
      setParts(b.data || []);
      setState("ok");
    })();
  }, []);

  const pm = {};
  parts.forEach((p) => { pm[p.id] = p; });
  const key = (c) => {
    const p = pm[c.part_id];
    return [p ? p.sort_order : 9999, p ? p.id : 0, c.sort_order, c.number];
  };
  const term = q.trim();
  const list = chapters
    .filter((c) => !term || (/^\d+$/.test(term) ? c.number === Number(term) : c.title.includes(term)))
    .sort((a, b) => {
      const x = key(a), y = key(b);
      for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i];
      return 0;
    });

  const groups = [];
  for (const c of list) {
    const title = pm[c.part_id] ? pm[c.part_id].title : "فصول أخرى";
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(c);
    else groups.push({ title, items: [c] });
  }

  return (
    <section className="wrap">
      <h2>الفصول</h2>
      <form className="search" onSubmit={(e) => e.preventDefault()}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بعنوان الفصل أو رقمه" aria-label="بحث في الفصول" />
        <button type="submit">بحث</button>
      </form>

      {state === "loading" && <p className="empty">جارٍ التحميل...</p>}
      {state === "error" && <p className="empty">تعذّر تحميل الفصول. حاول مرة أخرى بعد قليل.</p>}
      {state === "ok" && list.length === 0 && (
        <p className="empty">{term ? "لا توجد فصول تطابق بحثك." : "لم يُنشر أي فصل بعد."}</p>
      )}

      {groups.map((g, i) => (
        <div key={i}>
          <h3 className="part-title">{g.title}</h3>
          {g.items.map((c) => (
            <Link key={c.id} href={"/chapters/" + c.id} className="chap-link">
              <span className="chap-num">{c.number}</span>
              {c.cover_url && <img src={c.cover_url} alt="" loading="lazy" />}
              <span>{c.title}</span>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
        }
