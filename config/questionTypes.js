/**
 * Centralized Question Types Configuration
 * 
 * This file defines all interview question types used across the application.
 * Update this file to add/remove/modify question types instead of updating individual pages.
 */

const QUESTION_TYPES = {
    // Core interview types
    BEHAVIORAL: 'behavioral',
    TECHNICAL: 'technical', 
    SITUATIONAL: 'situational',
    COMPETENCY: 'competency',

    // Leadership & skills
    LEADERSHIP: 'leadership',
    PROBLEM_SOLVING: 'problem-solving',
    CREATIVITY: 'creativity',
    CONFLICT: 'conflict',

    // Personal & cultural
    MOTIVATION: 'motivation',
    CULTURE: 'culture', 
    GROWTH: 'growth',
    STRESS: 'stress',

    // Professional skills
    COMMUNICATION: 'communication',
    TIME_MANAGEMENT: 'time-management',
    TEAMWORK: 'teamwork',
    INTERVIEW_ESSENTIALS: 'interview-essentials',

    // Additional areas
    ADAPTABILITY: 'adaptability',
    CUSTOMER_FOCUS: 'customer-focus',
    ETHICS: 'ethics',
    SALARY: 'salary'
};

// Array of all question types (for mixed mode selection)
const ALL_QUESTION_TYPES = [
    QUESTION_TYPES.BEHAVIORAL,
    QUESTION_TYPES.TECHNICAL,
    QUESTION_TYPES.SITUATIONAL,
    QUESTION_TYPES.COMPETENCY,
    QUESTION_TYPES.LEADERSHIP,
    QUESTION_TYPES.PROBLEM_SOLVING,
    QUESTION_TYPES.CREATIVITY,
    QUESTION_TYPES.CONFLICT,
    QUESTION_TYPES.MOTIVATION,
    QUESTION_TYPES.CULTURE,
    QUESTION_TYPES.GROWTH,
    QUESTION_TYPES.STRESS,
    QUESTION_TYPES.COMMUNICATION,
    QUESTION_TYPES.TIME_MANAGEMENT,
    QUESTION_TYPES.TEAMWORK,
    QUESTION_TYPES.INTERVIEW_ESSENTIALS,
    QUESTION_TYPES.ADAPTABILITY,
    QUESTION_TYPES.CUSTOMER_FOCUS,
    QUESTION_TYPES.ETHICS,
    QUESTION_TYPES.SALARY
];

// Display labels for question types
const QUESTION_TYPE_LABELS = {
    [QUESTION_TYPES.BEHAVIORAL]: 'Behavioral',
    [QUESTION_TYPES.TECHNICAL]: 'Technical',
    [QUESTION_TYPES.SITUATIONAL]: 'Situational', 
    [QUESTION_TYPES.COMPETENCY]: 'Competency',
    [QUESTION_TYPES.LEADERSHIP]: 'Leadership & Management',
    [QUESTION_TYPES.PROBLEM_SOLVING]: 'Problem Solving',
    [QUESTION_TYPES.CREATIVITY]: 'Creativity & Innovation',
    [QUESTION_TYPES.CONFLICT]: 'Conflict Resolution',
    [QUESTION_TYPES.MOTIVATION]: 'Motivation & Values',
    [QUESTION_TYPES.CULTURE]: 'Culture Fit',
    [QUESTION_TYPES.GROWTH]: 'Growth & Learning',
    [QUESTION_TYPES.STRESS]: 'Stress Management',
    [QUESTION_TYPES.COMMUNICATION]: 'Communication Skills',
    [QUESTION_TYPES.TIME_MANAGEMENT]: 'Time Management',
    [QUESTION_TYPES.TEAMWORK]: 'Teamwork & Collaboration',
    [QUESTION_TYPES.INTERVIEW_ESSENTIALS]: 'Interview Essentials',
    [QUESTION_TYPES.ADAPTABILITY]: 'Adaptability & Change',
    [QUESTION_TYPES.CUSTOMER_FOCUS]: 'Customer Focus',
    [QUESTION_TYPES.ETHICS]: 'Ethics & Integrity',
    [QUESTION_TYPES.SALARY]: 'Salary Negotiation'
};

// Legacy basic types (for backwards compatibility)
const BASIC_QUESTION_TYPES = [
    QUESTION_TYPES.BEHAVIORAL,
    QUESTION_TYPES.TECHNICAL,
    QUESTION_TYPES.SITUATIONAL,
    QUESTION_TYPES.INTERVIEW_ESSENTIALS, // Replaces old 'experience' and 'strengths_weaknesses'
    QUESTION_TYPES.COMPETENCY
];

// Helper function to get formatted label
function getQuestionTypeLabel(type) {
    return QUESTION_TYPE_LABELS[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ') : 'General');
}

// Question type context definitions for AI generation
const QUESTION_TYPE_CONTEXTS = {
    [QUESTION_TYPES.BEHAVIORAL]: `BEHAVIORAL QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions asking for SPECIFIC PAST EXPERIENCES/STORIES from their work history.
✅ MUST use these starters ONLY: "Tell me about a time when you..." / "Give me an example of when you..." / "Describe a situation where you..." / "Share an experience when you..."
✅ EXAMPLES: "Tell me about a time when you had to deal with a difficult colleague" / "Give me an example of when you failed at something and how you handled it"

🚫 FORBIDDEN - DO NOT GENERATE:
- Technical skill questions ("What's your experience with...")
- Hypothetical scenarios ("What would you do if...")
- General approach questions ("How do you handle...")
- Opinion questions ("What do you think about...")

BEHAVIORAL = PAST STORIES ONLY. Must ask for actual events that happened in their career.`,

    [QUESTION_TYPES.TECHNICAL]: `TECHNICAL QUESTIONS ONLY - STRICT REQUIREMENT:
MANDATORY: Generate ONE highly specific technical question anchored to the target role and the provided job description and/or resume.
MUST use concrete technologies, systems, data types, constraints, scale, or workflows that appear in the context.
If context is thin, infer common tools and workflows for that role and still be specific.
DO NOT introduce unrelated industries, regulations, or domains not present in the context.

REQUIREMENTS:
- Ask about design decisions, debugging, optimization, implementation details, tradeoffs, edge cases, or real-world constraints.
- Make the question job-specific, not generic.
- Keep it concise (1-2 sentences).

FORBIDDEN:
- Behavioral story questions ("Tell me about a time...")
- Purely generic skill checks ("What's your experience with X?") without context
- Soft skills questions (teamwork, communication, leadership)
- Vague or broad prompts
- Cross-industry references not implied by the role or job description

TECHNICAL = DETAILED, ROLE-SPECIFIC TECHNICAL DEPTH.`,

    [QUESTION_TYPES.SITUATIONAL]: `SITUATIONAL QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY HYPOTHETICAL future scenarios that test problem-solving and decision-making.
✅ MUST use these starters ONLY: "What would you do if..." / "How would you handle..." / "Imagine you're faced with..." / "If you encountered..."
✅ EXAMPLES: "What would you do if a key project was behind schedule?" / "How would you handle a situation where two team members are in conflict?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Past experience questions ("Tell me about a time...")
- Technical skill questions ("What's your experience with...")
- General approach questions without scenarios
- Opinion-based questions

SITUATIONAL = HYPOTHETICAL SCENARIOS ONLY. Must present future situations requiring decisions.`,

    [QUESTION_TYPES.COMPETENCY]: `COMPETENCY QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about WORK STYLE, PERSONAL APPROACH, and PROFESSIONAL QUALITIES.
✅ MUST use these starters ONLY: "How do you..." / "What's your approach to..." / "How would you describe your..." / "What's your method for..."
✅ EXAMPLES: "How do you prioritize competing deadlines?" / "What's your approach to giving feedback?" / "How do you stay organized?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Behavioral story questions ("Tell me about a time...")
- Technical skill questions ("What's your experience with...")
- Hypothetical scenarios ("What would you do if...")
- Past experience questions

COMPETENCY = WORK STYLE/APPROACH ONLY. Must ask about their general professional methodology and qualities.`,

    [QUESTION_TYPES.LEADERSHIP]: `LEADERSHIP & MANAGEMENT QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about LEADERSHIP, TEAM MANAGEMENT, DELEGATION, and INFLUENCE.
✅ MUST focus on: Leading teams, managing people, driving change, influencing without authority, mentoring, decision-making
✅ EXAMPLES: "How do you motivate underperforming team members?" / "Tell me about a time you had to lead through change" / "How do you delegate effectively?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Technical skill questions
- General behavioral questions not about leadership
- Hypothetical scenarios unrelated to leadership
- Basic competency questions

LEADERSHIP = MANAGEMENT & INFLUENCE ONLY. Must test leadership capabilities and management approach.`,

    [QUESTION_TYPES.PROBLEM_SOLVING]: `PROBLEM SOLVING QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about ANALYTICAL THINKING, PROBLEM-SOLVING APPROACHES, and CRITICAL THINKING.
✅ MUST focus on: Breaking down complex problems, root cause analysis, creative solutions, analytical methods
✅ EXAMPLES: "Walk me through how you'd diagnose a 40% drop in customer satisfaction" / "How do you approach problems with incomplete information?"

🚫 FORBIDDEN - DO NOT GENERATE:
- General behavioral questions
- Technical tool questions
- Leadership/management questions
- Simple situational questions

PROBLEM SOLVING = ANALYTICAL THINKING ONLY. Must test problem-solving methodology and critical thinking.`,

    [QUESTION_TYPES.CREATIVITY]: `CREATIVITY & INNOVATION QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about CREATIVE THINKING, INNOVATION, and THINKING OUTSIDE THE BOX.
✅ MUST focus on: Innovation initiatives, creative solutions, challenging status quo, new ideas implementation
✅ EXAMPLES: "What's the most innovative solution you've implemented?" / "How do you foster creativity in routine work?" / "Tell me about a time you challenged conventional thinking"

🚫 FORBIDDEN - DO NOT GENERATE:
- Standard behavioral questions
- Technical implementation questions
- Process-focused questions
- Traditional problem-solving questions

CREATIVITY = INNOVATION & ORIGINAL THINKING ONLY. Must explore creative mindset and innovation capacity.`,

    [QUESTION_TYPES.CONFLICT]: `CONFLICT RESOLUTION QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about HANDLING CONFLICTS, DISAGREEMENTS, and DIFFICULT CONVERSATIONS.
✅ MUST focus on: Resolving disputes, managing disagreements, difficult conversations, negotiation, finding common ground
✅ EXAMPLES: "How do you handle disagreements with your manager?" / "Tell me about resolving a conflict between team members" / "Describe a difficult conversation you navigated successfully"

🚫 FORBIDDEN - DO NOT GENERATE:
- General teamwork questions
- Leadership questions not about conflict
- Technical questions
- Hypothetical scenarios not about conflict

CONFLICT = DISPUTE RESOLUTION ONLY. Must test conflict management and interpersonal navigation skills.`,

    [QUESTION_TYPES.MOTIVATION]: `MOTIVATION & VALUES QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about PERSONAL MOTIVATION, VALUES, DRIVERS, and CAREER PURPOSE.
✅ MUST focus on: What drives them, core values, career motivations, passion areas, work meaning
✅ EXAMPLES: "What motivates you beyond compensation?" / "What values are non-negotiable in your work?" / "What aspect of this role excites you most?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Technical skill questions
- Past experience questions
- Problem-solving questions
- General behavioral questions

MOTIVATION = DRIVERS & VALUES ONLY. Must explore intrinsic motivation and personal values.`,

    [QUESTION_TYPES.CULTURE]: `CULTURE FIT QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about WORK ENVIRONMENT PREFERENCES, TEAM DYNAMICS, and ORGANIZATIONAL FIT.
✅ MUST focus on: Ideal work environment, team collaboration style, company culture preferences, work style
✅ EXAMPLES: "What type of work environment brings out your best?" / "How do you prefer to collaborate with colleagues?" / "What company culture elements are important to you?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Technical questions
- Individual achievement questions
- Specific skill questions
- Generic behavioral questions

CULTURE = ENVIRONMENT & FIT ONLY. Must assess cultural alignment and work environment preferences.`,

    [QUESTION_TYPES.GROWTH]: `GROWTH & LEARNING QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about LEARNING, DEVELOPMENT, GROWTH MINDSET, and CONTINUOUS IMPROVEMENT.
✅ MUST focus on: Learning from failure, skill development, growth mindset, feedback reception, self-improvement
✅ EXAMPLES: "How do you stay current in your field?" / "Tell me about a failure that taught you something valuable" / "How do you seek and incorporate feedback?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Current skill questions
- Past achievement questions
- Technical proficiency questions
- Static competency questions

GROWTH = LEARNING & DEVELOPMENT ONLY. Must explore learning agility and growth mindset.`,

    [QUESTION_TYPES.STRESS]: `STRESS MANAGEMENT QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about HANDLING PRESSURE, STRESS MANAGEMENT, and MAINTAINING PERFORMANCE UNDER STRESS.
✅ MUST focus on: Working under pressure, managing deadlines, stress coping strategies, maintaining quality under stress
✅ EXAMPLES: "How do you handle competing urgent deadlines?" / "Tell me about performing under extreme pressure" / "What's your approach to managing workplace stress?"

🚫 FORBIDDEN - DO NOT GENERATE:
- General time management questions
- Technical questions
- Leadership questions
- Simple organizational questions

STRESS = PRESSURE & RESILIENCE ONLY. Must test ability to maintain performance under challenging conditions.`,

    [QUESTION_TYPES.COMMUNICATION]: `COMMUNICATION SKILLS QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about VERBAL/WRITTEN COMMUNICATION, PRESENTATION SKILLS, and INTERPERSONAL COMMUNICATION.
✅ MUST focus on: Communication clarity, presentation abilities, written communication, active listening, stakeholder communication
✅ EXAMPLES: "How do you explain complex technical concepts to non-technical stakeholders?" / "Tell me about a time when clear communication prevented a major issue" / "How do you tailor your communication style to different audiences?"

🚫 FORBIDDEN - DO NOT GENERATE:
- General teamwork questions
- Conflict resolution questions
- Leadership questions
- Technical documentation questions

COMMUNICATION = VERBAL/WRITTEN SKILLS ONLY. Must test communication effectiveness and clarity.`,

    [QUESTION_TYPES.TIME_MANAGEMENT]: `TIME MANAGEMENT QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about PRIORITIZATION, SCHEDULING, DEADLINE MANAGEMENT, and PRODUCTIVITY.
✅ MUST focus on: Task prioritization, deadline management, multitasking, productivity methods, time allocation
✅ EXAMPLES: "How do you prioritize when everything seems urgent?" / "Tell me about managing multiple projects with conflicting deadlines" / "What's your system for staying organized and on schedule?"

🚫 FORBIDDEN - DO NOT GENERATE:
- General stress management questions
- Project management questions
- Leadership delegation questions
- Technical planning questions

TIME MANAGEMENT = PRIORITIZATION & SCHEDULING ONLY. Must test organizational and time management capabilities.`,

    [QUESTION_TYPES.TEAMWORK]: `TEAMWORK & COLLABORATION QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about WORKING IN TEAMS, COLLABORATION, and COLLECTIVE ACHIEVEMENT.
✅ MUST focus on: Team dynamics, collaboration methods, supporting colleagues, group projects, cross-functional work
✅ EXAMPLES: "Tell me about a successful team project you contributed to" / "How do you handle working with difficult team members?" / "Describe your ideal team dynamic"

🚫 FORBIDDEN - DO NOT GENERATE:
- Individual achievement questions
- Leadership/management questions
- Conflict resolution questions
- Communication-only questions

TEAMWORK = COLLABORATION & TEAM DYNAMICS ONLY. Must test ability to work effectively with others.`,

    [QUESTION_TYPES.INTERVIEW_ESSENTIALS]: `INTERVIEW ESSENTIALS QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY classic, fundamental interview questions that appear in virtually every interview.
✅ MUST focus on: Strengths/weaknesses, "Tell me about yourself", career goals, why this role/company, where you see yourself in 5 years, biggest accomplishment/failure, what others say about you
✅ EXAMPLES: "What are your greatest strengths and weaknesses?" / "Tell me about yourself" / "Why do you want this role?" / "Where do you see yourself in 5 years?" / "What's your biggest professional accomplishment?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Technical skill questions
- Situational hypotheticals  
- Behavioral story questions (unless classic like "biggest failure")
- Specialized competency questions

INTERVIEW ESSENTIALS = FUNDAMENTAL QUESTIONS ONLY. Must ask the classic questions every candidate should expect.`,

    [QUESTION_TYPES.ADAPTABILITY]: `ADAPTABILITY & CHANGE QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about HANDLING CHANGE, FLEXIBILITY, and ADAPTING TO NEW SITUATIONS.
✅ MUST focus on: Adapting to change, flexibility in approach, pivoting strategies, learning new things quickly, resilience
✅ EXAMPLES: "Tell me about adapting to a major organizational change" / "How do you handle sudden priority shifts?" / "Describe a time you had to quickly learn something new"

🚫 FORBIDDEN - DO NOT GENERATE:
- General learning questions
- Stress management questions
- Technical upgrade questions
- Growth mindset questions

ADAPTABILITY = CHANGE & FLEXIBILITY ONLY. Must test ability to adapt and thrive in changing environments.`,

    [QUESTION_TYPES.CUSTOMER_FOCUS]: `CUSTOMER FOCUS QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about CUSTOMER SERVICE, CLIENT RELATIONSHIPS, and USER-CENTRIC THINKING.
✅ MUST focus on: Customer satisfaction, client relationships, user empathy, service excellence, customer problem-solving
✅ EXAMPLES: "How do you handle difficult customer complaints?" / "Tell me about exceeding customer expectations" / "How do you balance customer needs with business constraints?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Internal stakeholder questions
- Sales/revenue questions
- Product development questions
- General relationship questions

CUSTOMER FOCUS = CLIENT SERVICE & SATISFACTION ONLY. Must test customer-centric mindset and service orientation.`,

    [QUESTION_TYPES.ETHICS]: `ETHICS & INTEGRITY QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about ETHICAL DILEMMAS, INTEGRITY, PROFESSIONAL STANDARDS, and MORAL DECISION-MAKING.
✅ MUST focus on: Ethical challenges, integrity in difficult situations, professional standards, confidentiality, moral courage
✅ EXAMPLES: "Tell me about a time you had to choose between what was easy and what was right" / "How would you handle discovering a colleague was falsifying data?" / "Describe a situation where you had to maintain confidentiality despite pressure"

🚫 FORBIDDEN - DO NOT GENERATE:
- General behavioral questions
- Customer relationship questions
- Technical compliance questions
- Legal/regulatory questions

ETHICS = INTEGRITY & MORAL DECISIONS ONLY. Must test ethical reasoning and professional integrity.`,

    [QUESTION_TYPES.SALARY]: `SALARY NEGOTIATION QUESTIONS ONLY - STRICT REQUIREMENT:
🚨 MANDATORY: Generate ONLY questions about COMPENSATION EXPECTATIONS, SALARY REQUIREMENTS, and VALUE PROPOSITION.
✅ MUST focus on: Salary expectations, compensation justification, value contribution, negotiation approach
✅ EXAMPLES: "What are your salary expectations for this role?" / "How do you determine your market value?" / "What factors beyond salary are important in your compensation package?"

🚫 FORBIDDEN - DO NOT GENERATE:
- Performance questions
- Achievement questions
- General motivation questions
- Benefits-only questions

SALARY = COMPENSATION & NEGOTIATION ONLY. Must explore compensation expectations and negotiation approach.`
};

// Helper function to get question type context
function getQuestionTypeContext(type) {
    return QUESTION_TYPE_CONTEXTS[type] || '';
}

// Helper function to format question type for display (handles underscores and dashes)
function formatQuestionType(type) {
    if (!type) return 'General';
    return type.split(/[-_]/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Export for Node.js (server-side)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QUESTION_TYPES,
        ALL_QUESTION_TYPES,
        QUESTION_TYPE_LABELS,
        QUESTION_TYPE_CONTEXTS,
        BASIC_QUESTION_TYPES,
        getQuestionTypeLabel,
        getQuestionTypeContext,
        formatQuestionType
    };
}

// Export for browser (client-side)
if (typeof window !== 'undefined') {
    window.QuestionTypesConfig = {
        QUESTION_TYPES,
        ALL_QUESTION_TYPES,
        QUESTION_TYPE_LABELS,
        QUESTION_TYPE_CONTEXTS,
        BASIC_QUESTION_TYPES,
        getQuestionTypeLabel,
        getQuestionTypeContext,
        formatQuestionType
    };
}
