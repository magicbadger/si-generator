import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { SIStore, DocumentMeta, Service } from './types';
import { validateStore } from '../lib/validate';

const defaultMeta: DocumentMeta = {
  serviceProvider: '',
  lang: 'en',
  creationTime: new Date().toISOString().slice(0, 19) + '+00:00',
  version: 1,
  originator: '',
};

const newService = (): Service => ({
  id: uuidv4(),
  shortNames: [{ lang: 'en', value: '' }],
  mediumNames: [{ lang: 'en', value: '' }],
  longNames: [],
  shortDescriptions: [],
  longDescriptions: [],
  bearers: [],
  multimedia: [],
  genres: [],
  keywords: '',
  links: [],
});

export const useStore = create<SIStore>()(
  persist(
    (set, get) => ({
      meta: defaultMeta,
      services: [],
      activeServiceId: null,
      currentStep: 0,
      validationErrors: [],

      setMeta: (meta) =>
        set((s) => ({ meta: { ...s.meta, ...meta } })),

      addService: () => {
        const svc = newService();
        // Sync lang from meta
        const lang = get().meta.lang || 'en';
        svc.shortNames = [{ lang, value: '' }];
        svc.mediumNames = [{ lang, value: '' }];
        set((s) => ({
          services: [...s.services, svc],
          activeServiceId: svc.id,
        }));
        return svc.id;
      },

      updateService: (id, update) =>
        set((s) => ({
          services: s.services.map((svc) =>
            svc.id === id ? { ...svc, ...update } : svc
          ),
        })),

      removeService: (id) =>
        set((s) => {
          const remaining = s.services.filter((svc) => svc.id !== id);
          return {
            services: remaining,
            activeServiceId:
              s.activeServiceId === id
                ? remaining[0]?.id ?? null
                : s.activeServiceId,
          };
        }),

      setActiveService: (id) => set({ activeServiceId: id }),

      setStep: (step) => set({ currentStep: step }),

      validate: () => {
        const errors = validateStore(get().meta, get().services);
        set({ validationErrors: errors });
      },

      resetAll: () =>
        set({
          meta: { ...defaultMeta, creationTime: new Date().toISOString().slice(0, 19) + '+00:00' },
          services: [],
          activeServiceId: null,
          currentStep: 0,
          validationErrors: [],
        }),
    }),
    {
      name: 'si-generator-store',
    }
  )
);
