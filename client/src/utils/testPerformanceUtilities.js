/**
 * Test Performance Utilities
 * Simple test functions to verify performance optimization utilities are working
 */

// Test function to verify all utilities are loaded
export const testUtilitiesLoaded = () => {
  const results = {
    timestamp: new Date().toISOString(),
    utilities: {
      PerformanceOptimizer: typeof window.PerformanceOptimizer !== 'undefined',
      OptimizationTestRunner: typeof window.OptimizationTestRunner !== 'undefined',
      CSSPurger: typeof window.CSSPurger !== 'undefined',
      runPerformanceTests: typeof window.runPerformanceTests === 'function',
      runQuickPerformanceTest: typeof window.runQuickPerformanceTest === 'function',
      optimizeCSS: typeof window.optimizeCSS === 'function',
      downloadOptimizedCSS: typeof window.downloadOptimizedCSS === 'function'
    },
    browserFeatures: {
      PerformanceObserver: 'PerformanceObserver' in window,
      IntersectionObserver: 'IntersectionObserver' in window,
      ResizeObserver: 'ResizeObserver' in window,
      CSSSupports: 'CSS' in window && 'supports' in CSS
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio
    }
  };

  console.log('🔍 Performance Utilities Test Results:');
  console.log('=====================================');
  
  // Check utilities
  const loadedUtilities = Object.entries(results.utilities).filter(([, loaded]) => loaded);
  const totalUtilities = Object.keys(results.utilities).length;
  
  console.log(`📦 Utilities Loaded: ${loadedUtilities.length}/${totalUtilities}`);
  loadedUtilities.forEach(([name]) => {
    console.log(`  ✅ ${name}`);
  });
  
  const missingUtilities = Object.entries(results.utilities).filter(([, loaded]) => !loaded);
  if (missingUtilities.length > 0) {
    console.log('❌ Missing Utilities:');
    missingUtilities.forEach(([name]) => {
      console.log(`  ❌ ${name}`);
    });
  }
  
  // Check browser features
  console.log('\n🌐 Browser Feature Support:');
  Object.entries(results.browserFeatures).forEach(([feature, supported]) => {
    console.log(`  ${supported ? '✅' : '❌'} ${feature}`);
  });
  
  // Environment info
  console.log('\n🔧 Environment:');
  console.log(`  Node Environment: ${results.environment.nodeEnv}`);
  console.log(`  Viewport: ${results.environment.viewport}`);
  console.log(`  Pixel Ratio: ${results.environment.pixelRatio}`);
  
  return results;
};

// Quick CSS analysis test
export const quickCSSAnalysis = () => {
  console.log('🎨 Quick CSS Analysis:');
  console.log('=====================');
  
  // Count stylesheets
  const stylesheets = Array.from(document.styleSheets);
  console.log(`📄 Stylesheets: ${stylesheets.length}`);
  
  // Count CSS classes in DOM
  const elements = document.querySelectorAll('*');
  const classNames = new Set();
  
  elements.forEach(element => {
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ');
      classes.forEach(cls => {
        if (cls.trim()) {
          classNames.add(cls.trim());
        }
      });
    }
  });
  
  console.log(`🏷️  Unique CSS Classes in DOM: ${classNames.size}`);
  console.log(`📊 DOM Elements: ${elements.length}`);
  
  // Estimate CSS rules (approximate)
  let totalRules = 0;
  stylesheets.forEach(sheet => {
    try {
      if (sheet.cssRules) {
        totalRules += sheet.cssRules.length;
      }
    } catch (e) {
      console.warn('Cannot access stylesheet rules (cross-origin)');
    }
  });
  
  console.log(`📋 Estimated CSS Rules: ${totalRules}`);
  
  return {
    stylesheets: stylesheets.length,
    uniqueClasses: classNames.size,
    domElements: elements.length,
    estimatedRules: totalRules,
    classNames: Array.from(classNames).slice(0, 10) // First 10 classes as sample
  };
};

// Quick responsive test
export const quickResponsiveTest = () => {
  console.log('📱 Quick Responsive Test:');
  console.log('=========================');
  
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    ratio: window.innerWidth / window.innerHeight
  };
  
  const breakpoint = viewport.width < 480 ? 'mobile-small' :
                    viewport.width < 768 ? 'mobile' :
                    viewport.width < 1024 ? 'tablet' :
                    viewport.width < 1440 ? 'desktop' : 'desktop-large';
  
  const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';
  
  console.log(`📐 Viewport: ${viewport.width}x${viewport.height}`);
  console.log(`📱 Breakpoint: ${breakpoint}`);
  console.log(`🔄 Orientation: ${orientation}`);
  console.log(`📊 Aspect Ratio: ${viewport.ratio.toFixed(2)}`);
  
  // Test touch capability
  const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  console.log(`👆 Touch Capable: ${touchCapable ? 'Yes' : 'No'}`);
  
  // Test viewport meta tag
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  console.log(`🏷️  Viewport Meta: ${viewportMeta ? 'Present' : 'Missing'}`);
  if (viewportMeta) {
    console.log(`   Content: ${viewportMeta.getAttribute('content')}`);
  }
  
  return {
    viewport,
    breakpoint,
    orientation,
    touchCapable,
    hasViewportMeta: !!viewportMeta,
    viewportMetaContent: viewportMeta?.getAttribute('content')
  };
};

// Performance monitoring test
export const testPerformanceMonitoring = () => {
  console.log('⚡ Performance Monitoring Test:');
  console.log('===============================');
  
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      console.log(`🚀 Page Load Time: ${Math.round(navigation.loadEventEnd - navigation.fetchStart)}ms`);
      console.log(`🔄 DOM Content Loaded: ${Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart)}ms`);
    }
    
    // Resource timing
    const resources = performance.getEntriesByType('resource');
    const cssResources = resources.filter(r => r.name.includes('.css'));
    const jsResources = resources.filter(r => r.name.includes('.js'));
    
    console.log(`📦 CSS Resources: ${cssResources.length}`);
    console.log(`📦 JS Resources: ${jsResources.length}`);
    console.log(`📦 Total Resources: ${resources.length}`);
    
    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = performance.memory;
      console.log(`💾 Memory Used: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
      console.log(`💾 Memory Limit: ${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`);
    }
  } else {
    console.log('❌ Performance API not available');
  }
  
  // Test Core Web Vitals support
  const webVitalsSupport = {
    PerformanceObserver: 'PerformanceObserver' in window,
    LCP: false,
    FID: false,
    CLS: false
  };
  
  if (webVitalsSupport.PerformanceObserver) {
    try {
      // Test LCP support
      const lcpObserver = new PerformanceObserver(() => {});
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      webVitalsSupport.LCP = true;
      lcpObserver.disconnect();
    } catch (e) {
      // LCP not supported
    }
    
    try {
      // Test FID support
      const fidObserver = new PerformanceObserver(() => {});
      fidObserver.observe({ type: 'first-input', buffered: true });
      webVitalsSupport.FID = true;
      fidObserver.disconnect();
    } catch (e) {
      // FID not supported
    }
    
    try {
      // Test CLS support
      const clsObserver = new PerformanceObserver(() => {});
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      webVitalsSupport.CLS = true;
      clsObserver.disconnect();
    } catch (e) {
      // CLS not supported
    }
  }
  
  console.log('📊 Core Web Vitals Support:');
  Object.entries(webVitalsSupport).forEach(([metric, supported]) => {
    console.log(`  ${supported ? '✅' : '❌'} ${metric}`);
  });
  
  return webVitalsSupport;
};

// Run all tests
export const runAllTests = () => {
  console.log('🧪 Running All Performance Utility Tests');
  console.log('==========================================\n');
  
  const results = {
    utilities: testUtilitiesLoaded(),
    css: quickCSSAnalysis(),
    responsive: quickResponsiveTest(),
    performance: testPerformanceMonitoring()
  };
  
  console.log('\n✅ All tests completed!');
  console.log('💡 Try running: runPerformanceTests() for full optimization suite');
  
  return results;
};

// Make functions available globally in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.testUtilitiesLoaded = testUtilitiesLoaded;
  window.quickCSSAnalysis = quickCSSAnalysis;
  window.quickResponsiveTest = quickResponsiveTest;
  window.testPerformanceMonitoring = testPerformanceMonitoring;
  window.runAllUtilityTests = runAllTests;
}