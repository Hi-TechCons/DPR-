/**
 * DPR Mobile Pro - Templates & Schema Engine
 * Supports pre-built industry templates + user-defined custom hardcopy templates
 */

const DEFAULT_TEMPLATES = {
  labour_attendance: {
    id: 'labour_attendance',
    name: 'Labour Attendance & Daily Wages',
    category: 'Manpower & Wages',
    description: 'Digital replica of physical daily labour muster roll and wage register',
    defaultExportTitle: 'DAILY LABOUR ATTENDANCE & WAGE REGISTER',
    columns: [
      { key: 'date', label: 'Date', type: 'date', required: true, export: true, width: 12 },
      { key: 'workerId', label: 'Worker ID / Token', type: 'text', required: false, export: true, width: 14 },
      { key: 'workerName', label: 'Worker Name', type: 'text', required: true, export: true, width: 22 },
      {
        key: 'trade',
        label: 'Trade / Skill Category',
        type: 'select',
        options: ['Mason', 'Carpenter', 'Barbender', 'Electrician', 'Plumber', 'Welder', 'Painter', 'Fitter', 'Helper (Unskilled)', 'Supervisor'],
        required: true,
        export: true,
        width: 18
      },
      {
        key: 'status',
        label: 'Attendance Status',
        type: 'select',
        options: ['Present', 'Absent', 'Half-Day', 'Overtime Only'],
        required: true,
        export: true,
        width: 15
      },
      { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening', 'Night', 'General'], required: false, export: true, width: 12 },
      { key: 'hoursWorked', label: 'Regular Hours', type: 'number', step: 0.5, default: 8, required: true, export: true, summary: 'sum', width: 14 },
      { key: 'otHours', label: 'OT Hours', type: 'number', step: 0.5, default: 0, required: false, export: true, summary: 'sum', width: 12 },
      { key: 'wageRate', label: 'Wage Rate (₹/day or hr)', type: 'number', default: 600, required: true, export: true, width: 16 },
      {
        key: 'totalPay',
        label: 'Total Pay (₹)',
        type: 'calculated',
        formula: 'wageRate * (hoursWorked / 8) + (otHours * (wageRate / 8) * 1.5)',
        export: true,
        summary: 'sum',
        width: 16
      },
      { key: 'locationTask', label: 'Task & Location / Tower', type: 'text', required: false, export: true, width: 26 },
      { key: 'remarks', label: 'Remarks / Signature', type: 'text', required: false, export: true, width: 20 }
    ]
  },

  daily_progress_report: {
    id: 'daily_progress_report',
    name: 'Daily Progress Report (DPR)',
    category: 'Work Execution',
    description: 'Physical DPR hardcopy tracking daily activity quantities, manpower, and delays',
    defaultExportTitle: 'DAILY PROGRESS REPORT (DPR)',
    columns: [
      { key: 'date', label: 'Date', type: 'date', required: true, export: true, width: 12 },
      { key: 'itemNo', label: 'Item / BOQ No', type: 'text', required: false, export: true, width: 12 },
      { key: 'activity', label: 'Activity Description', type: 'text', required: true, export: true, width: 28 },
      { key: 'location', label: 'Location / Grid / Floor', type: 'text', required: true, export: true, width: 20 },
      { key: 'unit', label: 'Unit', type: 'select', options: ['Cum (m³)', 'Sqm (m²)', 'Rmt (m)', 'Ton', 'Nos', 'Kg', 'Bags'], required: true, export: true, width: 12 },
      { key: 'plannedQty', label: 'Planned Qty', type: 'number', required: false, export: true, summary: 'sum', width: 14 },
      { key: 'executedToday', label: 'Executed Today', type: 'number', required: true, export: true, summary: 'sum', width: 15 },
      { key: 'cumulativeQty', label: 'Cumulative Qty', type: 'number', required: false, export: true, summary: 'sum', width: 15 },
      { key: 'skilledLabour', label: 'Skilled Labour', type: 'number', default: 0, required: false, export: true, summary: 'sum', width: 14 },
      { key: 'unskilledLabour', label: 'Unskilled Labour', type: 'number', default: 0, required: false, export: true, summary: 'sum', width: 15 },
      { key: 'equipment', label: 'Equipment Deployed', type: 'text', required: false, export: true, width: 20 },
      { key: 'obstacles', label: 'Delays / Hindrances', type: 'text', required: false, export: true, width: 24 }
    ]
  },

  material_machinery: {
    id: 'material_machinery',
    name: 'Material & Machinery Log',
    category: 'Resources & Plant',
    description: 'Hardcopy log for construction materials received/consumed and plant hours',
    defaultExportTitle: 'SITE MATERIAL & MACHINERY UTILIZATION LOG',
    columns: [
      { key: 'date', label: 'Date', type: 'date', required: true, export: true, width: 12 },
      { key: 'resourceType', label: 'Category', type: 'select', options: ['Material Delivery', 'Material Consumption', 'Heavy Machinery', 'Light Tool'], required: true, export: true, width: 18 },
      { key: 'itemName', label: 'Item / Machine Name', type: 'text', required: true, export: true, width: 24 },
      { key: 'supplierOrMake', label: 'Supplier / Machine No', type: 'text', required: false, export: true, width: 20 },
      { key: 'challanRef', label: 'Challan / Log Sheet #', type: 'text', required: false, export: true, width: 18 },
      { key: 'receivedQty', label: 'Received Qty', type: 'number', default: 0, export: true, summary: 'sum', width: 14 },
      { key: 'consumedQty', label: 'Consumed Qty', type: 'number', default: 0, export: true, summary: 'sum', width: 14 },
      { key: 'balanceStock', label: 'Balance / Operating Hrs', type: 'number', default: 0, export: true, width: 18 },
      { key: 'fuelConsumed', label: 'Diesel / Fuel (Litres)', type: 'number', default: 0, export: true, summary: 'sum', width: 18 },
      { key: 'operatorSupervisor', label: 'Operator / Verified By', type: 'text', required: false, export: true, width: 20 },
      { key: 'remarks', label: 'Condition / Notes', type: 'text', required: false, export: true, width: 22 }
    ]
  }
};

class TemplateManager {
  constructor() {
    this.storageKey = 'dpr_custom_templates_v2';
    this.activeTemplateKey = 'dpr_active_template_id';
    this.templates = this.loadTemplates();
  }

  loadTemplates() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return { ...DEFAULT_TEMPLATES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse custom templates from storage, using defaults', e);
    }
    return { ...DEFAULT_TEMPLATES };
  }

  saveTemplates() {
    try {
      // Save only custom or modified templates
      const customTemplates = {};
      Object.keys(this.templates).forEach(key => {
        customTemplates[key] = this.templates[key];
      });
      localStorage.setItem(this.storageKey, JSON.stringify(customTemplates));
    } catch (e) {
      console.error('Error saving templates', e);
    }
  }

  getActiveTemplateId() {
    return localStorage.getItem(this.activeTemplateKey) || 'labour_attendance';
  }

  setActiveTemplateId(id) {
    if (this.templates[id]) {
      localStorage.setItem(this.activeTemplateKey, id);
      return true;
    }
    return false;
  }

  getActiveTemplate() {
    const id = this.getActiveTemplateId();
    return this.templates[id] || this.templates['labour_attendance'];
  }

  getAllTemplates() {
    return Object.values(this.templates);
  }

  createCustomTemplate(name, description, baseTemplateId = null) {
    const id = 'custom_' + Date.now();
    let columns = [];
    if (baseTemplateId && this.templates[baseTemplateId]) {
      columns = JSON.parse(JSON.stringify(this.templates[baseTemplateId].columns));
    } else {
      columns = [
        { key: 'date', label: 'Date', type: 'date', required: true, export: true, width: 12 },
        { key: 'name', label: 'Name / Item', type: 'text', required: true, export: true, width: 22 },
        { key: 'category', label: 'Category', type: 'text', required: false, export: true, width: 18 },
        { key: 'quantity', label: 'Quantity / Hours', type: 'number', required: false, export: true, summary: 'sum', width: 16 },
        { key: 'remarks', label: 'Remarks', type: 'text', required: false, export: true, width: 24 }
      ];
    }

    const newTemplate = {
      id,
      name: name || 'Custom Hardcopy Format',
      category: 'User Custom Format',
      description: description || 'Custom sheet layout designed to match paper hardcopy',
      defaultExportTitle: (name || 'CUSTOM REPORT').toUpperCase(),
      columns,
      isCustom: true
    };

    this.templates[id] = newTemplate;
    this.saveTemplates();
    this.setActiveTemplateId(id);
    return newTemplate;
  }

  updateTemplate(id, updatedData) {
    if (this.templates[id]) {
      this.templates[id] = { ...this.templates[id], ...updatedData };
      this.saveTemplates();
      return this.templates[id];
    }
    return null;
  }

  deleteTemplate(id) {
    if (DEFAULT_TEMPLATES[id]) {
      // Cannot delete built-in template, but can reset it
      this.templates[id] = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES[id]));
      this.saveTemplates();
      return true;
    }
    if (this.templates[id]) {
      delete this.templates[id];
      this.saveTemplates();
      if (this.getActiveTemplateId() === id) {
        this.setActiveTemplateId('labour_attendance');
      }
      return true;
    }
    return false;
  }

  addColumn(templateId, columnObj) {
    const template = this.templates[templateId];
    if (!template) return false;

    // Ensure unique key
    let key = (columnObj.key || columnObj.label.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
    if (!key) key = 'field_' + Date.now();
    let uniqueKey = key;
    let counter = 1;
    while (template.columns.some(c => c.key === uniqueKey)) {
      uniqueKey = `${key}_${counter++}`;
    }

    const newCol = {
      key: uniqueKey,
      label: columnObj.label || 'New Column',
      type: columnObj.type || 'text',
      options: columnObj.options || [],
      required: Boolean(columnObj.required),
      export: columnObj.export !== false,
      summary: columnObj.summary || null,
      width: columnObj.width || 18,
      default: columnObj.default !== undefined ? columnObj.default : null,
      formula: columnObj.formula || null
    };

    template.columns.push(newCol);
    this.saveTemplates();
    return newCol;
  }

  removeColumn(templateId, columnKey) {
    const template = this.templates[templateId];
    if (!template) return false;
    template.columns = template.columns.filter(c => c.key !== columnKey);
    this.saveTemplates();
    return true;
  }

  reorderColumns(templateId, newColumnKeys) {
    const template = this.templates[templateId];
    if (!template) return false;
    const colMap = {};
    template.columns.forEach(c => { colMap[c.key] = c; });
    const reordered = [];
    newColumnKeys.forEach(k => {
      if (colMap[k]) reordered.push(colMap[k]);
    });
    // Add any remaining
    template.columns.forEach(c => {
      if (!newColumnKeys.includes(c.key)) reordered.push(c);
    });
    template.columns = reordered;
    this.saveTemplates();
    return true;
  }

  resetToDefaults(templateId) {
    if (DEFAULT_TEMPLATES[templateId]) {
      this.templates[templateId] = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES[templateId]));
      this.saveTemplates();
      return true;
    }
    return false;
  }
}

// Global instance
window.templateManager = new TemplateManager();
