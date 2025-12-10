/**
 * Contract Analysis Tab
 * Handles single contract analysis using AgentCore Runtime
 */

const AnalyzeTab = {
  container: null,
  currentAnalysis: null,

  /**
   * Initialize the analyze tab
   */
  async init(container) {
    this.container = container;
    console.log("Initializing Analyze tab...");

    try {
      await this.render();
    } catch (error) {
      console.error("Failed to initialize Analyze tab:", error);
      this.showError("Failed to load analysis form");
    }
  },

  /**
   * Render the analysis form
   */
  async render() {
    this.container.innerHTML = `
      <div class="analyze-container">
        <!-- Input Section -->
        <div class="input-section">
          <div class="input-tabs">
            <button class="input-tab-btn active" data-input="text">
              📝 Paste Text
            </button>
            <button class="input-tab-btn" data-input="file">
              📁 Upload File
            </button>
          </div>

          <!-- Text Input -->
          <div class="input-pane active" id="textInput">
            <div id="textAreaContainer"></div>
          </div>

          <!-- File Upload -->
          <div class="input-pane" id="fileInput">
            <div id="fileUploadContainer"></div>
            <div id="filePreview" style="display: none;">
              <div class="file-info">
                <span class="file-icon">📄</span>
                <span class="file-name" id="fileName"></span>
                <span class="file-size" id="fileSize"></span>
                <button class="btn btn-small btn-secondary" id="clearFile">
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Options -->
          <div class="analysis-options">
            <div class="option-group">
              <label for="backendType">Analysis Engine:</label>
              <select id="backendType" class="form-select">
                <option value="agentcore">⚙️ AgentCore</option>
                <option value="bedrock">🤖 Bedrock AI Agent</option>
              </select>
            </div>
            <div class="option-group">
              <label for="jurisdiction">Jurisdiction:</label>
              <select id="jurisdiction" class="form-select">
                <option value="US">United States</option>
                <option value="EU">European Union</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <div class="option-group">
              <label class="checkbox-label">
                <input type="checkbox" id="includeDeviation" checked />
                Include Deviation Analysis
              </label>
            </div>

            <div class="option-group">
              <label class="checkbox-label">
                <input type="checkbox" id="includeObligations" checked />
                Extract Obligations
              </label>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button id="analyzeButton" class="btn btn-primary btn-large">
              🔍 Analyze Contract
            </button>
            <button id="clearButton" class="btn btn-secondary">
              Clear
            </button>
          </div>
        </div>

        <!-- Results Section -->
        <div class="results-section" id="resultsSection" style="display: none;">
          <div class="results-header">
            <h3>Analysis Results</h3>
            <div class="results-actions">
              <button id="viewTraceButton" class="btn btn-secondary btn-small">
                📊 View Trace
              </button>
              <button id="downloadButton" class="btn btn-secondary btn-small">
                💾 Download
              </button>
              <button id="copyButton" class="btn btn-secondary btn-small">
                📋 Copy
              </button>
            </div>
          </div>
          <div id="resultsContent" class="results-content"></div>
        </div>
      </div>
    `;

    // Initialize components
    this.initializeTextArea();
    this.initializeFileUpload();
    this.setupEventListeners();
  },

  /**
   * Initialize text area
   */
  initializeTextArea() {
    const container = document.getElementById("textAreaContainer");
    if (!container) return;

    const { container: textAreaContainer, textarea } = createTextArea({
      placeholder: "Paste your contract text here...",
      rows: 15,
      maxLength: 1000000,
    });

    container.appendChild(textAreaContainer);
    this.textarea = textarea;
  },

  /**
   * Initialize file upload
   */
  initializeFileUpload() {
    const container = document.getElementById("fileUploadContainer");
    if (!container) return;

    const fileUpload = createFileUpload({
      accept: ".txt,.pdf,.doc,.docx",
      multiple: false,
      maxSize: 10 * 1024 * 1024,
      onFileSelect: (file) => this.handleFileSelect(file),
    });

    container.appendChild(fileUpload);
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Input tabs
    const inputTabs = document.querySelectorAll(".input-tab-btn");
    inputTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const inputType = tab.getAttribute("data-input");
        this.switchInputType(inputType);
      });
    });

    // Analyze button
    const analyzeButton = document.getElementById("analyzeButton");
    if (analyzeButton) {
      analyzeButton.addEventListener("click", () => this.analyzeContract());
    }

    // Clear button
    const clearButton = document.getElementById("clearButton");
    if (clearButton) {
      clearButton.addEventListener("click", () => this.clearForm());
    }

    // Clear file button
    const clearFileButton = document.getElementById("clearFile");
    if (clearFileButton) {
      clearFileButton.addEventListener("click", () => this.clearFile());
    }

    // View trace button
    const viewTraceButton = document.getElementById("viewTraceButton");
    if (viewTraceButton) {
      viewTraceButton.addEventListener("click", () => this.viewTrace());
    }

    // Download button
    const downloadButton = document.getElementById("downloadButton");
    if (downloadButton) {
      downloadButton.addEventListener("click", () => this.downloadResults());
    }

    // Copy button
    const copyButton = document.getElementById("copyButton");
    if (copyButton) {
      copyButton.addEventListener("click", () => this.copyResults());
    }
  },

  /**
   * Switch input type
   */
  switchInputType(type) {
    // Update tabs
    document.querySelectorAll(".input-tab-btn").forEach((btn) => {
      if (btn.getAttribute("data-input") === type) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Update panes
    document.querySelectorAll(".input-pane").forEach((pane) => {
      if (pane.id === `${type}Input`) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });
  },

  /**
   * Handle file selection
   */
  async handleFileSelect(file) {
    console.log("File selected:", file.name);

    try {
      // Show file preview
      document.getElementById("fileName").textContent = file.name;
      document.getElementById("fileSize").textContent = formatFileSize(
        file.size
      );
      document.getElementById("filePreview").style.display = "block";
      document.querySelector(".file-upload-dropzone").style.display = "none";

      // Store the file object
      this.selectedFile = file;
      this.fileName = file.name;

      // Extract text from file and show in textarea
      showToast(
        "Extracting Text",
        "Extracting text from file...",
        "info",
        2000
      );

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `${window.API_BASE_URL || "http://localhost:8080"}/api/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.text) {
          // Switch to text input tab and populate textarea
          const textTab = document.querySelector(
            '.input-tab-btn[data-input="text"]'
          );
          const textInput = document.getElementById("textInput");
          const fileInput = document.getElementById("fileInput");
          const textarea = document.getElementById("contractText");

          if (textTab && textInput && textarea) {
            // Switch tabs
            document
              .querySelectorAll(".input-tab-btn")
              .forEach((btn) => btn.classList.remove("active"));
            textTab.classList.add("active");
            document
              .querySelectorAll(".input-pane")
              .forEach((pane) => pane.classList.remove("active"));
            textInput.classList.add("active");

            // Populate textarea
            textarea.value = result.text;

            showToast(
              "Text Extracted",
              `Extracted ${result.text.length} characters. Review and click Analyze.`,
              "success",
              3000
            );
          }
        } else {
          throw new Error(result.error || "Failed to extract text");
        }
      } catch (extractError) {
        console.error("Text extraction failed:", extractError);
        showToast(
          "Extraction Error",
          `Failed to extract text: ${extractError.message}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Failed to load file:", error);
      showToast("Error", "Failed to load file. Please try again.", "error");
    }
  },

  /**
   * Clear file
   */
  clearFile() {
    this.selectedFile = null;
    this.fileName = null;
    document.getElementById("filePreview").style.display = "none";
    document.querySelector(".file-upload-dropzone").style.display = "flex";
  },

  /**
   * Analyze contract
   */
  async analyzeContract() {
    // Get contract text or file
    const activeInput = document.querySelector(".input-pane.active");
    let contractText;
    let isFileUpload = false;

    if (activeInput.id === "textInput") {
      contractText = this.textarea.value;
      // Validate text input
      const validation = validateContractText(contractText);
      if (!validation.valid) {
        showToast("Validation Error", validation.error, "error");
        return;
      }
      contractText = validation.text;
    } else {
      // File upload mode
      if (!this.selectedFile) {
        showToast(
          "Validation Error",
          "Please select a file to upload",
          "error"
        );
        return;
      }
      isFileUpload = true;
    }

    // Get options
    const backendType = document.getElementById("backendType").value;
    const jurisdiction = document.getElementById("jurisdiction").value;
    const includeDeviation =
      document.getElementById("includeDeviation").checked;
    const includeObligations =
      document.getElementById("includeObligations").checked;

    // Show loading
    this.showLoading();

    try {
      console.log(`Starting contract analysis with ${backendType}...`);

      let result;

      // Check if using Bedrock
      if (backendType === "bedrock") {
        // Use Bedrock Agent
        if (isFileUpload) {
          // Extract text from file first
          const fileText = await apiClient.extractTextFromFile(
            this.selectedFile
          );
          contractText = fileText.text;
        }

        result = await apiClient.analyzeWithBedrock(contractText);
      } else {
        // Use AgentCore (existing logic)
        if (isFileUpload) {
          // Upload file for analysis
          result = await apiClient.uploadAndAnalyzeContract(
            this.selectedFile,
            jurisdiction,
            {
              includeDeviationAnalysis: includeDeviation,
              includeObligationExtraction: includeObligations,
              userId: authManager.getUserInfo()?.sub || "anonymous",
              sessionId: apiClient.generateSessionId(),
            }
          );
        } else {
          // Analyze text directly
          result = await apiClient.analyzeContract(contractText, jurisdiction, {
            includeDeviationAnalysis: includeDeviation,
            includeObligationExtraction: includeObligations,
            userId: authManager.getUserInfo()?.sub || "anonymous",
            sessionId: apiClient.generateSessionId(),
          });
        }
      }

      // Store result
      this.currentAnalysis = result;

      // Log the result for debugging
      console.log("Analysis result received:", result);
      console.log("Result structure:", Object.keys(result));

      // Check if we need to extract analysis_result
      const analysisData = result.analysis_result || result;
      console.log("Analysis data to display:", analysisData);

      // Display results
      this.displayResults(analysisData);

      showToast(
        "Analysis Complete",
        "Contract analyzed successfully",
        "success"
      );
    } catch (error) {
      console.error("Analysis failed:", error);
      this.showError(
        error.message || "Failed to analyze contract. Please try again."
      );
      showToast(
        "Analysis Failed",
        error.message || "An error occurred",
        "error"
      );
    }
  },

  /**
   * Display analysis results
   */
  displayResults(result) {
    const resultsSection = document.getElementById("resultsSection");
    const resultsContent = document.getElementById("resultsContent");

    if (!resultsSection || !resultsContent) return;

    // Show results section
    resultsSection.style.display = "block";

    // Format results
    let html = "";

    // Executive Summary (use summary field if executive_summary not present)
    const summary = result.executive_summary || result.summary;
    if (summary) {
      html += `
        <div class="result-section">
          <h4>📋 Executive Summary</h4>
          <div class="result-content">${parseMarkdown(summary)}</div>
        </div>
      `;
    }

    // Parties (from Bedrock response)
    if (result.parties && result.parties.length > 0) {
      html += `
        <div class="result-section">
          <h4>👥 Parties</h4>
          <div class="result-content">
            <ul>
              ${result.parties.map((party) => `<li>${party}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }

    // Key Terms
    if (result.key_terms) {
      html += `
        <div class="result-section">
          <h4>🔑 Key Terms</h4>
          <div class="result-content">
            ${this.formatKeyTerms(result.key_terms)}
          </div>
        </div>
      `;
    }

    // Risks (from Bedrock response)
    if (result.risks && result.risks.length > 0) {
      html += `
        <div class="result-section">
          <h4>⚠️ Risks</h4>
          <div class="result-content">
            <ul>
              ${result.risks.map((risk) => `<li>${risk}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }

    // Risk Assessment (legacy format)
    if (result.risk_assessment) {
      html += `
        <div class="result-section">
          <h4>⚠️ Risk Assessment</h4>
          <div class="result-content">
            ${this.formatRiskAssessment(result.risk_assessment)}
          </div>
        </div>
      `;
    }

    // Compliance Analysis
    if (result.compliance_analysis) {
      html += `
        <div class="result-section">
          <h4>✅ Compliance Analysis</h4>
          <div class="result-content">
            ${parseMarkdown(result.compliance_analysis)}
          </div>
        </div>
      `;
    }

    // Deviation Analysis
    if (result.deviation_analysis) {
      html += `
        <div class="result-section">
          <h4>🔍 Deviation Analysis</h4>
          <div class="result-content">
            ${this.formatDeviationAnalysis(result.deviation_analysis)}
          </div>
        </div>
      `;
    }

    // Obligations (from Bedrock response - simple list)
    if (result.obligations && result.obligations.length > 0) {
      // Check if obligations are simple strings or objects
      const isSimpleList = typeof result.obligations[0] === "string";

      if (isSimpleList) {
        html += `
          <div class="result-section">
            <h4>📝 Obligations</h4>
            <div class="result-content">
              <ul>
                ${result.obligations.map((obl) => `<li>${obl}</li>`).join("")}
              </ul>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="result-section">
            <h4>📝 Obligations</h4>
            <div class="result-content">
              ${this.formatObligations(result.obligations)}
            </div>
          </div>
        `;
      }
    }

    // Recommendations (from Bedrock response)
    if (result.recommendations && result.recommendations.length > 0) {
      html += `
        <div class="result-section">
          <h4>💡 Recommendations</h4>
          <div class="result-content">
            <ul>
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
          <h4>ℹ️ Analysis Metadata</h4>
          <div class="result-content">
            <p><strong>Analysis ID:</strong> ${result.analysis_id || "N/A"}</p>
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
   * Format key terms
   */
  formatKeyTerms(keyTerms) {
    let html = '<ul class="key-terms-list">';
    for (const [key, value] of Object.entries(keyTerms)) {
      html += `<li><strong>${key}:</strong> ${value}</li>`;
    }
    html += "</ul>";
    return html;
  },

  /**
   * Format risk assessment
   */
  formatRiskAssessment(riskAssessment) {
    let html = "";

    if (riskAssessment.risk_score !== undefined) {
      const riskLevel = this.getRiskLevel(riskAssessment.risk_score);
      html += `
        <div class="risk-score">
          <span class="risk-label">Risk Score:</span>
          <span class="risk-value ${riskLevel.class}">${riskAssessment.risk_score}/100</span>
          <span class="risk-badge ${riskLevel.class}">${riskLevel.label}</span>
        </div>
      `;
    }

    if (riskAssessment.risks && riskAssessment.risks.length > 0) {
      html += '<ul class="risks-list">';
      riskAssessment.risks.forEach((risk) => {
        html += `<li>${risk}</li>`;
      });
      html += "</ul>";
    }

    return html;
  },

  /**
   * Get risk level
   */
  getRiskLevel(score) {
    if (score >= 75) {
      return { label: "High Risk", class: "risk-high" };
    } else if (score >= 50) {
      return { label: "Medium Risk", class: "risk-medium" };
    } else if (score >= 25) {
      return { label: "Low Risk", class: "risk-low" };
    } else {
      return { label: "Minimal Risk", class: "risk-minimal" };
    }
  },

  /**
   * Format deviation analysis
   */
  formatDeviationAnalysis(deviationAnalysis) {
    let html = "";

    if (deviationAnalysis.deviation_score !== undefined) {
      html += `<p><strong>Deviation Score:</strong> ${deviationAnalysis.deviation_score}%</p>`;
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
   * Format obligations
   */
  formatObligations(obligations) {
    let html = '<div class="obligations-list">';
    obligations.forEach((obligation, index) => {
      html += `
        <div class="obligation-item">
          <div class="obligation-header">
            <strong>Obligation ${index + 1}</strong>
          </div>
          <div class="obligation-body">
            <p>${obligation.description || obligation}</p>
            ${
              obligation.deadline
                ? `<p><strong>Deadline:</strong> ${obligation.deadline}</p>`
                : ""
            }
            ${
              obligation.party
                ? `<p><strong>Responsible Party:</strong> ${obligation.party}</p>`
                : ""
            }
          </div>
        </div>
      `;
    });
    html += "</div>";
    return html;
  },

  /**
   * Show loading state
   */
  showLoading() {
    const resultsSection = document.getElementById("resultsSection");
    const resultsContent = document.getElementById("resultsContent");

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
    const resultsSection = document.getElementById("resultsSection");
    const resultsContent = document.getElementById("resultsContent");

    if (resultsSection && resultsContent) {
      resultsSection.style.display = "block";
      resultsContent.innerHTML = createAlert(message, "error").outerHTML;
    }
  },

  /**
   * View trace in observability dashboard
   */
  viewTrace() {
    if (!this.currentAnalysis || !this.currentAnalysis.agent_trace_id) {
      showToast("Error", "No trace ID available", "error");
      return;
    }

    // Switch to observability tab
    if (window.app) {
      window.app.switchTab("observability");

      // Set trace ID and load
      setTimeout(() => {
        document.getElementById("traceIdInput").value =
          this.currentAnalysis.agent_trace_id;
        ObservabilityTab.loadTrace(this.currentAnalysis.agent_trace_id);
      }, 500);
    }
  },

  /**
   * Download results
   */
  downloadResults() {
    if (!this.currentAnalysis) {
      showToast("Error", "No results to download", "error");
      return;
    }

    const filename = `contract_analysis_${Date.now()}.json`;
    downloadJsonFile(this.currentAnalysis, filename);
    showToast("Downloaded", "Results downloaded successfully", "success", 2000);
  },

  /**
   * Copy results to clipboard
   */
  async copyResults() {
    if (!this.currentAnalysis) {
      showToast("Error", "No results to copy", "error");
      return;
    }

    const text = JSON.stringify(this.currentAnalysis, null, 2);
    await copyToClipboard(text);
  },

  /**
   * Clear form
   */
  clearForm() {
    if (this.textarea) {
      this.textarea.value = "";
    }
    this.clearFile();
    document.getElementById("resultsSection").style.display = "none";
    this.currentAnalysis = null;
  },
};

// Make globally accessible
window.AnalyzeTab = AnalyzeTab;
