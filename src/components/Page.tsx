import type { ReactNode } from 'react';
import { SampleBadge } from './SampleBadge';
import s from './Page.module.css';

interface Props {
  title: string;
  /** kleine Zeile über der Überschrift, z. B. Datum */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** Marke „Beispieldaten“ zeigen (nur auf Screens mit Zahlen) */
  sample?: boolean;
  back?: ReactNode;
  /** Schaltflächen in einer eigenen Zeile über der Überschrift */
  toolbar?: ReactNode;
  children: ReactNode;
}

export function Page({ title, eyebrow, actions, sample, back, toolbar, children }: Props) {
  return (
    <div className={s.page}>
      {back && <div className={s.back}>{back}</div>}
      {toolbar && <div className={s.toolbar}>{toolbar}</div>}
      <header className={s.header}>
        <div className={s.titles}>
          {eyebrow && <div className={s.eyebrow}>{eyebrow}</div>}
          <h1 className="h1">{title}</h1>
          {sample && <SampleBadge />}
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}
