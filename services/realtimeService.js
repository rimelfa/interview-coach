const WebSocket = require('ws');
const winston = require('winston');

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

class RealtimeService {
  constructor() {
    this.ws = null;
    this.sessionActive = false;
    this.eventHandlers = new Map();
    this.conversationHistory = [];
    this.currentTranscript = '';
    this.audioBytesSent = 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.sessionLimitHit = false;
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-realtime-1.5', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.setupEventHandlers();
    } catch (error) {
      logger.error('Failed to connect to Realtime API:', error);
    }
  }

  setupEventHandlers() {
    this.ws.on('open', () => {
      logger.info('Connected to OpenAI Realtime API');
      this.sessionActive = true;
      this.reconnectAttempts = 0;
      
      // Configure the session for transcription
      this.sendEvent({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are transcribing a professional interview conversation. Provide accurate real-time transcription.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'gpt-4o-transcribe'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 300
          }
        }
      });
    });

    this.ws.on('message', (data) => {
      try {
        const event = JSON.parse(data);
        this.handleServerEvent(event);
      } catch (error) {
        logger.error('Error parsing server message:', error);
      }
    });

    this.ws.on('close', () => {
      logger.info('Disconnected from Realtime API');
      this.sessionActive = false;

      if (this.sessionLimitHit) {
        logger.warn('Session hit 60-minute limit — notifying client, not reconnecting');
        this.emit('session_limit_reached', {});
        this.sessionLimitHit = false;
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached — stopping`);
        this.emit('session_limit_reached', {});
        return;
      }

      const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;
      setTimeout(() => {
        logger.info('Attempting to reconnect...');
        this.connect();
      }, delay);
    });

    this.ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  }

  handleServerEvent(event) {
    logger.info(`Received event: ${event.type}`);

    switch(event.type) {
      case 'session.created':
        logger.info('Session created successfully');
        break;

      case 'session.updated':
        logger.info('Session updated successfully');
        break;

      case 'input_audio_buffer.speech_started':
        logger.info('Speech started');
        this.emit('speech_started', { timestamp: Date.now() });
        break;

      case 'input_audio_buffer.speech_stopped':
        logger.info('Speech stopped');
        this.emit('speech_stopped', { timestamp: Date.now() });
        break;

      case 'input_audio_buffer.committed':
        logger.info('Audio buffer committed');
        break;

      case 'conversation.item.input_audio_transcription.delta':
        // Real-time word-by-word transcription delta as the user speaks
        if (event.delta) {
          this.emit('transcription_delta', {
            delta: event.delta,
            itemId: event.item_id,
            timestamp: Date.now()
          });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Accurate final transcription after VAD detects end of utterance
        const transcript = event.transcript;
        if (transcript && transcript.trim()) {
          logger.info(`Transcription completed: "${transcript}"`);
          this.currentTranscript = transcript;

          this.conversationHistory.push({
            timestamp: Date.now(),
            text: transcript,
            type: 'transcription'
          });

          this.emit('transcription_complete', {
            text: transcript,
            itemId: event.item_id,
            timestamp: Date.now()
          });
        }
        break;

      case 'conversation.item.input_audio_transcription.failed':
        logger.error('Transcription failed:', event.error);
        this.emit('transcription_error', { error: event.error });
        break;

      case 'response.audio_transcript.delta':
        // Real-time transcript updates (partial)
        if (event.delta) {
          logger.info(`Live transcript delta: "${event.delta}"`);
          this.emit('live_transcript', {
            text: event.delta,
            timestamp: Date.now()
          });
        }
        break;

      case 'response.done':
        // Complete response
        logger.info('Response completed');
        break;

      case 'error':
        logger.error('Server error:', event.error);
        if (event.error?.message?.includes('maximum duration')) {
          this.sessionLimitHit = true;
        }
        this.emit('error', { error: event.error });
        break;

      default:
        logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  // Send audio data to the Realtime API
  sendAudio(audioData) {
    if (!this.sessionActive || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send audio: session not active or WebSocket not open');
      return;
    }

    try {
      // Convert base64 audio to buffer if needed
      let audioBuffer;
      if (typeof audioData === 'string') {
        audioBuffer = Buffer.from(audioData, 'base64');
      } else {
        audioBuffer = audioData;
      }

      this.sendEvent({
        type: 'input_audio_buffer.append',
        audio: audioBuffer.toString('base64')
      });
      this.audioBytesSent += audioBuffer.length;
    } catch (error) {
      logger.error('Error sending audio:', error);
    }
  }

  // Commit the audio buffer for processing
  commitAudio() {
    if (!this.sessionActive) return;

    // OpenAI requires at least 100ms of audio (~3200 bytes at 16kHz 16-bit mono)
    // Skip commit if no audio was actually sent to avoid "buffer too small" errors
    if (this.audioBytesSent < 3200) {
      logger.warn(`Skipping audio commit — only ${this.audioBytesSent} bytes sent (minimum 3200)`);
      this.audioBytesSent = 0;
      return;
    }

    this.sendEvent({
      type: 'input_audio_buffer.commit'
    });
    this.audioBytesSent = 0;
  }

  // Clear the audio buffer
  clearAudio() {
    if (!this.sessionActive) return;

    this.sendEvent({
      type: 'input_audio_buffer.clear'
    });
  }

  // Send an event to the server
  sendEvent(event) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send event: WebSocket not open');
      return;
    }

    try {
      this.ws.send(JSON.stringify(event));
    } catch (error) {
      logger.error('Error sending event:', error);
    }
  }

  // Event emitter functionality
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error('Error in event handler:', error);
        }
      });
    }
  }

  // Get conversation history
  getConversationHistory() {
    return this.conversationHistory;
  }

  // Clear conversation history
  clearConversationHistory() {
    this.conversationHistory = [];
  }

  // Close the connection
  close() {
    if (this.ws) {
      this.sessionActive = false;
      this.ws.close();
    }
  }

  // Check if the service is ready
  isReady() {
    return this.sessionActive && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = RealtimeService;