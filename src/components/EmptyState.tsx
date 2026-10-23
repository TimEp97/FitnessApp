import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import s from './EmptyState.module.css';

interface Props {
  icon: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className={`card ${s.empty}`} data-testid="empty-state">
      <div className={s.icon}>
        <Icon name={icon} size={28} />
      </div>
      <h2 className="h3">{title}</h2>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}
