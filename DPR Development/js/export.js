/**
 * DPR Mobile Pro - Formatted Excel (.xlsx) & CSV Export / Import Engine
 * Produces structured Microsoft Excel workbooks matching exact user-defined hardcopy formats
 */

class ExportManager {
  constructor() {
    this.defaultSettings = {
      companyName: 'ABC INFRASTRUCTURE & BUILDERS PVT. LTD.',
      projectName: 'Metro Heights Tower B - Construction Site',
      supervisorName: 'Site Supervisor In-Charge',
      contractorName: 'Prime Contractors & Labour Supply',
      includeHeaderBlock: true,
      includeSummaryRow: true,
      includeSignatures: true
    };
    this.loadSettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('dpr_export_settings');
      if (saved) {
        this.settings = { ...this.defaultSettings, ...JSON.parse(saved) };
      } else {
        this.settings = { ...this.defaultSettings };
      }
    } catch (e) {
      this.settings = { ...this.defaultSettings };
    }
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('dpr_export_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save export settings', e);
    }
  }

  exportToExcel(templateId, records, customOptions = {}) {
    if (typeof XLSX === 'undefined') {
      alert('Excel export library is loading. Please try again in a moment.');
      return;
    }

    const template = window.templateManager.templates[templateId] || window.templateManager.getActiveTemplate();
    const opts = { ...this.settings, ...customOptions };
    
    // Determine export columns (respect user toggle and template config)
    const exportCols = template.columns.filter(col => {
      if (opts.selectedColumns && opts.selectedColumns.length > 0) {
        return opts.selectedColumns.includes(col.key);
      }
      return col.export !== false;
    });

    if (exportCols.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [];
    const merges = [];

    let currentRow = 0;

    // 1. Report Header Block
    if (opts.includeHeaderBlock) {
      const colSpan = Math.max(exportCols.length - 1, 1);

      // Row 0: Company Name
      wsData.push([opts.companyName.toUpperCase()]);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colSpan } });
      currentRow++;

      // Row 1: Report Title
      const reportTitle = opts.reportTitle || template.defaultExportTitle || template.name.toUpperCase();
      wsData.push([reportTitle]);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colSpan } });
      currentRow++;

      // Row 2: Project / Site Info
      const projectRow = [`Project: ${opts.projectName}   |   Contractor: ${opts.contractorName}`];
      wsData.push(projectRow);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colSpan } });
      currentRow++;

      // Row 3: Meta Info (Date generated & Supervisor)
      const nowFormatted = new Date().toLocaleString();
      const metaRow = [`Generated On: ${nowFormatted}   |   Supervisor: ${opts.supervisorName}   |   Total Entries: ${records.length}`];
      wsData.push(metaRow);
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: colSpan } });
      currentRow++;

      // Row 4: Blank Spacer Row
      wsData.push([]);
      currentRow++;
    }

    // 2. Table Header Row
    const headerLabels = exportCols.map(c => c.label.toUpperCase());
    wsData.push(headerLabels);
    const tableHeaderRowIndex = currentRow;
    currentRow++;

    // 3. Data Rows
    records.forEach(record => {
      const row = exportCols.map(col => {
        const val = record[col.key];
        if (val === undefined || val === null) return '';
        if (col.type === 'number' || col.type === 'calculated') {
          const num = parseFloat(val);
          return isNaN(num) ? '' : num;
        }
        return String(val);
      });
      wsData.push(row);
      currentRow++;
    });

    // 4. Grand Total / Summary Row
    if (opts.includeSummaryRow && records.length > 0) {
      const summaryRow = exportCols.map((col, idx) => {
        if (idx === 0) return 'TOTAL / SUMMARY';
        if (col.summary === 'sum') {
          const sum = records.reduce((acc, r) => {
            const num = parseFloat(r[col.key]);
            return acc + (isNaN(num) ? 0 : num);
          }, 0);
          return Math.round(sum * 100) / 100;
        }
        return '';
      });
      wsData.push(summaryRow);
      currentRow++;
    }

    // 5. Signature Footer Block
    if (opts.includeSignatures) {
      wsData.push([]); // blank row
      currentRow++;

      const halfCol = Math.floor(exportCols.length / 2);
      const signRow = new Array(exportCols.length).fill('');
      signRow[0] = 'Prepared & Verified By (Supervisor)';
      if (halfCol > 0 && halfCol < exportCols.length) {
        signRow[halfCol] = 'Checked & Approved By (Project Engineer / Client)';
      }
      wsData.push(signRow);
      currentRow++;

      const dottedRow = new Array(exportCols.length).fill('');
      dottedRow[0] = 'Sign: __________________________';
      if (halfCol > 0 && halfCol < exportCols.length) {
        dottedRow[halfCol] = 'Sign: __________________________';
      }
      wsData.push(dottedRow);
      currentRow++;
    }

    // Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply merges
    if (merges.length > 0) {
      ws['!merges'] = merges;
    }

    // Set Column Widths (ch)
    ws['!cols'] = exportCols.map(c => ({
      wch: Math.max(c.width || 16, c.label.length + 4)
    }));

    // Append sheet to workbook
    const safeSheetName = (template.name || 'DPR_Data').substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${template.id}_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);

    return fileName;
  }

  exportToCSV(templateId, records, customOptions = {}) {
    const template = window.templateManager.templates[templateId] || window.templateManager.getActiveTemplate();
    const opts = { ...this.settings, ...customOptions };

    const exportCols = template.columns.filter(col => {
      if (opts.selectedColumns && opts.selectedColumns.length > 0) {
        return opts.selectedColumns.includes(col.key);
      }
      return col.export !== false;
    });

    const rows = [];

    // Header
    rows.push(exportCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(','));

    // Data
    records.forEach(r => {
      const line = exportCols.map(col => {
        let val = r[col.key];
        if (val === undefined || val === null) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
      rows.push(line);
    });

    // Summary Row
    if (opts.includeSummaryRow && records.length > 0) {
      const summaryLine = exportCols.map((col, idx) => {
        if (idx === 0) return '"TOTAL"';
        if (col.summary === 'sum') {
          const sum = records.reduce((acc, r) => {
            const num = parseFloat(r[col.key]);
            return acc + (isNaN(num) ? 0 : num);
          }, 0);
          return `"${Math.round(sum * 100) / 100}"`;
        }
        return '""';
      }).join(',');
      rows.push(summaryLine);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\r\n'));
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${template.id}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  importFromFile(file, templateId, callback) {
    if (!file) return;
    const reader = new FileReader();
    const template = window.templateManager.templates[templateId] || window.templateManager.getActiveTemplate();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!json || json.length === 0) {
          callback({ success: false, error: 'File is empty' });
          return;
        }

        // Find header row (first row with multiple text matches to column labels)
        let headerRowIndex = 0;
        let bestMatchScore = 0;

        for (let i = 0; i < Math.min(json.length, 10); i++) {
          const row = json[i];
          if (!Array.isArray(row)) continue;
          let score = 0;
          row.forEach(cell => {
            const str = String(cell || '').toLowerCase().trim();
            if (template.columns.some(c => c.label.toLowerCase() === str || c.key.toLowerCase() === str)) {
              score++;
            }
          });
          if (score > bestMatchScore) {
            bestMatchScore = score;
            headerRowIndex = i;
          }
        }

        const headerRow = json[headerRowIndex] || [];
        // Map header index to column key
        const colMapping = {};
        headerRow.forEach((cellVal, idx) => {
          const cleanVal = String(cellVal || '').trim().toLowerCase();
          const matchedCol = template.columns.find(c => 
            c.label.toLowerCase() === cleanVal || 
            c.key.toLowerCase() === cleanVal ||
            cleanVal.includes(c.key.toLowerCase())
          );
          if (matchedCol) {
            colMapping[idx] = matchedCol.key;
          }
        });

        // Parse rows
        const importedRecords = [];
        for (let i = headerRowIndex + 1; i < json.length; i++) {
          const row = json[i];
          if (!Array.isArray(row) || row.length === 0) continue;
          // Skip if all cells empty or starts with "TOTAL"
          const firstCell = String(row[0] || '').trim();
          if (firstCell.startsWith('TOTAL') || firstCell.startsWith('Prepared') || firstCell.startsWith('Sign')) {
            continue;
          }

          const recordData = {};
          let hasContent = false;
          Object.keys(colMapping).forEach(colIdx => {
            const key = colMapping[colIdx];
            const val = row[colIdx];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              recordData[key] = val;
              hasContent = true;
            }
          });

          if (hasContent) {
            const created = window.dataManager.createRecord(templateId, recordData);
            importedRecords.push(created);
          }
        }

        callback({ success: true, count: importedRecords.length });
      } catch (err) {
        console.error('Import error:', err);
        callback({ success: false, error: err.message || 'Failed to parse file' });
      }
    };

    reader.readAsArrayBuffer(file);
  }
}

// Global instance
window.exportManager = new ExportManager();
