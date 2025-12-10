/* ============================================
   Contract AI Platform V3 - Onboarding Tour
   ============================================ */

const OnboardingTour = {
  currentStep: 0,
  isActive: false,
  overlay: null,
  spotlight: null,
  popup: null,

  steps: [
    {
      target: '[data-tab="analyze"]',
      title: "Welcome to Contract AI Platform! 👋",
      content:
        "Let's take a quick tour to help you get started. The Analyze tab lets you upload or paste contracts for AI-powered analysis.",
      position: "bottom",
    },
    {
      target: '[data-tab="batch"]',
      title: "Batch Processing 📦",
      content:
        "Need to analyze multiple contracts at once? The Batch tab lets you process up to 50 contracts simultaneously.",
      position: "bottom",
    },
    {
      target: '[data-tab="obligations"]',
      title: "Track Obligations 📅",
      content:
        "Never miss a deadline! The Obligations tab extracts and tracks all contractual obligations with due dates.",
      position: "bottom",
    },
    {
      target: '[data-tab="compare"]',
      title: "Compare Contracts 🔄",
      content:
        "Compare two contracts side-by-side to identify key differences and determine which is more favorable.",
      position: "bottom",
    },
    {
      target: '[data-tab="generate"]',
      title: "Generate Contracts ⚡",
      content:
        "Create new contracts from templates with AI assistance. Customize clauses and generate compliant documents quickly.",
      position: "bottom",
    },
    {
      target: '[data-tab="clauses"]',
      title: "Clause Library 📚",
      content:
        "Browse and manage your library of standard clauses. Reuse proven language and maintain consistency across contracts.",
      position: "bottom",
    },
    {
      target: "#connectionStatus",
      title: "Connection Status 🔌",
      content:
        "Keep an eye on your connection status here. You'll see a green indicator when connected to the backend.",
      position: "left",
    },
  ],

  /**
   * Initialize the tour
   */
  init() {
    // Check if user has completed the tour
    const hasCompletedTour = Utils.storage.get("tour_completed", false);
    if (!hasCompletedTour) {
      // Show tour after a short delay
      setTimeout(() => {
        this.start();
      }, 1000);
    }

    // Add help button to header
    this.addHelpButton();
  },

  /**
   * Add help button to restart tour
   */
  addHelpButton() {
    const headerRight = document.querySelector(".header-right");
    if (!headerRight) return;

    const helpBtn = document.createElement("button");
    helpBtn.className = "btn btn-ghost btn-sm";
    helpBtn.innerHTML = "❓ Help";
    helpBtn.setAttribute("data-tooltip", "Start guided tour");
    helpBtn.setAttribute("aria-label", "Start guided tour");
    helpBtn.style.marginRight = "var(--space-4)";

    helpBtn.addEventListener("click", () => {
      this.start();
    });

    headerRight.insertBefore(helpBtn, headerRight.firstChild);
  },

  /**
   * Start the tour
   */
  start() {
    if (this.isActive) return;

    this.isActive = true;
    this.currentStep = 0;

    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "tour-overlay active";
    document.body.appendChild(this.overlay);

    // Create spotlight
    this.spotlight = document.createElement("div");
    this.spotlight.className = "tour-spotlight";
    document.body.appendChild(this.spotlight);

    // Show first step
    this.showStep(0);
  },

  /**
   * Show a specific step
   */
  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      this.end();
      return;
    }

    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];

    // Find target element
    const target = document.querySelector(step.target);
    if (!target) {
      console.warn(`Tour target not found: ${step.target}`);
      this.next();
      return;
    }

    // Position spotlight
    this.positionSpotlight(target);

    // Create or update popup
    if (this.popup) {
      this.popup.remove();
    }

    this.popup = this.createPopup(step, stepIndex);
    document.body.appendChild(this.popup);

    // Position popup
    this.positionPopup(target, step.position);

    // Scroll target into view
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  },

  /**
   * Position spotlight around target
   */
  positionSpotlight(target) {
    const rect = target.getBoundingClientRect();
    const padding = 8;

    this.spotlight.style.top = `${rect.top - padding + window.scrollY}px`;
    this.spotlight.style.left = `${rect.left - padding + window.scrollX}px`;
    this.spotlight.style.width = `${rect.width + padding * 2}px`;
    this.spotlight.style.height = `${rect.height + padding * 2}px`;
  },

  /**
   * Create popup element
   */
  createPopup(step, stepIndex) {
    const popup = document.createElement("div");
    popup.className = "tour-popup";

    const isLastStep = stepIndex === this.steps.length - 1;

    popup.innerHTML = `
      <div class="tour-header">
        <h3 class="tour-title">${step.title}</h3>
        <button class="tour-close" aria-label="Close tour">×</button>
      </div>
      <div class="tour-content">
        ${step.content}
      </div>
      <div class="tour-footer">
        <div class="tour-progress">
          Step ${stepIndex + 1} of ${this.steps.length}
        </div>
        <div class="tour-actions">
          <button class="tour-skip">Skip Tour</button>
          ${
            stepIndex > 0
              ? '<button class="btn btn-secondary btn-sm tour-prev">Previous</button>'
              : ""
          }
          <button class="btn btn-primary btn-sm tour-next">
            ${isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    `;

    // Event listeners
    popup.querySelector(".tour-close").addEventListener("click", () => {
      this.end(false);
    });

    popup.querySelector(".tour-skip").addEventListener("click", () => {
      this.end(false);
    });

    const nextBtn = popup.querySelector(".tour-next");
    nextBtn.addEventListener("click", () => {
      if (isLastStep) {
        this.end(true);
      } else {
        this.next();
      }
    });

    const prevBtn = popup.querySelector(".tour-prev");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        this.previous();
      });
    }

    return popup;
  },

  /**
   * Position popup relative to target
   */
  positionPopup(target, position) {
    const rect = target.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    const spacing = 20;

    let top, left;

    switch (position) {
      case "bottom":
        top = rect.bottom + spacing + window.scrollY;
        left =
          rect.left + rect.width / 2 - popupRect.width / 2 + window.scrollX;
        break;
      case "top":
        top = rect.top - popupRect.height - spacing + window.scrollY;
        left =
          rect.left + rect.width / 2 - popupRect.width / 2 + window.scrollX;
        break;
      case "left":
        top =
          rect.top + rect.height / 2 - popupRect.height / 2 + window.scrollY;
        left = rect.left - popupRect.width - spacing + window.scrollX;
        break;
      case "right":
        top =
          rect.top + rect.height / 2 - popupRect.height / 2 + window.scrollY;
        left = rect.right + spacing + window.scrollX;
        break;
      default:
        top = rect.bottom + spacing + window.scrollY;
        left =
          rect.left + rect.width / 2 - popupRect.width / 2 + window.scrollX;
    }

    // Keep popup within viewport
    const maxLeft = window.innerWidth - popupRect.width - 20;
    const maxTop = window.innerHeight - popupRect.height - 20;

    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  },

  /**
   * Go to next step
   */
  next() {
    this.showStep(this.currentStep + 1);
  },

  /**
   * Go to previous step
   */
  previous() {
    this.showStep(this.currentStep - 1);
  },

  /**
   * End the tour
   */
  end(completed = false) {
    this.isActive = false;

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    if (this.spotlight) {
      this.spotlight.remove();
      this.spotlight = null;
    }

    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }

    if (completed) {
      Utils.storage.set("tour_completed", true);
      Utils.showToast(
        "Tour completed! You're ready to start using Contract AI Platform.",
        "success"
      );
    }
  },
};

// Initialize tour when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    OnboardingTour.init();
  });
} else {
  OnboardingTour.init();
}
