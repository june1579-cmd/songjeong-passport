"use client";
import { Plus, Trash2 } from "lucide-react";
import { COMMON_VENUES, PROGRAM_CATEGORIES } from "@/lib/types";

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
  capacity: number | null; // null = 이 프로그램은 기본 정원 없음
  category: string;
  nextProgramId: string;
  nextTeaser: string;
}

export interface SessionDraft {
  key: string;
  session_label: string;
  session_date: string;
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field label="아이콘(이모지)">
          <input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="🏄" className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="프로그램 ID (slug, 영문)">
            <input value={form.id} disabled={lockId} onChange={(e) => set("id", e.target.value.replace(/[^a-z0-9-]/g, ""))} placeholder="surf-2" className={`${inputCls} ${lockId ? "bg-sand text-muted" : ""}`} />
          </Field>
        </div>
      </div>
      <Field label="프로그램명"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
      <Field label="설명"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} /></Field>

      <Field label="카테고리">
        <div className="flex flex-wrap gap-2">
          {PROGRAM_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("category", c)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                form.category === c ? "bg-navy border-navy text-white" : "bg-white border-line text-ink"
              }`}
            >
              {c}
            </button>
          ))}
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

      <Field label="대상"><input value={form.target} onChange={(e) => set("target", e.target.value)} className={inputCls} /></Field>
      <Field label="참여요건"><input value={form.requirement} onChange={(e) => set("requirement", e.target.value)} className={inputCls} /></Field>
      <Field label="준비물"><input value={form.prep} onChange={(e) => set("prep", e.target.value)} className={inputCls} /></Field>
      <Field label="강사"><input value={form.instructor} onChange={(e) => set("instructor", e.target.value)} className={inputCls} /></Field>
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
      { key: `new-${Date.now()}-${Math.random()}`, session_label: `${sessions.length + 1}차`, session_date: "", capacity: defaultCapacity },
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
