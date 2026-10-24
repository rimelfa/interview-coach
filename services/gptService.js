const OpenAI = require('openai');
const winston = require('winston');
const costTracker = require('./costTracker');

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

class GPTService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = 'gpt-4o-mini';
  }
  
  async generateSuggestionStream({ conversationHistory, cvContext, jobDescription, lastQuestion, onChunk }) {
    try {
      const systemPrompt = this.buildSystemPrompt(cvContext, jobDescription);
      const conversationContext = this.formatConversationHistory(conversationHistory);
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Based on the following conversation and the interviewer's last question, provide a response suggestion that sounds like natural, professional conversation - as if the candidate is speaking out loud in an interview.
          
          Conversation so far:
          ${conversationContext}
          
          Interviewer's last question: "${lastQuestion}"
          
          Please provide a response that:
          1. Directly answers the question
          2. Uses conversational language with contractions (I've, I'd, it's, etc.)
          3. ONLY reference specific CV experiences when:
             - The question asks about past experience/projects
             - A concrete example would make the answer stronger
             - You need to demonstrate technical expertise
          4. For general questions (teamwork, challenges, interests), answer naturally without forcing CV references
          5. Uses the STAR method for behavioral questions when asking about specific situations
          6. Sounds like natural speech, not formal writing
          7. Is concise but comprehensive (2-3 paragraphs max)
          8. Shows personality and authenticity, not just reciting CV points
          
          Response suggestion:`
        }
      ];
      
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 400,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
        stream: true
      });
      
      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }
      
      logger.info('Generated streaming suggestion for question');
      return fullResponse;
      
    } catch (error) {
      logger.error('Error generating streaming GPT suggestion:', error);
      if (onChunk) {
        onChunk('I apologize, but I\'m having trouble generating a suggestion at the moment. Please try answering based on your experience and the job requirements.');
      }
      return 'I apologize, but I\'m having trouble generating a suggestion at the moment. Please try answering based on your experience and the job requirements.';
    }
  }

  async generateSuggestion({ conversationHistory, cvContext, jobDescription, lastQuestion }) {
    try {
      const systemPrompt = this.buildSystemPrompt(cvContext, jobDescription);
      const conversationContext = this.formatConversationHistory(conversationHistory);
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Based on the following conversation and the interviewer's last question, provide a response suggestion that sounds like natural, professional conversation - as if the candidate is speaking out loud in an interview.
          
          Conversation so far:
          ${conversationContext}
          
          Interviewer's last question: "${lastQuestion}"
          
          Please provide a response that:
          1. Directly answers the question
          2. Uses conversational language with contractions (I've, I'd, it's, etc.)
          3. ONLY reference specific CV experiences when:
             - The question asks about past experience/projects
             - A concrete example would make the answer stronger
             - You need to demonstrate technical expertise
          4. For general questions (teamwork, challenges, interests), answer naturally without forcing CV references
          5. Uses the STAR method for behavioral questions when asking about specific situations
          6. Sounds like natural speech, not formal writing
          7. Is concise but comprehensive (2-3 paragraphs max)
          8. Shows personality and authenticity, not just reciting CV points
          
          Response suggestion:`
        }
      ];
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 400,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      });
      
      const suggestion = completion.choices[0].message.content.trim();
      logger.info('Generated suggestion for question');
      
      return suggestion;
      
    } catch (error) {
      logger.error('Error generating GPT suggestion:', error);
      return 'I apologize, but I\'m having trouble generating a suggestion at the moment. Please try answering based on your experience and the job requirements.';
    }
  }
  
  buildSystemPrompt(cvContext, jobDescription) {
    let prompt = `You are an expert interview coach helping a candidate prepare for a job interview. 
    You provide concise, relevant, and professional yet conversational response suggestions based on the candidate's background and the job requirements.
    
    Your suggestions should:
    - Sound like natural, spoken conversation (not formal written text)
    - Be professional but approachable and personable
    - Use contractions and casual transitions (I've, I'd, you know, actually, etc.)
    - Feel like how someone would actually speak in an interview
    
    CV USAGE GUIDELINES:
    - Use the candidate's CV knowledge to inform your technical understanding and expertise level
    - Only explicitly reference specific CV experiences when:
      * The question directly asks about past experience
      * A concrete example would strengthen the answer
      * Discussing technical skills that need validation
    - For general questions (culture fit, working style, etc.), answer naturally without forcing CV references
    - Let the CV inform your technical depth but don't quote from it unless relevant
    
    IMPORTANT: The candidate has experience as a senior data analyst with expertise in:
    - Marketing analytics projects and campaigns
    - UEFA (sports analytics) projects and initiatives
    - MMM (Marketing Mix Modeling) experience and implementations
    - Marketing funnel analysis and optimization projects
    Also draw from relevant data analyst experience and foundational analytics work to show career progression and depth of expertise.
    These should be highlighted as core strengths and differentiators in data analytics experience.`;
    
    if (cvContext) {
      prompt += `\n\nCandidate's Background/CV:\n${cvContext}`;
    }
    
    if (jobDescription) {
      prompt += `\n\nJob Description:\n${jobDescription}`;
    }
    
    return prompt;
  }
  
  formatConversationHistory(history) {
    const recentHistory = history.slice(-10);
    
    return recentHistory
      .map(entry => `${entry.speaker}: ${entry.text}`)
      .join('\n');
  }
  
  async generateFollowUpQuestions(conversationHistory) {
    try {
      const context = this.formatConversationHistory(conversationHistory);
      
      const messages = [
        {
          role: 'system',
          content: 'You are an interview preparation assistant. Generate potential follow-up questions an interviewer might ask based on the conversation.'
        },
        {
          role: 'user',
          content: `Based on this interview conversation, suggest 3 likely follow-up questions the interviewer might ask:
          
          ${context}
          
          Provide the questions in a numbered list.`
        }
      ];
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.8,
        max_tokens: 200
      });
      
      return completion.choices[0].message.content.trim();
      
    } catch (error) {
      logger.error('Error generating follow-up questions:', error);
      return null;
    }
  }
  
  async generateSuggestionTitle(question) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, descriptive titles for interview questions. Generate a short title (3-6 words) that captures the essence of the question.'
        },
        {
          role: 'user',
          content: `Create a short, descriptive title for this interview question: "${question}"\n\nProvide only the title, nothing else.`
        }
      ];
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 20
      });
      
      return completion.choices[0].message.content.trim().replace(/['"]/g, '');
      
    } catch (error) {
      logger.error('Error generating suggestion title:', error);
      return 'Interview Question';
    }
  }
  
  async generateChatCompletion(messages, options = {}) {
    try {
      const {
        temperature = 0.7,
        max_tokens = 500,
        stream = false,
        ...otherOptions
      } = options;
      
      if (stream) {
        const streamResponse = await this.openai.chat.completions.create({
          model: this.model,
          messages,
          temperature,
          max_tokens,
          stream: true,
          ...otherOptions
        });
        
        return streamResponse;
      } else {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages,
          temperature,
          max_tokens,
          ...otherOptions
        });
        
        return completion.choices[0].message.content.trim();
      }
    } catch (error) {
      logger.error('Error generating chat completion:', error);
      throw error;
    }
  }

  async generateAnswerFeedback({ question, answer, cvContext = '', jobDescription = '', userName = null }) {
    const candidateName = userName ? userName.split(' ')[0] : null;
    const nameInstruction = candidateName
      ? `The candidate's name is ${candidateName}. You may use their first name naturally in the suggested answer (e.g. "Hi, I'm ${candidateName}…") where it would sound natural, such as an introduction.`
      : `You do not know the candidate's name. If the suggested answer calls for a name (e.g. an introduction), write "[Your name]" as a placeholder.`;
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `You are an expert interview coach giving feedback directly to the candidate. Use "you" and "your" throughout. NEVER say "the candidate" or refer to them in the third person.
${nameInstruction}

Question asked: "${question}"
What they said: "${answer}"
CV context: ${(cvContext || '').slice(0, 800)}
Role: ${(jobDescription || '').slice(0, 400)}

Respond with JSON only:
{
  "score": <integer 1-10 reflecting how well the answer addressed the question — 10 = excellent, structured, concrete; 1 = off-topic or near-silent>,
  "suggested_answer": "A complete, polished 4-6 sentence answer showing exactly how you should respond — open with a direct point, back it with a concrete example from your background, quantify impact where possible, close with a forward-looking or reflective statement. Natural and confident, as if spoken aloud.",
  "tips": [
    "A full sentence addressing you directly — one specific thing you should add or change, referencing what you actually said.",
    "A full sentence on a missed opportunity or weakness in your answer.",
    "A full sentence on delivery or structure — or what you did well and should keep doing."
  ]
}

All tips must be full sentences addressed directly to you. Include as many tips as are genuinely useful (up to 5), but do not pad with weak observations.`
        }],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      }, { timeout: 20000, maxRetries: 1 });
      costTracker.recordChat({ model: 'gpt-4o-mini', usage: completion.usage, purpose: 'answer-feedback' });
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error generating answer feedback:', error);
      return { suggested_answer: '', tips: [] };
    }
  }

  async practiceQuestion({ cvContext = '', jobDescription = '', history = [], kind = 'next', interviewer = 0, type = 'general', difficulty = 'mid', pressure = 'standard', lastAnswer = '', language = 'en', additionalInfo = '' }) {
    const names = ['Daniel', 'Priya'];
    const name = names[interviewer] || 'Daniel';
    const other = names[interviewer === 0 ? 1 : 0];
    const convo = history.slice(-14).map(h =>
      `${h.role === 'candidate' ? 'Candidate' : `Interviewer ${h.name || ''}`.trim()}: ${h.text}`
    ).join('\n');
    const isFirstQ = history.length === 0;

    // Topic style for 'next' questions — must match the chosen interview type
    const nextTopicStyle = {
      general:    'pick something concrete from the JD or CV — a competency, project type, stakeholder situation, or technical skill. Vary between behavioural situations and technical depth.',
      behavioral: 'ask a BEHAVIOURAL question in STAR format ("Tell me about a time when…"). Stay exclusively on past experiences, decisions, and outcomes. Do NOT ask about technical tools, methodologies, or how systems work.',
      technical:  'ask about a specific technical tool, methodology, or problem-solving scenario from the JD not yet covered.',
      competency: 'target a core competency from the JD and ask the candidate to demonstrate it through a past experience.'
    }[type] || 'pick something concrete from the JD or CV.';

    // Only acknowledge the previous speaker if there is actually conversation history
    const handover = !isFirstQ
      ? `If you are taking over from ${other}, acknowledge it naturally in ONE word or phrase — e.g. "Thanks for that." or "Right." — then move straight to your question. `
      : '';

    const typeStyle = {
      general:    'Mix of behavioural and technical questions — vary the format.',
      behavioral: 'BEHAVIOURAL ONLY. Every question must use STAR format ("Tell me about a time when…"). Ask exclusively about past situations, decisions, and outcomes. Do NOT ask about technical tools or methodologies.',
      technical:  'TECHNICAL FOCUS. Probe specific tools, methodologies, and problem-solving from the JD. Skip generic behavioural questions.',
      competency: 'COMPETENCY-BASED. Target the core competencies listed in the JD and ask the candidate to demonstrate them through experience.'
    }[type] || 'General mix.';

    const kindNote = {
      opener: 'Open the interview: greet the candidate warmly in one short sentence, then ask them to introduce themselves / walk through their background.',
      next: `Ask about a NEW area not yet covered — ${nextTopicStyle} ${handover}NEVER say "let me switch gears", "let's shift", or any variation of that phrase.`,
      followup: `The candidate just said: "${(lastAnswer || '').slice(0, 400)}"\n\nFirst, judge whether this answer is coherent and relevant to the interview:\n- If it is INCOHERENT, nonsensical, completely off-topic, or makes no sense in a professional interview context: do NOT follow up on the content. Instead, respond as a real interviewer would — briefly acknowledge it with a SHORT neutral phrase — vary these naturally each time ("I see.", "Okay.", "Noted.", "Right.", "Fair enough.", "Alright.", "Got it.", "Okay, moving on." etc. — never repeat the same phrase twice in a row) — then professionally redirect to a NEW relevant question about their CV or the role, as if moving on.\n- If it is a REAL, relevant answer: dig into something SPECIFIC they mentioned — a project, a number they didn't give, a decision they made, something they glossed over. Pick the most interesting loose thread and pull on it. One pointed follow-up only. Do NOT ask a generic question — reference what they actually said.\n\nCRITICAL: Only refer to what the candidate EXPLICITLY SAID in the words quoted above. Do NOT invent, infer, or assume any details, numbers, achievements, percentages, or facts that are not literally present in their answer. If their answer is vague or lacks specifics, ask them to elaborate or be more specific rather than inventing specifics yourself.`
    }[kind] || '';

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `You are ${name}, one of two interviewers (${names.join(' and ')}) on a panel running a live job interview. You speak naturally and conversationally like a real senior interviewer — never scripted or stiff.

WHO IS WHO: every "Candidate:" line below is the interviewee. ${other} is your co-interviewer. Never address the candidate as "${other}". Do not say anyone's name out loud.

LANGUAGE: Conduct the ENTIRE interview in ${{ en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', it: 'Italian', ar: 'Arabic', zh: 'Mandarin Chinese' }[language] || 'English'}. Every word you say must be in that language.

BANNED PHRASES — never say these: "let me switch gears", "let's switch gears", "I'd like to switch gears", "shifting gears", "let's pivot", "moving on", "let's move on to".

JOB DESCRIPTION:
${(jobDescription || 'A professional role requiring strong communication and relevant experience.').slice(0, 1800)}

CANDIDATE CV:
${(cvContext || '').slice(0, 1800)}

INTERVIEW SO FAR:
${convo || '(not started yet)'}

INTERVIEW STYLE:
- Type: ${typeStyle}
- Seniority: ${{ junior: 'Candidate is early career. Ask foundational questions, be supportive.', mid: 'Candidate has 3-6 years experience. Expect concrete examples and outcomes.', senior: 'Senior/lead level. Probe for strategy, leadership impact, and quantified results. Push back on vague answers.' }[difficulty] || 'Mid-level.'}
- Pressure: ${{ relaxed: 'Keep the pace relaxed and supportive.', standard: 'Normal interview energy.', high: 'Be direct and slightly challenging. Push back if the answer is vague or missing numbers.' }[pressure] || 'Standard.'}${additionalInfo ? `\n- Candidate focus areas: ${additionalInfo.slice(0, 300)}` : ''}

YOUR MOVE: ${kindNote}

Speak ONE question, at most ~45 words. Output ONLY the words you say out loud — no quotes, no stage directions, no name prefix.`
        }],
        temperature: 0.85,
        max_tokens: 130
      }, { timeout: 20000, maxRetries: 1 });
      costTracker.recordChat({ model: 'gpt-4o', usage: completion.usage, purpose: `practice-question-${kind}` });
      return completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      logger.error('Error generating practice question:', error);
      return kind === 'opener'
        ? 'Hi, thanks for joining us today. Could you walk me through your background and what you do in your current role?'
        : 'Can you tell me about a piece of work you are particularly proud of, and what your specific contribution was?';
    }
  }

  async practiceInterrupt({ history = [], interviewer = 0, language = 'en' }) {
    const names = ['Daniel', 'Priya'];
    const name = names[interviewer] || 'Daniel';
    const lastAnswer = [...history].reverse().find(h => h.role === 'candidate');
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `You are ${name}, an interviewer. The candidate is mid-answer and you are going to INTERRUPT them to follow up on something specific they just said.

What the candidate was saying:
"${(lastAnswer ? lastAnswer.text : '').slice(-600)}"

Pick ONE specific detail explicitly stated in the text above and interject naturally to dig into it. Start with a brief interjection ("Sorry — ", "Hold on — ", "Can I stop you there — ") then ask your pointed follow-up. Max 22 words total. Do not say "let me switch gears".

CRITICAL: ONLY reference something the candidate actually said in the text above. Do NOT invent, infer, or assume any detail not explicitly present. If no specific detail exists yet, ask them to carry on.

Output only the spoken words.`
        }],
        temperature: 0.9,
        max_tokens: 60
      }, { timeout: 20000, maxRetries: 1 });
      costTracker.recordChat({ model: 'gpt-4o-mini', usage: completion.usage, purpose: 'practice-interrupt' });
      return completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      logger.error('Error generating practice interruption:', error);
      return 'Sorry to jump in — can you give me the actual numbers on that?';
    }
  }
}

module.exports = new GPTService();