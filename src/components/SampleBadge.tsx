import { Link } from 'react-router-dom';
import { useSettings } from '../stores/settings';
import s from './SampleBadge.module.css';

/** Hinweis „Beispieldaten“, solange die Beispieldaten nicht entfernt wurden. */
export function SampleBadge() {
  const has = useSettings((st) => st.settings.hasSampleData);
  if (!has) return null;
  return (
    <Link to="/profil#daten" className={s.badge} data-testid="sample-badge" title="Beispieldaten im Profil entfernen">
      Beispieldaten
    </Link>
  );
}
