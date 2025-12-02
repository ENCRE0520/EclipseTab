import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import styles from './Background.module.css';

// Helper function to extract URL from background value
const extractUrl = (bgValue: string): string | null => {
    const match = bgValue.match(/url\(['"]?([^'"]+)['"]?\)/);
    return match ? match[1] : null;
};

export const Background: React.FC = () => {
    const { backgroundValue, backgroundBlendMode } = useTheme();
    const [bg1, setBg1] = useState(backgroundValue);
    const [bg2, setBg2] = useState('');
    const [activeLayer, setActiveLayer] = useState<1 | 2>(1);
    const [blendMode1, setBlendMode1] = useState(backgroundBlendMode);
    const [blendMode2, setBlendMode2] = useState(backgroundBlendMode);

    useEffect(() => {
        if (activeLayer === 1) {
            if (bg1 !== backgroundValue) {
                setBg2(backgroundValue);
                setBlendMode2(backgroundBlendMode);
                setActiveLayer(2);
            }
        } else {
            if (bg2 !== backgroundValue) {
                setBg1(backgroundValue);
                setBlendMode1(backgroundBlendMode);
                setActiveLayer(1);
            }
        }
    }, [backgroundValue, backgroundBlendMode, activeLayer, bg1, bg2]);

    // Extract URLs if backgrounds are wallpapers
    const url1 = extractUrl(bg1);
    const url2 = extractUrl(bg2);

    return (
        <div className={styles.container}>
            {/* Layer 1 */}
            {url1 ? (
                <img
                    src={url1}
                    alt=""
                    className={styles.layer}
                    style={{
                        mixBlendMode: blendMode1 as any,
                        opacity: activeLayer === 1 ? 1 : 0,
                        zIndex: activeLayer === 1 ? 2 : 1,
                    }}
                />
            ) : (
                <div
                    className={styles.layer}
                    style={{
                        background: bg1,
                        backgroundBlendMode: blendMode1,
                        opacity: activeLayer === 1 ? 1 : 0,
                        zIndex: activeLayer === 1 ? 2 : 1,
                    }}
                />
            )}

            {/* Layer 2 */}
            {url2 ? (
                <img
                    src={url2}
                    alt=""
                    className={styles.layer}
                    style={{
                        mixBlendMode: blendMode2 as any,
                        opacity: activeLayer === 2 ? 1 : 0,
                        zIndex: activeLayer === 2 ? 2 : 1,
                    }}
                />
            ) : (
                <div
                    className={styles.layer}
                    style={{
                        background: bg2,
                        backgroundBlendMode: blendMode2,
                        opacity: activeLayer === 2 ? 1 : 0,
                        zIndex: activeLayer === 2 ? 2 : 1,
                    }}
                />
            )}
        </div>
    );
};
