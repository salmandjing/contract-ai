/**
 * Batch Processing Tab
 * Handles batch contract analysis using AgentCore Runtime
 */

const BatchTab = {
  container: null,
  currentBatch: null,
  batchFiles: [],
  pollInterval: null,

  /**
   * Initialize the batch tab
   */
  async init(container) {
    this.container = container;
    console.log("Initializing Batch tab...");

    try {
      await this.render();
    } catch (error) {
      console.error("Failed to initialize Batch tab:", error);
      this.showError("Failed to load batch processing form");
    }
  },

  /**
   * Render the batch processing form
   */
  async render() {
    this.container.innerHTML = `
      <div class="batch-container">
        <!-- Upload Section -->
        <div class="batch-upload-section">
          <h4>📦 Upload Contracts for Batch Processing</h4>
          <p class="section-description">
            Upload multiple contract files to analyze them in parallel using AgentCore Runtime.
          </p>
          
          <div id="batchFileUploadContainer"></div>

          <!-- Selected Files List -->
          <div id="selectedFilesList" class="selected-files-list" style="display: none;">
            <h5>Selected Files (<span id="fileCount">0</span>)</h5>
            <div id="filesListContent"></div>
          </div>

          <!-- Options -->
          <div class="batch-options">
            <div class="option-group">
              <label for="batchJurisdiction">Jurisdiction:</label>
              <select id="batchJurisdiction" class="form-select">
                <option value="US">United States</option>
                <option value="EU">European Union</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button id="processBatchButton" class="btn btn-primary btn-large" disabled>
              ⚡ Process Batch
            </button>
            <button id="clearBatchButton" class="btn btn-secondary">
              Clear All
            </button>
          </div>
        </div>

        <!-- Processing Section -->
        <div class="batch-processing-section" id="batchProcessingSection" style="display: none;">
          <h4>⚙️ Processing Batch</h4>
          
          <div class="batch-progress">
            <div id="batchProgressBar"></div>
            <div class="batch-stats">
              <div class="stat-item">
                <span class="stat-label">Total:</span>
                <span class="stat-value" id="totalContracts">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Completed:</span>
                <span class="stat-value" id="completedContracts">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Failed:</span>
                <span class="stat-value" id="failedContracts">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Remaining:</span>
                <span class="stat-value" id="remainingContracts">0</span>
              </div>
            </div>
          </div>

          <div id="batchItemsList" class="batch-items-list"></div>
        </div>

        <!-- Results Section -->
        <div class="batch-results-section" id="batchResultsSection" style="display: none;">
          <div class="results-header">
            <h3>Batch Results</h3>
            <div class="results-actions">
              <button id="downloadBatchButton" class="btn btn-secondary btn-small">
                💾 Download All Results
              </button>
              <button id="downloadSummaryButton" class="btn btn-secondary btn-small">
                📊 Download Summary
              </button>
            </div>
          </div>
          <div id="batchResultsContent" class="batch-results-content"></div>
        </div>
      </div>
    `;

    // Initialize components
    this.initializeFileUpload();
    this.setupEventListeners();
  },

  /**
   * Initialize file upload
   */
  initializeFileUpload() {
    const container = document.getElementById("batchFileUploadContainer");
    if (!container) return;

    const fileUpload = createFileUpload({
      accept: ".txt,.pdf,.doc,.docx",
      multiple: true,
      maxSize: 10 * 1024 * 1024,
      onFileSelect: (files) => this.handleFilesSelect(files),
    });

    container.appendChild(fileUpload);
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Process batch button
    const processBatchButton = document.getElementById("processBatchButton");
    if (processBatchButton) {
      processBatchButton.addEventListener("click", () => this.processBatch());
    }

    // Clear batch button
    const clearBatchButton = document.getElementById("clearBatchButton");
    if (clearBatchButton) {
      clearBatchButton.addEventListener("click", () => this.clearBatch());
    }

    // Download batch button
    const downloadBatchButton = document.getElementById("downloadBatchButton");
    if (downloadBatchButton) {
      downloadBatchButton.addEventListener("click", () =>
        this.downloadAllResults()
      );
    }

    // Download summary button
    const downloadSummaryButton = document.getElementById(
      "downloadSummaryButton"
    );
    if (downloadSummaryButton) {
      downloadSummaryButton.addEventListener("click", () =>
        this.downloadSummary()
      );
    }
  },

  /**
   * Handle files selection
   */
  async handleFilesSelect(files) {
    console.log(`${files.length} files selected`);

    // Read all files
    const filePromises = files.map(async (file) => {
      try {
        const content = await readFileAsText(file);
        return {
          name: file.name,
          size: file.size,
          content: content,
          status: "pending",
        };
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
        showToast("Error", `Failed to read ${file.name}`, "error");
        return null;
      }
    });

    const fileResults = await Promise.all(filePromises);
    const validFiles = fileResults.filter((f) => f !== null);

    // Add to batch files
    this.batchFiles = [...this.batchFiles, ...validFiles];

    // Update UI
    this.updateFilesList();

    showToast(
      "Files Added",
      `${validFiles.length} files added to batch`,
      "success",
      2000
    );
  },

  /**
   * Update files list display
   */
  updateFilesList() {
    const filesList = document.getElementById("selectedFilesList");
    const filesListContent = document.getElementById("filesListContent");
    const fileCount = document.getElementById("fileCount");
    const processBatchButton = document.getElementById("processBatchButton");

    if (!filesList || !filesListContent || !fileCount) return;

    if (this.batchFiles.length === 0) {
      filesList.style.display = "none";
      processBatchButton.disabled = true;
      return;
    }

    filesList.style.display = "block";
    fileCount.textContent = this.batchFiles.length;
    processBatchButton.disabled = false;

    let html = "";
    this.batchFiles.forEach((file, index) => {
      html += `
        <div class="file-item">
          <span class="file-icon">📄</span>
          <span class="file-name">${file.name}</span>
          <span class="file-size">${formatFileSize(file.size)}</span>
          <button class="btn btn-small btn-secondary" onclick="BatchTab.removeFile(${index})">
            Remove
          </button>
        </div>
      `;
    });

    filesListContent.innerHTML = html;
  },

  /**
   * Remove file from batch
   */
  removeFile(index) {
    this.batchFiles.splice(index, 1);
    this.updateFilesList();
    showToast("File Removed", "File removed from batch", "info", 2000);
  },

  /**
   * Process batch
   */
  async processBatch() {
    if (this.batchFiles.length === 0) {
      showToast("Error", "No files to process", "error");
      return;
    }

    // Get options
    const jurisdiction = document.getElementById("batchJurisdiction").value;

    // Prepare contracts
    const contracts = this.batchFiles.map((file) => ({
      name: file.name,
      text: file.content,
    }));

    // Show processing section
    this.showProcessing();

    try {
      console.log(
        `Starting batch processing of ${contracts.length} contracts...`
      );

      // Call API
      const result = await apiClient.processBatch(contracts, {
        jurisdiction: jurisdiction,
        userId: authManager.getUserInfo()?.sub || "anonymous",
        sessionId: apiClient.generateSessionId(),
      });

      // Store batch info
      this.currentBatch = {
        batchId: result.batch_id,
        total: contracts.length,
        completed: 0,
        failed: 0,
        results: [],
      };

      // Start polling for status
      this.startPolling(result.batch_id);

      showToast("Batch Started", "Batch processing started", "success");
    } catch (error) {
      console.error("Batch processing failed:", error);
      this.showError(
        error.message || "Failed to start batch processing. Please try again."
      );
      showToast("Batch Failed", error.message || "An error occurred", "error");
    }
  },

  /**
   * Show processing section
   */
  showProcessing() {
    const processingSection = document.getElementById("batchProcessingSection");
    if (!processingSection) return;

    processingSection.style.display = "block";

    // Initialize progress bar
    const progressBarContainer = document.getElementById("batchProgressBar");
    if (progressBarContainer) {
      progressBarContainer.innerHTML = "";
      const progressBar = createProgressBar(0, "Processing contracts...");
      progressBarContainer.appendChild(progressBar);
    }

    // Initialize stats
    document.getElementById("totalContracts").textContent =
      this.batchFiles.length;
    document.getElementById("completedContracts").textContent = "0";
    document.getElementById("failedContracts").textContent = "0";
    document.getElementById("remainingContracts").textContent =
      this.batchFiles.length;

    // Initialize items list
    const itemsList = document.getElementById("batchItemsList");
    if (itemsList) {
      let html = "";
      this.batchFiles.forEach((file, index) => {
        html += `
          <div class="batch-item" id="batchItem${index}">
            <span class="batch-item-icon">⏳</span>
            <span class="batch-item-name">${file.name}</span>
            <span class="batch-item-status">Pending</span>
          </div>
        `;
      });
      itemsList.innerHTML = html;
    }

    // Scroll to processing section
    processingSection.scrollIntoView({ behavior: "smooth" });
  },

  /**
   * Start polling for batch status
   */
  startPolling(batchId) {
    // Poll every 2 seconds
    this.pollInterval = setInterval(async () => {
      try {
        const status = await apiClient.getBatchStatus(batchId);
        this.updateBatchStatus(status);

        // Stop polling if batch is complete
        if (status.status === "completed" || status.status === "failed") {
          this.stopPolling();
          this.displayResults(status);
        }
      } catch (error) {
        console.error("Failed to get batch status:", error);
        this.stopPolling();
        showToast("Error", "Failed to get batch status", "error");
      }
    }, 2000);
  },

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },

  /**
   * Update batch status
   */
  updateBatchStatus(status) {
    if (!status || !status.items) return;

    const completed = status.items.filter(
      (item) => item.status === "completed"
    ).length;
    const failed = status.items.filter(
      (item) => item.status === "failed"
    ).length;
    const remaining = status.items.filter(
      (item) => item.status === "pending" || item.status === "processing"
    ).length;
    const progress = Math.round(
      ((completed + failed) / status.items.length) * 100
    );

    // Update progress bar
    const progressBarContainer = document.getElementById("batchProgressBar");
    if (progressBarContainer) {
      const progressBar = progressBarContainer.querySelector(
        ".progress-container"
      );
      if (progressBar) {
        updateProgressBar(
          progressBar,
          progress,
          `Processing contracts... ${completed + failed}/${status.items.length}`
        );
      }
    }

    // Update stats
    document.getElementById("completedContracts").textContent = completed;
    document.getElementById("failedContracts").textContent = failed;
    document.getElementById("remainingContracts").textContent = remaining;

    // Update items
    status.items.forEach((item, index) => {
      const itemElement = document.getElementById(`batchItem${index}`);
      if (itemElement) {
        const icon = itemElement.querySelector(".batch-item-icon");
        const statusText = itemElement.querySelector(".batch-item-status");

        if (item.status === "completed") {
          icon.textContent = "✅";
          statusText.textContent = "Completed";
          itemElement.classList.add("completed");
        } else if (item.status === "failed") {
          icon.textContent = "❌";
          statusText.textContent = "Failed";
          itemElement.classList.add("failed");
        } else if (item.status === "processing") {
          icon.textContent = "⚙️";
          statusText.textContent = "Processing";
          itemElement.classList.add("processing");
        }
      }
    });

    // Store current batch info
    this.currentBatch = {
      ...this.currentBatch,
      completed: completed,
      failed: failed,
      results: status.items,
    };
  },

  /**
   * Display batch results
   */
  displayResults(status) {
    const resultsSection = document.getElementById("batchResultsSection");
    const resultsContent = document.getElementById("batchResultsContent");

    if (!resultsSection || !resultsContent) return;

    // Show results section
    resultsSection.style.display = "block";

    // Format results
    let html = "";

    // Summary
    html += `
      <div class="batch-summary">
        <h4>📊 Batch Summary</h4>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-label">Total Contracts:</span>
            <span class="summary-value">${status.items.length}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-label">Completed:</span>
            <span class="summary-value success">${
              this.currentBatch.completed
            }</span>
          </div>
          <div class="summary-stat">
            <span class="summary-label">Failed:</span>
            <span class="summary-value error">${this.currentBatch.failed}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-label">Success Rate:</span>
            <span class="summary-value">${Math.round(
              (this.currentBatch.completed / status.items.length) * 100
            )}%</span>
          </div>
        </div>
      </div>
    `;

    // Individual results
    html += '<div class="batch-results-list">';
    status.items.forEach((item, index) => {
      const statusBadge =
        item.status === "completed"
          ? createBadge("Completed", "success").outerHTML
          : createBadge("Failed", "error").outerHTML;

      html += `
        <div class="batch-result-item">
          <div class="result-item-header">
            <span class="result-item-name">${
              this.batchFiles[index]?.name || `Contract ${index + 1}`
            }</span>
            ${statusBadge}
          </div>
          <div class="result-item-body">
            ${
              item.status === "completed"
                ? this.formatAnalysisResult(item.result)
                : `<p class="error-message">Error: ${
                    item.error || "Unknown error"
                  }</p>`
            }
          </div>
          ${
            item.status === "completed"
              ? `
            <div class="result-item-actions">
              <button class="btn btn-small btn-secondary" onclick="BatchTab.downloadIndividualResult(${index})">
                💾 Download
              </button>
            </div>
          `
              : ""
          }
        </div>
      `;
    });
    html += "</div>";

    resultsContent.innerHTML = html;

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: "smooth" });

    showToast("Batch Complete", "Batch processing completed", "success");
  },

  /**
   * Format analysis result
   */
  formatAnalysisResult(result) {
    if (!result) return "<p>No result data available</p>";

    let html = "";

    if (result.contract_type) {
      html += `<p><strong>Type:</strong> ${result.contract_type}</p>`;
    }

    if (
      result.risk_assessment &&
      result.risk_assessment.risk_score !== undefined
    ) {
      html += `<p><strong>Risk Score:</strong> ${result.risk_assessment.risk_score}/100</p>`;
    }

    if (result.executive_summary) {
      html += `<p><strong>Summary:</strong> ${truncateText(
        result.executive_summary,
        200
      )}</p>`;
    }

    return html;
  },

  /**
   * Download individual result
   */
  downloadIndividualResult(index) {
    if (!this.currentBatch || !this.currentBatch.results[index]) {
      showToast("Error", "Result not available", "error");
      return;
    }

    const result = this.currentBatch.results[index].result;
    const filename = `${
      this.batchFiles[index].name
    }_analysis_${Date.now()}.json`;
    downloadJsonFile(result, filename);
    showToast("Downloaded", "Result downloaded successfully", "success", 2000);
  },

  /**
   * Download all results
   */
  downloadAllResults() {
    if (!this.currentBatch || !this.currentBatch.results) {
      showToast("Error", "No results to download", "error");
      return;
    }

    const allResults = this.currentBatch.results.map((item, index) => ({
      contract_name: this.batchFiles[index]?.name || `Contract ${index + 1}`,
      status: item.status,
      result: item.result,
      error: item.error,
    }));

    const filename = `batch_results_${Date.now()}.json`;
    downloadJsonFile(allResults, filename);
    showToast(
      "Downloaded",
      "All results downloaded successfully",
      "success",
      2000
    );
  },

  /**
   * Download summary
   */
  downloadSummary() {
    if (!this.currentBatch) {
      showToast("Error", "No summary to download", "error");
      return;
    }

    const summary = {
      batch_id: this.currentBatch.batchId,
      total_contracts: this.currentBatch.total,
      completed: this.currentBatch.completed,
      failed: this.currentBatch.failed,
      success_rate: Math.round(
        (this.currentBatch.completed / this.currentBatch.total) * 100
      ),
      timestamp: new Date().toISOString(),
    };

    const filename = `batch_summary_${Date.now()}.json`;
    downloadJsonFile(summary, filename);
    showToast("Downloaded", "Summary downloaded successfully", "success", 2000);
  },

  /**
   * Clear batch
   */
  clearBatch() {
    if (this.pollInterval) {
      if (
        !confirm(
          "Batch processing is in progress. Are you sure you want to clear?"
        )
      ) {
        return;
      }
      this.stopPolling();
    }

    this.batchFiles = [];
    this.currentBatch = null;
    this.updateFilesList();

    document.getElementById("batchProcessingSection").style.display = "none";
    document.getElementById("batchResultsSection").style.display = "none";

    showToast("Cleared", "Batch cleared", "info", 2000);
  },

  /**
   * Show error
   */
  showError(message) {
    const processingSection = document.getElementById("batchProcessingSection");
    if (processingSection) {
      processingSection.innerHTML = createAlert(message, "error").outerHTML;
      processingSection.style.display = "block";
    }
  },
};

// Make globally accessible
window.BatchTab = BatchTab;
