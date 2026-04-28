<?php
/**
 * Plugin Name: WMMA Manager Reporting
 * Description: Shortcode-based weekly manager reporting form for the Blaze Real Estate Weekly Manager Meeting Automation system.
 * Version: 1.0.0
 * Author: Blaze Real Estate
 * Text Domain: wmma-manager-reporting
 */

if (!defined('ABSPATH')) {
    exit;
}

final class WMMA_Manager_Reporting_Plugin
{
    const VERSION = '1.0.0';
    const OPTION_WEBHOOK_URL = 'wmma_manager_reporting_webhook_url';

    public function __construct()
    {
        add_action('admin_menu', [$this, 'register_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_enqueue_scripts', [$this, 'register_assets']);
        add_shortcode('wmma_manager_report', [$this, 'render_shortcode']);
    }

    public function register_settings_page(): void
    {
        add_options_page(
            'WMMA Manager Reporting',
            'WMMA Manager Reporting',
            'manage_options',
            'wmma-manager-reporting',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings(): void
    {
        register_setting(
            'wmma_manager_reporting_settings',
            self::OPTION_WEBHOOK_URL,
            [
                'type' => 'string',
                'sanitize_callback' => 'esc_url_raw',
                'default' => '',
            ]
        );
    }

    public function render_settings_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1>WMMA Manager Reporting</h1>
            <p>Configure the n8n webhook endpoint used by the weekly manager reporting form.</p>
            <form method="post" action="options.php">
                <?php settings_fields('wmma_manager_reporting_settings'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="<?php echo esc_attr(self::OPTION_WEBHOOK_URL); ?>">n8n Webhook URL</label>
                        </th>
                        <td>
                            <input
                                type="url"
                                class="regular-text"
                                id="<?php echo esc_attr(self::OPTION_WEBHOOK_URL); ?>"
                                name="<?php echo esc_attr(self::OPTION_WEBHOOK_URL); ?>"
                                value="<?php echo esc_attr(get_option(self::OPTION_WEBHOOK_URL, '')); ?>"
                                placeholder="https://n8n.example.com/webhook/manager-weekly-report-intake"
                            />
                            <p class="description">The form posts canonical WMMA JSON to this endpoint.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function register_assets(): void
    {
        wp_register_style(
            'wmma-manager-reporting',
            plugin_dir_url(__FILE__) . 'assets/wmma-manager-reporting.css',
            [],
            self::VERSION
        );

        wp_register_script(
            'wmma-manager-reporting',
            plugin_dir_url(__FILE__) . 'assets/wmma-manager-reporting.js',
            [],
            self::VERSION,
            true
        );
    }

    public function render_shortcode(): string
    {
        $webhook_url = get_option(self::OPTION_WEBHOOK_URL, '');

        wp_enqueue_style('wmma-manager-reporting');
        wp_enqueue_script('wmma-manager-reporting');

        wp_localize_script(
            'wmma-manager-reporting',
            'WMMA_MANAGER_REPORTING_CONFIG',
            [
                'webhookUrl' => esc_url_raw($webhook_url),
            ]
        );

        ob_start();
        ?>
        <div class="wmma-reporting-app" data-wmma-reporting-app>
            <noscript>This form requires JavaScript.</noscript>
        </div>
        <?php
        return ob_get_clean();
    }
}

new WMMA_Manager_Reporting_Plugin();
