import { createWorkbenchLauncher } from './launcher.js';

const launcherEl = document.getElementById('launcher');
const barEl = document.getElementById('bar');
const hostEl = document.getElementById('host');
const titleEl = document.getElementById('appTitle');
const backBtn = document.getElementById('backBtn');

const workbench = createWorkbenchLauncher({ launcherEl, barEl, hostEl, titleEl });

launcherEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-launch]');
  if (!button) {
    return;
  }
  workbench.launch(button.dataset.launch);
});

backBtn.addEventListener('click', () => {
  workbench.showLauncher();
});

const params = new URLSearchParams(window.location.search);
const startupApp = params.get('app');
if (startupApp) {
  workbench.launch(startupApp);
}
