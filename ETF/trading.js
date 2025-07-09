/**
 * Trading Strategy Module
 * Implements ETF trading strategy logic and execution
 */

class TradingStrategy {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.config = {
            maxRankToConsider: 5,
            averagingLossThreshold: -2.5,
            profitThreshold: 6.0,
            defaultQuantity: 1
        };
    }

    // ==================== MAIN STRATEGY EXECUTION ====================

    /**
     * Calculate and execute daily trading strategy
     */
    async calculateDailyStrategy() {
        try {
            console.log('Starting daily strategy calculation...');
            
            // Step 1: Calculate and update rankings
            const rankedETFs = await this.calculateRankings();
            
            // Step 2: Get current holdings
            const holdings = await this.getCurrentHoldings();
            
            // Step 3: Apply trading logic
            const actions = await this.applyTradingLogic(rankedETFs, holdings);
            
            // Step 4: Execute actions
            const results = await this.executeActions(actions);
            
            console.log('Strategy calculation completed:', results);
            return results;
            
        } catch (error) {
            console.error('Error in strategy calculation:', error);
            throw error;
        }
    }

    // ==================== RANKING SYSTEM ====================

    /**
     * Calculate deviations and rank ETFs
     */
    async calculateRankings() {
        if (!this.supabase) {
            throw new Error('Database connection not available');
        }

        const { data: etfs, error } = await this.supabase
            .from('etfs')
            .select('*')
            .order('name');

        if (error) throw error;

        // Calculate deviations for each ETF
        const etfsWithDeviations = etfs.map(etf => {
            const deviation = Utils.calculateDeviation(etf.cmp, etf.dma_20);
            return { ...etf, deviation };
        });

        // Sort by deviation (lowest first = most undervalued = rank 1)
        const rankedETFs = etfsWithDeviations.sort((a, b) => a.deviation - b.deviation);

        // Update rankings in database
        await this.updateRankingsInDatabase(rankedETFs);

        // Cache rankings for later use
        this.currentRankings = rankedETFs.map((etf, index) => ({
            etf_id: etf.id,
            rank: index + 1,
            deviation: etf.deviation,
            etf: etf
        }));

        console.log('Rankings updated:', rankedETFs.map((etf, index) => ({
            rank: index + 1,
            name: etf.name,
            deviation: etf.deviation.toFixed(2) + '%'
        })));

        return rankedETFs;
    }

    /**
     * Update rankings in database
     * @param {Array} rankedETFs - Array of ranked ETFs
     */
    async updateRankingsInDatabase(rankedETFs) {
        const today = Utils.getTodayString();

        // Delete existing ranks for today
        await this.supabase
            .from('ranks')
            .delete()
            .eq('date', today);

        // Insert new rankings
        const rankData = rankedETFs.map((etf, index) => ({
            etf_id: etf.id,
            deviation: etf.deviation,
            rank: index + 1,
            date: today
        }));

        const { error } = await this.supabase
            .from('ranks')
            .insert(rankData);

        if (error) throw error;
    }

    // ==================== TRADING LOGIC ====================

    /**
     * Apply trading logic based on current market conditions
     * @param {Array} rankedETFs - Ranked ETFs array
     * @param {Array} holdings - Current holdings array
     */
    async applyTradingLogic(rankedETFs, holdings) {
        const actions = {
            buy: null,
            sell: null,
            summary: ''
        };

        // Get list of ETFs we currently hold
        const heldETFIds = holdings.map(h => h.etf_id);
        
        // BUYING LOGIC
        actions.buy = await this.determineBuyAction(rankedETFs, heldETFIds, holdings);
        
        // SELLING LOGIC
        actions.sell = await this.determineSellAction(holdings);
        
        // Create summary
        let buyAction = 'No buy';
        if (actions.buy) {
            if (actions.buy.type === 'MULTIPLE_OPTIONS') {
                buyAction = `${actions.buy.options.length} BUY OPTIONS available`;
            } else if (actions.buy.etf && actions.buy.etf.name) {
                buyAction = `${actions.buy.type}: ${actions.buy.etf.name}`;
            } else {
                buyAction = `${actions.buy.type}: ETF action`;
            }
        }
        
        const sellAction = actions.sell ? `SELL: ${actions.sell.holding.etfs.name}` : 'No sell';
        actions.summary = `${buyAction} | ${sellAction}`;
        
        return actions;
    }

    /**
     * Determine what to buy based on strategy rules
     * @param {Array} rankedETFs - Ranked ETFs
     * @param {Array} heldETFIds - Currently held ETF IDs
     * @param {Array} holdings - Current holdings
     */
    async determineBuyAction(rankedETFs, heldETFIds, holdings) {
        // Rule 1: Get all eligible top 5 ranked ETFs that are not held
        const eligibleETFs = [];
        for (let i = 0; i < Math.min(this.config.maxRankToConsider, rankedETFs.length); i++) {
            const etf = rankedETFs[i];
            
            if (!heldETFIds.includes(etf.id)) {
                const recommendedQuantity = this.calculateRecommendedQuantity(etf.cmp);
                eligibleETFs.push({
                    type: 'BUY',
                    etf: etf,
                    reason: `Rank ${i + 1} ETF not held (${etf.deviation.toFixed(2)}% deviation)`,
                    quantity: recommendedQuantity,
                    rank: i + 1
                });
            }
        }
        
        // Return multiple options if available
        if (eligibleETFs.length > 0) {
            return {
                type: 'MULTIPLE_OPTIONS',
                options: eligibleETFs,
                defaultOption: eligibleETFs[0], // First eligible ETF (highest rank)
                reason: `${eligibleETFs.length} eligible ETFs available for purchase`
            };
        }
        
        // Rule 2: If all top 5 are held, check for averaging opportunities
        for (const holding of holdings) {
            const etf = rankedETFs.find(e => e.id === holding.etf_id);
            if (!etf) continue;
            
            const currentPrice = etf.cmp;
            const lossPercent = Utils.calculatePercentageChange(holding.buy_price, currentPrice);
            
            if (lossPercent <= this.config.averagingLossThreshold) {
                const recommendedQuantity = this.calculateRecommendedQuantity(etf.cmp);
                return {
                    type: 'AVERAGE',
                    etf: etf,
                    reason: `${lossPercent.toFixed(2)}% loss - averaging down`,
                    quantity: recommendedQuantity
                };
            }
        }
        
        // No buying action needed
        return null;
    }

    /**
     * Calculate recommended quantity based on daily investment budget
     * @param {number} price - Current price of the ETF
     * @returns {number} Recommended quantity to buy
     */
    calculateRecommendedQuantity(price) {
        // Get daily investment amount from budget manager
        const dailyAmount = budgetManager.getDailyAmount();
        
        // If no budget is set, use default quantity
        if (!dailyAmount || dailyAmount === 0) {
            return this.config.defaultQuantity;
        }
        
        // Calculate maximum quantity based on daily budget
        const maxQuantity = Math.floor(dailyAmount / price);
        
        // Return at least 1 if price allows, otherwise return calculated quantity
        return Math.max(1, maxQuantity);
    }

    /**
     * Determine what to sell based on LIFO with >6% profit
     * @param {Array} holdings - Current holdings
     */
    async determineSellAction(holdings) {
        // Find all profitable holdings (>6% profit)
        const profitableHoldings = [];
        
        for (const holding of holdings) {
            const currentPrice = holding.etfs.cmp;
            const profitPercent = Utils.calculatePercentageChange(holding.buy_price, currentPrice);
            
            if (profitPercent > this.config.profitThreshold) {
                profitableHoldings.push({
                    ...holding,
                    profitPercent: profitPercent
                });
            }
        }
        
        if (profitableHoldings.length === 0) {
            return null;
        }
        
        // Sort by date purchased (LIFO - Last In First Out)
        profitableHoldings.sort((a, b) => 
            new Date(b.date_purchased) - new Date(a.date_purchased)
        );
        
        const holdingToSell = profitableHoldings[0];
        
        return {
            type: 'SELL',
            holding: holdingToSell,
            reason: `LIFO with ${holdingToSell.profitPercent.toFixed(2)}% profit`
        };
    }

    // ==================== ACTION EXECUTION ====================

    /**
     * Execute the determined actions (now shows confirmation for buy)
     * @param {Object} actions - Actions to execute
     */
    async executeActions(actions) {
        const results = {
            buyExecuted: false,
            sellExecuted: false,
            errors: [],
            details: {
                buyAmount: 0,
                sellAmount: 0,
                profit: 0
            }
        };
        
        try {
            // Show buy options dialog instead of auto-executing
            if (actions.buy) {
                if (actions.buy.type === 'MULTIPLE_OPTIONS') {
                    this.showBuyOptionsDialog(actions.buy);
                    results.buyExecuted = false; // Not executed yet, waiting for user selection
                    console.log(`📋 Buy options available: ${actions.buy.options.length} eligible ETFs`);
                } else {
                    this.showBuyConfirmation(actions.buy);
                    results.buyExecuted = false; // Not executed yet, waiting for confirmation
                    console.log(`📋 Buy recommendation: ${actions.buy.type} ${actions.buy.etf.name} at ${Utils.formatCurrency(actions.buy.etf.cmp)}`);
                }
            }
            
            // Execute sell action (auto-execute as before)
            if (actions.sell) {
                const sellResult = await this.executeSellAction(actions.sell);
                results.sellExecuted = sellResult.success;
                results.details.sellAmount = sellResult.amount;
                results.details.profit = sellResult.profit;
                
                if (sellResult.success) {
                    console.log(`✅ Executed: SELL ${actions.sell.holding.etfs.name} at ${Utils.formatCurrency(actions.sell.holding.etfs.cmp)}`);
                }
            }
            
        } catch (error) {
            console.error('Error executing actions:', error);
            results.errors.push(error.message);
        }
        
        return {
            ...results,
            actions: actions,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Show buy confirmation dialog
     * @param {Object} buyAction - Buy action details
     */
    showBuyConfirmation(buyAction) {
        const availableAmount = budgetManager.getAvailableAmount();
        const requiredAmount = buyAction.etf.cmp * buyAction.quantity;
        
        // Check budget and adjust quantity if needed
        let finalQuantity = buyAction.quantity;
        let showWarning = false;
        
        const budgetCheck = budgetManager.checkSufficientBudget(requiredAmount);
        if (!budgetCheck.sufficient) {
            const maxQuantity = Math.floor(availableAmount / buyAction.etf.cmp);
            if (maxQuantity > 0) {
                finalQuantity = maxQuantity;
                showWarning = true;
            } else {
                Utils.showNotification(`Insufficient budget. Available: ${Utils.formatCurrency(availableAmount)}, Required: ${Utils.formatCurrency(requiredAmount)}`, 'error');
                return;
            }
        }
        
        const finalAmount = buyAction.etf.cmp * finalQuantity;
        
        // Store the buy action for confirmation
        window.pendingBuyAction = {
            ...buyAction,
            quantity: finalQuantity,
            amount: finalAmount
        };
        
        // Populate dialog fields
        document.getElementById('trade-action-type').textContent = buyAction.type;
        document.getElementById('trade-action-reason').textContent = buyAction.reason;
        document.getElementById('confirm-etf-name').textContent = buyAction.etf.name;
        document.getElementById('confirm-etf-price').textContent = Utils.formatCurrency(buyAction.etf.cmp);
        document.getElementById('confirm-etf-deviation').textContent = buyAction.etf.deviation.toFixed(2) + '%';
        
        // Find rank from current rankings
        const currentRank = this.findETFRankFromRankings(buyAction.etf.id);
        document.getElementById('confirm-etf-rank').textContent = 'Rank ' + (currentRank || 'N/A');
        
        // Set quantity input value
        const quantityInput = document.getElementById('confirm-quantity-input');
        if (quantityInput) {
            quantityInput.value = finalQuantity;
        }
        
        // Show daily budget
        const dailyBudget = budgetManager.getDailyAmount();
        document.getElementById('confirm-daily-budget').textContent = Utils.formatCurrency(dailyBudget);
        
        document.getElementById('confirm-total-amount').textContent = Utils.formatCurrency(finalAmount);
        document.getElementById('confirm-available-budget').textContent = Utils.formatCurrency(availableAmount);
        
        // Show/hide budget warning
        const warningElement = document.getElementById('budget-warning');
        if (showWarning && warningElement) {
            warningElement.style.display = 'block';
        } else if (warningElement) {
            warningElement.style.display = 'none';
        }
        
        // Show the dialog
        const overlay = document.getElementById('buy-confirmation-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    /**
     * Show buy options dialog with top 5 eligible ETFs
     * @param {Object} buyOptions - Buy options with multiple ETFs
     */
    showBuyOptionsDialog(buyOptions) {
        console.log('showBuyOptionsDialog called with:', buyOptions);
        
        // Store the buy options for later use
        window.pendingBuyOptions = buyOptions;
        
        // Show ETF selection dialog on dashboard
        this.displayETFOptions(buyOptions.options, buyOptions.defaultOption);
    }

    /**
     * Display ETF options on dashboard
     * @param {Array} options - Available ETF options
     * @param {Object} defaultOption - Default selected option (rank 1)
     */
    displayETFOptions(options, defaultOption) {
        console.log('displayETFOptions called with', options.length, 'options');
        
        // Find or create the ETF options container
        let optionsContainer = document.getElementById('etf-options-container');
        if (!optionsContainer) {
            // Find the Strategy Summary card (first .card element in dashboard)
            const strategySummaryCard = document.querySelector('#dashboard-page .card');
            console.log('Strategy summary card found:', !!strategySummaryCard);
            
            if (strategySummaryCard) {
                optionsContainer = document.createElement('div');
                optionsContainer.id = 'etf-options-container';
                optionsContainer.className = 'card';
                strategySummaryCard.insertAdjacentElement('afterend', optionsContainer);
                console.log('ETF options container created and inserted');
            } else {
                console.error('Could not find strategy summary card');
            }
        } else {
            console.log('ETF options container already exists');
        }

        if (!optionsContainer) {
            console.error('No options container available');
            return;
        }

        // Build the options HTML as a table
        const optionsHTML = `
            <h2>📊 Available ETF Options</h2>
            <p class="options-description">Select an ETF to purchase from the top-ranked eligible options:</p>
            
            <div class="table-container">
                <table class="etf-options-table">
                    <thead>
                        <tr>
                            <th>Select</th>
                            <th>Rank</th>
                            <th>ETF Name</th>
                            <th>Price</th>
                            <th>Deviation %</th>
                            <th>Quantity</th>
                            <th>Total Amount</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${options.map((option, index) => `
                            <tr class="etf-option-row ${index === 0 ? 'recommended selected' : ''}" 
                                data-option-index="${index}"
                                onclick="selectETFOption(${index})">
                                <td class="select-column">
                                    <input type="radio" 
                                           name="etf-selection" 
                                           id="etf-radio-${index}" 
                                           value="${index}" 
                                           ${index === 0 ? 'checked' : ''}
                                           onchange="selectETFOption(${index})">
                                </td>
                                <td class="rank-column">
                                    <span class="rank-badge ${index === 0 ? 'top-rank' : ''}">
                                        ${option.rank}
                                        ${index === 0 ? '<span class="recommended-text">★</span>' : ''}
                                    </span>
                                </td>
                                <td class="etf-name-column">
                                    <div class="etf-name">${option.etf.name}</div>
                                    ${index === 0 ? '<div class="recommended-badge">Recommended</div>' : ''}
                                </td>
                                <td class="price-column">${Utils.formatCurrency(option.etf.cmp)}</td>
                                <td class="deviation-column">
                                    <span class="deviation-value">${option.etf.deviation.toFixed(2)}%</span>
                                </td>
                                <td class="quantity-column">
                                    <span class="quantity-value">${option.quantity}</span>
                                </td>
                                <td class="total-column">
                                    <span class="total-amount">${Utils.formatCurrency(option.etf.cmp * option.quantity)}</span>
                                </td>
                                <td class="reason-column">
                                    <div class="reason-text">${option.reason}</div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="etf-options-actions">
                <button onclick="proceedWithSelectedETF()" class="btn-primary" id="proceed-etf-btn">
                    Proceed with Selected ETF
                </button>
                <button onclick="cancelETFSelection()" class="btn-secondary">
                    Cancel
                </button>
            </div>
        `;

        optionsContainer.innerHTML = optionsHTML;
        console.log('ETF options HTML set, container visible:', optionsContainer.style.display !== 'none');
        
        // Store the currently selected option (default is first one)
        window.selectedETFOption = defaultOption;
        
        // Make sure container is visible
        optionsContainer.style.display = 'block';
        
        // Scroll to the options
        optionsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('ETF options should now be visible');
    }

    /**
     * Execute buy action
     * @param {Object} buyAction - Buy action details
     */
    async executeBuyAction(buyAction) {
        const availableAmount = budgetManager.getAvailableAmount();
        const requiredAmount = buyAction.etf.cmp * buyAction.quantity;
        
        // Check budget availability
        const budgetCheck = budgetManager.checkSufficientBudget(requiredAmount);
        if (!budgetCheck.sufficient) {
            // Try to buy with available amount
            const maxQuantity = Math.floor(availableAmount / buyAction.etf.cmp);
            if (maxQuantity > 0) {
                buyAction.quantity = maxQuantity;
            } else {
                throw new Error(`Insufficient budget. Available: ${Utils.formatCurrency(availableAmount)}, Required: ${Utils.formatCurrency(requiredAmount)}`);
            }
        }
        
        const finalAmount = buyAction.etf.cmp * buyAction.quantity;
        
        // Execute the purchase
        const { error } = await this.supabase
            .from('holdings')
            .insert({
                etf_id: buyAction.etf.id,
                buy_price: buyAction.etf.cmp,
                quantity: buyAction.quantity,
                date_purchased: Utils.getTodayString(),
                active: true
            });
            
        if (error) throw error;
        
        // Update budget
        budgetManager.recordInvestment(finalAmount);
        
        return {
            success: true,
            amount: finalAmount,
            quantity: buyAction.quantity
        };
    }

    /**
     * Execute sell action
     * @param {Object} sellAction - Sell action details
     */
    async executeSellAction(sellAction) {
        const holding = sellAction.holding;
        const sellPrice = holding.etfs.cmp;
        const sellAmount = sellPrice * holding.quantity;
        const buyAmount = holding.buy_price * holding.quantity;
        const profit = sellAmount - buyAmount;
        
        // Calculate holding period and profit allocation
        const buyDate = new Date(holding.date_purchased);
        const sellDate = new Date();
        const holdingPeriod = Utils.daysBetween(buyDate, sellDate);
        
        // Update holding as sold
        const { error } = await this.supabase
            .from('holdings')
            .update({
                active: false,
                sell_price: sellPrice,
                date_sold: Utils.getTodayString()
            })
            .eq('id', holding.id);
            
        if (error) throw error;
        
        // Handle profit allocation if profitable
        let profitAllocation = null;
        if (profit > 0) {
            profitAllocation = budgetManager.calculateProfitAllocation(profit, holdingPeriod);
            budgetManager.addProfitToReinvestment(profitAllocation);
        }
        
        return {
            success: true,
            amount: sellAmount,
            profit: profit,
            profitAllocation: profitAllocation,
            holdingPeriod: holdingPeriod
        };
    }

    // ==================== DATA RETRIEVAL ====================

    /**
     * Get current active holdings
     */
    async getCurrentHoldings() {
        if (!this.supabase) {
            throw new Error('Database connection not available');
        }

        const { data: holdings, error } = await this.supabase
            .from('holdings')
            .select(`
                *,
                etfs (name, cmp)
            `)
            .eq('active', true);

        if (error) throw error;
        return holdings || [];
    }

    /**
     * Get today's rankings
     */
    async getTodayRankings() {
        if (!this.supabase) {
            throw new Error('Database connection not available');
        }

        const today = Utils.getTodayString();
        
        const { data: rankings, error } = await this.supabase
            .from('ranks')
            .select(`
                *,
                etfs (name, cmp, dma_20)
            `)
            .eq('date', today)
            .order('rank');
            
        if (error) throw error;
        return rankings || [];
    }

    /**
     * Find ETF rank from current rankings (cached)
     * @param {string} etfId - ETF ID to find rank for
     */
    findETFRankFromRankings(etfId) {
        if (!this.currentRankings) return null;
        
        const ranking = this.currentRankings.find(r => r.etf_id === etfId);
        return ranking ? ranking.rank : null;
    }

    // ==================== PORTFOLIO ANALYSIS ====================

    /**
     * Get comprehensive portfolio statistics
     */
    async getPortfolioStats() {
        try {
            const holdings = await this.getCurrentHoldings();
            const soldHoldings = await this.getSoldHoldings();
            
            let totalInvestment = 0;
            let currentValue = 0;
            let totalPL = 0;
            
            // Calculate active holdings value
            holdings.forEach(holding => {
                const investment = holding.buy_price * holding.quantity;
                const current = holding.etfs.cmp * holding.quantity;
                
                totalInvestment += investment;
                currentValue += current;
                totalPL += (current - investment);
            });
            
            // Calculate realized P&L from sold holdings
            let realizedPL = 0;
            let totalTaxPaid = 0;
            let stcgTax = 0;
            let ltcgTax = 0;
            
            soldHoldings.forEach(holding => {
                const buyValue = holding.buy_price * holding.quantity;
                const sellValue = holding.sell_price * holding.quantity;
                const profit = sellValue - buyValue;
                realizedPL += profit;
                
                if (profit > 0) {
                    const buyDate = new Date(holding.date_purchased);
                    const sellDate = new Date(holding.date_sold);
                    const holdingPeriod = Utils.daysBetween(buyDate, sellDate);
                    const profitAllocation = budgetManager.calculateProfitAllocation(profit, holdingPeriod);
                    
                    if (profitAllocation) {
                        totalTaxPaid += profitAllocation.taxAmount;
                        if (profitAllocation.taxType === 'STCG') {
                            stcgTax += profitAllocation.taxAmount;
                        } else {
                            ltcgTax += profitAllocation.taxAmount;
                        }
                    }
                }
            });
            
            return {
                // Active holdings
                activeHoldings: holdings.length,
                totalInvestment: totalInvestment,
                currentValue: currentValue,
                unrealizedPL: totalPL,
                unrealizedPLPercent: totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0,
                
                // Sold holdings
                soldHoldings: soldHoldings.length,
                realizedPL: realizedPL,
                
                // Tax information
                totalTaxPaid: totalTaxPaid,
                stcgTax: stcgTax,
                ltcgTax: ltcgTax,
                
                // Overall
                totalPL: totalPL + realizedPL,
                netProfit: realizedPL - totalTaxPaid
            };
            
        } catch (error) {
            console.error('Error calculating portfolio stats:', error);
            return null;
        }
    }

    /**
     * Get sold holdings
     */
    async getSoldHoldings() {
        if (!this.supabase) return [];

        const { data: soldHoldings, error } = await this.supabase
            .from('holdings')
            .select(`
                *,
                etfs (name)
            `)
            .eq('active', false)
            .order('date_sold', { ascending: false });

        if (error) {
            console.error('Error getting sold holdings:', error);
            return [];
        }
        
        return soldHoldings || [];
    }

    // ==================== RECOMMENDATIONS ====================

    /**
     * Get top ETF recommendations based on current rankings
     */
    async getRecommendations() {
        try {
            const rankings = await this.getTodayRankings();
            const holdings = await this.getCurrentHoldings();
            const heldETFIds = holdings.map(h => h.etf_id);
            
            const recommendations = rankings.slice(0, 5).map(rank => {
                const isHeld = heldETFIds.includes(rank.etf_id);
                let recommendation = 'HOLD';
                let priority = 'LOW';
                
                if (!isHeld && rank.rank <= 3) {
                    recommendation = 'BUY';
                    priority = rank.rank === 1 ? 'HIGH' : 'MEDIUM';
                } else if (rank.deviation > 5) {
                    recommendation = 'AVOID';
                    priority = 'LOW';
                }
                
                return {
                    rank: rank.rank,
                    name: rank.etfs.name,
                    cmp: rank.etfs.cmp,
                    dma_20: rank.etfs.dma_20,
                    deviation: rank.deviation,
                    recommendation: recommendation,
                    priority: priority,
                    isHeld: isHeld,
                    reason: this.getRecommendationReason(rank, isHeld)
                };
            });
            
            return recommendations;
            
        } catch (error) {
            console.error('Error getting recommendations:', error);
            return [];
        }
    }

    /**
     * Get recommendation reason
     * @param {Object} rank - Ranking data
     * @param {boolean} isHeld - Whether ETF is held
     */
    getRecommendationReason(rank, isHeld) {
        if (isHeld) {
            return 'Already in portfolio';
        }
        
        if (rank.deviation < -5) {
            return 'Significantly undervalued';
        } else if (rank.deviation < 0) {
            return 'Trading below 20 DMA';
        } else if (rank.deviation > 5) {
            return 'Overvalued - avoid';
        } else {
            return 'Near fair value';
        }
    }

    // ==================== MARKET TIMING ====================

    /**
     * Check if it's appropriate time to run strategy
     */
    isStrategyTime() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Only on weekdays (Monday to Friday)
        if (day === 0 || day === 6) {
            return {
                canRun: false,
                reason: 'Market closed - Weekend'
            };
        }
        
        // After 2:30 PM (14:30)
        const isAfterCutoff = (hour > 14) || (hour === 14 && minute >= 30);
        
        return {
            canRun: isAfterCutoff,
            reason: isAfterCutoff ? 'Good time to run strategy' : 'Wait until after 2:30 PM'
        };
    }

    // ==================== CONFIGURATION ====================

    /**
     * Update strategy configuration
     * @param {Object} newConfig - New configuration object
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Strategy configuration updated:', this.config);
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    // ==================== VALIDATION ====================

    /**
     * Validate ETF data before processing
     * @param {Array} etfs - ETF data array
     */
    validateETFData(etfs) {
        const errors = [];
        
        etfs.forEach((etf, index) => {
            if (!Utils.isValidETFName(etf.name)) {
                errors.push(`ETF ${index + 1}: Name is required`);
            }
            
            if (!Utils.isPositiveNumber(etf.cmp)) {
                errors.push(`ETF ${etf.name}: CMP must be greater than 0`);
            }
            
            if (!Utils.isPositiveNumber(etf.dma_20)) {
                errors.push(`ETF ${etf.name}: 20 DMA must be greater than 0`);
            }
        });
        
        return errors;
    }

    // ==================== TRANSACTION HISTORY ====================

    /**
     * Get complete transaction history
     */
    async getTransactionHistory() {
        try {
            const holdings = await this.supabase
                .from('holdings')
                .select('*, etfs (name)')
                .order('date_purchased', { ascending: false });

            if (holdings.error) throw holdings.error;

            const transactions = [];

            holdings.data.forEach(holding => {
                // Buy transaction
                transactions.push({
                    id: holding.id + '_buy',
                    date: holding.date_purchased,
                    type: 'BUY',
                    etf_name: holding.etfs.name,
                    quantity: holding.quantity,
                    price: holding.buy_price,
                    amount: holding.buy_price * holding.quantity,
                    pl: 0,
                    holding_period: 0,
                    tax_type: '',
                    tax_amount: 0,
                    brokerage: 0,
                    net_amount: holding.buy_price * holding.quantity
                });

                // Sell transaction if sold
                if (!holding.active && holding.sell_price) {
                    const buyDate = new Date(holding.date_purchased);
                    const sellDate = new Date(holding.date_sold);
                    const holdingPeriod = Utils.daysBetween(buyDate, sellDate);
                    
                    const buyAmount = holding.buy_price * holding.quantity;
                    const sellAmount = holding.sell_price * holding.quantity;
                    const profit = sellAmount - buyAmount;
                    
                    const profitAllocation = budgetManager.calculateProfitAllocation(profit, holdingPeriod);

                    transactions.push({
                        id: holding.id + '_sell',
                        date: holding.date_sold,
                        type: 'SELL',
                        etf_name: holding.etfs.name,
                        quantity: holding.quantity,
                        price: holding.sell_price,
                        amount: sellAmount,
                        pl: profit,
                        holding_period: holdingPeriod,
                        tax_type: profitAllocation ? profitAllocation.taxType : '',
                        tax_amount: profitAllocation ? profitAllocation.taxAmount : 0,
                        brokerage: profitAllocation ? profitAllocation.brokerageAmount : 0,
                        net_amount: profitAllocation ? profitAllocation.netAmount + buyAmount : sellAmount
                    });
                }
            });

            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        } catch (error) {
            console.error('Error getting transaction history:', error);
            return [];
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TradingStrategy = TradingStrategy;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradingStrategy;
}