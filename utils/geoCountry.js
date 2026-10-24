/**
 * Derive a user's country from their request IP using an offline geo-IP DB.
 *
 * Used to populate users.country for signups that don't collect it via a form
 * (e.g. Google OAuth). Email/password signups already capture country from the
 * dropdown, so this is a fallback for the rest.
 *
 * Returns the full English country name (e.g. "United Kingdom") to match the
 * format the signup form stores, or null if it can't be determined.
 */
const geoip = require('geoip-lite');
const logger = require('../services/logger');

// Cache the Intl formatter; construction is comparatively expensive.
let regionNames;
try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch (_) {
    regionNames = null;
}

/**
 * Extract the client IP, preferring the left-most x-forwarded-for entry
 * (the real client) since the app runs behind Railway's proxy.
 */
function getClientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
        const first = String(xff).split(',')[0].trim();
        if (first) return first;
    }
    // Fallbacks; may be an internal/proxy IP but harmless to try.
    return (req.headers['x-real-ip'] || req.socket?.remoteAddress || '').trim();
}

/**
 * @param {import('express').Request} req
 * @returns {string|null} full country name, or null
 */
function getCountryFromRequest(req) {
    try {
        let ip = getClientIp(req);
        if (!ip) return null;
        // Normalise IPv4-mapped IPv6 (e.g. ::ffff:81.2.69.142)
        if (ip.startsWith('::ffff:')) ip = ip.slice(7);
        // geoip-lite can't resolve private/loopback ranges
        if (ip === '::1' || ip.startsWith('127.') || ip.startsWith('10.') ||
            ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) {
            return null;
        }

        const geo = geoip.lookup(ip);
        if (!geo || !geo.country) return null;

        if (regionNames) {
            const name = regionNames.of(geo.country);
            if (name && name !== geo.country) return name;
        }
        return geo.country; // fall back to ISO code if name lookup unavailable
    } catch (err) {
        logger.warn?.('geoCountry lookup failed:', err.message);
        return null;
    }
}

module.exports = { getCountryFromRequest, getClientIp };
