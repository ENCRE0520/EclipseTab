import { useEffect, useRef, useState } from 'react';
import chevronLeftIcon from '@/assets/icons/chevron-left.svg';
import chevronRightIcon from '@/assets/icons/chevron-right.svg';
import pauseIcon from '@/assets/icons/pause.svg';
import playIcon from '@/assets/icons/play.svg';
import { Sticker } from '@/features/shelf/types/sticker';
import { useLanguage } from '@/shared/context/LanguageContext';
import { WidgetFrame, WidgetIcon, useWidgetNow } from './WidgetFrame';
import { FOCUS_DURATION_OPTIONS, focusRemaining } from './widgetTime';
import styles from './Widgets.module.css';

const DEFAULT_FOCUS: NonNullable<Sticker['focus']> = { mode: 'focus', duration: 1500, remaining: 1500, endsAt: null };

const formatRemaining = (total: number): string => {
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${clock}` : clock;
};

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
    const releaseTimer = useRef<number>();
    const [isWheelDragging, setIsWheelDragging] = useState(false);
    const [wheelMotion, setWheelMotion] = useState<number[]>([]);
    const [isActionPressed, setIsActionPressed] = useState(false);
    const [showReleaseMotion, setShowReleaseMotion] = useState(false);

    const remaining = focusRemaining(value.endsAt, value.remaining, now.getTime());
    const running = value.endsAt !== null && remaining > 0;
    const complete = remaining === 0;

    const minutes = Math.max(1, Math.round(value.duration / 60));
    const index = FOCUS_DURATION_OPTIONS.reduce((best, option, position) => (
        Math.abs(option - minutes) < Math.abs(FOCUS_DURATION_OPTIONS[best] - minutes) ? position : best
    ), 0);

    // 根据每个选项距离中心的距离，连续插值字号、字重和透明度。
    // 滚轮滚动本身负责位移，这里的插值负责让“靠近中心 = 更突出”连续发生。
    const updateWheelMotion = () => {
        const wheel = wheelRef.current;
        if (!wheel) return;
        const center = wheel.getBoundingClientRect().left + wheel.clientWidth / 2;
        const next = Array.from(wheel.querySelectorAll<HTMLElement>('[data-index]')).map(node => {
            const nodeCenter = node.getBoundingClientRect().left + node.offsetWidth / 2;
            return Math.max(0, Math.min(1, 1 - Math.abs(nodeCenter - center) / 72));
        });
        setWheelMotion(previous => (
            previous.length === next.length && next.every((value, position) => Math.abs(value - previous[position]) < 0.01)
                ? previous
                : next
        ));
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
        const current = focusRemaining(value.endsAt, value.remaining, Date.now());
        if (value.endsAt !== null && current > 0) onChange?.({ ...value, remaining: current, endsAt: null });
        else onChange?.({ ...value, remaining: current || value.duration, endsAt: Date.now() + (current || value.duration) * 1000 });
    };

    const select = (next: number) => {
        const bounded = Math.max(0, Math.min(FOCUS_DURATION_OPTIONS.length - 1, next));
        const seconds = FOCUS_DURATION_OPTIONS[bounded] * 60;
        if (seconds === value.duration) return;
        onChange?.({ mode: value.mode, duration: seconds, remaining: seconds, endsAt: null });
    };

    // 选中项始终滚动到滚轮中心
    useEffect(() => {
        const wheel = wheelRef.current;
        const node = wheel?.querySelector<HTMLElement>(`[data-index="${index}"]`);
        if (!wheel || !node) return;
        const target = node.offsetLeft - (wheel.clientWidth - node.offsetWidth) / 2;
        if (Math.abs(wheel.scrollLeft - target) < 2) {
            mountedRef.current = true;
            return;
        }
        window.clearTimeout(settleTimer.current);
        snappingRef.current = true;
        wheel.scrollTo({ left: target, behavior: mountedRef.current ? 'smooth' : 'auto' });
        window.clearTimeout(snapTimer.current);
        snapTimer.current = window.setTimeout(() => { snappingRef.current = false; }, 320);
        mountedRef.current = true;
    }, [index]);

    useEffect(() => () => {
        window.clearTimeout(settleTimer.current);
        window.clearTimeout(snapTimer.current);
        window.clearTimeout(releaseTimer.current);
        if (motionFrameRef.current !== undefined) window.cancelAnimationFrame(motionFrameRef.current);
        if (dragAnimationRef.current !== undefined) window.cancelAnimationFrame(dragAnimationRef.current);
    }, []);

    useEffect(() => {
        scheduleWheelMotion();
    }, [index]);

    const centerOption = () => {
        const wheel = wheelRef.current;
        if (!wheel) return index;
        const center = wheel.getBoundingClientRect().left + wheel.clientWidth / 2;
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

    // 手动滑动结束后，把最接近中心的选项写回时长并平滑吸附
    const commitFromScroll = () => {
        const best = centerOption();
        if (FOCUS_DURATION_OPTIONS[best] * 60 !== value.duration) select(best);
    };

    const handleScroll = () => {
        scheduleWheelMotion();
        if (snappingRef.current || wheelDragRef.current) return;
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(commitFromScroll, 120);
    };

    const handleWheelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const wheel = wheelRef.current;
        if (!wheel || running) return;
        wheel.setPointerCapture(event.pointerId);
        wheelDragRef.current = { startX: event.clientX, startScrollLeft: wheel.scrollLeft, targetScrollLeft: wheel.scrollLeft, moved: false };
        setIsWheelDragging(true);
        event.stopPropagation();
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
    };

    const handleWheelPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = wheelDragRef.current;
        const wheel = wheelRef.current;
        if (!drag || !wheel) return;
        if (drag.moved) {
            if (dragAnimationRef.current !== undefined) {
                window.cancelAnimationFrame(dragAnimationRef.current);
                dragAnimationRef.current = undefined;
            }
            wheel.scrollLeft = drag.targetScrollLeft;
            const best = centerOption();
            suppressWheelClickRef.current = true;
            window.setTimeout(() => { suppressWheelClickRef.current = false; }, 50);
            select(best);
            centerOptionInWheel(best);
        }
        if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId);
        wheelDragRef.current = null;
        setIsWheelDragging(false);
        event.stopPropagation();
    };

    const handleActionPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        window.clearTimeout(releaseTimer.current);
        setIsActionPressed(true);
        setShowReleaseMotion(false);
    };

    const handleActionPointerUp = () => {
        setIsActionPressed(false);
        setShowReleaseMotion(true);
        window.clearTimeout(releaseTimer.current);
        releaseTimer.current = window.setTimeout(() => setShowReleaseMotion(false), 280);
    };

    const action = running ? (zh ? '暂停' : 'Pause') : complete ? (zh ? '再来一次' : 'Again') : (zh ? '开始' : 'Start');

    return (
        <WidgetFrame scale={scale} preview={preview} tone="focus" label={zh ? '专注计时器' : 'Focus timer'}>
            <div className={`${styles.timerBody} ${running ? styles.timerRunning : ''} ${showReleaseMotion ? styles.timerReleaseMotion : ''}`}>
                <div className={styles.timerDisplay}>
                    <span
                        className={styles.timerDigits}
                        role="timer"
                    >
                        {formatRemaining(remaining)}
                    </span>
                </div>
                <button className={`${styles.timerAction} ${isActionPressed ? styles.timerActionPressed : ''} ${showReleaseMotion ? styles.timerActionReleased : ''}`}
                    onMouseDown={event => event.stopPropagation()}
                    onClick={toggle} onPointerDown={handleActionPointerDown} onPointerUp={handleActionPointerUp}
                    onPointerCancel={() => { setIsActionPressed(false); }} onBlur={() => setIsActionPressed(false)} aria-label={action}>
                    <WidgetIcon src={running ? pauseIcon : playIcon} size={14} />
                    {action}
                </button>
                <div className={styles.picker}>
                    <button className={styles.pickerArrow} disabled={running || index === 0}
                        onMouseDown={event => event.stopPropagation()}
                        onPointerDown={event => event.stopPropagation()}
                        onPointerUp={event => event.stopPropagation()}
                        aria-label={zh ? '减少时长' : 'Shorter'} onClick={() => select(index - 1)}>
                        <WidgetIcon src={chevronLeftIcon} size={14} />
                    </button>
                    <div
                        ref={wheelRef}
                        className={`${styles.wheel} ${running ? styles.wheelLocked : ''} ${isWheelDragging ? styles.wheelDragging : ''}`}
                        onMouseDown={event => event.stopPropagation()}
                        onPointerDown={handleWheelPointerDown}
                        onPointerMove={handleWheelPointerMove}
                        onPointerUp={handleWheelPointerUp}
                        onPointerCancel={handleWheelPointerUp}
                        onScroll={handleScroll}
                    >
                        <div className={styles.wheelTrack}>
                            {FOCUS_DURATION_OPTIONS.map((option, position) => (
                                <button key={option} data-index={position} className={styles.wheelItem}
                                    style={{
                                        fontWeight: Math.round(540 + (wheelMotion[position] ?? (position === index ? 1 : 0)) * 60),
                                        opacity: 0.42 + (wheelMotion[position] ?? (position === index ? 1 : 0)) * 0.58,
                                        transform: `scale(${0.9 + (wheelMotion[position] ?? (position === index ? 1 : 0)) * 0.1})`,
                                    }}
                                    aria-selected={position === index}
                                    aria-label={zh ? `${option} 分钟` : `${option} minutes`}
                                    onClick={event => {
                                        if (suppressWheelClickRef.current) {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            suppressWheelClickRef.current = false;
                                            return;
                                        }
                                        select(position);
                                    }}>
                                    {option}
                                    <span className={styles.wheelUnit}>{zh ? '分' : 'm'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <button className={styles.pickerArrow} disabled={running || index === FOCUS_DURATION_OPTIONS.length - 1}
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
