/**
 * Observability Dashboard Tab
 * Displays agent metrics, traces, and tool usage statistics
 */

const ObservabilityTab = {
  container: null,
  refreshInterval: null,
  currentTimeRange: "1h",

  /**
   * Initialize the observability tab
   */
  async init(container) {
    this.container = container;
    console.log("Initializing Observability tab...");

    try {
      await this.render();
      this.startAutoRefresh();
    } catch (error) {
      console.error("Failed to initialize Observability tab:", error);
      this.showError("Failed to load observability dashboard");
    }
  },

  /**
   * Render the observability dashboard
   */
  async render() {
    this.container.innerHTML = `
      <div class="observability-dashboard">
        <!-- Time Range Selector -->
        <div class="dashboard-controls">
          <label for="timeRange">Time Range:</label>
          <select id="timeRange" class="form-select">
            <option value="15m">Last 15 minutes</option>
            <option value="1h" selected>Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button id="refreshDashboard" class="btn btn-secondary">
            🔄 Refresh
          </button>
        </div>

        <!-- Metrics Overview -->
        <div class="metrics-section">
          <h3>📊 Agent Performance Metrics</h3>
          <div id="metricsGrid" class="metrics-grid">
            ${createLoadingSpinner().outerHTML}
          </div>
        </div>

        <!-- Tool Usage Statistics -->
        <div class="tools-section">
          <h3>🔧 Tool Usage Statistics</h3>
          <div id="toolsStats" class="tools-stats">
            ${createLoadingSpinner().outerHTML}
          </div>
        </div>

        <!-- Recent Analyses -->
        <div class="analyses-section">
          <h3>📝 Recent Analyses</h3>
          <div id="recentAnalyses" class="recent-analyses">
            ${createLoadingSpinner().outerHTML}
          </div>
        </div>

        <!-- Trace Viewer -->
        <div class="trace-section">
          <h3>🔍 Trace Viewer</h3>
          <div class="trace-search">
            <input
              type="text"
              id="traceIdInput"
              class="form-input"
              placeholder="Enter trace ID to view details..."
            />
            <button id="searchTrace" class="btn btn-primary">Search</button>
          </div>
          <div id="traceViewer" class="trace-viewer"></div>
        </div>
      </div>
    `;

    // Set up event listeners
    this.setupEventListeners();

    // Load initial data
    await this.loadDashboardData();
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Time range selector
    const timeRangeSelect = document.getElementById("timeRange");
    if (timeRangeSelect) {
      timeRangeSelect.addEventListener("change", async (e) => {
        this.currentTimeRange = e.target.value;
        await this.loadDashboardData();
      });
    }

    // Refresh button
    const refreshButton = document.getElementById("refreshDashboard");
    if (refreshButton) {
      refreshButton.addEventListener("click", async () => {
        await this.loadDashboardData();
        showToast("Refreshed", "Dashboard data updated", "success", 2000);
      });
    }

    // Trace search
    const searchButton = document.getElementById("searchTrace");
    if (searchButton) {
      searchButton.addEventListener("click", async () => {
        const traceId = document.getElementById("traceIdInput").value.trim();
        if (traceId) {
          await this.loadTrace(traceId);
        }
      });
    }

    // Enter key for trace search
    const traceInput = document.getElementById("traceIdInput");
    if (traceInput) {
      traceInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
          const traceId = e.target.value.trim();
          if (traceId) {
            await this.loadTrace(traceId);
          }
        }
      });
    }
  },

  /**
   * Load all dashboard data
   */
  async loadDashboardData() {
    await Promise.all([
      this.loadMetrics(),
      this.loadToolStats(),
      this.loadRecentAnalyses(),
    ]);
  },

  /**
   * Load agent metrics
   */
  async loadMetrics() {
    const metricsGrid = document.getElementById("metricsGrid");
    if (!metricsGrid) return;

    try {
      const metrics = await apiClient.getAgentMetrics(this.currentTimeRange);

      metricsGrid.innerHTML = "";

      // Create metric cards
      const metricCards = [
        {
          label: "Total Analyses",
          value: metrics.total_analyses || 0,
          icon: "📊",
          trend: metrics.analyses_trend || null,
        },
        {
          label: "Success Rate",
          value: `${(metrics.success_rate || 0).toFixed(1)}%`,
          icon: "✅",
          trend: metrics.success_rate_trend || null,
        },
        {
          label: "Avg Response Time",
          value: formatDuration(metrics.avg_response_time || 0),
          icon: "⏱️",
          trend: metrics.response_time_trend || null,
        },
        {
          label: "Active Sessions",
          value: metrics.active_sessions || 0,
          icon: "👥",
          trend: null,
        },
        {
          label: "Tool Invocations",
          value: metrics.total_tool_calls || 0,
          icon: "🔧",
          trend: metrics.tool_calls_trend || null,
        },
        {
          label: "Error Rate",
          value: `${(metrics.error_rate || 0).toFixed(1)}%`,
          icon: "❌",
          trend: metrics.error_rate_trend || null,
        },
      ];

      metricCards.forEach((card) => {
        metricsGrid.appendChild(
          createMetricCard(card.label, card.value, card.icon, card.trend)
        );
      });
    } catch (error) {
      console.error("Failed to load metrics:", error);
      metricsGrid.innerHTML = createAlert(
        "Failed to load metrics. Please try again.",
        "error"
      ).outerHTML;
    }
  },

  /**
   * Load tool usage statistics
   */
  async loadToolStats() {
    const toolsStats = document.getElementById("toolsStats");
    if (!toolsStats) return;

    try {
      const stats = await apiClient.getToolUsageStats(this.currentTimeRange);

      if (!stats.tools || stats.tools.length === 0) {
        toolsStats.innerHTML = createAlert(
          "No tool usage data available for this time range.",
          "info"
        ).outerHTML;
        return;
      }

      // Create table
      const headers = [
        "Tool Name",
        "Invocations",
        "Success Rate",
        "Avg Duration",
        "Last Used",
      ];
      const rows = stats.tools.map((tool) => [
        tool.name,
        tool.invocations.toLocaleString(),
        `${(tool.success_rate * 100).toFixed(1)}%`,
        formatDuration(tool.avg_duration),
        formatDate(tool.last_used),
      ]);

      toolsStats.innerHTML = "";
      toolsStats.appendChild(
        createTable(headers, rows, {
          sortable: true,
          onRowClick: (row, index) => {
            this.showToolDetails(stats.tools[index]);
          },
        })
      );
    } catch (error) {
      console.error("Failed to load tool stats:", error);
      toolsStats.innerHTML = createAlert(
        "Failed to load tool statistics. Please try again.",
        "error"
      ).outerHTML;
    }
  },

  /**
   * Load recent analyses
   */
  async loadRecentAnalyses() {
    const recentAnalyses = document.getElementById("recentAnalyses");
    if (!recentAnalyses) return;

    try {
      const analyses = await apiClient.getRecentAnalyses(10);

      if (!analyses.analyses || analyses.analyses.length === 0) {
        recentAnalyses.innerHTML = createAlert(
          "No recent analyses found.",
          "info"
        ).outerHTML;
        return;
      }

      // Create table
      const headers = [
        "Analysis ID",
        "Type",
        "Status",
        "Duration",
        "Timestamp",
        "Actions",
      ];
      const rows = analyses.analyses.map((analysis) => [
        truncateText(analysis.analysis_id, 20),
        analysis.contract_type || "Unknown",
        this.createStatusBadge(analysis.status),
        formatDuration(analysis.duration),
        formatDate(analysis.timestamp),
        `<button class="btn btn-small btn-secondary" onclick="ObservabilityTab.viewTrace('${analysis.trace_id}')">View Trace</button>`,
      ]);

      recentAnalyses.innerHTML = "";
      recentAnalyses.appendChild(createTable(headers, rows));
    } catch (error) {
      console.error("Failed to load recent analyses:", error);
      recentAnalyses.innerHTML = createAlert(
        "Failed to load recent analyses. Please try again.",
        "error"
      ).outerHTML;
    }
  },

  /**
   * Load and display trace
   */
  async loadTrace(traceId) {
    const traceViewer = document.getElementById("traceViewer");
    if (!traceViewer) return;

    traceViewer.innerHTML = createLoadingSpinner().outerHTML;

    try {
      const trace = await apiClient.getAgentTrace(traceId);

      if (!trace || !trace.spans) {
        traceViewer.innerHTML = createAlert(
          "Trace not found or no data available.",
          "warning"
        ).outerHTML;
        return;
      }

      // Render trace visualization
      traceViewer.innerHTML = this.renderTraceVisualization(trace);
    } catch (error) {
      console.error("Failed to load trace:", error);
      traceViewer.innerHTML = createAlert(
        "Failed to load trace. Please check the trace ID and try again.",
        "error"
      ).outerHTML;
    }
  },

  /**
   * Render trace visualization
   */
  renderTraceVisualization(trace) {
    let html = '<div class="trace-details">';

    // Trace header
    html += `
      <div class="trace-header">
        <h4>Trace: ${trace.trace_id}</h4>
        <div class="trace-meta">
          <span>Duration: ${formatDuration(trace.duration)}</span>
          <span>Spans: ${trace.spans.length}</span>
          <span>Status: ${this.createStatusBadge(trace.status)}</span>
        </div>
      </div>
    `;

    // Trace timeline
    html += '<div class="trace-timeline">';

    const startTime = trace.start_time;
    const totalDuration = trace.duration;

    trace.spans.forEach((span) => {
      const offset = ((span.start_time - startTime) / totalDuration) * 100;
      const width = (span.duration / totalDuration) * 100;
      const color = this.getSpanColor(span.type);

      html += `
        <div class="trace-span" style="left: ${offset}%; width: ${width}%; background: ${color};" 
             title="${span.name} - ${formatDuration(span.duration)}">
          <div class="span-label">${span.name}</div>
        </div>
      `;
    });

    html += "</div>";

    // Span details
    html += '<div class="span-details">';
    html += "<h5>Span Details</h5>";

    trace.spans.forEach((span) => {
      html += `
        <div class="span-item">
          <div class="span-item-header">
            <strong>${span.name}</strong>
            <span class="span-duration">${formatDuration(span.duration)}</span>
          </div>
          <div class="span-item-body">
            <div><strong>Type:</strong> ${span.type}</div>
            <div><strong>Status:</strong> ${span.status}</div>
            ${
              span.attributes
                ? `<div><strong>Attributes:</strong> <pre>${JSON.stringify(
                    span.attributes,
                    null,
                    2
                  )}</pre></div>`
                : ""
            }
          </div>
        </div>
      `;
    });

    html += "</div>";
    html += "</div>";

    return html;
  },

  /**
   * Get color for span type
   */
  getSpanColor(type) {
    const colors = {
      agent: "#667eea",
      tool: "#48bb78",
      memory: "#ed8936",
      gateway: "#4299e1",
      default: "#718096",
    };
    return colors[type] || colors.default;
  },

  /**
   * Create status badge
   */
  createStatusBadge(status) {
    const statusMap = {
      success: { text: "Success", type: "success" },
      completed: { text: "Completed", type: "success" },
      failed: { text: "Failed", type: "error" },
      error: { text: "Error", type: "error" },
      pending: { text: "Pending", type: "warning" },
      running: { text: "Running", type: "info" },
    };

    const statusInfo = statusMap[status] || { text: status, type: "default" };
    return createBadge(statusInfo.text, statusInfo.type).outerHTML;
  },

  /**
   * View trace (called from table)
   */
  viewTrace(traceId) {
    document.getElementById("traceIdInput").value = traceId;
    this.loadTrace(traceId);

    // Scroll to trace viewer
    document
      .querySelector(".trace-section")
      .scrollIntoView({ behavior: "smooth" });
  },

  /**
   * Show tool details modal
   */
  showToolDetails(tool) {
    const content = `
      <div class="tool-details">
        <p><strong>Tool Name:</strong> ${tool.name}</p>
        <p><strong>Total Invocations:</strong> ${tool.invocations.toLocaleString()}</p>
        <p><strong>Success Rate:</strong> ${(tool.success_rate * 100).toFixed(
          1
        )}%</p>
        <p><strong>Average Duration:</strong> ${formatDuration(
          tool.avg_duration
        )}</p>
        <p><strong>Min Duration:</strong> ${formatDuration(
          tool.min_duration
        )}</p>
        <p><strong>Max Duration:</strong> ${formatDuration(
          tool.max_duration
        )}</p>
        <p><strong>Last Used:</strong> ${formatDate(tool.last_used)}</p>
        ${
          tool.description
            ? `<p><strong>Description:</strong> ${tool.description}</p>`
            : ""
        }
      </div>
    `;

    showModal(`Tool Details: ${tool.name}`, content, [
      {
        label: "Close",
        class: "btn-secondary",
        action: "close",
        handler: () => {},
      },
    ]);
  },

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(async () => {
      await this.loadDashboardData();
    }, 30000);
  },

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },

  /**
   * Show error message
   */
  showError(message) {
    this.container.innerHTML = createAlert(message, "error").outerHTML;
  },
};

// Make globally accessible
window.ObservabilityTab = ObservabilityTab;
