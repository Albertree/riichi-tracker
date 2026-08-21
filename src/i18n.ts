import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

void i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    supportedLngs: ["ko", "en", "weeb", "ja"],
    // Without this, a ko-KR browser asks for locales/ko-KR/translation.json.
    load: "languageOnly",
    // No navigator lookup, so an unset preference lands on the fallback below.
    detection: {
      order: ["querystring", "localStorage"],
      lookupLocalStorage: "language",
      caches: ["localStorage"],
    },
    fallbackLng: "ko",
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
