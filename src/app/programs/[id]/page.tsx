"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Users, CreditCard, QrCode, CheckCircle2, Images, ListChecks, Star, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { Program, Session, Participant, Registration, Attendance, Photo, Review, APPLICATION_STATUS_LABEL } from "@/lib/types";
import { computeCardStatus, remainingSpots } from "@/lib/program-status";
import { categoryColor } from "@/lib/category-colors";
import TopBar from "@/components/TopBar";
import Pill from "@/components/Pill";
import StatusBadge from "@/components/StatusBadge";
import CategoryPill from "@/components/CategoryPill";
import ReviewModal from "@/components/ReviewModal";

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-line last:border-0">
      <Icon size={16} className="text-navy mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] text-muted">{label}</div>
        <div className="text-sm text-ink mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [me, setMe] = useState<Participant | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [totalRegCount, setTotalRegCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const load = async () => {
    const { data: prog } = await supabase.from("programs").select("*").eq("id", id).single();
    setProgram(prog);
    const { data: sess } = await supabase.from("sessions").select("*").eq("program_id", id).order("session_date");
    setSessions(sess ?? []);

    const { data: allAttendance } = await supabase.from("attendance").select("session_id").eq("program_id", id);
    const counts: Record<string, number> = {};
    (allAttendance ?? []).forEach((a: { session_id: string }) => { counts[a.session_id] = (counts[a.session_id] ?? 0) + 1; });
    setSessionCounts(counts);

    const { data: regs } = await supabase.from("registrations").select("status").eq("program_id", id);
    setTotalRegCount((regs ?? []).filter((r) => r.status !== "cancelled" && r.status !== "rejected").length);

    const { data: ph } = await supabase
      .from("photos")
      .select("*")
      .or(`program_id.eq.${id},program_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(8);
    setPhotos(ph ?? []);

    const { data: rvs } = await supabase.from("reviews").select("*").eq("program_id", id).order("created_at", { ascending: false });
    setReviews(rvs ?? []);

    const participantId = getStoredParticipantId();
    if (participantId) {
      const { data: participantRaw } = await supabase.rpc("rpc_get_my_participant", { p_id: participantId }).maybeSingle();
      const participant = participantRaw as Participant | null;
      setMe(participant);
      if (participant) {
        const { data: reg } = await supabase
          .from("registrations")
          .select("*")
          .eq("participant_id", participant.id)
          .eq("program_id", id)
          .maybeSingle();
        setRegistration(reg);
        const { data: att } = await supabase.from("attendance").select("*").eq("participant_id", participant.id).eq("program_id", id);
        setAttendance(att ?? []);
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!program) return null;

  const totalCapacity = sessions.reduce((sum, s) => (s.capacity !== null ? sum + s.capacity : sum), 0) || program.capacity;
  const myAttCount = attendance.length;
  const cardStatus = computeCardStatus(program, totalCapacity ?? null, totalRegCount, registration, myAttCount);
  const remaining = remainingSpots(totalCapacity ?? null, totalRegCount);
  const dateRange = sessions.length ? `${sessions[0].session_date} ~ ${sessions[sessions.length - 1].session_date}` : "";
  const canApply = !registration && cardStatus !== "full" && cardStatus !== "closed" && cardStatus !== "cancelled";

  return (
    <div className="pb-28">
      <TopBar title={program.title} backHref="/" />

      <div
        className="p-6 text-center text-6xl relative"
        style={{ background: `linear-gradient(135deg, #0D3B4E, ${categoryColor(program.category).solid} 65%, #3F9179 130%)` }}
      >
        {program.emoji}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <CategoryPill category={program.category} />
          <StatusBadge status={cardStatus} remaining={remaining} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h2 className="font-display text-lg text-ink mb-1.5">{program.title}</h2>
          <p className="text-sm leading-relaxed text-muted">{program.description}</p>
        </div>

        {totalRegCount > 0 && (
          <p className="text-xs text-navy bg-seafoamLight inline-block px-3 py-1.5 rounded-full">
            송정 주민 {totalRegCount}명이 신청했어요
          </p>
        )}

        <div className="rounded-xl border border-line p-4 bg-white">
          <InfoRow icon={Calendar} label="일정" value={dateRange} />
          <InfoRow icon={Clock} label="시간" value={sessions[0] ? `${sessions[0].start_time?.slice(0, 5)} ~ ${sessions[0].end_time?.slice(0, 5)}` : null} />
          <InfoRow icon={MapPin} label="장소" value={`${program.location ?? ""} (${program.address ?? ""})`} />
          <InfoRow icon={Users} label="대상" value={program.target} />
          <InfoRow icon={CreditCard} label="비용" value={program.fee} />
        </div>

        {program.instructor && (
          <div className="rounded-xl border border-line p-4 bg-white flex items-center gap-3">
            {program.instructor_photo_url ? (
              <img src={program.instructor_photo_url} alt={program.instructor} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-sand flex items-center justify-center text-navy text-lg font-display flex-shrink-0">
                {program.instructor.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] text-muted mb-0.5">담당 강사</p>
              <p className="text-sm font-medium text-ink">{program.instructor}</p>
              {program.instructor_bio && <p className="text-xs text-muted mt-0.5 leading-relaxed">{program.instructor_bio}</p>}
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <ListChecks size={14} className="text-navy" />
              <span className="text-sm font-medium text-navy">이런 활동을 해요</span>
            </div>
            <div className="rounded-xl border border-line bg-white divide-y divide-line">
              {sessions.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-6 h-6 rounded-full bg-sand text-navy text-xs font-medium flex items-center justify-center flex-shrink-0">{i + 1}</div>
                  <div className="text-sm text-ink">{s.session_label}</div>
                  <div className="text-xs text-muted ml-auto">{s.session_date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(program.requirement || program.prep) && (
          <div>
            <p className="text-sm font-medium px-1 mb-2 text-navy">참여 전 확인해주세요</p>
            <div className="rounded-xl border border-line bg-white p-4 space-y-2 text-sm">
              {program.prep && <p className="text-ink"><span className="text-muted">준비물 · </span>{program.prep}</p>}
              {program.requirement && <p className="text-ink"><span className="text-muted">유의사항 · </span>{program.requirement}</p>}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Images size={14} className="text-navy" />
              <span className="text-sm font-medium text-navy">프로그램 활동사진</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((ph) => (
                <div key={ph.id}>
                  <img src={ph.image_url} alt={ph.caption ?? ""} className="w-full h-28 object-cover rounded-lg border border-line" />
                  {ph.caption && <p className="text-[10px] text-muted mt-1 truncate">{ph.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(reviews.length > 0 || !!registration) && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Star size={14} className="text-navy" />
                <span className="text-sm font-medium text-navy">참여자 후기 &amp; 사진</span>
              </div>
              {me && registration && (
                <button onClick={() => setShowReviewModal(true)} className="flex items-center gap-1 text-xs font-medium text-coral">
                  <MessageSquarePlus size={13} /> 후기 남기기
                </button>
              )}
            </div>
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-ink">{r.author_name}</span>
                    {r.rating && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} fill={i < r.rating! ? "#E8734A" : "none"} color={i < r.rating! ? "#E8734A" : "#E3DCC9"} />
                        ))}
                      </div>
                    )}
                  </div>
                  {r.content && <p className="text-xs text-muted leading-relaxed mb-2">{r.content}</p>}
                  {r.image_url && <img src={r.image_url} alt="" className="w-full h-40 object-cover rounded-lg border border-line" />}
                </div>
              ))}
              {reviews.length === 0 && <p className="text-xs text-muted px-1">아직 후기가 없어요. 첫 후기를 남겨보세요!</p>}
            </div>
          </div>
        )}

        {registration && (
          <div
            className={`rounded-xl border p-3 ${
              registration.status === "rejected" || registration.status === "cancelled"
                ? "border-line bg-sand"
                : registration.status === "waitlisted"
                ? "border-coral bg-[#FBE4D8]"
                : "border-seafoam bg-seafoamLight"
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-sm font-medium ${
                registration.status === "rejected" || registration.status === "cancelled"
                  ? "text-muted"
                  : registration.status === "waitlisted"
                  ? "text-coralDark"
                  : "text-seafoam"
              }`}
            >
              <CheckCircle2 size={16} /> {APPLICATION_STATUS_LABEL[registration.status]}
            </div>
          </div>
        )}

        {registration && registration.status !== "rejected" && registration.status !== "cancelled" && registration.status !== "waitlisted" && (
          <div className="space-y-2">
            <p className="text-sm font-medium px-1 mt-2 text-muted">회차 / QR 체크인</p>
            {sessions.map((s) => {
              const done = attendance.some((a) => a.session_id === s.id);
              const count = sessionCounts[s.id] ?? 0;
              const full = s.capacity !== null && count >= s.capacity;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 bg-white">
                  <div>
                    <div className="text-sm font-medium text-ink">{s.session_label}</div>
                    <div className="text-xs text-muted">{s.session_date}</div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {s.capacity !== null ? `정원 ${s.capacity}명 중 ${count}명 참여` : "정원 제한 없음"}
                    </div>
                  </div>
                  {done ? (
                    <Pill tone="seafoam">체크인 완료</Pill>
                  ) : full ? (
                    <Pill tone="coral">마감</Pill>
                  ) : (
                    <button
                      onClick={() => router.push(`/checkin/${s.qr_token}`)}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full text-white bg-navy"
                    >
                      <QrCode size={13} /> 체크인
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canApply && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-line p-3 z-20">
          <button
            onClick={() => router.push(`/join?programId=${program.id}`)}
            className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral"
          >
            {program.fee === "무료" ? "무료로 신청하기" : "신청하기"}
          </button>
        </div>
      )}

      {showReviewModal && me && (
        <ReviewModal
          programId={program.id}
          me={me}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={load}
        />
      )}
    </div>
  );
}
