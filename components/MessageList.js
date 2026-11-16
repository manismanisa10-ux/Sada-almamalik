"use client";
import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import Media from "./Media";
import Avatar, { colorFor } from "./Avatar";

const time = (d) => new Date(d).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
const prof = (n) => "/profile?u=" + encodeURIComponent(n);

function dayLabel(d) {
  const x = new Date(d);
  const t = new Date();
  const y = new Date();
  y.setDate(t.getDate() - 1);
  if (x.toDateString() === t.toDateString()) return "اليوم";
  if (x.toDateString() === y.toDateString()) return "أمس";
  return x.toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" });
}

export default function MessageList({ msgs, meId, names, group, senderKey = "user_id", canDelete, onDelete, empty }) {
  const box = useRef(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const onScroll = () => {
    const el = box.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  const from = (m) => m[senderKey];

  return (
    <div className="chat-box" ref={box} onScroll={onScroll}>
      {msgs.length === 0 && <p className="empty" style={{ textAlign: "center" }}>{empty}</p>}
      {msgs.map((m, i) => {
        const p = msgs[i - 1];
        const n = msgs[i + 1];
        const day = new Date(m.created_at).toDateString();
        const newDay = !p || new Date(p.created_at).toDateString() !== day;
        const first = newDay || from(p) !== from(m);
        const last = !n || new Date(n.created_at).toDateString() !== day || from(n) !== from(m);
        const mine = from(m) === meId;
        const nick = names[from(m)] || "عضو";
        return (
          <Fragment key={m.id}>
            {newDay && <div className="day">{dayLabel(m.created_at)}</div>}
            <div className={"row" + (mine ? " me" : "") + (first ? " first" : "")}>
              {group && !mine && (last ? (
                <Link href={prof(nick)}><Avatar name={nick} /></Link>
              ) : (
                <span className="av-gap" />
              ))}
              <div className={"bubble" + (m.kind === "sticker" ? " sticker" : "")}>
                {group && !mine && first && (
                  <Link href={prof(nick)} className="b-name" style={{ color: colorFor(nick) }}>{nick}</Link>
                )}
                <Media m={m} />
                <span className="b-meta">
                  <span>{time(m.created_at)}</span>
                  {canDelete && canDelete(m) && onDelete && (
                    <button type="button" onClick={() => onDelete(m.id)}>حذف</button>
                  )}
                </span>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
                  }
