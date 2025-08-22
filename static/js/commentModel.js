/**
 * @file Comment model and validation utilities
 * @description Handles comment data validation, sanitization, and creation
 */

/**
 * Validate comment form data
 * @param {Object} formData - Form data to validate
 * @param {string} formData.name - User's name
 * @param {string} formData.email - User's email
 * @param {string} formData.comment - User's comment
 * @param {number} formData.rating - User's rating (1-5)
 * @returns {Object} Validation result
 */
export function validateComment(formData) {
    const errors = [];
    
    // Name validation
    if (!formData.name || typeof formData.name !== 'string') {
        errors.push('Name is required');
    } else if (formData.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    } else if (formData.name.trim().length > 50) {
        errors.push('Name must be less than 50 characters');
    }
    
    // Email validation
    if (!formData.email || typeof formData.email !== 'string') {
        errors.push('Email is required');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            errors.push('Please enter a valid email address');
        }
    }
    
    // Comment validation
    if (!formData.comment || typeof formData.comment !== 'string') {
        errors.push('Comment is required');
    } else if (formData.comment.trim().length < 10) {
        errors.push('Comment must be at least 10 characters long');
    } else if (formData.comment.trim().length > 1000) {
        errors.push('Comment must be less than 1000 characters');
    }
    
    // Rating validation
    if (!formData.rating && formData.rating !== 0) {
        errors.push('Please select a rating');
    } else {
        const rating = Number(formData.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            errors.push('Please select a rating between 1 and 5 stars');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Sanitize comment data for storage
 * @param {Object} formData - Raw form data
 * @returns {Object} Sanitized comment data
 */
export function sanitizeComment(formData) {
    return {
        name: sanitizeText(formData.name, 50),
        email: formData.email.trim().toLowerCase(),
        comment: sanitizeText(formData.comment, 1000),
        rating: parseInt(formData.rating),
        createdAt: new Date().toISOString(),
        // IP and user agent could be added here for moderation
        metadata: {
            userAgent: navigator.userAgent.substring(0, 200),
            timestamp: Date.now()
        }
    };
}

/**
 * Create a comment object with all required fields
 * @param {Object} data - Comment data
 * @returns {Object} Complete comment object
 */
export function createComment(data) {
    const now = new Date();
    
    return {
        id: null, // Will be set by Firestore
        name: data.name || 'Anonymous',
        email: data.email || '',
        comment: data.comment || '',
        rating: data.rating || 1,
        createdAt: data.createdAt || now.toISOString(),
        timestamp: data.timestamp || null, // Firestore serverTimestamp
        isApproved: true, // For moderation features
        isVisible: true,
        metadata: {
            userAgent: data.userAgent || navigator.userAgent.substring(0, 200),
            timestamp: Date.now(),
            ...data.metadata
        }
    };
}

/**
 * Sanitize text input
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
function sanitizeText(text, maxLength = 1000) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .trim()
        .substring(0, maxLength)
        // Remove potentially harmful characters but keep basic punctuation
        .replace(/[<>]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ');
}

/**
 * Format comment data for display
 * @param {Object} comment - Comment from database
 * @returns {Object} Formatted comment for display
 */
export function formatCommentForDisplay(comment) {
    return {
        id: comment.id,
        name: escapeHtml(comment.name || 'Anonymous'),
        comment: escapeHtml(comment.comment || '').replace(/\n/g, '<br>'),
        rating: Math.max(1, Math.min(5, parseInt(comment.rating) || 1)),
        date: formatDate(comment.timestamp || comment.createdAt),
        isVisible: comment.isVisible !== false
    };
}

/**
 * Escape HTML characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format date for display
 * @param {any} date - Date to format (Firestore timestamp, ISO string, or Date)
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    try {
        let dateObj;
        
        if (date && typeof date.toDate === 'function') {
            // Firestore timestamp
            dateObj = date.toDate();
        } else if (typeof date === 'string') {
            // ISO string
            dateObj = new Date(date);
        } else if (date instanceof Date) {
            // Date object
            dateObj = date;
        } else {
            return 'Unknown date';
        }
        
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.warn('Error formatting date:', error);
        return 'Invalid date';
    }
}

/**
 * Check if comment needs moderation
 * @param {Object} comment - Comment to check
 * @returns {boolean} True if needs moderation
 */
export function needsModeration(comment) {
    const suspiciousPatterns = [
        /https?:\/\//i, // URLs
        /@\w+\.\w+/i, // Email patterns
        /\b(spam|scam|free|buy now|click here)\b/i // Common spam words
    ];
    
    const textToCheck = `${comment.name} ${comment.comment}`.toLowerCase();
    
    return suspiciousPatterns.some(pattern => pattern.test(textToCheck));
}

// Export default object with all functions
export default {
    validateComment,
    sanitizeComment,
    createComment,
    formatCommentForDisplay,
    needsModeration
};