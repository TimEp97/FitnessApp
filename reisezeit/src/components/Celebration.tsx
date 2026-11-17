import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PartyPopper, X } from 'lucide-react';
import { earnedBadges, levelFor, profileStats, LEVELS } from '../domain/profile';
import { useProfile } from '../store/profileStore';

interface Toast { key: string; title: string; text: string }

/**
 * Glückwunsch-Meldung, sobald ein neues Abzeichen oder eine neue Stufe erreicht ist –
 * egal auf welcher Seite das passiert (Profil, Länderseite, Reiseplan).
 */
export function Celebration() {
  const countries = useProfile((s) => s.countries);
  const places = useProfile((s) => s.places);
  const celebrated = useProfile((s) => s.celebrated);
  const celebratedLevel = useProfile((s) => s.celebratedLevel);
  const markCelebrated = useProfile((s) => s.markCelebrated);
  const [queue, setQueue] = useState<Toast[]>([]);

  useEffect(() => {
    const stats = profileStats({ countries, places });
    const level = levelFor(stats.points).index;
    const fresh = earnedBadges(stats).filter((b) => !celebrated.includes(b.id));
    if (!fresh.length && level <= celebratedLevel) return;
    // Mehrere Erfolge auf einmal werden zu einer Meldung zusammengefasst
    const parts: string[] = [];
    if (fresh.length) parts.push(`${fresh.map((b) => b.name).join(', ')} · +${fresh.reduce((n, b) => n + b.bonus, 0)} Bonuspunkte`);
    if (level > celebratedLevel) parts.push(`Neue Stufe: ${LEVELS[level].name}`);
    const title = fresh.length > 1 ? `${fresh.length} neue Abzeichen` : fresh.length === 1 ? `Neues Abzeichen: ${fresh[0].name}` : `Stufe erreicht: ${LEVELS[level].name}`;
    const text = fresh.length === 1 ? [`${fresh[0].how} · +${fresh[0].bonus} Bonuspunkte`, ...parts.slice(1)].join(' · ') : parts.join(' · ');
    const toasts: Toast[] = [{ key: `${fresh.map((b) => b.id).join('+')}|${level}`, title, text }];
    markCelebrated(fresh.map((b) => b.id), level);
    setQueue((q) => [...q, ...toasts].slice(-2));
  }, [countries, places, celebrated, celebratedLevel, markCelebrated]);

  // Meldungen verschwinden nach einigen Sekunden von selbst
  useEffect(() => {
    if (!queue.length) return;
    const id = setTimeout(() => setQueue((q) => q.slice(1)), 6000);
    return () => clearTimeout(id);
  }, [queue]);

  return (
    <div className="toasts no-print" role="status" aria-live="polite">
      {queue.map((t) => (
        <div key={t.key} className="toast">
          <span className="toast-icon"><PartyPopper size={22} aria-hidden="true" /></span>
          <span className="stack grow" style={{ ['--gap' as string]: '1px' }}>
            <strong>{t.title}</strong>
            <span className="small">{t.text}</span>
            <Link to="/profil" className="small">Zum Profil</Link>
          </span>
          <button type="button" className="ibtn" aria-label="Meldung schließen" onClick={() => setQueue((q) => q.filter((x) => x.key !== t.key))}><X size={18} aria-hidden="true" /></button>
        </div>
      ))}
    </div>
  );
}
