const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// 🧠 EPS/AI ফাইলের ভেতর থেকে লুকানো (Embedded) JPG প্রিভিউ বের করার ফাংশন
function extractEmbeddedPreview(filePath) {
    try {
        // ফাইলটি রিড করা হচ্ছে
        const content = fs.readFileSync(filePath, 'utf8');
        // ফাইলের ভেতরে থাকা XMP মেটাডাটা থেকে Base64 প্রিভিউ ইমেজটি খোঁজা হচ্ছে
        const match = content.match(/<xapGImg:image>(.*?)<\/xapGImg:image>/s) || 
                      content.match(/<xmpGImg:image>(.*?)<\/xmpGImg:image>/s);
        
        if (match && match[1]) {
            // অপ্রয়োজনীয় স্পেস বা ক্যারেক্টার মুছে ক্লিন Base64 ইমেজ রিটার্ন করা হচ্ছে
            const base64Data = match[1].replace(/&#xA;/g, '').replace(/\s/g, '');
            return base64Data;
        }
    } catch (error) {
        console.error("Preview extraction failed:", error.message);
    }
    return null;
}

// ======================== MAIN SEO GENERATION API ========================
app.post('/api/generate-seo', upload.single('image'), async (req, res) => {
    let fileToProcess = req.file?.path;

    try {
        const { apiKeys, imageType, titleWords, descWords, tagCount, customPrompt } = req.body;
        
        if (!apiKeys) return res.status(400).json({ error: "API Key is missing." });

        const keysArray = apiKeys.split(',').map(k => k.trim()).filter(k => k);
        const originalName = req.file ? req.file.originalname : "Stock Asset";
        const ext = originalName.split('.').pop().toLowerCase();

        // 👁️ জেমিনিকে সরাসরি ছবির দৃশ্য দেখতে বলা হচ্ছে
        let prompt = `You are an expert Microstock SEO specialist. Analyze the exact visual content, subject, and style directly from the image/preview provided. Generate engaging SEO metadata.
Original File Name: ${originalName}
Requirements:
1. Title: Catchy, commercial, and descriptive (around ${titleWords} words).
2. Description: Detailed, keyword-rich, and commercial (around ${descWords} words).
3. Tags: Exactly ${tagCount} highly searchable microstock keywords (comma separated).
${customPrompt ? `Additional Instruction: ${customPrompt}` : ''}

Respond STRICTLY in valid JSON format like this:
{"title": "your title", "description": "your description", "tags": ["tag1", "tag2"]}`;

        let inlineDataObj = null;

        if (fileToProcess && fs.existsSync(fileToProcess)) {
            if (ext === 'eps' || ext === 'ai') {
                // EPS/AI এর ভেতর থেকে প্রিভিউ এক্সট্রাক্ট করার চেষ্টা
                const embeddedBase64 = extractEmbeddedPreview(fileToProcess);
                if (embeddedBase64) {
                    console.log(`📸 Successfully extracted embedded JPG preview from ${originalName}`);
                    inlineDataObj = { data: embeddedBase64, mimeType: 'image/jpeg' };
                } else {
                    console.log(`⚠️ No embedded preview found. Passing as PDF document for ${originalName}`);
                    // প্রিভিউ না পেলে AI ফাইলকে ডকুমেন্ট (PDF) হিসেবে পাস করবে, কারণ AI ফাইল মূলত পিডিএফ-ই হয়
                    const fileBuffer = fs.readFileSync(fileToProcess);
                    inlineDataObj = { data: fileBuffer.toString("base64"), mimeType: 'application/pdf' };
                }
            } else {
                // সাধারণ ইমেজ (JPG, PNG, WebP)
                let mime = 'image/jpeg';
                if (ext === 'png') mime = 'image/png';
                else if (ext === 'webp') mime = 'image/webp';
                else if (ext === 'svg') mime = 'image/svg+xml';
                
                const fileBuffer = fs.readFileSync(fileToProcess);
                inlineDataObj = { data: fileBuffer.toString("base64"), mimeType: mime };
            }
        }

        let seoResult = null;
        let lastError = null;
        const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-1.5-flash'];

        for (let key of keysArray) {
            let keySuccess = false;
            for (let modelName of modelsToTry) {
                try {
                    const genAI = new GoogleGenerativeAI(key);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    
                    let result;
                    if (inlineDataObj) {
                        result = await model.generateContent([prompt, { inlineData: inlineDataObj }]);
                    } else {
                        // ফলব্যাক (যদি ফাইল রিড করতে না পারে)
                        result = await model.generateContent([prompt + ` (Note: Analyze based on filename: ${originalName})`]);
                    }

                    const responseText = result.response.text();
                    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                    seoResult = JSON.parse(cleanJson);
                    
                    console.log(`✨ Visual AI Success with Model [${modelName}] for: ${originalName}`);
                    keySuccess = true;
                    break; 

                } catch (err) {
                    lastError = err;
                    console.log(`⚠️ Model [${modelName}] failed. Trying next...`);
                }
            }
            if (keySuccess) break;
        }

        if (seoResult) {
            res.json(seoResult);
        } else {
            res.status(500).json({ error: "Failed to generate SEO.", details: lastError?.message });
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