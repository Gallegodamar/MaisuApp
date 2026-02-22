export type Level = 'A2' | 'B1' | 'B2' | 'C1' | 'Mailarik gabe';
export type ItemType = 'hitza' | 'egitura';

export interface Item {
  id: string;
  teacherId: string;
  type: ItemType;
  eu: string;
  euKey: string;
  es: string;
  level: Level;
  synonymsEu?: string[];
  exampleEu?: string;
  topic?: string;
  tags?: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export function normalizeEuKey(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

export interface Teacher {
  id: string;
  name: string;
}

export const TEACHERS: Teacher[] = [
  { id: 'mertxe', name: 'Mertxe' },
  { id: 'iratxe', name: 'Iratxe' },
  { id: 'uxue', name: 'Uxue' },
  { id: 'nerea', name: 'Nerea' },
  { id: 'maite', name: 'Maite' },
  { id: 'esti', name: 'Esti' },
  { id: 'bego', name: 'Bego' },
];
