/* ============================================
   Contract AI Platform V3 - Main Application
   ============================================ */

class ContractAIApp {
  constructor() {
    this.currentTab = "analyze";
    this.init();
  }

  async init() {
    console.log("Initializing Contract AI Platform V3...");

    // Initialize tooltips
    Utils.initTooltips();

    // Check API connection
    await this.checkConnection();

    // Setup tab navigation
    this.setupTabNavigation();

    // Initialize the first tab
    this.loadTab("analyze");

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Show welcome message for first-time users
    const isFirstVisit = !Utils.storage.get("has_visited", false);
    if (isFirstVisit) {
      Utils.storage.set("has_visited", true);
      setTimeout(() => {
        Utils.showToast(
          "Welcome to Contract AI Platform! Click the Help button to start a guided tour.",
          "info",
          8000
        );
      }, 1500);
    }

    console.log("Application initialized successfully");
  }

  async checkConnection() {
    const statusIndicator = document.getElementById("connectionStatus");

    try {
      const isConnected = await API.checkConnection();

      if (isConnected) {
        statusIndicator.classList.remove("disconnected");
        statusIndicator.querySelector(".status-text").textContent = "Connected";
      } else {
        statusIndicator.classList.add("disconnected");
        statusIndicator.querySelector(".status-text").textContent =
          "Disconnected";
        Utils.showToast("Cannot connect to backend API", "error");
      }
    } catch (error) {
      statusIndicator.classList.add("disconnected");
      statusIndicator.querySelector(".status-text").textContent =
        "Disconnected";
      Utils.showToast("Cannot connect to backend API", "error");
    }
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll(".tab-button");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = button.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // Update active tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    document.getElementById(`${tabName}Tab`).classList.add("active");

    // Load tab content if not already loaded
    this.currentTab = tabName;
    this.loadTab(tabName);

    // Update URL
    Utils.setQueryParam("tab", tabName);
  }

  loadTab(tabName) {
    const tabContent = document
      .getElementById(`${tabName}Tab`)
      .querySelector(".tab-body");

    // Check if already loaded
    if (tabContent.children.length > 0) {
      return;
    }

    // Load tab-specific content
    switch (tabName) {
      case "analyze":
        this.loadAnalyzeTab(tabContent);
        break;
      case "batch":
        this.loadBatchTab(tabContent);
        break;
      case "obligations":
        this.loadObligationsTab(tabContent);
        break;
      case "compare":
        this.loadCompareTab(tabContent);
        break;
      case "generate":
        // Initialize Template Generator
        if (typeof TemplateGenerator !== "undefined") {
          TemplateGenerator.init(tabContent);
        } else {
          this.loadGenerateTab(tabContent);
        }
        break;
      case "clauses":
        // Initialize AI Clause Assistant
        if (typeof ClauseAssistant !== "undefined") {
          ClauseAssistant.init(tabContent);
        } else {
          this.loadClausesTab(tabContent);
        }
        break;
    }
  }

  loadAnalyzeTab(container) {
    container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📁 Upload Contract File</h3>
                    <p class="card-subtitle">Upload a PDF, TXT, or DOCX file for analysis</p>
                </div>
                <div class="card-body">
                    <div id="analyzeFileUpload"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">✍️ Or Paste Contract Text</h3>
                    <p class="card-subtitle">Enter contract text directly</p>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <div class="textarea-wrapper">
                            <textarea id="analyzeContractText" 
                                      class="form-textarea" 
                                      placeholder="Paste your contract text here...

Example:
POWER PURCHASE AGREEMENT

This Agreement is entered into as of January 1, 2025.
Payment due: April 1, 2025
Delivery date: June 1, 2025
Term: 20 years"></textarea>
                            <div class="textarea-footer">
                                <span id="charCount" class="char-count">0 characters</span>
                                <button id="clearTextBtn" class="btn btn-sm btn-ghost" style="display: none;">
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="analyzeJurisdiction">Jurisdiction:</label>
                        <select id="analyzeJurisdiction" class="form-select">
                            <option value="US">United States</option>
                            <option value="California">California</option>
                            <option value="New York">New York</option>
                            <option value="Texas">Texas</option>
                            <option value="UK">United Kingdom</option>
                        </select>
                    </div>

                    <button id="analyzeBtn" class="btn btn-primary btn-full btn-lg">
                        🔍 Analyze Contract
                    </button>
                </div>
            </div>

            <div id="analyzeResults"></div>
        `;

    // Initialize file upload
    const fileUpload = new FileUpload(
      document.getElementById("analyzeFileUpload"),
      {
        multiple: false,
        showProgress: true,
        onFileSelect: async (files) => {
          if (files.length > 0) {
            await this.handleFileUpload(files[0], fileUpload);
          }
        },
      }
    );

    // Character count and validation
    const textarea = document.getElementById("analyzeContractText");
    const charCount = document.getElementById("charCount");
    const clearBtn = document.getElementById("clearTextBtn");

    textarea.addEventListener("input", () => {
      const length = textarea.value.length;
      charCount.textContent = `${Utils.formatNumber(length)} characters`;

      // Show/hide clear button
      clearBtn.style.display = length > 0 ? "inline-flex" : "none";
    });

    // Clear button handler
    clearBtn.addEventListener("click", () => {
      textarea.value = "";
      textarea.dispatchEvent(new Event("input"));
      Toast.info("Text cleared");
    });

    // Analyze button handler
    document.getElementById("analyzeBtn").addEventListener("click", () => {
      this.analyzeContract();
    });
  }

  async handleFileUpload(file, fileUploadComponent) {
    try {
      Toast.info("Uploading and processing file...");

      // Simulate progress (since we don't have real progress from the API)
      if (fileUploadComponent) {
        fileUploadComponent.setUploadProgress(0, 30);
      }

      const result = await API.contracts.upload(file);

      if (fileUploadComponent) {
        fileUploadComponent.setUploadProgress(0, 100);
      }

      if (result.success) {
        document.getElementById("analyzeContractText").value = result.text;

        // Trigger input event to update character count
        document
          .getElementById("analyzeContractText")
          .dispatchEvent(new Event("input"));

        Toast.success(`File uploaded successfully: ${result.filename}`);

        // Display file info
        const wordCount = result.text.split(/\s+/).length;
        Toast.info(`Extracted ${wordCount} words from ${result.filename}`);

        // Clear the file upload component
        if (fileUploadComponent) {
          fileUploadComponent.clear();
        }
      } else {
        throw new Error(result?.error || "Upload failed");
      }
    } catch (error) {
      Toast.error("File upload failed: " + error.message);
      if (fileUploadComponent) {
        fileUploadComponent.clear();
      }
    }
  }

  async analyzeContract() {
    const contractText = document
      .getElementById("analyzeContractText")
      .value.trim();
    const jurisdiction = document.getElementById("analyzeJurisdiction").value;
    const resultsContainer = document.getElementById("analyzeResults");
    const analyzeBtn = document.getElementById("analyzeBtn");

    // Validation
    if (!contractText) {
      Toast.warning("Please enter or upload a contract first");
      return;
    }

    if (contractText.length < 50) {
      Toast.warning("Contract text is too short. Please provide more content.");
      return;
    }

    try {
      // Disable button and show loading state
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = "⏳ Analyzing...";

      LoadingSpinner.show(
        resultsContainer,
        "Analyzing contract with AgentCore...",
        "This may take 30-60 seconds depending on contract complexity"
      );

      const startTime = Date.now();
      const result = await API.contracts.analyze(
        contractText,
        jurisdiction,
        "agentcore"
      );
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.success) {
        this.displayAnalysisResults(resultsContainer, result);
        Toast.success(`Analysis complete in ${elapsedTime}s!`);
        Utils.scrollToElement(resultsContainer, 100);
      } else {
        throw new Error(result.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Analysis error:", error);

      // Display user-friendly error message
      resultsContainer.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="alert alert-error">
              <strong>Analysis Failed</strong>
              <p>${Utils.escapeHtml(error.message)}</p>
              <p class="mt-4">
                <button id="retryAnalysis" class="btn btn-primary">
                  🔄 Retry Analysis
                </button>
              </p>
            </div>
          </div>
        </div>
      `;

      // Add retry handler
      document
        .getElementById("retryAnalysis")
        ?.addEventListener("click", () => {
          this.analyzeContract();
        });

      Toast.error("Analysis failed. Please try again.");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = "🔍 Analyze Contract";
    }
  }

  displayAnalysisResults(container, data) {
    // Compatibility layer: AgentCore returns data directly, V3 nests it in result
    if (!data.result) {
      data = { result: data, metadata: data.metadata || {} };
    }

    let html = '<div class="results-container">';

    // Executive Summary
    if (data.result.executive_summary || data.result.short_summary) {
      // Use short_summary from API if available, otherwise extract from full summary
      const fullSummary = data.result.executive_summary || "";
      const shortSummary =
        data.result.short_summary || this.extractShortSummary(fullSummary);

      html += `
        <div class="card executive-summary-card">
          <div class="card-header">
            <h3 class="card-title">📊 Executive Summary</h3>
          </div>
          <div class="card-body">
            <div class="short-summary">
              ${Utils.parseMarkdown(shortSummary)}
            </div>
            <div class="detailed-summary-container">
              <button class="btn btn-ghost btn-sm expand-summary-btn" id="expandSummaryBtn">
                <span class="expand-icon">▲</span> Hide Detailed Analysis
              </button>
              <div class="detailed-summary" id="detailedSummary" style="display: block;">
                <div class="result-content">
                  ${Utils.parseMarkdown(fullSummary)}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Risk Assessment
    if (data.result.risk_assessment) {
      html += `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🛡️ Risk Assessment</h3>
          </div>
          <div class="card-body">
            <div class="result-content">${this.formatText(
              data.result.risk_assessment
            )}</div>
          </div>
        </div>
      `;
    }

    // Deviations
    if (
      data.deviation_analysis &&
      data.deviation_analysis.total_deviations > 0
    ) {
      html += `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚠️ Deviations from Standard</h3>
            <span class="badge badge-warning">${data.deviation_analysis.total_deviations} Found</span>
          </div>
          <div class="card-body">
      `;

      // Missing Clauses
      if (
        data.deviation_analysis.missing_clauses &&
        data.deviation_analysis.missing_clauses.length > 0
      ) {
        html += '<div class="deviation-section">';
        html += '<h4 class="deviation-title">Missing Clauses</h4>';
        html += '<div class="deviation-list">';

        data.deviation_analysis.missing_clauses.forEach((clause) => {
          const badgeClass = Utils.getRiskBadgeClass(clause.risk_level);
          html += `
            <div class="deviation-item">
              <div class="deviation-header">
                <span class="badge ${badgeClass}">${clause.risk_level}</span>
                <strong>${Utils.escapeHtml(clause.clause_name)}</strong>
              </div>
              ${
                clause.description
                  ? `<p class="deviation-description">${Utils.escapeHtml(
                      clause.description
                    )}</p>`
                  : ""
              }
            </div>
          `;
        });

        html += "</div></div>";
      }

      // Modified Clauses
      if (
        data.deviation_analysis.modified_clauses &&
        data.deviation_analysis.modified_clauses.length > 0
      ) {
        html += '<div class="deviation-section mt-4">';
        html += '<h4 class="deviation-title">Modified Clauses</h4>';
        html += '<div class="deviation-list">';

        data.deviation_analysis.modified_clauses.forEach((clause) => {
          const badgeClass = Utils.getRiskBadgeClass(clause.risk_level);
          html += `
            <div class="deviation-item">
              <div class="deviation-header">
                <span class="badge ${badgeClass}">${clause.risk_level}</span>
                <strong>${Utils.escapeHtml(clause.clause_name)}</strong>
              </div>
              ${
                clause.description
                  ? `<p class="deviation-description">${Utils.escapeHtml(
                      clause.description
                    )}</p>`
                  : ""
              }
            </div>
          `;
        });

        html += "</div></div>";
      }

      html += `
          </div>
        </div>
      `;
    }

    // Key Terms
    if (
      data.result.key_terms &&
      Object.keys(data.result.key_terms).length > 0
    ) {
      html += `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🔑 Key Terms</h3>
          </div>
          <div class="card-body">
            <div class="key-terms-grid">
      `;

      for (const [key, value] of Object.entries(data.result.key_terms)) {
        html += `
          <div class="key-term-item">
            <div class="key-term-label">${Utils.escapeHtml(key)}</div>
            <div class="key-term-value">${Utils.escapeHtml(String(value))}</div>
          </div>
        `;
      }

      html += `
            </div>
          </div>
        </div>
      `;
    }

    // Export Button
    html += `
      <div class="card">
        <div class="card-body text-center">
          <button id="exportPdfBtn" class="btn btn-primary btn-lg">
            📥 Export Analysis as PDF
          </button>
        </div>
      </div>
    `;

    html += "</div>";
    container.innerHTML = html;

    // Store analysis data for export
    this.currentAnalysis = {
      contractText:
        data.result.contract_text ||
        document.getElementById("analyzeContractText").value,
      analysisResult: data.result,
    };

    // Attach export handler
    document.getElementById("exportPdfBtn")?.addEventListener("click", () => {
      this.exportAnalysisPDF();
    });

    // Attach expand/collapse handler for executive summary
    const expandBtn = document.getElementById("expandSummaryBtn");
    const detailedSummary = document.getElementById("detailedSummary");
    if (expandBtn && detailedSummary) {
      expandBtn.addEventListener("click", () => {
        const isExpanded = detailedSummary.style.display !== "none";
        if (isExpanded) {
          detailedSummary.style.display = "none";
          expandBtn.innerHTML =
            '<span class="expand-icon">▼</span> View Detailed Analysis';
        } else {
          detailedSummary.style.display = "block";
          expandBtn.innerHTML =
            '<span class="expand-icon">▲</span> Hide Detailed Analysis';
        }
      });
    }
  }

  formatText(text) {
    // Use the enhanced markdown renderer from Utils
    return Utils.renderMarkdown(text);
  }

  extractShortSummary(text) {
    if (!text) return "";

    // Remove markdown headings for short summary
    let cleanText = text.replace(/^#+\s+/gm, "");

    // Split into paragraphs
    const paragraphs = cleanText.split("\n\n").filter((p) => p.trim());

    // Get first paragraph or first 250 characters
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0].trim();
      if (firstPara.length <= 250) {
        return firstPara;
      }
      // Truncate at sentence boundary
      const sentences = firstPara.match(/[^.!?]+[.!?]+/g) || [firstPara];
      let summary = "";
      for (const sentence of sentences) {
        if ((summary + sentence).length <= 250) {
          summary += sentence;
        } else {
          break;
        }
      }
      return summary || firstPara.substring(0, 250) + "...";
    }

    return text.substring(0, 250) + "...";
  }

  calculateOverallRisk(data) {
    if (!data.deviation_analysis) return "LOW";

    const total = data.deviation_analysis.total_deviations || 0;
    const missing = data.deviation_analysis.missing_clauses || [];
    const modified = data.deviation_analysis.modified_clauses || [];

    // Count critical and high risk items
    const criticalCount = [...missing, ...modified].filter(
      (c) => c.risk_level === "CRITICAL"
    ).length;
    const highCount = [...missing, ...modified].filter(
      (c) => c.risk_level === "HIGH"
    ).length;

    if (criticalCount > 0) return "CRITICAL";
    if (highCount > 2) return "HIGH";
    if (total > 5) return "MEDIUM";
    return "LOW";
  }

  loadBatchTab(container) {
    container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📦 Upload Multiple Contracts</h3>
                    <p class="card-subtitle">Process up to 50 contracts simultaneously (Max 10MB per file)</p>
                </div>
                <div class="card-body">
                    <div id="batchFileUpload"></div>
                    
                    <div id="batchFileInfo" class="batch-file-info" style="display: none;">
                        <div class="info-row">
                            <span class="info-label">Selected Files:</span>
                            <span id="batchFileCount" class="info-value">0</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Total Size:</span>
                            <span id="batchTotalSize" class="info-value">0 MB</span>
                        </div>
                    </div>
                    
                    <div class="form-group mt-4">
                        <label class="form-label" for="batchJurisdiction">Jurisdiction:</label>
                        <select id="batchJurisdiction" class="form-select">
                            <option value="US">United States</option>
                            <option value="California">California</option>
                            <option value="New York">New York</option>
                            <option value="Texas">Texas</option>
                            <option value="UK">United Kingdom</option>
                        </select>
                    </div>

                    <button id="batchProcessBtn" class="btn btn-primary btn-full btn-lg" disabled>
                        📤 Start Batch Processing
                    </button>
                </div>
            </div>

            <div id="batchResults"></div>
        `;

    // Initialize file upload with batch-specific options
    const fileUpload = new FileUpload(
      document.getElementById("batchFileUpload"),
      {
        multiple: true,
        maxFiles: 50,
        maxBatchSize: 500 * 1024 * 1024, // 500MB total batch size
        onFileSelect: (files) => {
          this.updateBatchFileInfo(files);
          document.getElementById("batchProcessBtn").disabled =
            files.length === 0;
        },
        onFileRemove: (files) => {
          this.updateBatchFileInfo(files);
          document.getElementById("batchProcessBtn").disabled =
            files.length === 0;
        },
      }
    );

    // Store reference for later use
    this.batchFileUpload = fileUpload;

    // Process button handler
    document.getElementById("batchProcessBtn").addEventListener("click", () => {
      this.processBatch(fileUpload.getFiles());
    });
  }

  updateBatchFileInfo(files) {
    const infoContainer = document.getElementById("batchFileInfo");
    const fileCount = document.getElementById("batchFileCount");
    const totalSize = document.getElementById("batchTotalSize");

    if (files.length === 0) {
      infoContainer.style.display = "none";
      return;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    infoContainer.style.display = "block";
    fileCount.textContent = files.length;
    totalSize.textContent = Utils.formatFileSize(totalBytes);
  }

  async processBatch(files) {
    if (files.length === 0) {
      Toast.warning("Please select files first");
      return;
    }

    // Validate file count
    if (files.length > 50) {
      Toast.error("Maximum 50 files allowed per batch");
      return;
    }

    const jurisdiction = document.getElementById("batchJurisdiction").value;
    const resultsContainer = document.getElementById("batchResults");
    const processBtn = document.getElementById("batchProcessBtn");

    try {
      processBtn.disabled = true;
      processBtn.innerHTML = "⏳ Uploading...";
      Toast.info(`Uploading ${files.length} files...`);

      const uploadResult = await API.batch.upload(files, jurisdiction);

      if (uploadResult.success) {
        Toast.success(
          `Batch uploaded successfully! Batch ID: ${uploadResult.batch_id}`
        );

        // Display batch info immediately
        this.displayBatchInfo(resultsContainer, uploadResult, jurisdiction);

        // Start processing
        await this.startBatchProcessing(
          uploadResult.batch_id,
          resultsContainer,
          uploadResult
        );
      }
    } catch (error) {
      console.error("Batch processing error:", error);
      Toast.error("Batch processing failed: " + error.message);

      resultsContainer.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="alert alert-error">
              <strong>Batch Processing Failed</strong>
              <p>${Utils.escapeHtml(error.message)}</p>
              <p class="mt-4">
                <button id="retryBatch" class="btn btn-primary">
                  🔄 Try Again
                </button>
              </p>
            </div>
          </div>
        </div>
      `;

      document.getElementById("retryBatch")?.addEventListener("click", () => {
        this.processBatch(files);
      });
    } finally {
      processBtn.disabled = false;
      processBtn.innerHTML = "📤 Start Batch Processing";
    }
  }

  displayBatchInfo(container, batchData, jurisdiction) {
    const createdAt = new Date(batchData.created_at || Date.now());

    const html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📦 Batch Information</h3>
        </div>
        <div class="card-body">
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">Batch ID:</span>
              <span class="metadata-value">${Utils.escapeHtml(
                batchData.batch_id
              )}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Created:</span>
              <span class="metadata-value">${Utils.formatDate(createdAt)}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Total Files:</span>
              <span class="metadata-value">${batchData.total_files || 0}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Jurisdiction:</span>
              <span class="metadata-value">${Utils.escapeHtml(
                jurisdiction
              )}</span>
            </div>
          </div>
        </div>
      </div>
      <div id="batchStatusContainer"></div>
    `;

    container.innerHTML = html;
  }

  async startBatchProcessing(batchId, container, batchData) {
    try {
      Toast.info("Starting batch processing...");
      await API.batch.process(batchId);
      await this.pollBatchStatus(batchId, container, batchData);
    } catch (error) {
      console.error("Failed to start batch processing:", error);
      Toast.error("Failed to start batch processing: " + error.message);
    }
  }

  async pollBatchStatus(batchId, container, batchData) {
    let pollCount = 0;
    const maxPolls = 300; // 10 minutes max (300 * 2 seconds)

    const poll = async () => {
      try {
        pollCount++;

        const status = await API.batch.getStatus(batchId);
        this.displayBatchStatus(container, status);

        if (status.status === "processing" && pollCount < maxPolls) {
          // Continue polling every 2 seconds
          setTimeout(poll, 2000);
        } else if (status.status === "completed") {
          Toast.success("Batch processing complete!");
          // Load full results
          await this.loadBatchResults(batchId, container);
        } else if (status.status === "failed") {
          Toast.error("Batch processing failed");
        } else if (pollCount >= maxPolls) {
          Toast.warning("Polling timeout. Please refresh to check status.");
        }
      } catch (error) {
        console.error("Failed to get batch status:", error);
        Toast.error("Failed to get batch status: " + error.message);
      }
    };

    await poll();
  }

  displayBatchStatus(container, status) {
    const statusContainer =
      container.querySelector("#batchStatusContainer") || container;

    const progress = Utils.calculatePercentage(
      status.completed_count,
      status.total_count
    );

    const isProcessing = status.status === "processing";
    const isCompleted = status.status === "completed";
    const isFailed = status.status === "failed";

    // Calculate estimated time remaining
    let estimatedTime = "";
    if (isProcessing && status.completed_count > 0) {
      const avgTimePerContract =
        (status.processing_time || 0) / status.completed_count;
      const remainingContracts = status.total_count - status.completed_count;
      const estimatedSeconds = avgTimePerContract * remainingContracts;
      estimatedTime = Utils.formatDuration(estimatedSeconds);
    }

    let html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📈 Processing Status</h3>
          <span class="badge ${
            isCompleted
              ? "badge-success"
              : isFailed
              ? "badge-critical"
              : "badge-info"
          }">
            ${status.status.toUpperCase()}
          </span>
        </div>
        <div class="card-body">
          <div id="batchProgressBar"></div>
          <div class="batch-progress-info">
            <div class="progress-stats">
              <div class="stat">
                <span class="stat-label">Progress:</span>
                <span class="stat-value">${status.completed_count}/${
      status.total_count
    } contracts</span>
              </div>
              ${
                estimatedTime
                  ? `
                <div class="stat">
                  <span class="stat-label">Est. Time Remaining:</span>
                  <span class="stat-value">${estimatedTime}</span>
                </div>
              `
                  : ""
              }
              ${
                status.processing_time
                  ? `
                <div class="stat">
                  <span class="stat-label">Elapsed Time:</span>
                  <span class="stat-value">${Utils.formatDuration(
                    status.processing_time
                  )}</span>
                </div>
              `
                  : ""
              }
            </div>
          </div>
          
          ${
            status.contracts && status.contracts.length > 0
              ? `
            <div class="contract-status-list">
              <h4 class="list-title">Individual Contract Status</h4>
              ${status.contracts
                .map(
                  (contract) => `
                <div class="contract-status-card ${contract.status}">
                  <div class="contract-status-header">
                    <span class="contract-icon">${this.getContractStatusIcon(
                      contract.status
                    )}</span>
                    <div class="contract-info">
                      <div class="contract-name">${Utils.escapeHtml(
                        contract.file_name
                      )}</div>
                      <div class="contract-meta">
                        <span class="badge ${this.getStatusBadgeClass(
                          contract.status
                        )}">
                          ${contract.status}
                        </span>
                        ${
                          contract.processing_time
                            ? `<span class="processing-time">${contract.processing_time.toFixed(
                                1
                              )}s</span>`
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                  ${
                    contract.error
                      ? `
                    <div class="contract-error">
                      <span class="error-icon">⚠️</span>
                      <span class="error-message">${Utils.escapeHtml(
                        contract.error
                      )}</span>
                    </div>
                  `
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;

    statusContainer.innerHTML = html;

    // Initialize progress bar
    const progressBar = new ProgressBar(
      statusContainer.querySelector("#batchProgressBar")
    );
    progressBar.setProgress(progress);
  }

  getContractStatusIcon(status) {
    const icons = {
      pending: "⏳",
      processing: "🔄",
      completed: "✅",
      failed: "❌",
    };
    return icons[status] || "📄";
  }

  getStatusBadgeClass(status) {
    const classes = {
      pending: "badge-info",
      processing: "badge-warning",
      completed: "badge-success",
      failed: "badge-critical",
    };
    return classes[status] || "badge-info";
  }

  async loadBatchResults(batchId, container) {
    try {
      Toast.info("Loading batch results...");
      const results = await API.batch.getResults(batchId);

      if (results.success) {
        this.displayBatchResults(container, results, batchId);
      } else {
        throw new Error(results.error || "Failed to load results");
      }
    } catch (error) {
      console.error("Failed to load batch results:", error);
      Toast.error("Failed to load batch results: " + error.message);
    }
  }

  displayBatchResults(container, results, batchId) {
    const statusContainer =
      container.querySelector("#batchStatusContainer") || container;

    // Calculate summary statistics
    const totalContracts = results.results.length;
    const successfulContracts = results.results.filter(
      (r) => r.status === "completed"
    ).length;
    const failedContracts = results.results.filter(
      (r) => r.status === "failed"
    ).length;

    // Calculate average processing time
    const completedResults = results.results.filter(
      (r) => r.status === "completed" && r.processing_time
    );
    const avgProcessingTime =
      completedResults.length > 0
        ? completedResults.reduce((sum, r) => sum + r.processing_time, 0) /
          completedResults.length
        : 0;

    // Calculate total deviations
    const totalDeviations = results.results.reduce((sum, r) => {
      return sum + (r.analysis?.deviation_analysis?.total_deviations || 0);
    }, 0);

    let html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">✅ Batch Processing Complete</h3>
          <div class="header-actions">
            <button id="exportBatchBtn" class="btn btn-primary">
              📥 Download All Results (ZIP)
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="batch-summary">
            <h4 class="summary-title">Batch Summary</h4>
            <div class="summary-stats">
              <div class="summary-stat">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-label">Total Contracts</div>
                  <div class="stat-value">${totalContracts}</div>
                </div>
              </div>
              <div class="summary-stat">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                  <div class="stat-label">Successful</div>
                  <div class="stat-value">${successfulContracts}</div>
                </div>
              </div>
              <div class="summary-stat">
                <div class="stat-icon">❌</div>
                <div class="stat-content">
                  <div class="stat-label">Failed</div>
                  <div class="stat-value">${failedContracts}</div>
                </div>
              </div>
              <div class="summary-stat">
                <div class="stat-icon">⏱️</div>
                <div class="stat-content">
                  <div class="stat-label">Avg. Processing Time</div>
                  <div class="stat-value">${avgProcessingTime.toFixed(1)}s</div>
                </div>
              </div>
              <div class="summary-stat">
                <div class="stat-icon">⚠️</div>
                <div class="stat-content">
                  <div class="stat-label">Total Deviations</div>
                  <div class="stat-value">${totalDeviations}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📄 Individual Contract Results</h3>
          <p class="card-subtitle">Click on a contract to view detailed analysis</p>
        </div>
        <div class="card-body">
          <div class="batch-results-list">
            ${results.results
              .map(
                (result, index) => `
              <div class="batch-result-item ${
                result.status
              }" data-index="${index}">
                <div class="result-header">
                  <div class="result-icon">${this.getContractStatusIcon(
                    result.status
                  )}</div>
                  <div class="result-info">
                    <div class="result-name">${Utils.escapeHtml(
                      result.file_name
                    )}</div>
                    <div class="result-meta">
                      <span class="badge ${this.getStatusBadgeClass(
                        result.status
                      )}">
                        ${result.status}
                      </span>
                      ${
                        result.status === "completed"
                          ? `
                        <span class="meta-item">
                          Type: ${Utils.escapeHtml(
                            result.analysis?.result?.contract_type ||
                              "Power Purchase Agreement"
                          )}
                        </span>
                        <span class="meta-item">
                          Deviations: ${
                            result.analysis?.deviation_analysis
                              ?.total_deviations || 0
                          }
                        </span>
                        <span class="meta-item">
                          ${result.processing_time.toFixed(1)}s
                        </span>
                      `
                          : ""
                      }
                      ${
                        result.error
                          ? `
                        <span class="meta-item error-text">
                          Error: ${Utils.escapeHtml(result.error)}
                        </span>
                      `
                          : ""
                      }
                    </div>
                  </div>
                  ${
                    result.status === "completed"
                      ? `
                    <button class="btn btn-sm btn-ghost view-details-btn" data-index="${index}">
                      👁️ View Details
                    </button>
                  `
                      : ""
                  }
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    statusContainer.innerHTML = html;

    // Store results for later use
    this.currentBatchResults = results;
    this.currentBatchId = batchId;

    // Attach event handlers
    document.getElementById("exportBatchBtn")?.addEventListener("click", () => {
      this.exportBatchResults(batchId);
    });

    // Attach view details handlers
    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        this.showContractDetails(results.results[index]);
      });
    });
  }

  showContractDetails(contractResult) {
    if (!contractResult.analysis) {
      Toast.warning("No analysis data available for this contract");
      return;
    }

    // Create a temporary container for the analysis display
    const modalContent = document.createElement("div");
    modalContent.className = "contract-details-modal";

    // Reuse the existing analysis display logic
    this.displayAnalysisResults(modalContent, contractResult.analysis);

    // Create modal
    const modal = new Modal({
      title: `📄 ${contractResult.file_name}`,
      content: modalContent.innerHTML,
      buttons: [
        {
          label: "Close",
          class: "btn-ghost",
          action: "close",
        },
      ],
    });

    modal.show();
  }

  async exportBatchResults(batchId) {
    const exportBtn = document.getElementById("exportBatchBtn");

    try {
      exportBtn.disabled = true;
      exportBtn.innerHTML = "⏳ Generating ZIP...";
      Toast.info("Generating ZIP file with all results...");

      const blob = await API.batch.exportZip(batchId);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `batch_${batchId}_results_${timestamp}.zip`;

      // Download the file
      Utils.downloadFile(blob, filename);

      Toast.success(`Results exported successfully: ${filename}`);
    } catch (error) {
      console.error("Export error:", error);
      Toast.error("Failed to export results: " + error.message);
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = "📥 Download All Results (ZIP)";
    }
  }

  loadObligationsTab(container) {
    container.innerHTML = `
            <!-- File Upload Section -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📁 Upload Contract File</h3>
                    <p class="card-subtitle">Upload a PDF, TXT, or DOCX file to extract obligations</p>
                </div>
                <div class="card-body">
                    <div id="obligationsFileUpload"></div>
                </div>
            </div>

            <!-- Obligation Extraction Section -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">✍️ Or Paste Contract Text</h3>
                    <p class="card-subtitle">Extract obligations from contract text with AI-powered analysis</p>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label" for="obligationsContractText">Contract Text:</label>
                        <div class="textarea-wrapper">
                            <textarea id="obligationsContractText" 
                                      class="form-textarea" 
                                      rows="10"
                                      placeholder="Paste your contract text here to extract obligations...

Example:
POWER PURCHASE AGREEMENT

Payment Terms:
- Buyer shall pay Seller within 30 days of invoice date
- Payment due: April 1, 2025

Delivery Requirements:
- Seller shall deliver equipment by June 1, 2025
- Installation must be completed by July 15, 2025

Reporting:
- Monthly reports due on the 5th of each month
- Annual compliance report due December 31st each year"></textarea>
                            <div class="textarea-footer">
                                <span id="obligationsCharCount" class="char-count">0 characters</span>
                            </div>
                        </div>
                    </div>

                    <button id="extractObligationsBtn" class="btn btn-primary btn-full btn-lg">
                        📅 Extract Obligations
                    </button>
                </div>
            </div>

            <!-- Extraction Results -->
            <div id="extractionResults"></div>

            <!-- Obligations Dashboard -->
            <div id="obligationsDashboard"></div>
        `;

    // Initialize file upload
    const fileUpload = new FileUpload(
      document.getElementById("obligationsFileUpload"),
      {
        multiple: false,
        showProgress: true,
        onFileSelect: async (files) => {
          if (files.length > 0) {
            const file = files[0];
            try {
              LoadingSpinner.show(
                document.getElementById("obligationsFileUpload"),
                "Processing file...",
                "Extracting text from document"
              );

              const result = await API.contracts.upload(file);

              if (result.success) {
                // Populate textarea with extracted text
                document.getElementById("obligationsContractText").value =
                  result.text;
                // Trigger character count update
                document
                  .getElementById("obligationsContractText")
                  .dispatchEvent(new Event("input"));
                const wordCount = result.text
                  ? result.text.split(/\s+/).length
                  : 0;
                Toast.success(`File processed: ${wordCount} words extracted`);
              } else {
                throw new Error(result.error || "File processing failed");
              }
            } catch (error) {
              console.error("File upload error:", error);
              Toast.error(`File upload failed: ${error.message}`);
            } finally {
              LoadingSpinner.hide(
                document.getElementById("obligationsFileUpload")
              );
            }
          }
        },
      }
    );

    // Character count
    const textarea = document.getElementById("obligationsContractText");
    const charCount = document.getElementById("obligationsCharCount");

    textarea.addEventListener("input", () => {
      const length = textarea.value.length;
      charCount.textContent = `${Utils.formatNumber(length)} characters`;
    });

    // Extract button handler
    document
      .getElementById("extractObligationsBtn")
      .addEventListener("click", () => {
        this.extractObligations();
      });

    // Load existing obligations dashboard
    this.loadObligationsDashboard();
  }

  async extractObligations() {
    const contractText = document
      .getElementById("obligationsContractText")
      .value.trim();
    const resultsContainer = document.getElementById("extractionResults");
    const extractBtn = document.getElementById("extractObligationsBtn");

    // Validation
    if (!contractText) {
      Toast.warning("Please enter contract text first");
      return;
    }

    if (contractText.length < 50) {
      Toast.warning("Contract text is too short. Please provide more content.");
      return;
    }

    try {
      // Disable button and show loading state
      extractBtn.disabled = true;
      extractBtn.innerHTML = "⏳ Extracting...";

      LoadingSpinner.show(
        resultsContainer,
        "Extracting obligations from contract...",
        "This may take 30-60 seconds"
      );

      const startTime = Date.now();
      const result = await API.obligations.extract(contractText);
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.success) {
        this.displayExtractionResults(resultsContainer, result);
        Toast.success(
          `Extracted ${result.obligations.length} obligations in ${elapsedTime}s!`
        );
        Utils.scrollToElement(resultsContainer, 100);

        // Reload dashboard to show new obligations
        this.loadObligationsDashboard();
      } else {
        throw new Error(result.error || "Extraction failed");
      }
    } catch (error) {
      console.error("Extraction error:", error);

      resultsContainer.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="alert alert-error">
              <strong>Extraction Failed</strong>
              <p>${Utils.escapeHtml(error.message)}</p>
              <p class="mt-4">
                <button id="retryExtraction" class="btn btn-primary">
                  🔄 Retry Extraction
                </button>
              </p>
            </div>
          </div>
        </div>
      `;

      document
        .getElementById("retryExtraction")
        ?.addEventListener("click", () => {
          this.extractObligations();
        });

      Toast.error("Extraction failed. Please try again.");
    } finally {
      extractBtn.disabled = false;
      extractBtn.innerHTML = "📅 Extract Obligations";
    }
  }

  displayExtractionResults(container, data) {
    if (!data.obligations || data.obligations.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="alert alert-info">
              <strong>No Obligations Found</strong>
              <p>No obligations with deadlines were detected in the provided contract text.</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    let html = '<div class="card">';
    html += `
      <div class="card-header">
        <h3 class="card-title">📊 Extraction Results</h3>
        <span class="badge badge-success">${data.obligations.length} Obligations Found</span>
      </div>
      <div class="card-body">
    `;

    // Metadata
    if (data.metadata) {
      html += `
        <div class="metadata-grid mb-4">
          <div class="metadata-item">
            <span class="metadata-label">Processing Time:</span>
            <span class="metadata-value">${data.metadata.processing_time.toFixed(
              2
            )}s</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Confidence:</span>
            <span class="metadata-value">${(
              data.metadata.confidence_score * 100
            ).toFixed(0)}%</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Contract ID:</span>
            <span class="metadata-value">${Utils.escapeHtml(
              data.contract_id || "N/A"
            )}</span>
          </div>
        </div>
      `;
    }

    // Group obligations by type
    const obligationsByType = {};
    data.obligations.forEach((obligation) => {
      const type = obligation.type || "Other";
      if (!obligationsByType[type]) {
        obligationsByType[type] = [];
      }
      obligationsByType[type].push(obligation);
    });

    // Display obligations grouped by type
    for (const [type, obligations] of Object.entries(obligationsByType)) {
      const typeIcon = this.getObligationTypeIcon(type);
      html += `
        <div class="obligation-type-section">
          <h4 class="obligation-type-title">${typeIcon} ${Utils.escapeHtml(
        type
      )} (${obligations.length})</h4>
          <div class="obligations-list">
      `;

      obligations.forEach((obligation) => {
        const statusClass = this.getObligationStatusClass(obligation);
        const daysUntil = obligation.due_date
          ? this.calculateDaysUntil(obligation.due_date)
          : null;

        html += `
          <div class="obligation-card ${statusClass}">
            <div class="obligation-header">
              <div class="obligation-title">${Utils.escapeHtml(
                obligation.description
              )}</div>
              <span class="badge ${this.getObligationBadgeClass(
                obligation
              )}">${Utils.escapeHtml(obligation.status || "Pending")}</span>
            </div>
            <div class="obligation-details">
              ${
                obligation.due_date
                  ? `
                <div class="obligation-detail">
                  <span class="detail-icon">📅</span>
                  <span class="detail-label">Due Date:</span>
                  <span class="detail-value">${Utils.formatDate(
                    new Date(obligation.due_date)
                  )}</span>
                  ${
                    daysUntil !== null
                      ? `<span class="detail-extra">(${daysUntil})</span>`
                      : ""
                  }
                </div>
              `
                  : ""
              }
              ${
                obligation.party_responsible
                  ? `
                <div class="obligation-detail">
                  <span class="detail-icon">👤</span>
                  <span class="detail-label">Responsible:</span>
                  <span class="detail-value">${Utils.escapeHtml(
                    obligation.party_responsible
                  )}</span>
                </div>
              `
                  : ""
              }
              ${
                obligation.recurrence
                  ? `
                <div class="obligation-detail">
                  <span class="detail-icon">🔄</span>
                  <span class="detail-label">Recurrence:</span>
                  <span class="detail-value">${Utils.escapeHtml(
                    obligation.recurrence
                  )}</span>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    html += `
      </div>
    </div>
    `;

    container.innerHTML = html;
  }

  getObligationTypeIcon(type) {
    const icons = {
      Payment: "💰",
      Delivery: "🚚",
      Renewal: "🔄",
      Termination: "🚫",
      Reporting: "📊",
      Compliance: "✅",
      Other: "📋",
    };
    return icons[type] || "📋";
  }

  getObligationStatusClass(obligation) {
    if (!obligation.due_date) return "";

    const dueDate = new Date(obligation.due_date);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return "obligation-overdue";
    if (daysUntil <= 7) return "obligation-urgent";
    if (daysUntil <= 30) return "obligation-upcoming";
    return "";
  }

  getObligationBadgeClass(obligation) {
    const status = (obligation.status || "Pending").toLowerCase();

    if (status === "completed") return "badge-success";
    if (status === "overdue") return "badge-critical";
    if (status === "in_progress") return "badge-info";
    return "badge-warning";
  }

  calculateDaysUntil(dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} days overdue`;
    } else if (daysUntil === 0) {
      return "Due today";
    } else if (daysUntil === 1) {
      return "Due tomorrow";
    } else {
      return `${daysUntil} days remaining`;
    }
  }

  async loadObligationsDashboard() {
    const dashboardContainer = document.getElementById("obligationsDashboard");
    if (!dashboardContainer) return;

    try {
      LoadingSpinner.show(
        dashboardContainer,
        "Loading obligations dashboard..."
      );

      const result = await API.obligations.getAll();

      if (result.success && result.obligations) {
        this.displayObligationsDashboard(
          dashboardContainer,
          result.obligations
        );
      } else {
        dashboardContainer.innerHTML = "";
      }
    } catch (error) {
      console.error("Failed to load obligations dashboard:", error);
      dashboardContainer.innerHTML = "";
    }
  }

  displayObligationsDashboard(container, obligations) {
    if (!obligations || obligations.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="alert alert-info">
              <strong>No Obligations Yet</strong>
              <p>Extract obligations from a contract to see them here.</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="card obligations-dashboard">
        <div class="card-header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 class="card-title">🗂️ Obligations Dashboard</h3>
              <span class="badge badge-info">${obligations.length} Total</span>
            </div>
            <div class="view-toggle">
              <button id="listViewBtn" class="btn btn-sm btn-secondary active">
                📋 List View
              </button>
              <button id="timelineViewBtn" class="btn btn-sm btn-secondary">
                📅 Timeline View
              </button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <!-- Filters -->
          <div class="obligations-filters">
            <select id="filterType" class="form-select">
              <option value="">All Types</option>
              <option value="Payment">Payment</option>
              <option value="Delivery">Delivery</option>
              <option value="Renewal">Renewal</option>
              <option value="Termination">Termination</option>
              <option value="Reporting">Reporting</option>
              <option value="Compliance">Compliance</option>
              <option value="Other">Other</option>
            </select>

            <select id="filterStatus" class="form-select">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
            </select>

            <input 
              type="text" 
              id="searchObligations" 
              class="form-input" 
              placeholder="🔍 Search obligations..."
            />
          </div>

          <!-- Obligations List -->
          <div id="obligationsListContainer"></div>

          <!-- Timeline View -->
          <div id="obligationsTimelineContainer" style="display: none;"></div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Store obligations for filtering
    this.allObligations = obligations;

    // Display initial list
    this.displayFilteredObligations(obligations);

    // Setup filter handlers
    document.getElementById("filterType").addEventListener("change", () => {
      this.filterObligations();
    });

    document.getElementById("filterStatus").addEventListener("change", () => {
      this.filterObligations();
    });

    document
      .getElementById("searchObligations")
      .addEventListener("input", () => {
        this.filterObligations();
      });

    // Setup view toggle handlers
    this.currentObligationsView = "list";

    document.getElementById("listViewBtn").addEventListener("click", () => {
      this.switchObligationsView("list");
    });

    document.getElementById("timelineViewBtn").addEventListener("click", () => {
      this.switchObligationsView("timeline");
    });
  }

  switchObligationsView(view) {
    this.currentObligationsView = view;

    const listContainer = document.getElementById("obligationsListContainer");
    const timelineContainer = document.getElementById(
      "obligationsTimelineContainer"
    );
    const listBtn = document.getElementById("listViewBtn");
    const timelineBtn = document.getElementById("timelineViewBtn");

    if (view === "list") {
      listContainer.style.display = "block";
      timelineContainer.style.display = "none";
      listBtn.classList.add("active");
      timelineBtn.classList.remove("active");
      this.filterObligations();
    } else {
      listContainer.style.display = "none";
      timelineContainer.style.display = "block";
      listBtn.classList.remove("active");
      timelineBtn.classList.add("active");
      this.displayTimelineView();
    }
  }

  async displayTimelineView() {
    const timelineContainer = document.getElementById(
      "obligationsTimelineContainer"
    );

    try {
      LoadingSpinner.show(timelineContainer, "Loading timeline...");

      // Use the filtered obligations or all obligations
      const obligations = this.allObligations.filter((o) => o.due_date);

      if (obligations.length === 0) {
        timelineContainer.innerHTML = `
          <div class="alert alert-info mt-4">
            <strong>No Timeline Data</strong>
            <p>No obligations with due dates found.</p>
          </div>
        `;
        return;
      }

      // Sort by due date
      const sorted = [...obligations].sort((a, b) => {
        return new Date(a.due_date) - new Date(b.due_date);
      });

      let html = '<div class="timeline-container">';
      html += '<div class="timeline-line"></div>';

      sorted.forEach((obligation) => {
        const dueDate = new Date(obligation.due_date);
        const today = new Date();
        const isOverdue = dueDate < today;
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const isUpcoming = daysUntil >= 0 && daysUntil <= 30;

        const markerClass = isOverdue
          ? "overdue"
          : isUpcoming
          ? "upcoming"
          : "";
        const typeIcon = this.getObligationTypeIcon(obligation.type || "Other");

        html += `
          <div class="timeline-item">
            <div class="timeline-marker ${markerClass}"></div>
            <div class="timeline-date">${Utils.formatDate(dueDate)}</div>
            <div class="timeline-content">
              <div class="obligation-header">
                <div class="obligation-title">
                  ${typeIcon} ${Utils.escapeHtml(obligation.description)}
                </div>
                <span class="badge ${this.getObligationBadgeClass(obligation)}">
                  ${Utils.escapeHtml(obligation.status || "Pending")}
                </span>
              </div>
              <div class="obligation-details">
                ${
                  obligation.party_responsible
                    ? `
                  <div class="obligation-detail">
                    <span class="detail-icon">👤</span>
                    <span class="detail-label">Responsible:</span>
                    <span class="detail-value">${Utils.escapeHtml(
                      obligation.party_responsible
                    )}</span>
                  </div>
                `
                    : ""
                }
                ${
                  obligation.type
                    ? `
                  <div class="obligation-detail">
                    <span class="detail-icon">🏷️</span>
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${Utils.escapeHtml(
                      obligation.type
                    )}</span>
                  </div>
                `
                    : ""
                }
                <div class="obligation-detail">
                  <span class="detail-icon">⏰</span>
                  <span class="detail-label">Status:</span>
                  <span class="detail-value ${
                    isOverdue ? "text-error" : ""
                  }">${this.calculateDaysUntil(obligation.due_date)}</span>
                </div>
              </div>
              ${
                obligation.id
                  ? `
                <div class="obligation-actions">
                  <button class="btn btn-sm btn-secondary edit-obligation-btn" data-id="${obligation.id}">
                    ✏️ Edit Status
                  </button>
                  <button class="btn btn-sm btn-success complete-obligation-btn" data-id="${obligation.id}">
                    ✅ Mark Complete
                  </button>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `;
      });

      html += "</div>";
      timelineContainer.innerHTML = html;

      // Attach event handlers
      this.attachObligationActionHandlers();
    } catch (error) {
      console.error("Failed to display timeline:", error);
      timelineContainer.innerHTML = `
        <div class="alert alert-error mt-4">
          <strong>Timeline Error</strong>
          <p>${Utils.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  filterObligations() {
    const typeFilter = document.getElementById("filterType").value;
    const statusFilter = document.getElementById("filterStatus").value;
    const searchQuery = document
      .getElementById("searchObligations")
      .value.toLowerCase();

    let filtered = this.allObligations;

    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter((o) => o.type === typeFilter);
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((o) => {
        const status = o.status || "Pending";
        return status === statusFilter;
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((o) => {
        const description = (o.description || "").toLowerCase();
        const party = (o.party_responsible || "").toLowerCase();
        return description.includes(searchQuery) || party.includes(searchQuery);
      });
    }

    this.displayFilteredObligations(filtered);
  }

  displayFilteredObligations(obligations) {
    const listContainer = document.getElementById("obligationsListContainer");

    if (obligations.length === 0) {
      listContainer.innerHTML = `
        <div class="alert alert-info mt-4">
          <strong>No Matching Obligations</strong>
          <p>Try adjusting your filters or search query.</p>
        </div>
      `;
      return;
    }

    // Sort by due date (overdue first, then by date)
    const sorted = [...obligations].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;

      const dateA = new Date(a.due_date);
      const dateB = new Date(b.due_date);
      const today = new Date();

      const overdueA = dateA < today;
      const overdueB = dateB < today;

      if (overdueA && !overdueB) return -1;
      if (!overdueA && overdueB) return 1;

      return dateA - dateB;
    });

    // Group by status for better organization
    const overdue = sorted.filter((o) => {
      if (!o.due_date) return false;
      return new Date(o.due_date) < new Date();
    });

    const upcoming = sorted.filter((o) => {
      if (!o.due_date) return false;
      const dueDate = new Date(o.due_date);
      const today = new Date();
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 30;
    });

    const future = sorted.filter((o) => {
      if (!o.due_date) return false;
      const dueDate = new Date(o.due_date);
      const today = new Date();
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 30;
    });

    let html = '<div class="obligations-list mt-4">';

    // Display overdue obligations
    if (overdue.length > 0) {
      html += `
        <div class="obligation-type-section">
          <h4 class="obligation-type-title">⚠️ Overdue (${overdue.length})</h4>
          <div class="obligations-list">
      `;
      overdue.forEach((obligation) => {
        html += this.renderObligationCard(obligation);
      });
      html += "</div></div>";
    }

    // Display upcoming obligations
    if (upcoming.length > 0) {
      html += `
        <div class="obligation-type-section">
          <h4 class="obligation-type-title">📅 Upcoming (Next 30 Days) (${upcoming.length})</h4>
          <div class="obligations-list">
      `;
      upcoming.forEach((obligation) => {
        html += this.renderObligationCard(obligation);
      });
      html += "</div></div>";
    }

    // Display future obligations
    if (future.length > 0) {
      html += `
        <div class="obligation-type-section">
          <h4 class="obligation-type-title">📆 Future (${future.length})</h4>
          <div class="obligations-list">
      `;
      future.forEach((obligation) => {
        html += this.renderObligationCard(obligation);
      });
      html += "</div></div>";
    }

    html += "</div>";
    listContainer.innerHTML = html;

    // Attach event handlers for edit/complete buttons
    this.attachObligationActionHandlers();
  }

  renderObligationCard(obligation) {
    const statusClass = this.getObligationStatusClass(obligation);
    const daysUntil = obligation.due_date
      ? this.calculateDaysUntil(obligation.due_date)
      : null;
    const typeIcon = this.getObligationTypeIcon(obligation.type || "Other");

    return `
      <div class="obligation-card ${statusClass}" data-obligation-id="${
      obligation.id || ""
    }">
        <div class="obligation-header">
          <div class="obligation-title">
            ${typeIcon} ${Utils.escapeHtml(obligation.description)}
          </div>
          <span class="badge ${this.getObligationBadgeClass(obligation)}">
            ${Utils.escapeHtml(obligation.status || "Pending")}
          </span>
        </div>
        <div class="obligation-details">
          ${
            obligation.due_date
              ? `
            <div class="obligation-detail">
              <span class="detail-icon">📅</span>
              <span class="detail-label">Due Date:</span>
              <span class="detail-value">${Utils.formatDate(
                new Date(obligation.due_date)
              )}</span>
              ${
                daysUntil !== null
                  ? `<span class="detail-extra">(${daysUntil})</span>`
                  : ""
              }
            </div>
          `
              : ""
          }
          ${
            obligation.party_responsible
              ? `
            <div class="obligation-detail">
              <span class="detail-icon">👤</span>
              <span class="detail-label">Responsible:</span>
              <span class="detail-value">${Utils.escapeHtml(
                obligation.party_responsible
              )}</span>
            </div>
          `
              : ""
          }
          ${
            obligation.type
              ? `
            <div class="obligation-detail">
              <span class="detail-icon">🏷️</span>
              <span class="detail-label">Type:</span>
              <span class="detail-value">${Utils.escapeHtml(
                obligation.type
              )}</span>
            </div>
          `
              : ""
          }
          ${
            obligation.recurrence
              ? `
            <div class="obligation-detail">
              <span class="detail-icon">🔄</span>
              <span class="detail-label">Recurrence:</span>
              <span class="detail-value">${Utils.escapeHtml(
                obligation.recurrence
              )}</span>
            </div>
          `
              : ""
          }
        </div>
        ${
          obligation.id
            ? `
          <div class="obligation-actions">
            <button class="btn btn-sm btn-secondary edit-obligation-btn" data-id="${obligation.id}">
              ✏️ Edit Status
            </button>
            <button class="btn btn-sm btn-success complete-obligation-btn" data-id="${obligation.id}">
              ✅ Mark Complete
            </button>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  attachObligationActionHandlers() {
    // Edit status buttons
    document.querySelectorAll(".edit-obligation-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const obligationId = e.target.dataset.id;
        this.showEditObligationModal(obligationId);
      });
    });

    // Complete buttons
    document.querySelectorAll(".complete-obligation-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const obligationId = e.target.dataset.id;
        await this.updateObligationStatus(obligationId, "Completed");
      });
    });
  }

  showEditObligationModal(obligationId) {
    const obligation = this.allObligations.find((o) => o.id === obligationId);
    if (!obligation) return;

    const modalContent = `
      <div class="form-group">
        <label class="form-label" for="editStatus">Status:</label>
        <select id="editStatus" class="form-select">
          <option value="Pending" ${
            obligation.status === "Pending" ? "selected" : ""
          }>Pending</option>
          <option value="In Progress" ${
            obligation.status === "In Progress" ? "selected" : ""
          }>In Progress</option>
          <option value="Completed" ${
            obligation.status === "Completed" ? "selected" : ""
          }>Completed</option>
          <option value="Overdue" ${
            obligation.status === "Overdue" ? "selected" : ""
          }>Overdue</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="editNotes">Notes (optional):</label>
        <textarea id="editNotes" class="form-textarea" rows="3" placeholder="Add any notes about this status update..."></textarea>
      </div>
    `;

    const modal = new Modal({
      title: `✏️ Edit Obligation Status`,
      content: modalContent,
      buttons: [
        {
          label: "Cancel",
          class: "btn-ghost",
          action: "close",
        },
        {
          label: "Save",
          class: "btn-primary",
          action: async () => {
            const status = document.getElementById("editStatus").value;
            const notes = document.getElementById("editNotes").value;
            await this.updateObligationStatus(obligationId, status, notes);
            modal.close();
          },
        },
      ],
    });

    modal.show();
  }

  async updateObligationStatus(obligationId, status, notes = "") {
    try {
      Toast.info("Updating obligation status...");

      const result = await API.obligations.updateStatus(
        obligationId,
        status,
        notes
      );

      if (result.success) {
        Toast.success("Obligation status updated successfully!");

        // Update local data
        const obligation = this.allObligations.find(
          (o) => o.id === obligationId
        );
        if (obligation) {
          obligation.status = status;
        }

        // Refresh display
        this.filterObligations();
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (error) {
      console.error("Failed to update obligation:", error);
      Toast.error("Failed to update obligation: " + error.message);
    }
  }

  loadCompareTab(container) {
    container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">🔄 Contract Comparison</h3>
                    <p class="card-subtitle">Compare two contracts side-by-side to identify key differences</p>
                </div>
                <div class="card-body">
                    <div class="compare-container">
                        <!-- Contract A -->
                        <div class="compare-column">
                            <div class="compare-column-header">
                                <h4 class="compare-column-title">📄 Contract A</h4>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Upload File</label>
                                <div id="compareFileUploadA"></div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Or Paste Text</label>
                                <div class="textarea-wrapper">
                                    <textarea id="compareContractA" 
                                              class="form-textarea" 
                                              maxlength="100000"
                                              placeholder="Paste Contract A text here..."></textarea>
                                    <div class="textarea-footer">
                                        <span id="charCountA" class="char-count">0 / 100,000</span>
                                        <button id="clearTextBtnA" class="btn btn-sm btn-ghost" style="display: none;">
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Contract B -->
                        <div class="compare-column">
                            <div class="compare-column-header">
                                <h4 class="compare-column-title">📄 Contract B</h4>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Upload File</label>
                                <div id="compareFileUploadB"></div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Or Paste Text</label>
                                <div class="textarea-wrapper">
                                    <textarea id="compareContractB" 
                                              class="form-textarea" 
                                              maxlength="100000"
                                              placeholder="Paste Contract B text here..."></textarea>
                                    <div class="textarea-footer">
                                        <span id="charCountB" class="char-count">0 / 100,000</span>
                                        <button id="clearTextBtnB" class="btn btn-sm btn-ghost" style="display: none;">
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group mt-4">
                        <label class="form-label" for="compareJurisdiction">Jurisdiction:</label>
                        <select id="compareJurisdiction" class="form-select">
                            <option value="US">United States</option>
                            <option value="California">California</option>
                            <option value="New York">New York</option>
                            <option value="Texas">Texas</option>
                            <option value="UK">United Kingdom</option>
                        </select>
                    </div>

                    <button id="compareBtn" class="btn btn-primary btn-full btn-lg">
                        🔄 Compare Contracts
                    </button>
                </div>
            </div>

            <div id="compareResults"></div>
        `;

    // Initialize file upload for Contract A
    const fileUploadA = new FileUpload(
      document.getElementById("compareFileUploadA"),
      {
        multiple: false,
        showProgress: true,
        onFileSelect: async (files) => {
          if (files.length > 0) {
            await this.handleCompareFileUpload(files[0], "A", fileUploadA);
          }
        },
      }
    );

    // Initialize file upload for Contract B
    const fileUploadB = new FileUpload(
      document.getElementById("compareFileUploadB"),
      {
        multiple: false,
        showProgress: true,
        onFileSelect: async (files) => {
          if (files.length > 0) {
            await this.handleCompareFileUpload(files[0], "B", fileUploadB);
          }
        },
      }
    );

    // Character count and validation for Contract A
    const textareaA = document.getElementById("compareContractA");
    const charCountA = document.getElementById("charCountA");
    const clearBtnA = document.getElementById("clearTextBtnA");

    textareaA.addEventListener("input", () => {
      const length = textareaA.value.length;
      charCountA.textContent = `${Utils.formatNumber(length)} / 100,000`;
      clearBtnA.style.display = length > 0 ? "inline-flex" : "none";

      if (length > 100000) {
        textareaA.classList.add("error");
        charCountA.classList.add("text-error");
      } else {
        textareaA.classList.remove("error");
        charCountA.classList.remove("text-error");
      }
    });

    clearBtnA.addEventListener("click", () => {
      textareaA.value = "";
      textareaA.dispatchEvent(new Event("input"));
      Toast.info("Contract A text cleared");
    });

    // Character count and validation for Contract B
    const textareaB = document.getElementById("compareContractB");
    const charCountB = document.getElementById("charCountB");
    const clearBtnB = document.getElementById("clearTextBtnB");

    textareaB.addEventListener("input", () => {
      const length = textareaB.value.length;
      charCountB.textContent = `${Utils.formatNumber(length)} / 100,000`;
      clearBtnB.style.display = length > 0 ? "inline-flex" : "none";

      if (length > 100000) {
        textareaB.classList.add("error");
        charCountB.classList.add("text-error");
      } else {
        textareaB.classList.remove("error");
        charCountB.classList.remove("text-error");
      }
    });

    clearBtnB.addEventListener("click", () => {
      textareaB.value = "";
      textareaB.dispatchEvent(new Event("input"));
      Toast.info("Contract B text cleared");
    });

    // Compare button handler
    document.getElementById("compareBtn").addEventListener("click", () => {
      this.compareContracts();
    });
  }

  async handleCompareFileUpload(file, contractLabel, fileUploadComponent) {
    try {
      Toast.info(`Uploading Contract ${contractLabel}...`);

      if (fileUploadComponent) {
        fileUploadComponent.setUploadProgress(0, 30);
      }

      const result = await API.contracts.upload(file);

      if (fileUploadComponent) {
        fileUploadComponent.setUploadProgress(0, 100);
      }

      if (result.success) {
        const textareaId = `compareContract${contractLabel}`;
        document.getElementById(textareaId).value = result.text;

        // Trigger input event to update character count
        document.getElementById(textareaId).dispatchEvent(new Event("input"));

        Toast.success(`Contract ${contractLabel} uploaded: ${result.filename}`);

        if (result.text && typeof result.text === "string") {
          const wordCount = result.text.split(/\s+/).length;
          Toast.info(`Extracted ${wordCount} words from ${result.filename}`);
        }
      }
    } catch (error) {
      Toast.error(`Contract ${contractLabel} upload failed: ${error.message}`);
      if (fileUploadComponent) {
        fileUploadComponent.clear();
      }
    }
  }

  async compareContracts() {
    const contractA = document.getElementById("compareContractA").value.trim();
    const contractB = document.getElementById("compareContractB").value.trim();
    const jurisdiction = document.getElementById("compareJurisdiction").value;
    const resultsContainer = document.getElementById("compareResults");
    const compareBtn = document.getElementById("compareBtn");

    // Validation
    if (!contractA || !contractB) {
      Toast.warning("Please provide both contracts to compare");
      return;
    }

    if (contractA.length < 50 || contractB.length < 50) {
      Toast.warning("Both contracts must have at least 50 characters");
      return;
    }

    if (contractA.length > 100000 || contractB.length > 100000) {
      Toast.error("Contract text exceeds maximum length of 100,000 characters");
      return;
    }

    try {
      // Disable button and show loading state
      compareBtn.disabled = true;
      compareBtn.innerHTML = "⏳ Comparing...";

      LoadingSpinner.show(
        resultsContainer,
        "Comparing contracts with AgentCore...",
        "This may take 60-120 seconds for detailed comparison"
      );

      const startTime = Date.now();
      const result = await API.contracts.compare(
        contractA,
        contractB,
        jurisdiction,
        "agentcore"
      );
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.success) {
        this.displayComparisonResults(
          resultsContainer,
          result,
          contractA,
          contractB
        );
        Toast.success(`Comparison complete in ${elapsedTime}s!`);
        Utils.scrollToElement(resultsContainer, 100);
      } else {
        throw new Error(result.error || "Comparison failed");
      }
    } catch (error) {
      console.error("Comparison error:", error);

      // Display user-friendly error message
      resultsContainer.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="alert alert-error">
              <strong>Comparison Failed</strong>
              <p>${Utils.escapeHtml(error.message)}</p>
              <p class="mt-4">
                <button id="retryComparison" class="btn btn-primary">
                  🔄 Retry Comparison
                </button>
              </p>
            </div>
          </div>
        </div>
      `;

      // Add retry handler
      document
        .getElementById("retryComparison")
        ?.addEventListener("click", () => {
          this.compareContracts();
        });

      Toast.error("Comparison failed. Please try again.");
    } finally {
      compareBtn.disabled = false;
      compareBtn.innerHTML = "🔄 Compare Contracts";
    }
  }

  displayComparisonResults(container, data, contractA, contractB) {
    console.log("🔍 displayComparisonResults called with data:", data);
    console.log("📊 Data structure check:", {
      hasSuccess: !!data.success,
      hasSummary: !!data.summary,
      hasComparison: !!data.comparison,
      hasAgent: !!data.agent,
      hasFavorabilityScores: !!data.favorability_scores,
      hasSideBySide: !!data.side_by_side,
      hasKeyDifferences: !!data.key_differences,
      hasRecommendations: !!data.recommendations,
    });

    // Check if this is a Bedrock response (simple text format)
    if (data.agent === "bedrock" && data.comparison) {
      this.displayBedrockComparisonResults(container, data);
      return;
    }

    let html = '<div class="results-container">';

    const processingTime = data.execution_time || 0;
    const scoreA = data.favorability_scores?.contract_a || 0;
    const scoreB = data.favorability_scores?.contract_b || 0;
    const winnerA = scoreA > scoreB;
    const winnerB = scoreB > scoreA;
    const scoreDiff = Math.abs(scoreA - scoreB).toFixed(1);

    console.log("📈 Scores:", { scoreA, scoreB, winnerA, winnerB, scoreDiff });

    // Favorability Scores
    html += `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏆 Overall Favorability Assessment</h3>
        </div>
        <div class="card-body">
          <div class="favorability-comparison">
            <div class="favorability-item ${winnerA ? "winner" : ""}">
              <div class="favorability-header">
                <h4>📄 Contract A</h4>
                ${
                  winnerA
                    ? '<span class="winner-badge">✅ More Favorable</span>'
                    : ""
                }
              </div>
              <div class="favorability-score-large">${scoreA.toFixed(
                1
              )}<span class="score-suffix">/100</span></div>
            </div>
            <div class="favorability-divider">
              <div class="vs-badge">VS</div>
              <div class="score-difference">${scoreDiff} point${
      scoreDiff != 1 ? "s" : ""
    } difference</div>
            </div>
            <div class="favorability-item ${winnerB ? "winner" : ""}">
              <div class="favorability-header">
                <h4>📄 Contract B</h4>
                ${
                  winnerB
                    ? '<span class="winner-badge">✅ More Favorable</span>'
                    : ""
                }
              </div>
              <div class="favorability-score-large">${scoreB.toFixed(
                1
              )}<span class="score-suffix">/100</span></div>
            </div>
          </div>

        </div>
      </div>
    `;

    // Side-by-Side Analysis from side_by_side data
    if (data.side_by_side) {
      const partiesA = data.side_by_side["Parties Detail"]?.contract1 || [];
      const partiesB = data.side_by_side["Parties Detail"]?.contract2 || [];
      const risksA = data.side_by_side["Risks Detail"]?.contract1 || [];
      const risksB = data.side_by_side["Risks Detail"]?.contract2 || [];

      html += `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📋 Side-by-Side Comparison</h3>
          </div>
          <div class="card-body">
            <div class="side-by-side-analysis">
              <div class="analysis-column">
                <div class="analysis-column-header">
                  <h4>📄 Contract A</h4>
                  <span class="score-badge ${
                    winnerA ? "winner" : ""
                  }">${scoreA.toFixed(1)}/100</span>
                </div>
                <div class="analysis-content">
                  ${
                    partiesA.length > 0 && partiesA[0] !== "Not specified"
                      ? `
                    <div class="comparison-section">
                      <h5 class="section-title">Parties</h5>
                      <ul class="clean-list">
                        ${partiesA
                          .map(
                            (p) =>
                              `<li class="list-item">${Utils.escapeHtml(
                                p
                              )}</li>`
                          )
                          .join("")}
                      </ul>
                    </div>
                  `
                      : ""
                  }
                  ${
                    risksA.length > 0 && risksA[0] !== "No risks identified"
                      ? `
                    <div class="comparison-section">
                      <h5 class="section-title">Key Risks <span class="risk-count">(${
                        risksA.length
                      })</span></h5>
                      <ul class="clean-list">
                        ${risksA
                          .map(
                            (r) =>
                              `<li class="list-item">${Utils.escapeHtml(
                                r
                              )}</li>`
                          )
                          .join("")}
                      </ul>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
              <div class="analysis-column">
                <div class="analysis-column-header">
                  <h4>📄 Contract B</h4>
                  <span class="score-badge ${
                    winnerB ? "winner" : ""
                  }">${scoreB.toFixed(1)}/100</span>
                </div>
                <div class="analysis-content">
                  ${
                    partiesB.length > 0 && partiesB[0] !== "Not specified"
                      ? `
                    <div class="comparison-section">
                      <h5 class="section-title">Parties</h5>
                      <ul class="clean-list">
                        ${partiesB
                          .map(
                            (p) =>
                              `<li class="list-item">${Utils.escapeHtml(
                                p
                              )}</li>`
                          )
                          .join("")}
                      </ul>
                    </div>
                  `
                      : ""
                  }
                  ${
                    risksB.length > 0 && risksB[0] !== "No risks identified"
                      ? `
                    <div class="comparison-section">
                      <h5 class="section-title">Key Risks <span class="risk-count">(${
                        risksB.length
                      })</span></h5>
                      <ul class="clean-list">
                        ${risksB
                          .map(
                            (r) =>
                              `<li class="list-item">${Utils.escapeHtml(
                                r
                              )}</li>`
                          )
                          .join("")}
                      </ul>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Key Differences
    if (data.key_differences && data.key_differences.length > 0) {
      html += `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🔍 Key Differences</h3>
          </div>
          <div class="card-body">
            <ul class="differences-list">
              ${data.key_differences
                .map((diff) => `<li>${Utils.escapeHtml(diff)}</li>`)
                .join("")}
            </ul>
          </div>
        </div>
      `;
    }

    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      html += `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">💡 Recommendations</h3>
          </div>
          <div class="card-body">
            <ul class="recommendations-list">
              ${data.recommendations
                .map((rec) => `<li>${Utils.escapeHtml(rec)}</li>`)
                .join("")}
            </ul>
          </div>
        </div>
      `;
    }

    // Export Button
    html += `
      <div class="card">
        <div class="card-body text-center">
          <button id="exportComparisonBtn" class="btn btn-primary btn-lg">
            📥 Export Comparison Report
          </button>
        </div>
      </div>
    `;

    html += "</div>";

    console.log("📝 Generated HTML length:", html.length);
    console.log("📝 HTML preview (first 500 chars):", html.substring(0, 500));

    container.innerHTML = html;

    console.log("✅ HTML inserted into container");

    // Store comparison data for export
    this.currentComparison = {
      contractA: contractA,
      contractB: contractB,
      comparisonResult: data,
      jurisdiction: data.jurisdiction || "US",
    };

    // Attach export handler
    document
      .getElementById("exportComparisonBtn")
      ?.addEventListener("click", () => {
        this.exportComparisonReport();
      });
  }

  displayBedrockComparisonResults(container, data) {
    console.log("🤖 Displaying Bedrock comparison results");

    const comparisonText = data.comparison || "";
    const agentId = data.agent_id || "Unknown";

    let html = `
      <div class="results-container">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🤖 AWS Bedrock Agent Comparison</h3>
            <p class="card-subtitle">Agent ID: ${Utils.escapeHtml(agentId)}</p>
          </div>
          <div class="card-body">
            <div class="comparison-text-content">
              ${this.formatBedrockText(comparisonText)}
            </div>
          </div>
        </div>
        
        <div class="card-actions">
          <button id="copyComparisonBtn" class="btn btn-secondary">
            📋 Copy to Clipboard
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach copy handler
    document
      .getElementById("copyComparisonBtn")
      ?.addEventListener("click", () => {
        navigator.clipboard
          .writeText(comparisonText)
          .then(() => {
            Toast.success("Comparison copied to clipboard!");
          })
          .catch((err) => {
            Toast.error("Failed to copy to clipboard");
          });
      });

    // Store for export
    this.currentComparison = {
      comparisonText: comparisonText,
      agent: "bedrock",
      agent_id: agentId,
    };
  }

  formatBedrockText(text) {
    // Convert plain text to formatted HTML
    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\n+/);

    let html = "";
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Check if it's a numbered list item or bullet point
      if (/^\d+\./.test(trimmed) || /^[-•*]/.test(trimmed)) {
        html += `<p class="list-item">${Utils.escapeHtml(trimmed)}</p>`;
      }
      // Check if it looks like a heading (all caps or ends with colon)
      else if (trimmed === trimmed.toUpperCase() || trimmed.endsWith(":")) {
        html += `<h4 class="section-heading">${Utils.escapeHtml(trimmed)}</h4>`;
      }
      // Regular paragraph
      else {
        html += `<p>${Utils.escapeHtml(trimmed)}</p>`;
      }
    }

    return html || `<p>${Utils.escapeHtml(text)}</p>`;
  }

  async exportComparisonReport() {
    if (!this.currentComparison) {
      Toast.error("No comparison data available to export");
      return;
    }

    const exportBtn = document.getElementById("exportComparisonBtn");

    try {
      exportBtn.disabled = true;
      exportBtn.innerHTML = "⏳ Generating Report...";
      Toast.info("Generating comparison report...");

      // Create a formatted report
      const report = this.formatComparisonReport(this.currentComparison);

      // Create a blob and download
      const blob = new Blob([report], { type: "text/plain" });
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `contract_comparison_${timestamp}.txt`;

      Utils.downloadFile(blob, filename);

      Toast.success(`Comparison report exported: ${filename}`);
    } catch (error) {
      console.error("Export error:", error);
      Toast.error("Failed to export comparison report: " + error.message);
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = "📥 Export Comparison Report";
    }
  }

  formatComparisonReport(comparison) {
    let report = "CONTRACT COMPARISON REPORT\n";
    report += "=".repeat(80) + "\n\n";
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Jurisdiction: ${comparison.jurisdiction || "US"}\n\n`;

    // Overall Favorability
    if (comparison.comparisonResult.overall_favorability) {
      const fav = comparison.comparisonResult.overall_favorability;
      report += "OVERALL FAVORABILITY\n";
      report += "-".repeat(80) + "\n";
      report += `Contract A Score: ${fav.contract_a_score || 0}%\n`;
      report += `Contract B Score: ${fav.contract_b_score || 0}%\n`;
      if (fav.summary) {
        report += `\nSummary:\n${fav.summary}\n`;
      }
      report += "\n";
    }

    // Key Differences
    if (
      comparison.comparisonResult.key_differences &&
      comparison.comparisonResult.key_differences.length > 0
    ) {
      report += "KEY DIFFERENCES\n";
      report += "-".repeat(80) + "\n\n";

      // Group by category
      const categories = {};
      comparison.comparisonResult.key_differences.forEach((diff) => {
        const category = diff.category || "Other";
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(diff);
      });

      for (const [category, differences] of Object.entries(categories)) {
        report += `${category.toUpperCase()}\n`;
        report += "~".repeat(80) + "\n";

        differences.forEach((diff, index) => {
          report += `\n${index + 1}. ${diff.aspect || "Difference"}\n`;
          if (diff.description) {
            report += `   ${diff.description}\n`;
          }
          report += `   Favorability: ${diff.favorability || "neutral"}\n`;
          report += `\n   Contract A: ${
            diff.contract_a_text || "Not specified"
          }\n`;
          report += `   Contract B: ${
            diff.contract_b_text || "Not specified"
          }\n`;
        });

        report += "\n";
      }
    }

    // Recommendations
    if (comparison.comparisonResult.recommendations) {
      report += "RECOMMENDATIONS\n";
      report += "-".repeat(80) + "\n";
      report += comparison.comparisonResult.recommendations + "\n\n";
    }

    report += "=".repeat(80) + "\n";
    report += "End of Report\n";

    return report;
  }

  loadGenerateTab(container) {
    container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📋 Power Purchase Agreement Templates</h3>
                    <p class="card-subtitle">Select a PPA template to generate a new contract</p>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label" for="generateTemplateSelect">PPA Template:</label>
                        <select id="generateTemplateSelect" class="form-select">
                            <option value="">-- Select a template --</option>
                            <option value="solar-ppa">Solar Power Purchase Agreement</option>
                            <option value="wind-ppa">Wind Power Purchase Agreement</option>
                            <option value="battery-storage-ppa">Battery Storage PPA</option>
                            <option value="community-solar-ppa">Community Solar PPA</option>
                            <option value="virtual-ppa">Virtual Power Purchase Agreement</option>
                            <option value="hybrid-ppa">Hybrid Renewable Energy PPA</option>
                            <option value="corporate-ppa">Corporate Power Purchase Agreement</option>
                            <option value="utility-scale-ppa">Utility-Scale Solar PPA</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="generateCapacity">Capacity (MW):</label>
                            <input type="number" id="generateCapacity" class="form-input" placeholder="e.g., 50" min="1" max="1000">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="generateTerm">Contract Term (Years):</label>
                            <input type="number" id="generateTerm" class="form-input" placeholder="e.g., 20" min="1" max="30">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="generateJurisdiction">Jurisdiction:</label>
                        <select id="generateJurisdiction" class="form-select">
                            <option value="US">United States</option>
                            <option value="California">California</option>
                            <option value="New York">New York</option>
                            <option value="Texas">Texas</option>
                            <option value="UK">United Kingdom</option>
                        </select>
                    </div>

                    <button id="generateBtn" class="btn btn-primary btn-full btn-lg" disabled>
                        ⚡ Generate Contract
                    </button>
                    
                    <div class="construction-notice">
                        <div class="construction-icon">🚧</div>
                        <div class="construction-content">
                            <h4>Feature Under Construction</h4>
                            <p>Contract generation functionality is currently being developed. This feature will allow you to generate customized PPA contracts based on your selected template and parameters.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Add event listener to enable button when template is selected
    const templateSelect = document.getElementById("generateTemplateSelect");
    const generateBtn = document.getElementById("generateBtn");

    templateSelect.addEventListener("change", () => {
      generateBtn.disabled = !templateSelect.value;
    });

    generateBtn.addEventListener("click", () => {
      Toast.info("Contract generation feature coming soon!");
    });
  }

  async initializeTemplateSelection() {
    try {
      // Load templates
      const response = await API.templates.getAll();

      if (response.success) {
        this.availableTemplates = response.templates || [];
        this.populateTemplateDropdown(this.availableTemplates);

        // Setup event listeners
        this.setupTemplateSelectionListeners();
      } else {
        Toast.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      Toast.error("Failed to load templates: " + error.message);
    }
  }

  populateTemplateDropdown(templates) {
    const select = document.getElementById("generateTemplateSelect");

    // Clear existing options except the first one
    select.innerHTML = '<option value="">-- Select a template --</option>';

    templates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.template_id;
      option.textContent = template.name;
      option.dataset.contractType = template.contract_type;
      select.appendChild(option);
    });
  }

  setupTemplateSelectionListeners() {
    const templateSelect = document.getElementById("generateTemplateSelect");
    const industryFilter = document.getElementById("generateIndustryFilter");
    const jurisdictionFilter = document.getElementById(
      "generateJurisdictionFilter"
    );

    // Template selection handler
    templateSelect.addEventListener("change", (e) => {
      const templateId = e.target.value;
      if (templateId) {
        this.selectTemplate(templateId);
      } else {
        this.clearTemplateSelection();
      }
    });

    // Filter handlers (for future enhancement)
    industryFilter.addEventListener("change", () => {
      this.applyTemplateFilters();
    });

    jurisdictionFilter.addEventListener("change", () => {
      this.applyTemplateFilters();
    });
  }

  async selectTemplate(templateId) {
    try {
      const template = this.availableTemplates.find(
        (t) => t.template_id === templateId
      );

      if (!template) {
        Toast.error("Template not found");
        return;
      }

      this.selectedTemplate = template;

      // Display template preview
      this.displayTemplatePreview(template);

      // Load template parameters section
      await this.loadParametersSection(template);

      Toast.success(`Template selected: ${template.name}`);
    } catch (error) {
      console.error("Failed to select template:", error);
      Toast.error("Failed to select template: " + error.message);
    }
  }

  displayTemplatePreview(template) {
    const previewContainer = document.getElementById("templatePreview");
    const previewContent = document.getElementById("templatePreviewContent");

    let html = `
      <div class="template-info">
        <div class="info-item">
          <span class="info-label">Type:</span>
          <span class="info-value">${Utils.escapeHtml(
            template.contract_type
          )}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Description:</span>
          <span class="info-value">${Utils.escapeHtml(
            template.description
          )}</span>
        </div>
      </div>
      
      <div class="template-structure">
        <h5>Template Structure:</h5>
        <ol class="structure-list">
    `;

    template.structure.forEach((section) => {
      html += `<li>${Utils.escapeHtml(section)}</li>`;
    });

    html += `
        </ol>
      </div>
      
      <div class="template-clauses">
        <div class="clause-group">
          <h5>Required Clauses (${template.required_clauses.length}):</h5>
          <ul class="clause-list">
    `;

    template.required_clauses.forEach((clause) => {
      html += `<li><span class="badge badge-critical">Required</span> ${Utils.escapeHtml(
        clause
      )}</li>`;
    });

    html += `
          </ul>
        </div>
    `;

    if (template.optional_clauses && template.optional_clauses.length > 0) {
      html += `
        <div class="clause-group">
          <h5>Optional Clauses (${template.optional_clauses.length}):</h5>
          <ul class="clause-list">
      `;

      template.optional_clauses.forEach((clause) => {
        html += `<li><span class="badge badge-info">Optional</span> ${Utils.escapeHtml(
          clause
        )}</li>`;
      });

      html += `
          </ul>
        </div>
      `;
    }

    html += `</div>`;

    previewContent.innerHTML = html;
    previewContainer.style.display = "block";

    // Scroll to preview
    Utils.scrollToElement(previewContainer, 100);
  }

  clearTemplateSelection() {
    document.getElementById("templatePreview").style.display = "none";
    document.getElementById("generateParametersSection").style.display = "none";
    document.getElementById("generateClausesSection").style.display = "none";
    document.getElementById("generatePreviewSection").style.display = "none";

    this.selectedTemplate = null;
  }

  applyTemplateFilters() {
    // This is a placeholder for future filtering functionality
    // For now, we'll just show all templates
    const industry = document.getElementById("generateIndustryFilter").value;
    const jurisdiction = document.getElementById(
      "generateJurisdictionFilter"
    ).value;

    // In a real implementation, you would filter templates based on these criteria
    // For now, we'll just show a message if filters are applied
    if (industry || jurisdiction) {
      Toast.info("Filtering templates...");
    }
  }

  async loadParametersSection(template) {
    const section = document.getElementById("generateParametersSection");
    section.style.display = "block";

    // Get parameters based on template type
    const parameters = this.getTemplateParameters(template);

    let html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📝 Contract Parameters</h3>
          <p class="card-subtitle">Fill in the required information for ${Utils.escapeHtml(
            template.name
          )}</p>
        </div>
        <div class="card-body">
          <form id="generateParametersForm" class="parameters-form">
    `;

    // Generate form fields based on parameters
    parameters.forEach((param) => {
      html += this.generateFormField(param);
    });

    html += `
            <div class="form-actions">
              <button type="button" id="validateParametersBtn" class="btn btn-secondary">
                ✓ Validate Parameters
              </button>
              <button type="button" id="proceedToClausesBtn" class="btn btn-primary" disabled>
                Next: Customize Clauses →
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    section.innerHTML = html;

    // Setup form validation
    this.setupParameterFormValidation();

    // Scroll to parameters section
    Utils.scrollToElement(section, 100);
  }

  getTemplateParameters(template) {
    // Define parameters based on contract type
    const parametersByType = {
      PPA: [
        {
          name: "buyer_name",
          label: "Buyer Name",
          type: "text",
          required: true,
          placeholder: "e.g., Acme Corporation",
        },
        {
          name: "buyer_address",
          label: "Buyer Address",
          type: "text",
          required: true,
          placeholder: "e.g., 123 Main St, City, State ZIP",
        },
        {
          name: "seller_name",
          label: "Seller Name",
          type: "text",
          required: true,
          placeholder: "e.g., Energy Solutions LLC",
        },
        {
          name: "seller_address",
          label: "Seller Address",
          type: "text",
          required: true,
          placeholder: "e.g., 456 Power Ave, City, State ZIP",
        },
        {
          name: "contract_date",
          label: "Contract Date",
          type: "date",
          required: true,
        },
        {
          name: "price_per_mwh",
          label: "Price per MWh",
          type: "number",
          required: true,
          placeholder: "e.g., 50",
          min: 0,
          step: 0.01,
        },
        {
          name: "contract_term_years",
          label: "Contract Term (Years)",
          type: "number",
          required: true,
          placeholder: "e.g., 20",
          min: 1,
          max: 50,
        },
        {
          name: "delivery_point",
          label: "Delivery Point",
          type: "text",
          required: true,
          placeholder: "e.g., Substation XYZ",
        },
        {
          name: "capacity_mw",
          label: "Capacity (MW)",
          type: "number",
          required: true,
          placeholder: "e.g., 100",
          min: 0,
          step: 0.1,
        },
        {
          name: "jurisdiction",
          label: "Governing Jurisdiction",
          type: "select",
          required: true,
          options: ["US", "California", "New York", "Texas", "UK"],
        },
      ],
      NDA: [
        {
          name: "party_a_name",
          label: "Party A Name",
          type: "text",
          required: true,
          placeholder: "e.g., Company A Inc.",
        },
        {
          name: "party_a_address",
          label: "Party A Address",
          type: "text",
          required: true,
          placeholder: "e.g., 123 Business Blvd",
        },
        {
          name: "party_b_name",
          label: "Party B Name",
          type: "text",
          required: true,
          placeholder: "e.g., Company B LLC",
        },
        {
          name: "party_b_address",
          label: "Party B Address",
          type: "text",
          required: true,
          placeholder: "e.g., 456 Commerce St",
        },
        {
          name: "effective_date",
          label: "Effective Date",
          type: "date",
          required: true,
        },
        {
          name: "term_years",
          label: "Term (Years)",
          type: "number",
          required: true,
          placeholder: "e.g., 2",
          min: 1,
          max: 10,
        },
        {
          name: "purpose",
          label: "Purpose of Disclosure",
          type: "textarea",
          required: true,
          placeholder: "e.g., Evaluation of potential business relationship",
        },
        {
          name: "jurisdiction",
          label: "Governing Jurisdiction",
          type: "select",
          required: true,
          options: ["US", "California", "New York", "Texas", "UK"],
        },
      ],
      Supplier: [
        {
          name: "buyer_name",
          label: "Buyer Name",
          type: "text",
          required: true,
          placeholder: "e.g., Retail Corp",
        },
        {
          name: "buyer_address",
          label: "Buyer Address",
          type: "text",
          required: true,
          placeholder: "e.g., 789 Market St",
        },
        {
          name: "supplier_name",
          label: "Supplier Name",
          type: "text",
          required: true,
          placeholder: "e.g., Manufacturing Co",
        },
        {
          name: "supplier_address",
          label: "Supplier Address",
          type: "text",
          required: true,
          placeholder: "e.g., 321 Industrial Way",
        },
        {
          name: "effective_date",
          label: "Effective Date",
          type: "date",
          required: true,
        },
        {
          name: "payment_terms",
          label: "Payment Terms",
          type: "select",
          required: true,
          options: ["Net 30", "Net 60", "Net 90", "Upon Delivery"],
        },
        {
          name: "products_services",
          label: "Products/Services",
          type: "textarea",
          required: true,
          placeholder: "Describe the products or services to be supplied",
        },
        {
          name: "contract_value",
          label: "Estimated Contract Value",
          type: "number",
          required: false,
          placeholder: "e.g., 100000",
          min: 0,
        },
        {
          name: "jurisdiction",
          label: "Governing Jurisdiction",
          type: "select",
          required: true,
          options: ["US", "California", "New York", "Texas", "UK"],
        },
      ],
      Employment: [
        {
          name: "employer_name",
          label: "Employer Name",
          type: "text",
          required: true,
          placeholder: "e.g., Tech Innovations Inc.",
        },
        {
          name: "employer_address",
          label: "Employer Address",
          type: "text",
          required: true,
          placeholder: "e.g., 555 Corporate Dr",
        },
        {
          name: "employee_name",
          label: "Employee Name",
          type: "text",
          required: true,
          placeholder: "e.g., John Doe",
        },
        {
          name: "employee_address",
          label: "Employee Address",
          type: "text",
          required: true,
          placeholder: "e.g., 123 Residential Ln",
        },
        {
          name: "start_date",
          label: "Start Date",
          type: "date",
          required: true,
        },
        {
          name: "position_title",
          label: "Position Title",
          type: "text",
          required: true,
          placeholder: "e.g., Senior Software Engineer",
        },
        {
          name: "annual_salary",
          label: "Annual Salary",
          type: "number",
          required: true,
          placeholder: "e.g., 120000",
          min: 0,
        },
        {
          name: "employment_type",
          label: "Employment Type",
          type: "select",
          required: true,
          options: ["Full-Time", "Part-Time", "Contract"],
        },
        {
          name: "jurisdiction",
          label: "Governing Jurisdiction",
          type: "select",
          required: true,
          options: ["US", "California", "New York", "Texas", "UK"],
        },
      ],
    };

    // Return parameters for the template type, or default parameters
    return (
      parametersByType[template.contract_type] || [
        { name: "party_a", label: "Party A", type: "text", required: true },
        { name: "party_b", label: "Party B", type: "text", required: true },
        {
          name: "effective_date",
          label: "Effective Date",
          type: "date",
          required: true,
        },
        {
          name: "jurisdiction",
          label: "Jurisdiction",
          type: "select",
          required: true,
          options: ["US", "California", "New York", "Texas", "UK"],
        },
      ]
    );
  }

  generateFormField(param) {
    const requiredMark = param.required
      ? '<span class="required-mark">*</span>'
      : "";
    const fieldId = `param_${param.name}`;

    let fieldHtml = "";

    switch (param.type) {
      case "text":
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">
              ${Utils.escapeHtml(param.label)}${requiredMark}
            </label>
            <input 
              type="text" 
              id="${fieldId}" 
              name="${param.name}"
              class="form-input" 
              placeholder="${param.placeholder || ""}"
              ${param.required ? "required" : ""}
            />
            <div class="field-error" id="${fieldId}_error"></div>
          </div>
        `;
        break;

      case "number":
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">
              ${Utils.escapeHtml(param.label)}${requiredMark}
            </label>
            <input 
              type="number" 
              id="${fieldId}" 
              name="${param.name}"
              class="form-input" 
              placeholder="${param.placeholder || ""}"
              ${param.min !== undefined ? `min="${param.min}"` : ""}
              ${param.max !== undefined ? `max="${param.max}"` : ""}
              ${param.step !== undefined ? `step="${param.step}"` : ""}
              ${param.required ? "required" : ""}
            />
            <div class="field-error" id="${fieldId}_error"></div>
          </div>
        `;
        break;

      case "date":
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">
              ${Utils.escapeHtml(param.label)}${requiredMark}
            </label>
            <input 
              type="date" 
              id="${fieldId}" 
              name="${param.name}"
              class="form-input" 
              ${param.required ? "required" : ""}
            />
            <div class="field-error" id="${fieldId}_error"></div>
          </div>
        `;
        break;

      case "select":
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">
              ${Utils.escapeHtml(param.label)}${requiredMark}
            </label>
            <select 
              id="${fieldId}" 
              name="${param.name}"
              class="form-select" 
              ${param.required ? "required" : ""}
            >
              <option value="">-- Select ${param.label} --</option>
              ${param.options
                .map(
                  (opt) =>
                    `<option value="${Utils.escapeHtml(
                      opt
                    )}">${Utils.escapeHtml(opt)}</option>`
                )
                .join("")}
            </select>
            <div class="field-error" id="${fieldId}_error"></div>
          </div>
        `;
        break;

      case "textarea":
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">
              ${Utils.escapeHtml(param.label)}${requiredMark}
            </label>
            <textarea 
              id="${fieldId}" 
              name="${param.name}"
              class="form-textarea" 
              rows="4"
              placeholder="${param.placeholder || ""}"
              ${param.required ? "required" : ""}
            ></textarea>
            <div class="field-error" id="${fieldId}_error"></div>
          </div>
        `;
        break;
    }

    return fieldHtml;
  }

  setupParameterFormValidation() {
    const form = document.getElementById("generateParametersForm");
    const validateBtn = document.getElementById("validateParametersBtn");
    const proceedBtn = document.getElementById("proceedToClausesBtn");

    if (!form) return;

    // Real-time validation on input
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.validateField(input);
        this.checkFormValidity();
      });

      input.addEventListener("blur", () => {
        this.validateField(input);
      });
    });

    // Validate button handler
    validateBtn?.addEventListener("click", () => {
      const isValid = this.validateParameterForm();
      if (isValid) {
        Toast.success("All parameters are valid!");
        proceedBtn.disabled = false;
      } else {
        Toast.warning("Please fix the validation errors");
      }
    });

    // Proceed button handler
    proceedBtn?.addEventListener("click", () => {
      if (this.validateParameterForm()) {
        this.collectParameterData();
        this.loadClausesSection();
      }
    });
  }

  validateField(field) {
    const errorDiv = document.getElementById(`${field.id}_error`);
    let isValid = true;
    let errorMessage = "";

    // Check required fields
    if (field.hasAttribute("required") && !field.value.trim()) {
      isValid = false;
      errorMessage = "This field is required";
    }

    // Check number constraints
    if (field.type === "number" && field.value) {
      const value = parseFloat(field.value);
      const min = field.getAttribute("min");
      const max = field.getAttribute("max");

      if (min !== null && value < parseFloat(min)) {
        isValid = false;
        errorMessage = `Value must be at least ${min}`;
      }

      if (max !== null && value > parseFloat(max)) {
        isValid = false;
        errorMessage = `Value must be at most ${max}`;
      }
    }

    // Update UI
    if (isValid) {
      field.classList.remove("error");
      if (errorDiv) {
        errorDiv.textContent = "";
        errorDiv.style.display = "none";
      }
    } else {
      field.classList.add("error");
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = "block";
      }
    }

    return isValid;
  }

  validateParameterForm() {
    const form = document.getElementById("generateParametersForm");
    if (!form) return false;

    const inputs = form.querySelectorAll("input, select, textarea");
    let isValid = true;

    inputs.forEach((input) => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  checkFormValidity() {
    const form = document.getElementById("generateParametersForm");
    const proceedBtn = document.getElementById("proceedToClausesBtn");

    if (!form || !proceedBtn) return;

    const inputs = form.querySelectorAll(
      "input[required], select[required], textarea[required]"
    );
    let allFilled = true;

    inputs.forEach((input) => {
      if (!input.value.trim()) {
        allFilled = false;
      }
    });

    // Enable proceed button only if all required fields are filled
    proceedBtn.disabled = !allFilled;
  }

  collectParameterData() {
    const form = document.getElementById("generateParametersForm");
    if (!form) return null;

    const formData = new FormData(form);
    const parameters = {};

    for (const [key, value] of formData.entries()) {
      parameters[key] = value;
    }

    this.contractParameters = parameters;
    console.log("Collected parameters:", parameters);

    return parameters;
  }

  loadClausesSection() {
    // This will be implemented in task 6.3
    const section = document.getElementById("generateClausesSection");
    section.style.display = "block";
    section.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📚 Customize Clauses</h3>
          <p class="card-subtitle">Add, remove, or edit contract clauses</p>
        </div>
        <div class="card-body">
          <p class="text-muted">Clause customization will be implemented in the next task...</p>
        </div>
      </div>
    `;

    Toast.success("Parameters saved! Proceeding to clause customization...");
    Utils.scrollToElement(section, 100);
  }

  loadClausesTab(container) {
    const sampleClauses = [
      {
        id: 1,
        name: "Payment Terms - Standard",
        category: "Payment",
        text: "Payment shall be made within thirty (30) days of invoice date. Late payments shall accrue interest at a rate of 1.5% per month.",
        type: "PPA",
      },
      {
        id: 2,
        name: "Force Majeure",
        category: "Force Majeure",
        text: "Neither party shall be liable for failure to perform due to causes beyond reasonable control, including acts of God, war, strikes, or government actions.",
        type: "PPA",
      },
      {
        id: 3,
        name: "Termination for Convenience",
        category: "Termination",
        text: "Either party may terminate this Agreement upon ninety (90) days written notice to the other party without cause.",
        type: "PPA",
      },
      {
        id: 4,
        name: "Limitation of Liability",
        category: "Liability",
        text: "In no event shall either party's liability exceed the total amount paid under this Agreement in the twelve (12) months preceding the claim.",
        type: "PPA",
      },
      {
        id: 5,
        name: "Indemnification - Seller",
        category: "Indemnification",
        text: "Seller shall indemnify and hold harmless Buyer from any claims arising from Seller's negligence or willful misconduct in performance of this Agreement.",
        type: "PPA",
      },
      {
        id: 6,
        name: "Performance Guarantees",
        category: "Performance",
        text: "The facility shall maintain a minimum availability of 95% annually. Failure to meet this threshold shall result in liquidated damages as specified in Exhibit A.",
        type: "PPA",
      },
    ];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📚 Standard PPA Clause Library</h3>
          <p class="card-subtitle">Browse and manage standard contract clauses</p>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Filter by Category:</label>
            <select id="clauseCategoryFilter" class="form-select">
              <option value="">All Categories</option>
              <option value="Payment">Payment</option>
              <option value="Force Majeure">Force Majeure</option>
              <option value="Termination">Termination</option>
              <option value="Liability">Liability</option>
              <option value="Indemnification">Indemnification</option>
              <option value="Performance">Performance</option>
            </select>
          </div>

          <div id="clausesList" class="clauses-list">
            ${sampleClauses
              .map(
                (clause) => `
              <div class="clause-card" data-category="${clause.category}">
                <div class="clause-header">
                  <h4 class="clause-title">${clause.name}</h4>
                  <span class="clause-badge">${clause.category}</span>
                </div>
                <div class="clause-text">
                  ${clause.text}
                </div>
                <div class="clause-actions">
                  <button class="btn btn-sm btn-ghost" onclick="navigator.clipboard.writeText('${clause.text.replace(
                    /'/g,
                    "\\'"
                  )}'); Toast.success('Clause copied to clipboard!')">
                    📋 Copy
                  </button>
                  <button class="btn btn-sm btn-ghost" disabled>
                    ✏️ Edit
                  </button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <div class="construction-notice">
            <div class="construction-icon">🚧</div>
            <div class="construction-content">
              <h4>Clause Library Under Development</h4>
              <p>Full clause management functionality is being built out. Future features will include:</p>
              <ul>
                <li>Add, edit, and delete custom clauses</li>
                <li>Advanced search and filtering</li>
                <li>Clause version control and history</li>
                <li>AI-powered clause recommendations</li>
                <li>Integration with contract generation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add filter functionality
    const filterSelect = document.getElementById("clauseCategoryFilter");
    filterSelect.addEventListener("change", (e) => {
      const category = e.target.value;
      const clauseCards = document.querySelectorAll(".clause-card");

      clauseCards.forEach((card) => {
        if (!category || card.dataset.category === category) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  setupClauseEventListeners() {
    // Search button
    document
      .getElementById("clauseSearchBtn")
      ?.addEventListener("click", () => {
        this.searchClauses();
      });

    // Search on Enter key
    document
      .getElementById("clauseSearchInput")
      ?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.searchClauses();
        }
      });

    // Filter changes
    const filterIds = [
      "clauseTypeFilter",
      "clauseCategoryFilter",
      "clauseJurisdictionFilter",
      "clauseIndustryFilter",
    ];

    filterIds.forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        this.applyClauseFilters();
      });
    });

    // Clear filters
    document
      .getElementById("clauseClearFilters")
      ?.addEventListener("click", () => {
        this.clearClauseFilters();
      });

    // Add clause button
    document.getElementById("addClauseBtn")?.addEventListener("click", () => {
      this.showAddClauseModal();
    });
  }

  async loadClauses() {
    const container = document.getElementById("clauseListContainer");

    try {
      LoadingSpinner.show(container, "Loading clauses...");

      const result = await API.clauses.getAll(this.clauseLibrary.filters);

      if (result.success) {
        this.clauseLibrary.clauses = result.clauses || [];
        this.displayClauses(this.clauseLibrary.clauses);
      } else {
        throw new Error(result.error || "Failed to load clauses");
      }
    } catch (error) {
      console.error("Failed to load clauses:", error);
      container.innerHTML = `
        <div class="alert alert-error">
          <strong>Failed to Load Clauses</strong>
          <p>${Utils.escapeHtml(error.message)}</p>
          <p class="mt-4">
            <button id="retryLoadClauses" class="btn btn-primary">
              🔄 Retry
            </button>
          </p>
        </div>
      `;

      document
        .getElementById("retryLoadClauses")
        ?.addEventListener("click", () => {
          this.loadClauses();
        });
    }
  }

  displayClauses(clauses) {
    const container = document.getElementById("clauseListContainer");

    if (!clauses || clauses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <h3 class="empty-state-title">No Clauses Found</h3>
          <p class="empty-state-message">
            ${
              Object.keys(this.clauseLibrary.filters).length > 0
                ? "Try adjusting your filters or search criteria"
                : "Add your first clause to get started"
            }
          </p>
        </div>
      `;
      return;
    }

    let html = '<div class="clause-grid">';

    clauses.forEach((clause) => {
      const contractTypes = clause.contract_types?.join(", ") || "N/A";
      const industries = clause.industries?.join(", ") || "N/A";
      const usageCount = clause.usage_count || 0;
      const isRequired = clause.is_required ? "✓ Required" : "Optional";

      html += `
        <div class="clause-card" data-clause-id="${clause.clause_id}">
          <div class="clause-card-header">
            <h4 class="clause-card-title">${Utils.escapeHtml(clause.name)}</h4>
            <div class="clause-card-badges">
              <span class="badge badge-info">${Utils.escapeHtml(
                clause.category
              )}</span>
              ${
                clause.is_required
                  ? '<span class="badge badge-warning">Required</span>'
                  : ""
              }
            </div>
          </div>
          
          <div class="clause-card-body">
            <div class="clause-preview">
              ${Utils.escapeHtml(clause.text.substring(0, 200))}${
        clause.text.length > 200 ? "..." : ""
      }
            </div>
            
            <div class="clause-metadata">
              <div class="metadata-row">
                <span class="metadata-label">Contract Types:</span>
                <span class="metadata-value">${Utils.escapeHtml(
                  contractTypes
                )}</span>
              </div>
              <div class="metadata-row">
                <span class="metadata-label">Industries:</span>
                <span class="metadata-value">${Utils.escapeHtml(
                  industries
                )}</span>
              </div>
              <div class="metadata-row">
                <span class="metadata-label">Usage:</span>
                <span class="metadata-value">${usageCount} times</span>
              </div>
              <div class="metadata-row">
                <span class="metadata-label">Version:</span>
                <span class="metadata-value">v${clause.version || 1}</span>
              </div>
            </div>
          </div>
          
          <div class="clause-card-footer">
            <button class="btn btn-sm btn-ghost" onclick="app.viewClause('${
              clause.clause_id
            }')">
              👁️ View
            </button>
            <button class="btn btn-sm btn-ghost" onclick="app.editClause('${
              clause.clause_id
            }')">
              ✏️ Edit
            </button>
            <button class="btn btn-sm btn-ghost" onclick="app.copyClauseText('${
              clause.clause_id
            }')">
              📋 Copy
            </button>
            <button class="btn btn-sm btn-ghost text-error" onclick="app.deleteClause('${
              clause.clause_id
            }')">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    });

    html += "</div>";
    container.innerHTML = html;
  }

  async searchClauses() {
    const query = document.getElementById("clauseSearchInput")?.value.trim();

    if (!query) {
      Toast.warning("Please enter a search term");
      return;
    }

    const container = document.getElementById("clauseListContainer");

    try {
      LoadingSpinner.show(container, "Searching clauses...");

      const result = await API.clauses.search(
        query,
        this.clauseLibrary.filters
      );

      if (result.success) {
        this.clauseLibrary.clauses = result.clauses || [];
        this.displayClauses(this.clauseLibrary.clauses);
        Toast.success(`Found ${this.clauseLibrary.clauses.length} clauses`);
      } else {
        throw new Error(result.error || "Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      Toast.error("Search failed: " + error.message);
      this.loadClauses(); // Fallback to showing all clauses
    }
  }

  applyClauseFilters() {
    const filters = {};

    const type = document.getElementById("clauseTypeFilter")?.value;
    const category = document.getElementById("clauseCategoryFilter")?.value;
    const jurisdiction = document.getElementById(
      "clauseJurisdictionFilter"
    )?.value;
    const industry = document.getElementById("clauseIndustryFilter")?.value;

    if (type) filters.contract_type = type;
    if (category) filters.category = category;
    if (jurisdiction) filters.jurisdiction = jurisdiction;
    if (industry) filters.industry = industry;

    this.clauseLibrary.filters = filters;
    this.loadClauses();
  }

  clearClauseFilters() {
    document.getElementById("clauseSearchInput").value = "";
    document.getElementById("clauseTypeFilter").value = "";
    document.getElementById("clauseCategoryFilter").value = "";
    document.getElementById("clauseJurisdictionFilter").value = "";
    document.getElementById("clauseIndustryFilter").value = "";

    this.clauseLibrary.filters = {};
    this.loadClauses();
    Toast.info("Filters cleared");
  }

  async viewClause(clauseId) {
    try {
      const result = await API.clauses.getById(clauseId);

      if (result.success) {
        this.showClauseModal(result.clause, "view");
      } else {
        throw new Error(result.error || "Failed to load clause");
      }
    } catch (error) {
      console.error("Failed to view clause:", error);
      Toast.error("Failed to load clause: " + error.message);
    }
  }

  async editClause(clauseId) {
    try {
      const result = await API.clauses.getById(clauseId);

      if (result.success) {
        this.showClauseModal(result.clause, "edit");
      } else {
        throw new Error(result.error || "Failed to load clause");
      }
    } catch (error) {
      console.error("Failed to load clause for editing:", error);
      Toast.error("Failed to load clause: " + error.message);
    }
  }

  async copyClauseText(clauseId) {
    try {
      const result = await API.clauses.getById(clauseId);

      if (result.success && result.clause) {
        await navigator.clipboard.writeText(result.clause.text);
        Toast.success("Clause text copied to clipboard!");
      } else {
        throw new Error(result.error || "Failed to load clause");
      }
    } catch (error) {
      console.error("Failed to copy clause:", error);
      Toast.error("Failed to copy clause: " + error.message);
    }
  }

  async deleteClause(clauseId) {
    if (
      !confirm(
        "Are you sure you want to delete this clause? This will archive it."
      )
    ) {
      return;
    }

    try {
      Toast.info("Deleting clause...");

      const result = await API.clauses.delete(clauseId);

      if (result.success) {
        Toast.success("Clause deleted successfully");
        this.loadClauses(); // Reload the list
      } else {
        throw new Error(result.error || "Failed to delete clause");
      }
    } catch (error) {
      console.error("Failed to delete clause:", error);
      Toast.error("Failed to delete clause: " + error.message);
    }
  }

  showAddClauseModal() {
    this.showClauseModal(null, "add");
  }

  showClauseModal(clause, mode) {
    const isView = mode === "view";
    const isEdit = mode === "edit";
    const isAdd = mode === "add";

    const title = isView
      ? "View Clause"
      : isEdit
      ? "Edit Clause"
      : "Add New Clause";
    const readonly = isView ? "readonly" : "";
    const disabled = isView ? "disabled" : "";

    const modalHTML = `
      <div class="modal">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" onclick="app.closeModal()">×</button>
          </div>
          
          <div class="modal-body">
            <form id="clauseForm">
              <div class="form-group">
                <label class="form-label">Clause Name *</label>
                <input 
                  type="text" 
                  id="clauseName" 
                  class="form-input" 
                  value="${Utils.escapeHtml(clause?.name || "")}"
                  ${readonly}
                  required
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Clause Text *</label>
                <textarea 
                  id="clauseText" 
                  class="form-textarea" 
                  rows="8"
                  ${readonly}
                  required
                >${Utils.escapeHtml(clause?.text || "")}</textarea>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Category *</label>
                  <select id="clauseCategory" class="form-select" ${disabled} required>
                    <option value="">Select Category</option>
                    <option value="payment" ${
                      clause?.category === "payment" ? "selected" : ""
                    }>Payment</option>
                    <option value="termination" ${
                      clause?.category === "termination" ? "selected" : ""
                    }>Termination</option>
                    <option value="liability" ${
                      clause?.category === "liability" ? "selected" : ""
                    }>Liability</option>
                    <option value="confidentiality" ${
                      clause?.category === "confidentiality" ? "selected" : ""
                    }>Confidentiality</option>
                    <option value="indemnification" ${
                      clause?.category === "indemnification" ? "selected" : ""
                    }>Indemnification</option>
                    <option value="force_majeure" ${
                      clause?.category === "force_majeure" ? "selected" : ""
                    }>Force Majeure</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Deviation Threshold (%)</label>
                  <input 
                    type="number" 
                    id="clauseThreshold" 
                    class="form-input" 
                    min="0" 
                    max="100" 
                    value="${clause?.deviation_threshold || 80}"
                    ${readonly}
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Contract Types (comma-separated)</label>
                <input 
                  type="text" 
                  id="clauseContractTypes" 
                  class="form-input" 
                  value="${clause?.contract_types?.join(", ") || ""}"
                  placeholder="e.g., PPA, NDA, Supplier"
                  ${readonly}
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Industries (comma-separated)</label>
                <input 
                  type="text" 
                  id="clauseIndustries" 
                  class="form-input" 
                  value="${clause?.industries?.join(", ") || ""}"
                  placeholder="e.g., Energy, Technology, Healthcare"
                  ${readonly}
                />
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="clauseRequired" 
                    ${clause?.is_required ? "checked" : ""}
                    ${disabled}
                  />
                  <span>Required Clause</span>
                </label>
              </div>
              
              ${
                clause
                  ? `
                <div class="metadata-grid mt-4">
                  <div class="metadata-item">
                    <span class="metadata-label">Version:</span>
                    <span class="metadata-value">v${clause.version || 1}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="metadata-label">Created:</span>
                    <span class="metadata-value">${Utils.formatDate(
                      new Date(clause.created_at)
                    )}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="metadata-label">Updated:</span>
                    <span class="metadata-value">${Utils.formatDate(
                      new Date(clause.updated_at)
                    )}</span>
                  </div>
                </div>
              `
                  : ""
              }
            </form>
          </div>
          
          <div class="modal-footer">
            ${
              !isView
                ? `
              <button class="btn btn-primary" onclick="app.saveClause('${
                clause?.clause_id || ""
              }', '${mode}')">
                ${isEdit ? "💾 Save Changes" : "➕ Add Clause"}
              </button>
            `
                : ""
            }
            <button class="btn btn-ghost" onclick="app.closeModal()">
              ${isView ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modalOverlay").innerHTML = modalHTML;
    document.getElementById("modalOverlay").classList.add("active");
  }

  async saveClause(clauseId, mode) {
    const form = document.getElementById("clauseForm");

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const clauseData = {
      name: document.getElementById("clauseName").value.trim(),
      text: document.getElementById("clauseText").value.trim(),
      category: document.getElementById("clauseCategory").value,
      deviation_threshold: parseFloat(
        document.getElementById("clauseThreshold").value
      ),
      contract_types: document
        .getElementById("clauseContractTypes")
        .value.split(",")
        .map((t) => t.trim())
        .filter((t) => t),
      industries: document
        .getElementById("clauseIndustries")
        .value.split(",")
        .map((i) => i.trim())
        .filter((i) => i),
      is_required: document.getElementById("clauseRequired").checked,
    };

    try {
      Toast.info(mode === "edit" ? "Updating clause..." : "Adding clause...");

      let result;
      if (mode === "edit") {
        result = await API.clauses.update(clauseId, clauseData);
      } else {
        result = await API.clauses.create(clauseData);
      }

      if (result.success) {
        Toast.success(
          mode === "edit"
            ? "Clause updated successfully!"
            : "Clause added successfully!"
        );
        this.closeModal();
        this.loadClauses(); // Reload the list
      } else {
        throw new Error(result.error || "Failed to save clause");
      }
    } catch (error) {
      console.error("Failed to save clause:", error);
      Toast.error("Failed to save clause: " + error.message);
    }
  }

  closeModal() {
    document.getElementById("modalOverlay").classList.remove("active");
    document.getElementById("modalOverlay").innerHTML = "";
  }

  async loadTemplates() {
    const container = document.getElementById("templateListContainer");

    try {
      LoadingSpinner.show(container, "Loading templates...");

      const result = await API.templates.getAll();

      if (result.success) {
        this.clauseLibrary.templates = result.templates || [];
        this.displayTemplates(this.clauseLibrary.templates);
      } else {
        throw new Error(result.error || "Failed to load templates");
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      container.innerHTML = `
        <div class="alert alert-info">
          <strong>Templates</strong>
          <p>Template management will be available in the next phase.</p>
        </div>
      `;
    }
  }

  displayTemplates(templates) {
    const container = document.getElementById("templateListContainer");

    if (!templates || templates.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3 class="empty-state-title">No Templates Found</h3>
          <p class="empty-state-message">Contract templates will be available soon</p>
        </div>
      `;
      return;
    }

    let html = '<div class="template-grid">';

    templates.forEach((template) => {
      const requiredCount = template.required_clauses?.length || 0;
      const optionalCount = template.optional_clauses?.length || 0;

      html += `
        <div class="template-card">
          <div class="template-card-header">
            <h4 class="template-card-title">${Utils.escapeHtml(
              template.name
            )}</h4>
            <span class="badge badge-info">${Utils.escapeHtml(
              template.contract_type
            )}</span>
          </div>
          
          <div class="template-card-body">
            <p class="template-description">${Utils.escapeHtml(
              template.description || "No description"
            )}</p>
            
            <div class="template-stats">
              <div class="stat-item">
                <span class="stat-label">Required Clauses:</span>
                <span class="stat-value">${requiredCount}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Optional Clauses:</span>
                <span class="stat-value">${optionalCount}</span>
              </div>
              ${
                template.jurisdiction
                  ? `
                <div class="stat-item">
                  <span class="stat-label">Jurisdiction:</span>
                  <span class="stat-value">${Utils.escapeHtml(
                    template.jurisdiction
                  )}</span>
                </div>
              `
                  : ""
              }
            </div>
          </div>
          
          <div class="template-card-footer">
            <button class="btn btn-sm btn-ghost" onclick="app.viewTemplate('${
              template.template_id
            }')">
              👁️ View Details
            </button>
          </div>
        </div>
      `;
    });

    html += "</div>";
    container.innerHTML = html;
  }

  async viewTemplate(templateId) {
    try {
      const result = await API.templates.getById(templateId);

      if (result.success) {
        this.showTemplateModal(result.template);
      } else {
        throw new Error(result.error || "Failed to load template");
      }
    } catch (error) {
      console.error("Failed to view template:", error);
      Toast.error("Failed to load template: " + error.message);
    }
  }

  showTemplateModal(template) {
    const modalHTML = `
      <div class="modal">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3 class="modal-title">📄 ${Utils.escapeHtml(template.name)}</h3>
            <button class="modal-close" onclick="app.closeModal()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="template-details">
              <div class="detail-section">
                <h4>Template Information</h4>
                <div class="metadata-grid">
                  <div class="metadata-item">
                    <span class="metadata-label">Contract Type:</span>
                    <span class="metadata-value">${Utils.escapeHtml(
                      template.contract_type
                    )}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="metadata-label">Jurisdiction:</span>
                    <span class="metadata-value">${Utils.escapeHtml(
                      template.jurisdiction || "N/A"
                    )}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="metadata-label">Industry:</span>
                    <span class="metadata-value">${Utils.escapeHtml(
                      template.industry || "N/A"
                    )}</span>
                  </div>
                </div>
                <p class="mt-3">${Utils.escapeHtml(
                  template.description || "No description available"
                )}</p>
              </div>
              
              <div class="detail-section mt-4">
                <h4>Required Clauses (${
                  template.required_clauses?.length || 0
                })</h4>
                <ul class="clause-list">
                  ${
                    template.required_clauses?.length > 0
                      ? template.required_clauses
                          .map((id) => `<li>${Utils.escapeHtml(id)}</li>`)
                          .join("")
                      : "<li>No required clauses</li>"
                  }
                </ul>
              </div>
              
              <div class="detail-section mt-4">
                <h4>Optional Clauses (${
                  template.optional_clauses?.length || 0
                })</h4>
                <ul class="clause-list">
                  ${
                    template.optional_clauses?.length > 0
                      ? template.optional_clauses
                          .map((id) => `<li>${Utils.escapeHtml(id)}</li>`)
                          .join("")
                      : "<li>No optional clauses</li>"
                  }
                </ul>
              </div>
              
              ${
                template.structure?.length > 0
                  ? `
                <div class="detail-section mt-4">
                  <h4>Document Structure</h4>
                  <ol class="structure-list">
                    ${template.structure
                      .map((section) => `<li>${Utils.escapeHtml(section)}</li>`)
                      .join("")}
                  </ol>
                </div>
              `
                  : ""
              }
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="app.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modalOverlay").innerHTML = modalHTML;
    document.getElementById("modalOverlay").classList.add("active");
  }

  async exportAnalysisPDF() {
    if (!this.currentAnalysis) {
      Toast.error("No analysis data available to export");
      return;
    }

    const exportBtn = document.getElementById("exportPdfBtn");

    try {
      exportBtn.disabled = true;
      exportBtn.innerHTML = "⏳ Generating PDF...";
      Toast.info("Generating PDF export...");

      const blob = await API.contracts.exportPDF(
        this.currentAnalysis.contractText,
        this.currentAnalysis.analysisResult
      );

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const contractType =
        this.currentAnalysis.analysisResult.contract_type || "contract";
      const filename = `${contractType.replace(
        /\s+/g,
        "_"
      )}_analysis_${timestamp}.pdf`;

      // Download the file
      Utils.downloadFile(blob, filename);

      Toast.success(`PDF exported successfully: ${filename}`);
    } catch (error) {
      console.error("Export error:", error);
      Toast.error("Failed to export PDF: " + error.message);
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = "📥 Export Analysis as PDF";
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Alt + number to switch tabs
      if (e.altKey && e.key >= "1" && e.key <= "6") {
        const tabs = [
          "analyze",
          "batch",
          "obligations",
          "compare",
          "generate",
          "clauses",
        ];
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          this.switchTab(tabs[index]);
        }
      }
    });
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ContractAIApp();
});
