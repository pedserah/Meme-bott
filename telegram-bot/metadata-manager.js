const { NFTStorage, File, Blob } = require('nft.storage');
const axios = require('axios');
const OpenAI = require('openai');

// Initialize NFT.Storage client
const NFT_STORAGE_API_KEY = '7ce552b4.11e9175658bf48bca961d12383336670';
const nftStorage = new NFTStorage({ token: NFT_STORAGE_API_KEY });

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: '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'
});

class MetadataManager {
    constructor() {
        this.storageClient = nftStorage;
    }

    // Generate meme image using DALL·E 3
    async generateMemeImage(tokenName, tokenDescription) {
        try {
            console.log(`🎨 Generating meme image for "${tokenName}" with DALL·E 3...`);

            const prompt = `Create a fun cartoon-style meme coin logo for "${tokenName}".
Description: ${tokenDescription || 'A fun meme cryptocurrency'}

Style Requirements:
- Cartoon style, colorful and vibrant
- Circular logo design perfect for a cryptocurrency
- Fun, meme-worthy, and viral potential
- Bold, eye-catching colors with high contrast
- Professional but playful appearance
- Include subtle cryptocurrency elements if appropriate
- Make it memorable and shareable
- No text or words in the image
- Square aspect ratio suitable for token logo`;

            console.log('📝 Sending image generation request to DALL·E 3...');

            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "vivid"
            });

            const imageUrl = response.data[0].url;
            console.log('✅ DALL·E 3 generated image:', imageUrl);

            return {
                imageUrl,
                prompt,
                success: true
            };

        } catch (error) {
            console.error('❌ Error generating meme image:', error);
            return {
                imageUrl: null,
                prompt: null,
                success: false,
                error: error.message
            };
        }
    }

    // Download image from URL
    async downloadImage(imageUrl) {
        try {
            console.log('⬇️ Downloading generated image...');
            
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            console.log('✅ Image downloaded successfully');
            return Buffer.from(response.data);
        } catch (error) {
            console.error('❌ Error downloading image:', error.message);
            throw new Error(`Failed to download image: ${error.message}`);
        }
    }

    // Upload image to nft.storage
    async uploadImageToNFTStorage(imageBuffer, fileName) {
        try {
            console.log('📤 Uploading image to nft.storage...');

            // Create a File object from the buffer
            const imageFile = new File([imageBuffer], fileName, { type: 'image/png' });

            // Upload to nft.storage
            const cid = await this.storageClient.storeBlob(imageFile);
            const imageUri = `https://nftstorage.link/ipfs/${cid}`;
            
            console.log('✅ Image uploaded to nft.storage:', imageUri);
            return {
                cid,
                imageUri,
                success: true
            };

        } catch (error) {
            console.error('❌ Error uploading image to nft.storage:', error);
            return {
                cid: null,
                imageUri: null,
                success: false,
                error: error.message
            };
        }
    }

    // Create and upload metadata JSON
    async uploadMetadataToNFTStorage(tokenData, imageUri) {
        try {
            console.log('📤 Creating and uploading metadata JSON to nft.storage...');

            // Create Metaplex-compatible metadata
            const metadata = {
                name: tokenData.name,
                symbol: tokenData.symbol,
                description: tokenData.description || `${tokenData.name} - A meme cryptocurrency token`,
                image: imageUri,
                attributes: [
                    {
                        trait_type: "Token Type",
                        value: "Meme Coin"
                    },
                    {
                        trait_type: "Supply",
                        value: tokenData.totalSupply.toString()
                    },
                    {
                        trait_type: "Network", 
                        value: "Solana Devnet"
                    },
                    {
                        trait_type: "Standard",
                        value: "SPL Token"
                    }
                ],
                properties: {
                    category: "image",
                    files: [
                        {
                            uri: imageUri,
                            type: "image/png"
                        }
                    ],
                    creators: [
                        {
                            address: tokenData.creator || "Meme Bot Creator",
                            share: 100
                        }
                    ]
                },
                external_url: "https://solana.com",
                collection: {
                    name: "Meme Bot Tokens",
                    family: "Solana Meme Coins"
                }
            };

            console.log('📋 Metadata structure:', JSON.stringify(metadata, null, 2));

            // Create JSON file
            const metadataJson = JSON.stringify(metadata, null, 2);
            const metadataFile = new File([metadataJson], `${tokenData.symbol.toLowerCase()}-metadata.json`, {
                type: 'application/json'
            });

            // Upload metadata JSON to nft.storage
            const metadataCid = await this.storageClient.storeBlob(metadataFile);
            const metadataUri = `https://nftstorage.link/ipfs/${metadataCid}`;

            console.log('✅ Metadata uploaded to nft.storage:', metadataUri);
            
            return {
                metadataUri,
                metadataCid,
                metadata,
                success: true
            };

        } catch (error) {
            console.error('❌ Error uploading metadata to nft.storage:', error);
            return {
                metadataUri: null,
                metadataCid: null,
                metadata: null,
                success: false,
                error: error.message
            };
        }
    }

    // Complete process: Generate image and upload everything
    async createCompleteTokenMetadata(tokenData) {
        try {
            console.log('🚀 Starting complete token metadata creation process...');
            console.log('🪙 Token data:', { 
                name: tokenData.name, 
                symbol: tokenData.symbol, 
                description: tokenData.description 
            });

            // Step 1: Generate meme image with DALL·E 3
            const imageGeneration = await this.generateMemeImage(tokenData.name, tokenData.description);
            
            if (!imageGeneration.success) {
                throw new Error(`Image generation failed: ${imageGeneration.error}`);
            }

            // Step 2: Download the generated image
            const imageBuffer = await this.downloadImage(imageGeneration.imageUrl);

            // Step 3: Upload image to nft.storage
            const fileName = `${tokenData.symbol.toLowerCase()}-logo.png`;
            const imageUpload = await this.uploadImageToNFTStorage(imageBuffer, fileName);
            
            if (!imageUpload.success) {
                throw new Error(`Image upload failed: ${imageUpload.error}`);
            }

            // Step 4: Create and upload metadata JSON
            const metadataUpload = await this.uploadMetadataToNFTStorage(tokenData, imageUpload.imageUri);
            
            if (!metadataUpload.success) {
                throw new Error(`Metadata upload failed: ${metadataUpload.error}`);
            }

            const result = {
                success: true,
                generatedImageUrl: imageGeneration.imageUrl,
                imageUri: imageUpload.imageUri,
                imageCid: imageUpload.cid,
                metadataUri: metadataUpload.metadataUri,
                metadataCid: metadataUpload.metadataCid,
                metadata: metadataUpload.metadata,
                prompt: imageGeneration.prompt
            };

            console.log('🎉 Complete token metadata creation successful!');
            console.log('📊 Final result:', {
                imageUri: result.imageUri,
                metadataUri: result.metadataUri
            });

            return result;

        } catch (error) {
            console.error('❌ Complete token metadata creation failed:', error);
            return {
                success: false,
                error: error.message,
                generatedImageUrl: null,
                imageUri: null,
                imageCid: null,
                metadataUri: null,
                metadataCid: null,
                metadata: null
            };
        }
    }

    // Test nft.storage connection
    async testConnection() {
        try {
            console.log('🔍 Testing nft.storage connection...');
            
            // Create a small test file
            const testData = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
            const testFile = new File([testData], 'test.json', { type: 'application/json' });
            
            const cid = await this.storageClient.storeBlob(testFile);
            const testUri = `https://nftstorage.link/ipfs/${cid}`;
            
            console.log('✅ nft.storage connection successful');
            console.log('🔗 Test file URI:', testUri);
            
            return { success: true, testUri, cid };
        } catch (error) {
            console.error('❌ nft.storage connection failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = MetadataManager;