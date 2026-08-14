"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { CHANNEL_OPTIONS, Program, Participant } from "@/lib/types";
import TopBar from "@/components/TopBar";
import ChipSelect from "@/components/ChipSelect";

function JoinPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const programId = params.get("programId")!;
  const [program, setProgram] = useState<Program | null>(null);
  const [me, setMe] = useState<Participant | null | undefined>(undefined);
  const [channel, setChannel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("programs").select("*").eq("id", programId).single().then(({ data }) => setProgram(data));
    const pid = getStoredParticipantId();
    if (!pid) {
      router.replace(`/signup?next=${encodeURIComponent(`/join?programId=${programId}`)}`);
      return;
    }
    supabase.from("participants").select("*").eq("id", pid).single().then(({ data }) => setMe(data ?? null));
  }, [programId, router]);

  const submit = async () => {
    if (!channel || !me || !program) return;
    setSaving(true);
    setError("");
    const { error: regErr } = await supabase
      .from("registrations")
      .insert({ participant_id: me.id, program_id: program.id, acquisition_channel: channel, status: "applied" });
    if (regErr && !regErr.message.includes("duplicate")) {
      setError("신청 처리 중 문제가 발생했습니다.");
      setSaving(false);
      return;
    }
    setSaving(false);
    router.push(`/programs/${program.id}`);
  };

  if (!program || me === undefined) return null;

  return (
    <div className="pb-24">
      <TopBar title="프로그램 신청" backHref={`/programs/${program.id}`} />
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-seafoam"><CheckCircle2 size={14} /> {me?.name}님으로 신청합니다</div>
        <p className="text-sm text-muted">{program.emoji} {program.title}</p>

        <div>
          <label className="text-xs font-medium block mb-1.5 text-muted">이 프로그램을 어떻게 알게 되었나요?</label>
          <ChipSelect options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
        </div>

        {error && <p className="text-xs text-coralDark">{error}</p>}
        <button disabled={!channel || saving} onClick={submit} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40">
          {saving ? "신청 처리 중..." : "신청 완료하기"}
        </button>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageInner />
    </Suspense>
  );
}
