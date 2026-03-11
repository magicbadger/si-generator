import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { SIStore, DocumentMeta, Service, NavState } from './types';
import { validateStore } from '../lib/validate';

const defaultMeta: DocumentMeta = {
  serviceProvider: '',
  serviceProviderMediumName: '',
  serviceProviderLongName: '',
  serviceProviderShortDesc: '',
  serviceProviderLongDesc: '',
  serviceProviderLogos: [],
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
      nav: { view: 'document' } as NavState,
      validationErrors: [],
      sourceUrl: null,
      sourceXml: null,

      setMeta: (meta) =>
        set((s) => ({ meta: { ...s.meta, ...meta } })),

      setSource: (url, xml) => set({ sourceUrl: url, sourceXml: xml }),

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
          let nav: NavState = s.nav;
          if (s.nav.view === 'service' && s.nav.serviceId === id) {
            nav = remaining.length > 0
              ? { view: 'service', serviceId: remaining[0].id, step: 0 }
              : { view: 'document' };
          }
          return {
            services: remaining,
            activeServiceId:
              s.activeServiceId === id
                ? remaining[0]?.id ?? null
                : s.activeServiceId,
            nav,
          };
        }),

      setActiveService: (id) => set({ activeServiceId: id }),

      setNav: (nav) => set((s) => ({
        nav,
        activeServiceId: nav.view === 'service' ? nav.serviceId : s.activeServiceId,
      })),

      validate: () => {
        const errors = validateStore(get().meta, get().services);
        set({ validationErrors: errors });
      },

      resetAll: () =>
        set({
          meta: { ...defaultMeta, creationTime: new Date().toISOString().slice(0, 19) + '+00:00' },
          services: [],
          activeServiceId: null,
          nav: { view: 'document' } as NavState,
          validationErrors: [],
          sourceUrl: null,
          sourceXml: null,
        }),
    }),
    {
      name: 'si-generator-store',
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<SIStore>),
        // Deep-merge meta so new fields get their defaults when loading old persisted state
        meta: { ...defaultMeta, ...((persisted as Partial<SIStore>).meta ?? {}) },
      }),
    }
  )
);
