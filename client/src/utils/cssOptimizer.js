/**
 * CSS Optimization Utility
 * Analyzes CSS usage and provides optimization recommendations
 */

class CSSOptimizer {
  constructor() {
    this.usedClasses = new Set();
    this.unusedClasses = new Set();
    this.criticalCSS = new Set();
  }

  /**
   * Scan DOM for used CSS classes
   */
  scanUsedClasses() {
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ');
        classes.forEach(cls => {
          if (cls.trim()) {
            this.usedClasses.add(cls.trim());
          }
        });
      }
    });
    return this.usedClasses;
  }

  /**
   * Identify critical above-the-fold CSS
   */
  identifyCriticalCSS() {
    const viewportHeight = window.innerHeight;
    const elementsInViewport = [];
    
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > 0) {
        elementsInViewport.push(element);
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ');
          classes.forEach(cls => {
            if (cls.trim()) {
              this.criticalCSS.add(cls.trim());
            }
          });
        }
      }
    });
    
    return this.criticalCSS;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const usedClasses = this.scanUsedClasses();
    const criticalClasses = this.identifyCriticalCSS();
    
    return {
      totalUsedClasses: usedClasses.size,
      criticalClasses: criticalClasses.size,
      usedClassesList: Array.from(usedClasses),
      criticalClassesList: Array.from(criticalClasses),
      recommendations: this.getOptimizationRecommendations()
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    return [
      'Use CSS containment for isolated components',
      'Implement critical CSS inlining for above-the-fold content',
      'Remove unused CSS classes and properties',
      'Minimize CSS bundle size by combining similar rules',
      'Use CSS custom properties for consistent theming',
      'Implement lazy loading for non-critical CSS'
    ];
  }

  /**
   * Measure CSS performance metrics
   */
  measurePerformance() {
    const startTime = performance.now();
    
    // Force style recalculation
    document.body.offsetHeight;
    
    const endTime = performance.now();
    const styleRecalcTime = endTime - startTime;
    
    // Get CSS file sizes
    const stylesheets = Array.from(document.styleSheets);
    let totalCSSSize = 0;
    
    stylesheets.forEach(sheet => {
      try {
        if (sheet.href) {
          // Estimate size based on rules count (approximate)
          const rulesCount = sheet.cssRules ? sheet.cssRules.length : 0;
          totalCSSSize += rulesCount * 50; // Rough estimate: 50 bytes per rule
        }
      } catch (e) {
        // Cross-origin stylesheets may not be accessible
        console.warn('Cannot access stylesheet:', sheet.href);
      }
    });
    
    return {
      styleRecalculationTime: styleRecalcTime,
      estimatedCSSSize: totalCSSSize,
      stylesheetsCount: stylesheets.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check for CSS performance issues
   */
  checkPerformanceIssues() {
    const issues = [];
    
    // Check for excessive CSS selectors
    const allElements = document.querySelectorAll('*');
    if (allElements.length > 1000) {
      issues.push('High DOM complexity may impact CSS performance');
    }
    
    // Check for complex selectors
    const complexSelectors = document.querySelectorAll('[class*=" "], [class*=":"]');
    if (complexSelectors.length > 100) {
      issues.push('Many complex CSS selectors detected');
    }
    
    // Check for inline styles
    const inlineStyles = document.querySelectorAll('[style]');
    if (inlineStyles.length > 50) {
      issues.push('Excessive inline styles detected - consider moving to CSS classes');
    }
    
    // Check for unused vendor prefixes
    const styles = getComputedStyle(document.body);
    const vendorPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];
    let hasUnnecessaryPrefixes = false;
    
    for (let prop in styles) {
      if (vendorPrefixes.some(prefix => prop.startsWith(prefix))) {
        hasUnnecessaryPrefixes = true;
        break;
      }
    }
    
    if (hasUnnecessaryPrefixes) {
      issues.push('Consider removing unnecessary vendor prefixes for modern browsers');
    }
    
    return issues;
  }
}

// Export for use in development
if (typeof window !== 'undefined') {
  window.CSSOptimizer = CSSOptimizer;
}

export default CSSOptimizer;