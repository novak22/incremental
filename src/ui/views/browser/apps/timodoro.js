import { getState } from '../../../../core/state.js';
import { computeDailySummary } from '../../../../game/summary.js';
import {
  buildQuickActionModel,
  buildAssetActionModel,
  buildStudyEnrollmentActionModel
} from '../../../dashboard/model.js';
import { composeTodoModel, createAutoCompletedEntries } from '../dashboardPresenter.js';
import { getPageByType } from './pageLookup.js';
import { ensureElements, renderView } from './timodoro/ui.js';
import { buildTimodoroViewModel } from './timodoro/model.js';

export default function renderTimodoro(context = {}) {
  const page = getPageByType('timodoro');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    ensureElements(body);
  });
  if (!refs) return null;

  const dom = ensureElements(refs.body);
  if (!dom) return null;

  const state = getState() || {};
  const summary = computeDailySummary(state);

  const quickActions = buildQuickActionModel(state);
  const assetActions = buildAssetActionModel(state);
  const studyActions = buildStudyEnrollmentActionModel(state);
  const autoEntries = createAutoCompletedEntries(summary);
  const todoModel = composeTodoModel(quickActions, assetActions, studyActions, autoEntries);

  const viewModel = buildTimodoroViewModel(state, summary, todoModel);

  renderView(dom, viewModel);

  return { id: page.id, meta: viewModel.meta };
}
