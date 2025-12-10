/**
 * AgentCore Frontend Configuration Override
 * This file overrides the V3 API configuration to use port 8080
 */

// Override the API baseURL to use port 8080
if (typeof API !== "undefined") {
  API.baseURL = "http://localhost:8080";
  console.log("✅ API configured for AgentCore backend:", API.baseURL);
}

// If API is not yet defined, create it
if (typeof API === "undefined") {
  window.API = {
    baseURL: "http://localhost:8080",
  };
  console.log("✅ API initialized for AgentCore backend:", API.baseURL);
}
