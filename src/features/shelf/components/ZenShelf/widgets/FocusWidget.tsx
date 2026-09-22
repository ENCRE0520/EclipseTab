import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import chevronLeftIcon from '@/assets/icons/chevron-left.svg';
import chevronRightIcon from '@/assets/icons/chevron-right.svg';
import pauseIcon from '@/assets/icons/pause.svg';
import playIcon from '@/assets/icons/play.svg';
import stopIcon from '@/assets/icons/stop.svg';
import { Sticker } from '@/features/shelf/types/sticker';
import { useLanguage } from '@/shared/context/LanguageContext';
import { WidgetFrame, WidgetIcon, useWidgetNow } from './WidgetFrame';
import { FOCUS_DURATION_OPTIONS, focusRemaining } from './widgetTime';
import styles from './Widgets.module.css';

const DEFAULT_FOCUS: NonNullable<Sticker['focus']> = { mode: 'focus', duration: 1800, remaining: 1800, endsAt: null };

const formatRemaining = (total: number): string => {
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${clock}` : clock;
};

interface CharSlotState {
    char: string;
    prevChar: string;
    isAnimating: boolean;
    exitDelay: number;
    enterDelay: number;
    exitDuration: number;
    enterDuration: number;
}

function AnimatedTimerDigits({ value, className }: {
    value: string;
    className?: string;
}) {
    const prevValueRef = useRef<string>(value);
    const animCycleRef = useRef(0);
    const [animCycle, setAnimCycle] = useState(0);
    const [slots, setSlots] = useState<CharSlotState[]>(() =>
        value.split('').map(char => ({
            char,
            prevChar: char,
            isAnimating: false,
            exitDelay: 0,
            enterDelay: 0,
            exitDuration: 150,
            enterDuration: 150,
        }))
    );
    const clearTimerRef = useRef<number>();

    useEffect(() => {
        const prevValue = prevValueRef.current;
        if (value === prevValue) return;
        prevValueRef.current = value;

        animCycleRef.current += 1;
        setAnimCycle(animCycleRef.current);

        window.clearTimeout(clearTimerRef.current);

        const currChars = value.split('');
        const prevChars = prevValue.split('');
        const lengthChanged = currChars.length !== prevChars.length;
        let maxDuration = 0;

        const nextSlots: CharSlotState[] = currChars.map((char, index) => {
            const prevChar = prevChars[index] ?? '';
            const isChanged = lengthChanged || char !== prevChar;

            // 未发生变化的数字位与冒号 : 严格保持静止，避免视觉眩晕
            if (!isChanged) {
                return {
                    char,
                    prevChar: char,
                    isAnimating: false,
                    exitDelay: 0,
                    enterDelay: 0,
                    exitDuration: 150,
                    enterDuration: 150,
                };
            }

            // 发生变化的具体单个数字：无交错（0ms），立即独立执行
            const exitDelay = 0;
            const enterDelay = 80;
            const exitDuration = 150;
            const enterDuration = 150;
            maxDuration = Math.max(maxDuration, enterDelay + enterDuration);

            return {
                char,
                prevChar: prevChar || char,
                isAnimating: true,
                exitDelay,
                enterDelay,
                exitDuration,
                enterDuration,
            };
        });

        setSlots(nextSlots);

        // 动画完整结束后清理动画状态，恢复为稳定干净的静态 DOM
        clearTimerRef.current = window.setTimeout(() => {
            setSlots(value.split('').map(char => ({
                char,
                prevChar: char,
                isAnimating: false,
                exitDelay: 0,
                enterDelay: 0,
                exitDuration: 150,
                enterDuration: 150,
            })));
        }, maxDuration + 50);

        return () => window.clearTimeout(clearTimerRef.current);
    }, [value]);

    const isAnyAnimating = slots.some(slot => slot.isAnimating);

    if (!isAnyAnimating) {
        return (
            <span className={className} role="timer" aria-label={value}>
                {value}
            </span>
        );
    }

    return (
        <span className={className} role="timer" aria-label={value}>
            {slots.map((slot, index) => (
                <span key={index} className={styles.digitSlot}>
                    {slot.isAnimating ? (
                        <>
                            <span className={styles.digitGhost} aria-hidden="true">{slot.char}</span>
                            <span
                                key={`exit-${animCycle}-${index}`}
                                className={`${styles.digitAnim} ${styles.digitExit}`}
                                style={{
                                    animationDuration: `${slot.exitDuration}ms`,
                                    animationDelay: `${slot.exitDelay}ms`,
                                }}
                                aria-hidden="true"
                            >
                                {slot.prevChar}
                            </span>
                            <span
                                key={`enter-${animCycle}-${index}`}
                                className={`${styles.digitAnim} ${styles.digitEnter}`}
                                style={{
                                    animationDuration: `${slot.enterDuration}ms`,
                                    animationDelay: `${slot.enterDelay}ms`,
                                }}
                                aria-hidden="true"
                            >
                                {slot.char}
                            </span>
                        </>
                    ) : (
                        <span className={styles.digitStatic}>{slot.char}</span>
                    )}
                </span>
            ))}
        </span>
    );
}

export function FocusWidget({ value = DEFAULT_FOCUS, onChange, scale = 1, preview = false }: {
    value?: Sticker['focus']; onChange?: (value: NonNullable<Sticker['focus']>) => void; scale?: number; preview?: boolean;
}) {
    const { language } = useLanguage();
    const zh = language === 'zh';
    const now = useWidgetNow(250, preview);
    const wheelRef = useRef<HTMLDivElement>(null);
    const settleTimer = useRef<number>();
    const mountedRef = useRef(false);
    const wheelDragRef = useRef<{ startX: number; startScrollLeft: number; targetScrollLeft: number; moved: boolean } | null>(null);
    const suppressWheelClickRef = useRef(false);
    const snappingRef = useRef(false);
    const snapTimer = useRef<number>();
    const motionFrameRef = useRef<number>();
    const dragAnimationRef = useRef<number>();
    const [isWheelDragging, setIsWheelDragging] = useState(false);
    const [isActionPressed, setIsActionPressed] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const rawRemaining = focusRemaining(value.endsAt, value.remaining, now.getTime());
    const remaining = value.duration > 0 ? Math.min(value.duration, rawRemaining) : rawRemaining;
    const running = value.endsAt !== null && remaining > 0;
    const complete = remaining === 0;
    const isActive = running || isPaused;

    useEffect(() => {
        if (running || complete) {
            setIsPaused(false);
        }
    }, [running, complete]);

    const minutes = Math.max(1, Math.round(value.duration / 60));
    const index = FOCUS_DURATION_OPTIONS.reduce((best, option, position) => (
        Math.abs(option - minutes) < Math.abs(FOCUS_DURATION_OPTIONS[best] - minutes) ? position : best
    ), 0);
    const [centerIndex, setCenterIndex] = useState(index);

    const updateWheelMotion = () => {
        const wheel = wheelRef.current;
        if (!wheel) return;
        const wheelRect = wheel.getBoundingClientRect();
        const center = wheelRect.left + wheelRect.width / 2;
        let closestIndex = 0;
        let closestDist = Number.POSITIVE_INFINITY;
        wheel.querySelectorAll<HTMLElement>('[data-index]').forEach((node, pos) => {
            const nodeRect = node.getBoundingClientRect();
            const nodeCenter = nodeRect.left + nodeRect.width / 2;
            const dist = Math.abs(nodeCenter - center);
            if (dist < closestDist) {
                closestDist = dist;
                closestIndex = pos;
            }
        });
        setCenterIndex(prev => (prev === closestIndex ? prev : closestIndex));
    };

    const scheduleWheelMotion = () => {
        if (motionFrameRef.current !== undefined) return;
        motionFrameRef.current = window.requestAnimationFrame(() => {
            motionFrameRef.current = undefined;
            updateWheelMotion();
        });
    };

    const animateWheelDrag = () => {
        const wheel = wheelRef.current;
        const drag = wheelDragRef.current;
        if (!wheel || !drag) {
            dragAnimationRef.current = undefined;
            return;
        }
        const distance = drag.targetScrollLeft - wheel.scrollLeft;
        if (Math.abs(distance) < 0.5) {
            wheel.scrollLeft = drag.targetScrollLeft;
            dragAnimationRef.current = undefined;
            return;
        }
        wheel.scrollLeft += distance * 0.42;
        scheduleWheelMotion();
        dragAnimationRef.current = window.requestAnimationFrame(animateWheelDrag);
    };

    const scheduleWheelDrag = () => {
        if (dragAnimationRef.current === undefined) {
            dragAnimationRef.current = window.requestAnimationFrame(animateWheelDrag);
        }
    };

    const toggle = () => {
        if (isPaused) {
            setIsPaused(false);
            onChange?.({ ...value, remaining: value.duration, endsAt: null });
            return;
        }

        const current = focusRemaining(value.endsAt, value.remaining, Date.now());
        if (value.endsAt !== null && current > 0) {
            setIsPaused(true);
            onChange?.({ ...value, remaining: current, endsAt: null });
        } else {
            setIsPaused(false);
            const duration = value.duration || DEFAULT_FOCUS.duration;
            onChange?.({ ...value, remaining: duration, endsAt: Date.now() + duration * 1000 });
        }
    };

    const select = (next: number) => {
        setIsPaused(false);
        const bounded = Math.max(0, Math.min(FOCUS_DURATION_OPTIONS.length - 1, next));
        const seconds = FOCUS_DURATION_OPTIONS[bounded] * 60;
        if (seconds === value.duration) return;
        onChange?.({ mode: value.mode, duration: seconds, remaining: seconds, endsAt: null });
    };

    // 初次加载时瞬间定位到 30 分钟，绝不播放滚动动画
    useLayoutEffect(() => {
        const wheel = wheelRef.current;
        const node = wheel?.querySelector<HTMLElement>(`[data-index="${index}"]`);
        if (!wheel || !node) return;
        const target = node.offsetLeft - (wheel.clientWidth - node.offsetWidth) / 2;
        wheel.scrollLeft = target;
        updateWheelMotion();
    }, []);

    // 选中项变更时滚动到滚轮中心
    useEffect(() => {
        if (!mountedRef.current) {
            mountedRef.current = true;
            return;
        }
        const wheel = wheelRef.current;
        const node = wheel?.querySelector<HTMLElement>(`[data-index="${index}"]`);
        if (!wheel || !node) return;
        const target = node.offsetLeft - (wheel.clientWidth - node.offsetWidth) / 2;
        if (Math.abs(wheel.scrollLeft - target) < 2) return;
        window.clearTimeout(settleTimer.current);
        snappingRef.current = true;
        wheel.scrollTo({ left: target, behavior: 'smooth' });
        window.clearTimeout(snapTimer.current);
        snapTimer.current = window.setTimeout(() => { snappingRef.current = false; }, 320);
    }, [index]);

    useEffect(() => () => {
        window.clearTimeout(settleTimer.current);
        window.clearTimeout(snapTimer.current);
        if (motionFrameRef.current !== undefined) window.cancelAnimationFrame(motionFrameRef.current);
        if (dragAnimationRef.current !== undefined) window.cancelAnimationFrame(dragAnimationRef.current);
    }, []);

    useEffect(() => {
        scheduleWheelMotion();
    }, [index]);

    const centerOption = () => {
        const wheel = wheelRef.current;
        if (!wheel) return index;
        const wheelRect = wheel.getBoundingClientRect();
        const center = wheelRect.left + wheelRect.width / 2;
        let best = index;
        let bestDistance = Number.POSITIVE_INFINITY;
        wheel.querySelectorAll<HTMLElement>('[data-index]').forEach(node => {
            const rect = node.getBoundingClientRect();
            const distance = Math.abs(rect.left + rect.width / 2 - center);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = Number(node.dataset.index);
            }
        });
        return best;
    };

    const centerOptionInWheel = (position: number) => {
        const wheel = wheelRef.current;
        const node = wheel?.querySelector<HTMLElement>(`[data-index="${position}"]`);
        if (!wheel || !node) return;
        const target = node.offsetLeft - (wheel.clientWidth - node.offsetWidth) / 2;
        window.clearTimeout(settleTimer.current);
        snappingRef.current = true;
        wheel.scrollTo({ left: target, behavior: 'smooth' });
        window.clearTimeout(snapTimer.current);
        snapTimer.current = window.setTimeout(() => { snappingRef.current = false; }, 320);
    };

    // 手动滑动结束后，把最接近中心的选项写回时长并平滑吸附到正中间
    const commitFromScroll = () => {
        const best = centerOption();
        select(best);
        centerOptionInWheel(best);
    };

    const handleScroll = () => {
        scheduleWheelMotion();
        if (!isActive && !wheelDragRef.current) {
            const currentCenter = centerOption();
            select(currentCenter);
        }
        if (snappingRef.current || wheelDragRef.current) return;
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(commitFromScroll, 120);
    };

    const endWheelDrag = (event?: PointerEvent | React.PointerEvent) => {
        const drag = wheelDragRef.current;
        const wheel = wheelRef.current;

        if (dragAnimationRef.current !== undefined) {
            window.cancelAnimationFrame(dragAnimationRef.current);
            dragAnimationRef.current = undefined;
        }

        if (wheel && event && 'pointerId' in event) {
            try {
                if (wheel.hasPointerCapture(event.pointerId)) {
                    wheel.releasePointerCapture(event.pointerId);
                }
            } catch {
                // ignore
            }
        }

        if (drag && wheel) {
            if (drag.moved) {
                wheel.scrollLeft = drag.targetScrollLeft;
                const best = centerOption();
                suppressWheelClickRef.current = true;
                window.setTimeout(() => { suppressWheelClickRef.current = false; }, 50);
                select(best);
                centerOptionInWheel(best);
            }
        }

        wheelDragRef.current = null;
        setIsWheelDragging(false);
    };

    const handleWheelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const wheel = wheelRef.current;
        if (!wheel || isActive) return;
        event.stopPropagation();

        try {
            wheel.setPointerCapture(event.pointerId);
        } catch {
            // ignore
        }

        wheelDragRef.current = {
            startX: event.clientX,
            startScrollLeft: wheel.scrollLeft,
            targetScrollLeft: wheel.scrollLeft,
            moved: false,
        };
        setIsWheelDragging(true);

        const onGlobalPointerUp = (e: PointerEvent) => {
            window.removeEventListener('pointerup', onGlobalPointerUp);
            window.removeEventListener('pointercancel', onGlobalPointerUp);
            endWheelDrag(e);
        };
        window.addEventListener('pointerup', onGlobalPointerUp);
        window.addEventListener('pointercancel', onGlobalPointerUp);
    };

    const handleWheelPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = wheelDragRef.current;
        const wheel = wheelRef.current;
        if (!drag || !wheel) return;
        const delta = event.clientX - drag.startX;
        if (Math.abs(delta) > 4) drag.moved = true;
        if (!drag.moved) return;
        event.preventDefault();
        event.stopPropagation();
        drag.targetScrollLeft = drag.startScrollLeft - delta;
        scheduleWheelDrag();
        scheduleWheelMotion();

        if (!isActive) {
            const currentCenter = centerOption();
            select(currentCenter);
        }
    };

    const handleActionPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setIsActionPressed(true);
    };

    const handleActionPointerUp = () => {
        setIsActionPressed(false);
    };

    const isStop = isPaused;
    const action = running
        ? (zh ? '暂停' : 'Pause')
        : isStop
            ? (zh ? '停止' : 'Stop')
            : complete
                ? (zh ? '再来一次' : 'Again')
                : (zh ? '开始' : 'Start');
    const actionIcon = running ? pauseIcon : isStop ? stopIcon : playIcon;

    return (
        <WidgetFrame scale={scale} preview={preview} tone="focus" label={zh ? '专注计时器' : 'Focus timer'}>
            <div className={`${styles.timerBody} ${running ? styles.timerRunning : ''} ${isActive ? styles.timerActive : ''}`}>
                <div className={styles.timerDisplay}>
                    <AnimatedTimerDigits
                        value={formatRemaining(remaining)}
                        className={styles.timerDigits}
                    />
                </div>
                <button className={`${styles.timerAction} ${isStop ? styles.timerActionStop : ''} ${isActionPressed ? styles.timerActionPressed : ''}`}
                    onMouseDown={event => event.stopPropagation()}
                    onClick={toggle} onPointerDown={handleActionPointerDown} onPointerUp={handleActionPointerUp}
                    onPointerCancel={() => { setIsActionPressed(false); }} onBlur={() => setIsActionPressed(false)} aria-label={action}>
                    <WidgetIcon src={actionIcon} size={14} />
                    {action}
                </button>
                <div className={styles.picker} onMouseDown={event => event.stopPropagation()}>
                    <button className={styles.pickerArrow} disabled={isActive || index === 0}
                        onMouseDown={event => event.stopPropagation()}
                        onPointerDown={event => event.stopPropagation()}
                        onPointerUp={event => event.stopPropagation()}
                        aria-label={zh ? '减少时长' : 'Shorter'} onClick={() => select(index - 1)}>
                        <WidgetIcon src={chevronLeftIcon} size={14} />
                    </button>
                    <div
                        ref={wheelRef}
                        className={`${styles.wheel} ${isActive ? styles.wheelLocked : ''} ${isWheelDragging ? styles.wheelDragging : ''}`}
                        onMouseDown={event => event.stopPropagation()}
                        onPointerDown={handleWheelPointerDown}
                        onPointerMove={handleWheelPointerMove}
                        onPointerUp={endWheelDrag}
                        onPointerCancel={endWheelDrag}
                        onLostPointerCapture={() => endWheelDrag()}
                        onScroll={handleScroll}
                    >
                        <div className={styles.wheelTrack}>
                            {FOCUS_DURATION_OPTIONS.map((option, position) => {
                                const isCenter = position === centerIndex;
                                return (
                                    <button
                                        key={option}
                                        data-index={position}
                                        className={`${styles.wheelItem} ${isCenter ? styles.wheelItemCenter : ''}`}
                                        aria-selected={isCenter}
                                        aria-label={zh ? `${option} 分钟` : `${option} minutes`}
                                        onClick={event => {
                                            if (suppressWheelClickRef.current) {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                suppressWheelClickRef.current = false;
                                                return;
                                            }
                                            select(position);
                                        }}
                                    >
                                        {option}
                                        <span className={styles.wheelUnit}>{zh ? '分' : 'm'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <button className={styles.pickerArrow} disabled={isActive || index === FOCUS_DURATION_OPTIONS.length - 1}
                        onMouseDown={event => event.stopPropagation()}
                        onPointerDown={event => event.stopPropagation()}
                        onPointerUp={event => event.stopPropagation()}
                        aria-label={zh ? '增加时长' : 'Longer'} onClick={() => select(index + 1)}>
                        <WidgetIcon src={chevronRightIcon} size={14} />
                    </button>
                </div>
            </div>
        </WidgetFrame>
    );
}
