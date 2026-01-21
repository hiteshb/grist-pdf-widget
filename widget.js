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

grist.ready({
  requiredFields: [],
  columns: 'all',
  requiredAccess: 'read table'
});

grist.onRecord(function(record) {
  console.log('=== GRIST onRecord ===');
  console.log('Record received:', record);
  console.log('Record keys:', record ? Object.keys(record) : 'null');
  console.log('Record type:', typeof record);
  
  if (record && Object.keys(record).length > 0) {
    currentRecord = record;
    console.log('Setting currentRecord:', currentRecord);
    renderPreview();
    downloadBtn.disabled = false;
    
    rowSelector.innerHTML = '<option value="0" selected>Current Record</option>';
    allRecords = [record];
    console.log('Data loaded successfully');
  } else {
    console.log('Record is empty or null');
    renderEmptyState();
  }
});

grist.onOptions(function(options, interaction) {
  console.log('=== GRIST onOptions ===');
  console.log('Options:', options);
  console.log('Interaction:', interaction);
  tableMetadata = options;
});

console.log('=== Widget Initialized ===');
console.log('CurrentRecord:', currentRecord);
console.log('AllRecords:', allRecords);

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
    const element = previewDiv;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    
    const pdf = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: config.pageSize
    });

    const pageWidth = config.orientation === 'portrait' 
      ? (config.pageSize === 'letter' ? 216 : config.pageSize === 'legal' ? 216 : 210)
      : (config.pageSize === 'letter' ? 279 : config.pageSize === 'legal' ? 356 : 297);
    
    const pageHeight = config.orientation === 'portrait'
      ? (config.pageSize === 'letter' ? 279 : config.pageSize === 'legal' ? 356 : 297)
      : (config.pageSize === 'letter' ? 216 : config.pageSize === 'legal' ? 216 : 210);
    
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const idField = Object.entries(currentRecord).find(
      ([key]) => key.toLowerCase().includes('id') || key.toLowerCase().includes('number')
    );
    const recordId = idField ? String(idField[1]).replace(/\s+/g, '_') : 'Record';
    
    const filename = `${recordId}-${Date.now()}.pdf`;
    pdf.save(filename);

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

// ============================================
// Rendering Functions
// ============================================

function renderPreview() {
  if (!currentRecord) {
    renderEmptyState();
    return;
  }

  const html = generatePDFContent(currentRecord);
  previewDiv.innerHTML = html;
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
      fields.push({
        key,
        label: formatFieldName(key),
        value: value,
        isImage: config.includeImages && isImageUrl(value)
      });
    }
  });

  return fields;
}

function formatFieldName(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
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
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(str) || /^data:image/.test(str);
  } catch {
    return false;
  }
}

// ============================================
// Initialize
// ============================================

loadConfig();
