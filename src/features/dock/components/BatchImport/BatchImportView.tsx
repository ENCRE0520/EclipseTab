import React, { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { DockItem } from '@/shared/types';
import { normalizeUrl } from '@/shared/utils/url';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useDockData } from '@/features/dock/context/DockContext';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
import { parseAndValidateImportFile } from '@/features/spaces/utils/spaceExportImport';
import { BookmarkNode, isBookmarkApiAvailable } from '@/features/dock/utils/bookmarks';
import { fetchIcon } from '@/features/dock/utils/iconFetcher';
import { BatchImportCard, CardData } from './BatchImportCard';
import { BookmarkPicker } from './BookmarkPicker';
import styles from './BatchImport.module.css';

interface BatchImportViewProps {
    isOpen: boolean;
    onClose: () => void;
}

const AI_PROMPT_EN = `I need you to generate a browser new-tab extension space configuration file. Please strictly follow this JSON format:

{
  "version": "1.0",
  "type": "eclipse-space-export",
  "data": {
    "name": "Space Name",
    "iconType": "text",
    "apps": [
      { "title": "Website Name", "url": "https://full-url", "type": "app" }
    ]
  }
}

Based on the website names I provide, automatically fill in the correct URLs. If I only mention a category (e.g., "design tools"), recommend the most popular websites in that field.

The websites I want to add:
`;

const AI_PROMPT_ZH = `我需要你帮我生成一个浏览器新标签页扩展的空间配置文件。请严格按照以下 JSON 格式输出：

{
  "version": "1.0",
  "type": "eclipse-space-export",
  "data": {
    "name": "空间名称",
    "iconType": "text",
    "apps": [
      { "title": "网站名称", "url": "https://完整网址", "type": "app" }
    ]
  }
}

请根据我提供的网站名称，自动填写正确的网址。如果我只说类别（如"设计工具"），请推荐该领域最常用的网站。

我想要添加的网站：
`;

function createEmptyCard(): CardData {
    return {
        id: crypto.randomUUID(),
        name: '',
        url: '',
        icon: '',
        iconSmall: false,
    };
}

export const BatchImportView: React.FC<BatchImportViewProps> = ({ isOpen, onClose }) => {
    const { t, language } = useLanguage();
    const { setDockItems } = useDockData();
    const { importSpace, importMultipleSpaces } = useSpaces();

    const [cards, setCards] = useState<CardData[]>([createEmptyCard()]);
    const [isClosing, setIsClosing] = useState(false);
    const [showBookmarkPicker, setShowBookmarkPicker] = useState(false);
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cardsAreaRef = useRef<HTMLDivElement>(null);
    // 用于追踪关闭状态，防止异步图标获取在关闭后仍更新状态
    const closedRef = useRef(false);
    const isClosingRef = useRef(false);

    const handleClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        closedRef.current = true;
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setCards([createEmptyCard()]);
            setCopied(false);
            closedRef.current = false;
            isClosingRef.current = false;
            onClose();
        }, 250);
    }, [onClose]);

    const handleCardChange = useCallback((id: string, data: Partial<CardData>) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    }, []);

    const handleCardRemove = useCallback((id: string) => {
        setCards(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
    }, []);

    const handleAddCard = useCallback(() => {
        setCards(prev => [...prev, createEmptyCard()]);
        // 新卡片渲染后平滑滚动到最右侧
        setTimeout(() => {
            if (cardsAreaRef.current) {
                cardsAreaRef.current.scrollTo({
                    left: cardsAreaRef.current.scrollWidth,
                    behavior: 'smooth',
                });
            }
        }, 50);
    }, []);

    // 批量提交
    const handleConfirm = useCallback(() => {
        const validCards = cards.filter(c => c.name.trim());
        if (validCards.length === 0) return;

        const newItems: DockItem[] = validCards.map(c => ({
            id: crypto.randomUUID(),
            name: c.name.trim(),
            url: normalizeUrl(c.url),
            icon: c.icon || undefined,
            iconSmall: c.iconSmall || undefined,
            type: 'app' as const,
        }));

        setDockItems(prev => [...prev, ...newItems]);

        // 异步获取缺失的图标，使用 closedRef 防止组件已卸载后仍更新
        const itemsToFetch = newItems.filter(item => !item.icon && item.url);
        itemsToFetch.forEach(item => {
            fetchIcon(item.url!).then(result => {
                if (closedRef.current) return;
                setDockItems(prev => prev.map(i =>
                    i.id === item.id ? { ...i, icon: result.url, iconSmall: result.iconSmall } : i
                ));
            }).catch(() => {
                // 静默失败
            });
        });

        handleClose();
    }, [cards, setDockItems, handleClose]);

    // 从书签导入：直接将书签数据转为卡片，无需经过 bookmarksToDockItems
    const handleBookmarkImport = useCallback((bookmarks: BookmarkNode[]) => {
        const newCards: CardData[] = bookmarks
            .filter(b => b.url)
            .map(b => ({
                id: crypto.randomUUID(),
                name: b.title || (() => { try { return new URL(b.url!).hostname; } catch { return b.url!; } })(),
                url: b.url || '',
                icon: '',
                iconSmall: false,
            }));

        setCards(prev => {
            // 如果当前只有一个空卡片，替换它
            if (prev.length === 1 && !prev[0].name && !prev[0].url) {
                return newCards.length > 0 ? newCards : prev;
            }
            return [...prev, ...newCards];
        });

        // 异步批量获取书签的图标
        newCards.forEach(card => {
            if (card.url) {
                const normalized = normalizeUrl(card.url);
                fetchIcon(normalized).then(result => {
                    if (closedRef.current) return;
                    setCards(prev => prev.map(c =>
                        c.id === card.id && !c.icon
                            ? { ...c, icon: result.url, iconSmall: !!result.iconSmall }
                            : c
                    ));
                }).catch(() => {
                    // 静默失败
                });
            }
        });
    }, []);

    // 复制 AI Prompt
    const handleCopyPrompt = useCallback(async () => {
        const prompt = language === 'zh' ? AI_PROMPT_ZH : AI_PROMPT_EN;
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback: 使用已弃用的 execCommand('copy') 作为兼容方案
            const textarea = document.createElement('textarea');
            textarea.value = prompt;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy'); // eslint-disable-line deprecation/deprecation
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [language]);

    // 导入 AI 生成的 JSON 文件
    const handleImportJsonFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await parseAndValidateImportFile(file);
            if (result.type === 'single') {
                await importSpace(result.data);
            } else {
                await importMultipleSpaces(result.data);
            }
            handleClose();
        } catch (err) {
            alert((t.space.importFailed || 'Import failed: ') + String(err));
        }

        // 重置 input
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [importSpace, importMultipleSpaces, handleClose, t]);

    if (!isOpen && !isClosing) return null;

    const validCount = cards.filter(c => c.name.trim()).length;
    const hasBookmarkApi = isBookmarkApiAvailable();

    const overlayClass = [
        styles.overlay,
        isOpen && !isClosing ? styles.open : '',
        isClosing ? styles.closing : '',
    ].filter(Boolean).join(' ');

    return ReactDOM.createPortal(
        <div className={overlayClass} onClick={handleClose}>
            {/* 关闭按钮 */}
            <button className={styles.closeButton} onClick={handleClose}>
                <div className={styles.closeButtonInner}>
                    <svg className={styles.closeIcon} viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </button>

            <div className={styles.content} onClick={e => e.stopPropagation()}>
                {/* 左侧工具栏 */}
                <div className={styles.sidebar}>
                    {/* 从书签导入 */}
                    <div
                        className={styles.sideCard}
                        onClick={() => hasBookmarkApi && setShowBookmarkPicker(true)}
                        style={!hasBookmarkApi ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                    >
                        <span className={styles.sideCardTitle}>
                            {t.batchImport?.fromBookmarks || 'Import from Bookmarks'}
                        </span>
                        <span className={styles.sideCardDesc}>
                            {t.batchImport?.fromBookmarksDesc || 'Select bookmarks from your browser to import'}
                        </span>
                        {!hasBookmarkApi && (
                            <span className={styles.noApiHint}>
                                {t.batchImport?.bookmarkApiUnavailable || 'Bookmark API not available'}
                            </span>
                        )}
                    </div>

                    {/* AI 生成空间 */}
                    <div className={styles.sideCard} style={{ cursor: 'default' }}>
                        <span className={styles.sideCardTitle}>
                            {t.batchImport?.aiGenerate || 'AI Generate Space'}
                        </span>
                        <div className={styles.aiCardContent}>
                            <div className={styles.aiSteps}>
                                <ol>
                                    <li>{t.batchImport?.aiStep1 || 'Copy the prompt below'}</li>
                                    <li>{t.batchImport?.aiStep2 || 'Paste into any AI tool, add your website names'}</li>
                                    <li>{t.batchImport?.aiStep3 || 'Import the generated JSON file'}</li>
                                </ol>
                            </div>
                            <div className={styles.aiButtons}>
                                <button
                                    className={`${styles.aiBtn} ${copied ? styles.copied : ''}`}
                                    onClick={handleCopyPrompt}
                                >
                                    {copied ? (
                                        <>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            {t.batchImport?.copied || 'Copied!'}
                                        </>
                                    ) : (
                                        <>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                                                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                            {t.batchImport?.copyPrompt || 'Copy Prompt'}
                                        </>
                                    )}
                                </button>
                                <button
                                    className={`${styles.aiBtn} ${styles.aiBtnPrimary}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    {t.batchImport?.importJson || 'Import JSON'}
                                </button>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImportJsonFile}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {/* 中心卡片区域 */}
                <div ref={cardsAreaRef} className={styles.cardsArea}>
                    {cards.map((card, index) => (
                        <BatchImportCard
                            key={card.id}
                            data={card}
                            index={index}
                            canRemove={cards.length > 1}
                            onChange={handleCardChange}
                            onRemove={handleCardRemove}
                        />
                    ))}
                    {/* 追加按钮 */}
                    <div className={styles.addCardButton} onClick={handleAddCard}>
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* 底部确认栏 */}
            <div className={styles.bottomBar}>
                <button className={`${styles.bottomButton} ${styles.cancelBtn}`} onClick={handleClose}>
                    {t.modal.cancel}
                </button>
                <button
                    className={`${styles.bottomButton} ${styles.confirmBtn}`}
                    onClick={handleConfirm}
                    disabled={validCount === 0}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2.67C8.18 2.67 8.35 2.74 8.47 2.86C8.6 2.99 8.67 3.16 8.67 3.33V7.33H12.67C12.84 7.33 13.01 7.4 13.14 7.53C13.26 7.65 13.33 7.82 13.33 8C13.33 8.18 13.26 8.35 13.14 8.47C13.01 8.6 12.84 8.67 12.67 8.67H8.67V12.67C8.67 12.84 8.6 13.01 8.47 13.14C8.35 13.26 8.18 13.33 8 13.33C7.82 13.33 7.65 13.26 7.53 13.14C7.4 13.01 7.33 12.84 7.33 12.67V8.67H3.33C3.16 8.67 2.99 8.6 2.86 8.47C2.74 8.35 2.67 8.18 2.67 8C2.67 7.82 2.74 7.65 2.86 7.53C2.99 7.4 3.16 7.33 3.33 7.33H7.33V3.33C7.33 3.16 7.4 2.99 7.53 2.86C7.65 2.74 7.82 2.67 8 2.67Z" fill="currentColor" />
                    </svg>
                    {t.batchImport?.addAll || 'Add All'} ({validCount})
                </button>
            </div>

            {/* 书签选择器 */}
            <BookmarkPicker
                isOpen={showBookmarkPicker}
                onClose={() => setShowBookmarkPicker(false)}
                onImport={handleBookmarkImport}
            />
        </div>,
        document.body
    );
};
