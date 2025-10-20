import { getElement } from '../elements/registry.js';

const state = {
  storage: null,
  document: typeof document !== 'undefined' ? document : null,
  now: () => Date.now(),
  onCreateSession: null,
  onActivateSession: null,
  onDeleteSession: null,
  onRenameSession: null,
  onResetActiveSession: null,
  onSaveSession: null,
  onExportSession: null,
  onImportSession: null,
  isOpen: false,
  listenersBound: false,
  isProcessing: false,
  alert: message =>
    typeof window !== 'undefined' && typeof window.alert === 'function'
      ? window.alert(message)
      : null
};

function getElements() {
  const entry = getElement('sessionSwitcher');
  if (!entry) {
    return {};
  }
  return entry;
}

function formatLastSaved(timestamp, now = state.now()) {
  if (!Number.isFinite(timestamp)) {
    return 'No saves yet — fresh start!';
  }
  const diff = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < 45_000) {
    return 'Saved just now';
  }
  if (diff < 90_000) {
    return 'Saved 1 minute ago';
  }
  if (diff < 45 * minute) {
    const minutes = Math.round(diff / minute);
    return `Saved ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < 36 * hour) {
    const hours = Math.round(diff / hour);
    return `Saved ${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diff < 14 * day) {
    const days = Math.round(diff / day);
    return `Saved ${days} day${days === 1 ? '' : 's'} ago`;
  }
  const date = new Date(timestamp);
  const nowDate = new Date(now);
  const options = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== nowDate.getFullYear()) {
    options.year = 'numeric';
  }
  return `Saved ${date.toLocaleDateString(undefined, options)}`;
}

function normalizeSessions() {
  if (!state.storage) {
    return { active: null, sessions: [] };
  }

  const rawSessions = Array.isArray(state.storage.listSessions?.())
    ? state.storage.listSessions()
    : [];
  const active = state.storage.getActiveSession?.() ?? null;
  const now = state.now();

  const sessions = rawSessions
    .map(session => ({
      id: session.id,
      name: session.name || 'Unnamed Session',
      lastSaved: Number.isFinite(session.lastSaved) ? Number(session.lastSaved) : null,
      isActive: Boolean(active && active.id === session.id)
    }))
    .sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      const aTime = a.lastSaved ?? 0;
      const bTime = b.lastSaved ?? 0;
      return bTime - aTime;
    })
    .map(entry => ({
      ...entry,
      meta: formatLastSaved(entry.lastSaved, now)
    }));

  const activeEntry = active
    ? {
        id: active.id,
        name: active.name || 'Unnamed Session',
        lastSaved: Number.isFinite(active.lastSaved) ? Number(active.lastSaved) : null,
        meta: formatLastSaved(active.lastSaved, now)
      }
    : null;

  return { active: activeEntry, sessions };
}

function getUrlApi() {
  const view = state.document?.defaultView;
  if (view?.URL) {
    return view.URL;
  }
  if (typeof URL !== 'undefined') {
    return URL;
  }
  return null;
}

function sanitizeFilenamePart(value) {
  if (!value || typeof value !== 'string') {
    return 'session';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 'session';
  }
  return trimmed.replace(/[^a-z0-9-]+/gi, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'session';
}

function buildExportFilename(name, timestamp = state.now()) {
  const safeName = sanitizeFilenamePart(name);
  const date = new Date(timestamp);
  const isoStamp = Number.isFinite(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(
        date.getMinutes()
      ).padStart(2, '0')}`
    : 'export';
  return `${safeName}-${isoStamp}.json`;
}

function showAlert(message) {
  if (!message) return;
  const alertFn = state.alert;
  if (typeof alertFn === 'function') {
    try {
      alertFn(message);
    } catch (error) {
      console?.error?.('Failed to display alert message', error);
    }
  }
}

async function maybeAwait(result) {
  if (result && typeof result.then === 'function') {
    return result;
  }
  return null;
}

function downloadSessionPayload(payload, sessionName) {
  if (!payload) return;
  const doc = state.document;
  const urlApi = getUrlApi();
  if (!doc?.createElement || !doc.body || !urlApi?.createObjectURL) {
    showAlert('Download is unavailable in this environment.');
    return;
  }
  let serialized = null;
  try {
    serialized = JSON.stringify(payload, null, 2);
  } catch (error) {
    console?.error?.('Failed to serialize session export', error);
    showAlert('Could not prepare that export. Please try again.');
    return;
  }
  const blob = new Blob([serialized], { type: 'application/json' });
  const href = urlApi.createObjectURL(blob);
  const link = doc.createElement('a');
  if (!link) {
    urlApi.revokeObjectURL?.(href);
    showAlert('Download is unavailable right now.');
    return;
  }
  link.href = href;
  link.download = buildExportFilename(sessionName, state.now());
  link.dataset.sessionDownload = 'true';
  doc.body.appendChild(link);
  link.click();
  link.remove();
  urlApi.revokeObjectURL?.(href);
}

function renderSummary(model) {
  const elements = getElements();
  const { nameLabel, timestampLabel, container, summaryButton } = {
    nameLabel: elements?.name,
    timestampLabel: elements?.timestamp,
    container: elements?.container,
    summaryButton: elements?.summaryButton
  };

  if (!nameLabel || !timestampLabel) {
    return;
  }

  const activeName = model?.active?.name || 'Unnamed Session';
  const activeMeta = model?.active?.meta || 'No saves yet — fresh start!';
  nameLabel.textContent = activeName;
  timestampLabel.textContent = activeMeta;

  if (container) {
    container.dataset.activeSessionId = model?.active?.id || '';
  }

  if (summaryButton) {
    summaryButton.setAttribute('aria-label', `Active session: ${activeName}. ${activeMeta}. Toggle session menu.`);
  }
}

function createActionButton({ label, variant, action, sessionId, disabled = false }) {
  const button = state.document?.createElement?.('button');
  if (!button) return null;
  button.type = 'button';
  button.className = 'browser-session-switcher__action';
  if (variant === 'danger') {
    button.dataset.variant = 'danger';
  }
  button.textContent = label;
  button.dataset.sessionAction = action;
  if (sessionId) {
    button.dataset.sessionId = sessionId;
  }
  if (disabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }
  return button;
}

function renderList(model) {
  const elements = getElements();
  const list = elements?.list;
  const empty = elements?.empty;
  if (!list) return;

  list.replaceChildren();
  const sessions = model?.sessions || [];

  if (empty) {
    empty.hidden = sessions.length > 1;
  }

  sessions.forEach(entry => {
    const item = state.document?.createElement?.('li');
    if (!item) return;
    item.className = 'browser-session-switcher__item';
    item.dataset.sessionId = entry.id || '';
    if (entry.isActive) {
      item.classList.add('is-active');
    }

    const select = state.document?.createElement?.('button');
    if (select) {
      select.type = 'button';
      select.className = 'browser-session-switcher__select';
      select.dataset.sessionAction = 'activate';
      select.dataset.sessionId = entry.id || '';
      select.disabled = entry.isActive;
      if (entry.isActive) {
        select.setAttribute('aria-current', 'true');
      }

      const name = state.document.createElement('span');
      name.className = 'browser-session-switcher__name';
      name.textContent = entry.name;

      const meta = state.document.createElement('span');
      meta.className = 'browser-session-switcher__meta';
      meta.textContent = entry.isActive ? `Active slot • ${entry.meta}` : entry.meta;

      select.append(name, meta);
      item.appendChild(select);
    }

    const actions = state.document?.createElement?.('div');
    if (actions) {
      actions.className = 'browser-session-switcher__item-actions';
      const renameButton = createActionButton({
        label: 'Rename',
        action: 'rename',
        sessionId: entry.id
      });
      const deleteButton = createActionButton({
        label: 'Delete',
        action: 'delete',
        sessionId: entry.id,
        variant: 'danger',
        disabled: sessions.length <= 1
      });
      if (renameButton) actions.appendChild(renameButton);
      if (deleteButton) actions.appendChild(deleteButton);
      item.appendChild(actions);
    }

    list.appendChild(item);
  });
}

function render(model = normalizeSessions()) {
  renderSummary(model);
  if (state.isOpen) {
    renderList(model);
  }
}

function closePanel({ focusSummary = false } = {}) {
  const elements = getElements();
  const panel = elements?.panel;
  const container = elements?.container;
  const summary = elements?.summaryButton;
  if (!panel || !container) {
    state.isOpen = false;
    return;
  }
  panel.hidden = true;
  container.classList.remove('is-open');
  if (summary) {
    summary.setAttribute('aria-expanded', 'false');
    if (focusSummary) {
      summary.focus?.();
    }
  }
  state.isOpen = false;
}

function openPanel() {
  const elements = getElements();
  const panel = elements?.panel;
  const container = elements?.container;
  const summary = elements?.summaryButton;
  if (!panel || !container) {
    return;
  }
  const model = normalizeSessions();
  renderList(model);
  panel.hidden = false;
  container.classList.add('is-open');
  if (summary) {
    summary.setAttribute('aria-expanded', 'true');
  }
  state.isOpen = true;
}

function togglePanel() {
  if (state.isOpen) {
    closePanel({ focusSummary: false });
  } else {
    openPanel();
  }
}

function handleSummaryClick(event) {
  event.preventDefault();
  togglePanel();
}

function handleDocumentClick(event) {
  if (!state.isOpen) return;
  const elements = getElements();
  const container = elements?.container;
  if (!container) return;
  if (!container.contains(event.target)) {
    closePanel();
  }
}

function handleDocumentKeydown(event) {
  if (!state.isOpen) return;
  if (event.key === 'Escape') {
    closePanel({ focusSummary: true });
  }
}

function runAction(fn, { closeAfter = false } = {}) {
  if (typeof fn !== 'function' || state.isProcessing) {
    return;
  }
  state.isProcessing = true;
  let result;
  try {
    result = fn();
  } catch (error) {
    console?.error?.('Failed to run session action', error);
    state.isProcessing = false;
    return;
  }

  if (result && typeof result.then === 'function') {
    result
      .then(() => {
        if (closeAfter) {
          closePanel({ focusSummary: true });
        }
        render();
      })
      .catch(error => {
        console?.error?.('Failed to complete session action', error);
      })
      .finally(() => {
        state.isProcessing = false;
      });
    return;
  }

  if (closeAfter) {
    closePanel({ focusSummary: true });
  }
  render();
  state.isProcessing = false;
}

function promptForName(defaultValue) {
  const message = 'Name this session so you can spot it quickly later:';
  const name = window.prompt?.(message, defaultValue);
  if (!name) {
    return null;
  }
  return name.trim();
}

function confirmDelete(name) {
  const prompt = `Delete "${name}"? This permanently clears that save slot.`;
  return window.confirm ? window.confirm(prompt) : true;
}

function confirmReset(name) {
  const prompt = `Reset "${name}" for a fresh run? All progress in this slot will be cleared.`;
  return window.confirm ? window.confirm(prompt) : true;
}

function handleCreateSession() {
  const model = normalizeSessions();
  const defaultName = model.sessions.length ? 'New Session' : model.active?.name || 'Main Hustle';
  const name = promptForName(defaultName);
  if (!name) {
    return;
  }
  runAction(() => state.onCreateSession?.({ name }), { closeAfter: true });
}

function handleResetSession() {
  const model = normalizeSessions();
  const activeName = model.active?.name || 'Current Session';
  if (!confirmReset(activeName)) {
    return;
  }
  runAction(() => state.onResetActiveSession?.(), { closeAfter: true });
}

async function exportSessionPayload(activeSession) {
  if (!activeSession) {
    showAlert('Save a session before exporting so we have something to share.');
    return null;
  }

  if (typeof state.onSaveSession === 'function') {
    try {
      await maybeAwait(state.onSaveSession());
    } catch (error) {
      console?.error?.('Failed to save session prior to export', error);
    }
  }

  if (typeof state.onExportSession !== 'function') {
    showAlert('Exports are unavailable right now.');
    return null;
  }

  let payload = null;
  try {
    payload = await state.onExportSession({ id: activeSession.id });
  } catch (error) {
    console?.error?.('Failed to export session', error);
    showAlert('Export stumbled. Give it another shot in a moment.');
    throw error;
  }

  if (!payload) {
    showAlert('No save data found yet. Try saving once and retry.');
    return null;
  }

  downloadSessionPayload(payload, activeSession.name);
  return payload;
}

async function readImportFile(file) {
  if (!file) {
    showAlert('Pick a save file to import first.');
    return null;
  }

  if (typeof file.text !== 'function') {
    showAlert('This browser cannot read that file.');
    return null;
  }

  let contents = '';
  try {
    contents = await file.text();
  } catch (error) {
    console?.error?.('Failed to read import file', error);
    showAlert('We couldn’t read that file. Please try again.');
    return null;
  }

  if (!contents) {
    showAlert('That file looked empty. Double-check and try again.');
    return null;
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    console?.error?.('Failed to parse import file', error);
    showAlert('That file didn’t look like a Hustle save.');
    return null;
  }
}

async function importSessionPayload(payload) {
  if (!payload) {
    return null;
  }

  if (typeof state.onImportSession !== 'function') {
    showAlert('Imports are unavailable right now.');
    return null;
  }

  try {
    return await state.onImportSession({ data: payload, source: 'file' });
  } catch (error) {
    console?.error?.('Failed to import session payload', error);
    showAlert('Import stumbled. Double-check the file and try again.');
    throw error;
  }
}

function handleRenameSession(sessionId) {
  if (!sessionId) return;
  const model = normalizeSessions();
  const target = model.sessions.find(entry => entry.id === sessionId);
  const currentName = target?.name || 'Session';
  const name = promptForName(currentName);
  if (!name || name === currentName) {
    return;
  }
  runAction(() => state.onRenameSession?.({ id: sessionId, name }));
}

function handleDeleteSession(sessionId) {
  if (!sessionId) return;
  const model = normalizeSessions();
  const target = model.sessions.find(entry => entry.id === sessionId);
  const name = target?.name || 'that session';
  if (!confirmDelete(name)) {
    return;
  }
  runAction(() => state.onDeleteSession?.({ id: sessionId }), { closeAfter: true });
}

function handleActivateSession(sessionId) {
  if (!sessionId) return;
  const model = normalizeSessions();
  const target = model.sessions.find(entry => entry.id === sessionId);
  if (!target || target.isActive) {
    return;
  }
  if (typeof state.onSaveSession === 'function') {
    try {
      state.onSaveSession();
    } catch (error) {
      console?.error?.('Failed to save active session before switching', error);
    }
  }
  runAction(() => state.onActivateSession?.({ id: sessionId }), { closeAfter: true });
}

function handleExportSessionClick(event) {
  event.preventDefault();
  const model = normalizeSessions();
  runAction(() => exportSessionPayload(model.active));
}

async function handleImportInputChange(event) {
  const input = event.currentTarget;
  const fileList = input?.files;
  const file = fileList && fileList.length ? fileList[0] : null;
  const payload = await readImportFile(file);
  if (input) {
    input.value = '';
  }
  if (!payload) {
    return;
  }
  runAction(() => importSessionPayload(payload), { closeAfter: true });
}

function handleImportButtonClick(event) {
  event.preventDefault();
  const elements = getElements();
  const input = elements?.importInput;
  input?.click?.();
}

function handlePanelClick(event) {
  const actionTarget = event.target.closest?.('[data-session-action]');
  if (!actionTarget) {
    return;
  }
  const action = actionTarget.dataset.sessionAction;
  const sessionId = actionTarget.dataset.sessionId || '';
  event.preventDefault();
  switch (action) {
    case 'activate':
      handleActivateSession(sessionId);
      break;
    case 'rename':
      handleRenameSession(sessionId);
      break;
    case 'delete':
      handleDeleteSession(sessionId);
      break;
    default:
      break;
  }
}

function bindElementListeners() {
  const elements = getElements();
  const summary = elements?.summaryButton;
  const panel = elements?.panel;
  const createButton = elements?.createButton;
  const resetButton = elements?.resetButton;
  const closeButton = elements?.closeButton;
  const exportButton = elements?.exportButton;
  const importButton = elements?.importButton;
  const importInput = elements?.importInput;

  if (summary && summary.dataset.sessionSwitcherBound !== 'true') {
    summary.addEventListener('click', handleSummaryClick);
    summary.dataset.sessionSwitcherBound = 'true';
  }

  if (panel && panel.dataset.sessionSwitcherBound !== 'true') {
    panel.addEventListener('click', handlePanelClick);
    panel.dataset.sessionSwitcherBound = 'true';
  }

  if (createButton && createButton.dataset.sessionSwitcherBound !== 'true') {
    createButton.addEventListener('click', event => {
      event.preventDefault();
      handleCreateSession();
    });
    createButton.dataset.sessionSwitcherBound = 'true';
  }

  if (resetButton && resetButton.dataset.sessionSwitcherBound !== 'true') {
    resetButton.addEventListener('click', event => {
      event.preventDefault();
      handleResetSession();
    });
    resetButton.dataset.sessionSwitcherBound = 'true';
  }

  if (closeButton && closeButton.dataset.sessionSwitcherBound !== 'true') {
    closeButton.addEventListener('click', event => {
      event.preventDefault();
      closePanel({ focusSummary: true });
    });
    closeButton.dataset.sessionSwitcherBound = 'true';
  }

  if (exportButton && exportButton.dataset.sessionSwitcherBound !== 'true') {
    exportButton.addEventListener('click', handleExportSessionClick);
    exportButton.dataset.sessionSwitcherBound = 'true';
  }

  if (importButton && importButton.dataset.sessionSwitcherBound !== 'true') {
    importButton.addEventListener('click', handleImportButtonClick);
    importButton.dataset.sessionSwitcherBound = 'true';
  }

  if (importInput && importInput.dataset.sessionSwitcherBound !== 'true') {
    importInput.addEventListener('change', handleImportInputChange);
    importInput.dataset.sessionSwitcherBound = 'true';
  }
}

function bindGlobalListeners() {
  if (state.listenersBound) {
    return;
  }
  const doc = state.document;
  if (!doc) {
    return;
  }
  doc.addEventListener('click', handleDocumentClick);
  doc.addEventListener('keydown', handleDocumentKeydown);
  state.listenersBound = true;
}

export function initSessionSwitcher({
  storage,
  document: rootDocument = typeof document !== 'undefined' ? document : null,
  now,
  onCreateSession,
  onActivateSession,
  onDeleteSession,
  onRenameSession,
  onResetActiveSession,
  onSaveSession,
  onExportSession,
  onImportSession,
  alert
} = {}) {
  state.storage = storage ?? null;
  state.document = rootDocument ?? state.document;
  state.now = typeof now === 'function' ? now : state.now;
  state.onCreateSession = typeof onCreateSession === 'function' ? onCreateSession : null;
  state.onActivateSession = typeof onActivateSession === 'function' ? onActivateSession : null;
  state.onDeleteSession = typeof onDeleteSession === 'function' ? onDeleteSession : null;
  state.onRenameSession = typeof onRenameSession === 'function' ? onRenameSession : null;
  state.onResetActiveSession = typeof onResetActiveSession === 'function' ? onResetActiveSession : null;
  state.onSaveSession = typeof onSaveSession === 'function' ? onSaveSession : null;
  state.onExportSession = typeof onExportSession === 'function' ? onExportSession : null;
  state.onImportSession = typeof onImportSession === 'function' ? onImportSession : null;
  state.alert = typeof alert === 'function' ? alert : state.alert;

  bindElementListeners();
  bindGlobalListeners();
  closePanel();
  render();

  return {
    render,
    close: closePanel
  };
}

export function refreshSessionSwitcher() {
  render();
}
