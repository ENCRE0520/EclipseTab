import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

type Language = 'en' | 'zh';

interface Translations {
    settings: {
        position: string;
        center: string;
        bottom: string;
        iconSize: string;
        large: string;
        small: string;
        suggestions: string;
        on: string;
        off: string;
        language: string;
        followSystem: string;
        lightTheme: string;
        darkTheme: string;
        defaultTheme: string;
        noTexture: string;
        confirmDelete: string;
        tabOpeningBehavior: string;
        openInNewTab: string;
        openInCurrentTab: string;
        fixIcons: string;
    };
    search: {
        searchBy: string;
        searchBySuffix: string;
        searchButton: string;
    };
    contextMenu: {
        addSticker: string;
        uploadImage: string;
        editMode: string;
        exitEditMode: string;
        settings: string;
        copyImage: string;
        exportImage: string;
        copyText: string;
        editSticker: string;
        exportAsImage: string;
        deleteSticker: string;
        edit: string;
        delete: string;
        restore: string;
        pinSticker: string;
        unpinSticker: string;
    };
    modal: {
        edit: string;
        addNew: string;
        address: string;
        name: string;
        icon: string;
        getFromWebsite: string;
        useTextIcon: string;
        uploadNewIcon: string;
        cancel: string;
        save: string;
        add: string;
        batchImport: string;
    };
    space: {
        title: string;
        addSpace: string;
        renameSpace: string;
        rename: string;
        deleteSpace: string;
        importSpace: string;
        exportSpace: string;
        exportAllSpaces: string;
        pinToTop: string;
        alreadyAtTop: string;
        deleteConfirm: string;
        importFailed: string;
        inputName: string;
        confirm: string;
        tooltip: string;
        switch: string;
        manage: string;
        deleteStickerConfirm: string;
        recycleBin: string;
        restoreHint: string;
        emptyRecycleBin: string;
        emptyRecycleBinHint: string;
        recycleBinLimitHint: string;
    };
    batchImport: {
        title: string;
        fromBookmarks: string;
        fromBookmarksDesc: string;
        aiGenerate: string;
        aiStep1: string;
        aiStep2: string;
        aiStep3: string;
        copyPrompt: string;
        copied: string;
        importJson: string;
        addAll: string;
        selected: string;
        importSelected: string;
        noBookmarks: string;
        bookmarkPermissionDenied: string;
        bookmarkApiUnavailable: string;
    };
    sync: {
        title: string;
        serverUrl: string;
        username: string;
        password: string;
        testConnection: string;
        uploadToCloud: string;
        downloadFromCloud: string;
        statusLabel: string;
        statusUntested: string;
        statusSuccess: string;
        statusFailed: string;
        autoSync: string;
        syncWallpaper: string;
        syncStickers: string;
        lastSync: string;
        autoSyncTitle: string;
        neverSynced: string;
    };
    dock: {
        emptyHint: string;
    };
    textInput: {
        placeholder: string;
        s: string;
        m: string;
        l: string;
        cancel: string;
        confirm: string;
        fontSizeIncrease: string;
        fontSizeDecrease: string;
    };
}

const translations: Record<Language, Translations> = {
    en: {
        settings: {
            position: 'Position',
            center: 'Center',
            bottom: 'Bottom',
            iconSize: 'Icon Size',
            large: 'Large',
            small: 'Small',
            suggestions: 'Suggestions',
            on: 'On',
            off: 'Off',
            language: 'Language',
            followSystem: 'Follow System',
            lightTheme: 'Light Theme',
            darkTheme: 'Dark Theme',
            defaultTheme: 'Default Theme',
            noTexture: 'No Texture',
            confirmDelete: 'Delete Confirmation',
            tabOpeningBehavior: 'Open Tabs In',
            openInNewTab: 'New',
            openInCurrentTab: 'Current',
            fixIcons: 'Fix Broken/Missing Icons',
        },
        search: {
            searchBy: 'Search by',
            searchBySuffix: '',
            searchButton: 'Search',
        },
        contextMenu: {
            addSticker: 'Add Sticker',
            uploadImage: 'Upload Image',
            editMode: 'Edit Mode',
            exitEditMode: 'Exit Edit Mode',
            settings: 'Settings',
            copyImage: 'Copy Image',
            exportImage: 'Export Image',
            copyText: 'Copy Text',
            editSticker: 'Edit Sticker',
            exportAsImage: 'Export as Image',
            deleteSticker: 'Delete Sticker',
            edit: 'Edit',
            delete: 'Delete',
            restore: 'Restore',
            pinSticker: 'Pin Sticker',
            unpinSticker: 'Unpin Sticker',
        },
        modal: {
            edit: 'Edit',
            addNew: 'Add new',
            address: 'Address',
            name: 'Name',
            icon: 'Icon',
            getFromWebsite: 'Get from website',
            useTextIcon: 'Use Text Icon',
            uploadNewIcon: 'Upload new icon',
            cancel: 'Cancel',
            save: 'Save',
            add: 'Add',
            batchImport: 'Batch Import',
        },
        space: {
            title: 'Space',
            addSpace: 'Add space',
            renameSpace: 'Rename Space',
            rename: 'Rename',
            deleteSpace: 'Delete space',
            importSpace: 'Import Space',
            exportSpace: 'Export current space',
            exportAllSpaces: 'Export All Space',
            pinToTop: 'Pin to Top',
            alreadyAtTop: 'Already at the top',
            deleteConfirm: 'Are you sure you want to delete the space "{name}"?\nAll applications in this space will be deleted.',
            importFailed: 'Import failed: ',
            inputName: 'Input space name',
            confirm: 'Confirm',
            tooltip: 'Current space',
            switch: 'Left click: Switch space',
            manage: 'Right click: Manage space',
            deleteStickerConfirm: 'Are you sure you want to delete this sticker?',
            recycleBin: 'Recycle Bin',
            restoreHint: 'Swipe left to restore, swipe right to delete',
            emptyRecycleBin: 'Nothing here',
            emptyRecycleBinHint: 'Deleted stickers will show up here',
            recycleBinLimitHint: 'Recycle bin stores up to 30 items',
        },
        dock: {
            emptyHint: 'Right-click or use top-right button to enter edit mode and add icons',
        },
        batchImport: {
            title: 'Batch Import',
            fromBookmarks: 'Import from Bookmarks',
            fromBookmarksDesc: 'Select bookmarks from your browser to import',
            aiGenerate: 'AI Generate Space',
            aiStep1: 'Copy the prompt below',
            aiStep2: 'Paste into any AI tool, add your website names',
            aiStep3: 'Import the generated JSON file',
            copyPrompt: 'Copy Prompt',
            copied: 'Copied!',
            importJson: 'Import JSON',
            addAll: 'Add All',
            selected: 'Selected',
            importSelected: 'Import',
            noBookmarks: 'No bookmarks found',
            bookmarkPermissionDenied: 'Bookmark permission denied',
            bookmarkApiUnavailable: 'Bookmark API not available',
        },
        sync: {
            title: 'Cloud Sync (WebDAV)',
            serverUrl: 'Server URL',
            username: 'Username',
            password: 'Password',
            testConnection: 'Test',
            uploadToCloud: 'Upload to Cloud',
            downloadFromCloud: 'Download',
            statusLabel: 'Status',
            statusUntested: 'Untested',
            statusSuccess: 'Success',
            statusFailed: 'Failed',
            autoSync: 'Auto Sync',
            syncWallpaper: 'Sync Wallpapers',
            syncStickers: 'Sync Sticker Images',
            lastSync: 'Last sync',
            autoSyncTitle: 'Auto Sync',
            neverSynced: 'Never',
        },
        textInput: {
            placeholder: 'Enter text...',
            s: 'S',
            m: 'M',
            l: 'L',
            cancel: 'Cancel',
            confirm: 'Confirm',
            fontSizeIncrease: 'Ctrl/⌘ + ↑ Increase, +Shift for larger step',
            fontSizeDecrease: 'Ctrl/⌘ + ↓ Decrease, +Shift for larger step',
        }
    },
    zh: {
        settings: {
            position: '布局位置',
            center: '居中',
            bottom: '底部',
            iconSize: '图标大小',
            large: '大',
            small: '小',
            suggestions: '搜索建议',
            on: '开启',
            off: '关闭',
            language: '语言设置',
            followSystem: '跟随系统',
            lightTheme: '浅色模式',
            darkTheme: '深色模式',
            defaultTheme: '默认主题',
            noTexture: '无纹理',
            confirmDelete: '删除二次确认',
            tabOpeningBehavior: '新标签页打开',
            openInNewTab: '开启',
            openInCurrentTab: '关闭',
            fixIcons: '修复破损与失效图标',
        },
        search: {
            searchBy: '使用',
            searchBySuffix: '',
            searchButton: '搜索',
        },
        contextMenu: {
            addSticker: '添加贴纸',
            uploadImage: '上传图片',
            editMode: '编辑模式',
            exitEditMode: '退出编辑',
            settings: '设置',
            copyImage: '复制图片',
            exportImage: '导出图片',
            copyText: '复制文本',
            editSticker: '编辑贴纸',
            exportAsImage: '导出为图片',
            deleteSticker: '删除贴纸',
            edit: '编辑',
            delete: '删除',
            restore: '还原',
            pinSticker: '固定贴纸',
            unpinSticker: '解除固定',
        },
        modal: {
            edit: '编辑',
            addNew: '添加新项',
            address: '网址地址',
            name: '名称',
            icon: '图标',
            getFromWebsite: '获取网站图标',
            useTextIcon: '使用文字图标',
            uploadNewIcon: '上传新图标',
            cancel: '取消',
            save: '保存',
            add: '添加',
            batchImport: '批量导入',
        },
        space: {
            title: '空间',
            addSpace: '添加空间',
            renameSpace: '重命名空间',
            rename: '重命名',
            deleteSpace: '删除空间',
            importSpace: '导入空间',
            exportSpace: '导出当前空间',
            exportAllSpaces: '导出所有空间',
            pinToTop: '置顶空间',
            alreadyAtTop: '已在顶部',
            deleteConfirm: '确定要删除空间 "{name}" 吗？\n该空间下的所有应用都将被删除。',
            importFailed: '导入失败：',
            inputName: '输入空间名称',
            confirm: '确认',
            tooltip: '当前空间',
            switch: '左键：切换空间',
            manage: '右键：管理空间',
            deleteStickerConfirm: '确定要删除这个贴纸吗？',
            recycleBin: '回收站',
            restoreHint: '左滑还原，右滑删除',
            emptyRecycleBin: '这里空空如也',
            emptyRecycleBinHint: '删除的贴纸将出现在这里',
            recycleBinLimitHint: '回收站最多存储30条贴纸',
        },
        dock: {
            emptyHint: '右键进入编辑模式，或鼠标移动到页面右上角并点击编辑图标',
        },
        batchImport: {
            title: '批量导入',
            fromBookmarks: '从书签导入',
            fromBookmarksDesc: '从浏览器书签中选择要导入的网站',
            aiGenerate: 'AI 生成空间',
            aiStep1: '复制下方提示词',
            aiStep2: '粘贴到任意 AI 工具，输入你想添加的网站名称',
            aiStep3: '将 AI 生成的 JSON 文件导入即可',
            copyPrompt: '复制提示词',
            copied: '已复制！',
            importJson: '导入 JSON',
            addAll: '全部添加',
            selected: '已选择',
            importSelected: '导入',
            noBookmarks: '未找到书签',
            bookmarkPermissionDenied: '书签权限被拒绝',
            bookmarkApiUnavailable: '书签 API 不可用',
        },
        sync: {
            title: '云端同步 (WebDAV)',
            serverUrl: '服务器地址',
            username: '账号',
            password: '密码',
            testConnection: '测试',
            uploadToCloud: '覆盖到云端',
            downloadFromCloud: '从云端下载',
            statusLabel: '状态',
            statusUntested: '未测试',
            statusSuccess: '连接成功',
            statusFailed: '连接失败',
            autoSync: '自动同步',
            syncWallpaper: '同步自定义壁纸',
            syncStickers: '同步贴纸图片',
            lastSync: '上次同步',
            autoSyncTitle: '自动同步',
            neverSynced: '从未',
        },
        textInput: {
            placeholder: '输入文本...',
            s: '小',
            m: '中',
            l: '大',
            cancel: '取消',
            confirm: '确认',
            fontSizeIncrease: 'Ctrl/⌘ + ↑ 增大字号，+Shift 增大更多',
            fontSizeDecrease: 'Ctrl/⌘ + ↓ 减小字号，+Shift 减小更多',
        }
    }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('app_language');
        if (saved === 'en' || saved === 'zh') return saved;
        // 默认使用英文
        return 'en';
    });

    useEffect(() => {
        localStorage.setItem('app_language', language);
    }, [language]);

    const value = useMemo(() => ({
        language,
        setLanguage,
        t: translations[language]
    }), [language, setLanguage]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
