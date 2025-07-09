# ETF Trading Strategy Application

A production-ready ETF (Exchange-Traded Fund) trading strategy application built with vanilla JavaScript, HTML, and CSS. The application implements a systematic trading strategy based on ETF rankings, moving averages, and profit/loss management using Supabase as the backend database with full user authentication and multi-user support.

## Features

### 🔐 **Authentication & Security**
- **User Authentication**: Secure login/logout with email verification
- **User Registration**: Account creation with password validation
- **Password Reset**: Secure password recovery via email
- **Multi-User Support**: Each user has isolated data with Row Level Security
- **Session Management**: Automatic token refresh and session persistence

### 📊 **Trading & Analytics**
- **ETF Rankings**: Daily ranking system based on deviation from 20-day moving averages
- **Trading Strategy**: Automated buy/sell recommendations with confirmation dialogs
- **Budget Management**: Cross-device budget tracking with top-up functionality
- **Holdings Portfolio**: Track active positions with profit/loss calculations
- **Transaction History**: Complete audit trail with tax implications (STCG/LTCG)
- **Data Freshness**: CSV upload date tracking and display

### 🛠️ **Data Management**
- **Import Filtering**: Advanced ETF data import with customizable filters
- **Real-time Sync**: Cross-device data synchronization via Supabase
- **Data Validation**: Comprehensive input validation and sanitization
- **Performance Optimization**: Efficient database queries with proper indexing

### 🎨 **User Experience**
- **Dark Theme UI**: Modern, responsive interface with loading screens
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Progressive Enhancement**: Graceful fallbacks for different environments
- **Loading States**: Visual feedback during data processing operations

## 🚀 Production Setup

### Prerequisites

- **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
- **Web Server**: For production deployment (Apache, Nginx, or CDN)
- **SSL Certificate**: Required for production authentication
- **Domain**: For proper authentication redirects

### 1. Database Setup

1. **Create a new Supabase project**
2. **Run the database schema**:
   ```sql
   -- Execute the contents of database-schema.sql in your Supabase SQL editor
   -- This creates all tables, indexes, RLS policies, and triggers
   ```

3. **Configure Authentication**:
   - Go to Authentication > Settings in Supabase dashboard
   - Configure your site URL and redirect URLs
   - Enable email confirmation if desired
   - Set up password requirements

### 2. Environment Configuration

#### For Production Deployment:
1. **Set environment variables in your hosting platform**:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Or update meta tags in index.html**:
   ```html
   <meta name="SUPABASE_URL" content="your_supabase_project_url">
   <meta name="SUPABASE_ANON_KEY" content="your_supabase_anon_key">
   ```

#### For Development:
1. **Store in localStorage** (automatically used in development):
   ```javascript
   localStorage.setItem('supabase-url', 'your_supabase_project_url');
   localStorage.setItem('supabase-anon-key', 'your_supabase_anon_key');
   ```

### 3. Deployment

1. **Build and Deploy**:
   ```bash
   # Upload all files to your web server
   # Ensure HTTPS is configured
   # Set proper cache headers for static assets
   ```

2. **Configure your web server**:
   ```nginx
   # Example Nginx configuration
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           root /path/to/app;
           index index.html;
           try_files $uri $uri/ /index.html;
       }
       
       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

### 4. User Onboarding

1. **Create your admin account**:
   - Visit your deployed application
   - Register with your admin email
   - Verify email if email confirmation is enabled

2. **Import ETF data**:
   - Use the Config page to upload your first CSV file
   - Configure import filters as needed
   - Data will be shared across all users

3. **Set up your trading strategy**:
   - Go to Budget page and configure your investment budget
   - Calculate your first strategy on the Dashboard
   - Start making informed trading decisions!

## 🛠️ Development Setup

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd etf-trading-strategy
   ```

2. **Start local server**:
   ```bash
   # Option 1: Python
   python -m http.server 8000
   
   # Option 2: Node.js
   npx http-server -p 8000
   
   # Option 3: PHP
   php -S localhost:8000
   ```

3. **Configure for development**:
   - Open browser to http://localhost:8000
   - Configure Supabase credentials in localStorage (see above)
   - The app will automatically detect development mode

### Testing

1. **Create test users**:
   - Register multiple accounts to test user isolation
   - Verify that each user sees only their own data

2. **Test authentication flows**:
   - Login/logout
   - Registration
   - Password reset
   - Session persistence

3. **Test trading features**:
   - CSV import
   - Strategy calculation
   - Budget management
   - Holdings tracking

## Database Setup

Create these tables in your Supabase database:

### Core Tables

```sql
-- ETF master data
CREATE TABLE etfs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    cmp DECIMAL(10,2) NOT NULL,
    dma_20 DECIMAL(10,2) NOT NULL,
    underlying_asset TEXT,
    volume BIGINT,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Active holdings
CREATE TABLE holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etf_id UUID REFERENCES etfs(id),
    buy_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    buy_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    sell_price DECIMAL(10,2),
    sell_date TIMESTAMP WITH TIME ZONE,
    profit_loss DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    tax_type TEXT,
    days_held INTEGER
);

-- Daily ETF rankings
CREATE TABLE ranks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etf_id UUID REFERENCES etfs(id),
    rank INTEGER NOT NULL,
    deviation_percent DECIMAL(5,2) NOT NULL,
    rank_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Budget configuration
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

### Important Notes

**Budget Data Storage**: Budget configuration is now stored **exclusively in Supabase**. The application automatically cleans up any legacy localStorage budget data on startup. This ensures:
- ✅ **Cross-device synchronization** 
- ✅ **No data conflicts** between localStorage and Supabase
- ✅ **Single source of truth** for budget configuration

### Indexes for Performance

```sql
CREATE INDEX idx_etfs_name ON etfs(name);
CREATE INDEX idx_holdings_etf_active ON holdings(etf_id, active);
CREATE INDEX idx_ranks_date_rank ON ranks(rank_date, rank);
CREATE INDEX idx_budget_user_id ON budget_config(user_id);
```

## Data Management

### 🗑️ Clean Up All Data

**⚠️ WARNING: These queries will permanently delete ALL data from your Supabase database. Use with extreme caution!**

```sql
-- Delete all data from all tables (preserves table structure)
DELETE FROM ranks;
DELETE FROM holdings;
DELETE FROM budget_config;
DELETE FROM etfs;

-- Reset any sequences if needed
-- (UUID primary keys don't need sequence reset)

-- Verify all tables are empty
SELECT 'etfs' as table_name, COUNT(*) as record_count FROM etfs
UNION ALL
SELECT 'holdings' as table_name, COUNT(*) as record_count FROM holdings
UNION ALL
SELECT 'ranks' as table_name, COUNT(*) as record_count FROM ranks
UNION ALL
SELECT 'budget_config' as table_name, COUNT(*) as record_count FROM budget_config;
```

### 🔄 Reset Specific Data Types

```sql
-- Reset only trading data (keep ETF master data and budget)
DELETE FROM ranks;
DELETE FROM holdings;

-- Reset only budget configuration
DELETE FROM budget_config;

-- Reset only ETF data (will cascade to rankings and holdings)
DELETE FROM ranks;
DELETE FROM holdings;
DELETE FROM etfs;

-- Reset only historical rankings (keep current holdings)
DELETE FROM ranks WHERE rank_date < CURRENT_DATE;
```

### 📊 Data Cleanup with Conditions

```sql
-- Delete old transactions (older than 1 year)
DELETE FROM holdings 
WHERE buy_date < NOW() - INTERVAL '1 year';

-- Delete old rankings (keep last 30 days)
DELETE FROM ranks 
WHERE rank_date < CURRENT_DATE - INTERVAL '30 days';

-- Delete test/sample data (if ETF names contain 'TEST' or 'SAMPLE')
DELETE FROM holdings 
WHERE etf_id IN (
    SELECT id FROM etfs 
    WHERE name ILIKE '%TEST%' OR name ILIKE '%SAMPLE%'
);

DELETE FROM ranks 
WHERE etf_id IN (
    SELECT id FROM etfs 
    WHERE name ILIKE '%TEST%' OR name ILIKE '%SAMPLE%'
);

DELETE FROM etfs 
WHERE name ILIKE '%TEST%' OR name ILIKE '%SAMPLE%';
```

### 🔍 Verify Data Deletion

```sql
-- Check record counts after cleanup
SELECT 
    'etfs' as table_name, 
    COUNT(*) as records,
    COALESCE(MAX(date_updated), 'No records') as last_updated
FROM etfs
UNION ALL
SELECT 
    'holdings' as table_name, 
    COUNT(*) as records,
    COALESCE(MAX(buy_date)::TEXT, 'No records') as last_updated
FROM holdings
UNION ALL
SELECT 
    'ranks' as table_name, 
    COUNT(*) as records,
    COALESCE(MAX(rank_date)::TEXT, 'No records') as last_updated
FROM ranks
UNION ALL
SELECT 
    'budget_config' as table_name, 
    COUNT(*) as records,
    COALESCE(MAX(updated_at)::TEXT, 'No records') as last_updated
FROM budget_config;
```

## Configuration

### Import Filters
- **Volume Filter**: Minimum trading volume threshold
- **Category Limits**: Max ETFs per underlying asset category
- **Liquid ETF Exclusion**: Skip ETFs containing "LIQUID" in name

### Trading Parameters
- **Ranking Logic**: Based on deviation from 20-day moving average
- **Buy Strategy**: Top 5 ranked ETFs or averaging down on >2.5% loss
- **Sell Strategy**: LIFO with >6% profit threshold
- **Profit Allocation**: 80% reinvested, 15% STCG, 12.5% LTCG, 5% brokerage

### Budget Management
- **50-Day Strategy**: Total budget divided into 50 daily investments
- **Cross-Device Sync**: Budget data stored in Supabase for persistence
- **Top-up Support**: Increase budget mid-strategy while preserving existing investments
- **Daily Calculation**: Always `totalBudget / 50` regardless of remaining days

## File Structure

```
ETF/
├── index.html          # Main application interface
├── app.js             # Main application controller
├── budget.js          # Budget management module
├── trading.js         # Trading strategy implementation
├── utils.js           # Utility functions
├── import-filters.js  # ETF import filtering system
├── styles.css         # Application styling
├── CLAUDE.md         # Development guidance
└── README.md         # This file
```

## Security Notes

- All user inputs are sanitized through `Utils.sanitizeInput()`
- Supabase credentials stored in localStorage (client-side only)
- No server-side authentication - relies on Supabase RLS
- XSS protection through proper DOM manipulation

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- LocalStorage and Fetch API required

## Support

For development guidance, see `CLAUDE.md` file which contains detailed information about:
- Architecture and data flow
- Trading strategy logic
- Database schemas
- Common development tasks
- Performance considerations

---

**⚠️ Disclaimer**: This is a simulation tool for educational purposes. Always consult with financial advisors before making real investment decisions.