/**
 * Reusable UI Components
 */

/**
 * Create loading spinner
 */
function createLoadingSpinner(size = "medium") {
  const spinner = document.createElement("div");
  spinner.className = `loading-spinner ${size}`;
  spinner.innerHTML = `
    <div class="spinner-circle"></div>
    <div class="spinner-text">Processing...</div>
  `;
  return spinner;
}

/**
 * Create progress bar
 */
function createProgressBar(progress = 0, label = "") {
  const container = document.createElement("div");
  container.className = "progress-container";
  container.innerHTML = `
    <div class="progress-label">${label}</div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>
    <div class="progress-text">${progress}%</div>
  `;
  return container;
}

/**
 * Update progress bar
 */
function updateProgressBar(container, progress, label = null) {
  const fill = container.querySelector(".progress-fill");
  const text = container.querySelector(".progress-text");
  const labelElement = container.querySelector(".progress-label");

  if (fill) {
    fill.style.width = `${progress}%`;
  }

  if (text) {
    text.textContent = `${progress}%`;
  }

  if (label && labelElement) {
    labelElement.textContent = label;
  }
}

/**
 * Create file upload area
 */
function createFileUpload(options = {}) {
  const {
    accept = ".txt,.pdf,.doc,.docx",
    multiple = false,
    maxSize = 10 * 1024 * 1024, // 10MB
    onFileSelect = null,
  } = options;

  const container = document.createElement("div");
  container.className = "file-upload-container";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.style.display = "none";

  const dropZone = document.createElement("div");
  dropZone.className = "file-upload-dropzone";
  dropZone.innerHTML = `
    <div class="upload-icon">📁</div>
    <div class="upload-text">
      <strong>Click to upload</strong> or drag and drop
    </div>
    <div class="upload-hint">
      ${accept.split(",").join(", ")} (max ${formatFileSize(maxSize)})
    </div>
  `;

  // Click to upload
  dropZone.addEventListener("click", () => {
    input.click();
  });

  // File input change
  input.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  // Drag and drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  function handleFiles(files) {
    const fileArray = Array.from(files);

    // Validate files
    for (const file of fileArray) {
      if (file.size > maxSize) {
        showToast(
          "Error",
          `File ${file.name} is too large (max ${formatFileSize(maxSize)})`,
          "error"
        );
        return;
      }
    }

    if (onFileSelect) {
      onFileSelect(multiple ? fileArray : fileArray[0]);
    }
  }

  container.appendChild(input);
  container.appendChild(dropZone);

  return container;
}

/**
 * Create text area with character count
 */
function createTextArea(options = {}) {
  const {
    placeholder = "Enter text...",
    rows = 10,
    maxLength = 1000000,
    onInput = null,
  } = options;

  const container = document.createElement("div");
  container.className = "textarea-container";

  const textarea = document.createElement("textarea");
  textarea.className = "form-textarea";
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.maxLength = maxLength;

  const counter = document.createElement("div");
  counter.className = "character-counter";
  counter.textContent = `0 / ${maxLength.toLocaleString()}`;

  textarea.addEventListener("input", () => {
    const length = textarea.value.length;
    counter.textContent = `${length.toLocaleString()} / ${maxLength.toLocaleString()}`;

    if (onInput) {
      onInput(textarea.value);
    }
  });

  container.appendChild(textarea);
  container.appendChild(counter);

  return { container, textarea };
}

/**
 * Create card component
 */
function createCard(title, content, actions = []) {
  const card = document.createElement("div");
  card.className = "card";

  let actionsHtml = "";
  if (actions.length > 0) {
    actionsHtml = '<div class="card-actions">';
    actions.forEach((action) => {
      actionsHtml += `<button class="btn ${
        action.class || "btn-secondary"
      }" data-action="${action.id}">${action.label}</button>`;
    });
    actionsHtml += "</div>";
  }

  card.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">${title}</h3>
    </div>
    <div class="card-body">${content}</div>
    ${actionsHtml}
  `;

  // Add action handlers
  actions.forEach((action) => {
    const button = card.querySelector(`[data-action="${action.id}"]`);
    if (button && action.handler) {
      button.addEventListener("click", action.handler);
    }
  });

  return card;
}

/**
 * Create metric card
 */
function createMetricCard(label, value, icon = "", trend = null) {
  const card = document.createElement("div");
  card.className = "metric-card";

  let trendHtml = "";
  if (trend !== null) {
    const trendClass = trend >= 0 ? "trend-up" : "trend-down";
    const trendIcon = trend >= 0 ? "↑" : "↓";
    trendHtml = `<div class="metric-trend ${trendClass}">${trendIcon} ${Math.abs(
      trend
    )}%</div>`;
  }

  card.innerHTML = `
    <div class="metric-icon">${icon}</div>
    <div class="metric-content">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      ${trendHtml}
    </div>
  `;

  return card;
}

/**
 * Create table
 */
function createTable(headers, rows, options = {}) {
  const { sortable = false, onRowClick = null } = options;

  const table = document.createElement("table");
  table.className = "data-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;
    if (sortable) {
      th.classList.add("sortable");
      th.dataset.column = index;
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    if (onRowClick) {
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () => onRowClick(row, rowIndex));
    }
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.innerHTML = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

/**
 * Create badge
 */
function createBadge(text, type = "default") {
  const badge = document.createElement("span");
  badge.className = `badge badge-${type}`;
  badge.textContent = text;
  return badge;
}

/**
 * Create alert
 */
function createAlert(message, type = "info", dismissible = true) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  alert.innerHTML = `
    <div class="alert-icon">${icons[type] || icons.info}</div>
    <div class="alert-message">${message}</div>
    ${dismissible ? '<button class="alert-close">×</button>' : ""}
  `;

  if (dismissible) {
    const closeButton = alert.querySelector(".alert-close");
    closeButton.addEventListener("click", () => {
      alert.remove();
    });
  }

  return alert;
}

/**
 * Create tabs
 */
function createTabs(tabs, onTabChange = null) {
  const container = document.createElement("div");
  container.className = "tabs-container";

  const tabButtons = document.createElement("div");
  tabButtons.className = "tabs-buttons";

  const tabContents = document.createElement("div");
  tabContents.className = "tabs-contents";

  tabs.forEach((tab, index) => {
    // Create button
    const button = document.createElement("button");
    button.className = `tab-btn ${index === 0 ? "active" : ""}`;
    button.textContent = tab.label;
    button.dataset.tabId = tab.id;

    button.addEventListener("click", () => {
      // Update buttons
      tabButtons.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      // Update contents
      tabContents.querySelectorAll(".tab-pane").forEach((pane) => {
        pane.classList.remove("active");
      });
      const pane = tabContents.querySelector(`[data-tab-id="${tab.id}"]`);
      if (pane) {
        pane.classList.add("active");
      }

      if (onTabChange) {
        onTabChange(tab.id);
      }
    });

    tabButtons.appendChild(button);

    // Create content pane
    const pane = document.createElement("div");
    pane.className = `tab-pane ${index === 0 ? "active" : ""}`;
    pane.dataset.tabId = tab.id;
    pane.innerHTML = tab.content;

    tabContents.appendChild(pane);
  });

  container.appendChild(tabButtons);
  container.appendChild(tabContents);

  return container;
}

// Export components to global scope
window.createLoadingSpinner = createLoadingSpinner;
window.createProgressBar = createProgressBar;
window.updateProgressBar = updateProgressBar;
window.createFileUpload = createFileUpload;
window.createTextArea = createTextArea;
window.createCard = createCard;
window.createMetricCard = createMetricCard;
window.createTable = createTable;
window.createBadge = createBadge;
window.createAlert = createAlert;
window.createTabs = createTabs;
