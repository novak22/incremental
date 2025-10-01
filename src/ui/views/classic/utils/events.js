export function emitUIEvent(name) {
  if (typeof document?.createEvent === 'function') {
    const event = document.createEvent('Event');
    event.initEvent(name, true, true);
    document.dispatchEvent(event);
    return;
  }

  if (typeof Event === 'function') {
    document.dispatchEvent(new Event(name));
  }
}
