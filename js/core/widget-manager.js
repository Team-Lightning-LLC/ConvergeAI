/**
 * Widget Manager
 * Handles widget lifecycle, positioning, and interactions
 */

class WidgetManager {
    constructor() {
        this.widgets = new Map();
        this.widgetCounter = 0;
        this.selectedWidget = null;
        this.dragData = null;
        this.resizeData = null;
        
        // Widget templates
        this.templates = new Map();
        
        // Bind methods
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleCanvasKeyDown = this.handleCanvasKeyDown.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
    }

    /**
     * Initialize Widget Manager
     */
    async initialize() {
        try {
            // Load widget templates
            await this.loadWidgetTemplates();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up drag and drop
            this.setupDragAndDrop();
            
            console.log('Widget Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Widget Manager:', error);
            throw error;
        }
    }

    /**
     * Load widget templates configuration
     */
    async loadWidgetTemplates() {
        const templates = {
            'multi-agent-chat': {
                name: 'Multi-Agent Chat',
                description: 'Query multiple agents simultaneously with intelligent routing',
                defaultSize: { width: 400, height: 350 },
                minSize: { width: 300, height: 250 },
                maxSize: { width: 800, height: 600 },
                component: 'MultiAgentChatWidget'
            },
            'document-processor': {
                name: 'Document Processor',
                description: 'Upload and analyze documents with specialized agents',
                defaultSize: { width: 350, height: 300 },
                minSize: { width: 300, height: 250 },
                maxSize: { width: 600, height: 500 },
                component: 'DocumentProcessorWidget'
            },
            'workflow-orchestrator': {
                name: 'Workflow Orchestrator',
                description: 'Coordinate complex multi-step agent workflows',
                defaultSize: { width: 500, height: 350 },
                minSize: { width: 400, height: 300 },
                maxSize: { width: 800, height: 600 },
                component: 'WorkflowOrchestratorWidget'
            },
            'analytics-dashboard': {
                name: 'Analytics Dashboard',
                description: 'Monitor agent performance and usage metrics',
                defaultSize: { width: 450, height: 300 },
                minSize: { width: 350, height: 250 },
                maxSize: { width: 700, height: 500 },
                component: 'AnalyticsDashboardWidget'
            }
        };
        
        Object.entries(templates).forEach(([id, template]) => {
            this.templates.set(id, template);
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const canvas = document.getElementById('canvas-workspace');
        
        // Canvas interactions
        canvas.addEventListener('click', this.handleCanvasClick);
        canvas.addEventListener('keydown', this.handleCanvasKeyDown);
        
        // Global mouse events for dragging/resizing
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Sidebar template interactions
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart);
            card.addEventListener('click', this.handleTemplateClick.bind(this));
            card.addEventListener('keydown', this.handleTemplateKeyDown.bind(this));
        });
    }

    /**
     * Set up drag and drop functionality
     */
    setupDragAndDrop() {
        const canvas = document.getElementById('canvas-workspace');
        
        canvas.addEventListener('dragover', this.handleDragOver);
        canvas.addEventListener('drop', this.handleDrop);
        
        // Make canvas a drop zone
        canvas.setAttribute('aria-dropeffect', 'copy');
    }

    /**
     * Handle template card drag start
     */
    handleDragStart(event) {
        const widgetType = event.target.closest('.template-card').dataset.widgetType;
        event.dataTransfer.setData('text/plain', widgetType);
        event.dataTransfer.effectAllowed = 'copy';
        
        // Visual feedback
        event.target.style.opacity = '0.5';
        
        // Announce to screen reader
        AICanvas.announceToScreenReader(`Dragging ${this.templates.get(widgetType)?.name || widgetType} widget`);
    }

    /**
     * Handle drag over canvas
     */
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        
        // Visual feedback for drop zone
        const canvas = event.currentTarget;
        canvas.classList.add('drag-over');
    }

    /**
     * Handle drop on canvas
     */
    handleDrop(event) {
        event.preventDefault();
        
        const canvas = event.currentTarget;
        canvas.classList.remove('drag-over');
        
        const widgetType = event.dataTransfer.getData('text/plain');
        if (!widgetType || !this.templates.has(widgetType)) return;
        
        // Calculate drop position relative to canvas
        const canvasRect = canvas.getBoundingClientRect();
        const x = event.clientX - canvasRect.left + canvas.scrollLeft;
        const y = event.clientY - canvasRect.top + canvas.scrollTop;
        
        // Create widget at drop position
        this.createWidget({
            type: widgetType,
            position: { x, y }
        });
        
        // Reset drag visual feedback
        document.querySelectorAll('.template-card').forEach(card => {
            card.style.opacity = '';
        });
    }

    /**
     * Handle template card click (alternative to drag/drop)
     */
    handleTemplateClick(event) {
        const widgetType = event.target.closest('.template-card').dataset.widgetType;
        
        // Create widget at default position
        this.createWidget({
            type: widgetType,
            position: this.getDefaultPosition()
        });
    }

    /**
     * Handle template card keyboard interaction
     */
    handleTemplateKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleTemplateClick(event);
        }
    }

    /**
     * Create a new widget
     */
    createWidget(config) {
        const startTime = performance.now();
        
        try {
            const template = this.templates.get(config.type);
            if (!template) {
                throw new Error(`Unknown widget type: ${config.type}`);
            }
            
            // Generate unique ID
            const widgetId = `widget_${++this.widgetCounter}`;
            
            // Create widget data
            const widget = {
                id: widgetId,
                type: config.type,
                title: config.title || template.name,
                position: config.position || this.getDefaultPosition(),
                size: config.size || template.defaultSize,
                config: config.config || {},
                pinned: false,
                minimized: false,
                created: new Date().toISOString()
            };
            
            // Create DOM element
            const element = this.createWidgetElement(widget, template);
            
            // Position widget
            this.positionWidget(element, widget.position, widget.size);
            
            // Add to canvas
            const canvas = document.getElementById('canvas-workspace');
            canvas.appendChild(element);
            
            // Set up widget interactions
            this.setupWidgetInteractions(element, widget);
            
            // Store widget
            this.widgets.set(widgetId, widget);
            
            // Track performance
            const endTime = performance.now();
            widget.renderTime = endTime - startTime;
            
            // Emit creation event
            document.dispatchEvent(new CustomEvent('widget:created', {
                detail: { widget }
            }));
            
            // Select the new widget
            this.selectWidget(widgetId);
            
            // Focus the widget for accessibility
            element.focus();
            
            return widgetId;
            
        } catch (error) {
            console.error('Failed to create widget:', error);
            
            NotificationManager.show({
                type: 'error',
                title: 'Widget Creation Failed',
                message: `Failed to create ${config.type} widget: ${error.message}`
            });
            
            return null;
        }
    }

    /**
     * Create widget DOM element
     */
    createWidgetElement(widget, template) {
        const element = document.createElement('div');
        element.className = 'widget';
        element.id = widget.id;
        element.setAttribute('role', 'application');
        element.setAttribute('aria-label', `${widget.title} widget`);
        element.setAttribute('tabindex', '0');
        element.dataset.widgetType = widget.type;
        
        // Create widget structure
        element.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${this.escapeHtml(widget.title)}</h3>
                <div class="widget-controls">
                    <button class="widget-control-btn" data-action="configure" 
                            aria-label="Configure ${widget.title} settings">
                        <span class="control-icon settings-icon" aria-hidden="true"></span>
                    </button>
                    <button class="widget-control-btn" data-action="pin" 
                            aria-label="Pin ${widget.title} to workspace">
                        <span class="control-icon pin-icon" aria-hidden="true"></span>
                    </button>
                    <button class="widget-control-btn" data-action="close" 
                            aria-label="Close ${widget.title}">
                        <span class="control-icon close-icon" aria-hidden="true"></span>
                    </button>
                </div>
            </div>
            <div class="widget-content">
                ${this.createWidgetContent(widget, template)}
            </div>
            <div class="widget-resize-handle" aria-label="Resize ${widget.title}"></div>
        `;
        
        return element;
    }

    /**
     * Create widget-specific content
     */
    createWidgetContent(widget, template) {
        switch (widget.type) {
            case 'multi-agent-chat':
                return this.createChatWidgetContent(widget);
            case 'document-processor':
                return this.createDocumentWidgetContent(widget);
            case 'workflow-orchestrator':
                return this.createWorkflowWidgetContent(widget);
            case 'analytics-dashboard':
                return this.createAnalyticsWidgetContent(widget);
            default:
                return '<div class="placeholder">Widget content loading...</div>';
        }
    }

    /**
     * Create chat widget content
     */
    createChatWidgetContent(widget) {
        return `
            <div class="agent-selector">
                <div class="agent-chips" role="group" aria-label="Select active agents">
                    <button class="agent-chip active" data-agent="workday">
                        Workday Assistant
                    </button>
                    <button class="agent-chip active" data-agent="policy">
                        Policy Bot
                    </button>
                    <button class="agent-chip" data-agent="healthcare">
                        Healthcare Bot
                    </button>
                    <button class="agent-chip" data-agent="finance">
                        Finance Helper
                    </button>
                </div>
            </div>
            
            <div class="chat-container">
                <div class="chat-messages" role="log" aria-live="polite" 
                     aria-label="Chat conversation" id="${widget.id}-messages">
                    <div class="welcome-message">
                        <p>Select agents above and start asking questions. Responses will include citations showing which agent provided each piece of information.</p>
                    </div>
                </div>
                
                <form class="chat-input-form" aria-label="Send message to agents">
                    <label for="${widget.id}-input" class="sr-only">Enter your message</label>
                    <textarea id="${widget.id}-input" class="chat-input" 
                              placeholder="Ask about HR policies, benefits, or procedures..."
                              rows="1"
                              aria-describedby="${widget.id}-input-help"></textarea>
                    <div id="${widget.id}-input-help" class="sr-only">
                        Type your question and press Enter or click Send
                    </div>
                    <button type="submit" class="send-button" aria-label="Send message">
                        Send
                    </button>
                </form>
            </div>
        `;
    }

    /**
     * Create document processor widget content
     */
    createDocumentWidgetContent(widget) {
        return `
            <div class="agent-selector">
                <div class="agent-chips" role="group" aria-label="Select processing agents">
                    <button class="agent-chip active" data-agent="policy">
                        Policy Analyzer
                    </button>
                    <button class="agent-chip" data-agent="finance">
                        Financial Reviewer
                    </button>
                    <button class="agent-chip" data-agent="compliance">
                        Compliance Checker
                    </button>
                </div>
            </div>
            
            <div class="document-upload-area">
                <div class="upload-zone" role="button" tabindex="0" 
                     aria-label="Upload documents for analysis"
                     ondrop="WidgetManager.handleFileDrop(event, '${widget.id}')"
                     ondragover="event.preventDefault()">
                    <div class="upload-icon" aria-hidden="true">📄</div>
                    <p>Drag files here or click to upload</p>
                    <p class="upload-formats">Supports PDF, DOCX, TXT files</p>
                    <input type="file" class="file-input" id="${widget.id}-file" 
                           accept=".pdf,.docx,.txt" multiple aria-label="Choose files">
                </div>
            </div>
            
            <div class="processing-status" role="status" aria-live="polite">
                <p>Ready to process documents</p>
            </div>
        `;
    }

    /**
     * Create workflow orchestrator widget content
     */
    createWorkflowWidgetContent(widget) {
        return `
            <div class="workflow-controls">
                <label for="${widget.id}-workflow" class="control-label">Workflow Template:</label>
                <select id="${widget.id}-workflow" class="form-control">
                    <option value="employee-onboarding">Employee Onboarding</option>
                    <option value="benefits-enrollment">Benefits Enrollment</option>
                    <option value="expense-processing">Expense Processing</option>
                    <option value="policy-review">Policy Review</option>
                    <option value="custom">Custom Workflow</option>
                </select>
            </div>
            
            <div class="workflow-visualization">
                <div class="workflow-step active" data-step="1">
                    <div class="step-indicator">1</div>
                    <div class="step-content">
                        <h4>Initial Data Collection</h4>
                        <p class="step-status">Ready</p>
                    </div>
                </div>
                <div class="workflow-step" data-step="2">
                    <div class="step-indicator">2</div>
                    <div class="step-content">
                        <h4>Agent Processing</h4>
                        <p class="step-status">Waiting</p>
                    </div>
                </div>
                <div class="workflow-step" data-step="3">
                    <div class="step-indicator">3</div>
                    <div class="step-content">
                        <h4>Result Synthesis</h4>
                        <p class="step-status">Waiting</p>
                    </div>
                </div>
            </div>
            
            <div class="workflow-actions">
                <button class="btn btn-primary" onclick="WidgetManager.startWorkflow('${widget.id}')">
                    Start Workflow
                </button>
                <button class="btn btn-secondary" onclick="WidgetManager.configureWorkflow('${widget.id}')">
                    Configure
                </button>
            </div>
        `;
    }

    /**
     * Create analytics dashboard widget content
     */
    createAnalyticsWidgetContent(widget) {
        return `
            <div class="analytics-overview">
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value" id="${widget.id}-queries">247</div>
                        <div class="metric-label">Queries Today</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value success" id="${widget.id}-success">98.4%</div>
                        <div class="metric-label">Success Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" id="${widget.id}-response">1.2s</div>
                        <div class="metric-label">Avg Response</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value warning" id="${widget.id}-cost">$23.40</div>
                        <div class="metric-label">Token Cost</div>
                    </div>
                </div>
            </div>
            
            <div class="analytics-details">
                <div class="agent-performance">
                    <h4>Agent Performance</h4>
                    <div class="performance-list" role="list">
                        <div class="performance-item" role="listitem">
                            <span class="agent-name">Policy Bot</span>
                            <span class="performance-bar">
                                <span class="bar-fill" style="width: 95%"></span>
                            </span>
                            <span class="performance-value">95%</span>
                        </div>
                        <div class="performance-item" role="listitem">
                            <span class="agent-name">Workday Assistant</span>
                            <span class="performance-bar">
                                <span class="bar-fill" style="width: 92%"></span>
                            </span>
                            <span class="performance-value">92%</span>
                        </div>
                        <div class="performance-item" role="listitem">
                            <span class="agent-name">Finance Helper</span>
                            <span class="performance-bar">
                                <span class="bar-fill" style="width: 88%"></span>
                            </span>
                            <span class="performance-value">88%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

/**
     * Set up widget interactions (drag, resize, controls)
     */
    setupWidgetInteractions(element, widget) {
        const header = element.querySelector('.widget-header');
        const resizeHandle = element.querySelector('.widget-resize-handle');
        const controls = element.querySelectorAll('.widget-control-btn');
        
        // Dragging
        header.addEventListener('mousedown', this.handleWidgetDragStart.bind(this, widget.id));
        
        // Resizing
        resizeHandle.addEventListener('mousedown', this.handleWidgetResizeStart.bind(this, widget.id));
        
        // Control buttons
        controls.forEach(btn => {
            btn.addEventListener('click', this.handleWidgetControl.bind(this, widget.id));
        });
        
        // Widget selection
        element.addEventListener('click', this.handleWidgetClick.bind(this, widget.id));
        element.addEventListener('keydown', this.handleWidgetKeyDown.bind(this, widget.id));
        
        // Agent chip interactions for chat widgets
        if (widget.type === 'multi-agent-chat') {
            this.setupChatWidgetInteractions(element, widget);
        }
    }

    /**
     * Set up chat widget specific interactions
     */
    setupChatWidgetInteractions(element, widget) {
        const agentChips = element.querySelectorAll('.agent-chip');
        const chatForm = element.querySelector('.chat-input-form');
        const chatInput = element.querySelector('.chat-input');
        
        // Agent selection
        agentChips.forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
                this.updateWidgetConfig(widget.id, {
                    enabledAgents: Array.from(element.querySelectorAll('.agent-chip.active'))
                        .map(c => c.dataset.agent)
                });
            });
        });
        
        // Chat submission
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChatSubmission(widget.id, chatInput.value.trim());
        });
        
        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        });
    }

    /**
     * Handle chat message submission
     */
    async handleChatSubmission(widgetId, message) {
        if (!message) return;
        
        const widget = this.widgets.get(widgetId);
        const element = document.getElementById(widgetId);
        const messagesContainer = element.querySelector('.chat-messages');
        const chatInput = element.querySelector('.chat-input');
        
        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Add user message
        this.addChatMessage(messagesContainer, {
            type: 'user',
            content: message,
            timestamp: new Date()
        });
        
        // Get enabled agents
        const enabledAgents = Array.from(element.querySelectorAll('.agent-chip.active'))
            .map(chip => chip.dataset.agent);
        
        if (enabledAgents.length === 0) {
            this.addChatMessage(messagesContainer, {
                type: 'system',
                content: 'Please select at least one agent to process your query.',
                timestamp: new Date()
            });
            return;
        }
        
        // Show typing indicator
        const typingIndicator = this.addTypingIndicator(messagesContainer);
        
        try {
            // Process query through agent orchestrator
            const response = await AgentOrchestrator.processQuery({
                message,
                agents: enabledAgents,
                widgetId,
                context: widget.config.context || {}
            });
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add response
            this.addChatMessage(messagesContainer, {
                type: 'assistant',
                content: response.content,
                sources: response.sources,
                agents: response.agents,
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Chat submission error:', error);
            
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add error message
            this.addChatMessage(messagesContainer, {
                type: 'error',
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                timestamp: new Date()
            });
        }
    }

    /**
     * Add a chat message to the conversation
     */
    addChatMessage(container, message) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.type}`;
        messageEl.setAttribute('role', 'log');
        
        const timeString = message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let sourcesHtml = '';
        if (message.sources && message.sources.length > 0) {
            sourcesHtml = message.sources.map(source => 
                `<span class="source-citation" title="${this.escapeHtml(source.description)}">
                    ${this.escapeHtml(source.name)}
                </span>`
            ).join('');
        }
        
        let agentsHtml = '';
        if (message.agents && message.agents.length > 0) {
            agentsHtml = `<div class="responding-agents">
                ${message.agents.map(agent => 
                    `<span class="agent-badge">${this.escapeHtml(agent)}</span>`
                ).join('')}
            </div>`;
        }
        
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${this.getMessageSender(message.type, message.agents)}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-content">
                ${this.escapeHtml(message.content)}
                ${sourcesHtml}
            </div>
            ${agentsHtml}
        `;
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
        
        // Announce to screen reader
        AICanvas.announceToScreenReader(`New message from ${this.getMessageSender(message.type, message.agents)}`);
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
    getMessageSender(type, agents) {
        switch (type) {
            case 'user':
                return 'You';
            case 'assistant':
                return agents && agents.length === 1 ? 
                    `${agents[0]} Agent` : 'AI Assistant';
            case 'system':
                return 'System';
            case 'error':
                return 'Error';
            default:
                return 'Unknown';
        }
    }

    /**
     * Handle widget drag start
     */
    handleWidgetDragStart(widgetId, event) {
        if (event.target.closest('.widget-control-btn')) return;
        
        event.preventDefault();
        
        const element = document.getElementById(widgetId);
        const rect = element.getBoundingClientRect();
        const canvas = document.getElementById('canvas-workspace');
        const canvasRect = canvas.getBoundingClientRect();
        
        this.dragData = {
            widgetId,
            startX: event.clientX,
            startY: event.clientY,
            elementX: rect.left - canvasRect.left + canvas.scrollLeft,
            elementY: rect.top - canvasRect.top + canvas.scrollTop,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top
        };
        
        element.classList.add('dragging');
        this.selectWidget(widgetId);
        
        // Announce drag start
        AICanvas.announceToScreenReader(`Started dragging ${this.widgets.get(widgetId).title}`);
    }

    /**
     * Handle widget resize start
     */
    handleWidgetResizeStart(widgetId, event) {
        event.preventDefault();
        event.stopPropagation();
        
        const element = document.getElementById(widgetId);
        const rect = element.getBoundingClientRect();
        
        this.resizeData = {
            widgetId,
            startX: event.clientX,
            startY: event.clientY,
            startWidth: rect.width,
            startHeight: rect.height
        };
        
        this.selectWidget(widgetId);
        
        // Announce resize start
        AICanvas.announceToScreenReader(`Started resizing ${this.widgets.get(widgetId).title}`);
    }

    /**
     * Handle mouse move for drag/resize
     */
    handleMouseMove(event) {
        if (this.dragData) {
            this.handleWidgetDrag(event);
        } else if (this.resizeData) {
            this.handleWidgetResize(event);
        }
    }

    /**
     * Handle widget dragging
     */
    handleWidgetDrag(event) {
        const { widgetId, elementX, elementY, offsetX, offsetY } = this.dragData;
        const element = document.getElementById(widgetId);
        const canvas = document.getElementById('canvas-workspace');
        const canvasRect = canvas.getBoundingClientRect();
        
        const newX = event.clientX - canvasRect.left + canvas.scrollLeft - offsetX;
        const newY = event.clientY - canvasRect.top + canvas.scrollTop - offsetY;
        
        // Constrain to canvas bounds
        const constrainedX = Math.max(0, Math.min(newX, canvas.scrollWidth - element.offsetWidth));
        const constrainedY = Math.max(0, Math.min(newY, canvas.scrollHeight - element.offsetHeight));
        
        element.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
        
        // Update widget data
        const widget = this.widgets.get(widgetId);
        widget.position = { x: constrainedX, y: constrainedY };
    }

    /**
     * Handle widget resizing
     */
    handleWidgetResize(event) {
        const { widgetId, startX, startY, startWidth, startHeight } = this.resizeData;
        const element = document.getElementById(widgetId);
        const template = this.templates.get(this.widgets.get(widgetId).type);
        
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        
        const newWidth = Math.max(template.minSize.width, 
                         Math.min(template.maxSize.width, startWidth + deltaX));
        const newHeight = Math.max(template.minSize.height, 
                          Math.min(template.maxSize.height, startHeight + deltaY));
        
        element.style.width = newWidth + 'px';
        element.style.height = newHeight + 'px';
        
        // Update widget data
        const widget = this.widgets.get(widgetId);
        widget.size = { width: newWidth, height: newHeight };
    }

    /**
     * Handle mouse up (end drag/resize)
     */
    handleMouseUp(event) {
        if (this.dragData) {
            const element = document.getElementById(this.dragData.widgetId);
            element.classList.remove('dragging');
            
            // Announce drag end
            AICanvas.announceToScreenReader(`Finished dragging ${this.widgets.get(this.dragData.widgetId).title}`);
            
            this.dragData = null;
        }
        
        if (this.resizeData) {
            // Announce resize end
            AICanvas.announceToScreenReader(`Finished resizing ${this.widgets.get(this.resizeData.widgetId).title}`);
            
            this.resizeData = null;
        }
    }

    /**
     * Handle widget control button clicks
     */
    handleWidgetControl(widgetId, event) {
        event.stopPropagation();
        
        const action = event.target.closest('.widget-control-btn').dataset.action;
        
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
     * Configure widget settings
     */
    configureWidget(widgetId) {
        // Implementation for widget configuration modal
        console.log('Configure widget:', widgetId);
        // This would open a configuration modal specific to the widget type
    }

    /**
     * Toggle widget pin status
     */
    toggleWidgetPin(widgetId) {
        const widget = this.widgets.get(widgetId);
        const element = document.getElementById(widgetId);
        
        widget.pinned = !widget.pinned;
        
        if (widget.pinned) {
            element.classList.add('pinned');
            element.querySelector('[data-action="pin"]').setAttribute('aria-pressed', 'true');
        } else {
            element.classList.remove('pinned');
            element.querySelector('[data-action="pin"]').setAttribute('aria-pressed', 'false');
        }
        
        // Announce change
        AICanvas.announceToScreenReader(
            `Widget ${widget.pinned ? 'pinned' : 'unpinned'}`
        );
        
        NotificationManager.show({
            type: 'info',
            title: widget.pinned ? 'Widget Pinned' : 'Widget Unpinned',
            message: `${widget.title} ${widget.pinned ? 'will remain' : 'can be removed'} when switching presets`,
            duration: 3000
        });
    }

    /**
     * Close widget
     */
    closeWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        const element = document.getElementById(widgetId);
        
        // Confirm if widget has unsaved changes
        if (this.hasUnsavedChanges(widgetId)) {
            if (!confirm('This widget has unsaved changes. Are you sure you want to close it?')) {
                return;
            }
        }
        
        // Animate removal
        element.style.transform += ' scale(0)';
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.remove();
            this.widgets.delete(widgetId);
            
            // Emit destruction event
            document.dispatchEvent(new CustomEvent('widget:destroyed', {
                detail: { widgetId }
            }));
            
            // If this was the selected widget, clear selection
            if (this.selectedWidget === widgetId) {
                this.selectedWidget = null;
            }
        }, 200);
        
        // Announce removal
        AICanvas.announceToScreenReader(`${widget.title} widget closed`);
    }

    /**
     * Check if widget has unsaved changes
     */
    hasUnsavedChanges(widgetId) {
        const widget = this.widgets.get(widgetId);
        // Implementation would check for unsaved state
        return false;
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
        const element = document.getElementById(widgetId);
        if (element) {
            element.classList.add('selected');
            element.focus();
        }
    }

    /**
     * Handle canvas click (deselect widgets)
     */
    handleCanvasClick(event) {
        if (event.target.id === 'canvas-workspace' || 
            event.target.classList.contains('canvas-grid')) {
            this.selectWidget(null);
        }
    }

    /**
     * Handle canvas keyboard navigation
     */
    handleCanvasKeyDown(event) {
        if (event.key === 'Escape') {
            this.selectWidget(null);
        }
    }

    /**
     * Handle widget click
     */
    handleWidgetClick(widgetId, event) {
        event.stopPropagation();
        this.selectWidget(widgetId);
    }

    /**
     * Handle widget keyboard events
     */
    handleWidgetKeyDown(widgetId, event) {
        if (event.key === 'Delete' && event.target.classList.contains('widget')) {
            this.closeWidget(widgetId);
        }
    }

    /**
     * Position widget on canvas
     */
    positionWidget(element, position, size) {
        element.style.transform = `translate(${position.x}px, ${position.y}px)`;
        element.style.width = size.width + 'px';
        element.style.height = size.height + 'px';
    }

    /**
     * Get default position for new widgets
     */
    getDefaultPosition() {
        const offset = this.widgets.size * 30;
        return {
            x: 50 + offset,
            y: 100 + offset
        };
    }

    /**
     * Update widget configuration
     */
    updateWidgetConfig(widgetId, config) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            Object.assign(widget.config, config);
        }
    }

    /**
     * Adjust widgets to viewport after layout changes
     */
    adjustWidgetsToViewport() {
        const canvas = document.getElementById('canvas-workspace');
        const canvasRect = canvas.getBoundingClientRect();
        
        this.widgets.forEach((widget, widgetId) => {
            const element = document.getElementById(widgetId);
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            
            // Check if widget is outside viewport
            if (rect.right > canvasRect.right || rect.bottom > canvasRect.bottom) {
                const newX = Math.max(0, Math.min(widget.position.x, 
                    canvasRect.width - widget.size.width));
                const newY = Math.max(0, Math.min(widget.position.y, 
                    canvasRect.height - widget.size.height));
                
                widget.position = { x: newX, y: newY };
                this.positionWidget(element, widget.position, widget.size);
            }
        });
    }

    /**
     * Clear all unpinned widgets
     */
    clearUnpinnedWidgets() {
        const toRemove = [];
        
        this.widgets.forEach((widget, widgetId) => {
            if (!widget.pinned) {
                toRemove.push(widgetId);
            }
        });
        
        toRemove.forEach(widgetId => {
            this.closeWidget(widgetId);
        });
    }

    /**
     * Clear all widgets
     */
    clearAllWidgets() {
        const toRemove = Array.from(this.widgets.keys());
        toRemove.forEach(widgetId => {
            this.closeWidget(widgetId);
        });
    }

    /**
     * Get serializable state for saving/export
     */
    getSerializableState() {
        const state = [];
        
        this.widgets.forEach(widget => {
            state.push({
                id: widget.id,
                type: widget.type,
                title: widget.title,
                position: widget.position,
                size: widget.size,
                config: widget.config,
                pinned: widget.pinned,
                created: widget.created
            });
        });
        
        return state;
    }

    /**
     * Create widget from saved data
     */
    createWidgetFromData(data) {
        return this.createWidget({
            type: data.type,
            title: data.title,
            position: data.position,
            size: data.size,
            config: data.config
        });
    }

    /**
     * Handle agent response
     */
    handleAgentResponse(responseData) {
        const { widgetId, response } = responseData;
        const widget = this.widgets.get(widgetId);
        
        if (!widget || widget.type !== 'multi-agent-chat') return;
        
        const element = document.getElementById(widgetId);
        const messagesContainer = element.querySelector('.chat-messages');
        
        // Remove any typing indicators
        const typingIndicator = messagesContainer.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        
        // Add response message
        this.addChatMessage(messagesContainer, {
            type: 'assistant',
            content: response.content,
            sources: response.sources,
            agents: response.agents,
            timestamp: new Date()
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Static methods for global access
    static handleFileDrop(event, widgetId) {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        WidgetManager.instance.processUploadedFiles(widgetId, files);
    }

    static startWorkflow(widgetId) {
        WidgetManager.instance.startWorkflow(widgetId);
    }

    static configureWorkflow(widgetId) {
        WidgetManager.instance.configureWorkflow(widgetId);
    }

    /**
     * Process uploaded files for document widget
     */
    processUploadedFiles(widgetId, files) {
        const widget = this.widgets.get(widgetId);
        if (!widget || widget.type !== 'document-processor') return;
        
        const element = document.getElementById(widgetId);
        const statusElement = element.querySelector('.processing-status p');
        
        statusElement.textContent = `Processing ${files.length} file(s)...`;
        
        // Simulate file processing
        files.forEach((file, index) => {
            setTimeout(() => {
                console.log('Processing file:', file.name);
                // In real implementation, would send to agent orchestrator
                
                if (index === files.length - 1) {
                    statusElement.textContent = `Processed ${files.length} file(s) successfully`;
                }
            }, (index + 1) * 1000);
        });
    }

    /**
     * Start workflow execution
     */
    startWorkflow(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget || widget.type !== 'workflow-orchestrator') return;
        
        const element = document.getElementById(widgetId);
        const steps = element.querySelectorAll('.workflow-step');
        
        // Simulate workflow execution
        steps.forEach((step, index) => {
            setTimeout(() => {
                step.classList.add('active');
                const status = step.querySelector('.step-status');
                status.textContent = 'In Progress';
                
                setTimeout(() => {
                    step.classList.remove('active');
                    step.classList.add('completed');
                    status.textContent = 'Completed';
                }, 2000);
            }, index * 3000);
        });
    }

    /**
     * Configure workflow
     */
    configureWorkflow(widgetId) {
        console.log('Configure workflow:', widgetId);
        // Implementation for workflow configuration
    }
}

// Create global instance
window.WidgetManager = new WidgetManager();
