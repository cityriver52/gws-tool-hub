/**
 * Google Chatの親投稿へ直接移動するURLを生成する。
 *
 * URL形式:
 * https://chat.google.com/room/{spaceId}/{threadId}/{messageId}
 *
 * threadId:
 *   spaces/{spaceId}/threads/{threadId}
 *
 * parentPostId:
 *   spaces/{spaceId}/messages/{messageId}
 */
function buildChatUrl_(threadId, parentPostId) {
  if (!threadId || !parentPostId) return '';

  const threadParts = String(threadId).split('/');
  const messageParts = String(parentPostId).split('/');

  const spaceId = messageParts[1] || '';
  const threadResourceId = threadParts[threadParts.length - 1] || '';
  const messageId = messageParts[messageParts.length - 1] || '';

  if (!spaceId || !threadResourceId || !messageId) return '';

  return (
    'https://chat.google.com/room/' +
    encodeURIComponent(spaceId) + '/' +
    encodeURIComponent(threadResourceId) + '/' +
    encodeURIComponent(messageId)
  );
}
