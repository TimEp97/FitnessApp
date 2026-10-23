/** Vorschau-Build als einzelne Seite (z. B. zum Ausprobieren auf claude.ai): ohne Service Worker und Server-Sicherung. */
export const IS_PREVIEW = import.meta.env.MODE === 'artifact';
