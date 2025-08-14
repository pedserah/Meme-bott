const { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } = require('@solana/web3.js');

class TaxManager {
    constructor(connection, walletManager) {
        this.connection = connection;
        this.walletManager = walletManager;
        this.taxCollectorWallet = 1; // Wallet 1 collects taxes
        this.stats = {
            totalSOLCollected: 0,
            totalBuyTaxes: 0,
            totalSellTaxes: 0,
            totalTransactions: 0,
            lastCollectionDate: null
        };
        this.taxRates = {
            buy: 0.03,  // 3% buy tax
            sell: 0.05, // 5% sell tax
            transfer: 0.02 // 2% transfer tax
        };
        this.exemptWallets = new Set();
        this.tokensWithTax = new Map();
    }

    // Calculate SOL tax amount based on operation type and amount
    calculateSOLTax(operationType, solAmount) {
        if (operationType !== 'buy' && operationType !== 'sell' && operationType !== 'transfer') {
            throw new Error('Invalid operation type');
        }

        const taxRate = this.taxRates[operationType];
        return solAmount * taxRate;
    }

    // Collect SOL tax for a transaction
    async collectSOLTax(fromWallet, operationType, solAmount) {
        try {
            if (this.exemptWallets.has(fromWallet.publicKey.toString())) {
                console.log('Wallet is tax exempt');
                return { success: true, taxAmount: 0 };
            }

            const taxAmount = this.calculateSOLTax(operationType, solAmount);
            if (taxAmount <= 0) {
                return { success: true, taxAmount: 0 };
            }

            // Get collector wallet
            const collectorWallet = this.walletManager.getWallet(this.taxCollectorWallet);
            if (!collectorWallet) {
                throw new Error('Tax collector wallet not found');
            }

            // Create and send tax collection transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromWallet.publicKey,
                    toPubkey: collectorWallet.publicKey,
                    lamports: taxAmount * LAMPORTS_PER_SOL
                })
            );

            const signature = await this.connection.sendTransaction(
                transaction,
                [fromWallet]
            );

            await this.connection.confirmTransaction(signature);
            
            // Record successful tax collection
            this.trackTaxCollection(operationType, taxAmount);

            return {
                success: true,
                taxAmount,
                signature
            };

        } catch (error) {
            console.error('Tax collection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Track tax collection statistics
    trackTaxCollection(operationType, taxAmount) {
        this.stats.totalSOLCollected += taxAmount;
        this.stats.totalTransactions++;
        this.stats.lastCollectionDate = new Date();

        if (operationType === 'buy') {
            this.stats.totalBuyTaxes += taxAmount;
        } else if (operationType === 'sell') {
            this.stats.totalSellTaxes += taxAmount;
        }
    }

    // Get current tax statistics
    getTaxStats() {
        return {
            settings: {
                buyTax: this.taxRates.buy * 100 + '%',
                sellTax: this.taxRates.sell * 100 + '%',
                transferTax: this.taxRates.transfer * 100 + '%',
                collectorWallet: this.taxCollectorWallet
            },
            stats: {
                ...this.stats,
                totalSOLCollected: this.stats.totalSOLCollected.toFixed(4),
                totalBuyTaxes: this.stats.totalBuyTaxes.toFixed(4),
                totalSellTaxes: this.stats.totalSellTaxes.toFixed(4)
            }
        };
    }

    // Get list of tokens with tax enabled
    getAllTokensWithTax() {
        return Array.from(this.tokensWithTax.entries()).map(([address, settings]) => ({
            address,
            ...settings
        }));
    }

    // Get list of tax exempt wallets
    getTaxExemptWallets() {
        return Array.from(this.exemptWallets);
    }

    // Add a wallet to tax exemption list
    addTaxExemptWallet(publicKey) {
        if (typeof publicKey === 'string') {
            this.exemptWallets.add(publicKey);
            return true;
        }
        return false;
    }

    // Remove a wallet from tax exemption list
    removeTaxExemptWallet(publicKey) {
        return this.exemptWallets.delete(publicKey);
    }

    // Set tax rates for a specific token
    setTokenTaxRates(tokenAddress, buyTax, sellTax, transferTax) {
        if (!tokenAddress || buyTax < 0 || sellTax < 0 || transferTax < 0) {
            return null;
        }

        const rates = {
            buyTax: Math.min(buyTax, 0.10), // Max 10%
            sellTax: Math.min(sellTax, 0.10),
            transferTax: Math.min(transferTax, 0.10),
            lastUpdated: new Date()
        };

        this.tokensWithTax.set(tokenAddress, rates);
        return rates;
    }

    // Enable tax for a token
    enableTaxForToken(tokenAddress) {
        if (!this.tokensWithTax.has(tokenAddress)) {
            return this.setTokenTaxRates(tokenAddress, 0.03, 0.05, 0.02); // Default rates
        }
        return null;
    }

    // Disable tax for a token
    disableTaxForToken(tokenAddress) {
        return this.tokensWithTax.delete(tokenAddress);
    }
}

module.exports = TaxManager;
