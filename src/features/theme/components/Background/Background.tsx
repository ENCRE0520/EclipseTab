import React from 'react';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import styles from './Background.module.css';

// 辅助函数：从背景值中提取 URL
// 仅当背景是纯壁纸图像（无纹理叠加）时返回 URL
const extractWallpaperUrl = (bgValue: string): string | null => {
    // 如果背景包含逗号，则它具有多个图层（例如，纹理 + 颜色）
    // 在这种情况下，我们应该将其渲染为具有背景样式的 div，而不是 img
    if (bgValue.includes(',')) {
        return null;
    }
    // 仅当整个值是单个 url() 且不是 data URL（data URL 是纹理）时匹配
    const match = bgValue.match(/^url\(['"]?([^'"]+)['"]?\)$/);
    if (match && !match[1].startsWith('data:')) {
        return match[1];
    }
    return null;
};

export const Background: React.FC = () => {
    const { backgroundBaseValue, backgroundTextureValue, backgroundTextureTileSize, backgroundBlendMode, wallpaperType } = useThemeData();

    // ========================================================================
    // 性能优化: 使用递增计数器代替 Date.now() 作为图层 ID
    // 避免 zIndex 使用过大的时间戳值
    // ========================================================================
    const layerIdCounter = React.useRef(0);
    const getNextLayerId = () => ++layerIdCounter.current;

    // 管理基础图层 (淡入淡出)
    const [baseLayers, setBaseLayers] = React.useState<Array<{
        id: number;
        value: string;
        wallpaperUrl: string | null;
        isVideo: boolean;
        visible: boolean;
    }>>([]);

    // 管理纹理图层 (顺序：淡出 -> 等待 -> 淡入)
    const [textureLayers, setTextureLayers] = React.useState<Array<{
        id: number;
        value: string | null;
        tileSize: string;
        visible: boolean;
    }>>([]);

    // 使用 refs 跟踪当前状态以实现顺序逻辑
    const textureLayersRef = React.useRef(textureLayers);
    textureLayersRef.current = textureLayers;

    // 1. 处理基础背景更改 (交叉淡入淡出)
    React.useEffect(() => {
        const layerId = getNextLayerId();
        const wallpaperUrl = extractWallpaperUrl(backgroundBaseValue);

        const newLayer = {
            id: layerId,
            value: backgroundBaseValue,
            wallpaperUrl,
            isVideo: wallpaperUrl ? wallpaperType === 'video' : false,
            visible: false
        };

        setBaseLayers(prev => {
            const activeLayers = prev.slice(-1);
            return [...activeLayers, newLayer];
        });

        // 淡入新图层
        const animTimer = setTimeout(() => {
            setBaseLayers(prev => prev.map(l =>
                l.id === layerId ? { ...l, visible: true } : l
            ));
        }, 50);

        // 清理旧图层
        const cleanupTimer = setTimeout(() => {
            setBaseLayers(prev => prev.filter(l => l.id === layerId));
        }, 300);

        return () => {
            clearTimeout(animTimer);
            clearTimeout(cleanupTimer);
        };
    }, [backgroundBaseValue, wallpaperType]);

    // 2. 处理纹理更改 (交叉淡入淡出)
    React.useEffect(() => {
        const layerId = getNextLayerId();

        // 如果纹理为 null/none，我们只需将其从状态中移除（或淡出）
        if (!backgroundTextureValue) {
            setTextureLayers(prev => prev.map(l => ({ ...l, visible: false })));
            const cleanupTimer = setTimeout(() => {
                setTextureLayers([]);
            }, 300);
            return () => clearTimeout(cleanupTimer);
        }

        const newLayer = {
            id: layerId,
            value: backgroundTextureValue,
            tileSize: backgroundTextureTileSize,
            visible: false
        };

        setTextureLayers(prev => {
            // 保留最后一个活跃图层用于淡出
            const activeLayers = prev.slice(-1);
            return [...activeLayers, newLayer];
        });

        // 淡入新图层
        const animTimer = setTimeout(() => {
            setTextureLayers(prev => prev.map(l =>
                l.id === layerId ? { ...l, visible: true } : l
            ));
        }, 50);

        // 清理旧图层
        const cleanupTimer = setTimeout(() => {
            setTextureLayers(prev => prev.filter(l => l.id === layerId));
        }, 300);

        return () => {
            clearTimeout(animTimer);
            clearTimeout(cleanupTimer);
        };
    }, [backgroundTextureValue, backgroundTextureTileSize]);

    return (
        <div className={styles.container}>
            {/* 基础背景图层 */}
            {baseLayers.map((layer) => (
                <div key={`base-${layer.id}`} className={styles.layerWrapper} style={{ zIndex: 0 }}>
                    {layer.wallpaperUrl ? (
                        layer.isVideo ? (
                            <video
                                src={layer.wallpaperUrl}
                                className={styles.layer}
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{
                                    opacity: layer.visible ? 1 : 0,
                                    zIndex: layer.id,
                                }}
                            />
                        ) : (
                            <img
                                src={layer.wallpaperUrl}
                                alt=""
                                className={styles.layer}
                                style={{
                                    opacity: layer.visible ? 1 : 0,
                                    zIndex: layer.id,
                                }}
                            />
                        )
                    ) : (
                        <div
                            className={styles.layer}
                            style={{
                                background: layer.value,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                opacity: layer.visible ? 1 : 0,
                                zIndex: layer.id,
                            }}
                        />
                    )}
                </div>
            ))}

            {/* 纹理图层 (叠加层) */}
            {textureLayers.map((layer) => layer.value ? (
                <div
                    key={`tex-${layer.id}`}
                    className={styles.layerWrapper}
                    style={{ zIndex: 1, mixBlendMode: backgroundBlendMode as any }}
                >
                    <div
                        className={styles.layer}
                        style={{
                            backgroundImage: layer.value,
                            backgroundSize: layer.tileSize || 'var(--background-size)', // Use stored size, fallback to var
                            backgroundPosition: 'center',
                            backgroundRepeat: 'repeat',
                            opacity: layer.visible ? 1 : 0,
                            zIndex: layer.id,
                        }}
                    />
                </div>
            ) : null)}
        </div>
    );
};
