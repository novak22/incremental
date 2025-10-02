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
    id: 'yournetwork',
    slug: 'your-network',
    label: 'YourNetwork',
    headline: 'YourNetwork Professional Profile',
    tagline: 'Showcase your creator CV, highlight skills, and celebrate portfolio wins.',
    icon: '🧑‍🚀',
    type: 'profile'
  },
  {
    id: 'trends',
    slug: 'trends',
    label: 'Trends',
    headline: 'Trends Intelligence Lab',
    tagline: 'Monitor niche momentum, payouts, and watchlist signals in one hub.',
    icon: '📈',
    type: 'trends'
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
    id: 'serverhub',
    slug: 'serverhub',
    label: 'ServerHub',
    headline: 'ServerHub Cloud Control',
    tagline: 'Launch SaaS apps, monitor uptime, and tune ROI in one console.',
    icon: '☁️',
    type: 'serverhub'
  },
  {
    id: 'digishelf',
    slug: 'digishelf',
    label: 'DigiShelf',
    headline: 'DigiShelf Digital Library',
    tagline: 'Curate e-books and stock galleries in one polished workspace.',
    icon: '📚',
    type: 'digishelf'
  },
  {
    id: 'videotube',
    slug: 'videotube',
    label: 'VideoTube',
    headline: 'VideoTube Studio',
    tagline: 'Manage uploads, hype premieres, and celebrate every payout.',
    icon: '📺',
    type: 'videotube'
  },
  {
    id: 'shopily',
    slug: 'shopily',
    label: 'Shopily',
    headline: 'Shopily Storefront Studio',
    tagline: 'Launch dropshipping brands, monitor ROI, and trigger upgrades.',
    icon: '🛒',
    type: 'shopily'
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

