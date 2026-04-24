import { create } from 'zustand';

interface VersionCheckState {
  hardUpdateNeeded: boolean;
  message: string;
  storeUrl: string | null;
  setHardUpdateNeeded: (needed: boolean) => void;
  setMessage: (msg: string) => void;
  setStoreUrl: (url: string) => void;
}

export const useVersionCheckStore = create<VersionCheckState>((set) => ({
  hardUpdateNeeded: false,
  message: '',
  storeUrl: null,
  setHardUpdateNeeded: (needed) => set({ hardUpdateNeeded: needed }),
  setMessage: (msg) => set({ message: msg }),
  setStoreUrl: (url) => set({ storeUrl: url }),
}));
