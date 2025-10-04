export default function renderPricingView() {
  const container = document.createElement('section');
  container.className = 'shopstack-pricing';

  const intro = document.createElement('div');
  intro.className = 'shopstack-pricing__intro';
  intro.innerHTML = '<h3>How checkout works</h3><p>ShopStack pulls live pricing, requirements, and effects from the core upgrade systems. Buying an item deducts cash instantly and applies the bonus without extra clicks.</p>';

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
    }
  ];

  entries.forEach(entry => {
    const term = document.createElement('dt');
    term.textContent = entry.question;
    const definition = document.createElement('dd');
    definition.textContent = entry.answer;
    faqList.append(term, definition);
  });

  container.append(intro, faqList);
  return container;
}
