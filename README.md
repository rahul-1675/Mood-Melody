# MoodMelody 🎵🎬

**AI-Powered Mood-Based Music & Movie Recommendation Platform**
Built for AIML Major Project & Research Demonstration.

---

## Clean Project Structure

```
MoodMelody/
│
├── app.py                              # Flask entry point (port 5000)
├── index.html                          # Single Page Web App UI
├── requirements.txt                    # Python dependencies
├── Procfile / runtime.txt / .gitignore
├── README.md                           # Documentation
│
├── static/                             # Web Frontend Application
│   ├── css/                            # Custom Vanilla CSS
│   ├── img/                            # Brand assets
│   └── js/                             # Modular JavaScript Architecture
│       ├── app.js                      # Central SPA orchestrator
│       ├── movies.js                   # Movie AI recommendation pipeline
│       ├── songs_data.js               # Song catalog dataset
│       ├── ai/                         # Multilingual NLP Mood & Context Detectors
│       ├── data/                       # Movie dataset catalogs (realCatalog.js & movies_data.js)
│       ├── recommendations/            # Hybrid Ranker, MMR Diversity, Similarity Engine
│       ├── ui/                         # Renderers (Movie cards, Modal, Analytics)
│       ├── user/                       # User profile memory & real interaction log
│       └── utils/                      # LocalStorage & formatting helpers
│
├── data/                               # Essential Machine Learning Datasets
│   ├── movies/
│   │   └── movies_100k_blockbusters.csv # 100,000 Blockbuster Movie Dataset (CSV, 40.7 MB)
│   ├── interactions/
│   │   └── interactions_500k.csv       # 500,000 Real User Interaction Ratings (56.9 MB)
│   └── processed/                      # Evaluation Parquet Datasets
│       ├── moodmelody_master_dataset.parquet (7.0 MB)
│       ├── train.parquet / val.parquet / test.parquet (70/15/15 split)
│       └── evaluation_metrics.csv      # Offline model comparison output
│
└── scripts/                            # Pipeline Utility Scripts
    ├── export_100k_csv.py              # Export 100,000 Blockbuster Movies CSV
    └── evaluate_recommender.py         # Offline evaluation (Precision@K, Hit Rate@K, NDCG@K)
```

---

## Running Locally

```bash
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`

---

## Evaluation Benchmark

To run offline model evaluation on the test split:

```bash
python scripts/evaluate_recommender.py
```

| Model | Precision@10 | Hit Rate@10 | NDCG@10 |
|-------|-------------|-------------|---------|
| Popularity Baseline | 0.385 | 61.2% | 0.528 |
| Content-Based | 0.562 | 74.5% | 0.672 |
| Collaborative Filtering | 0.658 | 82.4% | 0.748 |
| Mood-Based | 0.765 | 91.2% | 0.845 |
| **Hybrid MoodMelody** | **0.885 (88.5%)** | **96.5%** | **0.928** |
