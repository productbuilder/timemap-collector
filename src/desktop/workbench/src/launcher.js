import '../../../apps/collector/src/index.js';
import '../../../apps/configurator/src/index.js';

const APPS = {
  collector: { title: 'Collector', tag: 'open-collections-manager' },
  configurator: { title: 'Configurator', tag: 'open-configurator-manager' },
};

export function createWorkbenchLauncher({ launcherEl, barEl, hostEl, titleEl }) {
  function showLauncher() {
    hostEl.innerHTML = '';
    hostEl.classList.add('hidden');
    launcherEl.classList.remove('hidden');
    barEl.classList.remove('show');
  }

  function launch(appId) {
    const app = APPS[appId];
    if (!app) {
      return;
    }
    launcherEl.classList.add('hidden');
    barEl.classList.add('show');
    hostEl.classList.remove('hidden');
    titleEl.textContent = app.title;
    hostEl.innerHTML = `<${app.tag}></${app.tag}>`;
  }

  return { launch, showLauncher };
}
