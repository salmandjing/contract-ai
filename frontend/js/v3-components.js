/* ============================================
   Contract AI Platform V3 - Reusable Components
   ============================================ */

/**
 * FileUpload Component
 */
class FileUpload {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      multiple: false,
      accept: ".pdf,.txt,.docx",
      maxSize: 10 * 1024 * 1024, // 10MB per file
      maxFiles: null, // Max number of files (null = unlimited)
      maxBatchSize: null, // Max total batch size in bytes (null = unlimited)
      onFileSelect: null,
      onFileRemove: null,
      onUploadProgress: null,
      showProgress: false,
      ...options,
    };
    this.files = [];
    this.uploadProgress = {};
    this.render();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
            <div class="file-upload" id="fileUploadArea">
                <input type="file" 
                       id="fileInput" 
                       ${this.options.multiple ? "multiple" : ""} 
                       accept="${this.options.accept}" 
                       style="display: none;">
                <div class="file-upload-icon">📎</div>
                <div class="file-upload-text">Click to upload or drag & drop</div>
                <div class="file-upload-hint">Supported: PDF, TXT, DOCX (Max ${Utils.formatFileSize(
                  this.options.maxSize
                )})</div>
            </div>
            <div class="file-list" id="fileList"></div>
        `;
  }

  attachEvents() {
    const uploadArea = this.container.querySelector("#fileUploadArea");
    const fileInput = this.container.querySelector("#fileInput");

    // Click to upload
    uploadArea.addEventListener("click", () => fileInput.click());

    // File selection
    fileInput.addEventListener("change", (e) =>
      this.handleFiles(e.target.files)
    );

    // Drag and drop
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    });
  }

  handleFiles(fileList) {
    const newFiles = Array.from(fileList);
    let validFiles = [];

    // Validate files
    for (const file of newFiles) {
      // Validate file type
      if (!Utils.validateFileType(file, this.options.accept.split(","))) {
        Toast.error(
          `Invalid file type: ${file.name}. Supported: PDF, TXT, DOCX`
        );
        continue;
      }

      // Validate file size
      if (!Utils.validateFileSize(file, this.options.maxSize / (1024 * 1024))) {
        Toast.error(
          `File too large: ${file.name}. Maximum size: ${Utils.formatFileSize(
            this.options.maxSize
          )}`
        );
        continue;
      }

      validFiles.push(file);
    }

    // Add valid files
    if (validFiles.length > 0) {
      if (!this.options.multiple) {
        this.files = [validFiles[0]];
      } else {
        // Check max files limit
        if (this.options.maxFiles) {
          const remainingSlots = this.options.maxFiles - this.files.length;
          if (remainingSlots <= 0) {
            Toast.error(
              `Maximum ${this.options.maxFiles} files allowed. Please remove some files first.`
            );
            return;
          }
          if (validFiles.length > remainingSlots) {
            Toast.warning(
              `Only ${remainingSlots} more file${
                remainingSlots > 1 ? "s" : ""
              } can be added. Adding first ${remainingSlots}.`
            );
            validFiles = validFiles.slice(0, remainingSlots);
          }
        }

        // Check total batch size limit
        if (this.options.maxBatchSize) {
          const currentSize = this.files.reduce(
            (sum, file) => sum + file.size,
            0
          );
          const newSize = validFiles.reduce((sum, file) => sum + file.size, 0);
          const totalSize = currentSize + newSize;

          if (totalSize > this.options.maxBatchSize) {
            Toast.error(
              `Total batch size would exceed ${Utils.formatFileSize(
                this.options.maxBatchSize
              )}. Current: ${Utils.formatFileSize(
                currentSize
              )}, Attempting to add: ${Utils.formatFileSize(newSize)}`
            );
            return;
          }
        }

        this.files.push(...validFiles);
      }

      this.updateFileList();

      if (this.options.onFileSelect) {
        this.options.onFileSelect(this.files);
      }

      Toast.success(
        `${validFiles.length} file${validFiles.length > 1 ? "s" : ""} selected`
      );
    }
  }

  updateFileList() {
    const fileList = this.container.querySelector("#fileList");

    if (this.files.length === 0) {
      fileList.innerHTML = "";
      return;
    }

    fileList.innerHTML = this.files
      .map((file, index) => {
        const fileId = `file-${index}`;
        const progress = this.uploadProgress[fileId] || 0;
        const isUploading = progress > 0 && progress < 100;

        return `
            <div class="file-item" data-file-id="${fileId}">
                <div class="file-info">
                    <span class="file-icon">📄</span>
                    <div class="file-details">
                        <div class="file-name">${Utils.escapeHtml(
                          file.name
                        )}</div>
                        <div class="file-size">${Utils.formatFileSize(
                          file.size
                        )}</div>
                        ${
                          this.options.showProgress && isUploading
                            ? `
                            <div class="file-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                                <span class="progress-text">${progress}%</span>
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
                ${
                  !isUploading
                    ? `<button class="file-remove" data-index="${index}" aria-label="Remove file">×</button>`
                    : '<span class="file-uploading">⏳</span>'
                }
            </div>
        `;
      })
      .join("");

    // Attach remove handlers
    fileList.querySelectorAll(".file-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeFile(index);
      });
    });
  }

  setUploadProgress(fileIndex, progress) {
    const fileId = `file-${fileIndex}`;
    this.uploadProgress[fileId] = Math.min(100, Math.max(0, progress));
    this.updateFileList();

    if (this.options.onUploadProgress) {
      this.options.onUploadProgress(fileIndex, this.uploadProgress[fileId]);
    }
  }

  removeFile(index) {
    const removedFile = this.files[index];
    this.files.splice(index, 1);

    // Remove progress tracking for this file
    const fileId = `file-${index}`;
    delete this.uploadProgress[fileId];

    this.updateFileList();

    if (this.options.onFileRemove) {
      this.options.onFileRemove(this.files); // Pass remaining files, not removed file
    }

    if (this.files.length === 0) {
      Toast.info("All files removed");
    } else {
      Toast.info(`Removed ${removedFile.name}`);
    }
  }

  getFiles() {
    return this.files;
  }

  clear() {
    this.files = [];
    this.uploadProgress = {};
    this.updateFileList();
  }

  getFileInfo() {
    return {
      count: this.files.length,
      totalSize: this.files.reduce((sum, file) => sum + file.size, 0),
      files: this.files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    };
  }
}

/**
 * ProgressBar Component
 */
class ProgressBar {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showText: true,
      animated: true,
      ...options,
    };
    this.progress = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            ${
              this.options.showText ? '<div class="progress-text">0%</div>' : ""
            }
        `;
  }

  setProgress(value) {
    this.progress = Math.max(0, Math.min(100, value));
    const fill = this.container.querySelector(".progress-fill");
    const text = this.container.querySelector(".progress-text");

    fill.style.width = this.progress + "%";

    if (text) {
      text.textContent = Math.round(this.progress) + "%";
    }
  }

  setText(message) {
    const text = this.container.querySelector(".progress-text");
    if (text) {
      text.textContent = message;
    }
  }

  reset() {
    this.setProgress(0);
  }
}

/**
 * Modal Component
 */
class Modal {
  constructor(options = {}) {
    this.options = {
      title: "Modal",
      content: "",
      buttons: [],
      onClose: null,
      ...options,
    };
    this.overlay = document.getElementById("modalOverlay");
    this.render();
  }

  render() {
    const buttonsHTML = this.options.buttons
      .map(
        (btn) => `
            <button class="btn ${btn.class || "btn-secondary"}" data-action="${
          btn.action
        }">
                ${btn.label}
            </button>
        `
      )
      .join("");

    this.overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${Utils.escapeHtml(
                      this.options.title
                    )}</h3>
                    <button class="modal-close" aria-label="Close modal">×</button>
                </div>
                <div class="modal-body">
                    ${this.options.content}
                </div>
                ${
                  this.options.buttons.length > 0
                    ? `
                    <div class="modal-footer">
                        ${buttonsHTML}
                    </div>
                `
                    : ""
                }
            </div>
        `;

    this.attachEvents();
  }

  attachEvents() {
    // Close button
    this.overlay
      .querySelector(".modal-close")
      .addEventListener("click", () => this.close());

    // Click outside to close
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Button actions
    this.overlay.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const button = this.options.buttons.find((b) => b.action === action);
        if (button && button.onClick) {
          button.onClick();
        }
        if (!button || button.closeOnClick !== false) {
          this.close();
        }
      });
    });

    // ESC key to close
    this.escHandler = (e) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    document.addEventListener("keydown", this.escHandler);
  }

  show() {
    this.overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  close() {
    this.overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", this.escHandler);

    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  static confirm(title, message, onConfirm) {
    const modal = new Modal({
      title: title,
      content: `<p>${Utils.escapeHtml(message)}</p>`,
      buttons: [
        {
          label: "Cancel",
          class: "btn-ghost",
          action: "cancel",
        },
        {
          label: "Confirm",
          class: "btn-primary",
          action: "confirm",
          onClick: onConfirm,
        },
      ],
    });
    modal.show();
    return modal;
  }
}

/**
 * Toast Notification Component
 */
class Toast {
  static show(message, type = "info", duration = 5000) {
    const container = document.getElementById("toastContainer");
    const id = Utils.generateId();

    const icons = {
      success: "✓",
      error: "✗",
      warning: "⚠",
      info: "ℹ",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.id = id;
    toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                <div class="toast-message">${Utils.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close notification">×</button>
        `;

    container.appendChild(toast);

    // Close button
    toast.querySelector(".toast-close").addEventListener("click", () => {
      Toast.remove(id);
    });

    // Auto remove
    if (duration > 0) {
      setTimeout(() => Toast.remove(id), duration);
    }

    return id;
  }

  static remove(id) {
    const toast = document.getElementById(id);
    if (toast) {
      toast.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }

  static success(message, duration) {
    return Toast.show(message, "success", duration);
  }

  static error(message, duration) {
    return Toast.show(message, "error", duration);
  }

  static warning(message, duration) {
    return Toast.show(message, "warning", duration);
  }

  static info(message, duration) {
    return Toast.show(message, "info", duration);
  }
}

/**
 * Loading Spinner Component
 */
class LoadingSpinner {
  static show(container, message = "Loading...", hint = "") {
    container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <div class="loading-text">${Utils.escapeHtml(message)}</div>
                ${
                  hint
                    ? `<div class="loading-hint">${Utils.escapeHtml(
                        hint
                      )}</div>`
                    : ""
                }
            </div>
        `;
  }

  static hide(container) {
    container.innerHTML = "";
  }
}

// Export components
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FileUpload, ProgressBar, Modal, Toast, LoadingSpinner };
}
