import { formatHours, formatMoney } from '../core/helpers.js';
import { getState } from '../core/state.js';
import { listCatalog } from '../game/content/catalog.js';
import { getElement } from './elements/registry.js';

let debugEnabled = false;

function shouldEnableDebugPanel() {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('debugActions') === '1') {
      window.localStorage.setItem('debugActions', 'true');
      return true;
    }
    if (url.hash.includes('debug-actions')) {
      return true;
    }
    return window.localStorage.getItem('debugActions') === 'true';
  } catch (error) {
    return false;
  }
}

function persistDebugFlag(value) {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem('debugActions', 'true');
    } else {
      window.localStorage.removeItem('debugActions');
    }
  } catch (error) {
    // ignore storage errors
  }
}

function renderRequirementSummary(requirements = []) {
  if (!requirements.length) return 'None';
  return requirements
    .map(req => {
      const status = req.met === false ? '⚠️' : '✅';
      const label = req.label || req.type || 'Requirement';
      return `${status} ${label}`;
    })
    .join(' • ');
}

function renderActionRows(table, entries) {
  const header = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Source', 'Action', 'Category', 'Time', 'Cost', 'Available', 'Requirements'].forEach(text => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    headerRow.appendChild(th);
  });
  header.appendChild(headerRow);

  const body = document.createElement('tbody');
  entries.forEach(entry => {
    const row = document.createElement('tr');
    row.dataset.available = entry.available ? 'true' : 'false';
    row.classList.toggle('is-available', entry.available);

    const sourceCell = document.createElement('td');
    sourceCell.textContent = `${entry.sourceName}`;
    sourceCell.title = `${entry.sourceType}:${entry.sourceId}`;

    const actionCell = document.createElement('td');
    actionCell.textContent = entry.label;
    actionCell.title = entry.actionId;

    const categoryCell = document.createElement('td');
    categoryCell.textContent = entry.category;

    const timeCell = document.createElement('td');
    timeCell.textContent = entry.timeCost ? formatHours(entry.timeCost) : '—';
    timeCell.className = entry.timeSatisfied ? '' : 'is-missing';

    const costCell = document.createElement('td');
    costCell.textContent = entry.moneyCost ? `$${formatMoney(entry.moneyCost)}` : '—';
    costCell.className = entry.moneySatisfied ? '' : 'is-missing';

    const availableCell = document.createElement('td');
    availableCell.textContent = entry.available ? 'Yes' : 'No';

    const requirementCell = document.createElement('td');
    requirementCell.textContent = renderRequirementSummary(entry.requirements);
    if (entry.requirements.some(req => req.met === false)) {
      requirementCell.classList.add('is-missing');
    }

    [
      sourceCell,
      actionCell,
      categoryCell,
      timeCell,
      costCell,
      availableCell,
      requirementCell
    ].forEach(cell => row.appendChild(cell));

    body.appendChild(row);
  });

  table.appendChild(header);
  table.appendChild(body);
}

function renderDebugCatalog() {
  const { debugActionCatalogList: table, debugActionCatalogSummary: summary } =
    getElement('debugCatalog') || {};
  if (!table) return;
  table.textContent = '';
  const state = getState();
  const entries = listCatalog(state).sort((a, b) => {
    if (a.sourceType === b.sourceType) {
      if (a.sourceName === b.sourceName) {
        return a.label.localeCompare(b.label);
      }
      return a.sourceName.localeCompare(b.sourceName);
    }
    return a.sourceType.localeCompare(b.sourceType);
  });

  if (summary) {
    const availableCount = entries.filter(entry => entry.available).length;
    summary.textContent = `${availableCount} of ${entries.length} actions currently available`;
  }

  renderActionRows(table, entries);
}

function enableDebugPanel() {
  const { debugActionCatalog: panel } = getElement('debugCatalog') || {};
  if (!panel) return;
  debugEnabled = true;
  persistDebugFlag(true);
  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
  renderDebugCatalog();
}

function disableDebugPanel() {
  const {
    debugActionCatalog: panel,
    debugActionCatalogList: table,
    debugActionCatalogSummary: summary
  } = getElement('debugCatalog') || {};
  if (!panel) return;
  debugEnabled = false;
  persistDebugFlag(false);
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  if (table) {
    table.textContent = '';
  }
  if (summary) {
    summary.textContent = '';
  }
}

export function initActionCatalogDebug() {
  if (typeof window !== 'undefined') {
    window.debugActions = {
      enable: enableDebugPanel,
      disable: disableDebugPanel,
      refresh: renderDebugCatalog
    };
  }

  if (shouldEnableDebugPanel()) {
    enableDebugPanel();
  }
}

export function refreshActionCatalogDebug() {
  if (!debugEnabled) return;
  renderDebugCatalog();
}
