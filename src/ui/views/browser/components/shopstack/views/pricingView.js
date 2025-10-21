import { appendContent } from '../../common/domHelpers.js';
import { renderWorkspaceLinkList } from '../workspaceLinks.js';

export default function renderPricingView() {
  const container = document.createElement('section');
  container.className = 'shopstack-pricing';

  const intro = document.createElement('div');
  intro.className = 'shopstack-pricing__intro';
  const heading = document.createElement('h3');
  heading.textContent = 'How checkout works';
  const blurb = document.createElement('p');
  blurb.append('ShopStack pulls live pricing, requirements, and effects from the core upgrade systems. Buying an item deducts cash instantly and applies the bonus without extra clicks. ');
  blurb.append('Need niche-specific perks? Hop into ');
  blurb.appendChild(renderWorkspaceLinkList());
  blurb.append(' to browse their dedicated tabs.');
  intro.append(heading, blurb);

  const faqList = document.createElement('dl');
  faqList.className = 'shopstack-pricing__faq';

  const entries = [
    {
      question: 'What happens after I buy something?',
      answer:
        'Upgrades activate immediately and the classic backend handles every bonus, slot change, or automation effect. No additional confirmation screens required.'
    },
    {
      question: 'Why are some items greyed out?',
      answer:
        'Grey items need more progress—either save up cash or complete the listed prerequisites. Once the requirement is met, the tile will light up and the Buy button unlocks.'
    },
    {
      question: 'Do assistants and boosts show ongoing costs?',
      answer:
        'Yes! Owned upgrades appear in the My Purchases tab with payroll, upkeep, or daily limits highlighted so you know what to fund tomorrow.'
    },
    {
      question: 'Where did service-specific upgrades move?',
      answer: () => {
        const fragment = document.createDocumentFragment();
        fragment.append('They now live directly inside each workspace. Jump into ');
        fragment.appendChild(renderWorkspaceLinkList());
        fragment.append(' to see their focused catalogs.');
        return fragment;
      }
    }
  ];

  entries.forEach(entry => {
    const term = document.createElement('dt');
    term.textContent = entry.question;
    const definition = document.createElement('dd');
    appendContent(definition, entry.answer);
    faqList.append(term, definition);
  });

  container.append(intro, faqList);
  return container;
}
