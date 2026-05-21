/**
 * Performance Testing Utility
 * Tests cross-browser compatibility and responsive behavior
 */

class PerformanceTester {
  constructor() {
    this.testResults = {
      browser: this.detectBrowser(),
      device: this.detectDevice(),
      viewport: this.getViewportInfo(),
      performance: {},
      compatibility: {},
      responsive: {}
    };
  }

  /**
   * Detect browser information
   */
  detectBrowser() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
      version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
      version = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
      name: browser,
      version: version,
      userAgent: userAgent,
      supportsModernFeatures: this.checkModernFeatures()
    };
  }

  /**
   * Check for modern browser features
   */
  checkModernFeatures() {
    return {
      cssGrid: CSS.supports('display', 'grid'),
      cssFlexbox: CSS.supports('display', 'flex'),
      cssCustomProperties: CSS.supports('--custom', 'property'),
      backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
      webp: this.supportsWebP(),
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      es6Modules: 'noModule' in HTMLScriptElement.prototype
    };
  }

  /**
   * Check WebP support
   */
  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Detect device information
   */
  detectDevice() {
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    return {
      type: deviceType,
      isTouchDevice: 'ontouchstart' in window,
      pixelRatio: window.devicePixelRatio || 1,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      connection: this.getConnectionInfo()
    };
  }

  /**
   * Get network connection information
   */
  getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  /**
   * Get viewport information
   */
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      orientation: screen.orientation?.type || 'unknown',
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth
    };
  }

  /**
   * Test responsive breakpoints
   */
  testResponsiveBreakpoints() {
    const breakpoints = [
      { name: 'mobile', width: 320 },
      { name: 'mobile-large', width: 480 },
      { name: 'tablet', width: 768 },
      { name: 'desktop', width: 1024 },
      { name: 'desktop-large', width: 1440 }
    ];

    const results = {};
    const currentWidth = window.innerWidth;

    breakpoints.forEach(bp => {
      results[bp.name] = {
        active: currentWidth >= bp.width,
        width: bp.width,
        mediaQuery: window.matchMedia(`(min-width: ${bp.width}px)`).matches
      };
    });

    return results;
  }

  /**
   * Test CSS animation performance
   */
  testAnimationPerformance() {
    return new Promise((resolve) => {
      const testElement = document.createElement('div');
      testElement.style.cssText = `
        position: absolute;
        top: -100px;
        left: -100px;
        width: 50px;
        height: 50px;
        background: red;
        transition: transform 0.3s ease;
      `;
      
      document.body.appendChild(testElement);
      
      const startTime = performance.now();
      let frameCount = 0;
      
      const measureFrames = () => {
        frameCount++;
        if (frameCount < 60) {
          requestAnimationFrame(measureFrames);
        } else {
          const endTime = performance.now();
          const fps = Math.round(1000 / ((endTime - startTime) / frameCount));
          
          document.body.removeChild(testElement);
          resolve({
            fps: fps,
            duration: endTime - startTime,
            frameCount: frameCount,
            smooth: fps >= 55
          });
        }
      };
      
      // Trigger animation
      testElement.style.transform = 'translateX(100px)';
      requestAnimationFrame(measureFrames);
    });
  }

  /**
   * Test CSS loading performance
   */
  testCSSLoadingPerformance() {
    const stylesheets = Array.from(document.styleSheets);
    const results = {
      totalStylesheets: stylesheets.length,
      loadTimes: [],
      totalSize: 0,
      renderBlockingSheets: 0
    };

    stylesheets.forEach((sheet, index) => {
      try {
        if (sheet.href) {
          // Check if stylesheet is render-blocking
          const linkElement = document.querySelector(`link[href="${sheet.href}"]`);
          if (linkElement && !linkElement.media || linkElement.media === 'all') {
            results.renderBlockingSheets++;
          }
          
          // Estimate rules count
          const rulesCount = sheet.cssRules ? sheet.cssRules.length : 0;
          results.totalSize += rulesCount;
        }
      } catch (e) {
        console.warn(`Cannot access stylesheet ${index}:`, e.message);
      }
    });

    return results;
  }

  /**
   * Test layout stability (CLS)
   */
  measureLayoutStability() {
    return new Promise((resolve) => {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries = [];

      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            if (sessionValue && 
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            if (sessionValue > clsValue) {
              clsValue = sessionValue;
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      // Stop observing after 5 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve({
          cls: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
        });
      }, 5000);
    });
  }

  /**
   * Run comprehensive performance test
   */
  async runComprehensiveTest() {
    console.log('Starting comprehensive performance test...');
    
    // Basic performance metrics
    this.testResults.performance = {
      ...this.testCSSLoadingPerformance(),
      responsive: this.testResponsiveBreakpoints(),
      timestamp: new Date().toISOString()
    };

    // Animation performance
    try {
      this.testResults.performance.animation = await this.testAnimationPerformance();
    } catch (e) {
      console.warn('Animation performance test failed:', e);
    }

    // Layout stability
    try {
      this.testResults.performance.layoutStability = await this.measureLayoutStability();
    } catch (e) {
      console.warn('Layout stability test failed:', e);
    }

    // Compatibility tests
    this.testResults.compatibility = {
      modernFeatures: this.checkModernFeatures(),
      cssSupport: this.testCSSSupport(),
      jsSupport: this.testJSSupport()
    };

    return this.testResults;
  }

  /**
   * Test CSS feature support
   */
  testCSSSupport() {
    const features = [
      'display: grid',
      'display: flex',
      'backdrop-filter: blur(10px)',
      'transform: translateZ(0)',
      'will-change: transform',
      'contain: layout',
      'scroll-behavior: smooth',
      'overscroll-behavior: contain'
    ];

    const support = {};
    features.forEach(feature => {
      const [property, value] = feature.split(': ');
      support[feature] = CSS.supports(property, value);
    });

    return support;
  }

  /**
   * Test JavaScript feature support
   */
  testJSSupport() {
    return {
      es6Classes: typeof class {} === 'function',
      asyncAwait: (async () => {}).constructor === (async function(){}).constructor,
      promises: typeof Promise !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      customElements: 'customElements' in window,
      webComponents: 'customElements' in window && 'attachShadow' in Element.prototype
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      summary: {
        browser: `${this.testResults.browser.name} ${this.testResults.browser.version}`,
        device: this.testResults.device.type,
        viewport: `${this.testResults.viewport.width}x${this.testResults.viewport.height}`,
        timestamp: new Date().toISOString()
      },
      performance: this.testResults.performance,
      compatibility: this.testResults.compatibility,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.testResults.performance?.renderBlockingSheets > 3) {
      recommendations.push('Consider reducing render-blocking stylesheets');
    }
    
    if (this.testResults.performance?.animation?.fps < 55) {
      recommendations.push('Optimize animations for better performance');
    }
    
    if (!this.testResults.browser.supportsModernFeatures?.cssGrid) {
      recommendations.push('Add fallbacks for older browsers');
    }
    
    if (this.testResults.device.type === 'mobile') {
      recommendations.push('Optimize for mobile performance and touch interactions');
    }
    
    if (this.testResults.device.connection?.effectiveType === 'slow-2g') {
      recommendations.push('Optimize for slow network connections');
    }

    return recommendations;
  }
}

// Export for use in development
if (typeof window !== 'undefined') {
  window.PerformanceTester = PerformanceTester;
}

export default PerformanceTester;