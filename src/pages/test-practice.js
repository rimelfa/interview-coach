// Prevent multiple script loading
if (window.TestPracticePage) {
    console.log('TestPracticePage already loaded, exiting script');
    // Don't execute the rest of the script
} else {
    console.log('Loading TestPracticePage for the first time');
    
class TestPracticePage {
    constructor() {
        // TEST MODE: Add test mode properties
        this.isTestMode = true;
        this.selectedIndustry = null;
        this.testData = null;
        this.customJobTitle = null;
        this.jobTitleLastQuery = '';
        this.jobTitleLastCorrection = null;
        this.jobTitleSuggestionAbort = null;
        this.lastRecordedJobTitle = null;
        
        // Question types configuration - use centralized config when available
        this.questionTypes = this.getQuestionTypesConfig();
        
        // Original AIInterviewer properties (modified for test mode)
        this.socket = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.currentQuestion = 1;
        this.totalQuestions = 1; // TEST MODE: Only 1 question
        this.sessionId = null;
        this.resumeContent = null;
        this.jobDescription = '';
        this.answerStartTime = null;
        this.timerInterval = null;
        this.answerHistory = new Map();
        this.currentQuestionText = '';
        this.previousQuestions = [];
        this.sessionConfig = null;
        this.demoProfileReady = false;
        this.demoProfileLoadCount = 0;
        
        // Additional practice page properties
        this.answerMode = 'voice'; // 'voice' or 'text'
        this.timer = null;
        this.startTime = null;
        
        // Guest mode flag (set during init)
        this.isGuest = false;
        this.guestId = null;
    }

    // TEST MODE: Add init method to show industry selection first
    async init(container) {
        console.log('TestPracticePage init called with container:', container);

        // Determine if user is authenticated or guest
        await new Promise(resolve => setTimeout(resolve, 100)); // wait for authManager
        const isAuthenticated = typeof authManager !== 'undefined' &&
            authManager &&
            typeof authManager.isAuthenticated === 'function' &&
            authManager.isAuthenticated();

        this.isGuest = !isAuthenticated;

        if (this.isGuest) {
            // Generate a persistent guest ID stored in localStorage
            if (!localStorage.getItem('guestId')) {
                localStorage.setItem('guestId', 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
            }
            this.guestId = localStorage.getItem('guestId');

            // Fast local check before hitting the server
            if (localStorage.getItem('guest_test_used') === '1') {
                this.showGuestAlreadyUsedMessage(container);
                return;
            }
        }

        console.log('Checking test access... (isGuest:', this.isGuest, ')');

        // Check if user/guest has access to test mode
        const hasAccess = await this.checkTestAccess();
        if (!hasAccess) {
            if (this.isGuest) {
                this.showGuestAlreadyUsedMessage(container);
            } else {
                console.log('User has already used test mode, redirecting to practice...');
                window.location.href = '/practice';
            }
            return;
        }

        console.log('Access granted, loading test practice interface...');
        await this.loadTestPracticeInterface();
    }

    showGuestAlreadyUsedMessage(container) {
        // Use same target as loadTestPracticeInterface
        const target = document.querySelector('#app') ||
                       document.querySelector('.page-content') ||
                       container;
        if (!target) return;
        if (target.style.display === 'none') target.style.display = 'block';
        target.innerHTML = `
            <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 40px 16px;">
                <div style="max-width: 520px; width: 100%; text-align: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 52px 44px; backdrop-filter: blur(20px); box-shadow: 0 24px 64px rgba(0,0,0,0.4);">
                    <div style="width: 64px; height: 64px; margin: 0 auto 24px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <h2 style="font-size: 1.6rem; font-weight: 700; color: #ffffff; margin: 0 0 14px; line-height: 1.3;">You've used your free session</h2>
                    <p style="color: rgba(255,255,255,0.6); margin: 0 0 32px; line-height: 1.7; font-size: 1rem;">Create a free account to unlock more practice questions and track your progress over time.</p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <a href="/signup" style="padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border-radius: 12px; font-weight: 600; text-decoration: none; font-size: 0.95rem; box-shadow: 0 8px 24px rgba(16,185,129,0.35); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Create Free Account</a>
                        <a href="/pricing" style="padding: 14px 32px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; font-weight: 600; text-decoration: none; font-size: 0.95rem; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.13)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">See Pricing</a>
                    </div>
                </div>
            </div>
        `;
    }

    async checkTestAccess() {
        try {
            const headers = {};
            if (!this.isGuest) {
                const token = localStorage.getItem('authToken');
                if (token) headers['Authorization'] = `Bearer ${token}`;
            } else if (this.guestId) {
                headers['X-Guest-ID'] = this.guestId;
            }

            const response = await fetch('/api/check-test-access', { headers });
            if (!response.ok) {
                console.error('Failed to check test access:', response.status);
                return false;
            }
            const data = await response.json();
            return data.hasAccess;
        } catch (error) {
            console.error('Error checking test access:', error);
            return false;
        }
    }
    
    showNoAccessMessage(container) {
        container.innerHTML = `
            <div style="max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; background: #f8f9fa; border-radius: 10px;">
                <div style="font-size: 24px; margin-bottom: 20px; font-weight: 700; color: #b91c1c;">Access Restricted</div>
                <h2 style="color: #333; margin-bottom: 20px;">Test Mode Not Available</h2>
                <p style="color: #666; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                    You have already purchased a package and cannot access the test mode. 
                    Please use your practice sessions instead.
                </p>
                <button onclick="window.location.href='/practice'" 
                        style="background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%); color: #0f172a; padding: 12px 30px; 
                               border: none; border-radius: 999px; font-size: 16px; font-weight: 700;
                               cursor: pointer;">
                    Go to Practice Mode
                </button>
            </div>
        `;
    }
    
    checkAuthentication() {
        const token = localStorage.getItem('authToken');
        return !!token;
    }

    injectIndustrySelectionStyles() {
        // Remove existing industry selection styles if present
        const existingStyles = document.getElementById('test-industry-selection-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'test-industry-selection-styles';
        styleElement.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');

            body {
                background: radial-gradient(1200px 600px at 10% -20%, #fef9c3 0%, #ecfeff 40%, #f0fdf4 100%) !important;
                font-family: "Nunito", "Segoe UI", sans-serif;
            }
            
            .test-industry-selection {
                max-width: 980px;
                margin: 0 auto;
                padding: 52px 20px 70px;
                min-height: 100vh;
            }
            
            .industry-header {
                text-align: center;
                margin-bottom: 28px;
            }
            
            .industry-header h1 {
                font-size: 2.3em;
                color: #0f172a;
                margin-bottom: 8px;
                font-weight: 700;
                letter-spacing: -0.02em;
            }
            
            .industry-header p {
                color: #475569;
                font-size: 1.05em;
                margin: 0;
            }

            .industry-subtext {
                margin-top: 10px;
                font-size: 0.95em;
                color: #64748b;
            }

            .industry-search {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 12px;
                align-items: center;
                background: rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(226, 232, 240, 0.7);
                border-radius: 20px;
                padding: 16px;
                margin: 18px 0 28px;
                box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
            }

            .industry-search-input {
                width: 100%;
                border: 1px solid rgba(148, 163, 184, 0.6);
                border-radius: 999px;
                padding: 12px 16px;
                font-size: 1rem;
                background: white;
            }

            .industry-search-input:focus {
                outline: none;
                border-color: #38bdf8;
                box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2);
            }

            .industry-search-btn {
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
                border: none;
                border-radius: 999px;
                padding: 12px 20px;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
            }

            .industry-search-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 12px 22px rgba(56, 189, 248, 0.25);
            }

            .industry-search-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            .industry-search-hint {
                grid-column: 1 / -1;
                font-size: 0.9em;
                color: #64748b;
                margin: 2px 0 0;
            }
            
        `;
        document.head.appendChild(styleElement);
    }

    async showIndustrySelection(container) {
        console.log('showIndustrySelection called with container:', container);
        
        // Inject the industry selection styles first
        this.injectIndustrySelectionStyles();
        console.log('Industry selection styles injected');
        
        // Use a more direct approach - target the main container or create one
        let targetContainer = container;
        if (!targetContainer) {
            targetContainer = document.querySelector('#app-container, #app, .container, main');
            if (!targetContainer) {
                targetContainer = document.body;
            }
        }
        
        console.log('Target container:', targetContainer);
        
        // Make sure the container is visible
        if (targetContainer.style.display === 'none') {
            targetContainer.style.display = 'block';
            console.log('Made target container visible');
        }
        
        // Clear any existing content and set the industry selection
        targetContainer.innerHTML = this.getIndustrySelectionHTML();
        console.log('HTML set to target container');
        
        this.setupIndustrySearch();
        console.log('Industry selection setup complete');
    }

    getIndustrySelectionHTML() {
        return `
            <div class="test-industry-selection">
                <div class="industry-header">
                    <h1>Pick a demo role</h1>
                    <p>Choose an industry or enter your exact job title to preview the experience.</p>
                    <div class="industry-subtext">Want a fully personalized session? Upload your own CV and job description in the paid version.</div>
                </div>

                <div class="industry-search">
                    <input id="industrySearch" class="industry-search-input" type="text" placeholder="Search a role or type your exact job title (e.g., UX Researcher, Solutions Engineer)">
                    <button id="customJobBtn" class="industry-search-btn" disabled>Use this job</button>
                    <p id="industrySearchHint" class="industry-search-hint">Type your exact job title to generate a custom demo scenario.</p>
                </div>
            </div>
        `;
    }

    setupIndustrySearch() {
        const searchInput = document.getElementById('industrySearch');
        const customJobBtn = document.getElementById('customJobBtn');
        const searchHint = document.getElementById('industrySearchHint');

        if (!searchInput || !customJobBtn) return;

        const updateHint = (message) => {
            if (searchHint) {
                searchHint.textContent = message;
            }
        };

        const applyFilter = () => {
            const query = searchInput.value.trim().toLowerCase();
            const cards = document.querySelectorAll('.industry-card');
            const categories = document.querySelectorAll('.category-section');

            if (cards.length > 0) {
                let visibleCount = 0;

                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    const matches = !query || text.includes(query);
                    card.classList.toggle('hidden', !matches);
                    if (matches) visibleCount += 1;
                });

                categories.forEach(section => {
                    const hasVisibleCard = section.querySelector('.industry-card:not(.hidden)');
                    section.classList.toggle('hidden', !hasVisibleCard);
                });

                if (!query) {
                    updateHint('Type to filter the list. If you don\'t see your role, use this search to generate a custom demo.');
                } else if (visibleCount === 0) {
                    updateHint('No exact matches. Click "Use this job" to generate a custom demo scenario.');
                } else {
                    updateHint(`Showing ${visibleCount} match${visibleCount === 1 ? '' : 'es'}. You can also create a custom scenario with this job title.`);
                }
            } else {
                if (!query) {
                    updateHint('Type your exact job title to generate a custom demo scenario.');
                } else {
                    updateHint('Press Enter or click "Use this job" to generate a custom demo scenario.');
                }
            }

            customJobBtn.disabled = query.length < 2;
        };

        searchInput.addEventListener('input', applyFilter);
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    this.selectCustomJob(query);
                }
            }
        });

        customJobBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                this.selectCustomJob(query);
            }
        });

        applyFilter();
    }

    setupJobTitleInput() {
        const jobTitleInput = document.getElementById('currentRole');
        const suggestionsEl = document.getElementById('jobTitleSuggestions');
        const correctionEl = document.getElementById('jobTitleCorrection');

        if (!jobTitleInput) return;

        const clearCorrection = () => {
            if (correctionEl) {
                correctionEl.style.display = 'none';
                correctionEl.textContent = '';
            }
        };

        const hideSuggestions = () => {
            if (suggestionsEl) {
                suggestionsEl.style.display = 'none';
                suggestionsEl.innerHTML = '';
            }
        };

        const renderSuggestions = (items) => {
            if (!suggestionsEl) return;
            if (!items.length) {
                hideSuggestions();
                return;
            }

            const header = `
                <div class="job-title-suggestions-header">
                    You can keep your title or choose one of the suggestions below.
                </div>
            `;

            suggestionsEl.innerHTML = header + items.map((title) => {
                const isExact = this.normalizeJobTitle(title) === this.normalizeJobTitle(jobTitleInput.value);
                const hint = isExact ? 'Exact match' : 'Suggested';
                return `
                    <button type="button" class="job-title-suggestion" data-value="${this.escapeHtml(title)}">
                        <span>${this.escapeHtml(title)}</span>
                        <span class="job-title-suggestion-hint">${hint}</span>
                    </button>
                `;
            }).join('');
            suggestionsEl.style.display = 'block';
        };

        const applyTitle = async (options = {}) => {
            const title = jobTitleInput.value.trim();
            if (title.length < 2) return;
            const allowCorrection = options.allowCorrection === true;

            let correction = null;
            if (this.normalizeJobTitle(this.jobTitleLastQuery) === this.normalizeJobTitle(title)) {
                correction = this.jobTitleLastCorrection;
            } else {
                const result = await this.fetchJobTitleSuggestions(title);
                if (result) {
                    this.jobTitleLastQuery = title;
                    this.jobTitleLastCorrection = result.correctedTitle;
                    if (!options.suppressSuggestions) {
                        renderSuggestions(result.suggestions);
                    } else {
                        hideSuggestions();
                    }
                    correction = result.correctedTitle;
                }
            }

            if (correction && this.normalizeJobTitle(correction) !== this.normalizeJobTitle(title)) {
                if (correctionEl) {
                    correctionEl.textContent = `Suggested: "${correction}".`;
                    correctionEl.style.display = 'block';
                }
                if (allowCorrection) {
                    jobTitleInput.value = correction;
                    this.setPendingJobTitle(correction);
                } else {
                    this.setPendingJobTitle(title);
                }
                return;
            }

            this.setPendingJobTitle(title);
        };

        jobTitleInput.addEventListener('input', this.debounce(async () => {
            clearCorrection();
            const query = jobTitleInput.value.trim();
            if (query.length < 2) {
                hideSuggestions();
                this.jobTitleLastQuery = '';
                this.jobTitleLastCorrection = null;
                return;
            }

            const result = await this.fetchJobTitleSuggestions(query);
            if (!result) return;
            if (jobTitleInput.value.trim() !== query) return;

            this.jobTitleLastQuery = query;
            this.jobTitleLastCorrection = result.correctedTitle;
            renderSuggestions(result.suggestions);
        }, 250));

        jobTitleInput.addEventListener('focus', () => {
            const query = jobTitleInput.value.trim();
            if (query.length >= 2) {
                this.fetchJobTitleSuggestions(query).then((result) => {
                    if (!result) return;
                    if (jobTitleInput.value.trim() !== query) return;
                    this.jobTitleLastQuery = query;
                    this.jobTitleLastCorrection = result.correctedTitle;
                    renderSuggestions(result.suggestions);
                });
            }
        });

        jobTitleInput.addEventListener('click', () => {
            const query = jobTitleInput.value.trim();
            if (query.length >= 2) {
                this.fetchJobTitleSuggestions(query).then((result) => {
                    if (!result) return;
                    if (jobTitleInput.value.trim() !== query) return;
                    this.jobTitleLastQuery = query;
                    this.jobTitleLastCorrection = result.correctedTitle;
                    renderSuggestions(result.suggestions);
                });
            }
        });

        jobTitleInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                hideSuggestions();
                void applyTitle({ suppressSuggestions: true });
            }
        });

        jobTitleInput.addEventListener('blur', () => {
            setTimeout(() => {
                hideSuggestions();
                void applyTitle({ suppressSuggestions: true, allowCorrection: false });
            }, 120);
        });

        if (suggestionsEl) {
            suggestionsEl.addEventListener('click', (event) => {
                const target = event.target.closest('.job-title-suggestion');
                if (!target) return;
                const value = target.getAttribute('data-value');
                if (value) {
                    jobTitleInput.value = value;
                    clearCorrection();
                    hideSuggestions();
                    void applyTitle({ suppressSuggestions: true, allowCorrection: false });
                }
            });
        }

        document.addEventListener('click', (event) => {
            if (!suggestionsEl) return;
            if (!jobTitleInput.contains(event.target) && !suggestionsEl.contains(event.target)) {
                hideSuggestions();
            }
        });

    }
    
    normalizeJobTitle(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    validateJobTitleInput(jobTitle) {
        const trimmed = String(jobTitle || '').trim();
        if (!trimmed) {
            return { isValid: false, message: 'Please enter the job title you want to practice for.' };
        }

        const lower = trimmed.toLowerCase();
        const blockedPhrases = [
            'visa interview',
            'looking for',
            'seeking',
            'going to',
            'plan to',
            'want to',
            "i'm",
            'i am',
            'i want',
            'study',
            'studying',
            'msc',
            'mba',
            'phd',
            'bsc',
            'university',
            'college',
            'bootcamp',
            'course',
            'certification',
            'diploma'
        ];

        if (blockedPhrases.some(phrase => lower.includes(phrase))) {
            return {
                isValid: false,
                message: 'Please enter a real job title (e.g., Software Engineer, Customer Success Manager), not a goal or event.'
            };
        }

        if (/[<>@]/.test(trimmed) || /https?:\/\//i.test(trimmed)) {
            return {
                isValid: false,
                message: 'Please enter a job title only (no emails, links, or extra text).'
            };
        }

        const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
        if (wordCount > 8) {
            return {
                isValid: false,
                message: 'Please shorten this to just the job title (e.g., Product Manager).'
            };
        }

        if (/,/.test(trimmed) && wordCount > 4) {
            return {
                isValid: false,
                message: 'Please enter only the job title, without locations or extra details.'
            };
        }

        return { isValid: true, message: '' };
    }

    setQuestionTypeForRoleTitle(jobTitle) {
        if (!this.questionTypeSelect || !jobTitle) return;

        const family = this.inferJobFamily(jobTitle);
        const familyMap = {
            tech: 'technical',
            management: 'leadership',
            sales: 'situational',
            marketing: 'behavioral',
            design: 'behavioral',
            finance: 'technical',
            healthcare: 'situational',
            legal: 'situational',
            education: 'behavioral',
            general: 'mixed'
        };

        const desired = familyMap[family] || 'mixed';
        const options = Array.from(this.questionTypeSelect.options || []).map(option => option.value);
        const resolved = options.includes(desired) ? desired : (options[0] || 'mixed');
        this.questionTypeSelect.value = resolved;
        this.questionTypeSelect.dataset.locked = resolved; // used by the onchange lock
    }

    async fetchJobTitleSuggestions(query) {
        if (!query || query.trim().length < 2) {
            return { suggestions: [], correctedTitle: null };
        }

        if (this.jobTitleSuggestionAbort) {
            this.jobTitleSuggestionAbort.abort();
        }

        const controller = new AbortController();
        this.jobTitleSuggestionAbort = controller;

        try {
            const response = await fetch('/api/ai/job-title-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query }),
                signal: controller.signal
            });

            if (!response.ok) {
                return { suggestions: [], correctedTitle: null };
            }

            const data = await response.json();
            const suggestions = Array.isArray(data.suggestions)
                ? data.suggestions.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6)
                : [];
            const correctedTitle = typeof data.correctedTitle === 'string' && data.correctedTitle.trim()
                ? data.correctedTitle.trim()
                : null;

            return { suggestions, correctedTitle };
        } catch (error) {
            if (error && error.name === 'AbortError') {
                return null;
            }
            console.error('Job title suggestions error:', error);
            return { suggestions: [], correctedTitle: null };
        }
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async recordTesterJobTitle(jobTitle, metadata = {}) {
        const normalized = this.normalizeJobTitle(jobTitle);
        if (!normalized || normalized === this.lastRecordedJobTitle) {
            return;
        }

        try {
            // Guests use plain fetch (no auth token); authenticated users use authManager
            const headers = { 'Content-Type': 'application/json' };
            if (!this.isGuest) {
                const token = localStorage.getItem('authToken');
                if (token) headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/tester/job-title', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jobTitle: jobTitle.trim(),
                    difficultyLevel: metadata.difficultyLevel,
                    questionType: metadata.questionType,
                    language: metadata.language,
                    additionalInfo: metadata.additionalInfo,
                    ...(this.isGuest && this.guestId ? { guestId: this.guestId } : {})
                })
            });

            if (response.ok) {
                this.lastRecordedJobTitle = normalized;
            }
        } catch (error) {
            console.warn('Failed to record tester job title:', error);
        }
    }

    async selectIndustry(industry) {
        console.log('selectIndustry called with:', industry);
        this.selectedIndustry = industry;
        this.testData = await this.getTestDataForIndustry(industry);
        console.log('Test data loaded:', this.testData ? 'Yes' : 'No');
        
        if (!this.testData) {
            console.warn('No test data found for industry, falling back to custom job:', industry);
            await this.selectCustomJob(industry);
            return;
        }

        this.customJobTitle = null;

        // Set predefined data
        this.resumeContent = this.testData.resume;
        this.jobDescription = this.testData.jobDescription;
        this.demoProfileReady = true;
        console.log('Resume and job description set');
        
        // Load the practice interface with test restrictions
        console.log('Loading test practice interface...');
        try {
            await this.loadTestPracticeInterface();
            console.log('Test practice interface loaded successfully');
        } catch (error) {
            console.error('Error loading test practice interface:', error);
        }
    }

    async updateDemoFromJobTitle(jobTitle) {
        const trimmedTitle = String(jobTitle || '').trim();
        if (!trimmedTitle) return;

        const validation = this.validateJobTitleInput(trimmedTitle);
        if (!validation.isValid) {
            this.highlightJobTitleField();
            this.showJobTitleRequiredModal({
                title: 'Enter a Job Title',
                message: validation.message
            });
            return;
        }

        const safeTitle = trimmedTitle.slice(0, 80);
        this.customJobTitle = safeTitle;
        this.selectedIndustry = 'custom';
        try {
            this.testData = await this.getTestDataForRoleTitle(safeTitle);
        } catch (error) {
            console.warn('Failed to generate AI demo profile for role title:', error);
            this.showError('Could not generate a demo profile. Please try again.');
            return;
        }
        // finishDemoProfileLoad() (called in the finally above) reset the button before
        // demoProfileReady was set — re-enter loading state immediately so there's no flash
        this.setStartButtonLoading(true);

        if (this.testData) {
            this.testData.name = safeTitle;
        }
        this.resumeContent = this.testData.resume;
        this.jobDescription = this.testData.jobDescription;
        this.demoProfileReady = true;

        this.populateTestData();

        // Ask the AI what question type and focus suits this specific role
        await this.applyQuestionStrategy(safeTitle, this.jobDescription);

        // Auto-start the session immediately — no second click needed
        await this.startPracticeSession();
    }

    async selectCustomJob(jobTitle) {
        const trimmedTitle = String(jobTitle || '').trim();
        if (!trimmedTitle) return;

        const validation = this.validateJobTitleInput(trimmedTitle);
        if (!validation.isValid) {
            this.highlightJobTitleField();
            this.showJobTitleRequiredModal({
                title: 'Enter a Job Title',
                message: validation.message
            });
            return;
        }

        const safeTitle = trimmedTitle.slice(0, 80);
        this.customJobTitle = safeTitle;
        this.selectedIndustry = 'custom';
        try {
            this.testData = await this.getTestDataForRoleTitle(safeTitle);
        } catch (error) {
            console.warn('Failed to generate AI demo profile for role title:', error);
            this.showError('Could not generate a demo profile. Please try again.');
            return;
        }
        if (this.testData) {
            this.testData.name = safeTitle;
        }
        this.resumeContent = this.testData.resume;
        this.jobDescription = this.testData.jobDescription;
        this.demoProfileReady = true;

        // Ask the AI what question type and focus suits this specific role
        await this.applyQuestionStrategy(safeTitle, this.jobDescription);

        try {
            await this.loadTestPracticeInterface();
        } catch (error) {
            console.error('Error loading custom test practice interface:', error);
        }
    }

    buildCustomTestData(jobTitle) {
        const family = this.inferJobFamily(jobTitle);
        const domain = this.inferJobDomain(jobTitle);
        const companyName = 'Sample Company';
        const familyLabels = {
            tech: 'Technology',
            management: 'Management',
            sales: 'Sales',
            marketing: 'Marketing',
            design: 'Design',
            finance: 'Finance',
            healthcare: 'Healthcare',
            legal: 'Legal',
            education: 'Education',
            general: 'Custom'
        };

        const domainProfiles = {
            chemical: {
                label: 'Chemical Engineering',
                skills: ['Process simulation (Aspen HYSYS/Plus)', 'Mass and energy balances', 'Reaction kinetics', 'Separation processes', 'P&ID development', 'Process safety (HAZOP)', 'Heat and mass transfer'],
                responsibilities: [
                    'Design and optimize unit operations such as reactors, distillation columns, and heat exchangers.',
                    'Build process models to improve yield, energy efficiency, and throughput.',
                    'Troubleshoot plant upsets and propose control strategy improvements.',
                    'Lead HAZOP reviews and ensure process safety compliance.'
                ],
                requirements: [
                    'BS/MS in Chemical Engineering or related field',
                    'Hands-on experience with process simulation tools',
                    'Knowledge of process control and safety standards',
                    'Experience scaling lab results to pilot or production'
                ]
            },
            mechanical: {
                label: 'Mechanical Engineering',
                skills: ['CAD (SolidWorks/Creo)', 'FEA', 'Thermodynamics', 'Material selection', 'DFM/DFA', 'GD&T'],
                responsibilities: [
                    'Design mechanical components and assemblies for performance and manufacturability.',
                    'Run FEA to validate stress, fatigue, and thermal performance.',
                    'Collaborate with manufacturing to refine tolerances and materials.',
                    'Troubleshoot mechanical failures and iterate designs.'
                ],
                requirements: [
                    'BS in Mechanical Engineering or related field',
                    'Proficiency in CAD and simulation tools',
                    'Knowledge of manufacturing processes',
                    'Experience with test plans and validation'
                ]
            },
            electrical: {
                label: 'Electrical Engineering',
                skills: ['Circuit design', 'PCB layout', 'Power systems', 'Embedded systems', 'Signal integrity', 'Test instrumentation'],
                responsibilities: [
                    'Design and test analog/digital circuits for reliability and performance.',
                    'Develop PCB layouts and review for manufacturability.',
                    'Troubleshoot hardware issues using lab instruments.',
                    'Collaborate with firmware teams on board bring-up.'
                ],
                requirements: [
                    'BS in Electrical Engineering or related field',
                    'Experience with PCB design tools',
                    'Understanding of power electronics and EMI/EMC',
                    'Hands-on lab testing experience'
                ]
            },
            civil: {
                label: 'Civil Engineering',
                skills: ['Structural analysis', 'AutoCAD/Civil 3D', 'Materials testing', 'Construction documentation', 'Building codes'],
                responsibilities: [
                    'Develop structural designs and calculations for compliance and safety.',
                    'Prepare construction drawings and specifications.',
                    'Coordinate with architects and contractors on site constraints.',
                    'Review materials testing and inspection reports.'
                ],
                requirements: [
                    'BS in Civil Engineering or related field',
                    'Familiarity with relevant building codes',
                    'Experience with structural analysis software',
                    'Ability to review site and survey data'
                ]
            },
            industrial: {
                label: 'Industrial Engineering',
                skills: ['Process mapping', 'Lean/Six Sigma', 'Capacity planning', 'Root cause analysis', 'Operations analytics'],
                responsibilities: [
                    'Analyze workflows to reduce cycle time and waste.',
                    'Design process improvements using lean methodologies.',
                    'Model capacity and throughput for production planning.',
                    'Lead root cause investigations for quality issues.'
                ],
                requirements: [
                    'BS in Industrial Engineering or related field',
                    'Lean/Six Sigma experience',
                    'Comfort with data analysis tools',
                    'Experience in manufacturing or operations'
                ]
            }
        };

        const familySkills = {
            tech: ['JavaScript', 'Python', 'APIs', 'Cloud platforms', 'System design'],
            management: ['Roadmapping', 'Stakeholder management', 'Agile delivery', 'Risk management', 'Leadership'],
            sales: ['Pipeline management', 'Negotiation', 'CRM', 'Outbound outreach', 'Account strategy'],
            marketing: ['Campaign strategy', 'SEO/SEM', 'Content planning', 'Analytics', 'Brand positioning'],
            design: ['User research', 'Wireframing', 'Prototyping', 'Design systems', 'Usability testing'],
            finance: ['Financial modeling', 'Forecasting', 'Excel', 'Variance analysis', 'Reporting'],
            healthcare: ['Patient care', 'Compliance', 'Care coordination', 'Quality standards'],
            legal: ['Contract review', 'Regulatory compliance', 'Risk assessment', 'Legal research', 'Client advisory'],
            education: ['Curriculum design', 'Instruction', 'Assessment', 'Student engagement', 'Learning outcomes'],
            general: ['Communication', 'Problem solving', 'Cross-functional collaboration', 'Project coordination', 'Adaptability']
        };

        const familyResponsibilities = {
            tech: [
                'Build and maintain reliable software features aligned to business goals.',
                'Collaborate with product and design partners to deliver user-focused solutions.',
                'Improve performance, security, and scalability of existing systems.'
            ],
            management: [
                'Define project goals, scope, and timelines with cross-functional teams.',
                'Track progress, mitigate risks, and communicate updates to stakeholders.',
                'Drive alignment across teams to deliver measurable outcomes.'
            ],
            sales: [
                'Develop and manage a qualified sales pipeline for target accounts.',
                'Lead discovery calls, propose solutions, and negotiate contracts.',
                'Partner with customer success to ensure smooth handoffs.'
            ],
            marketing: [
                'Plan and execute multi-channel campaigns tied to growth goals.',
                'Analyze performance data and optimize messaging and channels.',
                'Collaborate with sales and product to refine positioning.'
            ],
            design: [
                'Translate user needs into intuitive flows and interfaces.',
                'Run research sessions and synthesize insights into design decisions.',
                'Partner with engineering to deliver high-quality experiences.'
            ],
            finance: [
                'Build models to forecast revenue, expenses, and performance.',
                'Prepare reports and insights for business leaders.',
                'Ensure data accuracy and support financial decision-making.'
            ],
            healthcare: [
                'Deliver patient-centered care and maintain accurate documentation.',
                'Coordinate with clinical teams to improve outcomes.',
                'Ensure compliance with healthcare policies and regulations.'
            ],
            legal: [
                'Review contracts and advise on legal risk.',
                'Support compliance initiatives and regulatory research.',
                'Communicate legal guidance to business stakeholders.'
            ],
            education: [
                'Design and deliver instruction aligned to learning outcomes.',
                'Assess progress and adapt materials for different learners.',
                'Collaborate with peers to improve curriculum quality.'
            ],
            general: [
                'Own key responsibilities and deliver high-quality outcomes.',
                'Collaborate with teammates to solve complex problems.',
                'Continuously improve processes and performance.'
            ]
        };

        const familyRequirements = {
            tech: ['Experience shipping production software', 'Strong debugging skills', 'Comfort with modern tooling'],
            management: ['Experience leading projects or programs', 'Strong communication skills', 'Ability to manage ambiguity'],
            sales: ['Proven track record meeting targets', 'Strong negotiation skills', 'Customer-first mindset'],
            marketing: ['Experience with analytics and experimentation', 'Strong storytelling skills', 'Channel expertise'],
            design: ['Portfolio of shipped design work', 'User-centered mindset', 'Collaboration with engineering'],
            finance: ['Advanced Excel skills', 'Experience with reporting and analysis', 'Attention to detail'],
            healthcare: ['Relevant certification or training', 'Patient-first approach', 'Comfort in fast-paced environments'],
            legal: ['Knowledge of relevant regulations', 'Strong writing and research', 'Attention to detail'],
            education: ['Teaching or training experience', 'Ability to adapt instruction', 'Strong communication'],
            general: ['Relevant experience in the field', 'Strong communication skills', 'Team-oriented mindset']
        };

        const profile = domainProfiles[domain] || null;
        const skillsList = profile?.skills || familySkills[family] || familySkills.general;
        const responsibilitiesList = profile?.responsibilities || familyResponsibilities[family] || familyResponsibilities.general;
        const requirementsList = profile?.requirements || familyRequirements[family] || familyRequirements.general;

        const skills = skillsList.join(', ');
        const responsibilities = responsibilitiesList.map(item => `- ${item}`).join('\n');
        const requirements = requirementsList.map(item => `- ${item}`).join('\n');

        const resume = `Alex Morgan
${jobTitle}
Email: alex.morgan@email.com | Phone: (555) 555-0199

Summary:
Professional with 3+ years of experience in ${jobTitle.toLowerCase()} responsibilities, focused on delivering measurable results and collaborating across teams.

Experience:
${jobTitle} | ${companyName} | 2021-2024
- Led core initiatives related to the ${jobTitle} role and delivered on key objectives.
- Partnered with cross-functional teams to improve processes and outcomes.
- Contributed to high-impact projects with a focus on quality and execution.

Skills:
- ${skills}`;

        const jobDescription = `${jobTitle} - ${companyName}

We are seeking a ${jobTitle} to join our team and help drive meaningful outcomes.

Responsibilities:
${responsibilities}

Requirements:
${requirements}

Nice to have:
- Experience working in cross-functional teams
- Strong communication and problem-solving skills`;

        return {
            name: jobTitle,
            resume,
            jobDescription,
            companyName,
            detectedIndustry: profile?.label || familyLabels[family] || 'Custom'
        };
    }

    inferJobDomain(jobTitle) {
        const lower = jobTitle.toLowerCase();
        if (lower.includes('chemical')) return 'chemical';
        if (lower.includes('mechanical')) return 'mechanical';
        if (lower.includes('electrical') || lower.includes('electronics')) return 'electrical';
        if (lower.includes('civil')) return 'civil';
        if (lower.includes('industrial')) return 'industrial';
        return null;
    }

    inferJobFamily(jobTitle) {
        const lower = jobTitle.toLowerCase();
        if (/(engineer|developer|software|data|ml|ai|devops|backend|frontend|full stack|sre|architect)/.test(lower)) return 'tech';
        if (/(product|project|program|manager|operations|pm|scrum|delivery|director|lead)/.test(lower)) return 'management';
        if (/(sales|account|bd|business development|customer success|account executive|salesforce)/.test(lower)) return 'sales';
        if (/(marketing|growth|seo|content|brand|social|demand gen)/.test(lower)) return 'marketing';
        if (/(design|ux|ui|product designer|graphic|visual|researcher)/.test(lower)) return 'design';
        if (/(finance|analyst|accounting|auditor|controller|fp&a)/.test(lower)) return 'finance';
        if (/(nurse|doctor|clinical|medical|health|therapist)/.test(lower)) return 'healthcare';
        if (/(legal|attorney|law|paralegal|compliance)/.test(lower)) return 'legal';
        if (/(teacher|education|professor|instructor|curriculum|trainer)/.test(lower)) return 'education';
        return 'general';
    }

    async applyQuestionStrategy(jobTitle, jobDescription) {
        try {
            const response = await fetch('/api/ai/question-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobTitle, jobDescription })
            });
            if (!response.ok) return;
            const data = await response.json();
            if (!data.success) return;

            // Set question type select to AI-chosen type
            if (this.questionTypeSelect && data.questionType) {
                const options = Array.from(this.questionTypeSelect.options).map(o => o.value);
                if (options.includes(data.questionType)) {
                    this.questionTypeSelect.value = data.questionType;
                    this.questionTypeSelect.dataset.locked = data.questionType;
                }
            }

            // Set additionalInfo to AI-written focus instruction
            const additionalInfoInput = document.getElementById('additionalInfo');
            if (additionalInfoInput && data.focusInstruction) {
                additionalInfoInput.value = data.focusInstruction;
            }
        } catch (e) {
            // Non-fatal — session continues with whatever defaults are set
            console.warn('Could not fetch question strategy:', e);
        }
    }

    async getTestDataForIndustry(industry) {
        if (!industry) return null;
        if (!this.testDataCache) {
            this.testDataCache = new Map();
        }
        if (this.testDataCache.has(industry)) {
            return this.testDataCache.get(industry);
        }

        try {
            this.beginDemoProfileLoad();
            const request = (typeof authManager !== 'undefined' && authManager && typeof authManager.apiRequest === 'function')
                ? authManager.apiRequest.bind(authManager)
                : fetch;

            const response = await request('/api/tester/demo-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    industry: industry,
                    experienceYears: '3'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate demo profile (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            if (data && data.resume && data.jobDescription) {
                this.testDataCache.set(industry, data);
                return data;
            }
        } catch (error) {
            console.warn('AI demo profile generation failed, using fallback:', error);
        } finally {
            this.finishDemoProfileLoad();
        }

        const fallback = this.buildFallbackDemoProfile(industry);
        this.testDataCache.set(industry, fallback);
        return fallback;
    }

    async getTestDataForRoleTitle(roleTitle) {
        if (!roleTitle) return null;
        if (!this.testRoleCache) {
            this.testRoleCache = new Map();
        }
        const cacheKey = this.normalizeJobTitle(roleTitle) || roleTitle.toLowerCase();
        if (this.testRoleCache.has(cacheKey)) {
            return this.testRoleCache.get(cacheKey);
        }

        this.beginDemoProfileLoad();
        const request = (typeof authManager !== 'undefined' && authManager && typeof authManager.apiRequest === 'function')
            ? authManager.apiRequest.bind(authManager)
            : fetch;

        try {
            const response = await request('/api/tester/demo-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roleTitle: roleTitle,
                    experienceYears: '3'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate demo profile (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            if (data && data.resume && data.jobDescription) {
                this.testRoleCache.set(cacheKey, data);
                return data;
            }

            throw new Error('Invalid demo profile response');
        } finally {
            this.finishDemoProfileLoad();
        }
    }

    beginDemoProfileLoad() {
        this.demoProfileLoadCount = (this.demoProfileLoadCount || 0) + 1;
        this.setStartButtonLoading(true);
        this.setFieldLoading(true);
    }

    finishDemoProfileLoad() {
        this.demoProfileLoadCount = Math.max(0, (this.demoProfileLoadCount || 1) - 1);
        if (this.demoProfileLoadCount === 0) {
            this.setStartButtonLoading(false);
            this.setFieldLoading(false);
        }
    }

    setStartButtonLoading(isLoading) {
        if (!this.startPracticeBtn) return;
        this.startPracticeBtn.disabled = !!isLoading;
        if (isLoading) {
            if (!this.startPracticeBtn.dataset.originalLabel) {
                this.startPracticeBtn.dataset.originalLabel = this.startPracticeBtn.innerHTML;
            }
            this.startPracticeBtn.classList.add('is-loading');
            this.startPracticeBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span id="loadingBtnText">Preparing your interview</span><span id="loadingDots"></span>';
            let dotCount = 0;
            this._dotsInterval = setInterval(() => {
                dotCount = (dotCount % 3) + 1;
                const el = document.getElementById('loadingDots');
                if (el) el.textContent = '.'.repeat(dotCount);
                else clearInterval(this._dotsInterval);
            }, 400);
            this.startPracticeBtn.setAttribute('aria-busy', 'true');
        } else {
            if (this._dotsInterval) { clearInterval(this._dotsInterval); this._dotsInterval = null; }
            this.startPracticeBtn.classList.remove('is-loading');
            this.startPracticeBtn.removeAttribute('aria-busy');
            this.updateStartButtonLabel();
        }
    }

    updateStartButtonLabel() {
        if (!this.startPracticeBtn || this.startPracticeBtn.classList.contains('is-loading')) return;
        const micIcon = '<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 11a7 7 0 0 0 14 0" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 18v3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 21h8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
        if (this.demoProfileReady) {
            this.startPracticeBtn.innerHTML = `${micIcon}Start Interview`;
        } else {
            this.startPracticeBtn.innerHTML = 'Generate Job Description';
        }
    }

    setFieldLoading(isLoading) {
        const setWrapperState = (wrapper, isActive) => {
            if (!wrapper) return;
            wrapper.classList.toggle('is-loading', isActive);
        };

        setWrapperState(this.jobDescriptionWrapper, isLoading);
        setWrapperState(this.additionalInfoWrapper, isLoading);

        if (this.jobDescriptionInput) {
            if (isLoading) {
                this.jobDescriptionInput.value = '';
                this.jobDescriptionInput.placeholder = 'Generating job description...';
            } else {
                this.jobDescriptionInput.placeholder = 'Job description will be loaded...';
            }
        }

        if (this.additionalInfoInput) {
            if (isLoading) {
                this.additionalInfoInput.value = '';
                this.additionalInfoInput.placeholder = 'Generating focus areas...';
            } else {
                this.additionalInfoInput.placeholder = 'Focus areas...';
            }
        }
    }

    setPendingJobTitle(jobTitle) {
        const trimmedTitle = String(jobTitle || '').trim();
        if (!trimmedTitle) return;
        const safeTitle = trimmedTitle.slice(0, 80);
        if (this.customJobTitle && this.normalizeJobTitle(this.customJobTitle) === this.normalizeJobTitle(safeTitle) && this.demoProfileReady) {
            return;
        }
        this.customJobTitle = safeTitle;
        this.selectedIndustry = 'custom';
        this.demoProfileReady = false;
        this.resumeContent = '';
        this.jobDescription = '';
        if (this.jobDescriptionInput) this.jobDescriptionInput.value = '';
        if (this.cvStatusText) {
            this.cvStatusText.textContent = 'Demo CV not generated yet';
            this.cvStatusText.className = 'status-text';
        }
        if (this.detectedRoleInput) this.detectedRoleInput.value = safeTitle;
        this.updateStartButtonLabel();
    }

    async handleStartButtonClick() {
        if (this.demoProfileReady) {
            await this.startPracticeSession();
            return;
        }

        const jobTitle = this.currentRoleInput ? this.currentRoleInput.value.trim() : '';
        if (!jobTitle) {
            this.highlightJobTitleField();
            this.showJobTitleRequiredModal();
            return;
        }

        const validation = this.validateJobTitleInput(jobTitle);
        if (!validation.isValid) {
            this.highlightJobTitleField();
            this.showJobTitleRequiredModal({
                title: 'Enter a Job Title',
                message: validation.message
            });
            return;
        }

        await this.updateDemoFromJobTitle(jobTitle);
    }

    buildFallbackDemoProfile(industry) {
        const label = String(industry || 'Professional').replace(/[_-]+/g, ' ');
        const title = label.replace(/\b\w/g, (match) => match.toUpperCase());
        const resume = `${title}\nEmail: candidate@example.com | Phone: (555) 000-0000\n\nExperience:\n${title} | Sample Company | 2021-2024\n- Delivered role-specific work with measurable impact\n- Collaborated cross-functionally to improve outcomes\n\nSkills:\n- Core tools, workflows, and problem solving`;

        const jobDescription = `${title} - Sample Company\n\nWe are seeking a ${title} to join our team and deliver high-quality results.\n\nRequirements:\n- 2-4 years of relevant experience\n- Familiarity with common tools and workflows for this role\n- Strong communication and problem-solving skills\n\nResponsibilities:\n- Execute day-to-day role-specific tasks\n- Collaborate with stakeholders to deliver outcomes\n- Improve processes and quality`;

        return {
            name: title,
            resume,
            jobDescription,
            companyName: 'Sample Company',
            detectedIndustry: title
        };
    }

    async loadTestPracticeInterface() {
        // Use the EXACT SAME container as industry selection - #app is the primary one
        let targetContainer = document.querySelector('#app');
        if (!targetContainer) {
            // Fallback to other containers if #app doesn't exist
            targetContainer = document.querySelector('#app-container, .container, main');
            if (!targetContainer) {
                targetContainer = document.body;
            }
        }
        
        console.log('Loading test practice interface in container:', targetContainer);
        console.log('Container before clear:', targetContainer.innerHTML.length, 'chars');
        
        // COMPLETELY clear the container first
        targetContainer.innerHTML = '';
        console.log('Container cleared');
        
        // Remove any industry selection styles that might interfere
        const industryStyles = document.getElementById('test-industry-selection-styles');
        if (industryStyles) {
            industryStyles.remove();
            console.log('Removed industry selection styles');
        }
        
        // Inject practice page styles
        this.injectStyles();
        console.log('Practice page styles injected');
        
        // Add the practice interface HTML
        const htmlContent = this.getHTML();
        console.log('Generated HTML length:', htmlContent.length);
        
        targetContainer.innerHTML = htmlContent;
        console.log('HTML set to container, container children count:', targetContainer.children.length);
        
        // Debug: Check if industry selection text appears in the HTML
        if (htmlContent.includes('Choose Your Test Scenario')) {
            console.error('ERROR: Practice HTML contains industry selection text!');
        } else {
            console.log('Practice HTML does not contain industry selection text');
        }
        
        // Debug: Check what's actually in the container after setting HTML
        setTimeout(() => {
            if (targetContainer.innerHTML.includes('Choose Your Test Scenario')) {
                console.error('ERROR: Container contains industry selection after HTML set!');
                console.log('Container HTML length:', targetContainer.innerHTML.length);
            } else {
                console.log('Container does not contain industry selection');
            }
        }, 100);
        
        // Make sure the container is visible
        if (targetContainer.style.display === 'none') {
            targetContainer.style.display = 'block';
        }
        
        console.log('Test practice HTML loaded, populating data...');
        
        // Populate test-specific data
        this.populateTestData();

        // Set up job title input for custom demo
        this.setupJobTitleInput();
        
        // Add upgrade tooltip handlers
        this.addUpgradeTooltipHandlers();
        
        // Initialize the practice page functionality
        console.log('Initializing practice session for test mode...');
        await this.initializePracticeSession();
        
        // Debug: Check if industry selection appears after initialization
        setTimeout(() => {
            if (targetContainer.innerHTML.includes('Choose Your Test Scenario')) {
                console.error('ERROR: Industry selection appeared after initializePracticeSession!');
            } else {
                console.log('No industry selection after initializePracticeSession');
            }
            
            // Check ALL potential containers for industry selection
            const allContainers = document.querySelectorAll('#app, #app-container, .container, .page-content');
            allContainers.forEach(container => {
                if (container !== targetContainer && container.innerHTML.includes('Choose Your Test Scenario')) {
                    console.error('ERROR: Industry selection found in different container:', container);
                    console.log('Container ID:', container.id, 'Class:', container.className);
                }
            });
        }, 200);
        
        console.log('Test practice interface fully loaded');
    }

    populateTestData() {
        // Populate role field (editable)
        const currentRoleInput = document.getElementById('currentRole');
        if (currentRoleInput) {
            const roleValue = this.customJobTitle || this.testData?.name || currentRoleInput.value || '';
            currentRoleInput.value = roleValue;
        }

        // Populate experience years (locked to 3)
        const experienceYearsInput = document.getElementById('experienceYears');
        if (experienceYearsInput) {
            experienceYearsInput.value = '3';
        }

        // Update CV status based on industry
        const cvStatusText = document.getElementById('cvStatusText');
        if (cvStatusText) {
            const industryDisplayNames = {
                'frontend': 'Frontend Developer',
                'backend': 'Backend Developer', 
                'data-science': 'Data Scientist',
                'marketing': 'Marketing Manager',
                'sales': 'Sales Executive',
                'hr': 'HR Manager',
                'finance': 'Financial Analyst',
                'product': 'Product Manager',
                'healthcare': 'Healthcare Professional'
            };
            const roleLabel = this.customJobTitle || this.testData?.name || industryDisplayNames[this.selectedIndustry];
            if (roleLabel) {
                cvStatusText.textContent = `${roleLabel} CV loaded`;
                cvStatusText.className = 'status-text loaded';
            } else {
                cvStatusText.textContent = 'Demo CV not generated yet';
                cvStatusText.className = 'status-text';
            }
        }

        // Update job description with industry-specific content
        const jobDescriptionInput = document.getElementById('jobDescription');
        if (jobDescriptionInput) {
            jobDescriptionInput.value = this.jobDescription || '';
        }

        // Additional info is set by applyQuestionStrategy() after this runs

        // Populate auto-detected fields
        const detectedRoleInput = document.getElementById('detectedRole');
        const detectedCompanyInput = document.getElementById('detectedCompany');
        const detectedIndustryInput = document.getElementById('detectedIndustry');
        
        if (detectedRoleInput) detectedRoleInput.value = this.customJobTitle || this.testData?.name || '';
        if (detectedCompanyInput) {
            const companyNames = {
                'frontend': 'TechForward Inc.',
                'backend': 'CloudScale Systems',
                'data-science': 'DataVision Analytics',
                'marketing': 'BrandBoost Solutions',
                'sales': 'Enterprise Solutions',
                'hr': 'PeopleFirst Corporation',
                'finance': 'Finance Solutions Inc.',
                'product': 'TechInnovate',
                'healthcare': 'Regional Healthcare System'
            };
            let companyValue = '';
            if (this.testData?.companyName) {
                companyValue = this.testData.companyName;
            } else if (this.selectedIndustry && companyNames[this.selectedIndustry]) {
                companyValue = companyNames[this.selectedIndustry];
            }
            detectedCompanyInput.value = companyValue;
        }
        if (detectedIndustryInput) {
            detectedIndustryInput.value = this.testData?.detectedIndustry || (this.selectedIndustry === 'custom' ? '' : (this.selectedIndustry || ''));
        }
    }

    addUpgradeTooltipHandlers() {
        // Add global function for upgrade tooltips
        window.showUpgradeMessage = function(element) {
            const tooltip = element.parentElement.querySelector('.upgrade-tooltip');
            if (tooltip) {
                tooltip.style.display = 'block';
                setTimeout(() => {
                    tooltip.style.display = 'none';
                }, 3000);
            }
        };

        // Add hover handlers for locked elements
        const lockedElements = document.querySelectorAll('.test-locked');
        lockedElements.forEach(element => {
            element.addEventListener('mouseenter', function() {
                const tooltip = this.parentElement.querySelector('.upgrade-tooltip');
                if (tooltip) {
                    tooltip.style.display = 'block';
                }
            });

            element.addEventListener('mouseleave', function() {
                const tooltip = this.parentElement.querySelector('.upgrade-tooltip');
                if (tooltip) {
                    tooltip.style.display = 'none';
                }
            });
        });
    }

    getQuestionTypesConfig() {
        // Try to use centralized config if available
        if (typeof window !== 'undefined' && window.QuestionTypesConfig) {
            const { ALL_QUESTION_TYPES, QUESTION_TYPE_LABELS } = window.QuestionTypesConfig;
            
            // Build question types array with Mixed at the start
            const questionTypes = [{ value: 'mixed', label: 'Mixed Questions' }];
            
            ALL_QUESTION_TYPES.forEach(type => {
                questionTypes.push({
                    value: type,
                    label: QUESTION_TYPE_LABELS[type] || this.formatQuestionType(type)
                });
            });
            
            return questionTypes;
        }
        
        // Fallback to hardcoded configuration if centralized config not available
        return [
            { value: 'mixed', label: 'Mixed Questions' },
            { value: 'behavioral', label: 'Behavioral' },
            { value: 'technical', label: 'Technical' },
            { value: 'situational', label: 'Situational' },
            { value: 'competency', label: 'Competency-based' },
            { value: 'leadership', label: 'Leadership & Management' },
            { value: 'problem-solving', label: 'Problem Solving' },
            { value: 'creativity', label: 'Creativity & Innovation' },
            { value: 'conflict', label: 'Conflict Resolution' },
            { value: 'motivation', label: 'Motivation & Values' },
            { value: 'culture', label: 'Culture Fit' },
            { value: 'growth', label: 'Growth & Learning' },
            { value: 'stress', label: 'Stress Management' },
            { value: 'communication', label: 'Communication Skills' },
            { value: 'time-management', label: 'Time Management' },
            { value: 'teamwork', label: 'Teamwork & Collaboration' },
            { value: 'interview-essentials', label: 'Interview Essentials' },
            { value: 'adaptability', label: 'Adaptability & Change' },
            { value: 'customer-focus', label: 'Customer Focus' },
            { value: 'ethics', label: 'Ethics & Integrity' },
            { value: 'salary', label: 'Salary Negotiation' }
        ];
    }

    // Get the CSS styles for this page (copied exactly from ai-interviewer.html)
    getStyles() {
        return `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

        :root {
            --mint: #a7f3d0;
            --sky: #bae6fd;
            --sun: #fde68a;
            --peach: #fdba74;
            --lilac: #e9d5ff;
            --ink: #1f2937;
            --muted: #64748b;
            --card: #ffffff;
            --shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        }

        body {
            background:
                radial-gradient(900px 520px at 12% -15%, #fef9c3 0%, rgba(254, 249, 195, 0) 55%),
                radial-gradient(900px 520px at 92% -5%, #bae6fd 0%, rgba(186, 230, 253, 0) 55%),
                linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%);
            min-height: 100vh;
            font-family: "Nunito", "Segoe UI", sans-serif;
            color: var(--ink);
            letter-spacing: 0.01em;
        }

        .ai-interviewer-container {
            max-width: 1080px;
            margin: 0 auto;
            padding: 24px;
        }

        .practice-header {
            background: linear-gradient(135deg, #e0f2fe 0%, #fef9c3 55%, #dcfce7 100%);
            color: var(--ink);
            padding: 28px;
            border-radius: 28px;
            margin-bottom: 24px;
            text-align: left;
            box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.9);
        }

        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            flex-wrap: wrap;
        }

        .header-text {
            flex: 1;
            min-width: 220px;
        }

        .practice-header h1 {
            margin: 0;
            font-size: 2.2em;
            letter-spacing: -0.02em;
        }

        .practice-header p {
            margin: 8px 0 0 0;
            color: #475569;
        }

        .setup-panel {
            background: transparent;
            border-radius: 24px;
            padding: 0;
            margin-bottom: 30px;
            border: none;
            box-shadow: none;
        }

        .setup-panel > .helper-text {
            margin: 0 0 18px 0;
            font-size: 1em;
        }

        .upload-section {
            margin-bottom: 18px;
            padding: 22px 24px;
            border-radius: 24px;
            background: var(--card);
            border: 1px solid rgba(226, 232, 240, 0.6);
            box-shadow: var(--shadow);
        }

        .upload-section:last-child {
            margin-bottom: 24px;
        }

        .upload-section.job-title-section {
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            border: 2px solid rgba(125, 211, 252, 0.7);
            box-shadow: 0 20px 36px rgba(14, 165, 233, 0.15);
        }

        .section-header {
            display: flex;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }

        .required-pill {
            font-size: 12px;
            font-weight: 700;
            color: #7c2d12;
            background: linear-gradient(135deg, #fde68a 0%, #fdba74 100%);
            padding: 4px 12px;
            border-radius: 999px;
            transform: translateY(-2px);
        }

        .helper-text {
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 0.95em;
            line-height: 1.6;
        }

        .helper-text.muted {
            color: #94a3b8;
        }

        .job-title-field {
            position: relative;
        }

        .job-title-input {
            border: 1px solid rgba(125, 211, 252, 0.8) !important;
        }

        .job-title-input:focus {
            border-color: #38bdf8 !important;
            box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.22);
        }

        .job-title-suggestions {
            margin-top: 10px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            box-shadow: 0 16px 26px rgba(15, 23, 42, 0.12);
            overflow: hidden;
        }

        .job-title-suggestions-header {
            padding: 12px 16px;
            font-size: 13px;
            color: #475569;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }

        .job-title-suggestion {
            width: 100%;
            text-align: left;
            padding: 12px 16px;
            border: none;
            background: white;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .job-title-suggestion:hover,
        .job-title-suggestion.active {
            background: #f0fdf4;
        }

        .job-title-suggestion-hint {
            font-size: 12px;
            color: #0ea5e9;
        }

        .job-title-correction {
            margin-top: 6px;
            font-size: 13px;
            color: #0ea5e9;
        }

        .interview-panel {
            display: none;
            gap: 20px;
        }

        .question-section,
        .answer-section {
            background: var(--card);
            border-radius: 24px;
            padding: 24px;
            box-shadow: var(--shadow);
            border: 1px solid rgba(226, 232, 240, 0.6);
        }

        .question-section {
            margin-bottom: 20px;
        }

        .question-text {
            font-size: 1.15em;
            color: var(--ink);
            margin-bottom: 18px;
            padding: 18px;
            background: #f0fdf4;
            border-radius: 18px;
            border: 1px solid rgba(167, 243, 208, 0.6);
        }

        .transcript-box {
            background: #f8fafc;
            border-radius: 18px;
            padding: 20px;
            min-height: 150px;
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
            font-size: 1.05em;
            border: 1px solid rgba(226, 232, 240, 0.8);
            line-height: 1.6;
            color: var(--ink) !important;
        }
        
        .transcript-box p {
            color: var(--ink) !important;
            margin: 5px 0;
        }
        
        .transcript-box strong {
            color: #0ea5e9 !important;
        }

        .feedback-section {
            display: none;
            margin-top: 26px;
            background: transparent;
            border-radius: 24px;
            padding: 0;
            box-shadow: none;
            border: none;
        }

        .feedback-section h2 {
            margin: 0 0 16px;
            font-size: 1.6em;
            color: #1f2937;
        }

        .feedback-content {
            background: transparent;
            border-radius: 0;
            padding: 0;
            border: none;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            gap: 0;
        }

        .feedback-content > * + * {
            margin-top: 24px;
        }

        .feedback-summary,
        .feedback-main,
        .feedback-tail {
            background: white;
            border-radius: 24px;
            padding: 30px;
            box-shadow: 0 18px 30px rgba(15, 23, 42, 0.1);
            border: 1px solid rgba(226, 232, 240, 0.6);
            margin-bottom: 0;
        }

        .feedback-support {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 24px;
        }

        .feedback-actions {
            margin-top: 24px;
            padding: 20px;
            background: rgba(248, 250, 252, 0.9);
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.8);
            display: flex;
            justify-content: center;
            gap: 14px;
        }

        .control-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            align-items: center;
            margin-top: 20px;
        }

        .control-buttons.left {
            justify-content: flex-start;
        }

        .control-buttons.center {
            justify-content: center;
        }

        .btn-primary {
            background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
            color: #0f172a;
            border: none;
            padding: 14px 30px;
            border-radius: 999px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            height: 54px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            vertical-align: top;
            line-height: 1;
            box-shadow: 0 14px 24px rgba(56, 189, 248, 0.25);
        }

        .btn-start {
            background: #7dd3fc;
        }

        .btn-start:hover {
            background: #38bdf8;
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 18px 28px rgba(56, 189, 248, 0.35);
        }

        .btn-primary:disabled {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
        }

        .btn-primary:disabled:hover {
            transform: none;
            box-shadow: none;
        }

        .btn-primary.is-loading {
            background: #cbd5e1;
            color: #475569;
            box-shadow: none;
            gap: 10px;
        }

        .btn-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(71, 85, 105, 0.3);
            border-top-color: #475569;
            border-radius: 50%;
            animation: btn-spin 0.8s linear infinite;
            display: inline-block;
        }

        @keyframes btn-spin {
            to {
                transform: rotate(360deg);
            }
        }

        .field-loading-wrapper {
            position: relative;
        }

        .field-loading-wrapper .field-spinner {
            position: absolute;
            top: 14px;
            right: 16px;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(71, 85, 105, 0.25);
            border-top-color: #475569;
            border-radius: 50%;
            animation: btn-spin 0.8s linear infinite;
            display: none;
            pointer-events: none;
        }

        .field-loading-wrapper.is-loading .field-spinner {
            display: inline-block;
        }

        .field-loading-wrapper.is-loading textarea {
            background: #e2e8f0;
            color: #64748b;
        }

        .btn-secondary {
            background: white;
            color: #0ea5e9;
            border: 1px solid rgba(186, 230, 253, 0.9);
            padding: 14px 28px;
            border-radius: 999px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            height: 54px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            vertical-align: top;
        }

        .btn-secondary:hover {
            background: #ecfeff;
            color: #0284c7;
            transform: translateY(-1px);
        }

        .btn-secondary:disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
        }

        .btn-secondary:disabled:hover {
            background: white;
            color: #0ea5e9;
            transform: none;
        }

        .btn-large {
            width: 100%;
            max-width: 380px;
            height: 62px;
            font-size: 18px;
            border-radius: 999px;
        }

        .btn-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
        }

        .btn-icon svg {
            width: 18px;
            height: 18px;
            stroke: currentColor;
            fill: none;
            stroke-width: 2.2;
        }

        .recording-indicator {
            display: none;
            align-items: center;
            gap: 10px;
            color: #e76f51;
            font-weight: bold;
            margin-top: 15px;
        }

        .recording-indicator.active {
            display: flex;
        }

        .recording-dot {
            width: 12px;
            height: 12px;
            background: #e76f51;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }


        .question-counter {
            background: white;
            padding: 6px 16px;
            border-radius: 999px;
            font-weight: 700;
            margin-top: 12px;
            display: inline-block;
            color: #0ea5e9;
            box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
        }

        .timer {
            font-size: 1.1em;
            color: var(--muted);
            margin-bottom: 15px;
        }

        .upload-section h3 {
            margin-bottom: 8px;
            color: #1f2937;
            font-size: 1.15em;
            font-weight: 700;
        }

        .ai-interviewer-container .upload-section label,
        .upload-section label,
        label {
            display: block !important;
            margin-bottom: 6px !important;
            font-weight: 700 !important;
            color: #334155 !important;
            font-size: 14px !important;
            opacity: 1 !important;
            visibility: visible !important;
            height: auto !important;
            width: auto !important;
            position: static !important;
        }


        .job-description-input {
            width: 100%;
            min-height: 100px;
            padding: 12px 16px;
            border: 1px solid rgba(203, 213, 225, 0.9);
            border-radius: 18px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            background: white;
        }

        .job-description-input:focus {
            outline: none;
            border-color: #7dd3fc;
            box-shadow: 0 0 0 4px rgba(125, 211, 252, 0.25);
        }

        select.job-description-input {
            height: 46px;
        }

        .upgrade-tooltip {
            background: #38bdf8 !important;
            border-radius: 999px !important;
            font-weight: 700 !important;
        }

        .cv-display {
            width: 100%;
        }

        .cv-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
            padding: 10px 14px;
            background: #f8fafc;
            border-radius: 14px;
            font-size: 14px;
        }

        .status-text {
            color: #64748b;
        }

        .status-text.loaded {
            color: #16a34a;
        }

        .status-text.error {
            color: #ef4444;
        }
        
        .status-text.no-cv {
            color: #f59e0b;
            font-weight: 600;
        }
        
        .status-text.no-cv a {
            color: #0ea5e9 !important;
            text-decoration: underline;
        }
        
        .status-text.no-cv a:hover {
            color: #0284c7 !important;
        }

        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }

        .modal-content {
            background: white;
            border-radius: 24px;
            box-shadow: 0 24px 44px rgba(15, 23, 42, 0.18);
            max-width: 480px;
            width: 90%;
            margin: 20px;
            overflow: hidden;
            animation: scaleIn 0.3s ease;
        }

        .modal-header {
            background: linear-gradient(135deg, #bae6fd 0%, #a7f3d0 100%);
            color: #0f172a;
            padding: 24px;
            text-align: center;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 1.4em;
            font-weight: 600;
        }

        .modal-body {
            padding: 32px 24px;
            text-align: center;
        }

        .modal-icon {
            font-size: 3em;
            margin-bottom: 16px;
            opacity: 0.8;
        }

        .modal-body p {
            margin: 0 0 16px 0;
            color: #4a5568;
            line-height: 1.6;
        }

        .modal-body p:last-child {
            margin-bottom: 0;
        }

        .modal-footer {
            padding: 0 24px 24px 24px;
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .modal-footer .btn {
            flex: 1;
            max-width: 140px;
            padding: 12px 20px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
        }

        .modal-footer .btn-primary {
            background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
            color: #0f172a;
        }

        .modal-footer .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 20px rgba(56, 189, 248, 0.35);
        }

        .modal-footer .btn-secondary {
            background: white;
            color: #0ea5e9;
            border: 1px solid rgba(186, 230, 253, 0.9);
        }

        .modal-footer .btn-secondary:hover {
            background: #ecfeff;
            border-color: rgba(125, 211, 252, 0.9);
        }

        #jobTitleRequiredModal .modal-content {
            max-width: 360px;
        }

        #jobTitleRequiredModal .modal-body {
            padding: 20px 20px 16px;
        }

        #jobTitleRequiredModal .modal-footer {
            padding: 0 20px 20px;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes scaleIn {
            from { 
                opacity: 0;
                transform: scale(0.9) translateY(20px);
            }
            to { 
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        /* Highlight animation for CV status section */
        .cv-status.highlight-error {
            animation: pulseError 2s ease-in-out;
            border: 2px solid #f56565 !important;
            background: rgba(254, 178, 178, 0.15) !important;
            /* Keep the existing border-radius from .cv-status (5px) */
        }

        /* Highlight animation for job description textarea */
        .job-description-input.highlight-error {
            animation: pulseError 2s ease-in-out;
            border: 2px solid #f56565 !important;
            background: rgba(254, 178, 178, 0.08) !important;
            /* Keep the existing border-radius from .job-description-input (5px) */
        }

        @keyframes pulseError {
            0% {
                box-shadow: 0 0 0 0 rgba(245, 101, 101, 0.7);
                border-color: #f56565;
            }
            50% {
                box-shadow: 0 0 0 15px rgba(245, 101, 101, 0);
                border-color: #e53e3e;
            }
            100% {
                box-shadow: 0 0 0 0 rgba(245, 101, 101, 0);
                border-color: #f56565;
            }
        }

        .btn-refresh {
            background: white;
            color: #0ea5e9;
            border: 1px solid rgba(186, 230, 253, 0.9);
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-refresh:hover {
            background: #ecfeff;
            border-color: rgba(125, 211, 252, 0.9);
        }

        .loading-spinner {
            text-align: center;
            padding: 40px;
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0ea5e9;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .score-section {
            margin: 0;
        }

        .score-box {
            background: transparent;
            border: none;
            border-radius: 0;
            padding: 6px 4px;
            text-align: center;
            box-shadow: none;
            width: 100%;
            margin: 0;
        }

        .score-meter {
            max-width: 320px;
            margin: 10px auto 0;
        }

        .score-box h3 {
            margin: 0 0 10px 0;
            font-size: 1.15em;
            color: #1f2937;
            font-weight: 700;
        }

        .score-display {
            margin: 8px 0 12px;
        }

        .score-number {
            font-size: 4em;
            font-weight: bold;
            display: block;
            line-height: 1.1;
            color: #0ea5e9;
            padding-right: 6px;
        }

        .score-max {
            font-size: 1.8em;
            color: #94a3b8;
        }

        .score-comparison {
            font-size: 0.95em;
            padding: 12px 14px;
            background: #f8fafc;
            border-radius: 14px;
            margin-top: 16px;
            color: #475569;
            border: 1px solid rgba(186, 230, 253, 0.7);
            box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06);
            display: inline-block;
            max-width: 320px;
            text-align: center;
        }

        .score-improvement {
            color: #4ade80;
        }

        .score-decline {
            color: #f87171;
        }

        .feedback-box {
            background: white;
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
            border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .strengths-box {
            border-left: none;
        }

        .improvements-box {
            border-left: none;
        }

        .better-response-box {
            border-left: none;
        }

        .tips-box {
            border-left: none;
        }

        .feedback-box h3 {
            margin: 0 0 12px 0;
            font-size: 1.1em;
            font-weight: 700;
            color: #1f2937 !important;
            display: block !important;
            visibility: visible !important;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 999px;
            background: #f1f5f9;
            border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .feedback-box-content {
            line-height: 1.7;
            color: #475569;
        }

        .strengths-box h3 {
            background: rgba(134, 239, 172, 0.35);
            border-color: rgba(134, 239, 172, 0.6);
        }

        .improvements-box h3 {
            background: rgba(253, 230, 138, 0.4);
            border-color: rgba(253, 230, 138, 0.7);
        }

        .better-response-box h3 {
            background: rgba(186, 230, 253, 0.45);
            border-color: rgba(186, 230, 253, 0.7);
        }

        .tips-box h3 {
            background: rgba(253, 186, 116, 0.35);
            border-color: rgba(253, 186, 116, 0.6);
        }

        .feedback-box-content ul {
            margin: 10px 0;
            padding-left: 20px;
        }

        .feedback-box-content li {
            margin-bottom: 5px;
        }

        .results-shell {
            display: flex;
            flex-direction: column;
            gap: 26px;
        }

        .results-summary,
        .results-main,
        .results-actions {
            background: white;
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 20px 36px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(226, 232, 240, 0.6);
        }

        .results-summary h2 {
            margin: 0 0 6px 0;
            font-size: 2.2em;
            color: #1f2937;
        }

        .results-summary p {
            margin: 0 0 18px 0;
            color: #64748b;
        }

        .score-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            flex-wrap: wrap;
        }

        .score-block {
            min-width: 180px;
        }

        .score-label {
            font-size: 0.95em;
            color: #64748b;
        }

        .score-value {
            font-size: 3em;
            font-weight: 800;
            color: #0ea5e9;
            margin: 4px 0;
        }

        .score-sub {
            color: #475569;
            font-weight: 600;
        }

        .score-meter {
            flex: 1;
            min-width: 220px;
        }

        .score-meter-track {
            width: 100%;
            height: 12px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;
        }

        .score-meter-fill {
            height: 100%;
            background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
            border-radius: 999px;
        }

        .score-meter-label {
            margin-top: 6px;
            font-size: 0.9em;
            color: #94a3b8;
        }

        .results-main h3 {
            margin: 0 0 12px 0;
            color: #1f2937;
        }

        .insights-placeholder {
            text-align: center;
            color: #64748b;
            padding: 18px;
            background: #f8fafc;
            border-radius: 16px;
            border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .results-support {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
        }

        .results-card {
            background: white;
            border-radius: 20px;
            padding: 22px;
            box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);
            border: 1px solid rgba(226, 232, 240, 0.6);
        }

        .results-card.highlight {
            background: linear-gradient(135deg, #fef9c3 0%, #ecfeff 100%);
            border-color: rgba(186, 230, 253, 0.8);
        }

        .results-card h4 {
            margin: 0 0 10px 0;
            font-size: 1.05em;
            color: #1f2937;
        }

        .results-card p {
            margin: 6px 0 0;
            color: #64748b;
            line-height: 1.6;
        }

        .results-stat {
            font-size: 2.2em;
            font-weight: 800;
            color: #0ea5e9;
        }

        .results-actions {
            text-align: center;
        }

        .results-actions .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 16px 36px;
            font-size: 18px;
            border-radius: 999px;
            box-shadow: 0 12px 20px rgba(56, 189, 248, 0.3);
            text-decoration: none;
        }

        .results-actions p {
            margin: 10px 0 0;
            color: #64748b;
        }

        .session-results {
            background: transparent;
            border-radius: 24px;
            padding: 0;
            box-shadow: none;
            border: none;
            text-align: left;
        }

        @media (max-width: 768px) {
            .feedback-boxes {
                grid-template-columns: 1fr;
            }

            .score-row {
                align-items: flex-start;
            }
            
            .ai-interviewer-container {
                padding: 15px;
            }
            
            .control-buttons {
                flex-direction: column;
                gap: 15px;
            }
            
            .btn-primary, .btn-secondary {
                width: 100%;
            }

            .feedback-actions {
                flex-direction: column;
            }
        }
        `;
    }

    // Get the HTML content for this page
    getHTML() {
        return `
        <div class="ai-interviewer-container">
            <div class="practice-header">
                <div class="header-content">
                    <div class="header-text">
                        <h1>Interview Demo</h1>
                        <p>A quick, guided preview of how the AI interview flow works.</p>
                    </div>
                </div>
                <div class="question-counter" id="questionCounter" style="display: none;">
                    Question <span id="currentQuestion">1</span> of <span id="totalQuestions">1</span>
                </div>
            </div>

            <div class="setup-panel" id="setupPanel">
                <p class="helper-text">This demo shows how the AI interviewer builds context and generates questions. The fields below are a simplified, guided preview.</p>
                
                <!-- Job Title -->
                <div class="upload-section job-title-section">
                    <div class="section-header">
                        <h3>What role are you interviewing for?</h3>
                        <span class="required-pill">Required</span>
                    </div>
                    <p class="helper-text">Enter the exact job title. We'll generate a demo resume and job description from it.</p>
                    <div class="job-title-field">
                        <div>
                            <input type="text" id="currentRole" class="job-description-input job-title-input" style="min-height: auto; height: 48px;" placeholder="e.g., Product Manager" autocomplete="off">
                        </div>
                        <div id="jobTitleSuggestions" class="job-title-suggestions" style="display: none;"></div>
                        <div id="jobTitleCorrection" class="job-title-correction" style="display: none;"></div>
                    </div>
                    <p class="helper-text muted">Suggestions appear as you type, and obvious typos will be corrected.</p>
                    <div class="control-buttons center" style="margin-top: 16px;">
                        <button id="startPractice" class="btn-primary btn-large btn-start">
                            Start Interview
                        </button>
                    </div>
                </div>

                <!-- Profile Information -->
                <div class="upload-section">
                    <h3>Your profile snapshot</h3>
                    <p class="helper-text">In the full version, this pulls from your saved profile. For this demo, it's generated from the job title above.</p>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 15px;">
                        <div style="position: relative;">
                            <label for="experienceYears" style="display: block; margin-bottom: 5px; font-weight: 600;">Years of Experience:</label>
                            <input type="text" id="experienceYears" class="job-description-input test-locked" style="min-height: auto; height: 40px; background: #f8f9fa; cursor: not-allowed;" readonly onclick="showUpgradeMessage(this)">
                            <div class="upgrade-tooltip" style="display: none; position: absolute; top: 45px; left: 0; background: #667eea; color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; white-space: nowrap; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                Unlock with paid package
                            </div>
                        </div>
                    </div>
                    <p class="helper-text muted">This demo profile is generated from your job title.</p>
                </div>

                <!-- Interview Configuration -->
                <div class="upload-section">
                    <h3>Interview settings</h3>
                    <p class="helper-text">These control difficulty, question type, and language. In the paid version, you can fully customize them.</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div style="position: relative;">
                            <label for="difficultyLevel" style="display: block; margin-bottom: 5px; font-weight: 600;">Difficulty Level:</label>
                            <select id="difficultyLevel" class="job-description-input test-locked" style="min-height: auto; height: 46px; background: #f8f9fa; cursor: not-allowed;" onchange="this.value='intermediate'; showUpgradeMessage(this); return false;">
                                <option value="entry">Entry Level</option>
                                <option value="intermediate" selected>Intermediate</option>
                                <option value="senior">Senior</option>
                                <option value="expert">Expert</option>
                            </select>
                            <div class="upgrade-tooltip" style="display: none; position: absolute; top: 70px; left: 0; background: #667eea; color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; white-space: nowrap; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                Unlock with paid package
                            </div>
                        </div>
                        <div style="position: relative;">
                            <label for="questionType" style="display: block; margin-bottom: 5px; font-weight: 600;">Question Type:</label>
                            <select id="questionType" class="job-description-input test-locked" style="min-height: auto; height: 46px; background: #f8f9fa; cursor: not-allowed;" onchange="this.value=this.dataset.locked||'mixed'; showUpgradeMessage(this); return false;">
                                ${this.generateQuestionTypeOptions()}
                            </select>
                            <div class="upgrade-tooltip" style="display: none; position: absolute; top: 70px; left: 0; background: #667eea; color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; white-space: nowrap; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                Unlock with paid package
                            </div>
                        </div>
                        <div style="position: relative;">
                            <label for="language" style="display: block; margin-bottom: 5px; font-weight: 600;">Interview Language:</label>
                            <select id="language" class="job-description-input test-locked" style="min-height: auto; height: 46px; background: #f8f9fa; cursor: not-allowed;" onchange="this.value='english'; showUpgradeMessage(this); return false;">
                                <option value="english" selected>English</option>
                                <option value="spanish">Spanish</option>
                                <option value="french">French</option>
                                <option value="german">German</option>
                                <option value="italian">Italian</option>
                                <option value="portuguese">Portuguese</option>
                                <option value="dutch">Dutch</option>
                                <option value="russian">Russian</option>
                                <option value="chinese">Chinese (Mandarin)</option>
                                <option value="japanese">Japanese</option>
                                <option value="korean">Korean</option>
                                <option value="arabic">Arabic</option>
                            </select>
                            <div class="upgrade-tooltip" style="display: none; position: absolute; top: 70px; left: 0; background: #667eea; color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; white-space: nowrap; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                Unlock with paid package
                            </div>
                        </div>
                    </div>
                    <p class="helper-text muted">Settings are pre-configured for this demo session.</p>
                </div>

                <!-- Resume/CV Section -->
                <div class="upload-section">
                    <h3>Your resume</h3>
                    <p class="helper-text">We'll generate a sample resume from your job title for this demo. In the full version, you can upload your actual resume for personalized questions.</p>
                    
                    <div class="cv-display" id="cvDisplay">
                        <div class="cv-status" id="cvStatus">
                            <span class="status-text loaded" id="cvStatusText">Demo CV loaded</span>
                        </div>
                    </div>
                </div>

                <!-- Job Description -->
                <div class="upload-section">
                    <h3>Job description</h3>
                    <p class="helper-text">This description is generated from your job title for the demo. In the full version, you can paste any real posting.</p>
                    <div class="field-loading-wrapper" id="jobDescriptionWrapper">
                        <textarea id="jobDescription" class="job-description-input" 
                            style="background: #f8f9fa; cursor: not-allowed;" rows="6" readonly placeholder="Job description will be loaded..."
                            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
                        <span class="field-spinner" aria-hidden="true"></span>
                    </div>
                </div>

                <!-- Detected Job Role and Company -->
                <div class="upload-section">
                    <h3>Auto-detected details</h3>
                    <p class="helper-text">We extract key details from the job description to make questions more relevant.</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div>
                            <label for="detectedRole" style="display: block; margin-bottom: 5px; font-weight: 600;">Target Role:</label>
                            <input type="text" id="detectedRole" class="job-description-input" 
                                   style="min-height: auto; height: 40px; background: #f8f9fa; cursor: not-allowed;" 
                                   placeholder="Role will be detected automatically..." readonly
                                   autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                        </div>
                        <div>
                            <label for="detectedCompany" style="display: block; margin-bottom: 5px; font-weight: 600;">Company:</label>
                            <input type="text" id="detectedCompany" class="job-description-input" 
                                   style="min-height: auto; height: 40px; background: #f8f9fa; cursor: not-allowed;" 
                                   placeholder="Company will be detected automatically..." readonly
                                   autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                        </div>
                        <div>
                            <label for="detectedIndustry" style="display: block; margin-bottom: 5px; font-weight: 600;">Industry:</label>
                            <input type="text" id="detectedIndustry" class="job-description-input" 
                                   style="min-height: auto; height: 40px; background: #f8f9fa; cursor: not-allowed;" 
                                   placeholder="Industry will be detected automatically..." readonly
                                   autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                        </div>
                    </div>
                    <span id="roleDetectionStatus" style="font-size: 14px; color: #27ae60; display: block; margin-top: 5px;">
                        Information detected from job description
                    </span>
                </div>

                <!-- Additional Company Info -->
                <div class="upload-section">
                    <h3>Anything you'd like to focus on?</h3>
                    <p class="helper-text">Add focus areas like culture, recent news, or specific topics. This helps generate even more targeted questions.</p>
                    <div class="field-loading-wrapper" id="additionalInfoWrapper">
                        <textarea id="additionalInfo" class="job-description-input" 
                            style="background: #f8f9fa; cursor: not-allowed;" rows="4" readonly
                            placeholder="Focus areas..."></textarea>
                        <span class="field-spinner" aria-hidden="true"></span>
                    </div>
                    <p class="helper-text muted">This demo uses predefined context for the interview.</p>
                </div>

                
            </div>

            <div class="interview-panel" id="interviewPanel">
                <div class="question-section">
                    <h2>Interview Question</h2>
                    <div class="question-text" id="questionText">
                        Preparing your personalized question...
                    </div>
                    <div class="timer" id="timer" style="display: none;">
                        Time: <span id="timerValue">0:00</span>
                    </div>
                </div>

                <div class="answer-section">
                    <h2>Your Answer</h2>
                    
                    <!-- Answer Mode Instructions -->
                    <div style="margin-bottom: 15px;">
                        <p style="color: #666; font-size: 16px; text-align: left; margin: 0;">Choose how you'd like to answer:</p>
                    </div>
                    
                    <!-- Answer Mode Toggle -->
                    <div style="margin-bottom: 20px;">
                        <div class="control-buttons" style="justify-content: flex-start; gap: 10px;">
                            <button id="voiceMode" class="btn-primary" style="padding: 8px 16px; font-size: 14px;">Voice Answer</button>
                            <button id="textMode" class="btn-secondary" style="padding: 8px 16px; font-size: 14px;">Type Answer</button>
                        </div>
                    </div>
                    
                    <!-- Voice Answer Section -->
                    <div id="voiceAnswerSection">
                        <div class="transcript-box" id="answerTranscript">
                            <p style="color: #999;">Click "Start Recording" to begin answering...</p>
                        </div>
                        <div class="control-buttons">
                            <button id="startRecording" class="btn-primary">Start Recording</button>
                            <button id="stopRecording" class="btn-secondary" style="display: none;">Stop Recording</button>
                            <button id="getFeedback" class="btn-primary" style="display: none;">Get Feedback</button>
                        </div>
                        <div class="recording-indicator" id="recordingIndicator">
                            <div class="recording-dot"></div>
                            <span>Recording your answer...</span>
                        </div>
                    </div>
                    
                    <!-- Text Answer Section -->
                    <div id="textAnswerSection" style="display: none;">
                        <textarea id="textAnswer" class="job-description-input" 
                                  style="min-height: 150px; margin-bottom: 20px;" 
                                  placeholder="Type your answer here..."></textarea>
                        <div class="control-buttons">
                            <button id="submitTextAnswer" class="btn-primary">Submit Answer</button>
                            <button id="clearTextAnswer" class="btn-secondary">Clear</button>
                        </div>
                    </div>
                </div>

                <div class="feedback-section" id="feedbackSection">
                    <h2>AI Feedback & Suggestions</h2>
                    
                    <div class="loading-spinner" id="feedbackSpinner">
                        <div class="spinner"></div>
                        <p>Analyzing your answer...</p>
                    </div>
                    
                    <div class="feedback-content" id="feedbackContent" style="display: none;">
                        <div class="feedback-summary">
                            <div class="score-section">
                                <div class="score-box">
                                    <h3>Your Score</h3>
                                    <div class="score-display">
                                        <span class="score-number" id="scoreNumber">0</span>
                                        <span class="score-max">/10</span>
                                    </div>
                                    <div class="score-meter">
                                        <div class="score-meter-track">
                                            <div class="score-meter-fill" id="scoreMeterFill" style="width: 0%;"></div>
                                        </div>
                                    </div>
                                    <div class="score-comparison" id="scoreComparison"></div>
                                </div>
                            </div>
                        </div>

                        <div class="feedback-main">
                            <div class="feedback-box better-response-box feature">
                                <h3>Suggested Better Response</h3>
                                <div class="feedback-box-content" id="betterResponseContent"></div>
                            </div>
                        </div>

                        <div class="feedback-support">
                            <div class="feedback-box strengths-box">
                                <h3>Strengths</h3>
                                <div class="feedback-box-content" id="strengthsContent"></div>
                            </div>
                        
                            <div class="feedback-box improvements-box">
                                <h3>Areas for Improvement</h3>
                                <div class="feedback-box-content" id="improvementsContent"></div>
                            </div>
                        </div>

                        <!-- Delivery Analysis -->
                        <div class="feedback-box" style="border-left:none; margin-top:8px;" id="deliveryAnalysisBox">
                            <h3 style="background:rgba(196,181,253,0.35); border-color:rgba(196,181,253,0.6);">Delivery Analysis</h3>
                            <div id="deliveryStats" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(80px,1fr)); gap:10px; margin:12px 0 16px;"></div>
                            <p style="font-size:0.78rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;">Your Answer — Annotated</p>
                            <div id="annotatedTranscript" class="feedback-box-content" style="background:#f8fafc; border-radius:10px; padding:12px 14px; font-size:0.9rem; line-height:1.9;"></div>
                            <div style="display:flex; gap:16px; margin-top:10px; flex-wrap:wrap;">
                                <span style="font-size:0.78rem; color:#64748b;"><span style="background:#dcfce7; border-radius:4px; padding:1px 6px; color:#166534;">green</span> = strong</span>
                                <span style="font-size:0.78rem; color:#64748b;"><span style="background:#fef9c3; border-radius:4px; padding:1px 6px; color:#854d0e;">yellow</span> = vague</span>
                                <span style="font-size:0.78rem; color:#64748b;"><span style="background:#fee2e2; border-radius:4px; padding:1px 6px; color:#991b1b;">red</span> = filler</span>
                            </div>
                        </div>

                        <div class="feedback-tail">
                            <div class="feedback-box tips-box compact">
                                <h3>Interview Tips</h3>
                                <div class="feedback-box-content" id="tipsContent"></div>
                            </div>
                        </div>

                        <!-- Model Answer Section -->
                        <div id="modelAnswerSection" style="display:none; margin-top:8px;">
                            <div class="feedback-box" style="border-left:none;">
                                <h3 style="background:rgba(167,243,208,0.4); border-color:rgba(167,243,208,0.7);">🏆 Model Answer</h3>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">
                                    <div style="background:#f8fafc; border-radius:12px; padding:14px;">
                                        <p style="font-size:0.75rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;">Your Answer</p>
                                        <div id="modelAnswerUserText" class="feedback-box-content" style="font-size:0.88rem;"></div>
                                    </div>
                                    <div style="background:#f0fdf4; border-radius:12px; padding:14px;">
                                        <p style="font-size:0.75rem; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;">10/10 Answer</p>
                                        <div id="modelAnswerText" class="feedback-box-content" style="font-size:0.88rem;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="feedback-actions">
                        <button id="nextQuestion" class="btn-primary">View Session Results</button>
                        <button id="tryAgain" class="btn-secondary">Try This Question Again</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }


    // Inject styles into the head
    injectStyles() {
        // Remove existing styles if present
        const existingStyles = document.getElementById('practice-page-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'practice-page-styles';
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);
    }

    // Initialize practice session functionality
    async initializePracticeSession() {
        console.log('Initializing practice session with full functionality...');
        
        // Initialize elements (like the original AIInterviewer)
        this.initializeElements();
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Connect WebSocket
        this.connectWebSocket();
        
        // TEST MODE: Skip profile loading since we have predefined test data
        if (!this.isTestMode) {
            // Load user profile
            await this.loadUserProfile();
            
            // Only try the secondary CV load if we didn't get CV from profile
            // This prevents overriding the correct null value
            if (!this.resumeContent) {
                console.log('No CV from profile, trying /api/resume endpoint...');
                await this.loadCvFromProfile();
            } else {
                console.log('CV already loaded from profile, skipping /api/resume call');
            }
        } else {
            console.log('Test mode: Using predefined test data instead of loading user profile');
        }
        
        console.log('Practice session initialization complete with all features');
    }

    // Initialize DOM elements (from original ai-interviewer.js)
    initializeElements() {
        // Panels
        this.setupPanel = document.getElementById('setupPanel');
        this.interviewPanel = document.getElementById('interviewPanel');
        this.feedbackSection = document.getElementById('feedbackSection');
        
        // Profile elements
        this.currentRoleInput = document.getElementById('currentRole');
        this.experienceYearsInput = document.getElementById('experienceYears');
        
        // Configuration elements
        this.difficultyLevelSelect = document.getElementById('difficultyLevel');
        this.questionTypeSelect = document.getElementById('questionType');
        this.languageSelect = document.getElementById('language');
        this.additionalInfoInput = document.getElementById('additionalInfo');
        this.additionalInfoWrapper = document.getElementById('additionalInfoWrapper');

        // Question type is set later by setQuestionTypeForRoleTitle based on the actual job
        // Default to mixed until the job title is known
        if (this.questionTypeSelect) {
            this.questionTypeSelect.value = 'mixed';
        }
        
        // Job role, company, and industry detection elements
        this.detectedRoleInput = document.getElementById('detectedRole');
        this.detectedCompanyInput = document.getElementById('detectedCompany');
        this.detectedIndustryInput = document.getElementById('detectedIndustry');
        this.roleDetectionStatus = document.getElementById('roleDetectionStatus');
        
        // Resume/CV elements
        this.cvStatusText = document.getElementById('cvStatusText');
        
        // Job description element
        this.jobDescriptionInput = document.getElementById('jobDescription');
        this.jobDescriptionWrapper = document.getElementById('jobDescriptionWrapper');
        
        // Start practice button
        this.startPracticeBtn = document.getElementById('startPractice');
        
        // Question elements
        this.questionText = document.getElementById('questionText');
        this.questionCounter = document.getElementById('questionCounter');
        this.currentQuestionSpan = document.getElementById('currentQuestion');
        this.totalQuestionsSpan = document.getElementById('totalQuestions');
        
        // Answer elements
        this.voiceMode = document.getElementById('voiceMode');
        this.textMode = document.getElementById('textMode');
        this.voiceAnswerSection = document.getElementById('voiceAnswerSection');
        this.textAnswerSection = document.getElementById('textAnswerSection');
        this.answerTranscript = document.getElementById('answerTranscript');
        this.textAnswer = document.getElementById('textAnswer');
        
        // Recording controls
        this.startRecordingBtn = document.getElementById('startRecording');
        this.stopRecordingBtn = document.getElementById('stopRecording');
        this.getFeedbackBtn = document.getElementById('getFeedback');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        
        // Text answer controls
        this.submitTextAnswerBtn = document.getElementById('submitTextAnswer');
        this.clearTextAnswerBtn = document.getElementById('clearTextAnswer');
        
        // Feedback elements
        this.feedbackSpinner = document.getElementById('feedbackSpinner');
        this.feedbackContent = document.getElementById('feedbackContent');
        this.scoreNumber = document.getElementById('scoreNumber');
        this.scoreComparison = document.getElementById('scoreComparison');
        this.scoreMeterFill = document.getElementById('scoreMeterFill');
        this.strengthsContent = document.getElementById('strengthsContent');
        this.improvementsContent = document.getElementById('improvementsContent');
        this.betterResponseContent = document.getElementById('betterResponseContent');
        this.tipsContent = document.getElementById('tipsContent');
        
        // Navigation controls
        this.nextQuestionBtn = document.getElementById('nextQuestion');
        this.tryAgainBtn = document.getElementById('tryAgain');
        
        // Timer
        this.timer = document.getElementById('timer');
        this.timerValue = document.getElementById('timerValue');

        this.updateStartButtonLabel();
    }

    // Attach event listeners (from original ai-interviewer.js)
    attachEventListeners() {
        
        
        // Job description change for role detection
        if (this.jobDescriptionInput) {
            this.jobDescriptionInput.addEventListener('input', this.debounce(this.onJobDescriptionChange.bind(this), 1000));
        }
        
        // Start practice button
        if (this.startPracticeBtn) {
            this.startPracticeBtn.addEventListener('click', this.handleStartButtonClick.bind(this));
        }
        
        // Answer mode toggle
        if (this.voiceMode) {
            this.voiceMode.addEventListener('click', () => this.switchToVoiceMode());
        }
        if (this.textMode) {
            this.textMode.addEventListener('click', () => this.switchToTextMode());
        }
        
        // Recording controls
        if (this.startRecordingBtn) {
            this.startRecordingBtn.addEventListener('click', this.startRecording.bind(this));
        }
        if (this.stopRecordingBtn) {
            this.stopRecordingBtn.addEventListener('click', this.stopRecording.bind(this));
        }
        if (this.getFeedbackBtn) {
            this.getFeedbackBtn.addEventListener('click', this.getFeedback.bind(this));
        }
        
        // Text answer controls
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.addEventListener('click', this.submitTextAnswer.bind(this));
        }
        if (this.clearTextAnswerBtn) {
            this.clearTextAnswerBtn.addEventListener('click', this.clearTextAnswer.bind(this));
        }
        
        // Navigation controls
        if (this.nextQuestionBtn) {
            this.nextQuestionBtn.addEventListener('click', this.handleNextQuestionClick.bind(this));
        }
        if (this.tryAgainBtn) {
            this.tryAgainBtn.addEventListener('click', this.tryAgain.bind(this));
        }
    }

    // Connect WebSocket (from original ai-interviewer.js)
    connectWebSocket() {
        console.log('Connecting to WebSocket...');
        
        if (typeof io === 'undefined') {
            console.error('Socket.io not loaded - WebSocket features will be disabled');
            return;
        }

        try {
            // Get auth token for WebSocket authentication
            const authToken = localStorage.getItem('authToken');
            console.log('Auth token for WebSocket:', authToken ? 'Present' : 'Missing');

            // Connect with authentication (guests pass guestId instead of token)
            this.socket = io({
                auth: {
                    token: authToken || null,
                    guestId: this.isGuest ? (this.guestId || null) : null
                }
            });
            
            this.socket.on('connect', () => {
                console.log('WebSocket connected successfully with authentication');
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
            });

            this.socket.on('error', (error) => {
                console.error('WebSocket error:', error);
            });

            // Handle real-time transcription (using correct event name from original)
            this.socket.on('transcriptionUpdate', (data) => {
                this.updateTranscript(data.text, data.isFinal);
            });

            // Handle streaming feedback updates
            this.socket.on('feedbackUpdate', (data) => {
                this.updateFeedback(data.chunk, data.isFinal);
            });

            // Handle AI feedback (using correct event name)
            this.socket.on('feedbackComplete', (data) => {
                console.log('Received feedbackComplete event:', {
                    hasFeedback: !!data.feedback,
                    feedbackLength: data.feedback?.length || 0,
                    score: data.score,
                    hasComparison: !!data.comparison
                });
                this.displayFeedback(data);
            });

            // Handle question generation (check server response format)
            this.socket.on('aiQuestion', (data) => {
                console.log('Received aiQuestion event:', data);
                if (this.questionRequestTimeout) {
                    clearTimeout(this.questionRequestTimeout);
                    this.questionRequestTimeout = null;
                }
                
                if (data && data.question) {
                    this.currentQuestionText = data.question;
                    this.displayQuestion(data.question, data.questionNumber || this.currentQuestion, data.questionType);
                    this.previousQuestions.push(data.question);
                } else {
                    console.error('Invalid question data received:', data);
                    if (this.questionText) {
                        this.questionText.textContent = 'Error generating question. Please try again.';
                    }
                }
            });

            // Handle errors
            this.socket.on('error', (data) => {
                console.error('Socket error:', data);
                if (this.questionRequestTimeout) {
                    clearTimeout(this.questionRequestTimeout);
                    this.questionRequestTimeout = null;
                }
                
                if (this.questionText && this.questionText.textContent.includes('Generating')) {
                    this.questionText.textContent = 'Error generating question. Please try again.';
                }
            });
        } catch (error) {
            console.error('Error connecting WebSocket:', error);
        }
    }

    // Load user profile (from original ai-interviewer.js)
    async loadUserProfile() {
        console.log('Loading user profile...');
        try {
            if (typeof authManager === 'undefined') {
                console.log('AuthManager not loaded yet, retrying in 1 second...');
                setTimeout(() => this.loadUserProfile(), 1000);
                return;
            }

            if (!authManager.isAuthenticated()) {
                console.log('User not authenticated, skipping profile load');
                if (this.cvStatusText) {
                    this.cvStatusText.textContent = 'Please sign in to load profile';
                    this.cvStatusText.className = 'status-text error';
                }
                return;
            }

            const response = await authManager.apiRequest('/api/auth/profile');
            if (response.ok) {
                const data = await response.json();
                const user = data.user;
                
                // Debug logging
                console.log('Profile API Response:', {
                    hasUser: !!user,
                    userKeys: user ? Object.keys(user) : [],
                    resumeContent: user?.resume_content,
                    resumeContentType: typeof user?.resume_content,
                    resumeContentLength: user?.resume_content?.length,
                    cvContent: user?.cv_content,
                    allUserData: user
                });
                
                // Populate profile fields
                if (this.currentRoleInput && user.role && !this.currentRoleInput.value) {
                    this.currentRoleInput.value = user.role;
                }
                if (this.experienceYearsInput && user.experience_years !== null && user.experience_years !== undefined) {
                    this.experienceYearsInput.value = user.experience_years;
                }
                
                // Load CV content if available (field is called resume_content in database)
                if (user.resume_content && user.resume_content.trim() !== '') {
                    this.resumeContent = user.resume_content;
                    console.log('CV loaded successfully, length:', this.resumeContent.length);
                    if (this.cvStatusText) {
                        this.cvStatusText.textContent = 'CV loaded from profile';
                        this.cvStatusText.className = 'status-text loaded';
                    }
                    // Hide CV warning if visible
                    const cvWarning = document.getElementById('cvWarning');
                    if (cvWarning) {
                        cvWarning.style.display = 'none';
                    }
                    console.log('CV loaded from profile (resume_content field)');
                } else {
                    this.resumeContent = null;
                    if (this.cvStatusText) {
                        this.cvStatusText.innerHTML = 'No CV found - <a href="/profile" style="color: #0ea5e9; text-decoration: underline;">Upload CV in Profile</a>';
                        this.cvStatusText.className = 'status-text no-cv';
                    }
                    console.log('No CV found in profile (resume_content is empty or missing)');
                }
                
                console.log('User profile loaded successfully');
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            if (this.cvStatusText) {
                this.cvStatusText.textContent = 'Error loading profile';
                this.cvStatusText.className = 'status-text error';
            }
        }
    }

    // Load CV from profile (copied from original ai-interviewer.js)
    async loadCvFromProfile() {
        if (this.cvStatusText) {
            this.cvStatusText.textContent = 'Loading CV from profile...';
            this.cvStatusText.className = 'status-text';
        }
        
        try {
            if (typeof authManager === 'undefined') {
                console.log('AuthManager not loaded yet for CV loading, retrying in 1 second...');
                setTimeout(() => this.loadCvFromProfile(), 1000);
                return;
            }

            if (!authManager.isAuthenticated()) {
                console.log('User not authenticated, skipping CV load');
                if (this.cvStatusText) {
                    this.cvStatusText.textContent = 'Please sign in to load CV from profile';
                    this.cvStatusText.className = 'status-text error';
                }
                return;
            }

            const response = await authManager.apiRequest('/api/resume');
            console.log('CV API /api/resume response status:', response.ok);
            if (response.ok) {
                const data = await response.json();
                console.log('CV API /api/resume data:', {
                    success: data.success,
                    hasContent: !!data.content,
                    contentLength: data.content?.length,
                    contentPreview: data.content?.substring(0, 50),
                    source: data.source,
                    fullData: data
                });
                if (data.success && data.content && data.content.trim() !== '') {
                    this.resumeContent = data.content;
                    console.log('Setting resumeContent from /api/resume, length:', this.resumeContent.length);
                    
                    const statusText = data.filename 
                        ? `CV loaded: ${data.filename}${data.uploadedAt ? ' (uploaded: ' + new Date(data.uploadedAt).toLocaleDateString() + ')' : ''}`
                        : 'CV loaded successfully';
                    
                    if (this.cvStatusText) {
                        this.cvStatusText.textContent = statusText;
                        this.cvStatusText.className = 'status-text loaded';
                    }
                    
                    console.log('CV loaded from profile successfully');
                } else {
                    this.resumeContent = null;
                    if (this.cvStatusText) {
                        this.cvStatusText.innerHTML = 'No CV found - <a href="/profile" style="color: #0ea5e9; text-decoration: underline;">Upload CV in Profile</a>';
                        this.cvStatusText.className = 'status-text no-cv';
                    }
                    console.log('CV is empty or not found');
                }
            } else {
                throw new Error('Failed to load CV');
            }
        } catch (error) {
            console.error('CV loading error:', error);
            this.resumeContent = null; // Ensure resumeContent is null on error
            if (this.cvStatusText) {
                this.cvStatusText.innerHTML = 'No CV found - <a href="/profile" style="color: #0ea5e9; text-decoration: underline;">Upload CV in Profile</a>';
                this.cvStatusText.className = 'status-text no-cv';
            }
        }
    }

    // Modal methods
    ensureJobTitleRequiredModal() {
        let modal = document.getElementById('jobTitleRequiredModal');
        if (modal) {
            return modal;
        }

        modal = document.createElement('div');
        modal.id = 'jobTitleRequiredModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Job Title Required</h3>
                </div>
                <div class="modal-body">
                    <p>Please enter the job title you want to practice for.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" data-action="close">Got it</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeJobTitleRequiredModal());
        }

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeJobTitleRequiredModal();
            }
        });

        return modal;
    }

    showJobTitleRequiredModal({ title = 'Job Title Required', message = 'Please enter the job title you want to practice for.' } = {}) {
        const modal = this.ensureJobTitleRequiredModal();
        if (modal) {
            const titleEl = modal.querySelector('.modal-header h3');
            const bodyEl = modal.querySelector('.modal-body p');
            if (titleEl) {
                titleEl.textContent = title;
            }
            if (bodyEl) {
                bodyEl.textContent = message;
            }
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeJobTitleRequiredModal() {
        const modal = document.getElementById('jobTitleRequiredModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (this.currentRoleInput) {
            this.currentRoleInput.focus();
        }
    }

    showCVRequiredModal() {
        const modal = document.getElementById('cvRequiredModal');
        if (modal) {
            modal.style.display = 'flex';
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
    }

    closeCVRequiredModal() {
        const modal = document.getElementById('cvRequiredModal');
        if (modal) {
            modal.style.display = 'none';
            // Restore body scroll
            document.body.style.overflow = 'auto';
        }
    }

    goToProfile() {
        window.location.href = '/profile';
    }

    showJobDescriptionRequiredModal() {
        const modal = document.getElementById('jobDescriptionRequiredModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeJobDescriptionRequiredModal() {
        const modal = document.getElementById('jobDescriptionRequiredModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        // Focus on job description field to help user
        if (this.jobDescriptionInput) {
            this.jobDescriptionInput.focus();
        }
    }

    highlightCVSection() {
        // Target the specific CV status div that has the existing border
        const cvStatusDiv = document.getElementById('cvStatus');
        
        if (cvStatusDiv) {
            // Add highlight class to the cv-status div itself
            cvStatusDiv.classList.add('highlight-error');
            
            // Scroll to the CV section smoothly
            cvStatusDiv.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });
            
            // Remove highlight after animation
            setTimeout(() => {
                cvStatusDiv.classList.remove('highlight-error');
            }, 3000);
        } else {
            // Fallback: scroll to top of the page if we can't find CV section
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    highlightJobTitleField() {
        const jobTitleInput = document.getElementById('currentRole');

        if (jobTitleInput) {
            jobTitleInput.classList.add('highlight-error');
            jobTitleInput.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            const clearHighlight = () => {
                jobTitleInput.classList.remove('highlight-error');
            };

            jobTitleInput.addEventListener('input', clearHighlight, { once: true });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    highlightJobDescriptionSection() {
        // Target the job description textarea
        const jobDescriptionTextarea = document.getElementById('jobDescription');
        
        if (jobDescriptionTextarea) {
            // Add highlight class to the textarea itself
            jobDescriptionTextarea.classList.add('highlight-error');
            
            // Scroll to the job description section smoothly
            jobDescriptionTextarea.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });
            
            // Remove highlight after animation
            setTimeout(() => {
                jobDescriptionTextarea.classList.remove('highlight-error');
            }, 3000);
        } else {
            // Fallback: scroll to top of the page if we can't find job description field
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    showInterviewPanel() {
        const setupPanel = document.getElementById('setupPanel');
        const interviewPanel = document.getElementById('interviewPanel');
        const questionCounter = document.getElementById('questionCounter');

        if (setupPanel) setupPanel.style.display = 'none';
        if (interviewPanel) interviewPanel.style.display = 'block';
        if (questionCounter) questionCounter.style.display = 'inline-block';

        // Sticky upgrade bar during the session
        if (!document.getElementById('sessionUpgradeBar')) {
            const bar = document.createElement('div');
            bar.id = 'sessionUpgradeBar';
            bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1e293b;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:9999;font-size:0.82rem;box-shadow:0 -2px 12px rgba(0,0,0,0.2);';
            document.body.style.paddingBottom = '60px';
            bar.innerHTML = `
                <div style="display:flex;gap:16px;flex-wrap:wrap;opacity:0.85;">
                    <span>🔒 CV-tailored questions</span>
                    <span>🔒 Unlimited retries</span>
                    <span>🔒 Progress tracking</span>
                    <span>🔒 10-question sessions</span>
                </div>
                <a href="/pricing" style="background:#3b82f6;color:#fff;padding:7px 18px;border-radius:6px;font-weight:700;text-decoration:none;white-space:nowrap;font-size:0.82rem;flex-shrink:0;">Unlock &mdash; from £6.99</a>
            `;
            document.body.appendChild(bar);
        }
    }

    // Essential methods from original ai-interviewer.js
    
    // Utility method for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }


    // Handle job description change
    onJobDescriptionChange() {
        const jobDescriptionText = this.jobDescriptionInput.value.trim();
        
        if (jobDescriptionText.length >= 20) {
            this.roleDetectionStatus.textContent = 'Detecting role, company, and industry...';
            this.detectJobInfo();
        } else if (jobDescriptionText.length >= 10) {
            this.roleDetectionStatus.textContent = 'Keep typing for automatic detection...';
        } else {
            this.detectedRoleInput.value = '';
            this.detectedCompanyInput.value = '';
            this.detectedIndustryInput.value = '';
            this.roleDetectionStatus.textContent = 'Waiting for job description...';
        }
    }

    // Detect job information from description
    async detectJobInfo() {
        const jobDescriptionText = this.jobDescriptionInput.value.trim();
        
        if (!jobDescriptionText || jobDescriptionText.length < 20) {
            return;
        }

        try {
            const response = await authManager.apiRequest('/api/ai/detect-job-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobDescription: jobDescriptionText
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to detect job info');
            }

            if (result.success) {
                this.detectedRoleInput.value = result.detectedRole || '';
                this.detectedCompanyInput.value = result.detectedCompany || '';
                this.detectedIndustryInput.value = result.detectedIndustry || '';
                
                let detected = [];
                if (result.detectedRole) detected.push(`Role: ${result.detectedRole}`);
                if (result.detectedCompany) detected.push(`Company: ${result.detectedCompany}`);
                if (result.detectedIndustry) detected.push(`Industry: ${result.detectedIndustry}`);
                
                if (detected.length > 0) {
                    this.roleDetectionStatus.textContent = 'Detected: ' + detected.join(', ');
                    this.roleDetectionStatus.style.color = '#27ae60';
                } else {
                    this.roleDetectionStatus.textContent = 'Could not detect specific information';
                    this.roleDetectionStatus.style.color = '#f39c12';
                }
            }
        } catch (error) {
            console.error('Error detecting job info:', error);
            this.roleDetectionStatus.textContent = 'Detection error';
            this.roleDetectionStatus.style.color = '#e74c3c';
        }
    }

    // Start practice session
    async startPracticeSession() {
        console.log('Starting practice session...');
        
        try {
            // Validate required fields
            const jobTitle = this.currentRoleInput ? this.currentRoleInput.value.trim() : '';

            if (!jobTitle) {
                this.highlightJobTitleField();
                this.showJobTitleRequiredModal();
                return;
            }
            const validation = this.validateJobTitleInput(jobTitle);
            if (!validation.isValid) {
                this.highlightJobTitleField();
                this.showJobTitleRequiredModal({
                    title: 'Enter a Job Title',
                    message: validation.message
                });
                return;
            }

            this.recordTesterJobTitle(jobTitle, {
                difficultyLevel: this.difficultyLevelSelect?.value || null,
                questionType: this.questionTypeSelect?.value || null,
                language: this.languageSelect?.value || null,
                additionalInfo: this.additionalInfoInput?.value || ''
            });

            const normalizedJobTitle = this.normalizeJobTitle(jobTitle);
            const normalizedCustomTitle = this.normalizeJobTitle(this.customJobTitle);
            const hasMatchingTitle = !normalizedCustomTitle || normalizedCustomTitle === normalizedJobTitle;

            if (!this.demoProfileReady || !this.resumeContent || !this.jobDescription || !hasMatchingTitle) {
                this.showError('Please generate the job description first.');
                this.updateStartButtonLabel();
                return;
            }

            const jobDescription = this.jobDescriptionInput.value.trim();
            const detectedRole = this.detectedRoleInput.value.trim();
            
            console.log('Validation check:', {
                hasJobDescription: !!jobDescription,
                hasResumeContent: !!this.resumeContent,
                resumeContentType: typeof this.resumeContent,
                resumeContentValue: this.resumeContent,
                jobDescriptionLength: jobDescription.length,
                resumeContentLength: this.resumeContent ? this.resumeContent.length : 0,
                resumeIsEmpty: !this.resumeContent || (typeof this.resumeContent === 'string' && this.resumeContent.trim() === '')
            });
            
            if (!jobDescription) {
                // Scroll to job description section and highlight it
                this.highlightJobDescriptionSection();
                
                this.showJobDescriptionRequiredModal();
                return;
            }
            
            if (!this.resumeContent || (typeof this.resumeContent === 'string' && this.resumeContent.trim() === '')) {
                // Scroll to CV section and highlight it
                this.highlightCVSection();
                
                // Show custom modal instead of browser confirm
                this.showCVRequiredModal();
                return;
            }

            // Collect all session configuration
            this.sessionConfig = {
                currentRole: this.currentRoleInput.value,
                experienceYears: this.experienceYearsInput.value,
                detectedRole,
                detectedCompany: this.detectedCompanyInput.value,
                detectedIndustry: this.detectedIndustryInput.value,
                difficultyLevel: this.difficultyLevelSelect.value,
                questionType: this.questionTypeSelect.value,
                language: this.languageSelect.value,
                additionalInfo: this.additionalInfoInput.value,
                jobDescription,
                resumeContent: this.resumeContent
            };

            console.log('Session config:', this.sessionConfig);

            // Generate session ID
            this.sessionId = `practice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Show interview panel first
            this.showInterviewPanel();
            
            // Generate first question
            this.generateQuestion(1);
            
        } catch (error) {
            console.error('Error starting practice session:', error);
            alert('Failed to start practice session. Please try again.');
        }
    }

    // Generate AI question (using WebSocket like original)
    generateQuestion(questionNumber) {
        console.log(`Generating question ${questionNumber}...`);
        
        if (!this.socket) {
            console.error('WebSocket not connected');
            if (this.questionText) {
                this.questionText.textContent = 'Error: Not connected to server. Please refresh the page.';
            }
            return;
        }
        
        if (this.questionText) {
            this.questionText.textContent = 'Generating your personalized question...';
        }

        // Set up timeout for question request (like original)
        const questionTimeout = setTimeout(() => {
            console.error('Question request timeout - no response received in 30 seconds');
            if (this.questionText) {
                this.questionText.textContent = 'Unable to generate question. Please try refreshing the page.';
            }
        }, 30000);
        
        this.questionRequestTimeout = questionTimeout;

        // Create session config (like original) - ensure required fields are at root level
        const sessionConfig = {
            // Required fields at root level
            resume: this.resumeContent,
            jobDescription: this.sessionConfig.jobDescription,
            
            // Session info
            questionNumber,
            currentQuestionNumber: questionNumber,
            totalQuestions: this.totalQuestions,
            previousQuestions: this.previousQuestions,
            sessionId: this.sessionId || `practice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            
            // Configuration
            currentRole: this.sessionConfig.currentRole,
            experienceYears: this.sessionConfig.experienceYears,
            detectedRole: this.sessionConfig.detectedRole,
            detectedCompany: this.sessionConfig.detectedCompany,
            detectedIndustry: this.sessionConfig.detectedIndustry,
            difficultyLevel: this.sessionConfig.difficultyLevel,
            questionType: this.sessionConfig.questionType,
            language: this.sessionConfig.language,
            additionalInfo: this.sessionConfig.additionalInfo,
            // TEST MODE: Mark as test mode to prevent database session creation
            isTestMode: this.isTestMode
        };

        console.log('Emitting requestAIQuestion event with fields:', {
            hasResume: !!sessionConfig.resume,
            hasJobDescription: !!sessionConfig.jobDescription,
            resumeLength: sessionConfig.resume ? sessionConfig.resume.length : 0,
            jobDescriptionLength: sessionConfig.jobDescription ? sessionConfig.jobDescription.length : 0,
            questionNumber: sessionConfig.questionNumber
        });
        
        // Request question via WebSocket
        this.socket.emit('requestAIQuestion', sessionConfig);
    }

    // Display question (updated to match original behavior)
    displayQuestion(question, questionNumber, questionType) {
        console.log('Received AI question:', question);
        console.log('Question type:', questionType);
        
        // Remove surrounding quotes if present (like original)
        const cleanedQuestion = question.replace(/^["']|["']$/g, '').trim();
        
        if (this.questionText) {
            this.questionText.innerHTML = `<div style="color: #333;">${cleanedQuestion}</div>`;
        }
        if (this.currentQuestionSpan) {
            this.currentQuestionSpan.textContent = questionNumber;
        }
        if (this.totalQuestionsSpan) {
            this.totalQuestionsSpan.textContent = this.totalQuestions;
        }
        
        this.currentQuestion = questionNumber;
        this.currentQuestionText = cleanedQuestion;
        
        // Store this question in the previous questions array (like original)
        if (!this.previousQuestions.includes(cleanedQuestion)) {
            this.previousQuestions.push(cleanedQuestion);
        }
        
        // Reset UI elements (like original)
        if (this.answerTranscript) {
            this.answerTranscript.innerHTML = '<p style="color: #999;">Click "Start Recording" to begin answering...</p>';
        }
        if (this.feedbackSection) {
            this.feedbackSection.style.display = 'none';
        }
        if (this.getFeedbackBtn) {
            this.getFeedbackBtn.style.display = 'none';
        }
        if (this.startRecordingBtn) {
            this.startRecordingBtn.style.display = 'inline-block';
        }
        
        // Ensure text submit button is visible and enabled
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.style.display = 'inline-block';
            this.submitTextAnswerBtn.disabled = false;
            this.submitTextAnswerBtn.style.opacity = '1';
            this.submitTextAnswerBtn.style.cursor = 'pointer';
            this.submitTextAnswerBtn.textContent = 'Submit Answer';
        }
        
        // Reset both answer modes (like original)
        if (this.textAnswer) {
            this.textAnswer.value = '';
        }
        this.switchToVoiceMode(); // Default to voice mode
        
        console.log(`Question ${questionNumber} displayed:`, cleanedQuestion);
    }


    // Recording methods (EXACT implementation from perfected ai-interviewer.js)
    resampleAudioBuffer(inputBuffer, inputSampleRate, targetSampleRate) {
        if (inputSampleRate === targetSampleRate) {
            return inputBuffer;
        }

        const ratio = inputSampleRate / targetSampleRate;
        const outputLength = Math.round(inputBuffer.length / ratio);
        const outputBuffer = new Float32Array(outputLength);

        for (let i = 0; i < outputLength; i++) {
            const sourceIndex = i * ratio;
            const index0 = Math.floor(sourceIndex);
            const index1 = Math.min(index0 + 1, inputBuffer.length - 1);
            const weight = sourceIndex - index0;
            outputBuffer[i] = inputBuffer[index0] * (1 - weight) + inputBuffer[index1] * weight;
        }

        return outputBuffer;
    }

    convertFloat32ToInt16(inputBuffer) {
        const outputBuffer = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputBuffer[i]));
            outputBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }
        return outputBuffer;
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Reset transcripts and delivery tracking
            this.webSpeechFinalText = '';
            this.webSpeechInterimText = '';
            this.serverTranscript = '';
            this.speechPauses = [];          // [{duration: ms}] — gaps > 1.5 s between spoken chunks
            this._lastSpeechAt = Date.now(); // timestamp of last received speech chunk
            this._inPause = false;           // are we currently in a silence gap?
            this._pauseStartedAt = null;

            // Silence detector — fires every 300 ms to track gaps between speech
            this._silenceTimer = setInterval(() => {
                if (!this.isRecording) return;
                const gap = Date.now() - this._lastSpeechAt;
                if (gap > 1500 && !this._inPause) {
                    // Silence just started
                    this._inPause = true;
                    this._pauseStartedAt = this._lastSpeechAt;
                }
            }, 300);

            // ── Web Speech API (live word-by-word display + delivery analysis) ──
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = 'en-US';

                this.recognition.onresult = (event) => {
                    if (!this.isRecording) return;

                    const now = Date.now();
                    // If we were in a pause, record it
                    if (this._inPause && this._pauseStartedAt) {
                        const pauseDuration = now - this._pauseStartedAt;
                        if (pauseDuration > 1500) {
                            this.speechPauses.push({ duration: pauseDuration });
                        }
                        this._inPause = false;
                        this._pauseStartedAt = null;
                    }
                    this._lastSpeechAt = now;

                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        if (result.isFinal) {
                            this.webSpeechFinalText += result[0].transcript + ' ';
                        } else {
                            interim += result[0].transcript;
                        }
                    }
                    this.webSpeechInterimText = interim;
                    // Show live text — final (confirmed) + interim (in-progress)
                    const liveText = (this.webSpeechFinalText + interim).trim();
                    if (liveText && this.answerTranscript) {
                        this.answerTranscript.innerHTML = `<p>${liveText}</p>`;
                        this.lastTranscriptTime = Date.now();
                    }
                };

                this.recognition.onerror = (e) => {
                    if (e.error !== 'no-speech' && e.error !== 'aborted') {
                        console.warn('Web Speech API error:', e.error);
                    }
                };

                // Auto-restart if it stops mid-recording (browser timeout)
                this.recognition.onend = () => {
                    if (this.isRecording) this.recognition.start();
                };

                this.recognition.start();
            } else {
                console.warn('Web Speech API not supported — falling back to server transcription only');
            }

            // ── OpenAI Realtime (accurate content for feedback AI) ──
            const audioContext = new AudioContext({ sampleRate: 16000 });
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            this.audioInputSampleRate = audioContext.sampleRate;
            this.audioTargetSampleRate = 16000;
            this.needsResampling = this.audioInputSampleRate !== this.audioTargetSampleRate;

            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (this.isRecording || this.isFinalizingTranscript) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const processedData = this.needsResampling
                        ? this.resampleAudioBuffer(inputData, this.audioInputSampleRate, this.audioTargetSampleRate)
                        : inputData;
                    const audioData = this.convertFloat32ToInt16(processedData);
                    this.socket.emit('audioStream', {
                        audio: audioData.buffer,
                        sessionId: this.sessionId,
                        isFinalizingMode: this.isFinalizingTranscript || false
                    });
                }
            };

            this.audioContext = audioContext;
            this.processor = processor;
            this.stream = stream;

            this.isRecording = true;
            this.socket.emit('startAIInterview', {
                sessionId: this.sessionId,
                currentQuestion: this.questionText.textContent
            });

            this.startRecordingBtn.style.display = 'none';
            this.stopRecordingBtn.style.display = 'inline-block';
            this.recordingIndicator.classList.add('active');
            this.answerTranscript.innerHTML = '';

            this.startTimer();

        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Could not access microphone');
        }
    }

    stopRecording() {
        this.isRecording = false;
        this.lastAnswerDuration = this.answerStartTime ? Math.floor((Date.now() - this.answerStartTime) / 1000) : 0;

        // Stop silence detector
        if (this._silenceTimer) {
            clearInterval(this._silenceTimer);
            this._silenceTimer = null;
        }

        // Stop Web Speech API and freeze the raw transcript for delivery analysis
        if (this.recognition) {
            this.recognition.onend = null; // prevent auto-restart
            this.recognition.stop();
            // Freeze final display: confirmed words + any last interim words
            this.webSpeechFinalText = (this.webSpeechFinalText + this.webSpeechInterimText).trim();
            this.webSpeechInterimText = '';
            if (this.webSpeechFinalText && this.answerTranscript) {
                this.answerTranscript.innerHTML = `<p>${this.webSpeechFinalText}</p>`;
            }
            this.recognition = null;
        }

        this.stopRecordingBtn.style.display = 'none';
        this.recordingIndicator.classList.remove('active');
        this.stopTimer();

        // Keep the live transcript visible — don't wipe it
        // Enter finalization mode to flush any remaining audio from the buffer
        this.isFinalizingTranscript = true;

        this.startSmartFinalization();
    }
    
    startSmartFinalization() {
        const lastTranscriptUpdate = Date.now();
        const maxFinalizationTime = 4000; // Max 4 seconds — reduced from 8
        const requiredSilenceTime = 1000; // 1 second of no new text — reduced from 2

        this.lastTranscriptTime = Date.now();

        const finalizationChecker = setInterval(() => {
            const now = Date.now();
            const timeSinceLastTranscript = now - this.lastTranscriptTime;
            const totalFinalizationTime = now - lastTranscriptUpdate;

            if (totalFinalizationTime > maxFinalizationTime) {
                clearInterval(finalizationChecker);
                this.completeTranscription();
                return;
            }

            if (timeSinceLastTranscript > requiredSilenceTime) {
                clearInterval(finalizationChecker);
                this.completeTranscription();
                return;
            }
        }, 100);

        this.finalizationInterval = finalizationChecker;
    }
    
    completeTranscription() {
        // Clear any existing intervals/timeouts
        if (this.finalizationInterval) {
            clearInterval(this.finalizationInterval);
            this.finalizationInterval = null;
        }
        
        // Now actually stop the audio streaming
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Notify server to finalize transcript
        this.socket.emit('stopAIInterview', {
            sessionId: this.sessionId
        });
        
        // Reset finalization mode
        this.isFinalizingTranscript = false;
        
        // Set a final timeout for the server response
        this.finalTranscriptTimeout = setTimeout(() => {
            this.showFeedbackButton();
        }, 3000);
    }
    
    showFeedbackButton() {
        // Clear any existing timeout
        if (this.finalTranscriptTimeout) {
            clearTimeout(this.finalTranscriptTimeout);
            this.finalTranscriptTimeout = null;
        }
        
        // If no transcript captured, show a fallback
        if (!this.answerTranscript.textContent.trim()) {
            this.answerTranscript.innerHTML = '<p>Recording completed. Generating feedback...</p>';
        }
        
        // Automatically request feedback instead of just showing the button
        setTimeout(() => {
            this.requestFeedback();
        }, 100); // Small delay to ensure UI is updated
    }

    // Handle real-time transcript updates from server (OpenAI — accurate content)
    updateTranscript(text, isFinal) {
        this.lastTranscriptTime = Date.now();
        if (!text) return;

        // Store server transcript separately — used for feedback AI (more accurate content)
        this.serverTranscript = text;

        // While Web Speech API is running it controls the display — don't overwrite
        if (this.isRecording && this.recognition) return;

        // After recording stops, show the server transcript if Web Speech gave nothing
        if (!this.webSpeechFinalText) {
            this.answerTranscript.innerHTML = `<p>${text}</p>`;
        }

        this.answerTranscript.scrollTop = this.answerTranscript.scrollHeight;

        if (isFinal && !this.isRecording) {
            setTimeout(() => {
                this.requestFeedback();
            }, 500);
        }
    }

    getFeedback() {
        this.requestFeedback();
    }

    // Generate question type options for select dropdown
    generateQuestionTypeOptions() {
        const selectedType = this.isTestMode ? 'technical' : 'mixed';
        return this.questionTypes.map(type => 
            `<option value="${type.value}" ${type.value === selectedType ? 'selected' : ''}>${type.label}</option>`
        ).join('');
    }

    // Format question type for display
    formatQuestionType(type) {
        // Find the label from our centralized config
        const questionType = this.questionTypes.find(qt => qt.value === type);
        if (questionType) {
            return questionType.label;
        }
        
        // Fallback formatting
        return type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ') : 'General';
    }

    // Format experience years for display (matching profile page formatting)
    formatExperience(years) {
        if (years === null || years === undefined) return null;
        if (years === 0) return 'Fresh Graduate';
        if (years === 1) return '1 year';
        if (years >= 6 && years < 10) return '6-10 years';
        if (years >= 10) return '10+ years';
        return `${years} years`;
    }

    // Timer methods (from original ai-interviewer.js)
    startTimer() {
        this.answerStartTime = Date.now();
        if (this.timer) {
            this.timer.style.display = 'block';
        }
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.answerStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            if (this.timerValue) {
                this.timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.timer) {
            this.timer.style.display = 'none';
        }
    }

    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 300);
        }, 5000);
    }

    // Handle streaming feedback updates (from original ai-interviewer.js)
    updateFeedback(chunk, isFinal) {
        // For now, we'll wait for the complete feedback
        // The streaming is still happening on the backend but we'll display it all at once
    }

    // Full feedback request implementation (copied from original ai-interviewer.js)
    requestFeedback(retryCount = 0) {
        // Prevent multiple simultaneous feedback requests
        if (this.isRequestingFeedback) {
            console.log('Feedback request already in progress, ignoring duplicate request');
            return;
        }
        
        console.log(`Requesting feedback... (attempt ${retryCount + 1})`);
        this.isRequestingFeedback = true;
        this.feedbackSection.style.display = 'block';
        this.feedbackSpinner.style.display = 'block';
        this.feedbackContent.style.display = 'none';
        
        // Disable navigation buttons while generating insights
        this.disableNavigationButtons();
        
        // Scroll to feedback section smoothly
        this.feedbackSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Prefer server transcript for feedback AI (more accurate content)
        // Fall back to Web Speech transcript, then display text
        const rawAnswerText = this.serverTranscript
            || this.webSpeechFinalText
            || (this.answerTranscript ? this.answerTranscript.textContent : '');
        const answerText = String(rawAnswerText || '').replace(/\s+/g, ' ').trim();
        const questionText = this.currentQuestionText;
        const isPlaceholderAnswer = /finalizing transcript/i.test(answerText) || /processing final transcript/i.test(answerText);
        if (isPlaceholderAnswer || !answerText) {
            this.pendingTranscriptRetries = (this.pendingTranscriptRetries || 0) + 1;
            if (this.pendingTranscriptRetries <= 20 && (this.isFinalizingTranscript || this.voiceAnswerSection?.style.display !== 'none')) {
                this.isRequestingFeedback = false;
                setTimeout(() => this.requestFeedback(retryCount), 300);
                return;
            }
            this.pendingTranscriptRetries = 0;
        } else {
            this.pendingTranscriptRetries = 0;
        }
        
        // Set a client-side timeout
        const feedbackTimeout = setTimeout(() => {
            console.error('Feedback request timed out');
            
            if (retryCount < 2) {
                console.log('Retrying feedback request...');
                // Reset flag before retry
                this.isRequestingFeedback = false;
                this.requestFeedback(retryCount + 1);
            } else {
                // Reset flag on final failure
                this.isRequestingFeedback = false;
                // Show error message after max retries
                this.feedbackSpinner.style.display = 'none';
                this.feedbackContent.style.display = 'block';
                
                // Show error in the existing feedback structure without destroying DOM
                const errorMessage = 'Unable to generate feedback due to technical difficulties.';
                
                // Use the existing feedback display function with error content
                this.displayFeedback({
                    feedback: `**Strengths:**
${errorMessage}

**Areas for Improvement:**
Please try clicking "Get Feedback" again or move to the next question.

**Suggested Better Response:**
If the issue persists, please refresh the page.

**Interview Tips:**
We apologize for the inconvenience. Your answer was recorded successfully.`,
                    score: 0,
                    comparison: 'Technical error - no score available'
                });
                
                if (this.nextQuestionBtn) this.nextQuestionBtn.style.display = 'inline-block';
                if (this.tryAgainBtn) this.tryAgainBtn.style.display = 'inline-block';
            }
        }, 25000); // 25 second timeout
        
        // Store timeout ID to clear it when feedback is received
        this.feedbackTimeout = feedbackTimeout;
        
        // Get previous attempts for this question
        const previousAttempts = this.answerHistory.get(questionText) || [];
        
        // Debug: Check what language is being sent
        const languageToSend = this.sessionConfig?.language || 'english';
        console.log('Session config:', this.sessionConfig);
        console.log('Language being sent for feedback:', languageToSend);
        
        console.log('Sending feedback request:', {
            sessionId: this.sessionId,
            question: questionText.substring(0, 100) + '...',
            answer: answerText.substring(0, 100) + '...',
            previousAttempts: previousAttempts.length,
            language: languageToSend,
            detectedRole: this.sessionConfig?.detectedRole || '',
            difficultyLevel: this.sessionConfig?.difficultyLevel || 'intermediate',
            hasSessionConfig: !!this.sessionConfig,
            sessionConfigKeys: this.sessionConfig ? Object.keys(this.sessionConfig) : []
        });
        
        console.log('Emitting requestFeedback event to server...', {
            socketConnected: this.socket.connected,
            socketId: this.socket.id
        });
        
        // Track answer mode and duration
        const answerMode = this.voiceAnswerSection && this.voiceAnswerSection.style.display !== 'none' ? 'voice' : 'text';
        const answerDuration = this.answerStartTime ? Math.floor((Date.now() - this.answerStartTime) / 1000) : 0;
        
        this.socket.emit('requestFeedback', {
            sessionId: this.sessionId,
            question: questionText,
            answer: answerText,
            resume: this.resumeContent,
            jobDescription: this.jobDescription || this.sessionConfig?.jobDescription,
            previousAttempts: previousAttempts,
            // Include language for localized feedback
            language: languageToSend,
            detectedRole: this.sessionConfig?.detectedRole || '',
            difficultyLevel: this.sessionConfig?.difficultyLevel || 'intermediate',
            // TEST MODE: Mark as test mode to prevent database saving
            isTestMode: this.isTestMode,
            // Add all configuration data for progress tracking
            currentRole: this.sessionConfig?.currentRole || '',
            experienceYears: this.sessionConfig?.experienceYears || '',
            detectedCompany: this.sessionConfig?.detectedCompany || '',
            detectedIndustry: this.sessionConfig?.detectedIndustry || '',
            questionType: this.sessionConfig?.questionType || '',
            companyName: this.sessionConfig?.companyName || '',
            additionalInfo: this.sessionConfig?.additionalInfo || '',
            answerMode: answerMode,
            answerDuration: answerDuration,
            questionNumber: this.currentQuestion
        });
        
        console.log('requestFeedback event emitted successfully');
    }

    submitTextAnswer() {
        const answer = this.textAnswer.value.trim();
        if (!answer) {
            alert('Please enter your answer before submitting.');
            return;
        }
        
        console.log('Submitting text answer:', answer);
        
        // Display the answer in the transcript box
        if (this.answerTranscript) {
            this.answerTranscript.innerHTML = `<p><strong>You:</strong> ${answer}</p>`;
        }
        
        // Hide submit button after submission
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.style.display = 'none';
        }
        
        // Show Get Feedback button
        if (this.getFeedbackBtn) {
            this.getFeedbackBtn.style.display = 'inline-block';
        }
        
        // Scroll to answer section
        if (this.answerSection) {
            this.answerSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
        
        // Automatically request feedback after a short delay
        setTimeout(() => {
            this.requestFeedback();
        }, 100);
        
        console.log('Text answer submitted:', answer);
    }

    clearTextAnswer() {
        this.textAnswer.value = '';
    }

    processAnswer(answerText) {
        console.log('Processing answer:', answerText);
        
        if (!this.socket) {
            console.error('WebSocket not connected');
            alert('Error: Not connected to server. Please refresh the page.');
            return;
        }
        
        // Show feedback section
        this.feedbackSection.style.display = 'block';
        this.feedbackSpinner.style.display = 'block';
        this.feedbackContent.style.display = 'none';

        // Get previous attempts for this question
        const questionText = this.currentQuestionText;
        const previousAttempts = this.answerHistory.get(questionText) || [];

        // Request feedback via WebSocket
        console.log('Emitting requestFeedback event...');
        this.socket.emit('requestFeedback', {
            sessionId: this.sessionId,
            question: questionText,
            answer: answerText,
            resume: this.resumeContent,
            jobDescription: this.jobDescription || this.sessionConfig.jobDescription,
            previousAttempts: previousAttempts,
            language: this.sessionConfig.language || 'english',
            detectedRole: this.sessionConfig.detectedRole || '',
            difficultyLevel: this.sessionConfig.difficultyLevel || 'intermediate',
            questionNumber: this.currentQuestion,
            // TEST MODE: Mark as test mode to prevent database saving
            isTestMode: this.isTestMode,
            answerMode: this.answerMode,
            answerDuration: 0 // TODO: Calculate actual duration
        });
    }

    // Display feedback implementation (updated to match original ai-interviewer.js)
    displayFeedback(data) {
        console.log('displayFeedback called with:', {
            hasFeedback: !!data.feedback,
            feedbackLength: data.feedback?.length || 0,
            score: data.score,
            hasComparison: !!data.comparison,
            feedbackSpinnerExists: !!this.feedbackSpinner,
            feedbackContentExists: !!this.feedbackContent
        });
        
        const { feedback, score, comparison } = data;
        
        // Reset the feedback request flag
        this.isRequestingFeedback = false;
        
        // Clear any pending timeout since we received feedback
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
            this.feedbackTimeout = null;
        }
        
        // Re-enable navigation buttons now that insights are ready
        this.enableNavigationButtons();
        
        // Hide spinner, show feedback content
        console.log('Updating UI elements...', {
            spinnerCurrentDisplay: this.feedbackSpinner?.style.display,
            contentCurrentDisplay: this.feedbackContent?.style.display,
            feedbackSectionDisplay: this.feedbackSection?.style.display
        });
        
        // Ensure feedback section is visible
        if (this.feedbackSection) {
            this.feedbackSection.style.display = 'block';
        }
        if (this.feedbackSpinner) {
            this.feedbackSpinner.style.display = 'none';
        }
        if (this.feedbackContent) {
            this.feedbackContent.style.display = 'block';
            this.feedbackContent.style.visibility = 'visible';
            this.feedbackContent.style.opacity = '1';
        }
        
        // Display score with animation
        this.animateScore(score);

        if (this.scoreMeterFill) {
            const percent = Math.min(100, Math.max(0, score * 10));
            this.scoreMeterFill.style.width = `${percent}%`;
        }
        
        // Display comparison if available
        if (comparison && this.scoreComparison) {
            this.scoreComparison.innerHTML = comparison;
            this.scoreComparison.className = comparison.includes('improved') ? 'score-comparison score-improvement' : 
                                           comparison.includes('lower') ? 'score-comparison score-decline' :
                                           'score-comparison';
        } else if (this.scoreComparison) {
            this.scoreComparison.innerHTML = 'First attempt at this question';
            this.scoreComparison.className = 'score-comparison';
        }
        
        // Parse the feedback sections
        const sections = this.parseFeedback(feedback);
        
        console.log('Parsed feedback sections:', {
            hasStrengths: !!sections.strengths,
            hasImprovements: !!sections.improvements,
            hasBetterResponse: !!sections.betterResponse,
            hasTips: !!sections.tips
        });
        
        // Populate each section with proper formatting
        if (this.strengthsContent) {
            this.strengthsContent.innerHTML = this.formatFeedbackText(sections.strengths) || 'No specific strengths identified.';
            console.log('Strengths populated');
        }
        
        if (this.improvementsContent) {
            this.improvementsContent.innerHTML = this.formatFeedbackText(sections.improvements) || 'Continue practicing to enhance your skills.';
            console.log('Improvements populated');
        }
        
        if (this.betterResponseContent) {
            this.betterResponseContent.innerHTML = this.formatFeedbackText(sections.betterResponse) || 'Consider elaborating more on your experience and skills.';
            console.log('Better response populated');
        }
        
        if (this.tipsContent) {
            const formattedTips = this.formatFeedbackText(sections.tips);
            console.log('Tips content before formatting:', sections.tips);
            console.log('Tips content after formatting:', formattedTips);
            this.tipsContent.innerHTML = formattedTips || 'Keep practicing to improve your interview skills.';
            console.log('Tips populated');
        }
        
        // Delivery analysis + annotated transcript
        this.renderDeliveryAnalysis();

        // Fetch and display model answer
        this.loadModelAnswer();

        // Store this attempt in history
        const questionText = this.currentQuestionText;
        const answerText = this.answerTranscript.textContent;
        
        if (!this.answerHistory.has(questionText)) {
            this.answerHistory.set(questionText, []);
        }
        
        this.answerHistory.get(questionText).push({
            answer: answerText,
            score: score,
            timestamp: new Date().toISOString()
        });
        
        // Show appropriate buttons based on current question
        if (this.currentQuestion >= this.totalQuestions) {
            // Last question - show completion options instead of next question
            if (this.nextQuestionBtn) {
                this.nextQuestionBtn.textContent = 'View Session Results';
                this.nextQuestionBtn.style.display = 'inline-block';
            }
        } else {
            // Regular question - show next question button
            if (this.nextQuestionBtn) {
                this.nextQuestionBtn.textContent = 'Next Question';
                this.nextQuestionBtn.style.display = 'inline-block';
            }
        }
        
        // Check if retry is allowed (max 1 retry = 2 total attempts)
        const attempts = this.answerHistory.get(questionText) || [];
        if (attempts.length >= 2) {
            // Already retried once, don't show retry button
            if (this.tryAgainBtn) {
                this.tryAgainBtn.style.display = 'none';
            }
        } else {
            // First attempt, show retry button
            if (this.tryAgainBtn) {
                this.tryAgainBtn.style.display = 'inline-block';
                this.tryAgainBtn.textContent = 'Try This Question Again';
            }
        }
        
        // Scroll to feedback section
        this.feedbackSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    renderDeliveryAnalysis() {
        const isTextMode = this.answerMode === 'text';

        // For text answers use the textarea; for voice use the raw Web Speech transcript
        // (preserves fillers/repetitions — server transcript cleans them up)
        let rawText = isTextMode
            ? (this.textAnswer?.value?.trim() || '')
            : (this.webSpeechFinalText?.trim() || this.answerTranscript?.textContent?.trim() || '');

        if (!rawText || rawText.length < 10) return;

        const duration = this.lastAnswerDuration || 0;
        const words = rawText.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const wpm = (!isTextMode && duration > 0) ? Math.round((wordCount / duration) * 60) : null;

        // Filler words
        const fillerPattern = /\b(um|uh|mmm|hmm|ah|well|like|you know|actually|basically|literally|so|right|okay|yeah)\b/gi;
        const fillerMatches = rawText.match(fillerPattern) || [];
        const fillerCount = fillerMatches.length;

        // Pauses (silence gaps > 1.5 s captured during recording)
        const pauses = this.speechPauses || [];
        const pauseCount = pauses.length;
        const longestPause = pauseCount > 0 ? Math.max(...pauses.map(p => p.duration)) : 0;
        const longestPauseSec = longestPause > 0 ? (longestPause / 1000).toFixed(1) : null;

        // Confidence — penalise both fillers and pauses
        const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
        // Pause penalty: each pause > 1.5 s adds 0.03 to the score; longest pause > 4 s adds extra 0.05
        const pausePenalty = (pauseCount * 0.03) + (longestPause > 4000 ? 0.05 : 0);
        const confidenceScore = fillerRatio + pausePenalty;
        const confidence = confidenceScore > 0.10 ? { label: 'Low', color: '#ef4444', bg: '#fee2e2' }
                         : confidenceScore < 0.03 ? { label: 'High', color: '#16a34a', bg: '#dcfce7' }
                         : { label: 'Medium', color: '#d97706', bg: '#fef9c3' };

        // WPM rating
        const wpmRating = wpm === 0 ? { label: '—', color: '#94a3b8' }
                        : wpm < 100  ? { label: 'Too slow', color: '#ef4444' }
                        : wpm > 170  ? { label: 'Too fast', color: '#ef4444' }
                        : wpm > 140  ? { label: 'Good', color: '#16a34a' }
                        : { label: 'Ideal', color: '#16a34a' };

        // Duration rating
        const durLabel = duration === 0 ? '—'
                       : duration < 30  ? 'Too short'
                       : duration > 180 ? 'Too long'
                       : `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
        const durColor = duration > 0 && duration < 30 ? '#ef4444'
                       : duration > 180 ? '#d97706' : '#16a34a';

        // Render stats pills
        const statsEl = document.getElementById('deliveryStats');
        if (statsEl) {
            const stat = (label, value, color, sublabel) =>
                `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 16px;text-align:center;">
                    <div style="font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">${label}</div>
                    <div style="font-size:1.15rem;font-weight:700;color:${color};">${value}</div>
                    ${sublabel ? `<div style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">${sublabel}</div>` : ''}
                </div>`;

            let html = stat('Words', wordCount, '#475569') +
                stat('Fillers', fillerCount, fillerCount > 5 ? '#ef4444' : fillerCount > 2 ? '#d97706' : '#16a34a') +
                stat('Confidence', confidence.label, confidence.color);

            if (!isTextMode) {
                const pauseColor = pauseCount > 5 ? '#ef4444' : pauseCount > 2 ? '#d97706' : '#16a34a';
                html = stat('Duration', duration > 0 ? durLabel : '—', durColor) +
                    stat('Pace', wpm !== null && wpm > 0 ? `${wpm} wpm` : '—', wpmRating.color, wpmRating.label !== '—' ? wpmRating.label : null) +
                    stat('Pauses', pauseCount > 0 ? pauseCount : '0', pauseColor, longestPauseSec ? `longest ${longestPauseSec}s` : null) + html;
            }

            statsEl.innerHTML = html;
        }

        // Annotate transcript
        const annotatedEl = document.getElementById('annotatedTranscript');
        if (!annotatedEl) return;

        const strongPhrases = /\b(led|managed|delivered|achieved|increased|reduced|improved|built|launched|developed|created|designed|implemented|saved|grew|scaled|negotiated|collaborated|resolved|exceeded|exceeded|spearheaded|initiated|drove|mentored|\d+%|\$\d+|\d+ (years?|months?|people|team|projects?))\b/gi;
        const vagueWords = /\b(kind of|sort of|i think|i guess|maybe|perhaps|might|probably|i feel like|i suppose|somewhat|fairly|quite|rather|a bit|stuff|things|something like)\b/gi;

        let annotated = rawText;

        // Order matters: annotate fillers first (red), then vague (yellow), then strong (green)
        // Use placeholders to avoid re-processing
        const replacements = [];
        let idx = 0;

        annotated = annotated.replace(fillerPattern, (match) => {
            const key = `__R${idx++}__`;
            replacements.push({ key, html: `<mark style="background:#fee2e2;color:#991b1b;border-radius:4px;padding:1px 3px;">${match}</mark>` });
            return key;
        });

        annotated = annotated.replace(vagueWords, (match) => {
            const key = `__R${idx++}__`;
            replacements.push({ key, html: `<mark style="background:#fef9c3;color:#854d0e;border-radius:4px;padding:1px 3px;">${match}</mark>` });
            return key;
        });

        annotated = annotated.replace(strongPhrases, (match) => {
            // Don't re-highlight already-replaced text
            if (match.startsWith('__R')) return match;
            const key = `__R${idx++}__`;
            replacements.push({ key, html: `<mark style="background:#dcfce7;color:#166534;border-radius:4px;padding:1px 3px;">${match}</mark>` });
            return key;
        });

        // Restore all replacements
        replacements.forEach(({ key, html }) => { annotated = annotated.replace(key, html); });

        annotatedEl.innerHTML = annotated;
    }

    async loadModelAnswer() {
        const section = document.getElementById('modelAnswerSection');
        const modelText = document.getElementById('modelAnswerText');
        const userText = document.getElementById('modelAnswerUserText');
        if (!section || !modelText || !userText) return;

        // Show section with loading state
        section.style.display = 'block';
        modelText.innerHTML = '<span style="color:#94a3b8;font-size:0.88rem;">Generating model answer...</span>';
        userText.textContent = this.answerTranscript?.textContent || '(no answer recorded)';

        try {
            const response = await fetch('/api/ai/model-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: this.currentQuestionText,
                    jobDescription: this.jobDescription || '',
                    resume: this.resumeContent || '',
                    detectedRole: this.sessionConfig?.detectedRole || '',
                    questionType: this.sessionConfig?.questionType || ''
                })
            });

            if (!response.ok) throw new Error('Failed');
            const data = await response.json();
            if (!data.success || !data.answer) throw new Error('No answer');

            modelText.innerHTML = this.renderModelAnswer(data.answer, data.isBehavioural);
        } catch (e) {
            modelText.innerHTML = '<span style="color:#94a3b8;font-size:0.88rem;">Could not generate model answer. Please try again.</span>';
        }
    }

    renderModelAnswer(text, isBehavioural) {
        if (!isBehavioural) {
            return `<p style="margin:0;">${text.replace(/\n/g, '<br>')}</p>`;
        }

        const tagColors = {
            S: { bg: '#dbeafe', text: '#1d4ed8', label: 'Situation' },
            T: { bg: '#dcfce7', text: '#15803d', label: 'Task' },
            A: { bg: '#fef9c3', text: '#854d0e', label: 'Action' },
            R: { bg: '#f3e8ff', text: '#6b21a8', label: 'Result' }
        };

        let html = text;
        for (const [tag, style] of Object.entries(tagColors)) {
            const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi');
            html = html.replace(regex, (_, content) =>
                `<span style="display:inline-block;background:${style.bg};color:${style.text};font-size:0.72rem;font-weight:700;padding:1px 7px;border-radius:20px;margin-right:6px;vertical-align:middle;">${style.label}</span>${content.trim()} `
            );
        }

        // Fallback: if no tags were found, just render plain
        if (html === text) return `<p style="margin:0;">${text.replace(/\n/g, '<br>')}</p>`;
        return `<p style="margin:0;line-height:1.8;">${html}</p>`;
    }

    // Helper methods (copied from original ai-interviewer.js)
    animateScore(targetScore) {
        let currentScore = 0;
        const increment = targetScore / 20; // 20 steps for smooth animation
        
        const timer = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(timer);
            }
            if (this.scoreNumber) {
                this.scoreNumber.textContent = Math.round(currentScore * 10) / 10;
            }
        }, 50);
    }
    
    parseFeedback(feedbackText) {
        console.log('Parsing feedback text:', feedbackText);
        console.log('Full feedback text length:', feedbackText.length);
        
        const sections = {
            strengths: '',
            improvements: '',
            betterResponse: '',
            tips: ''
        };
        
        // More flexible patterns to handle variations in formatting
        const patterns = {
            strengths: [
                /\*\*Strengths:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Strength:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*What you did well:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Positive aspects:\*\*([\s\S]*?)(?=\*\*|$)/i
            ],
            improvements: [
                /\*\*Areas for Improvement:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Areas of Improvement:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Improvements:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Areas to improve:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*What to improve:\*\*([\s\S]*?)(?=\*\*|$)/i
            ],
            betterResponse: [
                /\*\*Suggested Better Response:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Better Response:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Suggested Response:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Improved Answer:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Sample Answer:\*\*([\s\S]*?)(?=\*\*|$)/i
            ],
            tips: [
                /\*\*Interview Tips:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Tips:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*General Tips:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Recommendations:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Tips for Improvement:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Additional Tips:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*Advice:\*\*([\s\S]*?)(?=\*\*|$)/i
            ]
        };
        
        // Try to match each section
        for (const [section, patternList] of Object.entries(patterns)) {
            let found = false;
            for (const pattern of patternList) {
                const match = feedbackText.match(pattern);
                if (match && match[1]) {
                    sections[section] = match[1].trim();
                    console.log(`Found ${section}:`, sections[section].substring(0, 100) + '...');
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`Section '${section}' not found in feedback`);
                // Look for any headers that might match
                const potentialHeaders = feedbackText.match(/\*\*[^*]+:\*\*/gi);
                if (potentialHeaders) {
                    console.log('Found these headers:', potentialHeaders);
                }
                // Also show the end of the feedback to see if tips are there but with different formatting
                const lastPart = feedbackText.slice(-300);
                console.log('Last 300 characters of feedback:', lastPart);
            }
        }
        
        return sections;
    }
    
    formatFeedbackText(feedbackText) {
        if (!feedbackText) return '';
        
        // Convert various markdown and text formatting to HTML
        let formatted = feedbackText
            // Convert bullet points (• or - at start of line) to proper HTML list items
            .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
            // Convert double newlines to paragraph breaks
            .replace(/\n\n/g, '</p><p>')
            // Convert single newlines to line breaks
            .replace(/\n/g, '<br>')
            // Convert bold markdown to HTML
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert italic markdown to HTML
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // If we have list items, wrap them in a proper list
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
            // Clean up any duplicate ul tags
            formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');
        }
        
        // Wrap in paragraphs if not already wrapped
        if (!formatted.includes('<p>') && !formatted.includes('<ul>')) {
            formatted = `<p>${formatted}</p>`;
        } else if (formatted.includes('<p>') && !formatted.startsWith('<p>')) {
            formatted = `<p>${formatted}</p>`;
        }
        
        return formatted;
    }
    
    enableNavigationButtons() {
        // Re-enable the navigation buttons
        if (this.nextQuestionBtn) {
            this.nextQuestionBtn.disabled = false;
            this.nextQuestionBtn.style.opacity = '1';
            this.nextQuestionBtn.style.cursor = 'pointer';
        }
        if (this.tryAgainBtn) {
            this.tryAgainBtn.disabled = false;
            this.tryAgainBtn.style.opacity = '1';
            this.tryAgainBtn.style.cursor = 'pointer';
        }
        
        // Also re-enable text answer buttons
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.disabled = false;
            this.submitTextAnswerBtn.style.opacity = '1';
            this.submitTextAnswerBtn.style.cursor = 'pointer';
        }
        if (this.clearTextAnswerBtn) {
            this.clearTextAnswerBtn.disabled = false;
            this.clearTextAnswerBtn.style.opacity = '1';
            this.clearTextAnswerBtn.style.cursor = 'pointer';
        }
        
        console.log('Navigation and text answer buttons enabled after feedback generation');
    }

    disableNavigationButtons() {
        // Disable and grey out the navigation buttons
        if (this.nextQuestionBtn) {
            this.nextQuestionBtn.disabled = true;
            this.nextQuestionBtn.style.opacity = '0.5';
            this.nextQuestionBtn.style.cursor = 'not-allowed';
        }
        if (this.tryAgainBtn) {
            this.tryAgainBtn.disabled = true;
            this.tryAgainBtn.style.opacity = '0.5';
            this.tryAgainBtn.style.cursor = 'not-allowed';
        }
        
        // Also disable text answer buttons
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.disabled = true;
            this.submitTextAnswerBtn.style.opacity = '0.5';
            this.submitTextAnswerBtn.style.cursor = 'not-allowed';
        }
        if (this.clearTextAnswerBtn) {
            this.clearTextAnswerBtn.disabled = true;
            this.clearTextAnswerBtn.style.opacity = '0.5';
            this.clearTextAnswerBtn.style.cursor = 'not-allowed';
        }
        
        console.log('Navigation and text answer buttons disabled while generating feedback');
    }

    disableSubmitButton() {
        // Disable submit button due to retry limit
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.disabled = true;
            this.submitTextAnswerBtn.style.opacity = '0.5';
            this.submitTextAnswerBtn.style.cursor = 'not-allowed';
            this.submitTextAnswerBtn.textContent = 'Submit Answer';
        }
        
        console.log('Submit button disabled due to retry limit');
    }

    enableSubmitButton() {
        // Enable submit button 
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.disabled = false;
            this.submitTextAnswerBtn.style.opacity = '1';
            this.submitTextAnswerBtn.style.cursor = 'pointer';
            this.submitTextAnswerBtn.textContent = 'Submit Answer';
        }
        
        console.log('Submit button enabled');
    }

    getUserEmail() {
        const authToken = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (authToken && user.email) {
            return user.email;
        }
        return localStorage.getItem('userEmail') || '';
    }

    getUserName() {
        const authToken = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (authToken && user.name) {
            return user.name;
        }
        return localStorage.getItem('userName') || '';
    }

    showSessionResults() {
        // Calculate session statistics
        const stats = this.calculateSessionStats();
        const scorePercent = Math.min(100, Math.max(0, (stats.averageScore / 10) * 100));
        
        this.interviewPanel.innerHTML = `
            <div class="session-results">
                <div class="results-shell">
                    <div class="results-summary">
                        <h2>Session Complete!</h2>
                        <p>Here's how you performed</p>
                        <div class="score-row">
                            <div class="score-block">
                                <div class="score-label">Average Score</div>
                                <div class="score-value">${stats.averageScore}</div>
                                <div class="score-sub">${stats.scoreDescription}</div>
                            </div>
                            <div class="score-meter">
                                <div class="score-meter-track">
                                    <div class="score-meter-fill" style="width: ${scorePercent}%;"></div>
                                </div>
                                <div class="score-meter-label">Out of 10</div>
                            </div>
                        </div>
                    </div>

                    <div class="results-main">
                        <h3>AI Insights</h3>
                        <div id="aiInsights">
                            <div class="insights-placeholder">
                                Generating personalized insights based on your performance...
                            </div>
                        </div>
                    </div>

                    <div class="results-support">
                        <div class="results-card">
                            <h4>Best Score</h4>
                            <div class="results-stat">${stats.bestScore}</div>
                            <p>Question ${stats.bestQuestionNumber}</p>
                        </div>
                        <div class="results-card">
                            <h4>Total Attempts</h4>
                            <div class="results-stat">${stats.totalAttempts}</div>
                            <p>Across all questions</p>
                        </div>
                        <div class="results-card highlight">
                            <h4>Improvement</h4>
                            <div class="results-stat">${stats.improvement}</div>
                            <p>${stats.improvementDescription}</p>
                        </div>
                    </div>

                    <!-- What you'd get next teaser (locked) -->
                    <div style="margin:24px 0;padding:20px 24px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:14px;text-align:left;">
                        <p style="font-weight:700;font-size:1rem;color:#1e293b;margin:0 0 12px;">🔒 Your next session would include</p>
                        <ul style="margin:0 0 12px;padding-left:20px;color:#475569;font-size:0.92rem;line-height:1.8;">
                            <li>Questions tailored to <strong>your actual CV</strong> and background</li>
                            <li>Behavioural, technical &amp; situational question mix</li>
                            <li><strong>5 questions</strong> per deep-dive session</li>
                            <li>Progress tracking across all your sessions</li>
                            <li>Full AI coaching report after every answer</li>
                        </ul>
                        <p style="margin:0;font-size:0.85rem;color:#94a3b8;">From £6.99 · One-time payment · No subscription</p>
                    </div>

                    <div class="results-actions">
                        ${this.isGuest ? `
                        <h3 style="margin-bottom:6px;">You scored ${stats.averageScore}/10</h3>
                        <p style="color:#64748b;margin-bottom:20px;font-size:0.95rem;">Most users reach 8+ after just 3 sessions of focused practice.</p>
                        <a href="/pricing" class="btn btn-primary" style="font-size:1.05rem;padding:14px 36px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">Unlock Full Practice &mdash; from £6.99</a>
                        <p style="font-size:0.82rem;color:#94a3b8;margin:0 0 10px;">One-time payment &middot; No subscription</p>
                        <a href="/signup" style="font-size:0.88rem;color:#3b82f6;text-decoration:underline;">or create a free account first</a>
                        ` : `
                        <h3 style="margin-bottom:6px;">Ready to go deeper?</h3>
                        <p style="color:#64748b;margin-bottom:20px;font-size:0.95rem;">Unlock unlimited sessions, CV-tailored questions, and full progress tracking.</p>
                        <a href="/pricing" class="btn btn-primary" style="font-size:1.05rem;padding:14px 36px;display:inline-flex;align-items:center;justify-content:center;">Unlock Full Access &mdash; from £6.99</a>
                        <p style="font-size:0.82rem;color:#94a3b8;margin-top:10px;">One-time payment &middot; No subscription</p>
                        `}
                    </div>
                </div>
            </div>

            <!-- CV Required Modal -->
            <div id="cvRequiredModal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>CV Required</h3>
                    </div>
                    <div class="modal-body">
                        <div class="modal-icon">Document</div>
                        <p>A CV/Resume is required to start a practice session.</p>
                        <p>Your CV helps generate personalized interview questions tailored to your background and experience.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="practiceSession.closeCVRequiredModal()">Maybe Later</button>
                        <button class="btn btn-primary" onclick="practiceSession.goToProfile()">Upload CV</button>
                    </div>
                </div>
            </div>

            <!-- Job Description Required Modal -->
            <div id="jobDescriptionRequiredModal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Job Description Required</h3>
                    </div>
                    <div class="modal-body">
                        <div class="modal-icon">Checklist</div>
                        <p>A job description is required to start a practice session.</p>
                        <p>The job description helps generate relevant interview questions tailored to the specific role you're applying for.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="practiceSession.closeJobDescriptionRequiredModal()">Got it</button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove the sticky session bar now that the session is over
        const upgradeBar = document.getElementById('sessionUpgradeBar');
        if (upgradeBar) { upgradeBar.remove(); document.body.style.paddingBottom = ''; }

        // Generate AI insights after displaying the results
        this.generateAIInsights();

        // Mark test as used (TEST MODE ONLY)
        if (this.isTestMode) {
            this.markTestAsUsed();
        }
    }
    
    calculateSessionStats() {
        const allScores = [];
        let totalAttempts = 0;
        
        // Process each question's attempts
        this.answerHistory.forEach((attempts, question) => {
            totalAttempts += attempts.length;
            const bestAttempt = attempts.reduce((best, current) => 
                current.score > best.score ? current : best
            );
            
            allScores.push(bestAttempt.score);
        });
        
        // Calculate stats
        const averageScore = allScores.length > 0 ? 
            Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10) / 10 : 0;
        const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
        const bestQuestionIndex = allScores.indexOf(bestScore);
        const firstScore = allScores[0] || 0;
        const lastScore = allScores[allScores.length - 1] || 0;
        const improvement = lastScore - firstScore;
        
        return {
            averageScore: averageScore,
            scoreDescription: this.getScoreDescription(averageScore),
            bestScore: bestScore,
            bestQuestionNumber: bestQuestionIndex + 1,
            totalAttempts: totalAttempts,
            improvement: improvement >= 0 ? `+${improvement.toFixed(1)}` : improvement.toFixed(1),
            improvementDescription: improvement > 0 ? 'Great progress!' : improvement < 0 ? 'Room to grow' : 'Consistent performance'
        };
    }
    
    getScoreDescription(score) {
        if (score >= 9) return 'Outstanding';
        if (score >= 8) return 'Excellent';
        if (score >= 7) return 'Very Good';
        if (score >= 6) return 'Good';
        if (score >= 5) return 'Fair';
        return 'Needs Improvement';
    }

    async generateAIInsights() {
        // TEST MODE: Generate real insights but blur them behind a lock overlay
        if (this.isTestMode) {
            const aiInsightsElement = document.getElementById('aiInsights');
            if (!aiInsightsElement) return;

            aiInsightsElement.innerHTML = `<div style="text-align:center;padding:20px;color:#64748b;font-size:0.95rem;">Generating your personalized insights...</div>`;

            try {
                const feedbackData = this.collectFeedbackData();
                const response = await fetch('/api/ai/generate-session-insights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ feedbackData, sessionConfig: this.sessionConfig })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.insights && data.insights.length > 0) {
                        aiInsightsElement.innerHTML = `
                            <div style="position:relative;">
                                <div style="filter:blur(5px);pointer-events:none;user-select:none;">
                                    ${data.insights.map(insight => `
                                        <div style="margin:15px 0;padding:12px;background:#fff;border-left:4px solid #86efac;border-radius:12px;box-shadow:0 8px 14px rgba(15,23,42,0.08);">
                                            <p style="margin:0;color:#1f2937;">- ${insight}</p>
                                        </div>
                                    `).join('')}
                                </div>
                                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.55);backdrop-filter:blur(1px);border-radius:12px;">
                                    <div style="font-size:2rem;margin-bottom:8px;">🔒</div>
                                    <p style="font-weight:700;font-size:1.05rem;color:#1e293b;margin:0 0 6px;text-align:center;">Your coaching report is ready</p>
                                    <p style="color:#64748b;font-size:0.88rem;margin:0 0 16px;text-align:center;max-width:260px;">Create an account to read your full personalized insights.</p>
                                    <a href="/signup" style="padding:10px 24px;background:#3b82f6;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:0.92rem;">Create Free Account</a>
                                </div>
                            </div>
                        `;
                        return;
                    }
                }
            } catch (e) { /* fall through to placeholder */ }

            // Fallback if API call fails
            aiInsightsElement.innerHTML = `
                <div style="text-align:center;padding:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                    <p style="font-weight:700;color:#1e293b;margin:0 0 8px;">Personalized insights available in full version</p>
                    <p style="color:#64748b;font-size:0.9rem;margin:0;">Get detailed coaching after every answer with a paid package.</p>
                </div>
            `;
            return;
        }
        
        try {
            // Collect all feedback data from the session
            const feedbackData = this.collectFeedbackData();
            
            const response = await fetch('/api/ai/generate-session-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    feedbackData: feedbackData,
                    sessionConfig: this.sessionConfig
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.insights) {
                    // Display the AI-generated insights with proper formatting (matching original)
                    const aiInsightsElement = document.getElementById('aiInsights');
                    if (aiInsightsElement) {
                        aiInsightsElement.innerHTML = `
                            <div style="line-height: 1.6;">
                                ${data.insights.map(insight => `
                                    <div style="margin: 15px 0; padding: 12px; background: #fff; border-left: 4px solid #86efac; border-radius: 12px; box-shadow: 0 8px 14px rgba(15, 23, 42, 0.08);">
                                        <p style="margin: 0; color: #1f2937; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">- ${insight}</p>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                } else {
                    throw new Error(data.message || 'Failed to generate insights');
                }
            } else {
                throw new Error('Network error generating insights');
            }
        } catch (error) {
            console.error('Error generating AI insights:', error);
            const aiInsightsElement = document.getElementById('aiInsights');
            if (aiInsightsElement) {
                aiInsightsElement.innerHTML = `
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #fefce8 0%, #ecfeff 100%); border-radius: 18px; border: 1px solid rgba(186, 230, 253, 0.9);">
                        <p style="font-size: 18px; color: #0ea5e9; font-weight: 700; margin-bottom: 10px;">
                            Personalized AI Insights Available in Full Version
                        </p>
                        <p style="color: #475569; margin-bottom: 15px;">
                            Get detailed performance analysis, improvement suggestions, and personalized coaching with a subscription.
                        </p>
                    </div>
                `;
            }
        }
    }
    
    collectFeedbackData() {
        const feedbackData = [];
        
        this.answerHistory.forEach((attempts, question) => {
            attempts.forEach((attempt, index) => {
                feedbackData.push({
                    question: question,
                    answer: attempt.answer,
                    score: attempt.score,
                    attempt: index + 1,
                    timestamp: attempt.timestamp
                });
            });
        });
        
        return feedbackData;
    }

    nextQuestion() {
        if (this.currentQuestion >= this.totalQuestions) {
            // Last question - show session results
            this.showSessionResults();
        } else {
            // Regular question - load next question
            this.loadNextQuestion();
        }
    }

    handleNextQuestionClick() {
        if (this.currentQuestion >= this.totalQuestions) {
            // Last question - show session results
            this.showSessionResults();
        } else {
            // Regular question - load next question
            this.loadNextQuestion();
        }
    }

    loadNextQuestion() {
        if (this.currentQuestion < this.totalQuestions) {
            // Clear any pending finalization processes
            if (this.finalizationInterval) {
                clearInterval(this.finalizationInterval);
                this.finalizationInterval = null;
            }
            if (this.finalTranscriptTimeout) {
                clearTimeout(this.finalTranscriptTimeout);
                this.finalTranscriptTimeout = null;
            }
            
            // Reset finalization and feedback request state
            this.isFinalizingTranscript = false;
            this.isRequestingFeedback = false;
            
            this.currentQuestion++;
            
            // Immediately clear the previous question and show loading state
            this.questionText.textContent = 'Loading next question...';
            this.currentQuestionSpan.textContent = this.currentQuestion;
            
            // Clear answer transcript
            this.answerTranscript.innerHTML = '<p style="color: #999;">Waiting for question...</p>';
            
            // Reset UI elements
            this.feedbackSection.style.display = 'none';
            // DON'T clear innerHTML - just hide the content to preserve DOM structure
            this.feedbackContent.style.display = 'none';
            this.timer.style.display = 'none';
            this.startRecordingBtn.style.display = 'none';
            this.stopRecordingBtn.style.display = 'none';
            this.getFeedbackBtn.style.display = 'none';
            
            // Clear text answer if in text mode
            if (this.textAnswer) {
                this.textAnswer.value = '';
            }
            
            // Enable submit button for new question (reset retry limit state)
            this.enableSubmitButton();
            
            // Request next question with full session config (same format as generateQuestion)
            const nextQuestionConfig = {
                // Required fields at root level
                resume: this.resumeContent,
                jobDescription: this.sessionConfig.jobDescription,
                
                // Session info
                questionNumber: this.currentQuestion,
                currentQuestionNumber: this.currentQuestion,
                totalQuestions: this.totalQuestions,
                previousQuestions: this.previousQuestions,
                sessionId: this.sessionId || `practice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                
                // Spread other session config fields
                ...this.sessionConfig,
                
                // User info
                userEmail: this.getUserEmail(),
                userName: this.getUserName()
            };
            
            console.log('Requesting next question:', nextQuestionConfig);
            
            // Emit request for next question
            this.socket.emit('requestAIQuestion', nextQuestionConfig);
        }
    }

    tryAgain() {
        // Check if user already retried this question
        const questionText = this.currentQuestionText;
        const attempts = this.answerHistory.get(questionText) || [];
        
        if (attempts.length >= 2) {
            // Already retried once (2 attempts total), don't allow more
            console.log('Maximum retry attempts reached');
            return;
        }
        
        // Hide the retry button immediately to prevent multiple clicks
        if (this.tryAgainBtn) {
            this.tryAgainBtn.style.display = 'none';
        }

        // Hide model answer and delivery analysis for the new attempt
        const modelAnswerSection = document.getElementById('modelAnswerSection');
        if (modelAnswerSection) modelAnswerSection.style.display = 'none';
        const deliveryBox = document.getElementById('deliveryAnalysisBox');
        if (deliveryBox) deliveryBox.style.display = 'none';

        // Reset UI for retry
        this.resetForRetry();
        
        console.log('Retrying current question');
    }
    
    resetForRetry() {
        // Clear any pending timeouts and intervals from transcription
        if (this.finalTranscriptTimeout) {
            clearTimeout(this.finalTranscriptTimeout);
            this.finalTranscriptTimeout = null;
        }
        if (this.finalizationInterval) {
            clearInterval(this.finalizationInterval);
            this.finalizationInterval = null;
        }
        
        // Reset finalization and feedback request state
        this.isFinalizingTranscript = false;
        this.isRequestingFeedback = false;
        
        // Hide feedback section
        if (this.feedbackSection) {
            this.feedbackSection.style.display = 'none';
        }
        
        // Clear answer transcript
        if (this.answerTranscript) {
            this.answerTranscript.innerHTML = '<p style="color: #999;">Click \'Start Recording\' to begin answering...</p>';
        }
        
        // Reset text answer
        if (this.textAnswer) {
            this.textAnswer.value = '';
        }
        
        // Reset buttons
        if (this.submitTextAnswerBtn) {
            this.submitTextAnswerBtn.style.display = 'inline-block';
            this.submitTextAnswerBtn.disabled = false;
        }
        if (this.getFeedbackBtn) {
            this.getFeedbackBtn.style.display = 'none';
        }
        if (this.startRecordingBtn) {
            this.startRecordingBtn.style.display = 'inline-block';
        }
        if (this.stopRecordingBtn) {
            this.stopRecordingBtn.style.display = 'none';
        }
        
        // Switch back to voice mode by default
        this.switchToVoiceMode();
        
        // Enable submit button for retry
        this.enableSubmitButton();
        
        // Scroll to question section
        if (this.questionSection) {
            this.questionSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    resetForNextQuestion() {
        // Hide feedback
        this.feedbackSection.style.display = 'none';
        
        // Reset answer inputs
        if (this.textAnswer) this.textAnswer.value = '';
        if (this.answerTranscript) {
            this.answerTranscript.innerHTML = '<p style="color: #999;">Click "Start Recording" to begin answering...</p>';
        }
        
        // Reset button states
        if (this.startRecordingBtn) this.startRecordingBtn.style.display = 'inline-flex';
        if (this.stopRecordingBtn) this.stopRecordingBtn.style.display = 'none';
        if (this.getFeedbackBtn) this.getFeedbackBtn.style.display = 'none';
        if (this.recordingIndicator) this.recordingIndicator.classList.remove('active');
    }

    // Answer mode switching (from original ai-interviewer.js)
    switchToVoiceMode() {
        // Update button states
        if (this.voiceMode) {
            this.voiceMode.className = 'btn-primary';
        }
        if (this.textMode) {
            this.textMode.className = 'btn-secondary';
        }
        
        // Show voice section, hide text section
        if (this.voiceAnswerSection) {
            this.voiceAnswerSection.style.display = 'block';
        }
        if (this.textAnswerSection) {
            this.textAnswerSection.style.display = 'none';
        }
        
        console.log('Switched to voice mode');
    }

    switchToTextMode() {
        // Update button states
        if (this.voiceMode) {
            this.voiceMode.className = 'btn-secondary';
        }
        if (this.textMode) {
            this.textMode.className = 'btn-primary';
        }
        
        // Show text section, hide voice section
        if (this.voiceAnswerSection) {
            this.voiceAnswerSection.style.display = 'none';
        }
        if (this.textAnswerSection) {
            this.textAnswerSection.style.display = 'block';
        }
        
        // Focus on text area
        if (this.textAnswer) {
            this.textAnswer.focus();
        }
        
        console.log('Switched to text mode');
    }

    async checkSubscriptionAccess() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                this.showAccessDeniedMessage('Please log in to access practice mode.');
                return false;
            }

            const response = await fetch('/api/subscription/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('Failed to check subscription status');
                this.showAccessDeniedMessage('Unable to verify subscription status. Please try again.');
                return false;
            }

            const data = await response.json();

            // Check if user has an active subscription
            if (!data.hasActiveSubscription || !data.subscription) {
                this.showAccessDeniedMessage(
                    'You need an active subscription to practice interviews.',
                    'No active subscription found. Get started with our affordable plans!'
                );
                return false;
            }

            // Check if user has questions remaining
            if (data.subscription.questions_remaining <= 0) {
                this.showAccessDeniedMessage(
                    'You have no questions remaining in your current plan.',
                    'Extend your subscription to continue practicing!'
                );
                return false;
            }

            // Check if subscription is expired
            const expiryDate = new Date(data.subscription.expiry_date);
            const today = new Date();
            if (expiryDate < today) {
                this.showAccessDeniedMessage(
                    'Your subscription has expired.',
                    'Renew your subscription to continue practicing!'
                );
                return false;
            }

            // All checks passed
            console.log('Subscription access granted:', {
                questionsRemaining: data.subscription.questions_remaining,
                expiryDate: data.subscription.expiry_date
            });
            return true;

        } catch (error) {
            console.error('Error checking subscription access:', error);
            this.showAccessDeniedMessage('Unable to verify subscription status. Please try again.');
            return false;
        }
    }

    showAccessDeniedMessage(title, subtitle = null) {
        // Find or create content area
        let contentArea = document.querySelector('.page-content');
        if (!contentArea) {
            contentArea = document.createElement('div');
            contentArea.className = 'page-content';
            const containerEl = document.querySelector('.container');
            if (containerEl) {
                containerEl.appendChild(contentArea);
            }
        }

        // Show access denied message
        contentArea.innerHTML = `
            <div class="access-denied-container">
                <div class="access-denied-card">
                    <div class="access-denied-icon">Locked</div>
                    <h1 class="access-denied-title">${title}</h1>
                    ${subtitle ? `<p class="access-denied-subtitle">${subtitle}</p>` : ''}
                    <div class="access-denied-actions">
                        <button class="access-denied-btn primary" onclick="window.location.href='/pricing'">
                            View Plans
                        </button>
                        <button class="access-denied-btn secondary" onclick="window.location.href='/'">
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles for access denied page
        this.injectAccessDeniedStyles();
    }

    injectAccessDeniedStyles() {
        // Remove any existing access denied styles
        const existingStyles = document.getElementById('access-denied-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        const style = document.createElement('style');
        style.id = 'access-denied-styles';
        style.textContent = `
            .access-denied-container {
                display: flex;
                align-items: flex-start;
                justify-content: center;
                min-height: 60vh;
                padding: 80px 20px 20px 20px;
                padding-top: 60px;
            }

            .access-denied-card {
                background: white;
                padding: 60px 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
            }

            .access-denied-icon {
                font-size: 4rem;
                margin-bottom: 30px;
                opacity: 0.8;
            }

            .access-denied-title {
                color: #1e293b;
                font-size: 2rem;
                font-weight: 700;
                margin-bottom: 15px;
                line-height: 1.2;
            }

            .access-denied-subtitle {
                color: #64748b;
                font-size: 1.1rem;
                margin-bottom: 40px;
                line-height: 1.5;
            }

            .access-denied-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .access-denied-btn {
                padding: 15px 30px;
                border: none;
                border-radius: 999px;
                font-weight: 700;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 140px;
            }

            .access-denied-btn.primary {
                background: linear-gradient(135deg, #7dd3fc 0%, #86efac 100%);
                color: #0f172a;
                box-shadow: 0 10px 20px rgba(56, 189, 248, 0.25);
            }

            .access-denied-btn.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 14px 24px rgba(56, 189, 248, 0.35);
            }

            .access-denied-btn.secondary {
                background: white;
                color: #0ea5e9;
                border: 1px solid rgba(186, 230, 253, 0.9);
            }

            .access-denied-btn.secondary:hover {
                background: #ecfeff;
                border-color: rgba(125, 211, 252, 0.9);
                transform: translateY(-2px);
            }

            @media (max-width: 768px) {
                .access-denied-card {
                    padding: 40px 20px;
                }

                .access-denied-title {
                    font-size: 1.6rem;
                }

                .access-denied-actions {
                    flex-direction: column;
                }

                .access-denied-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Mark test as used - only called in test mode
    async markTestAsUsed() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            const body = {};

            if (!this.isGuest) {
                const token = localStorage.getItem('authToken');
                if (token) headers['Authorization'] = `Bearer ${token}`;
            } else {
                body.guestId = this.guestId;
                // Set localStorage flag as a fast local check on return visits
                localStorage.setItem('guest_test_used', '1');
            }

            const response = await fetch('/api/mark-test-used', {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (response.ok) {
                console.log('Test marked as used successfully');
            } else {
                console.error('Failed to mark test as used:', response.status);
            }
        } catch (error) {
            console.error('Error marking test as used:', error);
        }
    }

    // Clean up when navigating away from this page
    cleanup() {
        // Remove page-specific styles
        const styles = document.getElementById('practice-page-styles');
        if (styles) {
            styles.remove();
        }

        // Clean up any timers or event listeners
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}

// Export the class for use by the router
window.TestPracticePage = TestPracticePage;

} // End of else block
