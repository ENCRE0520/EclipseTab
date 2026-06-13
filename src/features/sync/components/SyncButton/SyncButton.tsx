import React from 'react';
import styles from './SyncButton.module.css';

interface SyncButtonProps {
    onClick: (e: React.MouseEvent<HTMLElement>) => void;
    visible?: boolean;
}

export const SyncButton: React.FC<SyncButtonProps> = ({ onClick, visible = false }) => {
    return (
        <div
            className={styles.syncBtn}
            style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
        >
            <div className={styles.innerContainer} onClick={onClick}>
                <div className={styles.icon}>
                    {/* 云朵图标 */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 16.5C4.067 16.5 2.5 14.933 2.5 13C2.5 11.2336 3.82137 9.77196 5.53982 9.53587C6.01258 6.84074 8.2435 4.80005 11 4.80005C13.9142 4.80005 16.3262 6.95315 16.8924 9.74204C17.1517 9.68452 17.4243 9.65342 17.7059 9.65342C20.3547 9.65342 22.5019 11.8006 22.5019 14.4495C22.5019 17.0983 20.3547 19.2455 17.7059 19.2455L6 19.2455" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
    );
};
