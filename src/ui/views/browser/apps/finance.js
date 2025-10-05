import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getPageByType } from './pageLookup.js';
import renderFinanceHeader from './finance/header.js';
import renderFinanceLedger, { createBankSection } from './finance/ledger.js';
import renderFinanceActivity from './finance/activity.js';
import renderFinanceEducation from './finance/education.js';
import renderFinanceHistory from './finance/history.js';
import renderFinanceObligations from './finance/obligations.js';
import { formatCurrency } from '../utils/financeFormatting.js';
import {
  createCommitmentTimeline,
  applyDeadlineTone,
  describeDeadlineLabel
} from '../components/commitmentMeters.js';

function renderFinancePendingIncome(entries = []) {
  const { section, body } = createBankSection('In-Flight Earnings', 'Assets with payouts pending the next day rollover.');
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No pending payouts. Every asset has settled for today.';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-pending';

  list.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--pending';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.label || entry.assetName || 'Asset';
    const amount = document.createElement('span');
    amount.className = 'bankapp-card__amount';
    amount.textContent = formatCurrency(entry.amount || 0);
    header.append(title, amount);
    card.appendChild(header);

    if (entry.assetName) {
      const note = document.createElement('p');
      note.className = 'bankapp-card__note';
      note.textContent = entry.assetName;
      card.appendChild(note);
    }

    if (entry.breakdown?.length) {
      const listEl = document.createElement('ul');
      listEl.className = 'bankapp-card__list';
      entry.breakdown.forEach(item => {
        if (!item || !item.amount) return;
        const row = document.createElement('li');
        row.className = 'bankapp-card__list-item';
        const label = document.createElement('span');
        label.textContent = item.label || 'Breakdown';
        const value = document.createElement('span');
        value.textContent = formatCurrency(item.amount || 0);
        row.append(label, value);
        listEl.appendChild(row);
      });
      card.appendChild(listEl);
    }

    grid.appendChild(card);
  });

  body.appendChild(grid);
  return section;
}

function renderFinancePerformance(entries = []) {
  const { section, body } = createBankSection('Asset Performance Table', 'Active instances ranked by average daily return.');
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No active assets yet. Launch a venture to start tracking ROI.';
    body.appendChild(empty);
    return section;
  }

  const table = document.createElement('table');
  table.className = 'bankapp-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Asset', 'Avg / day', 'Latest yield', 'Upkeep', 'Resale value'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  list.forEach(entry => {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = entry.label || entry.assetName || 'Asset';
    const average = document.createElement('td');
    average.textContent = formatCurrency(entry.average || 0);
    const latest = document.createElement('td');
    latest.textContent = formatCurrency(entry.latest || 0);
    const upkeep = document.createElement('td');
    upkeep.textContent = formatCurrency(entry.upkeep || 0);
    const sale = document.createElement('td');
    sale.textContent = formatCurrency(entry.saleValue || 0);
    row.append(name, average, latest, upkeep, sale);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  body.appendChild(table);
  return section;
}

function renderFinanceOpportunities(model = {}) {
  const { section, body } = createBankSection('Investments & Opportunity Costs', 'Line up future launches, upgrades, and hustles.');

  const container = document.createElement('div');
  container.className = 'bankapp-opportunities';

  const assetEntries = Array.isArray(model.assets) ? model.assets.slice(0, 4) : [];
  const upgradeEntries = Array.isArray(model.upgrades) ? model.upgrades.slice(0, 4) : [];
  const hustleEntries = Array.isArray(model.hustles) ? model.hustles.slice(0, 4) : [];

  function createOpportunityBlock(title, entries, renderItem) {
    const block = document.createElement('article');
    block.className = 'bankapp-opportunities__block';
    const heading = document.createElement('h3');
    heading.textContent = title;
    block.appendChild(heading);
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'bankapp-empty';
      empty.textContent = 'Nothing queued yet.';
      block.appendChild(empty);
      return block;
    }
    const list = document.createElement('ul');
    list.className = 'bankapp-opportunities__list';
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'bankapp-opportunities__item';
      renderItem(entry, item);
      list.appendChild(item);
    });
    block.appendChild(list);
    return block;
  }

  container.append(
    createOpportunityBlock('Assets', assetEntries, (entry, node) => {
      const name = document.createElement('span');
      name.className = 'bankapp-opportunities__name';
      name.textContent = entry.name || 'Asset';
      const cost = document.createElement('span');
      cost.className = 'bankapp-opportunities__value';
      cost.textContent = formatCurrency(entry.cost || 0);
      const note = document.createElement('span');
      note.className = 'bankapp-opportunities__note';
      const ready = entry.ready ? 'Ready to launch' : 'Prereqs pending';
      const payout = entry.payoutRange
        ? `Est. $${formatMoney(entry.payoutRange.min || 0)}–$${formatMoney(entry.payoutRange.max || 0)} / day`
        : '';
      const setup = entry.setup
        ? `${entry.setup.days || 0} day${entry.setup.days === 1 ? '' : 's'} • ${formatHours(entry.setup.hoursPerDay || 0)}/day`
        : '';
      note.textContent = [ready, payout, setup].filter(Boolean).join(' • ');
      node.append(name, cost, note);
    }),
    createOpportunityBlock('Upgrades', upgradeEntries, (entry, node) => {
      const name = document.createElement('span');
      name.className = 'bankapp-opportunities__name';
      name.textContent = entry.name || 'Upgrade';
      const cost = document.createElement('span');
      cost.className = 'bankapp-opportunities__value';
      cost.textContent = formatCurrency(entry.cost || 0);
      const status = document.createElement('span');
      status.className = 'bankapp-opportunities__note';
      if (entry.purchased) {
        status.textContent = 'Owned';
      } else if (entry.ready) {
        status.textContent = 'Affordable now';
      } else if (!entry.affordable) {
        status.textContent = 'Save up to unlock';
      } else {
        status.textContent = 'Requirements pending';
      }
      node.append(name, cost, status);
    }),
    createOpportunityBlock('Hustles', hustleEntries, (entry, node) => {
      node.classList.add('bankapp-opportunity', `bankapp-opportunity--${entry.type || 'offer'}`);
      node.dataset.hustleStatus = entry.status || '';

      const header = document.createElement('div');
      header.className = 'bankapp-opportunity__header';

      const name = document.createElement('span');
      name.className = 'bankapp-opportunities__name';
      name.textContent = entry.name || 'Hustle';
      header.appendChild(name);

      const status = document.createElement('span');
      status.className = 'bankapp-opportunity__status';
      if (entry.type === 'commitment') {
        status.textContent = entry.status === 'pending' ? 'Starts soon' : 'Active commitment';
      } else if (entry.status === 'available') {
        status.textContent = 'Available now';
      } else if (entry.status === 'upcoming') {
        status.textContent = entry.availableInDays === 0
          ? 'Unlocking today'
          : `Opens in ${entry.availableInDays} day${entry.availableInDays === 1 ? '' : 's'}`;
      } else {
        status.textContent = entry.status || 'Market offer';
      }
      header.appendChild(status);
      node.appendChild(header);

      const metrics = document.createElement('p');
      metrics.className = 'bankapp-opportunities__value';
      const payout = Number(entry.payout) || 0;
      const time = Number(entry.time) || 0;
      const roiValue = time > 0 ? payout / Math.max(time, 0.0001) : payout;
      const payoutLabel = formatCurrency(payout);
      metrics.textContent = `${payoutLabel} • ${formatHours(time)} • ${formatMoney(Math.round(roiValue * 100) / 100)} $/h`;
      node.appendChild(metrics);

      const note = document.createElement('p');
      note.className = 'bankapp-opportunities__note';

      if (entry.type === 'commitment') {
        const deadlineLabel = describeDeadlineLabel(entry.progress || entry);
        const detailParts = [entry.meta || '', deadlineLabel].filter(Boolean);
        note.textContent = detailParts.length ? detailParts.join(' • ') : 'Log hours from the Todo widget to progress.';
        node.appendChild(note);

        const timeline = createCommitmentTimeline(entry.progress || entry);
        if (timeline) {
          applyDeadlineTone(node, entry.progress || entry);
          node.appendChild(timeline);
        }
      } else {
        const requirements = entry.requirements || [];
        const unmet = requirements.filter(req => !req.met).map(req => req.label);
        const statusNotes = [];
        if (entry.status === 'available') {
          statusNotes.push('Ready to accept in the Hustles workspace.');
        } else if (entry.status === 'upcoming') {
          statusNotes.push(entry.availableInDays === 0
            ? 'Unlocks later today.'
            : `Unlocks in ${entry.availableInDays} day${entry.availableInDays === 1 ? '' : 's'}.`);
        }
        if (entry.remainingDays != null) {
          statusNotes.push(`${entry.remainingDays} day${entry.remainingDays === 1 ? '' : 's'} on the table.`);
          const remaining = Number(entry.remainingDays);
          if (Number.isFinite(remaining)) {
            if (remaining <= 1) {
              node.classList.add('is-critical');
            } else if (remaining <= 3) {
              node.classList.add('is-warning');
            }
          }
        }
        if (unmet.length) {
          statusNotes.push(`Needs: ${unmet.join(', ')}`);
        }
        note.textContent = statusNotes.length ? statusNotes.join(' ') : 'All requirements met. Lock it in!';
        node.appendChild(note);
      }
    })
  );

  body.appendChild(container);
  return section;
}


export default function renderFinance(context = {}, registries = {}, models = {}) {
  const page = getPageByType('finance');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    body.innerHTML = '';
    body.classList.add('bankapp');
  });
  if (!refs) return null;

  let financeModel = null;
  if (models && typeof models.finance === 'object' && models.finance !== null) {
    financeModel = models.finance;
  } else {
    console.warn('Finance view expected models.finance but it was missing. Rendering fallback view.');
  }

  const model = financeModel || {};

  const container = document.createElement('div');
  container.className = 'bankapp';

  if (model.header) {
    container.appendChild(renderFinanceHeader(model.header));
  }
  container.appendChild(renderFinanceLedger(model.ledger || {}));
  container.appendChild(renderFinanceObligations(model.obligations || {}));
  container.appendChild(renderFinancePendingIncome(model.pendingIncome || []));
  container.appendChild(renderFinancePerformance(model.assetPerformance || []));
  container.appendChild(renderFinanceOpportunities(model.opportunities || {}));
  container.appendChild(renderFinanceEducation(model.education || []));
  container.appendChild(renderFinanceHistory(model.history || []));
  container.appendChild(renderFinanceActivity(model.activity || []));

  refs.body.appendChild(container);

  return {
    id: page.id,
    meta: model.summary?.meta || 'Finance dashboard ready'
  };
}
