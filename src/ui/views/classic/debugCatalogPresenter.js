import { getElement } from '../../elements/registry.js';

const COLUMN_HEADERS = ['Source', 'Action', 'Category', 'Time', 'Cost', 'Available', 'Requirements'];

function getNodes() {
  return getElement('debugCatalog') || {};
}

function createHeader() {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');
  COLUMN_HEADERS.forEach(label => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    row.appendChild(th);
  });
  thead.appendChild(row);
  return thead;
}

function createCell(text, { title, className } = {}) {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  if (title) {
    td.title = title;
  }
  if (className) {
    td.className = className;
  }
  return td;
}

function createRow(entry) {
  const row = document.createElement('tr');
  row.dataset.available = entry.available ? 'true' : 'false';
  row.classList.toggle('is-available', Boolean(entry.available));

  const timeClass = entry.timeSatisfied === false ? 'is-missing' : '';
  const moneyClass = entry.moneySatisfied === false ? 'is-missing' : '';
  const requirementClass = entry.requirementsSatisfied === false ? 'is-missing' : '';

  const cells = [
    createCell(entry.source, { title: entry.sourceTitle }),
    createCell(entry.action, { title: entry.actionTitle }),
    createCell(entry.category || '—'),
    createCell(entry.timeText || '—', { className: timeClass }),
    createCell(entry.moneyText || '—', { className: moneyClass }),
    createCell(entry.available ? 'Yes' : 'No'),
    createCell(entry.requirementSummary || 'None', { className: requirementClass })
  ];

  cells.forEach(cell => row.appendChild(cell));
  return row;
}

function renderTable(table, rows = []) {
  table.textContent = '';
  table.appendChild(createHeader());
  const tbody = document.createElement('tbody');
  rows.forEach(entry => {
    if (!entry) return;
    tbody.appendChild(createRow(entry));
  });
  table.appendChild(tbody);
}

function renderSummary(summaryNode, summary) {
  if (!summaryNode) return;
  summaryNode.textContent = summary?.label || '';
}

function show() {
  const { debugActionCatalog: panel } = getNodes();
  if (!panel) return;
  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
}

function hide() {
  const { debugActionCatalog: panel, debugActionCatalogList: table, debugActionCatalogSummary: summary } = getNodes();
  if (panel) {
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
  }
  if (table) {
    table.textContent = '';
  }
  if (summary) {
    summary.textContent = '';
  }
}

function render(viewModel = {}) {
  const { debugActionCatalogList: table, debugActionCatalogSummary: summary } = getNodes();
  if (!table) return;
  const rows = Array.isArray(viewModel.rows) ? viewModel.rows : [];
  renderTable(table, rows);
  renderSummary(summary, viewModel.summary);
}

export default {
  show,
  hide,
  render
};
