import { Sticker } from '@/features/shelf/types/sticker';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import { CalendarWidget } from './CalendarWidget';
import { FocusWidget } from './FocusWidget';
import { CountdownWidget } from './CountdownWidget';

export function ProductivityWidget({ sticker, preview = false, scale = sticker.scale || 1 }: {
    sticker: Sticker; preview?: boolean; scale?: number;
}) {
    const { updateSticker } = useZenShelf();
    if (sticker.widgetType === 'calendar') return <CalendarWidget scale={scale} preview={preview} />;
    if (sticker.widgetType === 'focus') return <FocusWidget scale={scale} preview={preview} value={sticker.focus}
        onChange={focus => updateSticker(sticker.id, { focus })} />;
    return <CountdownWidget scale={scale} preview={preview} value={sticker.countdown}
        onChange={countdown => updateSticker(sticker.id, { countdown })} />;
}
