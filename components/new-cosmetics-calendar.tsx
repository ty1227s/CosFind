"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DAY_MS = 24 * 60 * 60 * 1000;

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(value: string, base: string) {
  return Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${base}T00:00:00Z`)) / DAY_MS);
}

function formatRange(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  const startLabel = startDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const endLabel = endDate.toLocaleDateString("ja-JP", { year: sameYear ? undefined : "numeric", month: sameMonth ? undefined : "long", day: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export function NewCosmeticsCalendar({ selectedDate, today }: { selectedDate: string; today: string }) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(() => Math.round(daysBetween(selectedDate, today) / 7));
  const [direction, setDirection] = useState<"previous" | "next">("next");
  const pointerStart = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const centerDate = shiftDate(today, weekOffset * 7);
  const dates = Array.from({ length: 7 }, (_, index) => shiftDate(centerDate, index - 3));

  function moveWeek(amount: -1 | 1) {
    setDirection(amount < 0 ? "previous" : "next");
    setWeekOffset((current) => current + amount);
  }

  function selectDate(date: string) {
    if (suppressClick.current) return;
    if (date !== selectedDate) router.push(`/products/new?date=${date}`, { scroll: false });
  }

  return <nav className="new-cosmetics-date-nav" aria-label="発売日を選択">
    <div className="new-cosmetics-week-head">
      <button type="button" onClick={() => moveWeek(-1)} aria-label="前の週を表示">← <span>前週</span></button>
      <strong>{formatRange(dates[0], dates[6])}</strong>
      <button type="button" onClick={() => moveWeek(1)} aria-label="次の週を表示"><span>翌週</span> →</button>
    </div>
    <div
      className="new-cosmetics-week-viewport"
      onPointerDown={(event) => { pointerStart.current = event.clientX; }}
      onPointerUp={(event) => {
        if (pointerStart.current === null) return;
        const distance = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(distance) >= 45) {
          suppressClick.current = true;
          window.setTimeout(() => { suppressClick.current = false; }, 0);
          moveWeek(distance > 0 ? -1 : 1);
        }
      }}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      <div key={weekOffset} className={`new-cosmetics-week-days slide-${direction}`}>
        {dates.map((date) => {
          const parsed = new Date(`${date}T00:00:00`);
          const weekday = parsed.getDay();
          const isToday = date === today;
          const isSelected = date === selectedDate;
          return <button type="button" key={date} className={`${isSelected ? "selected " : ""}${isToday ? "today " : ""}${weekday === 0 ? "sunday" : weekday === 6 ? "saturday" : ""}`} onClick={() => selectDate(date)} aria-current={isSelected ? "date" : undefined}>
            <small>{parsed.toLocaleDateString("ja-JP", { weekday: "short" })}</small>
            <b>{parsed.getDate()}</b>
            {isToday && <span>今日</span>}
          </button>;
        })}
      </div>
    </div>
    <div className="new-cosmetics-date-tools">
      <form action="/products/new" method="get" className="new-cosmetics-date-form">
        <label htmlFor="new-cosmetics-date">日付を選択</label>
        <input id="new-cosmetics-date" name="date" type="date" defaultValue={selectedDate}/>
        <button type="submit">表示</button>
      </form>
      {selectedDate !== today && <button type="button" className="new-cosmetics-today" onClick={() => { setDirection("previous"); setWeekOffset(0); router.push("/products/new", { scroll: false }); }}>今日に戻る</button>}
    </div>
    <p className="new-cosmetics-swipe-hint">左右にスワイプして前週・翌週を表示できます</p>
  </nav>;
}
