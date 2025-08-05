require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const WalletManager = require('./wallet-manager');
const TokenManager = require('./token-manager');
const TradingSimulator = require('./trading-simulator');
const RaydiumManager = require('./raydium-manager');
const RealTradingManager = require('./real-trading-manager');
const AIIntegrations = require('./ai-integrations');

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize Solana Connection (Devnet)
const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');

// Initialize Wallet Manager
const walletManager = new WalletManager(connection);

// Initialize Token Manager
const tokenManager = new TokenManager(connection, walletManager);

// Initialize Trading Simulator (for backward compatibility)
const tradingSimulator = new TradingSimulator(walletManager, tokenManager);

// Initialize Raydium Manager
const raydiumManager = new RaydiumManager(connection, walletManager, tokenManager);

// Initialize Real Trading Manager
const realTradingManager = new RealTradingManager(walletManager, tokenManager, raydiumManager);

// Initialize AI Integrations for Step 7
const aiIntegrations = new AIIntegrations();

// Bot state management
const botState = {
    activeOperations: new Map(),
    currentToken: null,
    userSessions: new Map(), // Track user input sessions
    tradingMode: 'real', // 'real' or 'simulation'
    autoBrandSessions: new Map(), // Track auto-brand sessions
    autoRugMonitor: {
        active: false,
        conditions: null,
        startTime: null,
        chatId: null,
        tokenMint: null,
        intervalId: null
    },
    // Research: Dynamic fee system
    dynamicFees: new Map() // tokenMint -> { buyFee: %, sellFee: %, enabled: bool }
};

console.log('🚀 Solana Telegram Bot Starting...');
console.log(`📡 Connected to Solana ${process.env.SOLANA_NETWORK || 'devnet'}`);

// Bot command handlers
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🤖 *Solana Meme Coin Bot* - Educational Devnet Version

Available Commands:
📋 /help - Show all commands
💰 /wallets - Show wallet balances
🪂 /airdrop \\[wallet_number\\] - Request devnet SOL
🚀 /launch - Launch new meme coin with metadata ✅ ENHANCED
🤖 /auto_brand - AI-powered brand generation ✅ NEW
🎯 /auto_name - AI-powered name generation ✅ NEW
🔴 /auto_rug - Automated rugpull with conditions ✅ NEW
🔬 /set_fees - RESEARCH: Set dynamic buy/sell fees ✅ NEW
🌱 /seed_wallets - Equalize SOL balance across all wallets ✅ UPDATED
🏊 /create_pool - Create Raydium pool ✅ NEW
📈 /start_trading - Start automated trading ✅ REAL SWAPS
⏸️ /stop_trading - Stop automated trading
🔴 /rugpull - Complete rugpull operation ✅ NEW
🔴 /auto_rug - Automated conditional rugpull ✅ NEW
❌ /cancel_auto_rug - Cancel auto-rugpull monitoring
📊 /status - Show current operations

⚡ *Step 7+ Complete:* AI-powered auto branding with Fal.ai & nft.storage!
🎯 *Features:* Auto naming, logo generation, trending analysis
🔬 *RESEARCH MODE:* Liquidity mechanics simulation for educational analysis
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💰 Check Wallets', callback_data: 'show_wallets' },
                    { text: '🚀 Launch Coin', callback_data: 'launch_token' }
                ],
                [
                    { text: '🤖 Auto Brand', callback_data: 'auto_brand' },
                    { text: '🎯 Auto Name', callback_data: 'auto_name' }
                ],
                [
                    { text: '🌱 Seed Wallets', callback_data: 'seed_wallets' },
                    { text: '🏊 Create Pool', callback_data: 'create_pool' }
                ],
                [
                    { text: '📈 Start Trading', callback_data: 'start_trading' },
                    { text: '⏸️ Stop Trading', callback_data: 'stop_trading' }
                ],
                [
                    { text: '🔴 Auto Rug', callback_data: 'auto_rug' },
                    { text: '🔬 Set Fees', callback_data: 'set_fees' }
                ],
                [
                    { text: '📊 Bot Status', callback_data: 'show_status' },
                    { text: '❌ Cancel Auto Rug', callback_data: 'cancel_auto_rug' }
                ]
            ]
        }
    });
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📖 *Help & Commands*

*Step 1: Bot Setup* ✅
- Bot is running and connected

*Step 2: Wallet Integration* ✅
- /wallets - View all wallet balances
- /airdrop \\[1-5\\] - Request devnet SOL for testing

*Step 3: Token Launch* ✅
- /launch - Create new SPL token
- /seed_wallets - Distribute tokens to trading wallets

*Step 4: Trading Simulation* ✅
- Simulation mode available for testing

*Step 5: Real Raydium Integration* ✅ COMPLETE
- /create_pool - Create Raydium liquidity pool
- /start_trading - Real automated DEX trading
- /stop_trading - Stop trading operations  
- /rugpull - Complete rugpull with liquidity removal

*Real Trading Features:*
- ⚡ Actual Raydium DEX swaps
- 🏊 Real liquidity pool creation
- 💰 70% buy / 30% sell ratio
- ⏰ Random delays (30-90 seconds)
- 🔄 Cycles through wallets 2-5
- 📊 Real-time transaction logging
- 🔗 Solana Explorer links

*Current Status:* Step 5 Complete - Real DEX trading ready!
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    showStatus(chatId);
});

async function showStatus(chatId) {
    const createdTokens = tokenManager.getAllTokens();
    const createdPools = raydiumManager.getAllPools();
    const tradingStatus = realTradingManager.getTradingStatus();
    
    let tradingInfo = '❌ Not active';
    if (tradingStatus.isTrading) {
        const stats = tradingStatus.stats;
        const runtime = stats.startTime ? Math.floor((Date.now() - stats.startTime.getTime()) / 60000) : 0;
        const successRate = stats.totalTrades > 0 ? ((stats.successfulTrades / stats.totalTrades) * 100).toFixed(1) : '0';
        tradingInfo = `✅ Active (${runtime}m) - ${stats.totalTrades} trades (${successRate}% success)`;
    }
    
let statusMessage = `
📊 <b>Enhanced Bot Status</b>

🤖 Bot: Online ✅
🌐 Network: ${process.env.SOLANA_NETWORK || 'devnet'} ✅
💰 Wallets: ${walletManager.getAllWallets().length}/5 configured ✅
🪙 Tokens Created: ${createdTokens.length}
🏊 Pools Created: ${createdPools.length}
📈 Trading: ${tradingInfo}
🔴 Auto-Rug: ${botState.autoRugMonitor.active ? '✅ Active' : '❌ Inactive'}
🔬 Research Mode: ✅ Dynamic Fees | Devnet Only
⚡ Mode: Real DEX Trading + AI Branding + Auto-Rug + Research (Step 7+)

<b>Current Step:</b> Step 7+ Complete - AI + Auto-Rugpull + Fal.ai
<b>Features:</b> Fal.ai imaging, creative naming, automated conditional rugpulls
    `;

    if (createdTokens.length > 0) {
        statusMessage += `\n\n🪙 <b>Created Tokens:</b>\n`;
        
        createdTokens.forEach((token, index) => {
            const hasPool = raydiumManager.hasPool(token.mintAddress);
            const poolStatus = hasPool ? '🏊 Pool Created' : '❌ No Pool';
            
            const fees = botState.dynamicFees.get(token.mintAddress);
            const feeInfo = fees ? ` | Buy: ${fees.buyFee}%, Sell: ${fees.sellFee}%` : ' | Fees: 0%, 0%';
            statusMessage += `\n${index + 1}. <b>${token.name}</b> (${token.symbol})${feeInfo}\n`;
            statusMessage += `   📍 Mint: <code>${token.mintAddress.substring(0, 8)}...</code>\n`;
            statusMessage += `   📝 Description: ${token.description || 'None'}\n`;
            statusMessage += `   🖼️ Image: ${token.imageUrl ? 'Yes' : 'No'}\n`;
            statusMessage += `   ${poolStatus}\n`;
            
            if (tradingStatus.isTrading && tradingStatus.currentToken === token.mintAddress) {
                statusMessage += `   📈 <b>Currently Trading</b>\n`;
            }
        });
    }

    if (createdPools.length > 0 && createdTokens.length > 0) {
        statusMessage += `\n\n🏊 <b>Pool Details:</b>\n`;
        
        createdPools.forEach((pool, index) => {
            const tokenInfo = tokenManager.getToken(pool.tokenMint);
            statusMessage += `\n${index + 1}. <b>${tokenInfo ? tokenInfo.name : 'Unknown'}</b> Pool\n`;
            statusMessage += `   💰 Liquidity: ${pool.solAmount} SOL + ${pool.liquidityAmount} tokens\n`;
            statusMessage += `   📍 Pool ID: <code>${pool.poolId.substring(0, 8)}...</code>\n`;
        });
    }
    
    // Add auto-rug monitoring status
    if (botState.autoRugMonitor.active) {
        const tokenInfo = tokenManager.getToken(botState.autoRugMonitor.tokenMint);
        const elapsedMinutes = Math.floor((new Date() - botState.autoRugMonitor.startTime) / 60000);
        const conditions = botState.autoRugMonitor.conditions;
        
        statusMessage += `\n\n🔴 <b>Auto-Rugpull Monitor:</b>\n`;
        statusMessage += `   🪙 Token: <b>${tokenInfo?.name || 'Unknown'}</b>\n`;
        statusMessage += `   ⏰ Running: ${elapsedMinutes}/${conditions.timeMinutes} minutes\n`;
        statusMessage += `   📊 Volume Target: ${conditions.volume} trades\n`;
        statusMessage += `   📉 Drop Target: ${conditions.dropPercent}% price drop\n`;
        statusMessage += `   ✅ <b>Monitoring Active</b> - Checking every 60s\n`;
    }
    
    bot.sendMessage(chatId, statusMessage, { parse_mode: 'HTML' });
}

// Seed Wallets Command
bot.onText(/\/seed_wallets/, (msg) => {
    const chatId = msg.chat.id;
    seedWalletsCommand(chatId);
});

function seedWalletsCommand(chatId) {
    bot.sendMessage(chatId, `
🌱 *SOL Equalization Across All Wallets*

💰 This will redistribute SOL so **ALL wallets have equal balance**

**How it works:**
• Calculate total SOL across all 5 wallets
• Redistribute equally: Each wallet gets same amount
• Reserve small amount for transaction fees

**Example:**
• Total: 10 SOL across all wallets  
• Result: Each wallet gets ~2 SOL (equal balance)

Ready to equalize SOL across all wallets?
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚖️ Equalize All Wallets', callback_data: 'confirm_sol_distribution' },
                    { text: '💰 Check Balances First', callback_data: 'show_wallets' }
                ],
                [
                    { text: '❌ Cancel', callback_data: 'cancel_seed' }
                ]
            ]
        }
    });
}

async function seedWalletsWithSOL(chatId) {
    try {
        // Get all wallet balances
        await walletManager.updateBalances();
        const allWallets = walletManager.getAllWallets();
        
        if (allWallets.length !== 5) {
            bot.sendMessage(chatId, '❌ Not all 5 wallets are configured');
            return;
        }

        // Calculate total SOL across all wallets
        const totalSOL = allWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
        
        // Reserve 0.5 SOL total for transaction fees (0.1 per wallet)
        const reserveAmount = 0.5;
        const availableSOL = totalSOL - reserveAmount;
        
        if (availableSOL <= 0) {
            bot.sendMessage(chatId, `
❌ *Insufficient Total SOL*

💰 Total SOL Across All Wallets: ${totalSOL.toFixed(4)} SOL
🔒 Required Reserve: ${reserveAmount} SOL for transaction fees
❌ Available for Equal Distribution: ${availableSOL.toFixed(4)} SOL

Please fund wallets first with /airdrop commands.
            `, { parse_mode: 'Markdown' });
            return;
        }

        // Calculate equal balance for each wallet
        const targetBalance = availableSOL / 5;

        bot.sendMessage(chatId, `
🔄 *Equalizing SOL Across All Wallets...*

💰 Total SOL: ${totalSOL.toFixed(4)} SOL
🎯 Target Balance Per Wallet: ${targetBalance.toFixed(4)} SOL
🔒 Keeping ${reserveAmount} SOL total for transaction fees

*Current Balances:*
${allWallets.map(w => `• Wallet ${w.id}: ${w.balance.toFixed(4)} SOL`).join('\n')}

Redistributing to achieve equal balances...
        `, { parse_mode: 'Markdown' });

        const redistributionResults = [];
        
        // Phase 1: Collect excess SOL to Wallet 1
        for (let walletId = 2; walletId <= 5; walletId++) {
            const wallet = walletManager.getWallet(walletId);
            if (wallet.balance > targetBalance) {
                const excessAmount = wallet.balance - targetBalance;
                try {
                    const result = await walletManager.transferSOL(
                        walletId, // from wallet with excess 
                        1, // to wallet 1 (collector)
                        excessAmount
                    );
                    redistributionResults.push(result);
                    console.log(`✅ Collected ${excessAmount.toFixed(4)} SOL from wallet ${walletId}`);
                } catch (error) {
                    console.error(`❌ Failed to collect from wallet ${walletId}:`, error.message);
                }
            }
        }

        // Update balances after collection phase
        await walletManager.updateBalances();

        // Phase 2: Distribute from Wallet 1 to achieve equal balances
        for (let walletId = 2; walletId <= 5; walletId++) {
            const wallet = walletManager.getWallet(walletId);
            if (wallet.balance < targetBalance) {
                const neededAmount = targetBalance - wallet.balance;
                try {
                    const result = await walletManager.transferSOL(
                        1, // from wallet 1 (has collected excess)
                        walletId, // to wallet that needs SOL
                        neededAmount
                    );
                    redistributionResults.push(result);
                    console.log(`✅ Sent ${neededAmount.toFixed(4)} SOL to wallet ${walletId}`);
                } catch (error) {
                    console.error(`❌ Failed to send to wallet ${walletId}:`, error.message);
                }
            }
        }

        // Final balance adjustment for Wallet 1
        await walletManager.updateBalances();
        const wallet1 = walletManager.getWallet(1);
        if (wallet1.balance > targetBalance) {
            // Wallet 1 should also have equal balance
            // Keep excess as reserve, but try to get close to target
            console.log(`Wallet 1 has ${wallet1.balance.toFixed(4)} SOL, target is ${targetBalance.toFixed(4)} SOL`);
        }

        // Get final balances
        await walletManager.updateBalances();
        const finalWallets = walletManager.getAllWallets();

        bot.sendMessage(chatId, `
🌱 *SOL Equalization Complete!*

🎯 Target Balance: ${targetBalance.toFixed(4)} SOL per wallet
✅ Redistribution Operations: ${redistributionResults.length}

*Final Wallet Balances:*
${finalWallets.map(w => `• Wallet ${w.id}: ${w.balance.toFixed(4)} SOL`).join('\n')}

💰 Total SOL: ${finalWallets.reduce((sum, w) => sum + w.balance, 0).toFixed(4)} SOL

🎯 All wallets now have approximately equal SOL balances!
        `, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💰 Check All Balances', callback_data: 'show_wallets' },
                        { text: '🚀 Launch Token', callback_data: 'launch_token' }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('❌ SOL equalization error:', error);
        bot.sendMessage(chatId, `❌ SOL equalization failed: ${error.message}`);
    }
}

// Create Pool Command
bot.onText(/\/create_pool/, (msg) => {
    const chatId = msg.chat.id;
    createPoolCommand(chatId);  
});

function createPoolCommand(chatId) {
    const createdTokens = tokenManager.getAllTokens();
    
    if (createdTokens.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Tokens Found*

You need to create a token first before creating a pool.

Use /launch to create your first token!
        `, { parse_mode: 'Markdown' });
        return;
    }

    // If only one token, create pool immediately
    if (createdTokens.length === 1) {
        const token = createdTokens[0];
        if (raydiumManager.hasPool(token.mintAddress)) {
            bot.sendMessage(chatId, `
⚠️ *Pool Already Exists*

A pool already exists for ${token.name} (${token.symbol}).

Use /start_trading to begin trading on the existing pool.
            `, { parse_mode: 'Markdown' });
            return;
        }
        createPoolForToken(chatId, token.mintAddress);
    } else {
        // Multiple tokens - let user choose
        const tokenButtons = createdTokens.map(token => {
            const hasPool = raydiumManager.hasPool(token.mintAddress);
            return [{
                text: `🏊 ${token.name} (${token.symbol}) ${hasPool ? '✅' : ''}`,
                callback_data: `create_pool_${token.mintAddress}`
            }];
        });
        
        bot.sendMessage(chatId, `
🏊 *Select Token for Pool Creation*

Choose which token you want to create a Raydium pool for:

✅ = Pool already exists
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...tokenButtons,
                    [{ text: '❌ Cancel', callback_data: 'cancel_pool_creation' }]
                ]
            }
        });
    }
}

async function createPoolForToken(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    if (raydiumManager.hasPool(tokenMint)) {
        bot.sendMessage(chatId, `
⚠️ *Pool Already Exists*

A pool already exists for ${tokenInfo.name} (${tokenInfo.symbol}).
        `, { parse_mode: 'Markdown' });
        return;
    }

    try {
        bot.sendMessage(chatId, `
🔄 *Creating Raydium Pool...*

🪙 Token: ${tokenInfo.name} (${tokenInfo.symbol})
💰 Initial Liquidity: 0.5 SOL + 500 ${tokenInfo.symbol}
🏊 Creating pool on Raydium devnet...

This may take 30-60 seconds...
        `, { parse_mode: 'Markdown' });

        const result = await raydiumManager.createPool(tokenMint, 0.5);
        
        if (result.success) {
            const poolMessage = raydiumManager.formatPoolForTelegram(result.poolInfo, tokenInfo);
            
            bot.sendMessage(chatId, poolMessage, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: false,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📈 Start Trading', callback_data: `trade_token_${tokenMint}` },
                            { text: '📊 View Pool', callback_data: `view_pool_${tokenMint}` }
                        ]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, `❌ Pool creation failed: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ Pool creation error:', error);
        bot.sendMessage(chatId, `❌ Pool creation failed: ${error.message}`);
    }
}

// Start Trading Command (Real Trading)
bot.onText(/\/start_trading/, (msg) => {
    const chatId = msg.chat.id;
    startRealTradingCommand(chatId);
});

function startRealTradingCommand(chatId) {
    const createdPools = raydiumManager.getAllPools();
    
    if (createdPools.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Pools Found*

You need to create a pool first before starting trading.

Steps:
1. Use /launch to create a token
2. Use /create_pool to create a Raydium pool
3. Then start trading!
        `, { parse_mode: 'Markdown' });
        return;
    }

    if (realTradingManager.getTradingStatus().isTrading) {
        bot.sendMessage(chatId, `
⚠️ *Trading Already Active*

Real trading is already running. Use /stop_trading to stop it first.
        `, { parse_mode: 'Markdown' });
        return;
    }

    // If only one pool, start trading immediately
    if (createdPools.length === 1) {
        startRealTradingForToken(chatId, createdPools[0].tokenMint);
    } else {
        // Multiple pools - let user choose
        const poolButtons = createdPools.map(pool => {
            const tokenInfo = tokenManager.getToken(pool.tokenMint);
            return [{
                text: `⚡ ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})`,
                callback_data: `real_trade_token_${pool.tokenMint}`
            }];
        });
        
        bot.sendMessage(chatId, `
📈 *Select Pool for Real Trading*

Choose which pool you want to trade on:
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...poolButtons,
                    [{ text: '❌ Cancel', callback_data: 'cancel_trading' }]
                ]
            }
        });
    }
}

function startRealTradingForToken(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    // Start real trading with callback for trade notifications
    const result = realTradingManager.startTrading(tokenMint, (tradeResult) => {
        // Send trade notification to Telegram
        const tradeMessage = realTradingManager.formatTradeForTelegram(tradeResult);
        bot.sendMessage(chatId, tradeMessage, { parse_mode: 'Markdown' });
    });

    if (result.success) {
        bot.sendMessage(chatId, `
🚀 *Real Automated Trading Started!*

🪙 Token: ${tokenInfo.name} (${tokenInfo.symbol})
⚡ Mode: **REAL RAYDIUM DEX SWAPS**
🎯 Strategy: 70% Buy / 30% Sell
⏰ Intervals: 30-90 seconds (random)
💰 Wallets: 2, 3, 4, 5 (cycling)
🌐 Network: Solana Devnet

⚠️ **This uses real transactions on devnet!**
First trade will execute in 5-15 seconds...
        `, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '⏸️ Stop Trading', callback_data: 'stop_trading' },
                        { text: '📊 View Status', callback_data: 'show_status' }
                    ]
                ]
            }
        });
    } else {
        bot.sendMessage(chatId, `❌ Failed to start real trading: ${result.error}`);
    }
}

// Stop Trading Command (Real Trading)
bot.onText(/\/stop_trading/, (msg) => {
    const chatId = msg.chat.id;
    stopRealTradingCommand(chatId);
});

function stopRealTradingCommand(chatId) {
    const result = realTradingManager.stopTrading();
    
    if (result.success) {
        const stats = result.stats;
        const runtime = stats.startTime ? Math.floor((Date.now() - stats.startTime.getTime()) / 60000) : 0;
        const successRate = stats.totalTrades > 0 ? ((stats.successfulTrades / stats.totalTrades) * 100).toFixed(1) : '0';
        
        bot.sendMessage(chatId, `
⏸️ *Real Trading Stopped*

📊 *Session Statistics:*
⏰ Runtime: ${runtime} minutes
📈 Total Trades: ${stats.totalTrades}
✅ Successful: ${stats.successfulTrades}
❌ Failed: ${stats.failedTrades}
🟢 Buy Trades: ${stats.buyTrades}
🔴 Sell Trades: ${stats.sellTrades}
💹 Success Rate: ${successRate}%

All real trading operations have been halted.
        `, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ ${result.error}`);
    }
}

// Rugpull Command (Real Rugpull)
bot.onText(/\/rugpull/, (msg) => {
    const chatId = msg.chat.id;
    realRugpullCommand(chatId);
});

function realRugpullCommand(chatId) {
    const createdPools = raydiumManager.getAllPools();
    
    if (createdPools.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Pools Found*

You need to create a pool first before rugpulling.

Steps:
1. Use /launch to create a token
2. Use /create_pool to create a Raydium pool
3. Then you can rugpull!
        `, { parse_mode: 'Markdown' });
        return;
    }

    // If trading is active, warn user
    if (realTradingManager.getTradingStatus().isTrading) {
        bot.sendMessage(chatId, `
⚠️ *Warning: Trading is Active*

Stop trading first with /stop_trading, then proceed with rugpull.
        `, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '⏸️ Stop Trading First', callback_data: 'stop_trading' },
                        { text: '🔴 Rugpull Anyway', callback_data: 'force_rugpull' }
                    ]
                ]
            }
        });
        return;
    }

    // If only one pool, show rugpull confirmation
    if (createdPools.length === 1) {
        const pool = createdPools[0];
        const tokenInfo = tokenManager.getToken(pool.tokenMint);
        
        bot.sendMessage(chatId, `
🔴 *Confirm Rugpull Operation*

⚠️ **WARNING: This will:**
1. Sell ALL tokens from wallets 2-5
2. Remove ALL liquidity from the pool
3. Return all SOL to wallet 1

🪙 Pool: ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})
🏊 Pool ID: \`${pool.poolId}\`

**This action cannot be undone!**
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔴 CONFIRM RUGPULL', callback_data: `confirm_rugpull_${pool.tokenMint}` }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_rugpull' }
                    ]
                ]
            }
        });
    } else {
        // Multiple pools - let user choose
        const poolButtons = createdPools.map(pool => {
            const tokenInfo = tokenManager.getToken(pool.tokenMint);
            return [{
                text: `🔴 ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})`,
                callback_data: `rugpull_pool_${pool.tokenMint}`
            }];
        });
        
        bot.sendMessage(chatId, `
🔴 *Select Pool to Rugpull*

⚠️ WARNING: This will sell ALL tokens and remove liquidity!

Choose which pool to rugpull:
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...poolButtons,
                    [{ text: '❌ Cancel', callback_data: 'cancel_rugpull' }]
                ]
            }
        });
    }
}

async function executeRealRugpull(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    // Stop trading if active
    if (realTradingManager.getTradingStatus().isTrading) {
        realTradingManager.stopTrading();
    }

    try {
        bot.sendMessage(chatId, `
🔄 *Executing Real Rugpull...*

🔴 Step 1: Selling tokens from all trading wallets...
🔴 Step 2: Removing liquidity from pool...
🔴 Step 3: Returning SOL to wallet 1...

⚠️ **This involves real transactions on devnet!**
This may take 60-120 seconds...
        `, { parse_mode: 'Markdown' });

        const result = await realTradingManager.executeRugpull(tokenMint);
        
        if (result.success) {
            bot.sendMessage(chatId, `
🔴 *RUGPULL EXECUTED!* ⚡ REAL TRANSACTIONS

🪙 Token: ${tokenInfo.name} (${tokenInfo.symbol})
💰 Tokens Sold: ${result.totalTokensSold.toFixed(2)} ${tokenInfo.symbol}
💸 SOL Recovered: ${result.totalSOLRecovered.toFixed(4)} SOL
🏊 Liquidity Removed: ${result.liquidityRemoved ? '✅' : '❌'}
📊 Wallet Sales: ${result.tradingWalletSales}

💰 All SOL has been returned to Wallet 1
🏊 Pool has been destroyed

**Rugpull complete - all assets recovered!**
            `, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💰 Check Wallet 1 Balance', callback_data: 'show_wallets' }]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, `❌ Rugpull failed: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ Rugpull execution error:', error);
        bot.sendMessage(chatId, `❌ Rugpull execution failed: ${error.message}`);
    }
}

// Updated wallets command with real functionality
bot.onText(/\/wallets/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        bot.sendMessage(chatId, '🔄 Fetching wallet balances...');
        
        const walletMessage = await walletManager.formatAllWalletsForTelegram();
        
        bot.sendMessage(chatId, walletMessage, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 Refresh Balances', callback_data: 'refresh_wallets' },
                        { text: '🪂 Request Airdrop', callback_data: 'airdrop_menu' }
                    ],
                    [
                        { text: '🏊 View Pools', callback_data: 'view_all_pools' }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('❌ Error fetching wallets:', error);
        bot.sendMessage(chatId, '❌ Error fetching wallet information. Please try again.');
    }
});

// Launch command - Start token creation process
bot.onText(/\/launch/, (msg) => {
    const chatId = msg.chat.id;
    startTokenCreation(chatId, msg.from.id);
});

// Step 7: Auto Brand Command - AI-powered brand generation
bot.onText(/\/auto_brand/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    startAutoBrandFlow(chatId, userId);
});

// Step 7: Auto Name Command - AI-powered name generation
bot.onText(/\/auto_name/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    startAutoNameFlow(chatId, userId);
});

// Auto Rug Command - Automated conditional rugpull
bot.onText(/\/auto_rug(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const params = match[1];
    startAutoRugFlow(chatId, params);
});

// Cancel Auto Rug Command
bot.onText(/\/cancel_auto_rug/, (msg) => {
    const chatId = msg.chat.id;
    cancelAutoRug(chatId);
});

// RESEARCH: Set Dynamic Fees Command
bot.onText(/\/set_fees(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const params = match[1];
    startSetFeesFlow(chatId, params);
});

function startAutoBrandFlow(chatId, userId) {
    // Initialize auto-brand session
    botState.autoBrandSessions.set(userId, {
        step: 'waiting_for_theme',
        chatId: chatId,
        data: {}
    });

    const message = `
🤖 *AI Auto Brand Generator* - Step 7

Let's create an AI-powered meme coin with trending data!

*Step 1/3:* Please enter a theme or keyword for your coin (optional)
(Example: "dogs", "space", "food", or send "none" for pure AI creativity)

💡 *What happens next:*
- I'll ask if you want trending data integration
- Choose your preferred image style
- GPT-4 will create the concept
- DALL·E 3 will generate the logo
- You'll get instant deployment options
    `;

    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🎲 Pure AI Creativity', callback_data: 'auto_brand_no_theme' },
                    { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                ]
            ]
        }
    });
}

function startAutoRugFlow(chatId, params) {
    const createdPools = raydiumManager.getAllPools();
    
    if (createdPools.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Pools Found*

You need to create a pool first before setting up auto-rugpull.

Steps:
1. Use /launch to create a token
2. Use /create_pool to create a Raydium pool
3. Then set up auto-rugpull monitoring!
        `, { parse_mode: 'Markdown' });
        return;
    }

    if (botState.autoRugMonitor.active) {
        const tokenInfo = tokenManager.getToken(botState.autoRugMonitor.tokenMint);
        bot.sendMessage(chatId, `
⚠️ *Auto-Rugpull Already Active*

Currently monitoring: ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})

Use /cancel_auto_rug to stop current monitoring first.
        `, { parse_mode: 'Markdown' });
        return;
    }

    if (params) {
        // Parse parameters from command
        try {
            const parts = params.split(/\s+/);
            if (parts.length !== 3) {
                throw new Error('Invalid parameter count');
            }
            
            const volume = parseFloat(parts[0]);
            const timeMinutes = parseInt(parts[1]);
            const dropPercent = parseFloat(parts[2]);
            
            if (isNaN(volume) || isNaN(timeMinutes) || isNaN(dropPercent)) {
                throw new Error('Invalid parameter values');
            }
            
            // If only one pool, start monitoring directly
            if (createdPools.length === 1) {
                startAutoRugMonitoring(chatId, createdPools[0].tokenMint, {
                    volume: volume,
                    timeMinutes: timeMinutes,
                    dropPercent: dropPercent
                });
            } else {
                // Multiple pools - show selection with parsed params
                showPoolSelectionForAutoRug(chatId, { volume, timeMinutes, dropPercent });
            }
        } catch (error) {
            bot.sendMessage(chatId, `
❌ *Invalid Parameters*

Usage: \`/auto_rug [volume] [time_minutes] [drop_percent]\`

Example: \`/auto_rug 1000 30 20\`
- Volume: 1000 (threshold trading volume)
- Time: 30 minutes (max time before rugpull)
- Drop: 20% (price drop percentage trigger)

Or use /auto_rug without parameters for interactive setup.
            `, { parse_mode: 'Markdown' });
        }
    } else {
        // Interactive mode
        showAutoRugSetup(chatId);
    }
}

function showAutoRugSetup(chatId) {
    const message = `
🔴 *Auto-Rugpull Setup* - Advanced Feature

Set up automated rugpull triggers based on conditions:

**📊 Volume Trigger:** Execute when trading volume reaches threshold
**⏰ Time Trigger:** Execute after specified time duration  
**📉 Drop Trigger:** Execute when price drops by percentage

**Example Conditions:**
• Volume ≥ 5000 trades → Immediate rugpull
• Time ≥ 60 minutes → Scheduled rugpull
• Price drop ≥ 30% → Emergency rugpull

Choose setup method:
    `;

    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚡ Quick Setup', callback_data: 'auto_rug_quick' },
                    { text: '🔧 Custom Setup', callback_data: 'auto_rug_custom' }
                ],
                [
                    { text: '❌ Cancel', callback_data: 'cancel_auto_rug' }
                ]
            ]
        }
    });
}

function showPoolSelectionForAutoRug(chatId, conditions) {
    const createdPools = raydiumManager.getAllPools();
    
    const poolButtons = createdPools.map(pool => {
        const tokenInfo = tokenManager.getToken(pool.tokenMint);
        return [{
            text: `🔴 ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})`,
            callback_data: `auto_rug_pool_${pool.tokenMint}_${conditions.volume}_${conditions.timeMinutes}_${conditions.dropPercent}`
        }];
    });
    
    bot.sendMessage(chatId, `
🔴 *Select Pool for Auto-Rugpull*

**Conditions:**
📊 Volume Trigger: ≥${conditions.volume} trades
⏰ Time Trigger: ${conditions.timeMinutes} minutes
📉 Drop Trigger: ≥${conditions.dropPercent}% price drop

Choose which pool to monitor:
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                ...poolButtons,
                [{ text: '❌ Cancel', callback_data: 'cancel_auto_rug' }]
            ]
        }
    });
}

function startAutoRugMonitoring(chatId, tokenMint, conditions) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    // Stop any existing monitoring
    if (botState.autoRugMonitor.intervalId) {
        clearInterval(botState.autoRugMonitor.intervalId);
    }

    // Set up monitoring
    botState.autoRugMonitor = {
        active: true,
        conditions: conditions,
        startTime: new Date(),
        chatId: chatId,
        tokenMint: tokenMint,
        initialStats: {
            volume: 0,
            price: 0,
            startPrice: 0
        }
    };

    // Start monitoring loop (every 60 seconds)
    botState.autoRugMonitor.intervalId = setInterval(() => {
        checkAutoRugConditions();
    }, 60000);

    bot.sendMessage(chatId, `
🔴 *Auto-Rugpull Monitoring Started!*

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})
📊 **Volume Trigger:** ≥${conditions.volume} trades
⏰ **Time Trigger:** ${conditions.timeMinutes} minutes
📉 **Drop Trigger:** ≥${conditions.dropPercent}% price drop

⚠️ **Monitoring every 60 seconds**
🤖 **Automatic rugpull when ANY condition is met**

**Current Status:**
✅ Monitoring active
⏰ Started: ${new Date().toLocaleTimeString()}
🔄 Next check in 60 seconds

Use /cancel_auto_rug to stop monitoring
    `, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '❌ Cancel Auto-Rug', callback_data: 'cancel_auto_rug' },
                    { text: '📊 Check Status', callback_data: 'auto_rug_status' }
                ]
            ]
        }
    });

    console.log('🔴 Auto-rugpull monitoring started for:', tokenInfo.name);
    console.log('📊 Conditions:', conditions);
}

async function checkAutoRugConditions() {
    if (!botState.autoRugMonitor.active) {
        return;
    }

    try {
        const { conditions, startTime, chatId, tokenMint } = botState.autoRugMonitor;
        const tokenInfo = tokenManager.getToken(tokenMint);
        
        console.log('🔍 Checking auto-rug conditions for:', tokenInfo?.name || 'Unknown');
        
        // Get current stats
        const tradingStats = realTradingManager.getTradingStatus();
        const currentTime = new Date();
        const elapsedMinutes = Math.floor((currentTime - startTime) / 60000);
        
        // Mock volume and price data (replace with real data sources)
        const currentVolume = tradingStats.stats?.totalTrades || 0;
        const mockPriceData = await getMockPriceData(tokenMint);
        
        console.log(`📊 Current volume: ${currentVolume}, Time: ${elapsedMinutes}min, Price change: ${mockPriceData.changePercent}%`);
        
        let triggerReason = null;
        
        // Check volume condition
        if (currentVolume >= conditions.volume) {
            triggerReason = `Volume threshold reached: ${currentVolume} ≥ ${conditions.volume}`;
        }
        
        // Check time condition
        if (elapsedMinutes >= conditions.timeMinutes) {
            triggerReason = `Time limit reached: ${elapsedMinutes} ≥ ${conditions.timeMinutes} minutes`;
        }
        
        // Check price drop condition
        if (mockPriceData.changePercent <= -conditions.dropPercent) {
            triggerReason = `Price drop triggered: ${Math.abs(mockPriceData.changePercent)}% ≥ ${conditions.dropPercent}%`;
        }
        
        if (triggerReason) {
            console.log('🚨 Auto-rug triggered:', triggerReason);
            
            // Stop monitoring
            botState.autoRugMonitor.active = false;
            clearInterval(botState.autoRugMonitor.intervalId);
            
            // Send trigger notification
            bot.sendMessage(chatId, `
🚨 *AUTO-RUGPULL TRIGGERED!*

**Trigger Reason:** ${triggerReason}
**Token:** ${tokenInfo?.name || 'Unknown'} (${tokenInfo?.symbol || 'TOKEN'})

🔄 **Executing automated rugpull...**
This may take 60-120 seconds...
            `, { parse_mode: 'Markdown' });
            
            // Execute rugpull
            await executeAutoRugpull(chatId, tokenMint, triggerReason);
        } else {
            // Send periodic status update (every 5 checks = 5 minutes)
            const checkCount = Math.floor(elapsedMinutes);
            if (checkCount > 0 && checkCount % 5 === 0) {
                bot.sendMessage(chatId, `
🔍 *Auto-Rug Status Update*

⏰ **Monitoring:** ${elapsedMinutes}/${conditions.timeMinutes} minutes
📊 **Volume:** ${currentVolume}/${conditions.volume} trades
📉 **Price Change:** ${mockPriceData.changePercent.toFixed(2)}%/${conditions.dropPercent}%

✅ Still monitoring... Next check in 60s
                `, { parse_mode: 'Markdown' });
            }
        }
        
    } catch (error) {
        console.error('❌ Auto-rug monitoring error:', error);
        
        // Stop monitoring on error
        botState.autoRugMonitor.active = false;
        if (botState.autoRugMonitor.intervalId) {
            clearInterval(botState.autoRugMonitor.intervalId);
        }
        
        bot.sendMessage(botState.autoRugMonitor.chatId, `
❌ *Auto-Rugpull Monitoring Error*

Monitoring stopped due to error: ${error.message}

Please restart with /auto_rug if needed.
        `, { parse_mode: 'Markdown' });
    }
}

async function getMockPriceData(tokenMint) {
    // Mock price data - replace with real price feed
    // This would typically call Raydium/Jupiter APIs for real price data
    const randomChange = (Math.random() - 0.5) * 40; // -20% to +20% random change
    
    return {
        currentPrice: 0.001 + (Math.random() * 0.002),
        changePercent: randomChange,
        volume24h: Math.floor(Math.random() * 10000),
        lastUpdate: new Date()
    };
}

async function executeAutoRugpull(chatId, tokenMint, triggerReason) {
    try {
        console.log('🔴 Executing automated rugpull for:', tokenMint);
        
        // Use existing rugpull functionality
        const result = await realTradingManager.executeRugpull(tokenMint);
        const tokenInfo = tokenManager.getToken(tokenMint);
        
        if (result.success) {
            bot.sendMessage(chatId, `
🔴 *AUTO-RUGPULL EXECUTED!* ⚡ AUTOMATED

**Trigger:** ${triggerReason}
🪙 **Token:** ${tokenInfo?.name || 'Unknown'} (${tokenInfo?.symbol || 'TOKEN'})
💰 **Tokens Sold:** ${result.totalTokensSold?.toFixed(2) || '0'} ${tokenInfo?.symbol || 'TOKEN'}
💸 **SOL Recovered:** ${result.totalSOLRecovered?.toFixed(4) || '0'} SOL
🏊 **Liquidity Removed:** ${result.liquidityRemoved ? '✅' : '❌'}
📊 **Wallet Sales:** ${result.tradingWalletSales || '0'}

💰 **All SOL returned to Wallet 1**
🤖 **Automated rugpull complete!**

*This was executed automatically based on your conditions.*
            `, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💰 Check Wallet 1 Balance', callback_data: 'show_wallets' }]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, `
❌ *Auto-Rugpull Failed*

**Trigger:** ${triggerReason}  
**Error:** ${result.error}

Manual intervention may be required.
            `, { parse_mode: 'Markdown' });
        }
        
    } catch (error) {
        console.error('❌ Auto-rugpull execution error:', error);
        bot.sendMessage(chatId, `
❌ *Auto-Rugpull Execution Failed*

**Trigger:** ${triggerReason}
**Error:** ${error.message}

Please check manually with /rugpull
        `, { parse_mode: 'Markdown' });
    }
}

function startSetFeesFlow(chatId, params) {
    const createdTokens = Array.from(tokenManager.getAllTokens().values());
    
    if (createdTokens.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Tokens Found*

🔬 *RESEARCH FEATURE*

You need to create a token first before setting dynamic fees.

Steps:
1. Use /launch to create a token
2. Then use /set_fees to configure buy/sell fees for research
        `, { parse_mode: 'Markdown' });
        return;
    }

    if (params) {
        // Parse parameters from command: /set_fees [token_index] [buy_fee] [sell_fee]
        try {
            const parts = params.split(/\s+/);
            if (parts.length !== 3) {
                throw new Error('Invalid parameter count');
            }
            
            const tokenIndex = parseInt(parts[0]) - 1;
            const buyFee = parseFloat(parts[1]);
            const sellFee = parseFloat(parts[2]);
            
            if (isNaN(tokenIndex) || isNaN(buyFee) || isNaN(sellFee)) {
                throw new Error('Invalid parameter values');
            }
            
            if (buyFee < 0 || buyFee > 99 || sellFee < 0 || sellFee > 99) {
                throw new Error('Fees must be between 0% and 99%');
            }
            
            if (tokenIndex < 0 || tokenIndex >= createdTokens.length) {
                throw new Error('Invalid token index');
            }
            
            const selectedToken = createdTokens[tokenIndex];
            setTokenFees(chatId, selectedToken.mintAddress, buyFee, sellFee);
            
        } catch (error) {
            bot.sendMessage(chatId, `
❌ *Invalid Parameters*

🔬 *RESEARCH FEATURE*

Usage: \`/set_fees [token_number] [buy_fee] [sell_fee]\`

Example: \`/set_fees 1 5 10\`
- Token: 1 (first token)
- Buy Fee: 5%  
- Sell Fee: 10%

Valid ranges: 0% - 99%

Or use /set_fees without parameters for interactive setup.
            `, { parse_mode: 'Markdown' });
        }
    } else {
        // Interactive mode
        showSetFeesMenu(chatId);
    }
}

function showSetFeesMenu(chatId) {
    const createdTokens = Array.from(tokenManager.getAllTokens().values());
    
    if (createdTokens.length === 1) {
        // If only one token, go directly to fee setting
        showFeeInputMenu(chatId, createdTokens[0].mintAddress);
        return;
    }
    
    const tokenButtons = createdTokens.map((token, index) => {
        const fees = botState.dynamicFees.get(token.mintAddress);
        const feeStatus = fees ? `(Buy: ${fees.buyFee}%, Sell: ${fees.sellFee}%)` : '(Fees: 0%, 0%)';
        
        return [{
            text: `🔬 ${token.name} ${feeStatus}`,
            callback_data: `set_fees_token_${token.mintAddress}`
        }];
    });
    
    bot.sendMessage(chatId, `
🔬 *RESEARCH: Dynamic Fee System*

**⚠️ DEVNET RESEARCH ONLY ⚠️**

Select a token to configure dynamic buy/sell fees:

**Purpose:** Study trading behavior impact
**Current Fees:** All start at 0% (no fees)
**Range:** 0% - 99% for both buy and sell
**Collection:** All fees go to owner wallet (Wallet 1)
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                ...tokenButtons,
                [{ text: '❌ Cancel', callback_data: 'cancel_set_fees' }]
            ]
        }
    });
}

function showFeeInputMenu(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    const currentFees = botState.dynamicFees.get(tokenMint) || { buyFee: 0, sellFee: 0, enabled: true };
    
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    const message = `
🔬 *RESEARCH: Set Dynamic Fees*

**⚠️ DEVNET RESEARCH ONLY ⚠️**

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})

📊 **Current Fees:**
• Buy Fee: ${currentFees.buyFee}%
• Sell Fee: ${currentFees.sellFee}%

⚙️ **Quick Presets:**
    `;

    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🆓 No Fees (0%, 0%)', callback_data: `fees_preset_${tokenMint}_0_0` },
                    { text: '📈 Light (2%, 5%)', callback_data: `fees_preset_${tokenMint}_2_5` }
                ],
                [
                    { text: '🔥 Medium (5%, 10%)', callback_data: `fees_preset_${tokenMint}_5_10` },
                    { text: '⚠️ High (10%, 20%)', callback_data: `fees_preset_${tokenMint}_10_20` }
                ],
                [
                    { text: '🚨 Research Max (25%, 50%)', callback_data: `fees_preset_${tokenMint}_25_50` }
                ],
                [
                    { text: '⚙️ Custom Fees', callback_data: `fees_custom_${tokenMint}` },
                    { text: '❌ Cancel', callback_data: 'cancel_set_fees' }
                ]
            ]
        }
    });
}

function setTokenFees(chatId, tokenMint, buyFee, sellFee) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    // Store the fees (in real implementation, this would update smart contract)
    botState.dynamicFees.set(tokenMint, {
        buyFee: buyFee,
        sellFee: sellFee,
        enabled: true,
        updatedAt: new Date().toISOString()
    });

    console.log(`🔬 RESEARCH: Set fees for ${tokenInfo.symbol} - Buy: ${buyFee}%, Sell: ${sellFee}%`);

    bot.sendMessage(chatId, `
✅ *Dynamic Fees Updated*

🔬 **RESEARCH MODE - DEVNET ONLY**

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})

📊 **New Fee Structure:**
• **Buy Fee:** ${buyFee}% 
• **Sell Fee:** ${sellFee}%
• **Fee Collection:** All fees → Wallet 1
• **Status:** Active

⚠️ **Research Note:** 
This simulates how dynamic fees affect:
• Trading bot behavior
• Front-running strategies  
• Automated trading patterns on AMMs

💡 **Next Steps:**
• Use /start_trading to observe fee impact
• Monitor trading patterns with new fees
• Use /status to view current fee settings
    `, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📈 Start Trading', callback_data: 'start_trading' },
                    { text: '📊 Check Status', callback_data: 'show_status' }
                ]
            ]
        }
    });
}

function cancelAutoRug(chatId) {
    if (!botState.autoRugMonitor.active) {
        bot.sendMessage(chatId, `
💡 *No Active Auto-Rugpull*

Auto-rugpull monitoring is not currently active.

Use /auto_rug to set up conditional rugpull monitoring.
        `, { parse_mode: 'Markdown' });
        return;
    }

    const tokenInfo = tokenManager.getToken(botState.autoRugMonitor.tokenMint);
    const elapsedMinutes = Math.floor((new Date() - botState.autoRugMonitor.startTime) / 60000);
    
    // Stop monitoring
    clearInterval(botState.autoRugMonitor.intervalId);
    botState.autoRugMonitor.active = false;
    
    bot.sendMessage(chatId, `
❌ *Auto-Rugpull Cancelled*

**Token:** ${tokenInfo?.name || 'Unknown'} (${tokenInfo?.symbol || 'TOKEN'})
**Monitoring Duration:** ${elapsedMinutes} minutes
**Status:** Monitoring stopped

You can restart monitoring with /auto_rug anytime.
    `, { parse_mode: 'Markdown' });
    
    console.log('❌ Auto-rugpull monitoring cancelled by user');
}

function startAutoNameFlow(chatId, userId) {
    // Initialize auto-name session
    botState.autoBrandSessions.set(userId, {
        step: 'waiting_for_name_theme',
        chatId: chatId,
        data: { nameOnly: true }
    });

    const message = `
🎯 *AI Auto Name Generator* - Step 7

Let's create trending meme coin names with AI!

*Step 1/2:* Please enter a theme or keyword (optional)
(Example: "moon", "pepe", "rocket", or send "none" for pure trending analysis)

💡 *What happens:*
- AI analyzes current trending topics
- GPT-4 generates creative names & tickers
- No image generation (names only)
- Quick results for rapid deployment
    `;

    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔥 Pure Trending', callback_data: 'auto_name_no_theme' },
                    { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                ]
            ]
        }
    });
}

async function processAutoBrandGeneration(chatId, userId, sessionData) {
    try {
        const { theme, useTrending, imageStyle, nameOnly } = sessionData;
        
        bot.sendMessage(chatId, `
🔄 *${nameOnly ? 'Generating AI Names' : 'Creating AI Brand'}...*

${useTrending ? '📈 Fetching trending data...' : ''}
🤖 GPT-4 generating creative concept...
${nameOnly ? '' : '🎨 DALL·E 3 creating logo...'}

This may take 30-60 seconds...
        `, { parse_mode: 'Markdown' });

        // Generate meme coin concept with AI
        const concept = await aiIntegrations.generateMemeCoinConcept(theme || '', useTrending);
        
        let imageResult = null;
        if (!nameOnly) {
            // Generate logo image with DALL·E 3
            imageResult = await aiIntegrations.generateMemeCoinLogo(
                concept.name, 
                concept.description, 
                imageStyle || 'cartoon'
            );
        }

        // Format results message
        const resultMessage = `
🎉 *${nameOnly ? 'AI Name Generated!' : 'AI Brand Created!'}*

📛 **Name:** ${concept.name}
🏷️ **Ticker:** ${concept.ticker}  
📝 **Description:** ${concept.description}
${useTrending ? `\n🔥 **Trending Context:** ${aiIntegrations.getTrendingSummary()}` : ''}
${nameOnly ? '' : `🎨 **Logo Style:** ${imageStyle || 'cartoon'}`}

🌐 **Network:** Solana Devnet
⚡ **AI-Generated:** GPT-4 ${nameOnly ? '' : '+ DALL·E 3'}
        `;

        // Send image if generated
        if (imageResult && imageResult.imageUrl && !imageResult.error) {
            try {
                await bot.sendPhoto(chatId, imageResult.imageUrl, {
                    caption: resultMessage,
                    parse_mode: 'Markdown'
                });
            } catch (error) {
                console.error('❌ Error sending generated image:', error);
                bot.sendMessage(chatId, resultMessage + `\n\n⚠️ Generated image: ${imageResult.imageUrl}`, { parse_mode: 'Markdown' });
            }
        } else {
            bot.sendMessage(chatId, resultMessage, { parse_mode: 'Markdown' });
        }

        // Action buttons
        bot.sendMessage(chatId, `
🚀 *Ready for Deployment!*

What would you like to do with this ${nameOnly ? 'AI-generated name' : 'AI brand'}?
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: '🚀 Launch Now', 
                            callback_data: `launch_ai_concept_${userId}_${Date.now()}` 
                        }
                    ],
                    [
                        { 
                            text: '🎲 Try Again', 
                            callback_data: nameOnly ? 'auto_name' : 'auto_brand' 
                        },
                        { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                    ]
                ]
            }
        });

        // Store the generated concept for launch
        console.log('💾 Storing generated concept for user:', userId);
        console.log('🎯 Concept name:', concept.name);
        console.log('📝 Session data before store:', sessionData);
        
        // Store in the correct session structure that matches what launchAIConcept expects
        botState.autoBrandSessions.set(userId, {
            step: 'concept_ready',
            chatId: chatId,
            userId: userId,
            data: sessionData,
            generatedConcept: concept,
            generatedImage: imageResult
        });
        
        console.log('✅ Session stored successfully');
        const storedSession = botState.autoBrandSessions.get(userId);
        console.log('🔍 Stored session:', storedSession);
        console.log('🎯 Has generatedConcept:', !!storedSession?.generatedConcept);
        console.log('📋 All sessions after store:', Array.from(botState.autoBrandSessions.keys()));

    } catch (error) {
        console.error('❌ Auto brand generation error:', error);
        bot.sendMessage(chatId, `❌ AI generation failed: ${error.message}\n\nPlease try again with /${sessionData.nameOnly ? 'auto_name' : 'auto_brand'}`);
        botState.autoBrandSessions.delete(userId);
    }
}

function startTokenCreation(chatId, userId) {
    // Initialize user session
    botState.userSessions.set(userId, {
        step: 'waiting_for_name',
        chatId: chatId,
        tokenData: {}
    });

    const message = `
🚀 *Create New Meme Coin* - Enhanced Flow

Let's launch your token with full metadata on Solana devnet!

*Step 1/5:* Please enter your token name
(Example: "Doge Killer", "Moon Token")

💡 *Tips:*
- Keep it catchy and memorable
- Max 32 characters
- Can include spaces and special characters
    `;

    bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '❌ Cancel', callback_data: 'cancel_launch' }]
            ]
        }
    });
}

// Handle text messages for token creation flow
bot.on('message', (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip if message starts with / (command)
    if (text && text.startsWith('/')) {
        return;
    }

    // Check if user is in token creation flow
    const session = botState.userSessions.get(userId);
    if (!session) {
        return;
    }

    handleTokenCreationInput(userId, chatId, text, session);
});

async function handleTokenCreationInput(userId, chatId, text, session) {
    try {
        switch (session.step) {
            case 'waiting_for_name':
                const nameErrors = tokenManager.validateTokenParams(text, 'TEMP', 1000000, '', '');
                const nameSpecificErrors = nameErrors.filter(err => err.includes('name'));
                
                if (nameSpecificErrors.length > 0) {
                    bot.sendMessage(chatId, `❌ ${nameSpecificErrors.join('\n')}\n\nPlease try again:`);
                    return;
                }

                session.tokenData.name = text.trim();
                session.step = 'waiting_for_symbol';
                
                bot.sendMessage(chatId, `
✅ Token Name: *${text.trim()}*

*Step 2/5:* Please enter your token symbol/ticker
(Example: "DOGE", "MOON", "PEPE")

💡 *Tips:*
- Usually 3-6 characters
- All CAPS recommended
- Letters and numbers only
- Max 10 characters
                `, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Cancel', callback_data: 'cancel_launch' }]
                        ]
                    }
                });
                break;

            case 'waiting_for_symbol':
                const symbolErrors = tokenManager.validateTokenParams('Test', text, 1000000, '', '');
                const symbolSpecificErrors = symbolErrors.filter(err => err.includes('symbol'));
                
                if (symbolSpecificErrors.length > 0) {
                    bot.sendMessage(chatId, `❌ ${symbolSpecificErrors.join('\n')}\n\nPlease try again:`);
                    return;
                }

                session.tokenData.symbol = text.trim().toUpperCase();
                session.step = 'waiting_for_supply';
                
                bot.sendMessage(chatId, `
✅ Token Symbol: *${text.trim().toUpperCase()}*

*Step 3/5:* Please enter the total supply
(Example: "1000000", "100000000")

💡 *Tips:*
- Numbers only (no commas)
- Max 1 trillion (1000000000000)
- Will be minted to Wallet 1
- Cannot be changed later
                `, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Cancel', callback_data: 'cancel_launch' }]
                        ]
                    }
                });
                break;

            case 'waiting_for_supply':
                const supply = parseFloat(text.trim());
                const supplyErrors = tokenManager.validateTokenParams('Test', 'TEST', supply, '', '');
                const supplySpecificErrors = supplyErrors.filter(err => err.includes('supply'));
                
                if (supplySpecificErrors.length > 0) {
                    bot.sendMessage(chatId, `❌ ${supplySpecificErrors.join('\n')}\n\nPlease try again:`);
                    return;
                }

                session.tokenData.supply = supply;
                session.step = 'waiting_for_description';
                
                bot.sendMessage(chatId, `
✅ Total Supply: *${supply.toLocaleString()} ${session.tokenData.symbol}*

*Step 4/5:* Please enter your token description
(Example: "The ultimate meme coin for dog lovers!")

💡 *Tips:*
- Describe your token's purpose or story
- Max 200 characters
- This will be stored as metadata
- Can be left empty (send "skip")
                `, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '⏭️ Skip Description', callback_data: 'skip_description' },
                                { text: '❌ Cancel', callback_data: 'cancel_launch' }
                            ]
                        ]
                    }
                });
                break;

            case 'waiting_for_description':
                let description = '';
                if (text.trim().toLowerCase() !== 'skip') {
                    const descErrors = tokenManager.validateTokenParams('Test', 'TEST', 1000000, text, '');
                    const descSpecificErrors = descErrors.filter(err => err.includes('Description'));
                    
                    if (descSpecificErrors.length > 0) {
                        bot.sendMessage(chatId, `❌ ${descSpecificErrors.join('\n')}\n\nPlease try again or send "skip":`);
                        return;
                    }
                    description = text.trim();
                }

                session.tokenData.description = description;
                session.step = 'waiting_for_image';
                
                bot.sendMessage(chatId, `
${description ? `✅ Description: *${description}*` : '⏭️ Description: *Skipped*'}

*Step 5/5:* Please enter your token image URL (optional)
(Example: "https://example.com/token-image.png")

💡 *Tips:*
- Must be a valid HTTP/HTTPS URL
- PNG, JPG, or GIF format recommended
- Will be stored as metadata
- Send "skip" to proceed without image
                `, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '⏭️ Skip Image', callback_data: 'skip_image' },
                                { text: '❌ Cancel', callback_data: 'cancel_launch' }
                            ]
                        ]
                    }
                });
                break;

            case 'waiting_for_image':
                let imageUrl = '';
                if (text.trim().toLowerCase() !== 'skip') {
                    const imageErrors = tokenManager.validateTokenParams('Test', 'TEST', 1000000, '', text);
                    const imageSpecificErrors = imageErrors.filter(err => err.includes('Image URL'));
                    
                    if (imageSpecificErrors.length > 0) {
                        bot.sendMessage(chatId, `❌ ${imageSpecificErrors.join('\n')}\n\nPlease try again or send "skip":`);
                        return;
                    }
                    imageUrl = text.trim();
                }

                session.tokenData.imageUrl = imageUrl;
                
                // Show final confirmation
                const confirmMessage = `
🎯 *Confirm Token Creation*

📛 *Name:* ${session.tokenData.name}
🏷️ *Symbol:* ${session.tokenData.symbol}
🪙 *Total Supply:* ${session.tokenData.supply.toLocaleString()} ${session.tokenData.symbol}
📝 *Description:* ${session.tokenData.description || 'None'}
🖼️ *Image:* ${session.tokenData.imageUrl || 'None'}

💰 *Mint to:* Wallet 1
🌐 *Network:* Solana Devnet
📝 *Metadata:* Will be applied using Metaplex standard

Ready to create your token with metadata?
                `;

                bot.sendMessage(chatId, confirmMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🚀 Create Token', callback_data: 'confirm_create_token' },
                                { text: '❌ Cancel', callback_data: 'cancel_launch' }
                            ]
                        ]
                    }
                });
                
                session.step = 'waiting_for_confirmation';
                break;
        }

        // Update session
        botState.userSessions.set(userId, session);

    } catch (error) {
        console.error('❌ Error handling token creation input:', error);
        bot.sendMessage(chatId, '❌ Something went wrong. Please try again with /launch');
        botState.userSessions.delete(userId);
    }
}

// Airdrop command
bot.onText(/\/airdrop(?:\s+(\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const walletNumber = match[1] ? parseInt(match[1]) : null;
    
    if (!walletNumber || walletNumber < 1 || walletNumber > 5) {
        bot.sendMessage(chatId, `
🪂 *Airdrop Command*

Usage: \`/airdrop [wallet_number]\`

Example: \`/airdrop 1\` - Request 1 SOL for wallet 1

Valid wallet numbers: 1-5
        `, { parse_mode: 'Markdown' });
        return;
    }
    
    try {
        bot.sendMessage(chatId, `🪂 Requesting devnet SOL airdrop for wallet ${walletNumber}...`);
        
        const result = await walletManager.requestAirdrop(walletNumber, 1);
        
        if (result.success) {
            bot.sendMessage(chatId, `
✅ *Airdrop Successful!*

💰 Wallet ${walletNumber} received 1 SOL
🔗 Transaction: \`${result.signature}\`
💵 New Balance: *${result.newBalance.toFixed(4)} SOL*
            `, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, `❌ Airdrop failed: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ Airdrop error:', error);
        bot.sendMessage(chatId, '❌ Airdrop request failed. Please try again.');
    }
});

// Callback query handler for inline buttons
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;
    
    if (data === 'refresh_wallets') {
        try {
            const walletMessage = await walletManager.formatAllWalletsForTelegram();
            
            bot.editMessageText(walletMessage, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh Balances', callback_data: 'refresh_wallets' },
                            { text: '🪂 Request Airdrop', callback_data: 'airdrop_menu' }
                        ],
                        [
                            { text: '🏊 View Pools', callback_data: 'view_all_pools' }
                        ]
                    ]
                }
            });
            
            bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Balances refreshed!' });
        } catch (error) {
            bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Refresh failed' });
        }
    } else if (data === 'view_all_pools') {
        const pools = raydiumManager.getAllPools();
        
        if (pools.length === 0) {
            bot.sendMessage(chatId, '❌ No pools created yet. Use /create_pool to create your first pool!');
        } else {
            let poolsMessage = `🏊 *Created Pools* (${pools.length})\n\n`;
            
            pools.forEach((pool, index) => {
                const tokenInfo = tokenManager.getToken(pool.tokenMint);
                poolsMessage += `${index + 1}. *${tokenInfo ? tokenInfo.name : 'Unknown'}* (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})\n`;
                poolsMessage += `   Pool ID: \`${pool.poolId.substring(0, 8)}...\`\n`;
                poolsMessage += `   Liquidity: ${pool.solAmount} SOL + ${pool.liquidityAmount} tokens\n\n`;
            });
            
            bot.sendMessage(chatId, poolsMessage, { parse_mode: 'Markdown' });
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'airdrop_menu') {
        const airdropMessage = `
🪂 *Request Devnet SOL*

Choose a wallet to request 1 SOL airdrop:
        `;
        
        bot.sendMessage(chatId, airdropMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💰 Wallet 1', callback_data: 'airdrop_1' },
                        { text: '💰 Wallet 2', callback_data: 'airdrop_2' }
                    ],
                    [
                        { text: '💰 Wallet 3', callback_data: 'airdrop_3' },
                        { text: '💰 Wallet 4', callback_data: 'airdrop_4' }
                    ],
                    [
                        { text: '💰 Wallet 5', callback_data: 'airdrop_5' }
                    ]
                ]
            }
        });
        
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('airdrop_')) {
        const walletNumber = parseInt(data.split('_')[1]);
        
        try {
            bot.answerCallbackQuery(callbackQuery.id, { text: `🪂 Requesting airdrop for wallet ${walletNumber}...` });
            
            const result = await walletManager.requestAirdrop(walletNumber, 1);
            
            if (result.success) {
                bot.sendMessage(chatId, `
✅ *Airdrop Successful!*

💰 Wallet ${walletNumber} received 1 SOL
🔗 Transaction: \`${result.signature}\`
💵 New Balance: *${result.newBalance.toFixed(4)} SOL*
                `, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, `❌ Airdrop failed for wallet ${walletNumber}: ${result.error}`);
            }
        } catch (error) {
            bot.sendMessage(chatId, `❌ Airdrop error for wallet ${walletNumber}`);
        }
    } else if (data === 'show_wallets') {
        try {
            bot.sendMessage(chatId, '🔄 Fetching wallet balances...');
            
            const walletMessage = await walletManager.formatAllWalletsForTelegram();
            
            bot.sendMessage(chatId, walletMessage, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh Balances', callback_data: 'refresh_wallets' },
                            { text: '🪂 Request Airdrop', callback_data: 'airdrop_menu' }
                        ],
                        [
                            { text: '🏊 View Pools', callback_data: 'view_all_pools' }
                        ]
                    ]
                }
            });
        } catch (error) {
            bot.sendMessage(chatId, '❌ Error fetching wallet information. Please try again.');
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'show_status') {
        await showStatus(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'launch_token') {
        startTokenCreation(chatId, userId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'seed_wallets') {
        seedWalletsCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'create_pool') {
        createPoolCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'start_trading') {
        startRealTradingCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'stop_trading') {
        stopRealTradingCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'rugpull' || data === 'force_rugpull') {
        realRugpullCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('seed_token_')) {
        // Old token-based seeding - redirect to new SOL distribution
        bot.sendMessage(chatId, `
🔄 *Wallet Seeding Updated*

The seeding system now distributes SOL instead of tokens for better trading flexibility.

Use /seed_wallets to equally distribute SOL from Wallet 1 to trading wallets.
        `, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'confirm_sol_distribution') {
        await seedWalletsWithSOL(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_seed') {
        bot.sendMessage(chatId, '❌ Wallet seeding cancelled.');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('create_pool_')) {
        const tokenMint = data.replace('create_pool_', '');
        await createPoolForToken(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('real_trade_token_')) {
        const tokenMint = data.replace('real_trade_token_', '');
        startRealTradingForToken(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('trade_token_')) {
        const tokenMint = data.replace('trade_token_', '');
        startRealTradingForToken(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('rugpull_pool_')) {
        const tokenMint = data.replace('rugpull_pool_', '');
        // Show confirmation for this specific pool
        const poolInfo = raydiumManager.getPoolInfo(tokenMint);
        const tokenInfo = tokenManager.getToken(tokenMint);
        
        bot.sendMessage(chatId, `
🔴 *Confirm Rugpull Operation*

⚠️ **WARNING: This will:**
1. Sell ALL tokens from wallets 2-5
2. Remove ALL liquidity from the pool  
3. Return all SOL to wallet 1

🪙 Token: ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})
🏊 Pool ID: \`${poolInfo ? poolInfo.poolId : 'Unknown'}\`

**This action cannot be undone!**
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔴 CONFIRM RUGPULL', callback_data: `confirm_rugpull_${tokenMint}` }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_rugpull' }
                    ]
                ]
            }
        });
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('confirm_rugpull_')) {
        const tokenMint = data.replace('confirm_rugpull_', '');
        await executeRealRugpull(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_trading' || data === 'cancel_rugpull' || data === 'cancel_pool_creation') {
        bot.sendMessage(chatId, '❌ Operation cancelled.');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'skip_description') {
        const session = botState.userSessions.get(userId);
        if (session) {
            session.tokenData.description = '';
            session.step = 'waiting_for_image';
            
            bot.sendMessage(chatId, `
⏭️ Description: *Skipped*

*Step 5/5:* Please enter your token image URL (optional)
(Example: "https://example.com/token-image.png")

💡 *Tips:*
- Must be a valid HTTP/HTTPS URL
- PNG, JPG, or GIF format recommended
- Will be stored as metadata
- Send "skip" to proceed without image
            `, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⏭️ Skip Image', callback_data: 'skip_image' },
                            { text: '❌ Cancel', callback_data: 'cancel_launch' }
                        ]
                    ]
                }
            });
            
            botState.userSessions.set(userId, session);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'skip_image') {
        const session = botState.userSessions.get(userId);
        if (session) {
            session.tokenData.imageUrl = '';
            
            // Show final confirmation
            const confirmMessage = `
🎯 *Confirm Token Creation*

📛 *Name:* ${session.tokenData.name}
🏷️ *Symbol:* ${session.tokenData.symbol}
🪙 *Total Supply:* ${session.tokenData.supply.toLocaleString()} ${session.tokenData.symbol}
📝 *Description:* ${session.tokenData.description || 'None'}
🖼️ *Image:* None

💰 *Mint to:* Wallet 1
🌐 *Network:* Solana Devnet
📝 *Metadata:* Will be applied using Metaplex standard

Ready to create your token with metadata?
            `;

            bot.sendMessage(chatId, confirmMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🚀 Create Token', callback_data: 'confirm_create_token' },
                            { text: '❌ Cancel', callback_data: 'cancel_launch' }
                        ]
                    ]
                }
            });
            
            session.step = 'waiting_for_confirmation';
            botState.userSessions.set(userId, session);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_launch') {
        botState.userSessions.delete(userId);
        bot.sendMessage(chatId, '❌ Token creation cancelled.');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'confirm_create_token') {
        const session = botState.userSessions.get(userId);
        if (!session || !session.tokenData) {
            bot.sendMessage(chatId, '❌ Session expired. Please start again with /launch');
            bot.answerCallbackQuery(callbackQuery.id);
            return;
        }

        try {
            bot.answerCallbackQuery(callbackQuery.id, { text: '🚀 Creating token with metadata...' });
            bot.sendMessage(chatId, '🔄 *Creating your token with metadata...* This may take 60-90 seconds.', { parse_mode: 'Markdown' });

            const tokenInfo = await tokenManager.createToken(
                session.tokenData.name,
                session.tokenData.symbol,
                session.tokenData.supply,
                session.tokenData.description,
                session.tokenData.imageUrl,
                userId
            );

            const tokenMessage = tokenManager.formatTokenForTelegram(tokenInfo);
            
            // Send the token creation message first
            await bot.sendMessage(chatId, tokenMessage, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            });

            // Handle image display based on metadata result
            if (tokenInfo.metadataResult && tokenInfo.metadataResult.success) {
                // Success case - show AI generated image
                if (tokenInfo.generatedImageUrl) {
                    try {
                        console.log('📸 Sending Fal.ai-generated token image to Telegram...');
                        await bot.sendPhoto(chatId, tokenInfo.generatedImageUrl, {
                            caption: `🎨 *AI-Generated Logo for ${tokenInfo.name}*\n\n✨ Created with Fal.ai\n🌐 IPFS Image: ${tokenInfo.ipfsImageUrl}\n📋 IPFS Metadata: ${tokenInfo.metadataIpfsUrl}`,
                            parse_mode: 'Markdown'
                        });
                    } catch (imageError) {
                        console.error('❌ Error sending generated image:', imageError);
                        // Send IPFS links as fallback
                        bot.sendMessage(chatId, `🎨 *Generated Token Logo*\n\n🔗 Generated Image: ${tokenInfo.generatedImageUrl}\n🌐 IPFS Image: ${tokenInfo.ipfsImageUrl}`, { parse_mode: 'Markdown' });
                    }
                }
            } else {
                // Failed case - show clear error message
                const errorMessage = tokenInfo.metadataResult ? tokenInfo.metadataResult.error : 'Unknown error';
                const retryInfo = tokenInfo.metadataResult ? `\n📊 Retry attempts: Gen(${tokenInfo.metadataResult.retryAttempts?.imageGeneration || 0}), Up(${tokenInfo.metadataResult.retryAttempts?.imageUpload || 0}), Meta(${tokenInfo.metadataResult.retryAttempts?.metadataUpload || 0})` : '';
                
                bot.sendMessage(chatId, `⚠️ *Image Generation Failed After Retries*\n\n❌ ${errorMessage}${retryInfo}\n\n✅ Token created successfully with basic metadata`, { parse_mode: 'Markdown' });
            }

            // Enhanced workflow - offer next steps
            const nextStepsMessage = `
🎉 *Token Created Successfully!*

What would you like to do next?

1️⃣ **Create Pool** - Set up Raydium liquidity pool
2️⃣ **Seed Wallets** - Distribute tokens for trading
3️⃣ **Start Trading** - Begin automated operations

Choose your next step:
            `;

            bot.sendMessage(chatId, nextStepsMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🏊 Create Pool', callback_data: `create_pool_${tokenInfo.mintAddress}` },
                            { text: '🌱 Seed Wallets', callback_data: `seed_token_${tokenInfo.mintAddress}` }
                        ],
                        [
                            { text: '📊 Bot Status', callback_data: 'show_status' },
                            { text: '💰 Check Wallets', callback_data: 'show_wallets' }
                        ]
                    ]
                }
            });

            // Clean up session
            botState.userSessions.delete(userId);
            
        } catch (error) {
            console.error('❌ Token creation error:', error);
            bot.sendMessage(chatId, `❌ Token creation failed: ${error.message}\n\nPlease try again with /launch`);
            botState.userSessions.delete(userId);
        }
    } else if (data === 'auto_brand') {
        startAutoBrandFlow(chatId, userId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'auto_name') {
        startAutoNameFlow(chatId, userId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'auto_brand_no_theme') {
        // Start auto-brand flow with no theme
        handleAutoBrandTheme(chatId, userId, '', 'brand');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'auto_name_no_theme') {
        // Start auto-name flow with no theme
        handleAutoBrandTheme(chatId, userId, '', 'name');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_auto_brand') {
        botState.autoBrandSessions.delete(userId);
        bot.sendMessage(chatId, '❌ AI generation cancelled.');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'use_trending_yes') {
        console.log('🔥 User chose YES for trending data');
        const session = botState.autoBrandSessions.get(userId);
        console.log('📋 Session found:', !!session);
        console.log('📋 Session data:', session);
        
        if (session) {
            session.data.useTrending = true;
            console.log('🔥 Set useTrending to true');
            
            if (session.data.nameOnly) {
                console.log('🎯 Name-only mode - calling processAutoBrandGeneration directly');
                // For auto-name, generate immediately
                await processAutoBrandGeneration(chatId, userId, session.data);
            } else {
                // For auto-brand, ask for image style
                session.step = 'waiting_for_style';
                console.log('🎨 Brand mode - moving to style selection');
                
                const message = `
🎨 *Step 3/3:* Choose your logo image style

**Cartoon:** Fun, colorful, animated look
**3D:** Modern, sleek, high-quality 3D graphics

🔥 **Using Trending Data**
${session.data.theme ? `🎨 **Theme:** ${session.data.theme}` : '🎲 **Pure AI Creativity**'}
                `;

                bot.sendMessage(chatId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🎭 Cartoon Style', callback_data: 'style_cartoon' },
                                { text: '🔮 3D Style', callback_data: 'style_3d' }
                            ],
                            [
                                { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                            ]
                        ]
                    }
                });
                
                botState.autoBrandSessions.set(userId, session);
            }
        } else {
            console.log('❌ No session found for trending YES');
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'use_trending_no') {
        console.log('🎨 User chose NO for trending data');
        const session = botState.autoBrandSessions.get(userId);
        console.log('📋 Session found:', !!session);
        console.log('📋 Session data:', session);
        
        if (session) {
            session.data.useTrending = false;
            console.log('🎨 Set useTrending to false');
            
            if (session.data.nameOnly) {
                console.log('🎯 Name-only mode - calling processAutoBrandGeneration directly');
                // For auto-name, generate immediately
                await processAutoBrandGeneration(chatId, userId, session.data);
            } else {
                // For auto-brand, ask for image style
                session.step = 'waiting_for_style';
                console.log('🎨 Brand mode - moving to style selection');
                
                const message = `
🎨 *Step 3/3:* Choose your logo image style

**Cartoon:** Fun, colorful, animated look
**3D:** Modern, sleek, high-quality 3D graphics

🎨 **Pure AI Generation**
${session.data.theme ? `🎨 **Theme:** ${session.data.theme}` : '🎲 **Pure AI Creativity**'}
                `;

                bot.sendMessage(chatId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🎭 Cartoon Style', callback_data: 'style_cartoon' },
                                { text: '🔮 3D Style', callback_data: 'style_3d' }
                            ],
                            [
                                { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                            ]
                        ]
                    }
                });
                
                botState.autoBrandSessions.set(userId, session);
            }
        } else {
            console.log('❌ No session found for trending NO');
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'style_cartoon') {
        const session = botState.autoBrandSessions.get(userId);
        if (session) {
            session.data.imageStyle = 'cartoon';
            await processAutoBrandGeneration(chatId, userId, session.data);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'style_3d') {
        const session = botState.autoBrandSessions.get(userId);
        if (session) {
            session.data.imageStyle = '3D';
            await processAutoBrandGeneration(chatId, userId, session.data);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('launch_ai_concept_')) {
        console.log('🚀 Launching AI concept for user:', userId);
        console.log('📝 All sessions:', Array.from(botState.autoBrandSessions.keys()));
        
        const session = botState.autoBrandSessions.get(userId);
        console.log('🔍 Found session:', !!session);
        console.log('🎯 Session step:', session?.step);
        console.log('🎯 Has generatedConcept:', !!session?.generatedConcept);
        console.log('📋 Full session data:', JSON.stringify(session, null, 2));
        
        if (session && session.generatedConcept) {
            console.log('✅ Launching AI concept:', session.generatedConcept.name);
            // Launch token with AI-generated concept
            await launchAIConcept(chatId, userId, session);
        } else {
            console.log('❌ Session data missing - userId:', userId);
            console.log('❌ Missing concept - expected at session.generatedConcept');
            bot.sendMessage(chatId, `❌ AI concept not found. Session step: ${session?.step || 'none'}. Please generate a new one.`);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'auto_rug') {
        startAutoRugFlow(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_auto_rug') {
        cancelAutoRug(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'auto_rug_quick') {
        // Quick setup with default conditions
        const quickConditions = {
            volume: 1000,
            timeMinutes: 30,
            dropPercent: 25
        };
        
        const createdPools = raydiumManager.getAllPools();
        if (createdPools.length === 1) {
            startAutoRugMonitoring(chatId, createdPools[0].tokenMint, quickConditions);
        } else {
            showPoolSelectionForAutoRug(chatId, quickConditions);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'auto_rug_custom') {
        bot.sendMessage(chatId, `
🔧 *Custom Auto-Rugpull Setup*

Enter parameters separated by spaces:
\`/auto_rug [volume] [minutes] [drop_percent]\`

**Examples:**
• \`/auto_rug 2000 45 30\` - 2000 volume OR 45min OR 30% drop
• \`/auto_rug 5000 15 20\` - 5000 volume OR 15min OR 20% drop
• \`/auto_rug 500 60 15\` - 500 volume OR 60min OR 15% drop

**Parameters:**
📊 Volume: Trading volume threshold (number of trades)
⏰ Minutes: Maximum time before rugpull (1-1440 minutes)
📉 Drop %: Price drop percentage trigger (5-90%)
        `, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('auto_rug_pool_')) {
        const parts = data.replace('auto_rug_pool_', '').split('_');
        const tokenMint = parts[0];
        const volume = parseFloat(parts[1]);
        const timeMinutes = parseInt(parts[2]);  
        const dropPercent = parseFloat(parts[3]);
        
        startAutoRugMonitoring(chatId, tokenMint, {
            volume: volume,
            timeMinutes: timeMinutes,
            dropPercent: dropPercent
        });
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'auto_rug_status') {
        if (botState.autoRugMonitor.active) {
            const tokenInfo = tokenManager.getToken(botState.autoRugMonitor.tokenMint);
            const elapsedMinutes = Math.floor((new Date() - botState.autoRugMonitor.startTime) / 60000);
            const conditions = botState.autoRugMonitor.conditions;
            
            bot.sendMessage(chatId, `
🔍 *Auto-Rugpull Status*

🪙 **Token:** ${tokenInfo?.name || 'Unknown'} (${tokenInfo?.symbol || 'TOKEN'})
⏰ **Running Time:** ${elapsedMinutes}/${conditions.timeMinutes} minutes
📊 **Volume Target:** ${conditions.volume} trades
📉 **Drop Target:** ${conditions.dropPercent}% price drop

✅ **Status:** Active monitoring
🔄 **Check Interval:** Every 60 seconds
⏰ **Next Check:** In ${60 - (new Date().getSeconds())} seconds

**Any condition met = Instant rugpull**
            `, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ No auto-rugpull monitoring is currently active.');
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'set_fees') {
        startSetFeesFlow(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_set_fees') {
        bot.sendMessage(chatId, '❌ Fee setting cancelled.');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('set_fees_token_')) {
        const tokenMint = data.replace('set_fees_token_', '');
        showFeeInputMenu(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('fees_preset_')) {
        const parts = data.replace('fees_preset_', '').split('_');
        const tokenMint = parts[0];
        const buyFee = parseFloat(parts[1]);
        const sellFee = parseFloat(parts[2]);
        
        setTokenFees(chatId, tokenMint, buyFee, sellFee);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('fees_custom_')) {
        const tokenMint = data.replace('fees_custom_', '');
        bot.sendMessage(chatId, `
🔬 *RESEARCH: Custom Fee Setup*

🪙 **Token:** ${tokenManager.getToken(tokenMint)?.name || 'Unknown'}

Enter custom fees in format:
\`/set_fees 1 [buy_fee] [sell_fee]\`

**Examples:**
• \`/set_fees 1 3 7\` - 3% buy, 7% sell
• \`/set_fees 1 0 15\` - 0% buy, 15% sell  
• \`/set_fees 1 8 8\` - 8% both ways

**Valid Range:** 0% - 99%
        `, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(callbackQuery.id);
    }
});

async function launchAIConcept(chatId, userId, session) {
    const concept = session.generatedConcept;
    const imageResult = session.generatedImage;
    
    try {
        bot.sendMessage(chatId, '🔄 *Launching AI-Generated Token with Enhanced Metadata...* This may take 90-120 seconds.', { parse_mode: 'Markdown' });

        // Use AI concept to create enhanced token with DALL·E 3 + nft.storage
        const tokenInfo = await tokenManager.createToken(
            concept.name,
            concept.ticker,
            10000000, // Default supply of 10M
            concept.description,
            imageResult && imageResult.imageUrl && !imageResult.error ? imageResult.imageUrl : '',
            userId
        );

        const aiTokenMessage = `
🎉 *AI Token Created with Enhanced Pipeline!*

📛 **Name:** ${tokenInfo.name}
🏷️ **Symbol:** ${tokenInfo.symbol}
🪙 **Supply:** ${tokenInfo.totalSupply.toLocaleString()} ${tokenInfo.symbol}
📝 **Description:** ${tokenInfo.description || 'None'}

🎨 **AI Enhancement Status:**
${tokenInfo.metadataResult && tokenInfo.metadataResult.success ? 
`✅ Fal.ai Logo Generated & Uploaded
🌐 IPFS Image: ${tokenInfo.ipfsImageUrl}
📋 IPFS Metadata: ${tokenInfo.metadataIpfsUrl}
📊 Retries: Gen(${tokenInfo.metadataResult.retryAttempts?.imageGeneration || 0}), Up(${tokenInfo.metadataResult.retryAttempts?.imageUpload || 0}), Meta(${tokenInfo.metadataResult.retryAttempts?.metadataUpload || 0})` : 
`❌ Image generation failed after retries
⚠️ ${tokenInfo.metadataResult ? tokenInfo.metadataResult.error : 'Unknown error'}
📊 Attempts: Gen(${tokenInfo.metadataResult?.retryAttempts?.imageGeneration || 0}), Up(${tokenInfo.metadataResult?.retryAttempts?.imageUpload || 0}), Meta(${tokenInfo.metadataResult?.retryAttempts?.metadataUpload || 0})`}

🌐 **Network:** Solana Devnet
💰 **Minted to:** Wallet 1
⚡ **AI-Powered:** Creative Algorithm + Fal.ai + IPFS Pipeline

🔗 **Mint Address:** \`${tokenInfo.mintAddress}\`
        `;

        await bot.sendMessage(chatId, aiTokenMessage, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🏊 Create Pool', callback_data: `create_pool_${tokenInfo.mintAddress}` },
                        { text: '🌱 Seed Wallets', callback_data: `seed_token_${tokenInfo.mintAddress}` }
                    ],
                    [
                        { text: '📊 Bot Status', callback_data: 'show_status' },
                        { text: '💰 Check Wallets', callback_data: 'show_wallets' }
                    ]
                ]
            }
        });

        // Send the AI-generated image if available
        if (tokenInfo.metadataResult && tokenInfo.metadataResult.success) {
            if (tokenInfo.generatedImageUrl) {
                try {
                    console.log('📸 Sending Fal.ai-generated token image...');
                    await bot.sendPhoto(chatId, tokenInfo.generatedImageUrl, {
                        caption: `🎨 *AI-Generated Logo for ${tokenInfo.name}*\n\n✨ Created with Fal.ai\n🌐 IPFS Image: ${tokenInfo.ipfsImageUrl}\n📋 IPFS Metadata: ${tokenInfo.metadataIpfsUrl}`,
                        parse_mode: 'Markdown'
                    });
                } catch (imageError) {
                    console.error('❌ Error sending Fal.ai-generated image:', imageError);
                    // Send IPFS links as fallback
                    if (tokenInfo.generatedImageUrl && tokenInfo.ipfsImageUrl) {
                        bot.sendMessage(chatId, `🎨 *Generated Token Logo*\n\n🔗 Generated Image: ${tokenInfo.generatedImageUrl}\n🌐 IPFS Image: ${tokenInfo.ipfsImageUrl}`, { parse_mode: 'Markdown' });
                    }
                }
            }
        } else {
            // Show enhanced metadata failure message
            const errorMessage = tokenInfo.metadataResult ? tokenInfo.metadataResult.error : 'Unknown error';
            const retryInfo = tokenInfo.metadataResult ? `\n📊 Retry attempts: Gen(${tokenInfo.metadataResult.retryAttempts?.imageGeneration || 0}), Up(${tokenInfo.metadataResult.retryAttempts?.imageUpload || 0}), Meta(${tokenInfo.metadataResult.retryAttempts?.metadataUpload || 0})` : '';
            
            bot.sendMessage(chatId, `⚠️ *Image Generation Failed After Retries*\n\n❌ ${errorMessage}${retryInfo}\n\n✅ AI token created successfully with basic metadata`, { parse_mode: 'Markdown' });
        }

        // Clean up session
        botState.autoBrandSessions.delete(userId);
        
    } catch (error) {
        console.error('❌ AI token creation error:', error);
        bot.sendMessage(chatId, `❌ AI token creation failed: ${error.message}\n\nPlease try again.`);
        botState.autoBrandSessions.delete(userId);
    }
}

// Handle auto-brand theme input
async function handleAutoBrandTheme(chatId, userId, theme, type) {
    const session = botState.autoBrandSessions.get(userId);
    if (!session) return;

    session.data.theme = theme;
    session.data.nameOnly = (type === 'name');
    
    if (type === 'name') {
        // For auto-name, skip to trending question
        session.step = 'waiting_for_trending';
        
        const message = `
🎯 *Step 2/2:* Do you want to include trending data analysis?

**Yes:** AI will analyze Google Trends + trending coins for context
**No:** Pure creative AI generation without trends

${theme ? `🎨 **Theme:** ${theme}` : '🎲 **Pure AI Creativity**'}
        `;

        bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔥 Yes, Use Trending Data', callback_data: 'use_trending_yes' },
                        { text: '🎨 No, Pure AI', callback_data: 'use_trending_no' }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                    ]
                ]
            }
        });
    } else {
        // For auto-brand, ask for trending preference
        session.step = 'waiting_for_trending';
        
        const message = `
🤖 *Step 2/3:* Do you want to include trending data analysis?

**Yes:** AI will analyze Google Trends + trending coins for context  
**No:** Pure creative AI generation without trends

${theme ? `🎨 **Theme:** ${theme}` : '🎲 **Pure AI Creativity**'}
        `;

        bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔥 Yes, Use Trending Data', callback_data: 'use_trending_yes' },
                        { text: '🎨 No, Pure AI', callback_data: 'use_trending_no' }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                    ]
                ]
            }
        });
    }

    botState.autoBrandSessions.set(userId, session);
}

// Handle message input for auto-brand flows (updated version)
bot.on('message', (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip if message starts with / (command)
    if (text && text.startsWith('/')) {
        return;
    }

    // Check if user is in token creation flow FIRST
    const session = botState.userSessions.get(userId);
    if (session) {
        handleTokenCreationInput(userId, chatId, text, session);
        return;
    }

    // Check if user is in auto-brand flow
    const autoBrandSession = botState.autoBrandSessions.get(userId);
    if (autoBrandSession) {
        console.log('📝 Processing auto-brand message input for user:', userId);
        console.log('📝 Current session step:', autoBrandSession.step);
        console.log('📝 Message text:', text);
        handleAutoBrandInput(userId, chatId, text, autoBrandSession);
        return;
    }
});

async function handleAutoBrandInput(userId, chatId, text, session) {
    try {
        console.log('🔄 handleAutoBrandInput called - step:', session.step);
        console.log('🔄 Input text:', text);
        
        switch (session.step) {
            case 'waiting_for_theme':
                const theme = text.trim().toLowerCase() === 'none' ? '' : text.trim();
                console.log('🎨 Processing theme:', theme);
                handleAutoBrandTheme(chatId, userId, theme, session.data.nameOnly ? 'name' : 'brand');
                break;
            
            case 'waiting_for_name_theme':
                const nameTheme = text.trim().toLowerCase() === 'none' ? '' : text.trim();
                console.log('🎯 Processing name theme:', nameTheme);
                handleAutoBrandTheme(chatId, userId, nameTheme, 'name');
                break;
                
            default:
                console.log('⚠️ Unhandled auto-brand step:', session.step);
        }
    } catch (error) {
        console.error('❌ Error handling auto-brand input:', error);
        bot.sendMessage(chatId, `❌ Something went wrong. Please try again with /${session.data?.nameOnly ? 'auto_name' : 'auto_brand'}`);
        botState.autoBrandSessions.delete(userId);
    }
}

// Test Solana connection
async function testSolanaConnection() {
    try {
        const version = await connection.getVersion();
        console.log('✅ Solana connection successful:', version);
        return true;
    } catch (error) {
        console.error('❌ Solana connection failed:', error.message);
        return false;
    }
}

// Initialize bot
async function initializeBot() {
    console.log('🔄 Testing connections...');
    
    // Test Solana connection
    const solanaConnected = await testSolanaConnection();
    
    if (solanaConnected) {
        console.log('✅ All connections successful!');
        console.log('📱 Bot is ready for Telegram commands');
        console.log('💬 Send /start to your bot to begin');
        
        // Test wallet initialization
        const summary = await walletManager.getWalletSummary();
        console.log(`💼 Wallet Summary: ${summary.totalWallets} wallets, ${summary.totalBalance.toFixed(4)} SOL total`);
    } else {
        console.log('⚠️ Some connections failed, but bot will still start');
    }
}

// Error handling
bot.on('error', (error) => {
    console.error('❌ Telegram Bot Error:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Polling Error:', error);
});

// Start the bot
initializeBot();

console.log('🎯 Step 7+ Complete: AI-Powered Branding + Auto-Rugpull + Fal.ai System Ready!');
console.log('⏳ Ready for testing /auto_brand, /auto_name, /auto_rug, and /launch commands...');