// =============================================
// UTILITY FUNCTIONS - Shared across all pages
// =============================================

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// =============================================
// DATE & TIME UTILITIES
// =============================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Include time in output
 * @returns {string} Formatted date string
 */
function formatDate(date, includeTime = true) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return d.toLocaleString('en-IN', options);
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return formatDate(date, false);
    }
}

// =============================================
// STRING UTILITIES
// =============================================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
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
    
    return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, length = 50) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
}

/**
 * Generate random ID (for testing)
 * @param {number} length - Length of ID
 * @returns {string} Random ID
 */
function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// =============================================
// VALIDATION UTILITIES
// =============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid
 */
function isValidUUID(uuid) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(phone.replace(/[\s-]/g, ''));
}

// =============================================
// STORAGE UTILITIES
// =============================================

/**
 * Set item in localStorage with expiry
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @param {number} ttlMinutes - Time to live in minutes
 */
function setWithExpiry(key, value, ttlMinutes = 60) {
    const item = {
        value: value,
        expiry: new Date().getTime() + (ttlMinutes * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
}

/**
 * Get item from localStorage with expiry check
 * @param {string} key - Storage key
 * @returns {any} Stored value or null if expired
 */
function getWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    
    if (now > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    
    return item.value;
}

// =============================================
// UI UTILITIES
// =============================================

/**
 * Show loading spinner
 * @param {HTMLElement} element - Element to show spinner in
 */
function showLoading(element) {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    if (element) {
        element.innerHTML = '<div class="loading-spinner"></div>';
    }
}

/**
 * Show error message
 * @param {HTMLElement|string} element - Element or ID to show error
 * @param {string} message - Error message
 */
function showError(element, message) {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    if (element) {
        element.innerHTML = `<div class="error-message">❌ ${escapeHtml(message)}</div>`;
        element.style.display = 'block';
    }
}

/**
 * Show success message
 * @param {HTMLElement|string} element - Element or ID to show success
 * @param {string} message - Success message
 */
function showSuccess(element, message) {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    if (element) {
        element.innerHTML = `<div class="success-message">✅ ${escapeHtml(message)}</div>`;
        element.style.display = 'block';
    }
}

/**
 * Hide element
 * @param {HTMLElement|string} element - Element or ID to hide
 */
function hideElement(element) {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    if (element) {
        element.style.display = 'none';
    }
}

/**
 * Show element
 * @param {HTMLElement|string} element - Element or ID to show
 * @param {string} display - Display type (default: 'block')
 */
function showElement(element, display = 'block') {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    if (element) {
        element.style.display = display;
    }
}

// =============================================
// API UTILITIES
// =============================================

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @param {string} tokenKey - localStorage key for token
 * @returns {Promise} Fetch response
 */
async function apiRequest(endpoint, options = {}, tokenKey = 'authToken') {
    const token = localStorage.getItem(tokenKey);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            localStorage.removeItem(tokenKey);
            window.location.href = '/pages/agent-dashboard.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// =============================================
// URL UTILITIES
// =============================================

/**
 * Get URL parameter value
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value
 */
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Update URL parameter without reload
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
function updateUrlParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.replaceState({}, '', url);
}

// =============================================
// COOKIE UTILITIES
// =============================================

/**
 * Set cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiry days
 */
function setCookie(name, value, days = 7) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

/**
 * Get cookie value
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value
 */
function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cname, cvalue] = cookie.trim().split('=');
        if (cname === name) return cvalue;
    }
    return null;
}

/**
 * Delete cookie
 * @param {string} name - Cookie name
 */
function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

// =============================================
// DEBOUNCE & THROTTLE
// =============================================

/**
 * Debounce function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
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

/**
 * Throttle function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// =============================================
// EXPORT FOR MODULE USE (if needed)
// =============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDate,
        getRelativeTime,
        escapeHtml,
        truncate,
        generateId,
        isValidEmail,
        isValidUUID,
        isValidPhone,
        setWithExpiry,
        getWithExpiry,
        showLoading,
        showError,
        showSuccess,
        hideElement,
        showElement,
        apiRequest,
        getUrlParam,
        updateUrlParam,
        setCookie,
        getCookie,
        deleteCookie,
        debounce,
        throttle
    };
}

console.log('✅ Utils.js loaded successfully');