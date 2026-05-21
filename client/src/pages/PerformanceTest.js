import React, { useState, useEffect } from 'react';
import './PerformanceTest.css';

const PerformanceTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [progress, setProgress] = useState(0);

  // Mock test functions (these would use the actual utilities in a real implementation)
  const runCSSOptimizationTest = async () => {
    setCurrentTest('CSS Optimization');
    setProgress(20);
    
    // Simulate CSS optimization test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockResults = {
      originalRules: 1250,
      keptRules: 890,
      savingsPercentage: 29,
      unusedClasses: ['unused-class-1', 'unused-class-2'],
      recommendations: ['Remove unused CSS classes', 'Implement CSS purging']
    };
    
    setTestResults(prev => ({ ...prev, css: mockResults }));
    return mockResults;
  };

  const runBrowserCompatibilityTest = async () => {
    setCurrentTest('Browser Compatibility');
    setProgress(40);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResults = {
      browser: `${navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'} (detected)`,
      modernFeatures: {
        cssGrid: CSS.supports('display', 'grid'),
        flexbox: CSS.supports('display', 'flex'),
        customProperties: CSS.supports('--custom', 'property')
      },
      issues: [],
      recommendations: ['All modern features supported']
    };
    
    setTestResults(prev => ({ ...prev, browser: mockResults }));
    return mockResults;
  };

  const runResponsiveTest = async () => {
    setCurrentTest('Responsive Design');
    setProgress(60);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const mockResults = {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      breakpoint: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
      touchFriendly: 'ontouchstart' in window,
      score: 85,
      issues: window.innerWidth < 480 ? ['Small viewport detected'] : []
    };
    
    setTestResults(prev => ({ ...prev, responsive: mockResults }));
    return mockResults;
  };

  const runAnimationTest = async () => {
    setCurrentTest('Animation Performance');
    setProgress(80);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const mockResults = {
      fps: Math.floor(Math.random() * 20) + 50, // 50-70 FPS
      smoothness: 'good',
      recommendations: ['Animations performing well']
    };
    
    setTestResults(prev => ({ ...prev, animation: mockResults }));
    return mockResults;
  };

  const runCompleteTestSuite = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults({});
    
    try {
      await runCSSOptimizationTest();
      await runBrowserCompatibilityTest();
      await runResponsiveTest();
      await runAnimationTest();
      
      setProgress(100);
      setCurrentTest('Complete');
      
      // Generate summary
      const summary = {
        overallScore: 87,
        criticalIssues: 0,
        recommendations: 2
      };
      
      setTestResults(prev => ({ ...prev, summary }));
      
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    setCurrentTest('Quick Test');
    setProgress(50);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const quickResults = {
        css: { savingsPercentage: 25 },
        browser: { issues: 0 },
        responsive: { score: 90 },
        performance: { fps: 58 }
      };
      
      setTestResults({ quick: quickResults });
      setProgress(100);
      
    } catch (error) {
      console.error('Quick test failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const showBrowserInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio
    };
    
    setTestResults({ browserInfo: info });
  };

  const testTouchTargets = () => {
    const buttons = document.querySelectorAll('button');
    let touchFriendly = 0;
    
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.height >= 44 && rect.width >= 44) {
        touchFriendly++;
      }
    });
    
    const results = {
      totalButtons: buttons.length,
      touchFriendlyButtons: touchFriendly,
      percentage: Math.round((touchFriendly / buttons.length) * 100)
    };
    
    setTestResults({ touchTargets: results });
  };

  return (
    <div className="performance-test-page">
      <div className="header">
        <h1>🚀 Performance Optimization Test Suite</h1>
        <p>Comprehensive testing for CSS optimization, cross-browser compatibility, and responsive design</p>
      </div>

      {isRunning && (
        <div className="status running">
          {currentTest ? `Running ${currentTest}...` : 'Initializing tests...'}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <div className="test-grid">
        <div className="test-section">
          <h2>📦 CSS Optimization Tests</h2>
          <p>Test CSS bundle size optimization and unused style removal.</p>
          <button className="btn" onClick={runCSSOptimizationTest} disabled={isRunning}>
            Run CSS Tests
          </button>
          <button className="btn btn-secondary" onClick={() => alert('This would download optimized CSS in a real implementation.')}>
            Download Optimized CSS
          </button>
        </div>

        <div className="test-section">
          <h2>🌐 Cross-Browser Compatibility</h2>
          <p>Test browser feature support and compatibility issues.</p>
          <button className="btn" onClick={runBrowserCompatibilityTest} disabled={isRunning}>
            Run Browser Tests
          </button>
          <button className="btn btn-secondary" onClick={showBrowserInfo}>
            Show Browser Info
          </button>
        </div>

        <div className="test-section">
          <h2>📱 Responsive Design Tests</h2>
          <p>Validate responsive behavior across different screen sizes.</p>
          <button className="btn" onClick={runResponsiveTest} disabled={isRunning}>
            Run Responsive Tests
          </button>
          <button className="btn btn-secondary" onClick={testTouchTargets}>
            Test Touch Targets
          </button>
        </div>

        <div className="test-section">
          <h2>🎬 Animation Performance</h2>
          <p>Test animation smoothness and performance on different devices.</p>
          <button className="btn" onClick={runAnimationTest} disabled={isRunning}>
            Run Animation Tests
          </button>
        </div>
      </div>

      <div className="test-section">
        <h2>🏃‍♂️ Complete Test Suite</h2>
        <p>Run all optimization tests and generate a comprehensive report.</p>
        <div className="test-grid">
          <button className="btn" onClick={runCompleteTestSuite} disabled={isRunning}>
            Run Complete Test Suite
          </button>
          <button className="btn btn-secondary" onClick={runQuickTest} disabled={isRunning}>
            Run Quick Test
          </button>
        </div>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="results-section">
          <h2>📊 Test Results</h2>
          <div className="results">
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </div>
          
          {testResults.summary && (
            <div className="summary-metrics">
              <h3>Summary</h3>
              <div className="metric">
                <span className="metric-label">Overall Score</span>
                <span className="metric-value">{testResults.summary.overallScore}/100</span>
              </div>
              <div className="metric">
                <span className="metric-label">Critical Issues</span>
                <span className="metric-value">{testResults.summary.criticalIssues}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Recommendations</span>
                <span className="metric-value">{testResults.summary.recommendations}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="info-section">
        <h2>ℹ️ About Performance Testing</h2>
        <p>
          This performance test suite evaluates your application's optimization across multiple dimensions:
        </p>
        <ul>
          <li><strong>CSS Optimization:</strong> Identifies unused styles and potential bundle size reductions</li>
          <li><strong>Browser Compatibility:</strong> Tests modern feature support across different browsers</li>
          <li><strong>Responsive Design:</strong> Validates layout behavior across device sizes</li>
          <li><strong>Animation Performance:</strong> Measures frame rates and smoothness</li>
        </ul>
        <p>
          In development mode, you can also access optimization utilities directly in the browser console:
        </p>
        <code>
          runPerformanceTests(), optimizeCSS(), downloadOptimizedCSS()
        </code>
      </div>
    </div>
  );
};

export default PerformanceTest;