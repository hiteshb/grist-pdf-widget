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
    const { jsPDF } = window.jspdf;
    
    const pdf = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: config.pageSize
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 15;
    const leftMargin = 12;
    const rightMargin = pageWidth - 12;
    const maxWidth = rightMargin - leftMargin;

    // Helper function to add new page if needed
    function checkPageBreak(spaceNeeded = 20) {
      if (yPosition + spaceNeeded > pageHeight - 15) {
        pdf.addPage();
        yPosition = 15;
      }
    }

    // Add header with logo or institution
    if (config.logoUrl) {
      try {
        pdf.addImage(config.logoUrl, 'PNG', leftMargin, yPosition, 40, 15);
        yPosition += 18;
      } catch (e) {
        console.log('Logo load failed');
      }
    }

    // Add title
    const studentName = currentRecord[config.nameColumn] || config.documentTitle;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(String(studentName), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Add institution name
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(config.institutionName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Add horizontal line
    pdf.setDrawColor(26, 115, 232);
    pdf.setLineWidth(0.5);
    pdf.line(leftMargin, yPosition, rightMargin, yPosition);
    yPosition += 8;

    // Reset text color
    pdf.setTextColor(0, 0, 0);

    // Get fields to display
    const fields = getDisplayFields(currentRecord);
    
    // Separate text fields and image fields - filter out only booleans with true/false, keep agreements
    const textFields = fields.filter(f => {
      const value = String(f.value).toLowerCase();
      // Only skip pure boolean true/false values, keep all text fields including agreements
      if (value === 'true' || value === 'false') return false;
      if (f.isImage) return false;
      return true;
    });

    const imageFields = fields.filter(f => {
      // Only include actual image URLs/data, not numeric IDs
      if (!f.isImage) return false;
      const value = String(f.value).toLowerCase();
      return value.includes('http') || value.includes('data:image') || value.includes('.jpg') || value.includes('.png');
    });

    // Add text fields in 2-column layout
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    let col1Fields = [];
    let col2Fields = [];

    for (let i = 0; i < textFields.length; i++) {
      if (i % 2 === 0) {
        col1Fields.push(textFields[i]);
      } else {
        col2Fields.push(textFields[i]);
      }
    }

    // Draw text fields in two columns
    let col1Y = yPosition;
    let col2Y = yPosition;
    const colWidth = (maxWidth - 5) / 2;
    const col1X = leftMargin;
    const col2X = leftMargin + colWidth + 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Information', col1X, col1Y);
    col1Y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    // Column 1
    for (const field of col1Fields) {
      if (col1Y + 15 > pageHeight - 20) {
        checkPageBreak(20);
        col1Y = yPosition;
      }
      
      // Field label
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(70, 70, 70);
      
      // Wrap label if it's too long
      const labelLines = pdf.splitTextToSize(field.label + ':', colWidth - 3);
      pdf.text(labelLines, col1X, col1Y);
      col1Y += labelLines.length * 2.5;

      // Field value with proper text wrapping
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      const value = String(field.value).substring(0, 300); // Increased limit for long agreements
      const splitValue = pdf.splitTextToSize(value, colWidth - 3);
      pdf.text(splitValue, col1X + 1, col1Y);
      col1Y += splitValue.length * 2.8 + 5;
    }

    // Column 2
    for (const field of col2Fields) {
      if (col2Y + 15 > pageHeight - 20) {
        checkPageBreak(20);
        col2Y = yPosition;
      }

      // Field label
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(70, 70, 70);
      
      // Wrap label if it's too long
      const labelLines = pdf.splitTextToSize(field.label + ':', colWidth - 3);
      pdf.text(labelLines, col2X, col2Y);
      col2Y += labelLines.length * 2.5;

      // Field value with proper text wrapping
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      const value = String(field.value).substring(0, 300); // Increased limit for long agreements
      const splitValue = pdf.splitTextToSize(value, colWidth - 3);
      pdf.text(splitValue, col2X + 1, col2Y);
      col2Y += splitValue.length * 2.8 + 5;
    }

    yPosition = Math.max(col1Y, col2Y) + 10;

    // Add image attachments (ID proofs, photos, etc)
    if (imageFields.length > 0) {
      checkPageBreak(40);

      // Add section title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Attachments & ID Proof', leftMargin, yPosition);
      yPosition += 8;

      // Add images
      for (const imageField of imageFields) {
        try {
          checkPageBreak(60);

          // Image label
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(70, 70, 70);
          pdf.text(imageField.label + ':', leftMargin, yPosition);
          yPosition += 6;

          // Add image with auto-detection of format
          const imgValue = String(imageField.value);
          let imgFormat = 'JPEG';
          
          if (imgValue.includes('.png') || imgValue.includes('data:image/png')) {
            imgFormat = 'PNG';
          } else if (imgValue.includes('.gif') || imgValue.includes('data:image/gif')) {
            imgFormat = 'GIF';
          }

          pdf.addImage(imageField.value, imgFormat, leftMargin + 2, yPosition, 80, 60);
          yPosition += 65;

        } catch (e) {
          console.log('Image load failed for:', imageField.label, e.message);
          yPosition += 10;
        }
      }
    }

    // Add signature section if enabled
    if (config.includeSignatureLine) {
      checkPageBreak(30);

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(leftMargin, yPosition, maxWidth, 25);
      yPosition += 3;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Signature Section', leftMargin + 2, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      
      // Signature line
      pdf.line(leftMargin + 2, yPosition + 10, leftMargin + 40, yPosition + 10);
      pdf.text('Signature', leftMargin + 2, yPosition + 12);

      // Date line
      pdf.line(leftMargin + 50, yPosition + 10, leftMargin + 80, yPosition + 10);
      pdf.text('Date', leftMargin + 50, yPosition + 12);

      yPosition += 22;
    }

    // Add footer
    if (config.includeTimestamp) {
      const timestamp = new Date().toLocaleString();
      const idField = Object.entries(currentRecord).find(
        ([key]) => key.toLowerCase().includes('id') || key.toLowerCase().includes('number')
      );
      const recordId = idField ? idField[1] : 'Record';

      yPosition = pageHeight - 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generated: ${timestamp}`, leftMargin, yPosition);
      pdf.text(`ID: ${String(recordId)}-${Date.now()}`, rightMargin - 30, yPosition, { align: 'right' });
    }

    // Download
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
    <div style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6;">
      <div style="text-align: center; border-bottom: 2px solid #1a73e8; padding-bottom: 15px; margin-bottom: 20px;">
  `;

  if (config.logoUrl) {
    html += `<img src="${config.logoUrl}" alt="Logo" style="max-height: 40px; margin-bottom: 10px;"><br>`;
  }

  html += `
        <h2 style="margin: 0; color: #1a1a1a; font-size: 18px;">${escapeHtml(String(studentName))}</h2>
        <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">${escapeHtml(config.institutionName)}</p>
      </div>

      <h3 style="color: #1a73e8; font-size: 14px; margin-bottom: 15px;">Record Information</h3>
  `;

  // Add fields in a table-like format
  html += '<table style="width: 100%; border-collapse: collapse;">';
  
  for (const field of fields) {
    if (field.isImage && config.includeImages) {
      html += `
        <tr>
          <td colspan="2" style="padding: 12px; border: 1px solid #ddd;">
            <strong>${escapeHtml(field.label)}</strong><br>
            <img src="${field.value}" alt="${escapeHtml(field.label)}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
          </td>
        </tr>
      `;
    } else {
      html += `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 30%; background: #f5f5f5; word-break: break-word;">
            ${escapeHtml(field.label)}
          </td>
          <td style="padding: 10px; border: 1px solid #ddd;">
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
        <h3 style="font-size: 12px; margin-bottom: 15px;">Signature</h3>
        <div style="border-top: 1px solid #333; width: 200px; margin-bottom: 5px;"></div>
        <p style="font-size: 11px; color: #666; margin: 0;">Authorized Signature</p>
        <p style="font-size: 11px; color: #666; margin-top: 15px;">Date: ________________</p>
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
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(str) || /^data:image/.test(str);
  } catch {
    return false;
  }
}

// ============================================
// Initialize
// ============================================

loadConfig();
