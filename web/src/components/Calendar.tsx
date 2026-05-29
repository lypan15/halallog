"use client";

import { useMemo, useRef, useState } from "react";

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Props = {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;
  initialMonth?: { year: number; month: number };
  disablePastMonths?: boolean;
};

export function Calendar({
  rangeStart,
  rangeEnd,
  onRangeChange,
  initialMonth,
  disablePastMonths = false,
}: Props) {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(
    initialMonth ?? { year: now.getFullYear(), month: now.getMonth() }
  );
  const [slideY, setSlideY] = useState(0);
  const [withTrans, setWithTrans] = useState(true);
  const [animating, setAnimating] = useState(false);
  const touchY = useRef(0);

  const calDays = useMemo(() => {
    const { year, month } = calMonth;
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= last; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calMonth]);

  const navigate = (dir: "next" | "prev") => {
    if (animating) return;
    if (dir === "prev" && disablePastMonths) {
      if (calMonth.year === now.getFullYear() && calMonth.month === now.getMonth()) return;
    }
    setAnimating(true);
    setWithTrans(true);
    setSlideY(dir === "next" ? -100 : 100);
    setTimeout(() => {
      setWithTrans(false);
      setSlideY(dir === "next" ? 100 : -100);
      setCalMonth((p) =>
        dir === "next"
          ? p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 }
          : p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 }
      );
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setWithTrans(true);
          setSlideY(0);
          setTimeout(() => setAnimating(false), 300);
        })
      );
    }, 300);
  };

  const updateRange = (date: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      onRangeChange(date, null);
      return;
    }
    if (date < rangeStart) {
      onRangeChange(date, rangeStart);
      return;
    }
    onRangeChange(rangeStart, date);
  };

  const isEndpoint = (d: Date) =>
    rangeStart?.getTime() === d.getTime() || rangeEnd?.getTime() === d.getTime();

  const isMiddle = (d: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    const t = d.getTime();
    return t > rangeStart.getTime() && t < rangeEnd.getTime();
  };

  return (
    <div>
      {/* Month header */}
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("prev")}
          className="px-2 py-1 text-sm text-[--color-text-muted] hover:text-[--color-text]"
        >
          ‹
        </button>
        <p className="text-center text-sm font-semibold text-[--color-text]">
          {MONTHS[calMonth.month]} {calMonth.year}
        </p>
        <button
          type="button"
          onClick={() => navigate("next")}
          className="px-2 py-1 text-sm text-[--color-text-muted] hover:text-[--color-text]"
        >
          ›
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center text-xs text-[--color-text-muted]">
        {WEEK_DAYS.map((d) => (
          <span key={d} className="py-0.5">{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="overflow-hidden"
        onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          const delta = touchY.current - e.changedTouches[0].clientY;
          if (Math.abs(delta) >= 30) navigate(delta > 0 ? "next" : "prev");
        }}
        onWheel={(e) => navigate(e.deltaY > 0 ? "next" : "prev")}
      >
        <div
          className="grid grid-cols-7"
          style={{
            transform: `translateY(${slideY}%)`,
            transition: withTrans ? "transform 0.3s ease" : "none",
          }}
        >
          {calDays.map((date, i) =>
            date ? (
              <div
                key={date.toISOString()}
                className="flex items-center justify-center py-0.5"
                style={{ backgroundColor: isMiddle(date) ? "rgba(45,106,79,0.15)" : undefined }}
              >
                <button
                  type="button"
                  onClick={() => updateRange(date)}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors",
                    isEndpoint(date)
                      ? "bg-[#2d6a4f] text-white"
                      : "text-[--color-text] hover:bg-[--color-border]",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              </div>
            ) : (
              <span key={`e-${i}`} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
