/* ============================================
   Contract AI Platform V3 - Performance Integration
   This file contains the performance-optimized versions of key functions
   ============================================ */

/**
 * Performance-optimized ContractAIApp class extensions
 * These methods should be integrated into the main ContractAIApp class
 */

const PerformanceIntegration = {
  /**
   * Initialize app with performance optimizations
   */
  initWithPerformance() {
    console.log(
      "Initializing Contract AI Platform V3 with performance optimizations..."
    );

    // Initialize performance module
    Performance.init();

    // Initialize tooltips
    Utils.initTooltips();

    // Check API connection
    this.checkConnection();

    // Setup tab navigation with lazy loading
    this.setupTabNavigationOptimized();

    // Initialize the first tab (lazy loaded)
    this.loadTabOptimized("analyze");

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

    // Log performance metrics periodically (dev mode)
    if (window.location.hostname === "localhost") {
      setInterval(() => {
        Performance.logMetrics();
      }, 60000); // Every minute
    }

    console.log(
      "Application initialized successfully with performance optimizations"
    );
  },

  /**
   * Optimized tab navigation setup
   */
  setupTabNavigationOptimized() {
    const tabButtons = document.querySelectorAll(".tab-button");

    tabButtons.forEach((button) => {
      Performance.addEventListener(button, "click", () => {
        const tabName = button.dataset.tab;
        this.switchTabOptimized(tabName);
      });
    });
  },

  /**
   * Optimized tab switching with lazy loading
   */
  switchTabOptimized(tabName) {
    // Batch DOM updates for better performance
    Performance.batchDOMUpdates(() => {
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
    });

    // Load tab content with lazy loading
    this.currentTab = tabName;
    this.loadTabOptimized(tabName);

    // Update URL
    Utils.setQueryParam("tab", tabName);

    // Clear cache for previous tab if needed
    if (this.previousTab && this.previousTab !== tabName) {
      Performance.clearCache(this.previousTab);
    }
    this.previousTab = tabName;
  },

  /**
   * Lazy load tab content
   */
  loadTabOptimized(tabName) {
    const tabContent = document
      .getElementById(`${tabName}Tab`)
      .querySelector(".tab-body");

    // Check if already loaded
    if (tabContent.children.length > 0) {
      return;
    }

    // Use lazy loading
    Performance.lazyLoadTab(tabName, () => {
      return Performance.measureAsync(`Load ${tabName} tab`, async () => {
        // Load tab-specific content
        switch (tabName) {
          case "analyze":
            this.loadAnalyzeTab(tabContent);
            break;
          case "batch":
            this.loadBatchTab(tabContent);
            break;
          case "obligations":
            this.loadObligationsTabOptimized(tabContent);
            break;
          case "compare":
            this.loadCompareTab(tabContent);
            break;
          case "generate":
            this.loadGenerateTabOptimized(tabContent);
            break;
          case "clauses":
            this.loadClausesTabOptimized(tabContent);
            break;
        }
      });
    });
  },

  /**
   * Optimized obligations tab with virtual scrolling
   */
  loadObligationsTabOptimized(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📅 Extract Obligations</h3>
          <p class="card-subtitle">Extract obligations from contract text</p>
        </div>
        <div class="card-body">
          <div class="form-group">
            <textarea id="obligationsContractText" 
                      class="form-textarea" 
                      placeholder="Paste contract text here..."></textarea>
          </div>
          <button id="extractObligationsBtn" class="btn btn-primary btn-full btn-lg">
            📅 Extract Obligations
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🗂️ Obligations Dashboard</h3>
          <div class="card-actions">
            <input type="text" 
                   id="obligationsSearch" 
                   class="form-input" 
                   placeholder="Search obligations..."
                   style="width: 300px;">
          </div>
        </div>
        <div class="card-body">
          <div class="filters-row">
            <select id="obligationsTypeFilter" class="form-select">
              <option value="">All Types</option>
              <option value="payment">Payment</option>
              <option value="delivery">Delivery</option>
              <option value="renewal">Renewal</option>
              <option value="termination">Termination</option>
              <option value="reporting">Reporting</option>
            </select>
            <select id="obligationsStatusFilter" class="form-select">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
            <button id="refreshObligationsBtn" class="btn btn-secondary">
              🔄 Refresh
            </button>
          </div>
          <div id="obligationsList" class="obligations-list"></div>
        </div>
      </div>
    `;

    // Setup debounced search
    const searchInput = document.getElementById("obligationsSearch");
    const debouncedSearch = Performance.debounce((value) => {
      this.filterObligations(value);
    }, 300);

    Performance.addEventListener(searchInput, "input", (e) => {
      debouncedSearch(e.target.value);
    });

    // Setup extract button
    Performance.addEventListener(
      document.getElementById("extractObligationsBtn"),
      "click",
      () => this.extractObligations()
    );

    // Setup filter handlers
    Performance.addEventListener(
      document.getElementById("obligationsTypeFilter"),
      "change",
      () => this.loadObligationsList()
    );

    Performance.addEventListener(
      document.getElementById("obligationsStatusFilter"),
      "change",
      () => this.loadObligationsList()
    );

    Performance.addEventListener(
      document.getElementById("refreshObligationsBtn"),
      "click",
      () => {
        Performance.clearCache("obligations");
        this.loadObligationsList();
      }
    );

    // Load obligations list
    this.loadObligationsList();
  },

  /**
   * Load obligations with caching and virtual scrolling
   */
  async loadObligationsList() {
    const container = document.getElementById("obligationsList");
    const typeFilter = document.getElementById("obligationsTypeFilter").value;
    const statusFilter = document.getElementById(
      "obligationsStatusFilter"
    ).value;

    LoadingSpinner.show(container, "Loading obligations...");

    try {
      // Use cached response if available
      const cacheKey = { endpoint: "obligations", typeFilter, statusFilter };

      const obligations = await Performance.deduplicateRequest(
        cacheKey,
        async () => {
          const result = await API.obligations.getAll();
          return result.obligations || [];
        }
      );

      // Filter obligations
      let filtered = obligations;
      if (typeFilter) {
        filtered = filtered.filter((o) => o.type === typeFilter);
      }
      if (statusFilter) {
        filtered = filtered.filter((o) => o.status === statusFilter);
      }

      // Use virtual scrolling for large lists
      if (filtered.length > 50) {
        this.renderObligationsVirtual(container, filtered);
      } else {
        this.renderObligationsStandard(container, filtered);
      }
    } catch (error) {
      container.innerHTML = `
        <div class="alert alert-error">
          <strong>Failed to load obligations</strong>
          <p>${Utils.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  },

  /**
   * Render obligations with virtual scrolling
   */
  renderObligationsVirtual(container, obligations) {
    container.innerHTML = "";

    const virtualScroller = Performance.createVirtualScroller(
      container,
      obligations,
      (obligation) => {
        const div = document.createElement("div");
        div.className = "obligation-item";
        div.innerHTML = this.renderObligationItem(obligation);
        return div;
      },
      {
        itemHeight: 80,
        containerHeight: 600,
        bufferSize: 10,
      }
    );

    // Store reference for cleanup
    this.currentVirtualScroller = virtualScroller;
  },

  /**
   * Render obligations standard way (for smaller lists)
   */
  renderObligationsStandard(container, obligations) {
    if (obligations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3 class="empty-state-title">No Obligations Found</h3>
          <p class="empty-state-message">Extract obligations from a contract to get started.</p>
        </div>
      `;
      return;
    }

    // Use document fragment for efficient DOM insertion
    const fragment = document.createDocumentFragment();

    obligations.forEach((obligation) => {
      const div = document.createElement("div");
      div.className = "obligation-item";
      div.innerHTML = this.renderObligationItem(obligation);
      fragment.appendChild(div);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  },

  /**
   * Render single obligation item
   */
  renderObligationItem(obligation) {
    const statusClass =
      obligation.status === "overdue"
        ? "badge-critical"
        : obligation.status === "pending"
        ? "badge-warning"
        : "badge-success";

    return `
      <div class="obligation-header">
        <span class="badge ${statusClass}">${obligation.status}</span>
        <strong>${Utils.escapeHtml(obligation.description)}</strong>
      </div>
      <div class="obligation-details">
        <span>Type: ${obligation.type}</span>
        <span>Due: ${Utils.formatDate(obligation.due_date)}</span>
      </div>
    `;
  },

  /**
   * Optimized clauses tab with debounced search
   */
  loadClausesTabOptimized(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📚 Clause Library</h3>
          <div class="card-actions">
            <input type="text" 
                   id="clauseSearch" 
                   class="form-input" 
                   placeholder="Search clauses..."
                   style="width: 300px;">
            <button id="addClauseBtn" class="btn btn-primary">
              + Add Clause
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="filters-row">
            <select id="clauseTypeFilter" class="form-select">
              <option value="">All Types</option>
              <option value="PPA">Power Purchase Agreement</option>
              <option value="NDA">Non-Disclosure Agreement</option>
              <option value="MSA">Master Service Agreement</option>
            </select>
            <select id="clauseCategoryFilter" class="form-select">
              <option value="">All Categories</option>
              <option value="financial">Financial</option>
              <option value="legal">Legal</option>
              <option value="operational">Operational</option>
            </select>
          </div>
          <div id="clausesList" class="clauses-list"></div>
        </div>
      </div>
    `;

    // Setup debounced search
    const searchInput = document.getElementById("clauseSearch");
    const debouncedSearch = Performance.debounce(
      (value) => {
        this.searchClauses(value);
      },
      300,
      { maxWait: 1000 }
    );

    Performance.addEventListener(searchInput, "input", (e) => {
      debouncedSearch(e.target.value);
    });

    // Setup filter handlers
    Performance.addEventListener(
      document.getElementById("clauseTypeFilter"),
      "change",
      () => this.loadClausesList()
    );

    Performance.addEventListener(
      document.getElementById("clauseCategoryFilter"),
      "change",
      () => this.loadClausesList()
    );

    Performance.addEventListener(
      document.getElementById("addClauseBtn"),
      "click",
      () => this.showAddClauseModal()
    );

    // Load clauses
    this.loadClausesList();
  },

  /**
   * Load clauses with caching
   */
  async loadClausesList() {
    const container = document.getElementById("clausesList");
    const typeFilter = document.getElementById("clauseTypeFilter").value;
    const categoryFilter = document.getElementById(
      "clauseCategoryFilter"
    ).value;

    LoadingSpinner.show(container, "Loading clauses...");

    try {
      const cacheKey = { endpoint: "clauses", typeFilter, categoryFilter };

      const clauses = await Performance.deduplicateRequest(
        cacheKey,
        async () => {
          const result = await API.clauses.getAll();
          return result.clauses || [];
        }
      );

      // Filter clauses
      let filtered = clauses;
      if (typeFilter) {
        filtered = filtered.filter((c) => c.contract_type === typeFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter((c) => c.category === categoryFilter);
      }

      // Render with virtual scrolling for large lists
      if (filtered.length > 50) {
        this.renderClausesVirtual(container, filtered);
      } else {
        this.renderClausesStandard(container, filtered);
      }
    } catch (error) {
      container.innerHTML = `
        <div class="alert alert-error">
          <strong>Failed to load clauses</strong>
          <p>${Utils.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  },

  /**
   * Render clauses with virtual scrolling
   */
  renderClausesVirtual(container, clauses) {
    container.innerHTML = "";

    const virtualScroller = Performance.createVirtualScroller(
      container,
      clauses,
      (clause) => {
        const div = document.createElement("div");
        div.className = "clause-card";
        div.innerHTML = this.renderClauseCard(clause);
        return div;
      },
      {
        itemHeight: 120,
        containerHeight: 600,
        bufferSize: 5,
      }
    );

    this.currentVirtualScroller = virtualScroller;
  },

  /**
   * Render clauses standard way
   */
  renderClausesStandard(container, clauses) {
    if (clauses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <h3 class="empty-state-title">No Clauses Found</h3>
          <p class="empty-state-message">Add clauses to build your library.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    clauses.forEach((clause) => {
      const div = document.createElement("div");
      div.className = "clause-card";
      div.innerHTML = this.renderClauseCard(clause);
      fragment.appendChild(div);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  },

  /**
   * Render single clause card
   */
  renderClauseCard(clause) {
    return `
      <div class="clause-header">
        <h4>${Utils.escapeHtml(clause.name)}</h4>
        <span class="badge badge-info">${clause.contract_type}</span>
      </div>
      <div class="clause-text">
        ${Utils.truncateText(clause.text, 150)}
      </div>
      <div class="clause-actions">
        <button class="btn btn-sm btn-ghost" onclick="app.viewClause('${
          clause.id
        }')">
          👁️ View
        </button>
        <button class="btn btn-sm btn-ghost" onclick="app.editClause('${
          clause.id
        }')">
          ✏️ Edit
        </button>
      </div>
    `;
  },

  /**
   * Cleanup on tab switch or app close
   */
  cleanup() {
    // Cleanup virtual scroller
    if (this.currentVirtualScroller) {
      this.currentVirtualScroller.destroy();
      this.currentVirtualScroller = null;
    }

    // Cleanup performance resources
    Performance.cleanup();
  },
};

// Export for integration
if (typeof window !== "undefined") {
  window.PerformanceIntegration = PerformanceIntegration;
}
