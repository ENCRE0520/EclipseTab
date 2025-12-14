import { useEffect, useRef, useState, useCallback } from 'react';
import { DockItem as DockItemType } from '../../types';
import { DockItem } from './DockItem';
import { AddIcon } from './AddIcon';
import { DockNavigator } from './DockNavigator';
import { SpaceManageMenu } from '../Modal/SpaceManageMenu';
import { DragPreview } from '../DragPreview';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useDockDrag } from '../../context/DockContext';
import { useSpaces } from '../../context/SpacesContext';
import { generateFolderIcon } from '../../utils/iconFetcher';
import {
    EASE_SWIFT,
    SQUEEZE_ANIMATION_DURATION,
    FADE_DURATION,
} from '../../constants/layout';
import styles from './Dock.module.css';

interface DockProps {
    items: DockItemType[];
    isEditMode: boolean;
    onItemClick: (item: DockItemType, rect?: DOMRect) => void;
    onItemEdit: (item: DockItemType, rect?: DOMRect) => void;
    onItemDelete: (item: DockItemType) => void;
    onItemAdd: (rect?: DOMRect) => void;
    onItemsReorder: (items: DockItemType[]) => void;
    onDropToFolder?: (item: DockItemType, folder: DockItemType) => void;
    onDragToOpenFolder?: (item: DockItemType) => void;
    onHoverOpenFolder?: (item: DockItemType, folder: DockItemType) => void;
    onLongPressEdit?: () => void;
    onWidthChange?: (width: number) => void;
    // Cross‑component drag feedback
    externalDragItem?: DockItemType | null;
    onDragStart?: (item: DockItemType) => void;
    onDragEnd?: () => void;
}

export const Dock: React.FC<DockProps> = ({
    items,
    isEditMode,
    onItemClick,
    onItemEdit,
    onItemDelete,
    onItemAdd,
    onItemsReorder,
    onDropToFolder,
    onDragToOpenFolder,
    onHoverOpenFolder,
    onLongPressEdit,
    onWidthChange,
    externalDragItem,
    onDragStart,
    onDragEnd,
}) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const { folderPlaceholderActive } = useDockDrag();

    // Focus Spaces 集成
    const {
        spaces,
        currentSpace,
        currentIndex,
        isSwitching,
        setIsSwitching,
        switchToNextSpace,
        addSpace,
        renameSpace,
        deleteSpace,
        importSpace,
        pinSpace,
    } = useSpaces();

    // 动画阶段状态机: idle → exiting → hidden → entering → idle
    // hidden 阶段确保新 items 在入场动画开始前是隐藏的
    type AnimationPhase = 'idle' | 'exiting' | 'hidden' | 'entering';
    const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');

    // dockContent ref 用于宽度锁定
    const dockContentRef = useRef<HTMLDivElement>(null);

    // 空间切换处理 - 包含宽度锁定和动画序列逻辑
    const handleSpaceSwitch = useCallback(() => {
        if (isSwitching || spaces.length <= 1) return;

        // 保存当前宽度（切换前）用于过渡
        const startWidth = dockContentRef.current
            ? dockContentRef.current.getBoundingClientRect().width
            : 0;

        // 锁定当前宽度
        if (dockContentRef.current && startWidth > 0) {
            dockContentRef.current.style.width = `${startWidth}px`;
        }

        setIsSwitching(true);
        setAnimationPhase('exiting');

        // 动画时长配置（加快版）
        const EXIT_DURATION = 120;    // 原 200ms
        const ENTER_DURATION = 200;   // 原 350ms
        const STAGGER_DELAY = 15;     // 原 30ms
        const WIDTH_TRANSITION = 250; // 原 500ms

        // 退场动画结束后：先设为 hidden，再切换数据，最后触发入场动画
        setTimeout(() => {
            // 1. 设置为 hidden 阶段
            setAnimationPhase('hidden');

            // 2. 切换数据
            switchToNextSpace();

            // 3. 等待渲染完成，然后开始宽度过渡和入场动画
            setTimeout(() => {
                setAnimationPhase('entering');

                // 触发宽度过渡
                if (dockContentRef.current) {
                    // 临时移除宽度锁定，获取新的自然宽度
                    dockContentRef.current.style.width = '';
                    // 强制回流
                    const targetWidth = dockContentRef.current.getBoundingClientRect().width;

                    // 只有当宽度有变化时才做过渡动画
                    if (startWidth > 0 && Math.abs(targetWidth - startWidth) > 1) {
                        // 立即设置回起始宽度
                        dockContentRef.current.style.width = `${startWidth}px`;
                        // 强制回流以应用起始宽度
                        dockContentRef.current.offsetHeight;

                        // 下一帧设置目标宽度，触发 CSS transition
                        requestAnimationFrame(() => {
                            if (dockContentRef.current) {
                                dockContentRef.current.style.width = `${targetWidth}px`;

                                // 过渡结束后清除固定宽度
                                setTimeout(() => {
                                    if (dockContentRef.current) {
                                        dockContentRef.current.style.width = '';
                                    }
                                }, WIDTH_TRANSITION);
                            }
                        });
                    }
                    // 如果宽度没变化，不需要额外处理
                }

                // 入场动画结束后恢复状态
                const enterDuration = ENTER_DURATION + items.length * STAGGER_DELAY;
                setTimeout(() => {
                    setAnimationPhase('idle');
                    setIsSwitching(false);
                }, enterDuration);
            }, 10);
        }, EXIT_DURATION);
    }, [isSwitching, spaces.length, items.length, switchToNextSpace, setIsSwitching]);

    // 空间管理菜单状态
    const [showSpaceMenu, setShowSpaceMenu] = useState(false);
    const [spaceMenuAnchor, setSpaceMenuAnchor] = useState<DOMRect | null>(null);

    const handleSpaceContextMenu = useCallback((e: React.MouseEvent) => {
        setSpaceMenuAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
        setShowSpaceMenu(true);
    }, []);

    // Sync ref for access in drag callbacks
    const folderPlaceholderActiveRef = useRef(folderPlaceholderActive);
    useEffect(() => {
        folderPlaceholderActiveRef.current = folderPlaceholderActive;
    }, [folderPlaceholderActive]);

    const {
        dragState,
        placeholderIndex,
        mergeTargetId,
        isPreMerge,
        itemRefs,
        dockRef,
        handleMouseDown,
        handleAnimationComplete,
        getItemTransform,
        dragElementRef,
    } = useDragAndDrop({
        items,
        isEditMode,
        onReorder: onItemsReorder,
        onDragToOpenFolder,
        onHoverOpenFolder: (item, folder) => {
            if (onHoverOpenFolder) onHoverOpenFolder(item, folder);
        },
        onDropToFolder,
        onMergeFolder: (item, target) => {
            if (target.type === 'folder') {
                const itemsToMerge = item.type === 'folder' && item.items ? item.items : [item];
                const newItems = items.map(i => {
                    if (i.id === target.id) {
                        const merged = [...(i.items || []), ...itemsToMerge];
                        return { ...i, items: merged, icon: generateFolderIcon(merged) };
                    }
                    return i;
                }).filter(i => i.id !== item.id);
                onItemsReorder(newItems);
            } else {
                const newFolder: DockItemType = {
                    id: `folder-${Date.now()}`,
                    name: 'Folder',
                    type: 'folder',
                    items: [target, item],
                };
                newFolder.icon = generateFolderIcon(newFolder.items!);
                const finalItems = items.map(i => (i.id === target.id ? newFolder : i)).filter(i => i.id !== item.id);
                onItemsReorder(finalItems);
            }
        },
        externalDragItem,
        onDragStart,
        onDragEnd,
        hasFolderPlaceholderActive: () => folderPlaceholderActiveRef.current,
    });

    const isInteracting = dragState.isDragging || dragState.isAnimatingReturn || !!externalDragItem;

    // Sync innerRef with dockRef from hook
    useEffect(() => {
        if (innerRef.current) {
            (dockRef as any).current = innerRef.current;
        }
    }, [dockRef]);

    // Observe width changes
    useEffect(() => {
        if (!onWidthChange || !innerRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                let w = 0;
                if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
                    w = Math.round(entry.borderBoxSize[0].inlineSize);
                } else {
                    w = Math.round(entry.contentRect.width);
                    if (entry.target instanceof HTMLElement) {
                        w = Math.round(entry.target.getBoundingClientRect().width);
                    }
                }
                onWidthChange(w);
            }
        });
        ro.observe(innerRef.current);
        return () => ro.disconnect();
    }, [onWidthChange]);

    return (
        <header ref={innerRef} className={`${styles.dock} ${isEditMode ? styles.editMode : ''}`}>
            <div ref={dockContentRef} className={styles.dockContent} data-dock-container="true">
                <div className={`${styles.editTools} ${isEditMode ? styles.visible : ''}`}>
                    <AddIcon onClick={rect => onItemAdd(rect)} />
                    <div className={styles.divider}>
                        <svg width="1" height="48" viewBox="0 0 1 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0.5" y1="0" x2="0.5" y2="48" strokeWidth="1" />
                        </svg>
                    </div>
                </div>

                {items.map((item, index) => {
                    const isMergeTarget = mergeTargetId === item.id;
                    const isDragging = dragState.item?.id === item.id;

                    // Transform-based animation: calculate horizontal offset for smooth sliding
                    const translateX = getItemTransform(index);

                    // 空间切换动画类
                    let animationClass = '';
                    if (animationPhase === 'exiting') {
                        animationClass = styles.itemExiting;
                    } else if (animationPhase === 'hidden') {
                        animationClass = styles.itemHidden;
                    } else if (animationPhase === 'entering') {
                        animationClass = styles.itemEntering;
                    }

                    return (
                        <div
                            key={item.id}
                            ref={el => { itemRefs.current[index] = el; }}
                            className={`${styles.dockItemWrapper} ${isDragging ? styles.isBeingDragged : ''} ${animationClass}`}
                            data-dock-item-wrapper="true"
                            style={isDragging ? (
                                // When cursor is far from dock, collapse width so dock shrinks
                                // When cursor is over dock (placeholderIndex set), keep width for transform-based gap
                                placeholderIndex === null ? {
                                    '--stagger-index': index,
                                    width: 0,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    opacity: 0,
                                    visibility: 'hidden', // Force hide
                                    pointerEvents: 'none',
                                    transition: isInteracting
                                        ? `width ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}, min-width ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}, opacity ${FADE_DURATION}ms`
                                        : 'none',
                                } as React.CSSProperties : {
                                    '--stagger-index': index,
                                    width: 64,
                                    minWidth: 64,
                                    opacity: 0,
                                    visibility: 'hidden', // Force hide
                                    pointerEvents: 'none',
                                    transform: `translateX(${translateX}px)`,
                                    transition: isInteracting
                                        ? `width ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}, min-width ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}, transform ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}, opacity ${FADE_DURATION}ms`
                                        : 'none',
                                } as React.CSSProperties
                            ) : {
                                '--stagger-index': index,
                                transform: `translateX(${translateX}px)`,
                                transition: isInteracting
                                    ? `transform ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}`
                                    : 'none',
                            } as React.CSSProperties}
                        >
                            <DockItem
                                item={item}
                                isEditMode={isEditMode}
                                onClick={rect => onItemClick(item, rect)}
                                onEdit={rect => onItemEdit(item, rect)}
                                onDelete={() => onItemDelete(item)}
                                isDragging={isDragging}
                                staggerIndex={index}
                                isDropTarget={isMergeTarget}
                                isMergeTarget={isMergeTarget}
                                onLongPress={onLongPressEdit}
                                onMouseDown={e => handleMouseDown(e, item, index)}
                            />
                        </div>
                    );
                })}
                {/* 右侧分隔线 - 需要跟随项目移动 */}
                <div
                    className={styles.divider}
                    style={{
                        transform: `translateX(${getItemTransform(items.length)}px)`,
                        transition: isInteracting
                            ? `transform ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}`
                            : 'none',
                    }}
                >
                    <svg width="1" height="48" viewBox="0 0 1 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0.5" y1="0" x2="0.5" y2="48" strokeWidth="1" />
                    </svg>
                </div>
                {/* 动态占位元素 - 仅当需要扩展时渲染，避免 flex gap 造成多余间距 */}
                {getItemTransform(items.length) > 0 && (
                    <div
                        style={{
                            width: getItemTransform(items.length),
                            flexShrink: 0,
                            transition: isInteracting
                                ? `width ${SQUEEZE_ANIMATION_DURATION}ms ${EASE_SWIFT}`
                                : 'none',
                        }}
                    />
                )}
            </div>
            {/* DockNavigator - 空间切换器，使用绝对定位始终靠右 */}
            <div
                className={`${styles.dockNavigator} ${animationPhase === 'exiting' || animationPhase === 'hidden' ? styles.navigatorTransitioning : ''}`}
            >
                <DockNavigator
                    currentSpace={currentSpace}
                    totalSpaces={spaces.length}
                    currentIndex={currentIndex}
                    onSwitch={handleSpaceSwitch}
                    onContextMenu={handleSpaceContextMenu}
                    disabled={isSwitching}
                />
            </div>
            <DragPreview
                isActive={dragState.isDragging || dragState.isAnimatingReturn}
                item={dragState.item}
                position={dragState.currentPosition}
                isAnimatingReturn={dragState.isAnimatingReturn}
                isEditMode={isEditMode}
                dragElementRef={dragElementRef}
                isPreMerge={isPreMerge}
                onAnimationComplete={handleAnimationComplete}
            />
            {/* 空间管理菜单 */}
            <SpaceManageMenu
                isOpen={showSpaceMenu}
                anchorRect={spaceMenuAnchor}
                currentSpace={currentSpace}
                isLastSpace={spaces.length <= 1}
                onClose={() => setShowSpaceMenu(false)}
                onAdd={() => {
                    addSpace();
                    setShowSpaceMenu(false);
                }}
                onRename={(newName) => {
                    renameSpace(currentSpace.id, newName);
                    setShowSpaceMenu(false);
                }}
                onDelete={() => {
                    deleteSpace(currentSpace.id);
                    setShowSpaceMenu(false);
                }}
                onImport={(data) => {
                    importSpace(data);
                    setShowSpaceMenu(false);
                }}
                onPin={() => {
                    pinSpace(currentSpace.id);
                    setShowSpaceMenu(false);
                }}
                isFirstSpace={currentIndex === 0}
            />
        </header>
    );
};
