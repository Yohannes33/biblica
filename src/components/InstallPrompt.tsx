import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Share } from 'lucide-react';
import { useT } from '../i18n';

// Chrome/Edge/Samsung Internet fire this when the app can be installed. It can
// come before this component mounts (during onboarding), so catch it at load.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // use our banner instead of Chrome's mini-infobar
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((l) => l());
  });
}

const SNOOZE_KEY = 'biblica_install_snoozed_until';
const SNOOZE_DAYS = 30;

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPhone/iPad have no install event: people add the site from the Share sheet.
// iPadOS reports itself as a Mac, so check for touch too.
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function snoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

/** A dismissible card suggesting Biblica be installed, shown only where that's possible. */
export const InstallPrompt: React.FC = () => {
  const t = useT();
  const [, rerender] = useState(0);
  const [hidden, setHidden] = useState(() => isInstalled() || snoozed());

  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const canPrompt = !!deferredPrompt;
  const ios = !canPrompt && isIos();
  if (hidden || isInstalled() || (!canPrompt && !ios)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
      // storage unavailable: hide for this visit only
    }
    setHidden(true);
  };

  const install = async () => {
    const prompt = deferredPrompt;
    if (!prompt) return;
    deferredPrompt = null; // a prompt can be shown only once
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setHidden(true);
    else dismiss();
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      <section aria-labelledby="install-title" className="card animate-rise flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-on-brand" aria-hidden="true">
          <BookOpen className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="install-title" className="font-display font-extrabold">
            {t('install.title')}
          </h2>
          {ios ? (
            <p className="mt-1 text-sm text-ink-2">
              {t('install.iosBefore')}
              <Share className="mx-1 inline h-4 w-4 align-[-2px]" role="img" aria-label={t('install.share')} />
              {t('install.iosAfter')}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-2">{t('install.body')}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!ios && (
              <button type="button" className="btn btn-sm btn-primary" onClick={install}>
                <Download className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
                {t('install.button')}
              </button>
            )}
            <button type="button" className="btn btn-sm btn-secondary" onClick={dismiss}>
              {t('install.notNow')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
