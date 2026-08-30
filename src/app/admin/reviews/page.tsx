"use client";
import { useEffect, useState } from "react";
import { Star, Trash2, Save } from "lucide-react";
import { Review, Program } from "@/lib/types";

interface ReviewWithProgram extends Review {
  program: Pick<Program, "id" | "emoji" | "title"> | null;
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "요청 실패");
  return res.json();
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithProgram[]>([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ content: string; rating: number }>({ content: "", rating: 5 });

  const load = async () => {
    try {
      const { reviews: data } = await api("/api/admin/reviews");
      setReviews(data ?? []);
    } catch (e: any) {
      setError(e.message ?? "불러오기에 실패했습니다.");
    }
  };
  useEffect(() => { load(); }, []);

  const startEdit = (r: ReviewWithProgram) => {
    setEditingId(r.id);
    setDraft({ content: r.content ?? "", rating: r.rating ?? 5 });
  };

  const saveEdit = async (id: string) => {
    try {
      await api("/api/admin/reviews", { method: "PATCH", body: JSON.stringify({ id, patch: draft }) });
      setEditingId(null);
      load();
    } catch (e: any) {
      setError(e.message ?? "수정 중 문제가 발생했습니다.");
    }
  };

  const remove = async (r: ReviewWithProgram) => {
    if (!window.confirm(`"${r.author_name}"님의 후기를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await api("/api/admin/reviews", { method: "DELETE", body: JSON.stringify({ id: r.id }) });
      load();
    } catch (e: any) {
      setError(e.message ?? "삭제 중 문제가 발생했습니다.");
    }
  };

  return (
    <div className="p-4 pb-16">
      <h1 className="font-display text-lg text-navy mb-1">후기 관리</h1>
      <p className="text-xs text-muted mb-4">참여자 후기를 수정하거나 삭제할 수 있어요.</p>
      {error && <p className="text-xs text-coralDark mb-2">{error}</p>}

      <div className="space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-muted">
                {r.program ? `${r.program.emoji ?? ""} ${r.program.title}` : "프로그램 정보 없음"} · {r.author_name}
              </p>
              <p className="text-[10px] text-muted">{new Date(r.created_at).toLocaleDateString("ko-KR")}</p>
            </div>

            {editingId === r.id ? (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setDraft({ ...draft, rating: n })}>
                      <Star size={20} fill={n <= draft.rating ? "#E8734A" : "none"} color={n <= draft.rating ? "#E8734A" : "#E3DCC9"} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  rows={3}
                  className="w-full border border-line rounded-lg px-2.5 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(r.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-coral text-white text-xs font-medium">
                    <Save size={13} /> 저장
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 rounded-lg border border-line text-xs text-muted">취소</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={13} fill={n <= (r.rating ?? 0) ? "#E8734A" : "none"} color={n <= (r.rating ?? 0) ? "#E8734A" : "#E3DCC9"} />
                  ))}
                </div>
                {r.content && <p className="text-sm text-ink leading-relaxed">{r.content}</p>}
                {r.image_url && <img src={r.image_url} alt="" className="w-full h-32 object-cover rounded-lg border border-line mt-2" />}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => startEdit(r)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-line text-navy">수정</button>
                  <button onClick={() => remove(r)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-line text-coralDark flex items-center gap-1">
                    <Trash2 size={12} /> 삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-xs text-muted px-1">등록된 후기가 없습니다.</p>}
      </div>
    </div>
  );
}
