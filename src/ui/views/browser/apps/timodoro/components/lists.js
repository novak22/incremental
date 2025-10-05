import { appendContent } from '../../../components/common/domHelpers.js';

function createEmptyItem(className, message) {
  const empty = document.createElement('li');
  empty.className = className;
  appendContent(empty, message);
  return empty;
}

function createList({
  className,
  datasetRole,
  entries = [],
  emptyMessage,
  emptyClassName,
  buildItem
}) {
  const list = document.createElement('ul');
  list.className = className;
  if (datasetRole) {
    list.dataset.role = datasetRole;
  }

  const items = Array.isArray(entries) ? entries : [];
  if (items.length === 0) {
    if (emptyMessage) {
      list.appendChild(createEmptyItem(emptyClassName, emptyMessage));
    }
    return list;
  }

  if (typeof buildItem === 'function') {
    items.forEach(entry => {
      if (!entry) {
        return;
      }
      const item = buildItem(entry);
      if (item) {
        list.appendChild(item);
      }
    });
  }

  return list;
}

function createTaskList(entries = [], emptyText, datasetRole) {
  return createList({
    className: 'timodoro-list timodoro-list--tasks',
    datasetRole,
    entries,
    emptyMessage: emptyText,
    emptyClassName: 'timodoro-list__empty',
    buildItem: entry => {
      const item = document.createElement('li');
      item.className = 'timodoro-list__item';

      const name = document.createElement('span');
      name.className = 'timodoro-list__name';
      appendContent(name, entry.name ?? '');

      const meta = document.createElement('span');
      meta.className = 'timodoro-list__meta';
      appendContent(meta, entry.detail ?? '');

      item.append(name, meta);
      return item;
    }
  });
}

function createBreakdownList(entries = []) {
  return createList({
    className: 'timodoro-list timodoro-list--breakdown',
    datasetRole: 'timodoro-breakdown',
    entries,
    emptyMessage: 'No hours tracked yet.',
    emptyClassName: 'timodoro-breakdown__empty',
    buildItem: entry => {
      const item = document.createElement('li');
      item.className = 'timodoro-breakdown__item';

      const label = document.createElement('span');
      label.className = 'timodoro-breakdown__label';
      appendContent(label, entry.label ?? '');

      const value = document.createElement('span');
      value.className = 'timodoro-breakdown__value';
      appendContent(value, entry.value ?? '');

      item.append(label, value);
      return item;
    }
  });
}

function createSummaryList(entries = []) {
  return createList({
    className: 'timodoro-list timodoro-list--stats',
    datasetRole: 'timodoro-stats',
    entries,
    buildItem: entry => {
      const item = document.createElement('li');
      item.className = 'timodoro-stats__item';

      const label = document.createElement('span');
      label.className = 'timodoro-stats__label';
      appendContent(label, entry.label ?? '');

      const value = document.createElement('span');
      value.className = 'timodoro-stats__value';
      appendContent(value, entry.value ?? '');

      item.append(label, value);

      if (entry.note) {
        const note = document.createElement('span');
        note.className = 'timodoro-stats__note';
        appendContent(note, entry.note);
        item.appendChild(note);
      }

      return item;
    }
  });
}

export {
  createBreakdownList,
  createEmptyItem,
  createList,
  createSummaryList,
  createTaskList
};
