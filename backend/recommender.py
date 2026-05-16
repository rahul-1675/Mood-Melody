import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
import os
import random

class LocalMusicRecommender:
    def __init__(self, csv_path):
        if not os.path.exists(csv_path):
            self.df = pd.DataFrame()
            return
        self.df = pd.read_csv(csv_path)
        if not self.df.empty:

            self.scaler = StandardScaler()
            self.features_cols = ['energy', 'valence', 'tempo']
            self.features = self.df[self.features_cols].values
            self.features_scaled = self.scaler.fit_transform(self.features)

    def recommend(self, mood, top_n=20):
        if self.df.empty:
            return []


        targets = {
            "happiness": [0.85, 0.90, 125],
            "sadness": [0.15, 0.15, 75],
            "anger": [0.95, 0.10, 140],
            "fear": [0.35, 0.05, 115],
            "surprise": [0.85, 0.55, 135],
            "disgust": [0.45, 0.15, 85],
            "love": [0.35, 0.85, 90],
            "relaxed": [0.25, 0.55, 75],
            "motivated": [0.95, 0.75, 145]
        }
        
        target_vec = targets.get(mood.lower(), [0.5, 0.5, 100])
        target_scaled = self.scaler.transform([target_vec])
        

        similarities = cosine_similarity(target_scaled, self.features_scaled).flatten()
        self.df['similarity'] = similarities
        
        languages = ['English', 'Hindi', 'Telugu']
        final_recommendations = []
        
        for lang in languages:
            lang_matches = self.df[self.df['language'] == lang]
            if lang_matches.empty: continue
            

            
            mood_exact = lang_matches[lang_matches['mood'] == mood.lower()]
            
            if len(mood_exact) >= top_n:

                best_pool = mood_exact.sort_values(by='similarity', ascending=False).head(40)
                top_matches = best_pool.sample(n=min(len(best_pool), top_n))
            else:

                fill_needed = top_n - len(mood_exact)
                others = lang_matches[lang_matches['mood'] != mood.lower()]
                fill_pool = others.sort_values(by='similarity', ascending=False).head(fill_needed * 2)
                
                combined = pd.concat([mood_exact, fill_pool.sample(n=min(len(fill_pool), fill_needed))])
                top_matches = combined
            
            final_recommendations.extend(top_matches.to_dict('records'))
        
        random.shuffle(final_recommendations)
        return final_recommendations

def get_recommendations(mood):
    csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'songs.csv')
    recommender = LocalMusicRecommender(csv_path)
    return recommender.recommend(mood, top_n=20)
