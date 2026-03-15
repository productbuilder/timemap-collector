const NAV_ITEMS = [
	{ key: 'home', label: 'Home', href: '' },
	{ key: 'get-started', label: 'Get started', href: 'site/get-started/' },
	{ key: 'tools', label: 'Tools', href: 'site/tools/' },
	{ key: 'hosting', label: 'Hosting', href: 'site/hosting/' },
	{ key: 'docs', label: 'Docs', href: 'site/docs/' },
];

const FOOTER_GROUPS = [
	{
		title: 'Project',
		links: [
			{ label: 'Home', href: '' },
			{ label: 'Get started', href: 'site/get-started/' },
			{ label: 'Tools', href: 'site/tools/' },
		],
	},
	{
		title: 'Docs and developer',
		links: [
			{ label: 'Docs', href: 'site/docs/' },
			{ label: 'Hosting', href: 'site/hosting/' },
		],
	},
	{
		title: 'Collections',
		links: [
			{ label: 'Registry', href: 'site/registry/' },
			{ label: 'Organizations', href: '#organizations-using-open-collections' },
		],
	},
];

const toBasePath = (value) => {
	if (!value) {
		return './';
	}
	return value.endsWith('/') ? value : `${value}/`;
};

class OpenCollectionsSiteHeader extends HTMLElement {
	connectedCallback() {
		const basePath = toBasePath(this.getAttribute('base-path'));
		const activePage = this.getAttribute('active-page');

		const navLinks = NAV_ITEMS.map((item) => {
			const isActive = item.key === activePage;
			const classes = isActive ? ' class="is-active"' : '';
			const currentPage = isActive ? ' aria-current="page"' : '';
			return `<a href="${basePath}${item.href}"${classes}${currentPage}>${item.label}</a>`;
		}).join('');

		this.innerHTML = `
			<div class="site-header">
				<div class="site-header-inner">
					<div class="site-brand">Open Collections</div>
					<nav class="site-nav" aria-label="Primary navigation">${navLinks}</nav>
				</div>
			</div>
		`;
	}
}

class OpenCollectionsSiteFooter extends HTMLElement {
	connectedCallback() {
		const basePath = toBasePath(this.getAttribute('base-path'));
		const footerGroups = FOOTER_GROUPS.map((group) => {
			const links = group.links
				.map((item) => `<a href="${basePath}${item.href}">${item.label}</a>`)
				.join('');
			return `
				<div class="site-footer-group">
					<h2>${group.title}</h2>
					<nav class="site-footer-nav" aria-label="${group.title}">${links}</nav>
				</div>
			`;
		}).join('');

		this.innerHTML = `
			<footer class="site-footer">
				<div class="site-footer-inner">
					<div class="site-footer-brand-block">
						<p class="site-footer-text">Open Collections</p>
						<p class="site-footer-description">An open, web-based approach to publishing and sharing cultural collections.</p>
					</div>
					<div class="site-footer-links-grid">${footerGroups}</div>
				</div>
			</footer>
		`;
	}
}

customElements.define('open-collections-site-header', OpenCollectionsSiteHeader);
customElements.define('open-collections-site-footer', OpenCollectionsSiteFooter);
