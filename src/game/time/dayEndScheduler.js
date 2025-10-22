let pendingCheck = false;
let registeredChecker = null;

export function registerDayEndChecker(fn) {
  if (typeof fn === 'function') {
    registeredChecker = fn;
  }
}

export function scheduleDayEndCheck() {
  if (pendingCheck || typeof registeredChecker !== 'function') {
    return;
  }
  pendingCheck = true;
  queueMicrotask(() => {
    pendingCheck = false;
    try {
      registeredChecker?.();
    } catch (error) {
      console?.error?.('Failed to run day end check', error);
    }
  });
}
