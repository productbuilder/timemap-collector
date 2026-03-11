(function () {
  function safeParseConfig() {
    if (typeof window.OpenCollectionsConfig === 'undefined') {
      return {};
    }

    return window.OpenCollectionsConfig;
  }

  function mountStub(config) {
    var selector = config.mountSelector || '.open-collections-shortcode-root';
    var nodes = document.querySelectorAll(selector);

    nodes.forEach(function (node) {
      if (node.dataset.ocpMounted === '1') {
        return;
      }

      node.dataset.ocpMounted = '1';

      // First-pass scaffold: expose JSON config on the page so Collection Manager can
      // eventually boot with one stable config contract from WordPress.
      var pre = document.createElement('pre');
      pre.className = 'open-collections-config-preview';
      pre.textContent = 'Collection Manager mount scaffold\n' + JSON.stringify(config, null, 2);
      node.appendChild(pre);

      // Future direction:
      // 1) Load the configured manager bundle URL.
      // 2) Pass `config` to Collection Manager init (custom element props / init API).
      // 3) Keep protocol-facing route behavior in WordPress and publishing logic in manager/provider modules.
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      mountStub(safeParseConfig());
    });
  } else {
    mountStub(safeParseConfig());
  }
})();
