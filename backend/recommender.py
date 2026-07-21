import pandas as pd
import numpy as np
import os
import random
import re

_cached_df = None

def _get_or_load_df(csv_path):
    global _cached_df
    if _cached_df is not None:
        return _cached_df
        
    if not os.path.exists(csv_path):
        _cached_df = pd.DataFrame()
        return _cached_df
        
    # Optimize: load only required columns from the 1.13 GB file
    cols = ['id', 'title', 'artist', 'album', 'duration_ms', 'language', 'mood', 'popularity', 'keywords', 'album_art', 'preview_url']
    df = pd.read_csv(csv_path, usecols=cols)
    
    # Fill missing values explicitly
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].fillna("")
        else:
            df[col] = df[col].fillna(0)
            
    if 'id' not in df.columns:
        df['id'] = df.index
        
    _cached_df = df
    return _cached_df

class LocalMusicRecommender:
    def __init__(self, csv_path):
        self.df = _get_or_load_df(csv_path)

    def recommend(self, mood, text="", top_n=20):
        if self.df.empty:
            return []

        # Spotify-like search mode: Check if text contains a specific song title or artist match
        query = text.strip().lower() if text else ""
        is_song_search = False
        best_matches = pd.DataFrame()

        if query:
            # Match exact title, exact artist, or substring matches
            exact_title = self.df[self.df['title'].str.lower() == query]
            exact_artist = self.df[self.df['artist'].str.lower() == query]
            
            if not exact_artist.empty:
                best_matches = exact_artist
                is_song_search = True
            elif not exact_title.empty:
                best_matches = exact_title
                is_song_search = True
            else:
                # Substring matching in title or artist
                sub_matches = self.df[
                    self.df['title'].str.lower().str.contains(query, na=False, regex=False) | 
                    self.df['artist'].str.lower().str.contains(query, na=False, regex=False)
                ]
                if not sub_matches.empty:
                    # Sort matches by popularity so best known tracks appear first
                    best_matches = sub_matches.sort_values(by='popularity', ascending=False)
                    is_song_search = True

        if is_song_search and not best_matches.empty:
            # We found matching songs/artists! Output Spotify-like search recommendations.
            # 1. Take up to 5 best matched tracks to show at the top
            top_results = best_matches.head(5).to_dict('records')
            
            # 2. Get the primary seed song for context
            seed_song = top_results[0]
            seed_mood = seed_song['mood']
            seed_lang = seed_song['language']
            seed_keywords = [k.strip() for k in seed_song['keywords'].split(',') if k.strip()]
            
            # Find similar recommendations in the database (excluding matched titles to avoid duplicates)
            matched_titles = {t['title'].lower() for t in top_results}
            candidates = self.df[~self.df['title'].str.lower().isin(matched_titles)].copy()
            
            # Calculate similarity score based on keyword overlap
            candidates['similarity_score'] = 0.0
            if seed_keywords:
                for kw in seed_keywords:
                    candidates['similarity_score'] += candidates['keywords'].str.contains(kw, case=False, na=False, regex=False).astype(float)
            
            # Boost scores for context matching (same artist, same language, same mood)
            candidates.loc[candidates['artist'].str.lower() == seed_song['artist'].lower(), 'similarity_score'] += 3.0
            candidates.loc[candidates['language'].str.lower() == seed_lang.lower(), 'similarity_score'] += 2.0
            candidates.loc[candidates['mood'].str.lower() == seed_mood.lower(), 'similarity_score'] += 4.0
            
            # Sort recommendations by similarity score and popularity
            recommendations = candidates.sort_values(by=['similarity_score', 'popularity'], ascending=[False, False])
            rec_list = recommendations.head(top_n).to_dict('records')
            
            # Combine: exact search results first, then similar recommendations
            final_list = list(top_results) + rec_list
            return final_list

        # Fallback to standard mood-based recommendation (e.g. for general prompts like "feeling sad")
        mood_map = {
            "happiness": "Happy",
            "happy": "Happy",
            "sadness": "Sad",
            "sad": "Sad",
            "love": "Love",
            "romantic": "Romantic",
            "anger": "Angry",
            "angry": "Angry",
            "fear": "Fear",
            "surprise": "Surprise",
            "motivated": "Motivational",
            "motivational": "Motivational",
            "relaxed": "Relaxed",
            "calm": "Calm",
            "party": "Party",
            "energetic": "Energetic",
            "devotional": "Devotional",
            "emotional": "Emotional",
            "nostalgic": "Nostalgic",
            "hopeful": "Hopeful",
            "heartbreak": "Heartbreak"
        }
        mapped_mood = mood_map.get(mood.lower(), mood)

        query_words = []
        if text:
            text_clean = re.sub(r"[^\w\s]", " ", text.lower())
            query_words = [w for w in text_clean.split() if len(w) > 2]

        languages = ['English', 'Hindi', 'Telugu', 'Tamil', 'Malayalam', 'Kannada']
        final_recommendations = []
        
        for lang in languages:
            lang_matches = self.df[self.df['language'] == lang]
            if lang_matches.empty: 
                continue
            
            # Filter exact mood matches first to avoid computing similarity on the entire language set
            mood_exact = lang_matches[lang_matches['mood'].str.lower() == mapped_mood.lower()].copy()
            
            if len(mood_exact) >= top_n:
                if query_words:
                    mood_exact['similarity'] = 0.0
                    for word in query_words:
                        mood_exact['similarity'] += mood_exact['keywords'].str.contains(word, case=False, na=False, regex=False).astype(float)
                    mood_exact = mood_exact.sort_values(by='similarity', ascending=False)
                best_pool = mood_exact.head(100)
                top_matches = best_pool.sample(n=min(len(best_pool), top_n))
            else:
                others = lang_matches[lang_matches['mood'].str.lower() != mapped_mood.lower()].copy()
                
                if query_words:
                    if not mood_exact.empty:
                        mood_exact['similarity'] = 0.0
                        for word in query_words:
                            mood_exact['similarity'] += mood_exact['keywords'].str.contains(word, case=False, na=False, regex=False).astype(float)
                        mood_exact = mood_exact.sort_values(by='similarity', ascending=False)
                    
                    if not others.empty:
                        # Pre-filter others using fast substring checks combined via bitwise OR
                        mask = others['keywords'].str.contains(query_words[0], case=False, na=False, regex=False)
                        for word in query_words[1:]:
                            mask |= others['keywords'].str.contains(word, case=False, na=False, regex=False)
                        matching_others = others[mask].copy()
                        
                        others['similarity'] = 0.0
                        if not matching_others.empty:
                            matching_others['similarity'] = 0.0
                            for word in query_words:
                                matching_others['similarity'] += matching_others['keywords'].str.contains(word, case=False, na=False, regex=False).astype(float)
                            # Merge back the computed similarities
                            others.update(matching_others)
                        others = others.sort_values(by='similarity', ascending=False)
                
                fill_needed = top_n - len(mood_exact)
                if not others.empty:
                    fill_pool = others.head(fill_needed * 2)
                    top_matches = pd.concat([mood_exact, fill_pool.sample(n=min(len(fill_pool), fill_needed))])
                else:
                    top_matches = mood_exact
            
            final_recommendations.extend(top_matches.to_dict('records'))
        
        random.shuffle(final_recommendations)
        return final_recommendations

def get_recommendations(mood, text=""):
    csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'songs.csv')
    recommender = LocalMusicRecommender(csv_path)
    return recommender.recommend(mood, text, top_n=60)
