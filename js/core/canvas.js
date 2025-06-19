/**
 * AI Canvas Core Module
 * Manages the main application state and initialization
 */

class AICanvas {
    constructor() {
        this.initialized = false;
        this.widgets = new Map();
        this.agents = new Map();
        this.currentPreset = 'executive';
        this.sidebarCollapsed = false;
        
        // Bind methods
        this.handleResize = this.handleResize.bind(this);
        this.handleKeyboard = this.handleKeyboard.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        
        // Performance monitoring
        this.performanceMetrics = {
            widgetRenderTime: [],
            agentResponseTime: [],
            memoryUsage: []
        };
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initialized) {
            console.warn('AI Canvas already initialized');
            return;
        }

        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadAgentData();
            
            // Initialize components
            await this.initializeComponents();
            
            // Set up accessibility features
            this.setupAccessibility();
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Initialize default widgets
            this.createDefaultWorkspace();
            
            this.initialized = true;
            
            // Announce successful initialization
            this.announceToScreenReader('AI Canvas initialized successfully');
            
            console.log('AI Canvas initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize AI Canvas:', error);
            NotificationManager.show({
                type: 'error',
                title: 'Initialization Error',
                message: 'Failed to initialize AI Canvas. Please refresh the page.'
            });
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Window events
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Document events
        document.addEventListener('keydown', this.handleKeyboard);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Custom events
        document.addEventListener('widget:created', this.handleWidgetCreated.bind(this));
        document.addEventListener('widget:destroyed', this.handleWidgetDestroyed.bind(this));
        document.addEventListener('agent:status-changed', this.handleAgentStatusChanged.bind(this));
    }

    /**
     * Load agent configuration data
     */
    async loadAgentData() {
        try {
            const response = await fetch('data/agents.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const agentData = await response.json();
            
            // Validate and process agent data
            agentData.agents.forEach(agent => {
                if (this.validateAgentConfig(agent)) {
                    this.agents.set(agent.id, {
                        ...agent,
                        status: 'unknown',
                        lastHealthCheck: null,
                        metrics: {
                            uptime: 0,
                            responseTime: 0,
                            errorRate: 0,
                            requestCount: 0
                        }
                    });
                }
            });
            
            // Start health monitoring
            this.startAgentHealthMonitoring();
            
        } catch (error) {
            console.error('Failed to load agent data:', error);
            // Load fallback data
            this.loadFallbackAgents();
        }
    }

    /**
     * Validate agent configuration
     */
    validateAgentConfig(agent) {
        const required = ['id', 'name', 'type', 'capabilities'];
        return required.every(field => agent.hasOwnProperty(field));
    }

    /**
     * Load fallback agent data when remote loading fails
     */
    loadFallbackAgents() {
        const fallbackAgents = [
            {
                id: 'workday',
                name: 'Workday Assistant',
                type: 'hr',
                capabilities: ['vacation', 'payroll', 'benefits'],
                endpoint: null,
                status: 'offline'
            },
            {
                id: 'policy',
                name: 'Policy Bot',
                type: 'knowledge',
                capabilities: ['policies', 'procedures', 'compliance'],
                endpoint: null,
                status: 'offline'
            }
        ];
        
        fallbackAgents.forEach(agent => {
            this.agents.set(agent.id, agent);
        });
    }

    /**
     * Initialize core components
     */
    async initializeComponents() {
        // Initialize managers in dependency order
        await WidgetManager.initialize();
        await AgentOrchestrator.initialize(this.agents);
        await SidebarManager.initialize();
        
        // Set up component communication
        this.setupComponentCommunication();
    }

    /**
     * Set up communication between components
     */
    setupComponentCommunication() {
        // Widget Manager → Agent Orchestrator
        document.addEventListener('widget:agent-query', (event) => {
            AgentOrchestrator.processQuery(event.detail);
        });
        
        // Agent Orchestrator → Widget Manager
        document.addEventListener('agent:response-ready', (event) => {
            WidgetManager.handleAgentResponse(event.detail);
        });
        
        // Sidebar → Widget Manager
        document.addEventListener('sidebar:widget-requested', (event) => {
            WidgetManager.createWidget(event.detail);
        });
    }

    /**
     * Set up accessibility features
     */
    setupAccessibility() {
        // Keyboard navigation
        KeyboardShortcuts.initialize();
        
        // Screen reader support
        AccessibilityManager.initialize();
        
        // High contrast mode detection
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }
        
        // Reduced motion detection
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }
        
        // Focus management
        this.setupFocusManagement();
    }

    /**
     * Set up focus management for keyboard navigation
     */
    setupFocusManagement() {
        let focusableElements = [];
        
        const updateFocusableElements = () => {
            focusableElements = Array.from(
                document.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
            ).filter(el => {
                return !el.disabled && 
                       !el.getAttribute('aria-hidden') && 
                       el.offsetParent !== null;
            });
        };
        
        // Update focusable elements when DOM changes
        const observer = new MutationObserver(updateFocusableElements);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'aria-hidden', 'tabindex']
        });
        
        updateFocusableElements();
    }

    /**
     * Load user preferences from localStorage
     */
    async loadUserPreferences() {
        try {
            const preferences = localStorage.getItem('aicanvas_preferences');
            if (preferences) {
                const parsed = JSON.parse(preferences);
                this.applyUserPreferences(parsed);
            }
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
        }
    }

    /**
     * Apply user preferences
     */
    applyUserPreferences(preferences) {
        if (preferences.theme) {
            document.body.classList.add(`theme-${preferences.theme}`);
        }
        
        if (preferences.sidebarCollapsed) {
            this.toggleSidebar();
        }
        
        if (preferences.defaultPreset) {
            this.currentPreset = preferences.defaultPreset;
        }
    }

    /**
     * Create default workspace based on current preset
     */
    createDefaultWorkspace() {
        const presetConfigs = {
            executive: [
                { type: 'analytics-dashboard', position: { x: 50, y: 100 } },
                { type: 'multi-agent-chat', position: { x: 400, y: 100 } }
            ],
            'hr-manager': [
                { type: 'multi-agent-chat', position: { x: 50, y: 100 }, 
                  config: { enabledAgents: ['workday', 'policy', 'healthcare'] } },
                { type: 'document-processor', position: { x: 400, y: 100 } }
            ],
            developer: [
                { type: 'workflow-orchestrator', position: { x: 50, y: 100 } },
                { type: 'multi-agent-chat', position: { x: 450, y: 100 } }
            ]
        };
        
        const config = presetConfigs[this.currentPreset] || presetConfigs.executive;
        
        config.forEach(widgetConfig => {
            WidgetManager.createWidget(widgetConfig);
        });
    }

    /**
     * Start monitoring agent health
     */
    startAgentHealthMonitoring() {
        // Check agent health every 30 seconds
        setInterval(() => {
            this.agents.forEach(agent => {
                this.checkAgentHealth(agent);
            });
        }, 30000);
        
        // Initial health check
        setTimeout(() => {
            this.agents.forEach(agent => {
                this.checkAgentHealth(agent);
            });
        }, 1000);
    }

    /**
     * Check health of a specific agent
     */
    async checkAgentHealth(agent) {
        if (!agent.endpoint) {
            agent.status = 'offline';
            return;
        }
        
        try {
            const startTime = performance.now();
            const response = await fetch(`${agent.endpoint}/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            if (response.ok) {
                agent.status = 'online';
                agent.metrics.responseTime = responseTime;
                agent.metrics.uptime = Math.min(agent.metrics.uptime + 1, 100);
            } else {
                agent.status = 'error';
                agent.metrics.errorRate += 1;
            }
            
            agent.lastHealthCheck = new Date();
            
            // Emit status change event
            document.dispatchEvent(new CustomEvent('agent:status-changed', {
                detail: { agentId: agent.id, status: agent.status, metrics: agent.metrics }
            }));
            
        } catch (error) {
            agent.status = 'offline';
            agent.metrics.errorRate += 1;
            console.warn(`Health check failed for agent ${agent.id}:`, error);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Debounce resize handling
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // Update widget positions if they're outside viewport
            WidgetManager.adjustWidgetsToViewport();
            
            // Update performance metrics
            this.trackPerformanceMetric('memoryUsage', performance.memory?.usedJSHeapSize || 0);
        }, 150);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        // Let KeyboardShortcuts handle it
        KeyboardShortcuts.handleKeyPress(event);
    }

    /**
     * Handle visibility changes (tab switching, minimizing)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Pause non-critical operations
            this.pauseOperations();
        } else {
            // Resume operations
            this.resumeOperations();
        }
    }

 /**
    * Handle before unload (save state)
    */
   handleBeforeUnload() {
       this.saveUserPreferences();
       this.saveWorkspaceState();
   }

   /**
    * Save user preferences to localStorage
    */
   saveUserPreferences() {
       try {
           const preferences = {
               theme: this.currentTheme,
               sidebarCollapsed: this.sidebarCollapsed,
               defaultPreset: this.currentPreset,
               lastSaved: new Date().toISOString()
           };
           
           localStorage.setItem('aicanvas_preferences', JSON.stringify(preferences));
       } catch (error) {
           console.warn('Failed to save user preferences:', error);
       }
   }

   /**
    * Save current workspace state
    */
   saveWorkspaceState() {
       try {
           const workspaceState = {
               widgets: WidgetManager.getSerializableState(),
               agentConfigurations: AgentOrchestrator.getSerializableState(),
               canvasViewport: this.getCanvasViewport(),
               timestamp: new Date().toISOString()
           };
           
           localStorage.setItem('aicanvas_workspace', JSON.stringify(workspaceState));
       } catch (error) {
           console.warn('Failed to save workspace state:', error);
       }
   }

   /**
    * Get current canvas viewport information
    */
   getCanvasViewport() {
       const canvas = document.getElementById('canvas-workspace');
       return {
           scrollLeft: canvas.scrollLeft,
           scrollTop: canvas.scrollTop,
           clientWidth: canvas.clientWidth,
           clientHeight: canvas.clientHeight
       };
   }

   /**
    * Pause non-critical operations when tab is hidden
    */
   pauseOperations() {
       // Reduce health check frequency
       this.healthCheckInterval = 60000; // 1 minute instead of 30 seconds
       
       // Pause animations
       document.body.classList.add('paused');
       
       console.log('Operations paused - tab hidden');
   }

   /**
    * Resume operations when tab becomes visible
    */
   resumeOperations() {
       // Restore normal health check frequency
       this.healthCheckInterval = 30000;
       
       // Resume animations
       document.body.classList.remove('paused');
       
       console.log('Operations resumed - tab visible');
   }

   /**
    * Handle widget creation events
    */
   handleWidgetCreated(event) {
       const { widget } = event.detail;
       this.widgets.set(widget.id, widget);
       
       // Track performance
       this.trackPerformanceMetric('widgetRenderTime', widget.renderTime);
       
       // Announce to screen reader
       this.announceToScreenReader(`Widget "${widget.title}" created`);
   }

   /**
    * Handle widget destruction events
    */
   handleWidgetDestroyed(event) {
       const { widgetId } = event.detail;
       this.widgets.delete(widgetId);
       
       // Announce to screen reader
       this.announceToScreenReader('Widget removed');
   }

   /**
    * Handle agent status changes
    */
   handleAgentStatusChanged(event) {
       const { agentId, status, metrics } = event.detail;
       
       // Update UI indicators
       SidebarManager.updateAgentStatus(agentId, status, metrics);
       
       // Show notification for critical status changes
       if (status === 'offline' || status === 'error') {
           NotificationManager.show({
               type: 'warning',
               title: 'Agent Status Change',
               message: `${this.agents.get(agentId)?.name || agentId} is now ${status}`,
               duration: 5000
           });
       }
   }

   /**
    * Track performance metrics
    */
   trackPerformanceMetric(metric, value) {
       if (!this.performanceMetrics[metric]) {
           this.performanceMetrics[metric] = [];
       }
       
       this.performanceMetrics[metric].push({
           value,
           timestamp: Date.now()
       });
       
       // Keep only last 100 measurements
       if (this.performanceMetrics[metric].length > 100) {
           this.performanceMetrics[metric].shift();
       }
   }

   /**
    * Get performance statistics
    */
   getPerformanceStats() {
       const stats = {};
       
       Object.keys(this.performanceMetrics).forEach(metric => {
           const values = this.performanceMetrics[metric].map(m => m.value);
           if (values.length > 0) {
               stats[metric] = {
                   average: values.reduce((a, b) => a + b) / values.length,
                   min: Math.min(...values),
                   max: Math.max(...values),
                   latest: values[values.length - 1],
                   count: values.length
               };
           }
       });
       
       return stats;
   }

   /**
    * Toggle sidebar visibility
    */
   toggleSidebar() {
       this.sidebarCollapsed = !this.sidebarCollapsed;
       
       const sidebar = document.querySelector('.sidebar');
       const canvas = document.querySelector('.canvas-container');
       
       if (this.sidebarCollapsed) {
           sidebar.classList.add('collapsed');
           canvas.classList.add('sidebar-collapsed');
       } else {
           sidebar.classList.remove('collapsed');
           canvas.classList.remove('sidebar-collapsed');
       }
       
       // Announce to screen reader
       this.announceToScreenReader(
           `Sidebar ${this.sidebarCollapsed ? 'collapsed' : 'expanded'}`
       );
       
       // Adjust widgets after sidebar toggle
       setTimeout(() => {
           WidgetManager.adjustWidgetsToViewport();
       }, 300);
   }

   /**
    * Switch workspace preset
    */
   switchPreset(presetId) {
       if (this.currentPreset === presetId) return;
       
       // Save current state before switching
       this.saveWorkspaceState();
       
       // Clear current widgets (except pinned)
       WidgetManager.clearUnpinnedWidgets();
       
       // Apply new preset
       this.currentPreset = presetId;
       this.createDefaultWorkspace();
       
       // Update UI
       document.querySelector('.preset-selector').value = presetId;
       
       // Announce change
       this.announceToScreenReader(`Switched to ${presetId} workspace`);
       
       NotificationManager.show({
           type: 'success',
           title: 'Workspace Changed',
           message: `Switched to ${presetId} preset`,
           duration: 3000
       });
   }

   /**
    * Announce message to screen readers
    */
   announceToScreenReader(message) {
       const announcer = document.getElementById('accessibility-announcements');
       if (announcer) {
           announcer.textContent = message;
           
           // Clear after announcement
           setTimeout(() => {
               announcer.textContent = '';
           }, 1000);
       }
   }

   /**
    * Export workspace configuration
    */
   exportWorkspace() {
       try {
           const exportData = {
               version: '1.0.0',
               timestamp: new Date().toISOString(),
               preset: this.currentPreset,
               widgets: WidgetManager.getSerializableState(),
               agents: Array.from(this.agents.values()).map(agent => ({
                   id: agent.id,
                   name: agent.name,
                   type: agent.type,
                   capabilities: agent.capabilities,
                   enabled: agent.status !== 'offline'
               })),
               preferences: JSON.parse(localStorage.getItem('aicanvas_preferences') || '{}')
           };
           
           const blob = new Blob([JSON.stringify(exportData, null, 2)], {
               type: 'application/json'
           });
           
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = `aicanvas-workspace-${Date.now()}.json`;
           a.click();
           
           URL.revokeObjectURL(url);
           
           NotificationManager.show({
               type: 'success',
               title: 'Export Complete',
               message: 'Workspace configuration exported successfully'
           });
           
       } catch (error) {
           console.error('Export failed:', error);
           NotificationManager.show({
               type: 'error',
               title: 'Export Failed',
               message: 'Failed to export workspace configuration'
           });
       }
   }

   /**
    * Import workspace configuration
    */
   async importWorkspace(file) {
       try {
           const text = await file.text();
           const importData = JSON.parse(text);
           
           // Validate import data
           if (!this.validateImportData(importData)) {
               throw new Error('Invalid workspace file format');
           }
           
           // Clear current workspace
           WidgetManager.clearAllWidgets();
           
           // Apply imported configuration
           this.currentPreset = importData.preset;
           
           // Restore widgets
           importData.widgets.forEach(widgetData => {
               WidgetManager.createWidgetFromData(widgetData);
           });
           
           // Update agent configurations
           if (importData.agents) {
               AgentOrchestrator.updateConfigurations(importData.agents);
           }
           
           // Apply preferences
           if (importData.preferences) {
               this.applyUserPreferences(importData.preferences);
           }
           
           NotificationManager.show({
               type: 'success',
               title: 'Import Complete',
               message: 'Workspace configuration imported successfully'
           });
           
       } catch (error) {
           console.error('Import failed:', error);
           NotificationManager.show({
               type: 'error',
               title: 'Import Failed',
               message: 'Failed to import workspace configuration'
           });
       }
   }

   /**
    * Validate import data structure
    */
   validateImportData(data) {
       const required = ['version', 'preset', 'widgets'];
       return required.every(field => data.hasOwnProperty(field));
   }

   /**
    * Reset workspace to default state
    */
   resetWorkspace() {
       if (confirm('Are you sure you want to reset the workspace? This will remove all current widgets.')) {
           // Clear all widgets
           WidgetManager.clearAllWidgets();
           
           // Reset to default preset
           this.currentPreset = 'executive';
           
           // Create default workspace
           this.createDefaultWorkspace();
           
           // Clear saved state
           localStorage.removeItem('aicanvas_workspace');
           
           // Announce change
           this.announceToScreenReader('Workspace reset to default');
           
           NotificationManager.show({
               type: 'info',
               title: 'Workspace Reset',
               message: 'Workspace has been reset to default configuration'
           });
       }
   }

   /**
    * Get application state for debugging
    */
   getDebugInfo() {
       return {
           version: '1.0.0',
           initialized: this.initialized,
           currentPreset: this.currentPreset,
           widgetCount: this.widgets.size,
           agentCount: this.agents.size,
           performance: this.getPerformanceStats(),
           viewport: this.getCanvasViewport(),
           userAgent: navigator.userAgent,
           timestamp: new Date().toISOString()
       };
   }
}

// Create global instance
window.AICanvas = new AICanvas();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
   module.exports = AICanvas;
}
