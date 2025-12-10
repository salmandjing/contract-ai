/**
 * Configuration for AgentCore Frontend
 */

const CONFIG = {
  // Cognito Configuration
  cognito: {
    userPoolId: "", // Will be loaded from environment
    clientId: "", // Will be loaded from environment
    region: "us-east-1",
    domain: "", // e.g., 'your-domain.auth.us-east-1.amazoncognito.com'
  },

  // AgentCore Configuration
  agentcore: {
    gatewayId: "", // Will be loaded from environment
    gatewayEndpoint: "", // Will be loaded from environment
    region: "us-east-1",
  },

  // API Configuration
  api: {
    baseUrl: window.location.origin,
    timeout: 300000, // 5 minutes for long-running analyses
  },

  // OAuth Configuration
  oauth: {
    redirectUri: window.location.origin + "/callback",
    responseType: "code",
    scope: "openid email profile",
  },

  // Storage keys
  storage: {
    accessToken: "agentcore_access_token",
    refreshToken: "agentcore_refresh_token",
    idToken: "agentcore_id_token",
    tokenExpiry: "agentcore_token_expiry",
    userInfo: "agentcore_user_info",
  },
};

/**
 * Load configuration from backend
 */
async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (response.ok) {
      const config = await response.json();

      // Update Cognito config
      if (config.cognito) {
        CONFIG.cognito.userPoolId =
          config.cognito.userPoolId || CONFIG.cognito.userPoolId;
        CONFIG.cognito.clientId =
          config.cognito.clientId || CONFIG.cognito.clientId;
        CONFIG.cognito.domain = config.cognito.domain || CONFIG.cognito.domain;
        CONFIG.cognito.region = config.cognito.region || CONFIG.cognito.region;
      }

      // Update AgentCore config
      if (config.agentcore) {
        CONFIG.agentcore.gatewayId =
          config.agentcore.gatewayId || CONFIG.agentcore.gatewayId;
        CONFIG.agentcore.gatewayEndpoint =
          config.agentcore.gatewayEndpoint || CONFIG.agentcore.gatewayEndpoint;
        CONFIG.agentcore.region =
          config.agentcore.region || CONFIG.agentcore.region;
      }

      console.log("Configuration loaded successfully");
      return true;
    } else {
      console.warn("Failed to load configuration from backend, using defaults");
      return false;
    }
  } catch (error) {
    console.error("Error loading configuration:", error);
    return false;
  }
}

// Export for use in other modules
window.CONFIG = CONFIG;
window.loadConfig = loadConfig;
