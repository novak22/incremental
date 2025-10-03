import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getPageByType } from './pageLookup.js';

function formatCurrency(amount) {
  const numeric = Number(amount);
  const absolute = Math.abs(numeric);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const prefix = numeric < 0 ? '-$' : '$';
  return `${prefix}${formatted}`;
}

function formatSignedCurrency(amount) {
  const numeric = Number(amount);
  const absolute = Math.abs(numeric);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';
  return `${sign}$${formatted}`;
}

function createBankSection(title, note) {
  const section = document.createElement('section');
  section.className = 'bankapp-section';

  const header = document.createElement('header');
  header.className = 'bankapp-section__header';

  const heading = document.createElement('h2');
  heading.textContent = title;
  header.appendChild(heading);

  if (note) {
    const description = document.createElement('p');
    description.textContent = note;
    header.appendChild(description);
  }

  const body = document.createElement('div');
  body.className = 'bankapp-section__body';

  section.append(header, body);
  return { section, body };
}

function renderFinanceHeader(model = {}) {
  const container = document.createElement('section');
  container.className = 'bankapp__header';

  const summary = document.createElement('div');
  summary.className = 'bankapp-summary';

  const balanceValue = Number((model.currentBalance ?? model.cashOnHand ?? 0));
  const netValue = Number(model.netDaily || 0);
  const dailyIncomeValue = Number(model.dailyIncome || 0);
  const dailySpendValue = Number(model.dailySpend || 0);
  const lifetimeEarnedValue = Number(model.lifetimeEarned || 0);
  const lifetimeSpentValue = Number(model.lifetimeSpent || 0);
  const cards = [
    { label: 'Current balance', value: formatCurrency(balanceValue), tone: 'neutral' },
    { label: 'Net / Day', value: formatSignedCurrency(netValue), tone: netValue > 0 ? 'positive' : netValue < 0 ? 'negative' : 'neutral' },
    { label: 'Daily +', value: formatCurrency(dailyIncomeValue), tone: dailyIncomeValue > 0 ? 'positive' : 'neutral' },
    { label: 'Daily -', value: formatCurrency(dailySpendValue > 0 ? -dailySpendValue : 0), tone: dailySpendValue > 0 ? 'negative' : 'neutral' }
  ];

  cards.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-summary__card';
    const label = document.createElement('span');
    label.className = 'bankapp-summary__label';
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.className = 'bankapp-summary__value';
    value.textContent = entry.value;
    if (entry.tone === 'positive') {
      value.classList.add('is-positive');
    } else if (entry.tone === 'negative') {
      value.classList.add('is-negative');
    }
    card.append(label, value);
    summary.appendChild(card);
  });

  container.appendChild(summary);

  if (lifetimeEarnedValue > 0 || lifetimeSpentValue > 0) {
    const footnote = document.createElement('p');
    footnote.className = 'bankapp-summary__footnote';
    const earnedText = formatCurrency(lifetimeEarnedValue);
    const spentText = formatCurrency(lifetimeSpentValue > 0 ? -lifetimeSpentValue : 0);
    footnote.textContent = `Lifetime earned ${earnedText} • Lifetime spent ${spentText}`;
    container.appendChild(footnote);
  }

  const pulseEntries = Array.isArray(model.pulse) ? model.pulse : [];
  if (pulseEntries.length) {
    const pulse = document.createElement('div');
    pulse.className = 'bankapp-pulse';
    pulseEntries.forEach(entry => {
      const item = document.createElement('span');
      item.className = `bankapp-pulse__item bankapp-pulse__item--${entry.direction === 'out' ? 'out' : 'in'}`;
      const icon = document.createElement('span');
      icon.className = 'bankapp-pulse__icon';
      icon.textContent = entry.icon || (entry.direction === 'out' ? '📉' : '💵');
      const label = document.createElement('span');
      label.className = 'bankapp-pulse__label';
      const amountText = formatSignedCurrency(entry.direction === 'out' ? -entry.amount : entry.amount);
      label.textContent = `${amountText} ${entry.label}`;
      item.append(icon, label);
      pulse.appendChild(item);
    });
    container.appendChild(pulse);
  }

  if (model.quickObligation) {
    const pill = document.createElement('div');
    pill.className = 'bankapp-pill';
    const label = document.createElement('span');
    label.className = 'bankapp-pill__label';
    label.textContent = model.quickObligation.label || 'Obligation';
    const value = document.createElement('span');
    value.className = 'bankapp-pill__value';
    value.textContent = formatCurrency(model.quickObligation.amount || 0);
    const note = document.createElement('span');
    note.className = 'bankapp-pill__note';
    note.textContent = model.quickObligation.note || '';
    pill.append(label, value, note);
    container.appendChild(pill);
  }

  if (model.topEarner) {
    const badge = document.createElement('div');
    badge.className = 'bankapp-badge';
    const icon = document.createElement('span');
    icon.className = 'bankapp-badge__icon';
    icon.textContent = '🏅';
    const body = document.createElement('div');
    body.className = 'bankapp-badge__body';
    const title = document.createElement('span');
    title.className = 'bankapp-badge__title';
    title.textContent = 'Top earner today';
    const value = document.createElement('span');
    value.className = 'bankapp-badge__value';
    value.textContent = `${model.topEarner.label} • ${formatCurrency(model.topEarner.amount || 0)}`;
    body.append(title, value);
    badge.append(icon, body);
    container.appendChild(badge);
  }

  return container;
}

function createLedgerColumn(title, entries = [], direction = 'in') {
  const column = document.createElement('article');
  column.className = `bankapp-ledger__column bankapp-ledger__column--${direction}`;

  const heading = document.createElement('h3');
  heading.textContent = title;
  column.appendChild(heading);

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = direction === 'out'
      ? 'No spending recorded yet.'
      : 'No earnings logged today.';
    column.appendChild(empty);
    return column;
  }

  entries.forEach(group => {
    const card = document.createElement('div');
    card.className = 'bankapp-ledger-group';

    const header = document.createElement('div');
    header.className = 'bankapp-ledger-group__header';
    const icon = document.createElement('span');
    icon.className = 'bankapp-ledger-group__icon';
    icon.textContent = group.icon || (direction === 'out' ? '📉' : '💵');
    const label = document.createElement('span');
    label.className = 'bankapp-ledger-group__title';
    label.textContent = group.label || 'Ledger';
    const total = document.createElement('span');
    total.className = 'bankapp-ledger-group__total';
    const signed = direction === 'out' ? -group.total : group.total;
    total.textContent = formatSignedCurrency(signed);
    header.append(icon, label, total);
    card.appendChild(header);

    if (group.entries?.length) {
      const list = document.createElement('ul');
      list.className = 'bankapp-ledger-group__list';
      group.entries.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'bankapp-ledger-group__item';
        const name = document.createElement('span');
        name.className = 'bankapp-ledger-group__name';
        name.textContent = entry.label;
        const amount = document.createElement('span');
        amount.className = 'bankapp-ledger-group__amount';
        const signedAmount = direction === 'out' ? -entry.amount : entry.amount;
        amount.textContent = formatSignedCurrency(signedAmount);
        item.append(name, amount);
        if (entry.note) {
          const note = document.createElement('span');
          note.className = 'bankapp-ledger-group__note';
          note.textContent = entry.note;
          item.appendChild(note);
        }
        list.appendChild(item);
      });
      card.appendChild(list);
    }

    column.appendChild(card);
  });

  return column;
}

function renderFinanceLedger(model = {}) {
  const { section, body } = createBankSection(
    'Daily Cashflow (Ledger)',
    'Today’s earnings and spend straight from the classic dashboard breakdown.'
  );

  const ledger = document.createElement('div');
  ledger.className = 'bankapp-ledger';
  ledger.append(
    createLedgerColumn('Inflows', Array.isArray(model.inflows) ? model.inflows : [], 'in'),
    createLedgerColumn('Outflows', Array.isArray(model.outflows) ? model.outflows : [], 'out')
  );

  body.appendChild(ledger);
  return section;
}

function renderFinanceHistory(history = []) {
  const { section, body } = createBankSection(
    'Cashflow History',
    'Seven-day snapshots captured at day end.'
  );

  const entries = Array.isArray(history) ? history.slice(0, 7) : [];
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'Wrap a full day to start the rolling history.';
    body.appendChild(empty);
    return section;
  }

  const list = document.createElement('ol');
  list.className = 'bankapp-history';

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'bankapp-history__item';
    if (entry?.tone) {
      item.dataset.tone = entry.tone;
    }

    const header = document.createElement('div');
    header.className = 'bankapp-history__header';
    const label = document.createElement('span');
    label.className = 'bankapp-history__label';
    label.textContent = entry?.label || 'Day';
    header.appendChild(label);

    if (Number.isFinite(entry?.recordedAt)) {
      const time = document.createElement('time');
      time.className = 'bankapp-history__time';
      const stamp = new Date(entry.recordedAt);
      time.dateTime = stamp.toISOString();
      time.textContent = stamp.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      header.appendChild(time);
    }

    const totals = document.createElement('div');
    totals.className = 'bankapp-history__totals';
    const net = document.createElement('span');
    net.className = 'bankapp-history__net';
    net.textContent = formatSignedCurrency(entry?.totals?.net || 0);
    totals.appendChild(net);

    const split = document.createElement('span');
    split.className = 'bankapp-history__split';
    const income = Number(entry?.totals?.income || 0);
    const spend = Number(entry?.totals?.spend || 0);
    split.textContent = `${formatCurrency(income)} • ${formatCurrency(spend > 0 ? -spend : 0)}`;
    totals.appendChild(split);

    const highlights = document.createElement('p');
    highlights.className = 'bankapp-history__highlights';
    const incomeTop = entry?.ledger?.payouts?.[0];
    const spendTop = entry?.ledger?.costs?.[0];
    const details = [];
    if (incomeTop) {
      details.push(
        `${incomeTop.label || 'Income'} ${formatSignedCurrency(incomeTop.amount || 0)}`
      );
    }
    if (spendTop) {
      details.push(
        `${spendTop.label || 'Spend'} ${formatSignedCurrency(
          spendTop.amount ? -spendTop.amount : 0
        )}`
      );
    }
    highlights.textContent = details.length
      ? details.join(' • ')
      : 'Cashflow steady without standout spikes.';

    item.append(header, totals, highlights);
    list.appendChild(item);
  });

  body.appendChild(list);
  return section;
}

function renderFinanceActivity(entries = []) {
  const { section, body } = createBankSection(
    'Recent Activity Log',
    'Latest timeline pulled from the shared activity feed.'
  );

  const activity = Array.isArray(entries) ? entries.slice(0, 10) : [];
  if (!activity.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No recent entries yet—start hustling to fill the log!';
    body.appendChild(empty);
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'bankapp-activity';

  activity.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'bankapp-activity__item';
    if (entry?.tone) {
      item.dataset.tone = entry.tone;
    }

    const message = document.createElement('span');
    message.className = 'bankapp-activity__message';
    message.textContent = entry?.message || '';
    item.appendChild(message);

    if (Number.isFinite(entry?.timestamp)) {
      const time = document.createElement('time');
      const stamp = new Date(entry.timestamp);
      time.className = 'bankapp-activity__time';
      time.dateTime = stamp.toISOString();
      time.textContent = stamp.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      item.appendChild(time);
    }

    list.appendChild(item);
  });

  body.appendChild(list);
  return section;
}

function renderFinanceObligations(model = {}) {
  const { section, body } = createBankSection('Pending & Upcoming Obligations', 'Keep upkeep, payroll, and tuition funded.');
  const entries = Array.isArray(model.entries) ? model.entries : [];

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No obligations queued. Everything is funded!';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-obligations';

  entries.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--obligation';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.label || 'Obligation';
    const amount = document.createElement('span');
    amount.className = 'bankapp-card__amount';
    amount.textContent = formatCurrency(entry.amount || 0);
    header.append(title, amount);
    card.appendChild(header);

    if (entry.note) {
      const note = document.createElement('p');
      note.className = 'bankapp-card__note';
      note.textContent = entry.note;
      card.appendChild(note);
    }

    if (Array.isArray(entry.items) && entry.items.length) {
      const list = document.createElement('ul');
      list.className = 'bankapp-card__list';
      entry.items.forEach(item => {
        const row = document.createElement('li');
        row.className = 'bankapp-card__list-item';
        const name = document.createElement('span');
        name.textContent = item.label || 'Entry';
        const value = document.createElement('span');
        value.textContent = formatCurrency(item.amount || 0);
        row.append(name, value);
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    grid.appendChild(card);
  });

  body.appendChild(grid);
  return section;
}

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
      const name = document.createElement('span');
      name.className = 'bankapp-opportunities__name';
      name.textContent = entry.name || 'Hustle';
      const roi = document.createElement('span');
      roi.className = 'bankapp-opportunities__value';
      const payout = Number(entry.payout) || 0;
      const time = Number(entry.time) || 0;
      const roiValue = time > 0 ? payout / time : payout;
      roi.textContent = `${formatCurrency(payout)} • ${formatHours(time)} • ${formatMoney(Math.round(roiValue * 100) / 100)} $/h`;
      const requirements = document.createElement('span');
      requirements.className = 'bankapp-opportunities__note';
      const unmet = entry.requirements?.filter(req => !req.met).map(req => req.label);
      requirements.textContent = unmet?.length ? `Needs: ${unmet.join(', ')}` : 'Ready to run';
      node.append(name, roi, requirements);
    })
  );

  body.appendChild(container);
  return section;
}

function renderFinanceEducation(entries = []) {
  const { section, body } = createBankSection('Education Investments', 'Courses in progress with tuition already committed.');
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'bankapp-empty';
    empty.textContent = 'No active courses. Enroll in a study track to plan tuition.';
    body.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'bankapp-education';

  list.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'bankapp-card bankapp-card--education';
    const header = document.createElement('div');
    header.className = 'bankapp-card__header';
    const title = document.createElement('h3');
    title.textContent = entry.name || 'Course';
    const tuition = document.createElement('span');
    tuition.className = 'bankapp-card__amount';
    tuition.textContent = entry.tuition > 0 ? formatCurrency(entry.tuition) : 'Free';
    header.append(title, tuition);
    card.appendChild(header);

    const note = document.createElement('p');
    note.className = 'bankapp-card__note';
    note.textContent = `${entry.remainingDays} day${entry.remainingDays === 1 ? '' : 's'} left • ${formatHours(entry.hoursPerDay || 0)}/day`;
    card.appendChild(note);

    if (entry.bonus) {
      const bonus = document.createElement('p');
      bonus.className = 'bankapp-card__note bankapp-card__note--muted';
      bonus.textContent = entry.bonus;
      card.appendChild(bonus);
    }

    const status = document.createElement('p');
    status.className = 'bankapp-card__status';
    status.textContent = entry.studiedToday ? 'Today’s study scheduled' : 'Waiting for today’s study slot';
    card.appendChild(status);

    grid.appendChild(card);
  });

  body.appendChild(grid);
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
