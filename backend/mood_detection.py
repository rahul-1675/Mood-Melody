import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def detect_mood(text):

    if not text:
        return "relaxed"

    text_lower = text.lower()
    

    keywords = {
        "love": ['love', 'romantic', 'heart', 'sweet', 'date', 'intimate', 'crush', 'kiss', 'affection'],
        "motivated": ['focus', 'coding', 'study', 'work', 'deep', 'gym', 'workout', 'push', 'grind', 'hustle', 'energy', 'crushing', 'goals', 'pumped', 'motivated'],
        "anger": ['angry', 'mad', 'furious', 'hate', 'rage', 'annoyed', 'pissed', 'frustrated'],
        "fear": ['scared', 'fear', 'anxious', 'nervous', 'terrified', 'panic', 'afraid', 'worry', 'dread'],
        "disgust": ['gross', 'ew', 'disgust', 'nasty', 'awful', 'sick', 'revolting', 'yuck'],
        "surprise": ['wow', 'omg', 'surprise', 'shocked', 'unexpected', 'amazed', 'unbelievable', 'whoa'],
        "happiness": ['happy', 'joy', 'smile', 'glad', 'excited', 'cheerful', 'delighted', 'great', 'awesome'],
        "sadness": ['sad', 'cry', 'depressed', 'down', 'heartbreak', 'lonely', 'sorrow', 'miss', 'grief'],
        "relaxed": ['chill', 'calm', 'peace', 'relax', 'sleep', 'rest', 'breeze', 'quiet', 'smooth', 'tired', 'neutral']
    }


    for mood, words in keywords.items():
        if any(word in text_lower for word in words):
            return mood


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
    except ImportError:
        return "relaxed"
