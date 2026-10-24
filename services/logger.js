const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, extra = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...(extra && { extra })
        };
        return JSON.stringify(logEntry);
    }

    writeToFile(level, formattedMessage) {
        const filename = `${level}-${new Date().toISOString().split('T')[0]}.log`;
        const filepath = path.join(this.logDir, filename);
        
        fs.appendFileSync(filepath, formattedMessage + '\n');
    }

    log(level, message, extra = null) {
        const formattedMessage = this.formatMessage(level, message, extra);
        
        // Console output (respects NODE_ENV)
        if (process.env.NODE_ENV !== 'production') {
            console[level] ? console[level](message, extra || '') : console.log(message, extra || '');
        }
        
        // File output (always write to file)
        try {
            this.writeToFile(level, formattedMessage);
        } catch (error) {
            // Fallback to console if file writing fails
            console.error('Logger file write error:', error);
        }
    }

    info(message, extra = null) {
        this.log('info', message, extra);
    }

    warn(message, extra = null) {
        this.log('warn', message, extra);
    }

    error(message, extra = null) {
        this.log('error', message, extra);
    }

    debug(message, extra = null) {
        this.log('debug', message, extra);
    }
}

module.exports = new Logger();