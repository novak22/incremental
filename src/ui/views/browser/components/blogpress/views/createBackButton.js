export default function createBackButton({ onClick = () => {}, label = 'Back to blogs' } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blogpress-button blogpress-button--link';
  button.textContent = label;
  button.addEventListener('click', event => {
    event.preventDefault();
    if (typeof onClick === 'function') {
      onClick(event);
    }
  });
  return button;
}
