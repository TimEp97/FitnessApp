import { encodePlan, type SharedPlan } from './domain/planLink';

/** Link, der den Plan vollständig enthält (kein Server nötig) */
export function shareUrl(plan: SharedPlan): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/plan/${encodePlan(plan)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback ohne Clipboard-API (z. B. ohne HTTPS)
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Web Share API, sonst E-Mail-Link */
export async function sendPlan(title: string, text: string, url: string): Promise<'shared' | 'mail' | 'cancel'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch {
      return 'cancel';
    }
  }
  location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
  return 'mail';
}
