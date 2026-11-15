"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/browser";

export function useMe() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const c = sb();
    const load = async (session) => {
      if (!session) {
        setMe(null);
        setReady(true);
        return;
      }
      const { data } = await c
        .from("profiles")
        .select("id, nickname, role")
        .eq("id", session.user.id)
        .maybeSingle();
      setMe(data);
      setReady(true);
    };
    c.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = c.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => load(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { me, ready };
}
