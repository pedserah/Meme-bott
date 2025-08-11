const { Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

class WalletManager {
    constructor(connection) {
        this.connection = connection;
        this.wallets = [];
        this.initializeWallets();
    }

    initializeWallets() {
        const mnemonics = [
            process.env.WALLET_1_MNEMONIC,
            process.env.WALLET_2_MNEMONIC,
            process.env.WALLET_3_MNEMONIC,
            process.env.WALLET_4_MNEMONIC,
            process.env.WALLET_5_MNEMONIC
        ];

        const derivationPath = process.env.DERIVATION_PATH || "m/44'/501'/0'/0'";

        this.wallets = mnemonics.map((mnemonic, index) => {
            try {
                // Generate seed from mnemonic
                const seed = bip39.mnemonicToSeedSync(mnemonic);
                
                // Derive keypair using the specified path
                const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
                
                // Create Solana keypair from derived seed
                const keypair = Keypair.fromSeed(derivedSeed);
                
                return {
                    id: index + 1,
                    keypair: keypair,
                    publicKey: keypair.publicKey.toString(),
                    mnemonic: mnemonic,
                    balance: 0
                };
            } catch (error) {
                console.error(`❌ Error initializing wallet ${index + 1}:`, error.message);
                return null;
            }
        }).filter(wallet => wallet !== null);

        console.log(`✅ Initialized ${this.wallets.length}/5 wallets`);
        this.wallets.forEach(wallet => {
            console.log(`💰 Wallet ${wallet.id}: ${wallet.publicKey}`);
        });
    }

    async updateBalances() {
        const balancePromises = this.wallets.map(async (wallet) => {
            try {
                const balance = await this.connection.getBalance(wallet.keypair.publicKey);
                wallet.balance = balance / LAMPORTS_PER_SOL;
                return wallet;
            } catch (error) {
                console.error(`❌ Error fetching balance for wallet ${wallet.id}:`, error.message);
                wallet.balance = 0;
                return wallet;
            }
        });

        await Promise.all(balancePromises);
        return this.wallets;
    }

    getWallet(id) {
        return this.wallets.find(wallet => wallet.id === id);
    }

    getAllWallets() {
        return this.wallets;
    }

    async getWalletSummary() {
        await this.updateBalances();
        
        const summary = {
            totalWallets: this.wallets.length,
            totalBalance: this.wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
            wallets: this.wallets.map(wallet => ({
                id: wallet.id,
                publicKey: wallet.publicKey,
                balance: wallet.balance,
                balanceFormatted: `${wallet.balance.toFixed(4)} SOL`
            }))
        };

        return summary;
    }

    // Utility function to format wallet info for Telegram messages
    formatWalletForTelegram(wallet) {
        const shortKey = `${wallet.publicKey.slice(0, 8)}...${wallet.publicKey.slice(-8)}`;
        return `💰 Wallet ${wallet.id}: \`${shortKey}\`\n   Balance: *${wallet.balance.toFixed(4)} SOL*`;
    }

    async formatAllWalletsForTelegram() {
        await this.updateBalances();
        
        const totalBalance = this.wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
        
        let message = `💼 *Wallet Status* (${this.wallets.length}/5 active)\n\n`;
        
        this.wallets.forEach(wallet => {
            message += this.formatWalletForTelegram(wallet) + '\n\n';
        });
        
        message += `📊 *Total Balance: ${totalBalance.toFixed(4)} SOL*\n`;
        message += `🌐 Network: ${process.env.SOLANA_NETWORK || 'devnet'}`;
        
        return message;
    }

    // Request devnet SOL airdrop for testing
    async requestAirdrop(walletId, amount = 1) {
        const wallet = this.getWallet(walletId);
        if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
        }

        try {
            console.log(`🪂 Requesting ${amount} SOL airdrop for wallet ${walletId}...`);
            const signature = await this.connection.requestAirdrop(
                wallet.keypair.publicKey,
                amount * LAMPORTS_PER_SOL
            );
            
            // Wait for confirmation
            await this.connection.confirmTransaction(signature);
            
            // Update balance
            await this.updateBalances();
            
            return {
                success: true,
                signature,
                newBalance: wallet.balance
            };
        } catch (error) {
            console.error(`❌ Airdrop failed for wallet ${walletId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Transfer SOL between wallets
    async transferSOL(fromWalletId, toWalletId, amount) {
        const fromWallet = this.getWallet(fromWalletId);
        const toWallet = this.getWallet(toWalletId);
        
        if (!fromWallet) {
            throw new Error(`From wallet ${fromWalletId} not found`);
        }
        if (!toWallet) {
            throw new Error(`To wallet ${toWalletId} not found`);
        }

        try {
            console.log(`💸 Transferring ${amount} SOL from wallet ${fromWalletId} to wallet ${toWalletId}...`);

            // Check SOL balance
            const fromBalance = await this.connection.getBalance(fromWallet.keypair.publicKey);
            const fromBalanceSOL = fromBalance / LAMPORTS_PER_SOL;
            
            if (fromBalanceSOL < amount) {
                throw new Error(`Insufficient SOL balance. Need ${amount}, have ${fromBalanceSOL.toFixed(4)}`);
            }

            // Create transfer transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromWallet.keypair.publicKey,
                    toPubkey: toWallet.keypair.publicKey,
                    lamports: Math.floor(amount * LAMPORTS_PER_SOL)
                })
            );

            // Send and confirm transaction
            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [fromWallet.keypair]
            );

            console.log(`✅ SOL transfer completed: ${signature}`);

            // Update balances
            await this.updateBalances();

            return {
                success: true,
                signature: signature,
                fromWallet: fromWalletId,
                toWallet: toWalletId,
                amount: amount,
                newFromBalance: (await this.connection.getBalance(fromWallet.keypair.publicKey)) / LAMPORTS_PER_SOL,
                newToBalance: (await this.connection.getBalance(toWallet.keypair.publicKey)) / LAMPORTS_PER_SOL
            };

        } catch (error) {
            console.error(`❌ SOL transfer failed:`, error);
            throw error;
        }
    }

    // Equalize SOL across wallets 2-5 from wallet 1
    async equalizeSOLAcrossWallets(reserveAmount = 0.5) {
        try {
            console.log('⚖️ Equalizing SOL across wallets 2-5...');

            // Get current balances
            await this.updateBalances();
            
            const wallet1 = this.getWallet(1);
            if (!wallet1) {
                throw new Error('Wallet 1 not found');
            }

            const wallet1Balance = wallet1.balance;
            console.log(`💰 Wallet 1 balance: ${wallet1Balance.toFixed(4)} SOL`);

            if (wallet1Balance < reserveAmount) {
                throw new Error(`Insufficient SOL in wallet 1. Need at least ${reserveAmount} SOL for operations, have ${wallet1Balance.toFixed(4)} SOL`);
            }

            // Calculate amount to distribute
            const availableForDistribution = wallet1Balance - reserveAmount;
            const amountPerWallet = availableForDistribution / 4; // Distribute to wallets 2-5

            if (amountPerWallet <= 0) {
                throw new Error(`Not enough SOL to distribute. Available: ${availableForDistribution.toFixed(4)} SOL`);
            }

            console.log(`📊 Distributing ${amountPerWallet.toFixed(4)} SOL to each wallet (2-5)`);
            console.log(`💰 Keeping ${reserveAmount} SOL in wallet 1 for operations`);

            const results = [];

            // Transfer to wallets 2-5
            for (let walletId = 2; walletId <= 5; walletId++) {
                try {
                    const result = await this.transferSOL(1, walletId, amountPerWallet);
                    results.push({
                        walletId: walletId,
                        success: true,
                        amount: amountPerWallet,
                        signature: result.signature,
                        newBalance: result.newToBalance
                    });
                    console.log(`✅ Wallet ${walletId}: ${amountPerWallet.toFixed(4)} SOL transferred`);
                } catch (error) {
                    console.error(`❌ Failed to transfer to wallet ${walletId}:`, error.message);
                    results.push({
                        walletId: walletId,
                        success: false,
                        error: error.message,
                        amount: amountPerWallet
                    });
                }
            }

            // Update final balances
            await this.updateBalances();

            const successfulTransfers = results.filter(r => r.success).length;
            const totalDistributed = successfulTransfers * amountPerWallet;

            return {
                success: true,
                reserveAmount: reserveAmount,
                amountPerWallet: amountPerWallet,
                totalDistributed: totalDistributed,
                successfulTransfers: successfulTransfers,
                results: results,
                finalWallet1Balance: this.getWallet(1).balance
            };

        } catch (error) {
            console.error('❌ SOL equalization failed:', error);
            throw error;
        }
    }
}

module.exports = WalletManager;