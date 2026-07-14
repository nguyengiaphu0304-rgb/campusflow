export type PwaUpdateHandler = (registration: ServiceWorkerRegistration) => void;

export async function registerPwa(onUpdate: PwaUpdateHandler): Promise<void> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  try {
    const workerUrl = new URL("./sw.js", document.baseURI);
    const registration = await navigator.serviceWorker.register(workerUrl, {
      scope: "./",
      updateViaCache: "none",
    });
    const announceWaitingWorker = () => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        onUpdate(registration);
      }
    };
    announceWaitingWorker();
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") announceWaitingWorker();
      });
    });
  } catch {
    // Offline support is progressive enhancement; the planner remains usable online.
  }
}

export function activatePwaUpdate(registration: ServiceWorkerRegistration): boolean {
  if (!registration.waiting) return false;
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => window.location.reload(),
    { once: true },
  );
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}
