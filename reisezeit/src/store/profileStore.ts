import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { TravelProfile } from '../domain/profile';

export interface ProfileState extends TravelProfile {
  /** Profile von Freunden, per Link hinzugefügt (nur lokal gespeichert) */
  friends: TravelProfile[];
  setName(name: string): void;
  toggleCountry(code: string): void;
  addCountries(codes: string[]): void;
  togglePlace(id: string): void;
  addPlaces(ids: string[]): void;
  addFriend(p: TravelProfile): void;
  removeFriend(name: string): void;
  resetProfile(): void;
}

const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* kein Speicher */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* egal */ } },
};

const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
const union = (list: string[], add: string[]) => [...new Set([...list, ...add])];

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      name: '',
      countries: [],
      places: [],
      friends: [],
      setName: (name) => set({ name: name.slice(0, 40) }),
      toggleCountry: (code) => set((s) => ({ countries: toggle(s.countries, code) })),
      addCountries: (codes) => set((s) => ({ countries: union(s.countries, codes) })),
      togglePlace: (id) => set((s) => ({ places: toggle(s.places, id) })),
      addPlaces: (ids) => set((s) => ({ places: union(s.places, ids) })),
      addFriend: (p) => set((s) => ({ friends: [...s.friends.filter((f) => f.name !== p.name), p].slice(-30) })),
      removeFriend: (name) => set((s) => ({ friends: s.friends.filter((f) => f.name !== name) })),
      resetProfile: () => set({ name: '', countries: [], places: [], friends: [] }),
    }),
    { name: 'reisezeit-profil-v1', version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);
