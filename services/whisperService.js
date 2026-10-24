const OpenAI = require('openai');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

class WhisperService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.ensureTempDir();
    
    // Add buffering properties as per corrections.md
    this.audioBuffer = [];
    this.silenceTimeout = null;
    this.isProcessing = false;
    this.recentTranscriptions = []; // Track recent transcriptions for deduplication
  }
  
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating temp directory:', error);
    }
  }
  
  async transcribeLive(audioChunk, contextText = '') {
    // Fast, lightweight transcription for immediate word display
    let tempFile = null;
    
    try {
      // Skip very short audio chunks to prevent hallucinations
      if (audioChunk.buffer.length < 8192) { // Reduced for responsiveness
        return { text: '', speaker: 'unknown' };
      }
      
      // Check if audio chunk is mostly silence to prevent hallucinations
      if (this.isAudioMostlySilence(audioChunk.buffer)) {
        return { text: '', speaker: 'unknown' };
      }
      
      const mimeType = audioChunk.mimeType || 'audio/wav';
      const extension = this.getExtensionFromMimeType(mimeType);
      tempFile = path.join(this.tempDir, `live_${uuidv4()}.${extension}`);
      await fs.writeFile(tempFile, audioChunk.buffer);
      
      // Use simplified parameters for speed
      const transcription = await this.openai.audio.transcriptions.create({
        file: require('fs').createReadStream(tempFile),
        model: 'whisper-1',
        language: 'en',
        temperature: 0.2, // Low temperature to capture nuances while minimizing hallucinations
        response_format: 'verbose_json', // Get more detailed output
        prompt: `Interview conversation. Include all vocal sounds like "um", "uh", "hmm", "mmm", pauses, hesitations, and filler words. Preserve natural speech patterns including stuttering, repetition, and emotional expressions. ${contextText ? `Previous context: ${contextText.slice(-200)}` : ''}`
      });
      
      // Handle verbose_json format
      let transcriptionText = '';
      if (typeof transcription === 'object' && transcription.text) {
        transcriptionText = transcription.text;
      } else if (typeof transcription === 'string') {
        transcriptionText = transcription;
      }
      
      const cleanedText = this.cleanTranscriptionText(transcriptionText);
      
      return {
        text: cleanedText,
        isLive: true
      };
      
    } catch (error) {
      logger.error('Error in live transcription:', error);
      return {
        text: '',
        error: error.message
      };
    } finally {
      if (tempFile) {
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          logger.error('Error deleting live temp file:', error);
        }
      }
    }
  }
  
  async transcribe(audioChunks, conversationHistory = [], recentSuggestions = []) {
    let tempFile = null;
    
    try {
      // Process single chunk
      const audioChunk = audioChunks[0];
      
      // Skip very short audio chunks to prevent hallucinations
      if (audioChunk.buffer.length < 8192) {
        return { text: '', speaker: 'unknown' };
      }
      
      // Check if audio chunk is mostly silence to prevent hallucinations
      if (this.isAudioMostlySilence(audioChunk.buffer)) {
        return { text: '', speaker: 'unknown' };
      }
      
      // Create temporary file with the correct extension based on mime type
      const mimeType = audioChunk.mimeType || 'audio/webm';
      const extension = this.getExtensionFromMimeType(mimeType);
      tempFile = path.join(this.tempDir, `${uuidv4()}.${extension}`);
      await fs.writeFile(tempFile, audioChunk.buffer);
      
      logger.info(`Created temp file: ${tempFile}, size: ${audioChunk.buffer.length} bytes, mime: ${mimeType}`);
      
      // Try using the file path directly - simplified for speed
      const transcription = await this.openai.audio.transcriptions.create({
        file: require('fs').createReadStream(tempFile),
        model: 'whisper-1',
        language: 'en',
        response_format: 'verbose_json',
        temperature: 0.0, // Keep low for full transcription
        prompt: 'Professional interview conversation between interviewer and candidate. Complete thoughts and sentences.' // Better prompt for accuracy
      });
      
      logger.info(`Transcription completed: ${transcription.text}`);
      
      const cleanedText = this.cleanTranscriptionText(transcription.text);
      
      return {
        text: cleanedText,
        language: transcription.language || 'en',
        duration: audioChunk.duration
      };
      
    } catch (error) {
      logger.error('Error in Whisper transcription:', error);
      
      return {
        text: '',
        error: error.message
      };
    } finally {
      // Clean up temp file
      if (tempFile) {
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          logger.error('Error deleting temp file:', error);
        }
      }
    }
  }
  
  async analyzeContent(text, conversationHistory = [], recentSuggestions = []) {
    try {
      const cleanText = text.toLowerCase().trim();
      
      // First check if this is reading from an AI suggestion
      const isReadingSuggestion = this.isReadingFromSuggestion(cleanText, recentSuggestions);
      if (isReadingSuggestion) {
        logger.info('Detected reading from AI suggestion');
        return {
          type: 'reading_suggestion',
          isInterviewQuestion: false
        };
      }
      
      // Check if this is a typical candidate response
      const candidateResponseIndicators = [
        'yes, so', 'absolutely', 'definitely', 'of course', 'sure',
        'well, i', 'so i', 'i think', 'i believe', 'i would say',
        'in my experience', 'in my previous role', 'in my current role',
        'i have worked', 'i worked', 'i\'ve been working',
        'my approach', 'my strategy', 'my background is',
        'thank you', 'thanks for', 'i appreciate'
      ];
      
      const startsWithCandidateResponse = candidateResponseIndicators.some(indicator => 
        cleanText.startsWith(indicator)
      );
      
      if (startsWithCandidateResponse) {
        logger.info('Detected candidate response pattern');
        return {
          type: 'candidate_response',
          isInterviewQuestion: false
        };
      }
      
      // Check for interview question patterns
      const isQuestion = this.detectInterviewQuestion(text, conversationHistory, recentSuggestions);
      
      if (isQuestion) {
        return {
          type: 'interview_question',
          isInterviewQuestion: true
        };
      }
      
      // Check for discussion/follow-up patterns
      const discussionPatterns = [
        'that\'s interesting', 'that\'s good', 'nice', 'great',
        'i see', 'okay', 'right', 'understood', 'makes sense',
        'let\'s move on', 'next question', 'moving forward'
      ];
      
      const isDiscussion = discussionPatterns.some(pattern => 
        cleanText.includes(pattern)
      );
      
      if (isDiscussion) {
        return {
          type: 'discussion',
          isInterviewQuestion: false
        };
      }
      
      // Default to general response
      return {
        type: 'general_response',
        isInterviewQuestion: false
      };
      
    } catch (error) {
      logger.error('Error analyzing content:', error);
      return {
        type: 'unknown',
        isInterviewQuestion: false
      };
    }
  }
  
  combineAudioData(audioChunks) {
    const buffers = audioChunks.map(chunk => chunk.buffer);
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const combined = Buffer.concat(buffers, totalLength);
    
    return {
      buffer: combined,
      duration: audioChunks.reduce((sum, chunk) => sum + chunk.duration, 0),
      mimeType: audioChunks[0]?.mimeType || 'audio/webm'
    };
  }
  
  getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3'
    };
    
    return mimeToExt[mimeType] || 'webm';
  }
  
  isReadingFromSuggestion(text, recentSuggestions) {
    if (!recentSuggestions || recentSuggestions.length === 0) return false;
    
    // Check if the text contains significant portions of recent suggestions
    for (const suggestion of recentSuggestions) {
      if (!suggestion || !suggestion.text) continue;
      
      const suggestionText = suggestion.text.toLowerCase();
      const words = text.split(/\s+/);
      const suggestionWords = suggestionText.split(/\s+/);
      
      // Check for word overlap
      let matchingWords = 0;
      for (const word of words) {
        if (word.length > 3 && suggestionWords.includes(word)) {
          matchingWords++;
        }
      }
      
      // If more than 40% of words match, likely reading from suggestion
      const overlapRatio = matchingWords / Math.max(words.length, 1);
      if (overlapRatio > 0.4) {
        return true;
      }
      
      // Check for exact phrase matches (3+ words)
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        if (phrase.length > 10 && suggestionText.includes(phrase)) {
          return true;
        }
      }
    }
    
    // Check for generic AI-generated phrases that suggest reading from suggestions
    const aiPhrases = [
      'the interviewer is asked',
      'work patterns that could inform',
      'skills and career background',
      'describe their work experience',
      'role you\'re seeking to fill',
      'aligns with the role',
      'it\'s a pleasure to discuss'
    ];
    
    for (const phrase of aiPhrases) {
      if (text.includes(phrase)) {
        return true;
      }
    }
    
    return false;
  }
  
  getFileExtension(buffer) {
    // Check file signatures to determine format
    const signature = buffer.slice(0, 12);
    
    // WebM signature
    if (signature.indexOf(Buffer.from('webm')) !== -1) {
      return 'webm';
    }
    
    // WAV signature
    if (signature.slice(0, 4).toString() === 'RIFF' && signature.slice(8, 12).toString() === 'WAVE') {
      return 'wav';
    }
    
    // OGG signature
    if (signature.slice(0, 4).toString() === 'OggS') {
      return 'ogg';
    }
    
    // Default to webm
    return 'webm';
  }
  
  convertToWav(audioBuffer) {
    // Simple WAV header creation for 16kHz mono audio
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    
    // Convert base64 decoded buffer to 16-bit PCM
    const audioData = new Int16Array(audioBuffer.length / 2);
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = audioBuffer.readInt16LE(i * 2);
    }
    
    const dataLength = audioData.length * bytesPerSample;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    
    const wavBuffer = Buffer.alloc(totalLength);
    let offset = 0;
    
    // RIFF header
    wavBuffer.write('RIFF', offset); offset += 4;
    wavBuffer.writeUInt32LE(totalLength - 8, offset); offset += 4;
    wavBuffer.write('WAVE', offset); offset += 4;
    
    // fmt chunk
    wavBuffer.write('fmt ', offset); offset += 4;
    wavBuffer.writeUInt32LE(16, offset); offset += 4; // chunk size
    wavBuffer.writeUInt16LE(1, offset); offset += 2;  // audio format (PCM)
    wavBuffer.writeUInt16LE(numChannels, offset); offset += 2;
    wavBuffer.writeUInt32LE(sampleRate, offset); offset += 4;
    wavBuffer.writeUInt32LE(byteRate, offset); offset += 4;
    wavBuffer.writeUInt16LE(blockAlign, offset); offset += 2;
    wavBuffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
    
    // data chunk
    wavBuffer.write('data', offset); offset += 4;
    wavBuffer.writeUInt32LE(dataLength, offset); offset += 4;
    
    // audio data
    for (let i = 0; i < audioData.length; i++) {
      wavBuffer.writeInt16LE(audioData[i], offset);
      offset += 2;
    }
    
    return wavBuffer;
  }
  
  detectInterviewQuestion(text, conversationHistory = [], recentSuggestions = []) {
    const cleanText = text.toLowerCase().trim();
    
    // First check if this is reading from an AI suggestion
    const isReadingSuggestion = this.isReadingFromSuggestion(cleanText, recentSuggestions);
    if (isReadingSuggestion) {
      logger.info('Detected reading from AI suggestion, not an interview question');
      return false;
    }
    
    // Check if this is a typical candidate response (not a question)
    const candidateResponseIndicators = [
      'yes, so', 'absolutely', 'definitely', 'of course', 'sure',
      'well, i', 'so i', 'i think', 'i believe', 'i would say',
      'in my experience', 'in my previous role', 'in my current role',
      'i have worked', 'i worked', 'i\'ve been working',
      'my approach', 'my strategy', 'my background is',
      'thank you', 'thanks for', 'i appreciate'
    ];
    
    const startsWithCandidateResponse = candidateResponseIndicators.some(indicator => 
      cleanText.startsWith(indicator)
    );
    
    if (startsWithCandidateResponse) {
      logger.info('Detected candidate response pattern, not an interview question');
      return false;
    }
    
    // Strong interview question patterns
    const strongQuestionPatterns = [
      // Direct question starters
      'tell me about', 'tell me more about', 'can you tell me',
      'can you explain', 'can you describe', 'can you walk me through',
      'how would you', 'how do you', 'how did you',
      'what is your', 'what are your', 'what would you',
      'why did you', 'why would you', 'why do you',
      'where do you see', 'where would you',
      'when have you', 'when did you',
      'which of your', 'which would you',
      
      // Behavioral questions
      'describe a time', 'give me an example', 'walk me through',
      'share an experience', 'tell me about a situation',
      
      // Common interview questions
      'what are your strengths', 'what are your weaknesses',
      'why do you want', 'why are you interested',
      'what motivates you', 'what drives you',
      'how do you handle', 'how do you deal with',
      'what would you do if', 'how would you approach',
      'what experience do you have', 'what skills do you',
      'what challenges have you', 'what accomplishments',
      
      // Follow-up questions
      'that\'s interesting', 'that\'s good', 'nice',
      'can you elaborate', 'can you expand on',
      'anything else', 'is there anything',
      'do you have any questions', 'any questions for'
    ];
    
    let questionScore = 0;
    
    // Check for strong question patterns
    strongQuestionPatterns.forEach(pattern => {
      if (cleanText.includes(pattern)) {
        questionScore += 2;
      }
    });
    
    // Questions usually end with question marks
    if (cleanText.endsWith('?')) {
      questionScore += 3;
    }
    
    // Questions are often shorter and more direct
    if (cleanText.length < 100 && cleanText.length > 10) {
      questionScore += 1;
    }
    
    // Check for question words at the start
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'can', 'could', 'would', 'should', 'do', 'did', 'does', 'have', 'has', 'had', 'is', 'are', 'was', 'were', 'tell', 'describe', 'explain', 'share'];
    const firstWord = cleanText.split(' ')[0];
    if (questionWords.includes(firstWord)) {
      questionScore += 2;
    }
    
    // Check for imperative forms (commands/requests)
    const imperativePatterns = ['tell', 'describe', 'explain', 'walk', 'give', 'share', 'discuss'];
    if (imperativePatterns.some(pattern => cleanText.startsWith(pattern))) {
      questionScore += 2;
    }
    
    // Avoid very short responses that might be acknowledgments
    if (cleanText.length < 5) {
      questionScore = 0;
    }
    
    // Check recent conversation context - if last message was a question and this is short, might be a follow-up
    if (conversationHistory.length > 0) {
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (lastMessage.isInterviewQuestion && cleanText.length < 30) {
        questionScore += 1;
      }
    }
    
    logger.info(`Interview question detection - Text: "${cleanText.substring(0, 50)}..." | Score: ${questionScore}`);
    
    return questionScore >= 3;
  }
  
  isAudioMostlySilence(audioBuffer) {
    // Check if audio buffer is mostly silence to prevent hallucinations
    const samples = new Int16Array(audioBuffer.buffer || audioBuffer);
    let totalEnergy = 0;
    const threshold = 1000; // Adjust based on testing
    
    for (let i = 0; i < samples.length; i++) {
      totalEnergy += Math.abs(samples[i]);
    }
    
    const averageEnergy = totalEnergy / samples.length;
    return averageEnergy < threshold;
  }
  
  cleanTranscriptionText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Common Whisper hallucination patterns (preserving natural speech patterns)
    const hallucinationPatterns = [
      /transcribed?\s+by\s+(?:https?:\/\/)?(?:www\.)?otter\.ai/gi,
      /transcribed?\s+by\s+eso/gi,
      /translated?\s+by\s+—/gi,
      /subtitle?d?\s+by\s+(?:https?:\/\/)?(?:www\.)?otter\.ai/gi,
      /transcribe\s+clearly\s+and\s+accurately/gi,
      /analyst/gi,
      /translation\s+by\s+eso/gi,
      /transcription\s+by\s+eso/gi,
      /subs?\s+by\s+(?:https?:\/\/)?(?:www\.)?otter\.ai/gi,
      /(?:https?:\/\/)?(?:www\.)?otter\.ai/gi,
      /beadaholique/gi,
      /zeoranger/gi,
      /please\s+find/gi,
      /video\s+description/gi,
      /interviewer'?s?\s+link/gi,
      /link\s+in\s+the/gi,
      /description/gi,
      /subscribe/gi,
      /like\s+and\s+subscribe/gi,
      /don'?t\s+forget\s+to/gi,
      /hit\s+the\s+bell/gi,
      /music/gi,
      /outro/gi,
      /intro/gi,
      /background\s+music/gi,
      // Note: We're preserving bracketed and parenthetical content as they may contain hesitations
      /^\s*$/, // Empty or whitespace only
      /^\s*\W+\s*$/ // Only punctuation
    ];
    
    let cleanedText = text.trim();
    
    // Remove hallucination patterns
    for (const pattern of hallucinationPatterns) {
      cleanedText = cleanedText.replace(pattern, '');
    }
    
    // Fix common transcription errors
    cleanedText = this.fixCommonTranscriptionErrors(cleanedText);
    
    // Clean up whitespace
    cleanedText = cleanedText
      .replace(/\s+/g, ' ')
      .replace(/[.]{2,}/g, '.')
      .replace(/[.]{1}\s*[.]{1}/g, '.') // Remove spaced periods
      .trim();
    
    // If text is too short after cleaning, likely a hallucination
    if (cleanedText.length < 3) {
      return '';
    }
    
    // Check for repetitive patterns (common in hallucinations)
    const words = cleanedText.split(' ');
    if (words.length > 1) {
      const uniqueWords = new Set(words);
      // If less than 40% unique words, likely repetitive hallucination
      if (uniqueWords.size / words.length < 0.4) {
        return '';
      }
    }
    
    return cleanedText;
  }
  
  fixCommonTranscriptionErrors(text) {
    // Fix common word boundary and spacing issues
    const corrections = [
      // Word boundary fixes
      [/\byour\s+self\b/gi, 'yourself'],
      [/\bmyself\s+/gi, 'myself '],
      [/\bhim\s+self\b/gi, 'himself'],
      [/\bher\s+self\b/gi, 'herself'],
      [/\bit\s+self\b/gi, 'itself'],
      [/\bout\s+side\b/gi, 'outside'],
      [/\bin\s+side\b/gi, 'inside'],
      [/\bup\s+stairs\b/gi, 'upstairs'],
      [/\bdown\s+stairs\b/gi, 'downstairs'],
      [/\bsome\s+thing\b/gi, 'something'],
      [/\bsome\s+one\b/gi, 'someone'],
      [/\bany\s+thing\b/gi, 'anything'],
      [/\bany\s+one\b/gi, 'anyone'],
      [/\bevery\s+thing\b/gi, 'everything'],
      [/\bevery\s+one\b/gi, 'everyone'],
      [/\bno\s+thing\b/gi, 'nothing'],
      [/\bno\s+one\b/gi, 'no one'], // Keep as two words
      [/\ba\s+lot\b/gi, 'a lot'],
      [/\bmean\s+while\b/gi, 'meanwhile'],
      
      // Professional/interview context fixes
      [/\bdata\s+base\b/gi, 'database'],
      [/\bwork\s+flow\b/gi, 'workflow'],
      [/\btime\s+line\b/gi, 'timeline'],
      [/\bframe\s+work\b/gi, 'framework'],
      [/\bback\s+end\b/gi, 'backend'],
      [/\bfront\s+end\b/gi, 'frontend'],
      [/\bfull\s+stack\b/gi, 'full-stack'],
      [/\bmachine\s+learning\b/gi, 'machine learning'],
      [/\bdeep\s+learning\b/gi, 'deep learning'],
      [/\bdata\s+science\b/gi, 'data science'],
      [/\bproject\s+management\b/gi, 'project management'],
      
      // Remove excessive punctuation
      [/\.{3,}/g, '...'],
      [/\?{2,}/g, '?'],
      [/!{2,}/g, '!'],
      
      // Fix spacing around punctuation
      [/\s+([.,!?;:])/g, '$1'],
      [/([.,!?;:])(?=[a-zA-Z])/g, '$1 ']
    ];
    
    let correctedText = text;
    for (const [pattern, replacement] of corrections) {
      correctedText = correctedText.replace(pattern, replacement);
    }
    
    return correctedText;
  }
  
  identifySpeaker(transcription, conversationHistory = [], recentSuggestions = []) {
    const text = transcription.text.toLowerCase().trim();
    
    // Check if this text matches a recent AI suggestion (indicating reading aloud)
    const isReadingSuggestion = this.isReadingFromSuggestion(text, recentSuggestions);
    if (isReadingSuggestion) {
      logger.info('Detected reading from AI suggestion, marking as candidate');
      return 'candidate';
    }
    
    // Enhanced interviewer patterns
    const interviewerPhrases = [
      'tell me about', 'tell me more about', 'can you tell me',
      'can you explain', 'can you describe', 'can you walk me through',
      'what is your', 'what are your', 'what would you',
      'how would you', 'how do you', 'how did you',
      'why did you', 'why would you', 'why do you',
      'describe a time', 'give me an example', 'walk me through',
      'what are your strengths', 'what are your weaknesses',
      'where do you see yourself', 'where do you see',
      'do you have any questions', 'any questions for',
      'that\'s interesting', 'that\'s good to hear', 'very good',
      'nice', 'excellent', 'great', 'perfect',
      'let\'s talk about', 'let\'s discuss', 'moving on',
      'what experience do you have', 'what skills do you',
      'how do you handle', 'how do you work',
      'what challenges have you', 'what would you do if'
    ];
    
    // Enhanced candidate patterns  
    const candidatePhrases = [
      'i believe', 'i think', 'i feel', 'i would say',
      'in my experience', 'in my previous role', 'in my current role',
      'i have worked', 'i worked', 'i\'ve been working', 'i work',
      'my approach', 'my strategy', 'my method', 'my process',
      'i would', 'i will', 'i can', 'i am able to',
      'at my previous', 'at my current', 'at my last',
      'i am passionate about', 'i enjoy', 'i love',
      'my strength', 'my strengths include', 'i\'m good at',
      'yes, of course', 'absolutely', 'definitely',
      'i\'ve been doing', 'i\'ve been responsible for',
      'i manage', 'i lead', 'i oversee', 'i handle',
      'my background is', 'my experience includes'
    ];
    
    let interviewerScore = 0;
    let candidateScore = 0;
    
    // Check for phrase matches
    interviewerPhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        interviewerScore += 2;
      }
    });
    
    candidatePhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        candidateScore += 2;
      }
    });
    
    // Question patterns (strong indicator of interviewer)
    if (text.endsWith('?')) {
      interviewerScore += 3;
    }
    
    // Positive feedback patterns (interviewer)
    const feedbackPatterns = ['nice', 'good', 'great', 'excellent', 'perfect', 'interesting'];
    feedbackPatterns.forEach(pattern => {
      if (text.includes(pattern) && text.length < 50) { // Short positive responses
        interviewerScore += 2;
      }
    });
    
    // First person pronouns (candidate)
    const firstPersonCount = (text.match(/\b(i|i'm|i've|my|me)\b/g) || []).length;
    candidateScore += firstPersonCount;
    
    // Length-based heuristics
    if (text.length > 100) {
      candidateScore += 1; // Longer responses often from candidate
    } else if (text.length < 30) {
      interviewerScore += 1; // Short questions often from interviewer
    }
    
    // Check previous speaker for alternation pattern
    if (conversationHistory.length > 0) {
      const lastSpeaker = conversationHistory[conversationHistory.length - 1].speaker;
      
      // If the scores are close, use alternation
      if (Math.abs(interviewerScore - candidateScore) <= 1) {
        if (lastSpeaker === 'interviewer') {
          candidateScore += 2;
        } else if (lastSpeaker === 'candidate') {
          interviewerScore += 2;
        }
      }
    }
    
    logger.info(`Speaker detection - Text: "${text.substring(0, 50)}..." | Interviewer: ${interviewerScore} | Candidate: ${candidateScore}`);
    
    if (interviewerScore > candidateScore) {
      return 'interviewer';
    } else if (candidateScore > interviewerScore) {
      return 'candidate';
    } else {
      // Default to alternating if unclear
      if (conversationHistory.length > 0) {
        const lastSpeaker = conversationHistory[conversationHistory.length - 1].speaker;
        return lastSpeaker === 'interviewer' ? 'candidate' : 'interviewer';
      }
      return 'interviewer'; // Default first speaker
    }
  }
  
  // Methods from corrections.md
  async bufferAndTranscribe(audioChunk) {
    // Add chunk to buffer
    this.audioBuffer.push(audioChunk);
    
    // Clear existing timeout
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    
    // Set new timeout - if no new audio comes for 500ms, process buffer
    this.silenceTimeout = setTimeout(async () => {
      if (this.audioBuffer.length > 0 && !this.isProcessing) {
        await this.processBufferedAudio();
      }
    }, 500); // 500ms silence threshold
  }
  
  async processBufferedAudio() {
    if (this.isProcessing || this.audioBuffer.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      // Combine all buffered chunks into one
      const combinedAudio = this.combineAudioData(this.audioBuffer);
      
      // Clear the buffer
      const processedBuffer = [...this.audioBuffer];
      this.audioBuffer = [];
      
      // Transcribe the combined audio as one unit
      const result = await this.transcribe([combinedAudio], [], this.recentTranscriptions);
      
      // Deduplicate the result
      const deduplicatedText = this.deduplicateTranscription(result.text, this.recentTranscriptions);
      
      if (deduplicatedText && deduplicatedText.trim()) {
        // Add to recent transcriptions
        this.recentTranscriptions.push({
          text: deduplicatedText,
          timestamp: Date.now()
        });
        
        // Keep only last 5 transcriptions for comparison
        if (this.recentTranscriptions.length > 5) {
          this.recentTranscriptions.shift();
        }
        
        return {
          ...result,
          text: deduplicatedText
        };
      }
      
      return { text: '', error: 'Duplicate content filtered' };
      
    } finally {
      this.isProcessing = false;
    }
  }
  
  deduplicateTranscription(newText, recentTranscriptions = []) {
    if (!newText || !newText.trim()) return '';
    
    // Check if this text is very similar to recent transcriptions
    for (const recent of recentTranscriptions.slice(-3)) { // Check last 3
      const similarity = this.calculateSimilarity(newText, recent.text);
      if (similarity > 0.7) { // 70% similarity threshold
        logger.info(`Duplicate detected: "${newText}" similar to "${recent.text}"`);
        return ''; // Skip this transcription
      }
    }
    return newText;
  }
  
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const allWords = new Set([...words1, ...words2]);
    let matches = 0;
    
    for (const word of allWords) {
      if (words1.includes(word) && words2.includes(word)) {
        matches++;
      }
    }
    
    return matches / allWords.size;
  }
  
  // Improved silence detection from corrections.md
  isAudioMostlySilence(audioBuffer) {
    const samples = new Int16Array(audioBuffer.buffer || audioBuffer);
    
    // Calculate RMS (Root Mean Square) for better energy detection
    let rmsSum = 0;
    for (let i = 0; i < samples.length; i++) {
      rmsSum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(rmsSum / samples.length);
    
    // Dynamic threshold based on recent audio levels
    const threshold = 800; // Lower threshold for better detection
    
    return rms < threshold;
  }
}

module.exports = new WhisperService();