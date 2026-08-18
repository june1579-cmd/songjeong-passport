"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, CheckCircle2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestVerificationCode, verifyCode } from "@/lib/otp";
import { setStoredParticipantId } from "@/lib/participant-session";
import { AGE_OPTIONS, BUSAN_DISTRICTS } from "@/lib/types";
import TopBar from "@/components/TopBar";
import ChipSelect from "@/components/ChipSelect";

type Step = "consent" | "phone" | "code" | "details";

// 실명 형식 가벼운 검증 — 한글 2~5자 또는 영문 이름(공백 포함 2~30자). 숫자·기호·이모지는 허용하지 않는다.
// 주의: 이건 "실제로 그 사람이 맞는지"를 확인하는 신분증 대조 인증은 아니고, 닉네임/숫자조합 등 형식적으로
// 실명이 아닌 입력을 걸러내는 수준이다. 진짜 본인인증은 PASS·NICE 같은 유료 인증 서비스 계약이 필요하다.
function isValidName(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const korean = /^[가-힣]{2,5}$/;
  const english = /^[A-Za-z][A-Za-z\s]{1,29}$/;
  return korean.test(v) || english.test(v);
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/passport";

  const [step, setStep] = useState<Step>("consent");
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreeMedia, setAgreeMedia] = useState(false);

  const [phoneRaw, setPhoneRaw] = useState("");
  const [devCode, setDevCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sending, setSending] = useState(false);

  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [residenceDistrict, setResidenceDistrict] = useState("");
  const [residenceDong, setResidenceDong] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    if (phoneRaw.length < 10) { setPhoneError("휴대폰 번호를 정확히 입력해주세요."); return; }
    setSending(true);
    setPhoneError("");
    const res = await requestVerificationCode(phoneRaw);
    setSending(false);
    if ("error" in res) { setPhoneError(res.error); return; }
    setDevCode(res.demoMode && res.code ? res.code : "");
    setStep("code");
  };

  const confirmCode = async () => {
    const ok = await verifyCode(phoneRaw, codeInput.trim());
    if (!ok) { setPhoneError("인증번호가 일치하지 않거나 만료되었습니다."); return; }
    setPhoneError("");
    setStep("details");
  };

  const isMinor = ageGroup === "10대";
  const canSubmit =
    isValidName(name) && ageGroup && residenceDistrict && residenceDong.trim() &&
    (!isMinor || (isValidName(guardianName) && guardianPhone.replace(/\D/g, "").length >= 10));

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    const phone4 = phoneRaw.slice(-4);
    const { data: existingId } = await supabase.rpc("rpc_check_existing_participant", { p_phone_number: phoneRaw, p_name: name.trim() });
    if (existingId) {
      setStoredParticipantId(existingId as string);
      setSaving(false);
      router.push(next);
      return;
    }

    const { data: newId, error: insertErr } = await supabase.rpc("rpc_create_participant", {
      p_name: name.trim(),
      p_phone4: phone4,
      p_phone_number: phoneRaw,
      p_age_group: ageGroup,
      p_residence_area: `${residenceDistrict} ${residenceDong.trim()}`,
      p_residence_district: residenceDistrict,
      p_residence_dong: residenceDong.trim(),
      p_guardian_name: isMinor ? guardianName.trim() : null,
      p_guardian_phone: isMinor ? guardianPhone.trim() : null,
    });
    if (insertErr) {
      // 아주 드물게 거의 동시에 같은 번호로 가입 시도가 겹친 경우 — 새로 만들지 않고 기존 계정으로 로그인 처리
      if (insertErr.message.includes("duplicate") || insertErr.message.includes("unique")) {
        const { data: retryId } = await supabase.rpc("rpc_check_existing_participant", { p_phone_number: phoneRaw, p_name: name.trim() });
        if (retryId) {
          setStoredParticipantId(retryId as string);
          setSaving(false);
          router.push(next);
          return;
        }
      }
      setError("가입 처리 중 문제가 발생했습니다. 다시 시도해주세요.");
      setSaving(false);
      return;
    }
    if (!newId) { setError("가입 처리 중 문제가 발생했습니다. 다시 시도해주세요."); setSaving(false); return; }

    await supabase.from("consents").insert([
      { participant_id: newId, consent_type: "privacy_required", agreed: true },
      { participant_id: newId, consent_type: "operation_required", agreed: true },
      { participant_id: newId, consent_type: "attendance_required", agreed: true },
      { participant_id: newId, consent_type: "marketing_optional", agreed: agreeMarketing },
      { participant_id: newId, consent_type: "media_optional", agreed: agreeMedia },
    ]);

    setStoredParticipantId(newId as string);
    setSaving(false);
    router.push(next);
  };

  return (
    <div className="pb-24 min-h-screen">
      <TopBar title="회원가입" backHref="/" />

      {step === "consent" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-navy mb-1">
            <UserPlus size={18} />
            <p className="text-sm font-medium">PassUp 가입을 위해 개인정보 수집·이용에 동의해주세요.</p>
          </div>
          <div className="rounded-xl border border-line p-3 bg-white text-xs leading-relaxed text-ink space-y-1">
            <p className="font-medium">수집 항목</p>
            <p className="text-muted">실명, 휴대폰 번호, 연령대, 거주지역</p>
            <p className="font-medium mt-2">수집 목적</p>
            <p className="text-muted">본인 확인, 프로그램 신청·출석 확인, 활동 기록(패스포트) 제공, 통계 목적의 운영 분석</p>
            <p className="font-medium mt-2">보유 기간</p>
            <p className="text-muted">가입일로부터 1년 또는 회원 탈퇴(삭제 요청) 시까지</p>
          </div>
          <Link href="/privacy" target="_blank" className="block text-xs text-navy underline">
            개인정보처리방침 전문 보기 →
          </Link>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeRequired} onChange={(e) => setAgreeRequired(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(필수) 개인정보 수집·이용에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeAge} onChange={(e) => setAgreeAge(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(필수) 만 14세 이상이거나, 만 14세 미만인 경우 보호자 정보를 제공하고 가입합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(선택) 프로그램 및 평생학습 정보 수신에 동의합니다.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreeMedia} onChange={(e) => setAgreeMedia(e.target.checked)} className="mt-0.5" />
            <span className="text-ink">(선택) 사진·영상 촬영 및 홍보 활용에 동의합니다. (프로그램 갤러리에 사진을 직접 올리려면 필요해요)</span>
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

      {step === "phone" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-navy"><ShieldCheck size={16} /> 휴대폰 번호 확인</div>
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

      {step === "code" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-navy"><ShieldCheck size={16} /> 인증번호 입력</div>
          {devCode ? (
            <div className="rounded-lg bg-seafoamLight text-seafoam text-xs p-3">
              데모 환경에서는 SMS 대신 인증번호를 여기 표시합니다: <span className="font-bold">{devCode}</span>
            </div>
          ) : (
            <p className="text-xs text-muted">문자로 보내드린 6자리 인증번호를 입력해주세요.</p>
          )}
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

      {step === "details" && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-seafoam"><CheckCircle2 size={14} /> 휴대폰 번호 확인 완료</div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">실명</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김주민" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
            <p className="text-[11px] text-muted mt-1">실제 신분증에 적힌 이름을 정확히 입력해주세요. 닉네임은 사용할 수 없어요.</p>
            {name.trim() && !isValidName(name) && (
              <p className="text-[11px] text-coralDark mt-1">한글 또는 영문 실명만 입력할 수 있어요 (숫자·기호·이모지 불가).</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">연령대</label>
            <ChipSelect options={AGE_OPTIONS} value={ageGroup} onChange={setAgeGroup} />
          </div>
          {isMinor && (
            <div className="rounded-xl border border-line bg-sand p-3 space-y-3">
              <p className="text-xs font-medium text-navy">미성년자 가입 안내</p>
              <p className="text-[11px] text-muted -mt-2">보호자님의 이름과 연락처를 알려주세요. 프로그램 관련 안내에 활용됩니다.</p>
              <div>
                <label className="text-xs font-medium block mb-1.5 text-muted">보호자 이름</label>
                <input
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="예: 김보호"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5 text-muted">보호자 연락처</label>
                <input
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  inputMode="numeric"
                  placeholder="01012345678"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">거주 구/군</label>
            <select
              value={residenceDistrict}
              onChange={(e) => setResidenceDistrict(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
            >
              <option value="">선택해주세요</option>
              {BUSAN_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">거주 동/읍/면</label>
            <input
              value={residenceDong}
              onChange={(e) => setResidenceDong(e.target.value)}
              placeholder="예: 송정동"
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-xs text-coralDark">{error}</p>}
          <button disabled={!canSubmit || saving} onClick={submit} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40">
            {saving ? "가입 처리 중..." : "가입 완료하기"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
