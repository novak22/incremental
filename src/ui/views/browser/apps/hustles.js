import { getPageByType } from './pageLookup.js';
import { createActionCard } from '../components/actionCardPresenter.js';

function describeMetaSummary({ availableCount, upcomingCount, commitmentCount }) {
  const parts = [];
  if (availableCount > 0) {
    parts.push(`${availableCount} offer${availableCount === 1 ? '' : 's'} ready`);
  }
  if (upcomingCount > 0) {
    parts.push(`${upcomingCount} queued`);
  }
  if (commitmentCount > 0) {
    parts.push(`${commitmentCount} commitment${commitmentCount === 1 ? '' : 's'} active`);
  }
  if (parts.length === 0) {
    return 'No actions ready yet — accept your next contract to kick things off.';
  }
  return `Keep the loop rolling — accept → work → complete. ${parts.join(' • ')}`;
}

export default function renderHustles(context = {}, definitions = [], models = []) {
  const page = getPageByType('hustles');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    if (!body.querySelector('[data-role="browser-hustle-list"]')) {
      const list = document.createElement('div');
      list.className = 'browser-card-grid';
      list.dataset.role = 'browser-hustle-list';
      body.appendChild(list);
    }
  });
  if (!refs) return null;

  const list = refs.body.querySelector('[data-role="browser-hustle-list"]');
  if (!list) return null;
  list.innerHTML = '';

  const modelMap = new Map(models.map(model => [model?.id, model]));
  let availableCount = 0;
  let commitmentCount = 0;
  let upcomingCount = 0;

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    const visibleOffersCount = Array.isArray(model.offers)
      ? model.offers.filter(offer => !offer?.locked).length
      : 0;
    if (visibleOffersCount > 0) {
      availableCount += 1;
    }

    if (Array.isArray(model.commitments)) {
      commitmentCount += model.commitments.length;
    }

    const visibleUpcomingCount = Array.isArray(model.upcoming)
      ? model.upcoming.filter(offer => !offer?.locked).length
      : 0;
    if (visibleUpcomingCount > 0) {
      upcomingCount += visibleUpcomingCount;
    }

    const card = createActionCard({ definition, model, variant: 'hustle' });
    if (card) {
      list.appendChild(card);
    }
  });

  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'browser-empty';
    empty.textContent = 'Queue an action to see it spotlighted here.';
    list.appendChild(empty);
  }

  const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });

  return {
    id: page.id,
    meta
  };
}
