/**
 * Utility Functions
 */

/**
 * Show toast notification
 */
function showToast(title, message, type = "info", duration = 5000) {
  const container = document.getElementById("toastContainer");
  if (!container) {
    console.warn("Toast container not found");
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">×</button>
  `;

  // Add close button handler
  const closeButton = toast.querySelector(".toast-close");
  closeButton.addEventListener("click", () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
}

/**
 * Show modal
 */
function showModal(title, content, buttons = []) {
  const overlay = document.getElementById("modalOverlay");
  if (!overlay) {
    console.warn("Modal overlay not found");
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal";

  let buttonsHtml = "";
  if (buttons.length > 0) {
    buttonsHtml = '<div class="modal-footer">';
    buttons.forEach((button) => {
      buttonsHtml += `<button class="btn ${
        button.class || "btn-secondary"
      }" data-action="${button.action}">${button.label}</button>`;
    });
    buttonsHtml += "</div>";
  }

  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">${content}</div>
    ${buttonsHtml}
  `;

  // Add close button handler
  const closeButton = modal.querySelector(".modal-close");
  closeButton.addEventListener("click", () => {
    hideModal();
  });

  // Add button handlers
  buttons.forEach((button) => {
    const btnElement = modal.querySelector(`[data-action="${button.action}"]`);
    if (btnElement && button.handler) {
      btnElement.addEventListener("click", () => {
        button.handler();
        if (button.closeOnClick !== false) {
          hideModal();
        }
      });
    }
  });

  overlay.innerHTML = "";
  overlay.appendChild(modal);
  overlay.classList.add("active");

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      hideModal();
    }
  });
}

/**
 * Hide modal
 */
function hideModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) {
    overlay.classList.remove("active");
    overlay.innerHTML = "";
  }
}

/**
 * Format date
 */
function formatDate(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }

  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (days < 7) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

/**
 * Truncate text
 */
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Parse markdown to HTML (simple version)
 */
function parseMarkdown(markdown) {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Lists
  html = html.replace(/^\* (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied", "Text copied to clipboard", "success", 2000);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    showToast("Error", "Failed to copy to clipboard", "error");
    return false;
  }
}

/**
 * Download text as file
 */
function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download JSON as file
 */
function downloadJsonFile(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate contract text
 */
function validateContractText(text) {
  if (!text || typeof text !== "string") {
    return { valid: false, error: "Contract text is required" };
  }

  const trimmed = text.trim();
  if (trimmed.length < 100) {
    return {
      valid: false,
      error: "Contract text is too short (minimum 100 characters)",
    };
  }

  if (trimmed.length > 1000000) {
    return { valid: false, error: "Contract text is too long (maximum 1MB)" };
  }

  return { valid: true, text: trimmed };
}

// Export functions to global scope
window.showToast = showToast;
window.showModal = showModal;
window.hideModal = hideModal;
window.formatDate = formatDate;
window.formatDuration = formatDuration;
window.formatFileSize = formatFileSize;
window.truncateText = truncateText;
window.escapeHtml = escapeHtml;
window.parseMarkdown = parseMarkdown;
window.copyToClipboard = copyToClipboard;
window.downloadTextFile = downloadTextFile;
window.downloadJsonFile = downloadJsonFile;
window.readFileAsText = readFileAsText;
window.debounce = debounce;
window.throttle = throttle;
window.generateId = generateId;
window.validateContractText = validateContractText;
