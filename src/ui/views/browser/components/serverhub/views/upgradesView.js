import { ensureArray } from '../../../../../../core/helpers.js';

function describeUpgradeEffects(effects = {}, affects = {}) {
  const parts = [];
  Object.entries(effects).forEach(([effect, value]) => {
    if (!Number.isFinite(Number(value))) return;
    const percent = Math.round((Number(value) - 1) * 100);
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
  if (!parts.length) return '';
  const scope = [];
  const ids = ensureArray(affects.assets?.ids);
  if (ids.length) scope.push(`Apps: ${ids.join(', ')}`);
  const tags = ensureArray(affects.assets?.tags);
  if (tags.length) scope.push(`Tags: ${tags.join(', ')}`);
  return scope.length ? `${parts.join(' • ')} → ${scope.join(' & ')}` : parts.join(' • ');
}

export function createUpgradesView({ formatCurrency }) {
  return function renderUpgradesView({ model = {} }) {
    const container = document.createElement('section');
    container.className = 'serverhub-view serverhub-view--upgrades';
    const intro = document.createElement('div');
    intro.className = 'serverhub-upgrades__intro';
    intro.innerHTML = '<h2>Infrastructure boosts</h2><p>Purchase upgrades to unlock faster deployments, happier customers, and higher SaaS payouts.</p>';
    container.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'serverhub-upgrades';
    const upgrades = ensureArray(model.upgrades);
    if (!upgrades.length) {
      const empty = document.createElement('p');
      empty.className = 'serverhub-empty';
      empty.textContent = 'No infrastructure upgrades unlocked yet. Progress your SaaS ladder to reveal new boosts.';
      grid.appendChild(empty);
    } else {
      upgrades.forEach(upgrade => {
        const card = document.createElement('article');
        card.className = 'serverhub-upgrade';
        card.dataset.status = upgrade.snapshot?.purchased
          ? 'owned'
          : upgrade.snapshot?.ready
          ? 'ready'
          : 'locked';

        const header = document.createElement('header');
        header.className = 'serverhub-upgrade__header';
        const title = document.createElement('h3');
        title.textContent = upgrade.name;
        header.appendChild(title);
        if (upgrade.tag?.label) {
          const badge = document.createElement('span');
          badge.className = 'serverhub-upgrade__badge';
          badge.textContent = upgrade.tag.label;
          header.appendChild(badge);
        }

        const description = document.createElement('p');
        description.className = 'serverhub-upgrade__summary';
        description.textContent = upgrade.description || 'Infrastructure boost';

        const price = document.createElement('p');
        price.className = 'serverhub-upgrade__price';
        price.textContent = formatCurrency(upgrade.cost || 0);

        const effect = document.createElement('p');
        effect.className = 'serverhub-upgrade__note';
        effect.textContent = describeUpgradeEffects(upgrade.effects, upgrade.affects)
          || 'Stacks with SaaS payouts and progress.';

        const status = document.createElement('p');
        status.className = 'serverhub-upgrade__status';
        status.textContent = upgrade.status || 'Progress toward unlock requirements.';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'serverhub-button serverhub-button--primary';
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

        card.append(header, description, price, effect, status, button);
        grid.appendChild(card);
      });
    }

    container.appendChild(grid);
    return container;
  };
}
