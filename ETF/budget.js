/**
 * Budget Management Module
 * Handles budget configuration, tracking, and profit reinvestment
 */

class BudgetManager {
    constructor(supabaseClient = null) {
        this.supabase = supabaseClient;
        this.config = null;
        this.userId = 'default_user'; // Will be set by authenticated user ID
        
        // Clean up any legacy localStorage data
        this.cleanupLocalStorage();
        
        // Don't load config automatically - wait for user ID to be set
        // this.loadConfig();
    }

    /**
     * Set Supabase client instance
     * @param {object} supabaseClient - Supabase client instance
     */
    setSupabaseClient(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Set user ID for authenticated user
     * @param {string} userId - Authenticated user ID
     */
    setUserId(userId) {
        this.userId = userId;
        console.log('Budget manager user ID set to:', userId);
    }

    /**
     * Clean up legacy localStorage budget data
     */
    cleanupLocalStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const legacyData = localStorage.getItem('budget-config');
                if (legacyData) {
                    console.log('Removing legacy localStorage budget data...');
                    localStorage.removeItem('budget-config');
                    console.log('Legacy budget data cleaned up');
                }
            }
        } catch (error) {
            console.warn('Error cleaning up localStorage:', error);
        }
    }

    // ==================== CONFIGURATION MANAGEMENT ====================

    /**
     * Load budget configuration from Supabase only
     */
    async loadConfig() {
        try {
            if (this.supabase) {
                // Load from Supabase only
                const { data, error } = await this.supabase
                    .from('budget_config')
                    .select('*')
                    .eq('user_id', this.userId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (!error && data && data.length > 0) {
                    const budgetRecord = data[0];
                    this.config = {
                        totalBudget: parseFloat(budgetRecord.total_budget),
                        dailyAmount: parseFloat(budgetRecord.daily_amount),
                        startDate: budgetRecord.start_date,
                        usedAmount: parseFloat(budgetRecord.used_amount || 0),
                        reinvestedProfit: parseFloat(budgetRecord.reinvested_profit || 0),
                        daysCompleted: this.calculateDaysCompleted(budgetRecord.start_date),
                        createdDate: budgetRecord.created_at
                    };
                    
                    console.log('Budget loaded from Supabase:', this.config);
                    this.updateDisplay();
                    return;
                } else if (error) {
                    // Log error details for debugging
                    console.error('Error loading budget from Supabase:', error);
                    
                    // Check if it's a table not found error
                    if (error.code === '42P01' || error.message?.includes('does not exist')) {
                        console.error('Budget table does not exist. Please create the budget_config table in your Supabase database.');
                        console.error('SQL: CREATE TABLE budget_config (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id TEXT NOT NULL DEFAULT \'default_user\', total_budget DECIMAL(15,2) NOT NULL, daily_amount DECIMAL(15,2) NOT NULL, start_date DATE NOT NULL, used_amount DECIMAL(15,2) DEFAULT 0, reinvested_profit DECIMAL(15,2) DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE(\'utc\', NOW()), updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE(\'utc\', NOW()));');
                        
                        // Show user-friendly error
                        if (window.Utils) {
                            Utils.showNotification('Budget table missing in database. Please create the budget_config table in Supabase. Check browser console for SQL.', 'error');
                        }
                    }
                }
            }
            
            // No Supabase or no budget data found - that's fine
            console.log('No budget configuration found in Supabase');
            
        } catch (error) {
            console.error('Error loading budget config:', error);
        }
    }

    /**
     * Save budget configuration to Supabase only
     */
    async saveConfig() {
        if (!this.config) return;
        
        if (!this.supabase) {
            throw new Error('Supabase client not available. Please configure database connection first.');
        }
        
        try {
            // Save to Supabase only
            const budgetData = {
                user_id: this.userId,
                total_budget: this.config.totalBudget,
                daily_amount: this.config.dailyAmount,
                start_date: this.config.startDate,
                used_amount: this.config.usedAmount || 0,
                reinvested_profit: this.config.reinvestedProfit || 0,
                updated_at: new Date().toISOString()
            };

            // Check if budget config already exists
            const { data: existing, error: existingError } = await this.supabase
                .from('budget_config')
                .select('id')
                .eq('user_id', this.userId)
                .limit(1);

            if (!existingError && existing && existing.length > 0) {
                // Update existing record
                const { error } = await this.supabase
                    .from('budget_config')
                    .update(budgetData)
                    .eq('user_id', this.userId);

                if (error) throw error;
                console.log('Budget updated in Supabase');
            } else {
                // Insert new record
                const { error } = await this.supabase
                    .from('budget_config')
                    .insert([budgetData]);

                if (error) throw error;
                console.log('Budget saved to Supabase');
            }
            
        } catch (error) {
            console.error('Error saving budget config to Supabase:', error);
            throw new Error('Failed to save budget configuration to database: ' + error.message);
        }
    }

    /**
     * Set new budget configuration
     * @param {number} totalBudget - Total budget amount
     * @param {string} startDate - Investment start date
     */
    async setBudget(totalBudget, startDate) {
        if (!totalBudget || totalBudget < 5000) {
            throw new Error('Minimum budget is ₹5,000');
        }

        if (!startDate) {
            throw new Error('Please select start date');
        }

        this.config = {
            totalBudget: totalBudget,
            dailyAmount: totalBudget / 50,
            startDate: startDate,
            usedAmount: 0,
            reinvestedProfit: 0,
            daysCompleted: 0,
            createdDate: new Date().toISOString()
        };

        await this.saveConfig();
        this.updateDisplay();
        
        return this.config;
    }

    /**
     * Reset budget configuration
     */
    async resetBudget() {
        if (!this.supabase) {
            throw new Error('Supabase client not available. Please configure database connection first.');
        }
        
        try {
            // Delete from Supabase only
            const { error } = await this.supabase
                .from('budget_config')
                .delete()
                .eq('user_id', this.userId);
                
            if (error) throw error;
            console.log('Budget deleted from Supabase');
            
            this.config = null;
            this.updateDisplay();
            
        } catch (error) {
            console.error('Error deleting budget from Supabase:', error);
            throw new Error('Failed to reset budget in database: ' + error.message);
        }
    }

    /**
     * Top-up budget while maintaining existing usage
     * @param {number} additionalAmount - Additional budget amount
     */
    async topupBudget(additionalAmount) {
        if (!this.config) {
            throw new Error('No existing budget configuration found');
        }

        if (!additionalAmount || additionalAmount < 1000) {
            throw new Error('Minimum top-up amount is ₹1,000');
        }

        // Calculate remaining days
        const remainingDays = this.getRemainingDays();
        
        if (remainingDays <= 0) {
            throw new Error('Investment period has already completed');
        }

        // Update budget while preserving used amount
        const oldTotalBudget = this.config.totalBudget;
        const newTotalBudget = oldTotalBudget + additionalAmount;
        
        // Calculate new daily amount based on total budget divided by 50 days
        const newDailyAmount = newTotalBudget / 50;

        // Update configuration
        this.config.totalBudget = newTotalBudget;
        this.config.dailyAmount = newDailyAmount;
        
        // Save updated configuration
        await this.saveConfig();
        this.updateDisplay();

        return {
            oldBudget: oldTotalBudget,
            newBudget: newTotalBudget,
            topupAmount: additionalAmount,
            oldDailyAmount: oldTotalBudget / 50,
            newDailyAmount: newDailyAmount,
            remainingDays: remainingDays,
            usedAmount: this.config.usedAmount,
            availableAmount: this.getAvailableAmount()
        };
    }

    /**
     * Preview budget top-up without applying changes
     * @param {number} additionalAmount - Additional budget amount
     */
    previewTopup(additionalAmount) {
        if (!this.config) {
            throw new Error('No existing budget configuration found');
        }

        if (!additionalAmount || additionalAmount < 1000) {
            throw new Error('Minimum top-up amount is ₹1,000');
        }

        const remainingDays = this.getRemainingDays();
        
        if (remainingDays <= 0) {
            throw new Error('Investment period has already completed');
        }

        const oldTotalBudget = this.config.totalBudget;
        const newTotalBudget = oldTotalBudget + additionalAmount;
        const newDailyAmount = newTotalBudget / 50;

        return {
            currentBudget: oldTotalBudget,
            topupAmount: additionalAmount,
            newBudget: newTotalBudget,
            usedAmount: this.config.usedAmount,
            remainingDays: remainingDays,
            currentDailyAmount: this.config.dailyAmount,
            newDailyAmount: newDailyAmount,
            availableAmount: this.getAvailableAmount(),
            newAvailableAmount: newTotalBudget - this.config.usedAmount + this.config.reinvestedProfit
        };
    }


    /**
     * Calculate days completed from start date
     * @param {string} startDate - Optional start date, uses config if not provided
     */
    calculateDaysCompleted(startDate = null) {
        const start = new Date(startDate || this.config?.startDate);
        const today = new Date();
        
        if (start > today) return 0;
        
        let daysCompleted = 0;
        let currentDate = new Date(start);
        
        while (currentDate <= today && daysCompleted < 50) {
            // Skip weekends
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                daysCompleted++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return Math.min(daysCompleted, 50);
    }

    // ==================== BUDGET TRACKING ====================

    /**
     * Get available investment amount
     */
    getAvailableAmount() {
        if (!this.config) return 0;
        return this.config.totalBudget - this.config.usedAmount + this.config.reinvestedProfit;
    }

    /**
     * Record investment usage
     * @param {number} amount - Amount used
     */
    recordInvestment(amount) {
        if (!this.config) return false;

        const available = this.getAvailableAmount();
        if (amount > available) {
            throw new Error(`Insufficient budget. Available: ${Utils.formatCurrency(available)}, Required: ${Utils.formatCurrency(amount)}`);
        }

        this.config.usedAmount += amount;
        this.saveConfig();
        this.updateDisplay();
        
        return true;
    }

    /**
     * Calculate days completed based on current date
     */
    calculateDaysCompleted() {
        if (!this.config) return 0;

        const startDate = new Date(this.config.startDate);
        const currentDate = new Date();
        let daysCompleted = 0;
        let checkDate = new Date(startDate);

        while (checkDate <= currentDate && daysCompleted < 50) {
            // Skip weekends
            if (checkDate.getDay() !== 0 && checkDate.getDay() !== 6) {
                daysCompleted++;
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }

        this.config.daysCompleted = Math.min(daysCompleted, 50);
        this.saveConfig();
        
        return this.config.daysCompleted;
    }

    /**
     * Get remaining days
     */
    getRemainingDays() {
        if (!this.config) return 50;
        return Math.max(0, 50 - this.calculateDaysCompleted());
    }

    // ==================== PROFIT MANAGEMENT ====================

    /**
     * Calculate profit allocation based on holding period
     * @param {number} profit - Profit amount
     * @param {number} holdingPeriod - Days held
     */
    calculateProfitAllocation(profit, holdingPeriod) {
        if (profit <= 0) return null;

        const isSTCG = holdingPeriod <= 365;
        const taxRate = isSTCG ? 0.15 : 0.125; // 15% STCG, 12.5% LTCG
        const brokerageRate = 0.05; // 5% brokerage
        const reinvestmentRate = 0.80; // 80% reinvestment

        const taxAmount = profit * taxRate;
        const brokerageAmount = profit * brokerageRate;
        const reinvestmentAmount = profit * reinvestmentRate;

        return {
            totalProfit: profit,
            taxType: isSTCG ? 'STCG' : 'LTCG',
            taxRate: taxRate * 100,
            taxAmount: taxAmount,
            brokerageAmount: brokerageAmount,
            reinvestmentAmount: reinvestmentAmount,
            netAmount: profit - taxAmount - brokerageAmount,
            holdingPeriod: holdingPeriod
        };
    }

    /**
     * Add profit to reinvestment pool
     * @param {Object} profitAllocation - Profit allocation object
     */
    addProfitToReinvestment(profitAllocation) {
        if (!this.config || !profitAllocation) return false;

        this.config.reinvestedProfit += profitAllocation.reinvestmentAmount;
        this.saveConfig();
        this.updateDisplay();
        
        return true;
    }

    // ==================== DISPLAY MANAGEMENT ====================

    /**
     * Update budget display elements
     */
    updateDisplay() {
        const elements = {
            'total-budget': this.config ? Utils.formatCurrency(this.config.totalBudget) : '₹0',
            'daily-amount': this.config ? Utils.formatCurrency(this.config.dailyAmount) : '₹0',
            'days-remaining': this.getRemainingDays(),
            'amount-used': this.config ? Utils.formatCurrency(this.config.usedAmount) : '₹0',
            'available-balance': Utils.formatCurrency(this.getAvailableAmount()),
            'reinvested-profit': this.config ? Utils.formatCurrency(this.config.reinvestedProfit) : '₹0'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update form if budget exists
        this.updateForm();
        
        // Show/hide top-up section
        this.updateTopupSection();
    }

    /**
     * Update budget form with current values
     */
    updateForm() {
        if (!this.config) return;

        const budgetAmountField = document.getElementById('budget-amount');
        const startDateField = document.getElementById('start-date');

        if (budgetAmountField && budgetAmountField.value === '') {
            budgetAmountField.value = this.config.totalBudget;
        }

        if (startDateField && startDateField.value === '') {
            startDateField.value = this.config.startDate.split('T')[0];
        }
    }

    /**
     * Update top-up section visibility and state
     */
    updateTopupSection() {
        const topupSection = document.getElementById('topup-section');
        
        if (!topupSection) return;
        
        // Show top-up section only if budget is configured and there are remaining days
        if (this.config && this.getRemainingDays() > 0) {
            topupSection.style.display = 'block';
        } else {
            topupSection.style.display = 'none';
        }
    }

    // ==================== CALENDAR MANAGEMENT ====================

    /**
     * Generate investment calendar
     */
    generateInvestmentCalendar() {
        if (!this.config) return;

        const calendar = document.getElementById('investment-calendar');
        if (!calendar) return;

        calendar.innerHTML = '';

        const startDate = new Date(this.config.startDate);
        const today = new Date();
        let currentDate = new Date(startDate);

        for (let day = 1; day <= 50; day++) {
            // Skip weekends
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.innerHTML = `
                <div>Day ${day}</div>
                <div>${Utils.formatDate(currentDate)}</div>
            `;

            // Add status classes
            if (currentDate < today) {
                dayElement.classList.add('completed');
            } else if (currentDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            } else {
                dayElement.classList.add('future');
            }

            dayElement.onclick = () => {
                if (currentDate <= today) {
                    this.showDayDetails(day, currentDate);
                }
            };

            calendar.appendChild(dayElement);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    /**
     * Show investment details for a specific day
     * @param {number} day - Day number
     * @param {Date} date - Date object
     */
    showDayDetails(day, date) {
        const details = `
            Day ${day} - ${Utils.formatDate(date)}
            Planned Investment: ${Utils.formatCurrency(this.config.dailyAmount)}
            Status: ${date <= new Date() ? 'Completed' : 'Future'}
        `;
        
        Utils.showNotification(details, 'info', 8000);
    }

    // ==================== STATISTICS ====================

    /**
     * Get budget statistics
     */
    getStatistics() {
        if (!this.config) {
            return {
                totalBudget: 0,
                dailyAmount: 0,
                usedAmount: 0,
                availableAmount: 0,
                reinvestedProfit: 0,
                daysCompleted: 0,
                remainingDays: 50,
                utilizationPercent: 0,
                investmentProgress: 0
            };
        }

        const daysCompleted = this.calculateDaysCompleted();
        const availableAmount = this.getAvailableAmount();
        const utilizationPercent = (this.config.usedAmount / this.config.totalBudget) * 100;
        const investmentProgress = (daysCompleted / 50) * 100;

        return {
            totalBudget: this.config.totalBudget,
            dailyAmount: this.config.dailyAmount,
            usedAmount: this.config.usedAmount,
            availableAmount: availableAmount,
            reinvestedProfit: this.config.reinvestedProfit,
            daysCompleted: daysCompleted,
            remainingDays: Math.max(0, 50 - daysCompleted),
            utilizationPercent: utilizationPercent,
            investmentProgress: investmentProgress
        };
    }

    // ==================== VALIDATION ====================

    /**
     * Validate budget configuration
     * @param {number} amount - Budget amount
     * @param {string} startDate - Start date
     */
    validateBudgetConfig(amount, startDate) {
        const errors = [];

        if (!amount || amount < 5000) {
            errors.push('Minimum budget is ₹5,000');
        }

        if (!startDate) {
            errors.push('Start date is required');
        } else {
            const start = new Date(startDate);
            const today = new Date();
            
            if (start < today.setHours(0, 0, 0, 0)) {
                errors.push('Start date cannot be in the past');
            }
        }

        return errors;
    }

    /**
     * Check if sufficient budget is available for investment
     * @param {number} amount - Amount to invest
     */
    checkSufficientBudget(amount) {
        const available = this.getAvailableAmount();
        return {
            sufficient: amount <= available,
            available: available,
            required: amount,
            shortfall: Math.max(0, amount - available)
        };
    }

    // ==================== EXPORT/IMPORT ====================

    /**
     * Export budget data
     */
    exportBudgetData() {
        if (!this.config) {
            throw new Error('No budget configuration to export');
        }

        const data = {
            ...this.config,
            statistics: this.getStatistics(),
            exportDate: new Date().toISOString()
        };

        return data;
    }

    /**
     * Import budget data
     * @param {Object} data - Budget data to import
     */
    importBudgetData(data) {
        if (!data || !data.totalBudget) {
            throw new Error('Invalid budget data');
        }

        this.config = {
            totalBudget: data.totalBudget,
            dailyAmount: data.dailyAmount || data.totalBudget / 50,
            startDate: data.startDate,
            usedAmount: data.usedAmount || 0,
            reinvestedProfit: data.reinvestedProfit || 0,
            daysCompleted: data.daysCompleted || 0,
            createdDate: data.createdDate || new Date().toISOString()
        };

        this.saveConfig();
        this.updateDisplay();
        
        return this.config;
    }

    // ==================== GETTERS ====================

    /**
     * Get current budget configuration
     */
    getConfig() {
        return this.config ? { ...this.config } : null;
    }

    /**
     * Check if budget is configured
     */
    isConfigured() {
        return this.config !== null;
    }

    /**
     * Get daily investment amount
     */
    getDailyAmount() {
        return this.config ? this.config.dailyAmount : 0;
    }

    /**
     * Get total budget amount
     */
    getTotalBudget() {
        return this.config ? this.config.totalBudget : 0;
    }

    /**
     * Get used amount
     */
    getUsedAmount() {
        return this.config ? this.config.usedAmount : 0;
    }

    /**
     * Get reinvested profit amount
     */
    getReinvestedProfit() {
        return this.config ? this.config.reinvestedProfit : 0;
    }
}

// Create global instance (Supabase client will be set later)
const budgetManager = new BudgetManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.budgetManager = budgetManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BudgetManager;
}