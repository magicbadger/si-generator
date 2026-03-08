export interface GenreOption {
  label: string;
  urn: string;
}

export const GENRE_OPTIONS: GenreOption[] = [
  { label: 'News', urn: 'urn:tva:metadata:cs:ContentCS:2002:3.1.1' },
  { label: 'Sport', urn: 'urn:tva:metadata:cs:ContentCS:2002:3.6.9' },
  { label: 'Music (Pop)', urn: 'urn:tva:metadata:cs:ContentCS:2002:3.6.2' },
  { label: 'Music (Classical)', urn: 'urn:tva:metadata:cs:ContentCS:2002:3.6.1' },
  { label: 'Talk / Speech', urn: 'urn:tva:metadata:cs:ContentCS:2002:3.1' },
  { label: 'Children', urn: 'urn:tva:metadata:cs:ContentCS:2002:3.5.1' },
  { label: 'Religion', urn: 'urn:tva:metadata:cs:ContentCS:2002:3.4' },
];
