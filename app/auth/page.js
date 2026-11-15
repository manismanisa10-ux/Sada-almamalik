"use client";
import { useState } from "react";
import { sb } from "@/lib/browser";
import "../social.css";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const c = sb();
    try {
      if (mode === "register") {
        const n = nick.trim();
        if (n.length < 3 || n.length > 24) throw new Error("الاسم المستعار يجب أن يكون بين 3 و24 حرفاً.");
        if (password.length < 8) throw new Error("كلمة المرور يجب ألا تقل عن 8 أحرف.");
        const { data: taken } = await c.from("profiles").select("id").eq("nickname", n).maybeSingle();
        if (taken) throw new Error("هذا الاسم المستعار مستخدم، اختر اسماً آخر.");
        const { data, error } = await c.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nickname: n } },
        });
        if (error) {
          if (/registered/i.test(error.message)) throw new Error("هذا البريد مسجّل مسبقاً.");
          throw new Error("تعذّر إنشاء الحساب: " + error.message);
        }
        if (!data.session) {
          setMsg("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.");
          setBusy(false);
          return;
        }
        location.href = "/";
      } else {
        const { error } = await c.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error("البريد أو كلمة المرور غير صحيحة.");
        location.href = "/";
      }
    } catch (err) {
      setMsg(err.message);
    }
    setBusy(false);
  }

  return (
    <section className="wrap">
      <h2>{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</h2>
      <div className="tabs">
        <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>دخول</button>
        <button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>حساب جديد</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "register" && (
          <label>الاسم المستعار
            <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} required />
          </label>
        )}
        <label>البريد الإلكتروني
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>كلمة المرور
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
        </label>
        {msg && <div className="msg" role="alert">{msg}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "لحظة..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
        </button>
      </form>
    </section>
  );
          }
