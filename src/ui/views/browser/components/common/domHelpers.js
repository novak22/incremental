function isNodeLike(value) {
  return value != null && typeof value === 'object' && typeof value.nodeType === 'number';
}

function appendContent(target, content) {
  if (!target || content == null) {
    return;
  }
  if (Array.isArray(content)) {
    content.forEach(item => appendContent(target, item));
    return;
  }
  if (isNodeLike(content)) {
    target.appendChild(content);
    return;
  }
  if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
    target.append(String(content));
    return;
  }
  if (typeof content === 'function') {
    const result = content(target);
    appendContent(target, result);
    return;
  }
  if (content && typeof content === 'object' && 'content' in content) {
    appendContent(target, content.content);
  }
}

export { appendContent };
