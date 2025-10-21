import { ensureArray } from '../../../../../../core/helpers.js';

function formatOverviewCounts(overview = {}) {
  const total = Number(overview.total) || 0;
  const ready = Number(overview.ready) || 0;
  const purchased = Number(overview.purchased) || 0;
  if (!total) {
    return 'No studio upgrades discovered yet.';
  }
  const parts = [`${total} total`];
  if (purchased > 0) {
    parts.push(`${purchased} owned`);
  }
  if (ready > 0) {
    parts.push(`${ready} ready`);
  }
  return parts.join(' • ');
}

function formatGroupCounts(group = {}) {
  const total = Number(group.total) || 0;
  const ready = Number(group.ready) || 0;
  const owned = Number(group.owned) || 0;
  if (!total) {
    return 'Unlock this station by progressing further.';
  }
  const parts = [`${total} item${total === 1 ? '' : 's'}`];
  if (ready > 0) {
    parts.push(`${ready} ready`);
  }
  if (owned > 0) {
    parts.push(`${owned} owned`);
  }
  return parts.join(' • ');
}

function describeEffect(upgrade = {}) {
  if (upgrade.boosts) {
    return upgrade.boosts;
  }
  const effects = upgrade.effects || {};
  const parts = [];
  Object.entries(effects).forEach(([effect, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 1) {
      return;
    }
    const percent = Math.round((numeric - 1) * 100);
    const formatted = `${percent >= 0 ? '+' : ''}${percent}%`;
    if (effect === 'payout_mult') {
      parts.push(`${formatted} payouts`);
    } else if (effect === 'quality_progress_mult') {
      parts.push(`${formatted} quality speed`);
    } else if (effect === 'maint_time_mult') {
      parts.push(`${formatted} upkeep time`);
    } else if (effect === 'setup_time_mult') {
      parts.push(`${formatted} setup time`);
    }
  });
  if (parts.length) {
    return parts.join(' • ');
  }
  return upgrade.description || 'Stacks with VideoTube payouts and progress.';
}

function resolveStatus(upgrade = {}) {
  if (upgrade.snapshot?.purchased) return 'owned';
  if (upgrade.snapshot?.ready) return 'ready';
  return 'locked';
}

function buildUpgradeCard(upgrade, formatCurrency) {
  const card = document.createElement('article');
  card.className = 'videotube-upgrade';
  card.dataset.status = resolveStatus(upgrade);

  const header = document.createElement('header');
  header.className = 'videotube-upgrade__header';

  const title = document.createElement('h3');
  title.className = 'videotube-upgrade__title';
  title.textContent = upgrade.name;
  header.appendChild(title);

  if (upgrade.tag?.label) {
    const badge = document.createElement('span');
    badge.className = 'videotube-upgrade__badge';
    badge.textContent = upgrade.tag.label;
    header.appendChild(badge);
  }

  const description = document.createElement('p');
  description.className = 'videotube-upgrade__description';
  description.textContent = upgrade.description || 'Studio boost';

  const effect = document.createElement('p');
  effect.className = 'videotube-upgrade__effect';
  effect.textContent = describeEffect(upgrade);

  const meta = document.createElement('div');
  meta.className = 'videotube-upgrade__meta';
  const price = document.createElement('span');
  price.className = 'videotube-upgrade__price';
  price.textContent = formatCurrency(upgrade.cost || 0);
  meta.appendChild(price);

  const status = document.createElement('p');
  status.className = 'videotube-upgrade__status';
  status.textContent = upgrade.status || 'Progress toward unlock requirements.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'videotube-button videotube-button--primary videotube-upgrade__button';
  if (upgrade.snapshot?.purchased) {
    button.textContent = 'Owned';
    button.disabled = true;
  } else if (upgrade.snapshot?.ready) {
    button.textContent = 'Install upgrade';
  } else if (upgrade.snapshot?.affordable === false) {
    button.textContent = 'Save up';
    button.disabled = true;
  } else {
    button.textContent = 'Locked';
    button.disabled = true;
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    upgrade.action?.onClick?.();
  });

  card.append(header, description, effect, meta, status, button);
  return card;
}

export function createUpgradesView({ formatCurrency = value => String(value ?? '') } = {}) {
  return function renderUpgradesView({ model = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--upgrades';

    const intro = document.createElement('article');
    intro.className = 'videotube-panel videotube-upgrades__intro';
    const title = document.createElement('h2');
    title.textContent = 'Studio upgrade catalog';
    const blurb = document.createElement('p');
    blurb.className = 'videotube-upgrades__summary';
    blurb.textContent = model.upgrades?.overview?.note
      || 'Unlock new gear to keep episodes bright, crisp, and bingeable.';
    const counts = document.createElement('p');
    counts.className = 'videotube-upgrades__meta';
    counts.textContent = formatOverviewCounts(model.upgrades?.overview);
    intro.append(title, blurb, counts);
    container.appendChild(intro);

    const groups = ensureArray(model.upgrades?.groups);
    if (!groups.length) {
      const empty = document.createElement('p');
      empty.className = 'videotube-empty';
      empty.textContent = 'No studio upgrades unlocked yet. Grow your channel and clear quests to reveal new boosts.';
      container.appendChild(empty);
      return container;
    }

    const grid = document.createElement('div');
    grid.className = 'videotube-upgrades__grid';
    groups.forEach(group => {
      const panel = document.createElement('article');
      panel.className = 'videotube-panel videotube-upgrades__group';

      const header = document.createElement('header');
      header.className = 'videotube-upgrades__group-header';
      if (group.icon) {
        const icon = document.createElement('span');
        icon.className = 'videotube-upgrades__icon';
        icon.textContent = group.icon;
        header.appendChild(icon);
      }
      const heading = document.createElement('div');
      heading.className = 'videotube-upgrades__heading';
      const name = document.createElement('h3');
      name.className = 'videotube-upgrades__title';
      name.textContent = group.title || 'Upgrade group';
      const note = document.createElement('p');
      note.className = 'videotube-upgrades__note';
      note.textContent = group.note || 'Gear that keeps creators in flow.';
      heading.append(name, note);
      header.appendChild(heading);

      const summary = document.createElement('p');
      summary.className = 'videotube-upgrades__summary';
      summary.textContent = formatGroupCounts(group);

      const list = document.createElement('div');
      list.className = 'videotube-upgrades__list';
      ensureArray(group.upgrades).forEach(upgrade => {
        list.appendChild(buildUpgradeCard(upgrade, formatCurrency));
      });

      panel.append(header, summary, list);
      grid.appendChild(panel);
    });

    container.appendChild(grid);
    return container;
  };
}

export default {
  createUpgradesView
};
