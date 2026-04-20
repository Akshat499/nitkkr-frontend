/* ════════════════════════════════════════════
   NIT KKR — PDF Parser v3
   Strategy:
   1. Try pdf.js (handles compressed PDFs)
   2. If pdf.js fails/slow → try raw text extraction
   3. Always returns within 20s
════════════════════════════════════════════ */

const PDFParser = (() => {

  // ── Load pdf.js dynamically ───────────────
  function _loadPdfJs() {
    return new Promise((resolve) => {
      if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

      // Timeout: if CDN doesn't load in 8s, resolve with null
      const timer = setTimeout(() => resolve(null), 8000);

      script.onload = () => {
        clearTimeout(timer);
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          resolve(null);
        }
      };
      script.onerror = () => { clearTimeout(timer); resolve(null); };
      document.head.appendChild(script);
    });
  }

  // ── Extract text using pdf.js ─────────────
  async function _extractWithPdfJs(bytes) {
    const lib = await _loadPdfJs();
    if (!lib) throw new Error('pdf.js not available');

    const pdf  = await lib.getDocument({ data: bytes }).promise;
    let text   = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Group by Y position to preserve line order
      const items = content.items;
      let lastY = null;
      items.forEach(item => {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          text += '\n';
        }
        text += item.str + ' ';
        lastY = item.transform[5];
      });
      text += '\n\n';
    }
    return { text, pageCount: pdf.numPages };
  }

  // ── Fallback: decode ASCII85 + inflate ────
  // For ReportLab / standard PDFs with ASCII85Decode+FlateDecode
  async function _extractFallback(bytes) {
    // Convert to string to find stream boundaries
    let raw = '';
    for (let i = 0; i < Math.min(bytes.length, 500000); i++) {
      raw += String.fromCharCode(bytes[i]);
    }

    // Find all stream...endstream blocks
    let text = '';
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;

    while ((match = streamRegex.exec(raw)) !== null) {
      const streamData = match[1];
      // Try to find readable text patterns in stream
      const readable = streamData.replace(/[^\x20-\x7E\n]/g, ' ');
      // Extract parenthesized strings (PDF text operators)
      const paren = readable.match(/\(([^)]{3,})\)/g);
      if (paren) {
        paren.forEach(p => {
          text += p.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, ' ') + ' ';
        });
      }
    }

    // If still nothing, try broad ASCII extraction
    if (text.trim().length < 100) {
      let run = '', result = '';
      for (let i = 0; i < bytes.length; i++) {
        const c = bytes[i];
        if (c >= 32 && c <= 126) {
          run += String.fromCharCode(c);
        } else {
          if (run.length > 5) result += run + ' ';
          run = '';
        }
      }
      text = result;
    }

    return { text, pageCount: 1 };
  }

  // ── Parse questions from extracted text ───
  function _parseQuestions(text, subject) {
    const questions = [];

    if (!text || text.trim().length < 20) return questions;

    // Normalize whitespace
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

    /* ── Pattern matching for question starts ──
       Supports:
         1.  1)  1:           → numbered
         Q1  Q.1  Q-1         → Q-prefixed
         Question 1           → written out
    */
    // Patterns: "1. text"  "1) text"  "Q1. text"  "Q.1 text"  "1 1. text" (line-num + q-num)
    const Q_RE = /^(?:\d+\s+)?(?:Q(?:uestion)?\s*[\.\-]?\s*(\d{1,2})[\s\.\)\-:]|(\d{1,2})[\.\)]\s+[A-Za-z])/i;

    const starts = [];
    lines.forEach((line, idx) => {
      const m = line.match(Q_RE);
      if (!m) return;
      const num = parseInt(m[1] || m[2]);
      if (num < 1 || num > 30) return;         // sanity check
      const rest = line.replace(Q_RE, '').trim();
      if (rest.length < 5) return;             // skip lone "1." lines
      if (/^\d+$/.test(rest)) return;          // skip if rest is just a number
      starts.push({ idx, num, line });
    });

    // Need at least 2 question starts to be confident
    if (starts.length >= 2) {
      starts.forEach((s, i) => {
        const endIdx = i + 1 < starts.length ? starts[i + 1].idx : lines.length;
        const qLines = lines.slice(s.idx, endIdx);
        const full   = qLines.join(' ').replace(/\s+/g, ' ').trim();
        const clean  = _cleanText(full, s.num);
        if (clean.length < 10) return;
        questions.push({
          number: 'Q' + s.num,
          text:   clean,
          marks:  _extractMarks(full),
        });
      });
      return questions;
    }

    // ── Fallback: split on blank lines / sentence ends ──
    const SKIP = /(?:institute|kurukshetra|department|examination|time allowed|max.*mark|instruction|attempt only|roll no|invigilator|page \d|^\d+$)/i;
    const chunks = normalized
      .split(/\n{2,}/)
      .map(c => c.replace(/\s+/g, ' ').trim())
      .filter(c => c.length > 30 && !SKIP.test(c));

    let qNum = 1;
    chunks.forEach(chunk => {
      questions.push({
        number: 'Q' + qNum++,
        text:   _cleanText(chunk, 0),
        marks:  _extractMarks(chunk),
      });
    });

    return questions;
  }

  function _extractMarks(text) {
    const m =
      text.match(/\[(\d{1,2})\s*(?:marks?)?\]/i) ||
      text.match(/\((\d{1,2})\s*(?:marks?)?\)/i) ||
      text.match(/(\d{1,2})\s+marks?\b/i)         ||
      text.match(/marks?\s*:\s*(\d{1,2})/i);
    return m ? parseInt(m[1]) : null;
  }

  function _cleanText(text, num) {
    return text
      // Remove leading "1 1." or "1." or "Q1." prefix
      .replace(/^\d+\s+/, '')              // remove leading line-number
      .replace(new RegExp('^Q(?:uestion)?\\s*[.\\-]?\\s*' + num + '[\\s.\\)\\-:]*', 'i'), '')
      .replace(/^\d{1,2}[.):] ?/, '')      // remove "1. " or "1) "
      .replace(/\[\d{1,2}\s*(?:marks?)?\]/gi, '')
      .replace(/\(\d{1,2}\s*marks?\)/gi, '')
      .replace(/CO\s*\d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ── Main public function ───────────────────
  async function extract(base64) {
    // base64 → bytes
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    let extractResult = null;
    let method = '';

    // ── Try pdf.js first (best quality) ──────
    try {
      const pdfResult = await Promise.race([
        _extractWithPdfJs(bytes),
        new Promise((_, rej) => setTimeout(() => rej(new Error('pdfjs_timeout')), 12000))
      ]);
      if (pdfResult && pdfResult.text.trim().length > 50) {
        extractResult = pdfResult;
        method = 'pdfjs';
      }
    } catch(e) {
      console.warn('[PDFParser] pdf.js failed:', e.message, '— trying fallback');
    }

    // ── Fallback if pdf.js failed/timed out ──
    if (!extractResult) {
      try {
        extractResult = await _extractFallback(bytes);
        method = 'fallback';
      } catch(e) {
        console.error('[PDFParser] fallback failed:', e);
        extractResult = { text: '', pageCount: 1 };
        method = 'none';
      }
    }

    const questions = _parseQuestions(extractResult.text);

    console.log(`[PDFParser] method=${method} chars=${extractResult.text.length} questions=${questions.length}`);

    return {
      success:   questions.length > 0,
      questions: questions,
      rawText:   extractResult.text,
      pageCount: extractResult.pageCount,
      qCount:    questions.length,
      method:    method,
    };
  }

  return { extract };

})();