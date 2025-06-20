/**
 * Main Application Entry Point
 * This file initializes and coordinates all components
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize core application
    const app = new AICanvasApp();
    app.initialize();
});

class AICanvasApp {
    constructor() {
        this.widgets = new Map();
        this.widgetCounter = 0;
        this.selectedWidget = null;
        this.sidebarCollapsed = false;
        this.activePreset = 'all-agents';
        
        // Drag and drop state
        this.dragData = null;
        this.resizeData = null;
        
        // Agent states
        this.agents = new Map([
            ['workday', { name: 'Workday Assistant', status: 'online', enabled: true }],
            ['policy', { name: 'Policy Bot', status: 'online', enabled: true }],
            ['healthcare', { name: 'Healthcare Bot', status: 'warning', enabled: false }],
            ['finance', { name: 'Finance Helper', status: 'online', enabled: false }],
            ['guidewire', { name: 'Guidewire Bot', status: 'offline', enabled: false }]
        ]);
    }

    /**
     * Initialize the application
     */
    initialize() {
        this.setupEventListeners();
        this.renderAgentList();
        this.setupDragAndDrop();
        this.setupPresetButtons();
        this.createDefaultWidgets();
        console.log('AI Canvas App initialized');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Preset selector
        const presetSelector = document.querySelector('.preset-selector');
        if (presetSelector) {
            presetSelector.addEventListener('change', (e) => {
                this.switchPreset(e.target.value);
            });
        }

        // Canvas controls
        const resetBtn = document.querySelector('[aria-label="Reset canvas layout"]');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetLayout());
        }

        const saveBtn = document.querySelector('[aria-label="Save current workspace"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveWorkspace());
        }

        const exportBtn = document.querySelector('[aria-label="Export workspace configuration"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportWorkspace());
        }

        // Global mouse events for dragging/resizing
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Canvas click to deselect
        const canvas = document.getElementById('canvas-workspace');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                if (e.target === canvas || e.target.classList.contains('canvas-grid')) {
                    this.selectWidget(null);
                }
            });
        }
    }

    /**
     * Render the agent list in the sidebar
     */
    renderAgentList() {
        const agentList = document.querySelector('.agent-list');
        if (!agentList) return;

        agentList.innerHTML = '';

        this.agents.forEach((agent, agentId) => {
            const agentElement = this.createAgentElement(agentId, agent);
            agentList.appendChild(agentElement);
        });
    }

    /**
     * Create an agent list item
     */
    createAgentElement(agentId, agent) {
        const element = document.createElement('div');
        element.className = `agent-item ${agent.enabled ? 'enabled' : 'disabled'}`;
        element.dataset.agentId = agentId;

        const statusClass = agent.status === 'online' ? 'active' : 
                           agent.status === 'warning' ? 'warning' : 'error';

        element.innerHTML = `
            <div class="agent-info">
                <div class="status-indicator ${statusClass}"></div>
                <div class="agent-details">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-type">${this.getAgentType(agentId)}</div>
                </div>
            </div>
            <div class="agent-toggle ${agent.enabled ? 'active' : ''}" data-agent="${agentId}">
                <div class="toggle-slider"></div>
            </div>
        `;

        // Add click handler for toggle
        const toggle = element.querySelector('.agent-toggle');
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAgent(agentId);
        });

        // Add click handler for agent details
        element.addEventListener('click', () => {
            this.showAgentDetails(agentId);
        });

        return element;
    }

    /**
     * Get agent type description
     */
    getAgentType(agentId) {
        const types = {
            workday: 'HR & Payroll',
            policy: 'Knowledge & Compliance',
            healthcare: 'Benefits & Wellness',
            finance: 'Budget & Expenses',
            guidewire: 'Insurance Workflows'
        };
        return types[agentId] || 'General Purpose';
    }

    /**
     * Toggle agent enabled/disabled state
     */
    toggleAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent || agent.status === 'offline') return;

        agent.enabled = !agent.enabled;
        
        // Update UI
        const agentElement = document.querySelector(`[data-agent-id="${agentId}"]`);
        const toggle = document.querySelector(`[data-agent="${agentId}"]`);
        
        if (agentElement && toggle) {
            agentElement.classList.toggle('enabled', agent.enabled);
            agentElement.classList.toggle('disabled', !agent.enabled);
            toggle.classList.toggle('active', agent.enabled);
        }

        // Update all widgets that use this agent
        this.updateWidgetAgents();

        // Show notification
        this.showNotification({
            type: 'info',
            message: `${agent.name} ${agent.enabled ? 'enabled' : 'disabled'}`,
            duration: 2000
        });
    }

    /**
     * Set up drag and drop for widget templates
     */
    setupDragAndDrop() {
        const templateCards = document.querySelectorAll('.template-card');
        const canvas = document.getElementById('canvas-workspace');

        templateCards.forEach(card => {
            // Make draggable
            card.addEventListener('dragstart', (e) => {
                const widgetType = card.dataset.widgetType;
                e.dataTransfer.setData('text/plain', widgetType);
                e.dataTransfer.effectAllowed = 'copy';
                card.style.opacity = '0.5';
            });

            card.addEventListener('dragend', () => {
                card.style.opacity = '';
            });

            // Also support click to create
            card.addEventListener('click', () => {
                const widgetType = card.dataset.widgetType;
                this.createWidget(widgetType, this.getDefaultPosition());
            });
        });

        // Canvas drop zone
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            canvas.classList.add('drag-over');
        });

        canvas.addEventListener('dragleave', () => {
            canvas.classList.remove('drag-over');
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('drag-over');
            
            const widgetType = e.dataTransfer.getData('text/plain');
            if (widgetType) {
                const canvasRect = canvas.getBoundingClientRect();
                const x = e.clientX - canvasRect.left + canvas.scrollLeft;
                const y = e.clientY - canvasRect.top + canvas.scrollTop;
                this.createWidget(widgetType, { x, y });
            }
        });
    }

    /**
     * Set up preset buttons
     */
    setupPresetButtons() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
            });
        });
    }

    /**
     * Apply a preset configuration
     */
    applyPreset(presetId) {
        this.activePreset = presetId;

        // Update button states
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetId);
        });

        // Apply preset logic
        const presetConfigs = {
            'all-agents': ['workday', 'policy', 'healthcare', 'finance'],
            'hr-focus': ['workday', 'policy', 'healthcare'],
            'finance-tools': ['finance', 'policy'],
            'policy-search': ['policy', 'workday']
        };

        const enabledAgents = presetConfigs[presetId] || presetConfigs['all-agents'];

        // Update agent states
        this.agents.forEach((agent, agentId) => {
            if (agent.status !== 'offline') {
                agent.enabled = enabledAgents.includes(agentId);
            }
        });

        // Re-render agent list
        this.renderAgentList();
        this.updateWidgetAgents();

        this.showNotification({
            type: 'success',
            message: `Applied ${presetId.replace('-', ' ')} preset`,
            duration: 3000
        });
    }

    /**
     * Create a new widget
     */
    createWidget(type, position) {
        const widgetId = `widget_${++this.widgetCounter}`;
        const widget = {
            id: widgetId,
            type: type,
            title: this.getWidgetTitle(type),
            position: position,
            size: this.getDefaultSize(type),
            pinned: false
        };

        const element = this.createWidgetElement(widget);
        const canvas = document.getElementById('canvas-workspace');
        canvas.appendChild(element);

        this.widgets.set(widgetId, widget);
        this.setupWidgetInteractions(element, widget);
        this.selectWidget(widgetId);

        this.showNotification({
            type: 'success',
            message: `Created ${widget.title}`,
            duration: 2000
        });

        return widgetId;
    }

    /**
     * Get default widget title
     */
    getWidgetTitle(type) {
        const titles = {
            'multi-agent-chat': 'Multi-Agent Chat',
            'document-processor': 'Document Processor',
            'workflow-orchestrator': 'Workflow Orchestrator',
            'analytics-dashboard': 'Analytics Dashboard'
        };
        return titles[type] || 'New Widget';
    }

    /**
     * Get default widget size
     */
    getDefaultSize(type) {
        const sizes = {
            'multi-agent-chat': { width: 400, height: 350 },
            'document-processor': { width: 350, height: 300 },
            'workflow-orchestrator': { width: 500, height: 350 },
            'analytics-dashboard': { width: 450, height: 300 }
        };
        return sizes[type] || { width: 400, height: 300 };
    }

    /**
     * Get default position for new widgets
     */
    getDefaultPosition() {
        const offset = this.widgets.size * 30;
        return { x: 50 + offset, y: 100 + offset };
    }

    /**
     * Create widget DOM element
     */
    createWidgetElement(widget) {
        const element = document.createElement('div');
        element.className = 'widget';
        element.id = widget.id;
        element.style.transform = `translate(${widget.position.x}px, ${widget.position.y}px)`;
        element.style.width = `${widget.size.width}px`;
        element.style.height = `${widget.size.height}px`;

        element.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${widget.title}</h3>
                <div class="widget-controls">
                    <button class="widget-control-btn" data-action="configure" title="Configure">
                        ⚙️
                    </button>
                    <button class="widget-control-btn" data-action="pin" title="Pin">
                        📌
                    </button>
                    <button class="widget-control-btn" data-action="close" title="Close">
                        ✕
                    </button>
                </div>
            </div>
            <div class="widget-content">
                ${this.createWidgetContent(widget)}
            </div>
            <div class="widget-resize-handle"></div>
        `;

        return element;
    }

    /**
     * Create widget-specific content
     */
    createWidgetContent(widget) {
        switch (widget.type) {
            case 'multi-agent-chat':
                return this.createChatContent(widget);
            case 'document-processor':
                return this.createDocumentContent(widget);
            case 'workflow-orchestrator':
                return this.createWorkflowContent(widget);
            case 'analytics-dashboard':
                return this.createAnalyticsContent(widget);
            default:
                return '<div class="placeholder">Widget content loading...</div>';
        }
    }

    /**
     * Create chat widget content
     */
    createChatContent(widget) {
        const enabledAgents = Array.from(this.agents.entries())
            .filter(([id, agent]) => agent.enabled && agent.status !== 'offline');

        const agentChips = enabledAgents.map(([id, agent]) => 
            `<button class="agent-chip active" data-agent="${id}">${agent.name}</button>`
        ).join('');

        return `
            <div class="agent-selector">
                <div class="agent-chips">
                    ${agentChips}
                </div>
            </div>
            
            <div class="chat-container">
                <div class="chat-messages" id="${widget.id}-messages">
                    <div class="welcome-message">
                        <p>Select agents above and start asking questions. Responses will include citations showing which agent provided each piece of information.</p>
                    </div>
                </div>
                
                <form class="chat-input-form">
                    <textarea class="chat-input" placeholder="Ask about HR policies, benefits, or procedures..." rows="1"></textarea>
                    <button type="submit" class="send-button">Send</button>
                </form>
            </div>
        `;
    }

    /**
     * Create document processor content
     */
    createDocumentContent(widget) {
        return `
            <div class="agent-selector">
                <div class="agent-chips">
                    <button class="agent-chip active" data-agent="policy">Policy Analyzer</button>
                    <button class="agent-chip" data-agent="finance">Financial Reviewer</button>
                </div>
            </div>
            
            <div class="document-upload-area">
                <div class="upload-zone">
                    <div class="upload-icon">📄</div>
                    <p>Drag files here or click to upload</p>
                    <p class="upload-formats">Supports PDF, DOCX, TXT files</p>
                    <input type="file" class="file-input" accept=".pdf,.docx,.txt" multiple>
                </div>
            </div>
            
            <div class="processing-status">
                <p>Ready to process documents</p>
            </div>
        `;
    }

    /**
     * Create workflow orchestrator content
     */
    createWorkflowContent(widget) {
        return `
            <div class="workflow-controls">
                <select class="form-control">
                    <option>Employee Onboarding</option>
                    <option>Benefits Enrollment</option>
                    <option>Expense Processing</option>
                    <option>Policy Review</option>
                </select>
            </div>
            
            <div class="workflow-visualization">
                <div class="workflow-step active">
                    <div class="step-indicator">1</div>
                    <div class="step-content">
                        <h4>Data Collection</h4>
                        <p class="step-status">Ready</p>
                    </div>
                </div>
                <div class="workflow-step">
                    <div class="step-indicator">2</div>
                    <div class="step-content">
                        <h4>Agent Processing</h4>
                        <p class="step-status">Waiting</p>
                    </div>
                </div>
                <div class="workflow-step">
                    <div class="step-indicator">3</div>
                    <div class="step-content">
                        <h4>Result Synthesis</h4>
                        <p class="step-status">Waiting</p>
                    </div>
                </div>
            </div>
            
            <div class="workflow-actions">
                <button class="btn btn-primary">Start Workflow</button>
                <button class="btn btn-secondary">Configure</button>
            </div>
        `;
    }

    /**
     * Create analytics dashboard content
     */
    createAnalyticsContent(widget) {
        return `
            <div class="analytics-overview">
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">247</div>
                        <div class="metric-label">Queries Today</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value success">98.4%</div>
                        <div class="metric-label">Success Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">1.2s</div>
                        <div class="metric-label">Avg Response</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value warning">$23.40</div>
                        <div class="metric-label">Token Cost</div>
                    </div>
                </div>
            </div>
            
            <div class="analytics-details">
                <h4>Agent Performance</h4>
                <div class="performance-list">
                    <div class="performance-item">
                        <span>Policy Bot</span>
                        <div class="performance-bar">
                            <div class="bar-fill" style="width: 95%"></div>
                        </div>
                        <span>95%</span>
                    </div>
                    <div class="performance-item">
                        <span>Workday Assistant</span>
                        <div class="performance-bar">
                            <div class="bar-fill" style="width: 92%"></div>
                        </div>
                        <span>92%</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up widget interactions
     */
    setupWidgetInteractions(element, widget) {
        const header = element.querySelector('.widget-header');
        const resizeHandle = element.querySelector('.widget-resize-handle');
        const controlBtns = element.querySelectorAll('.widget-control-btn');

        // Widget dragging
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.widget-control-btn')) return;
            this.startDragging(widget.id, e);
        });

        // Widget resizing
        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startResizing(widget.id, e);
        });

        // Control buttons
        controlBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleWidgetAction(widget.id, action);
            });
        });

        // Widget selection
        element.addEventListener('click', () => {
            this.selectWidget(widget.id);
        });

        // Agent chip interactions (for chat widgets)
        if (widget.type === 'multi-agent-chat') {
            this.setupChatInteractions(element, widget);
        }
    }

    /**
     * Set up chat widget interactions
     */
    setupChatInteractions(element, widget) {
        const agentChips = element.querySelectorAll('.agent-chip');
        const chatForm = element.querySelector('.chat-input-form');
        const chatInput = element.querySelector('.chat-input');

        // Agent chip toggles
        agentChips.forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
                this.updateChatAgents(widget.id);
            });
        });

        // Chat form submission
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message) {
                    this.sendChatMessage(widget.id, message);
                    chatInput.value = '';
                }
            });
        }

        // Auto-resize textarea
        if (chatInput) {
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            });
        }
    }

    /**
     * Send chat message
     */
    sendChatMessage(widgetId, message) {
        const element = document.getElementById(widgetId);
        const messagesContainer = element.querySelector('.chat-messages');
        const activeAgents = Array.from(element.querySelectorAll('.agent-chip.active'))
            .map(chip => chip.dataset.agent);

        if (activeAgents.length === 0) {
            this.addChatMessage(messagesContainer, {
                type: 'system',
                content: 'Please select at least one agent to process your query.',
                timestamp: new Date()
            });
            return;
        }

        // Add user message
        this.addChatMessage(messagesContainer, {
            type: 'user',
            content: message,
            timestamp: new Date()
        });

        // Show typing indicator
        const typingIndicator = this.addTypingIndicator(messagesContainer);

        // Simulate agent response
        setTimeout(() => {
            typingIndicator.remove();
            
            const response = this.generateMockResponse(message, activeAgents);
            this.addChatMessage(messagesContainer, {
                type: 'assistant',
                content: response.content,
                agents: response.agents,
                sources: response.sources,
                timestamp: new Date()
            });
        }, 1500 + Math.random() * 1000);
    }

    /**
     * Generate mock agent response
     */
    generateMockResponse(message, activeAgents) {
        const responses = {
            vacation: {
                content: "You have 12 vacation days remaining this year. Your next scheduled PTO is March 15-17 (3 days). Would you like me to help you submit a new vacation request?",
                sources: ["Workday System", "PTO Policy"]
            },
            benefits: {
                content: "Your current benefits include Health Insurance (PPO plan), 401(k) with 6% company match, and $50,000 life insurance. Open enrollment is November 1-15.",
                sources: ["Benefits Portal", "HR Guidelines"]
            },
            policy: {
                content: "Our remote work policy allows up to 3 days per week remote with manager approval. Core hours are 10 AM - 3 PM ET. Equipment allowance includes laptop and $500 for home office setup.",
                sources: ["Employee Handbook", "IT Policy"]
            },
            budget: {
                content: "Your department budget shows 73% utilization ($127k of $175k allocated). Q2 forecast is on track. Major categories: Software licenses (45%), Contractors (28%), Travel (15%).",
                sources: ["SAP Financial System", "Q2 Forecast"]
            }
        };

        const lowerMessage = message.toLowerCase();
        let response;

        if (lowerMessage.includes('vacation') || lowerMessage.includes('pto')) {
            response = responses.vacation;
        } else if (lowerMessage.includes('benefit') || lowerMessage.includes('insurance')) {
            response = responses.benefits;
        } else if (lowerMessage.includes('remote') || lowerMessage.includes('policy')) {
            response = responses.policy;
        } else if (lowerMessage.includes('budget') || lowerMessage.includes('financial')) {
            response = responses.budget;
        } else {
            response = {
                content: `I can help with questions about ${activeAgents.map(id => this.agents.get(id)?.name).join(', ')}. What specific information do you need?`,
                sources: ["AI Assistant"]
            };
        }

        return {
            ...response,
            agents: activeAgents
        };
    }

    /**
     * Add chat message to conversation
     */
    addChatMessage(container, message) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.type}`;
        
        const timeString = message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        let sourcesHtml = '';
        if (message.sources && message.sources.length > 0) {
            sourcesHtml = ' ' + message.sources.map(source => 
                `<span class="source-citation">[${source}]</span>`
            ).join(' ');
        }

        let agentsHtml = '';
        if (message.agents && message.agents.length > 0) {
            const agentNames = message.agents.map(id => this.agents.get(id)?.name || id);
            agentsHtml = `<div class="responding-agents">Via: ${agentNames.join(', ')}</div>`;
        }

        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${this.getMessageSender(message.type)}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-content">
                ${message.content}${sourcesHtml}
            </div>
            ${agentsHtml}
        `;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Add typing indicator
     */
    addTypingIndicator(container) {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">AI agents are thinking...</span>
        `;
        
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
        
        return indicator;
    }

    /**
     * Get message sender display name
     */
    getMessageSender(type) {
        switch (type) {
            case 'user': return 'You';
            case 'assistant': return 'AI Assistant';
            case 'system': return 'System';
            default: return 'Unknown';
        }
    }

    /**
     * Update chat widget agent selections
     */
    updateChatAgents(widgetId) {
        // This would update the backend configuration for which agents
        // are active for this specific widget
        console.log('Updated agents for widget:', widgetId);
    }

    /**
     * Update all widgets when agent states change
     */
    updateWidgetAgents() {
        this.widgets.forEach((widget, widgetId) => {
            if (widget.type === 'multi-agent-chat') {
                const element = document.getElementById(widgetId);
                const agentChips = element.querySelectorAll('.agent-chip');
                
                agentChips.forEach(chip => {
                    const agentId = chip.dataset.agent;
                    const agent = this.agents.get(agentId);
                    
                    if (agent) {
                        chip.classList.toggle('disabled', !agent.enabled || agent.status === 'offline');
                        if (!agent.enabled || agent.status === 'offline') {
                            chip.classList.remove('active');
                        }
                    }
                });
            }
        });
    }

    /**
     * Start dragging a widget
     */
    startDragging(widgetId, e) {
        const element = document.getElementById(widgetId);
        const rect = element.getBoundingClientRect();
        const canvas = document.getElementById('canvas-workspace');
        const canvasRect = canvas.getBoundingClientRect();

        this.dragData = {
            widgetId,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            elementX: rect.left - canvasRect.left + canvas.scrollLeft,
            elementY: rect.top - canvasRect.top + canvas.scrollTop
        };

        element.classList.add('dragging');
        this.selectWidget(widgetId);
    }

    /**
     * Start resizing a widget
     */
    startResizing(widgetId, e) {
        const element = document.getElementById(widgetId);
        const rect = element.getBoundingClientRect();

        this.resizeData = {
            widgetId,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: rect.width,
            startHeight: rect.height
        };

        this.selectWidget(widgetId);
    }

    /**
     * Handle mouse move for dragging/resizing
     */
    handleMouseMove(e) {
        if (this.dragData) {
            this.handleDragging(e);
        } else if (this.resizeData) {
            this.handleResizing(e);
        }
    }

    /**
     * Handle widget dragging
     */
    handleDragging(e) {
        const { widgetId, offsetX, offsetY } = this.dragData;
        const element = document.getElementById(widgetId);
        const canvas = document.getElementById('canvas-workspace');
        const canvasRect = canvas.getBoundingClientRect();

        const newX = e.clientX - canvasRect.left + canvas.scrollLeft - offsetX;
        const newY = e.clientY - canvasRect.top + canvas.scrollTop - offsetY;

        // Constrain to canvas bounds
        const constrainedX = Math.max(0, newX);
        const constrainedY = Math.max(0, newY);

        element.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;

        // Update widget data
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.position = { x: constrainedX, y: constrainedY };
        }
    }

/**
    * Handle widget resizing
    */
   handleResizing(e) {
       const { widgetId, startX, startY, startWidth, startHeight } = this.resizeData;
       const element = document.getElementById(widgetId);

       const deltaX = e.clientX - startX;
       const deltaY = e.clientY - startY;

       const newWidth = Math.max(300, startWidth + deltaX);
       const newHeight = Math.max(200, startHeight + deltaY);

       element.style.width = newWidth + 'px';
       element.style.height = newHeight + 'px';

       // Update widget data
       const widget = this.widgets.get(widgetId);
       if (widget) {
           widget.size = { width: newWidth, height: newHeight };
       }
   }

   /**
    * Handle mouse up (end drag/resize)
    */
   handleMouseUp(e) {
       if (this.dragData) {
           const element = document.getElementById(this.dragData.widgetId);
           element.classList.remove('dragging');
           this.dragData = null;
       }

       if (this.resizeData) {
           this.resizeData = null;
       }
   }

   /**
    * Handle widget control actions
    */
   handleWidgetAction(widgetId, action) {
       const widget = this.widgets.get(widgetId);
       if (!widget) return;

       switch (action) {
           case 'configure':
               this.configureWidget(widgetId);
               break;
           case 'pin':
               this.toggleWidgetPin(widgetId);
               break;
           case 'close':
               this.closeWidget(widgetId);
               break;
       }
   }

   /**
    * Configure widget (show settings modal)
    */
   configureWidget(widgetId) {
       const widget = this.widgets.get(widgetId);
       if (!widget) return;

       // Create and show configuration modal
       const modal = this.createConfigModal(widget);
       document.body.appendChild(modal);
       
       // Focus management
       modal.focus();
       
       // Setup modal interactions
       this.setupConfigModal(modal, widgetId);
   }

   /**
    * Create configuration modal
    */
   createConfigModal(widget) {
       const modal = document.createElement('div');
       modal.className = 'modal-backdrop';
       modal.innerHTML = `
           <div class="modal-content">
               <div class="modal-header">
                   <h2>Configure ${widget.title}</h2>
                   <button class="modal-close">×</button>
               </div>
               <div class="modal-body">
                   <div class="config-section">
                       <label>Widget Title:</label>
                       <input type="text" class="widget-title-input" value="${widget.title}">
                   </div>
                   
                   ${widget.type === 'multi-agent-chat' ? this.createChatConfig(widget) : ''}
                   ${widget.type === 'document-processor' ? this.createDocConfig(widget) : ''}
                   
                   <div class="config-section">
                       <label>
                           <input type="checkbox" class="pin-checkbox" ${widget.pinned ? 'checked' : ''}>
                           Pin to workspace
                       </label>
                   </div>
               </div>
               <div class="modal-footer">
                   <button class="btn btn-secondary modal-close">Cancel</button>
                   <button class="btn btn-primary save-config">Save Changes</button>
               </div>
           </div>
       `;
       return modal;
   }

   /**
    * Create chat-specific configuration
    */
   createChatConfig(widget) {
       const agentOptions = Array.from(this.agents.entries())
           .filter(([id, agent]) => agent.status !== 'offline')
           .map(([id, agent]) => `
               <label class="agent-option">
                   <input type="checkbox" value="${id}" ${agent.enabled ? 'checked' : ''}>
                   ${agent.name}
               </label>
           `).join('');

       return `
           <div class="config-section">
               <label>Available Agents:</label>
               <div class="agent-options">
                   ${agentOptions}
               </div>
           </div>
           <div class="config-section">
               <label>Query Routing:</label>
               <select class="routing-select">
                   <option value="parallel">Parallel (query all selected agents)</option>
                   <option value="sequential">Sequential (query one by one)</option>
                   <option value="smart">Smart (auto-detect best agent)</option>
               </select>
           </div>
       `;
   }

   /**
    * Create document processor configuration
    */
   createDocConfig(widget) {
       return `
           <div class="config-section">
               <label>File Types:</label>
               <div class="file-types">
                   <label><input type="checkbox" checked> PDF</label>
                   <label><input type="checkbox" checked> DOCX</label>
                   <label><input type="checkbox" checked> TXT</label>
                   <label><input type="checkbox"> XLSX</label>
               </div>
           </div>
           <div class="config-section">
               <label>Max File Size (MB):</label>
               <input type="number" value="10" min="1" max="100">
           </div>
       `;
   }

   /**
    * Setup configuration modal interactions
    */
   setupConfigModal(modal, widgetId) {
       const closeModal = () => {
           modal.remove();
           document.getElementById(widgetId)?.focus();
       };

       // Close button
       modal.querySelector('.modal-close').addEventListener('click', closeModal);

       // Save button
       modal.querySelector('.save-config').addEventListener('click', () => {
           this.saveWidgetConfig(modal, widgetId);
           closeModal();
       });

       // Escape key
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
    * Save widget configuration
    */
   saveWidgetConfig(modal, widgetId) {
       const widget = this.widgets.get(widgetId);
       if (!widget) return;

       // Update title
       const titleInput = modal.querySelector('.widget-title-input');
       if (titleInput) {
           widget.title = titleInput.value;
           document.querySelector(`#${widgetId} .widget-title`).textContent = widget.title;
       }

       // Update pin status
       const pinCheckbox = modal.querySelector('.pin-checkbox');
       if (pinCheckbox) {
           widget.pinned = pinCheckbox.checked;
       }

       // Update chat-specific settings
       if (widget.type === 'multi-agent-chat') {
           const agentCheckboxes = modal.querySelectorAll('.agent-options input[type="checkbox"]');
           agentCheckboxes.forEach(checkbox => {
               const agentId = checkbox.value;
               const agent = this.agents.get(agentId);
               if (agent) {
                   agent.enabled = checkbox.checked;
               }
           });
           this.renderAgentList();
           this.updateWidgetAgents();
       }

       this.showNotification({
           type: 'success',
           message: 'Widget configuration saved',
           duration: 2000
       });
   }

   /**
    * Toggle widget pin status
    */
   toggleWidgetPin(widgetId) {
       const widget = this.widgets.get(widgetId);
       const element = document.getElementById(widgetId);
       
       if (!widget || !element) return;

       widget.pinned = !widget.pinned;
       element.classList.toggle('pinned', widget.pinned);

       const pinBtn = element.querySelector('[data-action="pin"]');
       if (pinBtn) {
           pinBtn.style.opacity = widget.pinned ? '1' : '0.7';
           pinBtn.title = widget.pinned ? 'Unpin' : 'Pin';
       }

       this.showNotification({
           type: 'info',
           message: `Widget ${widget.pinned ? 'pinned' : 'unpinned'}`,
           duration: 2000
       });
   }

   /**
    * Close widget
    */
   closeWidget(widgetId) {
       const widget = this.widgets.get(widgetId);
       const element = document.getElementById(widgetId);
       
       if (!widget || !element) return;

       // Animate removal
       element.style.transform += ' scale(0)';
       element.style.opacity = '0';

       setTimeout(() => {
           element.remove();
           this.widgets.delete(widgetId);
           
           if (this.selectedWidget === widgetId) {
               this.selectedWidget = null;
           }
       }, 200);

       this.showNotification({
           type: 'info',
           message: `${widget.title} closed`,
           duration: 2000
       });
   }

   /**
    * Select a widget
    */
   selectWidget(widgetId) {
       // Deselect current widget
       if (this.selectedWidget) {
           const currentElement = document.getElementById(this.selectedWidget);
           if (currentElement) {
               currentElement.classList.remove('selected');
           }
       }

       // Select new widget
       this.selectedWidget = widgetId;
       if (widgetId) {
           const element = document.getElementById(widgetId);
           if (element) {
               element.classList.add('selected');
           }
       }
   }

   /**
    * Toggle sidebar
    */
   toggleSidebar() {
       this.sidebarCollapsed = !this.sidebarCollapsed;
       
       const sidebar = document.querySelector('.sidebar');
       const canvas = document.querySelector('.canvas-container');
       
       sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
       canvas.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);

       this.showNotification({
           type: 'info',
           message: `Sidebar ${this.sidebarCollapsed ? 'collapsed' : 'expanded'}`,
           duration: 1500
       });
   }

   /**
    * Switch workspace preset
    */
   switchPreset(presetId) {
       const presetSelector = document.querySelector('.preset-selector');
       if (presetSelector) {
           presetSelector.value = presetId;
       }
       
       this.applyPreset(presetId);
   }

   /**
    * Show agent details
    */
   showAgentDetails(agentId) {
       const agent = this.agents.get(agentId);
       if (!agent) return;

       const modal = document.createElement('div');
       modal.className = 'modal-backdrop';
       modal.innerHTML = `
           <div class="modal-content">
               <div class="modal-header">
                   <h2>${agent.name} Details</h2>
                   <button class="modal-close">×</button>
               </div>
               <div class="modal-body">
                   <div class="agent-status-section">
                       <div class="status-indicator ${agent.status === 'online' ? 'active' : agent.status === 'warning' ? 'warning' : 'error'}"></div>
                       <span class="status-text">${agent.status.toUpperCase()}</span>
                   </div>
                   
                   <div class="agent-details">
                       <p><strong>Type:</strong> ${this.getAgentType(agentId)}</p>
                       <p><strong>Status:</strong> ${agent.enabled ? 'Enabled' : 'Disabled'}</p>
                       <p><strong>Capabilities:</strong> ${this.getAgentCapabilities(agentId).join(', ')}</p>
                   </div>
                   
                   <div class="agent-metrics">
                       <h3>Performance Metrics</h3>
                       <div class="metrics-grid">
                           <div class="metric-item">
                               <span class="metric-value">${this.getRandomMetric(85, 99)}%</span>
                               <span class="metric-label">Uptime</span>
                           </div>
                           <div class="metric-item">
                               <span class="metric-value">${this.getRandomMetric(500, 2000)}ms</span>
                               <span class="metric-label">Avg Response</span>
                           </div>
                           <div class="metric-item">
                               <span class="metric-value">${this.getRandomMetric(100, 1000)}</span>
                               <span class="metric-label">Queries Today</span>
                           </div>
                           <div class="metric-item">
                               <span class="metric-value">${this.getRandomMetric(90, 99)}%</span>
                               <span class="metric-label">Success Rate</span>
                           </div>
                       </div>
                   </div>
               </div>
               <div class="modal-footer">
                   <button class="btn btn-secondary modal-close">Close</button>
                   <button class="btn btn-primary test-agent-btn">Test Connection</button>
               </div>
           </div>
       `;

       document.body.appendChild(modal);
       modal.focus();

       // Setup modal interactions
       const closeModal = () => {
           modal.remove();
       };

       modal.querySelector('.modal-close').addEventListener('click', closeModal);
       modal.querySelector('.test-agent-btn').addEventListener('click', () => {
           this.testAgentConnection(agentId);
       });

       modal.addEventListener('keydown', (e) => {
           if (e.key === 'Escape') closeModal();
       });

       modal.addEventListener('click', (e) => {
           if (e.target === modal) closeModal();
       });
   }

   /**
    * Get agent capabilities
    */
   getAgentCapabilities(agentId) {
       const capabilities = {
           workday: ['Vacation Management', 'Payroll', 'Benefits', 'Employee Records'],
           policy: ['Policy Retrieval', 'Compliance', 'Procedures', 'Documentation'],
           healthcare: ['Health Insurance', 'Wellness Programs', 'Medical Benefits'],
           finance: ['Budget Analysis', 'Expense Tracking', 'Financial Reports'],
           guidewire: ['Policy Management', 'Claims Processing', 'Underwriting']
       };
       return capabilities[agentId] || ['General Assistance'];
   }

   /**
    * Test agent connection
    */
   async testAgentConnection(agentId) {
       const testBtn = document.querySelector('.test-agent-btn');
       if (testBtn) {
           testBtn.textContent = 'Testing...';
           testBtn.disabled = true;
       }

       // Simulate test
       await new Promise(resolve => setTimeout(resolve, 2000));

       const success = Math.random() > 0.2; // 80% success rate

       this.showNotification({
           type: success ? 'success' : 'error',
           message: `${this.agents.get(agentId).name} connection test ${success ? 'successful' : 'failed'}`,
           duration: 3000
       });

       if (testBtn) {
           testBtn.textContent = 'Test Connection';
           testBtn.disabled = false;
       }
   }

   /**
    * Get random metric for demo
    */
   getRandomMetric(min, max) {
       return Math.floor(Math.random() * (max - min + 1)) + min;
   }

   /**
    * Create default widgets for demo
    */
   createDefaultWidgets() {
       // Create a sample chat widget
       this.createWidget('multi-agent-chat', { x: 50, y: 100 });
   }

   /**
    * Reset canvas layout
    */
   resetLayout() {
       if (confirm('Reset all widgets to default positions?')) {
           this.widgets.forEach((widget, widgetId) => {
               const element = document.getElementById(widgetId);
               if (element) {
                   widget.position = this.getDefaultPosition();
                   element.style.transform = `translate(${widget.position.x}px, ${widget.position.y}px)`;
               }
           });

           this.showNotification({
               type: 'success',
               message: 'Layout reset',
               duration: 2000
           });
       }
   }

   /**
    * Save workspace
    */
   saveWorkspace() {
       const workspaceData = {
           widgets: Array.from(this.widgets.values()),
           agents: Array.from(this.agents.entries()),
           activePreset: this.activePreset,
           timestamp: new Date().toISOString()
       };

       localStorage.setItem('aicanvas_workspace', JSON.stringify(workspaceData));

       this.showNotification({
           type: 'success',
           message: 'Workspace saved',
           duration: 2000
       });
   }

   /**
    * Export workspace
    */
   exportWorkspace() {
       const workspaceData = {
           version: '1.0.0',
           widgets: Array.from(this.widgets.values()),
           agents: Array.from(this.agents.entries()),
           activePreset: this.activePreset,
           timestamp: new Date().toISOString()
       };

       const blob = new Blob([JSON.stringify(workspaceData, null, 2)], {
           type: 'application/json'
       });

       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `aicanvas-workspace-${Date.now()}.json`;
       a.click();

       URL.revokeObjectURL(url);

       this.showNotification({
           type: 'success',
           message: 'Workspace exported',
           duration: 2000
       });
   }

   /**
    * Show notification
    */
   showNotification({ type, message, duration = 3000 }) {
       const notification = document.createElement('div');
       notification.className = `notification notification-${type}`;
       notification.innerHTML = `
           <div class="notification-content">
               <span class="notification-message">${message}</span>
               <button class="notification-close">×</button>
           </div>
       `;

       const container = document.getElementById('notification-area') || this.createNotificationContainer();
       container.appendChild(notification);

       // Auto-remove
       const timer = setTimeout(() => {
           notification.remove();
       }, duration);

       // Manual close
       notification.querySelector('.notification-close').addEventListener('click', () => {
           clearTimeout(timer);
           notification.remove();
       });

       // Animate in
       requestAnimationFrame(() => {
           notification.style.transform = 'translateX(0)';
           notification.style.opacity = '1';
       });
   }

   /**
    * Create notification container
    */
   createNotificationContainer() {
       const container = document.createElement('div');
       container.id = 'notification-area';
       container.className = 'notification-container';
       document.body.appendChild(container);
       return container;
   }
}
