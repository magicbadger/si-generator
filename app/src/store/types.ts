export interface DocumentMeta {
  serviceProvider: string;
  lang: string;
  creationTime: string;
  version: number;
  originator: string;
}

export interface ServiceName {
  lang: string;
  value: string;
}

export interface Bearer {
  id: string;
  type: 'dab' | 'fm' | 'ip_stream' | 'ip_playlist';
  uri: string;
  mimeValue?: string;
  bitrate?: number;
  cost: number;
  offset?: number;
}

export interface RadioDNS {
  fqdn: string;
  serviceIdentifier: string;
}

export interface Multimedia {
  id: string;
  url: string;
  logoType: 'logo_colour_square' | 'logo_colour_rectangle' | 'logo_unrestricted';
  mimeValue?: string;
  width?: number;
  height?: number;
  lang?: string;
}

export interface Genre {
  href: string;
  type: 'main' | 'secondary' | 'other';
}

export interface Link {
  id: string;
  uri: string;
  description?: string;
  mimeValue?: string;
  lang?: string;
  expiryTime?: string;
}

export interface Service {
  id: string;
  shortNames: ServiceName[];
  mediumNames: ServiceName[];
  longNames: ServiceName[];
  shortDescriptions: Array<{ lang: string; value: string }>;
  longDescriptions: Array<{ lang: string; value: string }>;
  bearers: Bearer[];
  radiodns?: RadioDNS;
  multimedia: Multimedia[];
  genres: Genre[];
  keywords: string;
  links: Link[];
}

export interface ValidationError {
  serviceId?: string;
  field: string;
  message: string;
  suggestion: string;
}

export interface SIStore {
  meta: DocumentMeta;
  services: Service[];
  activeServiceId: string | null;
  nav: NavState;
  validationErrors: ValidationError[];
  setMeta: (meta: Partial<DocumentMeta>) => void;
  addService: () => string;
  updateService: (id: string, update: Partial<Service>) => void;
  removeService: (id: string) => void;
  setActiveService: (id: string | null) => void;
  setNav: (nav: NavState) => void;
  validate: () => void;
  resetAll: () => void;
}

export type NavState =
  | { view: 'document' }
  | { view: 'service'; serviceId: string; step: number }
  | { view: 'export' };
