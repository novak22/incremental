import { formatHours } from '../../../../core/helpers.js';
import {
  formatCurrency as baseFormatCurrency,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../utils/formatting.js';

const AVATAR_GLYPHS = ['🌱', '🚀', '🌟', '🏆', '🪐', '💫'];

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

const formatCurrency = amount => baseFormatCurrency(amount, { precision: 'cent' });
const formatSignedCurrency = amount =>
  baseFormatSignedCurrency(amount, { precision: 'cent' });

function toTitleCase(value) {
  if (!value) return '';
  return value
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function deriveAvatarGlyph(summary = {}) {
  const level = Math.max(1, Number(summary.level) || 1);
  const index = Math.min(AVATAR_GLYPHS.length - 1, Math.floor((level - 1) / 2));
  return AVATAR_GLYPHS[index];
}

function createSnapshotStat(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'yournetwork-hero__stat';

  const term = document.createElement('dt');
  term.textContent = label;
  term.className = 'yournetwork-hero__label';

  const definition = document.createElement('dd');
  definition.textContent = value;
  definition.className = 'yournetwork-hero__value';

  wrapper.append(term, definition);
  return wrapper;
}

function createProgressBar(percent, label) {
  const wrapper = document.createElement('div');
  wrapper.className = 'yournetwork-progress';
  const clamped = clampPercent(percent);
  wrapper.setAttribute('role', 'progressbar');
  wrapper.setAttribute('aria-valuemin', '0');
  wrapper.setAttribute('aria-valuemax', '100');
  wrapper.setAttribute('aria-valuenow', String(clamped));
  if (label) {
    wrapper.setAttribute('aria-label', label);
  }

  const fill = document.createElement('span');
  fill.className = 'yournetwork-progress__fill';
  fill.style.setProperty('--progress', `${clamped}%`);
  wrapper.appendChild(fill);
  return wrapper;
}

function createBadge(text, variant = 'info') {
  const badge = document.createElement('span');
  badge.className = `yournetwork-badge yournetwork-badge--${variant}`;
  badge.textContent = text;
  return badge;
}

function createSection(title, subtitle) {
  const section = document.createElement('section');
  section.className = 'yournetwork-section';

  const header = document.createElement('header');
  header.className = 'yournetwork-section__header';

  const heading = document.createElement('h2');
  heading.textContent = title;
  header.appendChild(heading);

  if (subtitle) {
    const note = document.createElement('p');
    note.textContent = subtitle;
    note.className = 'yournetwork-section__note';
    header.appendChild(note);
  }

  section.appendChild(header);

  const body = document.createElement('div');
  body.className = 'yournetwork-section__body';
  section.appendChild(body);

  return { section, body };
}

function computeAssetHighlights(model = {}) {
  const groups = Array.isArray(model?.groups) ? model.groups : [];
  const highlights = [];

  groups.forEach(group => {
    const instances = Array.isArray(group?.instances) ? group.instances : [];
    instances.forEach(entry => {
      const instance = entry?.instance || {};
      if (!instance) return;
      const definition = entry?.definition || group?.definitions?.find(def => def?.id === entry?.definitionId) || {};
      const name = typeof instance.customName === 'string' && instance.customName.trim()
        ? instance.customName.trim()
        : `${definition.singular || definition.name || 'Asset'} #${(entry?.index ?? 0) + 1}`;
      const lifetime = Math.max(0, Number(instance.totalIncome) || 0);
      const lastPayout = Math.max(0, Number(instance.lastIncome) || 0);
      const status = entry?.status === 'active' ? 'Active' : 'In Setup';
      const nicheId = instance?.nicheId || null;
      highlights.push({
        id: instance.id || `${definition.id || 'asset'}-${entry?.index ?? 0}`,
        name,
        definitionName: definition.name || definition.id || 'Asset',
        lifetime,
        lastPayout,
        status,
        niche: nicheId ? toTitleCase(nicheId) : 'Generalist'
      });
    });
  });

  highlights.sort((a, b) => b.lifetime - a.lifetime);
  return highlights.slice(0, 3);
}

function computeLifetimeHours(state = {}) {
  let total = 0;
  const history = Array.isArray(state?.metrics?.history) ? state.metrics.history : [];
  history.forEach(entry => {
    if (entry?.summary?.totalTime != null) {
      total += Number(entry.summary.totalTime) || 0;
      return;
    }
    const timeEntries = Array.isArray(entry?.ledger?.time) ? entry.ledger.time : [];
    timeEntries.forEach(item => {
      total += Number(item?.hours) || 0;
    });
  });

  const dailyBucket = state?.metrics?.daily?.time;
  if (dailyBucket && typeof dailyBucket === 'object') {
    Object.values(dailyBucket).forEach(entry => {
      total += Number(entry?.hours) || 0;
    });
  }

  if (total <= 0) {
    const baseHours = Math.max(0, Number(state?.baseTime) || 0);
    const completedDays = Math.max(0, (Number(state?.day) || 1) - 1);
    const usedToday = Math.max(0, baseHours - Math.max(0, Number(state?.timeLeft) || 0));
    total = completedDays * baseHours + usedToday;
  }

  return Math.max(0, total);
}

function buildMetricEntries(summary = {}, state = {}, dailySummary = {}, highlights = []) {
  const lifetimeEarned = summary?.formatted?.earned || '$0';
  const lifetimeSpent = summary?.formatted?.spent || '$0';
  const totalHours = computeLifetimeHours(state);
  const hoursLabel = formatHours(totalHours);
  const earningsToday = Number(dailySummary?.totalEarnings) || 0;
  const spendToday = Number(dailySummary?.totalSpend) || 0;
  const netToday = earningsToday - spendToday;
  const topAsset = highlights[0] || null;

  return [
    { label: 'Lifetime earned', value: lifetimeEarned },
    { label: 'Lifetime spent', value: lifetimeSpent },
    {
      label: 'Hours invested',
      value: hoursLabel,
      meta: totalHours > 0 ? 'Accumulated from logged hustle + study time.' : 'Log time to start your track record.'
    },
    {
      label: 'Top earning asset',
      value: topAsset ? topAsset.name : 'No flagship asset yet',
      meta: topAsset
        ? `${formatCurrency(topAsset.lifetime)} lifetime • ${topAsset.lastPayout > 0
            ? `${formatCurrency(topAsset.lastPayout)} last payout`
            : 'Awaiting next payout'}`
        : 'Launch a venture to spotlight your first headline project.'
    },
    {
      label: 'Daily net flow',
      value: formatSignedCurrency(netToday),
      meta: `${formatCurrency(earningsToday)} earned • ${formatCurrency(spendToday)} spent today`
    }
  ];
}

function renderProfileHeader(profile = {}, mount) {
  const summary = profile?.summary || {};
  const section = document.createElement('section');
  section.className = 'yournetwork-hero';

  const identity = document.createElement('div');
  identity.className = 'yournetwork-hero__identity';

  const avatar = document.createElement('div');
  avatar.className = 'yournetwork-avatar';
  avatar.textContent = deriveAvatarGlyph(summary);
  avatar.setAttribute('aria-hidden', 'true');

  const headline = document.createElement('div');
  headline.className = 'yournetwork-hero__headline';

  const name = document.createElement('h1');
  name.className = 'yournetwork-hero__name';
  name.textContent = 'You';

  const title = document.createElement('p');
  title.className = 'yournetwork-hero__title';
  title.textContent = summary?.title || summary?.tier || 'Aspiring Creator';

  const tagline = document.createElement('p');
  tagline.className = 'yournetwork-hero__tagline';
  tagline.textContent = summary?.note || 'Stack wins, celebrate streaks, and keep exploring new horizons.';

  const activeAssets = Number(summary?.activeAssets) || 0;
  if (activeAssets > 0) {
    const ventures = document.createElement('p');
    ventures.className = 'yournetwork-hero__meta';
    ventures.textContent = `${activeAssets} active venture${activeAssets === 1 ? '' : 's'} humming right now.`;
    headline.append(ventures);
  }

  headline.prepend(tagline);
  headline.prepend(title);
  headline.prepend(name);

  identity.append(avatar, headline);
  section.appendChild(identity);

  const snapshot = document.createElement('dl');
  snapshot.className = 'yournetwork-hero__snapshot';
  snapshot.append(
    createSnapshotStat('Net worth', summary?.formatted?.current || '$0'),
    createSnapshotStat('Lifetime earned', summary?.formatted?.earned || '$0'),
    createSnapshotStat('Lifetime spent', summary?.formatted?.spent || '$0'),
    createSnapshotStat('Current day', summary?.formatted?.day || 'Day 1'),
    createSnapshotStat('Hours left today', summary?.formatted?.time || '0h')
  );
  section.appendChild(snapshot);

  mount.appendChild(section);
}

function createSkillCard(skill) {
  const card = document.createElement('article');
  card.className = 'yournetwork-card yournetwork-card--skill';
  if (skill?.isMaxed) {
    card.classList.add('is-maxed');
  }

  const header = document.createElement('header');
  header.className = 'yournetwork-card__header';

  const name = document.createElement('h3');
  name.className = 'yournetwork-card__title';
  name.textContent = skill?.name || 'Skill';

  const level = document.createElement('span');
  level.className = 'yournetwork-card__badge';
  level.textContent = `Lv ${skill?.level ?? 0}`;

  header.append(name, level);
  card.appendChild(header);

  const tier = document.createElement('p');
  tier.className = 'yournetwork-card__subtitle';
  tier.textContent = skill?.tierTitle || '';
  card.appendChild(tier);

  const progress = createProgressBar(skill?.progressPercent ?? 0, `${skill?.name} progress`);
  card.appendChild(progress);

  const meta = document.createElement('p');
  meta.className = 'yournetwork-card__meta';
  meta.textContent = skill?.isMaxed
    ? `${skill?.xp} XP • Mastered`
    : `${skill?.xp} XP • ${skill?.remainingXp} XP to ${skill?.nextTier || 'next tier'}`;
  card.appendChild(meta);

  if (skill?.isMaxed) {
    card.appendChild(createBadge('Milestone achieved', 'success'));
  }

  return card;
}

function renderSkillsSection(skills = {}) {
  const items = Array.isArray(skills?.items) ? skills.items : [];
  const summaryText = [skills?.summary?.primary, skills?.summary?.secondary]
    .filter(Boolean)
    .join(' • ');
  const { section, body } = createSection('Skills & Endorsements', summaryText);
  body.classList.add('yournetwork-grid');

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'yournetwork-empty';
    empty.textContent = 'Log XP across your hustles to reveal skill milestones.';
    body.appendChild(empty);
    return section;
  }

  items.forEach(skill => {
    body.appendChild(createSkillCard(skill));
  });

  return section;
}

function createEducationCard(entry) {
  const card = document.createElement('article');
  card.className = 'yournetwork-card yournetwork-card--education';
  card.dataset.state = entry?.state || 'available';

  const header = document.createElement('header');
  header.className = 'yournetwork-card__header';

  const name = document.createElement('h3');
  name.className = 'yournetwork-card__title';
  name.textContent = entry?.name || 'Study track';

  const status = createBadge(entry?.status || 'Available', entry?.completed ? 'success' : entry?.state === 'active' ? 'info' : 'muted');

  header.append(name, status);
  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'yournetwork-card__meta';
  summary.textContent = entry?.summary || '';
  card.appendChild(summary);

  if (entry?.state === 'active') {
    const progress = createProgressBar((entry?.percent ?? 0) * 100, `${entry?.name} progress`);
    card.appendChild(progress);
  }

  const note = document.createElement('p');
  note.className = 'yournetwork-card__note';
  note.textContent = entry?.note || '';
  card.appendChild(note);

  if (entry?.state === 'completed') {
    card.appendChild(createBadge('Certification earned', 'success'));
  }

  return card;
}

function renderEducationSection(education = {}) {
  const items = Array.isArray(education?.items) ? education.items : [];
  const { section, body } = createSection('Education & Certifications', 'Active study tracks + completed accolades.');
  body.classList.add('yournetwork-grid');

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'yournetwork-empty';
    empty.textContent = 'Browse Learnly to enroll in courses and unlock permanent bonuses.';
    body.appendChild(empty);
    return section;
  }

  const order = { active: 0, completed: 1, available: 2 };
  items
    .slice()
    .sort((a, b) => (order[a?.state] ?? 3) - (order[b?.state] ?? 3))
    .forEach(entry => body.appendChild(createEducationCard(entry)));

  return section;
}

function createEquipmentCard(entry, { locked = false } = {}) {
  const card = document.createElement('article');
  card.className = 'yournetwork-card yournetwork-card--equipment';
  if (locked || entry?.status === 'locked') {
    card.classList.add('is-locked');
  }

  const header = document.createElement('header');
  header.className = 'yournetwork-card__header';

  const name = document.createElement('h3');
  name.className = 'yournetwork-card__title';
  name.textContent = entry?.name || 'Equipment';

  const badgeVariant = locked ? 'muted' : 'info';
  const badgeLabel = locked ? 'Not yet purchased' : 'In loadout';
  const badge = createBadge(badgeLabel, badgeVariant);

  header.append(name, badge);
  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'yournetwork-card__meta';
  summary.textContent = entry?.summary || '';
  card.appendChild(summary);

  const focus = document.createElement('p');
  focus.className = 'yournetwork-card__note';
  focus.textContent = entry?.focus || '';
  card.appendChild(focus);

  const cost = Number(entry?.cost) || 0;
  if (cost > 0) {
    const costNote = document.createElement('p');
    costNote.className = 'yournetwork-card__note yournetwork-card__note--cost';
    costNote.textContent = locked
      ? `Investment: ${formatCurrency(cost)} when unlocked`
      : `Purchased for ${formatCurrency(cost)}`;
    card.appendChild(costNote);
  }

  return card;
}

function renderEquipmentSection(equipment = {}) {
  const owned = Array.isArray(equipment?.items) ? equipment.items : [];
  const locked = Array.isArray(equipment?.locked) ? equipment.locked : [];
  const { section, body } = createSection('Equipment Locker', 'Tools, rigs, and future upgrades powering your empire.');
  body.classList.add('yournetwork-grid');

  if (!owned.length && !locked.length) {
    const empty = document.createElement('p');
    empty.className = 'yournetwork-empty';
    empty.textContent = equipment?.empty
      || 'No gear purchased yet. Explore Upgrades to expand your toolkit.';
    body.appendChild(empty);
    return section;
  }

  owned.forEach(entry => body.appendChild(createEquipmentCard(entry, { locked: false })));
  locked.forEach(entry => body.appendChild(createEquipmentCard(entry, { locked: true })));

  return section;
}

function createAssetCard(entry) {
  const card = document.createElement('article');
  card.className = 'yournetwork-card yournetwork-card--asset';

  const header = document.createElement('header');
  header.className = 'yournetwork-card__header';

  const name = document.createElement('h3');
  name.className = 'yournetwork-card__title';
  name.textContent = entry?.name || 'Asset';

  const status = createBadge(entry?.status || 'Active', entry?.status === 'Active' ? 'success' : 'info');

  header.append(name, status);
  card.appendChild(header);

  const summary = document.createElement('p');
  summary.className = 'yournetwork-card__meta';
  summary.textContent = `${entry?.definitionName || 'Venture'} • ${entry?.niche || 'Generalist'}`;
  card.appendChild(summary);

  const statRow = document.createElement('div');
  statRow.className = 'yournetwork-asset__stats';

  const lifetime = document.createElement('span');
  lifetime.className = 'yournetwork-asset__stat';
  lifetime.textContent = `${formatCurrency(entry?.lifetime || 0)} lifetime`;

  const last = document.createElement('span');
  last.className = 'yournetwork-asset__stat';
  last.textContent = entry?.lastPayout > 0
    ? `${formatCurrency(entry.lastPayout)} last payout`
    : 'Next payout pending';

  statRow.append(lifetime, last);
  card.appendChild(statRow);

  return card;
}

function renderAssetsSection(highlights = []) {
  const { section, body } = createSection('Portfolio Highlights', 'Spotlight your top performing builds.');
  body.classList.add('yournetwork-grid');

  if (!highlights.length) {
    const empty = document.createElement('p');
    empty.className = 'yournetwork-empty';
    empty.textContent = 'Launch a venture to showcase lifetime earnings here.';
    body.appendChild(empty);
    return section;
  }

  highlights.forEach(entry => body.appendChild(createAssetCard(entry)));
  return section;
}

function renderMetricsSection(metrics = []) {
  const { section, body } = createSection('Career Metrics', 'At-a-glance proof of your hustle legacy.');
  const list = document.createElement('dl');
  list.className = 'yournetwork-stats';

  metrics.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'yournetwork-stat';

    const label = document.createElement('dt');
    label.className = 'yournetwork-stat__label';
    label.textContent = entry?.label || '';

    const value = document.createElement('dd');
    value.className = 'yournetwork-stat__value';
    value.textContent = entry?.value || '';

    if (entry?.meta) {
      const meta = document.createElement('span');
      meta.className = 'yournetwork-stat__meta';
      meta.textContent = entry.meta;
      value.appendChild(document.createElement('br'));
      value.appendChild(meta);
    }

    item.append(label, value);
    list.appendChild(item);
  });

  body.appendChild(list);
  return section;
}

function render(context = {}) {
  const { mount, profile = {}, assetsModel = {}, state = {}, dailySummary = {} } = context;
  if (!mount) return null;

  mount.innerHTML = '';
  mount.classList.add('yournetwork');

  renderProfileHeader(profile, mount);
  mount.appendChild(renderSkillsSection(profile?.skills));
  mount.appendChild(renderEducationSection(profile?.education));
  mount.appendChild(renderEquipmentSection(profile?.equipment));

  const assetHighlights = computeAssetHighlights(assetsModel);
  mount.appendChild(renderAssetsSection(assetHighlights));

  const metrics = buildMetricEntries(profile?.summary, state, dailySummary, assetHighlights);
  mount.appendChild(renderMetricsSection(metrics));

  return {
    meta: profile?.summary?.title || profile?.summary?.tier || 'Profile ready'
  };
}

export default {
  render
};
