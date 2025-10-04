export default function renderPricingView({ context, formatters }) {
  const section = document.createElement('section');
  section.className = 'learnly-view learnly-view--pricing';

  const heading = document.createElement('h2');
  heading.textContent = 'Pricing & FAQ';
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'learnly-faq';

  const entries = [
    {
      title: 'How does tuition work?',
      body: `Tuition is paid upfront when you enroll. We sink the cost immediately so you can focus on finishing the course. Your current schedule reserves ${formatters.formatHours(context.summary.dailyHours)} for active tracks.`
    },
    {
      title: 'What happens to my time?',
      body: 'Learnly books the required hours automatically each morning. Finish your study block to keep progress moving; skipping a day simply pauses advancement.'
    },
    {
      title: 'Why finish a course?',
      body: 'Graduation unlocks new hustle bonuses, boosts payouts, and awards fresh skill XP to push your creator level higher.'
    }
  ];

  entries.forEach(entry => {
    const item = document.createElement('article');
    item.className = 'learnly-faq__item';
    const title = document.createElement('h3');
    title.textContent = entry.title;
    const body = document.createElement('p');
    body.textContent = entry.body;
    item.append(title, body);
    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}
