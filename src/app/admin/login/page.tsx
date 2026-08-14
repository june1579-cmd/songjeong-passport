"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setErr("비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-navy">
      <Lock size={32} className="text-white mb-3" />
      <h2 className="font-display text-lg text-white mb-1">운영자 로그인</h2>
      <p className="text-xs text-white/60 mb-6">비밀번호는 서버에서만 확인되며 화면(브라우저 코드)에 노출되지 않습니다.</p>
      <input
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        type="password"
        placeholder="비밀번호"
        autoFocus
        className="w-full max-w-xs rounded-lg px-3 py-2.5 text-sm mb-3"
      />
      {err && <p className="text-xs mb-2 text-coral">{err}</p>}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full max-w-xs py-3 rounded-xl font-display text-white text-sm bg-coral disabled:opacity-50"
      >
        {loading ? "확인 중..." : "입장하기"}
      </button>
    </div>
  );
}
