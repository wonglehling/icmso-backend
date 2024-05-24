from flask import Flask, request, jsonify
from joblib import load
from gensim.models import Word2Vec
import numpy as np
import os
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import json
from nltk.corpus import stopwords
import nltk
nltk.download('stopwords')
from nltk.stem import PorterStemmer
stemmer = PorterStemmer()
import spacy
nlp = spacy.load('en_core_web_sm')
import pandas as pd
from spacy.lang.en.stop_words import STOP_WORDS
import string


app = Flask(__name__)
current_dir = os.path.dirname(os.path.abspath(__file__))

# Load the saved models
label_encoder = load(os.path.join(current_dir, 'models/label_encoder.pkl'))
word2vec_model = Word2Vec.load(os.path.join(current_dir, 'models/word2vec_model.model'))
scaler = load(os.path.join(current_dir, 'models/scaler.pkl'))
svm_model_word2vec = load(os.path.join(current_dir, 'models/svm_model_word2vec.pkl'))
tfidf_vectorizer = load(os.path.join(current_dir, 'models/tfidf_vectorizer.pkl'))

def preprocess_text(text):
    # Remove punctuation and convert to lowercase
    text = ''.join([word.lower() for word in text if word not in string.punctuation])
    
    # Tokenize the text
    tokens = nlp(text)
    
    # Remove stop words and lemmatize the tokens
    tokens = [token.lemma_ for token in tokens if token.text.lower() not in STOP_WORDS]
    
    # Join the tokens back into a string
    preprocessed_text = ' '.join(tokens)
    
    return preprocessed_text

def get_doc_embeddings(text, word2vec_model):
    word_embeddings = [word2vec_model.wv[word] for word in text.split() if word in word2vec_model.wv]
    doc_embedding = sum(word_embeddings) / len(word_embeddings) if word_embeddings else [0] * word2vec_model.vector_size
    return doc_embedding

def recommend_items(user_id, user_item_matrix, item_similarity_df, top_n=3):
    if user_id in user_item_matrix.index:
        # Existing user: recommend based on their ratings
        user_ratings = user_item_matrix.loc[user_id]
        similar_scores = item_similarity_df.dot(user_ratings).div(item_similarity_df.sum(axis=1))
        for item_id in user_ratings.index:
            if user_ratings[item_id] > 0:
                similar_scores = similar_scores.drop(item_id)
        similar_scores = similar_scores.sort_values(ascending=False)
        recommended_items = similar_scores.head(top_n).index.tolist()
    if user_id not in user_item_matrix.index or recommended_items == []:
        # New user: recommend popular items or similar items
        popular_items = user_item_matrix.mean(axis=0).sort_values(ascending=False)
        recommended_items = popular_items.head(top_n).index.tolist()
    return recommended_items


@app.route('/classify-and-keywords', methods=['POST'])
def classify_and_keywords():
    data = request.json
    title = data['title']
    abstract = data['abstract']

    text = title + " " + abstract
    preprocessed_text = preprocess_text(text)
    embedding = get_doc_embeddings(preprocessed_text, word2vec_model)
    embedding_scaled = scaler.transform([embedding])

    prediction = svm_model_word2vec.predict(embedding_scaled)
    decoded_prediction = label_encoder.inverse_transform(prediction)

    # Keyword extraction
    tfidf_matrix = tfidf_vectorizer.transform([preprocessed_text])
    tfidf_scores = zip(tfidf_vectorizer.get_feature_names_out(), tfidf_matrix.toarray()[0])
    sorted_tfidf_scores = sorted(tfidf_scores, key=lambda x: x[1], reverse=True)
    keywords = [word for word, score in sorted_tfidf_scores[:15]]  # Extract top 20 keywords


    return jsonify({'category': decoded_prediction[0], 'keywords': keywords})

@app.route('/get-user-item-matrix', methods=['POST'])
def get_user_item_matrix():
    body = request.json
    data = body['data']
    category = body['category']
    df = pd.DataFrame(data)

    category_df = df[df['category'] == category]
    user_item_matrix = category_df.pivot_table(index='user_id', columns='item_id', values='rating')
    user_item_matrix = user_item_matrix.fillna(0)
    user_item_matrix = user_item_matrix.to_dict()
    return jsonify({'user_item_matrix': user_item_matrix})

@app.route('/get-item-similarity-df', methods=['POST'])
def get_item_similarity_df():
    body = request.json
    # Load the user_item_matrix from JSON string to dictionary
    user_item_matrix = body['user_item_matrix']
    # Convert the dictionary to a Pandas DataFrame
    user_item_matrix = pd.DataFrame(user_item_matrix)
    item_similarity = cosine_similarity(user_item_matrix.T)
    item_similarity_df = pd.DataFrame(item_similarity, index=user_item_matrix.columns, columns=user_item_matrix.columns)
    item_similarity_df = item_similarity_df.to_dict()
    return jsonify({'item_similarity_df': item_similarity_df})

@app.route('/')
def index():
    return jsonify({'message': 'helloworld'})

@app.route('/recommend-document', methods=['POST'])
def recommend_document():
    body = request.json
    
    # Extract user_id
    user_id = body['user_id']
    
    # Extract and process user_item_matrix
    user_item_matrix_dict = body['user_item_matrix']
    user_item_matrix = pd.DataFrame(user_item_matrix_dict)
    
    # Extract and process item_similarity_df
    item_similarity_df_dict = body['item_similarity_df']
    item_similarity_df = pd.DataFrame(item_similarity_df_dict)
    
    # Generate recommendations
    recommendations = recommend_items(user_id, user_item_matrix, item_similarity_df)
    
    return jsonify({'recommended_items': recommendations})

if __name__ == '__main__':
    app.run(debug=True,port=6000)