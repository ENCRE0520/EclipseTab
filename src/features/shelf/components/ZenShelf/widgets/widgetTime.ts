export const localDateKey = (date: Date): string => (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

export const parseLocalDate = (value: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1000 || year > 9999) return null;
    const date = new Date(year, month - 1, day);
    return localDateKey(date) === value ? date : null;
};

// Count calendar days, not 24-hour periods (daylight-saving days can be 23/25h).
export const daysUntil = (target: Date, now: Date): number => (
    Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
        - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
);

export const focusRemaining = (endsAt: number | null, remaining: number, now: number): number => (
    Math.max(0, endsAt === null ? remaining : Math.ceil((endsAt - now) / 1000))
);

/** 专注计时器的可选时长（分钟）：60 分钟内每 5 分钟一档，之后每 10 分钟一档，最长 2 小时 */
export const FOCUS_DURATION_OPTIONS: number[] = [
    ...Array.from({ length: 12 }, (_, index) => (index + 1) * 5),
    ...Array.from({ length: 6 }, (_, index) => 70 + index * 10),
];
