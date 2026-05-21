/**
 * Optimization Test Runner
 * Runs comprehensive performance optimization tests
 */

import PerformanceOptimizer from './performanceOptimizer.js';

class OptimizationTestRunner {
  constructor() {
    this.optimizer = new PerformanceOptimizer();
    this.testResults = null;
  }

  /**
   * Run all optimization tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive optimization tests...');
    
    try {
      // Run the complete optimization suite
      this.testResults = await this.optimizer.runCompleteOptimization();
      
      // Display results in console
      this.displayResults();
      
      // Save results to sessionStorage for debugging
      this.saveResults();
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ Optimization tests failed:', error);
      throw error;
    }
  }

  /**
   * Display test results in console
   */
  displayResults() {
    if (!this.testResults) return;
    
    console.log('\n📊 OPTIMIZATION TEST RESULTS');
    console.log('================================');
    
    // Overall score
    console.log(`🎯 Overall Score: ${this.testResults.summary.overallScore}/100`);
    
    // CSS Optimization Results
    if (this.testResults.details.css) {
      console.log('\n📦 CSS OPTIMIZATION');
      console.log(`   Original CSS Rules: ${this.testResults.details.css.originalSize}`);
      console.log(`   Used CSS Rules: ${this.testResults.details.css.optimizedSize}`);
      console.log(`   Potential Savings: ${this.testResults.details.css.savingsPercentage}%`);
      console.log(`   Critical CSS Classes: ${this.testResults.details.css.criticalCSS.length}`);
    }
    
    // Cross-browser Compatibility
    if (this.testResults.details.crossBrowser) {
      console.log('\n🌐 CROSS-BROWSER COMPATIBILITY');
      console.log(`   Browser: ${this.testResults.details.crossBrowser.browser.name} ${this.testResults.details.crossBrowser.browser.version}`);
      console.log(`   Issues Found: ${this.testResults.details.crossBrowser.issues.length}`);
      
      if (this.testResults.details.crossBrowser.issues.length > 0) {
        console.log('   Issues:');
        this.testResults.details.crossBrowser.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
    }
    
    // Responsive Design
    if (this.testResults.details.responsive) {
      console.log('\n📱 RESPONSIVE DESIGN');
      console.log(`   Responsive Score: ${this.testResults.details.responsive.score}/100`);
      console.log(`   Current Breakpoint: ${this.testResults.details.responsive.summary.currentBreakpoint.name}`);
      console.log(`   Viewport: ${this.testResults.details.responsive.summary.currentBreakpoint.width}x${this.testResults.details.responsive.summary.currentBreakpoint.height}`);
      
      if (this.testResults.details.responsive.issues?.length > 0) {
        console.log('   Issues:');
        this.testResults.details.responsive.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
    }
    
    // Performance
    if (this.testResults.details.performance) {
      console.log('\n🎬 ANIMATION PERFORMANCE');
      console.log(`   FPS: ${this.testResults.details.performance.fps}`);
      console.log(`   Smoothness: ${this.testResults.details.performance.smoothness}`);
      
      if (this.testResults.details.performance.recommendations?.length > 0) {
        console.log('   Recommendations:');
        this.testResults.details.performance.recommendations.forEach(rec => {
          console.log(`     - ${rec}`);
        });
      }
    }
    
    // Critical Issues
    if (this.testResults.summary.criticalIssues?.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES');
      this.testResults.summary.criticalIssues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    // Priority Recommendations
    if (this.testResults.summary.recommendations?.length > 0) {
      console.log('\n💡 PRIORITY RECOMMENDATIONS');
      this.testResults.summary.recommendations.forEach(rec => {
        console.log(`   [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.action}`);
      });
    }
    
    // Next Steps
    if (this.testResults.nextSteps?.length > 0) {
      console.log('\n📋 NEXT STEPS');
      this.testResults.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
    }
    
    console.log('\n✅ Optimization tests completed!');
    console.log('📄 Full results saved to sessionStorage as "optimizationResults"');
  }

  /**
   * Save results to sessionStorage for debugging
   */
  saveResults() {
    if (this.testResults) {
      try {
        sessionStorage.setItem('optimizationResults', JSON.stringify(this.testResults, null, 2));
        console.log('💾 Results saved to sessionStorage');
      } catch (error) {
        console.warn('Failed to save results to sessionStorage:', error);
      }
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    if (!this.testResults) return '';
    
    const report = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Optimization Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #2563EB, #06B6D4);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        .score {
            font-size: 3rem;
            font-weight: bold;
            margin: 10px 0;
        }
        .section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #2563EB;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .metric:last-child {
            border-bottom: none;
        }
        .metric-label {
            font-weight: 600;
        }
        .metric-value {
            color: #6b7280;
        }
        .issue {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 12px;
            margin: 8px 0;
            border-radius: 4px;
        }
        .recommendation {
            background: #f0f9ff;
            border-left: 4px solid #06b6d4;
            padding: 12px;
            margin: 8px 0;
            border-radius: 4px;
        }
        .priority-high { border-left-color: #ef4444; }
        .priority-medium { border-left-color: #f59e0b; }
        .priority-low { border-left-color: #10b981; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .timestamp {
            text-align: center;
            color: #6b7280;
            font-size: 0.9rem;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Optimization Report</h1>
        <div class="score">${this.testResults.summary.overallScore}/100</div>
        <p>Overall Performance Score</p>
    </div>

    <div class="grid">
        ${this.generateCSSSection()}
        ${this.generateBrowserSection()}
        ${this.generateResponsiveSection()}
        ${this.generatePerformanceSection()}
    </div>

    ${this.generateIssuesSection()}
    ${this.generateRecommendationsSection()}
    ${this.generateNextStepsSection()}

    <div class="timestamp">
        Report generated on ${new Date(this.testResults.timestamp).toLocaleString()}
    </div>
</body>
</html>`;
    
    return report;
  }

  generateCSSSection() {
    const css = this.testResults.details.css;
    if (!css) return '';
    
    return `
    <div class="section">
        <h2>📦 CSS Optimization</h2>
        <div class="metric">
            <span class="metric-label">Original CSS Rules</span>
            <span class="metric-value">${css.originalSize}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Used CSS Rules</span>
            <span class="metric-value">${css.optimizedSize}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Potential Savings</span>
            <span class="metric-value">${css.savingsPercentage}%</span>
        </div>
        <div class="metric">
            <span class="metric-label">Critical CSS Classes</span>
            <span class="metric-value">${css.criticalCSS.length}</span>
        </div>
    </div>`;
  }

  generateBrowserSection() {
    const browser = this.testResults.details.crossBrowser;
    if (!browser) return '';
    
    return `
    <div class="section">
        <h2>🌐 Browser Compatibility</h2>
        <div class="metric">
            <span class="metric-label">Browser</span>
            <span class="metric-value">${browser.browser.name} ${browser.browser.version}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Issues Found</span>
            <span class="metric-value">${browser.issues.length}</span>
        </div>
        ${browser.issues.map(issue => `<div class="issue">${issue}</div>`).join('')}
    </div>`;
  }

  generateResponsiveSection() {
    const responsive = this.testResults.details.responsive;
    if (!responsive) return '';
    
    return `
    <div class="section">
        <h2>📱 Responsive Design</h2>
        <div class="metric">
            <span class="metric-label">Responsive Score</span>
            <span class="metric-value">${responsive.score}/100</span>
        </div>
        <div class="metric">
            <span class="metric-label">Current Breakpoint</span>
            <span class="metric-value">${responsive.summary.currentBreakpoint.name}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Viewport Size</span>
            <span class="metric-value">${responsive.summary.currentBreakpoint.width}x${responsive.summary.currentBreakpoint.height}</span>
        </div>
        ${(responsive.issues || []).map(issue => `<div class="issue">${issue}</div>`).join('')}
    </div>`;
  }

  generatePerformanceSection() {
    const performance = this.testResults.details.performance;
    if (!performance) return '';
    
    return `
    <div class="section">
        <h2>🎬 Animation Performance</h2>
        <div class="metric">
            <span class="metric-label">FPS</span>
            <span class="metric-value">${performance.fps}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Smoothness</span>
            <span class="metric-value">${performance.smoothness}</span>
        </div>
        ${(performance.recommendations || []).map(rec => `<div class="recommendation">${rec}</div>`).join('')}
    </div>`;
  }

  generateIssuesSection() {
    const issues = this.testResults.summary.criticalIssues;
    if (!issues || issues.length === 0) return '';
    
    return `
    <div class="section">
        <h2>🚨 Critical Issues</h2>
        ${issues.map(issue => `<div class="issue">${issue}</div>`).join('')}
    </div>`;
  }

  generateRecommendationsSection() {
    const recommendations = this.testResults.summary.recommendations;
    if (!recommendations || recommendations.length === 0) return '';
    
    return `
    <div class="section">
        <h2>💡 Priority Recommendations</h2>
        ${recommendations.map(rec => `
            <div class="recommendation priority-${rec.priority}">
                <strong>[${rec.priority.toUpperCase()}] ${rec.category}:</strong> ${rec.action}
            </div>
        `).join('')}
    </div>`;
  }

  generateNextStepsSection() {
    const nextSteps = this.testResults.nextSteps;
    if (!nextSteps || nextSteps.length === 0) return '';
    
    return `
    <div class="section">
        <h2>📋 Next Steps</h2>
        <ol>
            ${nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
    </div>`;
  }

  /**
   * Download HTML report
   */
  downloadHTMLReport() {
    const html = this.generateHTMLReport();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-optimization-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📄 HTML report downloaded');
  }

  /**
   * Quick test for development
   */
  async quickTest() {
    console.log('🏃‍♂️ Running quick optimization test...');
    
    try {
      // Run basic tests only
      const cssResults = await this.optimizer.optimizeCSSBundle();
      const browserResults = await this.optimizer.testCrossBrowserCompatibility();
      
      console.log('📦 CSS Optimization:', cssResults.savingsPercentage + '% potential savings');
      console.log('🌐 Browser Issues:', browserResults.issues.length);
      
      return {
        css: cssResults,
        browser: browserResults
      };
      
    } catch (error) {
      console.error('❌ Quick test failed:', error);
      throw error;
    }
  }
}

// Export for use in development
if (typeof window !== 'undefined') {
  window.OptimizationTestRunner = OptimizationTestRunner;
  
  // Add global functions for easy testing
  window.runOptimizationTests = async () => {
    const runner = new OptimizationTestRunner();
    return await runner.runAllTests();
  };
  
  window.quickOptimizationTest = async () => {
    const runner = new OptimizationTestRunner();
    return await runner.quickTest();
  };
  
  window.downloadOptimizationReport = () => {
    const runner = new OptimizationTestRunner();
    if (runner.testResults) {
      runner.downloadHTMLReport();
    } else {
      console.warn('No test results available. Run tests first.');
    }
  };
}

export default OptimizationTestRunner;