import React, { createContext, useContext, useState, useEffect } from 'react';

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
    };
    search: {
        searchBy: string;
        searchBySuffix: string;
        searchButton: string;
        systemDefault: string;
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
    };
    textInput: {
        placeholder: string;
        s: string;
        m: string;
        l: string;
        cancel: string;
        confirm: string;
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
        },
        search: {
            searchBy: 'Search by',
            searchBySuffix: '',
            searchButton: 'Search',
            systemDefault: 'System Default',
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
        },
        textInput: {
            placeholder: 'Enter text...',
            s: 'S',
            m: 'M',
            l: 'L',
            cancel: 'Cancel',
            confirm: 'Confirm',
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
        },
        search: {
            searchBy: '使用',
            searchBySuffix: '',
            searchButton: '搜索',
            systemDefault: '系统默认',
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
        },
        textInput: {
            placeholder: '输入文本...',
            s: '小',
            m: '中',
            l: '大',
            cancel: '取消',
            confirm: '确认',
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
        // Default to browser language or 'en'
        const browserLang = navigator.language.toLowerCase();
        return browserLang.startsWith('zh') ? 'zh' : 'en';
    });

    useEffect(() => {
        localStorage.setItem('app_language', language);
    }, [language]);

    const value = {
        language,
        setLanguage,
        t: translations[language]
    };

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
