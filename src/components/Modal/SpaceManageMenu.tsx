import React, { useState, useRef, useEffect } from 'react';
import { Space } from '../../types';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';
import { exportSpaceToFile, exportAllSpacesToFile, parseAndValidateImportFile, SpaceExportData, MultiSpaceExportData } from '../../utils/spaceExportImport';
import plusIcon from '../../assets/icons/plus.svg';
import writeIcon from '../../assets/icons/write.svg';
import trashIcon from '../../assets/icons/trash.svg';
import pinIcon from '../../assets/icons/pin.svg';
import importIcon from '../../assets/icons/import.svg';
import exportIcon from '../../assets/icons/export.svg';
import editIcon from '../../assets/icons/edit.svg';
import styles from './SpaceManageMenu.module.css';

interface SpaceManageMenuProps {
    /** 是否显示 */
    isOpen: boolean;

    /** 锚点位置 (Navigator 的 DOMRect) */
    anchorRect: DOMRect | null;

    /** 当前空间 */
    currentSpace: Space;

    /** 所有空间 (用于导出所有) */
    allSpaces: Space[];

    /** 是否只剩一个空间 (禁用删除) */
    isLastSpace: boolean;

    /** 关闭菜单 */
    onClose: () => void;

    /** 新增空间 */
    onAdd: () => void;

    /** 重命名 */
    onRename: (newName: string) => void;

    /** 删除 */
    onDelete: () => void;

    /** 导入单个空间 */
    onImport: (data: SpaceExportData) => void;

    /** 导入多个空间 */
    onImportMultiple: (data: MultiSpaceExportData) => void;

    /** 置顶空间 */
    onPin: () => void;

    /** 是否已经在顶部 (禁用置顶) */
    isFirstSpace: boolean;

    /** 当前是否为编辑模式 */
    isEditMode: boolean;

    /** 切换编辑模式 */
    onToggleEditMode: () => void;
}

/**
 * SpaceManageMenu - 空间管理右键菜单
 * 使用共享 Modal 组件，与 AddEditModal/SearchEngineModal 保持一致的定位逻辑
 */
export function SpaceManageMenu({
    isOpen,
    anchorRect,
    currentSpace,
    allSpaces,
    isLastSpace,
    onClose,
    onAdd,
    onRename,
    onDelete,
    onImport,
    onImportMultiple,
    onPin,
    isFirstSpace,
    isEditMode,
    onToggleEditMode,
}: SpaceManageMenuProps) {
    const { t } = useLanguage();
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 重命名模式时自动聚焦
    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    // 关闭时重置状态
    useEffect(() => {
        if (!isOpen) {
            setIsRenaming(false);
            setRenameValue('');
        }
    }, [isOpen]);

    const handleAddClick = () => {
        onAdd();
        onClose();
    };

    const handleRenameClick = () => {
        setRenameValue(currentSpace.name);
        setIsRenaming(true);
    };

    const handleRenameSubmit = () => {
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== currentSpace.name) {
            onRename(trimmed);
        }
        setIsRenaming(false);
        onClose();
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
        }
    };

    const handleDeleteClick = () => {
        const message = t.space.deleteConfirm.replace('{name}', currentSpace.name);
        if (!isLastSpace && window.confirm(message)) {
            onDelete();
            onClose();
        }
    };

    const handleExportClick = () => {
        exportSpaceToFile(currentSpace);
        onClose();
    };

    const handleExportAllClick = () => {
        exportAllSpacesToFile(allSpaces);
        onClose();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await parseAndValidateImportFile(file);
            if (result.type === 'multi') {
                onImportMultiple(result.data);
            } else {
                onImport(result.data);
            }
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            window.alert(`${t.space.importFailed}${message}`);
        } finally {
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={undefined} hideHeader anchorRect={anchorRect}>
            <div ref={menuRef} className={styles.menu}>
                {isRenaming ? (
                    <div className={styles.renameContainer}>
                        <div className={styles.renameLabel}>{t.space.renameSpace}</div>
                        <div className={styles.renameInputWrapper}>
                            <input
                                ref={inputRef}
                                type="text"
                                className={styles.renameInput}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={handleRenameKeyDown}
                                maxLength={10}
                                placeholder={t.space.inputName}
                            />
                            <button
                                className={styles.confirmButton}
                                onClick={handleRenameSubmit}
                                disabled={!renameValue.trim() || renameValue.trim() === currentSpace.name}
                            >
                                {t.space.confirm}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.label}>{t.space.title}</div>
                        <div className={styles.divider} />
                        <div className={styles.optionsContainer}>
                            <button className={styles.menuItem} onClick={handleAddClick}>
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${plusIcon})`, maskImage: `url(${plusIcon})` }} />
                                <span>{t.space.addSpace}</span>
                            </button>
                            <button className={styles.menuItem} onClick={() => { onToggleEditMode(); onClose(); }}>
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${editIcon})`, maskImage: `url(${editIcon})` }} />
                                <span>{isEditMode ? t.contextMenu.exitEditMode : t.contextMenu.editMode}</span>
                            </button>
                            <button className={styles.menuItem} onClick={handleRenameClick}>
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${writeIcon})`, maskImage: `url(${writeIcon})` }} />
                                <span>{t.space.rename}</span>
                            </button>
                            {/* 置顶 */}
                            <button
                                className={`${styles.menuItem} ${isFirstSpace ? styles.disabled : ''}`}
                                onClick={() => { onPin(); onClose(); }}
                                disabled={isFirstSpace}
                                title={isFirstSpace ? t.space.alreadyAtTop : t.space.pinToTop}
                            >
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${pinIcon})`, maskImage: `url(${pinIcon})` }} />
                                <span>{t.space.pinToTop}</span>
                            </button>
                            <button
                                className={`${styles.menuItem} ${styles.danger} ${isLastSpace ? styles.disabled : ''}`}
                                onClick={handleDeleteClick}
                                disabled={isLastSpace}
                                title={isLastSpace ? 'Reserve at least one space' : t.space.deleteSpace}
                            >
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                                <span>{t.space.deleteSpace}</span>
                            </button>
                            {/* 分隔线 */}
                            <div className={styles.divider} />
                            {/* 导入/导出 */}
                            <button className={styles.menuItem} onClick={handleImportClick}>
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${importIcon})`, maskImage: `url(${importIcon})` }} />
                                <span>{t.space.importSpace}</span>
                            </button>
                            <button className={styles.menuItem} onClick={handleExportClick}>
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${exportIcon})`, maskImage: `url(${exportIcon})` }} />
                                <span>{t.space.exportSpace}</span>
                            </button>
                            <button className={styles.menuItem} onClick={handleExportAllClick}>
                                <span className={styles.icon} style={{ WebkitMaskImage: `url(${exportIcon})`, maskImage: `url(${exportIcon})` }} />
                                <span>{t.space.exportAllSpaces}</span>
                            </button>
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
