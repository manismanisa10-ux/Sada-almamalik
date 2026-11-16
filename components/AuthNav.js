"use client";
import Link from "next/link";
import { sb } from "@/lib/browser";
import { useMe } from "./useMe";
import "../app/social.css";

export default function AuthNav() {
  const { me, ready } = useMe();
  if (!ready) return null;
  if (!me) return <Link href="/auth" className="auth-link">دخول / تسجيل</Link>;
  return (
    <span className="auth-box">
      <Link href={`/profile?u=${encodeURIComponent(me.nickname)}`}>{me.nickname}</Link>
        {me.role === "admin" && <Link href="/admin">الإدارة</Link>}
      <button
        type="button"
        onClick={async () => {
          await sb().auth.signOut();
          location.href = "/";
        }}
      >
        خروج
      </button>
    </span>
  );
    }
