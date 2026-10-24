require('./assets/js/logger.js');

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const transports = [];
if (!isProduction) {
  transports.push(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
transports.push(new winston.transports.File({ filename: 'error.log', level: 'error' }));
transports.push(new winston.transports.File({ filename: 'combined.log' }));

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: transports
});

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Block /livereload endpoint in production
if (!isDevelopment) {
  app.get('/livereload', (req, res) => {
    res.status(404).send('Not Found');
  });
}

app.use(cors());

// Stripe webhook endpoint must be registered before express.json() —
// Stripe's signature verification needs the raw, unparsed request body.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const stripeService = require('./services/stripeService');
        const signature = req.headers['stripe-signature'];
        const result = await stripeService.handleWebhook(req.body, signature);
        res.json(result);
    } catch (error) {
        logger.error('Stripe webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.use(express.json());

// Live reload in development

// Custom static middleware that can inject live reload script
if (isDevelopment) {
  app.use((req, res, next) => {
    // Check if this is an HTML file request
    if (req.url.endsWith('.html') || req.url === '/') {
      let filePath;
      if (req.url === '/') {
        filePath = path.join(__dirname, 'public', 'index.html');
      } else {
        filePath = path.join(__dirname, 'public', req.url);
      }

      // Check if file exists
      if (fs.existsSync(filePath)) {
        fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
            return next();
          }
          
          // Inject live reload script
          if (data.includes('</body>')) {
            const liveReloadScript = `
            <script>
              (function() {
                const socket = io('/livereload');
                
                socket.on('connect', () => {
                  console.log('🟢 Live reload connected');
                });
                
                socket.on('reload', () => {
                  console.log('🔄 Live reload: Refreshing page...');
                  window.location.reload();
                });
                
                socket.on('disconnect', () => {
                  console.log('🔴 Live reload disconnected');
                });
              })();
            </script>
          `;
            data = data.replace('</body>', liveReloadScript + '</body>');
          }
          
          res.setHeader('Content-Type', 'text/html');
          res.send(data);
        });
        return;
      }
    }
    next();
  });
}

// Force HTTPS and handle domain redirects
app.use((req, res, next) => {
  // Get protocol - check x-forwarded-proto header (used by most proxies/load balancers)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  
  // Redirect HTTP to HTTPS
  if (protocol === 'http' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  }
  
  // Redirect www to non-www for consistency
  if (req.hostname === 'www.thegoodchatapp.com') {
    return res.redirect(301, `https://thegoodchatapp.com${req.originalUrl}`);
  }
  
  // Security headers for HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// Redirect index.html to root to avoid duplicate content
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

// Return 404 for non-existent SEO pages that Google somehow found
// These pages never existed but Google is trying to crawl them
const nonExistentPages = [
  '/ai-interview-coach',
  '/behavioral-interview-questions',
  '/technical-interview-practice',
  '/interview-preparation-guide',
  '/company-specific-interviews',
  '/mock-interview-practice'
];

nonExistentPages.forEach(page => {
  app.get(page, (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  });
});

// Handle login page with parameters - strip query params for canonical
app.get('/login', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).send('Not Found');
    }
    
    // Add canonical tag to avoid duplicate content from query parameters
    if (data.includes('<link rel="canonical"')) {
      data = data.replace(
        /<link rel="canonical" href="[^"]*">/,
        '<link rel="canonical" href="https://thegoodchatapp.com/login">'
      );
    } else if (data.includes('</head>')) {
      data = data.replace(
        '</head>',
        '    <link rel="canonical" href="https://thegoodchatapp.com/login">\n</head>'
      );
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.send(data);
  });
});

// Simulator files served with no-cache so browser always fetches latest
app.get('/simulator', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'simulator.html'));
});
app.get('/simulator.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'simulator.js'));
});

app.use(express.static('public', { extensions: ['html'] }));
app.use('/assets', express.static('assets'));
// SEO: Handle test page - now allowing search engines to index it
// Removed bot blocking to fix Google indexing issue

app.use('/src', express.static('src', { setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store'); } }));
app.use('/config', express.static('config'));

const sessions = new Map();

const audioProcessor = require('./services/audioProcessor');
const gptService = require('./services/gptService');
const aiInterviewerService = require('./services/aiInterviewerService');
const databaseService = require('./services/databaseService');
const authService = require('./services/authService');
const { getCountryFromRequest } = require('./utils/geoCountry');
const whisperService = require('./services/whisperService');
const costTracker = require('./services/costTracker');

// Simulator overall debrief summary
app.post('/api/simulator-debrief', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const { history, meta } = req.body;
    if (!Array.isArray(history) || history.length === 0) return res.json({ summary: null });

    const transcript = history.map((h, i) =>
      `Q${i + 1} (${h.kind || 'question'}): ${h.question}\nYour answer: ${h.answer || '(no answer)'}`
    ).join('\n\n');
    const svc = require('./services/gptService');
    const completion = await svc.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are an expert interview coach. The candidate just completed a mock interview session. Write a concise, honest overall performance summary (3-5 sentences) addressed directly to the candidate (use "you", never "the candidate"). Cover: overall impression, strongest moment, biggest recurring weakness, and one concrete thing to work on before the real interview.\n\nInterview transcript:\n${transcript}`
      }],
      temperature: 0.6,
      max_tokens: 220
    });
    costTracker.recordChat({ model: 'gpt-4o-mini', usage: completion.usage, purpose: 'debrief-summary' });
    const summary = completion.choices[0].message.content.trim();

    // Save lightweight summary row to user_sessions
    if (meta && req.user?.id) {
      try {
        const { v4: uuidv4 } = require('uuid');
        const { pool } = require('./config/database');
        await pool.execute(`
          INSERT INTO user_sessions
            (user_id, session_type, session_uuid, question_number, total_questions,
             difficulty_level, question_type, language, score, session_duration, ai_feedback)
          VALUES (?, 'simulator', ?, 1, ?, ?, ?, ?, ?, ?, ?)
        `, [
          req.user.id,
          uuidv4(),
          meta.questionCount || history.length,
          meta.difficulty   || 'mid',
          meta.type         || 'general',
          meta.language     || 'en',
          meta.avgScore     ?? null,
          meta.durationMins || 0,
          summary
        ]);
        logger.info(`Simulator session saved for user ${req.user.id}`);
      } catch (dbErr) {
        logger.error('simulator-debrief DB save error:', dbErr.message);
      }
    }

    res.json({ summary });
  } catch (err) {
    logger.error('simulator-debrief error:', err);
    res.json({ summary: null });
  }
});

const stripeService = require('./services/stripeService');
const emailService = require('./services/emailService');
const OpenAI = require('openai');
const { testConnection, initializeDatabase, pool } = require('./config/database');

// Initialize OpenAI for role correction
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to correct role spelling using AI
async function correctRoleSpelling(role) {
  if (!role || role.trim() === '') {
    return role;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that ONLY corrects spelling/typing errors in job role titles. Do NOT change the meaning or add words. If the role is spelled correctly, return it exactly as given. Only fix obvious spelling mistakes. Examples: "data analst" -> "Data Analyst", "sofware enginer" -> "Software Engineer", "ux designr" -> "UX Designer". Keep roles like "Graduate", "Student", "Intern" unchanged as they are valid roles.'
        },
        {
          role: 'user',
          content: role
        }
      ],
      temperature: 0,
      max_tokens: 50
    });

    const correctedRole = response.choices[0].message.content.trim();
    
    // Be conservative: if the correction is very different from original, keep original
    // This prevents "Graduate" -> "Graduate Assistant" type changes
    const originalWords = role.toLowerCase().split(' ');
    const correctedWords = correctedRole.toLowerCase().split(' ');
    
    // If the correction adds words or completely changes the meaning, keep original
    if (correctedWords.length > originalWords.length + 1 || 
        !originalWords.some(word => correctedWords.some(cWord => cWord.includes(word.substring(0, 3))))) {
      logger.info(`Role correction rejected (too different): "${role}" -> "${correctedRole}", keeping original`);
      return role;
    }
    
    logger.info(`Role correction: "${role}" -> "${correctedRole}"`);
    return correctedRole;
  } catch (error) {
    logger.error('Error correcting role spelling:', error);
    // Return original role if AI correction fails
    return role;
  }
}

// Per-route SEO meta injection for SPA
const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
let _indexHtmlCache = null;
function getIndexHtml() {
  if (!_indexHtmlCache) _indexHtmlCache = fs.readFileSync(indexHtmlPath, 'utf8');
  return _indexHtmlCache;
}

const PAGE_META = {
  '/': {
    title: 'AI Mock Interview Practice | Instant Feedback on Every Answer',
    description: 'Practise real interview questions with AI feedback tailored to your CV and job description. Voice or text answers, instant coaching on pace, clarity and confidence. No subscription.',
    canonical: 'https://thegoodchatapp.com/',
  },
  '/pricing': {
    title: 'Good Chat Pricing — AI Interview Practice from £6.99',
    description: 'One-time payment, no subscription. 50 AI-coached interview questions for £6.99 or 100 questions for £10.99. Tailored to your CV and job role.',
    canonical: 'https://thegoodchatapp.com/pricing',
  },
  '/features': {
    title: 'Good Chat Features — AI Interview Coach & Instant Feedback',
    description: '500+ real interview questions by voice or text. AI analysis of your communication, pace, and confidence. Practice any role, any industry, anytime.',
    canonical: 'https://thegoodchatapp.com/features',
  },
  '/how-it-works': {
    title: 'How Good Chat Works — AI Interview Practice in 3 Steps',
    description: 'Upload your CV and job description, answer AI-generated questions by voice or text, get instant feedback. Practice smarter and land your next job.',
    canonical: 'https://thegoodchatapp.com/how-it-works',
  },
  '/about': {
    title: 'About Good Chat — The AI Interview Coach for Job Seekers',
    description: 'Good Chat helps job seekers practice real interview questions with personalised AI feedback. Built to help you walk into every interview feeling prepared.',
    canonical: 'https://thegoodchatapp.com/about',
  },
  '/contact': {
    title: 'Contact Good Chat — Get Help with AI Interview Practice',
    description: 'Have a question about Good Chat? Contact our team and we\'ll get back to you quickly.',
    canonical: 'https://thegoodchatapp.com/contact',
  },
  '/practice-info': {
    title: 'Practice Interviews with AI — Good Chat Guide',
    description: 'Learn how to use Good Chat\'s AI interview coach. Voice mode, personalised questions, instant feedback on every answer. Start preparing today.',
    canonical: 'https://thegoodchatapp.com/practice-info',
  },
  '/signup': {
    title: 'Sign Up for Good Chat — Start AI Interview Practice Today',
    description: 'Create your Good Chat account and start practising real interview questions with AI feedback. One-time payment, no subscription needed.',
    canonical: 'https://thegoodchatapp.com/signup',
  },
};

function serveWithMeta(res, route) {
  const meta = PAGE_META[route] || PAGE_META['/'];
  const url = meta.canonical;
  let html = getIndexHtml();
  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
    .replace(/(<meta name="title" content=")[^"]*(")/,  `$1${meta.title}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/,  `$1${meta.description}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/,  `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/,  `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/,  `$1${meta.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${meta.description}$2`)
    .replace(/(<meta property="twitter:url" content=")[^"]*(")/,  `$1${url}$2`)
    .replace(/(<meta property="twitter:title" content=")[^"]*(")/,  `$1${meta.title}$2`)
    .replace(/(<meta property="twitter:description" content=")[^"]*(")/,  `$1${meta.description}$2`);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

app.get('/', (req, res) => serveWithMeta(res, '/'));

// SPA route for practice - serve index.html and let client-side router handle it
app.get('/practice', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Interview Simulator — standalone page
// Test page route
app.get('/test', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Profile page route
app.get('/profile', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Edit profile page route
app.get('/edit-profile', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Email verification page route
app.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Check email page route
app.get('/check-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page route — noindex (app page, not a content page)
app.get('/login', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Signup page route — noindex (conversion page, not a content page)
app.get('/signup', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Forgot password route — noindex
app.get('/forgot-password', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Pricing page route
app.get('/pricing', (req, res) => serveWithMeta(res, '/pricing'));

// Features page route
app.get('/features', (req, res) => serveWithMeta(res, '/features'));

// How it works page route
app.get('/how-it-works', (req, res) => serveWithMeta(res, '/how-it-works'));

// About page route
app.get('/about', (req, res) => serveWithMeta(res, '/about'));

// Contact page route
app.get('/contact', (req, res) => serveWithMeta(res, '/contact'));

// Privacy page route — noindex (legal page, not worth indexing)
app.get('/privacy', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Terms page route — noindex (legal page, not worth indexing)
app.get('/terms', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Practice info page route
app.get('/practice-info', (req, res) => serveWithMeta(res, '/practice-info'));

// SEO landing pages — static HTML, served directly
app.get('/mock-interview-practice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mock-interview-practice.html'));
});

app.get('/ai-interview-coach', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ai-interview-coach.html'));
});

app.get('/behavioral-interview-questions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'behavioral-interview-questions.html'));
});

// Guide pages — static HTML
app.get('/guides/where-do-you-see-yourself-in-5-years', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'where-do-you-see-yourself-in-5-years.html'));
});

app.get('/guides/what-are-your-strengths', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'what-are-your-strengths.html'));
});

app.get('/guides/why-do-you-want-to-work-here', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'why-do-you-want-to-work-here.html'));
});

app.get('/guides/describe-yourself', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'describe-yourself.html'));
});

app.get('/guides/salary-expectations', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'salary-expectations.html'));
});

app.get('/guides/why-are-you-leaving-your-job', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'why-are-you-leaving-your-job.html'));
});

app.get('/guides/tell-me-about-a-time-you-failed', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'tell-me-about-a-time-you-failed.html'));
});

app.get('/guides/what-motivates-you', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'what-motivates-you.html'));
});

app.get('/guides/questions-to-ask-interviewer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'guides', 'questions-to-ask-interviewer.html'));
});

// Dashboard info page route — noindex (app page, not a content page)
app.get('/dashboard-info', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard page route
app.get('/dashboard', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Redirect old routes to new SPA pages for backward compatibility
app.get('/ai-interviewer.html', (req, res) => {
  res.redirect(301, '/practice');
});

app.get('/dashboard.html', (req, res) => {
  res.redirect(301, '/dashboard');
});

app.get('/profile.html', (req, res) => {
  res.redirect(301, '/profile');
});

app.get('/edit-profile.html', (req, res) => {
  res.redirect(301, '/edit-profile');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TTS proxy for the interview simulator
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'onyx' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const mp3 = await openai.audio.speech.create({ model: 'tts-1-hd', voice, speed: 1.1, input: text.slice(0, 500) });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err) {
    logger.error('TTS error:', err.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

async function practiceQuestionWithAudio(text, interviewer, sessionId = null) {
  const voices = ['onyx', 'nova'];
  try {
    const mp3 = await openai.audio.speech.create({ model: 'tts-1-hd', voice: voices[interviewer] || 'alloy', speed: 1.1, input: text });
    costTracker.recordTts({ chars: text.length, model: 'tts-1-hd', purpose: 'opener-tts', sessionId });
    return Buffer.from(await mp3.arrayBuffer()).toString('base64');
  } catch (e) {
    logger.warn('TTS pre-generation failed:', e.message);
    return null;
  }
}

// Test endpoint for AI question generation
app.post('/api/test-question', async (req, res) => {
  try {
    logger.info('🧪 Testing AI question generation endpoint...');
    
    const testData = {
      resume: "Software Engineer with 3 years experience in React and Node.js",
      jobDescription: "Looking for a Frontend Developer with React experience",
      questionNumber: 1,
      previousQuestions: [],
      currentRole: "Software Engineer",
      experienceYears: "3 years",
      difficultyLevel: "intermediate",
      questionType: "mixed",
      language: "english"
    };
    
    const question = await aiInterviewerService.generateInterviewQuestion(testData);
    logger.info(`✅ Test question generated: "${question}"`);
    
    res.json({ 
      success: true, 
      question: question,
      testData: testData
    });
  } catch (error) {
    logger.error('❌ Test question generation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

app.get('/api/realtime-token', (req, res) => {
  try {
    // For now, return the API key directly
    // In production, you'd generate a time-limited token
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    res.json({ 
      token: process.env.OPENAI_API_KEY,
      expires: Date.now() + (60 * 60 * 1000) // 1 hour from now
    });
  } catch (error) {
    logger.error('Error generating realtime token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// API endpoint to serve resume content from user profile
app.get('/api/resume', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const user = await authService.getUserById(userId);
    
    if (user && user.resume_content && user.resume_content.trim() !== '') {
      res.json({ 
        success: true, 
        content: user.resume_content,
        filename: user.resume_filename,
        uploadedAt: user.resume_uploaded_at
      });
    } else {
      // No longer use file fallback - only use database resume
      // This prevents using a default resume.txt when user has no CV
      res.json({ success: false, message: 'No resume found in profile' });
    }
  } catch (error) {
    logger.error('Error reading resume:', error);
    res.status(500).json({ success: false, message: 'Error reading resume' });
  }
});


// Generate a concise AI CV based on job title + years of experience
// Shared helpers: generate a realistic CV / JD from a job title + experience.
// Used both by the /api/generate-* routes AND to auto-fill missing context at
// interview start, so a user never has to write a CV/JD before question #1 while
// questions stay fully tailored to their role.
async function generateCVForRole(jobTitle, experienceYears) {
  const title = (jobTitle || '').trim();
  if (!title) throw new Error('Job title is required');

  const expLabel = !experienceYears || experienceYears === '0'
    ? 'a fresh graduate'
    : experienceYears >= 10
      ? 'someone with 10+ years of experience'
      : `someone with ${experienceYears} year${experienceYears == 1 ? '' : 's'} of experience`;

  const prompt = `Write a concise, realistic CV for ${expLabel} applying for a ${title} role.

Format it as plain text with these sections:
SUMMARY
SKILLS
EXPERIENCE (${experienceYears == 0 ? 'internship or placement only' : `${experienceYears >= 10 ? '3' : Math.min(parseInt(experienceYears) || 1, 3)} relevant roles`})
EDUCATION

Keep it realistic for the experience level. Be specific with technologies, tools, and achievements relevant to a ${title}. No placeholders — write actual content. Max 400 words.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.7
  });

  const cv = response.choices[0]?.message?.content?.trim();
  if (!cv) throw new Error('Empty response from OpenAI');
  return cv;
}

async function generateJDForRole(jobTitle, experienceYears) {
  const title = (jobTitle || '').trim();
  if (!title) throw new Error('Job title is required');

  const expLabel = !experienceYears || experienceYears === '0'
    ? 'a fresh graduate / entry-level candidate'
    : experienceYears >= 10
      ? 'a senior candidate with 10+ years of experience'
      : `a candidate with ${experienceYears} year${experienceYears == 1 ? '' : 's'} of experience`;

  const prompt = `Write a realistic job description for a ${title} role targeting ${expLabel}.

Start with a fictional but believable company name (invent one that fits the industry). Include:
- Company name and a brief overview
- Role summary
- Key responsibilities (5–7 bullet points)
- Required skills and qualifications
- Nice to have skills

Keep it concise and realistic. Plain text format, no markdown headers. Around 300 words.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.7
  });

  const jd = response.choices[0]?.message?.content?.trim();
  if (!jd) throw new Error('Empty response from OpenAI');
  return jd;
}

app.post('/api/generate-cv', async (req, res) => {
  try {
    const { jobTitle, experienceYears } = req.body;
    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required' });
    }
    const cv = await generateCVForRole(jobTitle, experienceYears);
    res.json({ success: true, content: cv });
  } catch (error) {
    logger.error('Error generating CV:', error);
    res.status(500).json({ success: false, message: 'Failed to generate CV' });
  }
});

// Generate a job description based on job title + years of experience
app.post('/api/generate-jd', async (req, res) => {
  try {
    const { jobTitle, experienceYears } = req.body;
    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required' });
    }
    const jd = await generateJDForRole(jobTitle, experienceYears);
    res.json({ success: true, content: jd });
  } catch (error) {
    logger.error('Error generating job description:', error);
    res.status(500).json({ success: false, message: 'Failed to generate job description' });
  }
});

// Socket authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const guestId = socket.handshake.auth?.guestId;

    if (!token) {
      // Allow connection but mark as unauthenticated
      socket.isAuthenticated = false;
      socket.userId = null;
      // Capture guestId for guest test session tracking
      if (guestId && typeof guestId === 'string') {
        socket.guestId = guestId.trim().slice(0, 64);
      }
      return next();
    }

    // Verify JWT token
    const decoded = authService.verifyToken(token);
    if (decoded) {
      socket.isAuthenticated = true;
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      socket.userName = decoded.name || null;
    } else {
      socket.isAuthenticated = false;
      socket.userId = null;
      if (guestId && typeof guestId === 'string') {
        socket.guestId = guestId.trim().slice(0, 64);
      }
    }

    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    socket.isAuthenticated = false;
    socket.userId = null;
    next();
  }
});

io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id} (authenticated: ${socket.isAuthenticated})`);
  logger.info(`User ID: ${socket.userId}, User Email: ${socket.userEmail}`);
  
  // Helper function to check if action requires authentication
  const requireAuth = (callback) => {
    return (...args) => {
      if (!socket.isAuthenticated) {
        socket.emit('error', { message: 'Authentication required. Please sign in to use this feature.' });
        return;
      }
      return callback.apply(this, args);
    };
  };
  
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    id: sessionId,
    socketId: socket.id,
    conversationHistory: [],
    audioBuffer: [],
    cvContext: '',
    jobDescription: '',
    startTime: new Date(),
    lastTranscriptionTime: 0,
    transcriptionCooldown: 500, // 500ms cooldown between transcriptions to prevent hallucinations
    liveCooldown: 200, // 200ms cooldown for very responsive processing
    lastLiveTranscriptionTime: 0, // Track live transcription timing
    lastLiveText: '', // Track last live transcription to avoid duplicates
    liveWordsBuffer: [], // Buffer to accumulate live words for smart transcript
    lastSmartTranscriptTime: 0, // Track when we last created a smart transcript entry
    silenceCount: 0, // Track silence for smart transcript breaks
    lastAudioTime: 0, // Track last audio activity
    recentSuggestions: [], // Track recent AI suggestions
    pendingTranscription: null, // Buffer for incomplete sentences
    lastTranscriptionEnd: 0 // Timestamp of last transcription end
  });
  
  socket.emit('session-created', { sessionId });
  
  // Initialize session-specific Realtime API connection
  let sessionRealtimeService = null;
  
  // Set up interval to check for silence and create smart transcript entries
  const silenceCheckInterval = setInterval(() => {
    const session = sessions.get(sessionId);
    if (!session) {
      clearInterval(silenceCheckInterval);
      return;
    }
    
    const now = Date.now();
    const timeSinceLiveWords = now - session.lastAudioTime;
    const timeSinceLastTranscript = now - session.lastSmartTranscriptTime;
    
    // If we have buffered words and 1.5 seconds of silence, create transcript entry
    if (session.liveWordsBuffer.length > 0 && 
        timeSinceLiveWords > 1500 && 
        timeSinceLastTranscript > 800) {
      
      // Combine accumulated live words with duplicate removal
      const combinedText = combineTextWithDuplicateRemoval(session.liveWordsBuffer);
      
      if (combinedText.length > 3) {
        // Send as transcription for smart transcript
        const transcriptData = {
          timestamp: new Date(),
          text: combinedText,
          isInterviewQuestion: false,
          analyzed: false
        };
        
        socket.emit('transcription', transcriptData);
        
        // Analyze the content
        setTimeout(async () => {
          try {
            // Simple analysis based on text patterns
            const isQuestion = /\?$|^(what|how|why|when|where|who|can you|could you|would you|tell me|describe|explain)/i.test(combinedText);
            
            // Add to conversation history
            session.conversationHistory.push({
              timestamp: transcriptData.timestamp,
              text: combinedText,
              isInterviewQuestion: isQuestion,
              analyzed: true,
              analysisType: isQuestion ? 'interview_question' : 'candidate_response'
            });
            
            // Send analysis update
            socket.emit('transcription-analysis', {
              text: combinedText,
              timestamp: transcriptData.timestamp,
              isInterviewQuestion: isQuestion,
              analysisType: isQuestion ? 'interview_question' : 'candidate_response'
            });
            
            logger.info(`Smart transcript from silence: "${combinedText}" -> ${isQuestion ? 'question' : 'response'}`);
            
            if (isQuestion) {
              // Generate streaming suggestion
              const startTime = new Date();
              let fullSuggestion = '';
              
              // Emit suggestion start event to prepare frontend
              socket.emit('suggestion-start', {
                timestamp: startTime
              });
              
              await gptService.generateSuggestionStream({
                conversationHistory: session.conversationHistory,
                cvContext: session.cvContext,
                jobDescription: session.jobDescription,
                lastQuestion: combinedText,
                onChunk: (chunk) => {
                  fullSuggestion += chunk;
                  // Send each chunk as it arrives
                  socket.emit('suggestion-chunk', {
                    chunk: chunk,
                    timestamp: new Date()
                  });
                }
              });
              
              // Generate AI title for the suggestion
              const suggestionTitle = await gptService.generateSuggestionTitle(combinedText);
              
              // Store complete suggestion in session
              const suggestionData = {
                text: fullSuggestion,
                timestamp: startTime,
                title: suggestionTitle,
                question: combinedText
              };
              
              session.recentSuggestions.push(suggestionData);
              if (session.recentSuggestions.length > 3) {
                session.recentSuggestions.shift();
              }
              
              // Emit completion event
              socket.emit('suggestion-complete', {
                text: fullSuggestion,
                timestamp: startTime,
                title: suggestionTitle,
                question: combinedText
              });
            }
          } catch (error) {
            logger.error('Error analyzing smart transcript:', error);
          }
        }, 500);
        
        // Clear the buffer and update time
        session.liveWordsBuffer = [];
        session.lastSmartTranscriptTime = now;
      }
    }
  }, 200); // Check every 200ms for faster response
  
  // Store interval ID for cleanup
  const session = sessions.get(sessionId);
  if (session) {
    session.silenceCheckInterval = silenceCheckInterval;
  }
  
  // Function to process pending transcript
  function processPendingTranscript(session) {
    if (session.liveWordsBuffer.length === 0) return;
    
    const combinedText = combineTextWithDuplicateRemoval(session.liveWordsBuffer);
    
    if (combinedText.length > 3) {
      const transcriptData = {
        timestamp: new Date(),
        text: combinedText,
        isInterviewQuestion: false,
        analyzed: false
      };
      
      socket.emit('transcription', transcriptData);
      
      // Analyze the content using simple pattern matching
      setTimeout(async () => {
        try {
          // Simple analysis based on text patterns
          const isQuestion = /\?$|^(what|how|why|when|where|who|can you|could you|would you|tell me|describe|explain)/i.test(combinedText);
          
          session.conversationHistory.push({
            timestamp: transcriptData.timestamp,
            text: combinedText,
            isInterviewQuestion: isQuestion,
            analyzed: true,
            analysisType: isQuestion ? 'interview_question' : 'candidate_response'
          });
          
          socket.emit('transcription-analysis', {
            text: combinedText,
            timestamp: transcriptData.timestamp,
            isInterviewQuestion: isQuestion,
            analysisType: isQuestion ? 'interview_question' : 'candidate_response'
          });
          
          logger.info(`Smart transcript: "${combinedText}" -> ${isQuestion ? 'question' : 'response'}`);
          
          if (isQuestion) {
            // Generate streaming suggestion
            const startTime = new Date();
            let fullSuggestion = '';
            
            // Emit suggestion start event to prepare frontend
            socket.emit('suggestion-start', {
              timestamp: startTime
            });
            
            await gptService.generateSuggestionStream({
              conversationHistory: session.conversationHistory,
              cvContext: session.cvContext,
              jobDescription: session.jobDescription,
              lastQuestion: combinedText,
              onChunk: (chunk) => {
                fullSuggestion += chunk;
                // Send each chunk as it arrives
                socket.emit('suggestion-chunk', {
                  chunk: chunk,
                  timestamp: new Date()
                });
              }
            });
            
            // Store complete suggestion in session
            const suggestionData = {
              text: fullSuggestion,
              timestamp: startTime
            };
            
            session.recentSuggestions.push(suggestionData);
            if (session.recentSuggestions.length > 3) {
              session.recentSuggestions.shift();
            }
            
            // Emit completion event
            socket.emit('suggestion-complete', {
              text: fullSuggestion,
              timestamp: startTime
            });
          }
        } catch (error) {
          logger.error('Error analyzing transcript:', error);
        }
      }, 500);
      
      session.liveWordsBuffer = [];
      session.lastSmartTranscriptTime = Date.now();
    }
  }
  
  // Handle realtime audio stream
  socket.on('realtime-audio', requireAuth(async (data) => {
    try {
      const session = sessions.get(sessionId);
      if (!session) {
        logger.error(`Session not found: ${sessionId}`);
        return;
      }
      
      // Initialize Realtime API connection if not already done
      if (!sessionRealtimeService) {
        const RealtimeService = require('./services/realtimeService');
        sessionRealtimeService = new RealtimeService();
        
        // Set up event handlers
        sessionRealtimeService.on('transcription_complete', (transcriptData) => {
          const session = sessions.get(sessionId);
          if (!session) return;
          
          // Send live words immediately
          socket.emit('live-words', {
            text: transcriptData.text,
            timestamp: transcriptData.timestamp,
            isRealtime: true
          });
          
          // Add to buffer for smart transcript processing
          session.liveWordsBuffer.push({
            text: transcriptData.text,
            timestamp: transcriptData.timestamp
          });
          
          session.lastLiveText = transcriptData.text;
          session.lastAudioTime = transcriptData.timestamp;
          logger.info(`Real-time transcription: \"${transcriptData.text}\"`);
        });
        
        sessionRealtimeService.on('speech_started', () => {
          logger.info('Speech started for session:', sessionId);
        });
        
        sessionRealtimeService.on('speech_stopped', () => {
          logger.info('Speech stopped for session:', sessionId);
          // Trigger smart transcript processing after speech ends
          setTimeout(() => {
            const session = sessions.get(sessionId);
            if (session && session.liveWordsBuffer.length > 0) {
              processPendingTranscript(session);
            }
          }, 1000);
        });
        
        // Store for cleanup
        session.realtimeService = sessionRealtimeService;
      }
      
      // Send audio to Realtime API
      if (sessionRealtimeService && sessionRealtimeService.isReady()) {
        sessionRealtimeService.sendAudio(data.audio);
      }
      
    } catch (error) {
      logger.error('Error processing realtime audio:', error);
    }
  }));
  
  // Handle stop realtime audio
  socket.on('stop-realtime-audio', () => {
    if (sessionRealtimeService) {
      sessionRealtimeService.commitAudio();
    }
  });
  
  // Handle transcription from Realtime API
  socket.on('realtime-transcription', (data) => {
    try {
      const session = sessions.get(sessionId);
      if (!session) {
        logger.error(`Session not found: ${sessionId}`);
        return;
      }
      
      const { text, timestamp } = data;
      
      if (text && text.trim().length > 2) {
        // Add to live words buffer
        session.liveWordsBuffer.push({
          text: text.trim(),
          timestamp: timestamp || Date.now()
        });
        
        session.lastLiveText = text.trim();
        session.lastAudioTime = Date.now();
        
        logger.info(`Realtime transcription: "${text.trim()}"`);
      }
    } catch (error) {
      logger.error('Error processing realtime transcription:', error);
    }
  });
  
  
  // Audio-stream is no longer used - smart transcript is assembled from live words
  /*
  socket.on('audio-stream', async (audioData) => {
    try {
      const session = sessions.get(sessionId);
      if (!session) {
        logger.error(`Session not found: ${sessionId}`);
        return;
      }
      
      const processedAudio = await audioProcessor.processAudioChunk(audioData);
      session.audioBuffer.push(processedAudio);
      
      // Check cooldown before processing
      const now = Date.now();
      if (now - session.lastTranscriptionTime < session.transcriptionCooldown) {
        logger.info('Transcription cooldown active, skipping');
        return;
      }
      
      // Process each chunk individually for better reliability
      if (session.audioBuffer.length >= 1) {
        const audioToTranscribe = session.audioBuffer.splice(0, 1);
        session.lastTranscriptionTime = now;
        
        // Process transcription without blocking
        setImmediate(async () => {
          const transcription = await whisperService.transcribe(audioToTranscribe, session.conversationHistory, session.recentSuggestions);
          
          if (transcription.text && transcription.text.trim()) {
            // Clean up the transcription text
            // The transcription text is already cleaned by WhisperService
            const cleanedText = transcription.text;
            
            if (cleanedText && cleanedText.length > 2) { // Only process meaningful text to prevent hallucinations
              const now = Date.now();
              
              // Check if this might be a continuation of the previous transcription
              const timeSinceLastTranscription = now - session.lastTranscriptionEnd;
              const isLikelyContinuation = timeSinceLastTranscription < 3000 && // Within 3 seconds
                                          session.pendingTranscription &&
                                          !session.pendingTranscription.isComplete;
              
              if (isLikelyContinuation) {
                // Merge with pending transcription
                session.pendingTranscription.text += ' ' + cleanedText;
                session.pendingTranscription.timestamp = new Date(); // Update timestamp
                
                // Note: live words updates are now handled by live-audio-stream
                
                // Update the displayed transcription
                socket.emit('transcription-update', {
                  text: session.pendingTranscription.text,
                  timestamp: session.pendingTranscription.timestamp,
                  isInterviewQuestion: false
                });
                
                logger.info(`Merged transcription: "${session.pendingTranscription.text}"`);
              } else {
                // Start new transcription
                session.pendingTranscription = {
                  timestamp: new Date(),
                  text: cleanedText,
                  isInterviewQuestion: false,
                  analyzed: false,
                  isComplete: false
                };
                
                // Note: live words are now handled by live-audio-stream
                
                // Send transcription immediately (fast)
                socket.emit('transcription', {
                  text: cleanedText,
                  timestamp: session.pendingTranscription.timestamp,
                  isInterviewQuestion: false
                });
                
                logger.info(`New transcription started: "${cleanedText}"`);
              }
              
              session.lastTranscriptionEnd = now;
              
              // Analyze content after a delay to allow for continuations
              setTimeout(async () => {
                if (session.pendingTranscription && !session.pendingTranscription.analyzed) {
                  try {
                    const finalText = session.pendingTranscription.text;
                    const isQuestion = /\?$|^(what|how|why|when|where|who|can you|could you|would you|tell me|describe|explain)/i.test(finalText);
                    
                    // Mark as complete and analyzed
                    session.pendingTranscription.isInterviewQuestion = isQuestion;
                    session.pendingTranscription.analyzed = true;
                    session.pendingTranscription.analysisType = isQuestion ? 'interview_question' : 'candidate_response';
                    session.pendingTranscription.isComplete = true;
                    
                    // Add to conversation history
                    session.conversationHistory.push({
                      timestamp: session.pendingTranscription.timestamp,
                      text: finalText,
                      isInterviewQuestion: isQuestion,
                      analyzed: true,
                      analysisType: isQuestion ? 'interview_question' : 'candidate_response'
                    });
                    
                    // Send analysis update
                    socket.emit('transcription-analysis', {
                      text: finalText,
                      timestamp: session.pendingTranscription.timestamp,
                      isInterviewQuestion: isQuestion,
                      analysisType: isQuestion ? 'interview_question' : 'candidate_response'
                    });
                    
                    logger.info(`Final analysis: "${finalText}" -> ${isQuestion ? 'question' : 'response'}`);
                    
                    if (isQuestion) {
                      logger.info(`Detected interview question, generating streaming suggestion`);
                      // Generate streaming suggestion asynchronously
                      const startTime = new Date();
                      let fullSuggestion = '';
                      
                      // Emit suggestion start event
                      socket.emit('suggestion-start', {
                        timestamp: startTime
                      });
                      
                      gptService.generateSuggestionStream({
                        conversationHistory: session.conversationHistory,
                        cvContext: session.cvContext,
                        jobDescription: session.jobDescription,
                        lastQuestion: finalText,
                        onChunk: (chunk) => {
                          fullSuggestion += chunk;
                          socket.emit('suggestion-chunk', {
                            chunk: chunk,
                            timestamp: new Date()
                          });
                        }
                      }).then(() => {
                        const suggestionData = {
                          text: fullSuggestion,
                          timestamp: startTime
                        };
                        
                        // Store in recent suggestions (keep last 3)
                        session.recentSuggestions.push(suggestionData);
                        if (session.recentSuggestions.length > 3) {
                          session.recentSuggestions.shift(); // Remove oldest
                        }
                        
                        socket.emit('suggestion-complete', {
                          text: fullSuggestion,
                          timestamp: startTime
                        });
                      }).catch(error => {
                        logger.error('Error generating streaming suggestion:', error);
                      });
                    } else {
                      logger.info(`Content analyzed as: ${isQuestion ? 'question' : 'response'}, no suggestion generated`);
                    }
                  } catch (error) {
                    logger.error('Error analyzing content:', error);
                  }
                }
              }, 1000); // Wait 1 second before analyzing to prevent partial transcriptions
            }
          }
        });
      }
    } catch (error) {
      logger.error('Error processing audio stream:', error);
      socket.emit('error', { message: 'Error processing audio' });
    }
  });
  */
  
  socket.on('update-context', requireAuth((data) => {
    const session = sessions.get(sessionId);
    if (session) {
      if (data.cvContext) session.cvContext = data.cvContext;
      if (data.jobDescription) session.jobDescription = data.jobDescription;
      logger.info(`Context updated for session ${sessionId}`);
      socket.emit('context-updated', { success: true });
    }
  }));
  
  socket.on('flush-audio', () => {
    const session = sessions.get(sessionId);
    if (session && session.liveWordsBuffer.length > 0) {
      logger.info('Flushing remaining live words to transcript');
      
      // Force create transcript from remaining words
      const combinedText = combineTextWithDuplicateRemoval(session.liveWordsBuffer);
      
      if (combinedText.length > 3) {
        const transcriptData = {
          timestamp: new Date(),
          text: combinedText,
          isInterviewQuestion: false,
          analyzed: false
        };
        
        socket.emit('transcription', transcriptData);
        
        // Analyze the content
        setTimeout(async () => {
          try {
            // Simple analysis based on text patterns
            const isQuestion = /\?$|^(what|how|why|when|where|who|can you|could you|would you|tell me|describe|explain)/i.test(combinedText);
            
            session.conversationHistory.push({
              timestamp: transcriptData.timestamp,
              text: combinedText,
              isInterviewQuestion: isQuestion,
              analyzed: true,
              analysisType: isQuestion ? 'interview_question' : 'candidate_response'
            });
            
            socket.emit('transcription-analysis', {
              text: combinedText,
              timestamp: transcriptData.timestamp,
              isInterviewQuestion: isQuestion,
              analysisType: isQuestion ? 'interview_question' : 'candidate_response'
            });
            
            logger.info(`Flushed transcript: "${combinedText}" -> ${isQuestion ? 'question' : 'response'}`);
            
            if (isQuestion) {
              // Generate streaming suggestion
              const startTime = new Date();
              let fullSuggestion = '';
              
              // Emit suggestion start event to prepare frontend
              socket.emit('suggestion-start', {
                timestamp: startTime
              });
              
              await gptService.generateSuggestionStream({
                conversationHistory: session.conversationHistory,
                cvContext: session.cvContext,
                jobDescription: session.jobDescription,
                lastQuestion: combinedText,
                onChunk: (chunk) => {
                  fullSuggestion += chunk;
                  // Send each chunk as it arrives
                  socket.emit('suggestion-chunk', {
                    chunk: chunk,
                    timestamp: new Date()
                  });
                }
              });
              
              // Generate AI title for the suggestion
              const suggestionTitle = await gptService.generateSuggestionTitle(combinedText);
              
              // Store complete suggestion in session
              const suggestionData = {
                text: fullSuggestion,
                timestamp: startTime,
                title: suggestionTitle,
                question: combinedText
              };
              
              session.recentSuggestions.push(suggestionData);
              if (session.recentSuggestions.length > 3) {
                session.recentSuggestions.shift();
              }
              
              // Emit completion event
              socket.emit('suggestion-complete', {
                text: fullSuggestion,
                timestamp: startTime,
                title: suggestionTitle,
                question: combinedText
              });
            }
          } catch (error) {
            logger.error('Error analyzing flushed transcript:', error);
          }
        }, 100);
        
        session.liveWordsBuffer = [];
        session.lastSmartTranscriptTime = Date.now();
      }
    }
  });
  
  // Handle manual suggestion request from highlighted text
  socket.on('manual-suggestion-request', requireAuth(async (data) => {
    try {
      const session = sessions.get(sessionId);
      if (!session) {
        logger.error(`Session not found for manual suggestion: ${sessionId}`);
        return;
      }
      
      const { text, timestamp } = data;
      logger.info(`Manual suggestion requested for: "${text}"`);
      
      // Generate streaming suggestion immediately
      const startTime = new Date();
      let fullSuggestion = '';
      
      // Emit suggestion start event to prepare frontend
      socket.emit('suggestion-start', {
        timestamp: startTime
      });
      
      await gptService.generateSuggestionStream({
        conversationHistory: session.conversationHistory,
        cvContext: session.cvContext,
        jobDescription: session.jobDescription,
        lastQuestion: text,
        onChunk: (chunk) => {
          fullSuggestion += chunk;
          // Send each chunk as it arrives
          socket.emit('suggestion-chunk', {
            chunk: chunk,
            timestamp: new Date()
          });
        }
      });
      
      // Store complete suggestion in session
      const suggestionData = {
        text: fullSuggestion,
        timestamp: startTime
      };
      
      session.recentSuggestions.push(suggestionData);
      if (session.recentSuggestions.length > 3) {
        session.recentSuggestions.shift();
      }
      
      // Emit completion event
      socket.emit('suggestion-complete', {
        text: fullSuggestion,
        timestamp: startTime
      });
      
      // Add manual question to conversation history
      session.conversationHistory.push({
        timestamp: startTime,
        text: text,
        isInterviewQuestion: true,
        analyzed: true,
        analysisType: 'manual_question'
      });
      
    } catch (error) {
      logger.error('Error processing manual suggestion request:', error);
    }
  }));
  
  socket.on('stop-recording', () => {
    const session = sessions.get(sessionId);
    if (session) {
      logger.info(`Recording stopped for session ${sessionId}`);
      socket.emit('recording-stopped', {
        sessionId,
        duration: new Date() - session.startTime,
        conversationLength: session.conversationHistory.length
      });
    }
  });
  
  socket.on('endPracticeSession', async () => {
    try {
      if (socket.dbSessionId) {
        await databaseService.endSession(socket.dbSessionId);
        logger.info(`Practice session ${socket.dbSessionId} ended`);
      }
    } catch (error) {
      logger.error('Error ending practice session:', error);
    }
  });

  // ── Interview Simulator ──────────────────────────────────────────────────
  socket.on('practice-start', async (cfg) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    const config = cfg || {};
    let isTrial = false;
    let isGuestSession = false;

    if (socket.isAuthenticated) {
      // Authenticated path — check subscription
      let subscription;
      try {
        subscription = await stripeService.checkUserSubscription(socket.userId, 'simulate');
      } catch (err) {
        logger.error('practice-start subscription check error:', err);
        socket.emit('practice-error', { message: 'Could not verify your subscription. Please try again.' });
        return;
      }
      if (!subscription || subscription.questions_remaining <= 0) {
        socket.emit('practice-error', { message: 'You have no questions remaining. Upgrade your plan to continue.', code: 'NO_QUESTIONS' });
        return;
      }
      isTrial = subscription.subscriptions && subscription.subscriptions.some(s => s.package_id === 3);
      if (isTrial) config.duration = 2;

      try {
        await stripeService.useQuestion(socket.userId, sessionId, 1, 'simulate');
      } catch (err) {
        logger.error('practice-start useQuestion error:', err);
        socket.emit('practice-error', { message: 'You have no questions remaining. Upgrade your plan to continue.', code: 'NO_QUESTIONS' });
        return;
      }
    } else if (socket.guestId) {
      // Guest path — check & mark simulate usage
      const [existing] = await pool.execute(
        'SELECT id FROM guest_test_sessions WHERE guest_id = ? AND mode = ?',
        [socket.guestId, 'simulate']
      );
      if (existing.length > 0) {
        socket.emit('practice-error', { message: 'You have already used your free simulator session.', code: 'GUEST_USED' });
        return;
      }
      await pool.execute(
        'INSERT IGNORE INTO guest_test_sessions (guest_id, mode) VALUES (?, ?)',
        [socket.guestId, 'simulate']
      );
      config.duration = 2; // cap guests to 2 minutes
      isGuestSession = true;
    } else {
      socket.emit('practice-error', { message: 'Please sign in to use the simulator.', code: 'AUTH_REQUIRED' });
      return;
    }

    session.simulator = {
      cvContext:      session.cvContext || '',
      jobDescription: session.jobDescription || '',
      history:        [],
      interviewer:    0,
      currentQuestion: '',
      type:           config.type        || 'general',
      difficulty:     config.difficulty  || 'mid',
      pressure:       config.pressure    || 'standard',
      interviewers:   config.interviewers || 2,
      duration:       config.duration    || 20,
      language:       config.language    || 'en',
      userName:       socket.userName    || null,
      additionalInfo: config.additionalInfo || '',
      isTrial,
      isGuestSession
    };

    // If the user launched the simulator without a CV / job description, auto-fill
    // them from their role + experience so the interview stays tailored with zero
    // friction (mirrors the practice-mode behaviour). Cached on the socket so it
    // only runs once. Non-fatal on failure — practiceQuestion tolerates empties.
    const simRole = ((config.role && String(config.role).trim()) || '');
    if (simRole && (!session.simulator.cvContext || !session.simulator.jobDescription)) {
      if (!session.simulator.cvContext && socket.autoResume) session.simulator.cvContext = socket.autoResume;
      if (!session.simulator.jobDescription && socket.autoJD) session.simulator.jobDescription = socket.autoJD;

      const pending = [];
      if (!session.simulator.cvContext) {
        pending.push(generateCVForRole(simRole, config.experienceYears)
          .then(cv => { session.simulator.cvContext = cv; socket.autoResume = cv; }));
      }
      if (!session.simulator.jobDescription) {
        pending.push(generateJDForRole(simRole, config.experienceYears)
          .then(jd => { session.simulator.jobDescription = jd; socket.autoJD = jd; }));
      }
      if (pending.length) {
        try {
          await Promise.all(pending);
          logger.info(`🧩 [simulator] Auto-generated ${pending.length} context doc(s) from role "${simRole}"`);
        } catch (genErr) {
          logger.warn('[simulator] Auto CV/JD generation failed, proceeding with role only:', genErr.message);
        }
      }
    }

    try {
      const kind = config.skipIntro ? 'next' : 'opener';
      const q = await gptService.practiceQuestion({ ...session.simulator, kind });
      session.simulator.history.push({ role: 'interviewer', name: 'Daniel', text: q });
      session.simulator.currentQuestion = q;
      socket.emit('practice-question', { text: q, interviewer: 0, kind, audio: null, duration: session.simulator.duration });
      practiceQuestionWithAudio(q, 0, sessionId).then(audio => {
        if (audio) socket.emit('practice-audio', { audio, interviewer: 0 });
      }).catch(() => {});
    } catch (err) {
      logger.error('practice-start error:', err);
      if (err.message && err.message.includes('No questions')) {
        socket.emit('practice-error', { message: 'You have no questions remaining. Upgrade your plan to continue.', code: 'NO_QUESTIONS' });
      } else {
        socket.emit('practice-error', { message: 'Could not generate the first question. Please try again.' });
      }
    }
  });

  socket.on('practice-answer', async (data) => {
    const session = sessions.get(sessionId);
    if (!session?.simulator || !data?.text) return;
    if (!socket.isAuthenticated && !session.simulator.isGuestSession) {
      socket.emit('error', { message: 'Authentication required.' });
      return;
    }
    const sim = session.simulator;
    const prevQuestion = sim.currentQuestion;
    sim.history.push({ role: 'candidate', text: data.text });

    // Guests always get feedback only — no next question (1-question cap)
    const isFinal = data.finalAnswer || sim.isGuestSession;
    if (isFinal) {
      try {
        const feedback = await gptService.generateAnswerFeedback({
          question: prevQuestion, answer: data.text,
          cvContext: sim.cvContext, jobDescription: sim.jobDescription, userName: sim.userName
        });
        socket.emit('practice-feedback', { ...feedback, finalAnswer: true });
      } catch (err) {
        logger.error('practice-answer (final) error:', err);
        socket.emit('practice-feedback', { finalAnswer: true });
      }
      return;
    }

    // Decide follow-up vs new topic
    const followUpChance = sim.pressure === 'high' ? 0.55 : sim.pressure === 'relaxed' ? 0.25 : 0.4;
    const isFollowUp = Math.random() < followUpChance;
    const kind = isFollowUp ? 'followup' : 'next';
    if (!isFollowUp) {
      sim.interviewer = sim.interviewers === 1 ? 0 : (sim.interviewer === 0 ? 1 : 0);
    }

    // Fire feedback in background — not gated on next-question credit
    gptService.generateAnswerFeedback({
      question: prevQuestion, answer: data.text,
      cvContext: sim.cvContext, jobDescription: sim.jobDescription, userName: sim.userName
    }).then(feedback => socket.emit('practice-feedback', feedback))
      .catch(err => logger.error('feedback error:', err));

    try {
      await stripeService.useQuestion(socket.userId, sessionId, 1, 'simulate');
    } catch (err) {
      logger.error('practice-answer deduction error:', err.message);
      socket.emit('practice-error', { message: 'You have no questions remaining. Upgrade your plan to continue.', code: 'NO_QUESTIONS' });
      return;
    }

    try {
      const nextQ = await gptService.practiceQuestion({ ...sim, kind, lastAnswer: data.text });
      sim.history.push({ role: 'interviewer', name: sim.interviewer === 0 ? 'Daniel' : 'Priya', text: nextQ });
      sim.currentQuestion = nextQ;
      socket.emit('practice-question', { text: nextQ, interviewer: sim.interviewer, kind, audio: null });
    } catch (err) {
      logger.error('practice-answer error:', err);
      socket.emit('practice-error', { message: 'Could not generate the next question. Please try again.' });
    }
  });

  socket.on('practice-interrupt', async (data) => {
    if (!socket.isAuthenticated && !sessions.get(sessionId)?.simulator?.isGuestSession) {
      return;
    }
    const session = sessions.get(sessionId);
    if (!session?.simulator) return;
    const sim = session.simulator;
    const prevQuestion = sim.currentQuestion;
    if (data?.partial) sim.history.push({ role: 'candidate', text: data.partial });

    // Fire feedback for the interrupted partial answer in the background
    if (data?.partial && prevQuestion) {
      gptService.generateAnswerFeedback({
        question:       prevQuestion,
        answer:         data.partial,
        cvContext:      sim.cvContext || '',
        jobDescription: sim.jobDescription || '',
        userName:       sim.userName || null
      }).then(feedback => socket.emit('practice-feedback', feedback))
        .catch(err => logger.error('interrupt feedback error:', err));
    }

    try {
      const q = await gptService.practiceInterrupt({ history: sim.history, interviewer: sim.interviewer, language: sim.language });
      sim.history.push({ role: 'interviewer', name: sim.interviewer === 0 ? 'Daniel' : 'Priya', text: q });
      sim.currentQuestion = q;
      socket.emit('practice-question', { text: q, interviewer: sim.interviewer, kind: 'interrupt', audio: null });
    } catch (err) {
      logger.error('practice-interrupt error:', err);
      socket.emit('practice-error', { message: 'Could not generate the next question. Please try again.' });
    }
  });

  socket.on('practice-end', () => {
    const session = sessions.get(sessionId);
    if (session) session.simulator = null;
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    // End any active database sessions on disconnect
    if (socket.dbSessionId) {
      databaseService.endSession(socket.dbSessionId).catch(err => 
        logger.error('Error ending session on disconnect:', err)
      );
    }
    const session = sessions.get(sessionId);
    if (session) {
      // Clean up intervals
      if (session.silenceCheckInterval) {
        clearInterval(session.silenceCheckInterval);
      }
      if (session.finalizationChecker) {
        clearInterval(session.finalizationChecker);
      }
      
      // Clean up realtime service
      if (session.realtimeService) {
        session.realtimeService.close();
      }
      
      // Reset finalization state
      session.isFinalizingTranscription = false;
    }
    if (sessionRealtimeService) {
      sessionRealtimeService.close();
    }
    sessions.delete(sessionId);
  });
  
  // AI Interviewer Socket Events
  socket.on('requestAIQuestion', async (data) => {
    logger.info(`🎯 AI Question Request - Socket ID: ${socket.id}, Authenticated: ${socket.isAuthenticated}`);
    
    // Check authentication — test mode guests are allowed through
    const isTestModeRequest = data?.isTestMode === true;
    if (!socket.isAuthenticated && !isTestModeRequest) {
      logger.error('❌ AI Question Request failed: User not authenticated');
      socket.emit('error', { message: 'Authentication required. Please sign in to use this feature.' });
      return;
    }
    
    try {
      logger.info('📝 Processing AI question request with data:', {
        hasResume: !!data.resume,
        hasJobDescription: !!data.jobDescription,
        questionNumber: data.questionNumber,
        userEmail: data.userEmail,
        currentRole: data.currentRole,
        detectedRole: data.detectedRole,
        detectedCompany: data.detectedCompany,
        detectedIndustry: data.detectedIndustry,
        language: data.language
      });
      
      const { 
        resume, 
        jobDescription, 
        questionNumber, 
        previousQuestions, 
        userEmail, 
        userName,
        // New configuration parameters
        currentRole,
        experienceYears,
        detectedRole,
        detectedCompany,
        detectedIndustry,
        difficultyLevel,
        questionType,
        language,
        companyName,
        companyIndustry,
        additionalInfo,
        // Test mode flag
        isTestMode = false
      } = data;
      
      // Resume and job description are OPTIONAL — they enrich tailoring but must
      // not block a first interview. We only need a role to generate a relevant
      // question; the AI falls back to role + experience when JD/CV are absent.
      const hasRole = (currentRole && currentRole.trim()) || (detectedRole && detectedRole.trim());
      if (!hasRole) {
        logger.error('❌ Missing required field: role');
        socket.emit('error', { message: 'Please enter your current role to start.' });
        return;
      }
      // Normalise optional context so downstream calls never receive null/undefined
      const resumeSafe = (resume || '').trim();
      const jobDescriptionSafe = (jobDescription || '').trim();

      // If the user hasn't supplied a CV / job description, auto-generate them
      // from their role + experience so questions stay fully tailored with zero
      // friction. Cached on the socket so we only generate once per session
      // (not per question), and only when authenticated (skip test-mode guests).
      let effectiveResume = resumeSafe;
      let effectiveJD = jobDescriptionSafe;
      const roleForGen = ((currentRole && currentRole.trim()) || (detectedRole && detectedRole.trim()) || '');
      if (!isTestMode && roleForGen && (!effectiveResume || !effectiveJD)) {
        if (!effectiveResume && socket.autoResume) effectiveResume = socket.autoResume;
        if (!effectiveJD && socket.autoJD) effectiveJD = socket.autoJD;

        const pending = [];
        if (!effectiveResume) {
          pending.push(
            generateCVForRole(roleForGen, experienceYears)
              .then(cv => { effectiveResume = cv; socket.autoResume = cv; })
          );
        }
        if (!effectiveJD) {
          pending.push(
            generateJDForRole(roleForGen, experienceYears)
              .then(jd => { effectiveJD = jd; socket.autoJD = jd; })
          );
        }
        if (pending.length) {
          try {
            await Promise.all(pending);
            logger.info(`🧩 Auto-generated ${pending.length} context doc(s) (CV/JD) from role "${roleForGen}"`);
          } catch (genErr) {
            // Non-fatal: fall back to role-only generation (prompt handles empties)
            logger.warn('Auto CV/JD generation failed, proceeding with role only:', genErr.message);
          }
        }
      }
      
      logger.info('👤 Getting or creating user...');
      // Get or create user and session
      if (!socket.userId && userEmail) {
        socket.userId = await databaseService.createOrUpdateUser(userEmail, userName);
        logger.info(`✅ User created/updated with ID: ${socket.userId}`);
      }
      
      // Ensure we have a user ID
      if (!socket.userId) {
        logger.warn('⚠️ No user ID available - using fallback');
        // Try to get from token again or create anonymous user
        if (socket.isAuthenticated && socket.handshake.auth?.token) {
          const decoded = authService.verifyToken(socket.handshake.auth.token);
          if (decoded) {
            socket.userId = decoded.id;
          }
        }
        
        // If still no user ID and we have an email, create user
        if (!socket.userId && userEmail) {
          socket.userId = await databaseService.createOrUpdateUser(userEmail, userName || 'Anonymous');
          logger.info(`✅ Fallback user created with ID: ${socket.userId}`);
        }
      }
      
      // Create session ONLY if we don't have a session yet (prevent duplicates) AND not in test mode
      if (!isTestMode && !socket.sessionUuid && socket.userId) {
        logger.info('🆕 Creating new practice session...');
        socket.sessionUuid = await databaseService.createSession(
          socket.userId,
          'practice_mode',
          effectiveJD,
          effectiveResume
        );
        logger.info(`✅ Session UUID generated: ${socket.sessionUuid}`);
      } else if (socket.sessionUuid) {
        logger.info(`♻️ Using existing session UUID: ${socket.sessionUuid}`);
      } else if (isTestMode) {
        logger.info(`🧪 Test mode detected - skipping session creation`);
      }
      
      // Get recent questions from last 5 sessions to avoid repetition (skip in test mode)
      let recentSessionQuestions = [];
      if (!isTestMode && socket.userId && questionNumber === 1) {
        // Only fetch on first question to minimize DB calls
        const recentQuestions = await databaseService.getRecentQuestions(socket.userId, 5);
        socket.recentSessionQuestions = recentQuestions.map(q => q.question_text);
        logger.info(`📚 Loaded ${socket.recentSessionQuestions.length} questions from last 5 sessions to avoid repetition`);
      } else if (!isTestMode && socket.recentSessionQuestions) {
        // Use cached questions for subsequent questions in the session
        recentSessionQuestions = socket.recentSessionQuestions;
      }
      
      // Combine with current session's previous questions
      const allPreviousQuestions = [...(previousQuestions || []), ...recentSessionQuestions];
      
      // Check and deduct question usage BEFORE generating the AI question
      if (socket.userId && socket.isAuthenticated && !isTestMode) {
        try {
          const stripeService = require('./services/stripeService');
          await stripeService.useQuestion(socket.userId, socket.sessionUuid, 1, 'practice');
          logger.info(`Question usage pre-deducted for user ${socket.userId}, question ${questionNumber}`);
        } catch (usageError) {
          logger.error(`Failed to deduct question for user ${socket.userId}:`, usageError.message);
          
          // If no questions remaining, don't generate the question
          if (usageError.message.includes('No questions remaining') || 
              usageError.message.includes('no questions remaining') ||
              usageError.message.includes('No question credit found')) {
            socket.emit('error', { 
              message: 'No questions remaining in your subscription',
              code: 'NO_QUESTIONS_REMAINING'
            });
            return; // Don't generate the question
          }
          
          // For other errors, we might want to stop as well to prevent abuse
          socket.emit('error', { 
            message: 'Failed to verify subscription. Please try again.',
            code: 'SUBSCRIPTION_ERROR'
          });
          return;
        }
      }
      
      logger.info('🤖 Generating AI question...');
      const questionResult = await aiInterviewerService.generateInterviewQuestion({
        resume: effectiveResume,
        jobDescription: effectiveJD,
        questionNumber,
        previousQuestions: allPreviousQuestions,
        // Pass all configuration parameters
        currentRole,
        experienceYears,
        detectedRole,
        detectedCompany,
        detectedIndustry,
        difficultyLevel,
        questionType,
        language,
        companyName,
        companyIndustry,
        additionalInfo
      });
      
      // Handle both old and new format
      const question = typeof questionResult === 'string' ? questionResult : questionResult.question;
      const actualQuestionType = typeof questionResult === 'string' ? questionType : questionResult.questionType;
      
      logger.info(`✅ Question generated successfully: "${question.substring(0, 10000)}"`);
      logger.info(`📝 Question type: ${actualQuestionType}`);

      if (isTestMode && typeof question === 'string') {
        const safeQuestion = question.trim();
        const testerIdentifier = socket.userId || socket.guestId;
        if (safeQuestion && testerIdentifier) {
          setImmediate(() => {
            databaseService
              .updateTesterJobTitleQuestion(testerIdentifier, safeQuestion, !socket.userId)
              .catch((err) => logger.error('Failed to record tester question:', err));
          });
        }
      }
      
      // Store question info for later use when saving answer
      if (socket.sessionUuid && socket.userId) {
        // Use the actual question type from the service
        const questionTypeCategory = actualQuestionType || (
          questionNumber === 1 ? 'experience' : 
          questionNumber === 2 ? 'behavioral' :
          questionNumber === 3 ? 'technical' :
          questionNumber === 4 ? 'cultural_fit' : 'motivation'
        );
        
        // Store question info in socket for later use
        socket.currentQuestion = {
          sessionUuid: socket.sessionUuid,
          userId: socket.userId,
          questionNumber,
          questionText: question,
          questionType: questionTypeCategory
        };
        
        logger.info(`📋 Question info stored for later use:`, {
          sessionUuid: socket.sessionUuid,
          userId: socket.userId,
          questionNumber,
          questionType: questionTypeCategory
        });
      } else {
        logger.warn(`⚠️ Cannot store question info - missing session UUID or user ID:`, {
          hasSessionUuid: !!socket.sessionUuid,
          hasUserId: !!socket.userId,
          sessionUuid: socket.sessionUuid,
          userId: socket.userId
        });
      }
      
      // Question usage already tracked before generating the question
      
      logger.info('📤 Emitting aiQuestion event to client...');
      socket.emit('aiQuestion', { 
        question,
        questionType: actualQuestionType 
      });
      logger.info('✅ AI question request completed successfully');
      
    } catch (error) {
      logger.error('❌ Error generating AI question:', error);
      logger.error('Error stack:', error.stack);
      
      // Always emit a response, even on error
      const errorMessage = error.message || 'Failed to generate question';
      socket.emit('error', { message: errorMessage });
      
      // Also emit a fallback question to prevent UI from being stuck
      const fallbackQuestion = "Tell me about your background and what interests you about this role.";
      logger.info('📤 Sending fallback question to prevent UI being stuck');
      socket.emit('aiQuestion', { question: fallbackQuestion });
    }
  });
  
  socket.on('startAIInterview', (data) => {
    const { sessionId: aiSessionId, currentQuestion } = data;
    
    // Create a new session for AI interview recording
    const aiSession = {
      id: aiSessionId,
      socketId: socket.id,
      currentQuestion,
      transcript: '',
      liveWordsBuffer: [],
      lastAudioTime: Date.now(),
      realtimeService: null,
      sessionUuid: socket.sessionUuid,
      currentQuestionData: socket.currentQuestion,
      audioChunks: []
    };
    
    sessions.set(aiSessionId, aiSession);
    logger.info(`AI Interview started for session: ${aiSessionId}`);
  });
  
  socket.on('audioStream', (data) => {
    try {
      const { audio, sessionId: aiSessionId } = data;
      const aiSession = sessions.get(aiSessionId);
      if (!aiSession) return;
      if (!aiSession.audioChunks) aiSession.audioChunks = [];
      aiSession.audioChunks.push(Buffer.from(audio));
      aiSession.lastAudioTime = Date.now();
    } catch (error) {
      logger.error('Error buffering AI interview audio:', error);
    }
  });
  
  socket.on('stopAIInterview', async (data) => {
    const { sessionId: aiSessionId } = data;
    const aiSession = sessions.get(aiSessionId);
    if (!aiSession) return;

    logger.info(`AI Interview stopping for session: ${aiSessionId}, chunks: ${(aiSession.audioChunks || []).length}`);

    const chunks = aiSession.audioChunks || [];
    if (chunks.length === 0) {
      socket.emit('transcriptionUpdate', { text: '', isFinal: true });
      return;
    }

    try {
      const combined = Buffer.concat(chunks);
      const wavBuffer = whisperService.convertToWav(combined);
      const result = await whisperService.transcribeLive(
        { buffer: wavBuffer, mimeType: 'audio/wav' },
        aiSession.currentQuestion || ''
      );
      const text = (result && result.text) ? result.text : '';
      logger.info(`Whisper transcript for ${aiSessionId}: "${text}"`);
      socket.emit('transcriptionUpdate', { text, isFinal: true });
    } catch (err) {
      logger.error('Whisper transcription failed:', err);
      socket.emit('transcriptionUpdate', { text: '', isFinal: true });
    }
  });
  
  socket.on('requestFeedback', async (data) => {
    logger.info(`🎯 Feedback Request - Socket ID: ${socket.id}, Question: "${data.question?.substring(0, 50)}..."`);
    try {
      const { 
        sessionId: aiSessionId, 
        question, 
        answer, 
        resume, 
        jobDescription, 
        previousAttempts = [],
        language = 'english',
        detectedRole = '',
        difficultyLevel = 'intermediate',
        // Additional config data for progress tracking
        currentRole = '',
        experienceYears = '',
        detectedCompany = '',
        detectedIndustry = '',
        questionType = '',
        companyName = '',
        additionalInfo = '',
        answerMode = 'text',
        answerDuration = 0,
        questionNumber = 1,
        // Delivery insights
        wpm = null,
        wordCount = null,
        fillerCount = null,
        pauseCount = null,
        longestPauseMs = null,
        // Test mode flags
        isTestMode = false,
        testModeIndustry = null
      } = data;
      
      // Check if this is test mode
      if (isTestMode) {
        logger.info(`🧪 Test mode feedback request detected - will not save to database`);
        const testerIdentifier = socket.userId || socket.guestId;
        const isGuest = !socket.userId && !!socket.guestId;
        if (testerIdentifier) {
          const safeQuestion = typeof question === 'string' ? question.trim() : '';
          const sanitizedAnswer = typeof answer === 'string'
            ? answer.replace(/^You:\s*/i, '').trim()
            : '';
          const isPlaceholderAnswer = !sanitizedAnswer ||
            /finalizing transcript/i.test(sanitizedAnswer) ||
            /processing final transcript/i.test(sanitizedAnswer);
          setImmediate(() => {
            if (safeQuestion && isPlaceholderAnswer) {
              databaseService
                .updateTesterJobTitleQuestion(testerIdentifier, safeQuestion, isGuest)
                .catch((err) => logger.error('Failed to record tester question:', err));
              return;
            }
            databaseService
              .updateTesterJobTitleResponse(testerIdentifier, safeQuestion, sanitizedAnswer, isGuest)
              .catch((err) => logger.error('Failed to record tester response:', err));
          });
        }
      }
      
      // Log the current socket state
      logger.info('🔍 Socket state at feedback request:', {
        socketId: socket.id,
        hasSessionUuid: !!socket.sessionUuid,
        sessionUuid: socket.sessionUuid,
        hasUserId: !!socket.userId,
        userId: socket.userId,
        hasCurrentQuestion: !!socket.currentQuestion,
        currentQuestionText: socket.currentQuestion?.questionText?.substring(0, 50)
      });
      
      // Update currentQuestion for retries - ensure we have the question data even for retries
      if (!socket.currentQuestion || socket.currentQuestion.questionText !== question) {
        logger.info('📝 Updating currentQuestion for retry or new question');
        socket.currentQuestion = {
          sessionUuid: socket.sessionUuid || aiSessionId,
          userId: socket.userId,
          questionNumber: questionNumber,
          questionText: question,
          questionType: questionType || socket.currentQuestion?.questionType || ''
        };
      }
      
      logger.info(`Generating feedback for question: "${question}" (${previousAttempts.length} previous attempts) in language: ${language}`);
      
      let fullFeedback = '';
      let streamEnded = false;
      
      // Add timeout to prevent infinite spinner
      const timeout = setTimeout(() => {
        if (!streamEnded) {
          logger.error('Feedback generation timeout');
          socket.emit('feedbackComplete', {
            feedback: '**Score: 5/10**\n\n**Strengths:**\nYour answer showed effort and engagement.\n\n**Areas for Improvement:**\nTry to be more specific with examples from your experience.\n\n**Suggested Better Response:**\nStructure your answer using the STAR method (Situation, Task, Action, Result).\n\n**Interview Tips:**\nPractice answering common interview questions out loud to build confidence.',
            score: 5,
            comparison: ''
          });
        }
      }, 30000); // 30 second timeout
      
      try {
        // Generate streaming feedback but collect it all
        const stream = await aiInterviewerService.analyzeAnswer({
          question,
          answer,
          resume,
          jobDescription,
          previousAttempts,
          language,
          detectedRole,
          difficultyLevel
        });
        
        if (!stream) {
          throw new Error('No stream returned from analyzeAnswer');
        }
        
        stream.on('data', (chunk) => {
          fullFeedback += chunk.toString();
        });
        
        stream.on('end', async () => {
          streamEnded = true;
          clearTimeout(timeout);
          
          // Validate feedback was received
          if (!fullFeedback || fullFeedback.length < 100) {
            logger.error('Feedback too short or empty, using fallback');
            fullFeedback = `**Score: 5/10**

**Strengths:**
- You provided an answer to the question

**Areas for Improvement:**
- Technical issue prevented detailed analysis
- Please try again or move to the next question

**Suggested Better Response:**
- Focus on providing specific examples
- Structure your answer clearly

**Interview Tips:**
- Keep practicing to improve your responses`;
          }
          
          // Parse score from feedback
          const scoreMatch = fullFeedback.match(/\*\*Score:\s*([0-9.]+)\/10\*\*/i);
          const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;
          
          logger.info(`Parsed score: ${score} from feedback length: ${fullFeedback.length}`);
          
          // Generate comparison text if there are previous attempts
          let comparison = '';
          if (previousAttempts.length > 0) {
            const lastScore = previousAttempts[previousAttempts.length - 1].score;
            const scoreDiff = score - lastScore;
            
            if (scoreDiff > 0.5) {
              comparison = `🎉 You improved by ${scoreDiff.toFixed(1)} points from your last attempt!`;
            } else if (scoreDiff < -0.5) {
              comparison = `📉 Your score was ${Math.abs(scoreDiff).toFixed(1)} points lower than your last attempt. Keep practicing!`;
            } else {
              comparison = `📊 Similar performance to your last attempt. Try incorporating the feedback below.`;
            }
          }
          
          // Parse feedback sections
          const strengthsMatch = fullFeedback.match(/\*\*Strengths:\*\*([\s\S]*?)(?=\*\*|$)/);
          const improvementsMatch = fullFeedback.match(/\*\*Areas for Improvement:\*\*([\s\S]*?)(?=\*\*|$)/);
          const betterResponseMatch = fullFeedback.match(/\*\*Suggested Better Response:\*\*([\s\S]*?)(?=\*\*|$)/);
          const tipsMatch = fullFeedback.match(/\*\*Interview Tips:\*\*([\s\S]*?)(?=\*\*|$)/);
          
          let strengths = strengthsMatch ? strengthsMatch[1].trim() : '- You provided an answer to the question\n- Your response showed engagement with the topic';
          let improvements = improvementsMatch ? improvementsMatch[1].trim() : '- Provide more specific examples from your experience\n- Structure your answer more clearly\n- Elaborate on key points with additional detail';
          let betterResponse = betterResponseMatch ? betterResponseMatch[1].trim() : 'Consider using the STAR method to structure your response and include specific examples.';
          let tips = tipsMatch ? tipsMatch[1].trim() : '- Practice answering questions out loud\n- Prepare specific examples beforehand\n- Focus on clarity and conciseness';
          
          // Clean up improvements section if it only contains numbers or is too short
          if (improvements && (improvements.match(/^\d+\.?\s*$/m) || improvements.length < 20)) {
            logger.warn('Improvements section appears malformed:', improvements);
            // Try to extract meaningful content after numbers
            const cleanedImprovements = improvements.replace(/^\d+\.?\s*$/gm, '').trim();
            if (cleanedImprovements.length < 20) {
              // Use fallback if still too short
              improvements = '• Provide more specific examples from your experience to illustrate your points\n• Structure your answer more clearly using the STAR method\n• Elaborate on key achievements with quantifiable results where possible';
              logger.info('Using fallback improvements due to malformed content');
            } else {
              improvements = cleanedImprovements;
            }
          }
          
          // Get session for potential cleanup
          const aiSession = sessions.get(aiSessionId);
          
          // Save answer and feedback to database (skip for test mode)
          if (!isTestMode) {
            logger.info(`💾 Attempting to save feedback - aiSession exists: ${!!aiSession}, socket.currentQuestion exists: ${!!socket.currentQuestion}`);
            
            if (socket.currentQuestion) {
              logger.info(`💾 Current question data:`, {
                sessionId: socket.currentQuestion.sessionId,
                userId: socket.currentQuestion.userId,
                questionNumber: socket.currentQuestion.questionNumber,
                questionType: socket.currentQuestion.questionType
              });
            }
            
            // We only need socket.currentQuestion to save, not aiSession
            if (socket.currentQuestion) {
            logger.info(`📊 Current question data before save:`, {
              hasCurrentQuestion: !!socket.currentQuestion,
              sessionUuid: socket.currentQuestion.sessionUuid,
              userId: socket.currentQuestion.userId,
              questionNumber: socket.currentQuestion.questionNumber,
              questionText: socket.currentQuestion.questionText?.substring(0, 50)
            });
            
            try {
              // Use previousAttempts from frontend to determine retry status
              // previousAttempts can be an array or a number depending on the frontend version
              logger.info(`Previous attempts data:`, { 
                type: typeof previousAttempts, 
                isArray: Array.isArray(previousAttempts),
                value: previousAttempts,
                length: Array.isArray(previousAttempts) ? previousAttempts.length : 'N/A'
              });
              
              const attemptCount = Array.isArray(previousAttempts) ? previousAttempts.length + 1 : 
                                  (typeof previousAttempts === 'number' ? previousAttempts + 1 : 1);
              
              // Determine if this is a retry (attempt > 1)
              const isRetry = attemptCount > 1;
              
              logger.info(`Retry determination:`, {
                attemptCount,
                isRetry,
                questionNumber: socket.currentQuestion.questionNumber || questionNumber,
                sessionUuid: socket.currentQuestion.sessionUuid
              });
              
              // For finding original question ID, we need to query the database
              // to find the first attempt for this question in this session
              let originalQuestionId = null;
              if (isRetry) {
                try {
                  originalQuestionId = await databaseService.getOriginalQuestionId(
                    socket.currentQuestion.userId,
                    socket.currentQuestion.sessionUuid,
                    socket.currentQuestion.questionNumber || questionNumber
                  );
                } catch (err) {
                  logger.warn('Could not find original question ID:', err);
                }
              }
              
              logger.info(`💾 Saving to user_sessions table (Attempt #${attemptCount}, Retry: ${isRetry}, Original ID: ${originalQuestionId})...`);
              
              // Save to unified session table - including retries as new rows
              const savedRecord = await databaseService.saveSession({
                userId: socket.currentQuestion.userId,
                sessionUuid: socket.currentQuestion.sessionUuid,
                questionNumber: socket.currentQuestion.questionNumber || questionNumber,
                totalQuestions: 5,
                sessionType: 'practice_mode',
                // Retry tracking
                isRetry,
                attemptNumber: attemptCount,
                originalQuestionId,
                // Configuration
                currentRole,
                experienceYears,
                detectedRole,
                detectedCompany,
                detectedIndustry,
                difficultyLevel,
                questionType: socket.currentQuestion.questionType || questionType,
                language,
                companyName,
                additionalInfo,
                // Content (ADD MISSING FIELDS)
                jobDescription: jobDescription,
                resumeContent: resume,
                // Question and answer
                questionText: question,
                answerText: answer,
                answerMode,
                answerDuration,
                // Delivery insights
                wpm,
                wordCount,
                fillerCount,
                pauseCount,
                longestPauseMs,
                // Scoring and feedback
                score,
                scoreComparison: comparison,
                strengths,
                improvements,
                betterResponse,
                tips,
                fullFeedback
                });
                
                logger.info(`✅ Saved to user_sessions table (ID: ${savedRecord?.insertId}, Attempt: ${attemptCount}, Retry: ${isRetry})`);
                
                // Update user progress
                if (socket.userId) {
                  await databaseService.updateUserProgress(socket.userId);
                  logger.info(`✅ Updated user progress`);
                }
            } catch (dbError) {
              logger.error(`❌ Database save error:`, dbError);
              logger.error(`Error stack:`, dbError.stack);
              // Don't throw - continue with feedback display
            }
          } else {
            logger.warn(`⚠️ Cannot save to database - missing session or question data`);
          }
          } else {
            logger.info(`🧪 Test mode detected - skipping database save operations`);
          }
          
          // Send complete feedback with score and comparison
          logger.info(`Emitting feedbackComplete to socket ${socket.id} with score ${score}`);
          socket.emit('feedbackComplete', {
            feedback: fullFeedback,
            score: score,
            comparison: comparison
          });
          logger.info('feedbackComplete event emitted successfully');
          
          // Clean up session
          if (aiSession) {
            sessions.delete(aiSessionId);
          }
        });
        
        stream.on('error', (error) => {
          streamEnded = true;
          clearTimeout(timeout);
          logger.error('Stream error:', error);
          socket.emit('error', { message: 'Failed to generate feedback' });
        });
      } catch (streamError) {
        clearTimeout(timeout);
        logger.error('Error creating stream:', streamError);
        socket.emit('error', { message: 'Failed to create feedback stream' });
      }
      
    } catch (error) {
      logger.error('Error generating feedback:', error);
      socket.emit('error', { message: 'Failed to generate feedback' });
    }
  });
});

// Resume upload endpoint for AI interviewer
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  // Optional auth — guests can upload to parse content only, authenticated users also save to profile
  let authedUser = null;
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) authedUser = authService.verifyToken(token);
  } catch (_) {}

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let content = '';

    if (req.file.mimetype === 'application/pdf') {
      // Parse PDF
      const pdfData = await pdfParse(req.file.buffer);
      content = pdfData.text;
    } else if (req.file.mimetype.includes('text') || req.file.originalname.endsWith('.txt') || req.file.originalname.endsWith('.docx')) {
      // Plain text or other formats
      content = req.file.buffer.toString('utf8');
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload PDF, TXT, or DOCX files.' });
    }

    // Clean up the content
    content = content.trim();

    if (!content) {
      return res.status(400).json({ error: 'Resume content is empty or could not be parsed' });
    }

    const filename = req.file.originalname;

    if (authedUser) {
      // Save to user's profile in database
      await authService.updateResume(authedUser.id, content, filename);
      logger.info(`Resume uploaded and saved for user ${authedUser.id}: ${filename} (${content.length} characters)`);
    }

    res.json({
      success: true,
      content,
      filename,
      message: authedUser ? 'Resume uploaded and saved to your profile successfully' : 'Resume parsed successfully'
    });
  } catch (error) {
    logger.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

// Delete resume endpoint
app.delete('/api/auth/resume', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Clear resume data by setting to null
    await authService.updateResume(userId, null, null);
    
    logger.info(`Resume deleted for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Helper functions
function isDuplicateText(newText, lastText) {
  if (!lastText || !newText) return false;
  
  const newClean = newText.toLowerCase().trim();
  const lastClean = lastText.toLowerCase().trim();
  
  // Exact duplicates
  if (newClean === lastClean) {
    return true;
  }
  
  // If new text is contained in last text
  if (lastClean.includes(newClean) && newClean.length > 5) {
    return true;
  }
  
  // If texts share more than 70% of words, likely duplicate
  const newWords = newClean.split(' ');
  const lastWords = lastClean.split(' ');
  const commonWords = newWords.filter(word => lastWords.includes(word));
  
  if (commonWords.length / newWords.length > 0.7) {
    return true;
  }
  
  return false;
}

function findOverlap(arr1, arr2) {
  // Find how many words at the end of arr1 match the beginning of arr2
  let maxOverlap = 0;
  const checkLength = Math.min(arr1.length, arr2.length, 5); // Check up to 5 words
  
  for (let i = 1; i <= checkLength; i++) {
    const end = arr1.slice(-i).join(' ');
    const start = arr2.slice(0, i).join(' ');
    if (end === start) {
      maxOverlap = i;
    }
  }
  
  return maxOverlap;
}

function calculateSimilarity(words1, words2) {
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function combineTextWithDuplicateRemoval(bufferArray) {
  if (!bufferArray || bufferArray.length === 0) return '';
  
  let combined = [];
  let lastProcessedText = '';
  
  for (const item of bufferArray) {
    const currentText = item.text.trim();
    if (!currentText) continue;
    
    // Check for duplicates with the improved function
    if (!isDuplicateText(currentText, lastProcessedText)) {
      combined.push(currentText);
      lastProcessedText = currentText;
    }
  }
  
  // Join with space and clean up repetitive patterns
  let result = combined.join(' ').replace(/\s+/g, ' ').trim();
  
  // Remove repetitive word patterns
  const words = result.split(' ');
  const cleanWords = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Don't add if this word was just added recently
    const recentWords = cleanWords.slice(-3);
    if (!recentWords.includes(word) || cleanWords.length === 0) {
      cleanWords.push(word);
    }
  }
  
  return cleanWords.join(' ');
}

// Dashboard API endpoints (protected)
app.get('/api/dashboard/progress/:userId', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Users can only access their own progress
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const progress = await databaseService.getUserProgress(userId);
    res.json(progress);
  } catch (error) {
    logger.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

app.get('/api/dashboard/progress', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    // Get progress for the authenticated user
    const progress = await databaseService.getUserProgress(req.user.id);
    res.json(progress);
  } catch (error) {
    logger.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

app.get('/api/dashboard/session/:sessionId', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const sessionDetails = await databaseService.getSessionDetails(sessionId);
    
    if (!sessionDetails) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if the session belongs to the authenticated user
    if (sessionDetails.session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(sessionDetails);
  } catch (error) {
    logger.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// Authentication endpoints
// Get user profile
app.get('/api/auth/profile', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive fields
    delete user.password_hash;
    delete user.verification_token;
    delete user.reset_token;
    delete user.reset_token_expires;

    res.json({ user });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
app.put('/api/auth/profile', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { name, role, experienceYears } = req.body;

    // Validate required fields (role and experienceYears are the only truly required ones here)
    if (!role || experienceYears === undefined || experienceYears === null || experienceYears === '') {
      return res.status(400).json({ error: 'Role and experience are required' });
    }

    // Correct role spelling if provided
    let correctedRole = role;
    if (role && role.trim() !== '') {
      correctedRole = await correctRoleSpelling(role);
    }

    // Update profile
    const updatedUser = await authService.updateProfile(userId, {
      name,
      role: correctedRole,
      experienceYears
    });
    
    // Remove sensitive fields
    delete updatedUser.password_hash;
    delete updatedUser.verification_token;
    delete updatedUser.reset_token;
    delete updatedUser.reset_token_expires;
    
    res.json({ user: updatedUser });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Grant a free trial subscription to a new user: 1 question for practice mode,
// 1 question for simulate mode — separate allowances, not a shared pool.
// skipModes: array of mode strings already used as a guest (e.g. ['practice'])
async function grantFreeTrialSubscription(userId, skipModes = []) {
  try {
    const FREE_TRIAL_PACKAGE_ID = 3;
    const FREE_TRIAL_QUESTIONS_PER_MODE = 1;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const modesToGrant = ['practice', 'simulate'].filter(m => !skipModes.includes(m));
    if (modesToGrant.length === 0) {
      logger.info(`Free trial skipped for user ${userId}: all modes already used as guest`);
      return;
    }

    await pool.execute(
      `INSERT INTO user_subscriptions
        (user_id, package_id, status, questions_used, questions_remaining, current_period_start, current_period_end, amount_paid_gbp)
       VALUES (?, ?, 'active', 0, ?, NOW(), ?, 0.00)`,
      [userId, FREE_TRIAL_PACKAGE_ID, FREE_TRIAL_QUESTIONS_PER_MODE * modesToGrant.length, periodEnd]
    );

    for (const mode of modesToGrant) {
      await pool.execute(
        `INSERT INTO question_usage (user_id, subscription_id, question_count, expiry_date, mode)
         SELECT ?, id, ?, ?, ? FROM user_subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId, FREE_TRIAL_QUESTIONS_PER_MODE, periodEnd, mode, userId]
      );
    }

    logger.info(`Free trial granted to user ${userId}: ${modesToGrant.join(' + ')} question(s)`);
  } catch (err) {
    logger.error(`Failed to grant free trial to user ${userId}:`, err);
  }
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, country, role, experienceYears, guestId } = req.body;
    
    // Validate required fields
    if (!email || !password || !name || !country || !role || experienceYears === undefined || experienceYears === null || experienceYears === '') {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    if (!authService.validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Correct role spelling if provided
    let correctedRole = role;
    if (role && role.trim() !== '') {
      correctedRole = await correctRoleSpelling(role);
    }

    // Register user
    const result = await authService.register({
      email,
      password,
      name,
      country,
      role: correctedRole,
      experienceYears
    });

    // Determine which modes the guest already used before signing up
    let skipModes = [];
    if (guestId && typeof guestId === 'string' && guestId.trim()) {
      const safeGuestId = guestId.trim().slice(0, 64);
      const [usedRows] = await pool.execute(
        'SELECT mode FROM guest_test_sessions WHERE guest_id = ?',
        [safeGuestId]
      );
      skipModes = usedRows.map(r => r.mode);
    }

    // Grant free trial subscription (minus any modes already used as guest)
    await grantFreeTrialSubscription(result.user.id, skipModes);

    // Trigger Klaviyo email verification flow (non-blocking)
    const klaviyoService = require('./services/klaviyoService');
    setImmediate(async () => {
      try {
        // Get site URL from request
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers.host || `localhost:${process.env.PORT || 3001}`;
        const siteUrl = `${protocol}://${host}`;

        await klaviyoService.trackEmailVerification({
          email,
          name,
          userId: result.user.id,
          verificationToken: result.verificationToken,
          siteUrl
        });
        logger.info(`Email verification sent for ${email}`);
      } catch (klaviyoError) {
        logger.error('Klaviyo verification email error (non-critical):', klaviyoError);
      }
    });

    res.status(201).json({
      user: result.user,
      token: result.token,
      message: 'Account created successfully'
    });

  } catch (error) {
    logger.error('Signup error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this verification token and check expiration
    const [users] = await pool.execute(
      'SELECT id, email, name, country, role, experience_years, is_verified FROM users WHERE verification_token = ? AND verification_token_expires > NOW()',
      [token]
    );

    if (!users.length) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = users[0];

    // Check if already verified
    if (user.is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Mark user as verified, clear verification token and expiration, and update last login
    await pool.execute(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Trigger Klaviyo welcome email flow (non-blocking)
    const klaviyoService = require('./services/klaviyoService');
    setImmediate(async () => {
      try {
        // Get site URL from request
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers.host || `localhost:${process.env.PORT || 3001}`;
        const siteUrl = `${protocol}://${host}`;
        
        logger.info(`Regular user data for welcome email:`, {
          email: user.email,
          name: user.name,
          userId: user.id
        });
        
        await klaviyoService.trackSignup({
          email: user.email,
          name: user.name,
          userId: user.id,
          country: user.country,
          role: user.role,
          experienceYears: user.experience_years,
          siteUrl
        });
        logger.info(`Welcome email triggered for verified user: ${user.email} with name: ${user.name}`);
      } catch (klaviyoError) {
        logger.error('Klaviyo welcome email error (non-critical):', klaviyoError);
      }
    });

    // Generate JWT token for automatic login
    const authToken = authService.generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        country: user.country,
        role: user.role,
        experience_years: user.experience_years,
        is_verified: true
      },
      token: authToken
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// Resend verification email endpoint with rate limiting
const resendAttempts = new Map(); // Track resend attempts per email

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check rate limiting (59 seconds between attempts)
    const now = Date.now();
    const lastAttempt = resendAttempts.get(email);
    
    if (lastAttempt && now - lastAttempt < 59000) {
      const remainingSeconds = Math.ceil((59000 - (now - lastAttempt)) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${remainingSeconds} seconds before requesting another verification email`,
        remainingSeconds 
      });
    }

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, email, name, is_verified, verification_token FROM users WHERE email = ?',
      [email]
    );

    if (!users.length) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    const user = users[0];

    // Check if already verified
    if (user.is_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const crypto = require('crypto');
    const newVerificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    await pool.execute(
      'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
      [newVerificationToken, verificationExpires, user.id]
    );

    // Update rate limiting map
    resendAttempts.set(email, now);

    // Clean up old entries from rate limiting map (older than 1 hour)
    for (const [key, timestamp] of resendAttempts.entries()) {
      if (now - timestamp > 3600000) {
        resendAttempts.delete(key);
      }
    }

    // Send verification email via Klaviyo
    const klaviyoService = require('./services/klaviyoService');
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.headers.host || `localhost:${process.env.PORT || 3001}`;
    const siteUrl = `${protocol}://${host}`;
    
    await klaviyoService.trackEmailVerification({
      email: user.email,
      name: user.name,
      userId: user.id,
      verificationToken: newVerificationToken,
      siteUrl
    });

    logger.info(`Verification email resent to: ${email}`);

    res.json({
      message: 'Verification email sent successfully',
      nextAllowedTime: now + 59000 // Timestamp when next resend is allowed
    });

  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Login user
    const result = await authService.login(email, password);

    // Check if user has completed any test sessions
    let hasCompletedTest = false;
    try {
      const [testSessions] = await pool.execute(
        `SELECT COUNT(*) as count FROM user_sessions
         WHERE user_id = ? AND session_type IN ('tester', 'full')
         AND status = 'completed'`,
        [result.user.id]
      );
      hasCompletedTest = testSessions[0].count > 0;
    } catch (error) {
      logger.error('Error checking test completion:', error);
    }

    res.json({
      user: result.user,
      token: result.token,
      message: 'Login successful',
      hasCompletedTest: hasCompletedTest
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

app.get('/api/auth/profile', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

app.put('/api/auth/profile', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { name, phone, company, role, experienceYears } = req.body;

    const updatedUser = await authService.updateProfile(userId, {
      name,
      phone,
      company,
      role,
      experienceYears
    });

    res.json({ 
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Developer-only: reset guest test access
app.delete('/api/dev/reset-guest-test', async (req, res) => {
  const { secret, guestId } = req.query;
  if (!secret || secret !== process.env.DEV_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!guestId) {
    return res.status(400).json({ error: 'guestId is required' });
  }
  try {
    await pool.execute('DELETE FROM guest_test_sessions WHERE guest_id = ?', [guestId]);
    await pool.execute('DELETE FROM tester_job_titles WHERE guest_id = ?', [guestId]);
    res.json({ success: true, message: `Reset complete for guest ${guestId}` });
  } catch (error) {
    logger.error('Dev reset error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Progress API endpoints
app.get('/api/progress/detailed', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const progress = await databaseService.getUserInterviewProgress(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({ progress });
  } catch (error) {
    logger.error('Get detailed progress error:', error);
    res.status(500).json({ error: 'Failed to get progress data' });
  }
});

app.get('/api/progress/stats', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await databaseService.getUserInterviewStats(userId);
    
    res.json({ stats });
  } catch (error) {
    logger.error('Get progress stats error:', error);
    res.status(500).json({ error: 'Failed to get progress statistics' });
  }
});

app.get('/api/progress/dashboard', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get both existing progress and new interview stats
    const [progress, interviewStats] = await Promise.all([
      databaseService.getUserProgress(userId),
      databaseService.getUserInterviewStats(userId)
    ]);
    
    res.json({ 
      progress,
      interviewStats
    });
  } catch (error) {
    logger.error('Get dashboard data error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Forgot password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    try {
      // Generate reset token - this will throw an error if user doesn't exist
      const resetToken = await authService.generatePasswordResetToken(email);
      
      // Send reset email only if user exists
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetEmail({
        email,
        resetToken,
        resetUrl,
        siteUrl: `${req.protocol}://${req.get('host')}`
      });
      
      // Track password reset request in Klaviyo
      const klaviyoService = require('./services/klaviyoService');
      setImmediate(async () => {
        try {
          await klaviyoService.trackEvent('IC - Password Reset Requested', email, {
            email: email,
            reset_url: resetUrl,
            timestamp: new Date().toISOString()
          });
          logger.info(`Klaviyo password reset event tracked for: ${email}`);
        } catch (klaviyoError) {
          logger.error('Failed to track password reset in Klaviyo:', klaviyoError);
        }
      });
      
    } catch (tokenError) {
      // User doesn't exist, but don't reveal this for security
      logger.info(`Password reset requested for non-existent email: ${email}`);
    }
    
    // Always return the same message for security (don't reveal if email exists)
    res.json({ 
      success: true, 
      message: 'If an account with that email exists, you will receive a password reset email shortly.' 
    });
    
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Reset password
    const resetResult = await authService.resetPassword(token, newPassword);
    
    // Track password reset completion in Klaviyo
    if (resetResult && resetResult.email) {
      const klaviyoService = require('./services/klaviyoService');
      setImmediate(async () => {
        try {
          await klaviyoService.trackEvent('IC - Password Reset Completed', resetResult.email, {
            email: resetResult.email,
            timestamp: new Date().toISOString(),
            site_url: `${req.protocol}://${req.get('host')}`
          });
          logger.info(`Klaviyo password reset completion tracked for: ${resetResult.email}`);
        } catch (klaviyoError) {
          logger.error('Failed to track password reset completion in Klaviyo:', klaviyoError);
        }
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    });
    
  } catch (error) {
    logger.error('Reset password error:', error);
    
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new password reset.' });
    }
    
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.post('/api/auth/change-password', authService.authenticateToken.bind(authService), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(400).json({ error: error.message || 'Failed to change password' });
  }
});




// Google OAuth authentication endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Google doesn't return a country; derive it from the request IP so geo
    // reporting works for OAuth signups too (email signups collect it via form).
    const geoCountry = getCountryFromRequest(req);
    const result = await authService.googleAuth(idToken, geoCountry);

    // Check if user has completed any test sessions
    let hasCompletedTest = false;
    if (!result.isNewUser) {
      try {
        const [testSessions] = await pool.execute(
          `SELECT COUNT(*) as count FROM user_sessions
           WHERE user_id = ? AND session_type IN ('tester', 'full')
           AND status = 'completed'`,
          [result.user.id]
        );
        hasCompletedTest = testSessions[0].count > 0;
      } catch (error) {
        logger.error('Error checking test completion:', error);
      }
    }

    // If it's a new Google user, grant free trial and trigger welcome email
    if (result.isNewUser) {
      await grantFreeTrialSubscription(result.user.id);

      const klaviyoService = require('./services/klaviyoService');
      setImmediate(async () => {
        try {
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const host = req.headers.host || `localhost:${process.env.PORT || 3001}`;
          const siteUrl = `${protocol}://${host}`;
          
          logger.info(`Google user data for welcome email:`, {
            email: result.user.email,
            name: result.user.name,
            userId: result.user.id
          });
          
          await klaviyoService.trackSignup({
            email: result.user.email,
            name: result.user.name,
            userId: result.user.id,
            country: result.user.country,
            role: result.user.role,
            experienceYears: result.user.experience_years,
            siteUrl
          });
          logger.info(`Welcome email triggered for new Google user: ${result.user.email} with name: ${result.user.name}`);
        } catch (klaviyoError) {
          logger.error('Klaviyo welcome email error for Google user (non-critical):', klaviyoError);
        }
      });
    }

    res.json({
      message: result.isNewUser ? 'Account created successfully with Google' : 'Logged in successfully with Google',
      user: result.user,
      token: result.token,
      isNewUser: result.isNewUser,
      hasCompletedTest: hasCompletedTest
    });

  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(400).json({ error: error.message || 'Google authentication failed' });
  }
});

// Endpoint to get Google Client ID for frontend
app.get('/api/config/google-client-id', (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  
  // In development, return a test client ID to show the UI
  // This won't work for actual authentication but will show the buttons
  if (process.env.NODE_ENV === 'development' && (!googleClientId || googleClientId === 'your_google_client_id_here')) {
    // This is a dummy ID just to show the UI - replace with real one for authentication to work
    res.json({ 
      clientId: '123456789-abcdefghijklmnop.apps.googleusercontent.com',
      isDevelopment: true 
    });
  } else if (googleClientId && googleClientId !== 'your_google_client_id_here') {
    res.json({ clientId: googleClientId });
  } else {
    res.status(404).json({ error: 'Google OAuth not configured' });
  }
});


// Job role detection endpoint
app.post('/api/ai/detect-job-role', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const { jobDescription } = req.body;
        
        if (!jobDescription || typeof jobDescription !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Job description is required' 
            });
        }

        if (jobDescription.trim().length < 50) {
            return res.status(400).json({ 
                success: false, 
                error: 'Job description too short for accurate analysis' 
            });
        }

        const result = await aiInterviewerService.detectJobRole(jobDescription.trim());
        
        res.json({
            success: true,
            detectedRole: result.detectedRole,
            confidence: result.confidence
        });

    } catch (error) {
        logger.error('Error in job role detection endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to detect job role' 
        });
    }
});

// Endpoint to detect both job role and company from job description
app.post('/api/ai/detect-job-info', async (req, res) => {
    try {
        const { jobDescription } = req.body;
        
        if (!jobDescription || typeof jobDescription !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Job description is required' 
            });
        }

        if (jobDescription.trim().length < 20) {
            return res.status(400).json({ 
                success: false, 
                error: 'Job description too short for accurate analysis (minimum 20 characters)' 
            });
        }

        logger.info(`Detecting job info from description of length: ${jobDescription.length}`);
        const result = await aiInterviewerService.detectJobInfo(jobDescription.trim());
        
        logger.info('Job info detection result:', {
            detectedRole: result.detectedRole,
            detectedCompany: result.detectedCompany,
            detectedIndustry: result.detectedIndustry,
            roleConfidence: result.roleConfidence,
            companyConfidence: result.companyConfidence,
            industryConfidence: result.industryConfidence
        });
        
        res.json({
            success: true,
            detectedRole: result.detectedRole,
            detectedCompany: result.detectedCompany,
            detectedIndustry: result.detectedIndustry,
            roleConfidence: result.roleConfidence,
            companyConfidence: result.companyConfidence,
            industryConfidence: result.industryConfidence
        });

    } catch (error) {
        logger.error('Error in job info detection endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to detect job information' 
        });
    }
});

// Job title suggestions endpoint (real-time autocomplete + typo correction) — no auth required (used by guests too)
app.post('/api/ai/job-title-suggestions', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Query must be at least 2 characters'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const trimmedQuery = query.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a job title autocomplete engine. Return JSON only with keys "suggestions" (array of up to 6 real, common job titles in Title Case) and "correctedTitle" (string or null). If the user input has an obvious typo and the intended job title is clear, set correctedTitle to the corrected title. Otherwise use null. Do NOT include company names, levels, or locations unless the user explicitly typed them. The JSON must be valid.'
        },
        {
          role: 'user',
          content: `User input: "${trimmedQuery}"`
        }
      ]
    });

    const content = response.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logger.warn('Failed to parse job title suggestions JSON:', { content });
    }

    let suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    suggestions = suggestions
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    suggestions = [...new Set(suggestions)].slice(0, 6);

    const correctedTitle = typeof parsed.correctedTitle === 'string' && parsed.correctedTitle.trim()
      ? parsed.correctedTitle.trim()
      : null;

    res.json({
      suggestions,
      correctedTitle
    });
  } catch (error) {
    logger.error('Error generating job title suggestions:', error);
    res.status(500).json({
      error: 'Failed to generate job title suggestions'
    });
  }
});

// Endpoint to generate AI insights based on session performance
app.post('/api/ai/question-strategy', async (req, res) => {
    try {
        const { jobTitle, jobDescription } = req.body;
        if (!jobTitle) return res.status(400).json({ success: false, error: 'jobTitle is required' });

        const validTypes = ['technical','behavioral','situational','competency','leadership','problem-solving','creativity','conflict','motivation','culture','growth','stress','communication','time-management','teamwork','interview-essentials','adaptability','mixed'];

        const prompt = `You are an expert interview coach. Given the job title and job description below, decide:
1. The single most appropriate question type for this role from this list: ${validTypes.join(', ')}
   - Use "mixed" only if the role genuinely spans multiple very different question types
   - NEVER choose based on generic HR criteria like salary or benefits — focus on the actual job skills
2. A one-sentence focus instruction for the AI interviewer that names specific responsibilities, skills, or tools relevant to this exact role (do NOT write something generic like "focus on role-specific scenarios")

Job Title: ${jobTitle}
Job Description: ${(jobDescription || '').substring(0, 800)}

Respond in this exact JSON format with no other text:
{"questionType":"<one of the valid types>","focusInstruction":"<one sentence targeting the actual job duties>"}`;

        const result = await gptService.generateChatCompletion([
            { role: 'system', content: 'You are an expert interview coach. Respond only with valid JSON.' },
            { role: 'user', content: prompt }
        ], { temperature: 0.3, max_tokens: 120, stream: false });

        let parsed;
        try {
            parsed = JSON.parse(result.trim());
        } catch (e) {
            const match = result.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : null;
        }

        if (!parsed || !validTypes.includes(parsed.questionType)) {
            return res.json({ success: true, questionType: 'mixed', focusInstruction: `Focus on role-specific responsibilities and real-world scenarios for a ${jobTitle}.` });
        }

        res.json({ success: true, questionType: parsed.questionType, focusInstruction: parsed.focusInstruction });
    } catch (error) {
        logger.error('Error detecting question strategy:', error);
        res.json({ success: true, questionType: 'mixed', focusInstruction: `Focus on role-specific responsibilities for a ${req.body?.jobTitle || 'this role'}.` });
    }
});

app.post('/api/ai/model-answer', async (req, res) => {
    try {
        const { question, jobDescription, resume, detectedRole, questionType } = req.body;
        if (!question) return res.status(400).json({ success: false, error: 'question is required' });
        const result = await aiInterviewerService.generateModelAnswer({ question, jobDescription, resume, detectedRole, questionType });
        if (!result) return res.status(500).json({ success: false, error: 'Failed to generate model answer' });
        res.json({ success: true, answer: result.answer, isBehavioural: result.isBehavioural });
    } catch (error) {
        logger.error('Error generating model answer:', error);
        res.status(500).json({ success: false, error: 'Failed to generate model answer' });
    }
});

app.post('/api/ai/generate-session-insights', async (req, res) => {
    try {
        const { feedbackData, sessionConfig } = req.body;
        
        if (!feedbackData || !Array.isArray(feedbackData) || feedbackData.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Feedback data is required' 
            });
        }

        logger.info(`Generating session insights for ${feedbackData.length} questions`);
        const insights = await aiInterviewerService.generateSessionInsights(feedbackData, sessionConfig);
        
        res.json({
            success: true,
            insights: insights
        });

    } catch (error) {
        logger.error('Error generating session insights:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to generate session insights' 
        });
    }
});

// Package and subscription management routes
app.get('/api/packages', async (req, res) => {
    try {
        const packages = await databaseService.getAllPackages();
        res.json({ success: true, packages });
    } catch (error) {
        logger.error('Error getting packages:', error);
        res.status(500).json({ success: false, error: 'Failed to get packages' });
    }
});

app.get('/api/packages/:packageId', async (req, res) => {
    try {
        const packageData = await databaseService.getPackageById(req.params.packageId);
        if (!packageData) {
            return res.status(404).json({ success: false, error: 'Package not found' });
        }
        res.json({ success: true, package: packageData });
    } catch (error) {
        logger.error('Error getting package:', error);
        res.status(500).json({ success: false, error: 'Failed to get package' });
    }
});

app.get('/api/user/subscription', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const userId = req.user.userId;
        const subscription = await databaseService.getUserActiveSubscription(userId);
        res.json({ success: true, subscription });
    } catch (error) {
        logger.error('Error getting user subscription:', error);
        res.status(500).json({ success: false, error: 'Failed to get subscription' });
    }
});

app.get('/api/user/access-level', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const userId = req.user.userId;
        const accessLevel = await databaseService.getUserAccessLevel(userId);
        res.json({ success: true, ...accessLevel });
    } catch (error) {
        logger.error('Error getting user access level:', error);
        res.status(500).json({ success: false, error: 'Failed to get access level' });
    }
});

// Check if user can access test mode (supports both authenticated users and guests)
app.get('/api/check-test-access', async (req, res) => {
    // Block search engine crawlers
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(userAgent);
    if (isBot) {
        return res.status(404).send('Not Found');
    }

    try {
        // Authenticated users are never allowed into test mode — they use practice mode instead
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = authService.verifyToken(token);
            if (!decoded) {
                return res.status(403).json({ success: false, error: 'Invalid token' });
            }
            return res.json({ success: true, hasAccess: false });
        }

        // Guest user path — check guest_test_sessions table
        const guestId = req.headers['x-guest-id'];
        const mode = req.query.mode || 'practice';
        if (!guestId) {
            // No guest ID yet — brand new visitor, allow access
            return res.json({ success: true, hasAccess: true });
        }
        const [guestRecords] = await pool.execute(
            'SELECT id FROM guest_test_sessions WHERE guest_id = ? AND mode = ?',
            [guestId, mode]
        );
        return res.json({ success: true, hasAccess: guestRecords.length === 0 });

    } catch (error) {
        logger.error('Error checking test access:', error);
        res.status(500).json({ success: false, error: 'Failed to check test access' });
    }
});

// Mark test as used (supports both authenticated users and guests)
app.post('/api/mark-test-used', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Authenticated user — update DB flag
            const decoded = authService.verifyToken(token);
            if (!decoded) {
                return res.status(403).json({ success: false, error: 'Invalid token' });
            }
            const userId = decoded.id || decoded.userId;
            await pool.execute('UPDATE users SET has_used_test = TRUE WHERE id = ?', [userId]);
            return res.json({ success: true, message: 'Test marked as used successfully' });
        }

        // Guest user — record guest_id + mode in guest_test_sessions
        const { guestId, mode: bodyMode } = req.body || {};
        const mode = bodyMode || 'practice';
        if (guestId && typeof guestId === 'string' && guestId.trim()) {
            await pool.execute(
                'INSERT IGNORE INTO guest_test_sessions (guest_id, mode) VALUES (?, ?)',
                [guestId.trim().slice(0, 64), mode]
            );
        }
        return res.json({ success: true, message: 'Test marked as used successfully' });

    } catch (error) {
        logger.error('Error marking test as used:', error);
        res.status(500).json({ success: false, error: 'Failed to mark test as used' });
    }
});

// Record tester job title (test page) — auth optional, guests skip DB recording
app.post('/api/tester/job-title', async (req, res) => {
    try {
        // Resolve userId if authenticated (guests have no userId — recording skipped)
        let userId = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = authService.verifyToken(token);
            if (decoded) userId = decoded.id || decoded.userId;
        }

        const { jobTitle, difficultyLevel, questionType, language, additionalInfo } = req.body;

        if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Job title is required'
            });
        }

        const trimmedTitle = jobTitle.trim().slice(0, 255);
        const normalizedTitle = trimmedTitle.toLowerCase().replace(/\s+/g, ' ');
        const safeAdditionalInfo = typeof additionalInfo === 'string' ? additionalInfo.trim() : '';
        const metadata = {
            difficultyLevel: typeof difficultyLevel === 'string' ? difficultyLevel.trim().slice(0, 50) : null,
            questionType: typeof questionType === 'string' ? questionType.trim().slice(0, 100) : null,
            language: typeof language === 'string' ? language.trim().slice(0, 50) : null,
            hasAdditionalInfo: safeAdditionalInfo.length > 0,
            additionalInfoLength: safeAdditionalInfo.length
        };

        // Record to DB — authenticated users by userId, guests by guestId
        const { guestId } = req.body || {};
        const safeGuestId = (!userId && guestId && typeof guestId === 'string') ? guestId.trim().slice(0, 64) : null;
        if (userId || safeGuestId) {
            await databaseService.recordTesterJobTitle(userId || null, trimmedTitle, normalizedTitle, metadata, safeGuestId);
        }

        res.json({
            success: true
        });
    } catch (error) {
        logger.error('Error recording tester job title:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record job title'
        });
    }
});

// Generate AI demo profile for test mode (resume + job description)
app.post('/api/tester/demo-profile', async (req, res) => {
    try {
        const { industry, roleTitle, experienceYears } = req.body || {};
        if (!industry && !roleTitle) {
            return res.status(400).json({
                success: false,
                error: 'industry or roleTitle is required'
            });
        }

        const profile = await aiInterviewerService.generateDemoProfile({
            industry,
            roleTitle,
            experienceYears
        });

        res.json(profile);
    } catch (error) {
        logger.error('Error generating demo profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate demo profile'
        });
    }
});

// Stripe payment endpoints
app.post('/api/create-checkout-session', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const { packageId, successUrl, cancelUrl, currency = 'GBP', uiMode = 'hosted' } = req.body;
        let userId = req.user.id;

        logger.info('Create checkout session request:', {
            userId,
            userEmail: req.user.email,
            reqUser: req.user,
            packageId,
            successUrl,
            cancelUrl,
            currency,
            uiMode
        });

        // Fallback: resolve real user ID via email if JWT id is stale
        if (userId) {
            const [check] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
            if (!check.length && req.user.email) {
                logger.warn(`User id=${userId} not found, falling back to email lookup for ${req.user.email}`);
                const [byEmail] = await pool.execute('SELECT id FROM users WHERE email = ?', [req.user.email]);
                if (byEmail.length) {
                    userId = byEmail[0].id;
                    logger.info(`Resolved userId via email: ${userId}`);
                }
            }
        }
        
        if (uiMode === 'custom') {
            // Handle custom UI mode (embedded checkout)
            logger.info('Creating custom UI checkout session...');
            const session = await stripeService.createCustomCheckoutSession(userId, packageId, currency);
            
            // Get package info for the frontend
            const [packages] = await pool.execute(
                'SELECT * FROM packages WHERE id = ? AND is_active = TRUE',
                [packageId]
            );
            
            if (!packages.length) {
                throw new Error('Package not found');
            }
            
            const packageData = packages[0];
            
            logger.info('Custom checkout session created successfully:', {
                sessionId: session.id,
                clientSecret: session.client_secret
            });
            
            res.json({ 
                success: true, 
                clientSecret: session.client_secret,
                sessionId: session.id,
                packageInfo: {
                    id: packageData.id,
                    name: packageData.name,
                    description: packageData.description,
                    formattedPrice: `£${packageData.price_gbp}`,
                    currency: currency
                }
            });
            
        } else {
            // Handle hosted checkout (legacy)
            if (!packageId || !successUrl || !cancelUrl) {
                logger.error('Missing required parameters:', { packageId, successUrl, cancelUrl });
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required parameters' 
                });
            }
            
            logger.info('Calling stripeService.createCheckoutSession...');
            const session = await stripeService.createCheckoutSession(
                userId, 
                packageId, 
                successUrl, 
                cancelUrl,
                currency
            );
            
            logger.info('Checkout session created successfully:', {
                sessionId: session.id,
                sessionUrl: session.url
            });
            
            res.json({ 
                success: true, 
                sessionUrl: session.url,
                sessionId: session.id 
            });
        }
        
    } catch (error) {
        logger.error('Error creating checkout session:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            packageId: req.body?.packageId
        });
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create checkout session' 
        });
    }
});

// Create Payment Intent for Stripe Elements (embedded components)
app.post('/api/create-payment-intent', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const { packageId, currency = 'GBP' } = req.body;
        let userId = req.user.id;

        logger.info('Create payment intent request:', {
            userId,
            userEmail: req.user.email,
            reqUser: req.user,
            packageId,
            currency
        });

        // Fallback: if userId from JWT doesn't match any user (stale token after DB migration),
        // resolve the real ID via email
        if (userId) {
            const [check] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
            if (!check.length && req.user.email) {
                logger.warn(`User id=${userId} not found, falling back to email lookup for ${req.user.email}`);
                const [byEmail] = await pool.execute('SELECT id FROM users WHERE email = ?', [req.user.email]);
                if (byEmail.length) {
                    userId = byEmail[0].id;
                    logger.info(`Resolved userId via email: ${userId}`);
                }
            }
        }

        const paymentIntent = await stripeService.createPaymentIntent(userId, packageId, currency);
        
        // Get package info for the response
        const [packages] = await pool.execute(
            'SELECT name, questions_per_month FROM packages WHERE id = ? AND is_active = TRUE',
            [packageId]
        );
        
        const packageData = packages[0] || { name: 'Good Chat Package', questions_per_month: 50 };
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            packageInfo: {
                id: packageId,
                name: packageData.name,
                questionsPerMonth: packageData.questions_per_month
            }
        });
        
    } catch (error) {
        logger.error('Error creating payment intent:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            packageId: req.body?.packageId
        });
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create payment intent' 
        });
    }
});

// Helper: resolve the correct DB userId even if the JWT has a stale userId
async function resolveUserId(req) {
    let userId = req.user.id;
    if (userId) {
        const [check] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
        if (!check.length && req.user.email) {
            const [byEmail] = await pool.execute('SELECT id FROM users WHERE email = ?', [req.user.email]);
            if (byEmail.length) {
                logger.info(`resolveUserId: stale JWT userId ${userId} resolved to ${byEmail[0].id} via email`);
                userId = byEmail[0].id;
            }
        }
    }
    return userId;
}

// Confirm Payment Intent (called after user completes payment on frontend)
app.post('/api/confirm-payment', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const { paymentIntentId, packageId } = req.body;
        const userId = req.user.id;
        
        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                error: 'Payment Intent ID is required'
            });
        }
        
        logger.info('Confirm payment request:', {
            jwtUserId: userId,
            paymentIntentId,
            packageId: packageId || 'from metadata',
            userEmail: req.user.email
        });

        const result = await stripeService.confirmPayment(paymentIntentId, userId, packageId);
        
        // Track purchase in Klaviyo (non-blocking)
        setImmediate(async () => {
            try {
                const klaviyoService = require('./services/klaviyoService');
                const actualUserId = result.userId || userId;
                const actualPackageId = result.packageId || packageId;
                
                if (!actualUserId || !actualPackageId) {
                    logger.warn('Missing userId or packageId for Klaviyo tracking');
                    return;
                }
                
                // Get user and package details for Klaviyo
                const user = await authService.getUserById(actualUserId);
                const packageData = await databaseService.getPackageById(actualPackageId);
                
                if (user && packageData && !result.alreadyProcessed) {
                    // Use trackPurchase method which includes first_name
                    await klaviyoService.trackPurchase(
                        { 
                            email: user.email, 
                            name: user.name, 
                            userId: user.id 
                        },
                        { 
                            packageName: packageData.name,
                            price: packageData.price_gbp,
                            currency: '£',
                            questions: packageData.questions_per_month
                        }
                    );
                    
                    logger.info(`Klaviyo package purchase tracked for: ${user.email}`);
                } else {
                    logger.info('Skipping Klaviyo tracking - user:', !!user, 'packageData:', !!packageData, 'alreadyProcessed:', result.alreadyProcessed);
                }
            } catch (klaviyoError) {
                logger.error('Failed to track package purchase in Klaviyo:', klaviyoError);
            }
        });
        
        res.json({
            success: true,
            subscription: result
        });
        
    } catch (error) {
        logger.error('Error confirming payment:', {
            error: error.message,
            userId: req.user?.id,
            paymentIntentId: req.body?.paymentIntentId
        });
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to confirm payment' 
        });
    }
});

// Get Stripe configuration (publishable key)
app.get('/api/stripe/config', (req, res) => {
    res.json({
        success: true,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Check subscription status
app.get('/api/subscription/status', (req, res, next) => {
    // Check if this is a search engine crawler
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(userAgent);
    
    if (isBot) {
        // Return 404 for crawlers - these API endpoints shouldn't be indexed
        return res.status(404).send('Not Found');
    }
    
    // Continue with authentication for real users
    authService.authenticateToken(req, res, () => {
        next();
    });
}, async (req, res) => {
    try {
        const userId = await resolveUserId(req);
        const subscription = await stripeService.checkUserSubscription(userId);

        res.json({
            success: true,
            hasActiveSubscription: !!subscription,
            subscription: subscription
        });
    } catch (error) {
        logger.error('Error checking subscription status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check subscription status'
        });
    }
});

// Get subscription history
app.get('/api/subscription/history', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const userId = await resolveUserId(req);
        const history = await stripeService.getUserSubscriptionHistory(userId);
        
        res.json({ 
            success: true, 
            history 
        });
    } catch (error) {
        logger.error('Error getting subscription history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get subscription history' 
        });
    }
});

// Get remaining questions for user
app.get('/api/user/questions-remaining', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const userId = await resolveUserId(req);
        const subscription = await stripeService.checkUserSubscription(userId);
        
        if (!subscription) {
            return res.json({ 
                success: true, 
                hasActiveSubscription: false,
                questionsRemaining: 0 
            });
        }
        
        res.json({ 
            success: true, 
            hasActiveSubscription: true,
            questionsRemaining: subscription.questions_remaining,
            questionsUsed: subscription.questions_used,
            packageName: subscription.package_name
        });
    } catch (error) {
        logger.error('Error getting questions remaining:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get questions remaining' 
        });
    }
});

// Get Stripe publishable key for frontend
app.get('/api/stripe/config', (req, res) => {
    res.json({
        publishableKey: stripeService.publishableKey
    });
});

// Handle payment success (called from success_url redirect)
app.get('/api/payment/success', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const { session_id } = req.query;
        const userId = req.user.userId;
        
        if (!session_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing session_id parameter'
            });
        }
        
        logger.info(`Processing payment success for user ${userId}, session ${session_id}`);
        
        // Process the successful payment
        const result = await stripeService.handleSuccessfulPayment(session_id);
        
        logger.info(`Payment processed successfully:`, result);

        // Track package purchase in Klaviyo (non-blocking)
        try {
            const klaviyoService = require('./services/klaviyoService');
            
            // Ensure we have valid IDs before proceeding
            const actualUserId = result.userId || userId;
            const actualPackageId = result.packageId;
            
            logger.info('Klaviyo tracking - userId:', actualUserId, 'packageId:', actualPackageId, 'alreadyProcessed:', result.alreadyProcessed);
            
            if (!actualUserId || !actualPackageId) {
                logger.warn('Missing userId or packageId for Klaviyo tracking');
                return;
            }
            
            // Get user and package details for Klaviyo
            const user = await authService.getUserById(actualUserId);
            const packageData = await databaseService.getPackageById(actualPackageId);
            
            if (user && packageData && !result.alreadyProcessed) {
                // Use trackPurchase method which includes first_name
                await klaviyoService.trackPurchase(
                    { 
                        email: user.email, 
                        name: user.name, 
                        userId: user.id 
                    },
                    { 
                        packageName: packageData.name,
                        price: packageData.price_gbp,
                        currency: '£',
                        questions: packageData.questions_per_month
                    }
                );
                
                logger.info(`Klaviyo package purchase tracked for: ${user.email}`);
            } else {
                logger.info('Skipping Klaviyo tracking - user:', !!user, 'packageData:', !!packageData, 'alreadyProcessed:', result.alreadyProcessed);
            }
        } catch (klaviyoError) {
            logger.error('Failed to track package purchase in Klaviyo:', klaviyoError);
            // Don't fail the response for Klaviyo errors
        }
        
        res.json({
            success: true,
            message: 'Payment processed successfully',
            subscription: result
        });
        
    } catch (error) {
        logger.error('Error processing payment success:', error);
        logger.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process payment'
        });
    }
});

// Test endpoint to check if everything is working
app.get('/api/test', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user,
            message: 'API is working',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create Stripe price objects (development helper)
app.post('/api/stripe/create-prices', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        logger.info('Creating Stripe price objects...');

        // Create price for Starter plan (£6.99 for 50 questions)
        const starterPrice = await stripeService.stripe.prices.create({
            product_data: {
                name: 'Starter Plan',
                description: '50 interview questions per month'
            },
            unit_amount: 699, // £6.99 in pence
            currency: 'gbp',
        });

        // Create price for Professional plan (£10.99 for 100 questions)
        const professionalPrice = await stripeService.stripe.prices.create({
            product_data: {
                name: 'Professional Plan',
                description: '100 interview questions per month'
            },
            unit_amount: 1099, // £10.99 in pence
            currency: 'gbp',
        });

        logger.info('Stripe prices created:', {
            starter: starterPrice.id,
            professional: professionalPrice.id
        });

        res.json({
            success: true,
            prices: {
                starter: starterPrice.id,
                professional: professionalPrice.id
            },
            message: `Add these to your .env file:
STRIPE_PRICE_ID_50=${starterPrice.id}
STRIPE_PRICE_ID_100=${professionalPrice.id}`
        });
    } catch (error) {
        logger.error('Error creating Stripe prices:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/user/practice-sessions', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        
        const sessions = await databaseService.getUserPracticeSessions(userId, limit, offset);
        res.json({ success: true, sessions });
    } catch (error) {
        logger.error('Error getting user practice sessions:', error);
        res.status(500).json({ success: false, error: 'Failed to get practice sessions' });
    }
});

app.get('/api/tester-question', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const targetRole = req.query.role || 'your target role';
        const question = await databaseService.getTesterQuestion(targetRole);
        res.json({ success: true, question });
    } catch (error) {
        logger.error('Error getting tester question:', error);
        res.status(500).json({ success: false, error: 'Failed to get tester question' });
    }
});

// Get remaining questions for user
app.get('/api/user/remaining-questions', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const userId = await resolveUserId(req);
        const remainingInfo = await authService.getRemainingQuestions(userId);
        res.json(remainingInfo);
    } catch (error) {
        logger.error('Error getting remaining questions:', error);
        res.status(500).json({ error: 'Failed to get remaining questions' });
    }
});

app.post('/api/practice-session', authService.requireSubscription.bind(authService), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { sessionType, questionText, targetRole, industry, jobDescription, resumeContent } = req.body;
        
        // Check remaining questions before starting session
        const remainingInfo = await authService.getRemainingQuestions(userId);
        if (remainingInfo.remainingQuestions <= 0) {
            return res.status(403).json({ 
                error: 'No questions remaining in your subscription',
                remainingQuestions: 0,
                periodEnd: remainingInfo.periodEnd
            });
        }
        
        // Check user access level
        const accessLevel = await databaseService.getUserAccessLevel(userId);
        
        let subscriptionId = null;
        
        if (sessionType === 'full') {
            if (accessLevel.accessLevel === 'free') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Full practice mode requires an active subscription',
                    requiresUpgrade: true 
                });
            }
            
            if (!accessLevel.canGenerateQuestions) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'No questions remaining in your current subscription',
                    requiresUpgrade: true 
                });
            }
            
            subscriptionId = accessLevel.subscriptionDetails.id;
        }
        
        const sessionId = await databaseService.createPracticeSession(
            userId, sessionType, questionText, subscriptionId, targetRole, industry, jobDescription, resumeContent
        );
        
        // Question usage tracking is now handled in databaseService.saveSession() when questions are answered
        
        // Return session ID and remaining questions
        res.json({ 
            success: true, 
            sessionId,
            remainingQuestions: remainingInfo.remainingQuestions,
            maxQuestionsForSession: Math.min(5, remainingInfo.remainingQuestions) // Limit to 5 or remaining, whichever is less
        });
    } catch (error) {
        logger.error('Error creating practice session:', error);
        res.status(500).json({ success: false, error: 'Failed to create practice session' });
    }
});

app.put('/api/practice-session/:sessionId', authService.authenticateToken.bind(authService), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            userResponse, 
            aiFeedback, 
            confidenceScore, 
            improvementAreas, 
            strengths, 
            suggestions, 
            tips, 
            duration 
        } = req.body;
        
        await databaseService.updatePracticeSession(
            sessionId, userResponse, aiFeedback, confidenceScore, 
            improvementAreas, strengths, suggestions, tips, duration
        );
        
        res.json({ success: true });
    } catch (error) {
        logger.error('Error updating practice session:', error);
        res.status(500).json({ success: false, error: 'Failed to update practice session' });
    }
});

// Legacy endpoint for backward compatibility
app.post('/api/user', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const userId = await databaseService.createOrUpdateUser(email, name);
    res.json({ userId });
  } catch (error) {
    logger.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Failed to create/update user' });
  }
});

// Admin Dashboard Routes
const adminAuth = require('./middleware/adminAuth');
const adminService = require('./services/adminService');

// Serve admin dashboard page
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'admin-dashboard.html'));
});

// Admin API Routes
app.get('/api/admin/info', adminAuth.authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        name: req.admin.name,
        email: req.admin.email
    });
});

app.get('/api/admin/metrics', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const { dateFilter } = req.query;
        const metrics = await adminService.getDashboardMetrics(dateFilter);
        res.json(metrics);
    } catch (error) {
        logger.error('Admin metrics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load metrics'
        });
    }
});

app.get('/api/admin/charts', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const { dateFilter } = req.query;
        const chartData = await adminService.getChartData(dateFilter);
        res.json(chartData);
    } catch (error) {
        logger.error('Admin charts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load chart data'
        });
    }
});

app.get('/api/admin/activity', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const activities = await adminService.getRecentActivity(limit);
        res.json(activities);
    } catch (error) {
        logger.error('Admin activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load recent activity'
        });
    }
});

app.get('/api/admin/health', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const health = await adminService.getSystemHealth();
        res.json(health);
    } catch (error) {
        logger.error('Admin health check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check system health'
        });
    }
});

app.get('/api/admin/user-activity', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const { dateFilter, limit, offset = 0 } = req.query;
        const parsedLimit = limit === 'all' || limit === undefined ? null : parseInt(limit, 10);
        const parsedOffset = parsedLimit === null ? 0 : parseInt(offset, 10) || 0;
        const userActivity = await adminService.getUserActivity(dateFilter, parsedLimit, parsedOffset);
        res.json(userActivity);
    } catch (error) {
        logger.error('Admin user activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load user activity'
        });
    }
});

app.get('/api/admin/tester-insights', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const { dateFilter } = req.query;
        const insights = await adminService.getTesterInsights(dateFilter);
        res.json(insights);
    } catch (error) {
        logger.error('Admin tester insights error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load tester insights'
        });
    }
});

app.get('/api/admin/tester-users', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const { dateFilter } = req.query;
        const users = await adminService.getTesterUsers(dateFilter);
        res.json(users);
    } catch (error) {
        logger.error('Admin tester users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load tester users'
        });
    }
});

app.get('/api/admin/guest-sessions', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const { dateFilter } = req.query;
        const sessions = await adminService.getGuestSessions(dateFilter);
        res.json(sessions);
    } catch (error) {
        logger.error('Admin guest sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load guest sessions'
        });
    }
});

app.post('/api/admin/trigger-backup', adminAuth.authenticateAdmin, async (req, res) => {
    try {
        const { runBackupOnce } = require('./jobs/dbBackupJob');
        res.json({ success: true, message: 'Backup started — check server logs for progress' });
        await runBackupOnce();
    } catch (error) {
        logger.error('Manual backup trigger error:', error);
    }
});

// Live reload setup for development
const browserOpenedFile = path.join(__dirname, '.browser-opened');

if (isDevelopment) {
  const chokidar = require('chokidar');
  const liveReloadNamespace = io.of('/livereload');
  
  liveReloadNamespace.on('connection', (socket) => {
    logger.info(`Live reload client connected: ${socket.id}`);
    // Mark that browser has been opened
    fs.writeFileSync(browserOpenedFile, Date.now().toString());
    
    socket.on('disconnect', () => {
      logger.info(`Live reload client disconnected: ${socket.id}`);
      // Check if this was the last client after a delay
      setTimeout(() => {
        if (liveReloadNamespace.sockets.size === 0) {
          // All clients disconnected - delete the file so browser can be opened again
          if (fs.existsSync(browserOpenedFile)) {
            fs.unlinkSync(browserOpenedFile);
            logger.info('All live reload clients disconnected - browser can be opened again if needed');
          }
        }
      }, 3000);
    });
  });

  // Watch for file changes
  const watcher = chokidar.watch(['public/', 'services/', 'config/', 'server.js'], {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100
    }
  });

  watcher.on('change', (filePath) => {
    logger.info(`🔄 File changed: ${filePath}`);
    logger.info(`Broadcasting reload to ${liveReloadNamespace.sockets.size} live reload clients...`);
    liveReloadNamespace.emit('reload');
  });

  watcher.on('ready', () => {
    logger.info('🔄 File watcher is ready');
  });

  watcher.on('error', (error) => {
    logger.error('File watcher error:', error);
  });

  logger.info('🔄 Live reload enabled - watching for file changes...');
}

// Catch-all handler: serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
    // Only serve index.html for routes that don't start with /api
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`🌐 App available at: http://localhost:${PORT}`);
  
  // Initialize database
  const dbConnected = await testConnection();
  if (dbConnected) {
    await initializeDatabase();
    logger.info('Database initialized successfully');
  } else {
    logger.error('Failed to connect to database');
  }
  
  if (isDevelopment) {
    const url = `http://localhost:${PORT}`;
    
    // Check if browser was ever opened using persistent file
    const browserWasOpened = fs.existsSync(browserOpenedFile);
    
    if (!browserWasOpened) {
      logger.info('🌐 First time - opening browser');
      setTimeout(() => {
        import('open').then(({ default: open }) => {
          open(url, { 
            wait: false,
            newInstance: false
          });
        }).catch(err => {
          logger.error('Failed to open browser:', err);
        });
      }, 1000);
    } else {
      logger.info('🔄 Browser was previously opened - just refreshing existing tabs');
      // Wait for clients to reconnect and refresh them
      setTimeout(() => {
        const liveReloadClients = io.of('/livereload').sockets.size;
        if (liveReloadClients > 0) {
          logger.info(`🔄 Found ${liveReloadClients} client(s) - sending reload`);
          io.of('/livereload').emit('reload');
        } else {
          logger.info('ℹ️ Waiting for browser to reconnect...');
        }
      }, 1500);
    }
  }

  try {
    const { startDbBackupCron } = require('./jobs/dbBackupJob');
    startDbBackupCron();
    logger.info('DB backup cron initialized');
  } catch (error) {
    logger.error('Failed to start DB backup cron:', error);
  }

});
