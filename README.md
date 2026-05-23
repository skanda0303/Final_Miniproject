# Intellect. 🧠
### *Autonomous Document Intelligence & Local RAG Cognitive Assistant*

Intellect is a premium, state-of-the-art document cognitive assistant that automatically scans, organizes, indexes, and unlocks actionable knowledge from your Google Drive files in real-time. By utilizing high-performance **Local LLMs (via Ollama)** and **Local Vector Search**, Intellect provides secure, privacy-first Retrieval-Augmented Generation (RAG) and folder structure optimization.

---

## 🚀 Key Features

*   🤖 **Local AI Analysis**: Automatically extracts semantic summaries, value scores, categories, and tags using **Gemma 2 (9B)** or **Qwen 3 (8B)** running completely locally.
*   📁 **Smart Categorization & Reorganization**: Suggests autonomous folder restructuring inside your Google Drive based on content taxonomy (Finance, Legal, Education, Projects, Personal, Tech, Work, Resumes).
*   💬 **Cognitive Local RAG Chat**: Converse directly with your document vector store using natural language. Grounded facts are retrieved using dynamic cosine similarity and keyword-hybrid vector matching.
*   🎛️ **Pipeline Control Panel**: Directly trigger fresh scans or wipe indices instantly using the integrated sidebar buttons (**Index New Documents** and **Clear Database**).
*   📊 **Vibrant Glassmorphism UI**: Beautiful, interactive dashboard featuring glowing visual aesthetics, dark modes, pipeline status shimmers, and terminal trace log streams.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite, TailwindCSS, Radix UI, Lucide Icons)
*   **Backend**: Node.js + Express
*   **Local AI Engine**: **Ollama** (running `gemma2:9b` and `qwen3:8b` models)
*   **RAG Embeddings**: Local Gemma 2 vector generation
*   **Database**: SQLite (`sqlite3` for local documents, vectors, suggestions, and pipeline logs)
*   **Integrations**: Google Drive API & Google OAuth2

---

## 📋 Prerequisites & Setup

### 1. Install & Prepare Ollama
Ensure you have [Ollama](https://ollama.com) installed and active on your system, then pull the necessary models:
```bash
# Pull the default reasoning & indexing model
ollama pull gemma2:9b

# Pull the alternative high-performance model
ollama pull qwen3:8b
```

### 2. Clone the Repository
```bash
git clone https://github.com/skanda0303/Final_Miniproject.git
cd Final_Miniproject
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your details:
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URL=http://localhost:3001/auth/callback

# Server Configuration
PORT=3001
```

### 5. Launch the Application
Run the development servers concurrently (starts both frontend and backend):
```bash
npm run dev
```

*   **Frontend Interface**: `http://localhost:5173` (or `http://localhost:5174`)
*   **Backend Server API**: `http://localhost:3001`

---

## 📡 API Reference

### 🛠️ Database & Operations
*   `POST /api/scan` — Manually scan Drive for new or modified documents.
*   `POST /api/clear` — Purges files, embeddings, logs, and suggestions from SQLite.
*   `POST /api/reset` — Clears all database tables and immediately triggers a fresh scan.

### 📄 Metadata & Intelligence
*   `GET /api/status` — Returns agent authentication, indexing completeness, and file count.
*   `GET /api/files` — Returns all parsed and categorized document records.
*   `GET /api/logs` — Retrieves the latest 30 pipeline execution logs.
*   `POST /api/ask` — Performs hybrid RAG vector search and answers queries using the selected Local LLM.

### 📁 Reorganization
*   `GET /api/suggestions` — Retrieves pending folder relocation suggestions.
*   `POST /api/approve` — Executes file relocation inside Google Drive.
*   `POST /api/deny` — Dismisses the folder relocation recommendation.

---

## 🔒 Security & Privacy
All document reading, text extraction, embedding creation, vector comparison, and RAG synthesis happen **locally** on your own computer. Your data never leaves your machine. Connection to Google Drive is secured officially using standard OAuth2 authentication tokens.

---

## 📄 License
MIT
