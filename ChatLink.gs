/**
 * 現時点では対象スペースを開くURLを返す。
 * 個別メッセージpermalinkの生成方法を確定できたら、この関数だけ差し替える。
 */
function buildChatUrl_(threadId, parentPostId) {
  if (!CONFIG.SPACE_NAME) return '';

  const spaceId = String(CONFIG.SPACE_NAME).replace(/^spaces\//, '');
  if (!spaceId) return '';

  return (
    'https://mail.google.com/chat/u/0/#chat/space/' +
    encodeURIComponent(spaceId)
  );
}
