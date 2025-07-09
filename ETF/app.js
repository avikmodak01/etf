/**
 * Main Application Controller
 * Coordinates all modules and handles UI interactions
 */

class ETFTradingApp {
    constructor() {
        this.supabase = null;
        this.tradingStrategy = null;
        this.currentPage = 'dashboard';
        this.selectedFile = null;
        this.allTransactions = [];
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Don't initialize automatically - wait for auth
        // this.init();
    }

    // ==================== AUTHENTICATION GUARDS ====================

    /**
     * Check if user is authenticated before performing operations
     */
    requireAuth() {
        if (!this.isAuthenticated || !this.currentUser) {
            console.warn('Operation requires authentication');
            if (window.Utils) {
                Utils.showNotification('Please log in to access this feature', 'error');
            }
            return false;
        }
        return true;
    }

    /**
     * Check if Supabase is available
     */
    requireDatabase() {
        if (!this.supabase) {
            console.warn('Database connection not available');
            if (window.Utils) {
                Utils.showNotification('Database connection not available', 'error');
            }
            return false;
        }
        return true;
    }

    // ==================== INITIALIZATION ====================

    /**
     * Initialize the application with authentication
     * @param {object} supabaseClient - Supabase client instance
     * @param {object} user - Authenticated user object
     */
    async initializeWithAuth(supabaseClient, user) {
        this.supabase = supabaseClient;
        this.currentUser = user;
        this.isAuthenticated = true;
        
        console.log('Initializing app with authenticated user:', user.email);
        
        // Now initialize the app
        await this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize trading strategy with authenticated user
            if (this.supabase && this.currentUser) {
                this.tradingStrategy = new TradingStrategy(this.supabase);
                
                // Set Supabase client and user for budget manager
                if (window.budgetManager) {
                    window.budgetManager.setSupabaseClient(this.supabase);
                    window.budgetManager.setUserId(this.currentUser.id);
                    await window.budgetManager.loadConfig();
                }
                
                await this.loadAllData();
            }
            
            // Load data date from localStorage
            this.loadDataDate();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            if (window.Utils) {
                Utils.showNotification('Failed to initialize app', 'error');
            }
        }
    }

    /**
     * Load Supabase configuration from localStorage
     */
    loadSupabaseConfig() {
        if (!window.Utils) return;
        
        const url = Utils.loadFromStorage('supabase-url');
        const key = Utils.loadFromStorage('supabase-key');
        
        if (url && key) {
            // Update form fields
            const urlField = document.getElementById('supabase-url');
            const keyField = document.getElementById('supabase-key');
            
            if (urlField) urlField.value = url;
            if (keyField) keyField.value = key;
            
            // Initialize Supabase client
            if (typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(url, key);
            }
        }
    }

    /**
     * Save Supabase configuration
     */
    saveSupabaseConfig() {
        const urlField = document.getElementById('supabase-url');
        const keyField = document.getElementById('supabase-key');
        
        const url = urlField ? urlField.value.trim() : '';
        const key = keyField ? keyField.value.trim() : '';
        
        if (!url || !key) {
            if (window.Utils) {
                Utils.showNotification('Please enter both URL and key', 'error');
            }
            return false;
        }
        
        // Save to localStorage
        if (window.Utils) {
            Utils.saveToStorage('supabase-url', url);
            Utils.saveToStorage('supabase-key', key);
        }
        
        // Initialize Supabase client
        if (typeof supabase !== 'undefined') {
            this.supabase = supabase.createClient(url, key);
            if (window.TradingStrategy) {
                this.tradingStrategy = new TradingStrategy(this.supabase);
            }
            
            // Set Supabase client for budget manager
            if (window.budgetManager) {
                window.budgetManager.setSupabaseClient(this.supabase);
            }
        }
        
        if (window.Utils) {
            Utils.showNotification('Configuration saved successfully!', 'success');
        }
        
        // Load data with new configuration
        this.loadAllData();
        
        return true;
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Setup will be handled by DOMContentLoaded in global scope
        // This method exists for future enhancements
    }

    // ==================== PAGE NAVIGATION ====================

    /**
     * Show specific page
     * @param {string} pageName - Name of the page to show
     */
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageName + '-page');
        if (targetPage) {
            targetPage.style.display = 'block';
        }
        
        // Add active class to current nav link
        const activeLink = document.querySelector(`nav a[onclick*="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        this.currentPage = pageName;
        
        // Load page-specific data
        this.loadPageData();
    }

    /**
     * Load data specific to current page
     */
    async loadPageData() {
        try {
            switch (this.currentPage) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'etfs':
                    await this.loadETFData();
                    break;
                case 'holdings':
                    await this.loadHoldingsData();
                    break;
                case 'budget':
                    if (window.budgetManager) {
                        window.budgetManager.updateDisplay();
                        window.budgetManager.generateInvestmentCalendar();
                    }
                    break;
                case 'transactions':
                    await this.loadTransactionsData();
                    break;
            }
        } catch (error) {
            console.error('Error loading page data:', error);
        }
    }

    // ==================== DATA LOADING ====================

    /**
     * Load all application data
     */
    async loadAllData() {
        if (!this.supabase) return;

        try {
            await Promise.all([
                this.loadDashboardData(),
                this.loadETFData(),
                this.loadHoldingsData(),
                this.loadTransactionsData()
            ]);
        } catch (error) {
            console.error('Error loading app data:', error);
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        if (!this.supabase) return;

        try {
            // Get portfolio stats
            if (this.tradingStrategy) {
                const stats = await this.tradingStrategy.getPortfolioStats();
                
                if (stats) {
                    this.updateElement('total-holdings', stats.activeHoldings);
                    this.updateElement('portfolio-value', window.Utils ? Utils.formatCurrency(stats.currentValue) : '₹' + stats.currentValue);
                }
            }
            
            // Update available budget
            if (window.budgetManager) {
                this.updateElement('available-budget', window.Utils ? Utils.formatCurrency(window.budgetManager.getAvailableAmount()) : '₹' + window.budgetManager.getAvailableAmount());
            }
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    /**
     * Load ETF data and display in table
     */
    async loadETFData() {
        if (!this.supabase) return;

        try {
            const { data: etfs, error } = await this.supabase
                .from('etfs')
                .select('*')
                .order('name');

            if (error) throw error;

            this.displayETFTable(etfs || []);
            
        } catch (error) {
            console.error('Error loading ETF data:', error);
            const tableBody = document.getElementById('etf-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="7" class="loading">Failed to load ETF data</td></tr>';
            }
        }
    }

    /**
     * Display ETFs in table
     * @param {Array} etfs - ETF data array
     */
    displayETFTable(etfs) {
        const tableBody = document.getElementById('etf-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (etfs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading">No ETF data found. Add some ETFs to get started.</td></tr>';
            return;
        }

        // Calculate deviations and sort
        const etfsWithRank = etfs.map((etf, index) => {
            const deviation = window.Utils ? Utils.calculateDeviation(etf.cmp, etf.dma_20) : ((etf.cmp - etf.dma_20) / etf.dma_20) * 100;
            return {
                ...etf,
                deviation,
                rank: index + 1
            };
        }).sort((a, b) => a.deviation - b.deviation);

        // Assign final ranks
        etfsWithRank.forEach((etf, index) => {
            etf.rank = index + 1;
        });

        etfsWithRank.forEach(etf => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="rank-badge ${etf.rank <= 5 ? 'top-rank' : ''}">${etf.rank}</span></td>
                <td class="etf-name">${etf.name}</td>
                <td>${window.Utils ? Utils.formatCurrency(etf.cmp) : '₹' + etf.cmp}</td>
                <td>${window.Utils ? Utils.formatCurrency(etf.dma_20) : '₹' + etf.dma_20}</td>
                <td class="${etf.deviation < 0 ? 'profit' : 'loss'}">${etf.deviation.toFixed(2)}%</td>
                <td>
                    <span class="status ${etf.deviation < -2 ? 'buy' : etf.deviation < 0 ? 'buy' : etf.deviation > 5 ? 'sell' : 'hold'}">
                        ${etf.deviation < -2 ? 'Strong Buy' : etf.deviation < 0 ? 'Buy' : etf.deviation > 5 ? 'Sell' : 'Hold'}
                    </span>
                </td>
                <td>
                    <button onclick="window.app.editETF('${etf.id}', '${etf.name}', ${etf.cmp}, ${etf.dma_20})" class="btn-small">Edit</button>
                    <button onclick="window.app.deleteETF('${etf.id}', '${etf.name}')" class="btn-small btn-danger">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    /**
     * Load holdings data
     */
    async loadHoldingsData() {
        if (!this.supabase) return;

        try {
            // Load active holdings
            const { data: activeHoldings, error: activeError } = await this.supabase
                .from('holdings')
                .select(`
                    *,
                    etfs (name, cmp)
                `)
                .eq('active', true)
                .order('date_purchased', { ascending: false });

            if (activeError) throw activeError;

            this.displayActiveHoldings(activeHoldings || []);
            
            // Load ETF options for buy form
            await this.loadETFOptions();

        } catch (error) {
            console.error('Error loading holdings data:', error);
        }
    }

    /**
     * Display active holdings
     * @param {Array} holdings - Holdings data
     */
    displayActiveHoldings(holdings) {
        const tableBody = document.getElementById('active-holdings-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (holdings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="loading">No active holdings found. Buy some ETFs to get started.</td></tr>';
            return;
        }

        let totalInvestment = 0;
        let currentValue = 0;

        holdings.forEach(holding => {
            const investment = holding.buy_price * holding.quantity;
            const current = holding.etfs.cmp * holding.quantity;
            const pl = current - investment;
            const plPercent = (pl / investment) * 100;
            
            totalInvestment += investment;
            currentValue += current;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="etf-name">${holding.etfs.name}</td>
                <td>${window.Utils ? Utils.formatCurrency(holding.buy_price) : '₹' + holding.buy_price}</td>
                <td>${holding.quantity}</td>
                <td>${window.Utils ? Utils.formatCurrency(holding.etfs.cmp) : '₹' + holding.etfs.cmp}</td>
                <td class="${pl >= 0 ? 'profit' : 'loss'}">${window.Utils ? Utils.formatCurrency(pl) : '₹' + pl.toFixed(2)}</td>
                <td class="${plPercent >= 0 ? 'profit' : 'loss'}">${plPercent.toFixed(2)}%</td>
                <td>${window.Utils ? Utils.formatDate(holding.date_purchased) : holding.date_purchased}</td>
                <td>
                    <button onclick="window.app.sellHolding('${holding.id}', '${holding.etfs.name}', ${holding.etfs.cmp})" 
                            class="btn-small ${pl > 0 ? 'btn-success' : 'btn-danger'}">
                        Sell
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Update portfolio summary
        this.updatePortfolioSummary(totalInvestment, currentValue);
    }

    /**
     * Update portfolio summary display
     * @param {number} totalInvestment - Total investment amount
     * @param {number} currentValue - Current portfolio value
     */
    updatePortfolioSummary(totalInvestment, currentValue) {
        const totalPL = currentValue - totalInvestment;
        const totalPLPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;

        this.updateElement('total-investment', window.Utils ? Utils.formatCurrency(totalInvestment) : '₹' + totalInvestment.toFixed(2));
        this.updateElement('current-value', window.Utils ? Utils.formatCurrency(currentValue) : '₹' + currentValue.toFixed(2));
        
        const plElement = document.getElementById('total-pl');
        if (plElement) {
            plElement.textContent = window.Utils ? Utils.formatCurrency(totalPL) : '₹' + totalPL.toFixed(2);
            plElement.className = `stat-value ${totalPL >= 0 ? 'profit' : 'loss'}`;
        }
        
        const plPercentElement = document.getElementById('total-pl-percent');
        if (plPercentElement) {
            plPercentElement.textContent = totalPLPercent.toFixed(2) + '%';
            plPercentElement.className = `stat-value ${totalPLPercent >= 0 ? 'profit' : 'loss'}`;
        }
    }

    /**
     * Load ETF options for buy form
     */
    async loadETFOptions() {
        if (!this.supabase) return;
        
        try {
            const { data: etfs, error } = await this.supabase
                .from('etfs')
                .select('*')
                .order('name');
                
            if (error) throw error;
            
            const select = document.getElementById('buy-etf-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Choose an ETF...</option>';
            
            etfs.forEach(etf => {
                const option = document.createElement('option');
                option.value = etf.id;
                option.textContent = `${etf.name} (${window.Utils ? Utils.formatCurrency(etf.cmp) : '₹' + etf.cmp})`;
                option.dataset.cmp = etf.cmp;
                select.appendChild(option);
            });
            
            // Auto-fill price when ETF is selected
            select.onchange = function() {
                const selectedOption = this.options[this.selectedIndex];
                const priceField = document.getElementById('buy-price');
                if (selectedOption.dataset.cmp && priceField) {
                    priceField.value = selectedOption.dataset.cmp;
                }
            };
            
        } catch (error) {
            console.error('Error loading ETF options:', error);
        }
    }

    /**
     * Load transactions data
     */
    async loadTransactionsData() {
        if (!this.tradingStrategy) return;

        try {
            this.allTransactions = await this.tradingStrategy.getTransactionHistory();
            this.displayTransactions(this.allTransactions);
            this.updateTransactionSummary();
        } catch (error) {
            console.error('Error loading transactions:', error);
            // Mock data for testing
            this.allTransactions = [];
            this.displayTransactions([]);
            this.updateTransactionSummary();
        }
    }

    /**
     * Display transactions in table
     * @param {Array} transactions - Transaction data
     */
    displayTransactions(transactions) {
        const tableBody = document.getElementById('transactions-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (transactions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="12" class="loading">No transactions found</td></tr>';
            return;
        }

        transactions.forEach(trans => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${window.Utils ? Utils.formatDate(trans.date) : trans.date}</td>
                <td><span class="status ${trans.type.toLowerCase()}">${trans.type}</span></td>
                <td>${trans.etf_name}</td>
                <td>${trans.quantity}</td>
                <td>${window.Utils ? Utils.formatCurrency(trans.price) : '₹' + trans.price}</td>
                <td>${window.Utils ? Utils.formatCurrency(trans.amount) : '₹' + trans.amount}</td>
                <td class="${trans.pl >= 0 ? 'profit' : 'loss'}">${window.Utils ? Utils.formatCurrency(trans.pl) : '₹' + trans.pl}</td>
                <td>${trans.holding_period} days</td>
                <td>${trans.tax_type}</td>
                <td class="loss">${window.Utils ? Utils.formatCurrency(trans.tax_amount) : '₹' + trans.tax_amount}</td>
                <td class="loss">${window.Utils ? Utils.formatCurrency(trans.brokerage) : '₹' + trans.brokerage}</td>
                <td>${window.Utils ? Utils.formatCurrency(trans.net_amount) : '₹' + trans.net_amount}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    /**
     * Update transaction summary
     */
    updateTransactionSummary() {
        const sellTransactions = this.allTransactions.filter(t => t.type === 'SELL');
        const realizedProfit = sellTransactions.reduce((sum, t) => sum + t.pl, 0);
        const stcgTax = sellTransactions.filter(t => t.tax_type === 'STCG').reduce((sum, t) => sum + t.tax_amount, 0);
        const ltcgTax = sellTransactions.filter(t => t.tax_type === 'LTCG').reduce((sum, t) => sum + t.tax_amount, 0);
        const totalTax = stcgTax + ltcgTax;
        const netProfit = realizedProfit - totalTax - sellTransactions.reduce((sum, t) => sum + t.brokerage, 0);

        this.updateElement('total-transactions', this.allTransactions.length);
        this.updateElement('realized-profit', window.Utils ? Utils.formatCurrency(realizedProfit) : '₹' + realizedProfit.toFixed(2));
        this.updateElement('tax-liability', window.Utils ? Utils.formatCurrency(totalTax) : '₹' + totalTax.toFixed(2));
        this.updateElement('stcg-tax', window.Utils ? Utils.formatCurrency(stcgTax) : '₹' + stcgTax.toFixed(2));
        this.updateElement('ltcg-tax', window.Utils ? Utils.formatCurrency(ltcgTax) : '₹' + ltcgTax.toFixed(2));
        this.updateElement('net-profit', window.Utils ? Utils.formatCurrency(netProfit) : '₹' + netProfit.toFixed(2));
    }

    // ==================== FORM HANDLERS ====================

    /**
     * Handle ETF form submission
     * @param {Event} e - Form event
     */
    async handleETFForm(e) {
        e.preventDefault();
        
        const name = document.getElementById('etf-name')?.value.trim();
        const cmp = parseFloat(document.getElementById('etf-cmp')?.value);
        const dma = parseFloat(document.getElementById('etf-dma')?.value);
        
        if (!name || name.length < 2) {
            if (window.Utils) Utils.showNotification('Please enter a valid ETF name', 'error');
            return;
        }
        
        if (!cmp || cmp <= 0) {
            if (window.Utils) Utils.showNotification('Please enter a valid CMP', 'error');
            return;
        }
        
        if (!dma || dma <= 0) {
            if (window.Utils) Utils.showNotification('Please enter a valid 20 DMA', 'error');
            return;
        }
        
        try {
            const { error } = await this.supabase
                .from('etfs')
                .upsert({
                    name: name,
                    cmp: cmp,
                    dma_20: dma,
                    date_updated: window.Utils ? Utils.getTodayString() : new Date().toISOString().split('T')[0]
                }, { onConflict: 'name' });
            
            if (error) throw error;
            
            if (window.Utils) Utils.showNotification('ETF added/updated successfully', 'success');
            e.target.reset();
            await this.loadETFData();
            
        } catch (error) {
            console.error('Error adding ETF:', error);
            if (window.Utils) Utils.showNotification('Failed to add ETF: ' + error.message, 'error');
        }
    }

    /**
     * Handle buy form submission
     * @param {Event} e - Form event
     */
    async handleBuyForm(e) {
        e.preventDefault();
        
        const etfId = document.getElementById('buy-etf-select')?.value;
        const price = parseFloat(document.getElementById('buy-price')?.value);
        const quantity = parseInt(document.getElementById('buy-quantity')?.value);
        
        if (!etfId) {
            if (window.Utils) Utils.showNotification('Please select an ETF', 'error');
            return;
        }
        
        if (!price || price <= 0) {
            if (window.Utils) Utils.showNotification('Please enter a valid price', 'error');
            return;
        }
        
        if (!quantity || quantity < 1) {
            if (window.Utils) Utils.showNotification('Please enter a valid quantity', 'error');
            return;
        }
        
        const investmentAmount = price * quantity;
        
        if (window.budgetManager) {
            const budgetCheck = window.budgetManager.checkSufficientBudget(investmentAmount);
            
            if (!budgetCheck.sufficient) {
                if (window.Utils) Utils.showNotification(`Insufficient budget. Available: ${Utils.formatCurrency(budgetCheck.available)}`, 'error');
                return;
            }
        }
        
        try {
            const { error } = await this.supabase
                .from('holdings')
                .insert({
                    etf_id: etfId,
                    buy_price: price,
                    quantity: quantity,
                    date_purchased: window.Utils ? Utils.getTodayString() : new Date().toISOString().split('T')[0],
                    active: true
                });
            
            if (error) throw error;
            
            // Update budget
            if (window.budgetManager) {
                window.budgetManager.recordInvestment(investmentAmount);
            }
            
            if (window.Utils) Utils.showNotification('ETF purchased successfully', 'success');
            e.target.reset();
            await this.loadHoldingsData();
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Error buying ETF:', error);
            if (window.Utils) Utils.showNotification('Failed to buy ETF: ' + error.message, 'error');
        }
    }

    /**
     * Handle budget form submission
     * @param {Event} e - Form event
     */
    async handleBudgetForm(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('budget-amount')?.value);
        const startDate = document.getElementById('start-date')?.value;
        
        if (!amount || amount < 5000) {
            if (window.Utils) Utils.showNotification('Minimum budget is ₹5,000', 'error');
            return;
        }
        
        if (!startDate) {
            if (window.Utils) Utils.showNotification('Please select start date', 'error');
            return;
        }
        
        try {
            if (window.budgetManager) {
                await window.budgetManager.setBudget(amount, startDate);
                if (window.Utils) Utils.showNotification('Budget set successfully!', 'success');
                window.budgetManager.generateInvestmentCalendar();
            }
        } catch (error) {
            console.error('Error setting budget:', error);
            if (window.Utils) Utils.showNotification(error.message, 'error');
        }
    }

    // ==================== TRADING ACTIONS ====================

    /**
     * Calculate and execute trading strategy
     */
    async calculateStrategy() {
        if (!this.supabase || !this.tradingStrategy) {
            if (window.Utils) Utils.showNotification('Please configure Supabase connection first', 'error');
            return;
        }

        try {
            if (window.Utils) Utils.showNotification('Calculating strategy...', 'info');
            
            // Clear any existing ETF options from previous calculations
            const existingOptionsContainer = document.getElementById('etf-options-container');
            if (existingOptionsContainer) {
                existingOptionsContainer.remove();
            }
            
            const results = await this.tradingStrategy.calculateDailyStrategy();
            
            // Update UI
            this.updateElement('today-action', results.actions?.summary || 'No action');
            this.updateElement('next-action', results.actions?.summary || 'No action required');
            this.updateElement('last-updated', window.Utils ? Utils.formatDateTime(new Date()) : new Date().toLocaleString());
            
            // Update action summary for multiple options
            if (results.actions?.buy?.type === 'MULTIPLE_OPTIONS') {
                const optionsCount = results.actions.buy.options.length;
                this.updateElement('today-action', `${optionsCount} ETF options available - select preferred option below`);
                this.updateElement('next-action', 'Choose ETF and confirm purchase');
            }

            // Reload data
            await this.loadAllData();
            
            if (window.Utils) Utils.showNotification('Strategy calculated successfully!', 'success');

        } catch (error) {
            console.error('Error calculating strategy:', error);
            if (window.Utils) Utils.showNotification('Failed to calculate strategy: ' + error.message, 'error');
        }
    }

    /**
     * Calculate ETF rankings
     */
    async calculateRankings() {
        if (!this.tradingStrategy) {
            if (window.Utils) Utils.showNotification('Trading strategy not initialized', 'error');
            return;
        }
        
        try {
            if (window.Utils) Utils.showNotification('Calculating rankings...', 'info');
            await this.tradingStrategy.calculateRankings();
            await this.loadETFData();
            if (window.Utils) Utils.showNotification('Rankings updated successfully!', 'success');
        } catch (error) {
            console.error('Error calculating rankings:', error);
            if (window.Utils) Utils.showNotification('Failed to calculate rankings: ' + error.message, 'error');
        }
    }

    /**
     * Sell a holding
     * @param {string} holdingId - Holding ID
     * @param {string} etfName - ETF name
     * @param {number} currentPrice - Current price
     */
    async sellHolding(holdingId, etfName, currentPrice) {
        if (!confirm(`Sell ${etfName} at ${window.Utils ? Utils.formatCurrency(currentPrice) : '₹' + currentPrice}?`)) {
            return;
        }
        
        try {
            // Get holding details for profit calculation
            const { data: holding, error: getError } = await this.supabase
                .from('holdings')
                .select('*')
                .eq('id', holdingId)
                .single();

            if (getError) throw getError;

            // Calculate profit and holding period
            const buyDate = new Date(holding.date_purchased);
            const sellDate = new Date();
            const holdingPeriod = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24));
            
            const buyAmount = holding.buy_price * holding.quantity;
            const sellAmount = currentPrice * holding.quantity;
            const profit = sellAmount - buyAmount;

            // Execute sell
            const { error } = await this.supabase
                .from('holdings')
                .update({
                    active: false,
                    sell_price: currentPrice,
                    date_sold: window.Utils ? Utils.getTodayString() : new Date().toISOString().split('T')[0]
                })
                .eq('id', holdingId);

            if (error) throw error;

            // Handle profit allocation
            if (profit > 0 && window.budgetManager) {
                const profitAllocation = window.budgetManager.calculateProfitAllocation(profit, holdingPeriod);
                window.budgetManager.addProfitToReinvestment(profitAllocation);
                if (window.Utils) Utils.showNotification(`${etfName} sold! Profit: ${Utils.formatCurrency(profit)}. ${Utils.formatCurrency(profitAllocation.reinvestmentAmount)} added to budget.`, 'success');
            } else {
                if (window.Utils) Utils.showNotification(`${etfName} sold successfully`, 'success');
            }

            // Refresh data
            await this.loadHoldingsData();
            await this.loadDashboardData();
            await this.loadTransactionsData();

        } catch (error) {
            console.error('Error selling holding:', error);
            if (window.Utils) Utils.showNotification('Failed to sell holding: ' + error.message, 'error');
        }
    }

    /**
     * Edit ETF data
     * @param {string} id - ETF ID
     * @param {string} name - ETF name
     * @param {number} cmp - Current price
     * @param {number} dma - 20 DMA
     */
    editETF(id, name, cmp, dma) {
        const nameField = document.getElementById('etf-name');
        const cmpField = document.getElementById('etf-cmp');
        const dmaField = document.getElementById('etf-dma');
        
        if (nameField) nameField.value = name;
        if (cmpField) cmpField.value = cmp;
        if (dmaField) dmaField.value = dma;
        
        // Scroll to form
        const form = document.getElementById('etf-form');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Delete ETF
     * @param {string} id - ETF ID
     * @param {string} name - ETF name
     */
    async deleteETF(id, name) {
        if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        try {
            const { error } = await this.supabase
                .from('etfs')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            if (window.Utils) Utils.showNotification(`${name} deleted successfully`, 'success');
            await this.loadETFData();
            
        } catch (error) {
            console.error('Error deleting ETF:', error);
            if (window.Utils) Utils.showNotification('Failed to delete ETF: ' + error.message, 'error');
        }
    }

    // ==================== FILE UPLOAD ====================

    /**
     * Handle file selection
     * @param {Event} event - File input event
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            
            this.updateElement('file-name', file.name);
            this.updateElement('file-size', window.Utils ? Utils.formatFileSize(file.size) : (file.size / 1024).toFixed(2) + ' KB');
            
            const uploadInfo = document.getElementById('upload-info');
            const processBtn = document.getElementById('process-btn');
            const clearBtn = document.getElementById('clear-btn');
            
            if (uploadInfo) uploadInfo.style.display = 'block';
            if (processBtn) processBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
            
            // Hide previous results
            const uploadResults = document.getElementById('upload-results');
            if (uploadResults) uploadResults.style.display = 'none';
        }
    }

    /**
     * Clear file selection
     */
    clearFileSelection() {
        this.selectedFile = null;
        
        const fileInput = document.getElementById('csv-file');
        const uploadInfo = document.getElementById('upload-info');
        const uploadResults = document.getElementById('upload-results');
        const processBtn = document.getElementById('process-btn');
        const clearBtn = document.getElementById('clear-btn');
        
        if (fileInput) fileInput.value = '';
        if (uploadInfo) uploadInfo.style.display = 'none';
        if (uploadResults) uploadResults.style.display = 'none';
        if (processBtn) processBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
    }

    /**
     * Process CSV file - CORRECTED VERSION
     */
async processCSVFile() {
    console.log("Starting CSV processing with loading screen...");
    
    // Check authentication and database
    if (!this.requireAuth() || !this.requireDatabase()) {
        return;
    }
    
    // Check file selection
    if (!this.selectedFile) {
        if (window.Utils) {
            Utils.showNotification('Please select a file', 'error');
        } else {
            alert('❌ Please select a file');
        }
        return;
    }
    
    // Show loading screen
    if (window.loadingManager) {
        window.loadingManager.show(
            'Processing ETF Data', 
            'Reading and parsing your CSV file. This may take a few moments...'
        );
        window.loadingManager.showCancelButton();
    }
    
    try {
        // Step 1: Read file
        if (window.loadingManager) {
            window.loadingManager.setStep('step-reading', 'active');
            window.loadingManager.updateProgress(10);
        }
        
        const fileContent = await this.readFileAsText(this.selectedFile);
        console.log("✅ File read successfully, size:", fileContent.length);
        
        // Check for cancellation
        if (window.loadingManager && window.loadingManager.cancelled) {
            throw new Error('Operation cancelled by user');
        }
        
        // Step 2: Parse CSV
        if (window.loadingManager) {
            window.loadingManager.setStep('step-reading', 'completed');
            window.loadingManager.setStep('step-parsing', 'active');
            window.loadingManager.updateProgress(25);
            window.loadingManager.updateMessage('Parsing CSV data and cleaning headers...');
        }
        
        // Small delay to show the progress
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let parsed;
        if (typeof Papa !== 'undefined') {
            parsed = Papa.parse(fileContent, {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: true,
                delimiter: ','
            });
        } else {
            throw new Error('Papa Parse library not loaded');
        }
        
        console.log(`✅ CSV parsed: ${parsed.data.length} rows`);
        
        // Clean data
        const processedData = [];
        const totalRows = parsed.data.length;
        
        for (let i = 0; i < totalRows; i++) {
            // Check for cancellation
            if (window.loadingManager && window.loadingManager.cancelled) {
                throw new Error('Operation cancelled by user');
            }
            
            const rawRow = parsed.data[i];
            const cleanRow = {};
            
            // Clean each field
            for (const [rawKey, rawValue] of Object.entries(rawRow)) {
                let cleanKey = rawKey
                    .replace(/\s*\n\s*/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/['"]/g, '');
                
                if (cleanKey.includes('(₹ Crores)')) {
                    cleanKey = 'VALUE';
                }
                
                cleanRow[cleanKey] = rawValue ? rawValue.toString().trim() : '';
            }
            
            processedData.push(cleanRow);
            
            // Update progress during parsing
            if (i % 50 === 0 && window.loadingManager) {
                const progress = 25 + (i / totalRows) * 20; // 25% to 45%
                window.loadingManager.updateProgress(progress);
            }
        }
        
        // Step 3: Apply advanced filtering using ImportFilterManager
        if (window.loadingManager) {
            window.loadingManager.setStep('step-parsing', 'completed');
            window.loadingManager.setStep('step-filtering', 'active');
            window.loadingManager.updateProgress(50);
            
            const filterConfig = window.importFilterManager.getConfig();
            window.loadingManager.updateMessage(`Applying filters: Volume > ${filterConfig.volumeFilter.toLocaleString()}, Top ${filterConfig.topETFsPerCategory} per category, ${filterConfig.excludeLiquidETFs ? 'Exclude' : 'Include'} liquid ETFs...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use ImportFilterManager for advanced filtering
        const filteredData = window.importFilterManager.applyFilters(processedData);
        const validETFs = window.importFilterManager.convertToETFObjects(filteredData);
        
        // Get filter statistics for logging
        const filterStats = window.importFilterManager.getFilterStats(processedData, filteredData);
        console.log('Filter Statistics:', filterStats);
        
        console.log(`✅ Advanced filtering complete: ${validETFs.length} ETFs selected from ${processedData.length} original ETFs`);
        
        if (validETFs.length === 0) {
            throw new Error('No valid ETFs found in CSV file');
        }
        
        // Step 4: Insert into database
        if (window.loadingManager) {
            window.loadingManager.setStep('step-filtering', 'completed');
            window.loadingManager.setStep('step-inserting', 'active');
            window.loadingManager.updateProgress(70);
            window.loadingManager.updateMessage(`Inserting ${validETFs.length} ETFs into database...`);
            window.loadingManager.updateStats(processedData.length, validETFs.length, 0);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let insertedCount = 0;
        const today = new Date().toISOString().split('T')[0];
        const totalToInsert = validETFs.length;
        
        for (let i = 0; i < validETFs.length; i++) {
            // Check for cancellation
            if (window.loadingManager && window.loadingManager.cancelled) {
                throw new Error('Operation cancelled by user');
            }
            
            const etf = validETFs[i];
            
            try {
                const { error } = await this.supabase
                    .from('etfs')
                    .upsert({
                        name: etf.name,
                        cmp: etf.cmp,
                        dma_20: etf.dma_20,
                        date_updated: today
                    }, { onConflict: 'name' });
                    
                if (!error) {
                    insertedCount++;
                }
            } catch (error) {
                console.error(`❌ Error processing ${etf.name}:`, error);
            }
            
            // Update progress during insertion
            const progress = 70 + ((i + 1) / totalToInsert) * 30; // 70% to 100%
            if (window.loadingManager) {
                window.loadingManager.updateProgress(progress);
                window.loadingManager.updateStats(processedData.length, validETFs.length, insertedCount);
                
                // Update message with current ETF being processed
                if (i % 10 === 0) {
                    window.loadingManager.updateMessage(`Inserting ETF ${i + 1} of ${totalToInsert}: ${etf.name}`);
                }
            }
            
            // Small delay to show progress (remove in production if too slow)
            if (i % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        // Completion
        if (window.loadingManager) {
            window.loadingManager.setStep('step-inserting', 'completed');
            window.loadingManager.updateProgress(100);
            window.loadingManager.updateMessage(`Successfully processed ${insertedCount} ETFs!`);
            window.loadingManager.updateStats(processedData.length, validETFs.length, insertedCount);
        }
        
        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Hide loading screen
        if (window.loadingManager) {
            window.loadingManager.hide();
        }
        
        // Update UI
        this.updateElement('processed-count', processedData.length);
        this.updateElement('valid-count', validETFs.length);
        
        const uploadResults = document.getElementById('upload-results');
        if (uploadResults) uploadResults.style.display = 'block';
        
        // Show success message with filter statistics
        const finalFilterStats = window.importFilterManager.getFilterStats(processedData, filteredData);
        const message = `Successfully processed ${insertedCount} ETFs!\n\n📊 Filter Results:\n• Original: ${finalFilterStats.originalCount} ETFs\n• After filtering: ${finalFilterStats.filteredCount} ETFs\n• Inserted: ${insertedCount} ETFs`;
        console.log("📊 FINAL:", message);
        
        if (window.Utils) {
            Utils.showNotification(
                `Successfully processed ${insertedCount} ETFs! Check console for detailed filter statistics.`, 
                'success'
            );
        } else {
            alert('✅ ' + message);
        }
        
        // Extract and store date from filename
        this.extractAndStoreDataDate(this.selectedFile.name);
        
        // Refresh ETF data display
        await this.loadETFData();
        
    } catch (error) {
        console.error('❌ Error processing CSV:', error);
        
        // Hide loading screen
        if (window.loadingManager) {
            window.loadingManager.hide();
        }
        
        const errorMsg = error.message === 'Operation cancelled by user' 
            ? 'CSV processing was cancelled' 
            : 'Failed to process CSV: ' + error.message;
            
        if (window.Utils) {
            Utils.showNotification(errorMsg, error.message === 'Operation cancelled by user' ? 'warning' : 'error');
        } else {
            alert('❌ ' + errorMsg);
        }
    }
}



    /**
     * Read file as text
     * @param {File} file - File to read
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }

    /**
     * Extract date from CSV filename and store in localStorage
     * @param {string} filename - CSV filename
     */
    extractAndStoreDataDate(filename) {
        console.log('Extracting date from filename:', filename);
        
        try {
            let extractedDate = null;
            
            // Try different date patterns commonly found in CSV filenames
            const datePatterns = [
                // Pattern: YYYY-MM-DD
                /(\d{4})-(\d{2})-(\d{2})/,
                // Pattern: YYYY_MM_DD
                /(\d{4})_(\d{2})_(\d{2})/,
                // Pattern: YYYYMMDD
                /(\d{4})(\d{2})(\d{2})/,
                // Pattern: DD-MM-YYYY
                /(\d{2})-(\d{2})-(\d{4})/,
                // Pattern: DD_MM_YYYY
                /(\d{2})_(\d{2})_(\d{4})/,
                // Pattern: MM/DD/YYYY
                /(\d{2})\/(\d{2})\/(\d{4})/,
                // Pattern: DD/MM/YYYY
                /(\d{2})\/(\d{2})\/(\d{4})/
            ];
            
            for (let i = 0; i < datePatterns.length; i++) {
                const pattern = datePatterns[i];
                const match = filename.match(pattern);
                
                if (match) {
                    let day, month, year;
                    
                    if (i === 0 || i === 1 || i === 2) {
                        // YYYY-MM-DD, YYYY_MM_DD, YYYYMMDD
                        year = parseInt(match[1]);
                        month = parseInt(match[2]);
                        day = parseInt(match[3]);
                    } else if (i === 3 || i === 4 || i === 6) {
                        // DD-MM-YYYY, DD_MM_YYYY, DD/MM/YYYY
                        day = parseInt(match[1]);
                        month = parseInt(match[2]);
                        year = parseInt(match[3]);
                    } else if (i === 5) {
                        // MM/DD/YYYY (assuming US format)
                        month = parseInt(match[1]);
                        day = parseInt(match[2]);
                        year = parseInt(match[3]);
                    }
                    
                    // Validate date components
                    if (year >= 2000 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        extractedDate = new Date(year, month - 1, day);
                        
                        // Validate that the date is valid
                        if (extractedDate.getFullYear() === year && 
                            extractedDate.getMonth() === month - 1 && 
                            extractedDate.getDate() === day) {
                            console.log('Date extracted successfully:', extractedDate);
                            break;
                        }
                    }
                }
            }
            
            // If no date found, try to extract from common filename patterns
            if (!extractedDate) {
                // Try to find any 4-digit year and assume it's recent
                const yearMatch = filename.match(/20\d{2}/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[0]);
                    // Use current month and day as fallback
                    const now = new Date();
                    extractedDate = new Date(year, now.getMonth(), now.getDate());
                    console.log('Using year-only fallback date:', extractedDate);
                }
            }
            
            if (extractedDate) {
                const dateString = extractedDate.toISOString().split('T')[0];
                const formattedDate = extractedDate.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                // Store both ISO string and formatted date
                localStorage.setItem('etf-data-date', dateString);
                localStorage.setItem('etf-data-date-formatted', formattedDate);
                
                console.log('Data date stored:', { dateString, formattedDate });
                
                // Update the UI immediately
                this.updateDataDateDisplay(formattedDate);
                
                // Show success notification
                if (window.Utils) {
                    Utils.showNotification(`Data date extracted: ${formattedDate}`, 'success');
                }
                
                return formattedDate;
            } else {
                console.log('Could not extract date from filename, using current date');
                
                // Fallback to current date
                const now = new Date();
                const dateString = now.toISOString().split('T')[0];
                const formattedDate = now.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                localStorage.setItem('etf-data-date', dateString);
                localStorage.setItem('etf-data-date-formatted', formattedDate);
                
                this.updateDataDateDisplay(formattedDate);
                
                if (window.Utils) {
                    Utils.showNotification(`Using current date: ${formattedDate}`, 'info');
                }
                
                return formattedDate;
            }
            
        } catch (error) {
            console.error('Error extracting date from filename:', error);
            
            // Fallback to current date
            const now = new Date();
            const formattedDate = now.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            localStorage.setItem('etf-data-date-formatted', formattedDate);
            this.updateDataDateDisplay(formattedDate);
            
            return formattedDate;
        }
    }

    /**
     * Update the data date display in the UI
     * @param {string} formattedDate - Formatted date string
     */
    updateDataDateDisplay(formattedDate) {
        const dataDateElement = document.getElementById('data-updated-date');
        if (dataDateElement) {
            dataDateElement.textContent = formattedDate;
        }
    }

    /**
     * Load and display stored data date
     */
    loadDataDate() {
        const storedDate = localStorage.getItem('etf-data-date-formatted');
        if (storedDate) {
            this.updateDataDateDisplay(storedDate);
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Update element text content
     * @param {string} id - Element ID
     * @param {string} value - New value
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Refresh holdings data
     */
    async refreshHoldings() {
        if (window.Utils) Utils.showNotification('Refreshing holdings...', 'info');
        await this.loadHoldingsData();
        await this.loadDashboardData();
        if (window.Utils) Utils.showNotification('Holdings refreshed', 'success');
    }

    /**
     * Filter transactions
     */
    filterTransactions() {
        const filterSelect = document.getElementById('trans-filter');
        if (!filterSelect) return;
        
        const filter = filterSelect.value;
        let filtered = [...this.allTransactions];

        switch (filter) {
            case 'buy':
                filtered = filtered.filter(t => t.type === 'BUY');
                break;
            case 'sell':
                filtered = filtered.filter(t => t.type === 'SELL');
                break;
            case 'profit':
                filtered = filtered.filter(t => t.type === 'SELL' && t.pl > 0);
                break;
            case 'stcg':
                filtered = filtered.filter(t => t.tax_type === 'STCG');
                break;
            case 'ltcg':
                filtered = filtered.filter(t => t.tax_type === 'LTCG');
                break;
        }

        this.displayTransactions(filtered);
    }

    /**
     * Export transactions to CSV
     */
    exportTransactions() {
        const exportData = this.allTransactions.map(trans => ({
            'Date': trans.date,
            'Type': trans.type,
            'ETF': trans.etf_name,
            'Quantity': trans.quantity,
            'Price': trans.price,
            'Amount': trans.amount,
            'P&L': trans.pl,
            'Days Held': trans.holding_period,
            'Tax Type': trans.tax_type,
            'Tax Amount': trans.tax_amount,
            'Brokerage': trans.brokerage,
            'Net Amount': trans.net_amount
        }));

        if (window.Utils) {
            Utils.exportToCSV(exportData, `transactions_${Utils.getTodayString()}.csv`);
        } else {
            console.log('Export data:', exportData);
            alert('Export functionality requires Utils module');
        }
    }

    /**
     * Reset budget
     */
    async resetBudget() {
        if (!confirm('Reset budget? This will clear all budget data.')) return;
        
        try {
            if (window.budgetManager) {
                await window.budgetManager.resetBudget();
            }
            
            const budgetForm = document.getElementById('budget-form');
            if (budgetForm) budgetForm.reset();
            
            if (window.Utils) Utils.showNotification('Budget reset successfully', 'success');
        } catch (error) {
            console.error('Error resetting budget:', error);
            if (window.Utils) Utils.showNotification('Failed to reset budget: ' + error.message, 'error');
        }
    }

    /**
     * Add sample data
     */
    async addSampleData() {
        if (!this.supabase) {
            if (window.Utils) Utils.showNotification('Please configure Supabase first', 'error');
            return;
        }

        const sampleETFs = [
            { name: 'NIFTY 50 ETF', cmp: 155.50, dma_20: 160.00 },
            { name: 'BANK ETF', cmp: 42.80, dma_20: 45.00 },
            { name: 'IT ETF', cmp: 78.20, dma_20: 75.00 },
            { name: 'PHARMA ETF', cmp: 65.40, dma_20: 68.00 },
            { name: 'AUTO ETF', cmp: 32.10, dma_20: 35.00 }
        ];

        try {
            const today = window.Utils ? Utils.getTodayString() : new Date().toISOString().split('T')[0];
            
            for (const etf of sampleETFs) {
                await this.supabase
                    .from('etfs')
                    .upsert({
                        ...etf,
                        date_updated: today
                    }, { onConflict: 'name' });
            }
            
            if (window.Utils) Utils.showNotification('Sample data added successfully!', 'success');
            await this.loadETFData();
            
        } catch (error) {
            console.error('Error adding sample data:', error);
            if (window.Utils) Utils.showNotification('Failed to add sample data: ' + error.message, 'error');
        }
    }
}

// ==================== GLOBAL FUNCTIONS ====================

// Global functions for onclick handlers
function showPage(pageName) {
    if (window.app) {
        window.app.showPage(pageName);
    }
}

function calculateStrategy() {
    if (window.app) {
        window.app.calculateStrategy();
    }
}

function calculateRankings() {
    if (window.app) {
        window.app.calculateRankings();
    }
}

function loadETFData() {
    if (window.app) {
        window.app.loadETFData();
    }
}

function refreshHoldings() {
    if (window.app) {
        window.app.refreshHoldings();
    }
}

function filterTransactions() {
    if (window.app) {
        window.app.filterTransactions();
    }
}

function exportTransactions() {
    if (window.app) {
        window.app.exportTransactions();
    }
}

function saveConfig() {
    console.log("saveConfig called");
    
    if (window.app) {
        // Call existing method
        window.app.saveSupabaseConfig();
        
        // Force ensure supabase client exists
        const url = document.getElementById('supabase-url')?.value?.trim();
        const key = document.getElementById('supabase-key')?.value?.trim();
        
        if (url && key && typeof supabase !== 'undefined') {
            window.app.supabase = supabase.createClient(url, key);
            console.log("✅ Supabase client created");
        }
    }
}

function resetBudget() {
    if (window.app) {
        window.app.resetBudget();
    }
}

/**
 * Preview budget top-up changes
 */
function previewTopup() {
    const topupAmountField = document.getElementById('topup-amount');
    const previewSection = document.getElementById('topup-preview');
    const confirmBtn = document.getElementById('confirm-topup-btn');
    
    if (!topupAmountField || !previewSection) return;
    
    const topupAmount = parseFloat(topupAmountField.value);
    
    if (!topupAmount || topupAmount < 1000) {
        Utils.showNotification('Please enter a valid top-up amount (minimum ₹1,000)', 'error');
        return;
    }
    
    try {
        const preview = budgetManager.previewTopup(topupAmount);
        
        // Update preview elements
        document.getElementById('preview-current-budget').textContent = Utils.formatCurrency(preview.currentBudget);
        document.getElementById('preview-topup-amount').textContent = Utils.formatCurrency(preview.topupAmount);
        document.getElementById('preview-new-budget').textContent = Utils.formatCurrency(preview.newBudget);
        document.getElementById('preview-used-amount').textContent = Utils.formatCurrency(preview.usedAmount);
        document.getElementById('preview-days-remaining').textContent = preview.remainingDays;
        document.getElementById('preview-new-daily').textContent = Utils.formatCurrency(preview.newDailyAmount);
        
        // Show preview section and enable confirm button
        previewSection.style.display = 'block';
        confirmBtn.disabled = false;
        
    } catch (error) {
        Utils.showNotification(error.message, 'error');
        previewSection.style.display = 'none';
        confirmBtn.disabled = true;
    }
}

/**
 * Handle top-up form submission
 */
async function handleTopupForm(e) {
    e.preventDefault();
    
    const topupAmountField = document.getElementById('topup-amount');
    const topupAmount = parseFloat(topupAmountField.value);
    
    if (!topupAmount || topupAmount < 1000) {
        Utils.showNotification('Please enter a valid top-up amount (minimum ₹1,000)', 'error');
        return;
    }
    
    // Confirm the action
    if (!confirm(`Confirm budget top-up of ${Utils.formatCurrency(topupAmount)}?\n\nThis will increase your total budget and recalculate daily investment amounts based on remaining days.`)) {
        return;
    }
    
    try {
        const result = await budgetManager.topupBudget(topupAmount);
        
        Utils.showNotification(
            `Budget topped up successfully!\nNew total: ${Utils.formatCurrency(result.newBudget)}\nNew daily amount: ${Utils.formatCurrency(result.newDailyAmount)}`, 
            'success'
        );
        
        // Reset form and hide preview
        e.target.reset();
        document.getElementById('topup-preview').style.display = 'none';
        document.getElementById('confirm-topup-btn').disabled = true;
        
        // Refresh dashboard if needed
        if (window.app) {
            window.app.loadDashboardData();
        }
        
    } catch (error) {
        Utils.showNotification(error.message, 'error');
    }
}

function addSampleData() {
    if (window.app) {
        window.app.addSampleData();
    }
}

function handleFileSelect(event) {
    if (window.app) {
        window.app.handleFileSelect(event);
        console.log("✅ File stored in app.selectedFile");
    }
}

function clearFileSelection() {
    if (window.app) {
        window.app.clearFileSelection();
    }
}

function processCSVFile() {
    if (window.app) {
        window.app.processCSVFile();
    }
}

/**
 * Save import filter settings
 */
function saveImportFilters() {
    if (window.importFilterManager) {
        window.importFilterManager.saveFilters();
    }
}

/**
 * Reset import filters to defaults
 */
function resetImportFilters() {
    if (window.importFilterManager) {
        window.importFilterManager.resetToDefaults();
    }
}

// Database connection test function
async function testConnection() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const testBtn = document.getElementById('test-connection-btn');
    
    // Show testing state
    if (statusDot) statusDot.className = 'status-dot testing';
    if (statusText) statusText.textContent = 'Testing...';
    if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
    }
    
    try {
        // Get the Supabase credentials
        const supabaseUrl = document.getElementById('supabase-url')?.value;
        const supabaseKey = document.getElementById('supabase-key')?.value;
        
        // Check if credentials are provided
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Please enter both Supabase URL and Key');
        }
        
        // Create a temporary Supabase client to test connection
        const testClient = supabase.createClient(supabaseUrl, supabaseKey);
        
        // Try a simple query to test connection
        const { data, error } = await testClient
            .from('etfs')
            .select('count')
            .limit(1);
        
        if (error) {
            throw error;
        }
        
        // Connection successful
        if (statusDot) statusDot.className = 'status-dot connected';
        if (statusText) statusText.textContent = 'Connected';
        
        // Show success message
        alert('✅ Database connection successful!');
        
    } catch (error) {
        // Connection failed
        if (statusDot) statusDot.className = 'status-dot disconnected';
        if (statusText) statusText.textContent = 'Connection Failed';
        
        // Show error message
        alert('❌ Connection failed: ' + error.message);
        console.error('Connection error:', error);
    }
    
    // Reset button
    if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
    }
}

// Replace the LoadingManager class in your app.js with this improved version:

class LoadingManager {
    constructor() {
        this.overlay = null;
        this.isProcessing = false;
        this.cancelled = false;
    }
    
show(title = 'Processing...', message = 'Please wait...') {
    console.log('LoadingManager: Showing loading screen');
    
    this.overlay = document.getElementById('loading-overlay');
    if (!this.overlay) {
        console.error('Loading overlay element not found');
        return;
    }
    
    this.isProcessing = true;
    this.cancelled = false;
    
    // Update content
    const titleElement = document.getElementById('loading-title');
    const messageElement = document.getElementById('loading-message');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    
    // Reset progress
    this.updateProgress(0);
    this.resetSteps();
    
    // Show overlay using CSS class
    this.overlay.classList.add('show');
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    document.body.classList.add('loading-active');
    
    console.log('LoadingManager: Loading screen should now be visible');
}
    
hide() {
    console.log('LoadingManager: Hiding loading screen');
    
    if (!this.overlay) return;
    
    this.isProcessing = false;
    
    // Hide overlay using CSS class
    this.overlay.classList.remove('show');
    
    // Restore body scrolling
    document.body.style.overflow = '';
    document.body.classList.remove('loading-active');
    
    console.log('LoadingManager: Loading screen hidden');
}

    
    updateProgress(percentage) {
        const progressBar = document.getElementById('loading-progress-bar');
        if (progressBar) {
            progressBar.style.width = Math.max(0, Math.min(100, percentage)) + '%';
        }
        
        const statProgress = document.getElementById('stat-progress');
        if (statProgress) {
            statProgress.textContent = Math.round(Math.max(0, Math.min(100, percentage))) + '%';
        }
    }
    
    updateMessage(message) {
        const messageElement = document.getElementById('loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        console.log('LoadingManager: Updated message -', message);
    }
    
    setStep(stepId, status = 'active') {
        const step = document.getElementById(stepId);
        if (!step) {
            console.warn('LoadingManager: Step element not found -', stepId);
            return;
        }
        
        // Remove all status classes
        step.classList.remove('pending', 'active', 'completed');
        step.classList.add(status);
        
        // Update icon
        const icon = step.querySelector('.loading-step-icon');
        if (icon) {
            if (status === 'completed') {
                icon.textContent = '✓';
            } else if (status === 'active') {
                // Keep the step number for active state
                const stepNumber = stepId.split('-')[1];
                const stepNumbers = { 'reading': '1', 'parsing': '2', 'filtering': '3', 'inserting': '4' };
                icon.textContent = stepNumbers[stepNumber] || '?';
            }
        }
        
        console.log('LoadingManager: Set step', stepId, 'to', status);
    }
    
    resetSteps() {
        const steps = ['step-reading', 'step-parsing', 'step-filtering', 'step-inserting'];
        const stepNumbers = ['1', '2', '3', '4'];
        
        steps.forEach((stepId, index) => {
            const step = document.getElementById(stepId);
            if (step) {
                step.classList.remove('active', 'completed');
                step.classList.add('pending');
                const icon = step.querySelector('.loading-step-icon');
                if (icon) {
                    icon.textContent = stepNumbers[index];
                }
            }
        });
    }
    
    updateStats(processed = 0, valid = 0, inserted = 0) {
        const statsContainer = document.getElementById('loading-stats');
        if (statsContainer) {
            statsContainer.style.display = 'grid';
        }
        
        const statProcessed = document.getElementById('stat-processed');
        const statValid = document.getElementById('stat-valid');
        const statInserted = document.getElementById('stat-inserted');
        
        if (statProcessed) statProcessed.textContent = processed.toLocaleString();
        if (statValid) statValid.textContent = valid.toLocaleString();
        if (statInserted) statInserted.textContent = inserted.toLocaleString();
    }
    
    showCancelButton() {
        const cancelBtn = document.getElementById('loading-cancel-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'block';
        }
    }
    
    cancel() {
        this.cancelled = true;
        this.updateMessage('Cancelling operation...');
        
        const cancelBtn = document.getElementById('loading-cancel-btn');
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelling...';
        }
        
        console.log('LoadingManager: Operation cancelled by user');
    }
}

// Make sure to create the global instance
if (!window.loadingManager) {
    window.loadingManager = new LoadingManager();
}

// Enhanced cancel function
function cancelCSVProcessing() {
    console.log('Cancel button clicked');
    if (window.loadingManager) {
        window.loadingManager.cancel();
    }
}

// Debug function to test loading screen
function testLoadingScreen() {
    console.log('Testing loading screen...');
    
    if (!window.loadingManager) {
        console.error('LoadingManager not found');
        return;
    }
    
    // Show loading screen
    window.loadingManager.show('Test Loading', 'Testing the loading screen...');
    window.loadingManager.showCancelButton();
    
    let progress = 0;
    const steps = ['step-reading', 'step-parsing', 'step-filtering', 'step-inserting'];
    let currentStep = 0;
    
    const interval = setInterval(() => {
        progress += 10;
        window.loadingManager.updateProgress(progress);
        window.loadingManager.updateStats(progress * 10, progress * 5, progress * 2);
        
        if (progress >= 25 && currentStep === 0) {
            window.loadingManager.setStep(steps[0], 'completed');
            window.loadingManager.setStep(steps[1], 'active');
            currentStep = 1;
        } else if (progress >= 50 && currentStep === 1) {
            window.loadingManager.setStep(steps[1], 'completed');
            window.loadingManager.setStep(steps[2], 'active');
            currentStep = 2;
        } else if (progress >= 75 && currentStep === 2) {
            window.loadingManager.setStep(steps[2], 'completed');
            window.loadingManager.setStep(steps[3], 'active');
            currentStep = 3;
        }
        
        if (progress >= 100) {
            window.loadingManager.setStep(steps[3], 'completed');
            window.loadingManager.updateMessage('Test completed!');
            
            setTimeout(() => {
                window.loadingManager.hide();
                clearInterval(interval);
            }, 2000);
        }
    }, 500);
}

// Console command to test: testLoadingScreen()

// ==================== BUY CONFIRMATION DIALOG ====================

/**
 * Close buy confirmation dialog
 */
function closeBuyConfirmation() {
    const overlay = document.getElementById('buy-confirmation-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Clear pending action
    window.pendingBuyAction = null;
}

/**
 * Update total amount when quantity changes
 */
function updateTotalAmount() {
    if (!window.pendingBuyAction) return;
    
    const quantityInput = document.getElementById('confirm-quantity-input');
    const totalAmountElement = document.getElementById('confirm-total-amount');
    const budgetWarning = document.getElementById('budget-warning');
    
    if (!quantityInput || !totalAmountElement) return;
    
    const newQuantity = parseInt(quantityInput.value) || 1;
    const price = window.pendingBuyAction.etf.cmp;
    const newTotalAmount = price * newQuantity;
    const availableAmount = budgetManager.getAvailableAmount();
    
    // Update total amount display
    totalAmountElement.textContent = Utils.formatCurrency(newTotalAmount);
    
    // Update pending action with new quantity
    window.pendingBuyAction.quantity = newQuantity;
    window.pendingBuyAction.amount = newTotalAmount;
    
    // Show/hide budget warning
    if (newTotalAmount > availableAmount) {
        if (budgetWarning) {
            budgetWarning.style.display = 'block';
            budgetWarning.innerHTML = `<span>⚠️ Insufficient budget! Available: ${Utils.formatCurrency(availableAmount)}, Required: ${Utils.formatCurrency(newTotalAmount)}</span>`;
        }
    } else {
        if (budgetWarning) {
            budgetWarning.style.display = 'none';
        }
    }
}

/**
 * Confirm and execute buy action
 */
async function confirmBuyAction() {
    if (!window.pendingBuyAction) {
        Utils.showNotification('No pending buy action found', 'error');
        return;
    }
    
    const buyAction = window.pendingBuyAction;
    
    // Check if user has sufficient budget for current quantity
    const availableAmount = budgetManager.getAvailableAmount();
    if (buyAction.amount > availableAmount) {
        Utils.showNotification(`Insufficient budget! Available: ${Utils.formatCurrency(availableAmount)}, Required: ${Utils.formatCurrency(buyAction.amount)}`, 'error');
        return;
    }
    
    try {
        // Show loading state
        const confirmBtn = document.querySelector('#buy-confirmation-overlay .btn-primary');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'Executing...';
        confirmBtn.disabled = true;
        
        // Execute the buy action
        if (window.app && window.app.tradingStrategy) {
            const result = await window.app.tradingStrategy.executeBuyAction(buyAction);
            
            if (result.success) {
                Utils.showNotification(`Successfully purchased ${result.quantity} units of ${buyAction.etf.name} for ${Utils.formatCurrency(result.amount)}`, 'success');
                
                // Refresh data
                await window.app.loadHoldingsData();
                await window.app.loadDashboardData();
                
                // Close dialog
                closeBuyConfirmation();
            } else {
                throw new Error('Purchase failed');
            }
        } else {
            throw new Error('Trading strategy not available');
        }
        
    } catch (error) {
        console.error('Error executing buy action:', error);
        Utils.showNotification('Failed to execute purchase: ' + error.message, 'error');
        
        // Reset button
        const confirmBtn = document.querySelector('#buy-confirmation-overlay .btn-primary');
        confirmBtn.textContent = 'Confirm Purchase';
        confirmBtn.disabled = false;
    }
}

// ==================== ETF SELECTION FUNCTIONS ====================

/**
 * Select an ETF option from the available choices
 * @param {number} optionIndex - Index of the selected option
 */
function selectETFOption(optionIndex) {
    if (!window.pendingBuyOptions || !window.pendingBuyOptions.options) return;
    
    const options = window.pendingBuyOptions.options;
    if (optionIndex < 0 || optionIndex >= options.length) return;
    
    // Update selected option
    window.selectedETFOption = options[optionIndex];
    
    // Update UI - highlight selected row
    const optionRows = document.querySelectorAll('.etf-option-row');
    optionRows.forEach((row, index) => {
        if (index === optionIndex) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });
    
    // Make sure the radio button is checked
    const radioButton = document.getElementById(`etf-radio-${optionIndex}`);
    if (radioButton) {
        radioButton.checked = true;
    }
    
    console.log('Selected ETF option:', window.selectedETFOption);
}

/**
 * Proceed with the selected ETF option
 */
function proceedWithSelectedETF() {
    if (!window.selectedETFOption) {
        Utils.showNotification('Please select an ETF option first', 'error');
        return;
    }
    
    // Show the buy confirmation dialog with the selected ETF
    if (window.app && window.app.tradingStrategy) {
        window.app.tradingStrategy.showBuyConfirmation(window.selectedETFOption);
    }
    
    // Hide the options container
    const optionsContainer = document.getElementById('etf-options-container');
    if (optionsContainer) {
        optionsContainer.style.display = 'none';
    }
}

/**
 * Cancel ETF selection
 */
function cancelETFSelection() {
    // Clear pending options
    window.pendingBuyOptions = null;
    window.selectedETFOption = null;
    
    // Hide the options container
    const optionsContainer = document.getElementById('etf-options-container');
    if (optionsContainer) {
        optionsContainer.style.display = 'none';
    }
    
    Utils.showNotification('ETF selection cancelled', 'info');
}

// ==================== EVENT LISTENERS ====================

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create global app instance
    window.app = new ETFTradingApp();
    
    // Setup form event listeners
    setupFormEventListeners();
    
    // Make app available globally for debugging
    if (typeof window !== 'undefined') {
        window.ETFTradingApp = ETFTradingApp;
    }
});

/**
 * Setup form event listeners
 */
function setupFormEventListeners() {
    // ETF Form
    const etfForm = document.getElementById('etf-form');
    if (etfForm) {
        etfForm.addEventListener('submit', (e) => {
            if (window.app) window.app.handleETFForm(e);
        });
    }

    // Buy Form
    const buyForm = document.getElementById('buy-form');
    if (buyForm) {
        buyForm.addEventListener('submit', (e) => {
            if (window.app) window.app.handleBuyForm(e);
        });
    }

    // Budget Form
    const budgetForm = document.getElementById('budget-form');
    if (budgetForm) {
        budgetForm.addEventListener('submit', (e) => {
            if (window.app) window.app.handleBudgetForm(e);
        });
    }

    // Top-up Form
    const topupForm = document.getElementById('topup-form');
    if (topupForm) {
        topupForm.addEventListener('submit', handleTopupForm);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create app instance but don't initialize until authenticated
    window.app = new ETFTradingApp();
    
    // The config.js will handle authentication and call app.initializeWithAuth
    // when user is authenticated
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ETFTradingApp;
}