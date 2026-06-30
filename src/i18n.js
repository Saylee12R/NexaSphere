import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

import translationEN from './locales/en.json';
import translationHI from './locales/hi.json';
import translationES from './locales/es.json';

const resources = {
  en: {
    translation: translationEN,
  },
  hi: {
    translation: translationHI,
  },
  es: {
    translation: translationES,
  },
};

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});