import Dexie, { type Table } from 'dexie';
import { Item, normalizeEuKey } from './types';

type ItemRow = Omit<Item, 'id' | 'euKey'> & { id: string | number; euKey?: string };
type ItemPatch = Partial<Omit<ItemRow, 'id'>>;

const EMPTY_LEVEL = 'Mailarik gabe';

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function mergeStringList(...lists: Array<string[] | undefined>): string[] | undefined {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (typeof raw !== 'string') continue;
      const value = raw.trim();
      if (!value) continue;
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(value);
    }
  }

  return merged.length > 0 ? merged : undefined;
}

function sameStringList(a?: string[], b?: string[]) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function parseDateSafe(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function itemEuKey(item: Pick<ItemRow, 'eu' | 'euKey'>) {
  const computed = normalizeEuKey(item.eu);
  if (!computed && item.euKey) return item.euKey;
  return computed;
}

function pickCanonicalItem(items: ItemRow[]) {
  return [...items].sort((a, b) => {
    const aCreated = parseDateSafe(a.createdAt) ?? Number.MAX_SAFE_INTEGER;
    const bCreated = parseDateSafe(b.createdAt) ?? Number.MAX_SAFE_INTEGER;
    if (aCreated !== bCreated) return aCreated - bCreated;

    const aUpdated = parseDateSafe(a.updatedAt) ?? Number.MAX_SAFE_INTEGER;
    const bUpdated = parseDateSafe(b.updatedAt) ?? Number.MAX_SAFE_INTEGER;
    if (aUpdated !== bUpdated) return aUpdated - bUpdated;

    return String(a.id).localeCompare(String(b.id));
  })[0];
}

function chooseLevel(primary: ItemRow, duplicates: ItemRow[]) {
  const primaryLevelRaw = primary.level as string | undefined;
  if (primaryLevelRaw && primaryLevelRaw !== EMPTY_LEVEL && primaryLevelRaw !== 'A1') {
    return primary.level;
  }

  const replacement = duplicates
    .map(item => item.level as string | undefined)
    .find(level => level && level !== EMPTY_LEVEL && level !== 'A1');

  if (replacement) return replacement as Item['level'];
  if (primaryLevelRaw === 'A1') return 'A2';
  return primary.level;
}

function buildMergedPatch(primary: ItemRow, group: ItemRow[]): ItemPatch {
  const duplicates = group.filter(item => item.id !== primary.id);
  const patch: ItemPatch = {};

  const canonicalEuKey = itemEuKey(primary);
  if (primary.euKey !== canonicalEuKey) patch.euKey = canonicalEuKey;

  const mergedEs = nonEmptyString(primary.es) ?? duplicates.map(item => nonEmptyString(item.es)).find(Boolean);
  if (mergedEs && mergedEs !== primary.es) patch.es = mergedEs;

  const mergedExample =
    nonEmptyString(primary.exampleEu) ??
    duplicates.map(item => nonEmptyString(item.exampleEu)).find(Boolean);
  if (mergedExample !== undefined && mergedExample !== primary.exampleEu) patch.exampleEu = mergedExample;

  const mergedTopic =
    nonEmptyString(primary.topic) ??
    duplicates.map(item => nonEmptyString(item.topic)).find(Boolean);
  if (mergedTopic !== undefined && mergedTopic !== primary.topic) patch.topic = mergedTopic;

  const mergedSynonyms = mergeStringList(primary.synonymsEu, ...duplicates.map(item => item.synonymsEu));
  if (!sameStringList(mergedSynonyms, primary.synonymsEu)) patch.synonymsEu = mergedSynonyms;

  const mergedTags = mergeStringList(primary.tags, ...duplicates.map(item => item.tags));
  if (!sameStringList(mergedTags, primary.tags)) patch.tags = mergedTags;

  const mergedLevel = chooseLevel(primary, duplicates);
  if (mergedLevel && mergedLevel !== primary.level) patch.level = mergedLevel;

  const mergedFavorite = Boolean(primary.favorite) || duplicates.some(item => Boolean(item.favorite));
  if (mergedFavorite !== primary.favorite) patch.favorite = mergedFavorite;

  if (!parseDateSafe(primary.createdAt)) {
    const fallbackCreatedAt = group
      .map(item => item.createdAt)
      .find(value => parseDateSafe(value));
    if (fallbackCreatedAt) patch.createdAt = fallbackCreatedAt;
  }

  if (Object.keys(patch).length > 0) {
    const latestUpdatedAt = group
      .map(item => ({ raw: item.updatedAt, time: parseDateSafe(item.updatedAt) }))
      .filter((entry): entry is { raw: string; time: number } => typeof entry.raw === 'string' && entry.time !== null)
      .sort((a, b) => b.time - a.time)[0]?.raw;

    patch.updatedAt = latestUpdatedAt ?? new Date().toISOString();
  }

  return patch;
}

async function dedupeItemsByKey(
  itemsTable: Table<ItemRow>,
  label: string,
  keyBuilder: (item: ItemRow) => string,
) {
  const allItems = await itemsTable.toArray();
  const groups = new Map<string, ItemRow[]>();

  for (const item of allItems) {
    const key = keyBuilder(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  let duplicatesRemoved = 0;
  let rowsMerged = 0;

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const primary = pickCanonicalItem(group);
    const duplicates = group.filter(item => item.id !== primary.id);
    const patch = buildMergedPatch(primary, group);

    if (Object.keys(patch).length > 0) {
      await itemsTable.update(primary.id, patch);
      rowsMerged++;
    }

    for (const duplicate of duplicates) {
      await itemsTable.delete(duplicate.id);
      duplicatesRemoved++;
    }
  }

  if (duplicatesRemoved > 0) {
    console.info(
      `[DB migration] ${label}: removed ${duplicatesRemoved}, merged ${rowsMerged}.`,
    );
  }
}

async function dedupeItemsForExactKey(itemsTable: Table<ItemRow>) {
  await dedupeItemsByKey(
    itemsTable,
    'Deduplicated exact compound key',
    (item) => `${item.teacherId}:::${item.type}:::${item.eu}`,
  );
}

async function backfillEuKeys(itemsTable: Table<ItemRow>) {
  const allItems = await itemsTable.toArray();
  let updatedCount = 0;

  for (const item of allItems) {
    const euKey = itemEuKey(item);
    if (item.euKey !== euKey) {
      await itemsTable.update(item.id, { euKey });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.info(`[DB migration] Backfilled euKey for ${updatedCount} items.`);
  }
}

async function dedupeItemsForCanonicalKey(itemsTable: Table<ItemRow>) {
  await dedupeItemsByKey(
    itemsTable,
    'Deduplicated canonical euKey',
    (item) => `${item.teacherId}:::${item.type}:::${itemEuKey(item)}`,
  );
}

export class AppDatabase extends Dexie {
  items!: Table<Item>;

  constructor() {
    super('EuskaraIrakasleDB');
    this.version(2).stores({
      items: '++id, [teacherId+eu+type], teacherId, type, eu, es, level, topic, favorite, createdAt, updatedAt'
    });
    this.version(3)
      .stores({
        items: '++id, [teacherId+eu+type], teacherId, type, eu, es, level, topic, favorite, createdAt, updatedAt'
      })
      .upgrade(async (tx) => {
        await dedupeItemsForExactKey(tx.table('items') as Table<ItemRow>);
      });
    this.version(4).stores({
      items: '++id, &[teacherId+eu+type], teacherId, type, eu, es, level, topic, favorite, createdAt, updatedAt'
    });
    this.version(5)
      .stores({
        items: '++id, &[teacherId+eu+type], [teacherId+type+euKey], [type+euKey], teacherId, type, euKey, eu, es, level, topic, favorite, createdAt, updatedAt'
      })
      .upgrade(async (tx) => {
        const table = tx.table('items') as Table<ItemRow>;
        await backfillEuKeys(table);
        await dedupeItemsForCanonicalKey(table);
      });
    this.version(6).stores({
      items: '++id, &[teacherId+type+euKey], [teacherId+eu+type], [type+euKey], teacherId, type, euKey, eu, es, level, topic, favorite, createdAt, updatedAt'
    });
  }
}

export const db = new AppDatabase();
