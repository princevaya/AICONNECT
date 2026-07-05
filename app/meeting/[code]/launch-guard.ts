export function createLaunchOnceGuard() {
  const flag = {
    didRun: false,
  };

  return {
    runOnce: (fn: () => void) => {
      if (flag.didRun) return;
      flag.didRun = true;
      fn();
    },
    reset: () => {
      flag.didRun = false;
    },
  };
}

