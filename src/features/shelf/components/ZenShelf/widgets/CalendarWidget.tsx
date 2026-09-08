import { useLanguage } from '@/shared/context/LanguageContext';
import { WidgetFrame, useWidgetNow } from './WidgetFrame';
import { localDateKey } from './widgetTime';
import styles from './Widgets.module.css';

export function CalendarWidget({ scale = 1, preview = false }: { scale?: number; preview?: boolean }) {
    const { language } = useLanguage();
    const zh = language === 'zh';
    const locale = zh ? 'zh-CN' : 'en-US';
    const now = useWidgetNow(1000, preview);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const first = (month.getDay() + 6) % 7;
    const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return (
        <WidgetFrame scale={scale} preview={preview} tone="calendar" label={zh ? '日期与日历' : 'Calendar'}>
            <div className={styles.weekdays} aria-hidden="true">
                {(zh ? ['一', '二', '三', '四', '五', '六', '日'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((day, index) => <span key={index}>{day}</span>)}
            </div>
            <div className={styles.days} aria-label={month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}>
                {Array.from({ length: first + length }, (_, index) => {
                    const day = index - first + 1;
                    if (day < 1) return <span key={index} />;
                    const date = new Date(month.getFullYear(), month.getMonth(), day);
                    const isToday = localDateKey(date) === localDateKey(now);
                    return <span key={index} className={`${styles.day} ${isToday ? styles.currentDay : ''}`}
                        aria-label={date.toLocaleDateString(locale, { dateStyle: 'full' })}
                        aria-current={isToday ? 'date' : undefined}>{day}</span>;
                })}
            </div>
        </WidgetFrame>
    );
}
