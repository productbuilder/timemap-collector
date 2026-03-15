const WIDGET_TEMPLATE = document.createElement('template');

WIDGET_TEMPLATE.innerHTML = `
	<style>
		:host {
			display: block;
			font-family: var(--site-font-family, "Segoe UI", Tahoma, sans-serif);
			color: var(--site-text-color, #111827);
		}

		.widget-shell {
			display: grid;
			gap: 1rem;
		}

		.widget-panel {
			background: #ffffff;
			border: 1px solid #e5e7eb;
			border-radius: 0.5rem;
			padding: 1rem;
			display: grid;
			gap: 0.75rem;
		}

		h3 {
			margin: 0;
			font-size: 1.1rem;
		}

		p {
			margin: 0;
			color: #334155;
		}

		form {
			display: grid;
			gap: 0.65rem;
		}

		label {
			font-weight: 600;
		}

		input[type='url'] {
			width: 100%;
			padding: 0.55rem 0.6rem;
			border: 1px solid #cbd5e1;
			border-radius: 0.35rem;
			font-size: 1rem;
		}

		button {
			justify-self: start;
			padding: 0.5rem 0.8rem;
			border: 0;
			border-radius: 0.35rem;
			background: #0369a1;
			color: #ffffff;
			font-weight: 600;
			cursor: pointer;
		}

		button[disabled] {
			opacity: 0.75;
			cursor: wait;
		}

		.feedback {
			padding: 0.55rem 0.65rem;
			border-radius: 0.35rem;
			font-size: 0.95rem;
		}

		.feedback[data-kind='success'] {
			background: #dcfce7;
			color: #14532d;
		}

		.feedback[data-kind='warning'] {
			background: #fef3c7;
			color: #78350f;
		}

		.feedback[data-kind='error'] {
			background: #fee2e2;
			color: #7f1d1d;
		}

		.recent-list {
			margin: 0;
			padding-left: 1.2rem;
			display: grid;
			gap: 0.3rem;
		}

		.muted {
			color: #64748b;
			font-size: 0.95rem;
		}
	</style>

	<div class="widget-shell">
		<section class="widget-panel">
			<h3>Submit a collection URL</h3>
			<p>Enter a collection URL or a source URL to request registration.</p>
			<form>
				<label for="registry-url">Collection URL</label>
				<input id="registry-url" type="url" name="url" required placeholder="https://example.org/collection.json" />
				<button type="submit">Submit URL</button>
			</form>
			<div class="feedback" hidden></div>
		</section>

		<section class="widget-panel" aria-live="polite">
			<h3>Recent additions</h3>
			<p class="muted">Most recently registered collections.</p>
			<div class="recent-state muted">Loading recent additions…</div>
			<ol class="recent-list" hidden></ol>
		</section>
	</div>
`;

const defaultMessage = {
	success: 'URL submitted successfully. It will be reviewed and added when valid.',
	warning: 'URL submitted, but there are checks to complete before it can be added.',
	error: 'We could not submit that URL right now. Please try again in a moment.',
};

class OpenCollectionsRegistryWidget extends HTMLElement {
	connectedCallback() {
		if (this.shadowRoot) {
			return;
		}

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.append(WIDGET_TEMPLATE.content.cloneNode(true));

		this.form = this.shadowRoot.querySelector('form');
		this.urlInput = this.shadowRoot.querySelector('input[name="url"]');
		this.submitButton = this.shadowRoot.querySelector('button[type="submit"]');
		this.feedback = this.shadowRoot.querySelector('.feedback');
		this.recentState = this.shadowRoot.querySelector('.recent-state');
		this.recentList = this.shadowRoot.querySelector('.recent-list');

		this.form.addEventListener('submit', (event) => {
			event.preventDefault();
			this.submitUrl();
		});

		this.loadRecent();
	}

	get submitUrlEndpoint() {
		return this.getAttribute('submit-url') || '';
	}

	get recentUrlEndpoint() {
		return this.getAttribute('recent-url') || '';
	}

	get recentLimit() {
		const limit = Number.parseInt(this.getAttribute('recent-limit') || '5', 10);
		return Number.isNaN(limit) ? 5 : limit;
	}

	setFeedback(kind, message) {
		this.feedback.hidden = false;
		this.feedback.dataset.kind = kind;
		this.feedback.textContent = message;
	}

	async submitUrl() {
		const targetUrl = this.urlInput.value.trim();
		if (!targetUrl) {
			return;
		}

		this.submitButton.disabled = true;
		this.feedback.hidden = true;

		try {
			const response = await fetch(this.submitUrlEndpoint, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url: targetUrl }),
			});

			const payload = await response.json().catch(() => ({}));
			const status = payload.status || (response.ok ? 'success' : 'error');
			const message = payload.message || defaultMessage[status] || defaultMessage.error;
			this.setFeedback(status, message);
			if (response.ok) {
				this.urlInput.value = '';
				this.loadRecent();
			}
		} catch (error) {
			this.setFeedback('error', defaultMessage.error);
		} finally {
			this.submitButton.disabled = false;
		}
	}

	async loadRecent() {
		if (!this.recentUrlEndpoint) {
			this.recentState.textContent = 'Recent additions are not configured yet.';
			return;
		}

		this.recentState.hidden = false;
		this.recentState.textContent = 'Loading recent additions…';
		this.recentList.hidden = true;

		try {
			const response = await fetch(this.recentUrlEndpoint, { method: 'GET' });
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const payload = await response.json();
			const items = Array.isArray(payload.items) ? payload.items.slice(0, this.recentLimit) : [];
			if (!items.length) {
				this.recentState.textContent = 'No collections have been registered yet.';
				return;
			}

			this.recentList.innerHTML = items
				.map((item) => {
					const url = item.url || item.collectionUrl || '';
					const label = item.name || item.title || url;
					if (!url) {
						return `<li>${label}</li>`;
					}
					return `<li><a href="${url}" target="_blank" rel="noopener">${label}</a></li>`;
				})
				.join('');
			this.recentState.hidden = true;
			this.recentList.hidden = false;
		} catch (error) {
			this.recentState.textContent = 'Recent additions are temporarily unavailable.';
		}
	}
}

if (!customElements.get('open-collections-registry-widget')) {
	customElements.define('open-collections-registry-widget', OpenCollectionsRegistryWidget);
}
