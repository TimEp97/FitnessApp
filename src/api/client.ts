/**
 * Anfragen an die PHP-Schnittstelle auf dem eigenen Webspace (api/auth.php, api/sync.php).
 * Angemeldet wird über ein HttpOnly-Cookie, das der Browser selbst mitschickt.
 */

export type ApiErrorKind = 'network' | 'config' | 'auth' | 'http';

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    public status: number,
    public code: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Benutzername, E-Mail oder Passwort stimmt nicht.',
  too_many_attempts: 'Zu viele Versuche. Bitte warte 15 Minuten und versuche es dann erneut.',
  blocked: 'Dieses Konto ist gesperrt.',
  invalid_invite: 'Der Einladungscode ist ungültig, abgelaufen oder wurde schon benutzt.',
  username_taken: 'Dieser Benutzername ist schon vergeben.',
  email_taken: 'Für diese E-Mail-Adresse gibt es schon ein Konto.',
  invalid_username: 'Benutzername: 3 bis 24 Zeichen, nur Buchstaben, Ziffern, Punkt, Binde- und Unterstrich.',
  invalid_email: 'Bitte eine gültige E-Mail-Adresse eingeben.',
  weak_password: 'Das Passwort muss mindestens 10 Zeichen lang sein.',
  invalid_setup_code: 'Der Einrichtungscode stimmt nicht.',
  already_setup: 'Das Admin-Konto ist bereits angelegt. Bitte melde dich an.',
  invalid_reset: 'Der Link ist ungültig oder abgelaufen. Fordere einen neuen an.',
  wrong_password: 'Das Passwort stimmt nicht.',
  last_admin: 'Du bist der einzige Admin. Lösche zuerst die anderen Konten.',
  unauthorized: 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.',
  not_configured: 'Auf dem Server fehlt api/config.php mit den Zugangsdaten der Datenbank.',
  storage_unavailable: 'Der Server erreicht seine Datenbank nicht.',
  too_large: 'Die Daten sind zu groß für den Server.',
  self: 'Das geht nicht mit dem eigenen Konto.',
  not_found: 'Das Konto gibt es nicht mehr.',
};

let onUnauthorized: () => void = () => {};

/** Wird aufgerufen, wenn der Server eine Anfrage mit 401 ablehnt (Sitzung abgelaufen oder gesperrt). */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export function apiUrl(file: string, action?: string): string {
  const url = new URL(`api/${file}`, document.baseURI);
  if (action) url.searchParams.set('action', action);
  return url.href;
}

interface RequestOptions {
  action?: string;
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  /** false bei Anmelden & Co.: dort heißt 401 „falsches Passwort“, nicht „abgemeldet“ */
  session?: boolean;
}

export async function apiRequest<T>(file: 'auth.php' | 'sync.php', { action, method = 'GET', body, session = true }: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(file, action), {
      method,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Athletic': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 0, 'network', 'Server nicht erreichbar. Bitte prüfe die Internetverbindung.');
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Antwort ohne JSON, z. B. HTML-Fehlerseite oder PHP nicht ausgeführt
    throw new ApiError('config', res.status, 'no_json', `Unerwartete Antwort vom Server (HTTP ${res.status}). Ist PHP auf dem Webspace aktiv?`);
  }
  if (!res.ok) {
    const error = (data as { error?: unknown } | null)?.error;
    const code = typeof error === 'string' ? error : 'http';
    if (res.status === 401 && session) onUnauthorized();
    throw new ApiError(res.status === 401 ? 'auth' : 'http', res.status, code, MESSAGES[code] ?? `Serverfehler (HTTP ${res.status}).`, data);
  }
  return data as T;
}
