const gptService = require('./gptService');
const winston = require('winston');
const { ALL_QUESTION_TYPES, BASIC_QUESTION_TYPES, getQuestionTypeContext } = require('../config/questionTypes');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class AIInterviewerService {
    constructor() {
        this.questionTypes = BASIC_QUESTION_TYPES;
        // Store selected types for mixed mode to avoid repeats in a session
        this.mixedModeSelections = [];
    }

    /**
     * Generate personalized interview questions based on CV and job description
     */
    async generateInterviewQuestion({ 
        resume, 
        jobDescription, 
        questionNumber = 1, 
        previousQuestions = [],
        currentRole = '',
        experienceYears = '',
        detectedRole = '',
        detectedCompany = '',
        detectedIndustry = '',
        difficultyLevel = 'intermediate',
        questionType = 'mixed',
        language = 'english',
        companyName = '',
        companyIndustry = '',
        additionalInfo = ''
    }) {
        try {
            // Resolve final question type (handles mixed mode rotation)
            const finalQuestionType = questionType;
            // Trigger mixed-mode rotation so lastSelectedType is updated
            this.getQuestionTypeContext(finalQuestionType, questionNumber);
            const actualQuestionType = (finalQuestionType === 'mixed' && this.lastSelectedType)
                ? this.lastSelectedType
                : finalQuestionType;

            const role = detectedRole || currentRole || 'this role';

            // Question type as a format hint only — subject matter always comes from the job
            const formatHints = {
                'technical':          'Format: ask about a specific technical skill, tool, implementation detail, or decision relevant to this role.',
                'behavioral':         'Format: ask for a specific past experience — use a "Tell me about a time..." or "Give me an example of..." style starter.',
                'situational':        'Format: present a realistic hypothetical scenario tied to this role and ask how they would handle it.',
                'competency':         'Format: ask about their professional approach or method as it applies to the day-to-day work of this role.',
                'leadership':         'Format: ask about a leadership decision or people-management challenge specific to this role.',
                'problem-solving':    'Format: present a realistic problem they might face in this role and ask how they would solve it.',
                'teamwork':           'Format: ask how they collaborate with others in the context of the actual responsibilities of this role.',
                'communication':      'Format: ask about a communication challenge or skill directly tied to the work of this role.',
                'conflict':           'Format: ask about a conflict or disagreement they might face in this specific role.',
                'stress':             'Format: ask how they handle pressure or a high-stakes situation specific to this job.',
                'motivation':         'Format: ask what drives them professionally in the context of this specific type of work.',
                'culture':            'Format: ask about their working style as it relates to the environment of this role.',
                'growth':             'Format: ask about professional development in the context of this role\'s skill requirements.',
                'creativity':         'Format: ask about an innovative or creative approach they would apply to a challenge in this role.',
                'adaptability':       'Format: ask how they adapt to change in the context of this role\'s responsibilities.',
                'time-management':    'Format: ask how they prioritise or manage workload for the type of work this role involves.',
                'interview-essentials': 'Format: ask a classic interview question but tie the expected answer to the specifics of this role.',
            };
            const formatHint = formatHints[actualQuestionType] || 'Format: ask a direct, realistic interview question appropriate for this role.';

            const systemPrompt = 'You are a professional interviewer. Generate a single, realistic interview question that a real hiring manager would ask. Output only the question — no preamble, no labels, no explanation.';

            const hasJD = jobDescription && jobDescription.trim();
            const hasResume = resume && resume.trim();

            const lines = [
                `You are interviewing a candidate for a ${role} position.`,
            ];

            if (hasJD) {
                lines.push('', 'Job Description:', jobDescription);
            }
            if (hasResume) {
                lines.push('', 'Candidate Resume:', resume);
            }
            if (!hasJD && !hasResume) {
                // No tailoring context — anchor the question on the role itself so
                // it's still realistic and relevant for this candidate.
                lines.push('', `No job description or resume was provided. Ask a strong, realistic question appropriate for a typical ${role} interview.`);
            }

            if (additionalInfo) lines.push(`\nKey focus for this interview: ${additionalInfo}`);
            if (experienceYears) lines.push(`Candidate experience level: ${experienceYears} years.`);

            if (previousQuestions.length > 0) {
                lines.push('\nAlready asked — do not repeat these topics:');
                previousQuestions.slice(0, 10).forEach((q, i) => lines.push(`${i + 1}. ${q}`));
            }

            lines.push('');
            lines.push('Step 1: Pick one specific responsibility, skill, or challenge from the job description above that has NOT already been covered by the previously asked questions.');
            lines.push('Step 2: Form a question directly about that specific thing.');
            lines.push('');
            lines.push(formatHint);
            lines.push('');
            lines.push('Rules:');
            lines.push('- The question must be about a concrete aspect of THIS job — something a hiring manager for this specific role would care about.');
            lines.push('- Be specific: name the actual condition, procedure, tool, case type, or scenario — never describe it vaguely (e.g. not "a complex situation" or "a subtle abnormality" — say what it actually is).');
            lines.push('- Do NOT ask about generic workplace topics (deadlines, communication, collaboration, team dynamics) unless they are a core and distinctive part of this role.');
            lines.push('- A good test: could this question be asked in an interview for a completely different job? If yes, make it more specific.');
            lines.push('- 1-2 sentences maximum.');

            if (language !== 'english') {
                lines.push(`Generate the question in ${this.getLanguageName(language)}.`);
            }

            const prompt = lines.join('\n');

            const response = await gptService.generateChatCompletion([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.8,
                max_tokens: 150,
                frequency_penalty: 0.4,
                presence_penalty: 0.3
            });

            return {
                question: response.trim(),
                questionType: actualQuestionType
            };
        } catch (error) {
            logger.error('Error generating interview question:', error);
            throw error;
        }
    }

    /**
     * Analyze vocal delivery nuances in the answer
     */
    analyzeVocalNuances(answer) {
        const nuances = {
            fillerWords: [],
            hesitations: [],
            repetitions: [],
            emotionalIndicators: [],
            confidence: 'medium',
            deliveryNotes: []
        };
        
        const text = answer.toLowerCase();
        
        // Detect filler words
        const fillerPatterns = /\b(um|uh|mmm|hmm|ah|oh|well|like|you know|actually|basically|literally|so|right|okay|yeah)\b/g;
        let match;
        while ((match = fillerPatterns.exec(text)) !== null) {
            nuances.fillerWords.push({
                word: match[1],
                position: match.index
            });
        }
        
        // Detect hesitations and pauses
        const hesitationPatterns = /(\.\.\.|—|,\s*,|,\s*um|,\s*uh|,\s*well|long pause|pause)/g;
        while ((match = hesitationPatterns.exec(text)) !== null) {
            nuances.hesitations.push({
                pattern: match[1],
                position: match.index
            });
        }
        
        // Detect repetitions
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i] === words[i + 1] && words[i].length > 2) {
                nuances.repetitions.push({
                    word: words[i],
                    position: i
                });
            }
        }
        
        // Assess confidence level based on delivery patterns
        const fillerCount = nuances.fillerWords.length;
        const hesitationCount = nuances.hesitations.length;
        const wordCount = words.length;
        
        if (wordCount > 0) {
            const fillerRatio = fillerCount / wordCount;
            const hesitationRatio = hesitationCount / wordCount;
            
            if (fillerRatio > 0.15 || hesitationRatio > 0.1) {
                nuances.confidence = 'low';
                nuances.deliveryNotes.push('High frequency of filler words or hesitations detected');
            } else if (fillerRatio < 0.05 && hesitationRatio < 0.03) {
                nuances.confidence = 'high';
                nuances.deliveryNotes.push('Confident delivery with minimal hesitations');
            } else {
                nuances.confidence = 'medium';
            }
        }
        
        return nuances;
    }

    /**
     * Analyze candidate's answer and provide feedback with scoring
     */
    async analyzeAnswer({ 
        question, 
        answer, 
        resume, 
        jobDescription, 
        previousAttempts = [],
        language = 'english',
        detectedRole = '',
        difficultyLevel = 'intermediate'
    }) {
        try {
            // Analyze vocal delivery nuances
            const vocalNuances = this.analyzeVocalNuances(answer);
            
            // Build context about previous attempts
            let previousAttemptsContext = '';
            if (previousAttempts.length > 0) {
                previousAttemptsContext = `\n\nPrevious Attempts at This Question:\n`;
                previousAttempts.forEach((attempt, index) => {
                    previousAttemptsContext += `Attempt ${index + 1} (Score: ${attempt.score}/10):\n"${attempt.answer}"\n\n`;
                });
            }
            
            // Build vocal delivery context for AI analysis
            let deliveryContext = '';
            if (vocalNuances.fillerWords.length > 0 || vocalNuances.hesitations.length > 0 || vocalNuances.repetitions.length > 0) {
                deliveryContext = `\n\nVOCAL DELIVERY ANALYSIS:\n`;
                deliveryContext += `Confidence Level: ${vocalNuances.confidence}\n`;
                
                if (vocalNuances.fillerWords.length > 0) {
                    const fillerCounts = {};
                    vocalNuances.fillerWords.forEach(filler => {
                        fillerCounts[filler.word] = (fillerCounts[filler.word] || 0) + 1;
                    });
                    deliveryContext += `Filler Words: ${Object.entries(fillerCounts).map(([word, count]) => `"${word}" (${count}x)`).join(', ')}\n`;
                }
                
                if (vocalNuances.hesitations.length > 0) {
                    deliveryContext += `Hesitations/Pauses: ${vocalNuances.hesitations.length} detected\n`;
                }
                
                if (vocalNuances.repetitions.length > 0) {
                    const repetitionWords = vocalNuances.repetitions.map(rep => rep.word).join(', ');
                    deliveryContext += `Word Repetitions: ${repetitionWords}\n`;
                }
                
                deliveryContext += `Delivery Notes: ${vocalNuances.deliveryNotes.join('; ')}\n`;
            }

            // Build additional context
            let roleContext = '';
            if (detectedRole) {
                roleContext = `\n\nTarget Role: ${detectedRole} (AI-detected from job description)`;
            }

            let difficultyContext = '';
            if (difficultyLevel !== 'intermediate') {
                difficultyContext = `\n\nDifficulty Level: This is ${difficultyLevel} level interview preparation`;
            }

            // Get language instructions for feedback
            const languageInstruction = language !== 'english' ? 
                `\n\n**CRITICAL LANGUAGE REQUIREMENT**: Provide ALL feedback sections (Strengths, Areas for Improvement, Suggested Better Response, Interview Tips) in ${this.getLanguageName(language)}. The candidate is practicing interviews in ${this.getLanguageName(language)}, so all feedback must be in this language to match their practice experience.` : '';

            // Debug logging for language detection
            if (language !== 'english') {
                logger.info(`Generating feedback in language: ${language} (${this.getLanguageName(language)})`);
            }

            // Build language header for non-English feedback
            const languageHeader = language !== 'english' ? 
                `🌍 LANGUAGE REQUIREMENT: All feedback must be in ${this.getLanguageName(language)} language.\n\n` : '';

            const prompt = `${languageHeader}You are a professional interview coach who provides balanced, constructive feedback. Analyze the candidate's answer and provide honest but proportionate feedback with a score out of 10.

IMPORTANT: Check if the answer merely repeats or rephrases the question without adding substance. This is a critical failure and should score 3/10 or less.

${language !== 'english' ? `⚠️ IMPORTANT: Write your entire response in ${this.getLanguageName(language)}. Do not use English.` : ''}

Interview Question: ${question}

Current Answer: ${answer}

First, analyze for IMMEDIATE RED FLAGS that deserve 0-1/10:
- Unprofessional language ("cool", "chill", "whatever", casual slang)
- Clear lack of effort or seriousness
- Inappropriate or nonsensical responses
- Statements showing disengagement ("didn't pay attention", "don't care")

Then analyze content quality:
- Does the answer just repeat what was asked?
- Is there actual new information beyond the question?
- Are there specific examples or personal experiences?
- Is the tone professional and appropriate for an interview?

Candidate's Resume: ${resume}

Job Description: ${jobDescription}${roleContext}${difficultyContext}${previousAttemptsContext}${deliveryContext}

SCORING CRITERIA:
- A score of 0-1: Completely unacceptable (unprofessional language, nonsensical, inappropriate, or clearly not trying)
- A score of 2-3: Severely inadequate (one sentence, irrelevant, just repeating question, or minimal unprofessional effort)
- A score of 4-5: Poor answer (vague, no examples, very short, lacks substance, generic responses)
- A score of 6-7: Below average but acceptable (shows basic understanding but missing key elements)
- A score of 8-9: Good answer (solid structure, relevant examples, addresses question well)
- A score of 10: Exceptional answer (comprehensive, detailed, perfectly structured with strong examples)

CRITICAL EVALUATION RULES:
1. If the answer contains unprofessional language, slang, or shows clear lack of effort (like "I was cool", "chill", "didn't pay attention"), give 0-1/10
2. If the answer just repeats or rephrases the question without adding value, maximum score is 1/10
3. If the answer is less than 3 meaningful sentences or mostly filler words, maximum score is 2/10
4. If the answer is nonsensical, inappropriate, or clearly shows the candidate isn't taking it seriously, give 0-1/10
5. If there are no specific examples from experience, maximum score is 5/10
6. If the answer is purely generic without personalization, maximum score is 4/10
7. If the answer doesn't directly address the question asked, maximum score is 4/10
8. Deduct 3-4 points for answers with excessive filler words, unprofessional tone, or lack of substance
9. Only give 6+ if the answer shows genuine professional effort and relevant content
10. Be extremely strict - most answers should score 1-5, only give higher scores for truly professional responses

FEEDBACK GUIDELINES BASED ON SCORE:
- For scores 1-3: Answer is severely lacking (repetition, no substance, irrelevant)
- For scores 4-5: Poor performance, needs significant improvement
- For score 6: Barely acceptable, shows effort but many gaps
- For scores 7-8: Good performance with specific examples and structure
- For scores 9-10: Exceptional answer (rare - reserve for truly outstanding responses)

Provide feedback in EXACTLY this format (with actual content, not just numbers):

**Score: X/10**
BE EXTREMELY STRICT. Terrible answers with unprofessional language, lack of effort, or nonsensical content get 0-1/10.
Most answers should score 1-5. Only give 6+ for professional, well-structured responses.
Examples that deserve 0-1/10: "I was cool", "I'm chill", "didn't pay attention", one-word answers, joke responses.

${language !== 'english' ? `

🔥 FINAL REMINDER: Your response must be 100% in ${this.getLanguageName(language)} language!

` : ''}

**Strengths:** ${language !== 'english' ? `(IMPORTANT: Keep this header in English, but write the content in ${this.getLanguageName(language)})` : ''}
- Acknowledge genuine strengths and what worked well (use "you" language)
- For scores 6+: Be generous in recognizing good elements
- For scores <6: Be honest about limited strengths but find something positive if possible

**Areas for Improvement:** ${language !== 'english' ? `(IMPORTANT: Keep this header in English, but write the content in ${this.getLanguageName(language)})` : ''}
Write 2-3 specific improvements as bullet points (use • or -) or full sentences. Example format:
• You could strengthen your answer by providing a specific example from your past experience
• Consider structuring your response using the STAR method for better clarity
• Try to quantify your achievements with numbers or percentages
DO NOT write just "1." or empty numbered lists. Write complete improvement suggestions.

**Suggested Better Response:** ${language !== 'english' ? `(IMPORTANT: Keep this header in English, but write the content in ${this.getLanguageName(language)})` : ''}
Write the actual improved response that the candidate should give, incorporating the improvements from the "Areas for Improvement" section. DO NOT explain what a better response would be - write the actual response directly as if the candidate is speaking.
- Build upon and enhance the user's existing answer, incorporating good elements they mentioned
- Address the gaps and weaknesses identified in "Areas for Improvement" 
- Apply the interview tips to create a polished, professional response
- Use first person ("I", "In my experience", "I've found") as if the candidate is speaking
- Make it sound natural and conversational, not scripted
- For behavioral questions, use STAR method structure
- Include specific examples and quantifiable results where appropriate
- Only show the response, no explanation before or after, and no quotes "" around the answer

**Interview Tips:** ${language !== 'english' ? `(IMPORTANT: Keep this header in English, but write the content in ${this.getLanguageName(language)})` : ''}
- Provide targeted advice based on the specific performance gaps identified (use "you" language)
- BE CREATIVE AND VARIED - Choose from diverse frameworks and approaches:
  • Storytelling techniques (hook, conflict, resolution)
  • PAR method (Problem, Action, Result) as alternative to STAR
  • CAR method (Context, Action, Result) for simpler structure
  • SOAR method (Situation, Obstacles, Actions, Results) for complex scenarios
  • Power of three (grouping points in threes for memorability)
  • Pyramid principle (lead with conclusion, then support)
  • 2-minute rule (keeping responses concise)
  • Energy matching (adapting to interviewer's style)
  • Pause and pivot techniques (buying thinking time gracefully)
  • Authenticity over perfection approaches
  • Industry-specific terminology usage
  • Cultural awareness in communication
  • Non-verbal communication tips
  • Question reframing strategies
- AVOID mentioning STAR method unless the answer is completely unstructured
- Mix practical tips with mindset shifts
- Include unexpected but valuable advice (e.g., "Write three key points on your notepad before answering")
- For good performers (6+), suggest advanced techniques like strategic vulnerability or executive presence

CRITICAL REQUIREMENTS - YOU MUST INCLUDE ALL 5 SECTIONS:
1. **Score: X/10** - Start with the numerical score
2. **Strengths:** - What the candidate did well
3. **Areas for Improvement:** - Specific improvements needed
4. **Suggested Better Response:** - The actual improved response
5. **Interview Tips:** - Targeted advice for the candidate

MANDATORY FORMATTING:
1. Address the candidate directly using "you", "your", "you've", "you can", etc.
2. BE PROPORTIONATE. If someone scores 6+, they're doing reasonably well - acknowledge this.
3. If someone addresses all aspects of a question, recognize this in your feedback.
4. Balance honesty with encouragement appropriate to the performance level.
5. YOU MUST INCLUDE ALL SECTIONS - do not skip any section, especially Interview Tips.
${roleContext ? `6. Consider this is specifically for a "${detectedRole}" role when evaluating relevance and suggestions.` : ''}
${language !== 'english' ? `7. CRITICAL FORMATTING: Keep headers in English (**Strengths:**, **Areas for Improvement:**, etc.) but write content in ${this.getLanguageName(language)}.` : ''}
${language !== 'english' ? `8. MANDATORY: All content (not headers) must be in ${this.getLanguageName(language)} language.` : ''}
${languageInstruction}`;

            // Build system message with language context
            let systemMessage = 'You are a creative and insightful interview coach with diverse expertise. BE RUTHLESS WITH SCORING - terrible answers deserve 0-1/10. CRITICAL RULES: If someone uses unprofessional language like "I was cool", "chill", "didn\'t pay attention" or shows clear lack of effort, give them 0-1/10. If someone just repeats the question, give 2/10 maximum. Most answers should score 1-5. A score of 6 means "barely professional". Only give 7+ for genuinely professional, well-structured answers with specific examples. IMPORTANT: Be creative and varied in your feedback - avoid repetitive phrases and generic advice. Draw from psychology, business strategy, communication theory, and industry best practices. Make each feedback unique and tailored. MANDATORY: You MUST include ALL sections in your response: Score, Strengths, Areas for Improvement, Suggested Better Response, and Interview Tips. Never skip the Interview Tips section.';
            
            if (language !== 'english') {
                systemMessage = `You are a multilingual interview coach. CRITICAL FORMATTING RULE: You must keep the section headers in English exactly as shown (**Strengths:**, **Areas for Improvement:**, **Suggested Better Response:**, **Interview Tips:**) but write ALL the content under these headers in ${this.getLanguageName(language)} language. This is essential for proper parsing. ` + systemMessage;
            }

            const stream = await gptService.generateChatCompletion([
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.85,
                max_tokens: 1200,
                stream: true
            });

            // Return a readable stream that can be piped
            const { Readable } = require('stream');
            
            // Collect the full response first to validate it
            let fullResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                }
            }
            
            // Validate and fix Areas for Improvement section
            const improvementMatch = fullResponse.match(/\*\*Areas for Improvement:\*\*([\s\S]*?)(?=\*\*|$)/);
            if (improvementMatch) {
                const improvementContent = improvementMatch[1].trim();
                // Check if it's just numbers or too short
                if (improvementContent.match(/^\d+\.?\s*$/m) || improvementContent.length < 30) {
                    logger.warn('Detected malformed improvements section, fixing...');
                    const fixedImprovements = `
• Provide more specific examples from your experience to support your points
• Structure your response more clearly with a beginning, middle, and end
• Include quantifiable results or outcomes when discussing your achievements`;
                    
                    fullResponse = fullResponse.replace(
                        /\*\*Areas for Improvement:\*\*[\s\S]*?(?=\*\*|$)/,
                        `**Areas for Improvement:**${fixedImprovements}\n\n`
                    );
                }
            }
            
            // Create a readable stream from the validated response
            const readable = Readable.from([fullResponse]);
            return readable;
        } catch (error) {
            logger.error('Error analyzing answer:', error);
            throw error;
        }
    }

    /**
     * Get question focus based on question number
     */
    getQuestionFocus(questionNumber) {
        const focuses = {
            1: "the candidate's relevant experience and background",
            2: "behavioral situations (use STAR method format)",
            3: "technical skills and problem-solving abilities",
            4: "cultural fit and teamwork",
            5: "career goals and motivation for this role"
        };
        return focuses[questionNumber] || "general interview topics";
    }

    extractAnchors(resumeText = '', jobDescriptionText = '') {
        const combined = `${resumeText}\n${jobDescriptionText}`;
        const lines = combined
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        const anchors = [];
        const seen = new Set();

        const addAnchor = (value) => {
            if (!value) return;
            let cleaned = String(value).replace(/^[-•*]\s*/, '').replace(/\s+/g, ' ').trim();
            if (!cleaned) return;
            const words = cleaned.split(' ');
            if (words.length > 12) {
                cleaned = words.slice(0, 12).join(' ');
            }
            if (cleaned.length < 6) return;
            if (seen.has(cleaned)) return;
            seen.add(cleaned);
            anchors.push(cleaned);
        };

        lines.forEach((line) => {
            if (/^[-•*]\s+/.test(line)) {
                addAnchor(line);
            }
        });

        lines.forEach((line) => {
            const match = line.match(/^(Skills|Requirements|Responsibilities|Tools|Systems|Technologies|Certifications|Setting|Population|Specialty|Unit|Domain|Stack):\s*(.+)$/i);
            if (match && match[2]) {
                match[2].split(',').forEach(item => addAnchor(item));
            }
        });

        return anchors.slice(0, 6);
    }

    getForbiddenTerms(jobDescription = '') {
        const jd = String(jobDescription || '').toLowerCase();
        const terms = [
            { label: 'ehr', pattern: /\behr\b/i },
            { label: 'emr', pattern: /\bemr\b/i },
            { label: 'electronic health record', pattern: /electronic health record/i },
            { label: 'documentation', pattern: /\bdoc(?:umentation|umented|umenting)\b/i },
            { label: 'charting', pattern: /\bchart(?:ing|s|ed)?\b/i },
            { label: 'patient records', pattern: /\bpatient record(?:s)?\b/i },
            { label: 'medical records', pattern: /\bmedical record(?:s)?\b/i },
            { label: 'clinical documentation', pattern: /\bclinical documentation\b/i },
            { label: 'notes', pattern: /\bnotes?\b/i },
            { label: 'records', pattern: /\brecords?\b/i },
            { label: 'documentation systems', pattern: /\bdocumentation systems?\b/i }
        ];

        return terms.filter(term => !term.pattern.test(jd));
    }

    escapeRegExp(text) {
        return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    containsForbiddenTerms(questionText = '', forbiddenTerms = []) {
        const text = String(questionText || '');
        return forbiddenTerms.some((term) => {
            if (typeof term === 'string') {
                const pattern = new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'i');
                return pattern.test(text);
            }
            if (term && term.pattern) {
                return term.pattern.test(text);
            }
            return false;
        });
    }

    normalizeText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    extractJDAnchorPhrases(jobDescription = '') {
        const jd = String(jobDescription || '');
        if (!jd.trim()) return [];
        const lines = jd.split('\n').map(line => line.trim()).filter(Boolean);
        const bulletLines = lines
            .filter(line => /^[-•*]\s+/.test(line))
            .map(line => line.replace(/^[-•*]\s+/, '').trim());

        const sourceLines = bulletLines.length > 0 ? bulletLines : lines;
        const phrases = new Set();

        sourceLines.forEach((line) => {
            const cleaned = line.replace(/["“”]+/g, '').replace(/\s+/g, ' ').trim();
            if (!cleaned) return;
            const words = cleaned.split(' ');
            if (words.length < 3) return;
            const phrase = words.slice(0, Math.min(8, words.length)).join(' ').trim();
            if (phrase.length < 12) return;
            phrases.add(phrase);
        });

        return Array.from(phrases);
    }

    containsJDAnchorPhrase(questionText = '', phrases = []) {
        const normalizedQuestion = this.normalizeText(questionText);
        if (!normalizedQuestion) return false;
        return phrases.some((phrase) => {
            const normalizedPhrase = this.normalizeText(phrase);
            if (!normalizedPhrase) return false;
            return normalizedQuestion.includes(normalizedPhrase);
        });
    }

    extractJDTechnicalAnchors(jobDescription = '') {
        const jd = String(jobDescription || '');
        if (!jd.trim()) return [];
        const anchors = new Set();

        const lines = jd.split('\n').map(line => line.trim()).filter(Boolean);
        const bulletLines = lines
            .filter(line => /^[-•*]\s+/.test(line))
            .map(line => line.replace(/^[-•*]\s+/, '').trim());

        const scanLines = bulletLines.length > 0 ? bulletLines : lines;

        scanLines.forEach((line) => {
            if (!line) return;

            const toolMatch = line.match(/\b(?:such as|including|e\.g\.)\s+([A-Za-z0-9+.\- ]{3,60})/i);
            if (toolMatch && toolMatch[1]) {
                toolMatch[1]
                    .split(/,|and|\/|;|\|/i)
                    .map(part => part.trim())
                    .filter(part => part.length >= 3)
                    .forEach(part => anchors.add(part));
            }

            const directToolMatch = line.match(/\b(Aspen Plus|Aspen HYSYS|MATLAB|Simulink|ANSYS|SAP|SCADA|DCS|PLC|HMI|LIMS|MES)\b/i);
            if (directToolMatch && directToolMatch[1]) {
                anchors.add(directToolMatch[1]);
            }

            const metricMatch = line.match(/\b(production metrics|process simulation software|industrial safety standards|safety standards|protocols|process control|process optimization|mass balance|energy balance|throughput|yield|conversion|selectivity)\b/i);
            if (metricMatch && metricMatch[1]) {
                anchors.add(metricMatch[1]);
            }
        });

        return Array.from(anchors);
    }

    containsAnyTechnicalAnchor(questionText = '', anchors = []) {
        const text = String(questionText || '').toLowerCase();
        if (!text) return false;
        return anchors.some(anchor => {
            const normalized = String(anchor || '').toLowerCase().trim();
            return normalized && text.includes(normalized);
        });
    }

    startsWithBannedTechnicalStarter(questionText = '') {
        const text = String(questionText || '').trim().toLowerCase();
        return text.startsWith('what steps would you take');
    }

    isMultiAspectQuestion(questionText = '') {
        const text = String(questionText || '').toLowerCase();
        const separators = [
            /\b(and|along with|as well as|in addition to|while|whereas)\b/i
        ];
        const hasSeparator = separators.some(pattern => pattern.test(text));
        const hasMultipleClauses = text.split(',').length > 2 || text.split(';').length > 1;
        return hasSeparator || hasMultipleClauses;
    }

    isBehavioralQuestion(questionText = '') {
        const text = String(questionText || '').toLowerCase();
        const patterns = [
            /tell me about a time/i,
            /describe a time/i,
            /give me an example/i,
            /share a time/i,
            /situation where/i,
            /when you had to/i,
            /most challenging/i,
            /challenge you faced/i
        ];
        return patterns.some((pattern) => pattern.test(text));
    }

    /**
     * Get difficulty context for question generation
     */
    getDifficultyContext(difficultyLevel) {
        const contexts = {
            'entry': 'Entry-level questions focusing on basic understanding, willingness to learn, and foundational knowledge',
            'intermediate': 'Intermediate questions requiring demonstrated experience, problem-solving skills, and practical examples',
            'senior': 'Senior-level questions focusing on leadership, strategic thinking, complex problem-solving, and mentoring',
            'expert': 'Expert-level questions requiring deep expertise, architectural thinking, innovation, and industry leadership'
        };
        return contexts[difficultyLevel] || contexts['intermediate'];
    }

    /**
     * Get question type context
     */
    getQuestionTypeContext(questionType, questionNumber) {
        // For mixed questions, rotate through job-relevant types only
        if (questionType === 'mixed') {
            // Only use types that produce job-specific questions — exclude generic workplace topics
            const allTypes = ['behavioral', 'technical', 'situational', 'competency', 'problem-solving', 'leadership'];

            // Reset selections for new session (question 1)
            if (questionNumber === 1) {
                this.mixedModeSelections = [];
            }

            // Filter out already used types in this session
            const availableTypes = allTypes.filter(type => !this.mixedModeSelections.includes(type));
            
            // If we've used all types (shouldn't happen with 5 questions), reset
            if (availableTypes.length === 0) {
                this.mixedModeSelections = [];
                availableTypes.push(...allTypes);
            }
            
            // Randomly select from available types
            const randomIndex = Math.floor(Math.random() * availableTypes.length);
            const selectedType = availableTypes[randomIndex];
            
            // Track this selection
            this.mixedModeSelections.push(selectedType);
            
            console.log(`🎲 Mixed Mode - Question ${questionNumber}: Selected "${selectedType}" type`);
            console.log(`   Previously used in session: ${this.mixedModeSelections.slice(0, -1).join(', ') || 'none'}`);
            
            // Store the selected type for this question number
            this.lastSelectedType = selectedType;
            
            // Get the context for the randomly selected type
            return this.getQuestionTypeContext(selectedType, questionNumber);
        }
        
        // For non-mixed types, store the type
        this.lastSelectedType = questionType;
        
        // Use the centralized question type context
        return getQuestionTypeContext(questionType);
    }

    /**
     * Get full language name from code
     */
    getLanguageName(languageCode) {
        const languages = {
            'english': 'English',
            'spanish': 'Spanish',
            'french': 'French',
            'german': 'German',
            'italian': 'Italian',
            'portuguese': 'Portuguese',
            'dutch': 'Dutch',
            'russian': 'Russian',
            'chinese': 'Chinese (Mandarin)',
            'japanese': 'Japanese',
            'korean': 'Korean',
            'arabic': 'Arabic'
        };
        return languages[languageCode] || 'English';
    }

    async generateDemoProfile({ industry = '', roleTitle = '', experienceYears = '3' }) {
        const safeIndustry = String(industry || '').trim().replace(/[_-]+/g, ' ');
        const safeRoleTitle = String(roleTitle || '').trim();
        const targetLabel = safeRoleTitle || safeIndustry || 'role';

        const prompt = `You are creating a realistic demo profile for interview practice.

Generate a concise, realistic candidate resume and a matching job description for a ${targetLabel} role.

Requirements:
- Keep it realistic and specific to the role.
- Include realistic workflows, protocols, metrics, settings, and constraints typical for the role.
- Mention tools/systems only in generic terms unless the roleTitle or industry explicitly names a specific product; do not invent brand names.
- IMPORTANT: Only include a specific industry domain or specialty if it is explicitly stated in the role title (e.g., "Pediatric Nurse" → pediatrics, "Fintech Engineer" → fintech). Do NOT invent a domain — if none is specified, use a generic business/technology context that fits the role broadly.
- Avoid generic compliance/policy language unless central to the role.
- Output ONLY valid JSON with the exact keys below (no markdown, no code fences).
- Use this exact structure inside resume and jobDescription (headings + '-' bullets):
  Resume format:
  <Name>
  <Role Title>
  Email: ... | Phone: ...
  Experience:
  - <bullet 1>
  - <bullet 2>
  Skills:
  - <bullet 1>
  - <bullet 2>
  Tools/Systems:
  - <bullet 1>
  - <bullet 2>
  Certifications:
  - <bullet 1>
  Job description format:
  <Role Title> - <Company>
  Responsibilities:
  - <bullet 1>
  - <bullet 2>
  Requirements:
  - <bullet 1>
  - <bullet 2>
  Setting/Population:
  - <bullet 1>
  - <bullet 2>
{
  "name": "<Role title>",
  "companyName": "<Company name>",
  "detectedIndustry": "<Industry label>",
  "resume": "<Resume text with newlines>",
  "jobDescription": "<Job description text with newlines>"
}

Guidelines:
- Resume should be 1200 characters or less.
- Job description should be 1200 characters or less.
- Use 2-3 experience bullets, 4-8 skills, and 3-6 requirements.
- Make the role level consistent with ~${experienceYears} years of experience.
`;
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const response = await gptService.generateChatCompletion([
                    { role: 'system', content: 'You generate realistic interview practice demo data. Respond only with valid JSON. Do not include any commentary or markdown.' },
                    { role: 'user', content: prompt }
                ], {
                    temperature: attempt === 0 ? 0.7 : 0.2,
                    max_tokens: 800,
                    response_format: { type: 'json_object' }
                });

                const parsed = this.parseJsonResponse(response);
                return this.normalizeDemoProfile(parsed, { fallbackRole: safeRoleTitle || safeIndustry || 'Professional' });
            } catch (error) {
                lastError = error;
            }
        }

        logger.error('Error generating demo profile:', lastError);
        throw lastError;
    }

    parseJsonResponse(responseText) {
        if (!responseText) {
            throw new Error('Empty response');
        }
        const cleaned = String(responseText).trim().replace(/```json|```/g, '');
        try {
            return JSON.parse(cleaned);
        } catch (error) {
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
            throw error;
        }
    }

    normalizeDemoProfile(data, { fallbackRole = 'Professional' } = {}) {
        const safeString = (value, fallback = '') => {
            if (typeof value !== 'string') return fallback;
            return value.trim();
        };

        const name = safeString(data?.name, fallbackRole || 'Professional');
        const companyName = safeString(data?.companyName, 'Sample Company');
        const detectedIndustry = safeString(data?.detectedIndustry, fallbackRole || 'General');
        const resume = safeString(data?.resume, `${name}\nExperience:\n- ${fallbackRole} experience\nSkills:\n- Problem solving`);
        const jobDescription = safeString(data?.jobDescription, `${name} role with responsibilities aligned to ${fallbackRole}.`);

        return {
            name: name.slice(0, 120),
            companyName: companyName.slice(0, 120),
            detectedIndustry: detectedIndustry.slice(0, 120),
            resume: resume.slice(0, 2000),
            jobDescription: jobDescription.slice(0, 2000)
        };
    }

    /**
     * Detect job role from job description using AI
     */
    async detectJobRole(jobDescription) {
        try {
            const prompt = `Analyze this job description and extract the specific job role/title the candidate is applying for. 

Job Description:
${jobDescription}

Instructions:
1. Identify the primary job role/title (e.g., "Software Engineer", "Product Manager", "Data Scientist")
2. If multiple roles are mentioned, pick the primary/main one
3. Use standard industry job titles when possible
4. Keep it concise (2-5 words maximum)
5. Focus on the role, not the level (e.g., "Software Engineer" not "Senior Software Engineer")

Response format: Just return the job role title, nothing else.`;

            const response = await gptService.generateChatCompletion([
                { role: 'system', content: 'You are an expert recruiter who can accurately identify job roles from job descriptions. Always respond with just the job title, nothing else.' },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3, // Lower temperature for more consistent results
                max_tokens: 50
            });

            const detectedRole = response.trim();
            
            // Basic validation - ensure it looks like a job title
            if (detectedRole && detectedRole.length > 2 && detectedRole.length < 100) {
                return {
                    detectedRole: detectedRole,
                    confidence: this.calculateConfidence(jobDescription, detectedRole)
                };
            } else {
                throw new Error('Unable to detect a clear job role from the description');
            }
        } catch (error) {
            logger.error('Error detecting job role:', error);
            throw error;
        }
    }

    /**
     * Detect job role, company, and industry from job description using AI
     */
    async detectJobInfo(jobDescription) {
        try {
            const prompt = `Analyze this job description and extract the job role/title, company name, and industry. Be as accurate as possible.

Job Description:
${jobDescription}

Instructions:
1. Extract the primary job role/title (include seniority level if clearly specified, e.g., "Senior Software Engineer", "Marketing Manager", "Junior Data Analyst")
2. Extract the company name exactly as it appears (e.g., "Google LLC", "Microsoft Corporation", "Tesla Inc", "Amazon Web Services")
3. Extract the industry category (be specific, e.g., "Cloud Computing", "E-commerce", "Artificial Intelligence", "Digital Marketing", "Investment Banking")
4. Look for explicit mentions of company names, role titles, and industry context
5. Consider job requirements and responsibilities to infer the role if not explicitly stated
6. Use the actual company name rather than generic terms
7. Be specific about the industry rather than using broad categories

Response format (JSON only, no additional text):
{
    "role": "detected job role here",
    "company": "detected company name here", 
    "industry": "detected industry here"
}

If you cannot detect any field with confidence, use null for that field.`;

            const response = await gptService.generateChatCompletion([
                { role: 'system', content: 'You are an expert HR professional who specializes in analyzing job descriptions. Extract information accurately and respond only with valid JSON in the exact format requested. Do not include any explanatory text.' },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.2, // Lower temperature for more consistent results
                max_tokens: 200 // Increased token limit for better analysis
            });

            // Parse the JSON response
            let parsedResponse;
            try {
                // Clean response and try to extract JSON
                let cleanedResponse = response.trim();
                
                // Remove any markdown code block formatting
                cleanedResponse = cleanedResponse.replace(/```json\s*|\s*```/g, '');
                cleanedResponse = cleanedResponse.replace(/```\s*|\s*```/g, '');
                
                // Try to find JSON structure if response has extra text
                const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleanedResponse = jsonMatch[0];
                }
                
                parsedResponse = JSON.parse(cleanedResponse);
                
                // Validate that we have the expected structure
                if (typeof parsedResponse !== 'object' || parsedResponse === null) {
                    throw new Error('Invalid response structure');
                }
                
            } catch (parseError) {
                // If JSON parsing fails, try to extract role and company manually
                logger.warn('Failed to parse JSON response, attempting manual extraction', parseError.message);
                logger.warn('Response that failed to parse:', response);
                return this.fallbackExtractJobInfo(response, jobDescription);
            }
            
            const detectedRole = parsedResponse.role ? parsedResponse.role.trim() : null;
            const detectedCompany = parsedResponse.company ? parsedResponse.company.trim() : null;
            const detectedIndustry = parsedResponse.industry ? this.capitalizeIndustry(parsedResponse.industry.trim()) : null;
            
            return {
                detectedRole: detectedRole,
                detectedCompany: detectedCompany,
                detectedIndustry: detectedIndustry,
                roleConfidence: detectedRole ? this.calculateConfidence(jobDescription, detectedRole) : 0,
                companyConfidence: detectedCompany ? this.calculateCompanyConfidence(jobDescription, detectedCompany) : 0,
                industryConfidence: detectedIndustry ? this.calculateIndustryConfidence(jobDescription, detectedIndustry) : 0
            };
        } catch (error) {
            logger.error('Error detecting job info:', error);
            // Fallback to basic keyword extraction if AI call fails
            const basicExtraction = this.basicKeywordExtraction(jobDescription || '');
            return {
                detectedRole: basicExtraction.role || null,
                detectedCompany: basicExtraction.company || null,
                detectedIndustry: basicExtraction.industry || null,
                roleConfidence: basicExtraction.role ? this.calculateConfidence(jobDescription, basicExtraction.role) : 0,
                companyConfidence: basicExtraction.company ? this.calculateCompanyConfidence(jobDescription, basicExtraction.company) : 0,
                industryConfidence: basicExtraction.industry ? this.calculateIndustryConfidence(jobDescription, basicExtraction.industry) : 0
            };
        }
    }

    /**
     * Fallback method for extracting job info when JSON parsing fails
     */
    fallbackExtractJobInfo(response, jobDescription) {
        logger.info('Using fallback extraction method');
        logger.info('Response to parse:', response);
        
        // Try to extract JSON from the response even if it's wrapped in other text
        let detectedRole = null;
        let detectedCompany = null;
        let detectedIndustry = null;
        
        // First, try to find JSON structure within the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                detectedRole = parsed.role;
                detectedCompany = parsed.company;
                detectedIndustry = parsed.industry;
            } catch (e) {
                logger.warn('Failed to parse extracted JSON structure');
            }
        }
        
        // If JSON extraction failed, use pattern matching on the response
        if (!detectedRole || !detectedCompany || !detectedIndustry) {
            const patterns = {
                role: [
                    /"role":\s*"([^"]+)"/i,
                    /"title":\s*"([^"]+)"/i,
                    /role[:\s]+["']?([^"'\n,}]+)["']?/i,
                    /title[:\s]+["']?([^"'\n,}]+)["']?/i,
                    /position[:\s]+["']?([^"'\n,}]+)["']?/i
                ],
                company: [
                    /"company":\s*"([^"]+)"/i,
                    /company[:\s]+["']?([^"'\n,}]+)["']?/i,
                    /organization[:\s]+["']?([^"'\n,}]+)["']?/i,
                    /employer[:\s]+["']?([^"'\n,}]+)["']?/i
                ],
                industry: [
                    /"industry":\s*"([^"]+)"/i,
                    /industry[:\s]+["']?([^"'\n,}]+)["']?/i,
                    /sector[:\s]+["']?([^"'\n,}]+)["']?/i,
                    /field[:\s]+["']?([^"'\n,}]+)["']?/i
                ]
            };
            
            // Extract using patterns
            if (!detectedRole) {
                for (const pattern of patterns.role) {
                    const match = response.match(pattern);
                    if (match && match[1]) {
                        detectedRole = match[1].trim();
                        break;
                    }
                }
            }
            
            if (!detectedCompany) {
                for (const pattern of patterns.company) {
                    const match = response.match(pattern);
                    if (match && match[1]) {
                        detectedCompany = match[1].trim();
                        break;
                    }
                }
            }
            
            if (!detectedIndustry) {
                for (const pattern of patterns.industry) {
                    const match = response.match(pattern);
                    if (match && match[1]) {
                        detectedIndustry = match[1].trim();
                        break;
                    }
                }
            }
        }
        
        // Clean up extracted values
        detectedRole = detectedRole && detectedRole !== 'null' ? detectedRole.trim() : null;
        detectedCompany = detectedCompany && detectedCompany !== 'null' ? detectedCompany.trim() : null;
        detectedIndustry = detectedIndustry && detectedIndustry !== 'null' ? this.capitalizeIndustry(detectedIndustry.trim()) : null;
        
        // If still no results, try basic keyword extraction from job description
        if (!detectedRole || !detectedCompany || !detectedIndustry) {
            const basicExtraction = this.basicKeywordExtraction(jobDescription);
            detectedRole = detectedRole || basicExtraction.role;
            detectedCompany = detectedCompany || basicExtraction.company;
            detectedIndustry = detectedIndustry || basicExtraction.industry;
        }
        
        logger.info('Fallback extraction results:', {
            detectedRole,
            detectedCompany,
            detectedIndustry
        });
        
        return {
            detectedRole: detectedRole,
            detectedCompany: detectedCompany,
            detectedIndustry: detectedIndustry,
            roleConfidence: detectedRole ? this.calculateConfidence(jobDescription, detectedRole) : 0,
            companyConfidence: detectedCompany ? this.calculateCompanyConfidence(jobDescription, detectedCompany) : 0,
            industryConfidence: detectedIndustry ? this.calculateIndustryConfidence(jobDescription, detectedIndustry) : 0
        };
    }

    /**
     * Basic keyword extraction as last resort
     */
    basicKeywordExtraction(jobDescription) {
        const text = jobDescription.toLowerCase();
        
        // Common job titles
        const jobTitles = [
            'software engineer', 'data scientist', 'product manager', 'marketing manager',
            'sales representative', 'business analyst', 'project manager', 'designer',
            'developer', 'consultant', 'analyst', 'specialist', 'coordinator', 'director',
            'manager', 'engineer', 'architect', 'lead', 'senior', 'junior', 'intern'
        ];
        
        // Company name patterns (look for capitalized words near job posting context)
        const companyPatterns = [
            /(?:at|join|with|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are|seeks|looking)/g
        ];
        
        // Industry keywords
        const industryKeywords = {
            'Technology': ['software', 'tech', 'programming', 'development', 'coding', 'IT'],
            'Healthcare': ['healthcare', 'medical', 'hospital', 'pharmaceutical', 'clinical'],
            'Finance': ['finance', 'banking', 'investment', 'trading', 'financial'],
            'Marketing': ['marketing', 'advertising', 'brand', 'digital marketing', 'SEO'],
            'Education': ['education', 'teaching', 'academic', 'university', 'school'],
            'Retail': ['retail', 'sales', 'customer service', 'merchandising', 'store'],
            'Manufacturing': ['manufacturing', 'production', 'factory', 'assembly', 'quality control']
        };
        
        let role = null;
        let company = null;
        let industry = null;
        
        // Extract role
        for (const title of jobTitles) {
            if (text.includes(title)) {
                role = title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                break;
            }
        }
        
        // Extract company
        for (const pattern of companyPatterns) {
            const matches = jobDescription.match(pattern);
            if (matches && matches[0]) {
                const match = matches[0].replace(/(?:at|join|with|for|is|are|seeks|looking)\s+/i, '');
                if (match.length > 2 && match.length < 50) {
                    company = match;
                    break;
                }
            }
        }
        
        // Extract industry
        for (const [industryName, keywords] of Object.entries(industryKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                industry = industryName;
                break;
            }
        }
        
        return { role, company, industry };
    }

    /**
     * Calculate confidence level for company detection
     */
    calculateCompanyConfidence(jobDescription, detectedCompany) {
        let confidence = 60; // Base confidence for company detection
        
        // Increase confidence based on description length and detail
        if (jobDescription.length > 500) confidence += 10;
        if (jobDescription.length > 1000) confidence += 10;
        
        // Check if company name appears in job description
        const companyWords = detectedCompany.toLowerCase().split(' ');
        const descLower = jobDescription.toLowerCase();
        
        let companyMatches = 0;
        companyWords.forEach(word => {
            if (word.length > 2 && descLower.includes(word)) {
                companyMatches++;
            }
        });
        
        if (companyMatches >= companyWords.length) {
            confidence += 20; // Exact company name match
        } else if (companyMatches >= companyWords.length * 0.7) {
            confidence += 15;
        }
        
        // Look for common company indicators
        const companyIndicators = ['inc.', 'corp', 'ltd', 'llc', 'company', 'technologies', 'solutions'];
        const hasIndicator = companyIndicators.some(indicator => 
            detectedCompany.toLowerCase().includes(indicator) || descLower.includes(indicator)
        );
        
        if (hasIndicator) {
            confidence += 10;
        }
        
        // Cap confidence at 90% for company detection (slightly lower than role)
        return Math.min(confidence, 90);
    }

    /**
     * Calculate confidence level for industry detection
     */
    calculateIndustryConfidence(jobDescription, detectedIndustry) {
        let confidence = 70; // Base confidence for industry detection
        
        // Increase confidence based on description length and detail
        if (jobDescription.length > 500) confidence += 10;
        if (jobDescription.length > 1000) confidence += 5;
        
        // Check if industry-related keywords appear in job description
        const industryKeywords = {
            'technology': ['software', 'tech', 'digital', 'app', 'platform', 'cloud', 'ai', 'data'],
            'healthcare': ['health', 'medical', 'patient', 'clinical', 'hospital', 'pharmacy'],
            'finance': ['financial', 'banking', 'investment', 'trading', 'fintech', 'credit'],
            'consulting': ['consulting', 'advisory', 'strategy', 'transformation'],
            'retail': ['retail', 'ecommerce', 'shopping', 'customer', 'sales', 'store'],
            'education': ['education', 'teaching', 'learning', 'school', 'university', 'student'],
            'automotive': ['automotive', 'vehicle', 'car', 'transportation'],
            'manufacturing': ['manufacturing', 'production', 'factory', 'industrial'],
            'energy': ['energy', 'oil', 'gas', 'renewable', 'power', 'utility'],
            'media': ['media', 'entertainment', 'content', 'publishing', 'broadcasting']
        };
        
        const descLower = jobDescription.toLowerCase();
        const keywords = industryKeywords[detectedIndustry.toLowerCase()] || [];
        
        let keywordMatches = 0;
        keywords.forEach(keyword => {
            if (descLower.includes(keyword)) {
                keywordMatches++;
            }
        });
        
        if (keywordMatches >= 3) {
            confidence += 15; // Strong industry keyword match
        } else if (keywordMatches >= 2) {
            confidence += 10;
        } else if (keywordMatches >= 1) {
            confidence += 5;
        }
        
        // Cap confidence at 85% for industry detection (lower than company/role)
        return Math.min(confidence, 85);
    }

    /**
     * Calculate confidence level for job role detection
     */
    calculateConfidence(jobDescription, detectedRole) {
        let confidence = 70; // Base confidence
        
        // Increase confidence based on description length and detail
        if (jobDescription.length > 500) confidence += 10;
        if (jobDescription.length > 1000) confidence += 10;
        
        // Check if role appears explicitly in job description
        const roleWords = detectedRole.toLowerCase().split(' ');
        const descLower = jobDescription.toLowerCase();
        
        let roleMatches = 0;
        roleWords.forEach(word => {
            if (word.length > 2 && descLower.includes(word)) {
                roleMatches++;
            }
        });
        
        if (roleMatches >= roleWords.length * 0.8) {
            confidence += 15;
        } else if (roleMatches >= roleWords.length * 0.5) {
            confidence += 10;
        }
        
        // Cap confidence at 95%
        return Math.min(confidence, 95);
    }

    /**
     * Generate follow-up question based on answer
     */
    async generateFollowUp({ originalQuestion, answer }) {
        try {
            const prompt = `Based on this interview exchange, generate a natural follow-up question to dig deeper:

Original Question: ${originalQuestion}
Candidate's Answer: ${answer}

Generate a brief, specific follow-up question that explores their answer further. Keep it conversational and under 2 sentences.`;

            const response = await gptService.generateChatCompletion([
                { role: 'system', content: 'You are an interviewer asking follow-up questions.' },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.8,
                max_tokens: 100
            });

            return response.trim();
        } catch (error) {
            logger.error('Error generating follow-up question:', error);
            throw error;
        }
    }

    /**
     * Capitalize industry name properly
     */
    capitalizeIndustry(industry) {
        if (!industry) return industry;
        
        // Handle special cases for proper capitalization
        const specialCases = {
            'real-estate': 'Real Estate',
            'real estate': 'Real Estate',
            'non-profit': 'Non-Profit',
            'nonprofit': 'Non-Profit',
            'e-commerce': 'E-Commerce',
            'ecommerce': 'E-Commerce',
            'fintech': 'FinTech',
            'healthtech': 'HealthTech',
            'edtech': 'EdTech',
            'saas': 'SaaS',
            'b2b': 'B2B',
            'b2c': 'B2C',
            'ai': 'Artificial Intelligence',
            'ml': 'Machine Learning',
            'it': 'Information Technology',
            'hr': 'Human Resources',
            'pr': 'Public Relations',
            'ui/ux': 'UI/UX Design',
            'r&d': 'Research & Development'
        };
        
        const lowerIndustry = industry.toLowerCase().trim();
        
        // Check for special cases first
        if (specialCases[lowerIndustry]) {
            return specialCases[lowerIndustry];
        }
        
        // Handle common abbreviations and technical terms
        const words = lowerIndustry.split(/[\s-]+/);
        const capitalizedWords = words.map(word => {
            // Handle common abbreviations
            if (['api', 'sdk', 'crm', 'erp', 'iot', 'vr', 'ar', 'seo', 'sem', 'ppc', 'roi', 'kpi', 'ux', 'ui'].includes(word)) {
                return word.toUpperCase();
            }
            
            // Handle words that should stay lowercase
            if (['and', 'or', 'of', 'the', 'in', 'on', 'at', 'to', 'for', 'with', 'by'].includes(word)) {
                return word;
            }
            
            // Standard capitalization
            return word.charAt(0).toUpperCase() + word.slice(1);
        });
        
        // Make sure the first word is always capitalized
        if (capitalizedWords.length > 0) {
            capitalizedWords[0] = capitalizedWords[0].charAt(0).toUpperCase() + capitalizedWords[0].slice(1);
        }
        
        return capitalizedWords.join(' ');
    }

    /**
     * Generate AI-powered session insights based on feedback data
     */
    async generateSessionInsights(feedbackData, sessionConfig) {
        try {
            // Calculate basic stats
            const scores = feedbackData.map(item => item.score);
            const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const totalAttempts = feedbackData.reduce((sum, item) => sum + item.attempts, 0);
            
            // Create context for the AI
            const performanceContext = feedbackData.map((item, index) => 
                `Question ${index + 1} (Score: ${item.score}/10, ${item.attempts} attempt${item.attempts > 1 ? 's' : ''}): "${item.question.substring(0, 100)}..." - Answer: "${item.answer.substring(0, 150)}..."`
            ).join('\n\n');

            const prompt = `Analyze this interview practice session and provide 3-4 short, concise, actionable insights based on the candidate's performance:

Session Context:
- Role: ${sessionConfig?.detectedRole || 'Not specified'}
- Company: ${sessionConfig?.detectedCompany || 'Not specified'}
- Industry: ${sessionConfig?.detectedIndustry || 'Not specified'}
- Difficulty: ${sessionConfig?.difficultyLevel || 'intermediate'}
- Average Score: ${averageScore.toFixed(1)}/10
- Total Attempts: ${totalAttempts}

Performance Data:
${performanceContext}

Provide 3-4 brief insights (each 1-2 sentences) that are:
1. Based on actual performance patterns
2. Specific and actionable
3. Encouraging but realistic
4. Focused on interview skills development

Format as a JSON array of strings.
Example: ["Your technical explanations were clear and well-structured.", "Consider providing more specific examples when discussing achievements.", "Strong consistency across different question types."]`;

            const response = await gptService.generateChatCompletion([
                { role: 'system', content: 'You are an expert interview coach analyzing a practice session. Provide concise, actionable insights based on the candidate\'s performance data. Respond with a JSON array of insight strings only.' },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3,
                max_tokens: 300
            });

            // Parse the JSON response
            let insights;
            try {
                // Clean response and try to extract JSON
                let cleanedResponse = response.trim();
                cleanedResponse = cleanedResponse.replace(/```json\s*|\s*```/g, '');
                cleanedResponse = cleanedResponse.replace(/```\s*|\s*```/g, '');
                
                // Try to find JSON array structure
                const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    cleanedResponse = arrayMatch[0];
                }
                
                insights = JSON.parse(cleanedResponse);
                
                // Validate that it's an array of strings
                if (!Array.isArray(insights) || !insights.every(item => typeof item === 'string')) {
                    throw new Error('Invalid insights format');
                }
                
            } catch (parseError) {
                logger.warn('Failed to parse AI insights JSON, using fallback');
                
                // Fallback insights based on performance data
                insights = this.generateFallbackInsights(feedbackData, averageScore, totalAttempts);
            }
            
            // Ensure we have 3-4 insights
            insights = insights.slice(0, 4);
            
            // If we don't have enough insights, add some basic ones
            if (insights.length < 3) {
                const additionalInsights = this.generateFallbackInsights(feedbackData, averageScore, totalAttempts);
                insights = insights.concat(additionalInsights).slice(0, 4);
            }
            
            return insights;
            
        } catch (error) {
            logger.error('Error generating session insights:', error);
            
            // Return fallback insights
            const scores = feedbackData.map(item => item.score);
            const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const totalAttempts = feedbackData.reduce((sum, item) => sum + item.attempts, 0);
            
            return this.generateFallbackInsights(feedbackData, averageScore, totalAttempts);
        }
    }

    /**
     * Generate fallback insights when AI analysis fails
     */
    generateFallbackInsights(feedbackData, averageScore, totalAttempts) {
        const insights = [];
        
        // Performance insight
        if (averageScore >= 8) {
            insights.push('Excellent overall performance demonstrates strong interview readiness.');
        } else if (averageScore >= 6) {
            insights.push('Good foundation with opportunities to strengthen specific areas.');
        } else {
            insights.push('Focus on developing clearer, more structured responses to improve performance.');
        }
        
        // Consistency insight
        const scores = feedbackData.map(item => item.score);
        const scoreVariance = this.calculateScoreVariance(scores);
        if (scoreVariance < 1) {
            insights.push('Consistent performance across different question types shows reliability.');
        } else if (scoreVariance > 3) {
            insights.push('Performance varied significantly - identify strongest areas to build confidence.');
        }
        
        // Retry insight
        const questionsWithRetries = feedbackData.filter(item => item.attempts > 1).length;
        if (questionsWithRetries > 0) {
            insights.push(`Persistence shown in retrying ${questionsWithRetries} question(s) demonstrates good self-reflection.`);
        } else {
            insights.push('Confident first-attempt approach shows good interview instincts.');
        }
        
        // Progress insight
        const firstScore = scores[0];
        const lastScore = scores[scores.length - 1];
        if (lastScore > firstScore + 1) {
            insights.push('Clear improvement throughout the session shows strong learning ability.');
        } else if (firstScore > lastScore + 1) {
            insights.push('Consider pacing yourself to maintain energy and focus throughout longer interviews.');
        } else {
            insights.push('Maintained steady performance level throughout the practice session.');
        }
        
        return insights.slice(0, 4);
    }

    /**
     * Calculate variance in scores
     */
    calculateScoreVariance(scores) {
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        return variance;
    }

    /**
     * Analyze additional info and map to appropriate question type
     */
    async detectQuestionTypeFromFocus(additionalInfo) {
        if (!additionalInfo || additionalInfo.trim().length === 0) {
            console.log('🔍 No additional info provided for focus detection');
            return null;
        }

        console.log(`🔍 Starting focus detection for: "${additionalInfo}"`);

        try {
            const prompt = `Analyze the following user focus areas and determine which interview question type category they best fit into. Return ONLY the category name.

User focus areas: "${additionalInfo}"

Available question type categories:
- behavioral: Past experiences, how you handled situations, teamwork, challenges, achievements, failures, STAR method scenarios
- technical: Programming languages (Python, R, Java, JavaScript, etc.), coding, algorithms, system design, tools, technologies, frameworks, databases, architecture, data analysis, statistical methods, machine learning
- situational: Hypothetical scenarios, "what would you do if", problem-solving situations, decision-making scenarios
- competency: Core job skills, expertise areas, domain knowledge, professional abilities, certifications, industry knowledge
- leadership: Management experience, team leadership, project management, mentoring, delegation, strategic thinking
- communication: Presentation skills, stakeholder management, cross-team collaboration, client interaction
- culture-fit: Company values alignment, work style, motivation, career goals, why interested in role/company

Examples:
- "Python programming" → technical
- "ask me about using R" → technical
- "R statistical analysis" → technical
- "machine learning algorithms" → technical
- "handling difficult customers" → behavioral  
- "leading a team through change" → leadership
- "what would you do if servers went down" → situational
- "marketing strategy knowledge" → competency
- "presenting to executives" → communication
- "why do you want to work here" → culture-fit

Return only the category name (behavioral, technical, situational, competency, leadership, communication, or culture-fit).`;

            console.log('🔍 Sending request to OpenAI for focus detection...');
            const response = await gptService.generateChatCompletion([
                { role: 'system', content: 'You are an expert at categorizing interview question topics. Analyze the user focus areas carefully and return only the most appropriate category name. For programming languages like Python, R, Java, JavaScript, or any coding/technical tools, always return "technical".' },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.1, // Even lower temperature for more consistent results
                max_tokens: 20
            });

            const detectedType = String(response || '').trim().toLowerCase();
            console.log(`🔍 Raw OpenAI response: "${response}"`);
            console.log(`🔍 Cleaned detected type: "${detectedType}"`);
            
            // Validate the response is one of our expected types
            const validTypes = ['behavioral', 'technical', 'situational', 'competency', 'leadership', 'communication', 'culture-fit'];
            if (validTypes.includes(detectedType)) {
                console.log(`✅ Successfully detected question type from focus "${additionalInfo}": ${detectedType}`);
                return detectedType;
            }
            
            console.warn(`⚠️ Unexpected question type detected: "${detectedType}". Valid types: ${validTypes.join(', ')}. Falling back to competency.`);
            return 'competency'; // Safe fallback
            
        } catch (error) {
            console.error('❌ Error detecting question type from focus areas:', error);
            return null;
        }
    }

    async generateModelAnswer({ question, jobDescription, resume, detectedRole, questionType }) {
        try {
            const isBehavioural = /tell me about a time|describe a situation|give me an example|how did you handle|when have you|walk me through a time/i.test(question) || questionType === 'behavioral';

            const starInstruction = isBehavioural
                ? `This is a behavioural question. Structure the answer using STAR method. Wrap each part with these exact XML-style tags on their own line:
[S] Situation content here [/S]
[T] Task content here [/T]
[A] Action content here [/A]
[R] Result content here [/R]`
                : `This is not a behavioural question. Write a clear, direct, professional answer without STAR tags.`;

            const prompt = `You are a world-class interview coach. Write a gold-standard 10/10 model answer for this interview question.

Question: "${question}"
Target Role: ${detectedRole || 'Not specified'}
Job Description: ${jobDescription ? jobDescription.substring(0, 500) : 'Not provided'}
Candidate Background: ${resume ? resume.substring(0, 400) : 'Not provided'}

${starInstruction}

Requirements:
- Natural, confident first-person voice (use "I", "my", "we")
- 150-250 words — detailed but not rambling
- Include specific, plausible examples and metrics that fit the role
- Professional but human — not robotic or over-polished
- Return ONLY the answer. No preamble, no explanation, no quotes around it.`;

            const content = await gptService.generateChatCompletion([
                { role: 'system', content: 'You are an expert interview coach writing gold-standard model answers. Be specific, natural, and impressive.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.8, max_tokens: 500, stream: false });

            return { answer: (content || '').trim(), isBehavioural };
        } catch (error) {
            logger.error('Error generating model answer:', error);
            return null;
        }
    }
}

module.exports = new AIInterviewerService();
