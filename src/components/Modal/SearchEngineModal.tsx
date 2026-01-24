import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SearchEngine } from '../../types';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';
import styles from './SearchEngineModal.module.css';

interface SearchEngineModalProps {
  isOpen: boolean;
  selectedEngine: SearchEngine;
  engines: SearchEngine[];
  onClose: () => void;
  onSelect: (engine: SearchEngine) => void;
  anchorRect?: DOMRect | null;
}

export const SearchEngineModal: React.FC<SearchEngineModalProps> = ({
  isOpen,
  selectedEngine,
  engines,
  onClose,
  onSelect,
  anchorRect,
}) => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, engines.findIndex(e => e.id === selectedEngine.id)));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setActiveIndex(Math.max(0, engines.findIndex(e => e.id === selectedEngine.id)));
  }, [isOpen, engines, selectedEngine]);

  const handleSelect = useCallback((engine: SearchEngine) => {
    onSelect(engine);
    onClose();
  }, [onSelect, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(engines.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const engine = engines[activeIndex] ?? engines[0];
      if (engine) {
        handleSelect(engine);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [activeIndex, engines, isOpen, handleSelect, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={undefined} hideHeader anchorRect={anchorRect} offset={12}>
      <div
        ref={listRef}
        className={styles.list}
        role="listbox"
        aria-activedescendant={engines[activeIndex]?.id}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.label}>{t.search.searchBy}</div>
        <div className={styles.divider}></div>
        <div className={styles.optionsContainer}>
          {engines.map((engine, idx) => (
            <button
              key={engine.id}
              id={engine.id}
              role="option"
              aria-selected={selectedEngine.id === engine.id}
              className={`${styles.option} ${selectedEngine.id === engine.id ? styles.selected : ''}`}
              style={{ transitionDelay: `${idx * 40}ms` }}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => handleSelect(engine)}
            >
              <span className={styles.engineName}>{engine.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

