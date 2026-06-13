import { useEffect, useRef } from 'react';
import { autoSync, uploadToCloud, isAutoSyncEnabled } from '../services/syncManager';
import { hasLocalChanges, computeLocalFingerprint } from '../services/syncData';

/**
 * useAutoSync - 防抖自动上传
 * 
 * 1. 打开标签页时立即同步一次
 * 2. 每 5 秒检测一次，指纹变了（新改动）重置 5 秒计时器
 * 3. 连续 5 秒指纹没变 → 上传
 */
export function useAutoSync() {
    const debounceRef = useRef(0);
    const lastFpRef = useRef('');

    useEffect(() => {
        autoSync();

        const interval = setInterval(() => {
            if (!isAutoSyncEnabled()) return;

            if (!hasLocalChanges()) {
                debounceRef.current = 0;
                lastFpRef.current = '';
                return;
            }

            const fp = computeLocalFingerprint();
            if (fp !== lastFpRef.current) {
                lastFpRef.current = fp;
                debounceRef.current = Date.now();
                return;
            }

            if (debounceRef.current > 0 && Date.now() - debounceRef.current >= 5000) {
                debounceRef.current = 0;
                lastFpRef.current = '';
                uploadToCloud();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);
}
