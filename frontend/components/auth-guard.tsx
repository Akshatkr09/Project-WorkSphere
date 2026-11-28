"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!readSession()) router.replace("/login");
    else setReady(true);
  }, [router]);
  if (!ready) return <div className="loading-screen">Loading your workspace…</div>;
  return <>{children}</>;
}
