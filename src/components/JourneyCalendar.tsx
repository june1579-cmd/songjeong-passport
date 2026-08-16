"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarEntry {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (선택)
  emoji: string;
  title: string;
  done: boolean; // true=완료, false=예정
  color?: string; // 프로그램별 고유 색 (없으면 기본 완료/예정 색 사용)
  programTitle?: string; // 범례 표시용 (예: "송정해변 서핑체험")
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function JourneyCalendar({ entries }: { entries: CalendarEntry[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // month: 0-11
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    entries.forEach((e) => {
      map[e.date] = map[e.date] ?? [];
      map[e.date].push(e);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")));
    return map;
  }, [entries]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateKey = (d: number) => `${cursor.year}-${pad(cursor.month + 1)}-${pad(d)}`;

  const changeMonth = (delta: number) => {
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCursor({ year: y, month: m });
    setSelectedDate(null);
  };

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] ?? [] : [];

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => changeMonth(-1)}><ChevronLeft size={16} className="text-navy" /></button>
        <p className="text-sm font-medium text-ink">{cursor.year}년 {cursor.month + 1}월</p>
        <button onClick={() => changeMonth(1)}><ChevronRight size={16} className="text-navy" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] text-muted">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} />;
          const key = dateKey(d);
          const dayEntries = entriesByDate[key];
          const isSelected = selectedDate === key;
          const dotColors = dayEntries
            ? [...new Set(dayEntries.map((e) => e.color ?? (e.done ? "#4E9C82" : "#EC7A4E")))].slice(0, 3)
            : [];
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative ${
                isSelected ? "bg-navy text-white" : dayEntries ? "bg-sand text-ink" : "text-ink"
              }`}
            >
              {d}
              {dayEntries && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dotColors.map((c, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "#fff" : c }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          {selectedEntries.length === 0 && <p className="text-xs text-muted">이 날은 활동 기록이 없어요.</p>}
          {selectedEntries.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color ?? (e.done ? "#4E9C82" : "#EC7A4E") }} />
              <span>{e.emoji}</span>
              <span className="text-ink flex-1">{e.title}{e.time ? ` · ${e.time}` : ""}</span>
              <span className={`text-[11px] ${e.done ? "text-seafoam" : "text-coral"}`}>{e.done ? "참여완료" : "예정"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2 border-t border-line text-[10px] text-muted">
        {[...new Map(entries.filter((e) => e.color && e.programTitle).map((e) => [e.programTitle, e.color!])).entries()].map(([title, color]) => (
          <span key={title} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} /> {title}
          </span>
        ))}
      </div>
    </div>
  );
}
