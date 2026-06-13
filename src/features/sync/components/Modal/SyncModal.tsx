import React, { useState, useCallback } from 'react';
import { PopoverPanel } from '@/shared/components/PopoverPanel/PopoverPanel';
import { useLanguage } from '@/shared/context/LanguageContext';
import { testConnection, uploadToCloud, fullSyncFromCloud, isAutoSyncEnabled, setAutoSyncEnabled } from '../../services/syncManager';
import { getLastSyncTimeLabel } from '../../services/syncData';
import styles from './SyncModal.module.css';

interface SyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    anchorPosition: { x: number; y: number };
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, anchorPosition }) => {
    const { t } = useLanguage();

    const [serverUrl, setServerUrl] = useState(localStorage.getItem('EclipseTab_webdav_url') || '');
    const [username, setUsername] = useState(localStorage.getItem('EclipseTab_webdav_user') || '');
    const [password, setPassword] = useState(localStorage.getItem('EclipseTab_webdav_pass') || '');
    const [status, setStatus] = useState<'untested' | 'success' | 'failed'>('untested');
    const [statusMsg, setStatusMsg] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [syncWallpaper, setSyncWallpaper] = useState(() => localStorage.getItem('EclipseTab_syncWallpaper') === 'true');
    const [syncStickers, setSyncStickers] = useState(() => localStorage.getItem('EclipseTab_syncStickers') === 'true');
    const [autoSync, setAutoSync] = useState(() => isAutoSyncEnabled());

    const lastSyncLabel = getLastSyncTimeLabel();

    const saveToStorage = useCallback((key: string, value: string) => {
        localStorage.setItem(key, value);
        setStatus('untested');
        setStatusMsg('');
    }, []);

    const handleTestConnection = useCallback(async () => {
        if (isTesting) return;
        setIsTesting(true);
        setStatus('untested');
        setStatusMsg('');

        const result = await testConnection();
        setStatus(result.ok ? 'success' : 'failed');
        setStatusMsg(result.message);
        setIsTesting(false);
    }, [isTesting]);

    const handleUpload = useCallback(async () => {
        if (isUploading) return;
        setIsUploading(true);
        setStatusMsg('');

        const result = await uploadToCloud();
        setStatus(result.ok ? 'success' : 'failed');
        setStatusMsg(result.message);
        setIsUploading(false);
    }, [isUploading]);

    const handleDownload = useCallback(async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        setStatusMsg('');

        const result = await fullSyncFromCloud();
        if (!result.ok && result.hasConflict) {
            // 云端比本地旧，用户确认后强制覆盖
            const force = window.confirm(result.message);
            if (force) {
                const forceResult = await fullSyncFromCloud(true);
                setStatus(forceResult.ok ? 'success' : 'failed');
                setStatusMsg(forceResult.message);
            } else {
                setStatusMsg('Download cancelled');
            }
        } else {
            setStatus(result.ok ? 'success' : 'failed');
            setStatusMsg(result.message);
        }
        setIsDownloading(false);
    }, [isDownloading]);

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            anchorPosition={anchorPosition}
            width={264}
        >
            {/* 头部 */}
            <div className={styles.headerSection}>
                <div className={styles.iconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 16.5C4.067 16.5 2.5 14.933 2.5 13C2.5 11.2336 3.82137 9.77196 5.53982 9.53587C6.01258 6.84074 8.2435 4.80005 11 4.80005C13.9142 4.80005 16.3262 6.95315 16.8924 9.74204C17.1517 9.68452 17.4243 9.65342 17.7059 9.65342C20.3547 9.65342 22.5019 11.8006 22.5019 14.4495C22.5019 17.0983 20.3547 19.2455 17.7059 19.2455L6 19.2455" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div className={styles.headerText}>
                    <span className={styles.titleText}>{t.sync.title}</span>
                    <span className={styles.lastSyncText}>
                        {lastSyncLabel ? `${t.sync.lastSync}: ${lastSyncLabel}` : t.sync.neverSynced}
                    </span>
                </div>
            </div>

            {/* 服务器配置 */}
            <div className={styles.cardSection}>
                <div className={styles.inputRow}>
                    <span className={styles.inputLabel}>{t.sync.serverUrl}</span>
                    <input
                        type="text"
                        className={styles.inputField}
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        onBlur={(e) => saveToStorage('EclipseTab_webdav_url', e.target.value)}
                        placeholder="https://dav.jianguoyun.com/dav/"
                    />
                </div>
                <div className={styles.inputRow}>
                    <span className={styles.inputLabel}>{t.sync.username}</span>
                    <input
                        type="text"
                        className={styles.inputField}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onBlur={(e) => saveToStorage('EclipseTab_webdav_user', e.target.value)}
                        placeholder="user@example.com"
                    />
                </div>
                <div className={styles.inputRow}>
                    <span className={styles.inputLabel}>{t.sync.password}</span>
                    <input
                        type="password"
                        className={styles.inputField}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={(e) => saveToStorage('EclipseTab_webdav_pass', e.target.value)}
                        placeholder={t.sync.password}
                    />
                </div>
            </div>

            {/* 连接测试 */}
            <div className={styles.cardSection}>
                <div className={styles.testRow}>
                    <div className={styles.testLeft}>
                        <div className={`${styles.statusDot} ${
                            status === 'success' ? styles.statusDotSuccess :
                            status === 'failed' ? styles.statusDotFailed : styles.statusDotUntested
                        }`} />
                        <span className={styles.statusLabel}>{t.sync.statusLabel}</span>
                        <span className={`${styles.statusValue} ${
                            status === 'success' ? styles.statusSuccess :
                            status === 'failed' ? styles.statusFailed : ''
                        }`}>
                            {status === 'success' ? t.sync.statusSuccess :
                             status === 'failed' ? t.sync.statusFailed : t.sync.statusUntested}
                        </span>
                    </div>
                    <button className={`${styles.btnBase} ${styles.btnCompact}`} onClick={handleTestConnection} disabled={isTesting}>
                        {isTesting ? 'Testing...' : t.sync.testConnection}
                    </button>
                </div>
                {statusMsg && (
                    <div className={styles.statusMsg}>{statusMsg}</div>
                )}
            </div>

            {/* 同步选项 */}
            <div className={styles.cardSection}>
                <div className={styles.optionRow}>
                    <span className={styles.optionLabel}>{t.sync.autoSyncTitle}</span>
                    <button
                        className={`${styles.toggle} ${autoSync ? styles.toggleActive : ''}`}
                        onClick={() => {
                            const next = !autoSync;
                            setAutoSync(next);
                            setAutoSyncEnabled(next);
                        }}
                    >
                        <div className={styles.toggleKnob} />
                    </button>
                </div>
                <div className={styles.optionRow}>
                    <span className={styles.optionLabel}>{t.sync.syncWallpaper}</span>
                    <button
                        className={`${styles.toggle} ${syncWallpaper ? styles.toggleActive : ''}`}
                        onClick={() => {
                            const next = !syncWallpaper;
                            setSyncWallpaper(next);
                            localStorage.setItem('EclipseTab_syncWallpaper', String(next));
                        }}
                    >
                        <div className={styles.toggleKnob} />
                    </button>
                </div>
                <div className={styles.optionRow}>
                    <span className={styles.optionLabel}>{t.sync.syncStickers}</span>
                    <button
                        className={`${styles.toggle} ${syncStickers ? styles.toggleActive : ''}`}
                        onClick={() => {
                            const next = !syncStickers;
                            setSyncStickers(next);
                            localStorage.setItem('EclipseTab_syncStickers', String(next));
                        }}
                    >
                        <div className={styles.toggleKnob} />
                    </button>
                </div>
            </div>

            {/* 操作按钮 */}
            <div className={styles.cardSection}>
                <div className={styles.buttonRow}>
                    <button className={`${styles.btnBase} ${styles.btnFull}`} onClick={handleDownload} disabled={isDownloading}>
                        {isDownloading ? 'Downloading...' : t.sync.downloadFromCloud}
                    </button>
                    <button className={`${styles.btnBase} ${styles.btnFull} ${styles.btnPrimary}`} onClick={handleUpload} disabled={isUploading}>
                        {isUploading ? 'Uploading...' : t.sync.uploadToCloud}
                    </button>
                </div>
            </div>
        </PopoverPanel>
    );
};
