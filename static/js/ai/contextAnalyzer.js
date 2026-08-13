/**
 * MoodMelody - AI Context Analyzer
 * Extracts activity, time-of-day, and situational context from user input.
 */

const CONTEXT_PATTERNS = {
    workout: ["gym", "workout", "running", "run", "lift", "exercise", "training", "cardio"],
    study: ["study", "studying", "coding", "work", "working", "focus", "deep work", "exam", "assignment"],
    chill: ["relaxing", "chilling", "lazy", "bed", "couch", "bath", "coffee", "tea", "sunset", "weekend"],
    rainy: ["rain", "rainy", "storm", "cloudy", "baarish", "varsham"],
    night: ["night", "late night", "sleep", "bedtime", "raat", "raatri"],
    party: ["party", "dance", "celebration", "club", "drinks", "shaadi", "pelli"],
    drive: ["drive", "driving", "roadtrip", "car", "travel", "journey"]
};

export function analyzeContext(text) {
    if (!text) return { context: 'general', energyTarget: 'medium' };

    const lower = text.toLowerCase();
    let detectedContext = 'general';
    let energyTarget = 'medium';

    for (const [ctx, patterns] of Object.entries(CONTEXT_PATTERNS)) {
        if (patterns.some(pattern => lower.includes(pattern))) {
            detectedContext = ctx;
            break;
        }
    }

    if (['workout', 'party', 'drive'].includes(detectedContext)) {
        energyTarget = 'high';
    } else if (['chill', 'rainy', 'night'].includes(detectedContext)) {
        energyTarget = 'low';
    } else if (detectedContext === 'study') {
        energyTarget = 'steady';
    }

    return {
        context: detectedContext,
        energyTarget: energyTarget
    };
}
