import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBlogpressModel } from '../../src/ui/blogpress/blogModel.js';
import blogDefinition from '../../src/game/assets/definitions/blog.js';
import { ensureRegistryReady } from '../../src/game/registryBootstrap.js';

function createState() {
  return {
    day: 5,
    timeLeft: 12,
    money: 180,
    assets: {
      blog: {
        instances: [
          {
            id: 'blog-1',
            status: 'active',
            createdOnDay: 2,
            lastIncome: 28,
            totalIncome: 140,
            pendingIncome: 12,
            maintenanceFundedToday: true,
            metrics: { seoScore: 88, backlinks: 6, lifetimeViews: 4200, dailyViews: 180 },
            quality: { level: 1, progress: { posts: 3, seo: 1 } },
            nicheId: 'healthWellness',
            lastIncomeBreakdown: {
              entries: [
                { id: 'base', label: 'Base', amount: 20 },
                { id: 'bonus', label: 'Bonus', amount: 8 }
              ],
              total: 28
            }
          },
          {
            id: 'blog-2',
            status: 'setup',
            daysCompleted: 1,
            daysRemaining: 2,
            createdOnDay: 4,
            lastIncome: 0,
            totalIncome: 0,
            pendingIncome: 0,
            maintenanceFundedToday: false,
            metrics: {},
            quality: { level: 0, progress: {} }
          }
        ]
      }
    },
    niches: {
      popularity: {
        healthWellness: { score: 82, previousScore: 74 },
        personalFinance: { score: 68, previousScore: 60 },
        travelAdventures: { score: 55, previousScore: 50 }
      },
      watchlist: [],
      analyticsHistory: []
    },
    events: {
      active: [
        {
          id: 'event-boost',
          templateId: 'qualityCelebration',
          label: 'Backlink Parade',
          stat: 'income',
          modifierType: 'percent',
          target: { type: 'assetInstance', assetId: 'blog', instanceId: 'blog-1' },
          tone: 'positive',
          currentPercent: 0.25,
          totalDays: 3,
          remainingDays: 2,
          createdOnDay: 4,
          lastProcessedDay: 4,
          meta: {}
        },
        {
          id: 'event-trend',
          templateId: 'trendPulse',
          label: 'Wellness Festival',
          stat: 'income',
          modifierType: 'percent',
          target: { type: 'niche', nicheId: 'healthWellness' },
          tone: 'neutral',
          currentPercent: 0.1,
          totalDays: 5,
          remainingDays: 4,
          createdOnDay: 3,
          lastProcessedDay: 4,
          meta: {}
        }
      ]
    }
  };
}

test('formatBlogpressModel returns formatted instances and summary', () => {
  ensureRegistryReady();
  const state = createState();
  const { summary, instances, nicheOptions } = formatBlogpressModel({ definition: blogDefinition, state });

  assert.equal(summary.total, 2);
  assert.equal(summary.active, 1);
  assert.equal(summary.needsUpkeep, 0);
  assert.equal(summary.meta, '1 blog live');

  assert.equal(instances.length, 2);
  const active = instances.find(entry => entry.id === 'blog-1');
  assert.ok(active, 'expected active blog instance');
  assert.equal(active.status?.id, 'active');
  assert.equal(active.quickAction?.id, 'writePost');
  assert.equal(active.quickAction?.available, true);
  assert.equal(active.actions.length, 3);
  assert.equal(active.niche?.name, 'Health & Wellness');
  assert.equal(active.niche?.label, 'Surging');
  assert.equal(active.maintenanceFunded, true);
  assert.equal(active.payoutBreakdown.total, 28);
  assert.equal(active.events.length, 2);
  assert.equal(active.events[0].source, 'asset');
  assert.equal(active.events[0].label, 'Backlink Parade');
  assert.equal(active.events[0].percent, 0.25);
  assert.equal(active.events[1].source, 'niche');
  assert.equal(active.posts?.published, 3);
  assert.equal(active.seo?.score, 88);
  assert.equal(active.seo?.grade, 'B');
  assert.equal(active.backlinks?.count, 6);
  assert.equal(active.backlinks?.score, 4);
  assert.equal(active.visits?.lifetime, 4200);
  assert.equal(active.visits?.today, 180);

  const setup = instances.find(entry => entry.id === 'blog-2');
  assert.ok(setup, 'expected setup blog instance');
  assert.equal(setup.status?.id, 'setup');
  assert.equal(setup.quickAction?.available, false);
  assert.match(setup.quickAction?.disabledReason || '', /Launch finishes in/);
  assert.equal(setup.seo?.score, 30);
  assert.equal(setup.backlinks?.count, 0);

  assert.ok(Array.isArray(nicheOptions));
  const nicheIds = nicheOptions.map(option => option.id);
  assert.ok(nicheIds.includes('healthWellness'));
  assert.ok(nicheIds.includes('personalFinance'));
});
