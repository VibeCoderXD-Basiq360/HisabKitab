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
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
        {t('lang.label')}
      </p>
      <div className="flex gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
              lang === l.code
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <span className="text-xl">{l.flag}</span>
            <span className={`text-sm font-semibold ${
              lang === l.code ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {l.label}
            </span>
            {lang === l.code && (
              <span className="ml-auto text-primary-500 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
