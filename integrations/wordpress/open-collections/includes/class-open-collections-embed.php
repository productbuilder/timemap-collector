<?php

if (! defined('ABSPATH')) {
    exit;
}

class Open_Collections_Embed
{
    /**
     * @var Open_Collections_Settings
     */
    private $settings;

    /**
     * @param Open_Collections_Settings $settings
     */
    public function __construct($settings)
    {
        $this->settings = $settings;
    }

    public function register_frontend_assets()
    {
        wp_register_script(
            'open-collections-manager-embed',
            OPEN_COLLECTIONS_PLUGIN_URL . 'assets/js/collection-manager-embed.js',
            array(),
            OPEN_COLLECTIONS_VERSION,
            true
        );

        wp_localize_script(
            'open-collections-manager-embed',
            'OpenCollectionsConfig',
            array(
                'mountSelector' => '.open-collections-shortcode-root',
                'manager' => array(
                    'bundleUrl' => $this->settings->get_options()['manager_bundle_url'],
                    'mountMode' => 'shortcode',
                ),
            )
        );
    }

    /**
     * Shortcode: [open_collections_manager]
     *
     * First-pass embed path for Collection Manager in front-end or restricted pages.
     */
    public function render_shortcode($atts)
    {
        $atts = shortcode_atts(
            array(
                'context' => 'wordpress-shortcode',
            ),
            $atts,
            'open_collections_manager'
        );

        wp_enqueue_script('open-collections-manager-embed');

        return sprintf(
            '<div class="open-collections-shortcode-root" data-ocp-context="%s"></div>',
            esc_attr($atts['context'])
        );
    }
}
