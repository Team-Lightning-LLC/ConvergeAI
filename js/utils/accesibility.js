/**
 * Accessibility Manager
 * Handles accessibility features and compliance
 */

class AccessibilityManager {
    constructor() {
        this.announcer = null;
        this.focusTracker = null;
        this.keyboardNavigation = null;
        this.preferences = {
            reducedMotion: false,
            highContrast: false,
            largeText: false,
            screenReader: false
        };
    }

    /**
     * Initialize accessibility features
     */
    initialize() {
        this.setupAnnouncer();
        this.setupFocusManagement();
        this.setupKeyboardNavigation();
        this.setupPreferenceDetection();
        this.setupARIALiveRegions();
        this.setupSkipLinks();
        
        console.log('Accessibility Manager initialized');
    }

    /**
     * Set up screen reader announcer
     */
    setupAnnouncer() {
        this.announcer = document.getElementById('accessibility-announcements');
        if (!this.announcer) {
            this.announcer = document.createElement('div');
            this.announcer.id = 'accessibility-announcements';
            this.announcer.className = 'sr-only';
            this.announcer.setAttribute('role', 'status');
            this.announcer.setAttribute('aria-live', 'polite');
            this.announcer.setAttribute('aria-atomic', 'true');
            document.body.appendChild(this.announcer);
        }
    }

    /**
     * Set up focus management
     */
    setupFocusManagement() {
        this.focusTracker = new FocusTracker();
        this.focusTracker.initialize();
        
        // Add focus indicators for better visibility
        this.enhanceFocusIndicators();
        
        // Manage focus for dynamic content
        this.setupDynamicFocusManagement();
    }

    /**
     * Enhance focus indicators
     */
    enhanceFocusIndicators() {
        const style = document.createElement('style');
        style.textContent = `
            .focus-enhanced:focus-visible {
                outline: 3px solid var(--color-primary);
                outline-offset: 2px;
                box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.2);
            }
            
            .high-contrast .focus-enhanced:focus-visible {
                outline: 3px solid #ffff00;
                background-color: #000000;
                color: #ffffff;
            }
        `;
        document.head.appendChild(style);
        
        // Add enhanced focus class to interactive elements
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(el => {
            el.classList.add('focus-enhanced');
        });
    }

    /**
     * Set up dynamic focus management
     */
    setupDynamicFocusManagement() {
        // Observe DOM changes to maintain focus management
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.processDynamicContent(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
      }

   /**
    * Process dynamically added content for accessibility
    */
   processDynamicContent(element) {
       // Add focus enhancement to new focusable elements
       const focusableElements = element.querySelectorAll(
           'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
       );
       
       focusableElements.forEach(el => {
           el.classList.add('focus-enhanced');
       });

       // Ensure proper ARIA labels
       this.ensureARIALabels(element);
       
       // Set up keyboard navigation for new content
       this.setupElementKeyboardNav(element);
   }

   /**
    * Ensure proper ARIA labels for elements
    */
   ensureARIALabels(container) {
       // Check buttons without labels
       const unlabeledButtons = container.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
       unlabeledButtons.forEach(button => {
           const text = button.textContent.trim();
           if (!text) {
               console.warn('Button without accessible label:', button);
               button.setAttribute('aria-label', 'Button');
           }
       });

       // Check form inputs without labels
       const unlabeledInputs = container.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
       unlabeledInputs.forEach(input => {
           if (!input.labels || input.labels.length === 0) {
               const placeholder = input.getAttribute('placeholder');
               if (placeholder) {
                   input.setAttribute('aria-label', placeholder);
               } else {
                   console.warn('Input without accessible label:', input);
               }
           }
       });

       // Check images without alt text
       const unlabeledImages = container.querySelectorAll('img:not([alt])');
       unlabeledImages.forEach(img => {
           img.setAttribute('alt', '');
           console.warn('Image without alt text:', img);
       });
   }

   /**
    * Set up keyboard navigation for specific elements
    */
   setupElementKeyboardNav(element) {
       // Grid navigation for widget templates
       const templateGrids = element.querySelectorAll('.template-grid');
       templateGrids.forEach(grid => {
           this.setupGridNavigation(grid);
       });

       // List navigation for agent lists
       const agentLists = element.querySelectorAll('.agent-list');
       agentLists.forEach(list => {
           this.setupListNavigation(list);
       });

       // Tab panels for multi-tab interfaces
       const tabPanels = element.querySelectorAll('[role="tabpanel"]');
       tabPanels.forEach(panel => {
           this.setupTabNavigation(panel);
       });
   }

   /**
    * Set up grid navigation with arrow keys
    */
   setupGridNavigation(grid) {
       const items = Array.from(grid.querySelectorAll('[tabindex="0"], button, [href]'));
       
       items.forEach((item, index) => {
           item.addEventListener('keydown', (e) => {
               let targetIndex = index;
               
               switch (e.key) {
                   case 'ArrowRight':
                       e.preventDefault();
                       targetIndex = Math.min(index + 1, items.length - 1);
                       break;
                   case 'ArrowLeft':
                       e.preventDefault();
                       targetIndex = Math.max(index - 1, 0);
                       break;
                   case 'ArrowDown':
                       e.preventDefault();
                       // Assuming 2-column grid
                       targetIndex = Math.min(index + 2, items.length - 1);
                       break;
                   case 'ArrowUp':
                       e.preventDefault();
                       targetIndex = Math.max(index - 2, 0);
                       break;
                   case 'Home':
                       e.preventDefault();
                       targetIndex = 0;
                       break;
                   case 'End':
                       e.preventDefault();
                       targetIndex = items.length - 1;
                       break;
               }
               
               if (targetIndex !== index) {
                   items[targetIndex].focus();
                   this.announce(`Navigated to ${items[targetIndex].textContent || items[targetIndex].getAttribute('aria-label')}`);
               }
           });
       });
   }

   /**
    * Set up list navigation with arrow keys
    */
   setupListNavigation(list) {
       const items = Array.from(list.querySelectorAll('[role="listitem"], li'));
       
       items.forEach((item, index) => {
           item.setAttribute('tabindex', index === 0 ? '0' : '-1');
           
           item.addEventListener('keydown', (e) => {
               let targetIndex = index;
               
               switch (e.key) {
                   case 'ArrowDown':
                       e.preventDefault();
                       targetIndex = Math.min(index + 1, items.length - 1);
                       break;
                   case 'ArrowUp':
                       e.preventDefault();
                       targetIndex = Math.max(index - 1, 0);
                       break;
                   case 'Home':
                       e.preventDefault();
                       targetIndex = 0;
                       break;
                   case 'End':
                       e.preventDefault();
                       targetIndex = items.length - 1;
                       break;
               }
               
               if (targetIndex !== index) {
                   // Update tabindex
                   items[index].setAttribute('tabindex', '-1');
                   items[targetIndex].setAttribute('tabindex', '0');
                   items[targetIndex].focus();
               }
           });
       });
   }

   /**
    * Set up tab navigation
    */
   setupTabNavigation(container) {
       const tabList = container.querySelector('[role="tablist"]');
       const tabs = container.querySelectorAll('[role="tab"]');
       const panels = container.querySelectorAll('[role="tabpanel"]');
       
       if (!tabList || tabs.length === 0) return;
       
       tabs.forEach((tab, index) => {
           tab.addEventListener('keydown', (e) => {
               let targetIndex = index;
               
               switch (e.key) {
                   case 'ArrowRight':
                       e.preventDefault();
                       targetIndex = (index + 1) % tabs.length;
                       break;
                   case 'ArrowLeft':
                       e.preventDefault();
                       targetIndex = (index - 1 + tabs.length) % tabs.length;
                       break;
                   case 'Home':
                       e.preventDefault();
                       targetIndex = 0;
                       break;
                   case 'End':
                       e.preventDefault();
                       targetIndex = tabs.length - 1;
                       break;
                   case 'Enter':
                   case ' ':
                       e.preventDefault();
                       this.activateTab(tab, panels[index]);
                       return;
               }
               
               if (targetIndex !== index) {
                   tabs[targetIndex].focus();
               }
           });
           
           tab.addEventListener('click', () => {
               this.activateTab(tab, panels[index]);
           });
       });
   }

   /**
    * Activate a tab
    */
   activateTab(tab, panel) {
       // Deactivate all tabs and panels
       const tabList = tab.closest('[role="tablist"]');
       const allTabs = tabList.querySelectorAll('[role="tab"]');
       const allPanels = tabList.parentElement.querySelectorAll('[role="tabpanel"]');
       
       allTabs.forEach(t => {
           t.setAttribute('aria-selected', 'false');
           t.setAttribute('tabindex', '-1');
       });
       
       allPanels.forEach(p => {
           p.setAttribute('aria-hidden', 'true');
       });
       
       // Activate selected tab and panel
       tab.setAttribute('aria-selected', 'true');
       tab.setAttribute('tabindex', '0');
       
       if (panel) {
           panel.setAttribute('aria-hidden', 'false');
       }
       
       this.announce(`Activated ${tab.textContent} tab`);
   }

   /**
    * Set up keyboard navigation
    */
   setupKeyboardNavigation() {
       this.keyboardNavigation = new KeyboardNavigationManager();
       this.keyboardNavigation.initialize();
   }

   /**
    * Set up preference detection
    */
   setupPreferenceDetection() {
       // Detect reduced motion preference
       if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
           this.preferences.reducedMotion = true;
           document.body.classList.add('reduced-motion');
       }

       // Detect high contrast preference
       if (window.matchMedia('(prefers-contrast: high)').matches) {
           this.preferences.highContrast = true;
           document.body.classList.add('high-contrast');
       }

       // Detect screen reader usage (heuristic)
       this.detectScreenReader();

       // Listen for preference changes
       window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
           this.preferences.reducedMotion = e.matches;
           document.body.classList.toggle('reduced-motion', e.matches);
       });

       window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
           this.preferences.highContrast = e.matches;
           document.body.classList.toggle('high-contrast', e.matches);
       });
   }

   /**
    * Detect screen reader usage
    */
   detectScreenReader() {
       // Check for common screen reader indicators
       const indicators = [
           navigator.userAgent.includes('NVDA'),
           navigator.userAgent.includes('JAWS'),
           navigator.userAgent.includes('VoiceOver'),
           window.speechSynthesis && window.speechSynthesis.speaking,
           document.querySelector('[aria-live]') !== null
       ];

       if (indicators.some(indicator => indicator)) {
           this.preferences.screenReader = true;
           document.body.classList.add('screen-reader-active');
       }
   }

   /**
    * Set up ARIA live regions
    */
   setupARIALiveRegions() {
       // Ensure notification area has proper ARIA attributes
       const notificationArea = document.getElementById('notification-area');
       if (notificationArea) {
           notificationArea.setAttribute('aria-live', 'polite');
           notificationArea.setAttribute('aria-atomic', 'false');
       }

       // Set up status region for canvas changes
       const canvasStatus = document.createElement('div');
       canvasStatus.id = 'canvas-status';
       canvasStatus.className = 'sr-only';
       canvasStatus.setAttribute('role', 'status');
       canvasStatus.setAttribute('aria-live', 'polite');
       document.body.appendChild(canvasStatus);
   }

   /**
    * Set up skip links
    */
   setupSkipLinks() {
       const skipLinks = document.querySelectorAll('.skip-link');
       
       skipLinks.forEach(link => {
           link.addEventListener('click', (e) => {
               e.preventDefault();
               const targetId = link.getAttribute('href').substring(1);
               const target = document.getElementById(targetId);
               
               if (target) {
                   target.focus();
                   target.scrollIntoView({ behavior: 'smooth' });
                   this.announce(`Skipped to ${target.getAttribute('aria-label') || targetId}`);
               }
           });
       });
   }

   /**
    * Announce message to screen readers
    */
   announce(message, priority = 'polite') {
       if (!this.announcer) return;
       
       // Clear previous announcement
       this.announcer.textContent = '';
       
       // Set priority
       this.announcer.setAttribute('aria-live', priority);
       
       // Add new announcement
       setTimeout(() => {
           this.announcer.textContent = message;
       }, 100);
       
       // Clear announcement after delay
       setTimeout(() => {
           this.announcer.textContent = '';
       }, 5000);
   }

   /**
    * Check accessibility compliance
    */
   checkCompliance() {
       const issues = [];
       
       // Check for missing alt text
       const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
       if (imagesWithoutAlt.length > 0) {
           issues.push(`${imagesWithoutAlt.length} images missing alt text`);
       }

       // Check for buttons without labels
       const buttonsWithoutLabels = document.querySelectorAll(
           'button:not([aria-label]):not([aria-labelledby])'
       );
       const unlabeledButtons = Array.from(buttonsWithoutLabels).filter(
           btn => !btn.textContent.trim()
       );
       if (unlabeledButtons.length > 0) {
           issues.push(`${unlabeledButtons.length} buttons without accessible labels`);
       }

       // Check for form inputs without labels
       const inputsWithoutLabels = document.querySelectorAll(
           'input:not([aria-label]):not([aria-labelledby])'
       );
       const unlabeledInputs = Array.from(inputsWithoutLabels).filter(
           input => !input.labels || input.labels.length === 0
       );
       if (unlabeledInputs.length > 0) {
           issues.push(`${unlabeledInputs.length} form inputs without labels`);
       }

       // Check color contrast (simplified check)
       const lowContrastElements = this.checkColorContrast();
       if (lowContrastElements.length > 0) {
           issues.push(`${lowContrastElements.length} elements with potential contrast issues`);
       }

       return {
           compliant: issues.length === 0,
           issues,
           score: Math.max(0, 100 - (issues.length * 10))
       };
   }

   /**
    * Basic color contrast check
    */
   checkColorContrast() {
       const issues = [];
       const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a');
       
       textElements.forEach(element => {
           const styles = window.getComputedStyle(element);
           const color = styles.color;
           const backgroundColor = styles.backgroundColor;
           
           // Simple heuristic - would need more sophisticated contrast calculation in production
           if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
               // This is a simplified check - real implementation would calculate WCAG contrast ratios
               const colorLightness = this.getLightness(color);
               const bgLightness = this.getLightness(backgroundColor);
               const contrast = Math.abs(colorLightness - bgLightness);
               
               if (contrast < 0.3) { // Simplified threshold
                   issues.push(element);
               }
           }
       });
       
       return issues;
   }

   /**
    * Get lightness value from color (simplified)
    */
   getLightness(color) {
       // Very simplified lightness calculation
       // Real implementation would properly parse RGB/HSL values
       if (color.includes('rgb')) {
           const values = color.match(/\d+/g);
           if (values && values.length >= 3) {
               const r = parseInt(values[0]);
               const g = parseInt(values[1]);
               const b = parseInt(values[2]);
               return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
           }
       }
       return 0.5; // Default middle value
   }

   /**
    * Generate accessibility report
    */
   generateReport() {
       const compliance = this.checkCompliance();
       const preferences = this.preferences;
       
       return {
           timestamp: new Date().toISOString(),
           compliance,
           preferences,
           recommendations: this.getRecommendations(compliance),
           features: {
               screenReaderSupport: true,
               keyboardNavigation: true,
               focusManagement: true,
               skipLinks: true,
               ariaLabels: true,
               livRegions: true
           }
       };
   }

   /**
    * Get accessibility recommendations
    */
   getRecommendations(compliance) {
       const recommendations = [];
       
       if (!compliance.compliant) {
           recommendations.push('Address accessibility issues found in compliance check');
       }
       
       if (!this.preferences.screenReader) {
           recommendations.push('Test with screen readers for better compatibility');
       }
       
       if (!this.preferences.highContrast) {
           recommendations.push('Test with high contrast mode enabled');
       }
       
       recommendations.push('Regularly audit accessibility with automated tools');
       recommendations.push('Conduct user testing with people who use assistive technologies');
       
       return recommendations;
   }

   /**
    * Get current preferences
    */
   getPreferences() {
       return { ...this.preferences };
   }

   /**
    * Set preference
    */
   setPreference(key, value) {
       if (this.preferences.hasOwnProperty(key)) {
           this.preferences[key] = value;
           this.applyPreference(key, value);
       }
   }

   /**
    * Apply preference change
    */
   applyPreference(key, value) {
       switch (key) {
           case 'reducedMotion':
               document.body.classList.toggle('reduced-motion', value);
               break;
           case 'highContrast':
               document.body.classList.toggle('high-contrast', value);
               break;
           case 'largeText':
               document.body.classList.toggle('large-text', value);
               break;
           case 'screenReader':
               document.body.classList.toggle('screen-reader-active', value);
               break;
       }
   }
}

/**
* Focus Tracker
* Tracks and manages focus throughout the application
*/
class FocusTracker {
   constructor() {
       this.focusHistory = [];
       this.maxHistorySize = 10;
       this.currentFocus = null;
       this.focusTrap = null;
   }

   /**
    * Initialize focus tracking
    */
   initialize() {
       this.setupFocusListeners();
       this.setupFocusTrap();
   }

   /**
    * Set up focus event listeners
    */
   setupFocusListeners() {
       document.addEventListener('focusin', (e) => {
           this.trackFocus(e.target);
       });

       document.addEventListener('focusout', (e) => {
           // Handle focus out if needed
       });
   }

   /**
    * Track focus changes
    */
   trackFocus(element) {
       this.currentFocus = element;
       
       // Add to history
       this.focusHistory.push({
           element,
           timestamp: Date.now(),
           tagName: element.tagName,
           id: element.id,
           className: element.className
       });
       
       // Limit history size
       if (this.focusHistory.length > this.maxHistorySize) {
           this.focusHistory.shift();
       }
   }

   /**
    * Set up focus trap for modals
    */
   setupFocusTrap() {
       // This would implement focus trapping for modal dialogs
       // Focus trap ensures focus stays within modal while open
   }

   /**
    * Trap focus within element
    */
   trapFocus(container) {
       const focusableElements = container.querySelectorAll(
           'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
       );
       
       if (focusableElements.length === 0) return;
       
       const firstElement = focusableElements[0];
       const lastElement = focusableElements[focusableElements.length - 1];
       
       const trapHandler = (e) => {
           if (e.key === 'Tab') {
               if (e.shiftKey) {
                   if (document.activeElement === firstElement) {
                       e.preventDefault();
                       lastElement.focus();
                   }
               } else {
                   if (document.activeElement === lastElement) {
                       e.preventDefault();
                       firstElement.focus();
                   }
               }
           }
       };
       
       container.addEventListener('keydown', trapHandler);
       firstElement.focus();
       
       return () => {
           container.removeEventListener('keydown', trapHandler);
       };
   }

   /**
    * Return focus to previous element
    */
   returnFocus() {
       if (this.focusHistory.length > 1) {
           const previousFocus = this.focusHistory[this.focusHistory.length - 2];
           if (previousFocus.element && document.contains(previousFocus.element)) {
               previousFocus.element.focus();
           }
       }
   }

   /**
    * Get focus history
    */
   getFocusHistory() {
       return [...this.focusHistory];
   }
}

/**
* Keyboard Navigation Manager
* Handles application-wide keyboard shortcuts and navigation
*/
class KeyboardNavigationManager {
   constructor() {
       this.shortcuts = new Map();
       this.navigationMode = 'normal'; // normal, modal, grid, list
   }

   /**
    * Initialize keyboard navigation
    */
   initialize() {
       this.setupGlobalShortcuts();
       this.setupNavigationListeners();
   }

   /**
    * Set up global keyboard shortcuts
    */
   setupGlobalShortcuts() {
       // Register common shortcuts
       this.registerShortcut('Ctrl+h', 'Toggle sidebar', () => {
           if (window.SidebarManager) {
               SidebarManager.toggleSidebar();
           }
       });

       this.registerShortcut('Ctrl+n', 'New widget', () => {
           const templates = document.querySelectorAll('.template-card');
           if (templates.length > 0) {
               templates[0].click();
           }
       });

       this.registerShortcut('Escape', 'Clear selection/Close modal', () => {
           // Close any open modals
           const modals = document.querySelectorAll('.modal-backdrop');
           if (modals.length > 0) {
               modals[modals.length - 1].querySelector('.modal-close')?.click();
           } else {
               // Clear widget selection
               if (window.WidgetManager) {
                   WidgetManager.selectWidget(null);
               }
           }
       });

       this.registerShortcut('Delete', 'Delete selected widget', () => {
           if (window.WidgetManager && WidgetManager.selectedWidget) {
               WidgetManager.closeWidget(WidgetManager.selectedWidget);
           }
       });
   }

   /**
    * Set up navigation event listeners
    */
   setupNavigationListeners() {
       document.addEventListener('keydown', (e) => {
           this.handleKeyPress(e);
       });
   }

   /**
    * Register a keyboard shortcut
    */
   registerShortcut(key, description, handler) {
       this.shortcuts.set(key, { description, handler });
   }

   /**
    * Handle key press events
    */
   handleKeyPress(e) {
       const key = this.getKeyString(e);
       const shortcut = this.shortcuts.get(key);
       
       if (shortcut) {
           e.preventDefault();
           shortcut.handler();
           
           // Announce shortcut activation
           if (window.AccessibilityManager) {
               AccessibilityManager.announce(`Activated ${shortcut.description}`);
           }
       }
   }

   /**
    * Get standardized key string
    */
   getKeyString(e) {
       const parts = [];
       
       if (e.ctrlKey) parts.push('Ctrl');
       if (e.altKey) parts.push('Alt');
       if (e.shiftKey) parts.push('Shift');
       if (e.metaKey) parts.push('Meta');
       
       parts.push(e.key);
       
       return parts.join('+');
   }

   /**
    * Get all registered shortcuts
    */
   getShortcuts() {
       return Array.from(this.shortcuts.entries()).map(([key, data]) => ({
           key,
           ...data
       }));
   }
}

// Create global instance
window.AccessibilityManager = new AccessibilityManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
   AccessibilityManager.initialize();
});
