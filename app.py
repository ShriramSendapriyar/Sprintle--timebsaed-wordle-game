from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

# Load valid words once at startup
with open('valid-word.json', 'r') as f:
    VALID_WORDS = set(word.strip().upper() for word in json.load(f))

# Endpoint to validate a single word
@app.route('/api/validate', methods=['GET'])
def validate_word():
    word = request.args.get('word', '').strip().upper()
    return jsonify({"valid": word in VALID_WORDS})

# Endpoint to get all words (for random selection)
@app.route('/api/words', methods=['GET'])
def get_words():
    return jsonify(list(VALID_WORDS))

if __name__ == '__main__':
    app.run(debug=True)
