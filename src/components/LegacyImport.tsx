import { useEffect, useState } from 'react';
import { findLegacyData, markLegacyHandled, type LegacyOffer } from '../auth/legacy';
import { importSnapshot } from '../sync/engine';
import { Sheet } from './Sheet';

/** Bietet einmal an, Trainings aus der Zeit vor den Konten (auf diesem Gerät) ins eigene Konto zu übernehmen. */
export function LegacyImport({ userId }: { userId: number }) {
  const [offer, setOffer] = useState<LegacyOffer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void findLegacyData(userId).then(setOffer);
  }, [userId]);

  const close = async (adopt: boolean) => {
    if (!offer) return;
    setBusy(true);
    try {
      if (adopt) await importSnapshot(offer.snapshot);
      await markLegacyHandled(userId);
    } finally {
      setBusy(false);
      setOffer(null);
    }
  };

  const parts = [
    offer?.newWorkouts ? `${offer.newWorkouts} ${offer.newWorkouts === 1 ? 'Training' : 'Trainings'}` : '',
    offer?.newBodyLogs ? `${offer.newBodyLogs} Körpergewicht-${offer.newBodyLogs === 1 ? 'Eintrag' : 'Einträge'}` : '',
  ].filter(Boolean);

  return (
    <Sheet open={offer !== null} onClose={() => setOffer(null)} title="Daten auf diesem Gerät gefunden">
      <p className="muted">
        Auf diesem Gerät liegen {parts.join(' und ')} aus der Zeit vor den Konten, die in deinem Konto noch fehlen. Sollen sie in dein Konto übernommen
        werden? Übernimm sie nur, wenn es deine eigenen Trainings sind.
      </p>
      <button type="button" className="btn btnPrimary btnBlock btnLg" onClick={() => close(true)} disabled={busy}>
        In mein Konto übernehmen
      </button>
      <button type="button" className="btn btnBlock" onClick={() => close(false)} disabled={busy}>
        Nicht übernehmen
      </button>
    </Sheet>
  );
}
