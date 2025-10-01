export const HOMEPAGE_ID = 'home';

export const SERVICE_PAGES = [
  {
    id: 'blogpress',
    slug: 'blogpress',
    label: 'BlogPress',
    headline: 'BlogPress Creator Hub',
    tagline: 'Queue hustles, stack ROI, and keep your streak sizzling.',
    type: 'hustles'
  },
  {
    id: 'videotube',
    slug: 'videotube',
    label: 'VideoTube',
    headline: 'VideoTube Venture Studio',
    tagline: 'Survey every venture, fund upkeep, and celebrate new launches.',
    type: 'assets'
  },
  {
    id: 'shopstack',
    slug: 'shopstack',
    label: 'ShopStack',
    headline: 'ShopStack Upgrade Arcade',
    tagline: 'Install power-ups, clear prerequisites, and line up the next spike.',
    type: 'upgrades'
  },
  {
    id: 'learnly',
    slug: 'learnly',
    label: 'Learnly',
    headline: 'Learnly Study Hall',
    tagline: 'Stay sharp with daily study loops and celebratory completions.',
    type: 'education'
  }
];

export function findPageById(pageId) {
  if (pageId === HOMEPAGE_ID) {
    return {
      id: HOMEPAGE_ID,
      slug: 'home',
      label: 'Homepage',
      headline: 'Mission Control',
      tagline: 'Your empire’s launchpad with shortcuts, streaks, and story beats.',
      type: 'home'
    };
  }

  return SERVICE_PAGES.find(page => page.id === pageId) || null;
}

export function findPageBySlug(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'home' || normalized === HOMEPAGE_ID) {
    return findPageById(HOMEPAGE_ID);
  }
  return SERVICE_PAGES.find(page => page.slug === normalized || page.label.toLowerCase() === normalized) || null;
}

export function listAllPages() {
  return [findPageById(HOMEPAGE_ID), ...SERVICE_PAGES];
}
