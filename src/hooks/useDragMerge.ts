/**
 * 拖拽合并状态管理 Hook
 * 管理悬停合并、预合并状态等
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { DockItem } from '../types';
import { HOVER_OPEN_DELAY, PRE_MERGE_DELAY, HAPTIC_PATTERNS } from '../constants/layout';

// ============================================================================
// 类型定义
// ============================================================================

export interface UseDragMergeOptions {
    /** 悬停打开文件夹的回调 */
    onHoverOpenFolder?: (item: DockItem, folder: DockItem) => void;
    /** 悬停打开延迟（毫秒） */
    hoverOpenDelay?: number;
    /** 预合并延迟（毫秒） */
    preMergeDelay?: number;
    /** 获取当前项目列表 */
    getItems: () => DockItem[];
    /** 触觉反馈函数 */
    performHapticFeedback?: (pattern: number | number[]) => void;
}

export interface UseDragMergeReturn {
    // 状态
    hoveredFolderId: string | null;
    hoveredAppId: string | null;
    mergeTargetId: string | null;
    isPreMerge: boolean;

    // Refs (供外部读取)
    hoveredFolderRef: React.MutableRefObject<string | null>;
    hoveredAppRef: React.MutableRefObject<string | null>;
    mergeTargetRef: React.MutableRefObject<string | null>;
    isPreMergeRef: React.MutableRefObject<boolean>;

    // 操作
    handleMergeTargetHover: (
        foundTarget: { id: string; type: 'folder' | 'app' },
        activeItem: DockItem
    ) => boolean;
    resetMergeStates: () => void;
    setHoveredFolderId: (id: string | null) => void;
    setHoveredAppId: (id: string | null) => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useDragMerge({
    onHoverOpenFolder,
    hoverOpenDelay = HOVER_OPEN_DELAY,
    preMergeDelay = PRE_MERGE_DELAY,
    getItems,
    performHapticFeedback,
}: UseDragMergeOptions): UseDragMergeReturn {
    // 状态
    const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
    const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
    const [isPreMerge, setIsPreMerge] = useState(false);

    // Refs - 用于在事件处理器中读取最新值
    const hoveredFolderRef = useRef<string | null>(null);
    const hoveredAppRef = useRef<string | null>(null);
    const mergeTargetRef = useRef<string | null>(null);
    const isPreMergeRef = useRef(false);
    const hoverStartTime = useRef<number>(0);
    const potentialMergeTarget = useRef<string | null>(null);

    // 同步 Refs
    useEffect(() => { hoveredFolderRef.current = hoveredFolderId; }, [hoveredFolderId]);
    useEffect(() => { hoveredAppRef.current = hoveredAppId; }, [hoveredAppId]);
    useEffect(() => { mergeTargetRef.current = mergeTargetId; }, [mergeTargetId]);
    useEffect(() => { isPreMergeRef.current = isPreMerge; }, [isPreMerge]);

    /**
     * 重置所有合并相关状态
     */
    const resetMergeStates = useCallback(() => {
        setHoveredFolderId(null);
        setHoveredAppId(null);
        setMergeTargetId(null);
        setIsPreMerge(false);
        potentialMergeTarget.current = null;
    }, []);

    /**
     * 处理合并目标悬停逻辑
     * @returns true 如果已处理（如触发了悬停打开），调用者应该返回
     */
    const handleMergeTargetHover = useCallback((
        foundTarget: { id: string; type: 'folder' | 'app' },
        activeItem: DockItem
    ): boolean => {
        if (potentialMergeTarget.current !== foundTarget.id) {
            // 新的合并目标
            potentialMergeTarget.current = foundTarget.id;
            hoverStartTime.current = Date.now();
            setIsPreMerge(false);
            setMergeTargetId(null);
            setHoveredFolderId(null);
            setHoveredAppId(null);
        } else {
            const dwellTime = Date.now() - hoverStartTime.current;

            // Case B: Hover to Open (悬停打开文件夹)
            if (foundTarget.type === 'folder' && dwellTime > hoverOpenDelay && !isPreMergeRef.current) {
                if (onHoverOpenFolder) {
                    const items = getItems();
                    const targetFolder = items.find(i => i.id === foundTarget.id);
                    if (targetFolder) {
                        onHoverOpenFolder(activeItem, targetFolder);
                        potentialMergeTarget.current = null;
                        return true; // 表示已处理，调用者应该返回
                    }
                }
            }

            // Case A: Direct Drop (预合并状态)
            if (dwellTime > preMergeDelay && !isPreMergeRef.current) {
                setIsPreMerge(true);
                setMergeTargetId(foundTarget.id);
                if (foundTarget.type === 'folder') {
                    setHoveredFolderId(foundTarget.id);
                    setHoveredAppId(null);
                } else {
                    setHoveredFolderId(null);
                    setHoveredAppId(foundTarget.id);
                }
                if (performHapticFeedback) {
                    performHapticFeedback(HAPTIC_PATTERNS.MERGE);
                }
            }
        }
        return false;
    }, [onHoverOpenFolder, hoverOpenDelay, preMergeDelay, getItems, performHapticFeedback]);

    return {
        // 状态
        hoveredFolderId,
        hoveredAppId,
        mergeTargetId,
        isPreMerge,

        // Refs
        hoveredFolderRef,
        hoveredAppRef,
        mergeTargetRef,
        isPreMergeRef,

        // 操作
        handleMergeTargetHover,
        resetMergeStates,
        setHoveredFolderId,
        setHoveredAppId,
    };
}
