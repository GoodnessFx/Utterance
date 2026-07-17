// Utterance — Bible Translation Downloader
// Downloads public domain translations (ASV, WEB, YLT) from free sources.
// Formats them to Utterance's JSON format: [{"b":1,"c":1,"v":1,"t":"verse text"},...]

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const PUBLIC_DOMAIN_SOURCES = {
  ASV: {
    name: 'American Standard Version (1901)',
    url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/ASV/ASV.json',
    description: 'Classic public domain English translation (1901)',
  },
  WEB: {
    name: 'World English Bible',
    url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/WEB/WEB.json',
    description: 'Modern English public domain translation',
  },
  YLT: {
    name: "Young's Literal Translation (1862)",
    url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/YLT/YLT.json',
    description: 'Highly literal translation preserving word order',
  },
};

const BOOK_NAME_TO_INDEX = {
  'Genesis':0,'Exodus':1,'Leviticus':2,'Numbers':3,'Deuteronomy':4,'Joshua':5,'Judges':6,'Ruth':7,
  '1 Samuel':8,'2 Samuel':9,'1 Kings':10,'2 Kings':11,'1 Chronicles':12,'2 Chronicles':13,
  'Ezra':14,'Nehemiah':15,'Esther':16,'Job':17,'Psalms':18,'Proverbs':19,'Ecclesiastes':20,
  'Song of Solomon':21,'Isaiah':22,'Jeremiah':23,'Lamentations':24,'Ezekiel':25,'Daniel':26,
  'Hosea':27,'Joel':28,'Amos':29,'Obadiah':30,'Jonah':31,'Micah':32,'Nahum':33,'Habakkuk':34,
  'Zephaniah':35,'Haggai':36,'Zechariah':37,'Malachi':38,
  'Matthew':39,'Mark':40,'Luke':41,'John':42,'Acts':43,'Romans':44,
  '1 Corinthians':45,'2 Corinthians':46,'Galatians':47,'Ephesians':48,'Philippians':49,
  'Colossians':50,'1 Thessalonians':51,'2 Thessalonians':52,'1 Timothy':53,'2 Timothy':54,
  'Titus':55,'Philemon':56,'Hebrews':57,'James':58,'1 Peter':59,'2 Peter':60,
  '1 John':61,'2 John':62,'3 John':63,'Jude':64,'Revelation':65,
};

async function downloadTranslation(translationId, bibleDir, onProgress) {
  const source = PUBLIC_DOMAIN_SOURCES[translationId];
  if (!source) throw new Error(`Unknown translation: ${translationId}`);

  const targetFile = path.join(bibleDir, `${translationId}.json`);
  if (fs.existsSync(targetFile)) {
    return { success: true, cached: true, path: targetFile };
  }

  const data = await _fetchUrl(source.url, onProgress);
  const parsed = JSON.parse(data);
  const verses = _convertFormat(parsed, translationId);

  fs.mkdirSync(bibleDir, { recursive: true });
  fs.writeFileSync(targetFile, JSON.stringify(verses));

  return { success: true, verseCount: verses.length, path: targetFile };
}

function _convertFormat(rawData, translationId) {
  const verses = [];

  if (Array.isArray(rawData)) {
    // Array of books: [{name, chapters: [{verses: [{number, text}]}]}]
    for (const book of rawData) {
      const bookName = book.name || book.book_name || book.Book;
      const bookIdx = BOOK_NAME_TO_INDEX[bookName];
      if (bookIdx === undefined) continue;

      const chapters = book.chapters || book.book || [];
      for (const chapter of chapters) {
        const chNum = chapter.chapter || chapter.number || chapter.Chapter;
        if (!chNum) continue;

        const chVerses = chapter.verses || chapter.verse || [];
        for (const v of chVerses) {
          const vNum = v.number || v.verse || v.Verse;
          const text = v.text || v.content || '';
          if (vNum && text && text.trim()) {
            verses.push({ b: bookIdx + 1, c: chNum, v: vNum, t: text.trim() });
          }
        }
      }
    }
  } else if (rawData.verses) {
    // Flat array of verses with book/chapter/verse info
    for (const v of rawData.verses) {
      const bookName = v.book_name || v.book || v.Book;
      const bookIdx = BOOK_NAME_TO_INDEX[bookName];
      if (bookIdx === undefined) continue;

      const chNum = v.chapter || v.Chapter;
      const vNum = v.verse || v.Verse || v.number;
      const text = v.text || v.content || '';
      if (chNum && vNum && text && text.trim()) {
        verses.push({ b: bookIdx + 1, c: chNum, v: vNum, t: text.trim() });
      }
    }
  }

  return verses;
}

function _fetchUrl(url, onProgress) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Utterance-Bible-Downloader' }, timeout: 60000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return _fetchUrl(res.headers.location, onProgress).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
        received += chunk.length;
        if (onProgress && totalBytes > 0) {
          onProgress({ received, total: totalBytes, percent: Math.round((received / totalBytes) * 100) });
        }
      });

      res.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
  });
}

function getAvailableTranslations() {
  return Object.entries(PUBLIC_DOMAIN_SOURCES).map(([id, info]) => ({
    id, name: info.name, description: info.description,
  }));
}

module.exports = { downloadTranslation, getAvailableTranslations, PUBLIC_DOMAIN_SOURCES };
