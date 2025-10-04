export function createDetailCta({ status, onClick }) {
  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'shopstack-button shopstack-button--primary shopstack-detail__cta';
  if (status.tone === 'owned') {
    cta.textContent = 'Owned and active';
    cta.disabled = true;
  } else if (status.tone === 'ready') {
    cta.textContent = 'Buy now';
  } else if (status.tone === 'unaffordable') {
    cta.textContent = 'Save up to buy';
    cta.disabled = true;
  } else {
    cta.textContent = 'Locked';
    cta.disabled = true;
  }
  cta.addEventListener('click', () => {
    if (cta.disabled) return;
    onClick?.(cta);
  });
  return cta;
}

export default {
  createDetailCta
};
