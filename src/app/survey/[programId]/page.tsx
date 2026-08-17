"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { INTEREST_OPTIONS, REVISIT_OPTIONS, Program } from "@/lib/types";
import TopBar from "@/components/TopBar";
import ChipSelect from "@/components/ChipSelect";

export default function SurveyPage() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [next, setNext] = useState<Program | null>(null);
  const [satisfaction, setSatisfaction] = useState(0);
  const [revisit, setRevisit] = useState("");
  const [interest, setInterest] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from("programs").select("*").eq("id", programId).single().then(({ data }) => setProgram(data));
  }, [programId]);

  const canSubmit = satisfaction > 0 && revisit && interest;

  const submit = async () => {
    const pid = getStoredParticipantId();
    if (!canSubmit || !pid || !program) return;
    setSaving(true);
    await supabase.from("surveys").insert({
      participant_id: pid,
      program_id: program.id,
      satisfaction,
      revisit_intention: revisit,
      next_interest: interest,
    });
    if (program.next_program_id) {
      const { data: n } = await supabase.from("programs").select("*").eq("id", program.next_program_id).single();
      setNext(n);
    }
    setSaving(false);
    setSubmitted(true);
  };

  if (!program) return null;

  if (submitted) {
    return (
      <div className="pb-24 flex flex-col items-center px-6 pt-16 text-center min-h-screen">
        <Sparkles size={36} className="text-coral mb-4" />
        <h2 className="font-display text-lg mb-8 text-ink">참여해주셔서 감사합니다!</h2>
        {next ? (
          <>
            <p className="text-sm mb-4 text-muted">"{program.next_teaser}"</p>
            <button
              onClick={() => router.push(`/programs/${next.id}`)}
              className="w-full rounded-2xl border border-line p-4 flex items-center gap-3 text-left bg-white"
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0 w-12 h-12 bg-sand text-2xl">{next.emoji}</div>
              <div className="flex-1">
                <div className="font-display text-sm text-ink">{next.title}</div>
              </div>
              <ArrowRight size={18} className="text-coral" />
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">PassUp의 모든 여정을 완주하셨습니다. 🎉</p>
        )}
        <button onClick={() => router.push("/passport")} className="mt-8 text-sm font-medium text-navy">
          내 패스포트 보기 →
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <TopBar title="만족도 조사" backHref={`/programs/${program.id}`} />
      <div className="p-4 space-y-5">
        <div>
          <label className="text-xs font-medium block mb-1.5 text-muted">오늘 프로그램은 어떠셨나요?</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setSatisfaction(n)}>
                <Star size={30} fill={n <= satisfaction ? "#EC7A4E" : "none"} color={n <= satisfaction ? "#EC7A4E" : "#E4D8C2"} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-muted">다음에도 참여하고 싶나요?</label>
          <ChipSelect options={REVISIT_OPTIONS} value={revisit} onChange={setRevisit} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5 text-muted">송정에서 다음에 배우고 싶은 것은?</label>
          <ChipSelect options={INTEREST_OPTIONS} value={interest} onChange={setInterest} />
        </div>
        <button
          disabled={!canSubmit || saving}
          onClick={submit}
          className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40"
        >
          {saving ? "제출 중..." : "제출하기"}
        </button>
      </div>
    </div>
  );
}
