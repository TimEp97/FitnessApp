import { useNavigate } from 'react-router-dom';
import { deleteAllData } from '../stores/data';
import { DoubleConfirmSheet } from './Sheet';

/** Setzt die App nach zwei Rückfragen komplett zurück und startet das Onboarding. */
export function ResetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <DoubleConfirmSheet
      open={open}
      title="Alles zurücksetzen?"
      message="Pläne, Trainings, Statistiken, Körperwerte, eigene Übungen und Einstellungen werden gelöscht, bei aktiver Server-Sicherung auch dort (die Tageskopien auf dem Server bleiben). Exportiere vorher eine Sicherung, wenn du die Daten behalten willst."
      confirmLabel="Weiter"
      secondTitle="Wirklich alles löschen?"
      secondMessage="Das lässt sich nicht rückgängig machen. Die App startet danach wie neu mit dem Onboarding."
      secondConfirmLabel="Ja, endgültig zurücksetzen"
      onClose={onClose}
      onConfirm={async () => {
        await deleteAllData();
        onClose();
        navigate('/onboarding', { replace: true });
      }}
    />
  );
}
