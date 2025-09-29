const NICHE_DEFINITIONS = [
  {
    id: 'techInnovators',
    name: 'Tech Innovators',
    description: 'Gadget lovers and software tinkerers who jump on the next productivity breakthrough.',
    tags: ['software', 'tech', 'product']
  },
  {
    id: 'healthWellness',
    name: 'Health & Wellness',
    description: 'People chasing healthier routines, mindful habits, and science-backed self-care.',
    tags: ['writing', 'content', 'digital']
  },
  {
    id: 'personalFinance',
    name: 'Personal Finance',
    description: 'Budgeters and investors who devour tips on saving smarter and building wealth.',
    tags: ['writing', 'content', 'product']
  },
  {
    id: 'sustainableLiving',
    name: 'Sustainable Living',
    description: 'Eco-conscious shoppers eager for low-waste swaps, ethical products, and reuse hacks.',
    tags: ['commerce', 'content', 'ecommerce']
  },
  {
    id: 'fitnessTraining',
    name: 'Fitness & Training',
    description: 'Athletes-in-progress streaming workouts, form checks, and at-home training plans.',
    tags: ['video', 'content', 'studio']
  },
  {
    id: 'travelAdventures',
    name: 'Travel & Adventure',
    description: 'Globetrotters scouting itineraries, remote-work escapes, and photo-ready destinations.',
    tags: ['photo', 'visual', 'content']
  },
  {
    id: 'beautySkincare',
    name: 'Beauty & Skincare',
    description: 'Product reviewers and glam squads comparing routines, looks, and ingredient deep dives.',
    tags: ['photo', 'visual', 'product']
  },
  {
    id: 'homeDIY',
    name: 'Home & DIY',
    description: 'Organizers and makers swapping renovation tips, storage wins, and weekend builds.',
    tags: ['content', 'product', 'digital']
  },
  {
    id: 'parentingSupport',
    name: 'Parenting Support',
    description: 'Caregivers trading routines, milestone advice, and sanity-saving family systems.',
    tags: ['writing', 'content']
  },
  {
    id: 'petCare',
    name: 'Pet Care & Training',
    description: 'Pet parents learning enrichment games, nutrition tips, and grooming must-dos.',
    tags: ['video', 'content', 'commerce']
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
