import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './ZenShelf.module.css';

export const CLOCK_WIDGET_SIZE = 212;
const CLOCK_HORIZONTAL_SCALE = 1;
const CLOCK_HORIZONTAL_INSET = 5;

const formatTime = (date: Date): string => (
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
);

export const ClockWidget: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
    const [time, setTime] = useState(() => formatTime(new Date()));
    const [horizontalScale, setHorizontalScale] = useState(CLOCK_HORIZONTAL_SCALE);
    const clockFaceRef = useRef<HTMLDivElement>(null);
    const clockTimeRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const updateTime = () => setTime(formatTime(new Date()));
        const timer = window.setInterval(updateTime, 1000);
        return () => window.clearInterval(timer);
    }, []);

    useLayoutEffect(() => {
        let cancelled = false;

        const fitClockTime = () => {
            if (cancelled || !clockFaceRef.current || !clockTimeRef.current) return;

            const availableWidth = clockFaceRef.current.clientWidth - CLOCK_HORIZONTAL_INSET * 2 * scale;
            const intrinsicWidth = clockTimeRef.current.offsetWidth;
            if (intrinsicWidth <= 0) return;

            const fittedScale = Math.min(CLOCK_HORIZONTAL_SCALE, availableWidth / intrinsicWidth);
            setHorizontalScale(Math.max(0, fittedScale));
        };

        fitClockTime();
        const fontsReady = document.fonts?.ready;
        if (fontsReady) {
            fontsReady.then(fitClockTime);
        }

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(fitClockTime)
            : null;
        if (resizeObserver && clockFaceRef.current) {
            resizeObserver.observe(clockFaceRef.current);
        }

        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
        };
    }, [scale, time]);

    return (
        <div
            className={styles.clockWidget}
            style={{
                width: CLOCK_WIDGET_SIZE * scale,
                height: CLOCK_WIDGET_SIZE * scale,
                '--clock-scale': scale,
                '--clock-horizontal-scale': horizontalScale,
            } as React.CSSProperties}
            role="timer"
            aria-label={`Current time ${time}`}
        >
            <div ref={clockFaceRef} className={styles.clockFace}>
                <span ref={clockTimeRef} className={styles.clockTime}>{time}</span>
            </div>
        </div>
    );
};
