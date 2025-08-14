require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Connection, clusterApiUrl } = require('@solana/web3.js');
const WalletManager = require('./wallet-manager');
const TokenManager = require('./token-manager');
const TradingSimulator = require('./trading-simulator');
const RaydiumManager = require('./raydium-manager');
const RealTradingManager = require('./real-trading-manager');
const TaxManager = require('./tax-manager');

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize Solana Connection (Devnet)
const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');

// Initialize managers
const walletManager = new WalletManager(connection);
const tokenManager = new TokenManager(connection, walletManager);
const tradingSimulator = new TradingSimulator(walletManager, tokenManager);
const raydiumManager = new RaydiumManager(connection, walletManager, tokenManager);
const realTradingManager = new RealTradingManager(walletManager, tokenManager, raydiumManager);
const taxManager = new TaxManager(connection, walletManager);

// Bot state management
const botState = {
    activeOperations: new Map(),
    currentToken: null,
    userSessions: new Map(),
    tradingMode: 'real',
    disabledFeatures: [],  // Enable tax system
    sessionTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds
    commandCooldowns: new Map(), // Track command usage
    cooldownTimes: {
        airdrop: 60 * 1000, // 1 minute cooldown for airdrops
        launch: 5 * 60 * 1000, // 5 minutes cooldown for launches
        ciftd: 10 * 1000, // 10 seconds cooldown for calculations
        rugpull: 10 * 60 * 1000 // 10 minutes cooldown for rugpull
    }
};

// Rate limiting function
function checkCommandCooldown(userId, command) {
    const now = Date.now();
    const cooldownKey = `${userId}-${command}`;
    const lastUsed = botState.commandCooldowns.get(cooldownKey);
    const cooldownTime = botState.cooldownTimes[command] || 1000; // Default 1 second

    if (lastUsed && now - lastUsed < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
        throw new Error(`Please wait ${remainingTime} seconds before using this command again.`);
    }

    botState.commandCooldowns.set(cooldownKey, now);
};

// Clean up expired sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [chatId, session] of botState.userSessions.entries()) {
        if (now - session.timestamp > botState.sessionTimeout) {
            botState.userSessions.delete(chatId);
        }
    }
}, 60000); // Check every minute

// Start Command Handler
bot.onText(/\/start/, (msg) => {
    try {
        const chatId = msg.chat.id;
        const welcomeMessage = [
            '🤖 *Solana Meme Coin Bot* - Educational Devnet Version',
            '',
            'Available Commands:',
            '📋 /help - Show all commands',
            '💰 /wallets - Show wallet balances',
            '🪂 /airdrop [wallet_number] - Request devnet SOL',
            '🚀 /launch - Launch new meme coin with metadata',
            '🎨 /auto_brand - Generate AI token branding',
            '🌱 /seed_wallets - Distribute SOL to trading wallets',
            '🏊 /create_pool - Create Raydium pool',
            '🔒 /liquidity_lock - Lock liquidity for 1 month',
            '',
            '📈 /chart_activity - Start/stop chart activity',
            '🧪 /mint_rugpull - Simulate mint + sell',
            '📈 /start_trading - Start automated trading',
            '⏸️ /stop_trading - Stop automated trading',
            '🔴 /rugpull - Complete rugpull operation',
            '📊 /status - Show current operations'
        ].join('\n');

        bot.sendMessage(chatId, welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💰 Check Wallets', callback_data: 'show_wallets' },
                        { text: '🚀 Launch Coin', callback_data: 'launch_token' }
                    ],
                    [
                        { text: '🌱 Seed Wallets', callback_data: 'seed_wallets' },
                        { text: '🏊 Create Pool', callback_data: 'create_pool' }
                    ],
                    [
                        { text: '🔒 Lock Liquidity', callback_data: 'lock_liquidity' },
                        { text: '📊 Chart Activity', callback_data: 'chart_activity' }
                    ],
                    [
                        { text: '📈 Start Trading', callback_data: 'start_trading' },
                        { text: '🧪 Mint Rugpull', callback_data: 'mint_rugpull' }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Start command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Help Command Handler
bot.onText(/\/help/, (msg) => {
    try {
        const chatId = msg.chat.id;
        const helpMessage = [
            '📖 *Help & Commands*',
            '',
            '*Basic Commands:*',
            '💰 /wallets - View all wallet balances',
            '🪂 /airdrop [1-5] - Request SOL for a wallet',
            '📊 /status - Check bot status and stats',
            '',
            '*Token Operations:*',
            '🚀 /launch - Create new token with metadata',
            '🎨 /auto_brand - Generate AI token branding',
            '🌱 /seed_wallets - Distribute SOL to wallets',
            '',
            '*Pool Operations:*',
            '🏊 /create_pool - Create Raydium liquidity pool',
            '🔒 /lock_liquidity - Lock pool liquidity',
            '',
            '*Trading Operations:*',
            '📈 /start_trading - Begin automated trading',
            '⏸️ /stop_trading - Stop all trading activity',
            '📊 /chart_activity - Manage chart activity',
            '',
            '*Research & Education:*',
            '🧪 /mint_rugpull - Educational mint+sell simulation',
            '🔴 /rugpull - Complete rugpull operation',
            '',
            '*Token Economics:*',
            '📊 /ciftd - Calculate inflated token data',
            '   Usage: /ciftd <supply> <decimals> <sol> <liquidity> <mcap>',
            '   Example: `/ciftd 1000000 9 0.05 80000 300000`',
            '',
            '*Tax Management:*',
            '💵 /set_fees - Set token tax rates (in %)',
            '   Usage: /set_fees <buy> <sell> <transfer>',
            '   Example: `/set_fees 3 5 2` for 3% buy, 5% sell, 2% transfer'
        ].join('\n');

        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Help command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Status Command Handler
bot.onText(/\/set_fees\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/, async (msg, match) => {
    try {
        const chatId = msg.chat.id;
        const [buyTax, sellTax, transferTax] = match.slice(1).map(x => parseFloat(x) / 100);

        // Validate tax rates (0-10%)
        if (buyTax < 0 || buyTax > 0.10 || 
            sellTax < 0 || sellTax > 0.10 || 
            transferTax < 0 || transferTax > 0.10) {
            bot.sendMessage(chatId, '❌ Tax rates must be between 0% and 10%');
            return;
        }

        if (!tokenManager.getCurrentToken()) {
            bot.sendMessage(chatId, '❌ No active token. Launch a token first using /launch');
            return;
        }

        const token = tokenManager.getCurrentToken();
        const result = taxManager.setTokenTaxRates(token.mintAddress, buyTax, sellTax, transferTax);

        if (result) {
            const feesMessage = [
                '✅ *Tax Rates Updated*',
                '',
                '💰 New Rates:',
                `Buy Tax: ${(result.buyTax * 100).toFixed(1)}%`,
                `Sell Tax: ${(result.sellTax * 100).toFixed(1)}%`,
                `Transfer Tax: ${(result.transferTax * 100).toFixed(1)}%`,
                '',
                '📝 Tax will be collected in SOL',
                '💼 Collected in Wallet 1'
            ].join('\n');

            bot.sendMessage(chatId, feesMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Failed to update tax rates');
        }
    } catch (error) {
        console.error('Set fees command error:', error);
        bot.sendMessage(msg.chat.id, '❌ Invalid format. Use: /set_fees <buy> <sell> <transfer>\\nExample: /set_fees 3 5 2');
    }
});

bot.onText(/\/status/, (msg) => {
    try {
        const chatId = msg.chat.id;
        showStatus(chatId);
    } catch (error) {
        console.error('Status command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Wallet Command Handler
bot.onText(/\/wallets/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        const walletMessage = await walletManager.formatAllWalletsForTelegram();
        
        bot.sendMessage(chatId, walletMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 Refresh', callback_data: 'refresh_wallets' },
                        { text: '🪂 Request Airdrop', callback_data: 'airdrop_menu' }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Wallets command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Airdrop Command Handler
bot.onText(/\/airdrop(?:\s+(\d+))?/, async (msg, match) => {
    try {
        const chatId = msg.chat.id;
        const walletNumber = match[1] ? parseInt(match[1]) : null;

        if (!walletNumber || walletNumber < 1 || walletNumber > 5) {
            const helpMessage = [
                '🪂 *Airdrop Command*',
                '',
                'Usage: `/airdrop [wallet_number]`',
                '',
                'Example: `/airdrop 1` - Request 1 SOL for wallet 1',
                '',
                'Valid wallet numbers: 1-5'
            ].join('\n');

            bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
            return;
        }

        bot.sendMessage(chatId, '🪂 Requesting devnet SOL airdrop for wallet ' + walletNumber + '...');
        const result = await walletManager.requestAirdrop(walletNumber, 1);

        if (result.success) {
            const successMessage = [
                '✅ *Airdrop Successful!*',
                '',
                '💰 Wallet ' + walletNumber + ' received 1 SOL',
                '🔗 Transaction: `' + result.signature + '`',
                '💵 New Balance: *' + result.newBalance.toFixed(4) + ' SOL*'
            ].join('\n');

            bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Airdrop failed: ' + result.error);
        }
    } catch (error) {
        console.error('Airdrop command error:', error);
        bot.sendMessage(msg.chat.id, '❌ Airdrop request failed. Please try again.');
    }
});

// Callback Query Handler
bot.on('callback_query', async (query) => {
    try {
        const message = query.message;
        const data = query.data;
        const chatId = message.chat.id;
        const userId = query.from.id;

        console.log('🔔 Callback received:', data);

        if (data === 'show_wallets') {
            const walletMessage = await walletManager.formatAllWalletsForTelegram();
            bot.sendMessage(chatId, walletMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh', callback_data: 'refresh_wallets' },
                            { text: '🪂 Request Airdrop', callback_data: 'airdrop_menu' }
                        ]
                    ]
                }
            });
        } else if (data === 'refresh_wallets') {
            const walletMessage = await walletManager.formatAllWalletsForTelegram();
            bot.editMessageText(walletMessage, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh', callback_data: 'refresh_wallets' },
                            { text: '🪂 Request Airdrop', callback_data: 'airdrop_menu' }
                        ]
                    ]
                }
            });
        } else if (data === 'airdrop_menu') {
            const airdropMessage = [
                '🪂 *Request Devnet SOL*',
                '',
                'Choose a wallet to request 1 SOL airdrop:'
            ].join('\n');

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
        } else if (data.startsWith('airdrop_')) {
            const walletNumber = parseInt(data.split('_')[1]);
            try {
                const result = await walletManager.requestAirdrop(walletNumber, 1);
                if (result.success) {
                    const successMessage = [
                        '✅ *Airdrop Successful!*',
                        '',
                        '💰 Wallet ' + walletNumber + ' received 1 SOL',
                        '🔗 Transaction: `' + result.signature + '`',
                        '💵 New Balance: *' + result.newBalance.toFixed(4) + ' SOL*'
                    ].join('\n');
                    bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
                } else {
                    bot.sendMessage(chatId, '❌ Airdrop failed: ' + result.error);
                }
            } catch (error) {
                bot.sendMessage(chatId, '❌ Airdrop error: ' + error.message);
            }
        }

        // Always answer the callback query
        bot.answerCallbackQuery(query.id);
    } catch (error) {
        console.error('Callback query error:', error);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred' });
    }
});

// Launch Token Command Handler
bot.onText(/\/launch/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        const launchMessage = [
            '🚀 *Launch New Token*',
            '',
            'Choose launch parameters:',
            '',
            '1️⃣ Supply: 10,000,000 tokens',
            '2️⃣ Name: Generated from AI',
            '3️⃣ Symbol: Generated from name',
            '4️⃣ Metadata: Basic meme token',
            '',
            '🎨 Optional: Use /auto_brand to generate AI branding'
        ].join('\n');

        bot.sendMessage(chatId, launchMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🚀 Launch Token', callback_data: 'confirm_launch' },
                        { text: '🎨 Generate Branding', callback_data: 'auto_brand' }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Launch command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Auto Brand Command Handler
bot.onText(/\/auto_brand/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, '🎨 Generating AI token branding...');

        const brandingResult = await tokenManager.generateTokenBranding();
        if (brandingResult.success) {
            const brandingMessage = [
                '✅ *AI Token Branding Generated*',
                '',
                '🪙 Name: ' + brandingResult.name,
                '💫 Symbol: ' + brandingResult.symbol,
                '🎭 Theme: ' + brandingResult.theme,
                '',
                '📝 Description:',
                brandingResult.description,
                '',
                'Ready to launch? Use /launch to create your token!'
            ].join('\n');

            bot.sendMessage(chatId, brandingMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Failed to generate branding: ' + brandingResult.error);
        }
    } catch (error) {
        console.error('Auto brand command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Seed Wallets Command Handler
bot.onText(/\/seed_wallets/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        await walletManager.updateBalances();
        const wallets = walletManager.getAllWallets();
        const sourceWallet = wallets[0]; // Wallet 1

        // Debug wallet balances
        console.log('All wallet balances:', wallets.map(w => ({id: w.id, balance: w.balance})));

        // Only check balance of wallet 1, since we're distributing FROM it
        const minRequired = 0.05; // Minimum SOL needed for fees
        if (!sourceWallet) {
            const warningMessage = [
                '⚠️ *Error*',
                '',
                'Source wallet not initialized properly',
                'Please contact support'
            ].join('\n');
            bot.sendMessage(chatId, warningMessage, { parse_mode: 'Markdown' });
            return;
        }

        console.log('Source wallet details:', {
            id: sourceWallet.id,
            balance: sourceWallet.balance,
            hasKeypair: !!sourceWallet.keypair,
            publicKey: sourceWallet.publicKey
        });

        if (sourceWallet.balance < minRequired) {
            const warningMessage = [
                '⚠️ *Insufficient Funds*',
                '',
                `Wallet 1 balance: ${sourceWallet.balance?.toFixed(4) || 0} SOL`,
                'Use /airdrop 1 to request SOL',
                'for the main wallet.',
                '',
                'Required: At least 0.05 SOL for fees'
            ].join('\n');

            bot.sendMessage(chatId, warningMessage, { parse_mode: 'Markdown' });
            return;
        }

        bot.sendMessage(chatId, '🌱 Distributing SOL to trading wallets...');
        const result = await walletManager.distributeSOL();

        if (result.success) {
            const successMessage = [
                '✅ *SOL Distribution Successful*',
                '',
                '📊 Distribution Details:',
                `- SOL per wallet: ${result.distributedAmount.toFixed(4)} SOL`,
                `- Number of wallets: ${result.totalWallets}`,
                `- Reserved in Wallet 1: ${result.reservedAmount} SOL`,
                '',
                '🔍 Transaction Details:',
                ...result.transactions.map(tx => 
                    `Wallet ${tx.targetWallet}: ${tx.amount.toFixed(4)} SOL (${tx.signature})`
                )
            ].join('\n');

            bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Failed to distribute SOL: ' + result.error);
        }
    } catch (error) {
        console.error('Seed wallets command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred while distributing SOL: ' + error.message);
    }
});

// Error Handlers
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// Trading Commands
bot.onText(/\/create_pool/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        
        if (!tokenManager.getCurrentToken()) {
            bot.sendMessage(chatId, '❌ No token found. Launch a token first using /launch');
            return;
        }

        const token = tokenManager.getCurrentToken();
        bot.sendMessage(chatId, '🏊 Creating Raydium liquidity pool for ' + token.symbol + '...');
        
        const result = await raydiumManager.createPool(token);
        if (result.success) {
            const poolMessage = [
                '✅ *Liquidity Pool Created*',
                '',
                '🏊 Pool Details:',
                '- Token: ' + token.name + ' (' + token.symbol + ')',
                '- Initial Price: ' + result.initialPrice + ' SOL',
                '- Pool Size: ' + result.poolSize.toLocaleString() + ' ' + token.symbol,
                '',
                '🔗 Transaction: `' + result.signature + '`',
                '',
                '✨ Next step: Use /start_trading to begin automated trading'
            ].join('\n');

            bot.sendMessage(chatId, poolMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Failed to create pool: ' + result.error);
        }
    } catch (error) {
        console.error('Create pool command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

bot.onText(/\/start_trading/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        
        if (!tokenManager.getCurrentToken()) {
            bot.sendMessage(chatId, '❌ No token found. Launch a token first using /launch');
            return;
        }

        if (!raydiumManager.getCurrentPool()) {
            bot.sendMessage(chatId, '❌ No pool found. Create a pool first using /create_pool');
            return;
        }

        bot.sendMessage(chatId, '📈 Starting automated trading...');
        const result = await realTradingManager.startTrading();

        if (result.success) {
            const tradingMessage = [
                '✅ *Automated Trading Started*',
                '',
                '📊 Initial Parameters:',
                '- Buy Range: ' + result.buyRange,
                '- Sell Range: ' + result.sellRange,
                '- Trade Size: ' + result.tradeSize + ' SOL',
                '',
                '⚡️ First trades initiated:',
                result.initialTrades.map(t => '- ' + t).join('\n'),
                '',
                '🛑 Use /stop_trading to halt operations'
            ].join('\n');

            bot.sendMessage(chatId, tradingMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Failed to start trading: ' + result.error);
        }
    } catch (error) {
        console.error('Start trading command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

bot.onText(/\/stop_trading/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        
        if (!realTradingManager.isTrading()) {
            bot.sendMessage(chatId, '⚠️ Trading is not currently active');
            return;
        }

        bot.sendMessage(chatId, '⏸️ Stopping automated trading...');
        const result = await realTradingManager.stopTrading();

        if (result.success) {
            const summaryMessage = [
                '✅ *Trading Stopped Successfully*',
                '',
                '📊 Trading Summary:',
                '- Duration: ' + result.duration + ' minutes',
                '- Total Trades: ' + result.totalTrades,
                '- Successful: ' + result.successfulTrades,
                '- Failed: ' + result.failedTrades,
                '',
                '💰 Performance:',
                '- Volume: ' + result.totalVolume.toFixed(2) + ' SOL',
                '- Fees: ' + result.totalFees.toFixed(4) + ' SOL'
            ].join('\n');

            bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Failed to stop trading: ' + result.error);
        }
    } catch (error) {
        console.error('Stop trading command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

bot.onText(/\/chart_activity/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        
        if (!tokenManager.getCurrentToken()) {
            bot.sendMessage(chatId, '❌ No token found. Launch a token first using /launch');
            return;
        }

        const isActive = realTradingManager.isChartActivityRunning();
        const actionMessage = isActive ? 'Stop' : 'Start';

        const confirmMessage = [
            '📈 *Chart Activity Control*',
            '',
            'Current Status: ' + (isActive ? '✅ Active' : '⏸️ Inactive'),
            '',
            'Click below to ' + actionMessage.toLowerCase() + ' chart activity'
        ].join('\n');

        bot.sendMessage(chatId, confirmMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: actionMessage + ' Chart Activity',
                            callback_data: isActive ? 'stop_chart' : 'start_chart'
                        }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Chart activity command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Research Commands
bot.onText(/\/mint_rugpull/, async (msg) => {
    try {
        const chatId = msg.chat.id;

        bot.sendMessage(chatId, '🧪 Starting educational mint + sell simulation...');
        const result = await tradingSimulator.simulateMintAndSell();

        if (result.success) {
            const simMessage = [
                '✅ *Simulation Complete*',
                '',
                '📊 Simulation Steps:',
                ...result.steps.map((step, i) => (i + 1) + '. ' + step),
                '',
                '📝 Analysis:',
                result.analysis,
                '',
                '⚠️ Educational Note:',
                'This simulation demonstrates common rugpull techniques.',
                'Always DYOR and be cautious with new tokens.'
            ].join('\n');

            bot.sendMessage(chatId, simMessage, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Simulation failed: ' + result.error);
        }
    } catch (error) {
        console.error('Mint rugpull simulation error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

bot.onText(/\/rugpull/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        
        if (!tokenManager.getCurrentToken()) {
            bot.sendMessage(chatId, '❌ No token found. Nothing to rugpull!');
            return;
        }

        const token = tokenManager.getCurrentToken();
        const confirmMessage = [
            '🔴 *Confirm Rugpull Operation*',
            '',
            'This will:',
            '1. Mint maximum supply',
            '2. Sell into liquidity',
            '3. Remove remaining liquidity',
            '',
            'Target: ' + token.name + ' (' + token.symbol + ')',
            '',
            '⚠️ Educational purposes only!'
        ].join('\n');

        bot.sendMessage(chatId, confirmMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🔴 Execute Rugpull',
                            callback_data: 'confirm_rugpull'
                        }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Rugpull command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Additional callback handlers for trading operations
bot.on('callback_query', async (query) => {
    const message = query.message;
    const data = query.data;
    const chatId = message.chat.id;

    try {
        if (data === 'start_chart') {
            bot.sendMessage(chatId, '📈 Starting chart activity...');
            const result = await realTradingManager.startChartActivity();

            if (result.success) {
                bot.sendMessage(chatId, '✅ Chart activity started!');
            } else {
                bot.sendMessage(chatId, '❌ Failed to start chart activity: ' + result.error);
            }
        } else if (data === 'stop_chart') {
            bot.sendMessage(chatId, '⏸️ Stopping chart activity...');
            const result = await realTradingManager.stopChartActivity();

            if (result.success) {
                bot.sendMessage(chatId, '✅ Chart activity stopped!');
            } else {
                bot.sendMessage(chatId, '❌ Failed to stop chart activity: ' + result.error);
            }
        } else if (data === 'confirm_rugpull') {
            bot.sendMessage(chatId, '🔴 Executing rugpull operation...');
            const result = await realTradingManager.executeRugpull();

            if (result.success) {
                const rugpullMessage = [
                    '✅ *Rugpull Complete*',
                    '',
                    '📊 Operation Results:',
                    '- Tokens Minted: ' + result.mintedAmount.toLocaleString(),
                    '- SOL Extracted: ' + result.extractedSol.toFixed(2) + ' SOL',
                    '- Pool Drained: ' + result.poolDrained + '%',
                    '',
                    '🔗 Transactions:',
                    '- Mint: `' + result.mintTx + '`',
                    '- Sell: `' + result.sellTx + '`',
                    '- Drain: `' + result.drainTx + '`',
                    '',
                    '📝 Note: This was an educational simulation!'
                ].join('\n');

                bot.sendMessage(chatId, rugpullMessage, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, '❌ Rugpull failed: ' + result.error);
            }
        }

        // Always answer the callback query
        bot.answerCallbackQuery(query.id);
    } catch (error) {
        console.error('Trading callback error:', error);
        bot.answerCallbackQuery(query.id, { text: '❌ An error occurred' });
        bot.sendMessage(chatId, '❌ An error occurred: ' + error.message);
    }
});

// Calculate Inflated Token Data Function
function createInflatedTokenData(totalSupply, decimals, realSolInPool, targetDisplayedLiquidity, targetMarketCap) {
    try {
        // Validate inputs
        if (!totalSupply || !decimals || !realSolInPool || !targetDisplayedLiquidity || !targetMarketCap) {
            throw new Error('All parameters are required');
        }

        // Convert inputs to numbers and validate
        totalSupply = Number(totalSupply);
        decimals = Number(decimals);
        realSolInPool = Number(realSolInPool);
        targetDisplayedLiquidity = Number(targetDisplayedLiquidity);
        targetMarketCap = Number(targetMarketCap);

        // Validate input ranges
        if (totalSupply <= 0 || totalSupply > 1e15) {
            throw new Error('Total supply must be between 1 and 1e15');
        }
        if (decimals < 0 || decimals > 9) {
            throw new Error('Decimals must be between 0 and 9 for Solana tokens');
        }
        if (realSolInPool <= 0 || realSolInPool > 1000) {
            throw new Error('Real SOL in pool must be between 0 and 1000');
        }
        if (targetDisplayedLiquidity <= 0) {
            throw new Error('Target displayed liquidity must be greater than 0');
        }
        if (targetMarketCap <= 0) {
            throw new Error('Target market cap must be greater than 0');
        }
        if (targetMarketCap < targetDisplayedLiquidity) {
            throw new Error('Market cap cannot be less than displayed liquidity');
        }

        // Calculate token price needed for target liquidity
        // Liquidity = 2 × SOL amount × token price (Raydium uses 2× for display)
        const tokenPrice = targetDisplayedLiquidity / (2 * realSolInPool);

        // Calculate market cap from token price and total supply
        const marketCap = tokenPrice * totalSupply;

        // Calculate how many tokens to pair with SOL to reach target liquidity
        const pairedTokens = targetDisplayedLiquidity / (2 * tokenPrice);

        return {
            totalSupply,
            decimals,
            realSolInPool,
            pairedTokens,
            tokenPrice,
            displayedLiquidity: targetDisplayedLiquidity,
            marketCap
        };
    } catch (error) {
        console.error('Error calculating token data:', error);
        throw error;
    }
}

// Command handler for Create Inflated Token Data
bot.onText(/\/ciftd/, (msg) => {
    try {
        const chatId = msg.chat.id;
        checkCommandCooldown(msg.from.id, 'ciftd');
        
        const inputMessage = [
            '💡 *Create Inflated Token Data*',
            '',
            'Please provide the following parameters in order, separated by spaces:',
            '',
            '1️⃣ Total Supply (e.g., 1000000)',
            '2️⃣ Decimals (e.g., 9)',
            '3️⃣ Real SOL in Pool (e.g., 0.05)',
            '4️⃣ Target Displayed Liquidity (e.g., 80000)',
            '5️⃣ Target Market Cap (e.g., 300000)',
            '',
            'Example: `/ciftd 1000000 9 0.05 80000 300000`'
        ].join('\n');

        bot.sendMessage(chatId, inputMessage, { parse_mode: 'Markdown' });
        
        // Store the user's state to handle the next message
        botState.userSessions.set(chatId, {
            state: 'awaiting_ciftd_input',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('CIFTD command error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
});

// Message handler for CIFTD input
bot.on('message', (msg) => {
    try {
        const chatId = msg.chat.id;
        const userSession = botState.userSessions.get(chatId);

        if (userSession && userSession.state === 'awaiting_ciftd_input' && !msg.text.startsWith('/')) {
            const params = msg.text.split(' ').map(Number);
            
            if (params.length !== 5 || params.some(isNaN)) {
                bot.sendMessage(chatId, '❌ Invalid input. Please provide exactly 5 numbers.');
                return;
            }

            const [totalSupply, decimals, realSolInPool, targetDisplayedLiquidity, targetMarketCap] = params;

            // Calculate token data
            const result = createInflatedTokenData(totalSupply, decimals, realSolInPool, targetDisplayedLiquidity, targetMarketCap);

            // Format the results
            const resultMessage = [
                '✅ *Token Data Calculation Results*',
                '',
                '📊 Input Parameters:',
                `- Total Supply: ${result.totalSupply.toLocaleString()}`,
                `- Decimals: ${result.decimals}`,
                `- Real SOL in Pool: ${result.realSolInPool} SOL`,
                '',
                '🔥 Calculated Values:',
                `- Token Price: $${result.tokenPrice.toFixed(12)}`,
                `- Paired Tokens: ${result.pairedTokens.toLocaleString()}`,
                `- Displayed Liquidity: $${result.displayedLiquidity.toLocaleString()}`,
                `- Market Cap: $${result.marketCap.toLocaleString()}`,
                '',
                '💡 *Note:* These are calculated values only, no transactions have been made.'
            ].join('\n');

            bot.sendMessage(chatId, resultMessage, { parse_mode: 'Markdown' });

            // Clear the user's session state
            botState.userSessions.delete(chatId);
        }
    } catch (error) {
        console.error('CIFTD input processing error:', error);
        bot.sendMessage(msg.chat.id, '❌ An error occurred while processing your input. Please try again.');
        botState.userSessions.delete(msg.chat.id);
    }
});

// Helper Functions
async function showStatus(chatId) {
    try {
        const createdTokens = tokenManager.getAllTokens();
        const createdPools = raydiumManager.getAllPools();
        const tradingStats = realTradingManager.getStats();
        const taxStats = taxManager.getTaxStats();
        
        let tradingInfo = '⏸️ Inactive';
        if (tradingStats.isActive) {
            const runtime = Math.floor((Date.now() - tradingStats.startTime) / 60000);
            const successRate = Math.round((tradingStats.successfulTrades / tradingStats.totalTrades) * 100) || 0;
            tradingInfo = '✅ Active (' + runtime + 'm) - ' + tradingStats.totalTrades + ' trades (' + successRate + '% success)';
        }

        const currentToken = tokenManager.getCurrentToken();
        let taxInfo = '⏸️ No active token';
        if (currentToken) {
            const tokenTaxes = taxManager.getAllTokensWithTax().find(t => t.address === currentToken.mintAddress);
            if (tokenTaxes) {
                taxInfo = [
                    '✅ Active',
                    `Buy: ${taxStats.settings.buyTax}`,
                    `Sell: ${taxStats.settings.sellTax}`,
                    `Transfer: ${taxStats.settings.transferTax}`
                ].join(' | ');
            }
        }

        const statusMessage = [
            '📊 *Meme-bot Status - Devnet*',
            '',
            '🤖 Bot: Online ✅',
            '🌐 Network: ' + (process.env.SOLANA_NETWORK || 'devnet') + ' ✅',
            '💰 Wallets: ' + walletManager.getAllWallets().length + '/5 configured ✅',
            '🪙 Tokens Created: ' + createdTokens.length,
            '🏊 Pools Created: ' + createdPools.length,
            '📈 Trading: ' + tradingInfo,
            '',
            '💵 *Tax System*',
            'Status: ' + taxInfo,
            'Total SOL Collected: ' + taxStats.stats.totalSOLCollected + ' SOL',
            'Total Transactions: ' + taxStats.stats.totalTransactions,
            'Buy Tax Revenue: ' + taxStats.stats.totalBuyTaxes + ' SOL',
            'Sell Tax Revenue: ' + taxStats.stats.totalSellTaxes + ' SOL',
            'Collector: Wallet ' + taxStats.settings.collectorWallet
        ].join('\n');

        bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Status display error:', error);
        bot.sendMessage(chatId, '❌ Error displaying status. Please try again.');
    }
}

// Initialize the bot
console.log('🚀 Starting Solana Meme Bot...');
console.log('📡 Connected to ' + (process.env.SOLANA_NETWORK || 'devnet'));
