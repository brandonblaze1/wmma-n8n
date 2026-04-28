(() => {
  'use strict';

  const config = window.BlazeManagerWeeklyReportConfig || {};
  const portfolioMap = config.portfolioMap || {};
  const messages = config.messages || {};

  const numericFields = [
    'vacant_units',
    'ready_vacants',
    'not_ready_vacants',
    'delinquent_count',
    'delinquent_amount',
    'turns_in_progress',
    'work_orders_over_7_days'
  ];

  const requiredTextFields = [
    'biggest_issue_text',
    'help_needed_text'
  ];

  const fieldLabels = {
    vacant_units: 'Vacant Units',
    ready_vacants: 'Ready Vacants',
    not_ready_vacants: 'Not Ready Vacants',
    delinquent_count: 'Delinquent Count',
    delinquent_amount: 'Delinquent Amount',
    turns_in_progress: 'Turns in Progress',
    work_orders_over_7_days: 'Work Orders Over 7 Days',
    biggest_issue_text: 'Biggest Issue',
    help_needed_text: 'Help Needed',
    struggling_units_text: 'Struggling Units / Leasing Notes'
  };

  function isMonday(dateString) {
    if (!dateString) return false;
    const date = new Date(`${dateString}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date.getDay() === 1;
  }

  function toNumber(value) {
    if (value === '' || value === null || value === undefined) return NaN;
    return Number(value);
  }

  function moneyValue(value) {
    const number = toNumber(value);
    if (Number.isNaN(number)) return NaN;
    return Math.round(number * 100) / 100;
  }

  function setText(node, value) {
    if (node) node.textContent = value || '';
  }

  function clearErrors(root) {
    root.querySelectorAll('.blaze-mwrf-error').forEach((el) => {
      el.textContent = '';
    });
    root.querySelectorAll('.blaze-mwrf-invalid').forEach((el) => {
      el.classList.remove('blaze-mwrf-invalid');
    });
  }

  function setFieldError(root, fieldName, message, propertyIndex = null) {
    const selector = propertyIndex === null
      ? `[data-error-for="${fieldName}"]`
      : `[data-error-for="properties.${propertyIndex}.${fieldName}"]`;

    const errorEl = root.querySelector(selector);
    setText(errorEl, message);

    const inputName = propertyIndex === null
      ? fieldName
      : `properties[${propertyIndex}][${fieldName}]`;

    const input = root.querySelector(`[name="${CSS.escape(inputName)}"]`);
    if (input) input.classList.add('blaze-mwrf-invalid');
  }

  function buildPropertyCard(propertyName, index) {
    const card = document.createElement('article');
    card.className = 'blaze-mwrf-property-card';
    card.dataset.propertyIndex = String(index);
    card.dataset.propertyName = propertyName;

    card.innerHTML = `
      <header class="blaze-mwrf-property-header">
        <h3>${escapeHtml(propertyName)}</h3>
        <input type="hidden" name="properties[${index}][property_name]" value="${escapeHtml(propertyName)}" />
      </header>

      <div class="blaze-mwrf-grid">
        ${numberInput(index, 'vacant_units')}
        ${numberInput(index, 'ready_vacants')}
        ${numberInput(index, 'not_ready_vacants')}
        ${numberInput(index, 'delinquent_count')}
        ${numberInput(index, 'delinquent_amount', '0.01')}
        ${numberInput(index, 'turns_in_progress')}
        ${numberInput(index, 'work_orders_over_7_days')}
      </div>

      <div class="blaze-mwrf-grid blaze-mwrf-text-grid">
        ${textareaInput(index, 'biggest_issue_text', true)}
        ${textareaInput(index, 'help_needed_text', true)}
        ${textareaInput(index, 'struggling_units_text', false)}
      </div>
    `;

    return card;
  }

  function numberInput(index, fieldName, step = '1') {
    const inputName = `properties[${index}][${fieldName}]`;
    return `
      <div class="blaze-mwrf-span-3">
        <label>${fieldLabels[fieldName]}</label>
        <input name="${inputName}" type="number" min="0" step="${step}" inputmode="decimal" required />
        <div class="blaze-mwrf-error" data-error-for="properties.${index}.${fieldName}"></div>
      </div>
    `;
  }

  function textareaInput(index, fieldName, required) {
    const inputName = `properties[${index}][${fieldName}]`;
    return `
      <div class="blaze-mwrf-span-4">
        <label>${fieldLabels[fieldName]}${required ? '' : ' <span class="blaze-mwrf-muted">(optional)</span>'}</label>
        <textarea name="${inputName}" rows="3" ${required ? 'required' : ''}></textarea>
        <div class="blaze-mwrf-error" data-error-for="properties.${index}.${fieldName}"></div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getPropertyRows(root) {
    return [...root.querySelectorAll('.blaze-mwrf-property-card')].map((card, index) => {
      const row = {
        property_name: card.dataset.propertyName || ''
      };

      for (const field of numericFields) {
        const input = card.querySelector(`[name="properties[${index}][${field}]"]`);
        row[field] = field === 'delinquent_amount'
          ? moneyValue(input ? input.value : '')
          : toNumber(input ? input.value : '');
      }

      for (const field of requiredTextFields) {
        const input = card.querySelector(`[name="properties[${index}][${field}]"]`);
        row[field] = input ? input.value.trim() : '';
      }

      const struggling = card.querySelector(`[name="properties[${index}][struggling_units_text]"]`);
      row.struggling_units_text = struggling ? struggling.value.trim() : '';

      return row;
    });
  }

  function validate(root) {
    clearErrors(root);

    const managerName = root.querySelector('[name="manager_name"]')?.value || '';
    const weekStartDate = root.querySelector('[name="week_start_date"]')?.value || '';
    const propertyRows = getPropertyRows(root);
    let valid = true;

    if (!managerName) {
      setFieldError(root, 'manager_name', 'Manager is required.');
      valid = false;
    }

    if (!weekStartDate) {
      setFieldError(root, 'week_start_date', 'Reporting week is required.');
      valid = false;
    } else if (!isMonday(weekStartDate)) {
      setFieldError(root, 'week_start_date', 'Reporting week must be a Monday.');
      valid = false;
    }

    if (propertyRows.length === 0) {
      showBanner(root, messages.noManager || 'Select a manager to load assigned properties.', 'warning');
      valid = false;
    }

    propertyRows.forEach((row, index) => {
      for (const field of numericFields) {
        const value = row[field];
        if (Number.isNaN(value) || value < 0) {
          setFieldError(root, field, `${fieldLabels[field]} must be zero or greater.`, index);
          valid = false;
        }
      }

      if (!Number.isNaN(row.vacant_units) && !Number.isNaN(row.ready_vacants) && !Number.isNaN(row.not_ready_vacants)) {
        if (row.vacant_units !== row.ready_vacants + row.not_ready_vacants) {
          setFieldError(root, 'vacant_units', 'Vacant Units must equal Ready Vacants plus Not Ready Vacants.', index);
          valid = false;
        }
      }

      for (const field of requiredTextFields) {
        if (!row[field]) {
          setFieldError(root, field, `${fieldLabels[field]} is required.`, index);
          valid = false;
        }
      }
    });

    if (!valid) {
      showBanner(root, messages.validationFailed || 'Form validation failed. Fix the highlighted fields and submit again.', 'error');
    }

    return valid;
  }

  function buildPayload(root) {
    return {
      manager_name: root.querySelector('[name="manager_name"]')?.value || '',
      week_start_date: root.querySelector('[name="week_start_date"]')?.value || '',
      submitted_at: new Date().toISOString(),
      properties: getPropertyRows(root)
    };
  }

  function renderManagerOptions(root) {
    const managerSelect = root.querySelector('[name="manager_name"]');
    if (!managerSelect) return;

    for (const managerName of Object.keys(portfolioMap)) {
      const option = document.createElement('option');
      option.value = managerName;
      option.textContent = managerName;
      managerSelect.appendChild(option);
    }
  }

  function renderPropertyCards(root) {
    const managerName = root.querySelector('[name="manager_name"]')?.value || '';
    const target = root.querySelector('[data-role="property-cards"]');
    if (!target) return;

    target.innerHTML = '';
    const properties = portfolioMap[managerName] || [];

    if (!managerName) {
      target.innerHTML = `<div class="blaze-mwrf-empty">${escapeHtml(messages.noManager || 'Select a manager to load assigned properties.')}</div>`;
      return;
    }

    if (!properties.length) {
      target.innerHTML = '<div class="blaze-mwrf-empty">No assigned properties found for this manager.</div>';
      return;
    }

    properties.forEach((propertyName, index) => {
      target.appendChild(buildPropertyCard(propertyName, index));
    });
  }

  function showBanner(root, message, type = 'info') {
    const banner = root.querySelector('[data-role="global-banner"]');
    if (!banner) return;
    banner.textContent = message || '';
    banner.className = `blaze-mwrf-banner blaze-mwrf-banner-${type}`;
    banner.hidden = !message;
  }

  function updatePreview(root) {
    const preview = root.querySelector('[data-role="payload-preview"]');
    const section = root.querySelector('[data-role="preview-section"]');
    if (!preview || !section) return;

    preview.textContent = JSON.stringify(buildPayload(root), null, 2);
    section.classList.remove('blaze-mwrf-hidden');
  }

  async function submitPayload(root) {
    const payload = buildPayload(root);
    const webhookUrl = String(config.webhookUrl || '').trim();

    updatePreview(root);

    if (!webhookUrl) {
      showBanner(root, messages.noWebhook || 'No webhook URL configured.', 'warning');
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook returned HTTP ${response.status}`);
    }

    showBanner(root, messages.success || 'Weekly report submitted successfully.', 'success');
  }

  function setDefaultMonday(root) {
    const input = root.querySelector('[name="week_start_date"]');
    if (!input || input.value) return;

    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    input.value = monday.toISOString().slice(0, 10);
  }

  function initApp(root) {
    renderManagerOptions(root);
    setDefaultMonday(root);
    renderPropertyCards(root);

    const managerSelect = root.querySelector('[name="manager_name"]');
    const form = root.querySelector('form');

    managerSelect?.addEventListener('change', () => {
      renderPropertyCards(root);
      showBanner(root, '', 'info');
      if (config.debugPreview) updatePreview(root);
    });

    root.querySelector('[data-role="preview-btn"]')?.addEventListener('click', () => {
      validate(root);
      updatePreview(root);
    });

    root.querySelector('[data-role="reset-btn"]')?.addEventListener('click', () => {
      form?.reset();
      setDefaultMonday(root);
      renderPropertyCards(root);
      clearErrors(root);
      showBanner(root, '', 'info');
      if (config.debugPreview) updatePreview(root);
    });

    root.addEventListener('input', () => {
      if (config.debugPreview) updatePreview(root);
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!validate(root)) return;

      const button = form.querySelector('button[type="submit"]');
      const previousLabel = button ? button.textContent : '';

      try {
        if (button) {
          button.disabled = true;
          button.textContent = 'Submitting...';
        }
        await submitPayload(root);
      } catch (error) {
        showBanner(root, error.message || 'Submission failed.', 'error');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = previousLabel;
        }
      }
    });

    if (config.debugPreview) updatePreview(root);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.blaze-mwrf-app').forEach(initApp);
  });
})();
