<?php
/**
 * Plugin Name:       Open Collections for WordPress
 * Plugin URI:        https://example.org/open-collections
 * Description:       Integration layer that embeds Collection Manager and maps WordPress configuration to Open Collections Protocol outputs.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Open Collections Protocol Contributors
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       open-collections
 */

if (! defined('ABSPATH')) {
    exit;
}

define('OPEN_COLLECTIONS_PLUGIN_FILE', __FILE__);
define('OPEN_COLLECTIONS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('OPEN_COLLECTIONS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('OPEN_COLLECTIONS_VERSION', '0.1.0');

require_once OPEN_COLLECTIONS_PLUGIN_DIR . 'includes/class-open-collections-plugin.php';
require_once OPEN_COLLECTIONS_PLUGIN_DIR . 'includes/class-open-collections-settings.php';
require_once OPEN_COLLECTIONS_PLUGIN_DIR . 'includes/class-open-collections-admin.php';
require_once OPEN_COLLECTIONS_PLUGIN_DIR . 'includes/class-open-collections-embed.php';

Open_Collections_Plugin::instance()->boot();
