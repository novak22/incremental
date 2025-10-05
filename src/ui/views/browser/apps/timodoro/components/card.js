import { appendContent } from '../../../components/common/domHelpers.js';

function createCard({ title, summary, headerClass, headerContent } = {}) {
  const card = document.createElement('article');
  card.className = 'browser-card timodoro-card';

  const header = document.createElement('header');
  header.className = 'browser-card__header';
  if (headerClass) {
    header.classList.add(headerClass);
  }

  const heading = document.createElement('h2');
  heading.className = 'browser-card__title';
  appendContent(heading, title);
  header.appendChild(heading);

  if (summary) {
    const description = document.createElement('p');
    description.className = 'browser-card__summary';
    appendContent(description, summary);
    header.appendChild(description);
  }

  if (headerContent) {
    appendContent(header, headerContent);
  }

  card.appendChild(header);
  return card;
}

export { createCard };
export default createCard;
