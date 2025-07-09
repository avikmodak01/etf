/**
 * Utility Functions Module
 * Helper functions used throughout the application
 */

class Utils {
    
    // ==================== FORMATTING UTILITIES ====================
    
    /**
     * Format number as Indian currency
     * @param {number} amount - Amount to format
     * @param {boolean} showSymbol - Whether to show ₹ symbol
     */
    static formatCurrency(amount, showSymbol = true) {
        if (isNaN(amount)) return showSymbol ? '₹0.00' : '0.00';
        
        const formatted = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
        
        return showSymbol ? `₹${formatted}` : formatted;
    }

    /**
     * Format date to Indian format (DD/MM/YYYY)
     * @param {Date|string} date - Date to format
     */
    static formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Format date and time for display
     * @param {Date|string} date - Date to format
     */
    static formatDateTime(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleString('en-IN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Format percentage with proper sign and color class
     * @param {number} percent - Percentage to format
     */
    static formatPercentage(percent) {
        if (isNaN(percent)) return { text: '0.00%', class: 'neutral' };
        
        const sign = percent >= 0 ? '+' : '';
        const colorClass = percent >= 0 ? 'profit' : 'loss';
        return {
            text: `${sign}${percent.toFixed(2)}%`,
            class: colorClass
        };
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ==================== DATE & TIME UTILITIES ====================
    
    /**
     * Get today's date in YYYY-MM-DD format
     */
    static getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Check if date is weekend
     * @param {Date|string} date - Date to check
     */
    static isWeekend(date) {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    /**
     * Check if current time is market hours (9:15 AM to 3:30 PM on weekdays)
     */
    static isMarketHours() {
        const now = new Date();
        
        if (this.isWeekend(now)) {
            return false;
        }
        
        const hour = now.getHours();
        const minute = now.getMinutes();
        const timeInMinutes = hour * 60 + minute;
        
        const marketOpen = 9 * 60 + 15;  // 9:15 AM
        const marketClose = 15 * 60 + 30; // 3:30 PM
        
        return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
    }

    /**
     * Calculate days between two dates
     * @param {Date|string} startDate - Start date
     * @param {Date|string} endDate - End date
     */
    static daysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // ==================== VALIDATION UTILITIES ====================
    
    /**
     * Validate positive number
     * @param {any} value - Value to validate
     */
    static isPositiveNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    }

    /**
     * Validate ETF name format
     * @param {string} name - ETF name to validate
     */
    static isValidETFName(name) {
        return name && typeof name === 'string' && name.trim().length > 0;
    }

    /**
     * Sanitize input to prevent XSS
     * @param {string} input - Input to sanitize
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==================== LOCAL STORAGE UTILITIES ====================
    
    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     */
    static saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    /**
     * Load data from localStorage with error handling
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key not found
     */
    static loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    static removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    // ==================== DOM MANIPULATION UTILITIES ====================
    
    /**
     * Show loading state on element
     * @param {HTMLElement} element - Element to show loading on
     * @param {string} message - Loading message
     */
    static showLoading(element, message = 'Loading...') {
        if (!element) return;
        
        element.innerHTML = `<div class="loading">${message}</div>`;
        if (element.tagName === 'BUTTON') {
            element.disabled = true;
        }
    }

    /**
     * Show error message on element
     * @param {HTMLElement} element - Element to show error on
     * @param {string} message - Error message
     */
    static showError(element, message) {
        if (!element) return;
        
        element.innerHTML = `<div class="error">${message}</div>`;
    }

    /**
     * Create table row element
     * @param {Array} cellData - Array of cell data
     * @param {Array} cellClasses - Array of CSS classes for cells (optional)
     */
    static createTableRow(cellData, cellClasses = []) {
        const row = document.createElement('tr');
        
        cellData.forEach((data, index) => {
            const cell = document.createElement('td');
            cell.innerHTML = data;
            
            if (cellClasses[index]) {
                cell.className = cellClasses[index];
            }
            
            row.appendChild(cell);
        });
        
        return row;
    }

    /**
     * Clear table body and show message
     * @param {HTMLElement} tableBody - Table body element
     * @param {string} message - Message to show
     * @param {number} colspan - Number of columns to span
     */
    static clearTableWithMessage(tableBody, message, colspan = 1) {
        if (!tableBody) return;
        
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="loading">${message}</td></tr>`;
    }

    /**
     * Show notification/toast message
     * @param {string} message - Message to show
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds
     */
    static showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // ==================== CALCULATION UTILITIES ====================
    
    /**
     * Calculate percentage change between two values
     * @param {number} oldValue - Original value
     * @param {number} newValue - New value
     */
    static calculatePercentageChange(oldValue, newValue) {
        if (oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }

    /**
     * Calculate ETF deviation percentage
     * @param {number} cmp - Current Market Price
     * @param {number} dma - 20-Day Moving Average
     */
    static calculateDeviation(cmp, dma) {
        if (dma === 0) return 0;
        return ((cmp - dma) / dma) * 100;
    }

    /**
     * Calculate profit/loss for a holding
     * @param {number} buyPrice - Buy price
     * @param {number} currentPrice - Current price
     * @param {number} quantity - Quantity held
     */
    static calculatePL(buyPrice, currentPrice, quantity) {
        const investment = buyPrice * quantity;
        const currentValue = currentPrice * quantity;
        const pl = currentValue - investment;
        const plPercent = (pl / investment) * 100;
        
        return {
            investment,
            currentValue,
            pl,
            plPercent
        };
    }

    // ==================== DATA PROCESSING UTILITIES ====================
    
    /**
     * Sort array of objects by property
     * @param {Array} array - Array to sort
     * @param {string} property - Property to sort by
     * @param {boolean} ascending - Sort order
     */
    static sortByProperty(array, property, ascending = true) {
        return array.sort((a, b) => {
            const aVal = a[property];
            const bVal = b[property];
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    }

    /**
     * Group array of objects by property
     * @param {Array} array - Array to group
     * @param {string} property - Property to group by
     */
    static groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = item[property];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    }

    /**
     * Deep clone object (for avoiding reference issues)
     * @param {any} obj - Object to clone
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // ==================== CSV UTILITIES ====================
    
    /**
     * Export data to CSV
     * @param {Array} data - Array of objects to export
     * @param {string} filename - Name of the file
     */
    static exportToCSV(data, filename = 'export.csv') {
        if (data.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Parse CSV content with flexible delimiter detection
     * @param {string} csvText - CSV content as text
     */
    static parseCSV(csvText) {
        // Remove BOM if present
        csvText = csvText.replace(/^\uFEFF/, '');
        
        // Try different delimiters
        const delimiters = [',', '\t', '|', ';'];
        let bestResult = null;
        let maxColumns = 0;
        
        for (const delimiter of delimiters) {
            try {
                const lines = csvText.trim().split('\n');
                if (lines.length < 2) continue;
                
                const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
                
                if (headers.length > maxColumns) {
                    maxColumns = headers.length;
                    bestResult = {
                        headers: headers,
                        rows: lines.slice(1).map(line => {
                            const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = values[index] || '';
                            });
                            return row;
                        })
                    };
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!bestResult) {
            throw new Error('Could not parse CSV file. Please check the format.');
        }
        
        return bestResult.rows;
    }

    /**
     * Find column value by trying multiple possible column names
     * @param {Object} row - Data row
     * @param {Array} possibleNames - Array of possible column names
     */
    static findColumnValue(row, possibleNames) {
        for (const name of possibleNames) {
            // Try exact match first
            if (row[name] !== undefined) {
                return row[name];
            }
            
            // Try case-insensitive match
            const key = Object.keys(row).find(k => 
                k.toLowerCase().replace(/[^a-z0-9]/g, '') === 
                name.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            
            if (key && row[key] !== undefined) {
                return row[key];
            }
        }
        return null;
    }

    // ==================== API UTILITIES ====================
    
    /**
     * Handle API errors consistently
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     */
    static handleApiError(error, context = 'API call') {
        console.error(`Error in ${context}:`, error);
        
        let userMessage = 'An unexpected error occurred. Please try again.';
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
            userMessage = 'Authentication failed. Please check your credentials.';
        } else if (error.message.includes('forbidden') || error.message.includes('403')) {
            userMessage = 'Access denied. You don\'t have permission for this action.';
        } else if (error.message.includes('not found') || error.message.includes('404')) {
            userMessage = 'Requested resource not found.';
        }
        
        this.showNotification(userMessage, 'error');
        return userMessage;
    }

    /**
     * Retry function with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     */
    static async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await this.delay(delay);
            }
        }
    }

    /**
     * Simple delay function
     * @param {number} ms - Milliseconds to delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== MISC UTILITIES ====================
    
    /**
     * Generate unique ID
     */
    static generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     */
    static debounce(func, wait) {
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
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     */
    static throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     */
    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Smooth scroll to element
     * @param {HTMLElement|string} element - Element or selector to scroll to
     */
    static scrollToElement(element) {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Format number with Indian numbering system
     * @param {number} num - Number to format
     */
    static formatIndianNumber(num) {
        if (isNaN(num)) return '0';
        
        const numStr = num.toString();
        const lastThree = numStr.substring(numStr.length - 3);
        const otherNumbers = numStr.substring(0, numStr.length - 3);
        
        if (otherNumbers !== '') {
            return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
        } else {
            return lastThree;
        }
    }

    /**
     * Get financial year for a date (April to March)
     * @param {Date|string} date - Date to get FY for
     */
    static getFinancialYear(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // JavaScript months are 0-indexed
        
        if (month >= 4) {
            return `${year}-${(year + 1).toString().slice(-2)}`;
        } else {
            return `${year - 1}-${year.toString().slice(-2)}`;
        }
    }

    /**
     * Clean ETF symbol for database storage
     * @param {string} symbol - ETF symbol to clean
     */
    static cleanETFSymbol(symbol) {
        return symbol
            .replace(/\.NSE$|\.BSE$/i, '') // Remove exchange
            .replace(/\s*ETF$/i, ' ETF') // Normalize ETF suffix
            .trim()
            .toUpperCase();
    }

    /**
     * Calculate end date (skip weekends)
     * @param {string|Date} startDate - Start date
     * @param {number} tradingDays - Number of trading days
     */
    static calculateEndDate(startDate, tradingDays) {
        const start = new Date(startDate);
        let currentDate = new Date(start);
        let daysAdded = 0;

        while (daysAdded < tradingDays) {
            currentDate.setDate(currentDate.getDate() + 1);
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                daysAdded++;
            }
        }

        return currentDate;
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     */
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Check if value is empty (null, undefined, empty string, etc.)
     * @param {any} value - Value to check
     */
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'object' && Object.keys(value).length === 0) return true;
        return false;
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     */
    static capitalize(str) {
        if (!str || typeof str !== 'string') return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Convert string to title case
     * @param {string} str - String to convert
     */
    static toTitleCase(str) {
        if (!str || typeof str !== 'string') return str;
        return str.toLowerCase().split(' ').map(word => this.capitalize(word)).join(' ');
    }

    /**
     * Check if current environment is mobile
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Check if current environment is tablet
     */
    static isTablet() {
        return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    }

    /**
     * Get device type
     */
    static getDeviceType() {
        if (this.isMobile()) return 'mobile';
        if (this.isTablet()) return 'tablet';
        return 'desktop';
    }
}

// Make Utils available globally
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}