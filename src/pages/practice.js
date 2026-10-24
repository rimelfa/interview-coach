class PracticePage {
    constructor() {
        // Question types configuration - use centralized config when available
        this.questionTypes = this.getQuestionTypesConfig();
        
        // Job title detection state
        this.jobTitleSuggestionAbort = null;

        // Original AIInterviewer properties
        this.socket = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.currentQuestion = 1;
        this.totalQuestions = 5;
        this.sessionId = null;
        this.resumeContent = null;
        this.cvManuallyUploaded = false; // Set to true when user uploads inline; prevents async loads from overwriting status
        this.jobDescription = '';
        this.answerStartTime = null;
        this.timerInterval = null;
        this.answerHistory = new Map();
        this.currentQuestionText = '';
        this.previousQuestions = [];
        this.sessionConfig = null;
        
        // Additional practice page properties
        this.answerMode = 'voice'; // 'voice' or 'text'
        this.timer = null;
        this.startTime = null;
        
        // Test mode properties
        this.isTestMode = false;
        this.testModeIndustry = null;
        this.testData = null;
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
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');

        /* ─── Scoped to html.practice-dark — owns the cascade ─────────────── */

        html.practice-dark,
        html.practice-dark body {
            background-color: #1a3028 !important;
            color: rgba(255,255,255,0.88) !important;
            font-family: 'Inter', 'Manrope', -apple-system, sans-serif;
        }

        /* Nav — beat body.spa-page .top-navigation { background: white } */
        html.practice-dark .top-navigation,
        html.practice-dark body.spa-page .top-navigation {
            background: rgba(26,48,40,0.96) !important;
            backdrop-filter: blur(12px);
            border-color: rgba(255,255,255,0.08) !important;
            box-shadow: 0 1px 0 rgba(255,255,255,0.06) !important;
        }
        html.practice-dark .nav-brand h2,
        html.practice-dark .nav-brand a { color: #10b981 !important; }
        html.practice-dark .nav-item a,
        html.practice-dark .nav-menu a { color: rgba(255,255,255,0.65) !important; }
        html.practice-dark .nav-item a:hover,
        html.practice-dark .nav-menu a:hover { color: #fff !important; }
        html.practice-dark .dropdown-toggle { color: rgba(255,255,255,0.65) !important; }
        html.practice-dark .dropdown-toggle:hover { background: rgba(255,255,255,0.06) !important; color: #fff !important; }
        html.practice-dark .dropdown-menu {
            background: #1a3028 !important;
            border-color: rgba(255,255,255,0.1) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
        }
        html.practice-dark .dropdown-link { color: rgba(255,255,255,0.75) !important; }
        html.practice-dark .dropdown-link:hover { background: rgba(255,255,255,0.07) !important; color: #fff !important; }

        /* ─── Root variables (still useful for non-scoped rules below) ─── */
        :root {
            --brand:      #3b82f6;
            --brand-dark: #2563eb;
            --ink:        rgba(255,255,255,0.88);
            --muted:      rgba(255,255,255,0.45);
            --border:     rgba(255,255,255,0.1);
            --panel:      #1a3028;
            --shadow:     0 8px 32px rgba(0,0,0,0.55);
        }

        .ai-interviewer-container {
            max-width: 1120px;
            margin: 0 auto;
            padding: 24px;
        }

        /* ─── Page containers — scoped to beat all global rules ────────── */
        html.practice-dark .practice-header {
            background: #1a3028 !important;
            color: rgba(255,255,255,0.88) !important;
            padding: 24px 28px;
            border-radius: 16px;
            margin-bottom: 24px;
            text-align: left;
            box-shadow: 0 8px 32px rgba(0,0,0,0.55);
            border: 1px solid rgba(255,255,255,0.1);
        }

        .practice-header h1 {
            margin: 0;
            font-size: 2em;
            letter-spacing: -0.02em;
        }

        .practice-header p {
            margin: 8px 0 0 0;
            color: var(--muted);
        }

        html.practice-dark .setup-panel {
            background-color: #1a3028 !important;
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.35);
            margin-bottom: 30px;
            border: 1px solid rgba(255,255,255,0.08);
            position: relative;
        }

        /* Sections inside panel — consistent surface, remove playful theme's card styling */
        html.practice-dark .upload-section,
        html.practice-dark .setup-panel > div,
        html.practice-dark .cv-display,
        html.practice-dark .field-loading-wrapper {
            background: transparent !important;
            background-color: transparent !important;
        }
        /* Kill the playful theme's white card border and oversized radius on sections */
        html.practice-dark .upload-section {
            border: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
        }
        html.practice-dark .upload-section:last-of-type {
            border-bottom: none !important;
        }

        html.practice-dark .setup-panel h2 {
            margin: 0 0 8px 0;
            font-size: 1.4em;
            color: rgba(255,255,255,0.95) !important;
        }

        /* ─── Buttons — beat playful theme's later unscoped overrides ─────── */
        html.practice-dark .btn-primary {
            background: #10b981 !important;
            color: #fff !important;
            border: 1px solid #10b981 !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 20px rgba(16,185,129,0.25) !important;
        }
        html.practice-dark .btn-primary:hover {
            background: #059669 !important;
            border-color: #059669 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 10px 24px rgba(16,185,129,0.35) !important;
        }
        html.practice-dark .btn-primary:disabled {
            opacity: 0.45 !important;
            transform: none !important;
            box-shadow: none !important;
        }
        html.practice-dark .btn-secondary {
            background: rgba(255,255,255,0.1) !important;
            color: rgba(255,255,255,0.88) !important;
            border: 1px solid rgba(255,255,255,0.22) !important;
            border-radius: 10px !important;
        }
        html.practice-dark .btn-secondary:hover {
            background: rgba(255,255,255,0.16) !important;
            color: #fff !important;
            border-color: rgba(255,255,255,0.35) !important;
        }

        /* ─── Inputs ───────────────────────────────────────────────────────── */
        html.practice-dark .job-description-input,
        html.practice-dark textarea,
        html.practice-dark input[type="text"],
        html.practice-dark input[type="email"],
        html.practice-dark input[type="password"],
        html.practice-dark select {
            background: rgba(255,255,255,0.05) !important;
            color: rgba(255,255,255,0.88) !important;
            border-color: rgba(255,255,255,0.12) !important;
        }
        html.practice-dark select option {
            background: #1a3028;
            color: rgba(255,255,255,0.88);
        }
        html.practice-dark .job-description-input:focus,
        html.practice-dark textarea:focus,
        html.practice-dark input:focus {
            border-color: rgba(16,185,129,0.5) !important;
            box-shadow: 0 0 0 4px rgba(16,185,129,0.1) !important;
            outline: none !important;
        }
        html.practice-dark textarea::placeholder,
        html.practice-dark input::placeholder {
            color: rgba(255,255,255,0.25) !important;
        }

        /* ─── Feedback section cards ────────────────────────────────────────── */
        html.practice-dark .feedback-summary,
        html.practice-dark .feedback-main,
        html.practice-dark .feedback-support,
        html.practice-dark .feedback-tail {
            background: transparent !important;
        }
        html.practice-dark .feedback-actions {
            border-top-color: rgba(255,255,255,0.1) !important;
        }
        html.practice-dark .feedback-box {
            background: rgba(255,255,255,0.07) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            box-shadow: 0 2px 12px rgba(0,0,0,0.25) !important;
        }
        html.practice-dark .feedback-box h3 {
            color: rgba(255,255,255,0.92) !important;
            border-bottom-color: rgba(255,255,255,0.12) !important;
        }
        html.practice-dark .strengths-box h3 { color: #4ade80 !important; }
        html.practice-dark .improvements-box h3 { color: #fbbf24 !important; }
        html.practice-dark .better-response-box h3 { color: #38bdf8 !important; }
        html.practice-dark .tips-box h3 { color: #fb923c !important; }
        html.practice-dark .delivery-analysis-box h3 { color: #c4b5fd !important; }
        html.practice-dark .model-answer-box h3 { color: #4ade80 !important; }
        html.practice-dark .feedback-box-content,
        html.practice-dark .feedback-box-content p,
        html.practice-dark .feedback-box-content li {
            color: rgba(255,255,255,0.88) !important;
        }
        html.practice-dark .feedback-box-content li::marker {
            color: rgba(255,255,255,0.5) !important;
        }
        html.practice-dark .score-comparison {
            background: rgba(255,255,255,0.05) !important;
            border-color: rgba(255,255,255,0.1) !important;
            color: rgba(255,255,255,0.7) !important;
        }
        html.practice-dark .score-meter-track {
            background: rgba(255,255,255,0.1) !important;
        }
        html.practice-dark .score-box {
            background: rgba(255,255,255,0.07) !important;
            border-color: rgba(16,185,129,0.25) !important;
            box-shadow: 0 2px 12px rgba(0,0,0,0.25) !important;
        }
        html.practice-dark .score-box h3 {
            color: rgba(255,255,255,0.92) !important;
        }
        html.practice-dark .score-max {
            color: rgba(255,255,255,0.6) !important;
        }
        /* Delivery analysis: legend + annotated transcript on dark bg */
        html.practice-dark #deliveryAnalysis .delivery-legend {
            color: rgba(255,255,255,0.6) !important;
        }
        html.practice-dark #deliveryAnalysis .delivery-transcript {
            background: rgba(255,255,255,0.06) !important;
            border-color: rgba(255,255,255,0.12) !important;
            color: rgba(255,255,255,0.88) !important;
        }
        html.practice-dark #deliveryAnalysis .delivery-stat {
            background: rgba(255,255,255,0.07) !important;
            border-color: rgba(255,255,255,0.12) !important;
        }
        html.practice-dark #deliveryAnalysis .delivery-stat-label,
        html.practice-dark #deliveryAnalysis .delivery-stat-sublabel {
            color: rgba(255,255,255,0.5) !important;
        }
        /* Model answer panels */
        html.practice-dark .model-answer-panel {
            border-radius: 12px !important;
            padding: 14px !important;
        }
        html.practice-dark .model-answer-yours {
            background: rgba(255,255,255,0.07) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
        }
        html.practice-dark .model-answer-ideal {
            background: rgba(16,185,129,0.12) !important;
            border: 1px solid rgba(16,185,129,0.25) !important;
        }
        html.practice-dark .model-answer-label {
            color: rgba(255,255,255,0.45) !important;
        }
        html.practice-dark .model-answer-label-ideal {
            color: #34d399 !important;
        }

        /* ─── Job title suggestions dropdown ────────────────────────────────── */
        .job-title-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            z-index: 1000;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            margin-top: 4px;
            overflow: hidden;
        }
        .job-title-suggestions-header {
            padding: 8px 14px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #94a3b8;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        .job-title-suggestion {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 9px 14px;
            font-size: 13px;
            font-family: inherit;
            cursor: pointer;
            border: none;
            border-bottom: 1px solid #f1f5f9;
            background: transparent;
            text-align: left;
            color: inherit;
        }
        .job-title-suggestion:last-child { border-bottom: none; }
        .job-title-suggestion:hover { background: #f0fdf4; }
        .job-title-suggestion-hint {
            font-size: 11px;
            color: #94a3b8;
            margin-left: 8px;
        }

        html.practice-dark .job-title-suggestions {
            background: #1a3028 !important;
            border-color: rgba(255,255,255,0.1) !important;
        }
        html.practice-dark .job-title-suggestions-header {
            background: rgba(255,255,255,0.03) !important;
            color: rgba(255,255,255,0.45) !important;
            border-color: rgba(255,255,255,0.06) !important;
        }
        html.practice-dark .job-title-suggestion {
            background: transparent !important;
            color: rgba(255,255,255,0.75) !important;
            border-bottom-color: rgba(255,255,255,0.05) !important;
        }
        html.practice-dark .job-title-suggestion:hover {
            background: rgba(16,185,129,0.08) !important;
            color: #fff !important;
        }

        /* ─── Helper text / labels ──────────────────────────────────────────── */
        html.practice-dark .helper-text,
        html.practice-dark .setup-panel > .helper-text {
            color: rgba(255,255,255,0.45) !important;
        }
        html.practice-dark .upload-section h3 {
            color: rgba(255,255,255,0.88) !important;
        }
        html.practice-dark label {
            color: rgba(255,255,255,0.55) !important;
        }

        /* ─── Question counter pill ─────────────────────────────────────────── */
        html.practice-dark .question-counter {
            background: rgba(16,185,129,0.12) !important;
            color: #6ee7b7 !important;
        }

        /* ─── Modal dark ────────────────────────────────────────────────────── */
        html.practice-dark .modal-content {
            background: #1a3028 !important;
            color: rgba(255,255,255,0.88) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
        }
        html.practice-dark .modal-body p,
        html.practice-dark .modal-body li {
            color: rgba(255,255,255,0.75) !important;
        }

        .setup-panel > .helper-text {
            margin-bottom: 22px;
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

        .interview-panel {
            display: none;
            gap: 20px;
        }

        .question-section {
            background: #1a3028 !important;
            border-radius: 16px;
            padding: 26px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.5);
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .question-text {
            font-size: 1.2em;
            color: var(--ink);
            margin-bottom: 20px;
            padding: 18px;
            background: rgba(255,255,255,0.04);
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.08);
        }

        .answer-section {
            background: #1a3028 !important;
            border-radius: 16px;
            padding: 26px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.5);
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .transcript-box {
            background: rgba(255,255,255,0.04);
            border-radius: 12px;
            padding: 20px;
            min-height: 150px;
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
            font-size: 1.1em;
            border: 1px solid rgba(255,255,255,0.08);
            line-height: 1.6;
            color: var(--ink) !important;
        }

        .transcript-box p {
            color: #e2e8f0 !important;
            margin: 5px 0;
        }

        .transcript-box strong {
            color: var(--brand) !important;
        }

        .feedback-section {
            background: #1a3028 !important;
            border-radius: 16px;
            padding: 26px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.5);
            display: none;
            border: 1px solid rgba(255,255,255,0.1);
            margin-top: 24px;
        }

        .feedback-content {
            background: rgba(255,255,255,0.04);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: none;
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
            background: var(--brand);
            color: white;
            border: 1px solid var(--brand);
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            height: 52px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            vertical-align: top;
        }

        .btn-primary:hover {
            background: var(--brand-dark);
            border-color: var(--brand-dark);
            transform: translateY(-1px);
            box-shadow: 0 10px 18px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
        }

        .btn-primary:disabled:hover {
            background: var(--brand);
            transform: none;
            box-shadow: none;
        }

        /* Lightweight pill toggle for choosing HOW to answer (voice vs type) —
           kept visually distinct from the heavier primary/secondary action buttons
           like Start/Stop Recording, so the two kinds of buttons aren't confused. */
        .answer-mode-btn {
            background: transparent;
            color: #94a3b8;
            border: 1px solid rgba(148, 163, 184, 0.3);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: none;
        }

        .answer-mode-btn:hover {
            border-color: rgba(16, 185, 129, 0.5);
            color: #e2e8f0;
        }

        .answer-mode-btn.active {
            background: rgba(16, 185, 129, 0.12);
            border-color: #10b981;
            color: #10b981;
        }

        .field-loading-wrapper {
            position: relative;
        }

        .field-loading-wrapper .field-spinner {
            position: absolute;
            top: 12px;
            right: 12px;
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

        .field-loading-wrapper.is-loading input {
            background: rgba(255,255,255,0.02);
            color: rgba(255,255,255,0.35);
        }

        .btn-secondary {
            background: rgba(255,255,255,0.06);
            color: var(--brand);
            border: 1px solid rgba(59,130,246,0.25);
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            height: 52px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            vertical-align: top;
        }

        .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
            color: var(--brand-dark);
            transform: translateY(-1px);
        }

        .btn-secondary:disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
        }

        .btn-secondary:disabled:hover {
            background: rgba(255,255,255,0.06);
            color: var(--brand);
            transform: none;
        }

        .feedback-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.08);
            justify-content: center;
        }
        .feedback-actions .btn-primary,
        .feedback-actions .btn-secondary {
            flex: 1;
            min-width: 180px;
            max-width: 320px;
        }

        .btn-large {
            width: 100%;
            max-width: 360px;
            height: 56px;
            font-size: 17px;
            border-radius: 12px;
        }

        .recording-indicator {
            display: none;
            align-items: center;
            gap: 10px;
            color: #e74c3c;
            font-weight: bold;
            margin-top: 15px;
        }

        .recording-indicator.active {
            display: flex;
        }

        .recording-dot {
            width: 12px;
            height: 12px;
            background: #e74c3c;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }


        .question-counter {
            background: #eff6ff;
            padding: 6px 14px;
            border-radius: 999px;
            font-weight: 600;
            margin-top: 12px;
            display: inline-block;
            color: var(--brand-dark);
        }

        .timer {
            font-size: 1.1em;
            color: var(--muted);
            margin-bottom: 15px;
        }

        .upload-section {
            margin-bottom: 28px;
            padding-bottom: 22px;
            padding-left: 4px;
            padding-right: 4px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .upload-section:last-child {
            border-bottom: none;
            margin-bottom: 25px;
        }

        .upload-section h3 {
            margin-bottom: 8px;
            color: #e2e8f0;
            font-size: 1.15em;
            font-weight: 600;
        }

        .ai-interviewer-container .upload-section label,
        .upload-section label,
        label {
            display: block !important;
            margin-bottom: 5px !important;
            font-weight: 600 !important;
            color: rgba(255,255,255,0.65) !important;
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
            padding: 12px 14px;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 10px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            background: rgba(255,255,255,0.04);
            color: var(--ink);
        }

        .job-description-input::placeholder { color: rgba(255,255,255,0.25); }

        .job-description-input:focus {
            outline: none;
            border-color: rgba(59,130,246,0.5);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        select.job-description-input {
            height: 44px;
            padding-top: 8px;
            padding-bottom: 8px;
        }

        select.job-description-input option { background: #0f1a14; color: #e2e8f0; }

        .cv-display {
            width: 100%;
        }

        .cv-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
            padding: 8px 12px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            font-size: 14px;
        }

        .status-text {
            color: rgba(255,255,255,0.45);
        }

        .status-text.loaded {
            color: #6ee7b7;
        }

        .status-text.error {
            color: #f87171;
        }

        .status-text.no-cv {
            color: #fbbf24;
            font-weight: 600;
        }

        .status-text.no-cv a {
            color: #93c5fd !important;
            text-decoration: underline;
        }

        .status-text.no-cv a:hover {
            color: #bfdbfe !important;
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
            background: #0f1a14;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            box-shadow: 0 20px 48px rgba(0,0,0,0.6);
            max-width: 480px;
            width: 90%;
            margin: 20px;
            overflow: hidden;
            animation: scaleIn 0.3s ease;
        }

        .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
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
            color: rgba(255,255,255,0.65);
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
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
        }

        .modal-footer .btn-primary {
            background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
            color: white;
        }

        .modal-footer .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .modal-footer .btn-secondary {
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.7);
            border: 1px solid rgba(255,255,255,0.12);
        }

        .modal-footer .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
        }

        #cvRequiredModal .modal-content,
        #jobDescriptionRequiredModal .modal-content,
        #profileRequiredModal .modal-content,
        #emptyAnswerModal .modal-content {
            max-width: 360px;
        }

        #cvRequiredModal .modal-body,
        #jobDescriptionRequiredModal .modal-body,
        #profileRequiredModal .modal-body,
        #emptyAnswerModal .modal-body {
            padding: 20px 20px 16px;
        }

        #cvRequiredModal .modal-footer,
        #jobDescriptionRequiredModal .modal-footer,
        #profileRequiredModal .modal-footer,
        #emptyAnswerModal .modal-footer {
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

        html.practice-dark .highlight-error,
        html.practice-dark .highlight-error:focus {
            animation: pulseError 2s ease-in-out !important;
            border: 2px solid #f56565 !important;
            border-color: #f56565 !important;
            box-shadow: 0 0 0 3px rgba(245,101,101,0.25) !important;
            background: rgba(254, 178, 178, 0.08) !important;
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
            background: rgba(255,255,255,0.06);
            color: var(--brand);
            border: 1px solid rgba(255,255,255,0.12);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-refresh:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(59,130,246,0.4);
        }

        .loading-spinner {
            text-align: center;
            padding: 40px;
        }

        .spinner {
            border: 4px solid rgba(255,255,255,0.08);
            border-top: 4px solid var(--brand);
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
            margin-bottom: 30px;
        }

        .score-box {
            background: white;
            border: 1px solid var(--brand);
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 100%;
            margin: 0;
        }

        .feedback-boxes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 30px;
        }

        .score-box h3 {
            margin: 0 0 20px 0;
            font-size: 1.3em;
            color: #333;
            font-weight: 600;
        }

        .score-display {
            margin-bottom: 15px;
        }

        .score-number {
            font-size: 4em;
            font-weight: bold;
            display: block;
            line-height: 1;
            color: var(--brand);
        }

        .score-max {
            font-size: 1.8em;
            color: #666;
        }

        .score-comparison {
            font-size: 1em;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-top: 20px;
            color: #333;
            border: 1px solid #e2e8f0;
        }

        .score-improvement {
            color: #4ade80;
        }

        .score-decline {
            color: #f87171;
        }

        .feedback-box {
            background: white;
            border-radius: 8px;
            padding: 22px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            border-left: none !important;
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
            margin: 0 0 14px 0;
            font-size: 1.02em;
            font-weight: 700;
            letter-spacing: 0.01em;
            color: #1e293b !important;
            visibility: visible !important;
            display: flex !important;
            align-items: center;
            gap: 9px;
            padding: 0 0 12px 0;
            border-radius: 0;
            background: none;
            border: none;
            border-bottom: 1px solid rgba(226, 232, 240, 0.8);
        }

        .feedback-box h3::before {
            content: '';
            width: 8px;
            height: 8px;
            min-width: 8px;
            border-radius: 50%;
            background: currentColor;
        }

        .feedback-box-content {
            line-height: 1.7;
            color: #444;
        }

        .strengths-box h3 { color: #16a34a !important; }
        .improvements-box h3 { color: #b45309 !important; }
        .better-response-box h3 { color: #0369a1 !important; }
        .tips-box h3 { color: #c2410c !important; }
        .delivery-analysis-box h3 { color: #6d28d9 !important; }
        .model-answer-box h3 { color: #15803d !important; }

        .feedback-support {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 16px;
        }

        .feedback-main, .feedback-tail {
            margin-top: 16px;
        }

        @media (max-width: 700px) {
            .feedback-support {
                grid-template-columns: 1fr;
            }
        }

        .feedback-box-content ul {
            margin: 10px 0;
            padding-left: 20px;
        }

        .feedback-box-content li {
            margin-bottom: 5px;
        }

        /* RTL Support for Arabic */
        .rtl-text {
            direction: rtl;
            text-align: right;
            font-family: 'Segoe UI', 'Tahoma', 'Arabic Typesetting', 'Traditional Arabic', Arial, sans-serif;
        }

        .rtl-list {
            direction: rtl;
            text-align: right;
            padding-right: 20px;
            padding-left: 0;
            font-family: 'Segoe UI', 'Tahoma', 'Arabic Typesetting', 'Traditional Arabic', Arial, sans-serif;
        }

        .rtl-list li {
            text-align: right;
            direction: rtl;
        }

        /* Arabic bullet points - using Arabic-appropriate markers */
        .rtl-list li::marker {
            content: "• ";
            color: var(--brand);
            font-weight: bold;
            font-size: 1.1em;
        }

        /* Alternative bullet styles for Arabic */
        .rtl-list li:nth-child(odd)::marker {
            content: "◆ ";
        }

        .rtl-list li:nth-child(even)::marker {
            content: "◇ ";
        }

        /* Chinese (Mandarin) Support */
        .chinese-text {
            font-family: 'Microsoft YaHei', 'SimHei', 'SimSun', 'PingFang SC', 'Hiragino Sans GB', 'Heiti SC', Arial, sans-serif;
            line-height: 1.8;
            letter-spacing: 0.02em;
            text-align: left;
            direction: ltr;
        }

        .chinese-list {
            font-family: 'Microsoft YaHei', 'SimHei', 'SimSun', 'PingFang SC', 'Hiragino Sans GB', 'Heiti SC', Arial, sans-serif;
            line-height: 1.8;
            letter-spacing: 0.02em;
            padding-left: 20px;
        }

        .chinese-list li::marker {
            content: "● ";
            color: var(--brand);
            font-weight: bold;
        }

        /* Traditional Chinese bullet points */
        .chinese-list li:nth-child(odd)::marker {
            content: "▪ ";
        }

        .chinese-list li:nth-child(even)::marker {
            content: "▫ ";
        }

        /* Korean Support */
        .korean-text {
            font-family: 'Malgun Gothic', 'Apple Gothic', 'Nanum Gothic', 'Dotum', 'Gulim', Arial, sans-serif;
            line-height: 1.7;
            letter-spacing: 0.01em;
            text-align: left;
            direction: ltr;
        }

        .korean-list {
            font-family: 'Malgun Gothic', 'Apple Gothic', 'Nanum Gothic', 'Dotum', 'Gulim', Arial, sans-serif;
            line-height: 1.7;
            letter-spacing: 0.01em;
            padding-left: 20px;
        }

        .korean-list li::marker {
            content: "• ";
            color: var(--brand);
            font-weight: bold;
        }

        /* Korean bullet point variations */
        .korean-list li:nth-child(odd)::marker {
            content: "◦ ";
        }

        .korean-list li:nth-child(even)::marker {
            content: "‣ ";
        }

        /* Improved typography for CJK languages */
        .chinese-text strong, .korean-text strong {
            font-weight: 700;
        }

        .chinese-text em, .korean-text em {
            font-style: normal;
            text-decoration: underline;
            text-decoration-color: var(--brand);
            text-decoration-thickness: 2px;
        }

        .session-results {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
        }

        .session-results h2 {
            color: #2d3748;
            font-size: 2.2em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .session-results p {
            color: #4a5568;
            font-size: 1.1em;
            margin-bottom: 30px;
            opacity: 0.9;
        }

        @media (max-width: 768px) {
            .feedback-boxes {
                grid-template-columns: 1fr;
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
            
            /* Make profile fields (Current Role & Years of Experience) stack vertically on mobile */
            .setup-panel .upload-section > div[style*="grid-template-columns: 1fr 1fr"] {
                grid-template-columns: 1fr !important;
                gap: 15px !important;
            }
            
            /* Make interview configuration fields stack vertically on mobile */
            .setup-panel .upload-section > div[style*="grid-template-columns: 1fr 1fr 1fr"] {
                grid-template-columns: 1fr !important;
                gap: 15px !important;
            }
        }

        /* Profile Incomplete Notice Styles */
        #profile-incomplete-notice {
            background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
            color: white;
            margin: 20px 0;
            border-radius: 12px;
            animation: slideDown 0.5s ease-out;
            box-shadow: 0 4px 15px rgba(246, 173, 85, 0.3);
        }

        .profile-notice-content {
            display: flex;
            align-items: center;
            padding: 20px;
            gap: 16px;
            position: relative;
        }

        .profile-notice-icon {
            font-size: 24px;
            flex-shrink: 0;
        }

        .profile-notice-text {
            flex: 1;
            min-width: 0;
        }

        .profile-notice-text strong {
            display: block;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .profile-notice-text p {
            margin: 0;
            font-size: 14px;
            opacity: 0.9;
            line-height: 1.4;
        }

        .profile-notice-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .profile-notice-btn {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .profile-notice-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .profile-notice-dismiss {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            font-size: 18px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .profile-notice-dismiss:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        /* Mobile responsiveness for profile notice */
        @media (max-width: 768px) {
            .profile-notice-content {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }

            .profile-notice-actions {
                width: 100%;
                justify-content: space-between;
            }
        }

        /* ── Simulator-style config card ── */
        .sim-config-card {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .sim-config-row {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 11px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sim-config-row:last-child { border-bottom: none; }
        .sim-config-label {
            width: 96px;
            flex-shrink: 0;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.35);
        }
        .sim-pill-group { display: flex; gap: 5px; flex-wrap: wrap; }
        .sim-pill {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 20px;
            color: rgba(255,255,255,0.45);
            font-family: inherit;
            font-size: 12px;
            font-weight: 500;
            padding: 5px 12px;
            cursor: pointer;
            white-space: nowrap;
            transition: background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out, transform 120ms ease-out;
        }
        .sim-pill:hover:not(.active) {
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.25);
            color: rgba(255,255,255,0.8);
        }
        .sim-pill:active { transform: scale(0.96); }
        .sim-pill.active {
            background: rgba(16,185,129,0.2);
            border-color: rgba(16,185,129,0.6);
            color: #10b981;
            font-weight: 600;
        }
        .sim-pill-lang { font-size: 11px; padding: 4px 9px; }
        @media (max-width: 520px) {
            .sim-config-row { flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px 16px; }
            .sim-config-label { width: auto; }
        }

        /* Mode selector */
        .mode-selector {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 8px;
        }
        .mode-btn {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 3px;
            padding: 16px 20px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.04);
            cursor: pointer;
            text-align: left;
            transition: border-color 160ms ease-out, background 160ms ease-out, transform 120ms ease-out;
        }
        .mode-btn:active { transform: scale(0.98); }
        .mode-btn.selected {
            border-color: rgba(255,255,255,0.4);
            background: rgba(255,255,255,0.1);
        }
        .mode-btn-title {
            font-size: 14px;
            font-weight: 700;
            color: #e2e8f0;
        }
        .mode-btn-desc {
            font-size: 12px;
            color: rgba(255,255,255,0.4);
        }
        .mode-btn.selected .mode-btn-title { color: #fff; }

        /* Sim extras toggle */
        .sim-toggle-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: rgba(255,255,255,0.02);
            border-top: 1px solid rgba(255,255,255,0.05);
        }
        .sim-toggle-label { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6); cursor: pointer; }
        .sim-toggle-desc  { font-size: 11px; color: rgba(255,255,255,0.3); }
        .sim-toggle-wrap  { position: relative; width: 34px; height: 20px; flex-shrink: 0; }
        .sim-toggle-wrap input { opacity: 0; width: 0; height: 0; position: absolute; }
        .sim-toggle-track {
            position: absolute; inset: 0; border-radius: 20px; cursor: pointer;
            background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
            transition: background 180ms ease-out, border-color 180ms ease-out;
        }
        .sim-toggle-thumb {
            position: absolute; top: 3px; left: 3px; width: 12px; height: 12px;
            border-radius: 50%; background: rgba(255,255,255,0.3);
            transition: transform 180ms cubic-bezier(0.23,1,0.32,1), background 180ms ease-out;
        }
        .sim-toggle-wrap input:checked + .sim-toggle-track { background: rgba(16,185,129,0.22); border-color: rgba(16,185,129,0.5); }
        .sim-toggle-wrap input:checked + .sim-toggle-track .sim-toggle-thumb { transform: translateX(14px); background: #10b981; }

        /* Enter room button inside dark card */
        .sim-launch-btn {
            display: block; width: 100%; max-width: 360px; margin: 0 auto;
            padding: 14px 28px; height: 56px;
            background: #10b981;
            color: #fff; border: 1px solid #10b981; border-radius: 12px;
            font-family: inherit; font-size: 17px; font-weight: 600;
            cursor: pointer; letter-spacing: 0.01em;
            box-shadow: 0 8px 20px rgba(16,185,129,0.25);
            transition: background 180ms ease-out, transform 160ms ease-out, box-shadow 180ms ease-out;
        }
        .sim-launch-btn:hover {
            background: #059669;
            border-color: #059669;
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(16,185,129,0.35);
        }
        .sim-launch-btn:active { transform: scale(0.98); }
        .sim-launch-btn:disabled {
            background: #6b7280; border-color: #6b7280;
            box-shadow: none; cursor: not-allowed; opacity: 0.65;
            transform: none;
        }

        /* ── Customise toggle ───────────────────────────────────────────────── */
        .customise-toggle-row {
            display: flex; align-items: center; gap: 10px;
            padding: 14px 0; margin: 4px 0 0;
            cursor: pointer; user-select: none;
        }
        .customise-toggle-btn {
            background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;
            color: rgba(255,255,255,0.5); font-size: 0.82rem; font-family: inherit;
            cursor: pointer; padding: 6px 12px;
            display: flex; align-items: center; gap: 6px;
            transition: border-color 150ms, color 150ms; flex-shrink: 0;
        }
        .customise-toggle-btn:hover { border-color: rgba(255,255,255,0.28); color: rgba(255,255,255,0.78); }
        .customise-summary { font-size: 0.8rem; color: rgba(255,255,255,0.28); flex: 1; }
        .customise-chevron { color: rgba(255,255,255,0.25); transition: transform 200ms ease; flex-shrink: 0; }
        .customise-chevron.open { transform: rotate(180deg); }

        /* ── Wizard ─────────────────────────────────────────────────────────── */
        .wizard-dots { display: flex; gap: 8px; justify-content: center; margin-bottom: 36px; }
        .wizard-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: background 250ms, transform 250ms; }
        .wizard-dot.active { background: #10b981; transform: scale(1.3); }
        .wizard-dot.done { background: rgba(16,185,129,0.4); }
        .wizard-step { display: none; }
        .wizard-step.active { display: block; animation: wizardIn 220ms ease both; }
        @keyframes wizardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .wizard-q { font-size: 1.4rem; font-weight: 700; color: #fff; margin: 0 0 22px; line-height: 1.3; }
        .wizard-nav { display: flex; align-items: center; gap: 14px; margin-top: 24px; }
        .wizard-back-btn { background: none; border: none; color: rgba(255,255,255,0.38); font-size: 0.88rem; font-family: inherit; cursor: pointer; padding: 4px 0; transition: color 150ms; flex-shrink: 0; }
        .wizard-back-btn:hover { color: rgba(255,255,255,0.7); }
        .wizard-next-btn { flex: 1; padding: 15px 24px; background: #10b981; color: #fff; border: none; border-radius: 12px; font-family: inherit; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 150ms, transform 150ms; box-shadow: 0 6px 18px rgba(16,185,129,0.22); }
        .wizard-next-btn:hover { background: #059669; transform: translateY(-1px); }
        .wizard-next-btn:active { transform: scale(0.98); }
        `;

    }

    // Get the HTML content for this page
    getHTML() {
        return `
        <div class="ai-interviewer-container">
            <div class="practice-header">
                <h1>Interview Practice</h1>
                <p>Get personalized questions and real-time feedback from your AI interviewer.</p>
                <div class="question-counter" id="questionCounter" style="display: none;">
                    Question <span id="currentQuestion">1</span> of <span id="totalQuestions">5</span>
                </div>
            </div>

            <div class="setup-panel" id="setupPanel" style="background-color:#1a3028">

                <!-- Hidden selects keep existing .value references working -->
                <select id="difficultyLevel" style="display:none">
                    <option value="entry">Entry Level</option>
                    <option value="intermediate" selected>Intermediate</option>
                    <option value="senior">Senior</option>
                    <option value="expert">Expert</option>
                </select>
                <select id="questionType" style="display:none">
                    ${this.generateQuestionTypeOptions()}
                </select>
                <select id="language" style="display:none">
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

                <!-- Progress dots -->
                <div class="wizard-dots">
                    <span class="wizard-dot active"></span>
                    <span class="wizard-dot"></span>
                    <span class="wizard-dot"></span>
                    <span class="wizard-dot"></span>
                    <span class="wizard-dot"></span>
                </div>

                <!-- Step 1: Job title -->
                <div class="wizard-step active">
                    <p class="wizard-q">What's your current job title?</p>
                    <div style="position:relative;">
                        <input type="text" id="currentRole" class="job-description-input" style="min-height:auto;height:52px;font-size:1.05rem;" placeholder="e.g. Software Engineer" autocomplete="off">
                        <div id="jobTitleSuggestions" class="job-title-suggestions" style="display:none;"></div>
                        <div id="jobTitleCorrection" class="job-title-correction" style="display:none;"></div>
                    </div>
                    <div class="wizard-nav">
                        <button type="button" class="wizard-next-btn">Next →</button>
                    </div>
                </div>

                <!-- Step 2: Experience -->
                <div class="wizard-step">
                    <p class="wizard-q">How much experience do you have?</p>
                    <select id="experienceYears" class="job-description-input" style="min-height:auto;height:52px;font-size:1.05rem;">
                        <option value="">Select...</option>
                        <option value="0">Fresh Graduate</option>
                        <option value="1">1 year</option>
                        <option value="2">2 years</option>
                        <option value="3">3 years</option>
                        <option value="4">4 years</option>
                        <option value="5">5 years</option>
                        <option value="6">6–10 years</option>
                        <option value="10">10+ years</option>
                    </select>
                    <div class="wizard-nav">
                        <button type="button" class="wizard-back-btn">← Back</button>
                        <button type="button" class="wizard-next-btn">Next →</button>
                    </div>
                </div>

                <!-- Step 3: Resume -->
                <div class="wizard-step">
                    <p class="wizard-q">Add your resume</p>
                    <div class="cv-display" id="cvDisplay">
                        <div class="cv-status" id="cvStatus">
                            <span class="status-text" id="cvStatusText">Ready to load CV from profile</span>
                        </div>
                    </div>
                    <div style="margin-top:14px;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
                        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                            <span style="font-size:1.2rem">✨</span>
                            <span style="font-size:0.88rem;color:rgba(255,255,255,0.55);line-height:1.4">Don't have your CV? <strong style="color:#93c5fd">Generate one with AI</strong> or <label for="inlineCvUpload" style="color:#93c5fd;font-weight:700;cursor:pointer;text-decoration:underline">upload yours</label></span>
                        </div>
                        <button type="button" id="generateCvBtn" class="btn-primary" style="padding:8px 18px;height:auto;font-size:0.88rem;white-space:nowrap;flex-shrink:0">
                            <span id="generateCvBtnLabel">Generate</span>
                        </button>
                    </div>
                    <div class="wizard-nav">
                        <button type="button" class="wizard-back-btn">← Back</button>
                        <button type="button" class="wizard-next-btn">Next →</button>
                    </div>
                </div>

                <!-- Step 4: Job Description -->
                <div class="wizard-step">
                    <p class="wizard-q">Add the job description</p>
                    <textarea id="jobDescription" class="job-description-input"
                        placeholder="Paste the job description here..." rows="6"
                        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
                    <div style="margin-top:14px;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
                        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                            <span style="font-size:1.2rem">✨</span>
                            <span style="font-size:0.88rem;color:rgba(255,255,255,0.55);line-height:1.4">Don't have it? <strong style="color:#93c5fd">Generate one with AI</strong></span>
                        </div>
                        <button type="button" id="generateJdBtn" class="btn-primary" style="padding:8px 18px;height:auto;font-size:0.88rem;white-space:nowrap;flex-shrink:0">
                            <span id="generateJdBtnLabel">Generate</span>
                        </button>
                    </div>
                    <div class="wizard-nav">
                        <button type="button" class="wizard-back-btn">← Back</button>
                        <button type="button" class="wizard-next-btn">Next →</button>
                    </div>
                </div>

                <!-- Step 5: Mode + Start -->
                <div class="wizard-step">
                    <p class="wizard-q">How would you like to practice?</p>
                    <div class="mode-selector">
                        <button type="button" class="mode-btn" data-mode="practice" id="modeBtnPractice">
                            <span class="mode-btn-title">Practice</span>
                            <span class="mode-btn-desc">One question at a time with detailed feedback</span>
                        </button>
                        <button type="button" class="mode-btn selected" data-mode="simulate" id="modeBtnSimulate">
                            <span class="mode-btn-title">Simulate</span>
                            <span class="mode-btn-desc">Full interview with pressure, timing &amp; debrief</span>
                        </button>
                    </div>

                    <!-- Simulator extras (shown only when Simulate is chosen) -->
                    <div id="simExtrasPanel">
                        <div style="padding-top:16px;">
                            <h3 style="margin-bottom:12px;font-size:1rem;color:rgba(255,255,255,0.7);">Simulator settings</h3>
                            <div class="sim-config-card">
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Pressure</span>
                                    <div class="sim-pill-group" data-field="simPressure">
                                        <button type="button" class="sim-pill active" data-value="standard">Standard</button>
                                        <button type="button" class="sim-pill" data-value="high">High</button>
                                        <button type="button" class="sim-pill" data-value="intense">Intense</button>
                                    </div>
                                </div>
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Interviewers</span>
                                    <div class="sim-pill-group" data-field="simInterviewers">
                                        <button type="button" class="sim-pill" data-value="1">1</button>
                                        <button type="button" class="sim-pill active" data-value="2">2</button>
                                        <button type="button" class="sim-pill" data-value="3">3</button>
                                    </div>
                                </div>
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Duration</span>
                                    <div class="sim-pill-group" data-field="simDuration">
                                        <button type="button" class="sim-pill active" data-value="2">2 min</button>
                                        <button type="button" class="sim-pill" data-value="10">10 min</button>
                                        <button type="button" class="sim-pill" data-value="20">20 min</button>
                                        <button type="button" class="sim-pill" data-value="30">30 min</button>
                                        <button type="button" class="sim-pill" data-value="45">45 min</button>
                                    </div>
                                </div>
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Skip Intro</span>
                                    <div class="sim-pill-group" data-field="simSkipIntro">
                                        <button type="button" class="sim-pill" data-value="false">Off</button>
                                        <button type="button" class="sim-pill active" data-value="true">On</button>
                                    </div>
                                </div>
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Accent</span>
                                    <div class="sim-pill-group" data-field="simAccent">
                                        <button type="button" class="sim-pill active" data-value="american">🇺🇸 American</button>
                                        <button type="button" class="sim-pill" data-value="british">🇬🇧 British</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Advanced settings toggle -->
                    <div class="customise-toggle-row" id="customiseToggleRow">
                        <button type="button" class="customise-toggle-btn" id="customiseToggleBtn">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                            Advanced settings
                        </button>
                        <span class="customise-summary" id="customiseSummary">Mid · General · English</span>
                        <svg class="customise-chevron" id="customiseChevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>

                    <!-- Advanced panel -->
                    <div id="customisePanel" style="display:none">
                        <div class="upload-section">
                            <h3>Interview settings</h3>
                            <div class="sim-config-card">
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Difficulty</span>
                                    <div class="sim-pill-group" data-field="difficultyLevel">
                                        <button type="button" class="sim-pill" data-value="entry">Entry</button>
                                        <button type="button" class="sim-pill active" data-value="intermediate">Mid</button>
                                        <button type="button" class="sim-pill" data-value="senior">Senior</button>
                                        <button type="button" class="sim-pill" data-value="expert">Expert</button>
                                    </div>
                                </div>
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Type</span>
                                    <div class="sim-pill-group" data-field="questionType">
                                        <button type="button" class="sim-pill active" data-value="mixed">General</button>
                                        <button type="button" class="sim-pill" data-value="behavioral">Behavioural</button>
                                        <button type="button" class="sim-pill" data-value="technical">Technical</button>
                                        <button type="button" class="sim-pill" data-value="competency">Competency</button>
                                    </div>
                                </div>
                                <div class="sim-config-row">
                                    <span class="sim-config-label">Language</span>
                                    <div class="sim-pill-group" data-field="language">
                                        <button type="button" class="sim-pill sim-pill-lang active" data-value="english">🇬🇧 EN</button>
                                        <button type="button" class="sim-pill sim-pill-lang" data-value="french">🇫🇷 FR</button>
                                        <button type="button" class="sim-pill sim-pill-lang" data-value="spanish">🇪🇸 ES</button>
                                        <button type="button" class="sim-pill sim-pill-lang" data-value="german">🇩🇪 DE</button>
                                        <button type="button" class="sim-pill sim-pill-lang" data-value="portuguese">🇵🇹 PT</button>
                                        <button type="button" class="sim-pill sim-pill-lang" data-value="italian">🇮🇹 IT</button>
                                        <button type="button" class="sim-pill sim-pill-lang" data-value="arabic">🇸🇦 AR</button>
                                        <button type="button" class="sim-pill sim-pill-lang" data-value="chinese">🇨🇳 ZH</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="upload-section">
                            <h3>Auto-detected details</h3>
                            <p class="helper-text muted">These fields are filled from your job description. Edit them if needed.</p>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                                <div>
                                    <label for="detectedRole" style="display: block; margin-bottom: 5px; font-weight: 600;">Target Role:</label>
                                    <div class="field-loading-wrapper" id="detectedRoleWrapper">
                                        <input type="text" id="detectedRole" class="job-description-input" style="min-height: auto; height: 40px;" placeholder="Role will be detected automatically..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                                        <span class="field-spinner" aria-hidden="true"></span>
                                    </div>
                                </div>
                                <div>
                                    <label for="detectedCompany" style="display: block; margin-bottom: 5px; font-weight: 600;">Company:</label>
                                    <div class="field-loading-wrapper" id="detectedCompanyWrapper">
                                        <input type="text" id="detectedCompany" class="job-description-input" style="min-height: auto; height: 40px;" placeholder="Company will be detected automatically..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                                        <span class="field-spinner" aria-hidden="true"></span>
                                    </div>
                                </div>
                                <div>
                                    <label for="detectedIndustry" style="display: block; margin-bottom: 5px; font-weight: 600;">Industry:</label>
                                    <div class="field-loading-wrapper" id="detectedIndustryWrapper">
                                        <input type="text" id="detectedIndustry" class="job-description-input" style="min-height: auto; height: 40px;" placeholder="Industry will be detected automatically..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                                        <span class="field-spinner" aria-hidden="true"></span>
                                    </div>
                                </div>
                            </div>
                            <span id="roleDetectionStatus" style="font-size: 14px; color: rgba(255,255,255,0.35); display: block; margin-top: 5px;">Waiting for job description...</span>
                        </div>
                        <div class="upload-section">
                            <h3>Anything you'd like to focus on?</h3>
                            <textarea id="additionalInfo" class="job-description-input"
                                placeholder="Any additional information about the company, role, or specific areas you'd like to focus on during the interview..." rows="4"></textarea>
                            <p class="helper-text muted">Examples: company culture, specific technologies, recent news, or areas you want to improve.</p>
                        </div>
                    </div>

                    <!-- Start buttons -->
                    <div class="control-buttons center" id="practiceStartWrapper" style="margin-top:24px;display:none;">
                        <button id="startPractice" class="btn-primary btn-large">Start Practice Session</button>
                    </div>
                    <div id="simLaunchWrapper" class="control-buttons center" style="flex-direction:column;gap:10px;">
                        <button class="sim-launch-btn" id="launchSimBtn">Enter the room →</button>
                        <p style="margin:0;font-size:0.78rem;color:rgba(255,255,255,0.4);text-align:center;">Answers must be at least 8 words · Use a quiet environment for best results</p>
                    </div>

                    <div class="wizard-nav" style="margin-top:16px;">
                        <button type="button" class="wizard-back-btn">← Back</button>
                    </div>
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
                            <button id="voiceMode" class="answer-mode-btn active">🎤 Voice Answer</button>
                            <button id="textMode" class="answer-mode-btn">✍️ Type Answer</button>
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
                    <h2>Feedback & Suggestions</h2>

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

                        <div id="deliveryAnalysis" style="display:none;margin-bottom:8px;"></div>

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

                        <div class="feedback-tail">
                            <div class="feedback-box tips-box compact">
                                <h3>Interview Tips</h3>
                                <div class="feedback-box-content" id="tipsContent"></div>
                            </div>
                        </div>

                        <div id="modelAnswerSection" style="display:none; margin-top:8px;">
                            <div class="feedback-box model-answer-box" style="border-left:none;">
                                <h3>Model Answer</h3>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">
                                    <div class="model-answer-panel model-answer-yours" style="background:#f8fafc; border-radius:12px; padding:14px;">
                                        <p class="model-answer-label" style="font-size:0.75rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;">Your Answer</p>
                                        <div id="modelAnswerUserText" class="feedback-box-content" style="font-size:0.88rem;"></div>
                                    </div>
                                    <div class="model-answer-panel model-answer-ideal" style="background:#f0fdf4; border-radius:12px; padding:14px;">
                                        <p class="model-answer-label model-answer-label-ideal" style="font-size:0.75rem; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;">10/10 Answer</p>
                                        <div id="modelAnswerText" class="feedback-box-content" style="font-size:0.88rem;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="feedback-actions" style="display:none;">
                        <button id="nextQuestion" class="btn-primary">Next Question</button>
                        <button id="tryAgain" class="btn-secondary">Try This Question Again</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // Initialize the page
    async init(container) {
        console.log('PracticePage init called with container:', container);

        // Detect guest vs authenticated
        await new Promise(resolve => setTimeout(resolve, 100));
        const isAuthenticated = typeof authManager !== 'undefined' &&
            authManager &&
            typeof authManager.isAuthenticated === 'function' &&
            authManager.isAuthenticated();

        this.isGuest = !isAuthenticated;

        if (this.isGuest) {
            if (!localStorage.getItem('guestId')) {
                localStorage.setItem('guestId', 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
            }
            this.guestId = localStorage.getItem('guestId');

            // Server-side check is authoritative (localStorage is just a hint)
            const hasAccess = await this.checkGuestAccess('practice');
            if (!hasAccess) {
                this.showGuestAlreadyUsedMessage(container);
                return;
            }
            // Server says access is fine — clear any stale local flag
            localStorage.removeItem('guest_practice_used');
            localStorage.removeItem('guest_simulate_used');
        } else {
            // Check subscription access before allowing practice
            const hasAccess = await this.checkSubscriptionAccess();
            if (!hasAccess) {
                return;
            }
            // Check if profile is complete and show notice if needed
            this.checkProfileCompletion();
        }
        
        try {
            // Inject the styles
            console.log('Injecting styles...');
            this.injectStyles();
            
            // Set the HTML content - find or create content area, preserving navigation
            console.log('Setting HTML content...');
            let contentArea = document.querySelector('.page-content');
            if (!contentArea) {
                contentArea = document.createElement('div');
                contentArea.className = 'page-content';
                const containerEl = document.querySelector('.container');
                if (containerEl) {
                    containerEl.appendChild(contentArea);
                }
            }
            
            if (contentArea) {
                contentArea.innerHTML = this.getHTML();
            }
            
            console.log('HTML content set, container children:', container.children.length);
            
            // Initialize all the functionality from the original ai-interviewer.js
            console.log('Initializing practice session...');
            await this.initializePracticeSession();

            const params = new URLSearchParams(window.location.search);
            if (params.get('debug') === 'results') {
                this.answerHistory = new Map([
                    ['Q1', [{ score: 7.5, answer: 'Demo answer', timestamp: Date.now() }]]
                ]);
                this.totalQuestions = 1;
                this.showInterviewPanel();
                await this.showSessionResults();
                return;
            }
            
            console.log('Practice page initialization complete');
        } catch (error) {
            console.error('Error in PracticePage init:', error);
        }
    }

    // Inject styles into the head
    injectStyles() {
        const existingStyles = document.getElementById('practice-page-styles');
        if (existingStyles) existingStyles.remove();

        // Scope dark theme to html element — highest specificity, wins all global styles
        document.documentElement.classList.add('practice-dark');

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

        if (this.isGuest) {
            // Guests: skip profile/CV loads, just show empty editable fields
            if (this.cvStatusText) {
                this.cvStatusText.textContent = 'Paste or type your CV below to get personalised questions';
                this.cvStatusText.className = 'status-text';
            }
            this.ensureInlineCvUpload();
            this.setupJobTitleInput();
            this.setupProfileAutoSave(); // wires up Generate CV / Generate JD buttons
        } else {
            // Load user profile
            await this.loadUserProfile();

            // Ensure upload input exists so the "upload yours" link works at any time
            this.ensureInlineCvUpload();

            // Auto-save role/experience when user edits them
            this.setupProfileAutoSave();

            // Smart job title detection
            this.setupJobTitleInput();

            // Only try the secondary CV load if we didn't get CV from profile
            if (!this.resumeContent) {
                console.log('No CV from profile, trying /api/resume endpoint...');
                await this.loadCvFromProfile();
            } else {
                console.log('CV already loaded from profile, skipping /api/resume call');
            }
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
        
        // Job role, company, and industry detection elements
        this.detectedRoleInput = document.getElementById('detectedRole');
        this.detectedCompanyInput = document.getElementById('detectedCompany');
        this.detectedIndustryInput = document.getElementById('detectedIndustry');
        this.roleDetectionStatus = document.getElementById('roleDetectionStatus');
        this.detectedRoleWrapper = document.getElementById('detectedRoleWrapper');
        this.detectedCompanyWrapper = document.getElementById('detectedCompanyWrapper');
        this.detectedIndustryWrapper = document.getElementById('detectedIndustryWrapper');
        
        // Resume/CV elements
        this.cvStatusText = document.getElementById('cvStatusText');
        
        // Job description element
        this.jobDescriptionInput = document.getElementById('jobDescription');
        
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
    }

    // Attach event listeners (from original ai-interviewer.js)
    attachEventListeners() {
        
        
        // Job description change for role detection
        if (this.jobDescriptionInput) {
            this.jobDescriptionInput.addEventListener('input', this.debounce(this.onJobDescriptionChange.bind(this), 1000));
            this.jobDescriptionInput.addEventListener('paste', () => {
                setTimeout(() => this.onJobDescriptionChange(), 0);
            });
        }
        
        // Start practice button
        if (this.startPracticeBtn) {
            this.startPracticeBtn.addEventListener('click', this.startPracticeSession.bind(this));
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

        // ── Pill groups: update hidden selects / track sim extras values ──────
        this._simExtras = { simPressure: 'standard', simInterviewers: '2', simDuration: '2', simSkipIntro: 'true', simAccent: 'american' };
        document.querySelectorAll('.sim-pill-group').forEach(group => {
            group.addEventListener('click', e => {
                const pill = e.target.closest('.sim-pill');
                if (!pill) return;
                group.querySelectorAll('.sim-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const field = group.dataset.field;
                const val   = pill.dataset.value;
                // Update hidden select if it exists (for difficultyLevel / questionType / language)
                const sel = document.getElementById(field);
                if (sel) sel.value = val;
                // Track sim-only extras
                if (field in this._simExtras) this._simExtras[field] = val;
                // Update customise summary if a settings field changed
                setTimeout(updateCustomiseSummary, 0);
            });
        });

        // ── Customise toggle ─────────────────────────────────────────────────
        const customiseToggleRow = document.getElementById('customiseToggleRow');
        const customisePanel     = document.getElementById('customisePanel');
        const customiseChevron   = document.getElementById('customiseChevron');
        const customiseSummaryEl = document.getElementById('customiseSummary');

        const diffLabels = { entry: 'Entry', intermediate: 'Mid', senior: 'Senior', expert: 'Expert' };
        const typeLabels = { mixed: 'General', behavioral: 'Behavioural', technical: 'Technical', competency: 'Competency' };
        const langLabels = { english: 'English', french: 'French', spanish: 'Spanish', german: 'German', portuguese: 'Portuguese', italian: 'Italian', arabic: 'Arabic', chinese: 'Chinese' };

        function updateCustomiseSummary() {
            const diff = document.querySelector('.sim-pill-group[data-field="difficultyLevel"] .sim-pill.active')?.dataset.value || 'intermediate';
            const type = document.querySelector('.sim-pill-group[data-field="questionType"] .sim-pill.active')?.dataset.value || 'mixed';
            const lang = document.querySelector('.sim-pill-group[data-field="language"] .sim-pill.active')?.dataset.value || 'english';
            if (customiseSummaryEl) customiseSummaryEl.textContent = `${diffLabels[diff] || diff} · ${typeLabels[type] || type} · ${langLabels[lang] || lang}`;
        }

        if (customiseToggleRow) {
            customiseToggleRow.addEventListener('click', () => {
                const isOpen = customisePanel.style.display !== 'none';
                customisePanel.style.display = isOpen ? 'none' : 'block';
                if (customiseSummaryEl) customiseSummaryEl.style.display = isOpen ? '' : 'none';
                if (customiseChevron) customiseChevron.classList.toggle('open', !isOpen);
            });
        }

        // ── Wizard navigation ────────────────────────────────────────────────
        const wizardStepEls = Array.from(document.querySelectorAll('.wizard-step'));
        const wizardDotEls  = Array.from(document.querySelectorAll('.wizard-dot'));
        let wizardStep = 0;

        const goToWizardStep = (n) => {
            wizardStepEls.forEach((s, i) => s.classList.toggle('active', i === n));
            wizardDotEls.forEach((d, i) => {
                d.classList.remove('active', 'done');
                if (i === n) d.classList.add('active');
                else if (i < n) d.classList.add('done');
            });
            wizardStep = n;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const flashError = (el) => {
            if (!el) return;
            el.classList.add('highlight-error');
            el.focus?.();
            setTimeout(() => el.classList.remove('highlight-error'), 2000);
        };

        document.querySelectorAll('.wizard-next-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (wizardStep === 0) {
                    const role = document.getElementById('currentRole');
                    if (!role?.value.trim()) { flashError(role); return; }
                }
                if (wizardStep === 1) {
                    const exp = document.getElementById('experienceYears');
                    if (!exp?.value) { flashError(exp); return; }
                }
                if (wizardStep === 2) {
                    const hasCV = this.resumeContent?.trim();
                    if (!hasCV) {
                        const cvDisplay = document.getElementById('cvDisplay');
                        if (cvDisplay) {
                            cvDisplay.style.border = '1.5px solid #f87171';
                            setTimeout(() => { cvDisplay.style.border = ''; }, 2000);
                        }
                        return;
                    }
                }
                if (wizardStep === 3) {
                    const jd = document.getElementById('jobDescription');
                    if (!jd?.value.trim()) { flashError(jd); return; }
                }
                if (wizardStep < wizardStepEls.length - 1) goToWizardStep(wizardStep + 1);
            });
        });
        document.querySelectorAll('.wizard-back-btn').forEach(btn => {
            btn.addEventListener('click', () => { if (wizardStep > 0) goToWizardStep(wizardStep - 1); });
        });

        // ── Mode selector: toggle Practice / Simulate UI ──────────────────────
        const modeBtnPractice = document.getElementById('modeBtnPractice');
        const modeBtnSimulate = document.getElementById('modeBtnSimulate');
        const simExtrasPanel  = document.getElementById('simExtrasPanel');
        const practiceStartWrapper = document.getElementById('practiceStartWrapper');
        const simLaunchWrapper     = document.getElementById('simLaunchWrapper');

        const setMode = (mode) => {
            if (mode === 'practice') {
                modeBtnPractice?.classList.add('selected');
                modeBtnSimulate?.classList.remove('selected');
                if (simExtrasPanel)      simExtrasPanel.style.display      = 'none';
                if (practiceStartWrapper) practiceStartWrapper.style.display = '';
                if (simLaunchWrapper)    simLaunchWrapper.style.display    = 'none';
            } else {
                modeBtnSimulate?.classList.add('selected');
                modeBtnPractice?.classList.remove('selected');
                if (simExtrasPanel)      simExtrasPanel.style.display      = '';
                if (practiceStartWrapper) practiceStartWrapper.style.display = 'none';
                if (simLaunchWrapper)    simLaunchWrapper.style.display    = '';
            }
            const panel = document.getElementById('setupPanel');
            if (panel) panel.style.backgroundColor = '#1a3028';
        };
        modeBtnPractice?.addEventListener('click', () => setMode('practice'));
        modeBtnSimulate?.addEventListener('click', () => setMode('simulate'));

        // ── Simulator launch: save config to localStorage and redirect ─────────
        const launchSimBtn = document.getElementById('launchSimBtn');
        if (launchSimBtn) {
            launchSimBtn.addEventListener('click', async () => {
                // Job description and CV are OPTIONAL here too — never block the
                // first interview. The simulator falls back to role + experience.
                const jd = this.jobDescriptionInput?.value.trim() || '';

                // CV: try resumeContent first, then localStorage fallback (optional)
                let cv = this.resumeContent || '';
                if (!cv || (typeof cv === 'string' && !cv.trim())) {
                    try {
                        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                        if (localUser.resume_content?.trim()) {
                            cv = localUser.resume_content;
                            this.resumeContent = cv;
                        }
                    } catch (_) {}
                }

                // ── All good — build config and redirect ──────────────────────
                const diffMap = { entry: 'junior', intermediate: 'mid', senior: 'senior', expert: 'senior' };
                const typeMap = { mixed: 'general', behavioral: 'behavioral', technical: 'technical', competency: 'competency' };
                const langMap = { english: 'en', french: 'fr', spanish: 'es', german: 'de', portuguese: 'pt', italian: 'it', arabic: 'ar', chinese: 'zh', dutch: 'en', russian: 'en', japanese: 'en', korean: 'en' };

                const rawDiff = this.difficultyLevelSelect?.value || 'intermediate';
                const rawType = this.questionTypeSelect?.value    || 'mixed';
                const rawLang = this.languageSelect?.value        || 'english';

                const cfg = {
                    type:         typeMap[rawType]  || 'general',
                    difficulty:   diffMap[rawDiff]  || 'mid',
                    language:     langMap[rawLang]   || 'en',
                    pressure:     this._simExtras.simPressure    || 'standard',
                    interviewers: this._simExtras.simInterviewers || '2',
                    duration:     this._simExtras.simDuration     || '20',
                    skipIntro:    this._simExtras.simSkipIntro === 'true',
                    accent:       this._simExtras.simAccent || 'american',
                    cv,
                    jd,
                    // Role + experience so the server can auto-generate CV/JD when absent
                    role: (this.detectedRoleInput?.value.trim() || this.currentRoleInput?.value.trim() || ''),
                    experienceYears: this.experienceYearsInput?.value.trim() || '',
                    additionalInfo: this.additionalInfoInput?.value.trim() || '',
                    fromPractice: true,
                };
                localStorage.setItem('sim_launch', JSON.stringify(cfg));

                // Pre-warm mic and speech synthesis in this gesture context so
                // iOS Safari lets the simulator page auto-start without an extra tap.
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    stream.getTracks().forEach(t => t.stop());
                } catch (_) {}
                try {
                    if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
                } catch (_) {}

                window.location.href = '/simulator';
            });
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
            
            // Connect with authentication (or guest ID for unauthenticated users)
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
                console.log('✅ Received feedbackComplete event:', {
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
                
                // Check if it's a "no questions remaining" error
                if (data.code === 'NO_QUESTIONS_REMAINING') {
                    console.log('No questions remaining - ending session');
                    alert('You have no questions remaining in your subscription. The session will now end.');
                    this.showSessionResults();
                    return;
                }
                
                if (this.questionText && this.questionText.textContent.includes('Generating')) {
                    this.questionText.textContent = 'Error generating question. Please try again.';
                }
            });

            // Handle practice-specific errors (paywall/quota, generation failures) —
            // server emits this on a separate event from 'error', so it needs its own listener
            this.socket.on('practice-error', (data) => {
                console.error('Practice error:', data);
                if (this.questionRequestTimeout) {
                    clearTimeout(this.questionRequestTimeout);
                    this.questionRequestTimeout = null;
                }

                if (data.code === 'NO_QUESTIONS' || data.code === 'NO_QUESTIONS_REMAINING') {
                    console.log('No questions remaining - ending session');
                    alert('You have no questions remaining in your subscription. The session will now end.');
                    this.showSessionResults();
                    return;
                }

                if (data.message) {
                    alert(data.message);
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
                if (this.currentRoleInput && user.role) {
                    this.currentRoleInput.value = user.role;
                }
                if (this.experienceYearsInput && user.experience_years !== null && user.experience_years !== undefined) {
                    this.experienceYearsInput.value = user.experience_years;
                }

                // Fields are always editable — no banner needed
                
                // Merge localStorage resume into API user data (in case uploaded from edit-profile)
                const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (!user.resume_content && localUser.resume_content) {
                    user.resume_content = localUser.resume_content;
                    user.resume_filename = localUser.resume_filename;
                }

                // Load CV content if available (field is called resume_content in database)
                // Skip if user has already manually uploaded a CV in this session
                if (!this.cvManuallyUploaded) {
                    if (user.resume_content && user.resume_content.trim() !== '') {
                        this.resumeContent = user.resume_content;
                        console.log('CV loaded successfully, length:', this.resumeContent.length);
                        if (this.cvStatusText) {
                            this.cvStatusText.textContent = '✓ CV loaded from profile';
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
                            this.cvStatusText.innerHTML = '⚠️ No CV found — <label for="inlineCvUpload" style="color:#667eea; text-decoration:underline; cursor:pointer;">Upload CV</label> (PDF or TXT)';
                            this.ensureInlineCvUpload();
                            this.cvStatusText.className = 'status-text no-cv';
                        }
                        console.log('No CV found in profile (resume_content is empty or missing)');
                    }
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

    setupJobTitleInput() {
        const jobTitleInput = document.getElementById('currentRole');
        const suggestionsEl = document.getElementById('jobTitleSuggestions');
        const correctionEl = document.getElementById('jobTitleCorrection');
        if (!jobTitleInput) return;

        const clearCorrection = () => {
            if (correctionEl) { correctionEl.style.display = 'none'; correctionEl.textContent = ''; }
        };
        const hideSuggestions = () => {
            if (suggestionsEl) { suggestionsEl.style.display = 'none'; suggestionsEl.innerHTML = ''; }
        };
        const renderSuggestions = (items) => {
            if (!suggestionsEl || !items.length) { hideSuggestions(); return; }
            suggestionsEl.innerHTML = `<div class="job-title-suggestions-header">You can keep your title or choose one of the suggestions below.</div>` +
                items.map(title => {
                    const isExact = this.normalizeJobTitle(title) === this.normalizeJobTitle(jobTitleInput.value);
                    return `<button type="button" class="job-title-suggestion" data-value="${this.escapeHtml(title)}">
                        <span>${this.escapeHtml(title)}</span>
                        <span class="job-title-suggestion-hint">${isExact ? 'Exact match' : 'Suggested'}</span>
                    </button>`;
                }).join('');
            suggestionsEl.style.display = 'block';
        };

        jobTitleInput.addEventListener('input', this.debounce(async () => {
            clearCorrection();
            const query = jobTitleInput.value.trim();
            if (query.length < 2) { hideSuggestions(); return; }
            const result = await this.fetchJobTitleSuggestions(query);
            if (!result || jobTitleInput.value.trim() !== query) return;
            if (result.correctedTitle && this.normalizeJobTitle(result.correctedTitle) !== this.normalizeJobTitle(query)) {
                if (correctionEl) { correctionEl.textContent = `Suggested: "${result.correctedTitle}"`; correctionEl.style.display = 'block'; }
            }
            renderSuggestions(result.suggestions);
        }, 250));

        jobTitleInput.addEventListener('focus', () => {
            const query = jobTitleInput.value.trim();
            if (query.length >= 2) {
                this.fetchJobTitleSuggestions(query).then(result => {
                    if (!result || jobTitleInput.value.trim() !== query) return;
                    renderSuggestions(result.suggestions);
                });
            }
        });

        jobTitleInput.addEventListener('blur', () => {
            setTimeout(() => { hideSuggestions(); clearCorrection(); }, 150);
        });

        if (suggestionsEl) {
            suggestionsEl.addEventListener('click', (e) => {
                const target = e.target.closest('.job-title-suggestion');
                if (!target) return;
                const value = target.getAttribute('data-value');
                if (value) {
                    jobTitleInput.value = value;
                    clearCorrection();
                    hideSuggestions();
                    jobTitleInput.dispatchEvent(new Event('input'));
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (!suggestionsEl) return;
            if (!jobTitleInput.contains(e.target) && !suggestionsEl.contains(e.target)) hideSuggestions();
        });
    }

    normalizeJobTitle(value) {
        return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async fetchJobTitleSuggestions(query) {
        if (!query || query.trim().length < 2) return { suggestions: [], correctedTitle: null };
        if (this.jobTitleSuggestionAbort) this.jobTitleSuggestionAbort.abort();
        const controller = new AbortController();
        this.jobTitleSuggestionAbort = controller;
        try {
            const response = await fetch('/api/ai/job-title-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
                signal: controller.signal
            });
            if (!response.ok) return { suggestions: [], correctedTitle: null };
            const data = await response.json();
            return {
                suggestions: Array.isArray(data.suggestions) ? data.suggestions.map(s => String(s).trim()).filter(Boolean).slice(0, 6) : [],
                correctedTitle: typeof data.correctedTitle === 'string' && data.correctedTitle.trim() ? data.correctedTitle.trim() : null
            };
        } catch (e) {
            if (e.name === 'AbortError') return null;
            return { suggestions: [], correctedTitle: null };
        }
    }

    setupProfileAutoSave() {
        const roleEl = document.getElementById('currentRole');
        const expEl = document.getElementById('experienceYears');
        if (!roleEl || !expEl) return;

        let saveTimer = null;

        const triggerSave = () => {
            if (this.isGuest) return;
            clearTimeout(saveTimer);
            saveTimer = setTimeout(async () => {
                const role = roleEl.value.trim();
                const exp = expEl.value;
                if (!role || exp === '') return;
                await this.saveProfileFields(role, exp);
            }, 800);
        };

        roleEl.addEventListener('input', triggerSave);
        expEl.addEventListener('change', triggerSave);

        // Auto-regen AI CV when role/experience change (only if AI CV is already active)
        let regenTimer = null;
        const triggerRegen = () => {
            if (!this._cvIsAiGenerated) return;
            clearTimeout(regenTimer);
            regenTimer = setTimeout(() => {
                const role = roleEl.value.trim();
                const exp = expEl.value;
                if (role && exp !== '') this.generateCvWithAI(role, exp);
            }, 1200);
        };
        roleEl.addEventListener('input', triggerRegen);
        expEl.addEventListener('change', triggerRegen);

        // Generate CV button
        const btn = document.getElementById('generateCvBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                const role = roleEl.value.trim();
                const exp = expEl.value;
                if (!role) {
                    this.showError('Please enter your current role first.');
                    return;
                }
                this.generateCvWithAI(role, exp);
            });
        }

        // Generate Job Description button
        const jdBtn = document.getElementById('generateJdBtn');
        if (jdBtn) {
            jdBtn.addEventListener('click', () => {
                const role = roleEl.value.trim();
                const exp = expEl.value;
                if (!role) {
                    this.showError('Please enter your current role first.');
                    return;
                }
                this.generateJdWithAI(role, exp);
            });
        }
    }

    async generateJdWithAI(jobTitle, experienceYears) {
        const btn = document.getElementById('generateJdBtn');
        const label = document.getElementById('generateJdBtnLabel');
        const jdTextarea = document.getElementById('jobDescription');
        const startBtn = document.getElementById('startPractice');
        const launchSimBtn = document.getElementById('launchSimBtn');

        if (btn) btn.disabled = true;
        if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Generating job description…'; }
        if (launchSimBtn) { launchSimBtn.disabled = true; launchSimBtn.textContent = 'Generating job description…'; }
        if (label) label.textContent = 'Generating…';

        try {
            const response = await authManager.apiRequest('/api/generate-jd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobTitle, experienceYears })
            });

            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed');

            // Fill textarea and trigger auto-detection
            if (jdTextarea) {
                jdTextarea.value = data.content;
                jdTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (label) label.textContent = 'Regenerate';
        } catch (err) {
            console.error('JD generation failed:', err);
            this.showError('Failed to generate job description. Try again.');
            if (label) label.textContent = 'Generate';
        } finally {
            if (btn) btn.disabled = false;
            if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Practice Session'; }
            if (launchSimBtn) { launchSimBtn.disabled = false; launchSimBtn.textContent = 'Enter the room →'; }
        }
    }

    async generateCvWithAI(jobTitle, experienceYears) {
        const btn = document.getElementById('generateCvBtn');
        const label = document.getElementById('generateCvBtnLabel');
        const statusText = document.getElementById('cvStatusText');
        const startBtn = document.getElementById('startPractice');
        const launchSimBtn = document.getElementById('launchSimBtn');

        if (btn) btn.disabled = true;
        if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Generating CV…'; }
        if (launchSimBtn) { launchSimBtn.disabled = true; launchSimBtn.textContent = 'Generating CV…'; }
        if (label) label.textContent = 'Generating…';
        if (statusText) {
            statusText.textContent = 'Generating CV with AI…';
            statusText.className = 'status-text';
        }

        try {
            const response = await authManager.apiRequest('/api/generate-cv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobTitle, experienceYears })
            });

            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed');

            this.resumeContent = data.content;
            this._cvIsAiGenerated = true;
            this.cvManuallyUploaded = true; // prevent async loaders from overwriting

            const expLabel = !experienceYears || experienceYears === '0' ? 'Fresh graduate'
                : experienceYears >= 10 ? '10+ yrs' : `${experienceYears} yr${experienceYears == 1 ? '' : 's'}`;

            if (statusText) {
                statusText.textContent = `✓ AI CV generated (${jobTitle}, ${expLabel})`;
                statusText.className = 'status-text loaded';
            }
            if (label) label.textContent = 'Regenerate CV';

            // Show generated CV in collapsible preview
            const cvDisplay = document.getElementById('cvDisplay');
            if (cvDisplay) {
                let preview = document.getElementById('aiCvPreview');
                if (!preview) {
                    preview = document.createElement('div');
                    preview.id = 'aiCvPreview';
                    cvDisplay.appendChild(preview);
                }
                preview.innerHTML = `
                    <div style="margin-top:10px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
                        <button type="button" id="aiCvToggle" onclick="
                            const body = document.getElementById('aiCvBody');
                            const isOpen = body.style.display !== 'none';
                            body.style.display = isOpen ? 'none' : 'block';
                            this.querySelector('span').textContent = isOpen ? '▶ View generated CV' : '▼ Hide CV';
                        " style="width:100%;text-align:left;padding:9px 14px;background:#f1f5f9;border:none;cursor:pointer;font-size:0.85rem;font-weight:600;color:#374151;display:flex;justify-content:space-between;align-items:center">
                            <span>▶ View generated CV</span>
                            <span style="font-size:0.75rem;color:#9ca3af;font-weight:400">AI-generated · not saved to profile</span>
                        </button>
                        <div id="aiCvBody" style="display:none;padding:14px 16px;background:white;white-space:pre-wrap;font-size:0.82rem;line-height:1.7;color:#374151;max-height:320px;overflow-y:auto">${data.content.replace(/</g, '&lt;')}</div>
                    </div>`;
            }
        } catch (err) {
            console.error('CV generation failed:', err);
            if (statusText) {
                statusText.textContent = 'Failed to generate CV. Try again.';
                statusText.className = 'status-text error';
            }
            if (label) label.textContent = 'Generate CV with AI';
        } finally {
            if (btn) btn.disabled = false;
            if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Practice Session'; }
            if (launchSimBtn) { launchSimBtn.disabled = false; launchSimBtn.textContent = 'Enter the room →'; }
        }
    }

    // Load CV from profile (copied from original ai-interviewer.js)
    async loadCvFromProfile() {
        // Don't overwrite status if user just uploaded a CV inline
        if (this.cvManuallyUploaded || this.resumeContent) {
            console.log('CV already loaded/uploaded, skipping loadCvFromProfile');
            return;
        }
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
                        ? `✓ CV loaded: ${data.filename}${data.uploadedAt ? ' (uploaded: ' + new Date(data.uploadedAt).toLocaleDateString() + ')' : ''}`
                        : '✓ CV loaded successfully';
                    
                    if (this.cvStatusText) {
                        this.cvStatusText.textContent = statusText;
                        this.cvStatusText.className = 'status-text loaded';
                    }
                    
                    console.log('CV loaded from profile successfully');
                } else {
                    this.resumeContent = null;
                    if (this.cvStatusText) {
                        this.cvStatusText.innerHTML = '⚠️ No CV found — <label for="inlineCvUpload" style="color:#667eea; text-decoration:underline; cursor:pointer;">Upload CV</label> (PDF or TXT)';
                        this.ensureInlineCvUpload();
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
                this.cvStatusText.innerHTML = '⚠️ No CV found — <label for="inlineCvUpload" style="color:#667eea; text-decoration:underline; cursor:pointer;">Upload CV</label> (PDF or TXT)';
                        this.ensureInlineCvUpload();
                this.cvStatusText.className = 'status-text no-cv';
            }
        }
    }

    // Modal methods
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

    ensureProfileRequiredModal() {
        let modal = document.getElementById('profileRequiredModal');
        if (modal) {
            return modal;
        }

        modal = document.createElement('div');
        modal.id = 'profileRequiredModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Profile Required</h3>
                </div>
                <div class="modal-body">
                    <p data-message></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" data-action="close">Got it</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeProfileRequiredModal());
        }

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeProfileRequiredModal();
            }
        });

        return modal;
    }

    showProfileRequiredModal(message, focusElement) {
        const modal = this.ensureProfileRequiredModal();
        const messageEl = modal.querySelector('[data-message]');
        if (messageEl) {
            messageEl.textContent = message;
        }
        this.profileRequiredFocusElement = focusElement || null;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeProfileRequiredModal() {
        const modal = document.getElementById('profileRequiredModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (this.profileRequiredFocusElement) {
            this.profileRequiredFocusElement.focus();
            this.profileRequiredFocusElement = null;
        }
    }

    showIncompleteProfileBanner() {
        if (document.getElementById('incompleteProfileBanner')) return;

        const banner = document.createElement('div');
        banner.id = 'incompleteProfileBanner';
        banner.style.cssText = `
            background: #fffbeb; border: 1px solid #f59e0b; border-radius: 10px;
            padding: 12px 16px; margin-bottom: 16px; display: flex;
            align-items: center; justify-content: space-between; gap: 12px;
            font-size: 0.9rem; color: #92400e;
        `;
        banner.innerHTML = `
            <span>⚠️ Your profile is missing a role or experience level — add them to get more relevant interview questions.</span>
            <button id="completeProfileBannerBtn" style="
                background: #f59e0b; color: #fff; border: none; border-radius: 6px;
                padding: 6px 14px; font-weight: 600; cursor: pointer; white-space: nowrap; font-size: 0.875rem;
            ">Complete Profile</button>
        `;

        // Insert at the top of the practice interface
        const practiceContainer = document.querySelector('.practice-container, .practice-interface, #practiceInterface, main, .container');
        if (practiceContainer) {
            practiceContainer.insertBefore(banner, practiceContainer.firstChild);
        }

        document.getElementById('completeProfileBannerBtn').addEventListener('click', () => {
            this.showCompleteProfileModal(() => {
                const b = document.getElementById('incompleteProfileBanner');
                if (b) b.remove();
            });
        });
    }

    showCompleteProfileModal(onComplete) {
        let modal = document.getElementById('completeProfileModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'completeProfileModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 420px; width: 90%;">
                    <div class="modal-header" style="background: #3b82f6; display:flex; align-items:center; justify-content:space-between;">
                        <h3 style="margin:0;">Complete your profile</h3>
                        <button id="completeProfileCloseBtn" style="background:none; border:none; color:#fff; font-size:1.4rem; cursor:pointer; line-height:1; padding:0 4px;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: #666; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5;">
                            We need your current role and experience level to generate interview questions relevant to you.
                        </p>
                        <div style="margin-bottom: 14px;">
                            <label for="modalCurrentRole" style="display:block; font-weight:600; margin-bottom:6px; font-size:0.9rem;">Current Role <span style="color:#e53e3e;">*</span></label>
                            <input type="text" id="modalCurrentRole" placeholder="e.g. Software Engineer"
                                style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:0.9rem; box-sizing:border-box;" />
                        </div>
                        <div style="margin-bottom:6px;">
                            <label for="modalExperienceYears" style="display:block; font-weight:600; margin-bottom:6px; font-size:0.9rem;">Years of Experience <span style="color:#e53e3e;">*</span></label>
                            <select id="modalExperienceYears"
                                style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:0.9rem; background:#fff; box-sizing:border-box;">
                                <option value="">Select...</option>
                                <option value="0">Fresh Graduate</option>
                                <option value="1">1 year</option>
                                <option value="2">2 years</option>
                                <option value="3">3 years</option>
                                <option value="4">4 years</option>
                                <option value="5">5 years</option>
                                <option value="6">6–10 years</option>
                                <option value="10">10+ years</option>
                            </select>
                        </div>
                        <p id="completeProfileError" style="color:#e53e3e; font-size:0.85rem; margin-top:8px; display:none;"></p>
                    </div>
                    <div class="modal-footer">
                        <button id="completeProfileSaveBtn" class="btn btn-primary">Save &amp; Continue</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Wire up close button (once, on creation)
            modal.querySelector('#completeProfileCloseBtn').addEventListener('click', () => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }

        // Pre-fill with any existing values
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const roleInput = modal.querySelector('#modalCurrentRole');
        const expSelect = modal.querySelector('#modalExperienceYears');
        const errorEl = modal.querySelector('#completeProfileError');
        if (user.role) roleInput.value = user.role;
        if (user.experience_years !== null && user.experience_years !== undefined) {
            expSelect.value = String(user.experience_years);
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => roleInput.focus(), 100);

        // Replace save button to remove any stale listeners
        const oldBtn = modal.querySelector('#completeProfileSaveBtn');
        const saveBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(saveBtn, oldBtn);

        saveBtn.addEventListener('click', async () => {
            const role = roleInput.value.trim();
            const experienceYears = expSelect.value;
            errorEl.style.display = 'none';

            if (!role) {
                errorEl.textContent = 'Please enter your current role.';
                errorEl.style.display = 'block';
                roleInput.focus();
                return;
            }
            if (experienceYears === '') {
                errorEl.textContent = 'Please select your years of experience.';
                errorEl.style.display = 'block';
                expSelect.focus();
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const saved = await this.saveProfileFields(role, experienceYears);
            if (saved) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
                if (typeof onComplete === 'function') onComplete();
            } else {
                errorEl.textContent = 'Failed to save. Please try again.';
                errorEl.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save & Continue';
            }
        });
    }

    async saveProfileFields(role, experienceYears) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await authManager.apiRequest('/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    name: user.name || '',
                    role,
                    experienceYears: parseInt(experienceYears) || 0
                })
            });

            if (!response.ok) return false;

            const data = await response.json();
            const updatedUser = { ...user, ...(data.user || {}), role, experience_years: parseInt(experienceYears) || 0 };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            if (typeof authManager !== 'undefined' && authManager) authManager.user = updatedUser;

            // Update the page inputs so session config picks them up
            const roleEl = this.currentRoleInput || document.getElementById('currentRole');
            const expEl = this.experienceYearsInput || document.getElementById('experienceYears');
            if (roleEl) roleEl.value = role;
            if (expEl) expEl.value = experienceYears;

            // Remove the incomplete profile banner if present
            const banner = document.getElementById('incompleteProfileBanner');
            if (banner) banner.remove();

            return true;
        } catch (error) {
            console.error('Failed to save profile fields:', error);
            return false;
        }
    }

    ensureInlineCvUpload() {
        if (document.getElementById('inlineCvUpload')) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.id = 'inlineCvUpload';
        input.accept = '.pdf,.txt,.docx';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;

            // Always fetch live element to avoid stale reference
            const statusEl = document.getElementById('cvStatusText');
            if (statusEl) {
                statusEl.innerHTML = '⏳ Uploading CV...';
                statusEl.className = 'status-text';
            }
            // Keep this.cvStatusText in sync
            this.cvStatusText = statusEl;

            try {
                const token = localStorage.getItem('authToken');
                const formData = new FormData();
                formData.append('resume', file);

                const response = await fetch('/api/upload-resume', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const data = await response.json();

                // Re-fetch element after await in case DOM changed
                const statusElAfter = document.getElementById('cvStatusText');
                this.cvStatusText = statusElAfter;

                if (response.ok && data.content) {
                    this.resumeContent = data.content;
                    this.cvManuallyUploaded = true; // Prevent async profile loads from overwriting status

                    // Update localStorage
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    user.resume_content = data.content;
                    user.resume_filename = data.filename;
                    localStorage.setItem('user', JSON.stringify(user));

                    if (statusElAfter) {
                        statusElAfter.innerHTML = `✓ CV uploaded: ${data.filename}`;
                        statusElAfter.className = 'status-text loaded';
                    }
                } else {
                    if (statusElAfter) {
                        statusElAfter.innerHTML = `❌ Upload failed — <label for="inlineCvUpload" style="color:#667eea; text-decoration:underline; cursor:pointer;">Try again</label>`;
                        statusElAfter.className = 'status-text error';
                    }
                }
            } catch (err) {
                console.error('CV upload error:', err);
                const statusElErr = document.getElementById('cvStatusText');
                if (statusElErr) {
                    statusElErr.innerHTML = `❌ Upload failed — <label for="inlineCvUpload" style="color:#667eea; text-decoration:underline; cursor:pointer;">Try again</label>`;
                    statusElErr.className = 'status-text error';
                }
            }

            // Reset input so the same file can be re-selected if needed
            input.value = '';
        });
    }

    ensureEmptyAnswerModal() {
        let modal = document.getElementById('emptyAnswerModal');
        if (modal) {
            return modal;
        }

        modal = document.createElement('div');
        modal.id = 'emptyAnswerModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Answer Required</h3>
                </div>
                <div class="modal-body">
                    <p>Please enter your answer before submitting.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" data-action="close">Got it</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeEmptyAnswerModal());
        }

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeEmptyAnswerModal();
            }
        });

        return modal;
    }

    showEmptyAnswerModal() {
        const modal = this.ensureEmptyAnswerModal();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeEmptyAnswerModal() {
        const modal = document.getElementById('emptyAnswerModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (this.textAnswer) {
            this.textAnswer.focus();
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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


    // Helper function to enable/disable start button
    setStartButtonState(enabled, text = 'Start Practice Session') {
        if (this.startPracticeBtn) {
            this.startPracticeBtn.disabled = !enabled;
            this.startPracticeBtn.textContent = text;
            
            if (enabled) {
                // Reset any inline styles to let CSS take over
                this.startPracticeBtn.style.opacity = '';
                this.startPracticeBtn.style.cursor = '';
                this.startPracticeBtn.style.backgroundColor = '';
            }
            // When disabled, the existing CSS will handle the styling
        }
    }

    // Helper function to show/hide loading state in detection fields
    setDetectionFieldsLoading(loading) {
        if (loading) {
            if (this.detectedRoleInput) {
                this.detectedRoleInput.value = '';
                this.detectedRoleInput.placeholder = 'Detecting role...';
                this.detectedRoleInput.style.opacity = '0.7';
            }
            if (this.detectedCompanyInput) {
                this.detectedCompanyInput.value = '';
                this.detectedCompanyInput.placeholder = 'Detecting company...';
                this.detectedCompanyInput.style.opacity = '0.7';
            }
            if (this.detectedIndustryInput) {
                this.detectedIndustryInput.value = '';
                this.detectedIndustryInput.placeholder = 'Detecting industry...';
                this.detectedIndustryInput.style.opacity = '0.7';
            }
            if (this.detectedRoleWrapper) {
                this.detectedRoleWrapper.classList.add('is-loading');
            }
            if (this.detectedCompanyWrapper) {
                this.detectedCompanyWrapper.classList.add('is-loading');
            }
            if (this.detectedIndustryWrapper) {
                this.detectedIndustryWrapper.classList.add('is-loading');
            }
        } else {
            if (this.detectedRoleInput) {
                this.detectedRoleInput.placeholder = 'Role will be detected automatically...';
                this.detectedRoleInput.style.opacity = '';
            }
            if (this.detectedCompanyInput) {
                this.detectedCompanyInput.placeholder = 'Company will be detected automatically...';
                this.detectedCompanyInput.style.opacity = '';
            }
            if (this.detectedIndustryInput) {
                this.detectedIndustryInput.placeholder = 'Industry will be detected automatically...';
                this.detectedIndustryInput.style.opacity = '';
            }
            if (this.detectedRoleWrapper) {
                this.detectedRoleWrapper.classList.remove('is-loading');
            }
            if (this.detectedCompanyWrapper) {
                this.detectedCompanyWrapper.classList.remove('is-loading');
            }
            if (this.detectedIndustryWrapper) {
                this.detectedIndustryWrapper.classList.remove('is-loading');
            }
        }
    }

    // Handle job description change
    onJobDescriptionChange() {
        const jobDescriptionText = this.jobDescriptionInput.value.trim();
        const minDetectLength = 20;
        const hintLength = 10;
        const launchSimBtn = document.getElementById('launchSimBtn');

        if (jobDescriptionText.length >= minDetectLength) {
            this.roleDetectionStatus.textContent = 'Detecting role, company, and industry...';
            // Disable both buttons during detection — detectJobInfo will re-enable them
            this.setStartButtonState(false, 'Detecting information...');
            if (launchSimBtn) { launchSimBtn.disabled = true; launchSimBtn.textContent = 'Detecting role…'; }
            // Show loading state in detection fields
            this.setDetectionFieldsLoading(true);
            this.detectJobInfo();
        } else if (jobDescriptionText.length >= hintLength) {
            this.roleDetectionStatus.textContent = 'Keep typing for automatic detection...';
            // Re-enable buttons
            this.setStartButtonState(true, 'Start Practice Session');
            if (launchSimBtn) { launchSimBtn.disabled = false; launchSimBtn.textContent = 'Enter the room →'; }
        } else {
            this.detectedRoleInput.value = '';
            this.detectedCompanyInput.value = '';
            this.detectedIndustryInput.value = '';
            this.roleDetectionStatus.textContent = 'Waiting for job description...';
            // Re-enable both buttons
            this.setStartButtonState(true, 'Start Practice Session');
            if (launchSimBtn) { launchSimBtn.disabled = false; launchSimBtn.textContent = 'Enter the room →'; }
        }
    }

    // Detect job information from description
    async detectJobInfo() {
        const jobDescriptionText = this.jobDescriptionInput.value.trim();

        if (!jobDescriptionText || jobDescriptionText.length < 20) {
            return;
        }

        const launchSimBtn = document.getElementById('launchSimBtn');
        if (launchSimBtn) { launchSimBtn.disabled = true; launchSimBtn.textContent = 'Detecting role…'; }

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
            
            // Clear loading state and re-enable buttons after detection completes
            this.setDetectionFieldsLoading(false);
            this.setStartButtonState(true, 'Start Practice Session');
            if (launchSimBtn) { launchSimBtn.disabled = false; launchSimBtn.textContent = 'Enter the room →'; }
        } catch (error) {
            console.error('Error detecting job info:', error);
            this.roleDetectionStatus.textContent = 'Detection error';
            this.roleDetectionStatus.style.color = '#e74c3c';

            // Clear loading state and re-enable buttons even if detection fails
            this.setDetectionFieldsLoading(false);
            this.setStartButtonState(true, 'Start Practice Session');
            if (launchSimBtn) { launchSimBtn.disabled = false; launchSimBtn.textContent = 'Enter the room →'; }
        }
    }

    // Start practice session
    async startPracticeSession() {
        console.log('Starting practice session...');
        
        try {
            // Check if mandatory fields are filled for incomplete profiles
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const roleInput = document.getElementById('currentRole');
            const experienceInput = document.getElementById('experienceYears');

            if (!roleInput.value.trim() || !experienceInput.value.trim()) {
                this.showCompleteProfileModal(() => this.startPracticeSession());
                return;
            }

            if (this.isGuest) {
                // Guest path — 1 question, no subscription check
                this.totalQuestions = 1;
            } else {
                // First check remaining questions
                const token = localStorage.getItem('authToken');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }

                const remainingResponse = await fetch('/api/user/remaining-questions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!remainingResponse.ok) {
                    throw new Error('Failed to check remaining questions');
                }

                const remainingData = await remainingResponse.json();

                if (remainingData.remainingQuestions <= 0) {
                    alert('You have no questions remaining in your subscription. Please upgrade your plan to continue practicing.');
                    window.location.href = '/pricing';
                    return;
                }

                // Set total questions to minimum of 5 or remaining questions
                this.totalQuestions = Math.min(5, remainingData.remainingQuestions);
                console.log(`Setting session to ${this.totalQuestions} questions (${remainingData.remainingQuestions} remaining in subscription)`);
            }

            // Validate required fields
            const jobDescription = this.jobDescriptionInput.value.trim();
            const detectedRole = this.detectedRoleInput.value.trim();
            
            console.log('Validation check:', {
                hasJobDescription: !!jobDescription,
                hasResumeContent: !!this.resumeContent,
                resumeContentType: typeof this.resumeContent,
                resumeContentValue: this.resumeContent,
                jobDescriptionLength: jobDescription.length,
                resumeContentLength: this.resumeContent ? this.resumeContent.length : 0,
                resumeIsEmpty: !this.resumeContent || (typeof this.resumeContent === 'string' && this.resumeContent.trim() === ''),
                totalQuestionsForSession: this.totalQuestions
            });
            
            // Job description and CV are OPTIONAL — they tailor questions but must
            // never block a user's first interview. The AI falls back to role +
            // experience when they're absent. (Removing these two hard gates is the
            // single biggest activation lever: previously 87% of signups never
            // reached question #1 because they were forced to paste a JD and upload
            // a CV first.)
            if (!jobDescription) {
                console.log('No job description provided — generating role-based questions.');
            }

            // Recover CV from localStorage if this.resumeContent was cleared by an async reload
            if (!this.resumeContent || (typeof this.resumeContent === 'string' && this.resumeContent.trim() === '')) {
                const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (localUser.resume_content && localUser.resume_content.trim()) {
                    this.resumeContent = localUser.resume_content;
                    console.log('Recovered resumeContent from localStorage, length:', this.resumeContent.length);
                }
            }

            if (!this.resumeContent || (typeof this.resumeContent === 'string' && this.resumeContent.trim() === '')) {
                console.log('No CV provided — generating role-based questions.');
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
            // Optional context (empty string when not provided)
            resume: this.resumeContent || '',
            jobDescription: this.sessionConfig.jobDescription || '',
            
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
            additionalInfo: this.sessionConfig.additionalInfo
        };

        console.log('Emitting requestAIQuestion event with fields:', {
            hasResume: !!sessionConfig.resume,
            hasJobDescription: !!sessionConfig.jobDescription,
            resumeLength: sessionConfig.resume ? sessionConfig.resume.length : 0,
            jobDescriptionLength: sessionConfig.jobDescription ? sessionConfig.jobDescription.length : 0,
            questionNumber: sessionConfig.questionNumber
        });
        
        // Request question via WebSocket (guests use test mode bypass)
        if (this.isGuest) {
            sessionConfig.isTestMode = true;
            sessionConfig.guestId = this.guestId;
        }
        this.socket.emit('requestAIQuestion', sessionConfig);
    }

    // Display question (updated to match original behavior)
    displayQuestion(question, questionNumber, questionType) {
        console.log('✅ Received AI question:', question);
        console.log('📝 Question type:', questionType);
        
        // Remove surrounding quotes if present (like original)
        const cleanedQuestion = question.replace(/^["']|["']$/g, '').trim();
        
        if (this.questionText) {
            // Format the question type for display
            const typeDisplay = this.formatQuestionType(questionType);
            
            // Display question with type indicator
            this.questionText.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.9em; font-weight: 500;">
                        ${typeDisplay} Question
                    </span>
                </div>
                <div style="margin-top: 15px;">
                    ${cleanedQuestion}
                </div>
            `;
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
            this.speechPauses = [];
            this._lastSpeechAt = Date.now();
            this._inPause = false;
            this._pauseStartedAt = null;

            // Silence detector — fires every 300 ms to track gaps between speech
            this._silenceTimer = setInterval(() => {
                if (!this.isRecording) return;
                const gap = Date.now() - this._lastSpeechAt;
                if (gap > 1500 && !this._inPause) {
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

                    // Use server transcript as base (includes "um"s) with Web Speech interim appended for instant feel
                    const base = this.serverTranscript || this.webSpeechFinalText;
                    const liveText = (base + (interim ? ' ' + interim : '')).trim();
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

                this.recognition.onend = () => {
                    if (this.isRecording) this.recognition.start();
                };

                this.recognition.start();
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

        if (this._silenceTimer) {
            clearInterval(this._silenceTimer);
            this._silenceTimer = null;
        }

        // Stop Web Speech API and freeze the raw transcript
        if (this.recognition) {
            this.recognition.onend = null;
            this.recognition.stop();
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

        // Show feedback spinner immediately so the user knows processing has begun
        if (this.feedbackSection) this.feedbackSection.style.display = 'block';
        if (this.feedbackSpinner) this.feedbackSpinner.style.display = 'block';
        if (this.feedbackContent) this.feedbackContent.style.display = 'none';
        if (this.feedbackSection) this.feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
        
        // Set a final timeout for the server response — Whisper can take up to ~8s for long answers
        this.finalTranscriptTimeout = setTimeout(() => {
            this.showFeedbackButton();
        }, 8000);
    }
    
    showFeedbackButton() {
        if (this.finalTranscriptTimeout) {
            clearTimeout(this.finalTranscriptTimeout);
            this.finalTranscriptTimeout = null;
        }

        // If no transcript captured, show a fallback
        if (!this.answerTranscript.textContent.trim()) {
            this.answerTranscript.innerHTML = '<p>Recording completed. Generating feedback...</p>';
        }

        setTimeout(() => {
            this.requestFeedback();
        }, 100);
    }

    // Handle real-time transcript updates
    updateTranscript(text, isFinal) {
        this.lastTranscriptTime = Date.now();
        if (!text) return;

        // Server transcript is authoritative — it includes filler words ("um", "uh")
        this.serverTranscript = text;

        // Update display: server text as base + Web Speech interim for instant feel
        const interim = this.webSpeechInterimText || '';
        const combined = (text + (interim ? ' ' + interim : '')).trim();
        if (this.answerTranscript) {
            this.answerTranscript.innerHTML = `<p>${combined}</p>`;
            this.answerTranscript.scrollTop = this.answerTranscript.scrollHeight;
        }

        if (isFinal && !this.isRecording) {
            if (this.finalTranscriptTimeout) {
                clearTimeout(this.finalTranscriptTimeout);
                this.finalTranscriptTimeout = null;
            }
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
        return this.questionTypes.map(type => 
            `<option value="${type.value}" ${type.value === 'technical' ? 'selected' : ''}>${type.label}</option>`
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
                
                const _errActions = this.nextQuestionBtn?.closest('.feedback-actions');
                if (_errActions) _errActions.style.display = 'flex';
                if (this.nextQuestionBtn) {
                    this.nextQuestionBtn.style.display = 'inline-flex';
                    this.nextQuestionBtn.style.alignItems = 'center';
                    this.nextQuestionBtn.style.justifyContent = 'center';
                    this.nextQuestionBtn.style.lineHeight = 'normal';
                }
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
        
        console.log('📤 Emitting requestFeedback event to server...', {
            socketConnected: this.socket.connected,
            socketId: this.socket.id
        });
        
        // Track answer mode and duration
        const answerMode = this.voiceAnswerSection && this.voiceAnswerSection.style.display !== 'none' ? 'voice' : 'text';
        const answerDuration = this.answerStartTime ? Math.floor((Date.now() - this.answerStartTime) / 1000) : 0;

        // Compute delivery metrics to save alongside the session
        const _rawText = (this.webSpeechFinalText || '').trim();
        const _words = _rawText ? _rawText.split(/\s+/).filter(Boolean) : [];
        const _wordCount = _words.length;
        const _wpm = answerDuration > 0 && _wordCount > 0 ? Math.round((_wordCount / answerDuration) * 60) : null;
        const _fillerPattern = /\b(um|uh|mmm|hmm|ah|well|like|you know|actually|basically|literally|so|right|okay|yeah)\b/gi;
        const _fillerCount = _rawText ? (_rawText.match(_fillerPattern) || []).length : 0;
        const _pauses = this.speechPauses || [];
        const _pauseCount = _pauses.length;
        const _longestPauseMs = _pauseCount > 0 ? Math.max(..._pauses.map(p => p.duration)) : 0;

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
            questionNumber: this.currentQuestion,
            // Delivery insights
            wpm: _wpm,
            wordCount: _wordCount || null,
            fillerCount: _fillerCount || null,
            pauseCount: _pauseCount || null,
            longestPauseMs: _longestPauseMs || null
        });
        
        console.log('✅ requestFeedback event emitted successfully');
    }

    submitTextAnswer() {
        const answer = this.textAnswer.value.trim();
        if (!answer) {
            this.showEmptyAnswerModal();
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
            answerMode: this.answerMode,
            answerDuration: 0 // TODO: Calculate actual duration
        });
    }

    // Display feedback implementation (updated to match original ai-interviewer.js)
    async loadModelAnswer() {
        const section = document.getElementById('modelAnswerSection');
        const modelText = document.getElementById('modelAnswerText');
        const userText = document.getElementById('modelAnswerUserText');
        if (!section || !modelText || !userText) return;

        section.style.display = 'block';
        modelText.innerHTML = '<span style="color:#94a3b8;font-size:0.88rem;">Generating model answer...</span>';
        userText.textContent = this.webSpeechFinalText || this.answerTranscript?.textContent || '(no answer recorded)';

        try {
            const response = await fetch('/api/ai/model-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: this.currentQuestionText,
                    jobDescription: this.jobDescription || '',
                    resume: this.resumeContent || '',
                    detectedRole: this.detectedRoleInput?.value || '',
                    questionType: this.questionTypeSelect?.value || ''
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
        if (html === text) return `<p style="margin:0;">${text.replace(/\n/g, '<br>')}</p>`;
        return `<p style="margin:0;line-height:1.8;">${html}</p>`;
    }

    renderDeliveryAnalysis() {
        const deliveryEl = document.getElementById('deliveryAnalysis');
        if (!deliveryEl) return;

        const rawText = (this.serverTranscript || this.webSpeechFinalText)?.trim() || '';
        if (!rawText || rawText.length < 10) {
            deliveryEl.style.display = 'none';
            return;
        }

        const duration = this.lastAnswerDuration || 0;
        const words = rawText.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const wpm = duration > 0 ? Math.round((wordCount / duration) * 60) : null;

        // Filler words
        const fillerPattern = /\b(um|uh|mmm|hmm|ah|well|like|you know|actually|basically|literally|so|right|okay|yeah)\b/gi;
        const fillerMatches = rawText.match(fillerPattern) || [];
        const fillerCount = fillerMatches.length;

        // Pauses
        const pauses = this.speechPauses || [];
        const pauseCount = pauses.length;
        const longestPause = pauseCount > 0 ? Math.max(...pauses.map(p => p.duration)) : 0;
        const longestPauseSec = longestPause > 0 ? (longestPause / 1000).toFixed(1) : null;

        // Confidence — filler ratio + pause penalty
        const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
        const pausePenalty = (pauseCount * 0.03) + (longestPause > 4000 ? 0.05 : 0);
        const confidenceScore = fillerRatio + pausePenalty;
        const confidence = confidenceScore > 0.10 ? { label: 'Low', color: '#ef4444' }
                         : confidenceScore < 0.03 ? { label: 'High', color: '#16a34a' }
                         : { label: 'Medium', color: '#d97706' };

        // WPM rating
        const wpmRating = !wpm || wpm === 0 ? { label: '—', color: '#94a3b8' }
                        : wpm < 100  ? { label: 'Too slow', color: '#ef4444' }
                        : wpm > 170  ? { label: 'Too fast', color: '#ef4444' }
                        : wpm > 140  ? { label: 'Good', color: '#16a34a' }
                        : { label: 'Ideal', color: '#16a34a' };

        // Duration label
        const durLabel = duration === 0 ? '—'
                       : duration < 30  ? 'Too short'
                       : duration > 180 ? 'Too long'
                       : `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
        const durColor = duration > 0 && duration < 30 ? '#ef4444' : duration > 180 ? '#d97706' : '#16a34a';

        const stat = (label, value, color, sublabel) =>
            `<div class="delivery-stat" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 16px;text-align:center;">
                <div class="delivery-stat-label" style="font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">${label}</div>
                <div class="delivery-stat-value" style="font-size:1.15rem;font-weight:700;color:${color};">${value}</div>
                ${sublabel ? `<div class="delivery-stat-sublabel" style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">${sublabel}</div>` : ''}
            </div>`;

        const pauseColor = pauseCount > 5 ? '#ef4444' : pauseCount > 2 ? '#d97706' : '#16a34a';

        // Repetition detection — content words used 2+ times
        const stopWords = new Set([
            'i','me','my','we','our','you','your','he','she','it','they','them','the','a','an',
            'and','or','but','in','on','at','to','for','of','with','by','from','that','this',
            'is','was','are','were','be','been','have','has','had','do','does','did','will',
            'would','could','should','can','may','might','must','not','no','then','than','when',
            'where','how','what','who','which','if','up','out','about','into','just','also',
            'very','more','all','any','there','their','its','am','as','every','time','some',
            'get','got','go','make','one','two','him','her','his','mine','yours','ours',
            'these','those','while','after','before','because','since','until','even','too',
            'only','each','most','other','same','such','own','over','again','here','way',
            'back','down','them','been','being','us','re','ve','ll','don','didn','isn',
            'wasn','aren','weren','won','can','now','so','yet','both','few','more','most',
            'other','into','through','during','above','below','between','own','off','once'
        ]);
        const fillerWordSet = new Set([
            'um','uh','mmm','hmm','ah','well','like','know','actually','basically',
            'literally','so','right','okay','yeah'
        ]);
        const wordFreq = {};
        (rawText.toLowerCase().match(/\b[a-z]+\b/g) || []).forEach(w => {
            if (w.length >= 4 && !stopWords.has(w) && !fillerWordSet.has(w)) {
                wordFreq[w] = (wordFreq[w] || 0) + 1;
            }
        });
        const repeatedWords = new Set(Object.keys(wordFreq).filter(w => wordFreq[w] >= 2));
        const repetitionCount = repeatedWords.size;
        const topRepeat = repetitionCount > 0
            ? [...repeatedWords].sort((a, b) => wordFreq[b] - wordFreq[a])[0]
            : null;
        const repetitionPattern = repetitionCount > 0
            ? new RegExp(`\\b(${[...repeatedWords].map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
            : null;

        const html = stat('Duration', duration > 0 ? durLabel : '—', durColor) +
            stat('Pace', wpm && wpm > 0 ? `${wpm} wpm` : '—', wpmRating.color, wpmRating.label !== '—' ? wpmRating.label : null) +
            stat('Pauses', pauseCount > 0 ? pauseCount : '0', pauseColor, longestPauseSec ? `longest ${longestPauseSec}s` : null) +
            stat('Words', wordCount, '#475569') +
            stat('Fillers', fillerCount, fillerCount > 5 ? '#ef4444' : fillerCount > 2 ? '#d97706' : '#16a34a') +
            stat('Repetitions', repetitionCount, repetitionCount > 3 ? '#ef4444' : repetitionCount > 1 ? '#d97706' : '#16a34a', topRepeat ? `"${topRepeat}" ×${wordFreq[topRepeat]}` : null) +
            stat('Confidence', confidence.label, confidence.color);

        // Annotate transcript — repetitions first (before fillers), so each pass is clean
        const strongPhrases = /\b(led|managed|delivered|achieved|increased|reduced|improved|built|launched|developed|created|designed|implemented|saved|grew|scaled|negotiated|resolved|exceeded|spearheaded|initiated|drove|mentored|\d+%|\$\d+|\d+ (years?|months?|people|team|projects?))\b/gi;
        const vagueWords = /\b(kind of|sort of|i think|i guess|maybe|perhaps|might|probably|i feel like|i suppose|somewhat|fairly|quite|rather|a bit|stuff|things|something like)\b/gi;
        const replacements = [];
        let idx = 0;
        let annotated = rawText;
        if (repetitionPattern) {
            annotated = annotated.replace(repetitionPattern, (match) => {
                const key = `__R${idx++}__`;
                replacements.push({ key, html: `<mark style="background:#ede9fe;color:#5b21b6;border-radius:4px;padding:1px 3px;">${match}</mark>` });
                return key;
            });
        }
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
            const key = `__R${idx++}__`;
            replacements.push({ key, html: `<mark style="background:#dcfce7;color:#166534;border-radius:4px;padding:1px 3px;">${match}</mark>` });
            return key;
        });
        replacements.forEach(({ key, html: h }) => { annotated = annotated.replace(key, h); });

        // Store for session results aggregation
        this.lastDeliveryMetrics = { wpm, wordCount, fillerCount, pauseCount, longestPause, confidenceScore, duration, repetitionCount };

        deliveryEl.style.display = 'block';
        deliveryEl.innerHTML = `
            <div class="feedback-box delivery-analysis-box" style="border-left:none;">
                <h3>Delivery Analysis</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:10px;margin:12px 0 16px;">${html}</div>
                <div class="delivery-legend" style="font-size:0.78rem;color:#64748b;margin-bottom:8px;">
                    <span style="background:#dcfce7;border-radius:4px;padding:1px 6px;color:#166534;">green</span> = strong word &nbsp;
                    <span style="background:#fef9c3;border-radius:4px;padding:1px 6px;color:#854d0e;">yellow</span> = vague word &nbsp;
                    <span style="background:#fee2e2;border-radius:4px;padding:1px 6px;color:#991b1b;">red</span> = filler &nbsp;
                    <span style="background:#ede9fe;border-radius:4px;padding:1px 6px;color:#5b21b6;">purple</span> = repetition
                </div>
                <div class="delivery-transcript" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:0.9rem;line-height:1.7;color:#334155;">${annotated}</div>
            </div>
        `;
    }

    displayFeedback(data) {
        console.log('🎨 displayFeedback called with:', {
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
        console.log('🎨 Updating UI elements...', {
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
        
        console.log('🎨 Parsed feedback sections:', {
            hasStrengths: !!sections.strengths,
            hasImprovements: !!sections.improvements,
            hasBetterResponse: !!sections.betterResponse,
            hasTips: !!sections.tips
        });
        
        // Populate each section with proper formatting
        if (this.strengthsContent) {
            this.strengthsContent.innerHTML = this.formatFeedbackText(sections.strengths) || 'No specific strengths identified.';
            console.log('✅ Strengths populated');
        }
        
        if (this.improvementsContent) {
            this.improvementsContent.innerHTML = this.formatFeedbackText(sections.improvements) || 'Continue practicing to enhance your skills.';
            console.log('✅ Improvements populated');
        }
        
        if (this.betterResponseContent) {
            this.betterResponseContent.innerHTML = this.formatFeedbackText(sections.betterResponse) || 'Consider elaborating more on your experience and skills.';
            console.log('✅ Better response populated');
        }
        
        if (this.tipsContent) {
            const formattedTips = this.formatFeedbackText(sections.tips);
            console.log('📋 Tips content before formatting:', sections.tips);
            console.log('📋 Tips content after formatting:', formattedTips);
            this.tipsContent.innerHTML = formattedTips || 'Keep practicing to improve your interview skills.';
            console.log('✅ Tips populated');
        }
        
        // Render delivery analysis and model answer
        this.renderDeliveryAnalysis();
        this.loadModelAnswer();

        // Store this attempt in history
        const questionText = this.currentQuestionText;
        const answerText = this.answerTranscript.textContent;
        
        if (!this.answerHistory.has(questionText)) {
            this.answerHistory.set(questionText, []);
        }
        
        const isFirstAttempt = this.answerHistory.get(questionText).length === 0;
        this.answerHistory.get(questionText).push({
            answer: answerText,
            score: score,
            timestamp: new Date().toISOString(),
            delivery: isFirstAttempt ? (this.lastDeliveryMetrics || null) : null
        });
        
        // Show appropriate buttons based on current question
        if (this.currentQuestion >= this.totalQuestions) {
            // Last question - show completion options instead of next question
            if (this.nextQuestionBtn) {
                this.nextQuestionBtn.textContent = 'View Session Results';
                this.nextQuestionBtn.style.display = 'inline-flex';
                this.nextQuestionBtn.style.alignItems = 'center';
                this.nextQuestionBtn.style.justifyContent = 'center';
                this.nextQuestionBtn.style.lineHeight = 'normal';
            }
        } else {
            // Regular question - show next question button
            if (this.nextQuestionBtn) {
                this.nextQuestionBtn.textContent = 'Next Question';
                this.nextQuestionBtn.style.display = 'inline-flex';
                this.nextQuestionBtn.style.alignItems = 'center';
                this.nextQuestionBtn.style.justifyContent = 'center';
                this.nextQuestionBtn.style.lineHeight = 'normal';
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
        console.log('🔍 Parsing feedback text:', feedbackText);
        console.log('🔍 Full feedback text length:', feedbackText.length);
        
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
                    console.log(`✅ Found ${section}:`, sections[section].substring(0, 100) + '...');
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`❌ Section '${section}' not found in feedback`);
                // Look for any headers that might match
                const potentialHeaders = feedbackText.match(/\*\*[^*]+:\*\*/gi);
                if (potentialHeaders) {
                    console.log('🔍 Found these headers:', potentialHeaders);
                }
                // Also show the end of the feedback to see if tips are there but with different formatting
                const lastPart = feedbackText.slice(-300);
                console.log('🔍 Last 300 characters of feedback:', lastPart);
            }
        }
        
        return sections;
    }
    
    formatFeedbackText(feedbackText) {
        if (!feedbackText) return '';
        
        // Check language for different formatting needs
        const language = this.sessionConfig?.language;
        const isArabic = language === 'arabic';
        const isChinese = language === 'chinese';
        const isKorean = language === 'korean';
        const isCJK = isChinese || isKorean;
        
        // Convert various markdown and text formatting to HTML
        let formatted = feedbackText
            // Convert bullet points (• or - at start of line) to proper HTML list items
            .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
            // Collapse blank lines between consecutive list items so they don't get
            // split into separate paragraphs, which caused uneven spacing between bullets
            .replace(/<\/li>\n+(?=<li>)/g, '</li>')
            // Convert double newlines to paragraph breaks
            .replace(/\n\n/g, '</p><p>')
            // Convert single newlines to line breaks
            .replace(/\n/g, '<br>')
            // Convert bold markdown to HTML
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert italic markdown to HTML
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Language-specific list formatting
        if (formatted.includes('<li>')) {
            let listClass = '';
            let listDir = '';
            
            if (isArabic) {
                listClass = 'class="rtl-list"';
                listDir = 'dir="rtl"';
            } else if (isChinese) {
                listClass = 'class="chinese-list"';
            } else if (isKorean) {
                listClass = 'class="korean-list"';
            }
            
            formatted = formatted.replace(/(<li>.*<\/li>)/gs, `<ul ${listClass} ${listDir}>$1</ul>`);
            // Clean up any duplicate ul tags
            formatted = formatted.replace(/<\/ul>\s*<ul[^>]*>/g, '');
        }
        
        // Language-specific paragraph formatting
        let pClass = '';
        let pDir = '';
        
        if (isArabic) {
            pClass = 'class="rtl-text"';
            pDir = 'dir="rtl"';
        } else if (isChinese) {
            pClass = 'class="chinese-text"';
        } else if (isKorean) {
            pClass = 'class="korean-text"';
        }
        
        if (!formatted.includes('<p>') && !formatted.includes('<ul>')) {
            formatted = `<p ${pClass} ${pDir}>${formatted}</p>`;
        } else if (formatted.includes('<p>') && !formatted.startsWith('<p>')) {
            formatted = `<p ${pClass} ${pDir}>${formatted}</p>`;
        }
        
        // Apply language-specific direction to existing paragraphs
        if (isArabic && formatted.includes('<p>')) {
            formatted = formatted.replace(/<p>/g, `<p class="rtl-text" dir="rtl">`);
        } else if (isChinese && formatted.includes('<p>')) {
            formatted = formatted.replace(/<p>/g, `<p class="chinese-text">`);
        } else if (isKorean && formatted.includes('<p>')) {
            formatted = formatted.replace(/<p>/g, `<p class="korean-text">`);
        }
        
        return formatted;
    }
    
    enableNavigationButtons() {
        const feedbackActions = this.nextQuestionBtn?.closest('.feedback-actions');
        if (feedbackActions) feedbackActions.style.display = 'flex';
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
    }

    disableNavigationButtons() {
        const feedbackActions = this.nextQuestionBtn?.closest('.feedback-actions');
        if (feedbackActions) feedbackActions.style.display = 'none';
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

    async showSessionResults() {
        // Check remaining questions to show in the results
        let remainingQuestions = null;
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const remainingResponse = await fetch('/api/user/remaining-questions', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (remainingResponse.ok) {
                    const remainingData = await remainingResponse.json();
                    remainingQuestions = remainingData.remainingQuestions;
                }
            } catch (error) {
                console.error('Error checking remaining questions:', error);
            }
        }
        
        // Calculate session statistics
        const stats = this.calculateSessionStats();
        
        this.interviewPanel.innerHTML = `
            <div class="session-results">
                <h2>Practice Session Complete!</h2>
                <p>Here's how you performed across all ${this.totalQuestions} questions</p>
                ${remainingQuestions !== null ? `
                    <p style="color: #64748b; font-weight: 600; margin-top: 10px;">
                        You have ${remainingQuestions} questions remaining in your subscription
                    </p>
                ` : ''}
                
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0;">
                    <div class="stat-card" style="background: linear-gradient(135deg, #bae6fd 0%, #86efac 100%); color: #0f172a; padding: 20px; border-radius: 18px; text-align: center; box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);">
                        <h3>Average Score</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.averageScore}</div>
                        <p>${stats.scoreDescription}</p>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #fde68a 0%, #fdba74 100%); color: #7c2d12; padding: 20px; border-radius: 18px; text-align: center; box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);">
                        <h3>Best Score</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.bestScore}</div>
                        <p>Question ${stats.bestQuestionNumber}</p>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #e9d5ff 0%, #bae6fd 100%); color: #1f2937; padding: 20px; border-radius: 18px; text-align: center; box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);">
                        <h3>Total Attempts</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.totalAttempts}</div>
                        <p>Across all questions</p>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #86efac 0%, #fef9c3 100%); color: #14532d; padding: 20px; border-radius: 18px; text-align: center; box-shadow: 0 12px 20px rgba(15, 23, 42, 0.08);">
                        <h3>Improvement</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.improvement}</div>
                        <p>Last - First Question</p>
                        <small style="opacity: 0.9;">${stats.improvementDescription}</small>
                    </div>
                </div>
                
                ${stats.avgDelivery ? (() => {
                    const d = stats.avgDelivery;
                    const wpmLabel = !d.avgWpm ? '—' : d.avgWpm < 100 ? 'Too slow' : d.avgWpm > 170 ? 'Too fast' : d.avgWpm > 140 ? 'Good' : 'Ideal';
                    const wpmColor = !d.avgWpm ? '#94a3b8' : (d.avgWpm < 100 || d.avgWpm > 170) ? '#ef4444' : '#16a34a';
                    const pauseColor = d.avgPauses > 5 ? '#ef4444' : d.avgPauses > 2 ? '#d97706' : '#16a34a';
                    const fillerColor = d.avgFillers > 5 ? '#ef4444' : d.avgFillers > 2 ? '#d97706' : '#16a34a';
                    const durStr = d.avgDuration === 0 ? '—' : d.avgDuration < 30 ? 'Too short' : d.avgDuration > 180 ? 'Too long' : `${Math.floor(d.avgDuration/60)}:${String(d.avgDuration%60).padStart(2,'0')}`;
                    const card = (label, value, color, sub) =>
                        `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;text-align:center;">
                            <div style="font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:4px;">${label}</div>
                            <div style="font-size:1.15rem;font-weight:700;color:${color};">${value}</div>
                            ${sub ? `<div style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">${sub}</div>` : ''}
                        </div>`;
                    return `<div style="background:#f8fafc;border:1px solid rgba(196,181,253,0.5);padding:20px;border-radius:18px;margin:20px 0;box-shadow:0 12px 20px rgba(15,23,42,0.06);">
                        <h3 style="color:#0f172a;margin-top:0;margin-bottom:16px;">Average Delivery</h3>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;">
                            ${card('Avg Duration', durStr, '#475569')}
                            ${card('Avg Pace', d.avgWpm ? `${d.avgWpm} wpm` : '—', wpmColor, wpmLabel !== '—' ? wpmLabel : null)}
                            ${card('Avg Pauses', d.avgPauses, pauseColor, 'per question')}
                            ${card('Avg Fillers', d.avgFillers, fillerColor, 'per question')}
                            ${card('Confidence', d.confidenceLabel, d.confidenceColor)}
                        </div>
                    </div>`;
                })() : ''}

                <div class="insights-section" style="background: #f8fafc; border: 1px solid rgba(186, 230, 253, 0.7); padding: 20px; border-radius: 18px; margin: 20px 0; box-shadow: 0 12px 20px rgba(15, 23, 42, 0.06);">
                    <h3 style="color: #0f172a; margin-top: 0;">AI Insights</h3>
                    <div id="aiInsights" style="margin: 15px 0;">
                        <div style="text-align: center; color: #475569; padding: 20px;">
                            Generating personalized insights based on your performance...
                        </div>
                    </div>
                </div>
                
                <div class="control-buttons" style="display: flex; gap: 15px; justify-content: center; margin-top: 30px; flex-wrap: wrap; align-items: center;">
                    ${this.isGuest ? (() => {
                        const simAlreadyUsed = localStorage.getItem('guest_simulate_used') === '1';
                        if (simAlreadyUsed) {
                            return `
                        <a href="/signup" style="padding:14px 32px;background:#10b981;color:#fff;border-radius:12px;font-weight:700;text-decoration:none;font-size:1rem;display:inline-flex;align-items:center;">Create Free Account →</a>
                        <a href="/pricing" style="padding:14px 28px;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:12px;font-weight:600;text-decoration:none;font-size:0.95rem;display:inline-flex;align-items:center;">See Pricing</a>`;
                        }
                        return `
                        <button id="guestTrySimulator" style="padding:14px 32px;background:#10b981;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;">Try the Simulator (free)</button>
                        <a href="/pricing" style="padding:14px 28px;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:12px;font-weight:600;text-decoration:none;font-size:0.95rem;display:inline-flex;align-items:center;">Unlock Full Access &mdash; from £6.99</a>
                        <a href="/signup" style="display:block;width:100%;text-align:center;margin-top:4px;font-size:0.85rem;color:#64748b;text-decoration:underline;">or create a free account first</a>`;
                    })() : `
                        <button onclick="location.reload()" class="btn btn-primary" style="padding:12px 24px;font-size:16px;">Start New Session</button>
                        <a href="/dashboard" style="text-decoration:none;padding:12px 24px;font-size:16px;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:12px;font-weight:600;display:inline-flex;align-items:center;">
                            Back to Dashboard
                        </a>
                    `}
                </div>
            </div>

            <!-- CV Required Modal -->
            <div id="cvRequiredModal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>CV Required</h3>
                    </div>
                    <div class="modal-body">
                        <p>A CV/Resume is required to start a practice session.</p>
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
                        <p>A job description is required to start a practice session.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="practiceSession.closeJobDescriptionRequiredModal()">Got it</button>
                    </div>
                </div>
            </div>
        `;
        
        // Generate AI insights after displaying the results
        this.generateAIInsights();

        // Mark guest practice session as used
        if (this.isGuest) {
            this.markGuestPracticeUsed();

            // Wire "Try the Simulator" button
            const simBtn = document.getElementById('guestTrySimulator');
            if (simBtn) {
                simBtn.addEventListener('click', () => {
                    const cv = this.resumeContent || '';
                    const jd = this.jobDescriptionInput?.value.trim() || '';
                    const cfg = {
                        type: 'general', difficulty: 'mid', pressure: 'standard',
                        interviewers: '2', duration: '2', language: 'en',
                        skipIntro: true, accent: 'american', cv, jd,
                        additionalInfo: this.additionalInfoInput?.value.trim() || '',
                        fromPractice: true
                    };
                    localStorage.setItem('sim_launch', JSON.stringify(cfg));
                    window.location.href = '/simulator';
                });
            }
        }
    }

    calculateSessionStats() {
        const allScores = [];
        let totalAttempts = 0;
        const deliverySnapshots = [];

        // Process each question's attempts
        this.answerHistory.forEach((attempts, question) => {
            totalAttempts += attempts.length;
            const bestAttempt = attempts.reduce((best, current) =>
                current.score > best.score ? current : best
            );
            allScores.push(bestAttempt.score);

            // Collect delivery metrics from first attempt only
            const firstAttempt = attempts[0];
            if (firstAttempt?.delivery) {
                deliverySnapshots.push(firstAttempt.delivery);
            }
        });

        // Calculate score stats
        const averageScore = allScores.length > 0 ?
            Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10) / 10 : 0;
        const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
        const bestQuestionIndex = allScores.indexOf(bestScore);
        const firstScore = allScores[0] || 0;
        const lastScore = allScores[allScores.length - 1] || 0;
        const improvement = lastScore - firstScore;

        // Average delivery metrics across questions
        let avgDelivery = null;
        if (deliverySnapshots.length > 0) {
            const n = deliverySnapshots.length;
            const wpmValues = deliverySnapshots.filter(d => d.wpm).map(d => d.wpm);
            const avgWpm = wpmValues.length > 0 ? Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length) : null;
            const avgFillers = Math.round(deliverySnapshots.reduce((a, d) => a + (d.fillerCount || 0), 0) / n);
            const avgPauses = Math.round(deliverySnapshots.reduce((a, d) => a + (d.pauseCount || 0), 0) / n);
            const avgConfScore = deliverySnapshots.reduce((a, d) => a + (d.confidenceScore || 0), 0) / n;
            const confidenceLabel = avgConfScore > 0.10 ? 'Low' : avgConfScore < 0.03 ? 'High' : 'Medium';
            const confidenceColor = avgConfScore > 0.10 ? '#ef4444' : avgConfScore < 0.03 ? '#16a34a' : '#d97706';
            const avgDuration = Math.round(deliverySnapshots.reduce((a, d) => a + (d.duration || 0), 0) / n);

            avgDelivery = { avgWpm, avgFillers, avgPauses, confidenceLabel, confidenceColor, avgDuration };
        }

        return {
            averageScore,
            scoreDescription: this.getScoreDescription(averageScore),
            bestScore,
            bestQuestionNumber: bestQuestionIndex + 1,
            totalAttempts,
            improvement: improvement >= 0 ? `+${improvement.toFixed(1)}` : improvement.toFixed(1),
            improvementDescription: improvement > 0 ? 'Great progress!' : improvement < 0 ? 'Room to grow' : 'Consistent performance',
            avgDelivery
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
                                    <div style="margin: 15px 0; padding: 12px; background: #fff; border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 12px; box-shadow: 0 8px 14px rgba(15, 23, 42, 0.08);">
                                        <p style="margin: 0; color: #1f2937; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">• ${insight}</p>
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
                    <div style="text-align: center; color: #475569; padding: 20px;">
                        <p>Unable to generate personalized insights at the moment.</p>
                        <p style="font-size: 14px;">Your performance data has been saved successfully.</p>
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

    async loadNextQuestion() {
        // First increment the question number
        const nextQuestionNumber = this.currentQuestion + 1;
        
        // Check if we've reached the session limit
        if (nextQuestionNumber > this.totalQuestions) {
            console.log('Session limit reached - showing results');
            this.showSessionResults();
            return;
        }
        
        // Double-check remaining questions before loading next
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const remainingResponse = await fetch('/api/user/remaining-questions', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (remainingResponse.ok) {
                    const remainingData = await remainingResponse.json();
                    // Check if user has questions left for the NEXT question
                    if (remainingData.remainingQuestions <= 0) {
                        console.log('No questions remaining in subscription - ending session early');
                        this.showSessionResults();
                        return;
                    }
                    
                    // Also update totalQuestions if needed to prevent going over limit
                    const maxQuestions = this.currentQuestion + remainingData.remainingQuestions;
                    if (this.totalQuestions > maxQuestions) {
                        this.totalQuestions = maxQuestions;
                        console.log(`Adjusted session to end at ${this.totalQuestions} questions due to subscription limit`);
                        if (this.totalQuestionsSpan) {
                            this.totalQuestionsSpan.textContent = this.totalQuestions;
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking remaining questions:', error);
                // Continue anyway if we can't check
            }
        }
        
        // Only proceed if we still have questions to ask
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
            this.speechPauses = [];
            this.lastAnswerDuration = 0;
            
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
            const deliveryEl = document.getElementById('deliveryAnalysis');
            if (deliveryEl) { deliveryEl.style.display = 'none'; deliveryEl.innerHTML = ''; }
            const modelEl = document.getElementById('modelAnswerSection');
            if (modelEl) modelEl.style.display = 'none';
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
            this.voiceMode.className = 'answer-mode-btn active';
        }
        if (this.textMode) {
            this.textMode.className = 'answer-mode-btn';
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
            this.voiceMode.className = 'answer-mode-btn';
        }
        if (this.textMode) {
            this.textMode.className = 'answer-mode-btn active';
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

    checkProfileCompletion() {
        // Fields are always editable in the setup panel — no banner/notice needed
    }

    showProfileIncompleteNotice() {
        // Remove existing notice if present
        const existingNotice = document.getElementById('profile-incomplete-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        // Create notice banner
        const notice = document.createElement('div');
        notice.id = 'profile-incomplete-notice';
        notice.innerHTML = `
            <div class="profile-notice-content">
                <div class="profile-notice-icon">⚠️</div>
                <div class="profile-notice-text">
                    <strong>Complete your profile for better personalization!</strong>
                    <p>Role and experience fields below are now required. For the best interview experience, please complete your full profile.</p>
                </div>
                <div class="profile-notice-actions">
                    <button class="profile-notice-btn" onclick="practiceSession.showCompleteProfileModal(() => practiceSession.dismissProfileNotice())">Complete Profile</button>
                    <button class="profile-notice-dismiss" onclick="practiceSession.dismissProfileNotice()">✕</button>
                </div>
            </div>
        `;

        // Insert notice at the top of the practice header
        const practiceHeader = document.querySelector('.practice-header');
        if (practiceHeader) {
            practiceHeader.appendChild(notice);
        }
    }

    makeFieldsMandatory() {
        // Make role field mandatory and editable
        const roleInput = document.getElementById('currentRole');
        if (roleInput) {
            roleInput.removeAttribute('readonly');
            roleInput.required = true;
            roleInput.style.borderColor = '#e53e3e';
            roleInput.style.backgroundColor = '#fff5f5';
            
            // Add required indicator
            const roleLabel = roleInput.previousElementSibling;
            if (roleLabel && !roleLabel.textContent.includes('*')) {
                roleLabel.innerHTML = roleLabel.innerHTML.replace('Current Role:', 'Current Role: <span style="color: #e53e3e;">*</span>');
            }
        }

        // Make experience field mandatory and editable  
        const experienceInput = document.getElementById('experienceYears');
        if (experienceInput) {
            experienceInput.removeAttribute('readonly');
            experienceInput.required = true;
            experienceInput.style.borderColor = '#e53e3e';
            experienceInput.style.backgroundColor = '#fff5f5';
            experienceInput.type = 'number';
            experienceInput.min = '0';
            experienceInput.max = '50';
            experienceInput.placeholder = 'e.g., 3';
            
            // Add required indicator
            const experienceLabel = experienceInput.previousElementSibling;
            if (experienceLabel && !experienceLabel.textContent.includes('*')) {
                experienceLabel.innerHTML = experienceLabel.innerHTML.replace('Years of Experience:', 'Years of Experience: <span style="color: #e53e3e;">*</span>');
            }
        }
    }

    dismissProfileNotice() {
        const notice = document.getElementById('profile-incomplete-notice');
        if (notice) {
            notice.style.display = 'none';
        }
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

    async checkGuestAccess(mode) {
        try {
            const response = await fetch(`/api/check-test-access?mode=${mode}`, {
                headers: { 'X-Guest-ID': this.guestId }
            });
            if (!response.ok) return false;
            const data = await response.json();
            return data.hasAccess;
        } catch {
            return false;
        }
    }

    async markGuestPracticeUsed() {
        localStorage.setItem('guest_practice_used', '1');
        try {
            await fetch('/api/mark-test-used', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestId: this.guestId, mode: 'practice' })
            });
        } catch { /* non-fatal */ }
    }

    showGuestAlreadyUsedMessage(container) {
        const target = document.querySelector('.page-content') || container;
        if (!target) return;
        if (target.style.display === 'none') target.style.display = 'block';
        target.innerHTML = `
            <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;padding:40px 16px;">
                <div style="max-width:520px;width:100%;text-align:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:52px 44px;backdrop-filter:blur(20px);box-shadow:0 24px 64px rgba(0,0,0,0.4);">
                    <div style="width:64px;height:64px;margin:0 auto 24px;background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;display:flex;align-items:center;justify-content:center;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <h2 style="font-size:1.6rem;font-weight:700;color:#fff;margin:0 0 14px;line-height:1.3;">You've used your free practice session</h2>
                    <p style="color:rgba(255,255,255,0.6);margin:0 0 32px;line-height:1.7;font-size:1rem;">Create a free account to also unlock the simulator, or get full access with a one-time payment.</p>
                    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <a href="/signup" style="padding:14px 32px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:12px;font-weight:600;text-decoration:none;font-size:0.95rem;">Create Free Account</a>
                        <a href="/pricing" style="padding:14px 32px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);border:1px solid rgba(255,255,255,0.12);border-radius:12px;font-weight:600;text-decoration:none;font-size:0.95rem;">See Pricing</a>
                    </div>
                </div>
            </div>
        `;
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
                border-radius: 12px;
                font-weight: 600;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 140px;
            }

            .access-denied-btn.primary {
                background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                color: white;
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
            }

            .access-denied-btn.primary:hover {
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
            }

            .access-denied-btn.secondary {
                background: #f8fafc;
                color: #475569;
                border: 2px solid #e2e8f0;
            }

            .access-denied-btn.secondary:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
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

    // Clean up when navigating away from this page
    cleanup() {
        // Remove page-specific styles and dark-mode class
        const styles = document.getElementById('practice-page-styles');
        if (styles) styles.remove();
        document.documentElement.classList.remove('practice-dark');

        // Clean up any timers or event listeners
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}

// Export the class for use by the router
window.PracticePage = PracticePage;
