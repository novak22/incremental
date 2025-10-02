export const HOMEPAGE_ID = 'home';

export const SERVICE_PAGES = [
  {
    id: 'bankapp',
    slug: 'bank',
    label: 'BankApp',
    headline: 'BankApp Balance Center',
    tagline: 'Track cashflow, daily net, and ledger entries in one glance.',
    icon: '🏦',
    type: 'finance'
  },
  {
    id: 'downwork',
    slug: 'downwork',
    label: 'DownWork',
    headline: 'DownWork Hustle Exchange',
    tagline: 'Match with online gigs, pitch your services, and celebrate new wins.',
    icon: '📝',
    type: 'hustles'
  },
  {
    id: 'assets',
    slug: 'assets',
    label: 'Asset Arcade',
    headline: 'Asset Arcade Command Deck',
    tagline: 'Tend ebooks, SaaS, and evergreen earners in one upbeat hub.',
    icon: '💼',
    type: 'assets'
  },
  {
    id: 'videotube',
    slug: 'videotube',
    label: 'VideoTube',
    headline: 'VideoTube Venture Studio',
    tagline: 'Schedule drops, review analytics, and amplify fans.',
    icon: '📺',
    type: 'videotube'
  },
  {
    id: 'blogpress',
    slug: 'blogpress',
    label: 'BlogPress',
    headline: 'BlogPress Creator Console',
    tagline: 'Spin up blogs, nurture niches, and celebrate payout streaks.',
    icon: '📰',
    type: 'blogpress'
  },
  {
    id: 'shopstack',
    slug: 'shopstack',
    label: 'ShopStack',
    headline: 'ShopStack Upgrade Arcade',
    tagline: 'Install upgrades, stock products, and plan the next spike.',
    icon: '🛍️',
    type: 'upgrades'
  },
  {
    id: 'learnly',
    slug: 'learnly',
    label: 'Learnly',
    headline: 'Learnly Study Hall',
    tagline: 'Study new skills, finish tracks, and unlock perks.',
    icon: '🎓',
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
