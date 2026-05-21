/**
 * Responsive Design Testing Utility
 * Tests responsive behavior across different device sizes
 */

class ResponsiveTester {
  constructor() {
    this.breakpoints = {
      'xs': 320,
      'sm': 480,
      'md': 768,
      'lg': 1024,
      'xl': 1440,
      'xxl': 1920
    };
    
    this.testResults = {
      currentBreakpoint: this.getCurrentBreakpoint(),
      deviceInfo: this.getDeviceInfo(),
      layoutTests: {},
      interactionTests: {},
      performanceTests: {}
    };
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    let currentBreakpoint = 'xs';
    
    Object.entries(this.breakpoints).forEach(([name, minWidth]) => {
      if (width >= minWidth) {
        currentBreakpoint = name;
      }
    });
    
    return {
      name: currentBreakpoint,
      width: width,
      height: window.innerHeight
    };
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.type || this.getOrientationFallback(),
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches
    };
  }

  /**
   * Fallback orientation detection
   */
  getOrientationFallback() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  /**
   * Test layout at different breakpoints
   */
  testLayoutBreakpoints() {
    const results = {};
    
    Object.entries(this.breakpoints).forEach(([name, width]) => {
      results[name] = {
        width: width,
        active: window.innerWidth >= width,
        mediaQueryMatches: window.matchMedia(`(min-width: ${width}px)`).matches,
        elements: this.testElementsAtBreakpoint(name)
      };
    });
    
    return results;
  }

  /**
   * Test elements at specific breakpoint
   */
  testElementsAtBreakpoint(breakpoint) {
    const elements = {
      navigation: this.testNavigation(),
      grid: this.testGridLayout(),
      cards: this.testCardLayout(),
      forms: this.testFormLayout(),
      tables: this.testTableLayout(),
      buttons: this.testButtonLayout()
    };
    
    return elements;
  }

  /**
   * Test navigation responsiveness
   */
  testNavigation() {
    const nav = document.querySelector('nav, .nav, .navigation, header');
    if (!nav) return { exists: false };
    
    const rect = nav.getBoundingClientRect();
    const style = getComputedStyle(nav);
    
    return {
      exists: true,
      visible: rect.width > 0 && rect.height > 0,
      position: style.position,
      zIndex: style.zIndex,
      overflow: style.overflow,
      width: rect.width,
      height: rect.height,
      hasHamburgerMenu: !!nav.querySelector('.hamburger, .menu-toggle, .nav-toggle')
    };
  }

  /**
   * Test grid layout responsiveness
   */
  testGridLayout() {
    const grids = document.querySelectorAll('.grid, [class*="grid-"], .row, [style*="grid"]');
    const results = [];
    
    grids.forEach((grid, index) => {
      const style = getComputedStyle(grid);
      const rect = grid.getBoundingClientRect();
      
      results.push({
        index: index,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        flexDirection: style.flexDirection,
        flexWrap: style.flexWrap,
        width: rect.width,
        childCount: grid.children.length,
        overflowing: rect.width > window.innerWidth
      });
    });
    
    return results;
  }

  /**
   * Test card layout responsiveness
   */
  testCardLayout() {
    const cards = document.querySelectorAll('.card, .md-card, [class*="card-"]');
    const results = [];
    
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      
      results.push({
        index: index,
        width: rect.width,
        height: rect.height,
        padding: style.padding,
        margin: style.margin,
        borderRadius: style.borderRadius,
        visible: rect.top < window.innerHeight && rect.bottom > 0,
        overflowing: rect.width > window.innerWidth
      });
    });
    
    return results;
  }

  /**
   * Test form layout responsiveness
   */
  testFormLayout() {
    const forms = document.querySelectorAll('form, .form');
    const results = [];
    
    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea, button');
      const inputResults = [];
      
      inputs.forEach((input, inputIndex) => {
        const rect = input.getBoundingClientRect();
        const style = getComputedStyle(input);
        
        inputResults.push({
          index: inputIndex,
          type: input.type || input.tagName.toLowerCase(),
          width: rect.width,
          height: rect.height,
          fontSize: style.fontSize,
          padding: style.padding,
          touchFriendly: rect.height >= 44 && rect.width >= 44
        });
      });
      
      results.push({
        index: index,
        inputs: inputResults,
        totalInputs: inputs.length
      });
    });
    
    return results;
  }

  /**
   * Test table layout responsiveness
   */
  testTableLayout() {
    const tables = document.querySelectorAll('table, .table');
    const results = [];
    
    tables.forEach((table, index) => {
      const rect = table.getBoundingClientRect();
      const style = getComputedStyle(table);
      const container = table.closest('.table-container, .table-responsive');
      
      results.push({
        index: index,
        width: rect.width,
        overflowing: rect.width > window.innerWidth,
        hasContainer: !!container,
        containerScrollable: container ? getComputedStyle(container).overflowX === 'auto' : false,
        columns: table.querySelectorAll('th, td').length / (table.querySelectorAll('tr').length || 1),
        responsive: rect.width <= window.innerWidth || !!container
      });
    });
    
    return results;
  }

  /**
   * Test button layout responsiveness
   */
  testButtonLayout() {
    const buttons = document.querySelectorAll('button, .btn, input[type="button"], input[type="submit"]');
    const results = [];
    
    buttons.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      
      results.push({
        index: index,
        width: rect.width,
        height: rect.height,
        fontSize: style.fontSize,
        padding: style.padding,
        touchFriendly: rect.height >= 44 && rect.width >= 44,
        visible: rect.top < window.innerHeight && rect.bottom > 0
      });
    });
    
    return results;
  }

  /**
   * Test touch interactions
   */
  testTouchInteractions() {
    if (!this.testResults.deviceInfo.isTouchDevice) {
      return { supported: false, reason: 'Not a touch device' };
    }
    
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [onclick], [role="button"]');
    const results = [];
    
    interactiveElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      
      results.push({
        index: index,
        tagName: element.tagName.toLowerCase(),
        width: rect.width,
        height: rect.height,
        touchFriendly: rect.height >= 44 && rect.width >= 44,
        hasRippleEffect: style.position === 'relative' && element.querySelector('::after'),
        touchAction: style.touchAction
      });
    });
    
    const touchFriendlyCount = results.filter(r => r.touchFriendly).length;
    
    return {
      supported: true,
      totalElements: results.length,
      touchFriendlyElements: touchFriendlyCount,
      touchFriendlyPercentage: Math.round((touchFriendlyCount / results.length) * 100),
      elements: results
    };
  }

  /**
   * Test viewport meta tag
   */
  testViewportMeta() {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    
    if (!viewportMeta) {
      return {
        exists: false,
        recommendation: 'Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">'
      };
    }
    
    const content = viewportMeta.getAttribute('content');
    const hasWidthDevice = content.includes('width=device-width');
    const hasInitialScale = content.includes('initial-scale=1');
    const hasUserScalable = content.includes('user-scalable=no');
    
    return {
      exists: true,
      content: content,
      hasWidthDevice: hasWidthDevice,
      hasInitialScale: hasInitialScale,
      hasUserScalable: hasUserScalable,
      isOptimal: hasWidthDevice && hasInitialScale && !hasUserScalable,
      recommendation: !hasWidthDevice || !hasInitialScale ? 
        'Optimize viewport meta tag for better mobile experience' : null
    };
  }

  /**
   * Test media queries
   */
  testMediaQueries() {
    const mediaQueries = [
      '(max-width: 480px)',
      '(max-width: 768px)',
      '(max-width: 1024px)',
      '(min-width: 768px)',
      '(min-width: 1024px)',
      '(orientation: portrait)',
      '(orientation: landscape)',
      '(prefers-reduced-motion: reduce)',
      '(prefers-color-scheme: dark)',
      '(hover: hover)',
      '(pointer: coarse)'
    ];
    
    const results = {};
    
    mediaQueries.forEach(query => {
      results[query] = window.matchMedia(query).matches;
    });
    
    return results;
  }

  /**
   * Test scroll behavior
   */
  testScrollBehavior() {
    const body = document.body;
    const html = document.documentElement;
    
    const documentHeight = Math.max(
      body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight
    );
    
    const viewportHeight = window.innerHeight;
    const isScrollable = documentHeight > viewportHeight;
    
    return {
      isScrollable: isScrollable,
      documentHeight: documentHeight,
      viewportHeight: viewportHeight,
      currentScrollY: window.scrollY,
      maxScrollY: documentHeight - viewportHeight,
      hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
      scrollBehavior: getComputedStyle(html).scrollBehavior
    };
  }

  /**
   * Run comprehensive responsive test
   */
  async runComprehensiveTest() {
    console.log('Starting comprehensive responsive test...');
    
    // Layout tests
    this.testResults.layoutTests = {
      breakpoints: this.testLayoutBreakpoints(),
      viewport: this.testViewportMeta(),
      mediaQueries: this.testMediaQueries(),
      scroll: this.testScrollBehavior()
    };
    
    // Interaction tests
    this.testResults.interactionTests = {
      touch: this.testTouchInteractions()
    };
    
    // Performance tests for different screen sizes
    this.testResults.performanceTests = {
      renderTime: await this.measureRenderTime(),
      layoutShift: await this.measureLayoutShift()
    };
    
    return this.testResults;
  }

  /**
   * Measure render time at current viewport
   */
  measureRenderTime() {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const endTime = performance.now();
        resolve({
          renderTime: endTime - startTime,
          viewport: this.getCurrentBreakpoint()
        });
      });
    });
  }

  /**
   * Measure layout shift during resize
   */
  measureLayoutShift() {
    return new Promise((resolve) => {
      let shiftValue = 0;
      
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          shiftValue += entry.value;
        }
      });
      
      if ('PerformanceObserver' in window) {
        observer.observe({ type: 'layout-shift', buffered: true });
      }
      
      // Simulate resize
      window.dispatchEvent(new Event('resize'));
      
      setTimeout(() => {
        if ('PerformanceObserver' in window) {
          observer.disconnect();
        }
        resolve({
          layoutShift: shiftValue,
          rating: shiftValue < 0.1 ? 'good' : shiftValue < 0.25 ? 'needs-improvement' : 'poor'
        });
      }, 1000);
    });
  }

  /**
   * Generate responsive test report
   */
  generateReport() {
    const issues = [];
    const recommendations = [];
    
    // Check viewport meta
    if (!this.testResults.layoutTests?.viewport?.exists) {
      issues.push('Missing viewport meta tag');
      recommendations.push('Add viewport meta tag for proper mobile rendering');
    }
    
    // Check touch friendliness
    const touchTest = this.testResults.interactionTests?.touch;
    if (touchTest?.supported && touchTest.touchFriendlyPercentage < 80) {
      issues.push('Some interactive elements are not touch-friendly');
      recommendations.push('Ensure all interactive elements are at least 44px in height and width');
    }
    
    // Check horizontal scroll
    if (this.testResults.layoutTests?.scroll?.hasHorizontalScroll) {
      issues.push('Horizontal scroll detected');
      recommendations.push('Fix layout to prevent horizontal scrolling on mobile devices');
    }
    
    // Check layout shift
    const layoutShift = this.testResults.performanceTests?.layoutShift;
    if (layoutShift?.rating === 'poor') {
      issues.push('High layout shift detected');
      recommendations.push('Optimize layout stability to reduce cumulative layout shift');
    }
    
    return {
      summary: {
        device: this.testResults.deviceInfo,
        currentBreakpoint: this.testResults.currentBreakpoint,
        timestamp: new Date().toISOString()
      },
      results: this.testResults,
      issues: issues,
      recommendations: recommendations,
      score: this.calculateResponsiveScore()
    };
  }

  /**
   * Calculate responsive design score
   */
  calculateResponsiveScore() {
    let score = 100;
    
    // Deduct points for issues
    if (!this.testResults.layoutTests?.viewport?.exists) score -= 20;
    if (this.testResults.layoutTests?.scroll?.hasHorizontalScroll) score -= 15;
    
    const touchTest = this.testResults.interactionTests?.touch;
    if (touchTest?.supported && touchTest.touchFriendlyPercentage < 80) {
      score -= (80 - touchTest.touchFriendlyPercentage) * 0.5;
    }
    
    const layoutShift = this.testResults.performanceTests?.layoutShift;
    if (layoutShift?.rating === 'poor') score -= 10;
    else if (layoutShift?.rating === 'needs-improvement') score -= 5;
    
    return Math.max(0, Math.round(score));
  }
}

// Export for use in development
if (typeof window !== 'undefined') {
  window.ResponsiveTester = ResponsiveTester;
}

export default ResponsiveTester;