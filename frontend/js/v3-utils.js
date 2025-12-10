/* ============================================
   Contract AI Platform V3 - Utility Functions
   ============================================ */

const Utils = {
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  },

  /**
   * Format date in readable format
   */
  formatDate(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  /**
   * Debounce function calls (enhanced version)
   * Use Performance.debounce for more advanced options
   */
  debounce(func, wait) {
    // Use Performance module if available for better debouncing
    if (typeof Performance !== "undefined" && Performance.debounce) {
      return Performance.debounce(func, wait);
    }

    // Fallback to simple debounce
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Validate file type
   */
  validateFileType(file, allowedTypes = [".pdf", ".txt", ".docx"]) {
    const fileName = file.name.toLowerCase();
    return allowedTypes.some((type) => fileName.endsWith(type));
  },

  /**
   * Validate file size
   */
  validateFileSize(file, maxSizeMB = 10) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return "id-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Get risk level color class
   */
  getRiskBadgeClass(riskLevel) {
    const level = riskLevel.toLowerCase();
    const classes = {
      critical: "badge-critical",
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low",
    };
    return classes[level] || "badge-info";
  },

  /**
   * Truncate text with ellipsis
   */
  truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy:", err);
      return false;
    }
  },

  /**
   * Download file from blob
   */
  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Show/hide element with animation
   */
  toggleElement(element, show) {
    if (show) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  },

  /**
   * Scroll to element smoothly
   */
  scrollToElement(element, offset = 0) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  },

  /**
   * Parse query parameters from URL
   */
  getQueryParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    return params;
  },

  /**
   * Set query parameter in URL
   */
  setQueryParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState({}, "", url);
  },

  /**
   * Format number with commas
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * Calculate percentage
   */
  calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  },

  /**
   * Format duration in seconds to human-readable format
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  },

  /**
   * Check if element is in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Local storage helpers
   */
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error("Storage error:", err);
        return false;
      }
    },
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (err) {
        console.error("Storage error:", err);
        return defaultValue;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (err) {
        console.error("Storage error:", err);
        return false;
      }
    },
    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (err) {
        console.error("Storage error:", err);
        return false;
      }
    },
  },

  /**
   * Show toast notification
   */
  showToast(message, type = "info", duration = 5000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

    container.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      toast.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = "slideOutRight 0.3s ease";
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }

    return toast;
  },

  /**
   * Show tooltip on element
   */
  showTooltip(element, text, position = "top") {
    const tooltip = document.createElement("div");
    tooltip.className = `tooltip tooltip-${position}`;
    tooltip.textContent = text;
    tooltip.setAttribute("role", "tooltip");

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top, left;

    switch (position) {
      case "top":
        top = rect.top - tooltipRect.height - 8;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left - tooltipRect.width - 8;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + 8;
        break;
    }

    tooltip.style.top = `${top + window.scrollY}px`;
    tooltip.style.left = `${left + window.scrollX}px`;

    return tooltip;
  },

  /**
   * Initialize tooltips for elements with data-tooltip attribute
   */
  initTooltips() {
    document.querySelectorAll("[data-tooltip]").forEach((element) => {
      let tooltip = null;

      element.addEventListener("mouseenter", () => {
        const text = element.getAttribute("data-tooltip");
        const position = element.getAttribute("data-tooltip-position") || "top";
        tooltip = this.showTooltip(element, text, position);
      });

      element.addEventListener("mouseleave", () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      });

      // Hide tooltip on click
      element.addEventListener("click", () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      });

      // Accessibility: show on focus
      element.addEventListener("focus", () => {
        const text = element.getAttribute("data-tooltip");
        const position = element.getAttribute("data-tooltip-position") || "top";
        tooltip = this.showTooltip(element, text, position);
      });

      element.addEventListener("blur", () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      });
    });
  },

  /**
   * Create empty state component
   */
  createEmptyState(
    icon,
    title,
    message,
    actionText = null,
    actionCallback = null
  ) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    let html = `
      <div class="empty-state-icon">${icon}</div>
      <h3 class="empty-state-title">${this.escapeHtml(title)}</h3>
      <p class="empty-state-message">${this.escapeHtml(message)}</p>
    `;

    if (actionText && actionCallback) {
      html += `<button class="btn btn-primary empty-state-action">${this.escapeHtml(
        actionText
      )}</button>`;
    }

    emptyState.innerHTML = html;

    if (actionText && actionCallback) {
      const actionBtn = emptyState.querySelector(".empty-state-action");
      actionBtn.addEventListener("click", actionCallback);
    }

    return emptyState;
  },

  /**
   * Parse markdown text to HTML
   * @param {string} text - Markdown text
   * @returns {string} HTML formatted text
   */
  parseMarkdown(text) {
    if (!text || typeof text !== "string") return "";

    // Split into lines for processing
    let lines = text.split("\n");
    let html = "";
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Handle headings
      if (line.match(/^### /)) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h3 class="markdown-h3">${line.replace(/^### /, "")}</h3>`;
      } else if (line.match(/^## /)) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h2 class="markdown-h2">${line.replace(/^## /, "")}</h2>`;
      } else if (line.match(/^# /)) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h1 class="markdown-h1">${line.replace(/^# /, "")}</h1>`;
      }
      // Handle list items
      else if (line.match(/^- /)) {
        if (!inList) {
          html += '<ul class="markdown-ul">';
          inList = true;
        }
        let listContent = line.replace(/^- /, "");
        // Apply inline formatting
        listContent = listContent.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="markdown-bold">$1</strong>'
        );
        listContent = listContent.replace(
          /\*(.*?)\*/g,
          '<em class="markdown-italic">$1</em>'
        );
        html += `<li class="markdown-li">${listContent}</li>`;
      }
      // Handle regular paragraphs
      else if (line.trim() !== "") {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        // Apply inline formatting
        let paragraph = line;
        paragraph = paragraph.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="markdown-bold">$1</strong>'
        );
        paragraph = paragraph.replace(
          /\*(.*?)\*/g,
          '<em class="markdown-italic">$1</em>'
        );
        html += `<p class="markdown-p">${paragraph}</p>`;
      }
      // Handle empty lines
      else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
      }
    }

    // Close any open list
    if (inList) {
      html += "</ul>";
    }

    return html;
  },

  /**
   * Render markdown to HTML with professional styling
   */
  renderMarkdown(text) {
    if (!text || typeof text !== "string") return "";

    let html = "";
    const lines = text.split("\n");
    let inList = false;
    let inCodeBlock = false;
    let codeBlockContent = [];
    let currentParagraph = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const content = currentParagraph.join(" ").trim();
        if (content) {
          html += `<p class="markdown-p">${this.formatInlineMarkdown(
            content
          )}</p>`;
        }
        currentParagraph = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code blocks
      if (trimmed.startsWith("```")) {
        flushParagraph();
        if (inCodeBlock) {
          html += `<pre class="markdown-code"><code>${this.escapeHtml(
            codeBlockContent.join("\n")
          )}</code></pre>`;
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Headers
      if (trimmed.startsWith("# ")) {
        flushParagraph();
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h1 class="markdown-h1">${this.formatInlineMarkdown(
          trimmed.substring(2)
        )}</h1>`;
        continue;
      }
      if (trimmed.startsWith("## ")) {
        flushParagraph();
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h2 class="markdown-h2">${this.formatInlineMarkdown(
          trimmed.substring(3)
        )}</h2>`;
        continue;
      }
      if (trimmed.startsWith("### ")) {
        flushParagraph();
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h3 class="markdown-h3">${this.formatInlineMarkdown(
          trimmed.substring(4)
        )}</h3>`;
        continue;
      }
      if (trimmed.startsWith("#### ")) {
        flushParagraph();
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h4 class="markdown-h4">${this.formatInlineMarkdown(
          trimmed.substring(5)
        )}</h4>`;
        continue;
      }

      // Horizontal rule
      if (trimmed === "---" || trimmed === "***") {
        flushParagraph();
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += '<hr class="markdown-hr">';
        continue;
      }

      // Lists
      if (trimmed.match(/^[-*]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        if (!inList) {
          html += '<ul class="markdown-list">';
          inList = true;
        }
        const content = trimmed
          .replace(/^[-*]\s+/, "")
          .replace(/^\d+\.\s+/, "");
        html += `<li class="markdown-li">${this.formatInlineMarkdown(
          content
        )}</li>`;
        continue;
      }

      // Empty line
      if (trimmed === "") {
        flushParagraph();
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        continue;
      }

      // Regular paragraph text
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      currentParagraph.push(line);
    }

    // Flush any remaining content
    flushParagraph();
    if (inList) {
      html += "</ul>";
    }
    if (inCodeBlock && codeBlockContent.length > 0) {
      html += `<pre class="markdown-code"><code>${this.escapeHtml(
        codeBlockContent.join("\n")
      )}</code></pre>`;
    }

    return html;
  },

  /**
   * Format inline markdown (bold, italic, code, links)
   */
  formatInlineMarkdown(text) {
    if (!text) return "";

    // Escape HTML first
    let result = this.escapeHtml(text);

    // Bold (**text** or __text__)
    result = result.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="markdown-bold">$1</strong>'
    );
    result = result.replace(
      /__(.+?)__/g,
      '<strong class="markdown-bold">$1</strong>'
    );

    // Italic (*text* or _text_)
    result = result.replace(
      /\*(.+?)\*/g,
      '<em class="markdown-italic">$1</em>'
    );
    result = result.replace(/_(.+?)_/g, '<em class="markdown-italic">$1</em>');

    // Inline code (`code`)
    result = result.replace(
      /`(.+?)`/g,
      '<code class="markdown-inline-code">$1</code>'
    );

    // Links [text](url)
    result = result.replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="markdown-link" target="_blank" rel="noopener">$1</a>'
    );

    return result;
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Utils;
}
