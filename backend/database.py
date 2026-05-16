from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class MoodHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text_input = db.Column(db.String(500))
    detected_mood = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class FavoriteSong(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    artist = db.Column(db.String(200))
    album_art = db.Column(db.String(500))
    preview_url = db.Column(db.String(500))
    language = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Playlist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    songs = db.relationship('PlaylistSong', backref='playlist', lazy=True, cascade="all, delete-orphan")

class PlaylistSong(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlist.id'), nullable=False)
    title = db.Column(db.String(200))
    artist = db.Column(db.String(200))
    album_art = db.Column(db.String(500))
    preview_url = db.Column(db.String(500))

def init_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///music_mood.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    with app.app_context():
        db.create_all()
