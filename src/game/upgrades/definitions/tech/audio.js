const audio = [
  {
    id: 'audioSuite',
    name: 'Audio Suite',
    tag: { label: 'Gear', type: 'tech' },
    description: 'Treat the studio with acoustic foam, preamps, and mastering plug-ins.',
    category: 'tech',
    family: 'audio',
    cost: 420,
    effects: { quality_progress_mult: 1.4 },
    affects: {
      assets: { tags: [ 'audio', 'video' ] },
      actions: { types: [ 'quality' ] }
    },
    metrics: { cost: { label: '🎙️ Audio suite upgrade', category: 'gear' } },
    logMessage: 'Voiceovers, podcasts, and narrations now sound buttery-smooth.',
    logType: 'upgrade'
  }
];

export default audio;
