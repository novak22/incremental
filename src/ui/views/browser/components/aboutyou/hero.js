const AVATAR_GLYPHS = ['🌱', '🚀', '🌟', '🏆', '🪐', '💫'];

const HERO_KPI_THEME = {
  container: 'aboutyou-hero__snapshot',
  grid: 'aboutyou-hero__snapshot-grid',
  card: 'aboutyou-hero__stat',
  label: 'aboutyou-hero__label',
  value: 'aboutyou-hero__value',
  note: 'aboutyou-hero__note',
  empty: 'aboutyou-hero__empty'
};

export function deriveAvatarGlyph(summary = {}) {
  const level = Math.max(1, Number(summary.level) || 1);
  const index = Math.min(AVATAR_GLYPHS.length - 1, Math.floor((level - 1) / 2));
  return AVATAR_GLYPHS[index];
}

export function mapHeroSnapshot(summary = {}) {
  return [
    { id: 'netWorth', label: 'Net worth', value: summary?.formatted?.current || '$0' },
    { id: 'lifetimeEarned', label: 'Lifetime earned', value: summary?.formatted?.earned || '$0' },
    { id: 'lifetimeSpent', label: 'Lifetime spent', value: summary?.formatted?.spent || '$0' },
    { id: 'currentDay', label: 'Current day', value: summary?.formatted?.day || 'Day 1' },
    { id: 'hoursLeft', label: 'Hours left today', value: summary?.formatted?.time || '0h' }
  ];
}

export function renderHero(profile = {}, mount, options = {}) {
  if (!mount) return null;
  const summary = profile?.summary || {};
  const { renderStats = null } = options;

  const section = document.createElement('section');
  section.className = 'aboutyou-hero';

  const identity = document.createElement('div');
  identity.className = 'aboutyou-hero__identity';

  const avatar = document.createElement('div');
  avatar.className = 'aboutyou-avatar';
  avatar.textContent = deriveAvatarGlyph(summary);
  avatar.setAttribute('aria-hidden', 'true');

  const headline = document.createElement('div');
  headline.className = 'aboutyou-hero__headline';

  const name = document.createElement('h1');
  name.className = 'aboutyou-hero__name';
  name.textContent = 'You';

  const title = document.createElement('p');
  title.className = 'aboutyou-hero__title';
  title.textContent = summary?.title || summary?.tier || 'Aspiring Creator';

  const tagline = document.createElement('p');
  tagline.className = 'aboutyou-hero__tagline';
  tagline.textContent =
    summary?.note || 'Stack wins, celebrate streaks, and keep exploring new horizons.';

  const activeAssets = Number(summary?.activeAssets) || 0;
  if (activeAssets > 0) {
    const ventures = document.createElement('p');
    ventures.className = 'aboutyou-hero__meta';
    ventures.textContent = `${activeAssets} active venture${activeAssets === 1 ? '' : 's'} humming right now.`;
    headline.append(ventures);
  }

  headline.prepend(tagline);
  headline.prepend(title);
  headline.prepend(name);

  identity.append(avatar, headline);
  section.appendChild(identity);

  if (typeof renderStats === 'function') {
    const stats = mapHeroSnapshot(summary);
    const snapshot = renderStats({ items: stats, theme: HERO_KPI_THEME });
    section.appendChild(snapshot);
  }

  mount.appendChild(section);
  return section;
}
