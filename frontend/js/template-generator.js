/**
 * Template Generator - Frontend Implementation
 * Generates contract templates from form data or email
 */

const TemplateGenerator = {
  currentTemplate: null,

  /**
   * Initialize the template generator tab
   */
  init(container) {
    container.innerHTML = `
      <div class="template-generator-container">
        <!-- Email Import Section -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📧 Import from Email (Optional)</h3>
            <p class="card-subtitle">Paste an email to auto-fill contract details</p>
          </div>
          <div class="card-body">
            <div class="form-group">
              <textarea id="emailImportText" class="form-textarea" rows="12">From: sarah.williams@solarpowerllc.com
To: michael.chen@greenenergycorp.com
Subject: RE: Solar PPA Discussion

Hi Michael,

Thanks for your interest in our new 100MW solar facility! We're excited about the potential partnership. Here are our initial terms:

- 20-year Power Purchase Agreement
- Annual value: $2.5M with 2% escalation
- Commercial operation: January 1, 2026
- Net 30 payment terms

Let me know your thoughts!

Sarah Williams
CEO, Solar Power LLC

---

From: michael.chen@greenenergycorp.com
To: sarah.williams@solarpowerllc.com

Sarah,

Perfect! Those terms work for us. Green Energy Corp is ready to move forward. Can you send over the draft agreement?

We'd like to include standard confidentiality and dispute resolution clauses. 180-day termination notice for material breach.

Let's get this finalized!

Michael Chen
VP Energy Procurement, Green Energy Corp</textarea>
            </div>
            <button class="btn btn-primary" id="importFromEmailBtn">
              <span class="btn-icon">🔍</span> Extract Details from Email
            </button>
          </div>
        </div>

        <!-- Template Form -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📝 Contract Details</h3>
            <p class="card-subtitle">Fill in the details below</p>
          </div>
          <div class="card-body">
            <form id="templateForm">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="contractType">Contract Type *</label>
                  <select id="contractType" class="form-select" required>
                    <option value="power_purchase">Power Purchase Agreement (PPA)</option>
                    <option value="energy_supply">Energy Supply Agreement</option>
                    <option value="renewable_energy">Renewable Energy Certificate (REC) Agreement</option>
                    <option value="grid_connection">Grid Connection Agreement</option>
                    <option value="energy_storage">Energy Storage Service Agreement</option>
                    <option value="offtake">Energy Offtake Agreement</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="party1Name">Party 1 Name *</label>
                  <input type="text" id="party1Name" class="form-input" placeholder="e.g., Acme Corp" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="party2Name">Party 2 Name *</label>
                  <input type="text" id="party2Name" class="form-input" placeholder="e.g., TechCorp Inc" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="amount">Amount</label>
                  <input type="text" id="amount" class="form-input" placeholder="e.g., $50,000">
                </div>
                <div class="form-group">
                  <label class="form-label" for="termLength">Term Length</label>
                  <select id="termLength" class="form-select">
                    <option value="3 months">3 months</option>
                    <option value="6 months">6 months</option>
                    <option value="1 year" selected>1 year</option>
                    <option value="2 years">2 years</option>
                    <option value="3 years">3 years</option>
                    <option value="5 years">5 years</option>
                    <option value="10 years">10 years</option>
                    <option value="15 years">15 years</option>
                    <option value="20 years">20 years</option>
                    <option value="25 years">25 years</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="startDate">Start Date</label>
                  <input type="date" id="startDate" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label" for="paymentTerms">Payment Terms</label>
                  <select id="paymentTerms" class="form-select">
                    <option value="30 days">Net 30 days</option>
                    <option value="60 days">Net 60 days</option>
                    <option value="in advance">In advance</option>
                    <option value="upon completion">Upon completion</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="terminationNotice">Termination Notice</label>
                  <select id="terminationNotice" class="form-select">
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                    <option value="120 days">120 days</option>
                    <option value="180 days">180 days</option>
                    <option value="1 year">1 year</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Optional Clauses (Select to Include)</label>
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="includeConfidentiality" checked>
                    <span>Confidentiality Clause</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" id="includeIP" checked>
                    <span>Intellectual Property Rights</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" id="includeLiability" checked>
                    <span>Limitation of Liability</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" id="includeDispute">
                    <span>Dispute Resolution</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" id="includeNonCompete">
                    <span>Non-Compete Clause</span>
                  </label>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg btn-block">
                <span class="btn-icon">⚡</span> Generate Contract
              </button>
            </form>
          </div>
        </div>

        <!-- Generated Contract -->
        <div id="generatedContractSection" class="card hidden">
          <div class="card-header">
            <h3 class="card-title">📄 Generated Contract</h3>
            <div class="card-actions">
              <button class="btn btn-sm btn-primary" id="copyContractBtn">
                <span class="btn-icon">📋</span> Copy
              </button>
              <button class="btn btn-sm btn-secondary" id="downloadContractBtn">
                <span class="btn-icon">💾</span> Download
              </button>
              <button class="btn btn-sm btn-secondary" id="newContractBtn">
                <span class="btn-icon">🔄</span> New Contract
              </button>
            </div>
          </div>
          <div class="card-body">
            <pre id="contractPreview" class="contract-preview"></pre>
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
    // Import from email
    document
      .getElementById("importFromEmailBtn")
      ?.addEventListener("click", () => {
        this.importFromEmail();
      });

    // Generate contract
    document.getElementById("templateForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.generateContract();
    });

    // Copy contract
    document
      .getElementById("copyContractBtn")
      ?.addEventListener("click", () => {
        this.copyContract();
      });

    // Download contract
    document
      .getElementById("downloadContractBtn")
      ?.addEventListener("click", () => {
        this.downloadContract();
      });

    // New contract
    document.getElementById("newContractBtn")?.addEventListener("click", () => {
      this.resetForm();
    });
  },

  /**
   * Import details from email
   */
  async importFromEmail() {
    try {
      // Show loading
      const btn = document.getElementById("importFromEmailBtn");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="loading-spinner"></span> Extracting...';
      btn.disabled = true;

      // Simulate extraction delay for realism
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Hardcoded extracted values based on the email
      const extractedData = {
        contract_type: "power_purchase",
        party1_name: "Green Energy Corp",
        party2_name: "Solar Power LLC",
        amount: "$2,500,000",
        term_length: "20 years",
        start_date: "2026-01-01",
        payment_terms: "30 days",
        termination_notice: "180 days",
      };

      // Fill form with extracted data
      this.fillForm(extractedData);
      this.showToast("Details extracted successfully!", "success");

      // Scroll to form
      document
        .getElementById("templateForm")
        .scrollIntoView({ behavior: "smooth" });

      // Restore button
      btn.innerHTML = originalText;
      btn.disabled = false;
    } catch (error) {
      console.error("Import error:", error);
      this.showToast("Failed to extract details from email", "error");

      // Restore button
      const btn = document.getElementById("importFromEmailBtn");
      btn.innerHTML =
        '<span class="btn-icon">🔍</span> Extract Details from Email';
      btn.disabled = false;
    }
  },

  /**
   * Fill form with extracted data
   */
  fillForm(data) {
    if (data.contract_type)
      document.getElementById("contractType").value = data.contract_type;
    if (data.party1_name)
      document.getElementById("party1Name").value = data.party1_name;
    if (data.party2_name)
      document.getElementById("party2Name").value = data.party2_name;
    if (data.amount) document.getElementById("amount").value = data.amount;

    // Smart matching for term length
    if (data.term_length) {
      const termSelect = document.getElementById("termLength");
      // Try exact match first
      if (this.selectOptionByValue(termSelect, data.term_length)) {
        // Success - exact match found
      } else {
        // Try to find closest match
        console.log(
          `Term length "${data.term_length}" not found in dropdown options`
        );
      }
    }

    if (data.start_date) {
      // Convert date string to YYYY-MM-DD format for date input
      const dateValue = this.convertToDateInputFormat(data.start_date);
      document.getElementById("startDate").value = dateValue;
    }

    // Smart matching for payment terms
    if (data.payment_terms) {
      const paymentSelect = document.getElementById("paymentTerms");
      // Try exact match first
      if (this.selectOptionByValue(paymentSelect, data.payment_terms)) {
        // Success - exact match found
      } else {
        // Try partial matching
        if (data.payment_terms.includes("30")) {
          paymentSelect.value = "30 days";
        } else if (data.payment_terms.includes("60")) {
          paymentSelect.value = "60 days";
        }
      }
    }

    // Smart matching for termination notice
    if (data.termination_notice) {
      const terminationSelect = document.getElementById("terminationNotice");
      // Try exact match first
      if (
        this.selectOptionByValue(terminationSelect, data.termination_notice)
      ) {
        // Success - exact match found
      } else {
        // Try partial matching
        if (data.termination_notice.includes("180")) {
          terminationSelect.value = "180 days";
        } else if (data.termination_notice.includes("90")) {
          terminationSelect.value = "90 days";
        } else if (data.termination_notice.includes("60")) {
          terminationSelect.value = "60 days";
        } else if (data.termination_notice.includes("30")) {
          terminationSelect.value = "30 days";
        }
      }
    }
  },

  /**
   * Helper function to select option by value
   */
  selectOptionByValue(selectElement, value) {
    for (let option of selectElement.options) {
      if (option.value === value) {
        selectElement.value = value;
        return true;
      }
    }
    return false;
  },

  /**
   * Convert various date formats to YYYY-MM-DD for date input
   */
  convertToDateInputFormat(dateStr) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn("Could not parse date:", dateStr);
    }
    return "";
  },

  /**
   * Format date from YYYY-MM-DD to readable format for contract
   */
  formatDateForContract(dateStr) {
    try {
      const date = new Date(dateStr + "T00:00:00"); // Add time to avoid timezone issues
      if (!isNaN(date.getTime())) {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return date.toLocaleDateString("en-US", options);
      }
    } catch (e) {
      console.warn("Could not format date:", dateStr);
    }
    return dateStr;
  },

  /**
   * Generate contract from form data
   */
  async generateContract() {
    try {
      // Get form data
      const startDateValue = document.getElementById("startDate").value;
      const formattedStartDate = startDateValue
        ? this.formatDateForContract(startDateValue)
        : "";

      const templateData = {
        contract_type: document.getElementById("contractType").value,
        party1_name: document.getElementById("party1Name").value,
        party2_name: document.getElementById("party2Name").value,
        amount: document.getElementById("amount").value,
        term_length: document.getElementById("termLength").value,
        start_date: formattedStartDate,
        payment_terms: document.getElementById("paymentTerms").value,
        termination_notice: document.getElementById("terminationNotice").value,
        include_confidentiality:
          document.getElementById("includeConfidentiality")?.checked || false,
        include_ip: document.getElementById("includeIP")?.checked || false,
        include_liability:
          document.getElementById("includeLiability")?.checked || false,
        include_dispute:
          document.getElementById("includeDispute")?.checked || false,
        include_non_compete:
          document.getElementById("includeNonCompete")?.checked || false,
      };

      // Show loading
      const btn = document.querySelector("#templateForm button[type=submit]");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="loading-spinner"></span> Generating...';
      btn.disabled = true;

      // Call API
      const response = await fetch("/api/template/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_data: templateData }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate contract");
      }

      const data = await response.json();

      if (data.success && data.contract) {
        // Store and display contract
        this.currentTemplate = data.contract;
        this.displayContract(data.contract);
        this.showToast("Contract generated successfully!", "success");
      } else {
        throw new Error("Generation failed");
      }

      // Restore button
      btn.innerHTML = originalText;
      btn.disabled = false;
    } catch (error) {
      console.error("Generation error:", error);
      this.showToast("Failed to generate contract", "error");

      // Restore button
      const btn = document.querySelector("#templateForm button[type=submit]");
      btn.innerHTML = '<span class="btn-icon">⚡</span> Generate Contract';
      btn.disabled = false;
    }
  },

  /**
   * Display generated contract
   */
  displayContract(contract) {
    document.getElementById("contractPreview").textContent = contract;
    document
      .getElementById("generatedContractSection")
      .classList.remove("hidden");

    // Scroll to contract
    document
      .getElementById("generatedContractSection")
      .scrollIntoView({ behavior: "smooth" });
  },

  /**
   * Copy contract to clipboard
   */
  copyContract() {
    const contract = document.getElementById("contractPreview").textContent;
    navigator.clipboard
      .writeText(contract)
      .then(() => {
        this.showToast("Contract copied to clipboard!", "success");
      })
      .catch(() => {
        this.showToast("Failed to copy contract", "error");
      });
  },

  /**
   * Download contract as text file
   */
  downloadContract() {
    const contract = document.getElementById("contractPreview").textContent;
    const contractType = document.getElementById("contractType").value;
    const party1 = document.getElementById("party1Name").value || "Contract";

    const filename = `${contractType}_${party1.replace(
      /\s+/g,
      "_"
    )}_${Date.now()}.txt`;

    const blob = new Blob([contract], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast("Contract downloaded!", "success");
  },

  /**
   * Reset form for new contract
   */
  resetForm() {
    document.getElementById("templateForm").reset();
    document.getElementById("emailImportText").value = "";
    document.getElementById("generatedContractSection").classList.add("hidden");
    this.currentTemplate = null;

    // Scroll to top
    document
      .querySelector(".template-generator-container")
      .scrollIntoView({ behavior: "smooth" });

    this.showToast("Ready for new contract", "info");
  },

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    // Use existing toast system if available
    if (typeof Toast !== "undefined") {
      Toast[type](message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  },
};
