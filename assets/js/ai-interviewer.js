// AI Interviewer Client-Side Logic

class AIInterviewer {
    constructor() {
        this.socket = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.currentQuestion = 1;
        this.totalQuestions = 5;
        this.sessionId = null;
        this.resumeContent = '';
        this.jobDescription = '';
        this.answerStartTime = null;
        this.timerInterval = null;
        this.answerHistory = new Map(); // Track answers by question
        this.currentQuestionText = '';
        this.previousQuestions = []; // Track all questions asked in this session
        this.sessionConfig = null; // Store session configuration
        
        this.initializeElements();
        this.attachEventListeners();
        this.connectWebSocket();
        this.loadUserProfile();
    }

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
        // Removed: this.companyIndustrySelect = document.getElementById('companyIndustry'); (no longer needed)
        this.companyNameInput = document.getElementById('companyName');
        this.additionalInfoInput = document.getElementById('additionalInfo');
        
        // Job role, company, and industry detection elements
        this.detectedRoleInput = document.getElementById('detectedRole');
        this.detectedCompanyInput = document.getElementById('detectedCompany');
        this.detectedIndustryInput = document.getElementById('detectedIndustry');
        this.roleDetectionStatus = document.getElementById('roleDetectionStatus');
        
        // Setup elements
        // this.cvContent = document.getElementById('cvContent'); // Removed - no longer showing content
        this.cvStatus = document.getElementById('cvStatus');
        this.cvStatusText = document.getElementById('cvStatusText');
        this.refreshCvBtn = document.getElementById('refreshCv');
        this.resumeFileInput = document.getElementById('resumeFileInput');
        this.fileUploadStatus = document.getElementById('fileUploadStatus');
        this.jobDescriptionInput = document.getElementById('jobDescription');
        this.startPracticeBtn = document.getElementById('startPractice');
        
        // Interview elements
        this.questionText = document.getElementById('questionText');
        this.answerTranscript = document.getElementById('answerTranscript');
        this.startRecordingBtn = document.getElementById('startRecording');
        this.stopRecordingBtn = document.getElementById('stopRecording');
        this.getFeedbackBtn = document.getElementById('getFeedback');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        
        // Answer mode toggle elements
        this.voiceModeBtn = document.getElementById('voiceMode');
        this.textModeBtn = document.getElementById('textMode');
        this.voiceAnswerSection = document.getElementById('voiceAnswerSection');
        this.textAnswerSection = document.getElementById('textAnswerSection');
        this.textAnswer = document.getElementById('textAnswer');
        this.submitTextAnswerBtn = document.getElementById('submitTextAnswer');
        this.clearTextAnswerBtn = document.getElementById('clearTextAnswer');
        
        // Feedback elements
        this.feedbackSpinner = document.getElementById('feedbackSpinner');
        this.feedbackContent = document.getElementById('feedbackContent');
        this.scoreNumber = document.getElementById('scoreNumber');
        this.scoreComparison = document.getElementById('scoreComparison');
        this.strengthsContent = document.getElementById('strengthsContent');
        this.improvementsContent = document.getElementById('improvementsContent');
        this.betterResponseContent = document.getElementById('betterResponseContent');
        this.tipsContent = document.getElementById('tipsContent');
        this.nextQuestionBtn = document.getElementById('nextQuestion');
        this.tryAgainBtn = document.getElementById('tryAgain');
        
        // Progress elements
        this.questionCounter = document.getElementById('questionCounter');
        this.currentQuestionSpan = document.getElementById('currentQuestion');
        this.totalQuestionsSpan = document.getElementById('totalQuestions');
        
        // Timer elements
        this.timer = document.getElementById('timer');
        this.timerValue = document.getElementById('timerValue');
    }

    attachEventListeners() {
        this.refreshCvBtn.addEventListener('click', () => this.loadCvFromProfile());
        this.resumeFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        // this.cvContent.addEventListener('input', () => this.updateResumeContent()); // Removed - no longer showing content
        this.jobDescriptionInput.addEventListener('input', () => this.onJobDescriptionChange());
        this.startPracticeBtn.addEventListener('click', () => this.startPracticeSession());
        this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        this.getFeedbackBtn.addEventListener('click', () => this.requestFeedback());
        this.nextQuestionBtn.addEventListener('click', () => this.handleNextQuestionClick());
        this.tryAgainBtn.addEventListener('click', () => this.tryQuestionAgain());
        
        // Answer mode toggle event listeners
        this.voiceModeBtn.addEventListener('click', () => this.switchToVoiceMode());
        this.textModeBtn.addEventListener('click', () => this.switchToTextMode());
        this.submitTextAnswerBtn.addEventListener('click', () => this.submitTextAnswer());
        this.clearTextAnswerBtn.addEventListener('click', () => this.clearTextAnswer());
    }

    connectWebSocket() {
        // Get auth token for socket connection
        const token = localStorage.getItem('authToken');
        
        this.socket = io({
            auth: {
                token: token
            }
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.sessionId = this.socket.id;
        });

        this.socket.on('aiQuestion', (data) => {
            this.displayQuestion(data.question);
        });

        this.socket.on('transcriptionUpdate', (data) => {
            this.updateTranscript(data.text, data.isFinal);
        });

        this.socket.on('feedbackUpdate', (data) => {
            this.updateFeedback(data.chunk, data.isFinal);
        });
        
        this.socket.on('feedbackComplete', (data) => {
            console.log('✅ Received feedbackComplete event:', {
                hasFeedback: !!data.feedback,
                feedbackLength: data.feedback?.length || 0,
                score: data.score,
                hasComparison: !!data.comparison
            });
            this.displayFeedback(data);
        });
        
        this.socket.on('connect', () => {
            console.log('Socket connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            
            // Clear timeout if there's an error with question generation
            if (this.questionRequestTimeout) {
                clearTimeout(this.questionRequestTimeout);
                this.questionRequestTimeout = null;
            }
            
            // If the question is still in loading state, provide fallback
            if (this.questionText && this.questionText.textContent === 'Preparing your personalized question...') {
                this.questionText.textContent = 'Unable to generate personalized question. Please try refreshing the page.';
            }
            
            this.showError(error.message || 'Connection error occurred');
        });
    }

    async loadUserProfile() {
        try {
            const response = await authManager.apiRequest('/api/auth/profile');
            if (response.ok) {
                const data = await response.json();
                const user = data.user;
                
                // Populate profile fields
                this.currentRoleInput.value = user.role || 'Not specified';
                this.experienceYearsInput.value = this.formatExperienceYears(user.experience_years);
                
                console.log('User profile loaded:', user);
            } else {
                console.error('Failed to load user profile');
                this.currentRoleInput.value = 'Profile not available';
                this.experienceYearsInput.value = 'Profile not available';
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.currentRoleInput.value = 'Error loading profile';
            this.experienceYearsInput.value = 'Error loading profile';
        }
    }

    formatExperienceYears(years) {
        if (years === null || years === undefined) return 'Not specified';
        if (years === 0) return 'Fresh Graduate';
        if (years === 1) return '1 year';
        if (years >= 6 && years < 10) return '6-10 years';
        if (years >= 10) return '10+ years';
        return `${years} years`;
    }

    cleanDetectedValue(value, fieldType) {
        // Filter out literal placeholder values that might have been set incorrectly
        const literalValues = ['role', 'company', 'industry', 'Industry', 'Role', 'Company'];
        if (!value || literalValues.includes(value)) {
            console.log(`DEBUG: Filtering out literal value "${value}" for ${fieldType}`);
            return '';
        }
        return value;
    }

    onJobDescriptionChange() {
        const jobDescriptionText = this.jobDescriptionInput.value.trim();
        
        // Clear any existing timeout to debounce the detection
        if (this.detectionTimeout) {
            clearTimeout(this.detectionTimeout);
        }
        
        if (jobDescriptionText.length > 100) {
            // Auto-detect after user stops typing (debounce)
            this.detectionTimeout = setTimeout(() => {
                this.detectJobInfo();
            }, 1500); // Wait 1.5 seconds after user stops typing
        } else if (jobDescriptionText.length > 50) {
            this.roleDetectionStatus.textContent = 'Keep typing for automatic detection...';
            this.roleDetectionStatus.style.color = '#667eea';
        } else {
            // Clear detection when content is minimal
            this.detectedRoleInput.value = '';
            this.detectedCompanyInput.value = '';
            this.detectedIndustryInput.value = '';
            this.roleDetectionStatus.textContent = 'Waiting for job description...';
            this.roleDetectionStatus.style.color = '#666';
        }
    }

    async detectJobInfo() {
        const jobDescriptionText = this.jobDescriptionInput.value.trim();
        
        if (!jobDescriptionText || jobDescriptionText.length < 100) {
            return;
        }

        // Update UI to show processing
        this.roleDetectionStatus.textContent = 'Detecting role, company, and industry...';
        this.roleDetectionStatus.style.color = '#f39c12';

        try {
            const response = await fetch('/api/ai/detect-job-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    jobDescription: jobDescriptionText
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Debug log to see what was detected
                console.log('DEBUG: AI Detection result:', result);
                
                // Display detected information
                this.detectedRoleInput.value = result.detectedRole || '';
                this.detectedCompanyInput.value = result.detectedCompany || '';
                this.detectedIndustryInput.value = result.detectedIndustry || '';
                
                // Debug log to confirm values were set
                console.log('DEBUG: Set input values to:', {
                    role: this.detectedRoleInput.value,
                    company: this.detectedCompanyInput.value,
                    industry: this.detectedIndustryInput.value
                });
                
                let statusText = 'Detected: ';
                const detected = [];
                if (result.detectedRole) detected.push(`Role: ${result.detectedRole}`);
                if (result.detectedCompany) detected.push(`Company: ${result.detectedCompany}`);
                if (result.detectedIndustry) detected.push(`Industry: ${result.detectedIndustry}`);
                
                if (detected.length > 0) {
                    this.roleDetectionStatus.textContent = statusText + detected.join(', ');
                    this.roleDetectionStatus.style.color = '#27ae60'; // Green for success
                } else {
                    this.roleDetectionStatus.textContent = 'Could not detect role, company, or industry automatically';
                    this.roleDetectionStatus.style.color = '#f39c12'; // Orange for partial success/warning
                }
            } else {
                throw new Error(result.error || 'Failed to detect job information');
            }
        } catch (error) {
            console.error('Job info detection error:', error);
            this.roleDetectionStatus.textContent = 'Could not detect information automatically';
            this.roleDetectionStatus.style.color = '#e74c3c';
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const allowedExtensions = ['.pdf', '.txt', '.docx'];
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
            this.fileUploadStatus.textContent = '✗ Please upload PDF, TXT, or DOCX files only';
            this.fileUploadStatus.style.color = '#e74c3c';
            this.resumeFileInput.value = ''; // Clear the input
            return;
        }

        // Check if there's existing resume content and confirm replacement
        if (this.resumeContent && this.resumeContent.trim()) {
            const confirmReplace = confirm(`You already have a resume in your profile. Uploading "${file.name}" will replace your current resume. Do you want to continue?`);
            if (!confirmReplace) {
                this.resumeFileInput.value = ''; // Clear the input
                return;
            }
        }

        // Show upload progress
        this.fileUploadStatus.textContent = '📤 Uploading and parsing resume...';
        this.fileUploadStatus.style.color = '#f39c12';

        try {
            const formData = new FormData();
            formData.append('resume', file);

            const response = await fetch('/api/upload-resume', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Update the resume content with parsed text
                this.resumeContent = result.content;
                // this.cvContent.value = result.content; // Removed - no longer showing content
                
                // Update status displays
                this.fileUploadStatus.textContent = `✓ ${result.filename} uploaded successfully`;
                this.fileUploadStatus.style.color = '#27ae60';
                
                this.cvStatusText.textContent = `✓ Resume saved to profile: ${result.filename}`;
                this.cvStatusText.className = 'status-text loaded';
                
                console.log('Resume uploaded and saved:', result.message);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('File upload error:', error);
            this.fileUploadStatus.textContent = '✗ Upload failed: ' + error.message;
            this.fileUploadStatus.style.color = '#e74c3c';
        }

        // Clear the file input so the same file can be uploaded again if needed
        this.resumeFileInput.value = '';
    }

    async loadCvFromProfile() {
        this.cvStatusText.textContent = 'Loading CV from profile...';
        this.cvStatusText.className = 'status-text';
        
        try {
            const response = await authManager.apiRequest('/api/resume');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.content) {
                    this.resumeContent = data.content;
                    // this.cvContent.value = data.content; // Removed - no longer showing content
                    
                    const statusText = data.filename 
                        ? `✓ CV loaded: ${data.filename}${data.uploadedAt ? ' (uploaded: ' + new Date(data.uploadedAt).toLocaleDateString() + ')' : ''}`
                        : '✓ CV loaded successfully';
                    
                    this.cvStatusText.textContent = statusText;
                    this.cvStatusText.className = 'status-text loaded';
                } else {
                    throw new Error('No CV found in profile');
                }
            } else {
                throw new Error('Failed to load CV');
            }
        } catch (error) {
            console.error('CV loading error:', error);
            this.cvStatusText.textContent = '✗ Failed to load CV from profile';
            this.cvStatusText.className = 'status-text error';
        }
    }
    
    updateResumeContent() {
        // this.resumeContent = this.cvContent.value.trim(); // Removed - no longer showing content
        
        if (this.resumeContent) {
            this.cvStatusText.textContent = '✓ CV content updated (session only)';
            this.cvStatusText.className = 'status-text loaded';
        } else {
            this.cvStatusText.textContent = 'CV content is empty';
            this.cvStatusText.className = 'status-text error';
        }
    }

    async startPracticeSession() {
        console.log('🚀 startPracticeSession called');
        
        // Reset session state for new practice
        this.previousQuestions = []; // Clear previous questions from any prior session
        this.currentQuestion = 1; // Reset to first question
        this.answerHistory.clear(); // Clear answer history
        
        this.jobDescription = this.jobDescriptionInput.value.trim();
        // Resume content is already loaded from profile or file upload
        
        console.log('📋 Validation check:', {
            hasResume: !!this.resumeContent,
            hasJobDescription: !!this.jobDescription,
            resumeLength: this.resumeContent.length,
            jobDescLength: this.jobDescription.length
        });
        
        if (!this.resumeContent || !this.jobDescription) {
            console.error('❌ Validation failed - missing required content');
            alert('Please provide your CV content and enter a job description');
            return;
        }

        // Hide setup panel, show interview panel
        this.setupPanel.style.display = 'none';
        this.interviewPanel.style.display = 'block';
        this.questionCounter.style.display = 'block';

        // Get user info from authenticated user or localStorage
        let userEmail, userName;
        
        const authToken = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (authToken && user.email) {
            // User is authenticated
            userEmail = user.email;
            userName = user.name || '';
        } else {
            // Fall back to localStorage or prompt
            userEmail = localStorage.getItem('userEmail') || prompt('Please enter your email to track your progress:');
            userName = localStorage.getItem('userName') || '';
            
            if (userEmail) {
                localStorage.setItem('userEmail', userEmail);
            }
        }
        
        // Debug: Check what values are in the input fields
        console.log('DEBUG: Input field values:', {
            detectedRole: this.detectedRoleInput.value,
            detectedCompany: this.detectedCompanyInput.value,
            detectedIndustry: this.detectedIndustryInput ? this.detectedIndustryInput.value : 'N/A'
        });
        
        // Gather configuration settings
        const sessionConfig = {
            // Basic content
            resume: this.resumeContent,
            jobDescription: this.jobDescription,
            
            // User profile info
            currentRole: this.currentRoleInput.value,
            experienceYears: this.experienceYearsInput.value,
            
            // AI-detected information - filter out literal placeholder values
            detectedRole: this.cleanDetectedValue(this.detectedRoleInput.value.trim(), 'role'),
            detectedCompany: this.cleanDetectedValue(this.detectedCompanyInput.value.trim(), 'company'),
            detectedIndustry: this.detectedIndustryInput ? this.cleanDetectedValue(this.detectedIndustryInput.value.trim(), 'industry') : '',
            
            // Interview configuration
            difficultyLevel: this.difficultyLevelSelect.value,
            questionType: this.questionTypeSelect.value,
            language: this.languageSelect.value,
            
            // Company information  
            companyName: this.companyNameInput ? this.companyNameInput.value.trim() : '',
            companyIndustry: '', // Removed manual selection - using AI-detected industry instead
            additionalInfo: this.additionalInfoInput.value.trim(),
            
            // User identification
            userEmail: userEmail,
            userName: userName,
            
            // Session settings
            questionNumber: this.currentQuestion,
            totalQuestions: this.totalQuestions,
            previousQuestions: this.previousQuestions // Include previous questions (empty on first question)
        };
        
        // Store session configuration for later use (like feedback)
        this.sessionConfig = sessionConfig;
        
        console.log('🚀 Starting practice session with config:', sessionConfig);
        console.log('🔐 Auth token present:', !!authToken);
        console.log('👤 User authenticated:', !!user.email);
        
        // Set up timeout for question request
        const questionTimeout = setTimeout(() => {
            console.error('⏰ Question request timeout - no response received in 30 seconds');
            this.questionText.textContent = 'Unable to generate question. Please try refreshing the page.';
            this.showError('Question generation timed out. Please try again.');
        }, 30000);
        
        // Store timeout ID to clear it if we get a response
        this.questionRequestTimeout = questionTimeout;
        
        // Request first question with full configuration
        console.log('📤 Emitting requestAIQuestion event...');
        this.socket.emit('requestAIQuestion', sessionConfig);
    }

    displayQuestion(question) {
        console.log('✅ Received AI question:', question);
        
        // Clear the timeout since we got a response
        if (this.questionRequestTimeout) {
            clearTimeout(this.questionRequestTimeout);
            this.questionRequestTimeout = null;
        }
        
        // Remove surrounding quotes if present
        const cleanedQuestion = question.replace(/^["']|["']$/g, '').trim();
        
        this.questionText.textContent = cleanedQuestion;
        this.currentQuestionText = cleanedQuestion;
        
        // Store this question in the previous questions array (use cleaned version)
        if (!this.previousQuestions.includes(cleanedQuestion)) {
            this.previousQuestions.push(cleanedQuestion);
        }
        
        this.currentQuestionSpan.textContent = this.currentQuestion;
        this.answerTranscript.innerHTML = '<p style="color: #999;">Choose how you\'d like to answer...</p>';
        this.feedbackSection.style.display = 'none';
        this.getFeedbackBtn.style.display = 'none';
        this.startRecordingBtn.style.display = 'inline-block';
        
        // Reset both answer modes
        this.textAnswer.value = '';
        this.switchToVoiceMode(); // Default to voice mode
        
        // Enable submit button for new question
        this.enableSubmitButton();
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Initialize Web Audio API for real-time streaming
            const audioContext = new AudioContext({ sampleRate: 16000 });
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            processor.onaudioprocess = (e) => {
                // Continue streaming audio during recording OR finalization mode
                if (this.isRecording || this.isFinalizingTranscript) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const audioData = new Int16Array(inputData.length);
                    
                    for (let i = 0; i < inputData.length; i++) {
                        audioData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                    }
                    
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
            
            // Start recording
            this.isRecording = true;
            this.socket.emit('startAIInterview', {
                sessionId: this.sessionId,
                currentQuestion: this.questionText.textContent
            });
            
            // Update UI
            this.startRecordingBtn.style.display = 'none';
            this.stopRecordingBtn.style.display = 'inline-block';
            this.recordingIndicator.classList.add('active');
            this.answerTranscript.innerHTML = '';
            
            // Start timer
            this.startTimer();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Could not access microphone');
        }
    }

    stopRecording() {
        // Immediately stop the recording flag and update UI
        this.isRecording = false;
        this.stopRecordingBtn.style.display = 'none';
        this.recordingIndicator.classList.remove('active');
        this.stopTimer();
        
        // Show processing message
        this.answerTranscript.innerHTML = '<p style="color: #f39c12; font-style: italic;">Finalizing transcript...</p>';
        
        // Enter "finalizing" mode - keep audio streaming but don't record new audio
        this.isFinalizingTranscript = true;
        
        // Continue processing any remaining audio in the background
        // The server will continue to receive and process audio chunks
        
        // Start a smart finalization process
        this.startSmartFinalization();
    }
    
    startSmartFinalization() {
        let silenceTime = 0;
        let lastTranscriptUpdate = Date.now();
        const silenceCheckInterval = 100; // Check every 100ms
        const maxFinalizationTime = 8000; // Maximum 8 seconds to finalize
        const requiredSilenceTime = 2000; // 2 seconds of silence to auto-finalize
        
        // Track when we last received a transcript update
        this.lastTranscriptTime = Date.now();
        
        const finalizationChecker = setInterval(() => {
            const now = Date.now();
            const timeSinceLastTranscript = now - this.lastTranscriptTime;
            const totalFinalizationTime = now - lastTranscriptUpdate;
            
            // If we've been finalizing for too long, force completion
            if (totalFinalizationTime > maxFinalizationTime) {
                console.log('Force completing transcription after max time');
                clearInterval(finalizationChecker);
                this.completeTranscription();
                return;
            }
            
            // If we haven't received transcript updates for a while, complete
            if (timeSinceLastTranscript > requiredSilenceTime) {
                console.log('Completing transcription after silence period');
                clearInterval(finalizationChecker);
                this.completeTranscription();
                return;
            }
            
            // Update the UI to show progress
            const dots = Math.floor((totalFinalizationTime / 500) % 4);
            const dotString = '.'.repeat(dots);
            this.answerTranscript.innerHTML = `<p style="color: #f39c12; font-style: italic;">Finalizing transcript${dotString}</p>`;
            
        }, silenceCheckInterval);
        
        // Store the interval so we can clear it if needed
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
        
        // If transcript is still showing processing message, show a default
        if (this.answerTranscript.innerHTML.includes('Processing final transcript...')) {
            this.answerTranscript.innerHTML = '<p>Recording completed. Generating feedback...</p>';
        }
        
        // Automatically request feedback instead of just showing the button
        setTimeout(() => {
            this.requestFeedback();
        }, 100); // Small delay to ensure UI is updated
    }

    updateTranscript(text, isFinal) {
        // Update the last transcript time for finalization logic
        this.lastTranscriptTime = Date.now();
        
        if (isFinal) {
            // Final transcript - replace content and auto-generate feedback
            this.answerTranscript.innerHTML = `<p>${text}</p>`;
            
            // If recording has stopped and we get the final transcript, automatically request feedback
            if (!this.isRecording) {
                // Small delay to ensure transcript is displayed, then auto-request feedback
                setTimeout(() => {
                    this.requestFeedback();
                }, 500);
            }
        } else {
            // Skip partial updates if we're showing finalization message
            if (this.answerTranscript.innerHTML.includes('Finalizing transcript')) {
                return;
            }
            
            // During normal recording, show partial transcripts
            if (this.isRecording && !this.isFinalizingTranscript) {
                const paragraphs = this.answerTranscript.querySelectorAll('p');
                const lastP = paragraphs[paragraphs.length - 1];
                
                if (lastP && !lastP.classList.contains('final')) {
                    lastP.textContent = text;
                } else {
                    const newP = document.createElement('p');
                    newP.textContent = text;
                    this.answerTranscript.appendChild(newP);
                }
            }
        }
        
        // Auto-scroll to bottom
        this.answerTranscript.scrollTop = this.answerTranscript.scrollHeight;
    }

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
        
        const answerText = this.answerTranscript.textContent;
        const questionText = this.currentQuestionText;
        
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
                
                this.nextQuestionBtn.style.display = 'inline-block';
                this.tryAgainBtn.style.display = 'inline-block';
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
        const answerMode = this.voiceAnswerSection.style.display !== 'none' ? 'voice' : 'text';
        const answerDuration = this.answerStartTime ? Math.floor((Date.now() - this.answerStartTime) / 1000) : 0;
        
        this.socket.emit('requestFeedback', {
            sessionId: this.sessionId,
            question: questionText,
            answer: answerText,
            resume: this.resumeContent,
            jobDescription: this.jobDescription,
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
            questionNumber: this.currentQuestion
        });
        
        console.log('✅ requestFeedback event emitted successfully');
    }

    updateFeedback(chunk, isFinal) {
        // For now, we'll wait for the complete feedback
        // The streaming is still happening on the backend but we'll display it all at once
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
        this.feedbackSection.style.display = 'block';
        this.feedbackSpinner.style.display = 'none';
        this.feedbackContent.style.display = 'block';
        this.feedbackContent.style.visibility = 'visible';
        this.feedbackContent.style.opacity = '1';
        
        // Force override any conflicting styles
        this.feedbackContent.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important;');
        
        console.log('🎨 UI elements updated:', {
            spinnerNewDisplay: this.feedbackSpinner?.style.display,
            contentNewDisplay: this.feedbackContent?.style.display,
            feedbackSectionNewDisplay: this.feedbackSection?.style.display
        });
        
        // Display score with animation
        this.animateScore(score);
        
        // Display comparison if available
        if (comparison) {
            this.scoreComparison.innerHTML = comparison;
            this.scoreComparison.className = comparison.includes('improved') ? 'score-comparison score-improvement' : 
                                           comparison.includes('lower') ? 'score-comparison score-decline' :
                                           'score-comparison';
        } else {
            this.scoreComparison.innerHTML = 'First attempt at this question';
            this.scoreComparison.className = 'score-comparison';
        }
        
        // Parse the feedback sections
        const sections = this.parseFeedback(feedback);
        
        console.log('🎨 Parsed feedback sections:', {
            hasStrengths: !!sections.strengths,
            hasImprovements: !!sections.improvements,
            hasBetterResponse: !!sections.betterResponse,
            hasTips: !!sections.tips,
            strengthsLength: sections.strengths?.length || 0,
            improvementsLength: sections.improvements?.length || 0
        });
        
        // Check if all required DOM elements exist
        console.log('🎨 DOM elements check:', {
            strengthsContent: !!this.strengthsContent,
            improvementsContent: !!this.improvementsContent,
            betterResponseContent: !!this.betterResponseContent,
            tipsContent: !!this.tipsContent,
            scoreNumber: !!this.scoreNumber,
            scoreComparison: !!this.scoreComparison
        });
        
        // Populate each section
        if (this.strengthsContent) {
            this.strengthsContent.innerHTML = sections.strengths || 'No specific strengths identified.';
            console.log('✅ Strengths populated');
        } else {
            console.error('❌ strengthsContent element not found');
        }
        
        if (this.improvementsContent) {
            // Ensure we always have improvement content
            if (!sections.improvements || sections.improvements.trim() === '') {
                sections.improvements = `• Provide more specific examples from your experience<br>
                • Structure your answer using the STAR method (Situation, Task, Action, Result)<br>
                • Elaborate on key points with additional detail<br>
                • Consider how your answer relates to the specific role requirements`;
                console.log('⚠️ Using fallback improvements content');
            }
            this.improvementsContent.innerHTML = sections.improvements;
            console.log('✅ Improvements populated');
        } else {
            console.error('❌ improvementsContent element not found');
        }
        
        if (this.betterResponseContent) {
            this.betterResponseContent.innerHTML = sections.betterResponse || 'Your response was appropriate.';
            console.log('✅ Better response populated');
        } else {
            console.error('❌ betterResponseContent element not found');
        }
        
        if (this.tipsContent) {
            this.tipsContent.innerHTML = sections.tips || 'Keep practicing to improve your interview skills.';
            console.log('✅ Tips populated');
        } else {
            console.error('❌ tipsContent element not found');
        }
        
        console.log('🎨 Content populated into DOM elements:', {
            strengthsContentExists: !!this.strengthsContent,
            strengthsContentHTML: this.strengthsContent?.innerHTML?.substring(0, 100) + '...',
            improvementsContentExists: !!this.improvementsContent,
            improvementsContentHTML: this.improvementsContent?.innerHTML?.substring(0, 100) + '...'
        });
        
        // Final check - is everything still visible after populating content?
        setTimeout(() => {
            const feedbackRect = this.feedbackSection?.getBoundingClientRect();
            const contentRect = this.feedbackContent?.getBoundingClientRect();
            
            console.log('🎨 Final visibility check (after 100ms):', {
                feedbackSectionDisplay: this.feedbackSection?.style.display,
                feedbackContentDisplay: this.feedbackContent?.style.display,
                feedbackSectionVisible: this.feedbackSection?.offsetHeight > 0,
                feedbackContentVisible: this.feedbackContent?.offsetHeight > 0,
                feedbackSectionRect: {
                    top: feedbackRect?.top,
                    bottom: feedbackRect?.bottom,
                    height: feedbackRect?.height,
                    width: feedbackRect?.width
                },
                feedbackContentRect: {
                    top: contentRect?.top,
                    bottom: contentRect?.bottom,
                    height: contentRect?.height,
                    width: contentRect?.width
                },
                windowHeight: window.innerHeight,
                scrollY: window.scrollY,
                isInViewport: feedbackRect && feedbackRect.top >= 0 && feedbackRect.bottom <= window.innerHeight
            });
            
            console.log('🔍 DOM structure debug:', {
                feedbackContentParent: this.feedbackContent?.parentElement?.id,
                feedbackContentHTML: this.feedbackContent?.outerHTML?.substring(0, 200) + '...',
                scoreNumberValue: this.scoreNumber?.textContent,
                strengthsHTML: this.strengthsContent?.innerHTML?.substring(0, 100) + '...'
            });
            
            // Force scroll to feedback section
            console.log('🎯 Attempting to scroll to feedback section...');
            this.feedbackSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
        
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
            this.nextQuestionBtn.textContent = '📊 View Session Results';
            this.nextQuestionBtn.style.display = 'inline-block';
        } else {
            // Regular question - show next question button
            this.nextQuestionBtn.textContent = 'Next Question';
            this.nextQuestionBtn.style.display = 'inline-block';
        }
        
        // Check if retry is allowed (max 1 retry = 2 total attempts)
        const attempts = this.answerHistory.get(questionText) || [];
        if (attempts.length >= 2) {
            // Already retried once, don't show retry button and disable submit button
            this.tryAgainBtn.style.display = 'none';
            this.disableSubmitButton();
        } else {
            // First attempt, show retry button and enable submit button
            this.tryAgainBtn.style.display = 'inline-block';
            this.tryAgainBtn.textContent = 'Try This Question Again';
            this.enableSubmitButton();
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
    
    animateScore(targetScore) {
        let currentScore = 0;
        const increment = targetScore / 20; // 20 steps for smooth animation
        
        const timer = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(timer);
            }
            this.scoreNumber.textContent = Math.round(currentScore * 10) / 10;
        }, 50);
    }
    
    parseFeedback(feedbackText) {
        console.log('🔍 Parsing feedback text:', feedbackText);
        
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
                /\*\*Additional Tips:\*\*([\s\S]*?)(?=\*\*|$)/i,
                /\*\*General Tips:\*\*([\s\S]*?)(?=\*\*|$)/i
            ]
        };
        
        // Try each pattern for each section
        for (const [sectionName, sectionPatterns] of Object.entries(patterns)) {
            for (const pattern of sectionPatterns) {
                const match = feedbackText.match(pattern);
                if (match && match[1]) {
                    sections[sectionName] = this.formatSection(match[1]);
                    console.log(`✅ Found ${sectionName}:`, sections[sectionName].substring(0, 50) + '...');
                    break; // Stop trying patterns once we find a match
                }
            }
            
            // If still no match, try to find content by splitting and looking for keywords
            if (!sections[sectionName]) {
                const fallbackContent = this.extractSectionFallback(feedbackText, sectionName);
                if (fallbackContent) {
                    sections[sectionName] = fallbackContent;
                    console.log(`🔄 Fallback found ${sectionName}:`, sections[sectionName].substring(0, 50) + '...');
                } else {
                    console.warn(`❌ No content found for ${sectionName} in feedback text. Feedback length: ${feedbackText.length}`);
                    // Log a snippet of the feedback to help debug
                    if (sectionName === 'improvements') {
                        console.log('📄 Feedback snippet around "Areas":', 
                            feedbackText.substring(
                                Math.max(0, feedbackText.toLowerCase().indexOf('areas') - 50),
                                Math.min(feedbackText.length, feedbackText.toLowerCase().indexOf('areas') + 200)
                            )
                        );
                    }
                }
            }
        }
        
        console.log('📊 Final parsed sections:', {
            hasStrengths: !!sections.strengths,
            hasImprovements: !!sections.improvements,
            hasBetterResponse: !!sections.betterResponse,
            hasTips: !!sections.tips
        });
        
        return sections;
    }
    
    extractSectionFallback(feedbackText, sectionName) {
        // Split feedback into paragraphs and try to find content based on keywords
        const paragraphs = feedbackText.split('\n').filter(p => p.trim());
        
        const keywords = {
            strengths: ['good', 'well', 'strong', 'positive', 'excellent', 'great', 'clear'],
            improvements: ['improve', 'better', 'could', 'should', 'consider', 'try', 'enhance'],
            betterResponse: ['example', 'instead', 'alternatively', 'say', 'mention', 'include'],
            tips: ['tip', 'remember', 'next time', 'general', 'advice', 'suggest']
        };
        
        const sectionKeywords = keywords[sectionName] || [];
        
        for (const paragraph of paragraphs) {
            const lowerParagraph = paragraph.toLowerCase();
            if (sectionKeywords.some(keyword => lowerParagraph.includes(keyword))) {
                return this.formatSection(paragraph);
            }
        }
        
        return null;
    }
    
    formatSection(text) {
        return text
            .trim()
            .replace(/^- /gm, '• ') // Convert dashes to bullets
            .replace(/\n/g, '<br>') // Convert newlines to breaks
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold text
    }

    formatFeedback(feedbackText) {
        // Simple markdown-like formatting
        let formatted = feedbackText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        return `<p>${formatted}</p>`;
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
            
            // Request next question with full session config
            const nextQuestionConfig = {
                ...this.sessionConfig, // Include all session configuration
                questionNumber: this.currentQuestion,
                previousQuestions: this.previousQuestions, // Pass all previous questions
                userEmail: this.getUserEmail(),
                userName: this.getUserName()
            };
            
            console.log('Loading next question with config:', {
                hasSessionConfig: !!this.sessionConfig,
                questionNumber: this.currentQuestion,
                detectedRole: nextQuestionConfig.detectedRole,
                language: nextQuestionConfig.language,
                difficultyLevel: nextQuestionConfig.difficultyLevel,
                previousQuestionsCount: this.previousQuestions.length
            });
            
            this.socket.emit('requestAIQuestion', nextQuestionConfig);
        } else {
            // End of practice session
            this.showCompletionMessage();
        }
    }

    tryQuestionAgain() {
        // Check if user already retried this question
        const questionText = this.currentQuestionText;
        const attempts = this.answerHistory.get(questionText) || [];
        
        if (attempts.length >= 2) {
            // Already retried once (2 attempts total), don't allow more
            return;
        }
        
        // Hide the retry button immediately to prevent multiple clicks
        this.tryAgainBtn.style.display = 'none';
        
        // Clear any pending timeouts and intervals
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
        
        // Reset for same question
        this.answerTranscript.innerHTML = '<p style="color: #999;">Choose how you\'d like to answer...</p>';
        this.feedbackSection.style.display = 'none';
        this.feedbackSpinner.style.display = 'none';
        this.feedbackContent.style.display = 'none';
        this.getFeedbackBtn.style.display = 'none';
        this.startRecordingBtn.style.display = 'inline-block';
        this.timer.style.display = 'none';
        
        // Reset text answer
        this.textAnswer.value = '';
        this.switchToVoiceMode(); // Default back to voice mode
    }

    startTimer() {
        this.answerStartTime = Date.now();
        this.timer.style.display = 'block';
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.answerStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showSessionResults() {
        // Calculate session statistics
        const stats = this.calculateSessionStats();
        
        this.interviewPanel.innerHTML = `
            <div class="session-results">
                <div class="results-header">
                    <h2>🎉 Practice Session Complete!</h2>
                    <p>Here's how you performed across all ${this.totalQuestions} questions</p>
                </div>
                
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0;">
                    <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <h3>Average Score</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.averageScore}</div>
                        <p>${stats.scoreDescription}</p>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <h3>Best Score</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.bestScore}</div>
                        <p>Question ${stats.bestQuestionNumber}</p>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <h3>Total Attempts</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.totalAttempts}</div>
                        <p>Across all questions</p>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <h3>Improvement</h3>
                        <div style="font-size: 2.5em; font-weight: bold; margin: 10px 0;">${stats.improvement}</div>
                        <p>Last - First Question</p>
                        <small style="opacity: 0.9;">${stats.improvementDescription}</small>
                    </div>
                </div>
                
                <div class="insights-section" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3>💡 AI Insights</h3>
                    <div id="aiInsights" style="margin: 15px 0;">
                        <div style="text-align: center; color: #666; padding: 20px;">
                            <div style="font-size: 18px; margin-bottom: 10px;">🤖</div>
                            Generating personalized insights based on your performance...
                        </div>
                    </div>
                </div>
                
                <div class="control-buttons" style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                    <button onclick="location.reload()" class="btn btn-primary" style="padding: 12px 24px; font-size: 16px;">Start New Session</button>
                    <a href="/dashboard" class="btn btn-secondary" style="text-decoration: none; padding: 12px 24px; font-size: 16px;">
                        Back to Dashboard
                    </a>
                </div>
            </div>
        `;
        
        // Generate AI insights after displaying the results
        this.generateAIInsights();
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
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Display the AI-generated insights
                const aiInsightsElement = document.getElementById('aiInsights');
                if (aiInsightsElement) {
                    aiInsightsElement.innerHTML = `
                        <div style="line-height: 1.6;">
                            ${result.insights.map(insight => `
                                <div style="margin: 15px 0; padding: 12px; background: #fff; border-left: 4px solid #ffd700; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <p style="margin: 0; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">• ${insight}</p>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            } else {
                throw new Error(result.error || 'Failed to generate insights');
            }
        } catch (error) {
            console.error('Error generating AI insights:', error);
            const aiInsightsElement = document.getElementById('aiInsights');
            if (aiInsightsElement) {
                aiInsightsElement.innerHTML = `
                    <div style="text-align: center; color: #999; padding: 20px;">
                        <p>Unable to generate personalized insights at the moment.</p>
                        <p style="font-size: 14px;">Your performance data has been saved successfully.</p>
                    </div>
                `;
            }
        }
    }
    
    collectFeedbackData() {
        const feedbackData = [];
        let questionNumber = 1;
        
        this.answerHistory.forEach((attempts, question) => {
            // Get the best attempt for this question
            const bestAttempt = attempts.reduce((best, current) => 
                current.score > best.score ? current : best
            );
            
            feedbackData.push({
                questionNumber: questionNumber++,
                question: question,
                answer: bestAttempt.answer,
                score: bestAttempt.score,
                attempts: attempts.length,
                timestamp: bestAttempt.timestamp
            });
        });
        
        return feedbackData;
    }
    
    calculateVariance(scores) {
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        return variance;
    }
    
    getScoreDescription(score) {
        if (score >= 9) return 'Outstanding';
        if (score >= 8) return 'Excellent';
        if (score >= 7) return 'Very Good';
        if (score >= 6) return 'Good';
        if (score >= 5) return 'Fair';
        return 'Needs Improvement';
    }
    
    showCompletionMessage() {
        // This is now just a fallback - should use showSessionResults instead
        this.showSessionResults();
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
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
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

    switchToVoiceMode() {
        // Update button states
        this.voiceModeBtn.className = 'btn-primary';
        this.textModeBtn.className = 'btn-secondary';
        
        // Show voice section, hide text section
        this.voiceAnswerSection.style.display = 'block';
        this.textAnswerSection.style.display = 'none';
        
        console.log('Switched to voice mode');
    }

    switchToTextMode() {
        // Update button states
        this.voiceModeBtn.className = 'btn-secondary';
        this.textModeBtn.className = 'btn-primary';
        
        // Show text section, hide voice section
        this.voiceAnswerSection.style.display = 'none';
        this.textAnswerSection.style.display = 'block';
        
        // Focus on text area
        this.textAnswer.focus();
        
        console.log('Switched to text mode');
    }

    submitTextAnswer() {
        const textAnswer = this.textAnswer.value.trim();
        
        if (!textAnswer) {
            alert('Please type your answer before submitting.');
            return;
        }

        // Check if user has already reached the retry limit for this question
        const questionText = this.currentQuestionText;
        const attempts = this.answerHistory.get(questionText) || [];
        
        if (attempts.length >= 2) {
            // Already retried once (2 attempts total), don't allow more submissions
            alert('You have already answered this question twice. Please proceed to the next question.');
            return;
        }

        // Display the typed answer in the transcript box for consistency
        this.answerTranscript.innerHTML = `<p>${textAnswer}</p>`;
        
        // Show feedback section
        this.feedbackSection.style.display = 'block';
        
        // Scroll to feedback section before requesting feedback
        this.feedbackSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Automatically request feedback after a short delay
        setTimeout(() => {
            this.requestFeedback();
        }, 100);
        
        console.log('Text answer submitted:', textAnswer);
    }

    clearTextAnswer() {
        this.textAnswer.value = '';
        this.textAnswer.focus();
        console.log('Text answer cleared');
    }

    disableNavigationButtons() {
        // Disable and grey out the navigation buttons
        this.nextQuestionBtn.disabled = true;
        this.tryAgainBtn.disabled = true;
        
        // Also disable text answer buttons
        this.submitTextAnswerBtn.disabled = true;
        this.clearTextAnswerBtn.disabled = true;
        
        // Add visual styling for disabled state
        this.nextQuestionBtn.style.opacity = '0.5';
        this.nextQuestionBtn.style.cursor = 'not-allowed';
        this.tryAgainBtn.style.opacity = '0.5';
        this.tryAgainBtn.style.cursor = 'not-allowed';
        this.submitTextAnswerBtn.style.opacity = '0.5';
        this.submitTextAnswerBtn.style.cursor = 'not-allowed';
        this.clearTextAnswerBtn.style.opacity = '0.5';
        this.clearTextAnswerBtn.style.cursor = 'not-allowed';
        
        console.log('Navigation and text answer buttons disabled during feedback generation');
    }

    enableNavigationButtons() {
        // Re-enable the navigation buttons
        this.nextQuestionBtn.disabled = false;
        this.tryAgainBtn.disabled = false;
        
        // Also re-enable text answer buttons
        this.submitTextAnswerBtn.disabled = false;
        this.clearTextAnswerBtn.disabled = false;
        
        // Restore normal styling
        this.nextQuestionBtn.style.opacity = '1';
        this.nextQuestionBtn.style.cursor = 'pointer';
        this.tryAgainBtn.style.opacity = '1';
        this.tryAgainBtn.style.cursor = 'pointer';
        this.submitTextAnswerBtn.style.opacity = '1';
        this.submitTextAnswerBtn.style.cursor = 'pointer';
        this.clearTextAnswerBtn.style.opacity = '1';
        this.clearTextAnswerBtn.style.cursor = 'pointer';
        
        console.log('Navigation and text answer buttons enabled after feedback generation');
    }

    disableSubmitButton() {
        // Disable submit button due to retry limit
        this.submitTextAnswerBtn.disabled = true;
        this.submitTextAnswerBtn.style.opacity = '0.5';
        this.submitTextAnswerBtn.style.cursor = 'not-allowed';
        this.submitTextAnswerBtn.textContent = 'Submit Answer';
        
        console.log('Submit button disabled due to retry limit');
    }

    enableSubmitButton() {
        // Enable submit button 
        this.submitTextAnswerBtn.disabled = false;
        this.submitTextAnswerBtn.style.opacity = '1';
        this.submitTextAnswerBtn.style.cursor = 'pointer';
        this.submitTextAnswerBtn.textContent = 'Submit Answer';
        
        console.log('Submit button enabled');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const interviewer = new AIInterviewer();
    
    // Auto-load CV from profile if available
    await interviewer.loadCvFromProfile();
});