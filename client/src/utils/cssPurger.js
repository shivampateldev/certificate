/**
 * CSS Purging Utility
 * Removes unused CSS classes and optimizes stylesheets
 */

class CSSPurger {
  constructor() {
    this.usedClasses = new Set();
    this.usedIds = new Set();
    this.usedElements = new Set();
    this.criticalSelectors = new Set();
    this.purgedCSS = '';
  }

  /**
   * Scan DOM for used CSS selectors
   */
  scanUsedSelectors() {
    console.log('🔍 Scanning DOM for used CSS selectors...');
    
    // Scan all elements
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      // Collect tag names
      this.usedElements.add(element.tagName.toLowerCase());
      
      // Collect class names
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ');
        classes.forEach(cls => {
          if (cls.trim()) {
            this.usedClasses.add(cls.trim());
          }
        });
      }
      
      // Collect IDs
      if (element.id) {
        this.usedIds.add(element.id);
      }
    });
    
    // Add critical selectors that might not be in DOM yet
    this.addCriticalSelectors();
    
    console.log(`📊 Found ${this.usedClasses.size} classes, ${this.usedIds.size} IDs, ${this.usedElements.size} elements`);
    
    return {
      classes: Array.from(this.usedClasses),
      ids: Array.from(this.usedIds),
      elements: Array.from(this.usedElements)
    };
  }

  /**
   * Add critical selectors that should always be kept
   */
  addCriticalSelectors() {
    const criticalSelectors = [
      // Pseudo-classes and states
      ':hover', ':focus', ':active', ':visited', ':disabled',
      ':first-child', ':last-child', ':nth-child', ':not',
      
      // Media query related
      '@media', '@keyframes', '@supports',
      
      // Common utility classes
      '.sr-only', '.visually-hidden', '.screen-reader-text',
      '.hidden', '.invisible', '.visible',
      
      // Framework classes that might be added dynamically
      '.loading', '.error', '.success', '.warning',
      '.modal-open', '.dropdown-open', '.menu-open',
      
      // Animation classes
      '.fade-in', '.fade-out', '.slide-in', '.slide-out',
      '.animate', '.transition',
      
      // Responsive utilities
      '.mobile-only', '.tablet-only', '.desktop-only',
      '.sm\\:', '.md\\:', '.lg\\:', '.xl\\:',
      
      // Common component states
      '.is-active', '.is-open', '.is-closed', '.is-loading',
      '.has-error', '.is-valid', '.is-invalid'
    ];
    
    criticalSelectors.forEach(selector => {
      this.criticalSelectors.add(selector);
    });
  }

  /**
   * Check if a CSS selector should be kept
   */
  shouldKeepSelector(selector) {
    if (!selector || typeof selector !== 'string') return false;
    
    // Always keep critical selectors
    for (const critical of this.criticalSelectors) {
      if (selector.includes(critical)) {
        return true;
      }
    }
    
    // Keep universal selectors
    if (selector.includes('*') || selector === 'html' || selector === 'body') {
      return true;
    }
    
    // Keep CSS variables and root selectors
    if (selector.includes(':root') || selector.includes('--')) {
      return true;
    }
    
    // Keep media queries and keyframes
    if (selector.startsWith('@')) {
      return true;
    }
    
    // Parse and check individual parts of complex selectors
    const parts = selector.split(/[\s,>+~]/).filter(part => part.trim());
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      
      // Check class selectors
      if (trimmedPart.startsWith('.')) {
        const className = trimmedPart.substring(1).split(':')[0].split('[')[0];
        if (this.usedClasses.has(className)) {
          return true;
        }
      }
      
      // Check ID selectors
      if (trimmedPart.startsWith('#')) {
        const idName = trimmedPart.substring(1).split(':')[0].split('[')[0];
        if (this.usedIds.has(idName)) {
          return true;
        }
      }
      
      // Check element selectors
      const elementName = trimmedPart.split(':')[0].split('[')[0].toLowerCase();
      if (this.usedElements.has(elementName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Purge CSS from stylesheet
   */
  purgeStylesheet(stylesheet) {
    const purgedRules = [];
    let originalRuleCount = 0;
    let keptRuleCount = 0;
    
    try {
      if (!stylesheet.cssRules) {
        console.warn('Cannot access stylesheet rules (likely cross-origin)');
        return { purgedRules: [], originalCount: 0, keptCount: 0 };
      }
      
      Array.from(stylesheet.cssRules).forEach(rule => {
        originalRuleCount++;
        
        if (rule.type === CSSRule.STYLE_RULE) {
          const selector = rule.selectorText;
          
          if (this.shouldKeepSelector(selector)) {
            purgedRules.push(rule.cssText);
            keptRuleCount++;
          }
        } else if (rule.type === CSSRule.MEDIA_RULE) {
          // Handle media queries recursively
          const mediaRules = [];
          Array.from(rule.cssRules).forEach(mediaRule => {
            if (mediaRule.type === CSSRule.STYLE_RULE) {
              if (this.shouldKeepSelector(mediaRule.selectorText)) {
                mediaRules.push(mediaRule.cssText);
              }
            }
          });
          
          if (mediaRules.length > 0) {
            purgedRules.push(`@media ${rule.conditionText} { ${mediaRules.join(' ')} }`);
            keptRuleCount++;
          }
        } else if (rule.type === CSSRule.KEYFRAMES_RULE || 
                   rule.type === CSSRule.SUPPORTS_RULE ||
                   rule.type === CSSRule.IMPORT_RULE) {
          // Keep keyframes, supports, and import rules
          purgedRules.push(rule.cssText);
          keptRuleCount++;
        }
      });
      
    } catch (error) {
      console.warn('Error processing stylesheet:', error.message);
    }
    
    return {
      purgedRules,
      originalCount: originalRuleCount,
      keptCount: keptRuleCount
    };
  }

  /**
   * Purge all stylesheets
   */
  purgeAllStylesheets() {
    console.log('🧹 Purging unused CSS from all stylesheets...');
    
    // First scan for used selectors
    this.scanUsedSelectors();
    
    const stylesheets = Array.from(document.styleSheets);
    let totalOriginal = 0;
    let totalKept = 0;
    const allPurgedRules = [];
    
    stylesheets.forEach((stylesheet, index) => {
      console.log(`Processing stylesheet ${index + 1}/${stylesheets.length}...`);
      
      const result = this.purgeStylesheet(stylesheet);
      totalOriginal += result.originalCount;
      totalKept += result.keptCount;
      
      if (result.purgedRules.length > 0) {
        allPurgedRules.push(`/* Stylesheet ${index + 1} */`);
        allPurgedRules.push(...result.purgedRules);
      }
    });
    
    this.purgedCSS = allPurgedRules.join('\n');
    
    const savingsPercentage = totalOriginal > 0 ? 
      Math.round(((totalOriginal - totalKept) / totalOriginal) * 100) : 0;
    
    console.log(`✅ CSS purging complete!`);
    console.log(`📊 Original rules: ${totalOriginal}`);
    console.log(`📊 Kept rules: ${totalKept}`);
    console.log(`📊 Savings: ${savingsPercentage}%`);
    
    return {
      originalRules: totalOriginal,
      keptRules: totalKept,
      savingsPercentage,
      purgedCSS: this.purgedCSS
    };
  }

  /**
   * Generate optimized CSS bundle
   */
  generateOptimizedBundle() {
    const result = this.purgeAllStylesheets();
    
    // Add essential CSS variables and reset
    const essentialCSS = `
/* Optimized CSS Bundle - Generated ${new Date().toISOString()} */

/* Essential CSS Variables */
:root {
  --primary-bg: #FFFFFF;
  --secondary-bg: #F8FAFC;
  --primary-blue: #2563EB;
  --secondary-blue: #3B82F6;
  --cyan-accent: #06B6D4;
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --border-color: #E5E7EB;
  --shadow-color: rgba(0, 0, 0, 0.1);
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --shadow-sm: 0 1px 2px 0 var(--shadow-color);
  --shadow-md: 0 4px 6px -1px var(--shadow-color);
  --shadow-lg: 0 10px 15px -3px var(--shadow-color);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}

/* Essential Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--primary-bg);
  color: var(--text-primary);
  line-height: 1.5;
  font-size: var(--text-base);
}

/* Performance Optimizations */
.will-change-transform { will-change: transform; }
.gpu-accelerated { transform: translateZ(0); }

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Purged CSS Rules */
${result.purgedCSS}
`;
    
    return {
      ...result,
      optimizedCSS: essentialCSS
    };
  }

  /**
   * Download optimized CSS bundle
   */
  downloadOptimizedBundle() {
    const bundle = this.generateOptimizedBundle();
    
    const blob = new Blob([bundle.optimizedCSS], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-bundle-${new Date().toISOString().split('T')[0]}.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📄 Optimized CSS bundle downloaded');
    console.log(`💾 File size reduced by approximately ${bundle.savingsPercentage}%`);
    
    return bundle;
  }

  /**
   * Apply optimized CSS to current page (for testing)
   */
  applyOptimizedCSS() {
    const bundle = this.generateOptimizedBundle();
    
    // Remove existing stylesheets (except external ones)
    const stylesheets = Array.from(document.styleSheets);
    stylesheets.forEach(sheet => {
      if (sheet.ownerNode && sheet.ownerNode.tagName === 'STYLE') {
        sheet.ownerNode.remove();
      }
    });
    
    // Add optimized CSS
    const style = document.createElement('style');
    style.textContent = bundle.optimizedCSS;
    document.head.appendChild(style);
    
    console.log('✅ Optimized CSS applied to current page');
    console.log('🔄 Refresh page to revert to original styles');
    
    return bundle;
  }

  /**
   * Generate CSS purging report
   */
  generateReport() {
    const bundle = this.generateOptimizedBundle();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        originalRules: bundle.originalRules,
        keptRules: bundle.keptRules,
        removedRules: bundle.originalRules - bundle.keptRules,
        savingsPercentage: bundle.savingsPercentage
      },
      usedSelectors: {
        classes: Array.from(this.usedClasses),
        ids: Array.from(this.usedIds),
        elements: Array.from(this.usedElements)
      },
      criticalSelectors: Array.from(this.criticalSelectors),
      recommendations: this.getOptimizationRecommendations(bundle)
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(bundle) {
    const recommendations = [];
    
    if (bundle.savingsPercentage > 50) {
      recommendations.push('High CSS savings potential - implement automated CSS purging in build process');
    }
    
    if (bundle.savingsPercentage > 30) {
      recommendations.push('Consider splitting CSS into critical and non-critical parts');
    }
    
    if (this.usedClasses.size > 100) {
      recommendations.push('Large number of CSS classes - consider using CSS-in-JS or component-scoped styles');
    }
    
    recommendations.push('Implement CSS tree-shaking in your build process');
    recommendations.push('Use PurgeCSS or similar tools for production builds');
    recommendations.push('Consider using CSS modules for better maintainability');
    
    return recommendations;
  }
}

// Export for use in development
if (typeof window !== 'undefined') {
  window.CSSPurger = CSSPurger;
  
  // Add global functions for easy testing
  window.purgeCSS = () => {
    const purger = new CSSPurger();
    return purger.purgeAllStylesheets();
  };
  
  window.downloadOptimizedCSS = () => {
    const purger = new CSSPurger();
    return purger.downloadOptimizedBundle();
  };
  
  window.applyOptimizedCSS = () => {
    const purger = new CSSPurger();
    return purger.applyOptimizedCSS();
  };
}

export default CSSPurger;