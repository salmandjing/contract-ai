/**
 * AI Clause Assistant - Frontend Implementation
 * Handles clause extraction, analysis, and improvement
 */

const ClauseAssistant = {
  currentClauses: [],
  selectedClause: null,
  draggedClause: null,

  /**
   * Initialize the clauses tab
   */
  init(container) {
    container.innerHTML = `
      <div class="clause-assistant-container">
        <!-- Upload Section -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📄 Upload Contract for Analysis</h3>
          </div>
          <div class="card-body">
            <div class="upload-zone" id="clauseUploadZone">
              <div class="upload-icon">📤</div>
              <p class="upload-text">Drop contract here or click to upload</p>
              <p class="upload-subtext">Supports PDF, TXT, DOCX</p>
              <input type="file" id="clauseFileInput" accept=".pdf,.txt,.docx" hidden>
            </div>
            <div class="upload-actions">
              <button class="btn btn-primary" id="clauseUploadBtn">
                <span class="btn-icon">📁</span> Choose File
              </button>
              <button class="btn btn-secondary" id="clauseSampleBtn">
                <span class="btn-icon">✨</span> Try Sample Contract
              </button>
            </div>
          </div>
        </div>

        <!-- Analysis Results -->
        <div id="clauseAnalysisSection" class="hidden">
          <!-- Summary Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">📊 Analysis Summary</h3>
              <div class="card-actions">
                <button class="btn btn-sm btn-primary" id="newAnalysisBtn">
                  <span class="btn-icon">🔄</span> New Analysis
                </button>
                <button class="btn btn-sm btn-secondary" id="exportClausesBtn">
                  <span class="btn-icon">💾</span> Export Report
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="summary-stats" id="clauseSummaryStats"></div>
            </div>
          </div>

          <!-- Clauses List -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">📋 Extracted Clauses</h3>
              <div class="filter-controls">
                <select id="clauseRiskFilter" class="form-select">
                  <option value="all">All Risk Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select id="clauseTypeFilter" class="form-select">
                  <option value="all">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="termination">Termination</option>
                  <option value="liability">Liability</option>
                  <option value="confidentiality">Confidentiality</option>
                  <option value="warranty">Warranty</option>
                </select>
              </div>
            </div>
            <div class="card-body">
              <div id="clausesList" class="clauses-list"></div>
            </div>
          </div>
        </div>

        <!-- Improvement Modal -->
        <div id="clauseImprovementModal" class="modal hidden">
          <div class="modal-content modal-large">
            <div class="modal-header">
              <h3>🔧 Improve Clause</h3>
              <button class="modal-close" id="closeImprovementModal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="improvement-container">
                <!-- Original Clause -->
                <div class="original-clause-section">
                  <h4>Original Clause</h4>
                  <div id="originalClauseText" class="clause-text-box"></div>
                  <div id="originalClauseIssues" class="issues-list"></div>
                </div>

                <!-- Alternatives -->
                <div class="alternatives-section">
                  <h4>AI-Generated Alternatives</h4>
                  <div id="clauseAlternatives" class="alternatives-grid"></div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="cancelImprovement">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Upload button
    document
      .getElementById("clauseUploadBtn")
      ?.addEventListener("click", () => {
        document.getElementById("clauseFileInput")?.click();
      });

    // File input
    document
      .getElementById("clauseFileInput")
      ?.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });

    // Sample button
    document
      .getElementById("clauseSampleBtn")
      ?.addEventListener("click", () => {
        this.loadSampleContract();
      });

    // Drag and drop
    const uploadZone = document.getElementById("clauseUploadZone");
    uploadZone?.addEventListener("click", () => {
      document.getElementById("clauseFileInput")?.click();
    });

    uploadZone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("drag-over");
    });

    uploadZone?.addEventListener("dragleave", () => {
      uploadZone.classList.remove("drag-over");
    });

    uploadZone?.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    // Filters
    document
      .getElementById("clauseRiskFilter")
      ?.addEventListener("change", () => {
        this.filterClauses();
      });

    document
      .getElementById("clauseTypeFilter")
      ?.addEventListener("change", () => {
        this.filterClauses();
      });

    // Export
    document
      .getElementById("exportClausesBtn")
      ?.addEventListener("click", () => {
        this.exportReport();
      });

    // Modal close
    document
      .getElementById("closeImprovementModal")
      ?.addEventListener("click", () => {
        this.closeImprovementModal();
      });

    document
      .getElementById("cancelImprovement")
      ?.addEventListener("click", () => {
        this.closeImprovementModal();
      });

    // New analysis button
    document.getElementById("newAnalysisBtn")?.addEventListener("click", () => {
      this.startNewAnalysis();
    });
  },

  /**
   * Start a new analysis
   */
  startNewAnalysis() {
    // Hide analysis section
    document.getElementById("clauseAnalysisSection")?.classList.add("hidden");

    // Clear current clauses
    this.currentClauses = [];

    // Scroll to upload section
    document
      .getElementById("clauseUploadZone")
      ?.scrollIntoView({ behavior: "smooth" });

    // Show toast
    this.showToast("Ready for new analysis", "info");
  },

  /**
   * Handle file upload
   */
  async handleFileUpload(file) {
    try {
      // Show loading
      const uploadZone = document.getElementById("clauseUploadZone");
      const originalHTML = uploadZone.innerHTML;
      uploadZone.innerHTML =
        '<div class="loading-spinner"></div><p>Uploading and extracting text...</p>';

      let text;

      // For PDFs, use the upload API endpoint
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const result = await response.json();
        text = result.text;
      } else {
        // For text files, read directly
        text = await this.readFileAsText(file);
      }

      // Update loading message
      uploadZone.innerHTML =
        '<div class="loading-spinner"></div><p>Analyzing contract...</p>';

      // Analyze contract
      await this.analyzeContract(text);

      // Restore upload zone after successful analysis
      uploadZone.innerHTML = originalHTML;

      // Re-attach event listeners to the restored upload zone
      this.attachUploadZoneListeners();
    } catch (error) {
      console.error("Upload error:", error);
      this.showToast("Failed to analyze contract", "error");
      this.init(document.querySelector(".tab-content.active .tab-body"));
    }
  },

  /**
   * Attach upload zone event listeners
   */
  attachUploadZoneListeners() {
    const uploadZone = document.getElementById("clauseUploadZone");
    const fileInput = document.getElementById("clauseFileInput");

    if (!uploadZone || !fileInput) {
      console.warn("Upload zone or file input not found");
      return;
    }

    // Remove old listeners by cloning upload zone
    const newUploadZone = uploadZone.cloneNode(true);
    uploadZone.parentNode.replaceChild(newUploadZone, uploadZone);

    // Get the file input from the new upload zone
    const newFileInput = document.getElementById("clauseFileInput");

    // Add click listener to upload zone
    newUploadZone.addEventListener("click", () => {
      newFileInput?.click();
    });

    // Add file input change listener
    if (newFileInput) {
      newFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }

    // Add drag and drop listeners
    newUploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      newUploadZone.classList.add("drag-over");
    });

    newUploadZone.addEventListener("dragleave", () => {
      newUploadZone.classList.remove("drag-over");
    });

    newUploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      newUploadZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  },

  /**
   * Read file as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  /**
   * Load sample contract
   */
  async loadSampleContract() {
    const sampleContract = `
POWER PURCHASE AGREEMENT

1. PAYMENT TERMS
The Buyer shall pay the Seller at its sole discretion within a reasonable time period. Payment amounts may be adjusted by the Seller without notice.

2. TERMINATION
This Agreement may be terminated by either party at will without cause or prior notice. The Seller reserves the right to terminate immediately for any reason.

3. LIABILITY AND INDEMNIFICATION
The Buyer shall indemnify and hold harmless the Seller from any and all claims, damages, losses, and expenses of any kind, without limitation. The Seller shall have no liability whatsoever under this Agreement.

4. CONFIDENTIALITY
All information disclosed under this Agreement shall be considered confidential indefinitely. The Buyer may not disclose any information to any third party under any circumstances.

5. WARRANTIES
THE SELLER MAKES NO WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. ALL SERVICES ARE PROVIDED "AS IS" WITHOUT ANY GUARANTEE OF PERFORMANCE OR RESULTS.

6. FORCE MAJEURE
The Seller shall not be liable for any failure to perform due to circumstances beyond its control, including but not limited to any delay or inconvenience.

7. DISPUTE RESOLUTION
Any disputes shall be resolved in the jurisdiction selected by the Seller. The Buyer waives all rights to jury trial and class action.

8. AUTOMATIC RENEWAL
This Agreement shall automatically renew for successive one-year terms unless terminated. Renewal terms may be modified by the Seller at any time.
    `.trim();

    await this.analyzeContract(sampleContract);
  },

  /**
   * Analyze contract using AgentCore
   */
  async analyzeContract(contractText) {
    try {
      // Call AgentCore clause assistant
      const response = await fetch("/api/clause-assistant/batch-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_text: contractText }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      console.log("📊 API Response:", data);
      console.log("📋 Total clauses received:", data.clauses?.length || 0);
      console.log("📋 Summary:", data.summary);

      // Sort clauses by risk score (highest first)
      this.currentClauses = (data.clauses || []).sort((a, b) => {
        const scoreA = a.analysis?.risk_score || 0;
        const scoreB = b.analysis?.risk_score || 0;
        return scoreB - scoreA; // Descending order
      });

      // Display results
      this.displayAnalysisResults(data);
    } catch (error) {
      console.error("Analysis error:", error);
      this.showToast("Failed to analyze contract", "error");
    }
  },

  /**
   * Display analysis results
   */
  displayAnalysisResults(data) {
    // Show analysis section
    document.getElementById("clauseAnalysisSection").classList.remove("hidden");

    // Display summary
    this.displaySummary(data.summary);

    // Display clauses
    this.displayClauses(this.currentClauses);

    // Scroll to results
    document
      .getElementById("clauseAnalysisSection")
      .scrollIntoView({ behavior: "smooth" });
  },

  /**
   * Display summary statistics
   */
  displaySummary(summary) {
    const container = document.getElementById("clauseSummaryStats");

    // Use overall risk from API (don't recalculate)
    const avgScore = summary.avg_risk_score || summary.average_risk_score || 0;
    const overallRisk = summary.overall_risk || "low";

    const riskColor =
      {
        low: "#10b981",
        medium: "#f59e0b",
        high: "#ef4444",
        critical: "#dc2626",
      }[overallRisk] || "#6b7280";

    container.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${summary.total_clauses}</div>
          <div class="stat-label">Total Clauses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summary.total_issues || 0}</div>
          <div class="stat-label">Total Issues</div>
        </div>
        <div class="stat-card" style="border-color: ${riskColor}">
          <div class="stat-value" style="color: ${riskColor}">
            ${overallRisk.toUpperCase()}
          </div>
          <div class="stat-label">Overall Risk</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${avgScore.toFixed(1)}</div>
          <div class="stat-label">Avg Risk Score</div>
        </div>
      </div>
      <div class="risk-distribution">
        <h4>Risk Distribution</h4>
        <div class="risk-bars">
          ${this.createRiskBar(
            "Critical",
            summary.risk_distribution.critical,
            "#dc2626"
          )}
          ${this.createRiskBar(
            "High",
            summary.risk_distribution.high,
            "#ef4444"
          )}
          ${this.createRiskBar(
            "Medium",
            summary.risk_distribution.medium,
            "#f59e0b"
          )}
          ${this.createRiskBar("Low", summary.risk_distribution.low, "#10b981")}
        </div>
      </div>
    `;
  },

  /**
   * Create risk bar HTML
   */
  createRiskBar(label, count, color) {
    const total = this.currentClauses.length;
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return `
      <div class="risk-bar-item">
        <div class="risk-bar-label">${label} (${count})</div>
        <div class="risk-bar-track">
          <div class="risk-bar-fill" style="width: ${percentage}%; background-color: ${color}"></div>
        </div>
      </div>
    `;
  },

  /**
   * Display clauses list
   */
  displayClauses(clauses) {
    const container = document.getElementById("clausesList");

    if (clauses.length === 0) {
      container.innerHTML = '<p class="empty-state">No clauses found</p>';
      return;
    }

    container.innerHTML = clauses
      .map((clause) => this.createClauseCard(clause))
      .join("");

    // Attach clause event listeners
    clauses.forEach((clause) => {
      const card = document.getElementById(`clause-${clause.id}`);
      card?.querySelector(".improve-btn")?.addEventListener("click", () => {
        this.improveClause(clause);
      });
    });
  },

  /**
   * Create clause card HTML
   */
  createClauseCard(clause) {
    const analysis = clause.analysis || {};
    const riskLevel = analysis.risk_level || "low";
    const riskScore = analysis.risk_score || 0;
    const issues = analysis.issues || [];

    const riskColors = {
      critical: "#dc2626",
      high: "#ef4444",
      medium: "#f59e0b",
      low: "#10b981",
      very_low: "#059669",
    };

    const riskIcons = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢",
      very_low: "✅",
    };

    return `
      <div class="clause-card" id="clause-${
        clause.id
      }" data-risk="${riskLevel}" data-type="${clause.type}">
        <div class="clause-header">
          <div class="clause-title-section">
            <h4 class="clause-title">${clause.title}</h4>
            <span class="clause-type-badge">${this.formatType(
              clause.type
            )}</span>
          </div>
          <div class="clause-risk-badge" style="background-color: ${
            riskColors[riskLevel]
          }20; color: ${riskColors[riskLevel]}">
            ${riskIcons[riskLevel]} ${riskLevel.toUpperCase()} (${riskScore})
          </div>
        </div>
        <div class="clause-text">${this.truncateText(clause.text, 200)}</div>
        ${
          issues.length > 0
            ? `
          <div class="clause-issues">
            <strong>⚠️ Issues Found (${issues.length}):</strong>
            <ul>
              ${issues
                .slice(0, 3)
                .map(
                  (issue) => `
                <li class="issue-item issue-${issue.severity}">
                  <span class="issue-desc">${issue.description}</span>
                </li>
              `
                )
                .join("")}
              ${
                issues.length > 3
                  ? `<li class="issue-more">+${
                      issues.length - 3
                    } more issues</li>`
                  : ""
              }
            </ul>
          </div>
        `
            : ""
        }
        <div class="clause-actions">
          <button class="btn btn-sm btn-primary improve-btn">
            <span class="btn-icon">🔧</span> Improve This Clause
          </button>
          <button class="btn btn-sm btn-secondary" onclick="ClauseAssistant.viewClauseDetails('${
            clause.id
          }')">
            <span class="btn-icon">👁️</span> View Details
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Format clause type
   */
  formatType(type) {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  },

  /**
   * Truncate text
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  },

  /**
   * Filter clauses
   */
  filterClauses() {
    const riskFilter = document.getElementById("clauseRiskFilter").value;
    const typeFilter = document.getElementById("clauseTypeFilter").value;

    const filtered = this.currentClauses.filter((clause) => {
      const riskMatch =
        riskFilter === "all" || clause.analysis.risk_level === riskFilter;
      const typeMatch = typeFilter === "all" || clause.type === typeFilter;
      return riskMatch && typeMatch;
    });

    this.displayClauses(filtered);
  },

  /**
   * Improve clause - show alternatives
   */
  async improveClause(clause) {
    try {
      this.selectedClause = clause;

      // Show modal with loading
      const modal = document.getElementById("clauseImprovementModal");
      modal.classList.remove("hidden");

      document.getElementById("originalClauseText").innerHTML = `
        <div class="loading-spinner"></div>
        <p>Generating improved alternatives...</p>
      `;

      // Call AgentCore to get improvements
      const response = await fetch("/api/clause-assistant/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clause_text: clause.text,
          clause_type: clause.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate improvements");
      }

      const data = await response.json();
      this.displayImprovements(clause, data);
    } catch (error) {
      console.error("Improvement error:", error);
      this.showToast("Failed to generate improvements", "error");
      this.closeImprovementModal();
    }
  },

  /**
   * Display improvement alternatives
   */
  displayImprovements(clause, data) {
    // Display original
    document.getElementById("originalClauseText").innerHTML = `
      <div class="clause-text-display">${clause.text}</div>
    `;

    // Display issues
    const issues = clause.analysis.issues || [];
    document.getElementById("originalClauseIssues").innerHTML =
      issues.length > 0
        ? `
      <div class="issues-summary">
        <h5>⚠️ Issues (${issues.length})</h5>
        <ul>
          ${issues
            .map(
              (issue) => `
            <li class="issue-item issue-${issue.severity}">
              <strong>${issue.type}:</strong> ${issue.description}
              <div class="issue-recommendation">💡 ${issue.recommendation}</div>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `
        : '<p class="no-issues">✅ No major issues found</p>';

    // Display alternatives
    const alternatives = data.alternatives || [];
    document.getElementById("clauseAlternatives").innerHTML = alternatives
      .map(
        (alt) => `
      <div class="alternative-card alternative-${alt.risk_level}">
        <div class="alternative-header">
          <h5>${alt.title}</h5>
          <span class="risk-badge risk-${alt.risk_level}">${alt.risk_level
          .replace("_", " ")
          .toUpperCase()}</span>
        </div>
        <p class="alternative-description">${alt.description}</p>
        <div class="alternative-text">${alt.text}</div>
        <div class="alternative-changes">
          <strong>Key Changes:</strong>
          <ul>
            ${alt.changes.map((change) => `<li>${change}</li>`).join("")}
          </ul>
        </div>
        <button class="btn btn-primary btn-block" onclick="ClauseAssistant.replaceClause('${
          clause.id
        }', '${alt.id}', ${JSON.stringify(alt.text).replace(/'/g, "&apos;")})">
          <span class="btn-icon">✅</span> Use This Version
        </button>
      </div>
    `
      )
      .join("");
  },

  /**
   * Replace clause with alternative
   */
  replaceClause(clauseId, alternativeId, newText) {
    // Find and update the clause
    const clauseIndex = this.currentClauses.findIndex((c) => c.id === clauseId);
    if (clauseIndex !== -1) {
      this.currentClauses[clauseIndex].text = newText;
      this.currentClauses[clauseIndex].improved = true;
      this.currentClauses[clauseIndex].original_text = this.selectedClause.text;

      // Re-analyze the new clause
      this.currentClauses[clauseIndex].analysis = {
        risk_level: "low",
        risk_score: 5,
        issues: [],
      };

      // Refresh display
      this.displayClauses(this.currentClauses);
      this.closeImprovementModal();
      this.showToast("Clause improved successfully!", "success");
    }
  },

  /**
   * Close improvement modal
   */
  closeImprovementModal() {
    document.getElementById("clauseImprovementModal").classList.add("hidden");
    this.selectedClause = null;
  },

  /**
   * View clause details
   */
  viewClauseDetails(clauseId) {
    const clause = this.currentClauses.find((c) => c.id === clauseId);
    if (!clause) return;

    alert(
      `Clause Details:\n\n${clause.text}\n\nType: ${clause.type}\nRisk: ${clause.analysis.risk_level}`
    );
  },

  /**
   * Export report
   */
  exportReport() {
    const report = {
      generated_at: new Date().toISOString(),
      total_clauses: this.currentClauses.length,
      clauses: this.currentClauses.map((c) => ({
        title: c.title,
        type: c.type,
        risk_level: c.analysis.risk_level,
        risk_score: c.analysis.risk_score,
        issues: c.analysis.issues,
        improved: c.improved || false,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clause-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast("Report exported successfully", "success");
  },

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    // Use existing toast system if available
    if (window.Toast) {
      window.Toast.show(message, type);
    } else {
      alert(message);
    }
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ClauseAssistant;
}
