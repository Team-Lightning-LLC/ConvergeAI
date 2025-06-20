/**
 * Notification Manager
 * Handles system notifications and user feedback
 */

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.notificationCounter = 0;
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
    }

    /**
     * Initialize notification system
     */
    initialize() {
        this.createContainer();
        this.setupEventListeners();
        console.log('Notification Manager initialized');
    }

    /**
     * Create notification container
     */
    createContainer() {
        this.container = document.getElementById('notification-area');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-area';
            this.container.className = 'notification-container';
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-label', 'System notifications');
            document.body.appendChild(this.container);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for system events that should trigger notifications
        document.addEventListener('agent:status-changed', (event) => {
            const { agentId, status } = event.detail;
            if (status === 'offline' || status === 'error') {
                this.show({
                    type: 'warning',
                    title: 'Agent Status',
                    message: `${agentId} agent is now ${status}`,
                    duration: 8000
                });
            }
        });

        document.addEventListener('widget:created', (event) => {
            const { widget } = event.detail;
            this.show({
                type: 'success',
                title: 'Widget Created',
                message: `${widget.title} widget has been added to your workspace`,
                duration: 3000
            });
        });

        document.addEventListener('error', (event) => {
            this.show({
                type: 'error',
                title: 'Application Error',
                message: 'An unexpected error occurred. Please refresh if issues persist.',
                duration: 10000
            });
        });
    }

    /**
     * Show a notification
     */
    show(options) {
        const notification = this.createNotification(options);
        this.addNotification(notification);
        return notification.id;
    }

    /**
     * Create notification element
     */
    createNotification(options) {
        const id = `notification_${++this.notificationCounter}`;
        const type = options.type || 'info';
        const title = options.title || '';
        const message = options.message || '';
        const duration = options.duration || this.defaultDuration;
        const actions = options.actions || [];

        const notification = {
            id,
            type,
            title,
            message,
            duration,
            actions,
            element: null,
            timer: null,
            created: Date.now()
        };

        // Create DOM element
        const element = document.createElement('div');
        element.className = `notification notification-${type}`;
        element.id = id;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        // Create icon based on type
        const iconMap = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const icon = iconMap[type] || iconMap.info;

        // Build notification content
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon" aria-hidden="true">${icon}</div>
                <div class="notification-body">
                    ${title ? `<div class="notification-title">${this.escapeHtml(title)}</div>` : ''}
                    <div class="notification-message">${this.escapeHtml(message)}</div>
                    ${actions.length > 0 ? this.createActionsHtml(actions) : ''}
                </div>
                <button class="notification-close" aria-label="Close notification">×</button>
            </div>
            ${duration > 0 ? `<div class="notification-progress" role="progressbar" aria-label="Auto-close timer"></div>` : ''}
        `;

        notification.element = element;

        // Set up event handlers
        this.setupNotificationHandlers(notification);

        return notification;
    }

    /**
     * Create actions HTML
     */
    createActionsHtml(actions) {
        const actionsHtml = actions.map(action => 
            `<button class="notification-action" data-action="${action.id}">
                ${this.escapeHtml(action.text)}
            </button>`
        ).join('');

        return `<div class="notification-actions">${actionsHtml}</div>`;
    }

    /**
     * Set up notification event handlers
     */
    setupNotificationHandlers(notification) {
        const element = notification.element;

        // Close button
        const closeBtn = element.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.dismiss(notification.id);
        });

        // Action buttons
        const actionBtns = element.querySelectorAll('.notification-action');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionId = e.target.dataset.action;
                const action = notification.actions.find(a => a.id === actionId);
                if (action && action.handler) {
                    action.handler();
                }
                if (action && action.dismiss !== false) {
                    this.dismiss(notification.id);
                }
            });
        });

        // Auto-dismiss timer
        if (notification.duration > 0) {
            this.startDismissTimer(notification);
        }

        // Pause timer on hover
        element.addEventListener('mouseenter', () => {
            this.pauseTimer(notification);
        });

        element.addEventListener('mouseleave', () => {
            this.resumeTimer(notification);
        });

        // Keyboard accessibility
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.dismiss(notification.id);
            }
        });
    }

    /**
     * Add notification to container
     */
    addNotification(notification) {
        // Remove oldest notification if at limit
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = Array.from(this.notifications.keys())[0];
            this.dismiss(oldestId);
        }

        // Add to collection
        this.notifications.set(notification.id, notification);

        // Add to DOM with animation
        this.container.appendChild(notification.element);
        
        // Trigger entrance animation
        requestAnimationFrame(() => {
            notification.element.classList.add('notification-enter');
        });

        // Focus management for important notifications
        if (notification.type === 'error') {
            notification.element.focus();
        }
    }

    /**
     * Start dismiss timer
     */
    startDismissTimer(notification) {
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        const progressBar = notification.element.querySelector('.notification-progress');
        if (progressBar) {
            progressBar.style.animationDuration = `${notification.duration}ms`;
            progressBar.classList.add('notification-progress-active');
        }

        notification.timer = setTimeout(() => {
            this.dismiss(notification.id);
        }, notification.duration);

        notification.timerStarted = Date.now();
    }

    /**
     * Pause dismiss timer
     */
    pauseTimer(notification) {
        if (notification.timer) {
            clearTimeout(notification.timer);
            notification.remainingTime = notification.duration - (Date.now() - notification.timerStarted);
            
            const progressBar = notification.element.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        }
    }

    /**
     * Resume dismiss timer
     */
    resumeTimer(notification) {
        if (notification.remainingTime > 0) {
            const progressBar = notification.element.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }

            notification.timer = setTimeout(() => {
                this.dismiss(notification.id);
            }, notification.remainingTime);

            notification.timerStarted = Date.now();
        }
    }

    /**
     * Dismiss notification
     */
    dismiss(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Animation
        notification.element.classList.add('notification-exit');

        // Remove after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(notificationId);
        }, 300);

        // Announce dismissal to screen reader
        AICanvas.announceToScreenReader('Notification dismissed');
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        const notificationIds = Array.from(this.notifications.keys());
        notificationIds.forEach(id => this.dismiss(id));
    }

    /**
     * Update existing notification
     */
    update(notificationId, options) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        // Update properties
        Object.assign(notification, options);

        // Update DOM
        const titleElement = notification.element.querySelector('.notification-title');
        const messageElement = notification.element.querySelector('.notification-message');

        if (titleElement && options.title) {
            titleElement.textContent = options.title;
        }

        if (messageElement && options.message) {
            messageElement.textContent = options.message;
        }

        // Update type class
        if (options.type && options.type !== notification.type) {
            notification.element.className = notification.element.className.replace(
                /notification-\w+/,
                `notification-${options.type}`
            );
        }

        // Restart timer if duration changed
        if (options.duration !== undefined) {
            if (notification.timer) {
                clearTimeout(notification.timer);
            }
            if (options.duration > 0) {
                this.startDismissTimer(notification);
            }
        }
    }

    /**
     * Get notification by ID
     */
    get(notificationId) {
        return this.notifications.get(notificationId);
    }

    /**
     * Get all active notifications
     */
    getAll() {
        return Array.from(this.notifications.values());
    }

    /**
     * Check if notification exists
     */
    exists(notificationId) {
        return this.notifications.has(notificationId);
    }

    /**
     * Show success notification (convenience method)
     */
    success(message, title = 'Success', duration = 3000) {
        return this.show({
            type: 'success',
            title,
            message,
            duration
        });
    }

    /**
     * Show error notification (convenience method)
     */
    error(message, title = 'Error', duration = 8000) {
        return this.show({
            type: 'error',
            title,
            message,
            duration
        });
    }

    /**
     * Show warning notification (convenience method)
     */
    warning(message, title = 'Warning', duration = 5000) {
        return this.show({
            type: 'warning',
            title,
            message,
            duration
        });
    }

    /**
     * Show info notification (convenience method)
     */
    info(message, title = 'Information', duration = 4000) {
        return this.show({
            type: 'info',
            title,
            message,
            duration
        });
    }

    /**
     * Show confirmation dialog as notification
     */
    confirm(message, title = 'Confirm', onConfirm = null, onCancel = null) {
        return this.show({
            type: 'warning',
            title,
            message,
            duration: 0, // Don't auto-dismiss
            actions: [
                {
                    id: 'cancel',
                    text: 'Cancel',
                    handler: onCancel
                },
                {
                    id: 'confirm',
                    text: 'Confirm',
                    handler: onConfirm
                }
            ]
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

    /**
     * Get notification statistics
     */
    getStats() {
        return {
            total: this.notificationCounter,
            active: this.notifications.size,
            byType: this.getNotificationsByType()
        };
    }

    /**
     * Get notifications grouped by type
     */
    getNotificationsByType() {
        const byType = { success: 0, error: 0, warning: 0, info: 0 };
        
        this.notifications.forEach(notification => {
            byType[notification.type] = (byType[notification.type] || 0) + 1;
        });
        
        return byType;
    }
}

// Create global instance
window.NotificationManager = new NotificationManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NotificationManager.initialize();
});
