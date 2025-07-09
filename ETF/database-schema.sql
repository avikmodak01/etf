-- ==================== ETF Trading Strategy Database Schema ====================
-- Production-ready schema with Row Level Security (RLS) for multi-user support

-- Enable Row Level Security on all tables
-- This ensures users can only access their own data

-- ==================== TABLES ====================

-- ETF master data (shared among all users)
CREATE TABLE IF NOT EXISTS etfs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    cmp DECIMAL(10,2) NOT NULL,
    dma_20 DECIMAL(10,2) NOT NULL,
    underlying_asset TEXT,
    volume BIGINT,
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User-specific holdings
CREATE TABLE IF NOT EXISTS holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    etf_id UUID NOT NULL REFERENCES etfs(id) ON DELETE CASCADE,
    buy_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    buy_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    sell_price DECIMAL(10,2),
    sell_date TIMESTAMP WITH TIME ZONE,
    profit_loss DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    tax_type TEXT,
    days_held INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Daily ETF rankings (shared among all users)
CREATE TABLE IF NOT EXISTS ranks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    etf_id UUID NOT NULL REFERENCES etfs(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    deviation_percent DECIMAL(5,2) NOT NULL,
    rank_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User-specific budget configuration
CREATE TABLE IF NOT EXISTS budget_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_budget DECIMAL(15,2) NOT NULL,
    daily_amount DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    used_amount DECIMAL(15,2) DEFAULT 0,
    reinvested_profit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id) -- One budget config per user
);

-- User-specific transaction history (optional - for detailed tracking)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    etf_id UUID NOT NULL REFERENCES etfs(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    profit_loss DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    brokerage_amount DECIMAL(15,2),
    holding_period_days INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User profiles (optional - for additional user metadata)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    investment_experience TEXT,
    risk_tolerance TEXT,
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ==================== INDEXES ====================

-- ETF indexes
CREATE INDEX IF NOT EXISTS idx_etfs_name ON etfs(name);
CREATE INDEX IF NOT EXISTS idx_etfs_date_updated ON etfs(date_updated);

-- Holdings indexes
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_etf_id ON holdings(etf_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user_active ON holdings(user_id, active);
CREATE INDEX IF NOT EXISTS idx_holdings_buy_date ON holdings(buy_date);

-- Rankings indexes
CREATE INDEX IF NOT EXISTS idx_ranks_etf_id ON ranks(etf_id);
CREATE INDEX IF NOT EXISTS idx_ranks_date_rank ON ranks(rank_date, rank);
CREATE INDEX IF NOT EXISTS idx_ranks_date ON ranks(rank_date);

-- Budget indexes
CREATE INDEX IF NOT EXISTS idx_budget_user_id ON budget_config(user_id);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_etf_id ON transactions(etf_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS on all user-specific tables
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Holdings policies
CREATE POLICY "Users can only view their own holdings" ON holdings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own holdings" ON holdings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own holdings" ON holdings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own holdings" ON holdings
    FOR DELETE USING (auth.uid() = user_id);

-- Budget configuration policies
CREATE POLICY "Users can only view their own budget config" ON budget_config
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own budget config" ON budget_config
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own budget config" ON budget_config
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own budget config" ON budget_config
    FOR DELETE USING (auth.uid() = user_id);

-- Transaction policies
CREATE POLICY "Users can only view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- User profiles policies
CREATE POLICY "Users can only view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can only insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can only update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can only delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = id);

-- ETF and rankings tables are read-only for all authenticated users
-- (These are shared data, not user-specific)
ALTER TABLE etfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read ETF data
CREATE POLICY "Authenticated users can read ETF data" ON etfs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to read rankings
CREATE POLICY "Authenticated users can read rankings" ON ranks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can insert/update/delete ETF data and rankings
-- (This should be done via admin functions or CSV imports)
CREATE POLICY "Service role can manage ETF data" ON etfs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rankings" ON ranks
    FOR ALL USING (auth.role() = 'service_role');

-- ==================== FUNCTIONS ====================

-- Function to automatically update user_id in holdings
CREATE OR REPLACE FUNCTION set_user_id_in_holdings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set user_id in holdings
CREATE TRIGGER set_holdings_user_id
    BEFORE INSERT ON holdings
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id_in_holdings();

-- Function to automatically update user_id in budget_config
CREATE OR REPLACE FUNCTION set_user_id_in_budget_config()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set user_id in budget_config
CREATE TRIGGER set_budget_config_user_id
    BEFORE INSERT ON budget_config
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id_in_budget_config();

-- Function to automatically update user_id in transactions
CREATE OR REPLACE FUNCTION set_user_id_in_transactions()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set user_id in transactions
CREATE TRIGGER set_transactions_user_id
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id_in_transactions();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_holdings_updated_at
    BEFORE UPDATE ON holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_config_updated_at
    BEFORE UPDATE ON budget_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== ADMIN FUNCTIONS ====================

-- Function to get user statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
    total_users BIGINT,
    active_users_today BIGINT,
    total_holdings BIGINT,
    total_budget_allocated DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM auth.users) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM holdings WHERE DATE(created_at) = CURRENT_DATE) as active_users_today,
        (SELECT COUNT(*) FROM holdings WHERE active = true) as total_holdings,
        (SELECT COALESCE(SUM(total_budget), 0) FROM budget_config) as total_budget_allocated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Clean up old rankings (keep last 90 days)
    DELETE FROM ranks WHERE rank_date < CURRENT_DATE - INTERVAL '90 days';
    
    -- Clean up old ETF data (keep last 30 days)
    DELETE FROM etfs WHERE date_updated < CURRENT_DATE - INTERVAL '30 days';
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up old data successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== INITIAL DATA ====================

-- Insert sample ETF data (this would normally be done via CSV import)
-- Uncomment the lines below if you want to add sample data

/*
INSERT INTO etfs (name, cmp, dma_20, underlying_asset, volume) VALUES
('NIFTYBEES', 186.50, 185.20, 'NIFTY 50', 5000000),
('BANKBEES', 285.75, 282.40, 'NIFTY BANK', 2000000),
('GOLDBEES', 45.30, 44.90, 'GOLD', 1500000),
('LIQUIDBEES', 1000.00, 1000.00, 'LIQUID', 500000),
('JUNIORBEES', 420.80, 418.50, 'NIFTY NEXT 50', 800000)
ON CONFLICT (name) DO NOTHING;
*/

-- ==================== VERIFICATION QUERIES ====================

-- Use these queries to verify the schema is working correctly:

-- Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public';

-- Test user isolation (run as different users)
-- SELECT * FROM holdings; -- Should only show current user's holdings
-- SELECT * FROM budget_config; -- Should only show current user's budget

-- Check shared data access
-- SELECT * FROM etfs; -- Should show all ETFs for authenticated users
-- SELECT * FROM ranks; -- Should show all rankings for authenticated users