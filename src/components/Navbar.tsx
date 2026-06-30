'use client';

import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export const Navbar = () => {
  const t = useTranslations('General');

  return (
    <nav className="flex justify-between p-4 bg-gray-800 text-white">
      <div className="flex gap-4">
        <a href="/">{t('home')}</a>
        <a href="/about">{t('about')}</a>
        <a href="/events">{t('events')}</a>
        <a href="/contact">{t('contact')}</a>
      </div>
      <div className="flex gap-4">
        <button>{t('join')}</button>
        <LanguageSwitcher />
      </div>
    </nav>
  );
};