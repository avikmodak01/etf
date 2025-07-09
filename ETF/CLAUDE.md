# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a client-side ETF (Exchange-Traded Fund) trading strategy application built with vanilla JavaScript, HTML, and CSS. The application implements a systematic trading strategy based on ETF rankings, moving averages, and profit/loss management. It uses Supabase as the backend database for storing ETF data, holdings, and transaction history.

## Architecture

### Core Components

1. **ETFTradingApp** (`app.js`) - Main application controller that coordinates all modules
2. **Utils** (`utils.js`) - Utility functions for formatting, validation, DOM manipulation, and data processing
3. **BudgetManager** (`budget.js`) - Handles budget configuration, tracking, and profit reinvestment
4. **TradingStrategy** (`trading.js`) - Implements the core trading logic and strategy execution

### Data Flow

- **ETF Data**: Stored in Supabase `etfs` table with columns: id, name, cmp (current market price), dma_20 (20-day moving average), date_updated
- **Holdings**: Stored in `holdings` table with buy/sell prices, quantities, dates, and active status
- **Rankings**: Stored in `ranks` table with daily ETF rankings based on deviation from moving averages
- **Budget Configuration**: Stored in Supabase `budget_config` table for cross-device persistence
- **Supabase Credentials**: Stored in localStorage (device-specific)

### Trading Strategy Logic

The application implements a systematic ETF trading strategy:

1. **Ranking System**: ETFs are ranked daily based on deviation from 20-day moving average (lowest deviation = rank 1)
2. **Buy Logic**: 
   - Purchase top 5 ranked ETFs not currently held
   - If all top 5 are held, average down on positions with >2.5% loss
3. **Sell Logic**: LIFO (Last In, First Out) with >6% profit threshold
4. **Profit Allocation**: 80% reinvested, 15% STCG tax (≤1 year), 12.5% LTCG tax (>1 year), 5% brokerage

## Development Commands

This is a client-side application with no build process. To develop:

1. **Local Development**: 
   - Open `index.html` in a web browser
   - Use browser developer tools for debugging
   - Use VS Code Live Server extension for auto-reload

2. **Testing**: 
   - No formal test framework - manual testing through browser
   - Use browser console for debugging strategy calculations
   - Test CSV upload functionality with sample NSE ETF data

3. **Deployment**: 
   - Deploy static files to any web server
   - Ensure Supabase credentials are properly configured
   - Files needed: `index.html`, `styles.css`, `app.js`, `utils.js`, `budget.js`, `trading.js`

## Key Features

### ETF Data Management
- Manual ETF entry with CMP and 20-day moving average
- **Advanced CSV Import** from NSE ETF data with configurable filters:
  - **Volume Filter**: Customizable minimum volume threshold (default: 100,000)
  - **Liquid ETF Exclusion**: Automatically excludes ETFs containing "LIQUID" in name
  - **Per-Category Limit**: Import only top N ETFs per underlying asset category (default: top 3)
  - **Real-time Filter Preview**: Shows current filter settings before import
- Automatic ranking calculation based on price deviation

### Trading Automation
- Daily strategy calculation with buy/sell recommendations
- Buy confirmation dialog with detailed trade information and budget validation
- Automatic execution of sell orders based on LIFO with >6% profit
- Portfolio tracking with real-time P&L calculations

### Budget Management
- 50-day investment plan with daily budget allocation
- Profit reinvestment with tax calculations
- Weekend exclusion for trading days

### Data Visualization
- ETF rankings table with deviation percentages
- Holdings portfolio with current values
- Transaction history with tax implications
- Investment calendar for 50-day strategy

## Database Schema

### Core Tables
- `etfs`: ETF master data with prices and moving averages
- `holdings`: Buy/sell transactions with profit tracking
- `ranks`: Daily ETF rankings based on deviation calculations
- `budget_config`: Budget configuration and tracking data

### Table Schemas

#### `budget_config` Table
```sql
CREATE TABLE budget_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    total_budget DECIMAL(15,2) NOT NULL,
    daily_amount DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    used_amount DECIMAL(15,2) DEFAULT 0,
    reinvested_profit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### Key Relationships
- Holdings link to ETFs via `etf_id`
- Rankings link to ETFs via `etf_id` with date-based records
- Budget config uses `user_id` for multi-user support (currently defaults to 'default_user')

## Configuration

### Supabase Setup
- Configure URL and anon key in the Config page
- Ensure database has proper RLS policies for ETF data
- Test connection before using trading features

### Strategy Parameters
- Default configuration in `TradingStrategy` class:
  - `maxRankToConsider`: 5 (top ETFs to consider)
  - `averagingLossThreshold`: -2.5% (loss threshold for averaging)
  - `profitThreshold`: 6.0% (profit threshold for selling)
  - `defaultQuantity`: 1 (fallback if no budget configured)
- Quantity calculation: `floor(dailyBudget / etfPrice)` with minimum of 1 unit

## Common Tasks

### Adding New ETFs
1. Use manual form in ETFs page, or
2. **Configure Import Filters** (Config page):
   - Set minimum volume threshold
   - Choose number of ETFs per category (1-10 or unlimited)
   - Enable/disable liquid ETF exclusion
3. Upload CSV from NSE ETF data (applies configured filters)
4. ETFs are automatically ranked after addition

### Import Filter Examples
- **Conservative**: Volume > 500K, Top 1 per category, Exclude liquid
- **Balanced**: Volume > 100K, Top 3 per category, Exclude liquid (default)
- **Comprehensive**: Volume > 50K, Top 10 per category, Include all

### Running Daily Strategy
1. Click "Calculate Today's Strategy" on Dashboard
2. Review recommended actions in ETF rankings
3. For buy recommendations, a dark-themed confirmation dialog will appear showing:
   - ETF name, current price, deviation percentage, and rank
   - Daily investment budget and available total budget
   - Editable quantity field (calculated from daily budget)
   - Real-time total amount calculation
   - Budget validation with warnings
4. Adjust quantity as needed and confirm or cancel the purchase
5. Sell orders execute automatically based on LIFO with >6% profit

### Managing Budget
1. Set total budget and start date in Budget page
2. Budget is automatically tracked with each trade
3. Profits are reinvested according to 80/15/5 rule
4. **Top-up Budget**: Increase budget mid-strategy while preserving existing investments
   - Minimum top-up amount: ₹1,000
   - Used amount remains unchanged
   - Daily investment recalculated: `newTotalBudget / 50` (always 50 days)
   - Preview changes before confirming

### Viewing Performance
1. Check Holdings page for current portfolio status
2. Review Transactions page for complete trade history
3. Monitor tax implications and profit allocation

## Error Handling

The application includes comprehensive error handling:
- API errors are caught and displayed as user notifications
- Form validation prevents invalid data entry
- Database connection issues are handled gracefully
- CSV parsing errors provide specific feedback

## Security Considerations

- All user inputs are sanitized through `Utils.sanitizeInput()`
- Supabase credentials are stored in localStorage (client-side only)
- No server-side authentication - relies on Supabase RLS
- XSS protection through proper DOM manipulation

## Performance Notes

- Client-side only - no server processing required
- Supabase queries are optimized with proper indexing
- CSV processing includes progress indicators for large files
- LocalStorage used for configuration persistence

## Browser Compatibility

- Modern browsers with ES6+ support required
- Uses Fetch API for HTTP requests
- LocalStorage for data persistence
- No polyfills included - ensure target browser compatibility