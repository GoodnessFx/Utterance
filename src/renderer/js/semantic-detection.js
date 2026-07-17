// Utterance — Semantic Verse Detection Engine
// Uses local ONNX embeddings to match spoken text against verse embeddings.
// Runs entirely offline — no verse data or audio leaves the machine.

'use strict';

window.SemanticDetection = (() => {
  let _model = null;
  let _verseEmbeddings = new Map(); // key: "bookIdx:chapter:verse" -> Float32Array
  let _ready = false;
  let _building = false;
  const SIMILARITY_THRESHOLD = 0.45;
  const MAX_RESULTS = 3;

  async function _loadModel() {
    if (_model) return _model;
    try {
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm');
      _model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('[SemanticDetection] ONNX embedding model loaded');
      return _model;
    } catch (e) {
      console.warn('[SemanticDetection] Could not load embedding model:', e.message);
      return null;
    }
  }

  async function _embed(text) {
    const model = await _loadModel();
    if (!model) return null;
    try {
      const result = await model(text, { pooling: 'mean', normalize: true });
      return Array.from(result.data);
    } catch (e) {
      console.warn('[SemanticDetection] Embedding failed:', e.message);
      return null;
    }
  }

  function _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  async function buildIndex(translation = 'KJV') {
    if (_building) return;
    _building = true;
    _ready = false;
    _verseEmbeddings.clear();

    try {
      if (!window.BibleDB) {
        console.warn('[SemanticDetection] BibleDB not available');
        return;
      }

      const allRefs = window.BibleDB.getAllRefs?.() || [];
      if (allRefs.length === 0) {
        console.warn('[SemanticDetection] No verse references available');
        return;
      }

      console.log(`[SemanticDetection] Building index for ${allRefs.length} verses...`);
      let count = 0;
      const batchSize = 32;

      for (let i = 0; i < allRefs.length; i += batchSize) {
        const batch = allRefs.slice(i, i + batchSize);
        const texts = batch.map(ref => {
          const text = window.BibleDB.getVerse(ref.book, ref.chapter, ref.verse, translation);
          return text || '';
        });

        const validBatch = batch.filter((_, idx) => texts[idx].length > 10);
        const validTexts = texts.filter(t => t.length > 10);

        if (validBatch.length === 0) continue;

        try {
          const model = await _loadModel();
          if (!model) break;

          for (let j = 0; j < validBatch.length; j++) {
            try {
              const result = await model(validTexts[j], { pooling: 'mean', normalize: true });
              const embedding = Array.from(result.data);
              const ref = validBatch[j];
              const key = `${window.BibleDB.bookNameToIndex?.(ref.book) ?? ref.book}:${ref.chapter}:${ref.verse}`;
              _verseEmbeddings.set(key, embedding);
              count++;
            } catch (_) {}
          }
        } catch (_) {}

        // Yield to UI every batch
        if (i % (batchSize * 4) === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      _ready = true;
      console.log(`[SemanticDetection] Index built: ${count} verses embedded`);
    } catch (e) {
      console.error('[SemanticDetection] Build index failed:', e.message);
    } finally {
      _building = false;
    }
  }

  async function detect(text, translation = 'KJV') {
    if (!_ready || !text || text.trim().length < 15) return [];

    const queryEmbedding = await _embed(text);
    if (!queryEmbedding) return [];

    const results = [];
    for (const [key, embedding] of _verseEmbeddings.entries()) {
      const sim = _cosineSimilarity(queryEmbedding, embedding);
      if (sim >= SIMILARITY_THRESHOLD) {
        const [bookIdx, chapter, verse] = key.split(':').map(Number);
        const bookName = window.BibleDB.indexToBookName?.(bookIdx);
        if (bookName) {
          const verseText = window.BibleDB.getVerse(bookName, chapter, verse, translation);
          results.push({
            book: bookName,
            chapter,
            verse,
            ref: `${bookName} ${chapter}:${verse}`,
            text: verseText || '',
            type: 'semantic',
            confidence: Math.min(0.55 + sim * 0.5, 0.95),
            similarity: sim,
          });
        }
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_RESULTS);
  }

  function isReady() { return _ready; }
  function isBuilding() { return _building; }
  function verseCount() { return _verseEmbeddings.size; }

  function clearIndex() {
    _verseEmbeddings.clear();
    _ready = false;
  }

  return { buildIndex, detect, isReady, isBuilding, verseCount, clearIndex };
})();
