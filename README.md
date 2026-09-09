# 🚀 Lihan SEO Master - Microstock SEO Generator

**Lihan SEO Master** is an ultra-fast, web-based Microstock SEO metadata generation tool powered by Google's Gemini AI. Designed specifically for microstock contributors (Adobe Stock, Shutterstock, Freepik, etc.), this tool automates the process of generating highly searchable titles, commercial descriptions, and relevant keywords for your assets.

![Lihan SEO Master](public/icon.png)

## ✨ Key Features

* **⚡ Super-Fast Batch Processing:** Process multiple files concurrently (user-adjustable from 1 to 15 files at a time). Overcomes server latency and generates metadata in seconds.
* **🧠 Smart EPS/AI Extraction:** Extracts hidden JPG previews directly from vector files (`.eps`, `.ai`) right in the browser! This reduces a 50MB upload to just a few kilobytes, making the process blazing fast.
* **🤖 Multi-Model Gemini Integration:** Choose between models like `Gemini 1.5 Flash`, `Gemini 1.5 Pro`, or `Auto`. Includes a smart fallback system—if one API key hits a rate limit (429 Quota Error), it seamlessly switches to the next one.
* **📱 Glassmorphism Mobile UI:** A premium, fully responsive UI with a touch-friendly off-canvas sidebar and glassmorphism effects.
* **🔐 Secure API Key Management:** Add multiple Gemini API keys. Keys are securely saved to your local browser storage (`localStorage`) with a visible toggle feature.
* **🎯 Custom Prompt Injection:** Add your own custom instructions to guide the AI for specific artistic styles or themes.
* **📥 CSV Export:** One-click export to CSV formats compatible with major microstock agencies (like Adobe Stock).

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Glassmorphism Design), Vanilla JavaScript.
* **Backend:** Node.js, Express.js.
* **File Handling:** Multer, Custom Browser-side FileReader API.
* **AI Provider:** Google Generative AI SDK (`@google/generative-ai`).

## ⚙️ Installation & Local Setup

Follow these steps to run the project on your local machine:

**1. Clone the repository or download the files:**
```bash
git clone [https://github.com/your-username/lihan-seo-master.git](https://github.com/your-username/lihan-seo-master.git)
cd lihan-seo-master
