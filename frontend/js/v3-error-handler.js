/* ============================================
   Contract AI Platform V3 - Error Handling & Validation
   ============================================ */

/**
 * Comprehensive Error Handler
 * Provides centralized error handling, validation, and recovery mechanisms
 */
const ErrorHandler = {
  // Error logging storage
  errorLog: [],
  maxLogSize: 100,

  /**
   * Log error for debugging
   */
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.errorLog.push(errorEntry);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (window.location.hostname === "localhost") {
      console.error("Error logged:", errorEntry);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem(
        "error_log",
        JSON.stringify(this.errorLog.slice(-20))
      );
    } catch (e) {
      console.warn("Failed to store error log:", e);
    }

    return errorEntry;
  },

  /**
   * Get error logs
   */
  getErrorLog() {
    return [...this.errorLog];
  },

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    try {
      localStorage.removeItem("error_log");
    } catch (e) {
      console.warn("Failed to clear error log:", e);
    }
  },

  /**
   * Export error log for debugging
   */
  exportErrorLog() {
    const logData = JSON.stringify(this.errorLog, null, 2);
    const blob = new Blob([logData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-log-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Handle API errors with user-friendly messages
   */
  handleAPIError(error, context = {}) {
    this.logError(error, { ...context, type: "API_ERROR" });

    let userMessage = "An error occurred. Please try again.";
    let errorType = "error";

    // Network errors
    if (error.message.includes("Failed to fetch") || !navigator.onLine) {
      userMessage =
        "Network connection lost. Please check your internet connection.";
      errorType = "warning";
    }
    // Timeout errors
    else if (error.message.includes("timeout")) {
      userMessage =
        "Request timed out. The server may be busy. Please try again.";
      errorType = "warning";
    }
    // Server errors (5xx)
    else if (error.message.includes("500") || error.message.includes("503")) {
      userMessage =
        "Server error. Our team has been notified. Please try again later.";
      errorType = "error";
    }
    // Client errors (4xx)
    else if (error.message.includes("400")) {
      userMessage = "Invalid request. Please check your input and try again.";
      errorType = "warning";
    } else if (error.message.includes("401")) {
      userMessage = "Authentication required. Please log in again.";
      errorType = "warning";
    } else if (error.message.includes("403")) {
      userMessage = "Access denied. You don't have permission for this action.";
      errorType = "error";
    } else if (error.message.includes("404")) {
      userMessage = "Resource not found. It may have been deleted.";
      errorType = "warning";
    }
    // Use error message if available
    else if (error.message) {
      userMessage = error.message;
    }

    return {
      message: userMessage,
      type: errorType,
      originalError: error,
      canRetry: this.canRetry(error),
    };
  },

  /**
   * Determine if an error is retryable
   */
  canRetry(error) {
    const retryableErrors = [
      "Failed to fetch",
      "timeout",
      "503",
      "502",
      "Network",
    ];

    return retryableErrors.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  },

  /**
   * Retry mechanism with exponential backoff
   */
  async retry(fn, options = {}) {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      onRetry = null,
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw error;
        }

        // Check if error is retryable
        if (!this.canRetry(error)) {
          throw error;
        }

        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, maxAttempts, delay);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Increase delay for next attempt (exponential backoff)
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  },

  /**
   * Show error message to user
   */
  showError(message, options = {}) {
    const { canRetry = false, retryCallback = null, duration = 8000 } = options;

    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast toast-error";

    let html = `
      <span class="toast-icon">❌</span>
      <div class="toast-content">
        <div class="toast-message">${this.escapeHtml(message)}</div>
    `;

    if (canRetry && retryCallback) {
      html += `
        <button class="toast-retry-btn">
          🔄 Retry
        </button>
      `;
    }

    html += `
      </div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

    toast.innerHTML = html;
    container.appendChild(toast);

    // Retry button handler
    if (canRetry && retryCallback) {
      const retryBtn = toast.querySelector(".toast-retry-btn");
      retryBtn.addEventListener("click", () => {
        toast.remove();
        retryCallback();
      });
    }

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
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
};

/**
 * Input Validation System
 */
const Validator = {
  /**
   * Validate file
   */
  validateFile(file, options = {}) {
    const {
      allowedTypes = [".pdf", ".txt", ".docx"],
      maxSizeMB = 10,
      minSizeMB = 0,
    } = options;

    const errors = [];

    // Check if file exists
    if (!file) {
      errors.push("No file selected");
      return { valid: false, errors };
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const hasValidType = allowedTypes.some((type) => fileName.endsWith(type));

    if (!hasValidType) {
      errors.push(
        `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`
      );
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      errors.push(
        `File size (${fileSizeMB.toFixed(
          2
        )}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
      );
    }

    if (fileSizeMB < minSizeMB) {
      errors.push(
        `File size (${fileSizeMB.toFixed(
          2
        )}MB) is below minimum required size (${minSizeMB}MB)`
      );
    }

    // Check for empty files
    if (file.size === 0) {
      errors.push("File is empty");
    }

    return {
      valid: errors.length === 0,
      errors,
      file,
    };
  },

  /**
   * Validate multiple files
   */
  validateFiles(files, options = {}) {
    const { maxFiles = 50, maxTotalSizeMB = 500 } = options;

    const errors = [];
    const fileResults = [];

    // Check file count
    if (files.length === 0) {
      errors.push("No files selected");
      return { valid: false, errors, fileResults };
    }

    if (files.length > maxFiles) {
      errors.push(
        `Maximum ${maxFiles} files allowed. You selected ${files.length}`
      );
    }

    // Check total size
    const totalSizeMB =
      files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);

    if (totalSizeMB > maxTotalSizeMB) {
      errors.push(
        `Total file size (${totalSizeMB.toFixed(
          2
        )}MB) exceeds maximum allowed (${maxTotalSizeMB}MB)`
      );
    }

    // Validate each file
    files.forEach((file, index) => {
      const result = this.validateFile(file, options);
      fileResults.push({
        index,
        file,
        ...result,
      });

      if (!result.valid) {
        errors.push(
          `File ${index + 1} (${file.name}): ${result.errors.join(", ")}`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      fileResults,
      totalSizeMB,
    };
  },

  /**
   * Validate text input
   */
  validateText(text, options = {}) {
    const {
      minLength = 0,
      maxLength = 100000,
      required = true,
      pattern = null,
      customValidator = null,
    } = options;

    const errors = [];

    // Check if required
    if (required && (!text || text.trim().length === 0)) {
      errors.push("This field is required");
      return { valid: false, errors };
    }

    // If not required and empty, it's valid
    if (!required && (!text || text.trim().length === 0)) {
      return { valid: true, errors: [] };
    }

    const trimmedText = text.trim();

    // Check length
    if (trimmedText.length < minLength) {
      errors.push(
        `Text must be at least ${minLength} characters (current: ${trimmedText.length})`
      );
    }

    if (trimmedText.length > maxLength) {
      errors.push(
        `Text must not exceed ${maxLength} characters (current: ${trimmedText.length})`
      );
    }

    // Check pattern
    if (pattern && !pattern.test(trimmedText)) {
      errors.push("Text format is invalid");
    }

    // Custom validation
    if (customValidator) {
      const customResult = customValidator(trimmedText);
      if (customResult !== true) {
        errors.push(customResult || "Validation failed");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value: trimmedText,
    };
  },

  /**
   * Validate form field
   */
  validateField(field, options = {}) {
    const value = field.value;
    const type = field.type || "text";

    let result;

    switch (type) {
      case "email":
        result = this.validateEmail(value, options);
        break;
      case "number":
        result = this.validateNumber(value, options);
        break;
      case "url":
        result = this.validateURL(value, options);
        break;
      case "date":
        result = this.validateDate(value, options);
        break;
      default:
        result = this.validateText(value, options);
    }

    // Show/hide error message
    this.showFieldError(field, result.errors);

    return result;
  },

  /**
   * Validate email
   */
  validateEmail(email, options = {}) {
    const { required = true } = options;

    const errors = [];

    if (required && !email) {
      errors.push("Email is required");
      return { valid: false, errors };
    }

    if (!required && !email) {
      return { valid: true, errors: [] };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      errors.push("Invalid email format");
    }

    return {
      valid: errors.length === 0,
      errors,
      value: email,
    };
  },

  /**
   * Validate number
   */
  validateNumber(value, options = {}) {
    const {
      min = null,
      max = null,
      required = true,
      integer = false,
    } = options;

    const errors = [];

    if (required && (value === "" || value === null || value === undefined)) {
      errors.push("This field is required");
      return { valid: false, errors };
    }

    if (!required && (value === "" || value === null || value === undefined)) {
      return { valid: true, errors: [] };
    }

    const num = Number(value);

    if (isNaN(num)) {
      errors.push("Must be a valid number");
      return { valid: false, errors };
    }

    if (integer && !Number.isInteger(num)) {
      errors.push("Must be a whole number");
    }

    if (min !== null && num < min) {
      errors.push(`Must be at least ${min}`);
    }

    if (max !== null && num > max) {
      errors.push(`Must not exceed ${max}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      value: num,
    };
  },

  /**
   * Validate URL
   */
  validateURL(url, options = {}) {
    const { required = true } = options;

    const errors = [];

    if (required && !url) {
      errors.push("URL is required");
      return { valid: false, errors };
    }

    if (!required && !url) {
      return { valid: true, errors: [] };
    }

    try {
      new URL(url);
    } catch (e) {
      errors.push("Invalid URL format");
    }

    return {
      valid: errors.length === 0,
      errors,
      value: url,
    };
  },

  /**
   * Validate date
   */
  validateDate(date, options = {}) {
    const { required = true, minDate = null, maxDate = null } = options;

    const errors = [];

    if (required && !date) {
      errors.push("Date is required");
      return { valid: false, errors };
    }

    if (!required && !date) {
      return { valid: true, errors: [] };
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      errors.push("Invalid date format");
      return { valid: false, errors };
    }

    if (minDate && dateObj < new Date(minDate)) {
      errors.push(
        `Date must be after ${new Date(minDate).toLocaleDateString()}`
      );
    }

    if (maxDate && dateObj > new Date(maxDate)) {
      errors.push(
        `Date must be before ${new Date(maxDate).toLocaleDateString()}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      value: dateObj,
    };
  },

  /**
   * Show field error message
   */
  showFieldError(field, errors) {
    // Remove existing error
    const existingError = field.parentElement.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }

    // Remove error class
    field.classList.remove("error");

    // If no errors, we're done
    if (!errors || errors.length === 0) {
      return;
    }

    // Add error class
    field.classList.add("error");

    // Create error message
    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error";
    errorDiv.textContent = errors[0]; // Show first error
    errorDiv.setAttribute("role", "alert");

    // Insert after field
    field.parentElement.appendChild(errorDiv);
  },

  /**
   * Clear field error
   */
  clearFieldError(field) {
    const existingError = field.parentElement.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }
    field.classList.remove("error");
  },

  /**
   * Validate entire form
   */
  validateForm(form, validationRules = {}) {
    const errors = {};
    let isValid = true;

    // Get all form fields
    const fields = form.querySelectorAll("input, textarea, select");

    fields.forEach((field) => {
      const name = field.name || field.id;
      if (!name) return;

      const rules = validationRules[name] || {};
      const result = this.validateField(field, rules);

      if (!result.valid) {
        errors[name] = result.errors;
        isValid = false;
      }
    });

    return {
      valid: isValid,
      errors,
    };
  },
};

/**
 * Connection Status Monitor
 */
const ConnectionMonitor = {
  isOnline: navigator.onLine,
  checkInterval: null,
  listeners: [],

  /**
   * Initialize connection monitoring
   */
  init() {
    // Listen for online/offline events
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());

    // Periodic API health check
    this.startHealthCheck();
  },

  /**
   * Start periodic health check
   */
  startHealthCheck(interval = 30000) {
    // Clear existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check immediately
    this.checkConnection();

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, interval);
  },

  /**
   * Stop health check
   */
  stopHealthCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  },

  /**
   * Check API connection
   */
  async checkConnection() {
    try {
      const response = await fetch(`${API.baseURL}/`, {
        method: "HEAD",
        cache: "no-cache",
      });

      if (response.ok) {
        this.setOnline(true);
      } else {
        this.setOnline(false);
      }
    } catch (error) {
      this.setOnline(false);
    }
  },

  /**
   * Handle online event
   */
  handleOnline() {
    this.setOnline(true);
    Utils.showToast("Connection restored", "success", 3000);
  },

  /**
   * Handle offline event
   */
  handleOffline() {
    this.setOnline(false);
    Utils.showToast("Connection lost", "error", 5000);
  },

  /**
   * Set online status
   */
  setOnline(isOnline) {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;

    // Update UI
    this.updateStatusIndicator();

    // Notify listeners if status changed
    if (wasOnline !== isOnline) {
      this.notifyListeners(isOnline);
    }
  },

  /**
   * Update status indicator in UI
   */
  updateStatusIndicator() {
    const statusElement = document.getElementById("connectionStatus");
    if (!statusElement) return;

    if (this.isOnline) {
      statusElement.classList.remove("disconnected");
      statusElement.querySelector(".status-text").textContent = "Connected";
    } else {
      statusElement.classList.add("disconnected");
      statusElement.querySelector(".status-text").textContent = "Disconnected";
    }
  },

  /**
   * Add status change listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  },

  /**
   * Remove status change listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  },

  /**
   * Notify all listeners
   */
  notifyListeners(isOnline) {
    this.listeners.forEach((callback) => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ErrorHandler, Validator, ConnectionMonitor };
}
