import { APP_CONFIG } from './config.js';

export function bootstrapRootEntry() {
  const body = document.body;
  if (!body) {
    return;
  }

  body.setAttribute('data-app', APP_CONFIG.appName);
}
