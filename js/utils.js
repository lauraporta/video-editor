/**
 * Utilities Module
 * Common utility functions
 */

/**
 * Format seconds to MM:SS string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validate segment times
 * @param {number} start - Start time
 * @param {number} end - End time
 * @returns {Object} Validation result
 */
export function validateSegmentTimes(start, end) {
    if (isNaN(start) || isNaN(end)) {
        return {
            valid: false,
            message: 'Invalid time values'
        };
    }

    if (start >= end) {
        return {
            valid: false,
            message: 'Start time must be less than end time'
        };
    }

    if (start < 0) {
        return {
            valid: false,
            message: 'Start time must be non-negative'
        };
    }

    return { valid: true };
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
