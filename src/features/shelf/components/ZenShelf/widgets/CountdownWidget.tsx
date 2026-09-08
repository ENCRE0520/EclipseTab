import React, { useRef, useState } from 'react';
import { Sticker } from '@/features/shelf/types/sticker';
import { useLanguage } from '@/shared/context/LanguageContext';
import { WidgetFrame, useWidgetNow } from './WidgetFrame';
import { daysUntil, localDateKey, parseLocalDate } from './widgetTime';
import styles from './Widgets.module.css';

export function CountdownWidget({ value, onChange, scale = 1, preview = false }: {
    value?: Sticker['countdown']; onChange?: (value: NonNullable<Sticker['countdown']>) => void; scale?: number; preview?: boolean;
}) {
    const { language } = useLanguage();
    const zh = language === 'zh';
    const now = useWidgetNow(1000, preview);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ title: '', date: '' });
    const [error, setError] = useState('');
    const editRef = useRef<HTMLButtonElement>(null);
    const target = value ? parseLocalDate(value.date) : null;
    const days = target ? daysUntil(target, now) : null;

    const open = () => {
        setDraft(value || { title: '', date: localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)) });
        setError('');
        setEditing(true);
    };
    const close = () => { setEditing(false); requestAnimationFrame(() => editRef.current?.focus()); };
    const save = (event: React.FormEvent) => {
        event.preventDefault();
        if (!draft.title.trim() || !parseLocalDate(draft.date)) {
            setError(zh ? '填写名称和有效日期后即可保存。' : 'Enter a name and a valid date.');
            return;
        }
        onChange?.({ title: draft.title.trim(), date: draft.date });
        close();
    };

    const isToday = days === 0;
    const title = value?.title || '';
    const targetDate = target?.toLocaleDateString(zh ? 'zh-CN' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    }) || '';
    const sentence = isToday
        ? (zh ? `今天就是 ${title}` : `Today is ${title}`)
        : days! > 0
            ? (zh ? `距离 ${title} 还有 ${Math.abs(days!)} 天` : `Days until ${title}: ${Math.abs(days!)} days`)
            : (zh ? `自从 ${title} 已经 ${Math.abs(days!)} 天` : `Days since ${title}: ${Math.abs(days!)} days`);
    const summary = isToday
        ? (zh ? `今天是 ${title}` : `Today: ${title}`)
        : days! > 0
            ? (zh ? `距离 ${title}` : `Days until ${title}`)
            : (zh ? `自从 ${title}` : `Days since ${title}`);

    return (
        <WidgetFrame scale={scale} preview={preview} tone="countdown" label={zh ? '倒数日' : 'Countdown'}>
            {editing ? (
                <form className={styles.countdownForm} onSubmit={save} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>{zh ? '名称' : 'Name'}</span>
                        <input autoFocus={!('ontouchstart' in window)} maxLength={40} required value={draft.title}
                            placeholder={zh ? '下一次旅行' : 'My next adventure'} onChange={event => setDraft({ ...draft, title: event.target.value })} />
                    </label>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>{zh ? '日期' : 'Date'}</span>
                        <input type="date" min="1000-01-01" max="9999-12-31" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} />
                    </label>
                    <span className={styles.formError} role="alert">{error}</span>
                    <div className={styles.formActions}>
                        <button type="button" onClick={close}>{zh ? '取消' : 'Cancel'}</button>
                        <button type="submit">{zh ? '保存' : 'Save'}</button>
                    </div>
                </form>
            ) : target ? (
                <div className={styles.countdownBody}>
                    <button ref={editRef} type="button" className={styles.countdownCountRow}
                        onMouseDown={event => event.stopPropagation()}
                        onPointerDown={event => event.stopPropagation()}
                        onClick={open} aria-label={sentence} title={zh ? '点击修改信息' : 'Edit details'}>
                        <span className={styles.countdownCount}>{Math.abs(days ?? 0)}</span>
                        <span className={styles.countdownUnit}>{zh ? '天' : 'days'}</span>
                    </button>
                    <div className={styles.countdownSentence}>{summary}</div>
                    <div className={styles.countdownTargetDate}>{targetDate}</div>
                </div>
            ) : (
                <button className={styles.countdownEmpty} onPointerDown={event => event.stopPropagation()} onClick={open}>
                    <span className={styles.countdownEmptyPlus} aria-hidden="true">+</span>
                    <span>{zh ? '设置日期' : 'Set a date'}</span>
                </button>
            )}
        </WidgetFrame>
    );
}
