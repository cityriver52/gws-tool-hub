/**
 * Web表示とメール配信で共通利用する「今日の発見」選定ロジック。
 * その日の初回選定結果をScript Propertiesへ保存し、Catalogが増減しても当日は固定する。
 * 固定済みの投稿自体がCatalogから消えた場合だけ、その枠を再抽選して保存し直す。
 * items は最終更新日時の新しい順を前提とする。
 */
function getTodaysDiscovery_(items, date) {
  if (!items || items.length === 0) return [];

  const dateKey = getDiscoveryDateKey_(date || new Date());
  const propertyKey = `DAILY_DISCOVERY_${dateKey}`;
  const properties = PropertiesService.getScriptProperties();
  const stored = parseStoredDiscovery_(properties.getProperty(propertyKey));
  const itemMap = new Map(items.map(item => [item.threadId, item]));

  const selectedIds = new Set();
  const picks = [];
  let changed = false;

  const definitions = [
    {
      key: 'recent',
      badge: 'ちょっと前の投稿から',
      modifier: 'pick-new',
      buildPool: () => items.slice(3, 30)
    },
    {
      key: 'old',
      badge: 'かなり前の投稿から',
      modifier: 'pick-rediscover',
      buildPool: () => {
        const remaining = items.filter(item => !selectedIds.has(item.threadId));
        const oldPoolSize = Math.max(1, Math.ceil(remaining.length / 2));
        return remaining
          .slice()
          .sort((a, b) => a.firstPostTimestamp - b.firstPostTimestamp)
          .slice(0, oldPoolSize);
      }
    },
    {
      key: 'random',
      badge: '全期間から',
      modifier: 'pick-random',
      buildPool: () => items.filter(item => !selectedIds.has(item.threadId))
    }
  ];

  const nextStored = {};

  definitions.forEach(definition => {
    const storedThreadId = stored[definition.key];
    let item = storedThreadId ? itemMap.get(storedThreadId) : null;

    // 固定済み投稿が存在し、他枠とも重複しないならそのまま採用する。
    if (item && !selectedIds.has(item.threadId)) {
      nextStored[definition.key] = item.threadId;
      selectedIds.add(item.threadId);
      picks.push({ item, badge: definition.badge, modifier: definition.modifier });
      return;
    }

    const pool = definition
      .buildPool()
      .filter(candidate => !selectedIds.has(candidate.threadId));

    if (pool.length === 0) {
      if (storedThreadId) changed = true;
      return;
    }

    const index = seededDiscoveryIndex_(
      `${dateKey}:${definition.key}:replacement`,
      pool.length
    );
    item = pool[index];

    nextStored[definition.key] = item.threadId;
    selectedIds.add(item.threadId);
    picks.push({ item, badge: definition.badge, modifier: definition.modifier });

    if (storedThreadId !== item.threadId) changed = true;
  });

  if (!stored.__exists || changed || !storedDiscoveryEquals_(stored, nextStored)) {
    properties.setProperty(propertyKey, JSON.stringify(nextStored));
    cleanupOldDiscoveryProperties_(properties, dateKey);
  }

  return picks;
}

function parseStoredDiscovery_(value) {
  if (!value) return { __exists: false };

  try {
    const parsed = JSON.parse(value);
    return Object.assign({ __exists: true }, parsed || {});
  } catch (error) {
    return { __exists: false };
  }
}

function storedDiscoveryEquals_(stored, nextStored) {
  return ['recent', 'old', 'random'].every(key =>
    String(stored[key] || '') === String(nextStored[key] || '')
  );
}

function cleanupOldDiscoveryProperties_(properties, currentDateKey) {
  const prefix = 'DAILY_DISCOVERY_';
  const all = properties.getProperties();
  const keys = Object.keys(all)
    .filter(key => key.startsWith(prefix))
    .sort()
    .reverse();

  // 当日分に加え直近30日分だけ残す。
  keys.slice(31).forEach(key => properties.deleteProperty(key));
}

function getDiscoveryDateKey_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function seededDiscoveryIndex_(seed, length) {
  if (length <= 1) return 0;

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}
