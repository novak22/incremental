import { formatHours } from '../../../core/helpers.js';
import {
  formatDuration,
  formatPayoutSummary
} from '../utils.js';
import { resolveQueueCategory } from '../queue/buckets.js';
import buildProgressSnapshot from './progressSnapshots.js';

export function createOutstandingEntry({
  state,
  definition,
  instance,
  accepted,
  offer,
  order
}) {
  const progress = buildProgressSnapshot({ state, definition, instance, accepted, offer });
  if (!progress) {
    return null;
  }

  const remainingRuns = progress.hoursRemaining != null && progress.stepHours > 0
    ? Math.max(1, Math.ceil(progress.hoursRemaining / progress.stepHours))
    : (progress.hoursRemaining === 0 && progress.completion === 'manual' ? 1 : null);

  if (progress.hoursRemaining != null && progress.hoursRemaining <= 0 && progress.completion !== 'manual') {
    return null;
  }

  const variantLabel = offer?.variant?.label || progress.metadata?.variantLabel || '';
  const baseName = instance?.name || definition?.name || definition?.id || 'Accepted hustle';
  const title = variantLabel ? `${variantLabel}` : baseName;
  const description = offer?.variant?.description || progress.metadata?.description || '';

  const metaParts = [];
  if (Number.isFinite(progress.percentComplete)) {
    const percent = Math.round(progress.percentComplete * 100);
    metaParts.push(`${Math.max(0, Math.min(100, percent))}% logged`);
  }
  if (progress.hoursRemaining != null) {
    metaParts.push(`${formatHours(progress.hoursRemaining)} left`);
  }
  if (progress.remainingDays != null) {
    metaParts.push(`${progress.remainingDays} day${progress.remainingDays === 1 ? '' : 's'} remaining`);
  }
  if (Number.isFinite(progress.payoutAmount) && progress.payoutAmount > 0) {
    metaParts.push(formatPayoutSummary(progress.payoutAmount, progress.payoutSchedule));
  }
  if (!metaParts.length && progress.hoursRequired != null) {
    metaParts.push(`${formatHours(progress.hoursLogged)} logged of ${formatHours(progress.hoursRequired)}`);
  }

  const metaClass = progress.remainingDays != null && progress.remainingDays <= 1
    ? 'todo-widget__meta--warning'
    : progress.remainingDays != null && progress.remainingDays <= 3
      ? 'todo-widget__meta--alert'
      : undefined;

  const category = resolveQueueCategory(
    progress.metadata?.templateCategory,
    progress.metadata?.category,
    accepted?.metadata?.templateCategory,
    offer?.templateCategory,
    definition?.category
  );
  const focusCategory = category || 'commitment';

  return {
    id: `instance:${instance.id}`,
    title,
    subtitle: description,
    meta: metaParts.join(' • '),
    metaClass,
    durationHours: progress.stepHours,
    durationText: formatDuration(progress.stepHours),
    moneyCost: 0,
    payout: progress.payoutAmount || 0,
    payoutText: formatPayoutSummary(progress.payoutAmount, progress.payoutSchedule),
    repeatable: remainingRuns == null ? true : remainingRuns > 1,
    remainingRuns,
    focusCategory,
    focusBucket: 'commitment',
    orderIndex: order,
    progress,
    instanceId: instance.id,
    definitionId: progress.definitionId,
    offerId: progress.offerId,
    category: focusCategory,
    raw: {
      definition,
      instance,
      accepted,
      offer
    }
  };
}

export default createOutstandingEntry;
