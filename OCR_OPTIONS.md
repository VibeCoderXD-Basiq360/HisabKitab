# OCR Provider Options for Receipt Scanning

Current implementation: **Google Gemini 1.5 Flash** (`GEMINI_API_KEY` in `.env`)

| # | Provider | Free Tier | Key needed | Accuracy | Notes |
|---|----------|-----------|------------|----------|-------|
| 1 | **Google Gemini 1.5 Flash** *(current)* | 1,500 req/day | aistudio.google.com | ⭐⭐⭐⭐⭐ | Best structured extraction, understands context |
| 2 | **Tesseract.js** | Unlimited (runs in browser) | None | ⭐⭐⭐ | Free forever, raw text — needs regex parsing |
| 3 | **OCR.space** | 25,000 req/month | ocr.space/OCRAPI | ⭐⭐⭐ | Returns raw text, not structured JSON |
| 4 | **Mistral Pixtral-12B** | ~1M tokens/month free | console.mistral.ai | ⭐⭐⭐⭐⭐ | European alternative to Gemini, similar quality |
| 5 | **Groq + Llama 3.2 Vision** | 7,000 req/day | console.groq.com | ⭐⭐⭐⭐ | Very fast inference, free tier |
| 6 | **Cloudflare Workers AI** | 10,000 req/day | Free Cloudflare account | ⭐⭐⭐⭐ | Llama vision models, zero billing setup |
| 7 | **Azure Computer Vision** | 5,000 req/month | Azure free account | ⭐⭐⭐ | Raw OCR text, good handwriting support |
| 8 | **OpenAI GPT-4o mini** | None (paid) | platform.openai.com | ⭐⭐⭐⭐⭐ | ~$0.0001/receipt, cheapest paid option |

## Switching providers

All providers are swapped in one file: `Backend/src/modules/ocr/ocr.controller.js`
The env var to change is in `Backend/.env` (currently `GEMINI_API_KEY`).

## Recommendations

- **No setup cost ever** → Tesseract.js (parse raw text yourself)
- **Best free + structured** → Gemini (current) or Mistral Pixtral
- **Fastest response** → Groq
- **Already have OpenAI** → GPT-4o mini (~$0.0001/receipt)
