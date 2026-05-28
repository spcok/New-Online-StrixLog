import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface OutboxMutation {
  id: string;
  table: string;
  action: 'upsert' | 'delete';
  payload: any;
  timestamp: number;
}

interface OutboxState {
  mutations: OutboxMutation[];
  addMutation: (mutation: Omit<OutboxMutation, 'timestamp'>) => void;
  removeMutation: (id: string) => void;
  clearQueue: () => void;
}

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set) => ({
      mutations: [],
      
      addMutation: (mutation) => set((state) => ({
        mutations: [...state.mutations, { ...mutation, timestamp: Date.now() }]
      })),
      
      removeMutation: (id) => set((state) => ({
        mutations: state.mutations.filter((m) => m.id !== id)
      })),
      
      clearQueue: () => set({ mutations: [] }),
    }),
    {
      name: 'koasys-outbox-storage', // Disk persistence key
      storage: createJSONStorage(() => localStorage),
    }
  )
);