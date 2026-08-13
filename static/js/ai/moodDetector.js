/**
 * MoodMelody - AI Multilingual Mood & Intensity Detection Engine
 * Analyzes English, Hinglish, and Tenglish inputs to compute:
 * - primaryMood & secondaryMood
 * - confidence (0.0 to 1.0)
 * - intensity (0.0 to 1.0)
 * - language
 * - 9-dimensional mood vector (happiness, sadness, relaxed, motivated, love, anger, fear, disgust, surprise)
 */

import { detectLanguage } from './languageDetector.js';
import { analyzeContext } from './contextAnalyzer.js';

const MOOD_LEXICON = {
    happiness: {
        keywords: ['happy', 'joy', 'excited', 'cheerful', 'bright', 'thrilled', 'ecstatic', 'khush', 'khushi', 'badhiya', 'badiya', 'santosham', 'anandam', 'bagundi', 'keka', 'superu', 'awesome', 'wonderful', 'promoted', 'won', 'celebrate'],
        weight: 1.2
    },
    sadness: {
        keywords: ['sad', 'cry', 'crying', 'depressed', 'lonely', 'sorrow', 'grief', 'heartbroken', 'devastated', 'dukh', 'dukhi', 'udaas', 'akela', 'akeli', 'rona', 'dukkham', 'badha', 'ontari', 'miserable', 'empty', 'hurt', 'painful'],
        weight: 1.2
    },
    relaxed: {
        keywords: ['relax', 'relaxed', 'chill', 'chilling', 'calm', 'peace', 'peaceful', 'serene', 'tranquil', 'cozy', 'lofi', 'sukoon', 'sukun', 'shant', 'aaram', 'prasantham', 'prashantham', 'nemadi', 'mellow', 'sleepy'],
        weight: 1.0
    },
    motivated: {
        keywords: ['motivated', 'focus', 'focused', 'grind', 'hustle', 'gym', 'workout', 'determined', 'unstoppable', 'josh', 'junoon', 'mehnat', 'pattudala', 'sadhana', 'goals', 'locked', 'zone', 'laser', 'productive'],
        weight: 1.2
    },
    love: {
        keywords: ['love', 'loving', 'romantic', 'heart', 'crush', 'kiss', 'adore', 'sweetheart', 'soulmate', 'pyar', 'pyaar', 'mohabbat', 'ishq', 'dil', 'prema', 'istham', 'priya', 'bangaram', 'cherish', 'forever'],
        weight: 1.2
    },
    anger: {
        keywords: ['angry', 'mad', 'furious', 'rage', 'annoyed', 'pissed', 'frustrated', 'irritated', 'livid', 'seething', 'gussa', 'gusse', 'nafrat', 'krodh', 'kopam', 'chiraku', 'hate', 'hating', 'outrage'],
        weight: 1.2
    },
    fear: {
        keywords: ['scared', 'fear', 'afraid', 'anxious', 'nervous', 'terrified', 'panic', 'dread', 'worry', 'worried', 'dar', 'darr', 'ghabrahat', 'bhayam', 'aandolana', 'uneasy', 'paranoid'],
        weight: 1.2
    },
    disgust: {
        keywords: ['gross', 'disgust', 'disgusted', 'nasty', 'awful', 'revolting', 'ew', 'sickening', 'vile', 'ghinn', 'ghin', 'ganda', 'ghatiya', 'asahyam', 'rotha', 'repulsed', 'repellant'],
        weight: 1.2
    },
    surprise: {
        keywords: ['wow', 'omg', 'surprise', 'surprised', 'shocked', 'amazed', 'unbelievable', 'whoa', 'stunned', 'speechless', 'hairan', 'hairani', 'chakit', 'ashcharyam', 'ascharyam', 'mindblown'],
        weight: 1.2
    }
};

const PHRASES = [
    { phrase: "walking on eggshells", mood: "fear", weight: 2.5 },
    { phrase: "on cloud nine", mood: "happiness", weight: 2.5 },
    { phrase: "blood boils", mood: "anger", weight: 2.5 },
    { phrase: "sick to my stomach", mood: "disgust", weight: 2.5 },
    { phrase: "cannot believe", mood: "surprise", weight: 2.5 },
    { phrase: "cant believe", mood: "surprise", weight: 2.5 },
    { phrase: "hit the gym", mood: "motivated", weight: 2.5 },
    { phrase: "locked in", mood: "motivated", weight: 2.5 },
    { phrase: "gussa aa raha", mood: "anger", weight: 2.5 },
    { phrase: "gusse mein", mood: "anger", weight: 2.5 },
    { phrase: "bahut dukh", mood: "sadness", weight: 2.5 },
    { phrase: "akela feel", mood: "sadness", weight: 2.5 },
    { phrase: "santosham ga undi", mood: "happiness", weight: 2.5 },
    { phrase: "dukkham ga undi", mood: "sadness", weight: 2.5 },
    { phrase: "kopam vastuundi", mood: "anger", weight: 2.5 },
    { phrase: "bhayam ga undi", mood: "fear", weight: 2.5 }
];

const INTENSITY_AMPLIFIERS = [
    'extremely', 'very', 'so', 'super', 'incredibly', 'really', 'too', 'totally', 'completely',
    'bahut', 'bohot', 'ekdum', 'chala', 'chalaaa', 'too much'
];

const NEGATIONS = new Set([
    'not', 'no', 'never', 'dont', 'cant', 'isnt', 'wasnt', 'without',
    'nahi', 'nahin', 'na', "mat", "ledu", "ledhu", "kadu", "vaddu"
]);

export const MoodDetector = {
    analyze(text) {
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return this._getDefaultResult('English');
        }

        const cleanText = text.toLowerCase().trim();
        const detectedLang = detectLanguage(cleanText);
        const contextInfo = analyzeContext(cleanText);
        const tokens = cleanText.match(/\b[a-z']+\b/g) || [];

        // Initialize 9D mood vector
        const moodVector = {
            happiness: 0.0, sadness: 0.0, relaxed: 0.0, motivated: 0.0,
            love: 0.0, anger: 0.0, fear: 0.0, disgust: 0.0, surprise: 0.0
        };

        const matchedKeywords = [];

        // 1. Multi-word phrase matching
        PHRASES.forEach(p => {
            if (cleanText.includes(p.phrase)) {
                moodVector[p.mood] += p.weight;
                matchedKeywords.push(p.phrase);
            }
        });

        // 2. Token keyword scoring with bidirectional negation logic
        let hasAmplifier = false;

        tokens.forEach((token, i) => {
            if (INTENSITY_AMPLIFIERS.includes(token)) {
                hasAmplifier = true;
            }

            // Check if token matches any mood keyword
            for (const [mood, config] of Object.entries(MOOD_LEXICON)) {
                if (config.keywords.includes(token)) {
                    let isNegated = false;

                    // Check forward/backward negation (3-token window)
                    for (let j = Math.max(0, i - 3); j <= Math.min(tokens.length - 1, i + 3); j++) {
                        if (j !== i && NEGATIONS.has(tokens[j])) {
                            isNegated = true;
                            break;
                        }
                    }

                    if (isNegated) {
                        // Apply mood inversion
                        const inverted = mood === 'happiness' ? 'sadness' : (mood === 'sadness' ? 'happiness' : 'relaxed');
                        moodVector[inverted] += config.weight * 0.8;
                    } else {
                        moodVector[mood] += config.weight;
                        if (!matchedKeywords.includes(token)) matchedKeywords.push(token);
                    }
                }
            }
        });

        // Normalize mood vector to probabilities / scores summing to 1.0 (or softmax-like)
        let totalScore = Object.values(moodVector).reduce((a, b) => a + b, 0);

        if (totalScore === 0) {
            // Fallback default
            moodVector.relaxed = 0.5;
            moodVector.happiness = 0.3;
            totalScore = 0.8;
        }

        // Normalize vector entries (0.0 to 1.0)
        const normalizedVector = {};
        for (const [m, val] of Object.entries(moodVector)) {
            normalizedVector[m] = parseFloat((val / Math.max(1, totalScore)).toFixed(3));
        }

        // Find primary and secondary moods
        const sortedMoods = Object.entries(normalizedVector).sort((a, b) => b[1] - a[1]);
        const primaryMood = sortedMoods[0][0];
        const secondaryMood = sortedMoods[1][1] > 0.15 ? sortedMoods[1][0] : null;

        // Calculate intensity (0.4 to 0.98)
        let rawIntensity = sortedMoods[0][1] * 1.5;
        if (hasAmplifier) rawIntensity += 0.25;
        const intensity = parseFloat(Math.min(0.98, Math.max(0.40, rawIntensity)).toFixed(2));

        // Calculate confidence score (0.60 to 0.98)
        let rawConfidence = (totalScore / (tokens.length || 1)) * 0.8 + 0.5;
        const confidence = parseFloat(Math.min(0.98, Math.max(0.60, rawConfidence)).toFixed(2));

        return {
            primaryMood,
            secondaryMood,
            confidence,
            intensity,
            language: detectedLang,
            keywords: matchedKeywords,
            context: contextInfo.context,
            energyTarget: contextInfo.energyTarget,
            moodVector: normalizedVector,
            rawText: text
        };
    },

    _getDefaultResult(lang = 'English') {
        return {
            primaryMood: 'relaxed',
            secondaryMood: 'happiness',
            confidence: 0.80,
            intensity: 0.50,
            language: lang,
            keywords: [],
            context: 'general',
            energyTarget: 'medium',
            moodVector: {
                happiness: 0.2, sadness: 0.0, relaxed: 0.6, motivated: 0.1,
                love: 0.1, anger: 0.0, fear: 0.0, disgust: 0.0, surprise: 0.0
            },
            rawText: ''
        };
    }
};
