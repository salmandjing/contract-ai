/**
 * Authentication Module for AgentCore Frontend
 * AUTHENTICATION DISABLED - Direct access mode
 */

class AuthManager {
  constructor() {
    this.isAuthenticated = true; // Always authenticated
    this.accessToken = "demo-token";
    this.refreshToken = null;
    this.idToken = null;
    this.tokenExpiry = null;
    this.userInfo = { email: "demo@example.com", name: "Demo User" };
    this.refreshTimer = null;
  }

  /**
   * Initialize authentication (bypassed)
   */
  async init() {
    console.log("Authentication disabled - using demo mode");

    // Always show app directly
    this.isAuthenticated = true;
    this.showApp();
  }

  /**
   * Restore session (bypassed)
   */
  async restoreSession() {
    return true;
  }

  /**
   * Login (bypassed)
   */
  login() {
    console.log("Login bypassed - demo mode");
    this.showApp();
  }

  /**
   * Handle OAuth callback (bypassed)
   */
  async handleOAuthCallback() {
    // Not needed in demo mode
  }

  /**
   * Exchange code for tokens (bypassed)
   */
  async exchangeCodeForTokens(code) {
    // Not needed in demo mode
  }

  /**
   * Refresh access token (bypassed)
   */
  async refreshAccessToken(refreshToken) {
    return true;
  }

  /**
   * Schedule token refresh (bypassed)
   */
  scheduleTokenRefresh() {
    // Not needed in demo mode
  }

  /**
   * Logout (simplified)
   */
  logout() {
    console.log("Logout in demo mode");
    window.location.reload();
  }

  /**
   * Save session (bypassed)
   */
  saveSession() {
    // Not needed in demo mode
  }

  /**
   * Clear session (bypassed)
   */
  clearSession() {
    // Not needed in demo mode
  }

  /**
   * Clear OAuth state (bypassed)
   */
  clearOAuthState() {
    // Not needed in demo mode
  }

  /**
   * Get current access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Get user info
   */
  getUserInfo() {
    return this.userInfo;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Show login screen (bypassed)
   */
  showLoginScreen() {
    // Always show app in demo mode
    this.showApp();
  }

  /**
   * Show main app
   */
  showApp() {
    const loginScreen = document.getElementById("loginScreen");
    const appContainer = document.getElementById("appContainer");

    if (loginScreen) {
      loginScreen.style.display = "none";
    }
    if (appContainer) {
      appContainer.style.display = "block";
    }

    // Update user info in header
    const userNameElement = document.getElementById("userName");
    if (userNameElement && this.userInfo) {
      const userName = this.userInfo.email || this.userInfo.name || "Demo User";
      userNameElement.textContent = userName;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorElement = document.getElementById("loginError");
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = "block";
    }
    console.error("Auth error:", message);
  }

  /**
   * Show status message
   */
  showStatus(message) {
    const statusElement = document.getElementById("loginStatus");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.display = "block";
    }
    console.log("Auth status:", message);
  }

  /**
   * Decode JWT token
   */
  decodeJWT(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  }

  /**
   * Generate random string for state parameter
   */
  generateRandomString(length) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Create global auth manager instance
window.authManager = new AuthManager();
