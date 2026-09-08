import React, { useEffect, useState } from 'react';
import styles from './Widgets.module.css';

/** 小组件统一尺寸（1:1 正方形，8px 网格） */
export const WIDGET_SIZE = 240;

export function useWidgetNow(interval: number, preview = false) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        if (preview) return;
        const update = () => setNow(new Date());
        const timer = window.setInterval(update, interval);
        document.addEventListener('visibilitychange', update);
        window.addEventListener('focus', update);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', update);
            window.removeEventListener('focus', update);
        };
    }, [interval, preview]);
    return now;
}

/**
 * 贴纸外框：
 * - 白边由不会被 transform 缩放的 .frame::before 承载，scale 变化时描边宽度恒定
 * - frame 与 surface 同尺寸，避免缩放时右侧 / 下侧出现透明空隙
 * - 圆角 / 投影 / 内容缩放都跟随 scale
 */
export function WidgetFrame({ children, scale = 1, preview = false, label, tone }: {
    children: React.ReactNode; scale?: number; preview?: boolean;
    label: string; tone: 'calendar' | 'focus' | 'countdown';
}) {
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const outer = WIDGET_SIZE * safeScale;
    return (
        <div
            style={{
                width: outer,
                height: outer,
                '--widget-scale': safeScale,
            } as React.CSSProperties}
            className={styles.frame}
        >
            <fieldset
                disabled={preview}
                aria-label={label}
                className={`${styles.surface} ${styles[tone]}`}
                style={{ width: WIDGET_SIZE, height: WIDGET_SIZE, transform: `scale(${safeScale})` }}
                onMouseDown={event => {
                    if ((event.target as HTMLElement).closest('button, input, select, label, form')) event.stopPropagation();
                }}
                onDoubleClick={event => event.stopPropagation()}
                onKeyDown={event => event.stopPropagation()}
            >
                {children}
            </fieldset>
        </div>
    );
}

/** 与标签页其他图标一致：SVG 遮罩 + currentColor */
export function WidgetIcon({ src, size = 16 }: { src: string; size?: number }) {
    return (
        <span
            className={styles.icon}
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                WebkitMaskImage: `url(${src})`,
                maskImage: `url(${src})`,
            }}
        />
    );
}
