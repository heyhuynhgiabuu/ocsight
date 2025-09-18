export function filterSessions(data, options) {
    let sessions = data.sessions;
    // Filter by date range
    if (options.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.days);
        sessions = sessions.filter((session) => new Date(session.created_at) >= cutoffDate);
    }
    if (options.start) {
        const startDate = new Date(options.start);
        sessions = sessions.filter((session) => new Date(session.created_at) >= startDate);
    }
    if (options.end) {
        const endDate = new Date(options.end);
        sessions = sessions.filter((session) => new Date(session.created_at) <= endDate);
    }
    // Filter by provider
    if (options.provider) {
        sessions = sessions.filter((session) => session.model.provider.toLowerCase() ===
            options.provider.toLowerCase());
    }
    // Filter by project (this would require project detection logic)
    if (options.project) {
        sessions = sessions.filter((session) => session.title.toLowerCase().includes(options.project.toLowerCase()));
    }
    if (options.excludeProject) {
        sessions = sessions.filter((session) => !session.title
            .toLowerCase()
            .includes(options.excludeProject.toLowerCase()));
    }
    return sessions;
}
export function calculateStatistics(sessions) {
    const stats = {
        totalSessions: sessions.length,
        totalMessages: 0,
        totalTools: 0,
        totalCostCents: 0,
        totalTokens: 0,
        sessionsByProvider: {},
        toolUsage: {},
        costsByProvider: {},
        tokensByProvider: {},
        dailyStats: {},
        costOptimization: {
            expensiveSessions: [],
            costSavingSuggestions: [],
            averageCostPerSession: 0,
            averageTokensPerSession: 0,
            mostExpensiveProvider: "",
            mostExpensiveModel: "",
        },
        toolEfficiency: {
            toolSuccessRates: {},
            averageToolDuration: {},
            mostUsedTools: [],
            toolPatterns: {},
        },
        timePatterns: {
            hourlyUsage: {},
            dailyUsage: {},
            weeklyUsage: {},
            peakHours: [],
            peakDays: [],
        },
        projectAnalysis: {
            detectedProjects: [],
            projectPatterns: {},
            crossProjectComparison: {
                mostActiveProject: "",
                mostExpensiveProject: "",
                mostToolIntensiveProject: "",
            },
        },
    };
    sessions.forEach((session) => {
        const provider = session.model.provider;
        // Aggregate totals
        stats.totalMessages += session.messages.length;
        stats.totalCostCents += session.cost_cents || 0;
        stats.totalTokens += session.tokens_used || 0;
        // Provider stats
        stats.sessionsByProvider[provider] =
            (stats.sessionsByProvider[provider] || 0) + 1;
        stats.costsByProvider[provider] =
            (stats.costsByProvider[provider] || 0) + (session.cost_cents || 0);
        stats.tokensByProvider[provider] =
            (stats.tokensByProvider[provider] || 0) + (session.tokens_used || 0);
        // Tool usage
        session.messages.forEach((message) => {
            if (message.tools) {
                message.tools.forEach((tool) => {
                    stats.totalTools++;
                    stats.toolUsage[tool.name] = (stats.toolUsage[tool.name] || 0) + 1;
                });
            }
        });
        // Daily stats
        const date = new Date(session.created_at).toISOString().split("T")[0];
        if (!stats.dailyStats[date]) {
            stats.dailyStats[date] = { sessions: 0, cost: 0, tokens: 0 };
        }
        stats.dailyStats[date].sessions++;
        stats.dailyStats[date].cost += session.cost_cents || 0;
        stats.dailyStats[date].tokens += session.tokens_used || 0;
        // Time patterns
        const sessionDate = new Date(session.created_at);
        const hour = sessionDate.getHours();
        const dayOfWeek = sessionDate.toLocaleDateString("en-US", {
            weekday: "long",
        });
        const weekKey = `${sessionDate.getFullYear()}-W${Math.ceil(sessionDate.getDate() / 7)}`;
        stats.timePatterns.hourlyUsage[hour] =
            (stats.timePatterns.hourlyUsage[hour] || 0) + 1;
        stats.timePatterns.dailyUsage[dayOfWeek] =
            (stats.timePatterns.dailyUsage[dayOfWeek] || 0) + 1;
        stats.timePatterns.weeklyUsage[weekKey] =
            (stats.timePatterns.weeklyUsage[weekKey] || 0) + 1;
    });
    // Calculate cost optimization insights
    calculateCostOptimization(stats, sessions);
    // Calculate tool efficiency metrics
    calculateToolEfficiency(stats, sessions);
    // Calculate time patterns
    calculateTimePatterns(stats);
    // Calculate project analysis
    calculateProjectAnalysis(stats, sessions);
    return stats;
}
function calculateCostOptimization(stats, sessions) {
    const costOpt = stats.costOptimization;
    // Calculate averages
    costOpt.averageCostPerSession = stats.totalCostCents / stats.totalSessions;
    costOpt.averageTokensPerSession = stats.totalTokens / stats.totalSessions;
    // Find expensive sessions (top 10% by cost)
    const sortedByCost = sessions
        .filter((s) => s.cost_cents > 0)
        .sort((a, b) => b.cost_cents - a.cost_cents);
    const expensiveCount = Math.max(1, Math.floor(sortedByCost.length * 0.1));
    costOpt.expensiveSessions = sortedByCost
        .slice(0, expensiveCount)
        .map((s) => ({
        id: s.id,
        title: s.title,
        cost: s.cost_cents,
        tokens: s.tokens_used,
        provider: s.model.provider,
        model: s.model.model,
    }));
    // Find most expensive provider and model
    let maxProviderCost = 0;
    let maxModelCost = 0;
    for (const [provider, cost] of Object.entries(stats.costsByProvider)) {
        if (cost > maxProviderCost) {
            maxProviderCost = cost;
            costOpt.mostExpensiveProvider = provider;
        }
    }
    // Group by model
    const modelCosts = {};
    sessions.forEach((s) => {
        const modelKey = `${s.model.provider}:${s.model.model}`;
        modelCosts[modelKey] = (modelCosts[modelKey] || 0) + (s.cost_cents || 0);
    });
    for (const [model, cost] of Object.entries(modelCosts)) {
        if (cost > maxModelCost) {
            maxModelCost = cost;
            costOpt.mostExpensiveModel = model;
        }
    }
    // Generate cost saving suggestions
    costOpt.costSavingSuggestions = [];
    if (costOpt.averageCostPerSession > 100) {
        // More than $1 per session
        costOpt.costSavingSuggestions.push("Consider using more cost-effective models for routine tasks");
    }
    if (stats.totalTokens > 1000000) {
        // More than 1M tokens
        costOpt.costSavingSuggestions.push("Implement token optimization strategies like prompt compression");
    }
    const highCostSessions = sessions.filter((s) => s.cost_cents > costOpt.averageCostPerSession * 2);
    if (highCostSessions.length > sessions.length * 0.2) {
        costOpt.costSavingSuggestions.push("Review sessions with unusually high costs for optimization opportunities");
    }
    if (Object.keys(stats.sessionsByProvider).length > 1) {
        costOpt.costSavingSuggestions.push("Consider consolidating to the most cost-effective provider");
    }
}
function calculateToolEfficiency(stats, sessions) {
    const toolEff = stats.toolEfficiency;
    // Calculate tool success rates (simplified - assume all tools succeed)
    for (const [toolName, count] of Object.entries(stats.toolUsage)) {
        toolEff.toolSuccessRates[toolName] = 1.0; // 100% success rate (simplified)
    }
    // Calculate average tool duration (simplified - we don't have real duration data)
    for (const toolName of Object.keys(stats.toolUsage)) {
        toolEff.averageToolDuration[toolName] = 100; // Mock 100ms average
    }
    // Get most used tools
    toolEff.mostUsedTools = getTopTools(stats.toolUsage, 10);
    // Track tool patterns over time
    sessions.forEach((session) => {
        session.messages.forEach((message) => {
            if (message.tools) {
                message.tools.forEach((tool) => {
                    if (!toolEff.toolPatterns[tool.name]) {
                        toolEff.toolPatterns[tool.name] = [];
                    }
                    toolEff.toolPatterns[tool.name].push({
                        timestamp: tool.timestamp,
                        success: true, // Simplified
                    });
                });
            }
        });
    });
}
function calculateTimePatterns(stats) {
    const timePat = stats.timePatterns;
    // Find peak hours
    timePat.peakHours = Object.entries(timePat.hourlyUsage)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    // Find peak days
    timePat.peakDays = Object.entries(timePat.dailyUsage)
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
}
function calculateProjectAnalysis(stats, sessions) {
    const projectAnalysis = stats.projectAnalysis;
    // Project detection keywords and patterns
    const projectKeywords = [
        /react|next|vue|angular/gi,
        /node|express|nest|fastify/gi,
        /python|django|flask|fastapi/gi,
        /rust|go|java|kotlin/gi,
        /typescript|javascript|coffeescript/gi,
        /mongodb|postgres|mysql|sqlite/gi,
        /aws|azure|gcp|firebase/gi,
        /docker|kubernetes|terraform/gi,
        /mobile|ios|android|flutter/gi,
        /machine|learning|ml|ai|data/gi,
    ];
    // Detect projects from session titles and content
    const projectSessionsMap = new Map();
    sessions.forEach((session) => {
        const project = detectProjectFromSession(session, projectKeywords);
        if (!projectSessionsMap.has(project)) {
            projectSessionsMap.set(project, []);
        }
        projectSessionsMap.get(project).push(session);
    });
    // Analyze each detected project
    projectAnalysis.detectedProjects = [];
    for (const [projectName, projectSessions] of projectSessionsMap.entries()) {
        const sessionCount = projectSessions.length;
        const totalCost = projectSessions.reduce((sum, s) => sum + (s.cost_cents || 0), 0);
        const totalTokens = projectSessions.reduce((sum, s) => sum + (s.tokens_used || 0), 0);
        const averageSessionCost = sessionCount > 0 ? totalCost / sessionCount : 0;
        // Calculate top tools for this project
        const projectToolUsage = {};
        projectSessions.forEach((session) => {
            session.messages.forEach((message) => {
                if (message.tools) {
                    message.tools.forEach((tool) => {
                        projectToolUsage[tool.name] =
                            (projectToolUsage[tool.name] || 0) + 1;
                    });
                }
            });
        });
        const topTools = getTopTools(projectToolUsage, 5);
        projectAnalysis.detectedProjects.push({
            name: projectName,
            sessionCount,
            totalCost,
            totalTokens,
            averageSessionCost,
            topTools,
        });
    }
    // Sort projects by session count
    projectAnalysis.detectedProjects.sort((a, b) => b.sessionCount - a.sessionCount);
    // Analyze project patterns
    projectAnalysis.projectPatterns = {};
    projectAnalysis.detectedProjects.forEach((project) => {
        const projectSessionsList = projectSessionsMap.get(project.name) || [];
        const patterns = (projectAnalysis.projectPatterns[project.name] = {
            preferredProviders: {},
            preferredModels: {},
            commonTools: [],
        });
        // Analyze provider and model preferences
        projectSessionsList.forEach((session) => {
            const provider = session.model.provider;
            const model = `${session.model.provider}:${session.model.model}`;
            patterns.preferredProviders[provider] =
                (patterns.preferredProviders[provider] || 0) + 1;
            patterns.preferredModels[model] =
                (patterns.preferredModels[model] || 0) + 1;
        });
        // Get common tools (already calculated above)
        patterns.commonTools = project.topTools;
    });
    // Cross-project comparison
    if (projectAnalysis.detectedProjects.length > 0) {
        const mostActive = projectAnalysis.detectedProjects.reduce((max, project) => project.sessionCount > max.sessionCount ? project : max);
        const mostExpensive = projectAnalysis.detectedProjects.reduce((max, project) => (project.totalCost > max.totalCost ? project : max));
        const mostToolIntensive = projectAnalysis.detectedProjects.reduce((max, project) => {
            const totalTools = project.topTools.reduce((sum, tool) => sum + tool.count, 0);
            const maxTools = max.topTools.reduce((sum, tool) => sum + tool.count, 0);
            return totalTools > maxTools ? project : max;
        });
        projectAnalysis.crossProjectComparison = {
            mostActiveProject: mostActive.name,
            mostExpensiveProject: mostExpensive.name,
            mostToolIntensiveProject: mostToolIntensive.name,
        };
    }
}
function detectProjectFromSession(session, keywords) {
    const text = `${session.title} ${session.messages.map((m) => m.content).join(" ")}`.toLowerCase();
    // Check for project-specific keywords
    for (const keyword of keywords) {
        const match = text.match(keyword);
        if (match) {
            return match[0].toLowerCase();
        }
    }
    // Check for file paths or directory names
    const pathMatches = text.match(/\/([a-zA-Z0-9-_]+)\/|\\([a-zA-Z0-9-_]+)\\/g);
    if (pathMatches) {
        const potentialProjects = pathMatches
            .map((path) => {
            const cleanPath = path.replace(/[\/\\]/g, "").trim();
            return cleanPath.length > 2 && cleanPath.length < 30 ? cleanPath : null;
        })
            .filter(Boolean);
        if (potentialProjects.length > 0) {
            return potentialProjects[0];
        }
    }
    // Check for common project indicators
    if (text.includes("package.json") ||
        text.includes("npm") ||
        text.includes("yarn")) {
        return "nodejs-project";
    }
    if (text.includes("cargo.toml") || text.includes("rust")) {
        return "rust-project";
    }
    if (text.includes("pom.xml") ||
        text.includes("maven") ||
        text.includes("gradle")) {
        return "java-project";
    }
    if (text.includes("requirements.txt") ||
        text.includes("pip") ||
        text.includes("python")) {
        return "python-project";
    }
    if (text.includes("go.mod") || text.includes("golang")) {
        return "go-project";
    }
    // Default fallback
    return "general";
}
export function getTopTools(toolUsage, limit = 10) {
    return Object.entries(toolUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
}
export function formatCostInDollars(costCents) {
    return `$${(costCents / 100).toFixed(2)}`;
}
export function formatNumber(num) {
    return num.toLocaleString();
}
//# sourceMappingURL=analysis.js.map