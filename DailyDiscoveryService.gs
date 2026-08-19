/**
 * Web表示とメール配信で共通利用する「今日の発見」選定ロジック。
 * 同じ日・同じCatalogなら、誰が見ても同じ3件になる。
 * items は最終更新日時の新しい順を前提とする。
 */
function getTodaysDiscovery_(items, date) {
  if (!items || items.length === 0) return [];

  const dateKey = getDiscoveryDateKey_(date || new Date());
  const selectedIds = new Set();
  const picks = [];

  // 1件目: 最新3件を除外し、その次の最大27件（4〜30件目）から日替わりで1件。
  const recentPool = items.slice(3, 30);
  if (recentPool.length > 0) {
    const recentIndex = seededDiscoveryIndex_(dateKey + ':recent', recentPool.length);
    const recentPick = recentPool[recentIndex];
    selectedIds.add(recentPick.threadId);
    picks.push({
      item: recentPick,
      badge: 'ちょっと前の投稿から',
      modifier: 'pick-new'
    });
  }

  // 2件目: 初回投稿日が古い半分から日替わりで1件。
  const remainingForOld = items.filter(item => !selectedIds.has(item.threadId));
  const oldPoolSize = Math.max(1, Math.ceil(remainingForOld.length / 2));
  const oldPool = remainingForOld
    .slice()
    .sort((a, b) => a.firstPostTimestamp - b.firstPostTimestamp)
    .slice(0, oldPoolSize);

  if (oldPool.length > 0) {
    const oldIndex = seededDiscoveryIndex_(dateKey + ':old', oldPool.length);
    const oldPick = oldPool[oldIndex];
    selectedIds.add(oldPick.threadId);
    picks.push({
      item: oldPick,
      badge: 'かなり前の投稿から',
      modifier: 'pick-rediscover'
    });
  }

  // 3件目: 残りから日付seedで1件。
  const randomPool = items.filter(item => !selectedIds.has(item.threadId));
  if (randomPool.length > 0) {
    const randomIndex = seededDiscoveryIndex_(dateKey + ':random', randomPool.length);
    const randomPick = randomPool[randomIndex];
    picks.push({
      item: randomPick,
      badge: '全期間から',
      modifier: 'pick-random'
    });
  }

  return picks;
}

function getDiscoveryDateKey_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function seededDiscoveryIndex_(seed, length) {
  if (length <= 1) return 0;

  // クライアント側で使っていたFNV-1a相当の32bit hashをGAS側へ移植。
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}
