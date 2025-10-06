const MAX_AUDIT_ENTRIES = 30;
const MARKET_ROLL_AUDIT = [];

function cloneTemplateAuditEntries(entries = []) {
  return entries.map(entry => ({
    templateId: entry.templateId,
    slotsRequested: entry.slotsRequested,
    existingActive: entry.existingActive,
    added: entry.added,
    skipped: entry.skipped,
    reason: entry.reason
  }));
}

function recordMarketRollAudit({ day, timestamp, preserved, created, templates }) {
  const templateSummaries = cloneTemplateAuditEntries(templates);
  const entry = {
    day,
    timestamp,
    preservedOffers: preserved,
    createdOffers: created,
    totalOffers: preserved + created,
    templates: templateSummaries,
    skippedTemplates: templateSummaries.filter(item => item.skipped).map(item => item.templateId)
  };

  MARKET_ROLL_AUDIT.push(entry);
  if (MARKET_ROLL_AUDIT.length > MAX_AUDIT_ENTRIES) {
    MARKET_ROLL_AUDIT.shift();
  }

  if (typeof globalThis !== 'undefined') {
    const globalLog = globalThis.__HUSTLE_MARKET_AUDIT__ = globalThis.__HUSTLE_MARKET_AUDIT__ || [];
    globalLog.push(entry);
    if (globalLog.length > MAX_AUDIT_ENTRIES) {
      globalLog.shift();
    }
  }

  if (typeof process === 'undefined' && typeof window !== 'undefined' && typeof console !== 'undefined') {
    const label = `[HustleMarket] Day ${day} roll → ${created} new / ${preserved} preserved`;
    if (typeof console.groupCollapsed === 'function' && typeof console.table === 'function') {
      console.groupCollapsed(label);
      console.table(templateSummaries.map(summary => ({
        template: summary.templateId,
        requested: summary.slotsRequested,
        existing: summary.existingActive,
        added: summary.added,
        skipped: summary.skipped,
        reason: summary.reason || ''
      })));
      console.groupEnd();
    } else if (typeof console.info === 'function') {
      console.info(label);
    }
  }
}

function getMarketRollAuditLog() {
  return MARKET_ROLL_AUDIT.map(entry => ({
    ...entry,
    templates: cloneTemplateAuditEntries(entry.templates),
    skippedTemplates: [...entry.skippedTemplates]
  }));
}

function attachAuditDebugTools({ getState, getMarketAvailableOffers }) {
  if (typeof globalThis === 'undefined') {
    return;
  }

  const namespace = globalThis.__HUSTLE_MARKET_DEBUG__ = globalThis.__HUSTLE_MARKET_DEBUG__ || {};
  namespace.getAuditLog = () => getMarketRollAuditLog();
  namespace.printAuditLog = () => {
    const audit = getMarketRollAuditLog();
    if (typeof console !== 'undefined') {
      if (typeof console.table === 'function') {
        console.table(audit.map(entry => ({
          day: entry.day,
          created: entry.createdOffers,
          preserved: entry.preservedOffers,
          skipped: entry.skippedTemplates.join(', ')
        })));
      } else if (typeof console.log === 'function') {
        console.log(audit);
      }
    }
    return audit;
  };
  namespace.printOffers = () => {
    const state = typeof getState === 'function' ? getState() : null;
    const day = state?.day || 1;
    const offers = typeof getMarketAvailableOffers === 'function'
      ? getMarketAvailableOffers(state, {
        day,
        includeUpcoming: true,
        includeClaimed: true
      })
      : [];
    if (typeof console !== 'undefined') {
      if (typeof console.table === 'function') {
        console.table(offers.map(offer => ({
          template: offer.templateId,
          variant: offer.variant?.label || offer.variantId,
          available: offer.availableOnDay,
          expires: offer.expiresOnDay,
          claimed: offer.claimed ? 'yes' : 'no',
          payout: offer.metadata?.payout?.amount ?? offer.metadata?.payoutAmount ?? null
        })));
      } else if (typeof console.log === 'function') {
        console.log(offers);
      }
    }
    return offers;
  };
}

const auditLog = {
  attachAuditDebugTools,
  getMarketRollAuditLog,
  recordMarketRollAudit
};

export { attachAuditDebugTools, getMarketRollAuditLog, recordMarketRollAudit };

export default auditLog;
