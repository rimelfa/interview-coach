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

class AudioProcessor {
  constructor() {
    this.sampleRate = 16000;
    this.channels = 1;
    this.chunkDuration = 3;
  }
  
  async processAudioChunk(audioData) {
    try {
      const buffer = Buffer.from(audioData.data, 'base64');
      
      const processedData = {
        buffer: buffer,
        timestamp: audioData.timestamp || new Date(),
        duration: audioData.duration || this.chunkDuration,
        format: audioData.format || 'webm',
        sampleRate: audioData.sampleRate || this.sampleRate,
        mimeType: audioData.mimeType || 'audio/webm'
      };
      
      logger.info(`Processed audio chunk: ${buffer.length} bytes`);
      
      return processedData;
    } catch (error) {
      logger.error('Error processing audio chunk:', error);
      throw error;
    }
  }
  
  combineAudioChunks(chunks) {
    try {
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.buffer.length, 0);
      const combined = Buffer.concat(chunks.map(chunk => chunk.buffer));
      
      return {
        buffer: combined,
        duration: chunks.reduce((sum, chunk) => sum + chunk.duration, 0),
        timestamp: chunks[0].timestamp
      };
    } catch (error) {
      logger.error('Error combining audio chunks:', error);
      throw error;
    }
  }
  
  validateAudioFormat(audioData) {
    const supportedFormats = ['webm', 'wav', 'mp3', 'ogg'];
    const format = audioData.format || 'webm';
    
    if (!supportedFormats.includes(format)) {
      throw new Error(`Unsupported audio format: ${format}`);
    }
    
    return true;
  }
}

module.exports = new AudioProcessor();