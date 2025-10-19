import todoWidget from './todoWidget.js';
import appsWidget from './appsWidget.js';
import bankWidget from './bankWidget.js';

const sharedControllers = new Map([
  ['todo', todoWidget],
  ['apps', appsWidget],
  ['bank', bankWidget]
]);

function getSharedWidgetController(id) {
  return sharedControllers.get(id) || null;
}

export { getSharedWidgetController };
