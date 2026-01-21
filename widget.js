// Grist PDF Widget - Main Logic
// Auto-detects table columns and generates professional PDFs

// Default Configuration
const DEFAULT_CONFIG = {
  logoUrl: null,
  institutionName: 'Organization',
  nameColumn: 'Name',
  documentTitle: 'Official Record',
  orientation: 'portrait',
  pageSize: 'a4',
  includeTimestamp: true,
  includeImages: true,
  includeHeaders: true,
  includeSignatureLine: true,
  excludeColumns: 'id,createdAt,updatedAt'
};

// State
let currentRecord = null;
let allRecords = [];
let tableMetadata = null;
let config = { ...DEFAULT_CONFIG };

// UI Elements
const downloadBtn = document.getElementById('downloadBtn');
const reloadBtn = document.getElementById('reloadBtn');
const settingsToggle = document.getElementById('settingsToggle');
const configPanel = document.getElementById('configPanel');
const previewDiv = document.getElementById('pdfPreview');
const statusDiv = document.getElementById('status');
const rowSelector = document.getElementById('rowSelector');

// Configuration UI Elements
const logoUploadInput = document.getElementById('logoUpload');
const institutionNameInput = document.getElementById('institutionName');
const nameColumnInput = document.getElementById('nameColumn');
const documentTitleInput = document.getElementById('documentTitle');
const orientationSelect = document.getElementById('orientation');
const pageSizeSelect = document.getElementById('pageSize');
const includeTimestampCheckbox = document.getElementById('includeTimestamp');
const includeImagesCheckbox = document.getElementById('includeImages');
const includeHeadersCheckbox = document.getElementById('includeHeaders');
const includeSignatureLineCheckbox = document.getElementById('includeSignatureLine');
const excludeColumnsInput = document.getElementById('excludeColumns');
const applyConfigBtn = document.getElementById('applyConfig');
const resetConfigBtn = document.getElementById('resetConfig');

// ============================================
// Configuration Management
// ============================================

function loadConfig() {
  try {
    const saved = localStorage.getItem('pdfWidgetConfig');
    if (saved) {
      config = { ...config, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  updateConfigUI();
}

function saveConfig() {
  try {
    localStorage.setItem('pdfWidgetConfig', JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

function updateConfigUI() {
  if (config.logoUrl) {
    logoUploadInput.value = '';
    const label = logoUploadInput.parentElement.querySelector('small');
    label.textContent = '✓ Logo loaded';
    label.style.color = '#2e7d32';
  }
  institutionNameInput.value = config.institutionName;
  nameColumnInput.value = config.nameColumn;
  documentTitleInput.value = config.documentTitle;
  orientationSelect.value = config.orientation;
  pageSizeSelect.value = config.pageSize;
  includeTimestampCheckbox.checked = config.includeTimestamp;
  includeImagesCheckbox.checked = config.includeImages;
  includeHeadersCheckbox.checked = config.includeHeaders;
  includeSignatureLineCheckbox.checked = config.includeSignatureLine;
  excludeColumnsInput.value = config.excludeColumns;
}

// ============================================
// Status Messages
// ============================================

function showStatus(message, type = 'info') {
  statusDiv.textContent = '';
  statusDiv.className = 'status visible ' + type;
  
  if (type === 'loading') {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    statusDiv.appendChild(spinner);
  }
  
  const text = document.createElement('span');
  text.textContent = message;
  statusDiv.appendChild(text);
}

function hideStatus() {
  statusDiv.className = 'status';
}

// ============================================
// Grist Integration
// ============================================

// Initialize Grist widget
grist.ready();

// Handle single record (the selected row)
grist.onRecord(function(record) {
  console.log('Record received:', record);
  
  if (record && Object.keys(record).length > 0) {
    currentRecord = record;
    renderPreview();
    downloadBtn.disabled = false;
  } else {
    renderEmptyState();
  }
});

// ============================================
// Event Listeners
// ============================================

settingsToggle.addEventListener('click', () => {
  configPanel.classList.toggle('visible');
});

logoUploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      config.logoUrl = event.target.result;
      saveConfig();
      renderPreview();
      showStatus('Logo uploaded successfully', 'success');
      setTimeout(hideStatus, 2000);
    };
    reader.readAsDataURL(file);
  }
});

applyConfigBtn.addEventListener('click', () => {
  config.institutionName = institutionNameInput.value || DEFAULT_CONFIG.institutionName;
  config.nameColumn = nameColumnInput.value || DEFAULT_CONFIG.nameColumn;
  config.documentTitle = documentTitleInput.value || DEFAULT_CONFIG.documentTitle;
  config.orientation = orientationSelect.value;
  config.pageSize = pageSizeSelect.value;
  config.includeTimestamp = includeTimestampCheckbox.checked;
  config.includeImages = includeImagesCheckbox.checked;
  config.includeHeaders = includeHeadersCheckbox.checked;
  config.includeSignatureLine = includeSignatureLineCheckbox.checked;
  config.excludeColumns = excludeColumnsInput.value;

  saveConfig();
  renderPreview();
  showStatus('Settings applied', 'success');
  setTimeout(hideStatus, 2000);
});

resetConfigBtn.addEventListener('click', () => {
  config = { ...DEFAULT_CONFIG };
  saveConfig();
  updateConfigUI();
  renderPreview();
  showStatus('Settings reset to defaults', 'info');
  setTimeout(hideStatus, 2000);
});

downloadBtn.addEventListener('click', async function() {
  if (!currentRecord) return;

  showStatus('Generating PDF...', 'loading');
  
  try {
    // Get the preview HTML
    const previewHTML = generatePDFPreview(currentRecord);
    
    // Create element for PDF generation
    const element = document.createElement('div');
    element.innerHTML = previewHTML;
    element.style.padding = '20px';
    element.style.backgroundColor = '#ffffff';
    
    // Get record ID for filename
    const idField = Object.entries(currentRecord).find(
      ([key]) => key.toLowerCase().includes('id') || key.toLowerCase().includes('number')
    );
    const recordId = idField ? String(idField[1]).replace(/\s+/g, '_') : 'Record';
    const filename = `${recordId}-${Date.now()}.pdf`;

    // PDF options
    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { 
        orientation: config.orientation, 
        unit: 'mm', 
        format: config.pageSize 
      }
    };

    // Generate PDF with html2pdf (preserves text selectability)
    await html2pdf().set(opt).from(element).save();

    showStatus(`✓ PDF downloaded: ${filename}`, 'success');
    setTimeout(hideStatus, 3000);
  } catch (error) {
    console.error('PDF generation error:', error);
    showStatus(`Error generating PDF: ${error.message}`, 'error');
  }
});

reloadBtn.addEventListener('click', function() {
  if (!currentRecord) {
    showStatus('No record selected', 'info');
    setTimeout(hideStatus, 2000);
    return;
  }
  
  showStatus('Refreshing record...', 'loading');
  renderPreview();
  setTimeout(() => {
    showStatus('Record refreshed', 'success');
    setTimeout(hideStatus, 2000);
  }, 500);
});

// Initialize with onRecords to get all records
grist.onRecords(function(records) {
  if (!records || records.length === 0) {
    renderEmptyState();
    return;
  }

  allRecords = records;
  
  // Populate row selector dropdown
  rowSelector.innerHTML = '<option value="">Select a record to export...</option>';
  
  records.forEach((record, index) => {
    const nameField = Object.entries(record).find(
      ([key]) => key.toLowerCase().includes('name') && !key.toLowerCase().includes('last')
    );
    const displayName = nameField ? String(nameField[1]).substring(0, 50) : `Record ${index + 1}`;
    
    const option = document.createElement('option');
    option.value = index;
    option.textContent = displayName;
    rowSelector.appendChild(option);
  });
  
  showStatus(`Loaded ${records.length} record(s)`, 'success');
  setTimeout(hideStatus, 2000);
});

// Handle row selection from dropdown
rowSelector.addEventListener('change', function() {
  const selectedIndex = parseInt(this.value);
  if (!isNaN(selectedIndex) && allRecords[selectedIndex]) {
    currentRecord = allRecords[selectedIndex];
    renderPreview();
    downloadBtn.disabled = false;
    showStatus('Record selected', 'success');
    setTimeout(hideStatus, 1500);
  }
});

function renderPreview() {
  if (!currentRecord) {
    renderEmptyState();
    return;
  }

  const html = generatePDFPreview(currentRecord);
  previewDiv.innerHTML = html;
}

function generatePDFPreview(record) {
  const fields = getDisplayFields(record);
  const studentName = record[config.nameColumn] || config.documentTitle;

  let html = `
    <div style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #000;">
      <div style="text-align: center; border-bottom: 3px solid #003d99; padding-bottom: 15px; margin-bottom: 20px;">
  `;

  if (config.logoUrl) {
    html += `<img src="${config.logoUrl}" alt="Logo" style="max-height: 40px; margin-bottom: 10px;"><br>`;
  }

  html += `
        <h2 style="margin: 0; color: #000; font-size: 18px; font-weight: bold;">${escapeHtml(String(studentName))}</h2>
        <p style="margin: 5px 0 0 0; color: #333; font-size: 12px; font-weight: 600;">${escapeHtml(config.institutionName)}</p>
      </div>

      <h3 style="color: #003d99; font-size: 14px; margin-bottom: 15px; font-weight: bold;">Record Information</h3>
  `;

  // Add fields in a table-like format
  html += '<table style="width: 100%; border-collapse: collapse;">';
  
  for (const field of fields) {
    if (field.isImage && config.includeImages) {
      html += `
        <tr>
          <td colspan="2" style="padding: 12px; border: 1px solid #999; background: #f9f9f9;">
            <strong style="color: #000; font-size: 12px;">${escapeHtml(field.label)}</strong><br>
            <img src="${field.value}" alt="${escapeHtml(field.label)}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
          </td>
        </tr>
      `;
    } else {
      html += `
        <tr>
          <td style="padding: 10px; border: 1px solid #999; font-weight: bold; width: 30%; background: #e8e8e8; color: #000; word-break: break-word; font-size: 11px;">
            ${escapeHtml(field.label)}
          </td>
          <td style="padding: 10px; border: 1px solid #999; color: #000; font-size: 11px;">
            ${escapeHtml(String(field.value).substring(0, 150))}
          </td>
        </tr>
      `;
    }
  }

  html += '</table>';

  if (config.includeSignatureLine) {
    html += `
      <div style="margin-top: 30px;">
        <h3 style="font-size: 12px; margin-bottom: 15px; color: #000; font-weight: bold;">Signature</h3>
        <div style="border-top: 2px solid #000; width: 200px; margin-bottom: 5px;"></div>
        <p style="font-size: 11px; color: #000; margin: 0; font-weight: 500;">Authorized Signature</p>
        <p style="font-size: 11px; color: #000; margin-top: 15px; font-weight: 500;">Date: ________________</p>
      </div>
    `;
  }

  if (config.includeTimestamp) {
    const timestamp = new Date().toLocaleString();
    const idField = Object.entries(record).find(
      ([key]) => key.toLowerCase().includes('id') || key.toLowerCase().includes('number')
    );
    const recordId = idField ? idField[1] : 'Record';

    html += `
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center;">
        <p style="margin: 5px 0;">Generated on: ${timestamp}</p>
        <p style="margin: 5px 0;">Document ID: ${escapeHtml(String(recordId))}-${Date.now()}</p>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

function renderEmptyState() {
  previewDiv.innerHTML = `
    <div class="empty-state">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <h2>No Data Available</h2>
      <p>Select a record to generate PDF</p>
    </div>
  `;
}

function getExcludedColumns() {
  return new Set(
    config.excludeColumns
      .split(',')
      .map(col => col.trim().toLowerCase())
  );
}

function getDisplayFields(record) {
  const excluded = getExcludedColumns();
  const fields = [];

  Object.entries(record).forEach(([key, value]) => {
    if (!excluded.has(key.toLowerCase()) && value != null && value !== '') {
      const isImg = config.includeImages && isImageUrl(value);
      
      // DEBUG: Log image fields
      if (isImg) {
        console.log('Image field detected:', key, 'Value:', value, 'Type:', typeof value);
      }
      
      fields.push({
        key,
        label: formatFieldName(key),
        value: value,
        isImage: isImg
      });
    }
  });

  return fields;
}

function formatFieldName(fieldName) {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ');
}

function generatePDFContent(record) {
  const timestamp = new Date().toLocaleString();
  const fields = getDisplayFields(record);
  
  let studentName = record[config.nameColumn];
  if (!studentName) {
    const nameField = Object.entries(record).find(
      ([key, value]) => {
        const lower = key.toLowerCase();
        return (lower.includes('name') && !lower.includes('last') && !lower.includes('middle')) || 
               lower === 'fullname' || lower === 'full_name';
      }
    );
    studentName = nameField ? nameField[1] : config.documentTitle;
  }
  
  const idField = Object.entries(record).find(
    ([key]) => key.toLowerCase().includes('id') || key.toLowerCase().includes('number')
  );
  const recordId = idField ? idField[1] : 'Record';

  let html = `
    <div class="pdf-header">
  `;

  if (config.logoUrl) {
    html += `<div style="text-align: center; margin-bottom: 15px;">
      <img src="${config.logoUrl}" alt="Organization Logo" style="max-height: 60px; max-width: 200px;">
    </div>`;
  } else if (config.institutionName) {
    html += `<p style="margin-bottom: 10px; font-size: 14px; color: #666; font-weight: 500;">${escapeHtml(config.institutionName)}</p>`;
  }

  html += `
      <h1>${escapeHtml(String(studentName))}</h1>
      <p>Official Record</p>
    </div>

    <div class="pdf-section">
      <h2>Record Information</h2>
  `;

  for (let i = 0; i < fields.length; i += 2) {
    const field1 = fields[i];
    const field2 = fields[i + 1];

    if (field1.isImage || field2?.isImage) {
      html += `
        <div class="pdf-field-row full">
          <div class="pdf-field">
            ${config.includeHeaders ? `<label>${escapeHtml(field1.label)}</label>` : ''}
            <div class="pdf-field-value">
              <img src="${field1.value}" alt="${escapeHtml(field1.label)}" />
            </div>
          </div>
        </div>
      `;

      if (field2 && !field2.isImage) {
        html += `
          <div class="pdf-field-row full">
            <div class="pdf-field">
              ${config.includeHeaders ? `<label>${escapeHtml(field2.label)}</label>` : ''}
              <div class="pdf-field-value">${escapeHtml(String(field2.value))}</div>
            </div>
          </div>
        `;
      }
    } else {
      html += `<div class="pdf-field-row">`;

      html += `
        <div class="pdf-field">
          ${config.includeHeaders ? `<label>${escapeHtml(field1.label)}</label>` : ''}
          <div class="pdf-field-value">${escapeHtml(String(field1.value))}</div>
        </div>
      `;

      if (field2) {
        html += `
          <div class="pdf-field">
            ${config.includeHeaders ? `<label>${escapeHtml(field2.label)}</label>` : ''}
            <div class="pdf-field-value">${escapeHtml(String(field2.value))}</div>
          </div>
        `;
      }

      html += `</div>`;
    }
  }

  html += `</div>`;

  if (config.includeSignatureLine) {
    html += `
      <div class="pdf-section">
        <h2>Signature</h2>
        <div class="pdf-field-row full">
          <div style="margin-top: 20px;">
            <div style="border-top: 1px solid #333; margin-bottom: 5px; width: 200px; margin-top: 40px;"></div>
            <p style="font-size: 11px; color: #666;">Authorized Signature</p>
            <p style="font-size: 11px; color: #666; margin-top: 20px;">Date: ___________________</p>
          </div>
        </div>
      </div>
    `;
  }

  if (config.includeTimestamp) {
    html += `
      <div class="pdf-footer">
        <p>Generated on: ${timestamp}</p>
        <p>Document ID: ${escapeHtml(String(recordId))}-${Date.now()}</p>
      </div>
    `;
  }

  return html;
}

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function isImageUrl(str) {
  if (!str) return false;
  try {
    const strVal = String(str).toLowerCase();
    
    // Check for image file extensions
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(strVal)) return true;
    
    // Check for base64 image data
    if (/^data:image/.test(strVal)) return true;
    
    // Check for URLs containing image patterns
    if (strVal.includes('image') || strVal.includes('.png') || strVal.includes('.jpg') || 
        strVal.includes('.jpeg') || strVal.includes('.gif')) {
      return true;
    }
    
    // Grist attachment fields might come as objects - check for that
    if (typeof str === 'object' && str !== null) {
      console.log('Object field detected (might be attachment):', str);
      return false; // Will need special handling
    }
    
    return false;
  } catch (e) {
    console.log('Image detection error:', e);
    return false;
  }
}

// ============================================
// Initialize
// ============================================

loadConfig();
