/**
 * DPR Mobile Pro - CRUD Operations & Data Management
 * Handles Create, Read, Update, Delete, Filtering, Sorting, and Summary Metrics
 */

class DataManager {
  constructor() {
    this.storagePrefix = 'dpr_data_';
    this.initSampleDataIfEmpty();
  }

  getStorageKey(templateId) {
    return `${this.storagePrefix}${templateId}`;
  }

  getRawRecords(templateId) {
    try {
      const data = localStorage.getItem(this.getStorageKey(templateId));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read records from storage', e);
      return [];
    }
  }

  saveRawRecords(templateId, records) {
    try {
      localStorage.setItem(this.getStorageKey(templateId), JSON.stringify(records));
      return true;
    } catch (e) {
      console.error('Failed to save records', e);
      return false;
    }
  }

  computeFormulas(template, record) {
    const computed = { ...record };
    template.columns.forEach(col => {
      if (col.type === 'calculated' && col.formula) {
        try {
          // Safe evaluation using record variables
          const formulaKeys = Object.keys(record);
          const formulaVals = formulaKeys.map(k => {
            const num = parseFloat(record[k]);
            return isNaN(num) ? 0 : num;
          });
          
          // Construct function with record fields
          const fn = new Function(...formulaKeys, `return (${col.formula});`);
          const result = fn(...formulaVals);
          computed[col.key] = isFinite(result) ? Math.round(result * 100) / 100 : 0;
        } catch (err) {
          console.warn(`Formula eval failed for ${col.key}:`, err);
          computed[col.key] = 0;
        }
      }
    });
    return computed;
  }

  createRecord(templateId, rawData) {
    const template = window.templateManager.templates[templateId] || window.templateManager.getActiveTemplate();
    const records = this.getRawRecords(templateId);
    
    const now = new Date();
    const id = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    let processed = {
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...rawData
    };

    // Ensure date defaults to today if missing
    if (!processed.date) {
      processed.date = now.toISOString().split('T')[0];
    }

    processed = this.computeFormulas(template, processed);
    records.unshift(processed); // latest on top
    this.saveRawRecords(templateId, records);
    return processed;
  }

  updateRecord(templateId, id, updatedFields) {
    const template = window.templateManager.templates[templateId] || window.templateManager.getActiveTemplate();
    const records = this.getRawRecords(templateId);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    let updated = {
      ...records[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    updated = this.computeFormulas(template, updated);
    records[index] = updated;
    this.saveRawRecords(templateId, records);
    return updated;
  }

  deleteRecord(templateId, id) {
    const records = this.getRawRecords(templateId);
    const filtered = records.filter(r => r.id !== id);
    this.saveRawRecords(templateId, filtered);
    return filtered.length !== records.length;
  }

  bulkDeleteRecords(templateId, ids) {
    const idSet = new Set(ids);
    const records = this.getRawRecords(templateId);
    const filtered = records.filter(r => !idSet.has(r.id));
    this.saveRawRecords(templateId, filtered);
    return records.length - filtered.length;
  }

  duplicateRecord(templateId, id) {
    const records = this.getRawRecords(templateId);
    const found = records.find(r => r.id === id);
    if (!found) return null;

    const copy = { ...found };
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    
    // Auto increment worker name or title if exists
    if (copy.workerName) copy.workerName += ' (Copy)';
    if (copy.activity) copy.activity += ' (Copy)';

    return this.createRecord(templateId, copy);
  }

  getRecordById(templateId, id) {
    const records = this.getRawRecords(templateId);
    return records.find(r => r.id === id) || null;
  }

  getFilteredRecords(templateId, options = {}) {
    const records = this.getRawRecords(templateId);
    const {
      search = '',
      dateRange = 'all', // 'today', 'yesterday', 'this_week', 'this_month', 'all'
      category = 'all',
      status = 'all',
      sortBy = 'date',
      sortDir = 'desc'
    } = options;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return records.filter(r => {
      // Date filter
      if (dateRange === 'today' && r.date !== todayStr) return false;
      if (dateRange === 'yesterday' && r.date !== yesterdayStr) return false;
      if (dateRange === 'this_week') {
        const rDate = new Date(r.date);
        if (rDate < weekAgo) return false;
      }
      if (dateRange === 'this_month') {
        const rDate = new Date(r.date);
        if (rDate < monthAgo) return false;
      }

      // Category / Trade filter
      if (category !== 'all') {
        const matchVal = r.trade || r.unit || r.resourceType || '';
        if (matchVal.toLowerCase() !== category.toLowerCase()) return false;
      }

      // Status filter
      if (status !== 'all' && r.status) {
        if (r.status.toLowerCase() !== status.toLowerCase()) return false;
      }

      // Search term
      if (search.trim()) {
        const query = search.toLowerCase();
        const rowStr = Object.values(r).join(' ').toLowerCase();
        if (!rowStr.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSummaryStats(templateId, filteredRecords = null) {
    const template = window.templateManager.templates[templateId] || window.templateManager.getActiveTemplate();
    const records = filteredRecords || this.getRawRecords(templateId);

    const stats = {
      totalCount: records.length,
      columnsSummary: {},
      badgeCounts: {}
    };

    // Calculate sum/averages for columns marked with summary
    template.columns.forEach(col => {
      if (col.summary === 'sum') {
        const sum = records.reduce((acc, r) => {
          const val = parseFloat(r[col.key]);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
        stats.columnsSummary[col.key] = Math.round(sum * 100) / 100;
      }
    });

    // Specific stats for Labour Attendance
    if (templateId === 'labour_attendance') {
      stats.presentCount = records.filter(r => (r.status || '').toLowerCase() === 'present').length;
      stats.halfDayCount = records.filter(r => (r.status || '').toLowerCase() === 'half-day').length;
      stats.absentCount = records.filter(r => (r.status || '').toLowerCase() === 'absent').length;
      stats.totalHours = stats.columnsSummary['hoursWorked'] || 0;
      stats.totalOT = stats.columnsSummary['otHours'] || 0;
      stats.totalWages = stats.columnsSummary['totalPay'] || 0;
    } 
    // Specific stats for DPR
    else if (templateId === 'daily_progress_report') {
      stats.totalExecuted = stats.columnsSummary['executedToday'] || 0;
      stats.totalSkilled = stats.columnsSummary['skilledLabour'] || 0;
      stats.totalUnskilled = stats.columnsSummary['unskilledLabour'] || 0;
    }
    // Specific stats for Material
    else if (templateId === 'material_machinery') {
      stats.totalReceived = stats.columnsSummary['receivedQty'] || 0;
      stats.totalConsumed = stats.columnsSummary['consumedQty'] || 0;
      stats.totalFuel = stats.columnsSummary['fuelConsumed'] || 0;
    }

    return stats;
  }

  initSampleDataIfEmpty() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check Labour Attendance
    if (!localStorage.getItem(this.getStorageKey('labour_attendance'))) {
      const sampleLabour = [
        {
          id: 'rec_sample_1',
          date: today,
          workerId: 'L-101',
          workerName: 'Ramesh Patel',
          trade: 'Mason',
          status: 'Present',
          shift: 'General',
          hoursWorked: 8,
          otHours: 2,
          wageRate: 750,
          totalPay: 937.5,
          locationTask: 'Tower A - 3rd Floor Brick Masonry',
          remarks: 'Good progress'
        },
        {
          id: 'rec_sample_2',
          date: today,
          workerId: 'L-102',
          workerName: 'Suresh Kumar',
          trade: 'Barbender',
          status: 'Present',
          shift: 'General',
          hoursWorked: 8,
          otHours: 0,
          wageRate: 700,
          totalPay: 700,
          locationTask: 'Basement Slab Steel Binding',
          remarks: 'Completed section 4'
        },
        {
          id: 'rec_sample_3',
          date: today,
          workerId: 'L-103',
          workerName: 'Manoj Singh',
          trade: 'Carpenter',
          status: 'Present',
          shift: 'General',
          hoursWorked: 8,
          otHours: 1,
          wageRate: 700,
          totalPay: 787.5,
          locationTask: 'Column Shuttering Work Grid B12',
          remarks: 'Passed inspection'
        },
        {
          id: 'rec_sample_4',
          date: today,
          workerId: 'L-104',
          workerName: 'Vikram Yadav',
          trade: 'Helper (Unskilled)',
          status: 'Present',
          shift: 'General',
          hoursWorked: 8,
          otHours: 2,
          wageRate: 500,
          totalPay: 625,
          locationTask: 'Material shifting & concrete curing',
          remarks: 'Active'
        },
        {
          id: 'rec_sample_5',
          date: today,
          workerId: 'L-105',
          workerName: 'Sunil Sharma',
          trade: 'Electrician',
          status: 'Half-Day',
          shift: 'Morning',
          hoursWorked: 4,
          otHours: 0,
          wageRate: 800,
          totalPay: 400,
          locationTask: 'Conduit laying 2nd floor flat 201',
          remarks: 'Left at 1 PM medical'
        },
        {
          id: 'rec_sample_6',
          date: yesterdayStr,
          workerId: 'L-101',
          workerName: 'Ramesh Patel',
          trade: 'Mason',
          status: 'Present',
          shift: 'General',
          hoursWorked: 8,
          otHours: 1,
          wageRate: 750,
          totalPay: 843.75,
          locationTask: 'Tower A - 2nd Floor Plastering',
          remarks: 'Done'
        },
        {
          id: 'rec_sample_7',
          date: yesterdayStr,
          workerId: 'L-102',
          workerName: 'Suresh Kumar',
          trade: 'Barbender',
          status: 'Present',
          shift: 'General',
          hoursWorked: 8,
          otHours: 0,
          wageRate: 700,
          totalPay: 700,
          locationTask: 'Column Steel Cage Prefabrication',
          remarks: 'Done'
        }
      ];
      this.saveRawRecords('labour_attendance', sampleLabour);
    }

    // Check DPR
    if (!localStorage.getItem(this.getStorageKey('daily_progress_report'))) {
      const sampleDPR = [
        {
          id: 'rec_dpr_1',
          date: today,
          itemNo: 'BOQ-04',
          activity: 'R.C.C M25 Grade Concrete in 4th Floor Slab',
          location: 'Tower B - Grid 1 to 8',
          unit: 'Cum (m³)',
          plannedQty: 45,
          executedToday: 42.5,
          cumulativeQty: 320,
          skilledLabour: 6,
          unskilledLabour: 12,
          equipment: 'Boom Placer & 3 Transit Mixers',
          obstacles: 'None, pour completed smoothly'
        },
        {
          id: 'rec_dpr_2',
          date: today,
          itemNo: 'BOQ-12',
          activity: 'AAC Block Masonry in 200mm Outer Walls',
          location: 'Tower A - 2nd Floor',
          unit: 'Sqm (m²)',
          plannedQty: 80,
          executedToday: 74,
          cumulativeQty: 450,
          skilledLabour: 4,
          unskilledLabour: 6,
          equipment: 'Hoist Winch',
          obstacles: 'Minor hoist maintenance (30 min)'
        }
      ];
      this.saveRawRecords('daily_progress_report', sampleDPR);
    }
  }
}

// Global instance
window.dataManager = new DataManager();
