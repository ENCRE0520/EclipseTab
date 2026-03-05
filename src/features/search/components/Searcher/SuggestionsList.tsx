import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './SuggestionsList.module.css';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';

interface SuggestionsListProps {
    suggestions: string[];
    activeIndex: number;
    onSelect: (suggestion: string) => void;
    onHover: (index: number) => void;
    isExiting?: boolean;
    anchorRect: DOMRect | null;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
    suggestions,
    activeIndex,
    onSelect,
    onHover,
    isExiting = false,
    anchorRect,
}) => {
    const listRef = useRef<HTMLUListElement>(null);
    const [position, setPosition] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (anchorRect) {
            setPosition({
                position: 'fixed',
                left: `${anchorRect.left}px`,
                bottom: `${window.innerHeight - anchorRect.top}px`,
                width: `${anchorRect.width}px`,
            });
        }
    }, [anchorRect]);

    // 入场动画
    useEffect(() => {
        if (listRef.current && !isExiting) {
            scaleFadeIn(listRef.current);
        }
    }, []);

    // 出场动画
    useEffect(() => {
        if (isExiting && listRef.current) {
            scaleFadeOut(listRef.current, 300);
        }
    }, [isExiting]);

    if (suggestions.length === 0 || !anchorRect) return null;

    return createPortal(
        <ul
            ref={listRef}
            className={styles.suggestionsList}
            style={position}
        >
            {suggestions.map((suggestion, index) => (
                <li
                    key={index}
                    className={`${styles.suggestionItem} ${index === activeIndex ? styles.active : ''}`}
                    onClick={() => onSelect(suggestion)}
                    onMouseEnter={() => onHover(index)}
                >
                    <span className={styles.suggestionText}>{suggestion}</span>
                </li>
            ))}
        </ul>,
        document.body
    );
};
