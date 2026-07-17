import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Expanded dictionaries of keywords with weights
# Weight 2.0 = strong, 1.0 = normal, 0.3 = weak/contextual
MOOD_KEYWORDS = {
    "happiness": {
        'happy': 2.0, 'joy': 2.0, 'cheerful': 2.0, 'excited': 2.0, 'bright': 1.0, 'sunshine': 1.0, 
        'smile': 1.5, 'smiling': 1.5, 'positive': 1.0, 'upbeat': 1.5, 'celebration': 1.5, 'dance': 1.0, 
        'good': 0.5, 'great': 1.0, 'fantastic': 2.0, 'wonderful': 2.0, 'awesome': 2.0, 'delighted': 2.0, 
        'glad': 1.5, 'laugh': 1.5, 'laughing': 1.5, 'thrilled': 2.0, 'ecstatic': 2.0, 'content': 1.0, 
        'pleased': 1.0, 'bliss': 2.0, 'blissfully': 2.0, 'laughter': 1.5, 'jolly': 2.0, 'merry': 2.0, 
        'gleeful': 2.0, 'overjoyed': 2.0, 'euphoric': 2.0, 'radiant': 1.5, 'lively': 1.5, 'blessed': 1.5,
        'joyful': 2.0, 'spirits': 1.0, 'festive': 1.5, 'festival': 1.0, 'party': 1.0,
        'perfect': 2.0, 'perfectly': 2.0, 'hopeful': 1.5, 'celebrate': 1.5, 'ideal': 1.0
    },
    "sadness": {
        'sad': 2.0, 'cry': 2.0, 'crying': 2.0, 'depressed': 2.0, 'down': 1.0, 'heartbreak': 2.0, 
        'heartbroken': 2.0, 'lonely': 2.0, 'sorrow': 2.0, 'miss': 1.0, 'missing': 1.0, 'grief': 2.0, 
        'weep': 2.0, 'weeping': 2.0, 'blue': 1.0, 'tears': 1.5, 'tearing': 1.5, 'unhappy': 2.0, 
        'gloomy': 2.0, 'miserable': 2.0, 'downcast': 2.0, 'dejected': 2.0, 'heartless': 1.5, 
        'hopeless': 2.0, 'helpless': 2.0, 'empty': 1.0, 'broken': 1.5, 'painful': 1.5, 'hurt': 1.5, 
        'hurting': 1.5, 'sorrowful': 2.0, 'mourn': 2.0, 'mourning': 2.0, 'despair': 2.0, 'melancholy': 2.0, 
        'tragic': 2.0, 'disappointment': 2.0, 'disappointed': 2.0, 'heavy': 0.8, 'nostalgic': 1.5, 
        'nostalgia': 1.5
    },
    "relaxed": {
        'chill': 2.0, 'calm': 2.0, 'peace': 2.0, 'peaceful': 2.0, 'relax': 2.0, 'relaxing': 2.0, 
        'sleep': 1.5, 'sleeping': 1.5, 'sleepy': 1.5, 'rest': 1.5, 'resting': 1.5, 'breeze': 1.0, 
        'quiet': 1.5, 'smooth': 1.5, 'tired': 2.0, 'neutral': 1.0, 'okay': 1.0, 'fine': 1.0, 
        'steady': 1.0, 'cozy': 1.5, 'lazy': 1.5, 'serene': 2.0, 'tranquil': 2.0, 'soft': 1.0, 
        'slow': 1.0, 'passive': 1.0, 'comfort': 1.5, 'comfortable': 1.5, 'soothing': 2.0, 
        'meditation': 1.5, 'breathe': 1.0, 'sigh': 1.0, 'ease': 1.5, 'easily': 1.0,
        'exhausted': 1.5, 'sunset': 1.5, 'lo-fi': 2.0, 'lofi': 2.0, 'jazz': 1.5
    },
    "motivated": {
        'focus': 2.0, 'coding': 2.0, 'study': 2.0, 'studying': 2.0, 'work': 1.0, 'working': 1.0, 
        'deep': 0.3, 'gym': 2.0, 'workout': 2.0, 'push': 1.0, 'grind': 2.0, 'hustle': 2.0, 
        'energy': 1.5, 'crushing': 1.5, 'goals': 2.0, 'pumped': 2.0, 'motivated': 2.0, 'motivate': 2.0, 
        'ambitious': 2.0, 'passion': 1.5, 'passionate': 2.0, 'active': 1.5, 'run': 1.0, 'running': 1.0, 
        'exercise': 1.5, 'train': 1.0, 'training': 1.5, 'build': 1.0, 'building': 1.0, 'lift': 1.0, 
        'lifting': 1.5, 'strong': 1.5, 'power': 1.5, 'success': 2.0, 'succeed': 2.0, 'goal': 2.0, 
        'task': 1.0, 'productive': 2.0, 'productivity': 2.0, 'challenge': 1.5, 'drive': 1.5, 'driven': 2.0,
        'motivation': 2.0, 'concentration': 2.0, 'concentrate': 2.0
    },
    "love": {
        'love': 2.0, 'loving': 2.0, 'romantic': 2.0, 'heart': 0.3, 'sweet': 2.0, 'date': 1.5, 
        'dating': 1.5, 'intimate': 2.0, 'crush': 2.0, 'kiss': 2.0, 'kissing': 2.0, 'affection': 2.0, 
        'affectionate': 2.0, 'husband': 1.5, 'wife': 1.5, 'boyfriend': 2.0, 'girlfriend': 2.0, 
        'darling': 2.0, 'dear': 1.5, 'marry': 2.0, 'marriage': 2.0, 'beloved': 2.0, 'adore': 2.0, 
        'adoring': 2.0, 'fondness': 2.0, 'cuddle': 2.0, 'hugging': 1.5, 'hug': 1.5, 'companion': 1.5, 
        'cherish': 2.0, 'together': 1.5, 'forever': 1.5, 'soulmate': 2.0, 'bond': 1.0, 'romance': 2.0
    },
    "anger": {
        'angry': 2.0, 'mad': 2.0, 'furious': 2.0, 'hate': 2.0, 'hating': 2.0, 'rage': 2.0, 
        'annoyed': 2.0, 'annoying': 2.0, 'pissed': 2.0, 'frustrated': 2.0, 'frustrating': 2.0, 
        'anger': 2.0, 'irritate': 2.0, 'irritating': 2.0, 'irritated': 2.0, 'temper': 2.0, 
        'bitter': 1.0, 'hostile': 2.0, 'resentment': 2.0, 'revenge': 2.0, 'toxic': 1.5, 
        'dislike': 1.5, 'scream': 2.0, 'screaming': 2.0, 'fight': 1.5, 'fighting': 1.5, 
        'blast': 1.0, 'slam': 1.5
    },
    "fear": {
        'scared': 2.0, 'fear': 2.0, 'anxious': 2.0, 'nervous': 2.0, 'terrified': 2.0, 'panic': 2.0, 
        'afraid': 2.0, 'worry': 2.0, 'worrying': 2.0, 'dread': 2.0, 'dreading': 2.0, 'fright': 2.0, 
        'frightened': 2.0, 'horror': 2.0, 'spooky': 2.0, 'creepy': 2.0, 'threat': 2.0, 'threaten': 2.0, 
        'unsafe': 2.0, 'insecure': 2.0, 'stress': 1.5, 'stressed': 1.5, 'shaking': 1.5, 'anxiety': 2.0
    },
    "disgust": {
        'gross': 2.0, 'ew': 2.0, 'disgust': 2.0, 'disgusted': 2.0, 'nasty': 2.0, 'awful': 2.0, 
        'sick': 1.5, 'sickened': 2.0, 'revolting': 2.0, 'yuck': 2.0, 'ugly': 2.0, 'dirty': 1.5, 
        'trash': 1.5, 'garbage': 1.5, 'vomit': 2.0, 'rubbish': 1.5, 'terrible': 1.5, 'bad': 0.5, 
        'unacceptable': 1.5, 'shameful': 2.0, 'slime': 1.5
    },
    "surprise": {
        'wow': 2.0, 'omg': 2.0, 'surprise': 2.0, 'surprised': 2.0, 'shocked': 2.0, 'unexpected': 2.0, 
        'amazed': 2.0, 'unbelievable': 2.0, 'whoa': 2.0, 'sudden': 1.5, 'wonder': 1.5, 'miracle': 2.0, 
        'magic': 1.5, 'mystery': 1.5, 'strange': 1.5, 'odd': 1.5, 'weird': 1.5, 'jaw-dropping': 2.0,
        'adventure': 1.5
    }
}

# Negation words list
NEGATIONS = {
    "not", "no", "never", "dont", "cant", "isnt", "arent", "wasnt", "werent", "without", 
    "neither", "nor", "none", "cannot", "doesnt", "shouldnt", "wouldnt", "havent", "hadnt"
}

# Mappings for negated moods
NEGATION_MAP = {
    "happiness": "sadness",
    "sadness": "happiness",
    "love": "disgust",
    "motivated": "relaxed",
    "relaxed": "motivated",
    "anger": "relaxed",
    "fear": "relaxed",
    "disgust": "happiness",
    "surprise": "relaxed"
}

def clean_and_tokenize(text):
    # Keep apostrophes inside words to avoid splitting contractions
    tokens = re.findall(r"\w+(?:'\w+)?|[.,!;?]", text.lower())
    # Clean tokens (remove apostrophes)
    return [t.replace("'", "") for t in tokens]

def detect_mood(text):
    if not text:
        return "relaxed"

    tokens = clean_and_tokenize(text)
    
    # Initialize scores for all 9 moods
    scores = {mood: 0.0 for mood in MOOD_KEYWORDS.keys()}
    
    negated_window = 0
    
    # Reset negation words if we hit transition or punctuation words
    resets = {"but", "however", "yet", "although", "except", "and", "or", "just", "so", "then", ".", ",", "!", "?", ";"}
    
    for i, token in enumerate(tokens):
        if token in resets:
            negated_window = 0
            continue
            
        if token in NEGATIONS:
            # Check if immediately followed by "stop" or "prevent" - if so, don't negate!
            if i + 1 < len(tokens) and tokens[i + 1] in {"stop", "prevent"}:
                negated_window = 0
            else:
                negated_window = 4 # Negate immediate next 4 words
            continue
            
        # Check if token is a keyword for any mood
        for mood, keyword_dict in MOOD_KEYWORDS.items():
            if token in keyword_dict:
                weight = keyword_dict[token]
                # If negated_window is active, we apply negation logic
                if negated_window > 0:
                    mapped_mood = NEGATION_MAP.get(mood, "relaxed")
                    scores[mapped_mood] += weight * 0.5 # Negation match is weaker (0.5 multiplier)
                else:
                    scores[mood] += weight
                    
        if negated_window > 0:
            negated_window -= 1
            
    # Find the mood with the highest score
    max_mood = max(scores, key=scores.get)
    if scores[max_mood] > 0:
        return max_mood

    # Fallback to TextBlob sentiment analysis if no keywords matched
    try:
        from textblob import TextBlob
        analysis = TextBlob(text)
        polarity = analysis.sentiment.polarity
        
        if polarity > 0.4:
            return "happiness"
        elif polarity < -0.4:
            return "sadness"
        elif polarity > 0.1:
            return "relaxed"
        elif polarity < 0:
            return "anger"
        else:
            return "relaxed"
    except Exception:
        return "relaxed"
