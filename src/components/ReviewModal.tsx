"use client";
import { useEffect, useState } from "react";
import { X, Star, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Participant } from "@/lib/types";

export default function ReviewModal({
  programId,
  me,
  onClose,
  onSubmitted,
}: {
  programId: string;
  me: Participant;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasMediaConsent, setHasMediaConsent] = useState<boolean | null>(null);
  const [agreeMediaNow, setAgreeMediaNow] = useState(false);

  useEffect(() => {
    supabase
      .from("consents")
      .select("agreed")
      .eq("participant_id", me.id)
      .eq("consent_type", "media_optional")
      .order("agreed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHasMediaConsent(data?.agreed ?? false));
  }, [me.id]);

  const needsMediaConsent = !!file && hasMediaConsent === false;
  const canSubmit = rating > 0 && (content.trim() || file) && (!needsMediaConsent || agreeMediaNow);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    if (needsMediaConsent && agreeMediaNow) {
      await supabase.from("consents").insert({ participant_id: me.id, consent_type: "media_optional", agreed: true });
    }

    let imageUrl: string | null = null;
    if (file) {
      const path = `reviews/${programId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) {
        setError("사진 업로드에 실패했어요. 후기만 먼저 등록할게요.");
      } else {
        const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
    }

    const { error: insertErr } = await supabase.from("reviews").insert({
      participant_id: me.id,
      program_id: programId,
      author_name: me.name,
      rating,
      content: content.trim() || null,
      image_url: imageUrl,
    });

    setSaving(false);
    if (insertErr) {
      setError("등록 중 문제가 발생했어요. 다시 시도해주세요.");
      return;
    }
    onSubmitted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base text-ink">사진 · 후기 남기기</h3>
          <button onClick={onClose}><X size={18} className="text-muted" /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium block mb-1.5 text-muted">이 프로그램은 어떠셨나요?</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>
                <Star size={28} fill={n <= rating ? "#E8734A" : "none"} color={n <= rating ? "#E8734A" : "#E3DCC9"} />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium block mb-1.5 text-muted">후기</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="함께한 활동은 어땠는지 남겨주세요."
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm"
          />
        </div>

        <div className="mb-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted mb-1.5 cursor-pointer">
            <Camera size={14} /> 사진 첨부 (선택)
          </label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-xs" />
        </div>

        {needsMediaConsent && (
          <label className="flex items-start gap-2 text-xs text-ink mb-4 mt-2 p-3 rounded-lg bg-sand">
            <input type="checkbox" checked={agreeMediaNow} onChange={(e) => setAgreeMediaNow(e.target.checked)} className="mt-0.5" />
            <span>사진을 프로그램 갤러리에 게시하고, 홍보 목적으로 활용하는 것에 동의합니다. (동의해야 사진을 올릴 수 있어요)</span>
          </label>
        )}

        {error && <p className="text-xs text-coralDark mb-2">{error}</p>}

        <button
          disabled={!canSubmit || saving}
          onClick={submit}
          className="w-full py-3 rounded-xl font-display text-white text-sm bg-coral disabled:opacity-40"
        >
          {saving ? "등록 중..." : "등록하기"}
        </button>
      </div>
    </div>
  );
}
