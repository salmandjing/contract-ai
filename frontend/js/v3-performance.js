/* ============================================
   Contract AI Platform V3 - Performance Optimizations
   ============================================ */

/**
 * Performance Optimization Module
 * Implements lazy loading, debouncing, caching, virtual scrolling, and memory management
 */

const Performance = {
  // Cache for API responses
  cache: new Map(),
  cacheTimestamps: new Map(),
  cacheTTL: 5 * 60 * 1000, // 5 minutes default TTL

  // Lazy loading state
  lazyLoadedTabs: new Set(),

  // Virtual scrolling instances
  virtualScrollers: new Map(),

  // Memory leak prevention
  eventListeners: new WeakMap(),
  timers: new Set(),
  observers: new Set(),

  /**
   * Initialize performance optimizations
   */
  init() {
    console.log("Initializing performance optimizations...");

    // Setup cache cleanup
    this.setupCacheCleanup();

    // Setup memory leak prevention
    this.setupMemoryManagement();

    // Setup intersection observer for lazy loading
    this.setupLazyLoading();

    console.log("Performance optimizations initialized");
  },

  /**
   * Lazy Loading for Tab Content
   */
  lazyLoadTab(tabName, loadFunction) {
    // Check if already loaded
    if (this.lazyLoadedTabs.has(tabName)) {
      return Promise.resolve();
    }

    // Mark as loaded
    this.lazyLoadedTabs.add(tabName);

    // Load the tab content
    return loadFunction();
  },

  /**
   * Mark tab as unloaded (for cleanup)
   */
  unloadTab(tabName) {
    this.lazyLoadedTabs.delete(tabName);
  },

  /**
   * Debounce function with configurable wait time
   */
  debounce(func, wait = 300, options = {}) {
    let timeout;
    let lastCallTime = 0;
    const { leading = false, trailing = true, maxWait = null } = options;

    return function executedFunction(...args) {
      const context = this;
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      const later = () => {
        timeout = null;
        if (trailing) {
          lastCallTime = now;
          func.apply(context, args);
        }
      };

      const shouldCallNow = leading && !timeout;

      clearTimeout(timeout);

      // If maxWait is set and exceeded, call immediately
      if (maxWait && timeSinceLastCall >= maxWait) {
        lastCallTime = now;
        func.apply(context, args);
      } else {
        timeout = setTimeout(later, wait);
        Performance.timers.add(timeout);
      }

      if (shouldCallNow) {
        lastCallTime = now;
        func.apply(context, args);
      }
    };
  },

  /**
   * Throttle function - ensures function is called at most once per interval
   */
  throttle(func, limit = 300) {
    let inThrottle;
    return function (...args) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        const timer = setTimeout(() => {
          inThrottle = false;
        }, limit);
        Performance.timers.add(timer);
      }
    };
  },

  /**
   * Response Caching
   */
  cacheResponse(key, data, ttl = null) {
    const cacheKey = this.getCacheKey(key);
    this.cache.set(cacheKey, data);
    this.cacheTimestamps.set(cacheKey, Date.now());

    if (ttl) {
      const timer = setTimeout(() => {
        this.cache.delete(cacheKey);
        this.cacheTimestamps.delete(cacheKey);
      }, ttl);
      this.timers.add(timer);
    }
  },

  getCachedResponse(key) {
    const cacheKey = this.getCacheKey(key);

    if (!this.cache.has(cacheKey)) {
      return null;
    }

    const timestamp = this.cacheTimestamps.get(cacheKey);
    const age = Date.now() - timestamp;

    // Check if cache is still valid
    if (age > this.cacheTTL) {
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      return null;
    }

    return this.cache.get(cacheKey);
  },

  getCacheKey(key) {
    if (typeof key === "object") {
      return JSON.stringify(key);
    }
    return String(key);
  },

  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      this.cacheTimestamps.clear();
      return;
    }

    // Clear cache entries matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  },

  setupCacheCleanup() {
    // Clean up expired cache entries every minute
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.cacheTimestamps.entries()) {
        if (now - timestamp > this.cacheTTL) {
          this.cache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    }, 60000);

    this.timers.add(cleanupInterval);
  },

  /**
   * Virtual Scrolling for Large Lists
   */
  createVirtualScroller(container, items, renderItem, options = {}) {
    const { itemHeight = 60, bufferSize = 5, containerHeight = 400 } = options;

    const scroller = {
      container,
      items,
      renderItem,
      itemHeight,
      bufferSize,
      containerHeight,
      scrollTop: 0,
      visibleStart: 0,
      visibleEnd: 0,
      renderedItems: new Map(),
    };

    // Setup container
    container.style.height = `${containerHeight}px`;
    container.style.overflow = "auto";
    container.style.position = "relative";

    // Create viewport
    const viewport = document.createElement("div");
    viewport.style.height = `${items.length * itemHeight}px`;
    viewport.style.position = "relative";
    container.appendChild(viewport);

    // Create content container
    const content = document.createElement("div");
    content.style.position = "absolute";
    content.style.top = "0";
    content.style.left = "0";
    content.style.right = "0";
    viewport.appendChild(content);

    scroller.viewport = viewport;
    scroller.content = content;

    // Render initial items
    this.updateVirtualScroller(scroller);

    // Setup scroll handler with throttling
    const scrollHandler = this.throttle(() => {
      scroller.scrollTop = container.scrollTop;
      this.updateVirtualScroller(scroller);
    }, 16); // ~60fps

    container.addEventListener("scroll", scrollHandler);

    // Store scroller instance
    const scrollerId = Utils.generateId();
    this.virtualScrollers.set(scrollerId, scroller);

    return {
      id: scrollerId,
      update: (newItems) => {
        scroller.items = newItems;
        scroller.viewport.style.height = `${newItems.length * itemHeight}px`;
        this.updateVirtualScroller(scroller);
      },
      destroy: () => {
        container.removeEventListener("scroll", scrollHandler);
        this.virtualScrollers.delete(scrollerId);
      },
    };
  },

  updateVirtualScroller(scroller) {
    const { container, items, renderItem, itemHeight, bufferSize, content } =
      scroller;

    const scrollTop = container.scrollTop;
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.ceil(
      (scrollTop + container.clientHeight) / itemHeight
    );

    // Add buffer
    const start = Math.max(0, visibleStart - bufferSize);
    const end = Math.min(items.length, visibleEnd + bufferSize);

    // Update content position
    content.style.transform = `translateY(${start * itemHeight}px)`;

    // Clear content
    content.innerHTML = "";

    // Render visible items
    for (let i = start; i < end; i++) {
      const itemElement = renderItem(items[i], i);
      itemElement.style.height = `${itemHeight}px`;
      content.appendChild(itemElement);
    }

    scroller.visibleStart = start;
    scroller.visibleEnd = end;
  },

  /**
   * DOM Optimization - Batch DOM updates
   */
  batchDOMUpdates(updates) {
    // Use requestAnimationFrame for optimal timing
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        updates();
        resolve();
      });
    });
  },

  /**
   * Document Fragment for multiple DOM insertions
   */
  createFragment(htmlString) {
    const template = document.createElement("template");
    template.innerHTML = htmlString.trim();
    return template.content;
  },

  /**
   * Efficient DOM manipulation - minimize reflows
   */
  updateElements(elements, updates) {
    // Batch read operations
    const measurements = elements.map((el) => ({
      element: el,
      rect: el.getBoundingClientRect(),
    }));

    // Batch write operations
    requestAnimationFrame(() => {
      elements.forEach((el, index) => {
        const update = updates[index];
        if (update) {
          Object.assign(el.style, update);
        }
      });
    });
  },

  /**
   * Memory Leak Prevention
   */
  setupMemoryManagement() {
    // Track page visibility to pause/resume operations
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseBackgroundOperations();
      } else {
        this.resumeBackgroundOperations();
      }
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  },

  pauseBackgroundOperations() {
    // Clear all timers
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();
  },

  resumeBackgroundOperations() {
    // Restart cache cleanup
    this.setupCacheCleanup();
  },

  /**
   * Register event listener for cleanup tracking
   */
  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);

    // Track for cleanup
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element).push({ event, handler, options });
  },

  /**
   * Remove all tracked event listeners from an element
   */
  removeEventListeners(element) {
    const listeners = this.eventListeners.get(element);
    if (listeners) {
      listeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
      this.eventListeners.delete(element);
    }
  },

  /**
   * Setup Intersection Observer for lazy loading
   */
  setupLazyLoading() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const src = element.dataset.src;

            if (src) {
              element.src = src;
              element.removeAttribute("data-src");
              observer.unobserve(element);
            }
          }
        });
      },
      {
        rootMargin: "50px",
      }
    );

    this.observers.add(observer);
    return observer;
  },

  /**
   * Observe element for lazy loading
   */
  observeLazyLoad(element) {
    const observer = Array.from(this.observers).find(
      (obs) => obs instanceof IntersectionObserver
    );

    if (observer) {
      observer.observe(element);
    }
  },

  /**
   * Request Deduplication
   */
  pendingRequests: new Map(),

  async deduplicateRequest(key, requestFn) {
    const cacheKey = this.getCacheKey(key);

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Check cache first
    const cached = this.getCachedResponse(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Make new request
    const promise = requestFn()
      .then((result) => {
        this.cacheResponse(key, result);
        this.pendingRequests.delete(cacheKey);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  },

  /**
   * Cleanup all resources
   */
  cleanup() {
    console.log("Cleaning up performance resources...");

    // Clear all timers
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();

    // Disconnect all observers
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers.clear();

    // Clear cache
    this.cache.clear();
    this.cacheTimestamps.clear();

    // Clear pending requests
    this.pendingRequests.clear();

    // Destroy virtual scrollers
    for (const scroller of this.virtualScrollers.values()) {
      if (scroller.destroy) {
        scroller.destroy();
      }
    }
    this.virtualScrollers.clear();

    console.log("Performance cleanup complete");
  },

  /**
   * Performance Monitoring
   */
  measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

    // Log slow operations
    if (duration > 100) {
      console.warn(
        `[Performance Warning] Slow operation: ${name} took ${duration.toFixed(
          2
        )}ms`
      );
    }

    return result;
  },

  async measureAsync(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

    if (duration > 1000) {
      console.warn(
        `[Performance Warning] Slow async operation: ${name} took ${duration.toFixed(
          2
        )}ms`
      );
    }

    return result;
  },

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      activeTimers: this.timers.size,
      activeObservers: this.observers.size,
      virtualScrollers: this.virtualScrollers.size,
      lazyLoadedTabs: this.lazyLoadedTabs.size,
      memory: performance.memory
        ? {
            usedJSHeapSize:
              (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) +
              " MB",
            totalJSHeapSize:
              (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) +
              " MB",
            jsHeapSizeLimit:
              (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) +
              " MB",
          }
        : "Not available",
    };
  },

  /**
   * Log performance metrics
   */
  logMetrics() {
    const metrics = this.getMetrics();
    console.table(metrics);
  },
};

// Initialize on load
if (typeof window !== "undefined") {
  window.Performance = Performance;
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Performance;
}
