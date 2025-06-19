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

    // Continue with remaining methods...
