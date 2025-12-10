/* ============================================
   Contract AI Platform V3 - API Integration
   ============================================ */

const API = {
  baseURL: window.API_BASE_URL || "http://localhost:8082",

  /**
   * Generic API call handler with error handling and retry
   */
  async call(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      // Check if online before making request
      if (!navigator.onLine) {
        throw new Error("No internet connection. Please check your network.");
      }

      const response = await fetch(url, config);

      // Handle non-JSON responses (like file downloads)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();

        if (!response.ok) {
          const errorMessage =
            data.error ||
            data.detail ||
            `API request failed with status ${response.status}`;
          const error = new Error(errorMessage);
          error.status = response.status;
          error.data = data;
          throw error;
        }

        return data;
      } else {
        // Return blob for file downloads
        if (!response.ok) {
          const error = new Error(
            `API request failed with status ${response.status}`
          );
          error.status = response.status;
          throw error;
        }
        return await response.blob();
      }
    } catch (error) {
      // Log error if ErrorHandler is available
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.logError(error, {
          endpoint,
          method: config.method || "GET",
          type: "API_ERROR",
        });
      } else {
        console.error("API Error:", error);
      }
      throw error;
    }
  },

  /**
   * Upload file with validation and error handling
   */
  async uploadFile(file, endpoint = "/api/contracts/upload") {
    // Validate file before upload if Validator is available
    if (typeof Validator !== "undefined") {
      const validation = Validator.validateFile(file);
      if (!validation.valid) {
        const error = new Error(validation.errors.join(", "));
        error.validationErrors = validation.errors;
        throw error;
      }
    }

    // Check if online
    if (!navigator.onLine) {
      throw new Error("No internet connection. Please check your network.");
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(
          data.error || `File upload failed with status ${response.status}`
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Log error if ErrorHandler is available
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.logError(error, {
          endpoint,
          fileName: file.name,
          fileSize: file.size,
          type: "FILE_UPLOAD_ERROR",
        });
      }
      throw error;
    }
  },

  /**
   * Contract Analysis API - Supports both AgentCore and Bedrock backends
   */
  contracts: {
    async analyze(contractText, jurisdiction = "US", backend = "bedrock") {
      if (backend === "bedrock") {
        // Use Bedrock Agent endpoint
        return await API.call("/api/bedrock/analyze", {
          method: "POST",
          body: JSON.stringify({
            contract_text: contractText,
            jurisdiction: jurisdiction,
          }),
        });
      } else {
        // Use AgentCore endpoint
        return await API.call("/api/analyze", {
          method: "POST",
          body: JSON.stringify({
            contract_text: contractText,
            jurisdiction: jurisdiction,
            user_id: "demo-user",
            session_id: "demo-session",
          }),
        });
      }
    },

    async upload(file) {
      // Upload file to server for text extraction ONLY (no analysis)
      try {
        const uploadResult = await API.uploadFile(file, "/api/upload");

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "File upload failed");
        }

        // Return the upload result with extracted text
        return uploadResult;
      } catch (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    },

    async exportPDF(contractText, analysisResult) {
      // PDF export not implemented in AgentCore yet
      throw new Error("PDF export not yet implemented");
      return await API.call("/api/export-pdf", {
        method: "POST",
        body: JSON.stringify({
          contract_text: contractText,
          analysis_result: analysisResult,
        }),
      });
    },

    async compare(
      contract1,
      contract2,
      jurisdiction = "US",
      backend = "bedrock"
    ) {
      if (backend === "bedrock") {
        // Use Bedrock Agent endpoint
        return await API.call("/api/bedrock/compare", {
          method: "POST",
          body: JSON.stringify({
            contract_a_text: contract1,
            contract_b_text: contract2,
            jurisdiction: jurisdiction,
          }),
        });
      } else {
        // Use AgentCore endpoint
        return await API.call("/api/compare", {
          method: "POST",
          body: JSON.stringify({
            contract_a_text: contract1,
            contract_b_text: contract2,
            jurisdiction: jurisdiction,
            user_id: "demo-user",
            session_id: "demo-session",
          }),
        });
      }
    },

    async generate(templateId, parameters, clauses = []) {
      // Contract generation not implemented in AgentCore yet
      throw new Error("Contract generation not yet implemented");
    },

    async suggestClauses(contractType, jurisdiction) {
      // Clause suggestions not implemented in AgentCore yet
      throw new Error("Clause suggestions not yet implemented");
    },
  },

  /**
   * Batch Processing API - AgentCore Backend
   */
  batch: {
    async upload(files, jurisdiction = "US") {
      // Read all files and prepare contracts array
      const contracts = await Promise.all(
        files.map(async (file, index) => {
          const text = await file.text();
          return {
            id: `contract-${index + 1}`,
            text: text,
            name: file.name,
          };
        })
      );

      return await API.call("/api/batch/process", {
        method: "POST",
        body: JSON.stringify({
          contracts: contracts,
          jurisdiction: jurisdiction,
          user_id: "demo-user",
          session_id: "demo-session",
          max_concurrent: 5,
        }),
      });
    },

    async process(batchId) {
      // AgentCore processes immediately, no separate process step
      throw new Error("Batch processing happens immediately in AgentCore");
    },

    async getStatus(batchId) {
      // AgentCore doesn't have batch status tracking yet
      throw new Error("Batch status tracking not yet implemented");
    },

    async getResults(batchId) {
      // AgentCore returns results immediately
      throw new Error("Batch results are returned immediately");
    },

    async exportZip(batchId) {
      // Export not implemented yet
      throw new Error("Batch export not yet implemented");
    },
  },

  /**
   * Obligations API - AgentCore Backend
   */
  obligations: {
    async extract(contractText, contractType = null) {
      return await API.call("/api/obligations/extract", {
        method: "POST",
        body: JSON.stringify({
          contract_text: contractText,
          contract_type: contractType,
          user_id: "demo-user",
          session_id: "demo-session",
        }),
      });
    },

    async getAll(filters = {}) {
      // Obligation tracking not implemented yet
      throw new Error("Obligation tracking not yet implemented");
    },

    async updateStatus(obligationId, status, notes = "") {
      // Obligation status updates not implemented yet
      throw new Error("Obligation status updates not yet implemented");
    },

    async getTimeline(contractId = null) {
      // Obligation timeline not implemented yet
      throw new Error("Obligation timeline not yet implemented");
    },
  },

  /**
   * Clause Library API - Not implemented in AgentCore yet
   */
  clauses: {
    async getAll(filters = {}) {
      throw new Error("Clause library not yet implemented");
    },

    async getById(clauseId) {
      throw new Error("Clause library not yet implemented");
    },

    async create(clauseData) {
      throw new Error("Clause library not yet implemented");
    },

    async update(clauseId, clauseData) {
      throw new Error("Clause library not yet implemented");
    },

    async delete(clauseId) {
      throw new Error("Clause library not yet implemented");
    },

    async search(query, filters = {}) {
      throw new Error("Clause library not yet implemented");
    },
  },

  /**
   * Templates API - Not implemented in AgentCore yet
   */
  templates: {
    async getAll(filters = {}) {
      throw new Error("Templates not yet implemented");
    },

    async getById(templateId) {
      throw new Error("Templates not yet implemented");
    },
  },

  /**
   * Check API connection
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: "GET",
        cache: "no-cache",
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Retry API call with exponential backoff
   */
  async callWithRetry(endpoint, options = {}, retryOptions = {}) {
    if (typeof ErrorHandler !== "undefined") {
      return await ErrorHandler.retry(() => this.call(endpoint, options), {
        ...retryOptions,
        onRetry: (attempt, maxAttempts, delay) => {
          console.log(
            `Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`
          );
          if (typeof Utils !== "undefined") {
            Utils.showToast(
              `Retrying request (attempt ${attempt}/${maxAttempts})...`,
              "info",
              2000
            );
          }
        },
      });
    } else {
      // Fallback if ErrorHandler not available
      return await this.call(endpoint, options);
    }
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = API;
}
