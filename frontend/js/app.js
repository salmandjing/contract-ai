/**
 * Main Application Entry Point
 */

class App {
  constructor() {
    this.currentTab = "analyze";
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log("Initializing Contract AI Platform...");

    try {
      // Load configuration
      await loadConfig();

      // Initialize authentication
      await authManager.init();

      // If authenticated, initialize the app
      if (authManager.isUserAuthenticated()) {
        await this.initializeApp();
      }

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      console.log("Application initialized successfully");
    } catch (error) {
      console.error("Failed to initialize application:", error);
      this.showError(
        "Failed to initialize application. Please refresh the page."
      );
    }
  }

  /**
   * Initialize app components after authentication
   */
  async initializeApp() {
    console.log("Initializing app components...");

    // Initialize API client
    if (window.apiClient) {
      apiClient.setAuthToken(authManager.getAccessToken());
    }

    // Load initial tab content
    await this.loadTabContent(this.currentTab);

    // Initialize connection monitoring
    this.startConnectionMonitoring();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Login button
    const loginButton = document.getElementById("loginButton");
    if (loginButton) {
      loginButton.addEventListener("click", () => {
        authManager.login();
      });
    }

    // Logout button
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        if (confirm("Are you sure you want to logout?")) {
          authManager.logout();
        }
      });
    }

    // Tab navigation
    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = button.getAttribute("data-tab");
        this.switchTab(tabName);
      });
    });

    // Handle browser back/forward
    window.addEventListener("popstate", (event) => {
      if (event.state && event.state.tab) {
        this.switchTab(event.state.tab, false);
      }
    });
  }

  /**
   * Switch to a different tab
   */
  async switchTab(tabName, updateHistory = true) {
    if (tabName === this.currentTab) {
      return;
    }

    console.log(`Switching to tab: ${tabName}`);

    // Update tab buttons
    document.querySelectorAll(".tab-button").forEach((button) => {
      if (button.getAttribute("data-tab") === tabName) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      if (content.id === `${tabName}Tab`) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    // Load tab content if needed
    await this.loadTabContent(tabName);

    // Update current tab
    this.currentTab = tabName;

    // Update browser history
    if (updateHistory) {
      history.pushState({ tab: tabName }, "", `#${tabName}`);
    }
  }

  /**
   * Load content for a specific tab
   */
  async loadTabContent(tabName) {
    const tabBody = document.getElementById(`${tabName}TabBody`);
    if (!tabBody) {
      console.warn(`Tab body not found for: ${tabName}`);
      return;
    }

    // Check if content is already loaded
    if (tabBody.hasAttribute("data-loaded")) {
      return;
    }

    try {
      switch (tabName) {
        case "analyze":
          if (window.AnalyzeTab) {
            await AnalyzeTab.init(tabBody);
          }
          break;
        case "compare":
          if (window.CompareTab) {
            await CompareTab.init(tabBody);
          }
          break;
        case "batch":
          if (window.BatchTab) {
            await BatchTab.init(tabBody);
          }
          break;
        case "observability":
          if (window.ObservabilityTab) {
            await ObservabilityTab.init(tabBody);
          }
          break;
        default:
          console.warn(`Unknown tab: ${tabName}`);
      }

      // Mark as loaded
      tabBody.setAttribute("data-loaded", "true");
    } catch (error) {
      console.error(`Failed to load tab content for ${tabName}:`, error);
      this.showError(`Failed to load ${tabName} tab. Please try again.`);
    }
  }

  /**
   * Start connection monitoring
   */
  startConnectionMonitoring() {
    const statusElement = document.getElementById("connectionStatus");
    if (!statusElement) {
      return;
    }

    // Check connection every 30 seconds
    setInterval(async () => {
      try {
        const response = await fetch("/api/health", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authManager.getAccessToken()}`,
          },
        });

        if (response.ok) {
          this.updateConnectionStatus(true);
        } else {
          this.updateConnectionStatus(false);
        }
      } catch (error) {
        this.updateConnectionStatus(false);
      }
    }, 30000);
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById("connectionStatus");
    if (!statusElement) {
      return;
    }

    const indicator = statusElement.querySelector(".status-indicator");
    const text = statusElement.querySelector(".status-text");

    if (isConnected) {
      indicator.style.background = "var(--success-color)";
      text.textContent = "Connected";
    } else {
      indicator.style.background = "var(--error-color)";
      text.textContent = "Disconnected";
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (window.showToast) {
      showToast("Error", message, "error");
    } else {
      alert(message);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (window.showToast) {
      showToast("Success", message, "success");
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const app = new App();
  await app.init();

  // Make app globally accessible
  window.app = app;
});

// Handle page visibility changes
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && authManager.isUserAuthenticated()) {
    // Page became visible, check if token needs refresh
    const tokenExpiry = authManager.tokenExpiry;
    const now = Date.now();

    // If token expires in less than 5 minutes, refresh it
    if (tokenExpiry && tokenExpiry - now < 5 * 60 * 1000) {
      authManager.refreshAccessToken(authManager.refreshToken);
    }
  }
});
