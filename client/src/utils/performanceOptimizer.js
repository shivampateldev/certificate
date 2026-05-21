/**
 * Performance Optimization Utility
 * Handles CSS optimization, cross-browser testing, and responsive validation
 */

import CSSOptimizer from './cssOptimizer.js';
import PerformanceTester from './performanceTester.js';
import ResponsiveTester from './responsiveTester.js';

class PerformanceOptimizer {
  constructor() {
    this.cssOptimizer = new CSSOptimizer();
    this.performanceTester = new PerformanceTester();
    this.responsiveTester = new ResponsiveTester();
    
    this.optimizationResults = {
      css: {},
      performance: {},
      responsive: {},
      crossBrowser: {},
      recommendations: []
    };
  }

  /**
   * Run complete performance optimization suite
   */
  async runCompleteOptimization() {
    console.log('🚀 Starting complete performance optimization...');
    
    try {
      // Step 1: CSS Bundle Optimization
      console.log('📦 Optimizing CSS bundle...');
      this.optimizationResults.css = await this.optimizeCSSBundle();
      
      // Step 2: Cross-browser compatibility testing
      console.log('🌐 Testing cross-browser compatibility...');
      this.optimizationResults.crossBrowser = await this.testCrossBrowserCompatibility();
      
      // Step 3: Responsive behavior validation
      console.log('📱 Validating responsive behavior...');
      this.optimizationResults.responsive = await this.validateResponsiveBehavior();
      
      // Step 4: Animation performance testing
      console.log('🎬 Testing animation performance...');
      this.optimizationResults.performance = await this.testAnimationPerformance();
      
      // Step 5: Generate comprehensive report
      console.log('📊 Generating optimization report...');
      const report = this.generateOptimizationReport();
      
      console.log('✅ Performance optimization complete!');
      return report;
      
    } catch (error) {
      console.error('❌ Performance optimization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize CSS bundle size and remove unused styles
   */
  async optimizeCSSBundle() {
    const results = {
      originalSize: 0,
      optimizedSize: 0,
      unusedClasses: [],
      criticalCSS: [],
      recommendations: []
    };

    try {
      // Scan for used CSS classes
      const usedClasses = this.cssOptimizer.scanUsedClasses();
      const criticalClasses = this.cssOptimizer.identifyCriticalCSS();
      
      // Get all stylesheets
      const stylesheets = Array.from(document.styleSheets);
      let totalRules = 0;
      let usedRules = 0;
      const unusedSelectors = [];
      
      stylesheets.forEach(sheet => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach(rule => {
              totalRules++;
              if (rule.type === CSSRule.STYLE_RULE) {
                const selector = rule.selectorText;
                const isUsed = this.isSelectorUsed(selector, usedClasses);
                if (isUsed) {
                  usedRules++;
                } else {
                  unusedSelectors.push(selector);
                }
              }
            });
          }
        } catch (e) {
          console.warn('Cannot access stylesheet rules:', e.message);
        }
      });
      
      results.originalSize = totalRules;
      results.optimizedSize = usedRules;
      results.unusedClasses = unusedSelectors;
      results.criticalCSS = Array.from(criticalClasses);
      results.savingsPercentage = Math.round(((totalRules - usedRules) / totalRules) * 100);
      
      // Generate CSS optimization recommendations
      results.recommendations = this.generateCSSRecommendations(results);
      
      return results;
      
    } catch (error) {
      console.error('CSS optimization failed:', error);
      return results;
    }
  }

  /**
   * Check if CSS selector is used in the DOM
   */
  isSelectorUsed(selector, usedClasses) {
    try {
      // Simple class selector check
      if (selector.startsWith('.')) {
        const className = selector.substring(1).split(':')[0].split(' ')[0];
        return usedClasses.has(className);
      }
      
      // Element selector check
      if (/^[a-zA-Z]+$/.test(selector)) {
        return document.querySelector(selector) !== null;
      }
      
      // Complex selector check
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return true; // Keep if we can't validate
      }
    } catch (e) {
      return true; // Keep if we can't validate
    }
  }

  /**
   * Generate CSS optimization recommendations
   */
  generateCSSRecommendations(results) {
    const recommendations = [];
    
    if (results.savingsPercentage > 30) {
      recommendations.push('Consider removing unused CSS classes to reduce bundle size by ' + results.savingsPercentage + '%');
    }
    
    if (results.criticalCSS.length < 20) {
      recommendations.push('Consider inlining critical CSS for faster initial render');
    }
    
    if (results.unusedClasses.length > 50) {
      recommendations.push('Implement CSS purging in build process to automatically remove unused styles');
    }
    
    recommendations.push('Use CSS containment for isolated components');
    recommendations.push('Implement lazy loading for non-critical CSS');
    
    return recommendations;
  }

  /**
   * Test cross-browser compatibility
   */
  async testCrossBrowserCompatibility() {
    const results = {
      browser: this.performanceTester.detectBrowser(),
      modernFeatures: this.performanceTester.checkModernFeatures(),
      cssSupport: this.performanceTester.testCSSSupport(),
      jsSupport: this.performanceTester.testJSSupport(),
      issues: [],
      recommendations: []
    };

    // Test specific CSS features
    const cssFeatures = [
      { property: 'display', value: 'grid', name: 'CSS Grid' },
      { property: 'display', value: 'flex', name: 'Flexbox' },
      { property: 'backdrop-filter', value: 'blur(10px)', name: 'Backdrop Filter' },
      { property: 'scroll-behavior', value: 'smooth', name: 'Smooth Scrolling' },
      { property: 'overscroll-behavior', value: 'contain', name: 'Overscroll Behavior' },
      { property: 'contain', value: 'layout', name: 'CSS Containment' }
    ];

    cssFeatures.forEach(feature => {
      const supported = CSS.supports(feature.property, feature.value);
      results.cssSupport[feature.name] = supported;
      
      if (!supported) {
        results.issues.push(`${feature.name} not supported in ${results.browser.name}`);
        results.recommendations.push(`Add fallback for ${feature.name}`);
      }
    });

    // Test JavaScript features
    const jsFeatures = [
      { test: () => 'IntersectionObserver' in window, name: 'Intersection Observer' },
      { test: () => 'ResizeObserver' in window, name: 'Resize Observer' },
      { test: () => typeof fetch !== 'undefined', name: 'Fetch API' },
      { test: () => 'customElements' in window, name: 'Custom Elements' }
    ];

    jsFeatures.forEach(feature => {
      const supported = feature.test();
      results.jsSupport[feature.name] = supported;
      
      if (!supported) {
        results.issues.push(`${feature.name} not supported in ${results.browser.name}`);
        results.recommendations.push(`Add polyfill for ${feature.name}`);
      }
    });

    return results;
  }

  /**
   * Validate responsive behavior across different device sizes
   */
  async validateResponsiveBehavior() {
    const results = await this.responsiveTester.runComprehensiveTest();
    
    // Additional responsive validation
    const additionalTests = {
      textReadability: this.testTextReadability(),
      touchTargets: this.validateTouchTargets(),
      imageOptimization: this.testImageOptimization(),
      layoutStability: await this.testLayoutStability()
    };
    
    results.additionalTests = additionalTests;
    
    return results;
  }

  /**
   * Test text readability across screen sizes
   */
  testTextReadability() {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
    const results = {
      totalElements: textElements.length,
      readableElements: 0,
      issues: []
    };
    
    textElements.forEach((element, index) => {
      const style = getComputedStyle(element);
      const fontSize = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
      const color = style.color;
      const backgroundColor = style.backgroundColor;
      
      // Check minimum font size (14px for body text, 16px for mobile)
      const minFontSize = window.innerWidth < 768 ? 16 : 14;
      if (fontSize < minFontSize) {
        results.issues.push(`Element ${index}: Font size ${fontSize}px is too small`);
      } else {
        results.readableElements++;
      }
      
      // Check line height (should be at least 1.4)
      if (lineHeight / fontSize < 1.4) {
        results.issues.push(`Element ${index}: Line height ratio ${(lineHeight / fontSize).toFixed(2)} is too small`);
      }
    });
    
    results.readabilityScore = Math.round((results.readableElements / results.totalElements) * 100);
    
    return results;
  }

  /**
   * Validate touch targets for mobile devices
   */
  validateTouchTargets() {
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [onclick], [role="button"]');
    const results = {
      totalElements: interactiveElements.length,
      touchFriendlyElements: 0,
      issues: []
    };
    
    interactiveElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // 44px minimum touch target size
      
      if (rect.width >= minSize && rect.height >= minSize) {
        results.touchFriendlyElements++;
      } else {
        results.issues.push(`Element ${index} (${element.tagName}): Size ${Math.round(rect.width)}x${Math.round(rect.height)}px is too small for touch`);
      }
    });
    
    results.touchFriendlyScore = Math.round((results.touchFriendlyElements / results.totalElements) * 100);
    
    return results;
  }

  /**
   * Test image optimization
   */
  testImageOptimization() {
    const images = document.querySelectorAll('img');
    const results = {
      totalImages: images.length,
      optimizedImages: 0,
      issues: []
    };
    
    images.forEach((img, index) => {
      const rect = img.getBoundingClientRect();
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      // Check if image is oversized
      if (naturalWidth > displayWidth * 2 || naturalHeight > displayHeight * 2) {
        results.issues.push(`Image ${index}: Natural size ${naturalWidth}x${naturalHeight} is much larger than display size ${Math.round(displayWidth)}x${Math.round(displayHeight)}`);
      } else {
        results.optimizedImages++;
      }
      
      // Check for lazy loading
      if (!img.loading || img.loading !== 'lazy') {
        results.issues.push(`Image ${index}: Missing lazy loading attribute`);
      }
      
      // Check for alt text
      if (!img.alt) {
        results.issues.push(`Image ${index}: Missing alt text for accessibility`);
      }
    });
    
    results.optimizationScore = results.totalImages > 0 ? Math.round((results.optimizedImages / results.totalImages) * 100) : 100;
    
    return results;
  }

  /**
   * Test layout stability
   */
  async testLayoutStability() {
    return new Promise((resolve) => {
      let clsValue = 0;
      const entries = [];
      
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            entries.push({
              value: entry.value,
              startTime: entry.startTime,
              sources: entry.sources?.map(source => ({
                node: source.node?.tagName || 'unknown',
                currentRect: source.currentRect,
                previousRect: source.previousRect
              }))
            });
          }
        }
      });
      
      if ('PerformanceObserver' in window) {
        observer.observe({ type: 'layout-shift', buffered: true });
      }
      
      setTimeout(() => {
        if ('PerformanceObserver' in window) {
          observer.disconnect();
        }
        
        resolve({
          cls: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
          entries: entries,
          recommendations: clsValue > 0.1 ? [
            'Add size attributes to images and videos',
            'Reserve space for dynamic content',
            'Avoid inserting content above existing content'
          ] : []
        });
      }, 3000);
    });
  }

  /**
   * Test animation performance on lower-end devices
   */
  async testAnimationPerformance() {
    const results = {
      fps: 0,
      frameDrops: 0,
      smoothness: 'unknown',
      recommendations: []
    };
    
    try {
      // Test CSS animation performance
      const animationTest = await this.performanceTester.testAnimationPerformance();
      results.fps = animationTest.fps;
      results.smoothness = animationTest.smooth ? 'smooth' : 'choppy';
      
      // Test transform performance
      const transformTest = await this.testTransformPerformance();
      results.transformPerformance = transformTest;
      
      // Generate recommendations
      if (results.fps < 55) {
        results.recommendations.push('Optimize animations for better performance');
        results.recommendations.push('Use transform and opacity for animations');
        results.recommendations.push('Add will-change property for animated elements');
      }
      
      if (transformTest.duration > 100) {
        results.recommendations.push('Reduce animation complexity for lower-end devices');
      }
      
      return results;
      
    } catch (error) {
      console.error('Animation performance test failed:', error);
      return results;
    }
  }

  /**
   * Test CSS transform performance
   */
  testTransformPerformance() {
    return new Promise((resolve) => {
      const testElement = document.createElement('div');
      testElement.style.cssText = `
        position: absolute;
        top: -200px;
        left: -200px;
        width: 100px;
        height: 100px;
        background: linear-gradient(45deg, #2563EB, #06B6D4);
        border-radius: 50%;
        will-change: transform;
      `;
      
      document.body.appendChild(testElement);
      
      const startTime = performance.now();
      let animationId;
      let frameCount = 0;
      
      const animate = () => {
        frameCount++;
        const progress = (performance.now() - startTime) / 1000;
        
        testElement.style.transform = `
          translateX(${Math.sin(progress * 2) * 50}px)
          translateY(${Math.cos(progress * 2) * 50}px)
          rotate(${progress * 180}deg)
          scale(${1 + Math.sin(progress) * 0.2})
        `;
        
        if (frameCount < 120) { // Test for 2 seconds at 60fps
          animationId = requestAnimationFrame(animate);
        } else {
          const endTime = performance.now();
          document.body.removeChild(testElement);
          
          resolve({
            duration: endTime - startTime,
            frameCount: frameCount,
            averageFps: Math.round((frameCount / (endTime - startTime)) * 1000),
            performance: endTime - startTime < 2100 ? 'good' : 'poor'
          });
        }
      };
      
      animationId = requestAnimationFrame(animate);
    });
  }

  /**
   * Generate comprehensive optimization report
   */
  generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overallScore: this.calculateOverallScore(),
        criticalIssues: this.getCriticalIssues(),
        recommendations: this.getPriorityRecommendations()
      },
      details: {
        css: this.optimizationResults.css,
        crossBrowser: this.optimizationResults.crossBrowser,
        responsive: this.optimizationResults.responsive,
        performance: this.optimizationResults.performance
      },
      nextSteps: this.getNextSteps()
    };
    
    return report;
  }

  /**
   * Calculate overall optimization score
   */
  calculateOverallScore() {
    let score = 100;
    
    // CSS optimization score
    if (this.optimizationResults.css?.savingsPercentage > 30) {
      score -= 15;
    }
    
    // Cross-browser compatibility score
    const browserIssues = this.optimizationResults.crossBrowser?.issues?.length || 0;
    score -= Math.min(browserIssues * 5, 20);
    
    // Responsive score
    const responsiveScore = this.optimizationResults.responsive?.score || 100;
    score = (score + responsiveScore) / 2;
    
    // Performance score
    if (this.optimizationResults.performance?.fps < 55) {
      score -= 10;
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Get critical issues that need immediate attention
   */
  getCriticalIssues() {
    const issues = [];
    
    // CSS issues
    if (this.optimizationResults.css?.savingsPercentage > 50) {
      issues.push('High amount of unused CSS detected');
    }
    
    // Browser compatibility issues
    const browserIssues = this.optimizationResults.crossBrowser?.issues || [];
    if (browserIssues.length > 3) {
      issues.push('Multiple browser compatibility issues detected');
    }
    
    // Responsive issues
    const responsiveIssues = this.optimizationResults.responsive?.issues || [];
    if (responsiveIssues.length > 0) {
      issues.push('Responsive design issues detected');
    }
    
    // Performance issues
    if (this.optimizationResults.performance?.fps < 45) {
      issues.push('Poor animation performance detected');
    }
    
    return issues;
  }

  /**
   * Get priority recommendations
   */
  getPriorityRecommendations() {
    const recommendations = [];
    
    // High priority recommendations
    if (this.optimizationResults.css?.savingsPercentage > 30) {
      recommendations.push({
        priority: 'high',
        category: 'CSS Optimization',
        action: 'Remove unused CSS classes and implement CSS purging'
      });
    }
    
    if (this.optimizationResults.performance?.fps < 55) {
      recommendations.push({
        priority: 'high',
        category: 'Performance',
        action: 'Optimize animations and use GPU acceleration'
      });
    }
    
    // Medium priority recommendations
    const browserIssues = this.optimizationResults.crossBrowser?.issues?.length || 0;
    if (browserIssues > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Browser Compatibility',
        action: 'Add polyfills and fallbacks for unsupported features'
      });
    }
    
    // Low priority recommendations
    recommendations.push({
      priority: 'low',
      category: 'Optimization',
      action: 'Implement critical CSS inlining for faster initial render'
    });
    
    return recommendations;
  }

  /**
   * Get next steps for optimization
   */
  getNextSteps() {
    return [
      'Review and implement high-priority recommendations',
      'Set up automated CSS purging in build process',
      'Add performance monitoring to track improvements',
      'Implement progressive enhancement for better browser support',
      'Set up automated testing for responsive design',
      'Monitor Core Web Vitals metrics regularly'
    ];
  }
}

// Export for use in development and testing
if (typeof window !== 'undefined') {
  window.PerformanceOptimizer = PerformanceOptimizer;
}

export default PerformanceOptimizer;