import { create } from 'zustand';
import { apiRequest, setUnauthorizedHandler } from '../api/client';
import { deleteDatabase, userDbName } from '../db/db';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

interface AuthState {
  /** angemeldeter Nutzer; bleibt offline erhalten, damit die App ohne Netz startet */
  user: User | null;
  /** Server hat die Sitzung abgelehnt: neu anmelden, die Daten auf dem Gerät bleiben */
  expired: boolean;
}

const STORAGE_KEY = 'athletic-user';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const u = raw ? (JSON.parse(raw) as User) : null;
    return u && typeof u.id === 'number' && typeof u.username === 'string' ? u : null;
  } catch {
    return null;
  }
}

function storeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // privates Surfen: Anmeldung gilt dann nur bis zum Neuladen
  }
}

export const useAuth = create<AuthState>(() => ({ user: readStoredUser(), expired: false }));

setUnauthorizedHandler(() => {
  if (useAuth.getState().user) useAuth.setState({ expired: true });
});

export const isAdmin = (u: User | null | undefined) => u?.role === 'admin';

function signedIn(user: User) {
  const previous = useAuth.getState().user;
  storeUser(user);
  if (previous && previous.id !== user.id) {
    // anderes Konto auf diesem Gerät: sauber mit dessen Daten neu starten
    window.location.reload();
    return;
  }
  useAuth.setState({ user, expired: false });
}

type UserReply = { user: User };

export async function fetchStatus(): Promise<{ setupNeeded: boolean }> {
  return apiRequest('auth.php', { action: 'status', session: false });
}

export async function login(loginName: string, password: string): Promise<void> {
  const { user } = await apiRequest<UserReply>('auth.php', { action: 'login', method: 'POST', body: { login: loginName.trim(), password }, session: false });
  signedIn(user);
}

export async function register(input: { username: string; email: string; password: string; invite: string }): Promise<void> {
  const { user } = await apiRequest<UserReply>('auth.php', { action: 'register', method: 'POST', body: input, session: false });
  signedIn(user);
}

export async function setupAdmin(input: { username: string; email: string; password: string; code: string }): Promise<void> {
  const { user } = await apiRequest<UserReply>('auth.php', { action: 'setup', method: 'POST', body: input, session: false });
  signedIn(user);
}

/** Holt die Kontodaten neu (z. B. geänderte Rolle). Offline passiert nichts, bei 401 greift `expired`. */
export async function refreshMe(): Promise<void> {
  try {
    const { user } = await apiRequest<UserReply>('auth.php', { action: 'me' });
    if (user.id !== useAuth.getState().user?.id) return;
    storeUser(user);
    useAuth.setState({ user });
  } catch {
    // offline oder abgelaufen
  }
}

/** Meldet ab und entfernt die Daten dieses Kontos vom Gerät (sie liegen auf dem Server). */
export async function logout(): Promise<void> {
  try {
    await apiRequest('auth.php', { action: 'logout', method: 'POST', session: false });
  } catch {
    // offline: die Sitzung läuft auf dem Server von selbst ab
  }
  await forgetDevice();
}

async function forgetDevice() {
  const user = useAuth.getState().user;
  storeUser(null);
  if (user) await deleteDatabase(userDbName(user.id));
  window.location.hash = '#/';
  window.location.reload();
}

export async function requestPasswordReset(loginName: string): Promise<void> {
  await apiRequest('auth.php', { action: 'forgot', method: 'POST', body: { login: loginName.trim() }, session: false });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiRequest('auth.php', { action: 'reset', method: 'POST', body: { token, password }, session: false });
}

export async function changePassword(current: string, password: string): Promise<void> {
  await apiRequest('auth.php', { action: 'change_password', method: 'POST', body: { current, password } });
}

export async function deleteAccount(password: string): Promise<void> {
  await apiRequest('auth.php', { action: 'delete_account', method: 'POST', body: { password } });
  await forgetDevice();
}

// ---------- Admin ----------

export interface AdminUser extends User {
  blocked: boolean;
  lastLoginAt: string | null;
  lastSyncAt: string | null;
}

export interface Invite {
  code: string;
  note: string;
  createdAt: string;
  expiresAt: string;
  usedBy: string | null;
  usedAt: string | null;
  link: string;
}

export const admin = {
  users: async () => (await apiRequest<{ users: AdminUser[] }>('auth.php', { action: 'admin_users' })).users,
  setBlocked: (id: number, blocked: boolean) => apiRequest('auth.php', { action: 'admin_user_update', method: 'POST', body: { id, blocked } }),
  resetLink: async (id: number) => (await apiRequest<{ link: string }>('auth.php', { action: 'admin_user_reset_link', method: 'POST', body: { id } })).link,
  deleteUser: (id: number) => apiRequest('auth.php', { action: 'admin_user_delete', method: 'POST', body: { id } }),
  invites: async () => (await apiRequest<{ invites: Invite[] }>('auth.php', { action: 'admin_invites' })).invites,
  createInvite: async (note: string) =>
    (await apiRequest<{ invite: { code: string; link: string } }>('auth.php', { action: 'admin_invite_create', method: 'POST', body: { note } })).invite,
  deleteInvite: (code: string) => apiRequest('auth.php', { action: 'admin_invite_delete', method: 'POST', body: { code } }),
};
