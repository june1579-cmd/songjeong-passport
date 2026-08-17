"use client";
import { useState } from "react";
import { Plus, Trash2, Camera } from "lucide-react";
import { COMMON_VENUES, PROGRAM_CATEGORIES } from "@/lib/types";
import { categoryColor } from "@/lib/category-colors";
import { supabase } from "@/lib/supabase";

const EMOJI_PRESETS = ["🏄", "🎨", "🖼", "🌱", "🌊", "⚽", "📷", "🎭", "🤝", "🎉", "📚", "🧵"];

function slugify(text: string) {
  const ascii = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  if (ascii.length >= 3) return ascii;
  // 한글 제목처럼 영문 슬러그를 뽑기 어려우면 랜덤 조합으로 대체 (URL에만 쓰이고 화면엔 안 보임)
  return `program-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ProgramFormState {
  id: string;
  emoji: string;
  title: string;
  description: string;
  location: string;
  address: string;
  fee: string;
  target: string;
  requirement: string;
  prep: string;
  instructor: string;
  instructorBio: string;
  instructorPhotoUrl: string;
  capacity: number | null; // null = 이 프로그램은 기본 정원 없음
  category: string;
  nextProgramId: string;
  nextTeaser: string;
  sessionSelectionMode: "select" | "fixed";
  maxSelectableSessions: number | null;
}

export interface SessionDraft {
  key: string;
  session_label: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number | null; // null = 이 회차는 정원 제한 없음
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5 text-muted">{label}</label>
      {children}
    </div>
  );
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, "0")); // 01~24
const MINUTE_OPTIONS = ["00", "30"];

// 오전/오후 없이 01~24시, 00/30분 단위로만 고르는 시간 선택기.
function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h = "10", m = "00"] = value.split(":");
  const hour = h === "00" ? "24" : h; // 내부적으로 24시는 00시와 동일하게 저장하되, 선택지엔 24로 표시
  const isMidnight = hour === "24";
  const set = (nh: string, nm: string) => onChange(`${nh}:${nh === "24" ? "00" : nm}`); // 24시는 정각만 허용
  return (
    <div className="flex items-center gap-1">
      <select value={hour} onChange={(e) => set(e.target.value, m)} className="border border-line rounded-lg px-1.5 py-1 text-xs">
        {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
      </select>
      <select value={isMidnight ? "00" : m} disabled={isMidnight} onChange={(e) => set(hour, e.target.value)} className="border border-line rounded-lg px-1.5 py-1 text-xs disabled:bg-sand disabled:text-muted">
        {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
      </select>
    </div>
  );
}

const inputCls = "w-full border border-line rounded-lg px-3 py-2.5 text-sm";

export function ProgramBasicFields({
  form,
  setForm,
  lockId,
  otherPrograms,
}: {
  form: ProgramFormState;
  setForm: (f: ProgramFormState) => void;
  lockId?: boolean;
  otherPrograms: { id: string; title: string }[];
}) {
  const set = (k: keyof ProgramFormState, v: string | number | null) => setForm({ ...form, [k]: v });
  const unlimited = form.capacity === null;
  const [showIdEdit, setShowIdEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onTitleChange = (title: string) => {
    // 아이디를 아직 직접 손대지 않았다면(새 프로그램) 제목에서 자동으로 만들어준다.
    if (!lockId && !showIdEdit) {
      setForm({ ...form, title, id: slugify(title) });
    } else {
      setForm({ ...form, title });
    }
  };

  const uploadInstructorPhoto = async (file: File) => {
    setUploadingPhoto(true);
    const path = `instructors/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error } = await supabase.storage.from("gallery").upload(path, file);
    if (!error) {
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
      set("instructorPhotoUrl", pub.publicUrl);
    }
    setUploadingPhoto(false);
  };

  return (
    <div className="space-y-3">
      <Field label="아이콘">
        <div className="flex flex-wrap gap-2">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => set("emoji", e)}
              className={`w-10 h-10 rounded-lg border text-lg flex items-center justify-center ${
                form.emoji === e ? "border-navy bg-sand" : "border-line bg-white"
              }`}
            >
              {e}
            </button>
          ))}
          <input
            value={form.emoji}
            onChange={(e) => set("emoji", e.target.value)}
            placeholder="직접 입력"
            className="w-16 h-10 border border-line rounded-lg px-2 text-center text-lg"
          />
        </div>
      </Field>

      <Field label="프로그램명">
        <input value={form.title} onChange={(e) => onTitleChange(e.target.value)} className={inputCls} />
      </Field>

      {!lockId && (
        <button
          type="button"
          onClick={() => setShowIdEdit(!showIdEdit)}
          className="text-[11px] text-muted underline"
        >
          {showIdEdit ? "주소 직접 입력 그만두기" : `주소: /programs/${form.id || "..."} (직접 바꾸려면 클릭)`}
        </button>
      )}
      {(showIdEdit || lockId) && (
        <Field label="프로그램 주소(ID, 영문/숫자)">
          <input
            value={form.id}
            disabled={lockId}
            onChange={(e) => set("id", e.target.value.replace(/[^a-z0-9-]/g, ""))}
            placeholder="surf-2"
            className={`${inputCls} ${lockId ? "bg-sand text-muted" : ""}`}
          />
        </Field>
      )}

      <Field label="설명"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} /></Field>

      <Field label="카테고리">
        <div className="flex flex-wrap gap-2">
          {PROGRAM_CATEGORIES.map((c) => {
            const col = categoryColor(c);
            const active = form.category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => set("category", c)}
                className="text-xs px-3 py-1.5 rounded-full border font-medium"
                style={active ? { background: col.solid, borderColor: col.solid, color: "white" } : { background: col.bg, borderColor: col.bg, color: col.text }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="장소 (자주 쓰는 곳 선택 또는 직접 입력)">
        <div className="flex flex-wrap gap-2 mb-2">
          {COMMON_VENUES.map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={() => setForm({ ...form, location: v.label, address: v.address })}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                form.location === v.label ? "bg-navy border-navy text-white" : "bg-white border-line text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="직접 입력" className={inputCls} />
      </Field>
      <Field label="상세 주소"><input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} /></Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="참가비"><input value={form.fee} onChange={(e) => set("fee", e.target.value)} className={inputCls} /></Field>
        <Field label="기본 정원 (회차 추가 시 자동 적용)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              disabled={unlimited}
              value={form.capacity ?? ""}
              onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)}
              placeholder="예: 10"
              className={`${inputCls} ${unlimited ? "bg-sand text-muted" : ""}`}
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs mt-1.5 text-ink">
            <input type="checkbox" checked={unlimited} onChange={(e) => set("capacity", e.target.checked ? null : 10)} />
            정원 제한 없음
          </label>
        </Field>
      </div>

      <Field label="회차 신청 방식">
        <div className="space-y-2">
          <label className={`flex items-start gap-2 text-xs rounded-lg border px-3 py-2.5 cursor-pointer ${form.sessionSelectionMode === "select" ? "border-navy bg-sand" : "border-line bg-white"}`}>
            <input type="radio" className="mt-0.5" checked={form.sessionSelectionMode === "select"} onChange={() => setForm({ ...form, sessionSelectionMode: "select" })} />
            <span>
              <span className="block font-medium text-ink">회차 자유 선택</span>
              <span className="block text-muted mt-0.5">참여자가 원하는 회차를 골라서 신청 (예: 서핑체험 — 1인당 최대 회차 수를 정할 수 있어요)</span>
            </span>
          </label>
          <label className={`flex items-start gap-2 text-xs rounded-lg border px-3 py-2.5 cursor-pointer ${form.sessionSelectionMode === "fixed" ? "border-navy bg-sand" : "border-line bg-white"}`}>
            <input type="radio" className="mt-0.5" checked={form.sessionSelectionMode === "fixed"} onChange={() => setForm({ ...form, sessionSelectionMode: "fixed" })} />
            <span>
              <span className="block font-medium text-ink">고정 기수제</span>
              <span className="block text-muted mt-0.5">처음 모집된 인원이 전체 회차를 함께 진행 (예: 폐서핑보드 작품 만들기 — 회차 선택 없이 신청 시 전체 회차에 자동 등록)</span>
            </span>
          </label>
        </div>
        {form.sessionSelectionMode === "select" && (
          <div className="mt-2">
            <label className="text-xs font-medium block mb-1.5 text-muted">1인당 최대 신청 회차 수</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                disabled={form.maxSelectableSessions === null}
                value={form.maxSelectableSessions ?? ""}
                onChange={(e) => set("maxSelectableSessions", e.target.value ? Number(e.target.value) : null)}
                placeholder="예: 2"
                className={`${inputCls} ${form.maxSelectableSessions === null ? "bg-sand text-muted" : ""}`}
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs mt-1.5 text-ink">
              <input type="checkbox" checked={form.maxSelectableSessions === null} onChange={(e) => set("maxSelectableSessions", e.target.checked ? null : 2)} />
              제한 없음 (원하는 만큼 회차 선택 가능)
            </label>
          </div>
        )}
      </Field>

      <Field label="대상"><input value={form.target} onChange={(e) => set("target", e.target.value)} className={inputCls} /></Field>
      <Field label="참여요건"><input value={form.requirement} onChange={(e) => set("requirement", e.target.value)} className={inputCls} /></Field>
      <Field label="준비물"><input value={form.prep} onChange={(e) => set("prep", e.target.value)} className={inputCls} /></Field>
      <Field label="강사 프로필">
        <div className="rounded-lg border border-line p-3 space-y-2.5 bg-white">
          <input value={form.instructor} onChange={(e) => set("instructor", e.target.value)} placeholder="강사명" className={inputCls} />
          <textarea
            value={form.instructorBio}
            onChange={(e) => set("instructorBio", e.target.value)}
            rows={2}
            placeholder="간단한 소개 (경력, 자격 등)"
            className={inputCls}
          />
          <div className="flex items-center gap-3">
            {form.instructorPhotoUrl ? (
              <img src={form.instructorPhotoUrl} alt="강사 사진" className="w-14 h-14 rounded-full object-cover border border-line" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-sand flex items-center justify-center text-muted flex-shrink-0">
                <Camera size={18} />
              </div>
            )}
            <label className="text-xs font-medium text-navy cursor-pointer">
              {uploadingPhoto ? "업로드 중..." : form.instructorPhotoUrl ? "사진 바꾸기" : "사진 업로드"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadInstructorPhoto(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      </Field>
      <Field label="다음 추천 프로그램">
        <select value={form.nextProgramId} onChange={(e) => set("nextProgramId", e.target.value)} className={inputCls}>
          <option value="">없음</option>
          {otherPrograms.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </Field>
      {form.nextProgramId && (
        <Field label="다음 프로그램 추천 문구">
          <input value={form.nextTeaser} onChange={(e) => set("nextTeaser", e.target.value)} placeholder="예: 서핑 경험을 작품으로 남겨보세요." className={inputCls} />
        </Field>
      )}
    </div>
  );
}

export function SessionEditor({
  sessions,
  setSessions,
  defaultCapacity,
}: {
  sessions: SessionDraft[];
  setSessions: (s: SessionDraft[]) => void;
  defaultCapacity: number | null;
}) {
  const add = () =>
    setSessions([
      ...sessions,
      { key: `new-${Date.now()}-${Math.random()}`, session_label: `${sessions.length + 1}차`, session_date: "", start_time: "10:00", end_time: "12:00", capacity: defaultCapacity },
    ]);
  const update = (key: string, patch: Partial<SessionDraft>) => setSessions(sessions.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const remove = (key: string) => setSessions(sessions.filter((s) => s.key !== key));

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const unlimited = s.capacity === null;
        return (
          <div key={s.key} className="rounded-lg border border-line p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                value={s.session_label}
                onChange={(e) => update(s.key, { session_label: e.target.value })}
                placeholder="회차명 (예: 1차 · 밑그림)"
                className="flex-1 border border-line rounded-lg px-2.5 py-2 text-xs"
              />
              <input
                type="date"
                value={s.session_date}
                onChange={(e) => update(s.key, { session_date: e.target.value })}
                className="border border-line rounded-lg px-2.5 py-2 text-xs"
              />
              <button onClick={() => remove(s.key)} className="text-coralDark p-1"><Trash2 size={16} /></button>
            </div>
            <div className="flex items-center gap-2 pl-0.5">
              <span className="text-[11px] text-muted">시간</span>
              <TimeSelect value={s.start_time} onChange={(v) => update(s.key, { start_time: v })} />
              <span className="text-[11px] text-muted">~</span>
              <TimeSelect value={s.end_time} onChange={(v) => update(s.key, { end_time: v })} />
            </div>
            <div className="flex items-center gap-2 pl-0.5">
              <span className="text-[11px] text-muted">이 회차 정원</span>
              <input
                type="number"
                min={1}
                disabled={unlimited}
                value={s.capacity ?? ""}
                onChange={(e) => update(s.key, { capacity: e.target.value ? Number(e.target.value) : null })}
                placeholder="숫자"
                className={`w-20 border border-line rounded-lg px-2 py-1 text-xs ${unlimited ? "bg-sand text-muted" : ""}`}
              />
              <label className="flex items-center gap-1 text-[11px] text-ink">
                <input type="checkbox" checked={unlimited} onChange={(e) => update(s.key, { capacity: e.target.checked ? null : 10 })} />
                제한 없음
              </label>
            </div>
          </div>
        );
      })}
      <button onClick={add} className="flex items-center gap-1 text-xs font-medium text-navy py-1.5">
        <Plus size={14} /> 회차 추가
      </button>
    </div>
  );
}
