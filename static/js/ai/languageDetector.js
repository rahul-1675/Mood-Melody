/**
 * MoodMelody - AI Language Detector
 * Detects English, Romanized Hindi (Hinglish), and Romanized Telugu (Tenglish).
 */

const HINDI_KEYWORDS = new Set([
    "aaj", "bahut", "khush", "khushi", "dukh", "dukhi", "udaas", "gussa", "gusse", "dar", "darr",
    "sukoon", "sukun", "josh", "pyar", "pyaar", "mohabbat", "ishq", "dil", "ghinn", "hairan",
    "badhiya", "badiya", "yaad", "akela", "akeli", "rona", "roya", "hoon", "hai", "hain", "ho",
    "raha", "rahi", "rahe", "mujhe", "mera", "meri", "mere", "aata", "aati", "karna", "kar"
]);

const TELUGU_KEYWORDS = new Set([
    "chala", "naku", "naa", "undi", "undhi", "unnanu", "santosham", "santhosham", "anandam",
    "dukkham", "dukham", "badha", "baadha", "kopam", "bhayam", "prasantham", "prashantham",
    "prema", "asahyam", "ascharyam", "pattudala", "ivala", "ee", "roju", "rojunu", "nenu",
    "anipistundi", "vastuundi", "vasthundi", "feel", "avutunna", "ayindi", "chesanu"
]);

export function detectLanguage(text) {
    if (!text || typeof text !== 'string') return 'English';
    const tokens = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
    if (tokens.length === 0) return 'English';

    let hindiCount = 0;
    let teluguCount = 0;

    tokens.forEach(t => {
        if (HINDI_KEYWORDS.has(t)) hindiCount++;
        if (TELUGU_KEYWORDS.has(t)) teluguCount++;
    });

    if (teluguCount > 0 && teluguCount >= hindiCount) return 'Tenglish';
    if (hindiCount > 0 && hindiCount > teluguCount) return 'Hinglish';
    return 'English';
}
