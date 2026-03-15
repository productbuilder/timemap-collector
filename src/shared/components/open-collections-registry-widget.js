const DEFAULT_RECENT_LIMIT = 5;
const MAX_RECENT_LIMIT = 20;

const MOCK_RECENT_ITEMS = [
  {
    id: 'demo-1',
    title: 'Maps collection',
    url: 'https://example.org/maps/collection.json',
    type: 'collection',
    addedAt: '2026-03-14T10:00:00Z',
    status: 'valid',
  },
  {
    id: 'demo-2',
    title: 'Photo archive',
    url: 'https://example.org/photos/collection.json',
    type: 'collection',
    addedAt: '2026-03-13T09:30:00Z',
    status: 'valid',
  },
];

function parseRecentLimit(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return DEFAULT_RECENT_LIMIT;
  }
  return Math.min(numeric, MAX_RECENT_LIMIT);
}

function safeText(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toDateLabel(value) {
  const raw = safeText(value);
  if (!raw) {
    return '';
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(parsed);
  } catch (_error) {
    return parsed.toISOString().slice(0, 10);
  }
}

function normalizeRecentItems(payload) {
  const list = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
  return list.map((item, index) => ({
    id: safeText(item?.id) || `recent-${index + 1}`,
    title: safeText(item?.title) || safeText(item?.name) || 'Untitled collection',
    url: safeText(item?.url) || safeText(item?.manifestUrl) || '',
    type: safeText(item?.type) || '',
    addedAt: safeText(item?.addedAt) || safeText(item?.createdAt) || '',
    status: safeText(item?.status) || '',
  }));
}

class OpenCollectionsRegistryWidgetElement extends HTMLElement {
  static get observedAttributes() {
    return ['submit-url', 'recent-url', 'recent-limit', 'api-mode', 'title', 'intro', 'list-only'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      urlValue: '',
      isSubmitting: false,
      isLoadingRecent: false,
      feedback: null,
      recentItems: [],
      recentError: '',
    };
    this.mockRecentItems = [...MOCK_RECENT_ITEMS];
  }

  connectedCallback() {
    this.render();
    this.loadRecentItems().catch(() => {});
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }
    this.render();
    if (name === 'recent-url' || name === 'recent-limit' || name === 'api-mode') {
      this.loadRecentItems().catch(() => {});
    }
  }

  get submitUrl() {
    return safeText(this.getAttribute('submit-url'));
  }

  set submitUrl(value) {
    if (value == null) {
      this.removeAttribute('submit-url');
      return;
    }
    this.setAttribute('submit-url', String(value));
  }

  get recentUrl() {
    return safeText(this.getAttribute('recent-url'));
  }

  set recentUrl(value) {
    if (value == null) {
      this.removeAttribute('recent-url');
      return;
    }
    this.setAttribute('recent-url', String(value));
  }

  get recentLimit() {
    return parseRecentLimit(this.getAttribute('recent-limit'));
  }

  set recentLimit(value) {
    this.setAttribute('recent-limit', String(value));
  }

  get apiMode() {
    return safeText(this.getAttribute('api-mode')).toLowerCase();
  }

  get titleText() {
    return safeText(this.getAttribute('title')) || 'Register a collection';
  }


  get listOnlyMode() {
    return this.hasAttribute('list-only');
  }

  get introText() {
    return safeText(this.getAttribute('intro'))
      || 'Enter the URL of a collection or collection source. We will check it and add it to the registry if it is valid.';
  }

  isMockMode() {
    return this.apiMode === 'mock' || this.hasAttribute('demo');
  }

  composeRecentRequestUrl() {
    const base = this.recentUrl;
    if (!base) {
      return '';
    }
    try {
      const url = new URL(base, window.location.href);
      if (!url.searchParams.has('limit')) {
        url.searchParams.set('limit', String(this.recentLimit));
      }
      return url.toString();
    } catch (_error) {
      return base;
    }
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    const contentType = safeText(response.headers.get('content-type')).toLowerCase();
    let payload = null;
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text ? { message: text } : {};
    }
    return { response, payload };
  }

  async loadRecentItems() {
    this.state.isLoadingRecent = true;
    this.state.recentError = '';
    this.render();

    try {
      if (this.isMockMode()) {
        this.state.recentItems = this.mockRecentItems.slice(0, this.recentLimit);
        return;
      }

      const recentEndpoint = this.composeRecentRequestUrl();
      if (!recentEndpoint) {
        this.state.recentItems = [];
        this.state.recentError = 'Set recent-url to load recent registrations.';
        return;
      }

      const { response, payload } = await this.fetchJson(recentEndpoint, { method: 'GET' });
      if (!response.ok) {
        throw new Error(safeText(payload?.message) || `Could not load recent items (${response.status}).`);
      }
      this.state.recentItems = normalizeRecentItems(payload).slice(0, this.recentLimit);
    } catch (error) {
      this.state.recentItems = [];
      this.state.recentError = error.message || 'Could not load recent items.';
    } finally {
      this.state.isLoadingRecent = false;
      this.render();
    }
  }

  readUrlFromInput() {
    const input = this.shadowRoot.querySelector('#registryUrlInput');
    const value = safeText(input?.value);
    this.state.urlValue = value;
    return value;
  }

  showFeedback(type, message, warnings = []) {
    this.state.feedback = {
      type,
      message: safeText(message),
      warnings: Array.isArray(warnings)
        ? warnings.map((entry) => safeText(entry)).filter(Boolean)
        : [],
    };
  }

  async submitMock(url) {
    await new Promise((resolve) => {
      setTimeout(resolve, 260);
    });
    if (url.includes('invalid')) {
      return {
        ok: false,
        status: 'error',
        message: 'Could not validate this URL.',
      };
    }
    const now = new Date().toISOString();
    const titleFallback = (() => {
      try {
        const parsed = new URL(url);
        const slug = parsed.pathname.split('/').filter(Boolean).at(-1) || parsed.hostname;
        return slug.replace(/[-_]+/g, ' ');
      } catch (_error) {
        return 'New collection';
      }
    })();
    const item = {
      id: `demo-${Date.now()}`,
      title: `Demo: ${titleFallback}`,
      url,
      type: url.endsWith('collections.json') ? 'collections' : 'collection',
      addedAt: now,
      status: url.includes('warn') ? 'warning' : 'valid',
    };
    this.mockRecentItems = [item, ...this.mockRecentItems].slice(0, this.recentLimit);
    if (url.includes('warn')) {
      return {
        ok: true,
        status: 'warning',
        message: 'Collection registered with warnings.',
        item,
        warnings: ['Some optional metadata is missing.'],
      };
    }
    return {
      ok: true,
      status: 'valid',
      message: 'Collection registered successfully.',
      item,
      warnings: [],
    };
  }

  async onSubmit(event) {
    event.preventDefault();
    const url = this.readUrlFromInput();
    if (!url) {
      this.showFeedback('error', 'Enter a collection URL first.');
      this.render();
      return;
    }

    try {
      new URL(url);
    } catch (_error) {
      this.showFeedback('error', 'Enter a valid URL.');
      this.render();
      return;
    }

    this.state.isSubmitting = true;
    this.showFeedback('loading', 'Checking URL...');
    this.render();

    try {
      let payload = null;
      if (this.isMockMode()) {
        payload = await this.submitMock(url);
      } else {
        if (!this.submitUrl) {
          throw new Error('Set submit-url before submitting.');
        }
        const { response, payload: responsePayload } = await this.fetchJson(this.submitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });
        payload = responsePayload;
        if (!response.ok && payload?.ok !== true) {
          throw new Error(safeText(payload?.message) || `Request failed (${response.status}).`);
        }
      }

      if (payload?.ok) {
        const status = safeText(payload.status).toLowerCase();
        const message = safeText(payload.message) || 'Collection registered successfully.';
        const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
        if (status === 'warning') {
          this.showFeedback('warning', message, warnings);
        } else {
          this.showFeedback('success', message, warnings);
        }
        await this.loadRecentItems();
      } else {
        this.showFeedback('error', safeText(payload?.message) || 'Could not validate this URL.');
      }
    } catch (error) {
      this.showFeedback('error', error.message || 'Could not submit this URL.');
    } finally {
      this.state.isSubmitting = false;
      this.render();
    }
  }

  onInput(event) {
    this.state.urlValue = safeText(event.target?.value);
  }

  feedbackClassName() {
    const type = safeText(this.state.feedback?.type) || 'neutral';
    if (['success', 'warning', 'error', 'loading'].includes(type)) {
      return `feedback ${type}`;
    }
    return 'feedback';
  }

  badgeClass(status) {
    const normalized = safeText(status).toLowerCase();
    if (normalized === 'valid' || normalized === 'success') {
      return 'status-badge valid';
    }
    if (normalized === 'warning' || normalized === 'warn') {
      return 'status-badge warning';
    }
    if (normalized === 'error' || normalized === 'invalid') {
      return 'status-badge error';
    }
    return 'status-badge';
  }

  renderRecentList() {
    if (this.state.isLoadingRecent) {
      return '<p class="list-state">Loading recent registrations...</p>';
    }
    if (this.state.recentError) {
      return `<p class="list-state error">${escapeHtml(this.state.recentError)}</p>`;
    }
    if (!Array.isArray(this.state.recentItems) || this.state.recentItems.length === 0) {
      return '<p class="list-state">No recent registrations yet.</p>';
    }

    const rows = this.state.recentItems
      .slice(0, this.recentLimit)
      .map((item) => {
        const title = escapeHtml(item.title) || 'Untitled collection';
        const url = safeText(item.url);
        const escapedUrl = escapeHtml(url);
        const type = escapeHtml(item.type);
        const date = escapeHtml(toDateLabel(item.addedAt));
        const statusRaw = safeText(item.status);
        const status = escapeHtml(statusRaw);
        const meta = [type, date].filter(Boolean).join(' | ');
        const statusBadge = status ? `<span class="${this.badgeClass(statusRaw)}">${status}</span>` : '';
        const urlMarkup = url
          ? `<a class="recent-url" href="${escapedUrl}" target="_blank" rel="noopener">${escapedUrl}</a>`
          : '<span class="recent-url muted">No URL</span>';
        return `
          <li class="recent-item">
            <div class="recent-head">
              <p class="recent-title">${title}</p>
              ${statusBadge}
            </div>
            ${urlMarkup}
            ${meta ? `<p class="recent-meta">${meta}</p>` : ''}
          </li>
        `;
      })
      .join('');

    return `<ol class="recent-list">${rows}</ol>`;
  }

  render() {
    const disabled = this.state.isSubmitting ? 'disabled' : '';
    const buttonLabel = this.state.isSubmitting ? 'Checking...' : 'Check and add';
    const feedback = this.state.feedback;
    const feedbackMarkup = feedback?.message
      ? `
        <div class="${this.feedbackClassName()}" role="status" aria-live="polite">
          <p>${escapeHtml(feedback.message)}</p>
          ${
            Array.isArray(feedback.warnings) && feedback.warnings.length > 0
              ? `<ul class="warning-list">${feedback.warnings.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}</ul>`
              : ''
          }
        </div>
      `
      : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --widget-bg: #ffffff;
          --widget-border: #d8e1eb;
          --widget-text: #0f172a;
          --widget-muted: #475569;
          --widget-accent: #0f6cc6;
          --widget-accent-hover: #0d5eae;
          --widget-ok-bg: #ecfdf3;
          --widget-ok-border: #86efac;
          --widget-ok-text: #166534;
          --widget-warn-bg: #fff7ed;
          --widget-warn-border: #fdba74;
          --widget-warn-text: #9a3412;
          --widget-error-bg: #fef2f2;
          --widget-error-border: #fca5a5;
          --widget-error-text: #991b1b;
          color: var(--widget-text);
          font-family: "Segoe UI", Tahoma, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        .widget {
          border: 1px solid var(--widget-border);
          background: var(--widget-bg);
          border-radius: 12px;
          padding: 1rem;
          display: grid;
          gap: 0.9rem;
        }

        .title {
          margin: 0;
          font-size: 1.1rem;
        }

        .intro {
          margin: 0.25rem 0 0;
          color: var(--widget-muted);
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .form {
          display: grid;
          gap: 0.55rem;
        }

        label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--widget-muted);
        }

        .form-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.55rem;
        }

        input[type="url"] {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.5rem 0.6rem;
          font: inherit;
          font-size: 0.9rem;
        }

        button {
          border: 1px solid var(--widget-accent);
          background: var(--widget-accent);
          color: #ffffff;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        button:hover:enabled {
          background: var(--widget-accent-hover);
          border-color: var(--widget-accent-hover);
        }

        button:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .feedback {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.55rem 0.65rem;
          font-size: 0.88rem;
          color: var(--widget-muted);
          background: #f8fafc;
        }

        .feedback p {
          margin: 0;
        }

        .feedback.success {
          border-color: var(--widget-ok-border);
          background: var(--widget-ok-bg);
          color: var(--widget-ok-text);
        }

        .feedback.warning {
          border-color: var(--widget-warn-border);
          background: var(--widget-warn-bg);
          color: var(--widget-warn-text);
        }

        .feedback.error {
          border-color: var(--widget-error-border);
          background: var(--widget-error-bg);
          color: var(--widget-error-text);
        }

        .feedback.loading {
          border-color: #93c5fd;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .warning-list {
          margin: 0.45rem 0 0;
          padding-left: 1rem;
          display: grid;
          gap: 0.2rem;
        }

        .recent-section {
          display: grid;
          gap: 0.5rem;
        }

        .recent-heading {
          margin: 0;
          font-size: 0.95rem;
        }

        .list-state {
          margin: 0;
          color: var(--widget-muted);
          font-size: 0.88rem;
          padding: 0.35rem 0;
        }

        .list-state.error {
          color: var(--widget-error-text);
        }

        .recent-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.45rem;
        }

        .recent-item {
          border: 1px solid var(--widget-border);
          border-radius: 9px;
          padding: 0.55rem 0.6rem;
          display: grid;
          gap: 0.35rem;
        }

        .recent-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .recent-title {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .recent-url {
          margin: 0;
          color: #1d4ed8;
          text-decoration: none;
          word-break: break-all;
          font-size: 0.82rem;
        }

        .recent-url:hover {
          text-decoration: underline;
        }

        .recent-url.muted {
          color: var(--widget-muted);
        }

        .recent-meta {
          margin: 0;
          color: var(--widget-muted);
          font-size: 0.8rem;
        }

        .status-badge {
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 0.1rem 0.45rem;
          font-size: 0.74rem;
          color: #475569;
          background: #f8fafc;
          text-transform: lowercase;
        }

        .status-badge.valid {
          border-color: var(--widget-ok-border);
          background: var(--widget-ok-bg);
          color: var(--widget-ok-text);
        }

        .status-badge.warning {
          border-color: var(--widget-warn-border);
          background: var(--widget-warn-bg);
          color: var(--widget-warn-text);
        }

        .status-badge.error {
          border-color: var(--widget-error-border);
          background: var(--widget-error-bg);
          color: var(--widget-error-text);
        }

        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      </style>
      <section class="widget">
        <header>
          ${this.listOnlyMode ? '' : `<h2 class="title">${escapeHtml(this.titleText)}</h2>`}
          ${this.introText ? `<p class="intro">${escapeHtml(this.introText)}</p>` : ''}
        </header>
        ${
          this.listOnlyMode
            ? ''
            : `
                <form class="form" id="registryForm">
                  <label for="registryUrlInput">Collection URL</label>
                  <div class="form-row">
                    <input
                      id="registryUrlInput"
                      name="registryUrl"
                      type="url"
                      placeholder="https://example.org/my-collection/collection.json"
                      value="${escapeHtml(this.state.urlValue)}"
                      required
                    />
                    <button type="submit" ${disabled}>${buttonLabel}</button>
                  </div>
                </form>
                ${feedbackMarkup}
              `
        }
        <section class="recent-section" aria-live="polite">
          <h3 class="recent-heading">Recently added</h3>
          ${this.renderRecentList()}
        </section>
      </section>
    `;

    const form = this.shadowRoot.querySelector('#registryForm');
    const input = this.shadowRoot.querySelector('#registryUrlInput');
    if (!this.listOnlyMode) {
      form?.addEventListener('submit', (event) => {
        this.onSubmit(event).catch(() => {});
      });
      input?.addEventListener('input', (event) => this.onInput(event));
    }
  }
}

if (!customElements.get('open-collections-registry-widget')) {
  customElements.define('open-collections-registry-widget', OpenCollectionsRegistryWidgetElement);
}
