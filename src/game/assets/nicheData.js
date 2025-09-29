const NICHE_DEFINITIONS = [
  {
    id: 'evergreenGuides',
    name: 'Evergreen Guides',
    description: 'How-to libraries and niche blogs that reward consistent, helpful storytelling.',
    tags: ['writing', 'content', 'digital']
  },
  {
    id: 'creatorCollabs',
    name: 'Creator Collabs',
    description: 'Livestream takeovers, vlog collabs, and behind-the-scenes drops that thrive on video energy.',
    tags: ['video', 'visual', 'content', 'studio']
  },
  {
    id: 'marketplaceSpotlight',
    name: 'Marketplace Spotlight',
    description: 'Bundled products, photo packs, and digital goods tuned for marketplace bursts.',
    tags: ['photo', 'visual', 'commerce', 'product']
  },
  {
    id: 'trendChaser',
    name: 'Trend Chaser',
    description: 'Dropshipping curations and hot-list products that pivot with every scroll trend.',
    tags: ['commerce', 'ecommerce', 'content']
  },
  {
    id: 'automationNerds',
    name: 'Automation Nerds',
    description: 'SaaS tools, scripts, and workflow boosters that serve the builder crowd.',
    tags: ['software', 'tech', 'product']
  },
  {
    id: 'aestheticObsessed',
    name: 'Aesthetic Obsessed',
    description: 'High-style visuals, presets, and branding kits for designers who crave polish.',
    tags: ['visual', 'photo', 'content', 'digital']
  }
];

export function getNicheDefinitions() {
  return NICHE_DEFINITIONS;
}

export function getNicheDefinition(id) {
  if (!id) return null;
  return NICHE_DEFINITIONS.find(entry => entry.id === id) || null;
}

export default NICHE_DEFINITIONS;
