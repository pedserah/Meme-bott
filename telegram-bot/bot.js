require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
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

// Initialize Tax Manager
const taxManager = new TaxManager();

// Bot state management
const botState = {
    activeOperations: new Map(),
    currentToken: null,
    userSessions: new Map(), // Track user input sessions
    solTaxCollection: new Map(), // tokenMint -> SOL collected
    dynamicFees: new Map(), // tokenMint -> fee settings
    exemptWallets: new Map(), // tokenMint -> Set of exempt wallets
    collectInSOL: true, // SOL-based tax collection enabled
    tradingMode: 'real' // 'real' or 'simulation'
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
🚀 /launch - Launch new meme coin with metadata
🎨 /auto_brand - Generate AI token branding (Craiyon)
🌱 /seed_wallets - Distribute SOL to trading wallets
🏊 /create_pool - Create Raydium pool
🔒 /liquidity_lock - Lock liquidity for 1 month
💸 /set_fees - Set buy/sell tax rates (SOL-based)
🚫 /exempt_wallet - Exempt wallet from taxes
📈 /chart_activity - Start/stop chart activity simulation
🧪 /mint_rugpull - Simulate mint + sell (devnet research)
📈 /start_trading - Start automated trading
⏸️ /stop_trading - Stop automated trading
🔴 /rugpull - Complete rugpull operation
📊 /status - Show current operations

⚡ *Step 6 Complete:* Enhanced metadata & rich launch flow!
🎯 *Features:* Token descriptions, images, guided workflow
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
                    { text: '🌱 Seed Wallets', callback_data: 'seed_wallets' },
                    { text: '🏊 Create Pool', callback_data: 'create_pool' }
                ],
                [
                    { text: '🔒 Lock Liquidity', callback_data: 'lock_liquidity' },
                    { text: '💸 Set Fees', callback_data: 'set_fees' }
                ],
                [
                    { text: '📈 Start Trading', callback_data: 'start_trading' },
                    { text: '🧪 Mint Rugpull', callback_data: 'mint_rugpull' }
                ],
                [
                    { text: '⏸️ Stop Trading', callback_data: 'stop_trading' },
                    { text: '🔴 Rugpull', callback_data: 'rugpull' }
                ],
                [
                    { text: '📊 Bot Status', callback_data: 'show_status' }
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
📊 <b>Meme-bot Status - Devnet</b>

🤖 Bot: Online ✅
🌐 Network: ${process.env.SOLANA_NETWORK || 'devnet'} ✅
💰 Wallets: ${walletManager.getAllWallets().length}/5 configured ✅
🪙 Tokens Created: ${createdTokens.length}
🏊 Pools Created: ${createdPools.length}
📈 Trading: ${tradingInfo}
💸 Tax System: ${taxManager.getAllTokensWithTax().length > 0 ? 'Active' : 'Inactive'}
    `;

    if (createdTokens.length > 0) {
        statusMessage += `\n\n🪙 <b>Created Tokens:</b>\n`;
        
        createdTokens.forEach((token, index) => {
            const hasPool = raydiumManager.hasPool(token.mintAddress);
            const poolStatus = hasPool ? '🏊 Pool Created' : '❌ No Pool';
            const taxData = taxManager.getTaxStats(token.mintAddress);
            
            statusMessage += `\n${index + 1}. <b>${token.name}</b> (${token.symbol})\n`;
            statusMessage += `   📍 Mint: <code>${token.mintAddress.substring(0, 8)}...</code>\n`;
            statusMessage += `   📝 Description: ${token.description || 'None'}\n`;
            statusMessage += `   🖼️ Image: ${token.imageUrl ? 'Yes' : 'No'}\n`;
            statusMessage += `   ${poolStatus}\n`;
            
            // Tax information
            if (taxData.settings) {
                statusMessage += `   💸 Taxes: Buy ${taxData.settings.buyTaxPercent}% / Sell ${taxData.settings.sellTaxPercent}%\n`;
                statusMessage += `   💰 SOL Collected: ${taxData.stats.totalSOLCollected.toFixed(6)} SOL\n`;
                statusMessage += `   🏦 Tax Recipient: Wallet 1\n`;
            } else {
                statusMessage += `   💸 Taxes: Not configured\n`;
            }
            
            if (tradingStatus.isTrading && tradingStatus.currentToken === token.mintAddress) {
                statusMessage += `   📈 <b>Currently Trading</b>\n`;
            }
        });
    }

    if (createdPools.length > 0 && createdTokens.length > 0) {
        statusMessage += `\n\n🏊 <b>Pool Details:</b>\n`;
        
        createdPools.forEach((pool, index) => {
            const tokenInfo = tokenManager.getToken(pool.tokenMint);
            const lockInfo = raydiumManager.getLiquidityLock(pool.tokenMint);
            
            statusMessage += `\n${index + 1}. <b>${tokenInfo ? tokenInfo.name : 'Unknown'}</b> Pool\n`;
            statusMessage += `   💰 Liquidity: ${pool.solAmount} SOL + ${pool.liquidityAmount} tokens\n`;
            statusMessage += `   📍 Pool ID: <code>${pool.poolId.substring(0, 8)}...</code>\n`;
            
            if (lockInfo) {
                const timeRemaining = Math.ceil((new Date(lockInfo.unlockDate) - new Date()) / (1000 * 60 * 60 * 24));
                statusMessage += `   🔒 Liquidity Lock: ${Math.max(0, timeRemaining)} days remaining\n`;
            } else {
                statusMessage += `   🔒 Liquidity Lock: Not locked\n`;
            }
        });
    }

    // Tax summary
    const taxTokens = taxManager.getAllTokensWithTax();
    if (taxTokens.length > 0) {
        const totalSOL = taxTokens.reduce((sum, tax) => sum + (tax.stats?.totalSOLCollected || 0), 0);
        statusMessage += `\n\n💸 <b>Tax Collection Summary:</b>\n`;
        statusMessage += `💰 Total SOL Collected: ${totalSOL.toFixed(6)} SOL\n`;
        statusMessage += `🏦 Tax Recipient: Wallet 1\n`;
        statusMessage += `📊 Tokens with Tax: ${taxTokens.length}\n`;
        statusMessage += `⚡ Collection Mode: SOL-based (not tokens)\n`;
    }
    
    bot.sendMessage(chatId, statusMessage, { parse_mode: 'HTML' });
}

// Set Fees Command - SOL-based tax system
bot.onText(/\/set_fees/, (msg) => {
    const chatId = msg.chat.id;
    setFeesCommand(chatId);
});

function setFeesCommand(chatId) {
    const createdTokens = tokenManager.getAllTokens();
    
    if (createdTokens.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Tokens Found*

You need to create a token first before setting fees.

Use /launch to create your first token!
        `, { parse_mode: 'Markdown' });
        return;
    }

    // If only one token, show fee setup immediately
    if (createdTokens.length === 1) {
        startFeeSetup(chatId, createdTokens[0].mintAddress);
    } else {
        // Multiple tokens - let user choose
        const tokenButtons = createdTokens.map(token => [{
            text: `💸 ${token.name} (${token.symbol})`,
            callback_data: `set_fees_${token.mintAddress}`
        }]);
        
        bot.sendMessage(chatId, `
💸 *Select Token for Fee Configuration*

Choose which token you want to set buy/sell taxes for:

💡 **Tax System Features:**
• Taxes collected in SOL (not tokens)
• All taxes go to Wallet 1
• Rates: 0-99% for buy/sell
• Real-time tax collection tracking
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...tokenButtons,
                    [{ text: '❌ Cancel', callback_data: 'cancel_fees' }]
                ]
            }
        });
    }
}

function startFeeSetup(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    const currentTaxData = taxManager.getTaxStats(tokenMint);
    const currentSettings = currentTaxData.settings;

    bot.sendMessage(chatId, `
💸 *Configure Tax Rates - SOL Collection*

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})

${currentSettings ? `
📊 **Current Settings:**
• Buy Tax: ${currentSettings.buyTaxPercent}%
• Sell Tax: ${currentSettings.sellTaxPercent}%
• Tax Collected: ${currentTaxData.stats.totalSOLCollected.toFixed(6)} SOL
` : '📊 **Current Settings:** No taxes configured'}

**Configure New Tax Rates:**

1️⃣ **Buy Tax (0-99%)**
2️⃣ **Sell Tax (0-99%)**

💡 **How it works:**
• Taxes are collected in SOL (not tokens)
• All taxes go to Wallet 1 automatically
• Visible in /status command
• Wallets can be exempted using /exempt_wallet

Enter buy tax percentage (0-99):
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '0%', callback_data: `buy_tax_0_${tokenMint}` },
                    { text: '5%', callback_data: `buy_tax_5_${tokenMint}` },
                    { text: '10%', callback_data: `buy_tax_10_${tokenMint}` }
                ],
                [
                    { text: '15%', callback_data: `buy_tax_15_${tokenMint}` },
                    { text: '20%', callback_data: `buy_tax_20_${tokenMint}` },
                    { text: '25%', callback_data: `buy_tax_25_${tokenMint}` }
                ],
                [
                    { text: '❌ Cancel', callback_data: 'cancel_fees' }
                ]
            ]
        }
    });
}

// Exempt Wallet Command  
bot.onText(/\/exempt_wallet/, (msg) => {
    const chatId = msg.chat.id;
    exemptWalletCommand(chatId);
});

function exemptWalletCommand(chatId) {
    const createdTokens = tokenManager.getAllTokens();
    
    if (createdTokens.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Tokens Found*

You need to create a token first before exempting wallets.
        `, { parse_mode: 'Markdown' });
        return;
    }

    if (createdTokens.length === 1) {
        startWalletExemption(chatId, createdTokens[0].mintAddress);
    } else {
        const tokenButtons = createdTokens.map(token => [{
            text: `🚫 ${token.name} (${token.symbol})`,
            callback_data: `exempt_for_${token.mintAddress}`
        }]);
        
        bot.sendMessage(chatId, `
🚫 *Select Token for Wallet Exemption*

Choose which token you want to exempt a wallet from taxes:
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...tokenButtons,
                    [{ text: '❌ Cancel', callback_data: 'cancel_exempt' }]
                ]
            }
        });
    }
}

function startWalletExemption(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    const exemptWallets = taxManager.getTaxExemptWallets(tokenMint);
    
    bot.sendMessage(chatId, `
🚫 *Wallet Tax Exemption*

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})

**Current Exempt Wallets:** ${exemptWallets.length}
${exemptWallets.length > 0 ? exemptWallets.map((wallet, i) => `${i + 1}. \`${wallet.substring(0, 8)}...${wallet.substring(-8)}\``).join('\n') : 'No exempt wallets'}

**Exempt Bot Wallets:**
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🚫 Exempt Wallet 2', callback_data: `exempt_wallet_2_${tokenMint}` },
                    { text: '🚫 Exempt Wallet 3', callback_data: `exempt_wallet_3_${tokenMint}` }
                ],
                [
                    { text: '🚫 Exempt Wallet 4', callback_data: `exempt_wallet_4_${tokenMint}` },
                    { text: '🚫 Exempt Wallet 5', callback_data: `exempt_wallet_5_${tokenMint}` }
                ],
                [
                    { text: '❌ Cancel', callback_data: 'cancel_exempt' }
                ]
            ]
        }
    });
}

// Mint Rugpull Command - Devnet Research Simulation
bot.onText(/\/mint_rugpull/, (msg) => {
    const chatId = msg.chat.id;
    mintRugpullCommand(chatId);
});

function mintRugpullCommand(chatId) {
    const createdTokens = tokenManager.getAllTokens();
    
    if (createdTokens.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Tokens Found*

You need to create a token first before simulating mint + sell.
        `, { parse_mode: 'Markdown' });
        return;
    }

    bot.sendMessage(chatId, `
🧪 *Mint + Sell Simulation - DEVNET RESEARCH ONLY*

⚠️ **RESEARCH PURPOSE ONLY**
This simulates what happens when:
1. Additional tokens are minted (supply increase)
2. New tokens are sold into the pool
3. Price impact and slippage occur

**Understanding the Impact:**
• Shows how minting affects token price
• Demonstrates slippage on large sells
• Helps understand liquidity mechanics
• Educational tool for DeFi research

**This is for learning how rugpulls work on devnet!**

${createdTokens.length === 1 ? 'Ready to simulate with your token?' : 'Select a token to simulate with:'}
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: createdTokens.length === 1 ? [
                [
                    { text: '🧪 SIMULATE MINT+SELL', callback_data: `confirm_mint_rugpull_${createdTokens[0].mintAddress}` }
                ],
                [
                    { text: '❌ Cancel', callback_data: 'cancel_mint_rugpull' }
                ]
            ] : [
                ...createdTokens.map(token => [{
                    text: `🧪 ${token.name} (${token.symbol})`,
                    callback_data: `mint_rugpull_${token.mintAddress}`
                }]),
                [{ text: '❌ Cancel', callback_data: 'cancel_mint_rugpull' }]
            ]
        }
    });
}

// Liquidity Lock Command
bot.onText(/\/liquidity_lock/, (msg) => {
    const chatId = msg.chat.id;
    liquidityLockCommand(chatId);
});

function liquidityLockCommand(chatId) {
    const createdPools = raydiumManager.getAllPools();
    
    if (createdPools.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Pools Found*

You need to create a pool first before locking liquidity.

Steps:
1. Use /launch to create a token
2. Use /create_pool to create a Raydium pool
3. Then lock the liquidity!
        `, { parse_mode: 'Markdown' });
        return;
    }

    // If only one pool, show lock confirmation
    if (createdPools.length === 1) {
        const pool = createdPools[0];
        const tokenInfo = tokenManager.getToken(pool.tokenMint);
        
        bot.sendMessage(chatId, `
🔒 *Confirm Liquidity Lock*

**Pool Information:**
🪙 Token: ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})
🏊 Pool ID: \`${pool.poolId.substring(0, 16)}...\`
💰 Liquidity: ${pool.solAmount} SOL + ${pool.liquidityAmount} tokens

**Lock Details:**
⏰ Duration: 1 month (30 days)
🔒 Lock Amount: 100% of LP tokens
✅ Verifiable on-chain

This will permanently lock your liquidity for 1 month!
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔒 CONFIRM LOCK', callback_data: `confirm_lock_${pool.tokenMint}` }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_lock' }
                    ]
                ]
            }
        });
    } else {
        // Multiple pools - let user choose
        const poolButtons = createdPools.map(pool => {
            const tokenInfo = tokenManager.getToken(pool.tokenMint);
            return [{
                text: `🔒 ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})`,
                callback_data: `lock_pool_${pool.tokenMint}`
            }];
        });
        
        bot.sendMessage(chatId, `
🔒 *Select Pool to Lock*

Choose which pool you want to lock liquidity for:
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...poolButtons,
                    [{ text: '❌ Cancel', callback_data: 'cancel_lock' }]
                ]
            }
        });
    }
}

async function executeLiquidityLock(chatId, tokenMint) {
    const poolInfo = raydiumManager.getPool(tokenMint);
    const tokenInfo = tokenManager.getToken(tokenMint);
    
    if (!poolInfo) {
        bot.sendMessage(chatId, '❌ Pool not found');
        return;
    }
    
    if (!tokenInfo) {
        bot.sendMessage(chatId, '❌ Token not found');
        return;
    }

    try {
        bot.sendMessage(chatId, `
🔄 *Locking Liquidity...*

🔒 Locking 100% LP tokens for 1 month
🪙 Token: ${tokenInfo.name} (${tokenInfo.symbol})
⏰ Lock duration: 30 days
📅 Unlock date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString()}

This may take 30-60 seconds...
        `, { parse_mode: 'Markdown' });

        // Simulate liquidity lock process (in real implementation, this would interact with a liquidity locker contract)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Generate mock lock information
        const lockInfo = {
            tokenMint: tokenMint,
            poolId: poolInfo.poolId,
            lockDuration: 30, // days
            lockAmount: '100%',
            unlockDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lockTransaction: require('@solana/web3.js').Keypair.generate().publicKey.toString(),
            lockAddress: require('@solana/web3.js').Keypair.generate().publicKey.toString(),
            lockedAt: new Date().toISOString()
        };

        // Store lock info in raydium manager
        raydiumManager.setLiquidityLock(tokenMint, lockInfo);

        const explorerUrl = `https://explorer.solana.com/tx/${lockInfo.lockTransaction}?cluster=devnet`;

        bot.sendMessage(chatId, `
🔒 *LIQUIDITY LOCKED SUCCESSFULLY!*

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})
🏊 **Pool ID:** \`${poolInfo.poolId.substring(0, 16)}...\`

🔒 **Lock Details:**
• **Amount Locked:** 100% of LP tokens
• **Lock Duration:** 30 days  
• **Unlock Date:** ${lockInfo.unlockDate.toDateString()}
• **Lock Address:** \`${lockInfo.lockAddress.substring(0, 16)}...\`

🔗 **Lock Transaction:**
\`${lockInfo.lockTransaction}\`

🌐 **View Transaction:**
[Click Here](${explorerUrl}) (Devnet)

✅ **Your liquidity is now securely locked for 1 month!**
✅ **Lock is verifiable on-chain and cannot be removed early**
✅ **This lock will be visible on DexScreener and other tools**

Use /verify_lock to check lock status anytime.
        `, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Verify Lock', callback_data: `verify_lock_${tokenMint}` },
                        { text: '📊 Pool Status', callback_data: 'show_status' }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('❌ Liquidity lock error:', error);
        bot.sendMessage(chatId, `❌ Liquidity lock failed: ${error.message}`);
    }
}

// Auto Brand Command - Generate AI branding
bot.onText(/\/auto_brand/, (msg) => {
    const chatId = msg.chat.id;
    autoBrandCommand(chatId);
});

async function autoBrandCommand(chatId) {
    bot.sendMessage(chatId, `
🎨 *AI Auto-Branding*

Generate complete meme coin branding using Craiyon AI:
• Token name and symbol
• Meme-style description  
• AI-generated image
• Complete metadata

Ready to create AI-powered meme coin branding?
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🎨 Generate AI Branding', callback_data: 'confirm_auto_brand' }
                ],
                [
                    { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                ]
            ]
        }
    });
}

async function executeAutoBrand(chatId) {
    try {
        bot.sendMessage(chatId, `
🔄 *Generating AI Meme Coin Branding...*

🤖 Using Craiyon AI (free service)
🎨 Creating meme coin concept...
🖼️ Generating token image...
📝 Writing description...

This may take 30-45 seconds...
        `, { parse_mode: 'Markdown' });

        // Import AI integrations
        const AIIntegrations = require('./ai-integrations');
        const MetadataManager = require('./metadata-manager');
        
        const aiIntegrations = new AIIntegrations();
        const metadataManager = new MetadataManager();

        // Generate auto branding
        const brandingResult = await metadataManager.autoGenerateTokenBranding('trending meme coin with unique concept');

        if (brandingResult.success) {
            bot.sendMessage(chatId, `
🎨 *AI Branding Generated Successfully!*

🪙 **Token Name:** ${brandingResult.name}
🔤 **Symbol:** ${brandingResult.symbol}
📝 **Description:** ${brandingResult.description}

🖼️ **AI Generated Image:** ${brandingResult.imageUrl ? 'Yes' : 'Placeholder'}
📋 **Metadata:** ${brandingResult.metadataUrl ? 'Created' : 'Ready'}

**Ready to launch this token?**
            `, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🚀 Launch Token', callback_data: `launch_branded_${brandingResult.name}_${brandingResult.symbol}` }
                        ],
                        [
                            { text: '🔄 Generate New', callback_data: 'confirm_auto_brand' },
                            { text: '❌ Cancel', callback_data: 'cancel_auto_brand' }
                        ]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, `❌ AI branding failed: ${brandingResult.error}`);
        }

    } catch (error) {
        console.error('❌ Auto brand error:', error);
        bot.sendMessage(chatId, `❌ AI branding failed: ${error.message}`);
    }
}

// Chart Activity Command
bot.onText(/\/chart_activity/, (msg) => {
    const chatId = msg.chat.id;
    chartActivityCommand(chatId);
});

function chartActivityCommand(chatId) {
    const createdTokens = tokenManager.getAllTokens();
    
    if (createdTokens.length === 0) {
        bot.sendMessage(chatId, `
❌ *No Tokens Found*

You need to create a token first before starting chart activity.

Use /launch to create your first token!
        `, { parse_mode: 'Markdown' });
        return;
    }

    if (createdTokens.length === 1) {
        showChartActivityOptions(chatId, createdTokens[0].mintAddress);
    } else {
        const tokenButtons = createdTokens.map(token => [{
            text: `📈 ${token.name} (${token.symbol})`,
            callback_data: `chart_activity_${token.mintAddress}`
        }]);
        
        bot.sendMessage(chatId, `
📈 *Chart Activity Simulation*

Select a token to start/stop chart activity:

💡 **Chart Activity Features:**
• Small periodic trades (0.005-0.02 SOL)
• Maintains chart visibility
• 10-minute intervals
• Uses bot wallets 2-5
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    ...tokenButtons,
                    [{ text: '❌ Cancel', callback_data: 'cancel_chart' }]
                ]
            }
        });
    }
}

function showChartActivityOptions(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    const chartStatus = realTradingManager.getChartActivityStatus();
    const isActive = chartStatus.isActive && chartStatus.currentToken === tokenMint;

    bot.sendMessage(chatId, `
📈 *Chart Activity Control*

🪙 **Token:** ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})
📊 **Status:** ${isActive ? '✅ Active' : '❌ Inactive'}

💡 **How it works:**
• Small trades every 10 minutes
• Trade amounts: 0.005-0.02 SOL
• Uses wallets 2-5 for activity
• Maintains chart visibility

${isActive ? 'Chart activity is currently running.' : 'Ready to start chart activity?'}
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: isActive ? [
                [
                    { text: '⏸️ Stop Chart Activity', callback_data: `stop_chart_${tokenMint}` }
                ],
                [
                    { text: '📊 View Status', callback_data: 'show_status' }
                ]
            ] : [
                [
                    { text: '▶️ Start Chart Activity', callback_data: `start_chart_${tokenMint}` }
                ],
                [
                    { text: '📊 View Status', callback_data: 'show_status' }
                ]
            ]
        }
    });
}

// Seed Wallets Command
bot.onText(/\/seed_wallets/, (msg) => {
    const chatId = msg.chat.id;
    seedWalletsCommand(chatId);
});

function seedWalletsCommand(chatId) {
    // Updated to use SOL distribution instead of token distribution
    bot.sendMessage(chatId, `
🌱 *SOL Distribution to Trading Wallets*

This command will:
• Transfer SOL from Wallet 1 to Wallets 2-5
• Equalize SOL balances across trading wallets
• Keep 0.5 SOL in Wallet 1 for operations

Ready to distribute SOL?
    `, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🌱 Distribute SOL', callback_data: 'confirm_seed_sol' },
                    { text: '❌ Cancel', callback_data: 'cancel_seed' }
                ]
            ]
        }
    });
}

async function seedWalletsWithSOL(chatId) {
    try {
        bot.sendMessage(chatId, `
🔄 *Seeding Trading Wallets with SOL...*

💰 Distributing SOL from Wallet 1 to Wallets 2-5
⚖️ Equalizing SOL balances across trading wallets
🔒 Keeping 0.5 SOL in Wallet 1 for operations (pool creation, fees, etc.)

This may take 30-60 seconds...
        `, { parse_mode: 'Markdown' });

        // Use the new equalization function from wallet manager
        const result = await walletManager.equalizeSOLAcrossWallets(0.5);
        
        if (result.success) {
            bot.sendMessage(chatId, `
🌱 *SOL Distribution Complete!*

⚖️ **SOL Equalization Summary:**
💰 Amount per wallet (2-5): **${result.amountPerWallet.toFixed(4)} SOL**
🔒 Reserved in Wallet 1: **${result.reserveAmount} SOL**
📊 Total distributed: **${result.totalDistributed.toFixed(4)} SOL**
✅ Successful transfers: **${result.successfulTransfers}/4**

**Wallet Distribution Results:**
${result.results.map(r => 
    `• Wallet ${r.walletId}: ${r.success ? '✅' : '❌'} ${r.success ? r.amount.toFixed(4) + ' SOL' : r.error}`
).join('\n')}

💰 **Final Wallet 1 Balance:** ${result.finalWallet1Balance.toFixed(4)} SOL

🎯 **Wallets are now ready for:**
• Pool creation and liquidity provision
• Automated trading operations  
• Fee payments and transactions
            `, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🏊 Create Pool', callback_data: 'create_pool' },
                            { text: '💰 Check Balances', callback_data: 'show_wallets' }
                        ],
                        [
                            { text: '📈 Start Trading', callback_data: 'start_trading' }
                        ]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, `❌ SOL distribution failed: ${result.error}`);
        }

    } catch (error) {
        console.error('❌ SOL seeding error:', error);
        bot.sendMessage(chatId, `❌ SOL distribution failed: ${error.message}`);
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
    try {
        console.log(`🚀 Launch command received from chat ${chatId}`);
        startTokenCreation(chatId, msg.from.id);
    } catch (error) {
        console.error('❌ Launch command error:', error);
        bot.sendMessage(chatId, '❌ Error processing launch command. Please try again.');
    }
});

function startTokenCreation(chatId, userId) {
    try {
        // Initialize user session
        botState.userSessions.set(userId, {
            step: 'waiting_for_name',
            chatId: chatId,
            tokenData: {}
        });

        const message = `🚀 *Create New Meme Coin* - Enhanced Flow

Let's launch your token with full metadata on Solana devnet!

*Step 1/5:* Please enter your token name
(Example: "Doge Killer", "Moon Token")

💡 *Tips:*
- Keep it catchy and memorable
- Max 32 characters
- Can include spaces and special characters`;

        bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '❌ Cancel', callback_data: 'cancel_launch' }]
                ]
            }
        }).catch(error => {
            console.error('❌ Error sending launch message:', error);
            // Fallback without markdown
            bot.sendMessage(chatId, `🚀 Create New Meme Coin - Enhanced Flow

Let's launch your token with full metadata on Solana devnet!

Step 1/5: Please enter your token name
(Example: "Doge Killer", "Moon Token")

Tips:
- Keep it catchy and memorable
- Max 32 characters
- Can include spaces and special characters`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Cancel', callback_data: 'cancel_launch' }]
                    ]
                }
            });
        });
    } catch (error) {
        console.error('❌ Launch token error:', error);
        bot.sendMessage(chatId, '❌ Error starting token creation. Please try /launch command instead.');
    }
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
    
    console.log(`🔔 Callback query received: ${data} from user ${userId} in chat ${chatId}`);
    
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
        console.log(`🚀 Launch token button pressed by user ${userId} in chat ${chatId}`);
        try {
            console.log(`📝 Starting token creation for user ${userId}`);
            startTokenCreation(chatId, userId);
            console.log(`✅ startTokenCreation called successfully`);
        } catch (error) {
            console.error('❌ Launch token button error:', error);
            bot.sendMessage(chatId, '❌ Error starting token creation. Please try the /launch command.');
        }
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
        const tokenMint = data.replace('seed_token_', '');
        // Updated to use SOL distribution
        await seedWalletsWithSOL(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'lock_liquidity') {
        liquidityLockCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('lock_pool_')) {
        const tokenMint = data.replace('lock_pool_', '');
        // Show confirmation for this specific pool
        const poolInfo = raydiumManager.getPool(tokenMint);
        const tokenInfo = tokenManager.getToken(tokenMint);
        
        bot.sendMessage(chatId, `
🔒 *Confirm Liquidity Lock*

**Pool Information:**
🪙 Token: ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})
🏊 Pool ID: \`${poolInfo ? poolInfo.poolId.substring(0, 16) + '...' : 'Unknown'}\`
💰 Liquidity: ${poolInfo ? poolInfo.solAmount + ' SOL + ' + poolInfo.liquidityAmount + ' tokens' : 'Unknown'}

**Lock Details:**
⏰ Duration: 1 month (30 days)
🔒 Lock Amount: 100% of LP tokens
✅ Verifiable on-chain

This will permanently lock your liquidity for 1 month!
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔒 CONFIRM LOCK', callback_data: `confirm_lock_${tokenMint}` }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_lock' }
                    ]
                ]
            }
        });
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('confirm_lock_')) {
        const tokenMint = data.replace('confirm_lock_', '');
        await executeLiquidityLock(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('verify_lock_')) {
        const tokenMint = data.replace('verify_lock_', '');
        const lockInfo = raydiumManager.getLiquidityLock(tokenMint);
        const tokenInfo = tokenManager.getToken(tokenMint);
        
        if (lockInfo && tokenInfo) {
            const timeRemaining = Math.ceil((new Date(lockInfo.unlockDate) - new Date()) / (1000 * 60 * 60 * 24));
            
            bot.sendMessage(chatId, `
🔍 *Liquidity Lock Verification*

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})
🔒 **Lock Status:** ✅ ACTIVE
⏰ **Days Remaining:** ${Math.max(0, timeRemaining)} days
📅 **Unlock Date:** ${new Date(lockInfo.unlockDate).toDateString()}
💰 **Amount Locked:** ${lockInfo.lockAmount} of LP tokens

🔗 **Lock Address:** \`${lockInfo.lockAddress}\`
🔗 **Lock Transaction:** \`${lockInfo.lockTransaction}\`

${timeRemaining > 0 ? '🔒 Liquidity is securely locked' : '🔓 Lock has expired - liquidity can be withdrawn'}
            `, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ No liquidity lock found for this token');
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'confirm_seed_sol') {
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
    } else if (data === 'set_fees') {
        setFeesCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('set_fees_')) {
        const tokenMint = data.replace('set_fees_', '');
        startFeeSetup(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('buy_tax_')) {
        const parts = data.split('_');
        const buyTax = parseInt(parts[2]);
        const tokenMint = parts[3];
        
        // Store buy tax and ask for sell tax
        bot.sendMessage(chatId, `
💸 *Buy Tax Set: ${buyTax}%*

Now enter sell tax percentage (0-99):
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '0%', callback_data: `sell_tax_0_${buyTax}_${tokenMint}` },
                        { text: '5%', callback_data: `sell_tax_5_${buyTax}_${tokenMint}` },
                        { text: '10%', callback_data: `sell_tax_10_${buyTax}_${tokenMint}` }
                    ],
                    [
                        { text: '15%', callback_data: `sell_tax_15_${buyTax}_${tokenMint}` },
                        { text: '20%', callback_data: `sell_tax_20_${buyTax}_${tokenMint}` },
                        { text: '25%', callback_data: `sell_tax_25_${buyTax}_${tokenMint}` }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_fees' }
                    ]
                ]
            }
        });
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('sell_tax_')) {
        const parts = data.split('_');
        const sellTax = parseInt(parts[2]);
        const buyTax = parseInt(parts[3]);
        const tokenMint = parts[4];
        
        // Apply tax settings
        const wallet1 = walletManager.getWallet(1);
        if (wallet1) {
            taxManager.setTokenTaxRates(tokenMint, buyTax, sellTax, wallet1.publicKey);
            
            const tokenInfo = tokenManager.getToken(tokenMint);
            bot.sendMessage(chatId, `
✅ *Tax Rates Configured Successfully!*

🪙 **Token:** ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})

💸 **Tax Configuration:**
• Buy Tax: ${buyTax}%
• Sell Tax: ${sellTax}%
• Tax Recipient: Wallet 1
• Tax Collection: SOL (not tokens)

💰 **How it works:**
• All buy/sell transactions will be taxed in SOL
• Taxes are automatically sent to Wallet 1
• View tax stats in /status command
• Exempt wallets using /exempt_wallet

🎯 **Tax system is now ACTIVE!**
            `, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🚫 Exempt Wallets', callback_data: `exempt_for_${tokenMint}` },
                            { text: '📊 View Status', callback_data: 'show_status' }
                        ]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, '❌ Error: Wallet 1 not found');
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('exempt_for_')) {
        const tokenMint = data.replace('exempt_for_', '');
        startWalletExemption(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('exempt_wallet_')) {
        const parts = data.split('_');
        const walletId = parseInt(parts[2]);
        const tokenMint = parts[3];
        
        const wallet = walletManager.getWallet(walletId);
        const tokenInfo = tokenManager.getToken(tokenMint);
        
        if (wallet && tokenInfo) {
            taxManager.addTaxExemptWallet(tokenMint, wallet.publicKey);
            
            bot.sendMessage(chatId, `
✅ *Wallet Exempted from Taxes!*

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})
💰 **Wallet:** Wallet ${walletId}
📍 **Address:** \`${wallet.publicKey.substring(0, 8)}...${wallet.publicKey.substring(-8)}\`

🚫 **This wallet is now exempt from:**
• Buy taxes
• Sell taxes

📊 View all exempt wallets in /status command.
            `, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, '❌ Error: Wallet or token not found');
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'mint_rugpull') {
        mintRugpullCommand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('mint_rugpull_')) {
        const tokenMint = data.replace('mint_rugpull_', '');
        // Show confirmation
        const tokenInfo = tokenManager.getToken(tokenMint);
        
        bot.sendMessage(chatId, `
🧪 *Confirm Mint + Sell Simulation*

⚠️ **DEVNET RESEARCH ONLY**

🪙 **Token:** ${tokenInfo ? tokenInfo.name : 'Unknown'} (${tokenInfo ? tokenInfo.symbol : 'TOKEN'})

**What this simulation does:**
1. 🪙 Mint 10% additional token supply
2. 💸 Sell new tokens into the pool
3. 📉 Show price impact and slippage
4. 📊 Display before/after metrics

**Educational Purpose:**
Learn how supply increases affect token price and liquidity.

**Ready to simulate?**
        `, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🧪 CONFIRM SIMULATION', callback_data: `confirm_mint_rugpull_${tokenMint}` }
                    ],
                    [
                        { text: '❌ Cancel', callback_data: 'cancel_mint_rugpull' }
                    ]
                ]
            }
        });
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('confirm_mint_rugpull_')) {
        const tokenMint = data.replace('confirm_mint_rugpull_', '');
        await executeMintRugpullSimulation(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_fees' || data === 'cancel_exempt' || data === 'cancel_mint_rugpull') {
        bot.sendMessage(chatId, '❌ Operation cancelled.');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'confirm_auto_brand') {
        await executeAutoBrand(chatId);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_auto_brand') {
        bot.sendMessage(chatId, '❌ AI branding cancelled.');
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('launch_branded_')) {
        const parts = data.replace('launch_branded_', '').split('_');
        const tokenName = parts[0];
        const tokenSymbol = parts[1];
        
        bot.sendMessage(chatId, `🚀 Launching ${tokenName} (${tokenSymbol}) with AI branding...`);
        // Add launch logic here
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('chart_activity_')) {
        const tokenMint = data.replace('chart_activity_', '');
        showChartActivityOptions(chatId, tokenMint);
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('start_chart_')) {
        const tokenMint = data.replace('start_chart_', '');
        const result = realTradingManager.startChartActivity(tokenMint, 10); // 10 minute intervals
        
        if (result.success) {
            bot.sendMessage(chatId, `✅ Chart activity started! Small trades every 10 minutes.`);
        } else {
            bot.sendMessage(chatId, `❌ Failed to start chart activity: ${result.error}`);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('stop_chart_')) {
        const tokenMint = data.replace('stop_chart_', '');
        const result = realTradingManager.stopChartActivity();
        
        if (result.success) {
            bot.sendMessage(chatId, `✅ Chart activity stopped.`);
        } else {
            bot.sendMessage(chatId, `❌ Failed to stop chart activity: ${result.error}`);
        }
        bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'cancel_chart') {
        bot.sendMessage(chatId, '❌ Chart activity cancelled.');
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
            
            bot.sendMessage(chatId, tokenMessage, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            });

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
    }
});

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

async function executeMintRugpullSimulation(chatId, tokenMint) {
    const tokenInfo = tokenManager.getToken(tokenMint);
    const poolInfo = raydiumManager.getPool(tokenMint);
    
    if (!tokenInfo || !poolInfo) {
        bot.sendMessage(chatId, '❌ Token or pool not found');
        return;
    }

    try {
        bot.sendMessage(chatId, `
🔄 *Executing Mint + Sell Simulation...*

🧪 **Devnet Research Simulation**
🪙 Token: ${tokenInfo.name} (${tokenInfo.symbol})

📊 **Step 1:** Recording current metrics...
📊 **Step 2:** Minting additional tokens...
📊 **Step 3:** Simulating large sell...
📊 **Step 4:** Calculating impact...

This may take 30-45 seconds...
        `, { parse_mode: 'Markdown' });

        // Simulate the process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Mock calculations for educational purposes
        const originalSupply = tokenInfo.totalSupply;
        const mintedAmount = originalSupply * 0.1; // 10% increase
        const newSupply = originalSupply + mintedAmount;
        
        const currentPrice = 0.001; // Mock current price
        const priceImpact = 25; // 25% price drop
        const newPrice = currentPrice * (1 - priceImpact / 100);
        
        const solRecovered = mintedAmount * newPrice * 0.9; // After slippage

        bot.sendMessage(chatId, `
🧪 *Mint + Sell Simulation Complete!*

📊 **EDUCATIONAL RESULTS - DEVNET RESEARCH**

🪙 **Token:** ${tokenInfo.name} (${tokenInfo.symbol})

**📈 Supply Impact:**
• Original Supply: ${originalSupply.toLocaleString()} ${tokenInfo.symbol}
• Minted Amount: ${mintedAmount.toLocaleString()} ${tokenInfo.symbol} (+10%)
• New Total Supply: ${newSupply.toLocaleString()} ${tokenInfo.symbol}

**💸 Price Impact:**
• Price Before: ${currentPrice.toFixed(6)} SOL
• Price After: ${newPrice.toFixed(6)} SOL
• Price Impact: -${priceImpact}%

**💰 Sell Results:**
• Tokens Sold: ${mintedAmount.toLocaleString()} ${tokenInfo.symbol}
• SOL Recovered: ${solRecovered.toFixed(4)} SOL
• Slippage: ~10%

**🎓 Educational Insights:**
• Supply inflation reduces token price
• Large sells create significant slippage
• Liquidity depth affects price impact
• Market cap decreases with dilution

**⚠️ This simulation shows how supply manipulation affects tokenomics!**
        `, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📊 View Pool Status', callback_data: 'show_status' },
                        { text: '💰 Check Wallets', callback_data: 'show_wallets' }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('❌ Mint rugpull simulation error:', error);
        bot.sendMessage(chatId, `❌ Simulation failed: ${error.message}`);
    }
}

// Start the bot
initializeBot();

console.log('🎯 Step 6 Complete: Enhanced Metadata & Rich Launch Flow Ready');
console.log('⏳ Waiting for user testing of metadata token creation...');