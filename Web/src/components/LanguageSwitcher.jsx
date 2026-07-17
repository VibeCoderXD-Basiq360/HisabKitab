import { useTranslation } from 'react-i18next';
import { useLangStore } from '../store/langStore';

const LANGUAGES = [
  { code: 'en',  flag: '🇬🇧', label: 'English' },
  { code: 'hin', flag: '🇮🇳', label: 'Hinglish' },
];

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const { lang, setLang } = useLangStore();

  return (
    <div className="flex flex-col gap-2">
      <p
        className="uppercase tracking-wide px-1"
        style={{ color: '#B0B8C4', fontSize: 12, fontWeight: 600 }}
      >
        {t('lang.label')}
      </p>
      <div className="flex gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className="flex-1 flex items-center gap-2 px-4 py-3 transition-all active:scale-95"
            style={{
              borderRadius: 16,
              border: lang === l.code ? '2px solid #00C2B2' : '2px solid #E9ECF0',
              background: lang === l.code ? '#E6FAF9' : '#fff',
            }}
          >
            <span className="text-xl">{l.flag}</span>
            <span
              className="text-sm font-semibold"
              style={{ color: lang === l.code ? '#00C2B2' : '#374151' }}
            >
              {l.label}
            </span>
            {lang === l.code && (
              <span className="ml-auto text-xs" style={{ color: '#00C2B2' }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
