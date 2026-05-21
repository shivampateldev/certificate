import React, { useEffect, useState } from 'react';
import { 
  getContrastRatio, 
  meetsContrastRequirement,
  prefersReducedMotion,
  prefersHighContrast 
} from '../utils/accessibility';

const AccessibilityChecker = ({ enabled = false }) => {
  const [issues, setIssues] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const checkAccessibility = () => {
      setIsChecking(true);
      const foundIssues = [];

      // Check for missing alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        foundIssues.push({
          type: 'error',
          message: `${images.length} images missing alt text`,
          elements: Array.from(images)
        });
      }

      // Check for buttons without accessible names
      const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
      const buttonsWithoutText = Array.from(buttons).filter(btn => 
        !btn.textContent.trim() && !btn.querySelector('[aria-hidden="false"]')
      );
      if (buttonsWithoutText.length > 0) {
        foundIssues.push({
          type: 'error',
          message: `${buttonsWithoutText.length} buttons without accessible names`,
          elements: buttonsWithoutText
        });
      }

      // Check for form inputs without labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
      const inputsWithoutLabels = Array.from(inputs).filter(input => {
        const id = input.id;
        return !id || !document.querySelector(`label[for="${id}"]`);
      });
      if (inputsWithoutLabels.length > 0) {
        foundIssues.push({
          type: 'error',
          message: `${inputsWithoutLabels.length} form inputs without labels`,
          elements: inputsWithoutLabels
        });
      }

      // Check for headings hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      Array.from(headings).forEach((heading, index) => {
        const currentLevel = parseInt(heading.tagName.charAt(1));
        if (index === 0 && currentLevel !== 1) {
          foundIssues.push({
            type: 'warning',
            message: 'Page should start with h1',
            elements: [heading]
          });
        }
        if (currentLevel > previousLevel + 1) {
          foundIssues.push({
            type: 'warning',
            message: `Heading level skipped from h${previousLevel} to h${currentLevel}`,
            elements: [heading]
          });
        }
        previousLevel = currentLevel;
      });

      // Check for color contrast (simplified check)
      const textElements = document.querySelectorAll('p, span, div, button, a, label');
      Array.from(textElements).slice(0, 20).forEach(element => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          try {
            if (!meetsContrastRequirement(color, backgroundColor)) {
              foundIssues.push({
                type: 'warning',
                message: 'Potential color contrast issue',
                elements: [element]
              });
            }
          } catch (e) {
            // Skip elements where contrast can't be calculated
          }
        }
      });

      // Check for keyboard accessibility
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      const nonKeyboardAccessible = Array.from(interactiveElements).filter(element => {
        const tabIndex = element.getAttribute('tabindex');
        return tabIndex === '-1' && !element.disabled;
      });
      if (nonKeyboardAccessible.length > 0) {
        foundIssues.push({
          type: 'warning',
          message: `${nonKeyboardAccessible.length} interactive elements not keyboard accessible`,
          elements: nonKeyboardAccessible
        });
      }

      // Check for ARIA landmarks
      const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
      if (landmarks.length === 0) {
        foundIssues.push({
          type: 'info',
          message: 'No ARIA landmarks found - consider adding semantic HTML or ARIA roles',
          elements: []
        });
      }

      setIssues(foundIssues);
      setIsChecking(false);
    };

    // Run check after a short delay to allow DOM to settle
    const timer = setTimeout(checkAccessibility, 1000);
    return () => clearTimeout(timer);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'white',
        border: '2px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '400px',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '14px'
      }}
      role="complementary"
      aria-label="Accessibility checker results"
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
        Accessibility Check
      </h3>
      
      {isChecking ? (
        <p>Checking accessibility...</p>
      ) : (
        <>
          <p style={{ margin: '0 0 8px 0' }}>
            Found {issues.length} potential issues
          </p>
          
          {issues.length === 0 ? (
            <p style={{ color: 'green', margin: 0 }}>
              ✅ No major accessibility issues detected!
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {issues.map((issue, index) => (
                <li 
                  key={index}
                  style={{ 
                    marginBottom: '8px',
                    color: issue.type === 'error' ? 'red' : 
                           issue.type === 'warning' ? 'orange' : 'blue'
                  }}
                >
                  <strong>{issue.type.toUpperCase()}:</strong> {issue.message}
                  {issue.elements.length > 0 && (
                    <span style={{ fontSize: '12px', display: 'block' }}>
                      ({issue.elements.length} element{issue.elements.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
            <p style={{ margin: '4px 0' }}>
              Reduced Motion: {prefersReducedMotion() ? 'Yes' : 'No'}
            </p>
            <p style={{ margin: '4px 0' }}>
              High Contrast: {prefersHighContrast() ? 'Yes' : 'No'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AccessibilityChecker;