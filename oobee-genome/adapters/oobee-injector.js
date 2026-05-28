/**
 * Oobee-Genome Universal Client-Side Injector
 * 
 * A standalone script that injects data-oobee-* attributes into all DOM elements
 * for source location tracking during development.
 * 
 * Usage in any HTML project:
 * 
 *   <script src="oobee-injector.js"></script>
 * 
 * Then in browser console:
 * 
 *   OobeeGenome.listAll()           // List all tracked elements
 *   OobeeGenome.getInfo(element)    // Get info about an element
 *   OobeeGenome.inject()            // Manually inject attributes
 *   OobeeGenome.enable()            // Enable tracking
 *   OobeeGenome.disable()           // Disable tracking
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    enabled: true,
    attributePrefix: 'data-oobee',
    devOnly: true,
    verbose: true
  };

  // Only initialize once
  if (window.__oobeeGenomeLoaded) {
    return;
  }
  window.__oobeeGenomeLoaded = true;

  /**
   * Inject oobee attributes into all HTML elements
   */
  function injectOobeeAttributes() {
    if (!CONFIG.enabled) {
      return;
    }

    const startTime = performance.now();
    let injectedCount = 0;

    // Get all elements in the document
    const allElements = document.querySelectorAll('*');

    allElements.forEach((element, index) => {
      // Skip if already has oobee attributes
      if (element.hasAttribute(`${CONFIG.attributePrefix}-file`)) {
        return;
      }

      // Get element info
      const tagName = element.tagName.toLowerCase();
      const elementId = element.id ? `#${element.id}` : '';
      const elementClass = element.className ? `.${element.className.split(' ')[0]}` : '';
      const selector = `${tagName}${elementId}${elementClass}`;

      // Inject attributes
      element.setAttribute(`${CONFIG.attributePrefix}-file`, window.location.pathname);
      element.setAttribute(`${CONFIG.attributePrefix}-element`, selector);
      element.setAttribute(`${CONFIG.attributePrefix}-index`, index);
      element.setAttribute(`${CONFIG.attributePrefix}-timestamp`, new Date().toISOString());

      injectedCount++;
    });

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    if (CONFIG.verbose) {
      console.log(`✅ Oobee-Genome injected ${injectedCount} elements in ${duration}ms`);
      console.log(`📊 Total elements tracked: ${allElements.length}`);
      console.log(`💡 Inspect elements in DevTools to see data-oobee-* attributes`);
    }
  }

  /**
   * Watch for dynamically added elements
   */
  function watchForDynamicElements() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            // Only process Element nodes
            if (node.nodeType === Node.ELEMENT_NODE) {
              injectAttributesToElement(node);
              
              // Also inject to all children
              const children = node.querySelectorAll('*');
              children.forEach(child => injectAttributesToElement(child));
            }
          });
        }
      });
    });

    // Start watching for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    if (CONFIG.verbose) {
      console.log('👁️  Oobee-Genome watching for dynamic elements...');
    }
  }

  /**
   * Inject attributes to a single element
   */
  function injectAttributesToElement(element) {
    if (element.hasAttribute(`${CONFIG.attributePrefix}-file`)) {
      return; // Already has attributes
    }

    const tagName = element.tagName.toLowerCase();
    const elementId = element.id ? `#${element.id}` : '';
    const elementClass = element.className ? `.${element.className.split(' ')[0]}` : '';
    const selector = `${tagName}${elementId}${elementClass}`;

    element.setAttribute(`${CONFIG.attributePrefix}-file`, window.location.pathname);
    element.setAttribute(`${CONFIG.attributePrefix}-element`, selector);
    element.setAttribute(`${CONFIG.attributePrefix}-timestamp`, new Date().toISOString());
  }

  /**
   * Expose API for manual control
   */
  window.OobeeGenome = {
    inject: injectOobeeAttributes,
    config: CONFIG,
    
    // Enable/disable dynamically
    enable: function() {
      CONFIG.enabled = true;
      console.log('✅ Oobee-Genome enabled');
      this.inject();
    },
    
    disable: function() {
      CONFIG.enabled = false;
      console.log('❌ Oobee-Genome disabled');
    },
    
    // Get info about an element
    getInfo: function(element) {
      if (!element) {
        console.error('Please provide an element');
        return null;
      }

      const info = {
        tagName: element.tagName.toLowerCase(),
        id: element.id || 'none',
        classes: element.className || 'none',
        oobeeFile: element.getAttribute(`${CONFIG.attributePrefix}-file`),
        oobeeElement: element.getAttribute(`${CONFIG.attributePrefix}-element`),
        oobeeIndex: element.getAttribute(`${CONFIG.attributePrefix}-index`),
        oobeeTimestamp: element.getAttribute(`${CONFIG.attributePrefix}-timestamp`)
      };

      console.log('Element Info:', info);
      return info;
    },

    // List all oobee attributes on page
    listAll: function() {
      const elementsWithOobee = document.querySelectorAll(`[${CONFIG.attributePrefix}-file]`);
      console.log(`Found ${elementsWithOobee.length} elements with oobee attributes:`);
      elementsWithOobee.forEach((el, idx) => {
        console.log(`  ${idx + 1}. <${el.tagName.toLowerCase()}> - ${el.getAttribute(`${CONFIG.attributePrefix}-element`)}`);
      });
      return elementsWithOobee;
    },

    // Verbose mode
    setVerbose: function(bool) {
      CONFIG.verbose = bool;
      console.log('Verbose mode:', bool ? 'ON' : 'OFF');
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectOobeeAttributes();
      watchForDynamicElements();
    });
  } else {
    // DOM already loaded
    injectOobeeAttributes();
    watchForDynamicElements();
  }

  if (CONFIG.verbose) {
    console.log('🔧 Oobee-Genome initialized');
    console.log('💻 Available commands in browser console:');
    console.log('  OobeeGenome.inject()              - Manually inject attributes');
    console.log('  OobeeGenome.enable()              - Enable tracking');
    console.log('  OobeeGenome.disable()             - Disable tracking');
    console.log('  OobeeGenome.getInfo(element)      - Get element info');
    console.log('  OobeeGenome.listAll()             - List all tracked elements');
    console.log('  OobeeGenome.setVerbose(true/false) - Toggle verbose logging');
  }
})();
