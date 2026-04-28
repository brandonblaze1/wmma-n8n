(function () {
  const config = window.BlazeManagerWeeklyReportConfig || {};
  const portfolioMap = config.portfolioMap || {};
  const webhookUrl = config.webhookUrl || '';
  const debugPreview = !!config.debugPreview;
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

  const requiredTextFields = ['biggest_issue_text', 'help_needed_text'];

  document.querySelectorAll('.blaze-mwrf-app').forEach(initApp);

  function initApp(app) {
    const formEl = app.querySelector('.blaze-mwrf-form');
    const managerEl = app.querySelector('#blaze_mwrf_manager_name');
    const weekEl = app.querySelector('#blaze_mwrf_week_start_date');
    const cardsEl = app.querySelector('[data-role="property-cards"]');
    const payloadPreviewEl = app.querySelector('[data-role="payload-preview"]');
    const previewSectionEl = app.querySelector('[data-role="preview-section"]');
    const globalBannerEl = app.querySelector('[data-role="global-banner"]');
    const previewBtn = app.querySelector('[data-role="preview-btn"]');
    const resetBtn = app.querySelector('[data-role="reset-btn"]');

    populateManagers(managerEl);
    weekEl.value = getMondayDateInputValue(new Date());
    renderPropertyCards();
    refreshLateWarning();
    refreshPreviewSafe();

    managerEl.addEventListener('change', function () {
      clearFieldError('manager_name');
      renderPropertyCards();
      refreshPreviewSafe();
    });

    weekEl.addEventListener('change', function () {
      clearFieldError('week_start_date');
      refreshLateWarning();
      refreshPreviewSafe();
    });

    previewBtn.addEventListener('click', function () {
      const validation = validateForm();
      if (!validation.valid) {
        showBanner('error', messages.validationFailed || 'Fix the validation errors before previewing the final payload.');
      } else {
        clearBanner();
      }
      if (payloadPreviewEl) payloadPreviewEl.textContent = JSON.stringify(buildPayload(), null, 2);
      if (previewSectionEl) previewSectionEl.classList.remove('blaze-mwrf-hidden');
    });

    resetBtn.addEventListener('click', function () {
      formEl.reset();
      weekEl.value = getMondayDateInputValue(new Date());
      clearAllErrors();
      clearBanner();
      renderPropertyCards();
      refreshLateWarning();
      refreshPreviewSafe();
    });

    formEl.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearBanner();
      const validation = validateForm();
      const payload = buildPayload();
      if (payloadPreviewEl) payloadPreviewEl.textContent = JSON.stringify(payload, null, 2);
      if (debugPreview && previewSectionEl) previewSectionEl.classList.remove('blaze-mwrf-hidden');

      if (!validation.valid) {
        showBanner('error', messages.validationFailed || 'Form validation failed. Fix the highlighted fields and submit again.');
        return;
      }

      if (!webhookUrl) {
        showBanner('warning', messages.noWebhook || 'Form is valid. No webhook URL is configured yet, so this run stops at payload preview.');
        return;
      }

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const bodyText = await response.text();
          throw new Error(`HTTP ${response.status}: ${bodyText || response.statusText}`);
        }

        showBanner('success', messages.success || 'Weekly report submitted successfully.');
      } catch (error) {
        console.error(error);
        showBanner('error', `Submission failed: ${error.message}`);
      }
    });

    function populateManagers(selectEl) {
      Object.keys(portfolioMap).forEach((manager) => {
        const option = document.createElement('option');
        option.value = manager;
        option.textContent = manager;
        selectEl.appendChild(option);
      });
    }

    function renderPropertyCards() {
      cardsEl.innerHTML = '';
      const manager = managerEl.value;
      if (!manager || !portfolioMap[manager]) {
        cardsEl.innerHTML = `<div class="blaze-mwrf-hint">${escapeHtml(messages.noManager || 'Select a manager to load assigned properties.')}</div>`;
        return;
      }

      portfolioMap[manager].forEach((propertyName, index) => {
        const card = document.createElement('div');
        card.className = 'blaze-mwrf-property-card';
        card.dataset.propertyIndex = String(index);
        card.innerHTML = `
          <h3>${escapeHtml(propertyName)}</h3>
          <input type="hidden" name="property_name" value="${escapeAttribute(propertyName)}" />
          <div class="blaze-mwrf-grid">
            ${renderNumberField('vacant_units', 'Vacant Units')}
            ${renderNumberField('ready_vacants', 'Ready Vacants')}
            ${renderNumberField('not_ready_vacants', 'Not Ready Vacants')}
            ${renderNumberField('delinquent_count', 'Delinquent Count')}
            ${renderNumberField('delinquent_amount', 'Delinquent Amount', '0.01')}
            ${renderNumberField('turns_in_progress', 'Turns in Progress')}
            ${renderNumberField('work_orders_over_7_days', 'Work Orders Over 7 Days')}
            ${renderTextAreaField('biggest_issue_text', 'Biggest Issue')}
            ${renderTextAreaField('help_needed_text', 'Help Needed')}
            ${renderTextAreaField('struggling_units_text', 'Struggling Units / Leasing Notes', true)}
          </div>
        `;

        wireCardEvents(card);
        cardsEl.appendChild(card);
      });
    }

    function renderNumberField(name, label, step) {
      return `
        <div class="blaze-mwrf-span-4">
          <label>${label}</label>
          <input type="number" name="${name}" min="0" step="${step || '1'}" inputmode="decimal" />
          <div class="blaze-mwrf-error" data-error-for="${name}"></div>
        </div>
      `;
    }

    function renderTextAreaField(name, label, optional) {
      return `
        <div class="blaze-mwrf-span-6">
          <label>${label}${optional ? ' <span style="font-weight:400;color:#6b7280;">(Optional)</span>' : ''}</label>
          <textarea name="${name}"></textarea>
          <div class="blaze-mwrf-error" data-error-for="${name}"></div>
        </div>
      `;
    }

    function wireCardEvents(card) {
      card.querySelectorAll('input, textarea').forEach((field) => {
        field.addEventListener('input', function () {
          validateCard(card, false);
          refreshPreviewSafe();
        });
        field.addEventListener('blur', function () {
          validateCard(card, true);
          refreshPreviewSafe();
        });
      });
    }

    function buildPayload() {
      const manager_name = managerEl.value;
      const week_start_date = weekEl.value;
      const submitted_at = new Date().toISOString();
      const properties = Array.from(cardsEl.querySelectorAll('.blaze-mwrf-property-card')).map((card) => {
        const getValue = (name) => card.querySelector(`[name="${name}"]`)?.value ?? '';
        return {
          property_name: getValue('property_name'),
          vacant_units: toInt(getValue('vacant_units')),
          ready_vacants: toInt(getValue('ready_vacants')),
          not_ready_vacants: toInt(getValue('not_ready_vacants')),
          delinquent_count: toInt(getValue('delinquent_count')),
          delinquent_amount: toMoney(getValue('delinquent_amount')),
          turns_in_progress: toInt(getValue('turns_in_progress')),
          work_orders_over_7_days: toInt(getValue('work_orders_over_7_days')),
          biggest_issue_text: getValue('biggest_issue_text').trim(),
          help_needed_text: getValue('help_needed_text').trim(),
          struggling_units_text: getValue('struggling_units_text').trim()
        };
      });

      return { manager_name, week_start_date, submitted_at, properties };
    }

    function validateForm() {
      clearAllErrors();
      let valid = true;

      if (!managerEl.value) {
        setFieldError('manager_name', 'Manager is required.');
        markInvalid(managerEl, true);
        valid = false;
      }

      if (!weekEl.value) {
        setFieldError('week_start_date', 'Reporting Week (Monday) is required.');
        markInvalid(weekEl, true);
        valid = false;
      } else if (!isMonday(weekEl.value)) {
        setFieldError('week_start_date', 'Reporting Week must be a Monday.');
        markInvalid(weekEl, true);
        valid = false;
      }

      const cards = Array.from(cardsEl.querySelectorAll('.blaze-mwrf-property-card'));
      if (!cards.length) {
        valid = false;
        showBanner('error', messages.noManager || 'Select a manager to load assigned properties.');
      }

      cards.forEach((card) => {
        const result = validateCard(card, true);
        if (!result.valid) valid = false;
      });

      return { valid };
    }

    function validateCard(card, showErrors) {
      let valid = true;
      const getField = (name) => card.querySelector(`[name="${name}"]`);

      numericFields.forEach((fieldName) => {
        const field = getField(fieldName);
        const raw = field.value;
        const num = Number(raw);
        const isEmpty = raw === '';
        const isInvalid = isEmpty || Number.isNaN(num) || num < 0;
        markInvalid(field, isInvalid);
        if (showErrors) {
          setCardFieldError(card, fieldName, isInvalid ? `${toLabel(fieldName)} is required and must be 0 or greater.` : '');
        }
        if (isInvalid) valid = false;
      });

      requiredTextFields.forEach((fieldName) => {
        const field = getField(fieldName);
        const isInvalid = !field.value.trim();
        markInvalid(field, isInvalid);
        if (showErrors) {
          setCardFieldError(card, fieldName, isInvalid ? `${toLabel(fieldName)} is required.` : '');
        }
        if (isInvalid) valid = false;
      });

      const vacantField = getField('vacant_units');
      const readyField = getField('ready_vacants');
      const notReadyField = getField('not_ready_vacants');
      const vacancyOk =
        vacantField.value !== '' && readyField.value !== '' && notReadyField.value !== '' &&
        Number(vacantField.value) === Number(readyField.value) + Number(notReadyField.value);

      if (!vacancyOk) {
        valid = false;
        [vacantField, readyField, notReadyField].forEach((field) => markInvalid(field, true));
        if (showErrors) {
          const msg = 'Vacant Units must equal Ready Vacants plus Not Ready Vacants.';
          setCardFieldError(card, 'vacant_units', msg);
          setCardFieldError(card, 'ready_vacants', msg);
          setCardFieldError(card, 'not_ready_vacants', msg);
        }
      } else if (showErrors) {
        setCardFieldError(card, 'vacant_units', '');
        setCardFieldError(card, 'ready_vacants', '');
        setCardFieldError(card, 'not_ready_vacants', '');
      }

      return { valid };
    }

    function refreshPreviewSafe() {
      if (!payloadPreviewEl) return;
      if (!debugPreview) return;
      try {
        payloadPreviewEl.textContent = JSON.stringify(buildPayload(), null, 2);
      } catch (e) {
        payloadPreviewEl.textContent = '{}';
      }
    }

    function refreshLateWarning() {
      clearBanner();
      if (!weekEl.value) return;
      const now = new Date();
      const weekDate = new Date(`${weekEl.value}T00:00:00`);
      const mondayTen = new Date(weekDate);
      mondayTen.setHours(10, 0, 0, 0);
      if (now > mondayTen) {
        showBanner('error', messages.lateWarning || 'You are past the Monday 10:00 AM deadline. Submit now anyway so leadership has a baseline, but expect this report to be flagged late.');
      }
    }

    function clearAllErrors() {
      app.querySelectorAll('.blaze-mwrf-error').forEach((el) => { el.textContent = ''; });
      app.querySelectorAll('.blaze-mwrf-field-invalid').forEach((el) => el.classList.remove('blaze-mwrf-field-invalid'));
    }

    function clearFieldError(name) {
      const errorEl = app.querySelector(`.blaze-mwrf-error[data-error-for="${name}"]`);
      if (errorEl) errorEl.textContent = '';
      const field = app.querySelector(`#blaze_mwrf_${name}`);
      if (field) markInvalid(field, false);
    }

    function setFieldError(name, message) {
      const errorEl = app.querySelector(`.blaze-mwrf-error[data-error-for="${name}"]`);
      if (errorEl) errorEl.textContent = message;
    }

    function setCardFieldError(card, name, message) {
      const errorEl = card.querySelector(`.blaze-mwrf-error[data-error-for="${name}"]`);
      if (errorEl) errorEl.textContent = message;
    }

    function markInvalid(field, invalid) {
      if (!field) return;
      field.classList.toggle('blaze-mwrf-field-invalid', !!invalid);
    }

    function showBanner(kind, message) {
      globalBannerEl.className = `blaze-mwrf-banner show ${kind}`;
      globalBannerEl.textContent = message;
    }

    function clearBanner() {
      globalBannerEl.className = 'blaze-mwrf-banner';
      globalBannerEl.textContent = '';
    }

    function isMonday(dateString) {
      const date = new Date(`${dateString}T00:00:00`);
      return date.getDay() === 1;
    }

    function getMondayDateInputValue(date) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${dayOfMonth}`;
    }

    function toInt(value) {
      if (value === '') return null;
      return Number.parseInt(value, 10);
    }

    function toMoney(value) {
      if (value === '') return null;
      return Number(Number(value).toFixed(2));
    }

    function toLabel(fieldName) {
      const labels = {
        vacant_units: 'Vacant Units',
        ready_vacants: 'Ready Vacants',
        not_ready_vacants: 'Not Ready Vacants',
        delinquent_count: 'Delinquent Count',
        delinquent_amount: 'Delinquent Amount',
        turns_in_progress: 'Turns in Progress',
        work_orders_over_7_days: 'Work Orders Over 7 Days',
        biggest_issue_text: 'Biggest Issue',
        help_needed_text: 'Help Needed'
      };
      return labels[fieldName] || fieldName;
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }
  }
})();
