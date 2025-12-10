/**
 * API Client for AgentCore Runtime
 * Handles communication with AgentCore agents
 */

class AgentCoreAPIClient {
  constructor() {
    this.baseUrl = CONFIG.api.baseUrl;
    this.timeout = CONFIG.api.timeout;
    this.authToken = null;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make API request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors
      if (response.status === 401) {
        console.error("Authentication failed");
        // Try to refresh token
        if (authManager && authManager.refreshToken) {
          const refreshed = await authManager.refreshAccessToken(
            authManager.refreshToken
          );
          if (refreshed) {
            // Retry request with new token
            this.setAuthToken(authManager.getAccessToken());
            return this.request(endpoint, options);
          }
        }
        throw new Error("Authentication failed. Please login again.");
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Request failed with status ${response.status}`
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(
          "Request timeout. The operation took too long to complete."
        );
      }

      throw error;
    }
  }

  /**
   * Analyze contract using AgentCore Runtime
   */
  async analyzeContract(contractText, jurisdiction = "US", options = {}) {
    console.log("Analyzing contract via AgentCore...");

    const response = await this.request("/api/agentcore/analyze", {
      method: "POST",
      body: JSON.stringify({
        contract_text: contractText,
        jurisdiction: jurisdiction,
        include_deviation_analysis: options.includeDeviationAnalysis !== false,
        include_obligation_extraction:
          options.includeObligationExtraction !== false,
        user_id: options.userId || "anonymous",
        session_id: options.sessionId || this.generateSessionId(),
      }),
    });

    return await response.json();
  }

  /**
   * Upload and analyze contract file using AgentCore Runtime
   */
  async uploadAndAnalyzeContract(file, jurisdiction = "US", options = {}) {
    console.log("Uploading and analyzing contract file via AgentCore...");

    // First, upload file to extract text
    const formData = new FormData();
    formData.append("file", file);

    console.log("Extracting text from file...");
    const uploadResponse = await fetch(`${this.baseURL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || "File upload failed");
    }

    const contractText = uploadResult.text;
    console.log(
      `Extracted ${contractText.length} characters from ${file.name}`
    );

    // Now analyze the extracted text
    const response = await this.request("/api/agentcore/analyze", {
      method: "POST",
      body: JSON.stringify({
        contract_text: contractText,
        jurisdiction: jurisdiction,
        include_deviation_analysis: options.includeDeviationAnalysis !== false,
        include_obligation_extraction:
          options.includeObligationExtraction !== false,
        user_id: options.userId || "anonymous",
        session_id: options.sessionId || this.generateSessionId(),
        file_name: file.name,
        file_type: file.type,
      }),
    });

    return await response.json();
  }

  /**
   * Analyze contract using Bedrock Agent
   */
  async analyzeWithBedrock(contractText, options = {}) {
    console.log("Analyzing contract via Bedrock Agent...");

    const response = await this.request("/api/bedrock/analyze", {
      method: "POST",
      body: JSON.stringify({
        contract_text: contractText,
        session_id: options.sessionId || this.generateSessionId(),
      }),
    });

    const result = await response.json();

    // Transform Bedrock response to match expected format
    if (result.success && result.analysis) {
      return {
        success: true,
        analysis_result: {
          summary: result.analysis,
          agent: "bedrock",
          agent_id: result.agent_id,
        },
      };
    }

    return result;
  }

  /**
   * Compare two contracts using Bedrock Agent
   */
  async compareWithBedrock(contract1Text, contract2Text, options = {}) {
    console.log("Comparing contracts via Bedrock Agent...");

    const response = await this.request("/api/bedrock/compare", {
      method: "POST",
      body: JSON.stringify({
        contract_a_text: contract1Text,
        contract_b_text: contract2Text,
        session_id: options.sessionId || this.generateSessionId(),
      }),
    });

    const result = await response.json();

    // Transform Bedrock response to match expected format
    if (result.success && result.comparison) {
      return {
        success: true,
        comparison_result: {
          summary: result.comparison,
          agent: "bedrock",
          agent_id: result.agent_id,
        },
      };
    }

    return result;
  }

  /**
   * Extract text from file
   */
  async extractTextFromFile(file) {
    console.log("Extracting text from file...");

    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch(`${this.baseUrl}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    if (!result.success) {
      throw new Error(result.error || "File upload failed");
    }

    return result;
  }

  /**
   * Compare two contracts using AgentCore Runtime
   */
  async compareContracts(contract1Text, contract2Text, options = {}) {
    console.log("Comparing contracts via AgentCore...");

    const response = await this.request("/api/agentcore/compare", {
      method: "POST",
      body: JSON.stringify({
        contract_a_text: contract1Text,
        contract_b_text: contract2Text,
        jurisdiction: options.jurisdiction || "US",
        user_id: options.userId || "anonymous",
        session_id: options.sessionId || this.generateSessionId(),
      }),
    });

    return await response.json();
  }

  /**
   * Extract obligations from contract using AgentCore Runtime
   */
  async extractObligations(contractText, options = {}) {
    console.log("Extracting obligations via AgentCore...");

    const response = await this.request("/api/agentcore/obligations", {
      method: "POST",
      body: JSON.stringify({
        contract_text: contractText,
        jurisdiction: options.jurisdiction || "US",
        user_id: options.userId || "anonymous",
        session_id: options.sessionId || this.generateSessionId(),
      }),
    });

    return await response.json();
  }

  /**
   * Process batch of contracts using AgentCore Runtime
   */
  async processBatch(contracts, options = {}) {
    console.log(
      `Processing batch of ${contracts.length} contracts via AgentCore...`
    );

    const response = await this.request("/api/agentcore/batch", {
      method: "POST",
      body: JSON.stringify({
        contracts: contracts,
        jurisdiction: options.jurisdiction || "US",
        user_id: options.userId || "anonymous",
        session_id: options.sessionId || this.generateSessionId(),
      }),
    });

    return await response.json();
  }

  /**
   * Get batch processing status
   */
  async getBatchStatus(batchId) {
    console.log(`Getting batch status for: ${batchId}`);

    const response = await this.request(`/api/agentcore/batch/${batchId}`, {
      method: "GET",
    });

    return await response.json();
  }

  /**
   * Get agent execution trace from observability
   */
  async getAgentTrace(traceId) {
    console.log(`Getting agent trace: ${traceId}`);

    const response = await this.request(
      `/api/agentcore/observability/trace/${traceId}`,
      {
        method: "GET",
      }
    );

    return await response.json();
  }

  /**
   * Get agent metrics from observability
   */
  async getAgentMetrics(timeRange = "1h") {
    console.log(`Getting agent metrics for time range: ${timeRange}`);

    const response = await this.request(
      `/api/agentcore/observability/metrics?timeRange=${timeRange}`,
      {
        method: "GET",
      }
    );

    return await response.json();
  }

  /**
   * Get tool usage statistics
   */
  async getToolUsageStats(timeRange = "1h") {
    console.log(`Getting tool usage stats for time range: ${timeRange}`);

    const response = await this.request(
      `/api/agentcore/observability/tools?timeRange=${timeRange}`,
      {
        method: "GET",
      }
    );

    return await response.json();
  }

  /**
   * Get recent analyses from AgentCore Memory
   */
  async getRecentAnalyses(limit = 10) {
    console.log(`Getting recent analyses (limit: ${limit})`);

    const response = await this.request(
      `/api/agentcore/memory/analyses?limit=${limit}`,
      {
        method: "GET",
      }
    );

    return await response.json();
  }

  /**
   * Get specific analysis from AgentCore Memory
   */
  async getAnalysis(analysisId) {
    console.log(`Getting analysis: ${analysisId}`);

    const response = await this.request(
      `/api/agentcore/memory/analyses/${analysisId}`,
      {
        method: "GET",
      }
    );

    return await response.json();
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    const response = await this.request("/api/health", {
      method: "GET",
    });

    return await response.json();
  }

  /**
   * Get AgentCore configuration
   */
  async getConfig() {
    const response = await this.request("/api/config", {
      method: "GET",
    });

    return await response.json();
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stream analysis results (for future streaming support)
   */
  async streamAnalysis(
    contractText,
    jurisdiction,
    onChunk,
    onComplete,
    onError
  ) {
    console.log("Streaming analysis via AgentCore...");

    try {
      const response = await fetch(
        `${this.baseUrl}/api/agentcore/analyze/stream`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            contract_text: contractText,
            jurisdiction: jurisdiction,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Stream request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (onComplete) {
            onComplete();
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (onChunk) {
                onChunk(data);
              }
            } catch (e) {
              console.warn("Failed to parse stream chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      if (onError) {
        onError(error);
      }
    }
  }
}

// Create global API client instance
window.apiClient = new AgentCoreAPIClient();
