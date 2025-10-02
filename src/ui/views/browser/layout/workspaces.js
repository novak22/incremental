import { getElement } from '../../../elements/registry.js';
import { HOMEPAGE_ID } from '../config.js';

let launchStageRef = null;
let workspaceHostRef = null;

function getLaunchStage() {
  if (!launchStageRef) {
    launchStageRef = getElement('launchStage') || null;
  }
  return launchStageRef;
}

function getWorkspaceHost() {
  if (!workspaceHostRef) {
    workspaceHostRef = getElement('workspaceHost') || null;
  }
  return workspaceHostRef;
}

function getHomepageElement() {
  return getElement('homepage')?.container || null;
}

function normalizeWorkspacePath(path = '') {
  return String(path || '')
    .trim()
    .split(/[?#]/, 1)[0]
    .replace(/^\/+|\/+$/g, '');
}

function getWorkspaceElement(pageId) {
  if (pageId === HOMEPAGE_ID) {
    return getLaunchStage() || getHomepageElement();
  }
  const host = getWorkspaceHost();
  if (!host) return null;
  return host.querySelector(`[data-browser-page="${pageId}"]`);
}

function getWorkspacePath(pageId) {
  const element = getWorkspaceElement(pageId);
  if (!element) return '';
  return normalizeWorkspacePath(element.dataset.browserPath || '');
}

function setWorkspacePath(pageId, path) {
  const element = getWorkspaceElement(pageId);
  if (!element) return;
  const normalized = normalizeWorkspacePath(path);
  if (normalized) {
    element.dataset.browserPath = normalized;
  } else {
    delete element.dataset.browserPath;
  }
}

function getWorkspaceDomain(page) {
  if (!page) return 'workspace';
  const source = page.domain || page.id || page.slug || page.label || 'workspace';
  const cleaned = String(source)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  return cleaned || 'workspace';
}

function buildWorkspaceUrl(page) {
  if (!page || page.id === HOMEPAGE_ID) {
    return 'https://hustle.city/';
  }
  const domain = `${getWorkspaceDomain(page)}.hub`;
  const path = getWorkspacePath(page.id);
  const suffix = path ? `/${path}` : '/';
  return `https://${domain}${suffix}`;
}

function resetWorkspaceRefs() {
  launchStageRef = null;
  workspaceHostRef = null;
}

const workspaceRoutes = {
  getLaunchStage,
  getWorkspaceHost,
  getHomepageElement,
  getWorkspaceElement,
  getWorkspacePath,
  setWorkspacePath,
  normalizeWorkspacePath,
  buildWorkspaceUrl,
  resetWorkspaceRefs
};

export {
  getLaunchStage,
  getWorkspaceHost,
  getHomepageElement,
  getWorkspaceElement,
  getWorkspacePath,
  setWorkspacePath,
  normalizeWorkspacePath,
  buildWorkspaceUrl,
  resetWorkspaceRefs
};

export default workspaceRoutes;
