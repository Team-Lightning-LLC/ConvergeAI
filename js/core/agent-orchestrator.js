/**
 * Agent Orchestrator
 * Manages AI agent communications and intelligent routing
 */

class AgentOrchestrator {
    constructor() {
        this.agents = new Map();
        this.routingEngine = null;
        this.activeQueries = new Map();
        this.queryHistory = [];
        this.performanceMetrics = new Map();
        
        // Configuration
        this.config = {
            maxConcurrentQueries: 10,
            defaultTimeout: 30000,
            retryAttempts: 3,
            enableSmartRouting: true,
            enableCaching: true
        };
        
        // Response cache
        this.responseCache = new Map();
        this.cacheExpiry = 300000; // 5 minutes
    }

    /**
     * Initialize Agent Orchestrator
     */
    async initialize(agentMap) {
        try {
            this.agents = agentMap;
            
            // Initialize routing engine
            this.routingEngine = new SmartRoutingEngine();
            await this.routingEngine.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize performance tracking
            this.initializePerformanceTracking();
            
            console.log('Agent Orchestrator initialized with', this.agents.size, 'agents');
            
        } catch (error) {
            console.error('Failed to initialize Agent Orchestrator:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for agent status changes
        document.addEventListener('agent:status-changed', (event) => {
            this.handleAgentStatusChange(event.detail);
        });
        
        // Listen for widget queries
        document.addEventListener('widget:agent-query', (event) => {
            this.processQuery(event.detail);
        });
    }

    /**
     * Initialize performance tracking
     */
    initializePerformanceTracking() {
        this.agents.forEach((agent, agentId) => {
            this.performanceMetrics.set(agentId, {
                totalQueries: 0,
                successfulQueries: 0,
                averageResponseTime: 0,
                errorRate: 0,
                lastResponseTime: 0,
                uptime: 100,
                reliability: 100
            });
        });
    }

    /**
     * Process a query through the orchestration system
     */
    async processQuery(queryData) {
        const queryId = this.generateQueryId();
        const startTime = performance.now();
        
        try {
            // Validate query
            if (!this.validateQuery(queryData)) {
                throw new Error('Invalid query format');
            }
            
            // Check cache if enabled
            if (this.config.enableCaching) {
                const cachedResponse = this.getCachedResponse(queryData);
                if (cachedResponse) {
                    this.deliverResponse(queryData.widgetId, cachedResponse);
                    return;
                }
            }
            
            // Register active query
            this.activeQueries.set(queryId, {
                ...queryData,
                startTime,
                status: 'processing'
            });
            
            // Route query to appropriate agents
            const routingPlan = await this.createRoutingPlan(queryData);
            
            // Execute query plan
            const response = await this.executeQueryPlan(queryId, routingPlan);
            
            // Cache response if appropriate
            if (this.config.enableCaching && this.shouldCacheResponse(response)) {
                this.cacheResponse(queryData, response);
            }
            
            // Deliver response
            this.deliverResponse(queryData.widgetId, response);
            
            // Update performance metrics
            this.updatePerformanceMetrics(routingPlan.agents, startTime, true);
            
            // Log query for analysis
            this.logQuery(queryId, queryData, response, performance.now() - startTime);
            
        } catch (error) {
            console.error('Query processing failed:', error);
            
            // Update performance metrics for failure
            this.updatePerformanceMetrics(queryData.agents || [], startTime, false);
            
            // Deliver error response
            this.deliverErrorResponse(queryData.widgetId, error);
            
        } finally {
            // Clean up active query
            this.activeQueries.delete(queryId);
        }
    }

    /**
     * Validate query data
     */
    validateQuery(queryData) {
        const required = ['message', 'widgetId'];
        return required.every(field => queryData.hasOwnProperty(field)) &&
               queryData.message.trim().length > 0;
    }

    /**
     * Create routing plan for query
     */
    async createRoutingPlan(queryData) {
        if (!this.config.enableSmartRouting || !queryData.agents || queryData.agents.length === 0) {
            // Use smart routing to determine best agents
            const recommendedAgents = await this.routingEngine.recommendAgents(queryData.message);
            return {
                strategy: 'smart',
                agents: recommendedAgents,
                parallel: true,
                timeout: this.config.defaultTimeout
            };
        }
        
        // Use specified agents
        const availableAgents = queryData.agents.filter(agentId => {
            const agent = this.agents.get(agentId);
            return agent && agent.status === 'online';
        });
        
        if (availableAgents.length === 0) {
            throw new Error('No available agents for this query');
        }
        
        return {
            strategy: 'specified',
            agents: availableAgents,
            parallel: availableAgents.length > 1,
            timeout: this.config.defaultTimeout
        };
    }

    /**
     * Execute query plan
     */
    async executeQueryPlan(queryId, plan) {
        const activeQuery = this.activeQueries.get(queryId);
        
        if (plan.parallel && plan.agents.length > 1) {
            // Execute queries in parallel
            return await this.executeParallelQueries(activeQuery, plan);
        } else {
            // Execute single query
            return await this.executeSingleQuery(activeQuery, plan.agents[0]);
        }
    }

    /**
     * Execute parallel queries to multiple agents
     */
    async executeParallelQueries(queryData, plan) {
        const promises = plan.agents.map(agentId => 
            this.executeSingleQuery(queryData, agentId)
                .catch(error => ({ agentId, error }))
        );
        
        try {
            const results = await Promise.allSettled(promises);
            
            // Process results
            const successfulResults = [];
            const errors = [];
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && !result.value.error) {
                    successfulResults.push({
                        agentId: plan.agents[index],
                        ...result.value
                    });
                } else {
                    errors.push({
                        agentId: plan.agents[index],
                        error: result.value?.error || result.reason
                    });
                }
            });
            
            if (successfulResults.length === 0) {
                throw new Error('All agents failed to respond');
            }
            
            // Synthesize responses
            return this.synthesizeResponses(successfulResults, queryData);
          } catch (error) {
           console.error('Parallel query execution failed:', error);
           throw error;
       }
   }

   /**
    * Execute single query to one agent
    */
   async executeSingleQuery(queryData, agentId) {
       const agent = this.agents.get(agentId);
       if (!agent) {
           throw new Error(`Agent ${agentId} not found`);
       }
       
       if (agent.status !== 'online') {
           throw new Error(`Agent ${agentId} is not available`);
       }
       
       const startTime = performance.now();
       
       try {
           // Simulate agent API call
           const response = await this.callAgent(agent, queryData.message, queryData.context);
           
           const endTime = performance.now();
           const responseTime = endTime - startTime;
           
           // Update agent metrics
           this.updateAgentMetrics(agentId, responseTime, true);
           
           return {
               content: response.content,
               sources: response.sources || [],
               confidence: response.confidence || 0.8,
               responseTime
           };
           
       } catch (error) {
           const endTime = performance.now();
           const responseTime = endTime - startTime;
           
           // Update agent metrics for failure
           this.updateAgentMetrics(agentId, responseTime, false);
           
           throw error;
       }
   }

   /**
    * Call agent API (simulated)
    */
   async callAgent(agent, message, context = {}) {
       // Simulate network delay
       await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
       
       // Simulate different agent responses based on type
       switch (agent.type) {
           case 'hr':
               return this.simulateHRResponse(message, agent);
           case 'knowledge':
               return this.simulateKnowledgeResponse(message, agent);
           case 'finance':
               return this.simulateFinanceResponse(message, agent);
           default:
               return this.simulateGenericResponse(message, agent);
       }
   }

   /**
    * Simulate HR agent response
    */
   simulateHRResponse(message, agent) {
       const responses = {
           vacation: {
               content: "You have 12 vacation days remaining this year. Your next scheduled PTO is March 15-17 (3 days). Would you like me to help you submit a new vacation request?",
               sources: [
                   { name: "Workday", description: "Employee vacation balance from Workday system" },
                   { name: "PTO Policy", description: "Company paid time off policy document" }
               ],
               confidence: 0.95
           },
           benefits: {
               content: "Your current benefits include Health Insurance (PPO plan), 401(k) with 6% company match, and $50,000 life insurance. Open enrollment is November 1-15. Need help with any specific benefit questions?",
               sources: [
                   { name: "Benefits Portal", description: "Employee benefits information system" },
                   { name: "HR Guidelines", description: "Benefits enrollment guidelines" }
               ],
               confidence: 0.92
           },
           policy: {
               content: "Our remote work policy allows up to 3 days per week remote with manager approval. Core hours are 10 AM - 3 PM ET. Equipment allowance includes laptop and $500 for home office setup.",
               sources: [
                   { name: "Employee Handbook", description: "Remote work policy section 4.2" },
                   { name: "IT Policy", description: "Equipment and security guidelines" }
               ],
               confidence: 0.88
           }
       };
       
       // Simple keyword matching for demo
       const lowerMessage = message.toLowerCase();
       if (lowerMessage.includes('vacation') || lowerMessage.includes('pto') || lowerMessage.includes('time off')) {
           return responses.vacation;
       } else if (lowerMessage.includes('benefit') || lowerMessage.includes('insurance') || lowerMessage.includes('401k')) {
           return responses.benefits;
       } else if (lowerMessage.includes('remote') || lowerMessage.includes('policy') || lowerMessage.includes('work from home')) {
           return responses.policy;
       }
       
       return {
           content: "I can help with HR-related questions about vacation time, benefits, policies, and procedures. What specific information do you need?",
           sources: [{ name: agent.name, description: "HR assistance system" }],
           confidence: 0.7
       };
   }

   /**
    * Simulate knowledge/policy agent response
    */
   simulateKnowledgeResponse(message, agent) {
       const responses = {
           expense: {
               content: "Expense reimbursement policy: Meals up to $75/day with receipts required for amounts over $25. Alcohol not reimbursable. Submit through Concur within 30 days.",
               sources: [
                   { name: "Finance Policy 3.1", description: "Employee expense reimbursement guidelines" },
                   { name: "Concur Guide", description: "Expense submission process documentation" }
               ],
               confidence: 0.94
           },
           security: {
               content: "Security policy requires: Two-factor authentication for all systems, password rotation every 90 days, VPN for remote access, and immediate reporting of suspected security incidents.",
               sources: [
                   { name: "IT Security Policy", description: "Corporate information security standards" },
                   { name: "Compliance Manual", description: "Security compliance requirements" }
               ],
               confidence: 0.91
           },
           compliance: {
               content: "All employees must complete annual compliance training by December 31st. This includes ethics, anti-harassment, and data privacy modules. Certificates are tracked in the learning management system.",
               sources: [
                   { name: "Compliance Framework", description: "Annual training requirements" },
                   { name: "Training Records", description: "Employee completion tracking system" }
               ],
               confidence: 0.89
           }
       };
       
       const lowerMessage = message.toLowerCase();
       if (lowerMessage.includes('expense') || lowerMessage.includes('reimburse') || lowerMessage.includes('receipt')) {
           return responses.expense;
       } else if (lowerMessage.includes('security') || lowerMessage.includes('password') || lowerMessage.includes('vpn')) {
           return responses.security;
       } else if (lowerMessage.includes('compliance') || lowerMessage.includes('training') || lowerMessage.includes('ethics')) {
           return responses.compliance;
       }
       
       return {
           content: "I can help you find information about company policies, procedures, and compliance requirements. What specific topic are you looking for?",
           sources: [{ name: agent.name, description: "Knowledge base system" }],
           confidence: 0.7
       };
   }

   /**
    * Simulate finance agent response
    */
   simulateFinanceResponse(message, agent) {
       return {
           content: "Your department budget shows 73% utilization ($127k of $175k allocated). Q2 forecast is on track. Major categories: Software licenses (45%), Contractors (28%), Travel (15%). Need specific budget details?",
           sources: [
               { name: "SAP Financial System", description: "Department budget and expense tracking" },
               { name: "Q2 Forecast", description: "Budget projection and variance analysis" }
           ],
           confidence: 0.87
       };
   }

   /**
    * Simulate generic agent response
    */
   simulateGenericResponse(message, agent) {
       return {
           content: `I've processed your query: "${message}". I can provide general assistance, but you might get better results from a specialized agent for your specific domain.`,
           sources: [{ name: agent.name, description: "General purpose AI assistant" }],
           confidence: 0.6
       };
   }

   /**
    * Synthesize multiple agent responses
    */
   synthesizeResponses(results, queryData) {
       if (results.length === 1) {
           return {
               content: results[0].content,
               sources: results[0].sources,
               agents: [results[0].agentId],
               confidence: results[0].confidence,
               synthesized: false
           };
       }
       
       // Combine responses with clear attribution
       const content = results.map(result => {
           const agentName = this.agents.get(result.agentId)?.name || result.agentId;
           return `**${agentName}:** ${result.content}`;
       }).join('\n\n');
       
       // Combine all sources
       const allSources = results.reduce((acc, result) => {
           return acc.concat(result.sources || []);
       }, []);
       
       // Remove duplicate sources
       const uniqueSources = allSources.filter((source, index, arr) => 
           index === arr.findIndex(s => s.name === source.name)
       );
       
       // Calculate average confidence
       const avgConfidence = results.reduce((sum, result) => 
           sum + (result.confidence || 0), 0) / results.length;
       
       return {
           content,
           sources: uniqueSources,
           agents: results.map(r => r.agentId),
           confidence: avgConfidence,
           synthesized: true
       };
   }

   /**
    * Update agent performance metrics
    */
   updateAgentMetrics(agentId, responseTime, success) {
       const metrics = this.performanceMetrics.get(agentId);
       if (!metrics) return;
       
       metrics.totalQueries++;
       metrics.lastResponseTime = responseTime;
       
       if (success) {
           metrics.successfulQueries++;
           
           // Update average response time (exponential moving average)
           metrics.averageResponseTime = metrics.averageResponseTime === 0 
               ? responseTime 
               : (metrics.averageResponseTime * 0.8) + (responseTime * 0.2);
       }
       
       // Update error rate
       metrics.errorRate = ((metrics.totalQueries - metrics.successfulQueries) / metrics.totalQueries) * 100;
       
       // Update reliability score (inverse of error rate with response time factor)
       const responseTimeFactor = Math.max(0, 100 - (responseTime / 50)); // Penalize slow responses
       metrics.reliability = Math.max(0, (100 - metrics.errorRate) * (responseTimeFactor / 100));
   }

   /**
    * Update overall performance metrics
    */
   updatePerformanceMetrics(agentIds, startTime, success) {
       const endTime = performance.now();
       const totalTime = endTime - startTime;
       
       agentIds.forEach(agentId => {
           this.updateAgentMetrics(agentId, totalTime, success);
       });
   }

   /**
    * Deliver successful response to widget
    */
   deliverResponse(widgetId, response) {
       document.dispatchEvent(new CustomEvent('agent:response-ready', {
           detail: {
               widgetId,
               response,
               timestamp: new Date().toISOString()
           }
       }));
   }

   /**
    * Deliver error response to widget
    */
   deliverErrorResponse(widgetId, error) {
       document.dispatchEvent(new CustomEvent('agent:response-ready', {
           detail: {
               widgetId,
               response: {
                   content: `I encountered an error processing your request: ${error.message}. Please try again or contact support if the issue persists.`,
                   sources: [],
                   agents: [],
                   error: true
               },
               timestamp: new Date().toISOString()
           }
       }));
   }

   /**
    * Handle agent status changes
    */
   handleAgentStatusChange(statusData) {
       const { agentId, status, metrics } = statusData;
       const agent = this.agents.get(agentId);
       
       if (!agent) return;
       
       // Update agent status
       agent.status = status;
       
       // Update performance metrics if provided
       if (metrics) {
           const perfMetrics = this.performanceMetrics.get(agentId);
           if (perfMetrics) {
               Object.assign(perfMetrics, metrics);
           }
       }
       
       // If agent went offline, handle pending queries
       if (status === 'offline' || status === 'error') {
           this.handleAgentOffline(agentId);
       }
   }

   /**
    * Handle agent going offline
    */
   handleAgentOffline(agentId) {
       // Find queries that depend on this agent
       const affectedQueries = [];
       
       this.activeQueries.forEach((query, queryId) => {
           if (query.agents && query.agents.includes(agentId)) {
               affectedQueries.push(queryId);
           }
       });
       
       // Attempt to reroute affected queries
       affectedQueries.forEach(queryId => {
           this.rerouteQuery(queryId, agentId);
       });
   }

   /**
    * Reroute query when agent becomes unavailable
    */
   async rerouteQuery(queryId, failedAgentId) {
       const query = this.activeQueries.get(queryId);
       if (!query) return;
       
       try {
           // Remove failed agent from list
           const remainingAgents = query.agents.filter(id => id !== failedAgentId);
           
           if (remainingAgents.length > 0) {
               // Continue with remaining agents
               query.agents = remainingAgents;
           } else {
               // Find alternative agents
               const alternatives = await this.routingEngine.findAlternativeAgents(
                   query.message, 
                   [failedAgentId]
               );
               
               if (alternatives.length > 0) {
                   query.agents = alternatives;
               } else {
                   throw new Error('No alternative agents available');
               }
           }
           
       } catch (error) {
           // Deliver error response if rerouting fails
           this.deliverErrorResponse(query.widgetId, error);
           this.activeQueries.delete(queryId);
       }
   }

   /**
    * Cache response for future queries
    */
   cacheResponse(queryData, response) {
       const cacheKey = this.generateCacheKey(queryData);
       this.responseCache.set(cacheKey, {
           response,
           timestamp: Date.now(),
           queryData
       });
       
       // Clean up expired cache entries
       this.cleanExpiredCache();
   }

   /**
    * Get cached response if available and valid
    */
   getCachedResponse(queryData) {
       const cacheKey = this.generateCacheKey(queryData);
       const cached = this.responseCache.get(cacheKey);
       
       if (!cached) return null;
       
       // Check if cache entry has expired
       if (Date.now() - cached.timestamp > this.cacheExpiry) {
           this.responseCache.delete(cacheKey);
           return null;
       }
       
       return cached.response;
   }

   /**
    * Generate cache key for query
    */
   generateCacheKey(queryData) {
       const normalizedMessage = queryData.message.toLowerCase().trim();
       const sortedAgents = (queryData.agents || []).sort().join(',');
       return `${normalizedMessage}|${sortedAgents}`;
   }

   /**
    * Check if response should be cached
    */
   shouldCacheResponse(response) {
       // Don't cache error responses or low-confidence responses
       return !response.error && response.confidence > 0.7;
   }

   /**
    * Clean expired cache entries
    */
   cleanExpiredCache() {
       const now = Date.now();
       
       this.responseCache.forEach((cached, key) => {
           if (now - cached.timestamp > this.cacheExpiry) {
               this.responseCache.delete(key);
           }
       });
   }

   /**
    * Log query for analysis and improvement
    */
   logQuery(queryId, queryData, response, duration) {
       const logEntry = {
           queryId,
           timestamp: new Date().toISOString(),
           message: queryData.message,
           agents: queryData.agents || [],
           responseAgents: response.agents || [],
           duration,
           success: !response.error,
           confidence: response.confidence || 0,
           synthesized: response.synthesized || false,
           cached: false // Would be set if response was from cache
       };
       
       this.queryHistory.push(logEntry);
       
       // Keep only last 1000 queries
       if (this.queryHistory.length > 1000) {
           this.queryHistory.shift();
       }
   }

   /**
    * Generate unique query ID
    */
   generateQueryId() {
       return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   }

   /**
    * Get performance statistics
    */
   getPerformanceStats() {
       const stats = {
           totalQueries: this.queryHistory.length,
           averageResponseTime: 0,
           successRate: 0,
           agentStats: {},
           cacheStats: {
               size: this.responseCache.size,
               hitRate: 0 // Would be calculated from actual usage
           }
       };
       
       // Calculate overall statistics
       if (this.queryHistory.length > 0) {
           const successful = this.queryHistory.filter(q => q.success);
           stats.successRate = (successful.length / this.queryHistory.length) * 100;
           stats.averageResponseTime = this.queryHistory.reduce((sum, q) => sum + q.duration, 0) / this.queryHistory.length;
       }
       
       // Calculate per-agent statistics
       this.performanceMetrics.forEach((metrics, agentId) => {
           const agent = this.agents.get(agentId);
           stats.agentStats[agentId] = {
               name: agent?.name || agentId,
               ...metrics
           };
       });
       
       return stats;
   }

   /**
    * Get serializable state for saving
    */
   getSerializableState() {
       return {
           config: this.config,
           performanceMetrics: Array.from(this.performanceMetrics.entries()),
           queryHistory: this.queryHistory.slice(-100), // Last 100 queries
           cacheSize: this.responseCache.size
       };
   }

   /**
    * Update agent configurations
    */
   updateConfigurations(agentConfigs) {
       agentConfigs.forEach(config => {
           const agent = this.agents.get(config.id);
           if (agent) {
               Object.assign(agent, config);
           }
       });
   }
}

/**
* Smart Routing Engine
* Determines the best agents for a given query
*/
class SmartRoutingEngine {
   constructor() {
       this.patterns = new Map();
       this.agentCapabilities = new Map();
   }

   /**
    * Initialize routing engine
    */
   async initialize() {
       // Load routing patterns and agent capabilities
       await this.loadRoutingPatterns();
       await this.loadAgentCapabilities();
   }

   /**
    * Load routing patterns for intent classification
    */
   async loadRoutingPatterns() {
       // Simple keyword-based patterns for demo
       // In production, this would use NLP models
       this.patterns.set('hr', [
           'vacation', 'pto', 'time off', 'benefits', 'insurance', '401k',
           'payroll', 'salary', 'leave', 'holiday', 'sick day'
       ]);
       
       this.patterns.set('policy', [
           'policy', 'procedure', 'guideline', 'rule', 'compliance',
           'security', 'expense', 'reimbursement', 'training'
       ]);
       
       this.patterns.set('finance', [
           'budget', 'cost', 'expense', 'financial', 'invoice',
           'payment', 'accounting', 'revenue', 'forecast'
       ]);
       
       this.patterns.set('knowledge', [
           'how to', 'what is', 'where can i', 'documentation',
           'manual', 'guide', 'help', 'information'
       ]);
   }

   /**
    * Load agent capabilities mapping
    */
   async loadAgentCapabilities() {
       // Map agent types to their capabilities
       this.agentCapabilities.set('workday', ['hr', 'vacation', 'payroll', 'benefits']);
       this.agentCapabilities.set('policy', ['policy', 'compliance', 'procedures']);
       this.agentCapabilities.set('healthcare', ['benefits', 'insurance', 'wellness']);
       this.agentCapabilities.set('finance', ['budget', 'expenses', 'financial']);
   }

   /**
    * Recommend agents for a given message
    */
   async recommendAgents(message, excludeAgents = []) {
       const lowerMessage = message.toLowerCase();
       const scores = new Map();
       
       // Score agents based on keyword matching
       this.patterns.forEach((keywords, category) => {
           const matchCount = keywords.filter(keyword => 
               lowerMessage.includes(keyword)
           ).length;
           
           if (matchCount > 0) {
               // Find agents that handle this category
               this.agentCapabilities.forEach((capabilities, agentId) => {
                   if (capabilities.includes(category) && !excludeAgents.includes(agentId)) {
                       const currentScore = scores.get(agentId) || 0;
                       scores.set(agentId, currentScore + matchCount);
                   }
               });
           }
       });
       
       // Sort by score and return top agents
       const sortedAgents = Array.from(scores.entries())
           .sort((a, b) => b[1] - a[1])
           .map(entry => entry[0])
           .slice(0, 3); // Top 3 agents
       
       // If no specific matches, return general-purpose agents
       if (sortedAgents.length === 0) {
           return ['workday', 'policy'].filter(id => !excludeAgents.includes(id));
       }
       
       return sortedAgents;
   }

   /**
    * Find alternative agents when primary agent fails
    */
   async findAlternativeAgents(message, excludeAgents = []) {
       return await this.recommendAgents(message, excludeAgents);
   }
}

// Create global instance
window.AgentOrchestrator = new AgentOrchestrator();
