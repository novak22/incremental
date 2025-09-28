export function flashValue(element, negative = false) {
  if (!element) return;
  const className = negative ? 'flash-negative' : 'flash';
  element.classList.remove('flash', 'flash-negative');
  void element.offsetWidth;
  element.classList.add(className);
  setTimeout(() => element.classList.remove(className), 500);
}
