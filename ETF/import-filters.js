/**
 * Import Filters Manager
 * Handles configuration and application of ETF import filters
 */

class ImportFilterManager {
    constructor() {
        this.config = {
            volumeFilter: 100000,
            topETFsPerCategory: 3,
            excludeLiquidETFs: true
        };
        
        this.loadConfig();
        this.updateFilterDisplay();
    }

    // ==================== CONFIGURATION MANAGEMENT ====================

    /**
     * Load filter configuration from localStorage
     */
    loadConfig() {
        const saved = Utils.loadFromStorage('import-filters-config');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
        this.updateFormFields();
    }

    /**
     * Save filter configuration to localStorage
     */
    saveConfig() {
        Utils.saveToStorage('import-filters-config', this.config);
        this.updateFilterDisplay();
    }

    /**
     * Update form fields with current configuration
     */
    updateFormFields() {
        const volumeField = document.getElementById('volume-filter');
        const categoryField = document.getElementById('top-etfs-per-category');
        const liquidField = document.getElementById('exclude-liquid-etfs');

        if (volumeField) volumeField.value = this.config.volumeFilter;
        if (categoryField) categoryField.value = this.config.topETFsPerCategory;
        if (liquidField) liquidField.checked = this.config.excludeLiquidETFs;
    }

    /**
     * Update filter configuration from form fields
     */
    updateConfigFromForm() {
        const volumeField = document.getElementById('volume-filter');
        const categoryField = document.getElementById('top-etfs-per-category');
        const liquidField = document.getElementById('exclude-liquid-etfs');

        if (volumeField) {
            this.config.volumeFilter = parseInt(volumeField.value) || 100000;
        }
        if (categoryField) {
            this.config.topETFsPerCategory = parseInt(categoryField.value) || 3;
        }
        if (liquidField) {
            this.config.excludeLiquidETFs = liquidField.checked;
        }
    }

    /**
     * Update filter display summary
     */
    updateFilterDisplay() {
        const volumeDisplay = document.getElementById('current-volume-filter');
        const categoryDisplay = document.getElementById('current-category-limit');
        const liquidDisplay = document.getElementById('current-liquid-filter');

        if (volumeDisplay) {
            volumeDisplay.textContent = this.config.volumeFilter.toLocaleString() + '+';
        }
        if (categoryDisplay) {
            if (this.config.topETFsPerCategory === 0) {
                categoryDisplay.textContent = 'No limit';
            } else {
                categoryDisplay.textContent = `Top ${this.config.topETFsPerCategory}`;
            }
        }
        if (liquidDisplay) {
            liquidDisplay.textContent = this.config.excludeLiquidETFs ? 'Yes' : 'No';
        }
    }

    /**
     * Reset to default configuration
     */
    resetToDefaults() {
        this.config = {
            volumeFilter: 100000,
            topETFsPerCategory: 3,
            excludeLiquidETFs: true
        };
        
        this.updateFormFields();
        this.saveConfig();
        Utils.showNotification('Import filters reset to defaults', 'success');
    }

    /**
     * Save current form values
     */
    saveFilters() {
        this.updateConfigFromForm();
        this.saveConfig();
        Utils.showNotification('Import filter settings saved successfully', 'success');
    }

    // ==================== FILTERING LOGIC ====================

    /**
     * Apply all filters to raw ETF data
     * @param {Array} rawData - Raw ETF data from CSV
     * @returns {Array} Filtered ETF data
     */
    applyFilters(rawData) {
        console.log(`Starting filter process with ${rawData.length} ETFs`);
        
        // Step 1: Basic filtering (volume, liquid ETFs)
        let filteredData = this.applyBasicFilters(rawData);
        console.log(`After basic filtering: ${filteredData.length} ETFs`);
        
        // Step 2: Group by underlying asset and limit per category
        if (this.config.topETFsPerCategory > 0) {
            filteredData = this.applyPerCategoryLimit(filteredData);
            console.log(`After per-category limiting: ${filteredData.length} ETFs`);
        }
        
        return filteredData;
    }

    /**
     * Apply basic filters (volume, liquid ETFs)
     * @param {Array} rawData - Raw ETF data
     * @returns {Array} Filtered data
     */
    applyBasicFilters(rawData) {
        return rawData.filter(row => {
            try {
                // Get ETF name
                const symbol = this.getColumnValue(row, ['SYMBOL', 'symbol', 'Symbol', 'ETF', 'Name']);
                if (!symbol || symbol.length < 2) return false;

                // Check liquid ETF filter
                if (this.config.excludeLiquidETFs && symbol.toUpperCase().includes('LIQUID')) {
                    console.log(`Excluded liquid ETF: ${symbol}`);
                    return false;
                }

                // Get volume
                const volumeValue = this.getColumnValue(row, ['VOLUME', 'volume', 'Volume', 'Vol']);
                if (!volumeValue) return false;

                const volume = parseInt(volumeValue.toString().replace(/,/g, ''));
                if (isNaN(volume) || volume < this.config.volumeFilter) {
                    return false;
                }

                // Get price (LTP)
                const ltpValue = this.getColumnValue(row, ['LTP', 'ltp', 'Ltp', 'Price', 'Close']);
                if (!ltpValue) return false;

                const ltp = parseFloat(ltpValue.toString().replace(/,/g, ''));
                if (isNaN(ltp) || ltp <= 0) return false;

                return true;
            } catch (error) {
                console.error('Error filtering row:', error);
                return false;
            }
        });
    }

    /**
     * Apply per-category limit (top N ETFs per underlying asset)
     * @param {Array} filteredData - Already filtered ETF data
     * @returns {Array} Category-limited data
     */
    applyPerCategoryLimit(filteredData) {
        // Group by underlying asset
        const groupedByAsset = {};
        
        filteredData.forEach(row => {
            const underlyingAsset = this.getColumnValue(row, [
                'UNDERLYING ASSET', 'underlying asset', 'Underlying Asset', 
                'Asset', 'Category', 'Sector'
            ]) || 'Unknown';
            
            if (!groupedByAsset[underlyingAsset]) {
                groupedByAsset[underlyingAsset] = [];
            }
            
            // Add volume for sorting
            const volume = parseInt(this.getColumnValue(row, ['VOLUME', 'volume', 'Volume', 'Vol']).toString().replace(/,/g, ''));
            groupedByAsset[underlyingAsset].push({
                ...row,
                _volume: volume
            });
        });

        // Sort each group by volume (descending) and take top N
        const result = [];
        
        Object.keys(groupedByAsset).forEach(asset => {
            const etfsInCategory = groupedByAsset[asset];
            
            // Sort by volume (highest first)
            etfsInCategory.sort((a, b) => b._volume - a._volume);
            
            // Take top N
            const topETFs = etfsInCategory.slice(0, this.config.topETFsPerCategory);
            
            console.log(`${asset}: Selected ${topETFs.length} out of ${etfsInCategory.length} ETFs`);
            
            // Remove the _volume property and add to result
            topETFs.forEach(etf => {
                const { _volume, ...cleanETF } = etf;
                result.push(cleanETF);
            });
        });

        return result;
    }

    /**
     * Get column value by trying multiple possible column names
     * @param {Object} row - Data row
     * @param {Array} possibleNames - Array of possible column names
     * @returns {string|null} Column value or null
     */
    getColumnValue(row, possibleNames) {
        for (const name of possibleNames) {
            // Try exact match first
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return row[name];
            }
            
            // Try case-insensitive match
            const key = Object.keys(row).find(k => 
                k.toLowerCase().replace(/[^a-z0-9]/g, '') === 
                name.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            
            if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return row[key];
            }
        }
        return null;
    }

    /**
     * Convert filtered data to ETF objects
     * @param {Array} filteredData - Filtered raw data
     * @returns {Array} ETF objects
     */
    convertToETFObjects(filteredData) {
        const validETFs = [];
        
        filteredData.forEach(row => {
            try {
                const symbol = this.getColumnValue(row, ['SYMBOL', 'symbol', 'Symbol', 'ETF', 'Name']);
                const ltp = this.getColumnValue(row, ['LTP', 'ltp', 'Ltp', 'Price', 'Close']);
                const volume = this.getColumnValue(row, ['VOLUME', 'volume', 'Volume', 'Vol']);
                const underlyingAsset = this.getColumnValue(row, [
                    'UNDERLYING ASSET', 'underlying asset', 'Underlying Asset', 
                    'Asset', 'Category', 'Sector'
                ]) || 'Unknown';

                if (!symbol || !ltp) return;

                const ltpNum = parseFloat(ltp.toString().replace(/,/g, ''));
                const volumeNum = parseInt(volume.toString().replace(/,/g, ''));

                if (isNaN(ltpNum) || ltpNum <= 0) return;
                if (isNaN(volumeNum) || volumeNum <= 0) return;

                // Estimate 20 DMA as 98% of current price if not available
                const dma20 = ltpNum * 0.98;

                validETFs.push({
                    name: Utils.cleanETFSymbol(symbol),
                    cmp: ltpNum,
                    dma_20: parseFloat(dma20.toFixed(2)),
                    underlying_asset: underlyingAsset,
                    volume: volumeNum
                });

            } catch (error) {
                console.error('Error converting row to ETF object:', error);
            }
        });

        return validETFs;
    }

    // ==================== GETTERS ====================

    /**
     * Get current filter configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get filter statistics for display
     * @param {Array} originalData - Original data before filtering
     * @param {Array} filteredData - Data after filtering
     */
    getFilterStats(originalData, filteredData) {
        const liquidCount = originalData.filter(row => {
            const symbol = this.getColumnValue(row, ['SYMBOL', 'symbol', 'Symbol', 'ETF', 'Name']);
            return symbol && symbol.toUpperCase().includes('LIQUID');
        }).length;

        const lowVolumeCount = originalData.filter(row => {
            const volumeValue = this.getColumnValue(row, ['VOLUME', 'volume', 'Volume', 'Vol']);
            if (!volumeValue) return true;
            const volume = parseInt(volumeValue.toString().replace(/,/g, ''));
            return isNaN(volume) || volume < this.config.volumeFilter;
        }).length;

        return {
            originalCount: originalData.length,
            filteredCount: filteredData.length,
            excludedLiquid: liquidCount,
            excludedLowVolume: lowVolumeCount,
            filterConfig: this.getConfig()
        };
    }
}

// Create global instance
const importFilterManager = new ImportFilterManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.importFilterManager = importFilterManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportFilterManager;
}