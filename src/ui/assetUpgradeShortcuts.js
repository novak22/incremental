import { formatHours } from '../core/helpers.js';
import { getUpgradeButtonLabel, isUpgradeDisabled } from './assetUpgrades.js';

function defaultFormatTimeEstimate(hours) {
  return formatHours(hours);
}

function resolveTimeEstimate({ includeTimeEstimate, getTimeEstimate, upgrade }) {
  if (!includeTimeEstimate || typeof getTimeEstimate !== 'function') {
    return 0;
  }

  const raw = Number(getTimeEstimate(upgrade));
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  return raw;
}

export function createAssetUpgradeShortcuts(upgrades = [], options = {}) {
  if (!Array.isArray(upgrades) || upgrades.length === 0) {
    return null;
  }

  const {
    limit = 2,
    containerClass = '',
    titleClass = '',
    buttonRowClass = '',
    buttonClass = '',
    moreClass = '',
    singularTitle = 'Upgrade',
    pluralTitle = 'Upgrades',
    titleFormatter,
    includeTimeEstimate = false,
    getTimeEstimate,
    formatTimeEstimate = defaultFormatTimeEstimate,
    buttonLabelFormatter,
    tooltipFormatter,
    moreLabel = count => `+${count} more`
  } = options;

  const resolvedLimit = Math.min(limit, upgrades.length);
  if (resolvedLimit <= 0) {
    return null;
  }

  const container = document.createElement('div');
  if (containerClass) {
    container.className = containerClass;
  }

  const titleText = typeof titleFormatter === 'function'
    ? titleFormatter(upgrades.length)
    : upgrades.length > 1
      ? pluralTitle
      : singularTitle;

  if (titleText) {
    const title = document.createElement('span');
    if (titleClass) {
      title.className = titleClass;
    }
    title.textContent = titleText;
    container.appendChild(title);
  }

  const buttonRow = document.createElement('div');
  if (buttonRowClass) {
    buttonRow.className = buttonRowClass;
  }
  container.appendChild(buttonRow);

  for (let index = 0; index < resolvedLimit; index += 1) {
    const upgrade = upgrades[index];
    if (!upgrade) continue;

    const button = document.createElement('button');
    button.type = 'button';
    if (buttonClass) {
      button.className = buttonClass;
    }
    if (upgrade.id) {
      button.dataset.upgradeId = upgrade.id;
    }

    const baseLabel = getUpgradeButtonLabel(upgrade);
    const hours = resolveTimeEstimate({
      includeTimeEstimate,
      getTimeEstimate,
      upgrade
    });
    const timeLabel = hours > 0 ? formatTimeEstimate(hours) : '';

    const label = typeof buttonLabelFormatter === 'function'
      ? buttonLabelFormatter({ upgrade, baseLabel, hours, timeLabel })
      : timeLabel
        ? `${baseLabel} (${timeLabel})`
        : baseLabel;
    button.textContent = label;

    button.disabled = isUpgradeDisabled(upgrade);

    const baseDescription = upgrade.description || '';
    const tooltip = typeof tooltipFormatter === 'function'
      ? tooltipFormatter({ upgrade, baseDescription, hours, timeLabel })
      : baseDescription
        ? timeLabel
          ? `${baseDescription} • ≈${timeLabel} install`
          : baseDescription
        : '';
    if (tooltip) {
      button.title = tooltip;
    }

    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.disabled) return;
      upgrade.action?.onClick?.();
    });

    buttonRow.appendChild(button);
  }

  const remaining = upgrades.length - resolvedLimit;
  if (remaining > 0) {
    const more = document.createElement('span');
    if (moreClass) {
      more.className = moreClass;
    }
    const text = typeof moreLabel === 'function' ? moreLabel(remaining) : moreLabel;
    more.textContent = text;
    container.appendChild(more);
  }

  return container;
}

