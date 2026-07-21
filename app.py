from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='static', static_url_path='/static')

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    # Starts the local static web server
    app.run(debug=True, use_reloader=False, port=5000)
