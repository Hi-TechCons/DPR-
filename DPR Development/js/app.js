/**
 * DPR Mobile Pro - Main Application Controller
 * Dynamic Form Rendering, Table & Card Grid, Event Listeners, and Modal Handlers
 */

let currentView = 'table'; // 'table', 'cards', 'customizer'
let currentFilters = {
  search: '',
  dateRange: 'all',
  category: 'all',
  status: 'all',
  sortBy: 'date',
  sortDir: 'desc'
};
let selectedRowIds = new Set();
let editingRecordId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  populateTemplateSelector();
  setupEventListeners();
  handleHashNavigation();
  renderApp();
  window.addEventListener('hashchange', handleHashNavigation);
});

function handleHashNavigation() {
  const hash = window.location.hash;
  if (!hash) return;
  const params = new URLSearchParams(hash.substring(1));
  const view = params.get('view');
  const modal = params.get('modal');

  if (view && ['table', 'cards', 'customizer'].includes(view)) {
    currentView = view;
  }
  if (modal === 'entry') setTimeout(openAddModal, 100);
  else if (modal === 'export') setTimeout(openExportModal, 100);
  else if (modal === 'qr') setTimeout(openMobilePairingModal, 100);
  else if (modal === 'install') setTimeout(openMobileInstallModal, 100);

  const action = params.get('action');
  if (action === 'test_export') {
    setTimeout(triggerExcelExport, 200);
  }
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('dpr_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('dpr_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeToggleIcon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Template Selector
function populateTemplateSelector() {
  const select = document.getElementById('templateSelect');
  if (!select) return;

  const templates = window.templateManager.getAllTemplates();
  const activeId = window.templateManager.getActiveTemplateId();

  select.innerHTML = '';
  templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name + (t.isCustom ? ' (Custom)' : '');
    if (t.id === activeId) opt.selected = true;
    select.appendChild(opt);
  });
}

// Master Render Function
function renderApp() {
  const activeTemplate = window.templateManager.getActiveTemplate();
  const records = window.dataManager.getFilteredRecords(activeTemplate.id, currentFilters);

  // Update Section Title & Count
  const titleEl = document.getElementById('currentTemplateTitle');
  const countEl = document.getElementById('recordsCountBadge');
  if (titleEl) titleEl.textContent = activeTemplate.name;
  if (countEl) countEl.textContent = `${records.length} Records`;

  // Render Stats
  renderStats(activeTemplate.id, records);

  // Render Category Filter Dropdown
  renderCategoryFilter(activeTemplate);

  // Render Current View
  if (currentView === 'table') {
    document.getElementById('tableViewContainer').style.display = 'block';
    document.getElementById('cardsViewContainer').style.display = 'none';
    document.getElementById('customizerViewContainer').style.display = 'none';
    renderTable(activeTemplate, records);
  } else if (currentView === 'cards') {
    document.getElementById('tableViewContainer').style.display = 'none';
    document.getElementById('cardsViewContainer').style.display = 'block';
    document.getElementById('customizerViewContainer').style.display = 'none';
    renderCards(activeTemplate, records);
  } else if (currentView === 'customizer') {
    document.getElementById('tableViewContainer').style.display = 'none';
    document.getElementById('cardsViewContainer').style.display = 'none';
    document.getElementById('customizerViewContainer').style.display = 'block';
    renderCustomizer(activeTemplate);
  }

  updateBulkActionsBar();
}

// Render Stats
function renderStats(templateId, records) {
  const stats = window.dataManager.getSummaryStats(templateId, records);
  const container = document.getElementById('statsGrid');
  if (!container) return;

  if (templateId === 'labour_attendance') {
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon-wrap amber">👷</div>
        <div class="stat-content">
          <span class="stat-value">${stats.totalCount}</span>
          <span class="stat-label">Total Labours Logged</span>
          <span class="stat-sub">${stats.presentCount || 0} Present • ${stats.halfDayCount || 0} Half-day</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap blue">⏱️</div>
        <div class="stat-content">
          <span class="stat-value">${stats.totalHours} hrs</span>
          <span class="stat-label">Regular Man-Hours</span>
          <span class="stat-sub">+${stats.totalOT || 0} hrs Overtime</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap green">💰</div>
        <div class="stat-content">
          <span class="stat-value">₹${stats.totalWages.toLocaleString()}</span>
          <span class="stat-label">Estimated Total Wages</span>
          <span class="stat-sub">Based on logged rates</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap purple">📊</div>
        <div class="stat-content">
          <span class="stat-value">${stats.presentCount > 0 ? Math.round((stats.presentCount / Math.max(stats.totalCount, 1)) * 100) : 0}%</span>
          <span class="stat-label">Attendance Rate</span>
          <span class="stat-sub">Active turnout today</span>
        </div>
      </div>
    `;
  } else if (templateId === 'daily_progress_report') {
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon-wrap amber">📋</div>
        <div class="stat-content">
          <span class="stat-value">${stats.totalCount}</span>
          <span class="stat-label">Activities Tracked</span>
          <span class="stat-sub">Active tasks today</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap green">🏗️</div>
        <div class="stat-content">
          <span class="stat-value">${stats.totalExecuted || 0}</span>
          <span class="stat-label">Total Executed Qty</span>
          <span class="stat-sub">Work units achieved</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap blue">👷‍♂️</div>
        <div class="stat-content">
          <span class="stat-value">${(stats.totalSkilled || 0) + (stats.totalUnskilled || 0)}</span>
          <span class="stat-label">Total Manpower Deployed</span>
          <span class="stat-sub">${stats.totalSkilled || 0} Skilled • ${stats.totalUnskilled || 0} Unskilled</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap purple">📈</div>
        <div class="stat-content">
          <span class="stat-value">Active</span>
          <span class="stat-label">Site Status</span>
          <span class="stat-sub">Work in progress</span>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon-wrap amber">📑</div>
        <div class="stat-content">
          <span class="stat-value">${stats.totalCount}</span>
          <span class="stat-label">Total Records</span>
          <span class="stat-sub">Logged in current format</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap green">⚡</div>
        <div class="stat-content">
          <span class="stat-value">Digitalized</span>
          <span class="stat-label">Paperless Hardcopy</span>
          <span class="stat-sub">Ready for Excel Export</span>
        </div>
      </div>
    `;
  }
}

// Render Category Filter Dropdown
function renderCategoryFilter(template) {
  const select = document.getElementById('categoryFilterSelect');
  if (!select) return;

  const currentVal = currentFilters.category;
  // Look for first select/dropdown column
  const selectCol = template.columns.find(c => c.type === 'select' && c.key !== 'status');
  if (!selectCol || !selectCol.options) {
    select.style.display = 'none';
    return;
  }

  select.style.display = 'inline-block';
  select.innerHTML = `<option value="all">All Categories</option>`;
  selectCol.options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === currentVal) o.selected = true;
    select.appendChild(o);
  });
}

// Render Table View
function renderTable(template, records) {
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const tableFoot = document.getElementById('tableFoot');

  if (!tableHead || !tableBody) return;

  // Build Head
  let headHtml = `<tr>
    <th style="width: 40px; text-align: center;">
      <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)">
    </th>`;

  template.columns.forEach(col => {
    const sortIcon = currentFilters.sortBy === col.key 
      ? (currentFilters.sortDir === 'asc' ? ' 🔼' : ' 🔽') 
      : '';
    headHtml += `<th class="sortable" onclick="handleSort('${col.key}')">${col.label}${sortIcon}</th>`;
  });

  headHtml += `<th style="width: 110px; text-align: center;">Actions</th></tr>`;
  tableHead.innerHTML = headHtml;

  // Build Body
  if (records.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${template.columns.length + 2}">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No Records Found</div>
            <div class="empty-state-desc">No entries match your search or filter. Tap "+ New Entry" or reset filters.</div>
            <button class="btn btn-primary" onclick="openAddModal()">+ Add First Entry</button>
          </div>
        </td>
      </tr>
    `;
    tableFoot.innerHTML = '';
    return;
  }

  let bodyHtml = '';
  records.forEach(r => {
    const isSelected = selectedRowIds.has(r.id);
    bodyHtml += `<tr class="${isSelected ? 'selected' : ''}">
      <td style="text-align: center;">
        <input type="checkbox" value="${r.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectRow('${r.id}', this.checked)">
      </td>`;

    template.columns.forEach(col => {
      let val = r[col.key];
      if (val === undefined || val === null || val === '') val = '-';

      // Badge formatting for status
      if (col.key === 'status') {
        const valLower = String(val).toLowerCase();
        let badgeClass = 'badge-present';
        if (valLower.includes('absent')) badgeClass = 'badge-absent';
        else if (valLower.includes('half')) badgeClass = 'badge-halfday';
        else if (valLower.includes('overtime')) badgeClass = 'badge-overtime';
        val = `<span class="badge ${badgeClass}">${val}</span>`;
      } else if (col.key === 'totalPay' || (col.type === 'number' && String(col.label).includes('₹'))) {
        val = `<strong>₹${parseFloat(val || 0).toLocaleString()}</strong>`;
      }

      bodyHtml += `<td>${val}</td>`;
    });

    bodyHtml += `
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn btn-secondary btn-sm" title="Edit" onclick="openEditModal('${r.id}')">✏️</button>
        <button class="btn btn-secondary btn-sm" title="Duplicate" onclick="duplicateRecord('${r.id}')">📑</button>
        <button class="btn btn-danger btn-sm" title="Delete" onclick="deleteRecord('${r.id}')">🗑️</button>
      </td>
    </tr>`;
  });
  tableBody.innerHTML = bodyHtml;

  // Build Footer Summary
  let footHtml = `<tr>
    <td style="text-align: center; font-weight: bold;">∑</td>`;
  template.columns.forEach((col, idx) => {
    if (idx === 0) {
      footHtml += `<td><strong>TOTAL (${records.length})</strong></td>`;
    } else if (col.summary === 'sum') {
      const sum = records.reduce((acc, r) => {
        const num = parseFloat(r[col.key]);
        return acc + (isNaN(num) ? 0 : num);
      }, 0);
      const formatted = (col.key === 'totalPay' || String(col.label).includes('₹'))
        ? `₹${Math.round(sum).toLocaleString()}`
        : Math.round(sum * 100) / 100;
      footHtml += `<td><strong>${formatted}</strong></td>`;
    } else {
      footHtml += `<td></td>`;
    }
  });
  footHtml += `<td></td></tr>`;
  tableFoot.innerHTML = footHtml;
}

// Render Cards View (Mobile-Friendly)
function renderCards(template, records) {
  const container = document.getElementById('cardsContainer');
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📱</div>
        <div class="empty-state-title">No Records to Display</div>
        <div class="empty-state-desc">Tap "+ New Entry" below to digitalize a hardcopy record.</div>
        <button class="btn btn-primary" onclick="openAddModal()">+ Add New Entry</button>
      </div>
    `;
    return;
  }

  let cardsHtml = '';
  records.forEach(r => {
    // Determine title & subtitle based on template
    const titleVal = r.workerName || r.activity || r.itemName || r.name || 'Entry';
    const subVal = r.trade || r.location || r.resourceType || r.category || '';
    const dateVal = r.date || '';

    let fieldsHtml = '';
    template.columns.forEach(col => {
      // Don't repeat title in body
      if (['workerName', 'activity', 'itemName', 'name'].includes(col.key)) return;
      let val = r[col.key];
      if (val === undefined || val === null || val === '') return;

      let isHighlight = col.key === 'totalPay' || col.key === 'executedToday';
      let displayVal = val;
      if (col.key === 'status') {
        const valLower = String(val).toLowerCase();
        let badgeClass = 'badge-present';
        if (valLower.includes('absent')) badgeClass = 'badge-absent';
        else if (valLower.includes('half')) badgeClass = 'badge-halfday';
        displayVal = `<span class="badge ${badgeClass}">${val}</span>`;
      } else if (col.key === 'totalPay') {
        displayVal = `₹${parseFloat(val).toLocaleString()}`;
      }

      fieldsHtml += `
        <div class="record-field-row">
          <span class="record-field-label">${col.label}</span>
          <span class="record-field-val ${isHighlight ? 'highlight' : ''}">${displayVal}</span>
        </div>
      `;
    });

    cardsHtml += `
      <div class="record-card">
        <div class="record-card-header">
          <div>
            <div class="record-card-title">${titleVal}</div>
            <div class="record-card-sub">${subVal} • ${dateVal}</div>
          </div>
          ${r.status ? `<span class="badge ${String(r.status).toLowerCase().includes('absent') ? 'badge-danger' : 'badge-present'}">${r.status}</span>` : ''}
        </div>
        <div class="record-card-body">
          ${fieldsHtml}
        </div>
        <div class="record-card-footer">
          <span style="font-size:0.75rem; color:var(--text-muted);">ID: ${r.workerId || r.itemNo || r.id.substr(-6)}</span>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditModal('${r.id}')">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="duplicateRecord('${r.id}')">📑 Copy</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRecord('${r.id}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml;
}

// Render Format Designer / Customizer View
function renderCustomizer(template) {
  const container = document.getElementById('customizerFieldsList');
  const titleInput = document.getElementById('customizerTemplateName');
  const descInput = document.getElementById('customizerTemplateDesc');

  if (titleInput) titleInput.value = template.name;
  if (descInput) descInput.value = template.description || '';

  if (!container) return;

  let fieldsHtml = '';
  template.columns.forEach((col, idx) => {
    fieldsHtml += `
      <div class="field-item" data-key="${col.key}">
        <span class="field-handle">☰</span>
        <div class="field-inputs">
          <input type="text" value="${col.label}" placeholder="Column Header" 
                 onchange="updateColumnProperty('${template.id}', '${col.key}', 'label', this.value)" style="flex:2; min-width: 140px;">
          <select onchange="updateColumnProperty('${template.id}', '${col.key}', 'type', this.value)" style="flex:1; min-width: 120px;">
            <option value="text" ${col.type === 'text' ? 'selected' : ''}>Text</option>
            <option value="number" ${col.type === 'number' ? 'selected' : ''}>Number</option>
            <option value="select" ${col.type === 'select' ? 'selected' : ''}>Dropdown List</option>
            <option value="date" ${col.type === 'date' ? 'selected' : ''}>Date</option>
            <option value="calculated" ${col.type === 'calculated' ? 'selected' : ''}>Calculated Formula</option>
          </select>
          <label style="font-size:0.78rem; display:flex; align-items:center; gap:0.3rem; cursor:pointer;">
            <input type="checkbox" ${col.export !== false ? 'checked' : ''} 
                   onchange="updateColumnProperty('${template.id}', '${col.key}', 'export', this.checked)">
            Excel Export
          </label>
          <label style="font-size:0.78rem; display:flex; align-items:center; gap:0.3rem; cursor:pointer;">
            <input type="checkbox" ${col.summary === 'sum' ? 'checked' : ''} 
                   onchange="updateColumnProperty('${template.id}', '${col.key}', 'summary', this.checked ? 'sum' : null)">
            Total Sum
          </label>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeColumnFromTemplate('${template.id}', '${col.key}')" title="Delete Column">✕</button>
      </div>
    `;
  });

  container.innerHTML = fieldsHtml;
}

// Column customizer helpers
function updateColumnProperty(templateId, columnKey, prop, val) {
  const template = window.templateManager.templates[templateId];
  if (!template) return;
  const col = template.columns.find(c => c.key === columnKey);
  if (col) {
    col[prop] = val;
    window.templateManager.saveTemplates();
    showToast(`Updated column "${col.label}"`, 'success');
  }
}

function removeColumnFromTemplate(templateId, columnKey) {
  const template = window.templateManager.templates[templateId];
  if (template.columns.length <= 1) {
    showToast('A template must have at least one column.', 'warning');
    return;
  }
  if (confirm(`Remove column "${columnKey}" from this format?`)) {
    window.templateManager.removeColumn(templateId, columnKey);
    renderCustomizer(template);
    showToast('Column removed', 'info');
  }
}

function addNewColumnPrompt() {
  const label = prompt('Enter Column Header Name (e.g., "Overtime Hours", "Safety Helmet Check", "Contractor Token"):');
  if (!label || !label.trim()) return;

  const activeTemplate = window.templateManager.getActiveTemplate();
  window.templateManager.addColumn(activeTemplate.id, {
    label: label.trim(),
    type: 'text',
    export: true
  });
  renderCustomizer(activeTemplate);
  showToast(`Added column "${label}"`, 'success');
}

function resetActiveTemplateDefaults() {
  const activeTemplate = window.templateManager.getActiveTemplate();
  if (confirm(`Reset "${activeTemplate.name}" back to original default columns?`)) {
    window.templateManager.resetToDefaults(activeTemplate.id);
    renderApp();
    showToast('Template reset to default', 'info');
  }
}

function createNewCustomTemplate() {
  const name = prompt('Enter Name for New Hardcopy Format (e.g., "Civil Works Daily Muster", "Subcontractor Billing Log"):');
  if (!name || !name.trim()) return;

  const newTemplate = window.templateManager.createCustomTemplate(name.trim(), 'Custom hardcopy paper format clone');
  populateTemplateSelector();
  window.templateManager.setActiveTemplateId(newTemplate.id);
  switchView('customizer');
  renderApp();
  showToast(`Created custom format "${name}"! Customize your columns now.`, 'success');
}

// Modal Form Engine (Add / Edit)
function openAddModal() {
  editingRecordId = null;
  const activeTemplate = window.templateManager.getActiveTemplate();
  document.getElementById('entryModalTitle').textContent = `Add Entry: ${activeTemplate.name}`;
  renderDynamicEntryForm(activeTemplate, null);
  document.getElementById('entryModalOverlay').classList.add('active');
}

function openEditModal(recordId) {
  editingRecordId = recordId;
  const activeTemplate = window.templateManager.getActiveTemplate();
  const record = window.dataManager.getRecordById(activeTemplate.id, recordId);
  if (!record) return;

  document.getElementById('entryModalTitle').textContent = `Edit Entry: ${activeTemplate.name}`;
  renderDynamicEntryForm(activeTemplate, record);
  document.getElementById('entryModalOverlay').classList.add('active');
}

function closeEntryModal() {
  document.getElementById('entryModalOverlay').classList.remove('active');
  editingRecordId = null;
}

function renderDynamicEntryForm(template, existingData = null) {
  const formGrid = document.getElementById('entryFormGrid');
  if (!formGrid) return;

  let formHtml = '';
  const today = new Date().toISOString().split('T')[0];

  template.columns.forEach(col => {
    let currentVal = existingData ? existingData[col.key] : (col.default !== undefined && col.default !== null ? col.default : '');
    if (col.key === 'date' && !currentVal) currentVal = today;

    // Calculated fields are auto-computed, read-only
    if (col.type === 'calculated') {
      formHtml += `
        <div class="form-group">
          <label class="form-label">${col.label} <small style="color:var(--accent-primary);">(Auto-calculated)</small></label>
          <input type="text" id="field_${col.key}" name="${col.key}" class="form-input" value="${currentVal || 0}" readonly style="background:rgba(245,158,11,0.08); font-weight:700;">
        </div>
      `;
    } else if (col.type === 'select') {
      let optionsHtml = '';
      (col.options || []).forEach(opt => {
        optionsHtml += `<option value="${opt}" ${String(opt) === String(currentVal) ? 'selected' : ''}>${opt}</option>`;
      });
      formHtml += `
        <div class="form-group">
          <label class="form-label">${col.label} ${col.required ? '<span style="color:var(--danger)">*</span>' : ''}</label>
          <select id="field_${col.key}" name="${col.key}" class="form-select" ${col.required ? 'required' : ''}>
            ${optionsHtml}
          </select>
        </div>
      `;
    } else if (col.type === 'number') {
      formHtml += `
        <div class="form-group">
          <label class="form-label">${col.label} ${col.required ? '<span style="color:var(--danger)">*</span>' : ''}</label>
          <div class="stepper-wrap">
            <button type="button" class="stepper-btn" onclick="stepNumberField('field_${col.key}', -${col.step || 1})">−</button>
            <input type="number" id="field_${col.key}" name="${col.key}" class="stepper-input" 
                   value="${currentVal !== '' ? currentVal : (col.default || 0)}" step="${col.step || 'any'}" ${col.required ? 'required' : ''}
                   oninput="recalculateFormFormulas('${template.id}')">
            <button type="button" class="stepper-btn" onclick="stepNumberField('field_${col.key}', ${col.step || 1})">+</button>
          </div>
        </div>
      `;
    } else if (col.type === 'date') {
      formHtml += `
        <div class="form-group">
          <label class="form-label">${col.label} ${col.required ? '<span style="color:var(--danger)">*</span>' : ''}</label>
          <input type="date" id="field_${col.key}" name="${col.key}" class="form-input" value="${currentVal}" ${col.required ? 'required' : ''}>
        </div>
      `;
    } else {
      // Standard Text
      formHtml += `
        <div class="form-group ${['locationTask', 'remarks', 'activity', 'obstacles'].includes(col.key) ? 'full-width' : ''}">
          <label class="form-label">${col.label} ${col.required ? '<span style="color:var(--danger)">*</span>' : ''}</label>
          <input type="text" id="field_${col.key}" name="${col.key}" class="form-input" value="${currentVal}" placeholder="Enter ${col.label}..." ${col.required ? 'required' : ''}>
        </div>
      `;
    }
  });

  formGrid.innerHTML = formHtml;
  recalculateFormFormulas(template.id);
}

function stepNumberField(id, delta) {
  const input = document.getElementById(id);
  if (input) {
    const val = parseFloat(input.value) || 0;
    const step = Math.abs(delta) < 1 ? 0.5 : 1;
    const newVal = Math.max(0, Math.round((val + delta) * 10) / 10);
    input.value = newVal;
    const activeTemplate = window.templateManager.getActiveTemplate();
    recalculateFormFormulas(activeTemplate.id);
  }
}

function recalculateFormFormulas(templateId) {
  const template = window.templateManager.templates[templateId];
  if (!template) return;

  const raw = {};
  template.columns.forEach(col => {
    const el = document.getElementById(`field_${col.key}`);
    if (el) raw[col.key] = el.value;
  });

  const computed = window.dataManager.computeFormulas(template, raw);
  template.columns.forEach(col => {
    if (col.type === 'calculated') {
      const el = document.getElementById(`field_${col.key}`);
      if (el) el.value = computed[col.key] !== undefined ? `₹${computed[col.key].toLocaleString()}` : '0';
    }
  });
}

function handleSaveEntryForm(e) {
  e.preventDefault();
  const activeTemplate = window.templateManager.getActiveTemplate();
  const formData = {};

  activeTemplate.columns.forEach(col => {
    const el = document.getElementById(`field_${col.key}`);
    if (el) {
      formData[col.key] = el.value;
    }
  });

  if (editingRecordId) {
    window.dataManager.updateRecord(activeTemplate.id, editingRecordId, formData);
    showToast('Record updated successfully!', 'success');
  } else {
    window.dataManager.createRecord(activeTemplate.id, formData);
    showToast('New digital record saved!', 'success');
  }

  closeEntryModal();
  renderApp();
}

// Rapid Batch Multi-Row Entry Functions
function openRapidEntryModal() {
  const tbody = document.getElementById('rapidEntryTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  // Default with 5 rows
  for (let i = 0; i < 5; i++) {
    addRapidEntryRow();
  }
  document.getElementById('rapidEntryModalOverlay').classList.add('active');
}

function closeRapidEntryModal() {
  document.getElementById('rapidEntryModalOverlay').classList.remove('active');
}

function addRapidEntryRow() {
  const tbody = document.getElementById('rapidEntryTableBody');
  if (!tbody) return;
  const rowId = 'rapid_row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.innerHTML = `
    <td><input type="text" class="form-input form-input-sm" name="workerName" placeholder="Worker Name" style="padding:0.35rem 0.5rem; font-size:0.82rem;"></td>
    <td>
      <select class="form-select form-input-sm" name="trade" style="padding:0.35rem 0.5rem; font-size:0.82rem;">
        <option value="Mason">Mason</option>
        <option value="Barbender">Barbender</option>
        <option value="Carpenter">Carpenter</option>
        <option value="Helper (Unskilled)" selected>Helper</option>
        <option value="Electrician">Electrician</option>
        <option value="Plumber">Plumber</option>
        <option value="Painter">Painter</option>
      </select>
    </td>
    <td><input type="number" class="form-input form-input-sm" name="hoursWorked" value="8" style="padding:0.35rem 0.5rem; font-size:0.82rem; width:70px;"></td>
    <td><input type="number" class="form-input form-input-sm" name="otHours" value="0" style="padding:0.35rem 0.5rem; font-size:0.82rem; width:65px;"></td>
    <td><input type="number" class="form-input form-input-sm" name="wageRate" value="600" style="padding:0.35rem 0.5rem; font-size:0.82rem; width:85px;"></td>
    <td><input type="text" class="form-input form-input-sm" name="locationTask" placeholder="Tower/Task..." style="padding:0.35rem 0.5rem; font-size:0.82rem;"></td>
    <td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('${rowId}').remove()" style="padding:0.2rem 0.45rem;">✕</button></td>
  `;
  tbody.appendChild(tr);
}

function saveRapidEntryRows() {
  const tbody = document.getElementById('rapidEntryTableBody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  const activeTemplate = window.templateManager.getActiveTemplate();
  const today = new Date().toISOString().split('T')[0];
  let savedCount = 0;

  rows.forEach(tr => {
    const workerName = tr.querySelector('[name="workerName"]')?.value?.trim();
    if (workerName) {
      const data = {
        date: today,
        workerName: workerName,
        trade: tr.querySelector('[name="trade"]')?.value || 'Helper',
        status: 'Present',
        shift: 'General',
        hoursWorked: parseFloat(tr.querySelector('[name="hoursWorked"]')?.value) || 8,
        otHours: parseFloat(tr.querySelector('[name="otHours"]')?.value) || 0,
        wageRate: parseFloat(tr.querySelector('[name="wageRate"]')?.value) || 600,
        locationTask: tr.querySelector('[name="locationTask"]')?.value || '',
        remarks: 'Batch entry'
      };
      window.dataManager.createRecord(activeTemplate.id, data);
      savedCount++;
    }
  });

  if (savedCount > 0) {
    closeRapidEntryModal();
    renderApp();
    showToast(`Saved ${savedCount} workers instantly!`, 'success');
  } else {
    showToast('Please enter at least one worker name.', 'warning');
  }
}

// Single & Bulk CRUD Actions
function deleteRecord(id) {
  const activeTemplate = window.templateManager.getActiveTemplate();
  if (confirm('Are you sure you want to delete this record?')) {
    window.dataManager.deleteRecord(activeTemplate.id, id);
    selectedRowIds.delete(id);
    renderApp();
    showToast('Record deleted.', 'info');
  }
}

function duplicateRecord(id) {
  const activeTemplate = window.templateManager.getActiveTemplate();
  const created = window.dataManager.duplicateRecord(activeTemplate.id, id);
  if (created) {
    renderApp();
    showToast('Record duplicated.', 'success');
  }
}

function toggleSelectRow(id, isChecked) {
  if (isChecked) selectedRowIds.add(id);
  else selectedRowIds.delete(id);
  renderApp();
}

function toggleSelectAll(checkbox) {
  const activeTemplate = window.templateManager.getActiveTemplate();
  const records = window.dataManager.getFilteredRecords(activeTemplate.id, currentFilters);
  if (checkbox.checked) {
    records.forEach(r => selectedRowIds.add(r.id));
  } else {
    selectedRowIds.clear();
  }
  renderApp();
}

function updateBulkActionsBar() {
  const count = selectedRowIds.size;
  const bar = document.getElementById('bulkActionsBar');
  const text = document.getElementById('bulkSelectedCount');
  if (bar && text) {
    if (count > 0) {
      bar.style.display = 'inline-flex';
      text.textContent = `${count} selected`;
    } else {
      bar.style.display = 'none';
    }
  }
}

function bulkDeleteSelected() {
  const count = selectedRowIds.size;
  if (count === 0) return;
  if (confirm(`Delete all ${count} selected records permanently?`)) {
    const activeTemplate = window.templateManager.getActiveTemplate();
    window.dataManager.bulkDeleteRecords(activeTemplate.id, Array.from(selectedRowIds));
    selectedRowIds.clear();
    renderApp();
    showToast(`Deleted ${count} records.`, 'info');
  }
}

// View Switching
function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  renderApp();
}

// Sorting and Filtering
function handleSort(columnKey) {
  if (currentFilters.sortBy === columnKey) {
    currentFilters.sortDir = currentFilters.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    currentFilters.sortBy = columnKey;
    currentFilters.sortDir = 'asc';
  }
  renderApp();
}

// Excel Export Modal & Handlers
function openExportModal() {
  const activeTemplate = window.templateManager.getActiveTemplate();
  const settings = window.exportManager.settings;

  document.getElementById('exportReportTitle').value = settings.reportTitle || activeTemplate.defaultExportTitle || activeTemplate.name.toUpperCase();
  document.getElementById('exportCompanyName').value = settings.companyName;
  document.getElementById('exportProjectName').value = settings.projectName;
  document.getElementById('exportSupervisorName').value = settings.supervisorName;
  document.getElementById('exportIncludeSummary').checked = settings.includeSummaryRow !== false;
  document.getElementById('exportIncludeSignatures').checked = settings.includeSignatures !== false;

  // Render Column Checkboxes
  const colContainer = document.getElementById('exportColumnsList');
  if (colContainer) {
    let colHtml = '';
    activeTemplate.columns.forEach(col => {
      colHtml += `
        <label style="font-size:0.82rem; display:flex; align-items:center; gap:0.4rem; padding:0.3rem 0; cursor:pointer;">
          <input type="checkbox" name="exportCol" value="${col.key}" ${col.export !== false ? 'checked' : ''}>
          ${col.label}
        </label>
      `;
    });
    colContainer.innerHTML = colHtml;
  }

  document.getElementById('exportModalOverlay').classList.add('active');
}

function closeExportModal() {
  document.getElementById('exportModalOverlay').classList.remove('active');
}

function triggerExcelExport() {
  const activeTemplate = window.templateManager.getActiveTemplate();
  const records = window.dataManager.getFilteredRecords(activeTemplate.id, currentFilters);

  // Gather chosen columns
  const selectedCols = [];
  document.querySelectorAll('input[name="exportCol"]:checked').forEach(cb => {
    selectedCols.push(cb.value);
  });

  const customOptions = {
    reportTitle: document.getElementById('exportReportTitle')?.value || window.exportManager.settings.reportTitle || activeTemplate.defaultExportTitle || activeTemplate.name.toUpperCase(),
    companyName: document.getElementById('exportCompanyName')?.value || window.exportManager.settings.companyName || 'ABC INFRASTRUCTURE LTD',
    projectName: document.getElementById('exportProjectName')?.value || window.exportManager.settings.projectName || 'Site Construction Project',
    contractorName: document.getElementById('exportContractorName')?.value || window.exportManager.settings.contractorName || 'Labour Contractors',
    supervisorName: document.getElementById('exportSupervisorName')?.value || window.exportManager.settings.supervisorName || 'Site Supervisor',
    includeSummaryRow: document.getElementById('exportIncludeSummary') ? document.getElementById('exportIncludeSummary').checked : true,
    includeSignatures: document.getElementById('exportIncludeSignatures') ? document.getElementById('exportIncludeSignatures').checked : true,
    selectedColumns: selectedCols.length > 0 ? selectedCols : null
  };

  window.exportManager.saveSettings(customOptions);
  const filename = window.exportManager.exportToExcel(activeTemplate.id, records, customOptions);
  closeExportModal();
  showToast(`Exported ${records.length} rows to ${filename}!`, 'success');
}

function triggerCSVExport() {
  const activeTemplate = window.templateManager.getActiveTemplate();
  const records = window.dataManager.getFilteredRecords(activeTemplate.id, currentFilters);
  window.exportManager.exportToCSV(activeTemplate.id, records);
  closeExportModal();
  showToast(`CSV file generated and downloaded!`, 'success');
}

// File Import Handler
function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const activeTemplate = window.templateManager.getActiveTemplate();
  showToast('Parsing file...', 'info');

  window.exportManager.importFromFile(file, activeTemplate.id, (result) => {
    if (result.success) {
      renderApp();
      showToast(`Successfully imported ${result.count} records from ${file.name}!`, 'success');
    } else {
      showToast(`Import failed: ${result.error}`, 'error');
    }
    e.target.value = '';
  });
}

// Mobile QR Modal
async function openMobilePairingModal() {
  const modal = document.getElementById('mobilePairModalOverlay');
  if (!modal) return;
  modal.classList.add('active');

  let mobileUrl = 'http://192.168.1.153:3000';
  try {
    const res = await fetch('/api/network-ip');
    if (res.ok) {
      const data = await res.json();
      if (data.url) mobileUrl = data.url;
    }
  } catch (e) {
    // If running on custom host or offline
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      mobileUrl = window.location.origin;
    }
  }

  window.currentMobileUrl = mobileUrl;
  window.pwaManager.renderQRCode('mobileQrContainer', mobileUrl);
  const displayEl = document.getElementById('mobileUrlDisplay');
  if (displayEl) displayEl.textContent = mobileUrl;
}

function copyMobileUrl() {
  const url = window.currentMobileUrl || 'http://192.168.1.153:3000';
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Copy URL: ' + url, 'info');
  });
}

function updateCustomMobileIp(newIp) {
  if (!newIp || !newIp.trim()) return;
  const cleanIp = newIp.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:3000$/, '');
  const newUrl = `http://${cleanIp}:3000`;
  window.currentMobileUrl = newUrl;
  window.pwaManager.renderQRCode('mobileQrContainer', newUrl);
  const displayEl = document.getElementById('mobileUrlDisplay');
  if (displayEl) displayEl.textContent = newUrl;
  showToast(`QR Code updated for: ${newUrl}`, 'info');
}

function closeMobilePairingModal() {
  const modal = document.getElementById('mobilePairModalOverlay');
  if (modal) modal.classList.remove('active');
}

// Mobile Install Guide Modal
function openMobileInstallModal(forcedOs = null) {
  const modal = document.getElementById('mobileInstallModalOverlay');
  if (!modal) return;
  modal.classList.add('active');

  const os = forcedOs || (window.pwaManager ? window.pwaManager.getDeviceOS() : 'desktop');
  const androidSection = document.getElementById('installStepsAndroid');
  const iosSection = document.getElementById('installStepsIos');
  const installBtn = document.getElementById('tapToInstallBtn');

  if (os === 'android') {
    if (androidSection) androidSection.style.border = '2px solid var(--accent-primary)';
    if (iosSection) iosSection.style.opacity = '0.5';
    if (installBtn) installBtn.innerHTML = '👉 Tap 3 Dots (⋮) at Top Right of Chrome';
  } else if (os === 'ios') {
    if (iosSection) iosSection.style.border = '2px solid var(--accent-primary)';
    if (androidSection) androidSection.style.opacity = '0.5';
    if (installBtn) installBtn.innerHTML = '👉 Tap Share (⎋) at Bottom of Safari';
  }
}

function closeMobileInstallModal() {
  const modal = document.getElementById('mobileInstallModalOverlay');
  if (modal) modal.classList.remove('active');
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '⚠️';
  else if (type === 'warning') icon = '🔔';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Event Listeners Setup
function setupEventListeners() {
  // Template Select
  document.getElementById('templateSelect')?.addEventListener('change', (e) => {
    window.templateManager.setActiveTemplateId(e.target.value);
    selectedRowIds.clear();
    currentFilters.category = 'all';
    renderApp();
    showToast(`Switched to ${window.templateManager.getActiveTemplate().name}`, 'info');
  });

  // Search input
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      renderApp();
    });
  }

  // Date range filter
  document.getElementById('dateRangeSelect')?.addEventListener('change', (e) => {
    currentFilters.dateRange = e.target.value;
    renderApp();
  });

  // Category filter
  document.getElementById('categoryFilterSelect')?.addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    renderApp();
  });

  // View switchers
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.action === 'add') openAddModal();
      else if (item.dataset.action === 'export') openExportModal();
      else if (item.dataset.action === 'mobile') openMobileInstallModal();
      else if (item.dataset.view) switchView(item.dataset.view);
    });
  });

  // Entry Form Submit
  document.getElementById('entryForm')?.addEventListener('submit', handleSaveEntryForm);

  // Install PWA Buttons
  document.querySelectorAll('.btn-install-pwa').forEach(btn => {
    btn.addEventListener('click', () => window.pwaManager.promptInstall());
  });

  // File import input
  document.getElementById('excelFileInput')?.addEventListener('change', handleFileImport);
}

// Make functions accessible globally
window.openAddModal = openAddModal;
window.openRapidEntryModal = openRapidEntryModal;
window.closeRapidEntryModal = closeRapidEntryModal;
window.addRapidEntryRow = addRapidEntryRow;
window.saveRapidEntryRows = saveRapidEntryRows;
window.openEditModal = openEditModal;
window.closeEntryModal = closeEntryModal;
window.deleteRecord = deleteRecord;
window.duplicateRecord = duplicateRecord;
window.toggleSelectRow = toggleSelectRow;
window.toggleSelectAll = toggleSelectAll;
window.bulkDeleteSelected = bulkDeleteSelected;
window.switchView = switchView;
window.handleSort = handleSort;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.triggerExcelExport = triggerExcelExport;
window.triggerCSVExport = triggerCSVExport;
window.openMobilePairingModal = openMobilePairingModal;
window.closeMobilePairingModal = closeMobilePairingModal;
window.copyMobileUrl = copyMobileUrl;
window.updateCustomMobileIp = updateCustomMobileIp;
window.openMobileInstallModal = openMobileInstallModal;
window.closeMobileInstallModal = closeMobileInstallModal;
window.showToast = showToast;
window.toggleTheme = toggleTheme;
window.stepNumberField = stepNumberField;
window.recalculateFormFormulas = recalculateFormFormulas;
window.updateColumnProperty = updateColumnProperty;
window.removeColumnFromTemplate = removeColumnFromTemplate;
window.addNewColumnPrompt = addNewColumnPrompt;
window.resetActiveTemplateDefaults = resetActiveTemplateDefaults;
window.createNewCustomTemplate = createNewCustomTemplate;
