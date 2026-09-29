const dns = require('dns');
// 🎯 Node.js-এর 'fetch failed' (IPv6) বাগ ফিক্স করার জন্য IPv4 ফোর্স করা হলো
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

if (!fs.existsSync('uploads')) { 
    fs.mkdirSync('uploads'); 
}

const upload = multer({ dest: 'uploads/' });

let activeKeyPointer = {
    gemini: 0,
    mistral: 0
};

// 🚀 Node.js Native HTTPS Request (যাতে কখনোই 'fetch failed' না আসে)
function httpsPostJson(urlString, headers, bodyObj) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);
        const payload = JSON.stringify(bodyObj);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            family: 4, // Force IPv4
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                ...headers
            },
            timeout: 60000 // 60 seconds timeout
        };

        const req = https.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                let parsedData = {};
                try { parsedData = JSON.parse(rawData); } catch (e) { parsedData = { raw: rawData }; }
                resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsedData });
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request Timeout'));
        });

        req.write(payload);
        req.end();
    });
}

function extractEmbeddedPreview(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/<xapGImg:image>(.*?)<\/xapGImg:image>/s) || 
                      content.match(/<xmpGImg:image>(.*?)<\/xmpGImg:image>/s);
        if (match && match[1]) return match[1].replace(/&#xA;/g, '').replace(/\s/g, '');
    } catch (error) {}
    return null;
}

function parseAiJson(text) {
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanText);
    if (typeof parsed.tags === 'string') {
        parsed.tags = parsed.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    return parsed;
}

app.post('/api/generate-seo', upload.single('image'), async (req, res) => {
    let fileToProcess = req.file?.path;

    try {
        const { aiProvider = 'gemini', apiKeys, imageType, aiModel, titleWords, descWords, tagCount, customPrompt } = req.body;
        
        if (!apiKeys) return res.status(400).json({ error: "API Key is missing." });

        const keysArray = apiKeys.split(',').map(k => k.trim()).filter(k => k);
        if (keysArray.length === 0) return res.status(400).json({ error: "No valid API keys provided." });

        const originalName = req.body.originalName || (req.file ? req.file.originalname : "Stock Asset");
        const ext = req.file ? req.file.originalname.split('.').pop().toLowerCase() : 'jpg';
        const isVideo = ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext);

        if (aiProvider === 'mistral' && isVideo) {
            return res.status(400).json({ error: "Mistral AI does not support Video files! Switch to Gemini." });
        }

        let prompt = `You are an expert Microstock SEO specialist. Analyze the exact visual content directly from the image/video provided. Generate engaging SEO metadata.
Asset Type: ${imageType || 'Photography'}
Original File Name: ${originalName}
Requirements:
1. Title: Catchy, commercial, and descriptive (around ${titleWords} words).
2. Description: Detailed, keyword-rich, and commercial (around ${descWords} words).
3. Tags: Exactly ${tagCount} highly searchable microstock keywords (array of strings).
${customPrompt ? `Additional Instruction: ${customPrompt}` : ''}

Respond STRICTLY in valid JSON format like this:
{"title": "your title", "description": "your description", "tags": ["tag1", "tag2"]}`;

        let inlineDataObj = null;
        let mimeType = req.file?.mimetype || 'video/mp4';

        if (!isVideo && fileToProcess && fs.existsSync(fileToProcess)) {
            if (ext === 'eps' || ext === 'ai') {
                const embeddedBase64 = extractEmbeddedPreview(fileToProcess);
                if (embeddedBase64) {
                    inlineDataObj = { data: embeddedBase64, mimeType: 'image/jpeg' };
                } else {
                    const fileBuffer = fs.readFileSync(fileToProcess);
                    inlineDataObj = { data: fileBuffer.toString("base64"), mimeType: 'application/pdf' };
                }
            } else {
                let mime = 'image/jpeg';
                if (ext === 'png') mime = 'image/png';
                else if (ext === 'webp') mime = 'image/webp';
                else if (ext === 'svg') mime = 'image/svg+xml';
                else if (ext === 'pdf') mime = 'application/pdf';
                
                const fileBuffer = fs.readFileSync(fileToProcess);
                inlineDataObj = { data: fileBuffer.toString("base64"), mimeType: mime };
            }
        }

        let seoResult = null;
        let lastErrorMessage = null;
        let isLimitReached = false;
        let usedKeyNumber = null;
        let usedKeyHint = null;

        const startIdx = (activeKeyPointer[aiProvider] || 0) % keysArray.length;

        // ==========================================
        // 🤖 MISTRAL AI (PIXTRAL VISION) LOGIC
        // ==========================================
        if (aiProvider === 'mistral') {
            const validMistralModels = ['pixtral-12b-2409', 'pixtral-large-latest'];
            let mistralModels = [...validMistralModels];
            if (aiModel && aiModel !== 'auto' && validMistralModels.includes(aiModel)) {
                mistralModels = mistralModels.filter(m => m !== aiModel);
                mistralModels.unshift(aiModel);
            }

            for (let offset = 0; offset < keysArray.length; offset++) {
                const keyIndex = (startIdx + offset) % keysArray.length;
                const key = keysArray[keyIndex];
                let keySuccess = false;
                let skipKey = false;

                for (let modelName of mistralModels) {
                    if (skipKey) break;

                    try {
                        let contentArray = [{ type: "text", text: prompt }];
                        if (inlineDataObj && inlineDataObj.mimeType.startsWith('image/')) {
                            contentArray.push({
                                type: "image_url",
                                image_url: `data:${inlineDataObj.mimeType};base64,${inlineDataObj.data}`
                            });
                        } else {
                            contentArray[0].text += `\n(Analyze based on filename: ${originalName})`;
                        }

                        const response = await httpsPostJson(
                            'https://api.mistral.ai/v1/chat/completions',
                            { 'Authorization': `Bearer ${key}` },
                            {
                                model: modelName,
                                messages: [{ role: "user", content: contentArray }],
                                response_format: { type: "json_object" }
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`${response.status}: ${response.data?.message || JSON.stringify(response.data)}`);
                        }

                        const responseText = response.data.choices[0].message.content;
                        seoResult = parseAiJson(responseText);

                        activeKeyPointer.mistral = keyIndex;
                        usedKeyNumber = keyIndex + 1;
                        usedKeyHint = `..${key.slice(-4)}`;
                        console.log(`✨ Success with Mistral Key #${usedKeyNumber} [${modelName}] for: ${originalName}`);
                        keySuccess = true;
                        break;
                    } catch (err) {
                        lastErrorMessage = err.message;
                        console.log(`⚠️ Mistral Key #${keyIndex + 1} [${modelName}] Error:`, err.message);
                        if (err.message.includes('429') || err.message.toLowerCase().includes('rate') || err.message.toLowerCase().includes('quota')) {
                            isLimitReached = true;
                            skipKey = true;
                        } else if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
                            skipKey = true;
                        }
                    }
                }
                if (keySuccess) break;
            }
        } 
        // ==========================================
        // ⚡ GOOGLE GEMINI AI LOGIC
        // ==========================================
        else {
            const validGeminiModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
            let modelsToTry = [...validGeminiModels];
            if (aiModel && aiModel !== 'auto' && validGeminiModels.includes(aiModel)) {
                modelsToTry = modelsToTry.filter(m => m !== aiModel);
                modelsToTry.unshift(aiModel); 
            }

            for (let offset = 0; offset < keysArray.length; offset++) {
                const keyIndex = (startIdx + offset) % keysArray.length;
                const key = keysArray[keyIndex];
                let keySuccess = false;
                let skipKey = false; 

                for (let modelName of modelsToTry) {
                    if (skipKey) break;

                    try {
                        let responseText = '';

                        if (isVideo && fileToProcess) {
                            const genAI = new GoogleGenerativeAI(key);
                            const model = genAI.getGenerativeModel({ model: modelName });
                            const fileManager = new GoogleAIFileManager(key);
                            const uploadResult = await fileManager.uploadFile(fileToProcess, {
                                mimeType: mimeType,
                                displayName: originalName,
                            });

                            let fileState = await fileManager.getFile(uploadResult.file.name);
                            while (fileState.state === "PROCESSING") {
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                fileState = await fileManager.getFile(uploadResult.file.name);
                            }

                            if (fileState.state === "FAILED") throw new Error("Video processing failed.");

                            const result = await model.generateContent([
                                prompt,
                                { fileData: { fileUri: uploadResult.file.uri, mimeType: uploadResult.file.mimeType } }
                            ]);
                            responseText = result.response.text();
                            try { await fileManager.deleteFile(uploadResult.file.name); } catch(e){}
                        } else {
                            // ইমেজের জন্য সরাসরি IPv4 HTTPS ব্যবহার করা হচ্ছে যাতে fetch failed না হয়
                            let parts = [{ text: prompt }];
                            if (inlineDataObj) {
                                parts.push({
                                    inline_data: {
                                        mime_type: inlineDataObj.mimeType,
                                        data: inlineDataObj.data
                                    }
                                });
                            } else {
                                parts[0].text += ` (Analyze based on filename: ${originalName})`;
                            }

                            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
                            const response = await httpsPostJson(geminiUrl, {}, {
                                contents: [{ parts }]
                            });

                            if (!response.ok) {
                                throw new Error(`${response.status}: ${response.data?.error?.message || JSON.stringify(response.data)}`);
                            }

                            responseText = response.data.candidates[0].content.parts[0].text;
                        }

                        seoResult = parseAiJson(responseText);
                        
                        activeKeyPointer.gemini = keyIndex;
                        usedKeyNumber = keyIndex + 1;
                        usedKeyHint = `..${key.slice(-4)}`;
                        console.log(`✨ Success with Gemini Key #${usedKeyNumber} [${modelName}] for: ${originalName}`);
                        keySuccess = true;
                        break; 
                    } catch (err) {
                        lastErrorMessage = err.message;
                        console.log(`⚠️ Gemini Key #${keyIndex + 1} [${modelName}] Error:`, err.message);
                        if (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('limit') || err.message.toLowerCase().includes('exhausted')) {
                            isLimitReached = true;
                            skipKey = true; 
                        } else if (err.message.toLowerCase().includes('api_key_invalid') || err.message.includes('400') || err.message.includes('403')) {
                            skipKey = true;
                        }
                    }
                }
                if (keySuccess) break;
            }
        }

        if (seoResult) {
            res.json({
                ...seoResult,
                usedKeyNumber,
                usedKeyHint
            });
        } else {
            res.status(isLimitReached ? 429 : 500).json({ 
                error: isLimitReached ? "All API keys limit reached" : "Failed to generate SEO", 
                details: lastErrorMessage 
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (fileToProcess && fs.existsSync(fileToProcess)) {
            try { fs.unlinkSync(fileToProcess); } catch(e) {}
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
