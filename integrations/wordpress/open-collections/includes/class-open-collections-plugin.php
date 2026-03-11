<?php

if (! defined('ABSPATH')) {
    exit;
}

class Open_Collections_Plugin
{
    /**
     * @var Open_Collections_Plugin|null
     */
    private static $instance = null;

    /**
     * @var Open_Collections_Settings
     */
    private $settings;

    /**
     * @var Open_Collections_Admin
     */
    private $admin;

    /**
     * @var Open_Collections_Embed
     */
    private $embed;

    /**
     * @return Open_Collections_Plugin
     */
    public static function instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Boot plugin services.
     */
    public function boot()
    {
        $this->settings = new Open_Collections_Settings();
        $this->admin = new Open_Collections_Admin($this->settings);
        $this->embed = new Open_Collections_Embed($this->settings);

        add_action('admin_init', array($this->settings, 'register_settings'));
        add_action('admin_menu', array($this->admin, 'register_admin_menu'));
        add_action('admin_enqueue_scripts', array($this->admin, 'enqueue_admin_assets'));

        add_shortcode('open_collections_manager', array($this->embed, 'render_shortcode'));
        add_action('wp_enqueue_scripts', array($this->embed, 'register_frontend_assets'));
    }
}
