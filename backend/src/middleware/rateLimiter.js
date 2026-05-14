const rateLimit = require('express-rate-limit');

/**
 * Global API rate limiter — 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skipSuccessfulRequests: false,
});

/**
 * Strict limiter for authentication endpoints — 5 requests per 15 minutes.
 * Prevents brute force attacks on login/register.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true,
});

/**
 * Upload rate limiter — 10 requests per hour.
 * Prevents abuse of document upload + Claude API parsing pipeline.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached. You can upload up to 10 documents per hour.' },
});

/**
 * Flo chat limiter — 30 requests per 10 minutes.
 * Claude API calls are expensive; this prevents runaway usage.
 */
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Chat rate limit reached. Please wait a moment before continuing.' },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter, chatLimiter };
