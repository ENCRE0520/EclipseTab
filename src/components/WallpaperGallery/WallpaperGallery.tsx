import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useWallpaperStorage } from '../../hooks/useWallpaperStorage';
import { WallpaperItem } from '../../utils/db';
import styles from './WallpaperGallery.module.css';
import wallpaperIcon from '../../assets/icons/wallpaper.svg';
import closeIcon from '../../assets/icons/close.svg';

export const WallpaperGallery: React.FC = () => {
    const { wallpaperId, setWallpaperId, uploadWallpaper, setWallpaper } = useTheme();
    const { getRecentWallpapers, createWallpaperUrl, deleteWallpaper } = useWallpaperStorage();
    const [recentWallpapers, setRecentWallpapers] = useState<WallpaperItem[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const loadWallpapers = async () => {
        const wallpapers = await getRecentWallpapers();
        setRecentWallpapers(wallpapers);

        // Create thumbnails
        const newThumbnails: Record<string, string> = {};
        wallpapers.forEach(wp => {
            newThumbnails[wp.id] = createWallpaperUrl(wp.thumbnail || wp.data);
        });
        setThumbnails(newThumbnails);
    };

    useEffect(() => {
        loadWallpapers();
    }, []);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await uploadWallpaper(file);
            await loadWallpapers();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleWallpaperSelect = async (id: string) => {
        if (id === wallpaperId) return;
        await setWallpaperId(id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await deleteWallpaper(id);
            if (id === wallpaperId) {
                setWallpaper(null);
            }
            await loadWallpapers();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className={styles.gridContainer}>
            {/* Upload Button */}
            <div
                className={`${styles.uploadBtn} ${isUploading ? styles.uploading : ''}`}
                onClick={handleUploadClick}
                title="Upload Wallpaper"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <img src={wallpaperIcon} alt="Upload" width={24} height={24} />
            </div>

            {/* Recent Wallpapers */}
            {recentWallpapers.map(wp => (
                <div
                    key={wp.id}
                    className={`${styles.thumbnail} ${wp.id === wallpaperId ? styles.active : ''}`}
                    onClick={() => handleWallpaperSelect(wp.id)}
                    title={new Date(wp.createdAt).toLocaleDateString()}
                >
                    {thumbnails[wp.id] && (
                        <img src={thumbnails[wp.id]} alt="Wallpaper" className={styles.image} />
                    )}
                    <button
                        className={styles.deleteBtn}
                        onClick={(e) => handleDelete(e, wp.id)}
                        title="Delete"
                    >
                        <img src={closeIcon} alt="Delete" width={10} height={10} />
                    </button>
                </div>
            ))}
        </div>
    );
};
