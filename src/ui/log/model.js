const TIME_FORMAT_OPTIONS = {
  hour: '2-digit',
  minute: '2-digit'
};

function formatLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const timestamp = Number(entry.timestamp);
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : null;

  return {
    id: entry.id ?? null,
    type: entry.type || 'info',
    message: String(entry.message ?? ''),
    timestamp: timestamp,
    timeLabel: date ? date.toLocaleTimeString([], TIME_FORMAT_OPTIONS) : ''
  };
}

export function buildLogModel(state) {
  const logEntries = Array.isArray(state?.log) ? state.log : [];

  const entries = logEntries
    .slice()
    .sort((a, b) => {
      const aTime = Number(a?.timestamp) || 0;
      const bTime = Number(b?.timestamp) || 0;
      return bTime - aTime;
    })
    .map(formatLogEntry)
    .filter(Boolean);

  return {
    entries,
    isEmpty: entries.length === 0
  };
}

export default buildLogModel;
