const { LAMPORTS_PER_SOL } = require('@solana/web3.js');

class TaxManager {
    constructor() {
        this.tokenTaxSettings = new Map(); // tokenMint -> tax settings
        this.taxCollectionStats = new Map(); // tokenMint -> collection stats
        this.exemptWallets = new Map(); // tokenMint -> Set of exempt wallet addresses
        console.log('💰 Tax Manager initialized - SOL-based tax system');
    }

    // Set tax rates for a token (in SOL)
    setTokenTaxRates(tokenMint, buyTaxPercent, sellTaxPercent, taxRecipientWallet) {
        const taxSettings = {
            buyTaxPercent: Math.min(Math.max(buyTaxPercent, 0), 99), // 0-99%
            sellTaxPercent: Math.min(Math.max(sellTaxPercent, 0), 99), // 0-99%
            taxRecipientWallet: taxRecipientWallet, // Wallet address to receive tax
            enabled: true,
            createdAt: new Date().toISOString()
        };

        this.tokenTaxSettings.set(tokenMint, taxSettings);

        // Initialize collection stats
        if (!this.taxCollectionStats.has(tokenMint)) {
            this.taxCollectionStats.set(tokenMint, {
                totalSOLCollected: 0,
                totalBuyTaxes: 0,
                totalSellTaxes: 0,
                totalTransactions: 0,
                lastCollectionDate: null
            });
        }

        console.log(`💰 Tax rates set for token ${tokenMint}: Buy ${buyTaxPercent}%, Sell ${sellTaxPercent}%`);
        return taxSettings;
    }

    // Get tax settings for a token
    getTokenTaxSettings(tokenMint) {
        return this.tokenTaxSettings.get(tokenMint);
    }

    // Calculate tax amount in SOL for a transaction
    calculateTaxAmount(tokenMint, transactionType, solAmount) {
        const taxSettings = this.tokenTaxSettings.get(tokenMint);
        if (!taxSettings || !taxSettings.enabled) {
            return 0;
        }

        const taxRate = transactionType === 'buy' ? taxSettings.buyTaxPercent : taxSettings.sellTaxPercent;
        const taxAmount = (solAmount * taxRate) / 100;

        console.log(`💰 Tax calculated: ${taxAmount.toFixed(6)} SOL (${taxRate}% of ${solAmount} SOL)`);
        return taxAmount;
    }

    // Record tax collection
    recordTaxCollection(tokenMint, transactionType, taxAmountSOL) {
        const stats = this.taxCollectionStats.get(tokenMint);
        if (!stats) return;

        stats.totalSOLCollected += taxAmountSOL;
        stats.totalTransactions += 1;
        stats.lastCollectionDate = new Date().toISOString();

        if (transactionType === 'buy') {
            stats.totalBuyTaxes += taxAmountSOL;
        } else {
            stats.totalSellTaxes += taxAmountSOL;
        }

        this.taxCollectionStats.set(tokenMint, stats);
        console.log(`💰 Tax recorded: ${taxAmountSOL.toFixed(6)} SOL collected (Total: ${stats.totalSOLCollected.toFixed(6)} SOL)`);
    }

    // Get tax collection statistics
    getTaxStats(tokenMint) {
        const settings = this.tokenTaxSettings.get(tokenMint);
        const stats = this.taxCollectionStats.get(tokenMint);
        
        return {
            settings: settings || null,
            stats: stats || {
                totalSOLCollected: 0,
                totalBuyTaxes: 0,
                totalSellTaxes: 0,
                totalTransactions: 0,
                lastCollectionDate: null
            }
        };
    }

    // Add wallet to tax exemption list
    addTaxExemptWallet(tokenMint, walletAddress) {
        if (!this.exemptWallets.has(tokenMint)) {
            this.exemptWallets.set(tokenMint, new Set());
        }
        
        this.exemptWallets.get(tokenMint).add(walletAddress);
        console.log(`💰 Wallet ${walletAddress} exempted from taxes for token ${tokenMint}`);
        return true;
    }

    // Check if wallet is tax exempt
    isWalletTaxExempt(tokenMint, walletAddress) {
        const exemptSet = this.exemptWallets.get(tokenMint);
        return exemptSet ? exemptSet.has(walletAddress) : false;
    }

    // Get all exempt wallets for a token
    getTaxExemptWallets(tokenMint) {
        const exemptSet = this.exemptWallets.get(tokenMint);
        return exemptSet ? Array.from(exemptSet) : [];
    }

    // Format tax information for Telegram display
    formatTaxInfoForTelegram(tokenMint, tokenInfo) {
        const taxData = this.getTaxStats(tokenMint);
        const exemptWallets = this.getTaxExemptWallets(tokenMint);

        if (!taxData.settings) {
            return `
💰 *Tax System Status: DISABLED*

No tax settings configured for ${tokenInfo ? tokenInfo.name : 'this token'}.
Use /set_fees to configure tax rates.
            `;
        }

        const { settings, stats } = taxData;

        return `
💰 *Tax System Status: ACTIVE*

🏷️ **Token:** ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})

📊 **Tax Rates:**
• Buy Tax: ${settings.buyTaxPercent}%
• Sell Tax: ${settings.sellTaxPercent}%
• Tax Recipient: Wallet 1

💵 **Collection Stats:**
• Total SOL Collected: ${stats.totalSOLCollected.toFixed(6)} SOL
• Buy Tax Collected: ${stats.totalBuyTaxes.toFixed(6)} SOL  
• Sell Tax Collected: ${stats.totalSellTaxes.toFixed(6)} SOL
• Total Transactions: ${stats.totalTransactions}
• Last Collection: ${stats.lastCollectionDate ? new Date(stats.lastCollectionDate).toLocaleString() : 'Never'}

🚫 **Tax Exempt Wallets:** ${exemptWallets.length}
${exemptWallets.length > 0 ? exemptWallets.map((wallet, i) => `${i + 1}. \`${wallet.substring(0, 8)}...${wallet.substring(-8)}\``).join('\n') : 'No exempt wallets'}
        `;
    }

    // Get all tokens with tax settings
    getAllTokensWithTax() {
        return Array.from(this.tokenTaxSettings.keys()).map(tokenMint => ({
            tokenMint,
            settings: this.tokenTaxSettings.get(tokenMint),
            stats: this.taxCollectionStats.get(tokenMint)
        }));
    }
}

module.exports = TaxManager;