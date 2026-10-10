import { useEffect } from 'react';
import { useSettings } from '../stores/settings';

/** Setzt data-theme auf <html>. „system“ folgt prefers-color-scheme, ohne Vorgabe dunkel. */
export function useTheme() {
  const theme = useSettings((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f2f2f7' : '#000000');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
