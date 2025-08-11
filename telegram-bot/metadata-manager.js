const AIIntegrations = require('./ai-integrations');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class MetadataManager {
    constructor() {
        this.aiIntegrations = new AIIntegrations();
        console.log('📝 Metadata Manager initialized');
    }

    // Generate complete token metadata with AI image
    async generateTokenMetadata(tokenName, tokenSymbol, description) {
        try {
            console.log(`📝 Generating metadata for ${tokenName} (${tokenSymbol})`);
            
            let imageUrl = '';
            let imageGenerated = false;
            
            // Try to generate image with AI
            if (description) {
                const imagePrompt = `Cute meme token logo for ${tokenName}, colorful, fun, cartoon style, crypto theme`;
                const imageResult = await this.aiIntegrations.generateImage(imagePrompt);
                
                if (imageResult.success && imageResult.images?.length > 0) {
                    imageUrl = imageResult.images[0].url;
                    imageGenerated = true;
                    console.log('✅ AI image generated successfully');
                } else {
                    console.log('⚠️ AI image generation failed, proceeding without image');
                }
            }
            
            // Create metadata JSON
            const metadata = {
                name: tokenName,
                symbol: tokenSymbol,
                description: description || `${tokenName} - A meme token on Solana`,
                image: imageUrl,
                external_url: '',
                animation_url: '',
                attributes: [
                    {
                        trait_type: 'Token Type',
                        value: 'Meme Token'
                    },
                    {
                        trait_type: 'Network',
                        value: 'Solana'
                    },
                    {
                        trait_type: 'AI Generated',
                        value: imageGenerated ? 'Yes' : 'No'
                    }
                ],
                properties: {
                    category: 'image',
                    files: imageUrl ? [
                        {
                            uri: imageUrl,
                            type: 'image/png'
                        }
                    ] : []
                },
                collection: {
                    name: 'Meme Token Collection',
                    family: 'Solana Meme Tokens'
                }
            };
            
            // Upload metadata to IPFS (using nft.storage)
            const metadataUrl = await this.uploadToIPFS(metadata, `${tokenSymbol}_metadata.json`);
            
            return {
                success: true,
                metadata: metadata,
                metadataUrl: metadataUrl,
                imageUrl: imageUrl,
                imageGenerated: imageGenerated
            };
        } catch (error) {
            console.error('❌ Metadata generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload data to IPFS using nft.storage
    async uploadToIPFS(data, filename) {
        try {
            console.log(`📤 Uploading ${filename} to IPFS...`);
            
            // For devnet testing, we'll simulate IPFS upload
            // In production, you would use nft.storage or another IPFS service
            
            const mockCID = this.generateMockCID();
            const ipfsUrl = `https://nftstorage.link/ipfs/${mockCID}`;
            
            console.log(`✅ Mock IPFS upload complete: ${ipfsUrl}`);
            
            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return ipfsUrl;
        } catch (error) {
            console.error('❌ IPFS upload failed:', error);
            throw error;
        }
    }

    // Generate mock IPFS CID for testing
    generateMockCID() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'Qm';
        for (let i = 0; i < 44; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Auto-generate token branding
    async autoGenerateTokenBranding(baseDescription) {
        try {
            console.log('🎨 Auto-generating token branding...');
            
            // Generate name and symbol
            const nameResult = await this.aiIntegrations.generateTokenName(baseDescription);
            if (!nameResult.success) {
                throw new Error(`Name generation failed: ${nameResult.error}`);
            }
            
            // Generate enhanced description
            const descResult = await this.aiIntegrations.generateDescription(
                nameResult.name, 
                nameResult.symbol
            );
            
            const finalDescription = descResult.success ? descResult.description : nameResult.description;
            
            // Generate complete metadata
            const metadataResult = await this.generateTokenMetadata(
                nameResult.name,
                nameResult.symbol,
                finalDescription
            );
            
            return {
                success: true,
                name: nameResult.name,
                symbol: nameResult.symbol,
                description: finalDescription,
                metadata: metadataResult.success ? metadataResult.metadata : null,
                metadataUrl: metadataResult.success ? metadataResult.metadataUrl : null,
                imageUrl: metadataResult.success ? metadataResult.imageUrl : null
            };
        } catch (error) {
            console.error('❌ Auto-branding failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = MetadataManager;