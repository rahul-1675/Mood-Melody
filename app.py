from flask import Flask, render_template, request, jsonify
from backend.mood_detection import detect_mood
from backend.recommender import get_recommendations
from backend.database import db, init_db, MoodHistory, FavoriteSong, Playlist, PlaylistSong
from dotenv import load_dotenv
import os
import logging

load_dotenv()

# Download NLTK data for TextBlob
import nltk
try:
    nltk.data.find('corpora/movie_reviews')
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('movie_reviews')
    nltk.download('wordnet')
    nltk.download('punkt')

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "mood_melody_secret_123")

init_db(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/recommend', methods=['POST'])
def recommend():
    data = request.json
    text = data.get('text', '')
    user_mood = data.get('mood', '')
    mood = user_mood.lower() if user_mood else detect_mood(text)
    
    try:
        new_history = MoodHistory(text_input=text or f"Quick: {mood}", detected_mood=mood)
        db.session.add(new_history)
        db.session.commit()
    except Exception as e:
        logger.error(f"History DB Error: {e}")
        db.session.rollback()

    songs = get_recommendations(mood)
    return jsonify({"mood": mood, "songs": songs})

@app.route('/api/history', methods=['GET'])
def get_history():
    history = MoodHistory.query.order_by(MoodHistory.timestamp.desc()).limit(20).all()
    return jsonify([{"text": h.text_input, "mood": h.detected_mood, "time": h.timestamp.strftime("%b %d, %H:%M")} for h in history])

@app.route('/api/favorites', methods=['GET', 'POST'])
def favorites():
    if request.method == 'POST':
        data = request.json
        exists = FavoriteSong.query.filter_by(preview_url=data.get('preview_url')).first()
        if not exists:
            new_fav = FavoriteSong(
                title=data.get('title'), artist=data.get('artist'),
                album_art=data.get('album_art'), preview_url=data.get('preview_url'),
                language=data.get('language')
            )
            db.session.add(new_fav)
            db.session.commit()
        return jsonify({"status": "success"})
    
    favs = FavoriteSong.query.order_by(FavoriteSong.timestamp.desc()).all()
    return jsonify([{"id": f.id, "title": f.title, "artist": f.artist, "album_art": f.album_art, "preview_url": f.preview_url} for f in favs])

@app.route('/api/favorites/<int:fid>', methods=['DELETE'])
def delete_favorite(fid):
    fav = FavoriteSong.query.get(fid)
    if fav:
        db.session.delete(fav)
        db.session.commit()
    return jsonify({"status": "deleted"})

@app.route('/api/playlists', methods=['GET', 'POST'])
def playlists():
    if request.method == 'POST':
        try:
            data = request.json
            name = data.get('name')
            if not name: return jsonify({"error": "No name"}), 400
            new_playlist = Playlist(name=name)
            db.session.add(new_playlist)
            db.session.commit()
            return jsonify({"id": new_playlist.id, "name": new_playlist.name})
        except Exception as e:
            logger.error(f"Create Playlist Error: {e}")
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    
    all_playlists = Playlist.query.all()
    return jsonify([{
        "id": p.id, "name": p.name, 
        "song_count": len(p.songs),
        "songs": [{"id": s.id, "title": s.title, "artist": s.artist, "album_art": s.album_art, "preview_url": s.preview_url} for s in p.songs]
    } for p in all_playlists])

@app.route('/api/playlists/<int:pid>', methods=['DELETE'])
def delete_playlist(pid):
    try:
        p = Playlist.query.get(pid)
        if p:
            db.session.delete(p)
            db.session.commit()
            return jsonify({"status": "deleted"})
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        logger.error(f"Delete Playlist Error: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/playlists/<int:pid>/songs', methods=['POST'])
def add_to_playlist(pid):
    data = request.json
    new_song = PlaylistSong(
        playlist_id=pid,
        title=data.get('title'), artist=data.get('artist'),
        album_art=data.get('album_art'), preview_url=data.get('preview_url')
    )
    db.session.add(new_song)
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/api/playlists/songs/<int:sid>', methods=['DELETE'])
def delete_playlist_song(sid):
    s = PlaylistSong.query.get(sid)
    if s:
        db.session.delete(s)
        db.session.commit()
    return jsonify({"status": "deleted"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
