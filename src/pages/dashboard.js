class DashboardPage {
    constructor() {
        this.currentUserId = null;
        
        // Question types configuration (sync with config/questionTypes.js)
        this.allQuestionTypes = [
            'behavioral', 'technical', 'situational', 'competency',
            'leadership', 'problem-solving', 'creativity', 'conflict',
            'motivation', 'culture', 'growth', 'stress',
            'communication', 'time-management', 'teamwork', 'interview-essentials',
            'adaptability', 'customer-focus', 'ethics', 'salary'
        ];
    }

    getHTML() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>Your Progress Dashboard</h1>
                    <p>Track your interview practice performance and improvement over time</p>
                </div>


                <div class="user-setup" id="userSetup" style="display: none;">
                    <h3>Enter Your Email to View Progress</h3>
                    <p>We'll use this to track your sessions and show your improvement</p>
                    <div style="margin-top: 20px;">
                        <input type="email" id="userEmail" placeholder="your.email@example.com">
                        <input type="text" id="userName" placeholder="Your Name (optional)">
                        <button class="btn btn-primary" onclick="dashboardPage.loadUserProgress()">View Dashboard</button>
                    </div>
                </div>

                <div id="dashboardContent" style="display: none;">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Sessions</div>
                            <div class="stat-number" id="totalSessions">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Questions Answered</div>
                            <div class="stat-number" id="totalQuestions">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Average Score</div>
                            <div class="stat-number" id="avgScore">0.0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Best Score</div>
                            <div class="stat-number" id="bestScore">0.0</div>
                        </div>
                    </div>

                    <div class="chart-container">
                        <h3 class="chart-title">Score Trend (Last 30 Days)</h3>
                        <div id="scoreChart">
                            <div class="loading">Loading chart...</div>
                        </div>
                    </div>

                    <div class="chart-container">
                        <h3 class="chart-title">Performance by Question Type</h3>
                        <div id="performanceByType" class="performance-grid">
                            <div class="loading">Loading performance data...</div>
                        </div>
                    </div>



                    <div class="chart-container" style="margin-top: 20px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                            <h3 class="chart-title" style="margin:0;">Delivery Trend</h3>
                            <div id="deliveryMetricTabs" style="display:flex;gap:6px;">
                                <button onclick="window._dashboardPage.setDeliveryMetric('wpm')" id="dtab-wpm" style="padding:4px 12px;border-radius:999px;border:1px solid #e2e8f0;background:#0ea5e9;color:#fff;font-size:0.78rem;font-weight:700;cursor:pointer;">Pace</button>
                                <button onclick="window._dashboardPage.setDeliveryMetric('fillers')" id="dtab-fillers" style="padding:4px 12px;border-radius:999px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:0.78rem;font-weight:600;cursor:pointer;">Fillers</button>
                                <button onclick="window._dashboardPage.setDeliveryMetric('pauses')" id="dtab-pauses" style="padding:4px 12px;border-radius:999px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:0.78rem;font-weight:600;cursor:pointer;">Pauses</button>
                            </div>
                        </div>
                        <div id="deliveryInsights">
                            <div class="loading">Loading delivery data...</div>
                        </div>
                        <div id="deliveryInsightsSummary" style="margin-top:12px;"></div>
                    </div>

                    <div style="margin-top: 20px; text-align: center;">
                        <div class="improvement-indicator" id="improvementIndicator">
                            Calculating improvement rate...
                        </div>
                    </div>

                    <div class="chart-container" id="simulatorSessionsContainer" style="margin-top: 24px; display: none;">
                        <h3 class="chart-title" style="display:flex;align-items:center;gap:10px;">
                            Simulator Sessions
                            <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:#10b981;color:#fff;padding:2px 8px;border-radius:99px;">Live</span>
                        </h3>
                        <div id="simulatorSessionsList"></div>
                    </div>
                </div>
            </div>
        `;
    }

    getStyles() {
        return `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

        :root {
            --brand: #0ea5e9;
            --brand-dark: #0284c7;
            --ink: #1f2937;
            --muted: #64748b;
            --panel: #ffffff;
            --border: rgba(226, 232, 240, 0.8);
            --shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
        }

        body {
            background:
                radial-gradient(900px 520px at 12% -15%, #fef9c3 0%, rgba(254, 249, 195, 0) 55%),
                radial-gradient(900px 520px at 92% -5%, #bae6fd 0%, rgba(186, 230, 253, 0) 55%),
                linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%);
            min-height: 100vh;
            font-family: "Nunito", "Segoe UI", sans-serif;
            color: var(--ink);
        }

        .dashboard-container {
            max-width: 1200px;
            margin: 36px auto;
            padding: 0 20px;
        }

        .dashboard-header {
            background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
            color: var(--ink);
            padding: 28px;
            border-radius: 28px;
            margin-bottom: 26px;
            text-align: left;
            box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.9);
        }

        .subscription-card {
            background: var(--panel);
            border: 1px solid var(--border);
            padding: 24px;
            border-radius: 24px;
            box-shadow: var(--shadow);
            margin-bottom: 26px;
        }

        .subscription-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .subscription-header h3 {
            margin: 0;
            color: var(--ink);
        }

        .subscription-badge {
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 700;
            background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
            color: #0f172a;
        }

        .subscription-badge.inactive {
            background: linear-gradient(135deg, #fecaca 0%, #fdba74 100%);
            color: #7c2d12;
        }

        .subscription-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .subscription-stat {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .subscription-stat .label {
            color: var(--muted);
            font-weight: 600;
        }

        .subscription-stat .value {
            color: var(--ink);
            font-weight: 700;
        }

        .subscription-actions {
            text-align: center;
        }

        .user-setup {
            background: var(--panel);
            border: 1px solid var(--border);
            padding: 28px;
            border-radius: 24px;
            box-shadow: var(--shadow);
            margin-bottom: 26px;
            text-align: center;
        }

        .user-setup input {
            padding: 12px 15px;
            margin: 0 10px;
            border: 1px solid var(--border);
            border-radius: 18px;
            font-size: 16px;
            width: 250px;
            transition: border-color 0.3s, box-shadow 0.3s;
            background: white;
        }

        .user-setup input:focus {
            outline: none;
            border-color: #7dd3fc;
            box-shadow: 0 0 0 4px rgba(125, 211, 252, 0.25);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: var(--panel);
            border: 1px solid var(--border);
            padding: 24px;
            border-radius: 24px;
            box-shadow: var(--shadow);
            text-align: center;
            transition: all 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
        }

        .stat-number {
            font-size: 2.5em;
            font-weight: 800;
            color: var(--brand);
            margin: 10px 0;
        }

        .stat-label {
            color: var(--muted);
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
        }

        .chart-container {
            background: var(--panel);
            border: 1px solid var(--border);
            padding: 24px;
            border-radius: 24px;
            box-shadow: var(--shadow);
            margin-bottom: 26px;
        }

        .chart-title {
            font-size: 1.2em;
            font-weight: 700;
            margin-bottom: 20px;
            color: var(--ink);
        }


        .improvement-indicator {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 999px;
            font-weight: 600;
            border: 1px solid var(--border);
            background: #f8fafc;
        }

        .improvement-indicator.positive {
            background: rgba(134, 239, 172, 0.35);
            color: #14532d;
        }

        .improvement-indicator.negative {
            background: rgba(254, 202, 202, 0.6);
            color: #7c2d12;
        }

        .improvement-indicator.neutral {
            background: rgba(226, 232, 240, 0.9);
            color: #475569;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .error-message {
            background: rgba(248, 215, 218, 0.9);
            color: #721c24;
            padding: 15px;
            border-radius: 12px;
            margin: 20px 0;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #718096;
        }

        .empty-state h3 {
            color: #4a5568;
            margin-bottom: 10px;
        }

        .performance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .performance-item {
            background: #f8fafc;
            padding: 15px;
            border-radius: 16px;
            border: 1px solid rgba(186, 230, 253, 0.6);
            transition: all 0.3s ease;
        }

        .performance-item:hover {
            transform: translateY(-2px);
            background: rgba(247, 250, 252, 0.95);
        }

        .performance-type {
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 5px;
        }

        .performance-score {
            font-size: 1.2em;
            color: var(--brand);
            font-weight: 700;
        }

        .retry-comparison {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 15px;
            align-items: center;
            margin-top: 8px;
            padding: 12px;
            background: rgba(186, 230, 253, 0.2);
            border-radius: 12px;
            font-size: 0.9em;
        }

        .score-comparison {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .score-comparison.original {
            color: #718096;
        }

        .score-comparison.retry {
            color: var(--brand);
        }

        .score-value {
            font-size: 1.4em;
            font-weight: bold;
            margin-bottom: 2px;
        }

        .score-label {
            font-size: 0.8em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }

        .improvement-indicator-small {
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #4a5568;
        }

        .improvement-arrow {
            font-size: 1.5em;
            margin-bottom: 4px;
        }

        .improvement-arrow.positive {
            color: #22c55e;
        }

        .improvement-arrow.negative {
            color: #f56565;
        }

        .improvement-arrow.neutral {
            color: #ed8936;
        }

        #scoreChart {
            height: 300px;
            position: relative;
        }

        .simple-chart {
            display: flex;
            align-items: flex-end;
            height: 100%;
            gap: 10px;
            padding: 20px 0;
        }

        .chart-bar {
            flex: 1;
            background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
            position: relative;
            border-radius: 10px 10px 0 0;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .chart-bar:hover {
            background: linear-gradient(135deg, #7dd3fc 0%, #5eead4 100%);
            transform: scaleY(1.05);
        }

        .chart-bar-label {
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.8em;
            color: #666;
            white-space: nowrap;
            font-weight: 500;
        }

        .chart-bar-value {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.9em;
            font-weight: 600;
            color: #2d3748;
        }

        .btn {
            padding: 12px 24px;
            border-radius: 999px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            font-size: 16px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
            color: #0f172a;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(56, 189, 248, 0.3);
        }

        @media (max-width: 768px) {
            .dashboard-container {
                margin: 20px auto;
                padding: 0 15px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .user-setup input {
                width: 100%;
                margin: 10px 0;
            }
            
            .performance-grid {
                grid-template-columns: 1fr;
            }

            #scoreChart {
                height: 220px;
            }

            .simple-chart {
                gap: 6px;
                padding: 12px 0 52px;
                overflow-x: auto;
                overscroll-behavior-x: contain;
            }

            .simple-chart::-webkit-scrollbar {
                height: 6px;
            }

            .simple-chart::-webkit-scrollbar-thumb {
                background: rgba(148, 163, 184, 0.6);
                border-radius: 999px;
            }

            .chart-bar {
                flex: 0 0 22px;
                border-radius: 8px 8px 0 0;
            }

            .chart-bar-label {
                bottom: -40px;
                font-size: 0.68em;
                transform: translateX(-50%) rotate(-45deg);
                transform-origin: top left;
            }

            .chart-bar-value {
                top: -20px;
                font-size: 0.75em;
            }
        }
        `;
    }

    // Inject styles into the head
    injectStyles() {
        // Remove existing styles if present
        const existingStyles = document.getElementById('dashboard-page-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'dashboard-page-styles';
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);
    }

    async init() {
        try {
            console.log('Initializing dashboard page...');
            
            // Check authentication first
            if (typeof authManager !== 'undefined' && !authManager.isAuthenticated()) {
                console.log('User not authenticated, redirecting to login');
                window.location.href = '/login?redirect=dashboard';
                return;
            }
            
            this.injectStyles();
            
            // Set page content - find or create content area, preserving navigation
            let contentArea = document.querySelector('.page-content');
            if (!contentArea) {
                contentArea = document.createElement('div');
                contentArea.className = 'page-content';
                const container = document.querySelector('.container');
                if (container) {
                    container.appendChild(contentArea);
                }
            }
            
            if (contentArea) {
                contentArea.innerHTML = this.getHTML();
            }

            // Check for payment success parameter and process it
            await this.handlePaymentSuccess();
            
            // Initialize dashboard logic
            this.initializeDashboard();

            console.log('Dashboard page initialized successfully');
        } catch (error) {
            console.error('Error in DashboardPage init:', error);
        }
    }

    initializeDashboard() {
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (token && this.isValidToken(token)) {
            // User is authenticated, load dashboard directly
            document.getElementById('userSetup').style.display = 'none';
            document.getElementById('dashboardContent').style.display = 'block';
            
            // Load dashboard progress
            this.loadAuthenticatedUserProgress();
        } else {
            // Clear invalid auth data and show setup
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            
            // Show user setup for non-authenticated users
            document.getElementById('userSetup').style.display = 'block';
            
            // Check for legacy email
            const savedEmail = localStorage.getItem('userEmail');
            if (savedEmail) {
                document.getElementById('userEmail').value = savedEmail;
                const savedName = localStorage.getItem('userName');
                if (savedName) {
                    document.getElementById('userName').value = savedName;
                }
            }
        }
    }

    async handlePaymentSuccess() {
        try {
            console.log('handlePaymentSuccess called, URL:', window.location.href);
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');
            const sessionId = urlParams.get('session_id');
            
            console.log('URL params:', { paymentStatus, sessionId });
            
            if (paymentStatus === 'success' && sessionId) {
                console.log('Processing payment success:', sessionId);
                
                const token = localStorage.getItem('authToken');
                if (!token) {
                    console.error('No auth token found for payment processing');
                    return;
                }
                
                // Call our payment success endpoint
                const response = await fetch(`/api/payment/success?session_id=${sessionId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const result = await response.json();
                console.log('Payment success response:', result);
                
                if (result.success) {
                    // Show success message
                    alert('Payment successful! Your subscription is now active.');
                    
                    // Clean up URL parameters
                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                } else {
                    console.error('Payment processing failed:', result.error);
                    alert('There was an issue processing your payment. Please contact support.');
                }
            }
        } catch (error) {
            console.error('Error handling payment success:', error);
        }
    }


    isValidToken(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch (error) {
            return false;
        }
    }

    async loadAuthenticatedUserProgress() {
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch('/api/dashboard/progress', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Token expired or invalid, redirect to login
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to load progress data');
            }

            const progressData = await response.json();
            this.displayProgressData(progressData);

        } catch (error) {
            console.error('Error loading progress:', error);
            alert('Failed to load dashboard. Please try again.');
        }
    }

    async loadUserProgress() {
        const email = document.getElementById('userEmail').value.trim();
        const name = document.getElementById('userName').value.trim();

        if (!email) {
            alert('Please enter your email address');
            return;
        }

        if (!this.validateEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            // Legacy support - redirect to signup
            alert('Please create an account to track your progress properly.');
            window.location.href = '/signup?email=' + encodeURIComponent(email);

        } catch (error) {
            console.error('Error loading progress:', error);
            alert('Failed to load dashboard. Please try again.');
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    displayProgressData(data) {
        // Update stats with proper type checking
        document.getElementById('totalSessions').textContent = data.overview.total_sessions || 0;
        
        // Show total questions with retries included
        const totalAnswered = data.overview.total_questions_answered || data.overview.total_questions || 0;
        const totalRetries = data.overview.total_retries || 0;
        const uniqueQuestions = data.overview.unique_questions || totalAnswered;
        
        // Display total questions answered (including retries)
        const questionsElement = document.getElementById('totalQuestions');
        questionsElement.textContent = totalAnswered;
        if (totalRetries > 0) {
            questionsElement.title = `${uniqueQuestions} unique questions + ${totalRetries} retries`;
        }
        
        // Safely convert to number and format
        const avgScore = parseFloat(data.overview.avg_score) || 0;
        const bestScore = parseFloat(data.overview.best_score) || 0;
        
        document.getElementById('avgScore').textContent = this.formatScore(avgScore);
        document.getElementById('bestScore').textContent = this.formatScore(bestScore);

        // Display score trend chart
        this.displayScoreTrend(data.scoreTrend);

        // Display performance by type (now includes retry comparisons)
        this.displayPerformanceByType(data.performanceByType);

        // Display improvement rate
        this.displayImprovementRate(data.improvementRate);

        // Display delivery trend
        this._deliveryTrend = data.deliveryTrend || [];
        this._deliveryStats = data.deliveryStats || {};
        this._activeDeliveryMetric = 'wpm';
        window._dashboardPage = this;
        this.displayDeliveryInsights(data.deliveryStats);
        this.renderDeliveryTrend();

        // Display simulator sessions
        this.displaySimulatorSessions(data.simulatorSessions || []);
    }

    displaySimulatorSessions(sessions) {
        const container = document.getElementById('simulatorSessionsContainer');
        const list = document.getElementById('simulatorSessionsList');
        if (!container || !list) return;
        if (!sessions.length) { container.style.display = 'none'; return; }
        container.style.display = '';

        const typeLabel = { general: 'General', behavioral: 'Behavioural', technical: 'Technical', competency: 'Competency' };
        const diffLabel = { junior: 'Junior', mid: 'Mid-level', senior: 'Senior' };
        const scoreMeta = s => {
            if (s == null) return { color: '#94a3b8', border: '#e2e8f0', letter: '—' };
            if (s >= 8)   return { color: '#059669', border: '#6ee7b7', letter: 'A' };
            if (s >= 6)   return { color: '#d97706', border: '#fcd34d', letter: 'B' };
            return               { color: '#dc2626', border: '#fca5a5', letter: 'C' };
        };

        const PAGE = 3;
        const renderCards = (count) => {
            const shown = sessions.slice(0, count);
            list.innerHTML = shown.map((s, i) => {
                const date = new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const score = s.score != null ? parseFloat(s.score) : null;
                const sm = scoreMeta(score);
                const feedbackId = `sim-feedback-${i}`;
                return `
                <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:10px;background:var(--panel);">
                    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:${s.ai_feedback ? 'pointer' : 'default'};"
                         onclick="${s.ai_feedback ? `const el=document.getElementById('${feedbackId}');el.style.display=el.style.display==='none'?'block':'none'` : ''}">
                        <div style="flex-shrink:0;width:44px;height:44px;border-radius:50%;border:2.5px solid ${sm.border};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;">
                            <span style="font-size:0.95rem;font-weight:800;color:${sm.color};line-height:1;">${score != null ? score.toFixed(1) : '—'}</span>
                            ${score != null ? `<span style="font-size:0.55rem;font-weight:600;color:${sm.color};line-height:1;">/10</span>` : ''}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
                                <span style="font-size:0.78rem;font-weight:700;color:var(--ink);">${date}</span>
                                <span style="font-size:0.72rem;font-weight:700;background:#f0fdf4;color:#10b981;border:1px solid #bbf7d0;border-radius:99px;padding:1px 8px;">${typeLabel[s.question_type] || 'General'}</span>
                                <span style="font-size:0.72rem;color:var(--muted);">${diffLabel[s.difficulty_level] || ''}</span>
                                <span style="font-size:0.72rem;color:var(--muted);">${s.total_questions || 0} Qs</span>
                                ${s.session_duration ? `<span style="font-size:0.72rem;color:var(--muted);">${s.session_duration} min</span>` : ''}
                            </div>
                        </div>
                        ${s.ai_feedback ? `<span style="font-size:0.75rem;color:var(--muted);flex-shrink:0;">▼ Summary</span>` : ''}
                    </div>
                    ${s.ai_feedback ? `<div id="${feedbackId}" style="display:none;padding:0 16px 14px;border-top:1px solid var(--border);padding-top:12px;">
                        <p style="font-size:0.82rem;color:#374151;margin:0;line-height:1.65;">${s.ai_feedback}</p>
                    </div>` : ''}
                </div>`;
            }).join('');

            if (sessions.length > PAGE) {
                const remaining = sessions.length - count;
                const btn = document.createElement('button');
                btn.style.cssText = 'display:block;width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--muted);font-size:0.82rem;font-weight:600;cursor:pointer;margin-top:4px;';
                if (remaining > 0) {
                    btn.textContent = `Show ${Math.min(remaining, PAGE)} more session${Math.min(remaining, PAGE) !== 1 ? 's' : ''}`;
                    btn.onclick = () => renderCards(Math.min(count + PAGE, sessions.length));
                } else {
                    btn.textContent = 'Show less';
                    btn.onclick = () => renderCards(PAGE);
                }
                list.appendChild(btn);
            }
        };

        renderCards(PAGE);
    }

    displayScoreTrend(scoreTrend) {
        const chartContainer = document.getElementById('scoreChart');
        
        if (!scoreTrend || scoreTrend.length === 0) {
            chartContainer.innerHTML = '<div class="empty-state"><h3>No data yet</h3><p>Complete some practice sessions to see your score trend</p></div>';
            return;
        }

        // Calculate dynamic scale based on actual scores
        const scores = scoreTrend.map(item => parseFloat(item.avg_score));
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        // Add padding to the range for better visualization
        const padding = (maxScore - minScore) * 0.2 || 1;
        const chartMax = Math.min(10, maxScore + padding);
        const chartMin = Math.max(0, minScore - padding);
        const range = chartMax - chartMin;
        
        // Create Y-axis labels
        const yAxisSteps = 5;
        const stepSize = range / yAxisSteps;
        let yAxisLabels = [];
        for (let i = 0; i <= yAxisSteps; i++) {
            yAxisLabels.push((chartMin + (stepSize * i)).toFixed(1));
        }
        yAxisLabels.reverse(); // Top to bottom
        
        const chartHTML = `
            <div style="display: flex; height: 100%; gap: 10px;">
                <div class="y-axis" style="display: flex; flex-direction: column; justify-content: space-between; padding: 20px 0; min-width: 30px; text-align: right;">
                    ${yAxisLabels.map(label => `
                        <div style="font-size: 0.8em; color: #718096; line-height: 1;">${label}</div>
                    `).join('')}
                </div>
                <div class="simple-chart" style="flex: 1;">
                    ${scoreTrend.map(item => {
                        const scoreValue = parseFloat(item.avg_score);
                        // Calculate height based on dynamic range
                        const height = ((scoreValue - chartMin) / range) * 100;
                        const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        
                        // Color based on performance
                        let barColor = 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)'; // Blue for 4-6
                        if (scoreValue > 6) {
                            barColor = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'; // Green for > 6
                        } else if (scoreValue <= 4) {
                            barColor = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)'; // Red for <= 4
                        }
                        
                        return `
                            <div class="chart-bar" style="height: ${height}%; background: ${barColor};" title="${date}: ${this.formatScore(scoreValue)}/10">
                                <div class="chart-bar-value">${this.formatScore(scoreValue)}</div>
                                <div class="chart-bar-label">${date}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        chartContainer.innerHTML = chartHTML;
    }

    displayPerformanceByType(performanceData) {
        const container = document.getElementById('performanceByType');
        
        // Use centralized question types configuration
        const allQuestionTypes = this.allQuestionTypes;
        
        // Create a map of existing performance data
        const performanceMap = {};
        if (performanceData && performanceData.length > 0) {
            performanceData.forEach(item => {
                performanceMap[item.question_type] = item;
            });
        }
        
        // Build display for all types, showing "No data" for unanswered types
        const allTypesHtml = allQuestionTypes.map(type => {
            const item = performanceMap[type];
            
            if (!item) {
                // No data for this question type yet
                return `
                    <div class="performance-item" style="opacity: 0.6;">
                        <div class="performance-type">${this.formatQuestionType(type)}</div>
                        <div class="performance-score" style="color: #a0aec0;">-/10</div>
                        <div style="color: #a0aec0; font-size: 0.9em;">No data yet</div>
                    </div>
                `;
            }
            
            // Existing code for types with data
            const retryCount = parseInt(item.retry_count) || 0;
            const firstAvg = parseFloat(item.first_attempt_avg) || 0;
            const retryAvg = parseFloat(item.retry_avg) || 0;
            const improvement = retryAvg - firstAvg;
            
            return `
                <div class="performance-item">
                    <div class="performance-type">${this.formatQuestionType(item.question_type)}</div>
                    <div class="performance-score">${this.formatScore(parseFloat(item.avg_score))}/10</div>
                    <div style="color: #718096; font-size: 0.9em;">${item.count} questions</div>
                    ${retryCount > 0 ? `
                        <div class="retry-comparison">
                            <div class="score-comparison original">
                                <div class="score-value">${this.formatScore(firstAvg)}</div>
                                <div class="score-label">Original</div>
                            </div>
                            <div class="improvement-indicator-small">
                                <div class="improvement-arrow ${improvement > 0 ? 'positive' : improvement < 0 ? 'negative' : 'neutral'}">
                                    ${improvement > 0 ? '↗' : improvement < 0 ? '↘' : '→'}
                                </div>
                                <div style="font-size: 0.7em;">${improvement > 0 ? '+' : ''}${this.formatScore(improvement)}</div>
                            </div>
                            <div class="score-comparison retry">
                                <div class="score-value">${this.formatScore(retryAvg)}</div>
                                <div class="score-label">Retry</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = allTypesHtml.join('');
    }

    formatQuestionType(type) {
        if (!type) return 'General';
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatScore(score) {
        if (score % 1 === 0) {
            return score.toString(); // Return as integer if no decimal part
        }
        return score.toFixed(1); // Return with 1 decimal place if has decimal part
    }


    displayRetryInsights(insights) {
        const container = document.getElementById('retryInsights');
        
        if (!insights || !insights.questions_retried) {
            container.innerHTML = '<div class="empty-state"><p>No retry data available yet. Try retrying questions to see insights!</p></div>';
            return;
        }
        
        const questionsRetried = parseInt(insights.questions_retried) || 0;
        const avgImprovement = parseFloat(insights.avg_score_improvement) || 0;
        const bestImprovement = parseFloat(insights.best_improvement) || 0;
        const improved = parseInt(insights.improved_on_retry) || 0;
        const same = parseInt(insights.same_on_retry) || 0;
        const worse = parseInt(insights.worse_on_retry) || 0;
        const totalRetries = improved + same + worse;
        
        // Calculate percentages
        const improvedPercent = totalRetries > 0 ? Math.round((improved / totalRetries) * 100) : 0;
        const samePercent = totalRetries > 0 ? Math.round((same / totalRetries) * 100) : 0;
        const worsePercent = totalRetries > 0 ? Math.round((worse / totalRetries) * 100) : 0;
        
        container.innerHTML = `
            <div class="retry-insight-card">
                <div class="retry-insight-label">Questions Retried</div>
                <div class="retry-insight-value">${questionsRetried}</div>
            </div>
            
            <div class="retry-insight-card ${avgImprovement > 0 ? 'positive' : avgImprovement < 0 ? 'negative' : ''}">
                <div class="retry-insight-label">Avg Score Change</div>
                <div class="retry-insight-value">
                    ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}
                </div>
            </div>
            
            <div class="retry-insight-card ${bestImprovement > 0 ? 'positive' : ''}">
                <div class="retry-insight-label">Best Improvement</div>
                <div class="retry-insight-value">
                    ${bestImprovement > 0 ? '+' : ''}${bestImprovement.toFixed(1)}
                </div>
            </div>
            
            <div class="retry-insight-card">
                <div class="retry-insight-label">Retry Outcomes</div>
                <div class="retry-improvement-bar">
                    ${improved > 0 ? `<div class="improvement-segment improved" title="${improved} improved">↑ ${improvedPercent}%</div>` : ''}
                    ${same > 0 ? `<div class="improvement-segment same" title="${same} stayed same">= ${samePercent}%</div>` : ''}
                    ${worse > 0 ? `<div class="improvement-segment worse" title="${worse} got worse">↓ ${worsePercent}%</div>` : ''}
                </div>
            </div>
        `;
    }

    displayRetryComparisons(comparisons) {
        const container = document.getElementById('retryComparisons');
        
        if (!comparisons || comparisons.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No retry comparisons available. Retry some questions to see detailed before/after analysis!</p></div>';
            return;
        }
        
        const tableRows = comparisons.map(comparison => {
            const originalScore = parseFloat(comparison.original_score);
            const retryScore = parseFloat(comparison.retry_score);
            const scoreChange = parseFloat(comparison.score_change);
            const minutesBetween = parseInt(comparison.minutes_between_attempts);
            
            // Determine score change class
            let changeClass = 'neutral';
            let changeText = '0';
            if (scoreChange > 0) {
                changeClass = 'positive';
                changeText = `+${scoreChange.toFixed(1)}`;
            } else if (scoreChange < 0) {
                changeClass = 'negative';
                changeText = scoreChange.toFixed(1);
            } else {
                changeText = '0.0';
            }
            
            // Format time between attempts
            let timeBetweenText = '';
            if (minutesBetween < 60) {
                timeBetweenText = `${minutesBetween}m`;
            } else if (minutesBetween < 1440) {
                const hours = Math.floor(minutesBetween / 60);
                const mins = minutesBetween % 60;
                timeBetweenText = `${hours}h ${mins}m`;
            } else {
                const days = Math.floor(minutesBetween / 1440);
                timeBetweenText = `${days}d`;
            }
            
            return `
                <tr>
                    <td>
                        <div class="question-text" title="${comparison.question_text}">
                            ${comparison.question_text}
                        </div>
                        <div style="font-size: 0.8em; color: #805ad5; margin-top: 4px;">
                            ${this.formatQuestionType(comparison.question_type)}
                        </div>
                    </td>
                    <td class="score-cell original-score">${originalScore.toFixed(1)}</td>
                    <td><span class="comparison-arrow">→</span></td>
                    <td class="score-cell retry-score">${retryScore.toFixed(1)}</td>
                    <td>
                        <span class="score-change ${changeClass}">${changeText}</span>
                    </td>
                    <td class="time-between">${timeBetweenText}</td>
                </tr>
            `;
        }).join('');
        
        container.innerHTML = `
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Question</th>
                        <th>Original</th>
                        <th></th>
                        <th>Retry</th>
                        <th>Change</th>
                        <th>Time Gap</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }

    displayImprovementRate(rate) {
        const indicator = document.getElementById('improvementIndicator');
        
        // Safely convert to number
        const improvementRate = parseFloat(rate) || 0;
        
        if (improvementRate > 5) {
            indicator.className = 'improvement-indicator positive';
            indicator.textContent = `Improving ${improvementRate.toFixed(1)}% over time`;
        } else if (improvementRate < -5) {
            indicator.className = 'improvement-indicator negative';
            indicator.textContent = `Performance declined ${Math.abs(improvementRate).toFixed(1)}%`;
        } else {
            indicator.style.display = 'none';
        }
    }


    displayDeliveryInsights(stats) {
        const summaryEl = document.getElementById('deliveryInsightsSummary');
        if (!summaryEl) return;

        const voiceAnswers = parseInt(stats?.voice_answers) || 0;
        if (!stats || voiceAnswers === 0) return;

        const avgWpm = parseInt(stats.avg_wpm) || null;
        const avgFillers = parseInt(stats.avg_fillers) || 0;
        const avgPauses = parseInt(stats.avg_pauses) || 0;

        const wpmLabel = !avgWpm ? '—' : avgWpm < 100 ? 'Too slow' : avgWpm > 170 ? 'Too fast' : avgWpm > 140 ? 'Good' : 'Ideal';
        const wpmColor = !avgWpm ? '#94a3b8' : (avgWpm < 100 || avgWpm > 170) ? '#ef4444' : '#16a34a';
        const pauseColor = avgPauses > 5 ? '#ef4444' : avgPauses > 2 ? '#d97706' : '#16a34a';
        const fillerColor = avgFillers > 5 ? '#ef4444' : avgFillers > 2 ? '#d97706' : '#16a34a';

        const chip = (label, value, color) =>
            `<span style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:4px 12px;font-size:0.8rem;color:#475569;">
                ${label}: <strong style="color:${color};">${value}</strong>
            </span>`;

        summaryEl.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                <span style="font-size:0.78rem;color:#94a3b8;">All-time averages:</span>
                ${chip('Pace', avgWpm ? `${avgWpm} wpm (${wpmLabel})` : '—', wpmColor)}
                ${chip('Fillers', avgFillers + ' per answer', fillerColor)}
                ${chip('Pauses', avgPauses + ' per answer', pauseColor)}
                ${chip('Voice answers', voiceAnswers, '#475569')}
            </div>
        `;
    }

    setDeliveryMetric(metric) {
        this._activeDeliveryMetric = metric;
        // Update tab styles
        ['wpm', 'fillers', 'pauses'].forEach(m => {
            const tab = document.getElementById(`dtab-${m}`);
            if (!tab) return;
            if (m === metric) {
                tab.style.background = '#0ea5e9';
                tab.style.color = '#fff';
                tab.style.fontWeight = '700';
            } else {
                tab.style.background = '#f8fafc';
                tab.style.color = '#64748b';
                tab.style.fontWeight = '600';
            }
        });
        this.renderDeliveryTrend();
    }

    renderDeliveryTrend() {
        const container = document.getElementById('deliveryInsights');
        if (!container) return;

        const trend = this._deliveryTrend || [];
        const metric = this._activeDeliveryMetric || 'wpm';

        if (!trend || trend.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No voice answer data yet. Complete practice sessions using voice to see your delivery trend.</p></div>';
            return;
        }

        const configs = {
            wpm: {
                key: 'avg_wpm',
                label: 'wpm',
                goodMin: 100, goodMax: 170,
                color: (v) => v < 100 || v > 170 ? '#ef4444' : '#0ea5e9',
                barColor: (v) => v < 100 || v > 170
                    ? 'linear-gradient(135deg,#fca5a5,#ef4444)'
                    : 'linear-gradient(135deg,#7dd3fc,#0ea5e9)',
                idealLine: 130 // midpoint of ideal range for reference line
            },
            fillers: {
                key: 'avg_fillers',
                label: 'fillers',
                color: (v) => v > 5 ? '#ef4444' : v > 2 ? '#d97706' : '#16a34a',
                barColor: (v) => v > 5
                    ? 'linear-gradient(135deg,#fca5a5,#ef4444)'
                    : v > 2
                    ? 'linear-gradient(135deg,#fde68a,#d97706)'
                    : 'linear-gradient(135deg,#86efac,#16a34a)'
            },
            pauses: {
                key: 'avg_pauses',
                label: 'pauses',
                color: (v) => v > 5 ? '#ef4444' : v > 2 ? '#d97706' : '#16a34a',
                barColor: (v) => v > 5
                    ? 'linear-gradient(135deg,#fca5a5,#ef4444)'
                    : v > 2
                    ? 'linear-gradient(135deg,#fde68a,#d97706)'
                    : 'linear-gradient(135deg,#86efac,#16a34a)'
            }
        };

        const cfg = configs[metric];
        const values = trend.map(d => parseFloat(d[cfg.key]) || 0);
        const maxVal = Math.max(...values, 1);
        const minVal = 0;
        const range = maxVal - minVal || 1;

        // Detect trend direction
        const first = values[0];
        const last = values[values.length - 1];
        const diff = last - first;
        let trendText = '';
        if (values.length > 1) {
            if (metric === 'wpm') {
                const improving = diff > 0 && first < 100 ? true : diff < 0 && first > 170 ? true : false;
                trendText = improving ? 'Pace improving' : Math.abs(diff) < 5 ? 'Pace consistent' : '';
            } else {
                trendText = diff < -0.5 ? `${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)} improving`
                          : diff > 0.5 ? `${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)} increasing — keep working on it`
                          : 'Consistent';
            }
        }

        container.innerHTML = `
            <div style="display:flex;height:180px;gap:10px;">
                <div style="display:flex;flex-direction:column;justify-content:space-between;padding:4px 0;min-width:28px;text-align:right;">
                    ${[maxVal, Math.round(maxVal * 0.5), 0].map(v =>
                        `<div style="font-size:0.72rem;color:#94a3b8;line-height:1;">${Math.round(v)}</div>`
                    ).join('')}
                </div>
                <div style="flex:1;display:flex;align-items:flex-end;gap:4px;border-bottom:1px solid #e2e8f0;padding-bottom:0;position:relative;">
                    ${trend.map((d, i) => {
                        const val = parseFloat(d[cfg.key]) || 0;
                        const height = Math.max(4, ((val - minVal) / range) * 100);
                        const date = new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                        return `
                            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;">
                                <div style="font-size:0.65rem;color:${cfg.color(val)};font-weight:700;">${Math.round(val)}</div>
                                <div style="width:100%;height:${height}%;background:${cfg.barColor(val)};border-radius:4px 4px 0 0;min-height:4px;transition:height 0.3s;" title="${date}: ${Math.round(val)} ${cfg.label}"></div>
                                <div style="font-size:0.62rem;color:#94a3b8;white-space:nowrap;transform:rotate(-35deg);transform-origin:top left;margin-top:6px;margin-left:4px;">${date}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ${trendText ? `<div style="margin-top:10px;font-size:0.8rem;color:#64748b;text-align:right;">${trendText}</div>` : ''}
        `;
    }

    // Clean up when navigating away from this page
    cleanup() {
        // Remove page-specific styles
        const styles = document.getElementById('dashboard-page-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Export for use in router
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardPage;
}

// Global instance for onclick handlers
let dashboardPage = null;

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined') {
    window.DashboardPage = DashboardPage;
}
