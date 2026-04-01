import { create } from 'zustand';
import { getAppDate } from '../utils/dateUtils';

interface MatchStore {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
  selectedDate: getAppDate().format('YYYY-MM-DD'),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
