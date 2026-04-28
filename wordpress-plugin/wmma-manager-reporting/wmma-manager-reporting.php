<?php
/**
 * Plugin Name: Blaze Manager Weekly Report Form
 * Description: Staff-only shortcode form for submitting the Manager Weekly Report to n8n.
 * Version: 1.1.0
 * Author: Blaze Real Estate
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Blaze_Manager_Weekly_Report_Form {
    const VERSION = '1.1.0';
    const OPTION_WEBHOOK_URL = 'blaze_manager_weekly_report_webhook_url';

    public function __construct() {
        add_shortcode('manager_weekly_report_form', [$this, 'render_shortcode']);
        add_action('wp_enqueue_scripts', [$this, 'register_assets']);
        add_action('admin_menu', [$this, 'register_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
    }

    public function register_assets() {
        $base = plugin_dir_url(__FILE__);
        wp_register_style(
            'blaze-manager-weekly-report-form',
            $base . 'assets/manager-weekly-report-form.css',
            [],
            self::VERSION
        );

        wp_register_script(
            'blaze-manager-weekly-report-form',
            $base . 'assets/manager-weekly-report-form.js',
            [],
            self::VERSION,
            true
        );
    }

    public function render_shortcode($atts = []) {
        if (!is_user_logged_in()) {
            return '';
        }

        $atts = shortcode_atts([
            'debug' => '0',
            'webhook_url' => '',
        ], $atts, 'manager_weekly_report_form');

        $debug = in_array(strtolower((string) $atts['debug']), ['1', 'true', 'yes', 'on'], true);
        $webhook_url = trim((string) $atts['webhook_url']);

        if ($webhook_url === '') {
            $webhook_url = trim((string) get_option(self::OPTION_WEBHOOK_URL, ''));
        }

        wp_enqueue_style('blaze-manager-weekly-report-form');
        wp_enqueue_script('blaze-manager-weekly-report-form');

        wp_localize_script('blaze-manager-weekly-report-form', 'BlazeManagerWeeklyReportConfig', [
            'webhookUrl' => esc_url_raw($webhook_url),
            'debugPreview' => $debug,
            'portfolioMap' => [
                'Breanna' => ['Courtyard', 'Adobe', 'NorthPark'],
                'Amy' => ['Jefferson', 'Riveredge', 'Crosskeys'],
                'Debbie' => ['Sagebrush'],
                'Dede' => ['Westminster', 'Broadstone', 'Nelson'],
                'Shelbie/Chris' => ['Oak Terrace'],
                'Ashlie' => ['Single Families and Small Multi'],
            ],
            'messages' => [
                'noManager' => 'Select a manager to load assigned properties.',
                'noWebhook' => 'Form is valid. No webhook URL is configured yet, so this run stops at payload preview.',
                'validationFailed' => 'Form validation failed. Fix the highlighted fields and submit again.',
                'success' => 'Weekly report submitted successfully.',
                'deadlineLabel' => 'Submit by Monday at 10:00 AM local time.',
                'lateWarning' => 'You are past the Monday 10:00 AM deadline. Submit now anyway so leadership has a baseline, but expect this report to be flagged late.',
                'instructionsIntro' => 'Complete one property card for every property assigned to you for the selected reporting week.',
            ],
        ]);

        ob_start();
        ?>
        <div class="blaze-mwrf-app" data-debug-preview="<?php echo esc_attr($debug ? '1' : '0'); ?>">
          <section class="blaze-mwrf-hero blaze-mwrf-card">
            <h1>Manager Weekly Report</h1>
            <p>Submit one Monday baseline report covering every property assigned to the selected manager for that reporting week.</p>
            <div class="blaze-mwrf-deadline-box">
              <strong>Deadline:</strong> Monday by 10:00 AM local time.
            </div>
            <div class="blaze-mwrf-instructions">
              <h2>Before you submit</h2>
              <ul>
                <li>Complete every assigned property card for the selected week.</li>
                <li>Use current numbers for vacants, delinquency, turns, and aging work orders.</li>
                <li>Keep Biggest Issue and Help Needed short, specific, and useful.</li>
                <li>Vacant Units must equal Ready Vacants plus Not Ready Vacants.</li>
              </ul>
            </div>
          </section>

          <form class="blaze-mwrf-form" novalidate>
            <section class="blaze-mwrf-card">
              <div class="blaze-mwrf-banner" data-role="global-banner"></div>
              <div class="blaze-mwrf-grid">
                <div class="blaze-mwrf-span-6">
                  <label for="blaze_mwrf_manager_name">Manager</label>
                  <select id="blaze_mwrf_manager_name" name="manager_name" required>
                    <option value="">Select manager</option>
                  </select>
                  <div class="blaze-mwrf-hint">Controlled list only.</div>
                  <div class="blaze-mwrf-error" data-error-for="manager_name"></div>
                </div>

                <div class="blaze-mwrf-span-6">
                  <label for="blaze_mwrf_week_start_date">Reporting Week (Monday)</label>
                  <input id="blaze_mwrf_week_start_date" name="week_start_date" type="date" required />
                  <div class="blaze-mwrf-hint">Must be the Monday anchor date.</div>
                  <div class="blaze-mwrf-error" data-error-for="week_start_date"></div>
                </div>
              </div>
            </section>

            <section class="blaze-mwrf-card">
              <h2>Assigned Properties</h2>
              <div data-role="property-cards"></div>
            </section>

            <section class="blaze-mwrf-card">
              <h2>Submission</h2>
              <div class="blaze-mwrf-actions">
                <button class="blaze-mwrf-primary" type="submit">Submit Weekly Report</button>
                <button class="blaze-mwrf-secondary" type="button" data-role="preview-btn">Preview Payload</button>
                <button class="blaze-mwrf-secondary" type="button" data-role="reset-btn">Reset Form</button>
              </div>
              <div class="blaze-mwrf-footer-note">The frontend sends canonical field names only. <code>late_submission</code>, <code>id</code>, and <code>created_at</code> are not frontend-authored.</div>
            </section>
          </form>

          <section class="blaze-mwrf-card blaze-mwrf-preview-section<?php echo $debug ? '' : ' blaze-mwrf-hidden'; ?>" data-role="preview-section">
            <h2>Payload Preview</h2>
            <div class="blaze-mwrf-mono" data-role="payload-preview">{}</div>
          </section>
        </div>
        <?php
        return ob_get_clean();
    }

    public function register_settings_page() {
        add_options_page(
            'Manager Weekly Report Form',
            'Manager Weekly Report Form',
            'manage_options',
            'blaze-manager-weekly-report-form',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting(
            'blaze_manager_weekly_report_form',
            self::OPTION_WEBHOOK_URL,
            [
                'type' => 'string',
                'sanitize_callback' => 'esc_url_raw',
                'default' => '',
            ]
        );

        add_settings_section(
            'blaze_manager_weekly_report_main',
            'Form Settings',
            function () {
                echo '<p>Set the n8n webhook URL used by the weekly report form.</p>';
            },
            'blaze-manager-weekly-report-form'
        );

        add_settings_field(
            self::OPTION_WEBHOOK_URL,
            'Webhook URL',
            [$this, 'render_webhook_url_field'],
            'blaze-manager-weekly-report-form',
            'blaze_manager_weekly_report_main'
        );
    }

    public function render_webhook_url_field() {
        $value = (string) get_option(self::OPTION_WEBHOOK_URL, '');
        printf(
            '<input type="url" class="regular-text code" name="%1$s" value="%2$s" placeholder="https://n8n.example.com/webhook/manager-weekly-report-intake" />',
            esc_attr(self::OPTION_WEBHOOK_URL),
            esc_attr($value)
        );
    }

    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
          <h1>Manager Weekly Report Form</h1>
          <form method="post" action="options.php">
            <?php
            settings_fields('blaze_manager_weekly_report_form');
            do_settings_sections('blaze-manager-weekly-report-form');
            submit_button();
            ?>
          </form>
          <hr />
          <p><strong>Shortcode:</strong> <code>[manager_weekly_report_form]</code></p>
          <p><strong>Debug Preview:</strong> <code>[manager_weekly_report_form debug="1"]</code></p>
          <p><strong>Override Webhook per page:</strong> <code>[manager_weekly_report_form webhook_url="https://example.com/webhook/path"]</code></p>
        </div>
        <?php
    }
}

new Blaze_Manager_Weekly_Report_Form();
