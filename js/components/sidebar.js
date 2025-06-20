/**
 * Sidebar Manager
 * Handles sidebar interactions and agent status display
 */

class SidebarManager {
    constructor() {
        this.isCollapsed = false;
        this.activePreset = 'all-agents';
        this.agentStatusElements = new Map();
    }

    /**
     * Initialize Sidebar Manager
     */
    async initialize() {
        try {
            this.setupEventListeners();
            this.setupAgentList();
            this.setupPresetButtons();
            
            console.log('Sidebar Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Sidebar Manager:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Sidebar toggle
        const toggleBtn = document.querySelector('.sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleSidebar.bind(this));
        }

        // Template drag and drop (handled by WidgetManager)
        // Preset changes
        const presetSelector = document.querySelector('.preset-selector');
        if (presetSelector) {
            presetSelector.addEventListener('change', this.handlePresetChange.bind(this));
        }
    }

    /**
     * Set up agent list display
     */
    setupAgentList() {
        const agentListContainer = document.querySelector('.agent-list');
        if (!agentListContainer) return;

        // Load agents from global state
        if (window.AICanvas && window.AICanvas.agents) {
            this.renderAgentList(agentListContainer);
        } else {
            // Listen for agents to be loaded
            document.addEventListener('agents:loaded', () => {
                this.renderAgentList(agentListContainer);
            });
        }
    }

    /**
     * Render the agent list
     */
    renderAgentList(container) {
        container.innerHTML = '';

        const agents = [
            {
                id: 'workday',
                name: 'Workday Assistant',
                type: 'HR & Payroll',
                status: 'online',
                uptime: 98,
                rating: 4.8,
                lastResponse: '1.2s'
            },
            {
                id: 'policy',
                name: 'Policy Bot',
                type: 'Knowledge & Compliance',
                status: 'online',
                uptime: 99,
                rating: 4.9,
                lastResponse: '0.8s'
            },
            {
                id: 'healthcare',
                name: 'Healthcare Bot',
                type: 'Benefits & Wellness',
                status: 'warning',
                uptime: 85,
                rating: 3.2,
                lastResponse: '2.1s'
            },
            {
                id: 'finance',
                name: 'Finance Helper',
                type: 'Budget & Expenses',
                status: 'online',
                uptime: 96,
                rating: 4.6,
                lastResponse: '1.5s'
            },
            {
                id: 'guidewire',
                name: 'Guidewire Bot',
                type: 'Insurance Workflows',
                status: 'offline',
                uptime: 0,
                rating: 0,
                lastResponse: 'N/A'
            }
        ];

        agents.forEach(agent => {
            const agentElement = this.createAgentElement(agent);
            container.appendChild(agentElement);
            this.agentStatusElements.set(agent.id, agentElement);
        });
    }

    /**
     * Create agent list item element
     */
    createAgentElement(agent) {
        const element = document.createElement('div');
        element.className = 'agent-item';
        element.setAttribute('role', 'listitem');
        element.dataset.agentId = agent.id;

        const statusClass = this.getStatusClass(agent.status);
        const metricsHtml = agent.status === 'offline' 
            ? '<span class="metric-badge error">Offline</span>'
            : `
                <span class="metric-badge ${this.getUptimeClass(agent.uptime)}">${agent.uptime}%</span>
                <span class="agent-rating">${agent.rating}★</span>
                <span class="response-time">${agent.lastResponse}</span>
            `;

        element.innerHTML = `
            <div class="agent-info">
                <div class="status-indicator ${statusClass}" 
                     aria-label="Agent status: ${agent.status}"></div>
                <div class="agent-details">
                    <div class="agent-name">${this.escapeHtml(agent.name)}</div>
                    <div class="agent-type">${this.escapeHtml(agent.type)}</div>
                </div>
            </div>
            <div class="agent-metrics">
                ${metricsHtml}
            </div>
        `;

        // Add click handler for agent details
        element.addEventListener('click', () => {
            this.showAgentDetails(agent.id);
        });

        // Add keyboard navigation
        element.setAttribute('tabindex', '0');
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.showAgentDetails(agent.id);
            }
        });

        return element;
    }

    /**
     * Get CSS class for agent status
     */
    getStatusClass(status) {
        switch (status) {
            case 'online': return 'active';
            case 'warning': return 'warning';
            case 'offline':
            case 'error':
                return 'error';
            default: return '';
        }
    }

    /**
     * Get CSS class for uptime percentage
     */
    getUptimeClass(uptime) {
        if (uptime >= 95) return 'success';
        if (uptime >= 80) return 'warning';
        return 'error';
    }

    /**
     * Set up preset buttons
     */
    setupPresetButtons() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
            });
        });
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        
        const sidebar = document.querySelector('.sidebar');
        const canvas = document.querySelector('.canvas-container');
        const toggleBtn = document.querySelector('.sidebar-toggle');
        
        if (this.isCollapsed) {
            sidebar.classList.add('collapsed');
            canvas.classList.add('sidebar-collapsed');
            toggleBtn.setAttribute('aria-expanded', 'false');
        } else {
            sidebar.classList.remove('collapsed');
            canvas.classList.remove('sidebar-collapsed');
            toggleBtn.setAttribute('aria-expanded', 'true');
        }

        // Announce to screen reader
        AICanvas.announceToScreenReader(
            `Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`
        );

        // Trigger layout adjustment
        setTimeout(() => {
            if (window.WidgetManager) {
                WidgetManager.adjustWidgetsToViewport();
            }
        }, 300);
    }

    /**
     * Handle preset selector change
     */
    handlePresetChange(event) {
        const preset = event.target.value;
        if (window.AICanvas) {
            AICanvas.switchPreset(preset);
        }
    }

    /**
     * Apply agent preset
     */
    applyPreset(presetId) {
        // Update active preset
        this.activePreset = presetId;
        
        // Update button states
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetId);
        });

        // Update agent visibility based on preset
        this.updateAgentVisibility(presetId);

        // Announce change
        AICanvas.announceToScreenReader(`Applied ${presetId} preset`);
    }

    /**
     * Update agent visibility based on preset
     */
    updateAgentVisibility(presetId) {
        const presetConfigs = {
            'all-agents': ['workday', 'policy', 'healthcare', 'finance'],
            'hr-focus': ['workday', 'policy', 'healthcare'],
            'finance-tools': ['finance', 'policy'],
            'policy-search': ['policy', 'workday']
        };

        const enabledAgents = presetConfigs[presetId] || presetConfigs['all-agents'];

        // Update agent item states
        this.agentStatusElements.forEach((element, agentId) => {
            const isEnabled = enabledAgents.includes(agentId);
            element.classList.toggle('preset-disabled', !isEnabled);
            
            // Update accessibility
            element.setAttribute('aria-disabled', !isEnabled);
            
            if (!isEnabled) {
                element.style.opacity = '0.5';
            } else {
                element.style.opacity = '';
            }
        });
    }

    /**
     * Update agent status display
     */
    updateAgentStatus(agentId, status, metrics = {}) {
        const element = this.agentStatusElements.get(agentId);
        if (!element) return;

        // Update status indicator
const statusIndicator = element.querySelector('.status-indicator');
       if (statusIndicator) {
           statusIndicator.className = `status-indicator ${this.getStatusClass(status)}`;
           statusIndicator.setAttribute('aria-label', `Agent status: ${status}`);
       }

       // Update metrics if provided
       if (Object.keys(metrics).length > 0) {
           const metricsContainer = element.querySelector('.agent-metrics');
           if (metricsContainer && status !== 'offline') {
               const uptime = metrics.uptime || 0;
               const responseTime = metrics.responseTime || 0;
               const reliability = metrics.reliability || 0;
               
               metricsContainer.innerHTML = `
                   <span class="metric-badge ${this.getUptimeClass(uptime)}">${Math.round(uptime)}%</span>
                   <span class="agent-rating">${(reliability / 20).toFixed(1)}★</span>
                   <span class="response-time">${responseTime.toFixed(1)}ms</span>
               `;
           } else if (status === 'offline') {
               metricsContainer.innerHTML = '<span class="metric-badge error">Offline</span>';
           }
       }

       // Show notification for critical status changes
       if (status === 'offline' || status === 'error') {
           this.showAgentStatusNotification(agentId, status);
       }
   }

   /**
    * Show agent status notification
    */
   showAgentStatusNotification(agentId, status) {
       const agentName = this.getAgentName(agentId);
       const message = status === 'offline' 
           ? `${agentName} is now offline`
           : `${agentName} encountered an error`;
       
       NotificationManager.show({
           type: 'warning',
           title: 'Agent Status Change',
           message,
           duration: 5000
       });
   }

   /**
    * Get agent name by ID
    */
   getAgentName(agentId) {
       const element = this.agentStatusElements.get(agentId);
       if (element) {
           const nameElement = element.querySelector('.agent-name');
           return nameElement ? nameElement.textContent : agentId;
       }
       return agentId;
   }

   /**
    * Show detailed agent information
    */
   showAgentDetails(agentId) {
       // Create modal with agent details
       const modal = this.createAgentDetailsModal(agentId);
       document.body.appendChild(modal);
       
       // Focus management
       modal.focus();
       
       // Close handlers
       const closeModal = () => {
           modal.remove();
           // Return focus to agent item
           const agentElement = this.agentStatusElements.get(agentId);
           if (agentElement) {
               agentElement.focus();
           }
       };
       
       modal.querySelector('.modal-close').addEventListener('click', closeModal);
       modal.addEventListener('keydown', (e) => {
           if (e.key === 'Escape') {
               closeModal();
           }
       });
       
       // Click outside to close
       modal.addEventListener('click', (e) => {
           if (e.target === modal) {
               closeModal();
           }
       });
   }

   /**
    * Create agent details modal
    */
   createAgentDetailsModal(agentId) {
       const modal = document.createElement('div');
       modal.className = 'modal-backdrop';
       modal.setAttribute('role', 'dialog');
       modal.setAttribute('aria-modal', 'true');
       modal.setAttribute('aria-labelledby', 'agent-details-title');
       modal.setAttribute('tabindex', '-1');
       
       // Get agent data (would come from API in real app)
       const agentData = this.getAgentData(agentId);
       
       modal.innerHTML = `
           <div class="modal-content">
               <div class="modal-header">
                   <h2 id="agent-details-title">${this.escapeHtml(agentData.name)} Details</h2>
                   <button class="modal-close" aria-label="Close dialog">×</button>
               </div>
               <div class="modal-body">
                   <div class="agent-overview">
                       <div class="status-section">
                           <div class="status-indicator ${this.getStatusClass(agentData.status)}"></div>
                           <span class="status-text">${agentData.status.toUpperCase()}</span>
                       </div>
                       <div class="agent-meta">
                           <p><strong>Type:</strong> ${this.escapeHtml(agentData.type)}</p>
                           <p><strong>Version:</strong> ${agentData.version}</p>
                           <p><strong>Last Updated:</strong> ${agentData.lastUpdated}</p>
                       </div>
                   </div>
                   
                   <div class="performance-metrics">
                       <h3>Performance Metrics</h3>
                       <div class="metrics-grid">
                           <div class="metric-item">
                               <span class="metric-value">${agentData.uptime}%</span>
                               <span class="metric-label">Uptime</span>
                           </div>
                           <div class="metric-item">
                               <span class="metric-value">${agentData.avgResponseTime}ms</span>
                               <span class="metric-label">Avg Response</span>
                           </div>
                           <div class="metric-item">
                               <span class="metric-value">${agentData.totalQueries}</span>
                               <span class="metric-label">Total Queries</span>
                           </div>
                           <div class="metric-item">
                               <span class="metric-value">${agentData.successRate}%</span>
                               <span class="metric-label">Success Rate</span>
                           </div>
                       </div>
                   </div>
                   
                   <div class="capabilities-section">
                       <h3>Capabilities</h3>
                       <div class="capabilities-list">
                           ${agentData.capabilities.map(cap => 
                               `<span class="capability-tag">${this.escapeHtml(cap)}</span>`
                           ).join('')}
                       </div>
                   </div>
                   
                   <div class="recent-activity">
                       <h3>Recent Activity</h3>
                       <div class="activity-list">
                           ${agentData.recentActivity.map(activity => `
                               <div class="activity-item">
                                   <span class="activity-time">${activity.time}</span>
                                   <span class="activity-description">${this.escapeHtml(activity.description)}</span>
                               </div>
                           `).join('')}
                       </div>
                   </div>
               </div>
               <div class="modal-footer">
                   <button class="btn btn-secondary modal-close">Close</button>
                   <button class="btn btn-primary" onclick="SidebarManager.testAgent('${agentId}')">
                       Test Connection
                   </button>
               </div>
           </div>
       `;
       
       return modal;
   }

   /**
    * Get agent data for details modal
    */
   getAgentData(agentId) {
       // Mock data - would come from API in real app
       const agentDatabase = {
           workday: {
               name: 'Workday Assistant',
               type: 'HR & Payroll',
               status: 'online',
               version: '2.1.0',
               lastUpdated: '2025-06-15',
               uptime: 98,
               avgResponseTime: 1200,
               totalQueries: 1543,
               successRate: 97.2,
               capabilities: ['Vacation Management', 'Payroll Queries', 'Benefits Information', 'Employee Records'],
               recentActivity: [
                   { time: '10:45 AM', description: 'Processed vacation request query' },
                   { time: '10:32 AM', description: 'Retrieved employee benefits information' },
                   { time: '10:18 AM', description: 'Calculated remaining PTO days' },
                   { time: '09:55 AM', description: 'Answered payroll schedule question' }
               ]
           },
           policy: {
               name: 'Policy Bot',
               type: 'Knowledge & Compliance',
               status: 'online',
               version: '1.8.3',
               lastUpdated: '2025-06-18',
               uptime: 99,
               avgResponseTime: 800,
               totalQueries: 2187,
               successRate: 98.8,
               capabilities: ['Policy Retrieval', 'Compliance Checking', 'Procedure Guidance', 'Document Search'],
               recentActivity: [
                   { time: '10:50 AM', description: 'Retrieved remote work policy' },
                   { time: '10:35 AM', description: 'Explained expense reimbursement rules' },
                   { time: '10:20 AM', description: 'Found security compliance requirements' },
                   { time: '10:05 AM', description: 'Provided training completion guidelines' }
               ]
           },
           healthcare: {
               name: 'Healthcare Bot',
               type: 'Benefits & Wellness',
               status: 'warning',
               version: '1.5.1',
               lastUpdated: '2025-05-20',
               uptime: 85,
               avgResponseTime: 2100,
               totalQueries: 892,
               successRate: 89.3,
               capabilities: ['Health Insurance', 'Wellness Programs', 'Medical Benefits', 'FSA/HSA'],
               recentActivity: [
                   { time: '10:12 AM', description: 'Health insurance query (slow response)' },
                   { time: '09:45 AM', description: 'FSA balance inquiry' },
                   { time: '09:30 AM', description: 'Wellness program enrollment' },
                   { time: '09:15 AM', description: 'Medical coverage details' }
               ]
           },
           finance: {
               name: 'Finance Helper',
               type: 'Budget & Expenses',
               status: 'online',
               version: '2.0.1',
               lastUpdated: '2025-06-10',
               uptime: 96,
               avgResponseTime: 1500,
               totalQueries: 1124,
               successRate: 94.8,
               capabilities: ['Budget Analysis', 'Expense Tracking', 'Financial Reports', 'Cost Analysis'],
               recentActivity: [
                   { time: '10:40 AM', description: 'Generated department budget report' },
                   { time: '10:25 AM', description: 'Analyzed Q2 expenses' },
                   { time: '10:10 AM', description: 'Expense approval workflow' },
                   { time: '09:50 AM', description: 'Budget variance calculation' }
               ]
           },
           guidewire: {
               name: 'Guidewire Bot',
               type: 'Insurance Workflows',
               status: 'offline',
               version: '1.2.0',
               lastUpdated: '2025-04-15',
               uptime: 0,
               avgResponseTime: 0,
               totalQueries: 0,
               successRate: 0,
               capabilities: ['Policy Management', 'Claims Processing', 'Underwriting', 'Billing'],
               recentActivity: [
                   { time: '8:30 AM', description: 'Connection timeout' },
                   { time: '8:15 AM', description: 'Service unavailable' },
                   { time: '8:00 AM', description: 'Failed health check' }
               ]
           }
       };
       
       return agentDatabase[agentId] || {
           name: agentId,
           type: 'Unknown',
           status: 'unknown',
           version: 'N/A',
           lastUpdated: 'N/A',
           uptime: 0,
           avgResponseTime: 0,
           totalQueries: 0,
           successRate: 0,
           capabilities: [],
           recentActivity: []
       };
   }

   /**
    * Test agent connection
    */
   async testAgent(agentId) {
       const testButton = document.querySelector('.modal-footer .btn-primary');
       if (testButton) {
           testButton.textContent = 'Testing...';
           testButton.disabled = true;
       }
       
       try {
           // Simulate API call
           await new Promise(resolve => setTimeout(resolve, 2000));
           
           // Random success/failure for demo
           const success = Math.random() > 0.3;
           
           if (success) {
               NotificationManager.show({
                   type: 'success',
                   title: 'Connection Test',
                   message: `${this.getAgentName(agentId)} connection test successful`,
                   duration: 3000
               });
           } else {
               NotificationManager.show({
                   type: 'error',
                   title: 'Connection Test',
                   message: `${this.getAgentName(agentId)} connection test failed`,
                   duration: 3000
               });
           }
           
       } catch (error) {
           NotificationManager.show({
               type: 'error',
               title: 'Test Error',
               message: 'Failed to test agent connection',
               duration: 3000
           });
       } finally {
           if (testButton) {
               testButton.textContent = 'Test Connection';
               testButton.disabled = false;
           }
       }
   }

   /**
    * Escape HTML to prevent XSS
    */
   escapeHtml(text) {
       const div = document.createElement('div');
       div.textContent = text;
       return div.innerHTML;
   }

   /**
    * Get current sidebar state
    */
   getState() {
       return {
           collapsed: this.isCollapsed,
           activePreset: this.activePreset,
           agentCount: this.agentStatusElements.size
       };
   }

   // Static method for global access
   static testAgent(agentId) {
       if (SidebarManager.instance) {
           SidebarManager.instance.testAgent(agentId);
       }
   }
}

// Create global instance
window.SidebarManager = new SidebarManager();
SidebarManager.instance = window.SidebarManager;
