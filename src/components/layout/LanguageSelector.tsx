// ============================================================
// LanguageSelector — Global Multilingual Switcher (EN, HI, MR)
// ============================================================

import { Globe, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { Language } from '../../i18n/translations';

const LANGUAGES: Array<{ code: Language; label: string; nativeLabel: string; flag: string }> = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', flag: '🇮🇳' },
];

interface LanguageSelectorProps {
  variant?: 'header' | 'compact' | 'pills';
}

export function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  if (variant === 'pills') {
    return (
      <div className="inline-flex items-center p-1 bg-white/20 backdrop-blur-md rounded-xl border border-white/20 gap-1 text-xs font-700">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              language === l.code
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {l.nativeLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 bg-white text-gray-800 transition-all text-xs font-700 shadow-2xs"
        aria-label="Select Language"
        title="Change language / भाषा बदलें / भाषा बदला"
      >
        <Globe size={14} className="text-emerald-700 flex-shrink-0" />
        <span className="hidden sm:inline font-semibold">{currentLang.nativeLabel}</span>
        <span className="sm:hidden uppercase font-bold">{currentLang.code}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-800 uppercase tracking-wider text-gray-400 border-b border-gray-100">
            Language / भाषा
          </div>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                language === l.code
                  ? 'bg-emerald-50 text-emerald-900 font-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{l.nativeLabel}</span>
              {language === l.code && <Check size={14} className="text-emerald-700" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
