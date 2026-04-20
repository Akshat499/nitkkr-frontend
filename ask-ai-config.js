/* ════════════════════════════════════════════
   NIT KKR — Ask AI Configuration
   
   MODE options:
     "groq"   → Groq free API (recommended) ✅
     "rag"    → Your LangChain RAG backend
     "claude" → Claude API (paid)
════════════════════════════════════════════ */

const AskAIConfig = {

  // ── SET MODE ──────────────────────────────
  MODE: "groq",   // "groq" | "rag" | "claude"

  // ── GROQ CONFIG ───────────────────────────
  GROQ_API_KEY: "",   // ← paste your key here if needed, but DO NOT push to github
  GROQ_MODEL:   "llama-3.3-70b-versatile",  // best free model

  // ── RAG CONFIG (if MODE = "rag") ──────────
  RAG_BACKEND_URL: "http://localhost:8001/api/ask",
  TIMEOUT_MS: 30000,
};