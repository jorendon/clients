import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, getAppLanguage, setAppLanguage, type AppLang } from '../i18n';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const current = getAppLanguage();

  return (
    <div className="lang-switch" role="group" aria-label={t('language.label')}>
      {SUPPORTED_LANGS.map((lang: AppLang) => (
        <button
          key={lang}
          type="button"
          className={`lang-btn${current === lang ? ' active' : ''}`}
          aria-pressed={current === lang}
          onClick={() => void setAppLanguage(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
