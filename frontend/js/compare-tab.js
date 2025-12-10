/**
 * Contract Comparison Tab
 * Handles side-by-side contract comparison using AgentCore Runtime
 */

const CompareTab = {
  container: null,
  currentComparison: null,

  /**
   * Initialize the compare tab
   */
  async init(container) {
    this.container = container;
    console.log("Initializing Compare tab...");

    try {
      await this.render();
    } catch (error) {
      console.error("Failed to initialize Compare tab:", error);
      this.showError("Failed to load comparison form");
    }
  },

  /**
   * Render the comparison form
   */
  async render() {
    this.container.innerHTML = `
      <div class="compare-container">
        <!-- Input Section -->
        <div class="compare-inputs">
          <!-- Contract 1 -->
          <div class="contract-input">
            <h4>📄 Contract 1</h4>
            <div class="input-tabs">
              <button class="input-tab-btn active" data-contract="1" data-input="text">
                📝 Text
              </button>
              <button class="input-tab-btn" data-contract="1" data-input="file">
                📁 File
              </button>
            </div>
            
            <div class="input-pane active" id="contract1Text">
              <div id="textArea1Container"></div>
            </div>
            
            <div class="input-pane" id="contract1File">
              <div id="fileUpload1Container"></div>
              <div id="filePreview1" style="display: none;">
                <div class="file-info">
                  <span class="file-icon">📄</span>
                  <span class="file-name" id="fileName1"></span>
                  <span class="file-size" id="fileSize1"></span>
                  <button class="btn btn-small btn-secondary" id="clearFile1">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Contract 2 -->
          <div class="contract-input">
            <h4>📄 Contract 2</h4>
            <div class="input-tabs">
              <button class="input-tab-btn active" data-contract="2" data-input="text">
                📝 Text
              </button>
              <button class="input-tab-btn" data-contract="2" data-input="file">
                📁 File
              </button>
            </div>
            
            <div class="input-pane active" id="contract2Text">
              <div id="textArea2Container"></div>
            </div>
            
            <div class="input-pane" id="contract2File">
              <div id="fileUpload2Container"></div>
              <div id="filePreview2" style="display: none;">
                <div class="file-info">
                  <span class="file-icon">📄</span>
                  <span class="file-name" id="fileName2"></span>
                  <span class="file-size" id="fileSize2"></span>
                  <button class="btn btn-small btn-secondary" id="clearFile2">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Options -->
        <div class="comparison-options">
          <div class="option-group">
            <label for="comparisonBackendType">Comparison Engine:</label>
            <select id="comparisonBackendType" class="form-select">
              <option value="agentcore">⚙️ AgentCore</option>
              <option value="bedrock">🤖 Bedrock AI Agent</option>
            </select>
          </div>

          <div class="option-group">
            <label for="comparisonJurisdiction">Jurisdiction:</label>
            <select id="comparisonJurisdiction" class="form-select">
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
          <button id="compareButton" class="btn btn-primary btn-large">
            🔄 Compare Contracts
          </button>
          <button id="clearCompareButton" class="btn btn-secondary">
            Clear
          </button>
        </div>

        <!-- Results Section -->
        <div class="results-section" id="compareResultsSection" style="display: none;">
          <div class="results-header">
            <h3>Comparison Results</h3>
            <div class="results-actions">
              <button id="viewCompareTraceButton" class="btn btn-secondary btn-small">
                📊 View Trace
              </button>
              <button id="downloadCompareButton" class="btn btn-secondary btn-small">
                💾 Download
              </button>
            </div>
          </div>
          <div id="compareResultsContent" class="results-content"></div>
        </div>
      </div>
    `;

    // Initialize components
    this.initializeTextAreas();
    this.initializeFileUploads();
    this.setupEventListeners();
  },

  /**
   * Initialize text areas
   */
  initializeTextAreas() {
    // Contract 1
    const container1 = document.getElementById("textArea1Container");
    if (container1) {
      const { container: textAreaContainer1, textarea: textarea1 } =
        createTextArea({
          placeholder: "Paste first contract text here...",
          rows: 10,
          maxLength: 1000000,
        });
      container1.appendChild(textAreaContainer1);
      this.textarea1 = textarea1;
    }

    // Contract 2
    const container2 = document.getElementById("textArea2Container");
    if (container2) {
      const { container: textAreaContainer2, textarea: textarea2 } =
        createTextArea({
          placeholder: "Paste second contract text here...",
          rows: 10,
          maxLength: 1000000,
        });
      container2.appendChild(textAreaContainer2);
      this.textarea2 = textarea2;
    }
  },

  /**
   * Initialize file uploads
   */
  initializeFileUploads() {
    // Contract 1
    const container1 = document.getElementById("fileUpload1Container");
    if (container1) {
      const fileUpload1 = createFileUpload({
        accept: ".txt,.pdf,.doc,.docx",
        multiple: false,
        maxSize: 10 * 1024 * 1024,
        onFileSelect: (file) => this.handleFileSelect(1, file),
      });
      container1.appendChild(fileUpload1);
    }

    // Contract 2
    const container2 = document.getElementById("fileUpload2Container");
    if (container2) {
      const fileUpload2 = createFileUpload({
        accept: ".txt,.pdf,.doc,.docx",
        multiple: false,
        maxSize: 10 * 1024 * 1024,
        onFileSelect: (file) => this.handleFileSelect(2, file),
      });
      container2.appendChild(fileUpload2);
    }
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Input tabs
    const inputTabs = document.querySelectorAll(".input-tab-btn");
    inputTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const contract = tab.getAttribute("data-contract");
        const inputType = tab.getAttribute("data-input");
        this.switchInputType(contract, inputType);
      });
    });

    // Compare button
    const compareButton = document.getElementById("compareButton");
    if (compareButton) {
      compareButton.addEventListener("click", () => this.compareContracts());
    }

    // Clear button
    const clearButton = document.getElementById("clearCompareButton");
    if (clearButton) {
      clearButton.addEventListener("click", () => this.clearForm());
    }

    // Clear file buttons
    ["1", "2"].forEach((num) => {
      const clearFileButton = document.getElementById(`clearFile${num}`);
      if (clearFileButton) {
        clearFileButton.addEventListener("click", () => this.clearFile(num));
      }
    });

    // View trace button
    const viewTraceButton = document.getElementById("viewCompareTraceButton");
    if (viewTraceButton) {
      viewTraceButton.addEventListener("click", () => this.viewTrace());
    }

    // Download button
    const downloadButton = document.getElementById("downloadCompareButton");
    if (downloadButton) {
      downloadButton.addEventListener("click", () => this.downloadResults());
    }
  },

  /**
   * Switch input type
   */
  switchInputType(contract, type) {
    // Update tabs
    document
      .querySelectorAll(`.input-tab-btn[data-contract="${contract}"]`)
      .forEach((btn) => {
        if (btn.getAttribute("data-input") === type) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

    // Update panes
    const textPane = document.getElementById(`contract${contract}Text`);
    const filePane = document.getElementById(`contract${contract}File`);

    if (type === "text") {
      textPane.classList.add("active");
      filePane.classList.remove("active");
    } else {
      textPane.classList.remove("active");
      filePane.classList.add("active");
    }
  },

  /**
   * Handle file selection
   */
  async handleFileSelect(contractNum, file) {
    console.log(`File selected for contract ${contractNum}:`, file.name);

    try {
      // Read file content
      const content = await readFileAsText(file);

      // Show file preview
      document.getElementById(`fileName${contractNum}`).textContent = file.name;
      document.getElementById(`fileSize${contractNum}`).textContent =
        formatFileSize(file.size);
      document.getElementById(`filePreview${contractNum}`).style.display =
        "block";
      document.querySelector(
        `#fileUpload${contractNum}Container .file-upload-dropzone`
      ).style.display = "none";

      // Store file content
      if (contractNum === 1) {
        this.fileContent1 = content;
        this.fileName1 = file.name;
      } else {
        this.fileContent2 = content;
        this.fileName2 = file.name;
      }

      showToast(
        "File Loaded",
        `${file.name} loaded successfully`,
        "success",
        2000
      );
    } catch (error) {
      console.error("Failed to read file:", error);
      showToast("Error", "Failed to read file. Please try again.", "error");
    }
  },

  /**
   * Clear file
   */
  clearFile(contractNum) {
    if (contractNum === 1) {
      this.fileContent1 = null;
      this.fileName1 = null;
    } else {
      this.fileContent2 = null;
      this.fileName2 = null;
    }

    document.getElementById(`filePreview${contractNum}`).style.display = "none";
    document.querySelector(
      `#fileUpload${contractNum}Container .file-upload-dropzone`
    ).style.display = "flex";
  },

  /**
   * Compare contracts
   */
  async compareContracts() {
    // Get contract texts
    let contract1Text, contract2Text;

    // Contract 1
    const activeInput1 = document.querySelector("#contract1Text.active");
    if (activeInput1) {
      contract1Text = this.textarea1.value;
    } else {
      contract1Text = this.fileContent1;
    }

    // Contract 2
    const activeInput2 = document.querySelector("#contract2Text.active");
    if (activeInput2) {
      contract2Text = this.textarea2.value;
    } else {
      contract2Text = this.fileContent2;
    }

    // Validate
    const validation1 = validateContractText(contract1Text);
    if (!validation1.valid) {
      showToast(
        "Validation Error",
        `Contract 1: ${validation1.error}`,
        "error"
      );
      return;
    }

    const validation2 = validateContractText(contract2Text);
    if (!validation2.valid) {
      showToast(
        "Validation Error",
        `Contract 2: ${validation2.error}`,
        "error"
      );
      return;
    }

    // Get options
    const backendType = document.getElementById("comparisonBackendType").value;
    const jurisdiction = document.getElementById(
      "comparisonJurisdiction"
    ).value;

    // Show loading
    this.showLoading();

    try {
      console.log(`Starting contract comparison with ${backendType}...`);

      // Call API based on backend type
      let result;
      if (backendType === "bedrock") {
        result = await apiClient.compareWithBedrock(
          validation1.text,
          validation2.text,
          {
            sessionId: apiClient.generateSessionId(),
          }
        );
      } else {
        result = await apiClient.compareContracts(
          validation1.text,
          validation2.text,
          {
            jurisdiction: jurisdiction,
            userId: authManager.getUserInfo()?.sub || "anonymous",
            sessionId: apiClient.generateSessionId(),
          }
        );
      }

      // Store result
      this.currentComparison = result;

      // Display results
      this.displayResults(result);

      showToast(
        "Comparison Complete",
        "Contracts compared successfully",
        "success"
      );
    } catch (error) {
      console.error("Comparison failed:", error);
      this.showError(
        error.message || "Failed to compare contracts. Please try again."
      );
      showToast(
        "Comparison Failed",
        error.message || "An error occurred",
        "error"
      );
    }
  },

  /**
   * Display comparison results
   */
  displayResults(result) {
    const resultsSection = document.getElementById("compareResultsSection");
    const resultsContent = document.getElementById("compareResultsContent");

    if (!resultsSection || !resultsContent) return;

    // Show results section
    resultsSection.style.display = "block";

    // Format results
    let html = "";

    // Summary
    if (result.summary) {
      html += `
        <div class="result-section">
          <h4>📋 Comparison Summary</h4>
          <div class="result-content">${parseMarkdown(result.summary)}</div>
        </div>
      `;
    }

    // Key Differences
    if (result.key_differences && result.key_differences.length > 0) {
      html += `
        <div class="result-section">
          <h4>🔍 Key Differences</h4>
          <div class="result-content">
            <ul class="differences-list">
              ${result.key_differences
                .map((diff) => `<li>${diff}</li>`)
                .join("")}
            </ul>
          </div>
        </div>
      `;
    }

    // Side-by-Side Comparison
    if (result.side_by_side) {
      html += `
        <div class="result-section">
          <h4>📊 Side-by-Side Comparison</h4>
          <div class="result-content">
            ${this.formatSideBySide(result.side_by_side)}
          </div>
        </div>
      `;
    }

    // Deviation Analysis
    if (result.deviation_analysis) {
      html += `
        <div class="result-section">
          <h4>📈 Deviation Analysis</h4>
          <div class="result-content">
            ${this.formatDeviationAnalysis(result.deviation_analysis)}
          </div>
        </div>
      `;
    }

    // Recommendations
    if (result.recommendations && result.recommendations.length > 0) {
      html += `
        <div class="result-section">
          <h4>💡 Recommendations</h4>
          <div class="result-content">
            <ul class="recommendations-list">
              ${result.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }

    // Metadata
    if (result.metadata) {
      html += `
        <div class="result-section">
          <h4>ℹ️ Comparison Metadata</h4>
          <div class="result-content">
            <p><strong>Comparison ID:</strong> ${
              result.comparison_id || "N/A"
            }</p>
            <p><strong>Execution Time:</strong> ${formatDuration(
              result.execution_time || 0
            )}</p>
            <p><strong>Trace ID:</strong> ${result.agent_trace_id || "N/A"}</p>
          </div>
        </div>
      `;
    }

    resultsContent.innerHTML = html;

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: "smooth" });
  },

  /**
   * Format side-by-side comparison
   */
  formatSideBySide(sideBySide) {
    let html = '<div class="side-by-side-comparison">';

    for (const [category, comparison] of Object.entries(sideBySide)) {
      html += `
        <div class="comparison-category">
          <h5>${category}</h5>
          <div class="comparison-row">
            <div class="comparison-col">
              <strong>Contract 1</strong>
              <p>${comparison.contract1 || "N/A"}</p>
            </div>
            <div class="comparison-col">
              <strong>Contract 2</strong>
              <p>${comparison.contract2 || "N/A"}</p>
            </div>
          </div>
        </div>
      `;
    }

    html += "</div>";
    return html;
  },

  /**
   * Format deviation analysis
   */
  formatDeviationAnalysis(deviationAnalysis) {
    let html = "";

    if (deviationAnalysis.overall_deviation_score !== undefined) {
      html += `<p><strong>Overall Deviation Score:</strong> ${deviationAnalysis.overall_deviation_score}%</p>`;
    }

    if (
      deviationAnalysis.deviations &&
      deviationAnalysis.deviations.length > 0
    ) {
      html += '<ul class="deviations-list">';
      deviationAnalysis.deviations.forEach((deviation) => {
        html += `<li>${deviation}</li>`;
      });
      html += "</ul>";
    }

    return html;
  },

  /**
   * Show loading state
   */
  showLoading() {
    const resultsSection = document.getElementById("compareResultsSection");
    const resultsContent = document.getElementById("compareResultsContent");

    if (resultsSection && resultsContent) {
      resultsSection.style.display = "block";
      resultsContent.innerHTML = createLoadingSpinner("large").outerHTML;
      resultsSection.scrollIntoView({ behavior: "smooth" });
    }
  },

  /**
   * Show error
   */
  showError(message) {
    const resultsSection = document.getElementById("compareResultsSection");
    const resultsContent = document.getElementById("compareResultsContent");

    if (resultsSection && resultsContent) {
      resultsSection.style.display = "block";
      resultsContent.innerHTML = createAlert(message, "error").outerHTML;
    }
  },

  /**
   * View trace in observability dashboard
   */
  viewTrace() {
    if (!this.currentComparison || !this.currentComparison.agent_trace_id) {
      showToast("Error", "No trace ID available", "error");
      return;
    }

    // Switch to observability tab
    if (window.app) {
      window.app.switchTab("observability");

      // Set trace ID and load
      setTimeout(() => {
        document.getElementById("traceIdInput").value =
          this.currentComparison.agent_trace_id;
        ObservabilityTab.loadTrace(this.currentComparison.agent_trace_id);
      }, 500);
    }
  },

  /**
   * Download results
   */
  downloadResults() {
    if (!this.currentComparison) {
      showToast("Error", "No results to download", "error");
      return;
    }

    const filename = `contract_comparison_${Date.now()}.json`;
    downloadJsonFile(this.currentComparison, filename);
    showToast("Downloaded", "Results downloaded successfully", "success", 2000);
  },

  /**
   * Clear form
   */
  clearForm() {
    if (this.textarea1) {
      this.textarea1.value = "";
    }
    if (this.textarea2) {
      this.textarea2.value = "";
    }
    this.clearFile(1);
    this.clearFile(2);
    document.getElementById("compareResultsSection").style.display = "none";
    this.currentComparison = null;
  },
};

// Make globally accessible
window.CompareTab = CompareTab;
