"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestVerificationCode, verifyCode } from "@/lib/otp";
import { getStoredParticipantId, setStoredParticipantId } from "@/lib/participant-session";
import { AGE_OPTIONS, RESIDENCE_OPTIONS, CHANNEL_OPTIONS, Program } from "@/lib/types";
import TopBar from "@/components/TopBar";
import ChipSelect from "@/components/ChipSelect";

type Step = "consent" | "phone" | "code" | "details";

function JoinPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const programId = params.get("programId")!;
  const [program, setProgram] = useState<Program | null>(null);

  const [step, setStep] = useState<Step>("consent");
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreeMedia, setAgreeMedia] = useState(false);

  const [phoneRaw, setPhoneRaw] = useState(""); // 숫자만, 예: 01012345678
  const [devCode, setDevCode] = useState(""); // 데모 표시용
  const [codeInput, setCodeInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sending, setSending] = useState(false);

  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [residence, setResidence] = useState("");
  const [channel, setChannel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("programs").select("*").eq("id", programId).single().then(({ data }) => setProgram(data));
    const existingId = getStoredParticipantId();
    if (existingId) {
      supabase.from("participants").select("*").eq("id", existingId).single().then(({ data }) => {
        if (data) {
          setName(data.name);
          setAgeGroup(data.age_group);
          setResidence(data.residence_area);
          if (data.phone_number) {
            setPhoneRaw(data.phone_number);
            setStep("details"); // 이미 인증된 참여자는 인증 단계 생략
          }
        }
      });
    }
  }, [programId]);

  const sendCode = async () => {
    if (phoneRaw.length < 10) { setPhoneError("휴대폰 번호를 정확히 입력해주세요."); return; }
    setSending(true);
    setPhoneError("");
    const res = await requestVerificationCode(phoneRaw);
    setSending(false);
    if ("error" in res) { setPhoneError(res.error); return; }
    setDevCode(res.code);
    setStep("code");
  };

  const confirmCode = async () => {
    const ok = await verifyCode(phoneRaw, codeInput.trim());
    if (!ok) { setPhoneError("인증번호가 일치하지 않거나 만료되었습니다."); return; }
    setPhoneError("");
    setStep("details");
  };

  const canSubmit = name.trim() && ageGroup && residence && channel;

  const submit = async () => {
    if (!canSubmit || !program) return;
    setSaving(true);
    setError("");

    const phone4 = phoneRaw.slice(-4);
    let { data: existing } = await supabase
      .from("participants")
      .select("*")
      .eq("phone_number", phoneRaw)
      .maybeSingle();

    let participantId = existing?.id as string | undefined;

    if (!participantId) {
      const { data: created, error: insertErr } = await supabase
        .from("participants")
        .insert({
          name: name.trim(),
          phone4,
          phone_number: phoneRaw,
          age_group: ageGroup,
          residence_area: residence,
          privacy_consent_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertErr) { setError("등록 중 문제가 발생했습니다. 다시 시도해주세요."); setSaving(false); return; }
      participantId = created.id;
    }

    const { error: regErr } = await supabase
      .from("registrations")
      .insert({ participant_id: participantId, program_id: program.id, acquisition_channel: channel, status: "applied" });
    if (regErr && !regErr.message.includes("duplicate")) {
      setError("신청 처리 중 문제가 발생했습니다.");
      setSaving(false);
      return;
    }

    const consentRows = [
      { participant_id: participantId, consent_type: "privacy_required", agreed: true },
      { participant_id: participantId, consent_type: "operation_required", agreed: true },
      { participant_id: participantId, consent_type: "attendance_required", agreed: true },
      { participant_id: participantId, consent_type: "marketing_optional", agreed: agreeMarketing },
      { participant_id: participantId, consent_type: "media_optional", agreed: agreeMedia },
    ];
    await supabase.from("consents").insert(consentRows);

    setStoredParticipantId(participantId!);
    setSaving(false);
    router.push(`/programs/${program.id}`);
  };

  if (!program) return null;

  return (
    <div className="pb-24">
      <TopBar title="간편 참여 신청" backHref={`/programs/${program.id}`} />

      {/* STEP 1: 개인정보 수집·이용 동의 */}
      {step === "consent" && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted">{program.emoji} {program.title} 신청 전, 개인정보 수집·이용에 동의해주세요.</p>
          <div className="rounded-xl border border-line p-3 bg-white text-xs leading-relaxed text-ink space-y-1">
            <p className="font-medium">수집 항목</p>
            <p className="text-muted">이름(닉네임), 휴대폰 번호, 연령대, 거주지역, 프로그램 인지 경로</p>
            <p className="font-medium mt-2">수집 목적</p>
            <p className="text-muted">프로그램 신청·출석 확인, QR 체크인, 활동 기록(패스포트) 제공, 통계 목적의 운영 분석</p>
            <p className="font-medium mt-2">보유 기간</p>
            <p className="text-muted">신청일로부터 1년 또는 참여자 삭제 요청 시까지</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeRequired} onChange={(e) => setAgreeRequired(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(필수) 개인정보 수집·이용에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeAge} onChange={(e) => setAgreeAge(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(필수) 만 14세 이상이거나, 보호자 동의 하에 신청합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(선택) 프로그램 및 평생학습 정보 수신에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeMedia} onChange={(e) => setAgreeMedia(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(선택) 사진·영상 촬영 및 홍보 활용에 동의합니다.</span>
          </label>
          <button
            disabled={!agreeRequired || !agreeAge}
            onClick={() => setStep("phone")}
            className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40"
          >
            동의하고 계속하기
          </button>
        </div>
      )}

      {/* STEP 2: 휴대폰 인증 - 번호 입력 */}
      {step === "phone" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-navy"><ShieldCheck size={16} /> 휴대폰 본인 인증</div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">휴대폰 번호</label>
            <input
              value={phoneRaw}
              onChange={(e) => setPhoneRaw(e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric"
              placeholder="01012345678"
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          {phoneError && <p className="text-xs text-coralDark">{phoneError}</p>}
          <button disabled={sending} onClick={sendCode} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-navy disabled:opacity-40">
            {sending ? "발송 중..." : "인증번호 받기"}
          </button>
        </div>
      )}

      {/* STEP 3: 인증번호 확인 */}
      {step === "code" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-navy"><ShieldCheck size={16} /> 인증번호 입력</div>
          <div className="rounded-lg bg-seafoamLight text-seafoam text-xs p-3">
            데모 환경에서는 SMS 대신 인증번호를 여기 표시합니다: <span className="font-bold">{devCode}</span>
          </div>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="6자리 인증번호"
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm tracking-widest"
          />
          {phoneError && <p className="text-xs text-coralDark">{phoneError}</p>}
          <button onClick={confirmCode} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral">인증 확인</button>
          <button onClick={() => setStep("phone")} className="w-full text-xs text-muted">번호 다시 입력</button>
        </div>
      )}

      {/* STEP 4: 나머지 정보 + 신청 */}
      {step === "details" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-seafoam"><CheckCircle2 size={14} /> 휴대폰 인증 완료</div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">이름 또는 닉네임</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 송정 김주민" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">연령대</label>
            <ChipSelect options={AGE_OPTIONS} value={ageGroup} onChange={setAgeGroup} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">거주지역</label>
            <ChipSelect options={RESIDENCE_OPTIONS} value={residence} onChange={setResidence} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">이 프로그램을 어떻게 알게 되었나요?</label>
            <ChipSelect options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
          </div>
          {error && <p className="text-xs text-coralDark">{error}</p>}
          <button disabled={!canSubmit || saving} onClick={submit} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40">
            {saving ? "신청 처리 중..." : "신청 완료하기"}
          </button>
        </div>
      )}
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
