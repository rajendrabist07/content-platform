import rateLimit from 'express-rate-limit';


export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        statusCode: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
});


export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes',
        statusCode: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});