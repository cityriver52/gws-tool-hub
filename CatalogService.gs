/**
 * Webアプリへ返す表示用データを組み立てる。
 * Catalogの読み取り責務はCatalogRepository.gsに集約する。
 */
function getCatalogData() {
  const items = getPublishedCatalogItems_();
  const tags = collectCatalogTags_(items);

  return {
    items,
    tags,
    dailyDiscovery: getTodaysDiscovery_(items),
    generatedAt: formatWebDate_(new Date())
  };
}

function collectCatalogTags_(items) {
  const tagSet = new Set();
  items.forEach(item => {
    (item.tags || []).forEach(tag => tagSet.add(tag));
  });

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja'));
}
