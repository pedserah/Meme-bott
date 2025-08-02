const { NFTStorage, File, Blob } = require('nft.storage');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Fal.ai configuration
const FAL_KEY = "1300b449-e271-476b-b9f8-6f2d81841f06:1f0149c502fa8bc957713a8c78ba92e9";

// Initialize NFT.Storage client
const NFT_STORAGE_API_KEY = '7ce552b4.11e9175658bf48bca961d12383336670';
const nftStorage = new NFTStorage({ token: NFT_STORAGE_API_KEY });

// Create tmp directory if it doesn't exist
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
}

class MetadataManager {
    constructor() {
        this.storageClient = nftStorage;
        this.maxRetries = 2;
    }

    // Generate meme image using DALL·E 3 with retry logic
    async generateMemeImage(tokenName, tokenDescription, attempt = 1) {
        try {
            console.log(`🎨 Generating meme image for "${tokenName}" (attempt ${attempt}/${this.maxRetries + 1})`);

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
- Simple and clean design suitable for small sizes`;

            console.log('📝 Sending image generation request to DALL·E 3...');

            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024", // Generate at high res then we'll resize if needed
                quality: "standard",
                style: "vivid"
            });

            const imageUrl = response.data[0].url;
            console.log('✅ DALL·E 3 generated image:', imageUrl);

            return {
                imageUrl,
                prompt,
                success: true,
                attempt
            };

        } catch (error) {
            console.error(`❌ Error generating meme image (attempt ${attempt}):`, error.message);
            
            if (attempt < this.maxRetries + 1) {
                console.log(`🔄 Retrying image generation... (${attempt + 1}/${this.maxRetries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                return this.generateMemeImage(tokenName, tokenDescription, attempt + 1);
            }
            
            return {
                imageUrl: null,
                prompt: null,
                success: false,
                error: error.message,
                attempts: attempt
            };
        }
    }

    // Download and save image to temporary file
    async downloadAndSaveImage(imageUrl, tokenSymbol) {
        try {
            console.log('⬇️ Downloading generated image...');
            
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const fileName = `tmp_${tokenSymbol.toLowerCase()}_${Date.now()}.png`;
            const filePath = path.join(tmpDir, fileName);
            
            fs.writeFileSync(filePath, Buffer.from(response.data));
            
            console.log('✅ Image saved to temporary file:', filePath);
            return {
                success: true,
                filePath,
                fileName,
                buffer: Buffer.from(response.data)
            };
        } catch (error) {
            console.error('❌ Error downloading/saving image:', error.message);
            return {
                success: false,
                error: error.message,
                filePath: null,
                fileName: null,
                buffer: null
            };
        }
    }

    // Upload image to nft.storage with retry logic
    async uploadImageToNFTStorage(imageBuffer, fileName, attempt = 1) {
        try {
            console.log(`📤 Uploading image to nft.storage (attempt ${attempt}/${this.maxRetries + 1})...`);

            // Create a File object from the buffer
            const imageFile = new File([imageBuffer], fileName, { type: 'image/png' });

            // Upload to nft.storage
            const cid = await this.storageClient.storeBlob(imageFile);
            const ipfsUrl = `ipfs://${cid}`;
            const httpUrl = `https://nftstorage.link/ipfs/${cid}`;
            
            console.log('✅ Image uploaded to nft.storage:');
            console.log('   IPFS URL:', ipfsUrl);
            console.log('   HTTP URL:', httpUrl);
            
            return {
                success: true,
                cid,
                ipfsUrl,
                httpUrl,
                attempt
            };

        } catch (error) {
            console.error(`❌ Error uploading image to nft.storage (attempt ${attempt}):`, error.message);
            
            if (attempt < this.maxRetries + 1) {
                console.log(`🔄 Retrying nft.storage upload... (${attempt + 1}/${this.maxRetries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
                return this.uploadImageToNFTStorage(imageBuffer, fileName, attempt + 1);
            }
            
            return {
                success: false,
                error: error.message,
                attempts: attempt,
                cid: null,
                ipfsUrl: null,
                httpUrl: null
            };
        }
    }

    // Create and upload metadata JSON with retry logic
    async uploadMetadataToNFTStorage(tokenData, ipfsImageUrl, attempt = 1) {
        try {
            console.log(`📤 Creating and uploading metadata JSON (attempt ${attempt}/${this.maxRetries + 1})...`);

            // Create Metaplex-compatible metadata
            const metadata = {
                name: tokenData.name,
                symbol: tokenData.symbol,
                description: tokenData.description || `${tokenData.name} - A meme cryptocurrency token`,
                image: ipfsImageUrl, // Use IPFS URL format
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
                            uri: ipfsImageUrl,
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

            console.log('📋 Metadata structure created');

            // Create JSON file
            const metadataJson = JSON.stringify(metadata, null, 2);
            const metadataFileName = `${tokenData.symbol.toLowerCase()}-metadata.json`;
            const metadataFile = new File([metadataJson], metadataFileName, {
                type: 'application/json'
            });

            // Upload metadata JSON to nft.storage
            const metadataCid = await this.storageClient.storeBlob(metadataFile);
            const metadataIpfsUrl = `ipfs://${metadataCid}`;
            const metadataHttpUrl = `https://nftstorage.link/ipfs/${metadataCid}`;

            console.log('✅ Metadata uploaded to nft.storage:');
            console.log('   IPFS URL:', metadataIpfsUrl);
            console.log('   HTTP URL:', metadataHttpUrl);
            
            return {
                success: true,
                metadataIpfsUrl,
                metadataHttpUrl,
                metadataCid,
                metadata,
                attempt
            };

        } catch (error) {
            console.error(`❌ Error uploading metadata (attempt ${attempt}):`, error.message);
            
            if (attempt < this.maxRetries + 1) {
                console.log(`🔄 Retrying metadata upload... (${attempt + 1}/${this.maxRetries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
                return this.uploadMetadataToNFTStorage(tokenData, ipfsImageUrl, attempt + 1);
            }
            
            return {
                success: false,
                error: error.message,
                attempts: attempt,
                metadataIpfsUrl: null,
                metadataHttpUrl: null,
                metadataCid: null,
                metadata: null
            };
        }
    }

    // Complete process with proper error handling and retries
    async createCompleteTokenMetadata(tokenData) {
        const results = {
            success: false,
            error: null,
            generatedImageUrl: null,
            tempFilePath: null,
            ipfsImageUrl: null,
            httpImageUrl: null,
            metadataIpfsUrl: null,
            metadataHttpUrl: null,
            metadata: null,
            retryAttempts: {
                imageGeneration: 0,
                imageUpload: 0,
                metadataUpload: 0
            }
        };

        try {
            console.log('🚀 Starting complete token metadata creation with retries...');
            console.log('🪙 Token data:', { 
                name: tokenData.name, 
                symbol: tokenData.symbol, 
                description: tokenData.description 
            });

            // Step 1: Generate meme image with DALL·E 3 (with retries)
            const imageGeneration = await this.generateMemeImage(tokenData.name, tokenData.description);
            results.retryAttempts.imageGeneration = imageGeneration.attempt || 1;
            
            if (!imageGeneration.success) {
                results.error = `Image generation failed after ${results.retryAttempts.imageGeneration} attempts: ${imageGeneration.error}`;
                console.log('⚠️ Proceeding without image due to generation failure');
                return results; // Return with failure but continue token creation
            }

            results.generatedImageUrl = imageGeneration.imageUrl;

            // Step 2: Download and save image temporarily
            const downloadResult = await this.downloadAndSaveImage(imageGeneration.imageUrl, tokenData.symbol);
            
            if (!downloadResult.success) {
                results.error = `Image download failed: ${downloadResult.error}`;
                console.log('⚠️ Proceeding without image due to download failure');
                return results;
            }

            results.tempFilePath = downloadResult.filePath;

            // Step 3: Upload image to nft.storage (with retries)
            const imageUpload = await this.uploadImageToNFTStorage(downloadResult.buffer, downloadResult.fileName);
            results.retryAttempts.imageUpload = imageUpload.attempt || 1;
            
            if (!imageUpload.success) {
                results.error = `Image upload failed after ${results.retryAttempts.imageUpload} attempts: ${imageUpload.error}`;
                console.log('⚠️ Proceeding without image due to upload failure');
                this.cleanupTempFile(results.tempFilePath);
                return results;
            }

            results.ipfsImageUrl = imageUpload.ipfsUrl;
            results.httpImageUrl = imageUpload.httpUrl;

            // Step 4: Create and upload metadata JSON (with retries)
            const metadataUpload = await this.uploadMetadataToNFTStorage(tokenData, imageUpload.ipfsUrl);
            results.retryAttempts.metadataUpload = metadataUpload.attempt || 1;
            
            if (!metadataUpload.success) {
                results.error = `Metadata upload failed after ${results.retryAttempts.metadataUpload} attempts: ${metadataUpload.error}`;
                console.log('⚠️ Proceeding without metadata due to upload failure');
                this.cleanupTempFile(results.tempFilePath);
                return results;
            }

            results.metadataIpfsUrl = metadataUpload.metadataIpfsUrl;
            results.metadataHttpUrl = metadataUpload.metadataHttpUrl;
            results.metadata = metadataUpload.metadata;
            results.success = true;

            console.log('🎉 Complete token metadata creation successful!');
            console.log('📊 Final results:', {
                ipfsImageUrl: results.ipfsImageUrl,
                metadataIpfsUrl: results.metadataIpfsUrl,
                retryAttempts: results.retryAttempts
            });

            // Cleanup temp file
            this.cleanupTempFile(results.tempFilePath);

            return results;

        } catch (error) {
            console.error('❌ Complete token metadata creation failed:', error);
            results.error = error.message;
            
            // Cleanup temp file if it exists
            if (results.tempFilePath) {
                this.cleanupTempFile(results.tempFilePath);
            }
            
            return results;
        }
    }

    // Clean up temporary files
    cleanupTempFile(filePath) {
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log('🧹 Cleaned up temporary file:', filePath);
            } catch (error) {
                console.error('⚠️ Failed to cleanup temp file:', error.message);
            }
        }
    }

    // Test connections
    async testConnections() {
        try {
            console.log('🔍 Testing API connections...');
            
            // Test nft.storage connection
            const testData = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
            const testFile = new File([testData], 'test.json', { type: 'application/json' });
            
            const cid = await this.storageClient.storeBlob(testFile);
            const testUri = `https://nftstorage.link/ipfs/${cid}`;
            
            console.log('✅ nft.storage connection successful');
            console.log('🔗 Test file URI:', testUri);
            
            return { 
                success: true, 
                nftStorage: true,
                testUri, 
                cid 
            };
        } catch (error) {
            console.error('❌ API connections test failed:', error);
            return { 
                success: false, 
                nftStorage: false,
                error: error.message 
            };
        }
    }
}

module.exports = MetadataManager;