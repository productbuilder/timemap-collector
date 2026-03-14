const DOCS_NAV_ITEMS = [
	{ href: './', label: 'Overview' },
	{ href: './get-started.html', label: 'Get started' },
	{ href: './open-collections-protocol.html', label: 'Protocol' },
	{ href: './optional-collection-access-capabilities.html', label: 'Optional capabilities' },
	{ href: './hosting-and-storage.html', label: 'Hosting and storage' },
	{ href: './tools-overview.html', label: 'Tools overview' },
	{ href: './components-and-embedding.html', label: 'Components and embedding' },
	{ href: './wordpress-integration.html', label: 'WordPress integration' },
	{ href: './collection-registry-and-indexer.html', label: 'Registry and indexer' },
	{ href: './developer-reference.html', label: 'Developer reference' }
];

const normalizePath = (path) => (path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path);

const currentPath = normalizePath(window.location.pathname);

for (const mount of document.querySelectorAll('[data-docs-nav]')) {
	for (const item of DOCS_NAV_ITEMS) {
		const link = document.createElement('a');
		link.href = item.href;
		link.textContent = item.label;

		const resolved = normalizePath(new URL(item.href, window.location.href).pathname);
		if (resolved === currentPath) {
			link.classList.add('is-active');
			link.setAttribute('aria-current', 'page');
		}

		mount.append(link);
	}
}
