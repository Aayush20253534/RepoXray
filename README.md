# 🔍 RepoXray — Intelligent Repository Insights & Code Analysis Engine

RepoXray is a full-stack repository intelligence platform that scans GitHub repositories, extracts file structures, builds dependency graphs, and generates AI-powered code summaries. It helps developers understand unfamiliar codebases faster by combining repository parsing, static analysis, authentication, and LLM-based file explanation.

---

## 🌟 Key Features

| Feature                       | Description                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| 📁 Repository Upload          | Submit a GitHub repository URL and start an asynchronous analysis job.                         |
| 🧬 Repository Tree Extraction | Generates structured JSON representations of cloned repository files.                          |
| 🔗 Dependency Graph           | Builds file-level dependency relationships for supported source files.                         |
| 🤖 AI File Summaries          | Uses Groq/LangChain to generate concise technical summaries of source files.                   |
| 🔐 Authentication             | JWT-based signup, login, protected routes, and user-specific repository access.                |
| 📡 Real-Time Status Updates   | WebSocket endpoint tracks repository processing status live.                                   |
| 🗃️ PostgreSQL Persistence    | Stores users, repository metadata, processing status, and ownership mapping.                   |
| 🖥️ Developer Dashboard       | React-based frontend for uploading repositories, viewing results, and browsing analyzed files. |

---

## 🌌 Theme

RepoXray uses a dark-mode developer tooling interface with high-contrast layouts, sidebar navigation, and clean technical visuals designed for repository exploration and code intelligence workflows.

---

## 📐 Project Architecture

```txt
+-- server
|   +-- Repo_Codes_data
|   +-- cloned_repos
|   +-- uuid_summary.json
|   +-- Summary.py
|   +-- schemas.py
|   +-- sample_groq.py
|   +-- requirements.txt
|   +-- repo_tree.py
|   +-- repo_data.json
|   +-- Repo_clone.py
|   +-- models.py
|   +-- main.py
|   +-- init_db.py
|   +-- dependency_graph.py
|   +-- database.py
|   +-- auth.py
|   +-- api_groq.py
|   +-- api.py
|   +-- .gitignore
|   +-- .env
+-- client
|   +-- src
|   |   +-- pages
|   |   |   +-- Repositry_Upload.jsx
|   |   |   +-- login.jsx
|   |   +-- components
|   |   |   +-- sidebar.jsx
|   |   +-- main.jsx
|   |   +-- index.css
|   |   +-- App.jsx
|   +-- vite.config.js
|   +-- vercel.json
|   +-- README.md
|   +-- package-lock.json
|   +-- package.json
|   +-- index.html
|   +-- eslint.config.js
|   +-- .gitignore
|   +-- .env
```

---

## 🚀 Tech Stack

| Layer                 | Technologies                                                  |
| --------------------- | ------------------------------------------------------------- |
| Frontend              | React 19, Vite, React Router, Tailwind CSS                    |
| UI                    | Lucide React, Motion                                          |
| Backend               | Python, FastAPI, Uvicorn                                      |
| Database              | PostgreSQL, SQLAlchemy                                        |
| Authentication        | JWT, Passlib, Bcrypt                                          |
| AI / LLM              | Groq API, LangChain Core, LangChain Groq                      |
| Repository Processing | Git cloning, file tree extraction, static dependency analysis |
| Deployment            | Vercel frontend, Render/Railway backend, Neon PostgreSQL      |

---

## 🧠 AI Capabilities

* AI-generated technical summaries for individual source files
* Repository-aware code explanation
* File-level architectural insight extraction
* Cached summary storage to avoid repeated LLM calls
* Prompt-based senior-engineer style analysis using Groq models

---

## 🏗️ Architecture Highlights

* React single-page frontend with protected routing
* FastAPI backend with REST and WebSocket endpoints
* PostgreSQL-backed user and repository ownership model
* Repository cloning pipeline with status tracking
* Static dependency graph generation
* Per-repository cached analysis files
* Environment-based deployment configuration

---

## 🔧 Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/Aayush20253534/RepoXray.git
cd RepoXray
```

---

## 🖥️ Backend Setup

```bash
cd server
python -m venv venv
```

Activate the virtual environment:

### Windows

```bash
venv\Scripts\activate
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside `/server`:

```env
PORT=8000
DATABASE_URL=postgresql://username:password@localhost:5432/RepoXray
JWT_SECRET=your_jwt_secret_here
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
DATA_DIR=Repo_Codes_data
CLONE_BASE_DIR=cloned_repos
```

Create database tables:

```bash
python init_db.py
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend runs at:

```txt
http://localhost:8000
```

---

## 🌐 Frontend Setup

```bash
cd ../client
npm install
```

Create a `.env` file inside `/client`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

Frontend runs at:

```txt
http://localhost:5173
```

---

## 🛠️ Environment Variables

### Server `.env`

| Variable         | Description                                  |
| ---------------- | -------------------------------------------- |
| `PORT`           | Backend server port                          |
| `DATABASE_URL`   | PostgreSQL connection string                 |
| `JWT_SECRET`     | Secret key for JWT signing                   |
| `GROQ_API_KEY`   | Groq API key for AI summaries                |
| `FRONTEND_URL`   | Allowed frontend origin for CORS             |
| `BACKEND_URL`    | Public backend URL used for WebSocket links  |
| `DATA_DIR`       | Directory for generated repository JSON data |
| `CLONE_BASE_DIR` | Directory where repositories are cloned      |

### Client `.env`

| Variable            | Description          |
| ------------------- | -------------------- |
| `VITE_API_BASE_URL` | Backend API base URL |

---

## 🚀 Deployment

### Frontend: Vercel

Use these settings:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Set this environment variable in Vercel:

```env
VITE_API_BASE_URL=https://your-render-backend.onrender.com
```

---

### Backend: Render

Use these settings:

```txt
Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set these environment variables in Render:

```env
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_jwt_secret_here
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_URL=https://your-vercel-app.vercel.app
BACKEND_URL=https://your-render-backend.onrender.com
DATA_DIR=/tmp/Repo_Codes_data
CLONE_BASE_DIR=/tmp/cloned_repos
```

After first deployment, open the Render shell and run:

```bash
python init_db.py
```

---

## 🗄️ Database

RepoXray uses PostgreSQL with SQLAlchemy models.

Main tables:

| Table          | Purpose                                                            |
| -------------- | ------------------------------------------------------------------ |
| `users`        | Stores registered users and authentication data                    |
| `repositories` | Stores repository metadata, owner mapping, status, and clone paths |

Recommended production database provider:

```txt
Neon PostgreSQL
```

---

## 📡 Main API Endpoints

| Method | Endpoint                   | Description                            |
| ------ | -------------------------- | -------------------------------------- |
| `POST` | `/signup`                  | Register a new user                    |
| `POST` | `/login`                   | Login and receive JWT token            |
| `GET`  | `/api/my-repos`            | Get repositories owned by current user |
| `POST` | `/api/ingest`              | Submit GitHub repository for analysis  |
| `GET`  | `/api/tree/{repo_id}`      | Get generated repository file tree     |
| `GET`  | `/api/graph/{repo_id}`     | Get dependency graph                   |
| `GET`  | `/api/summary/{repo_id}`   | Get repository summary                 |
| `GET`  | `/api/file-code/{repo_id}` | Get source code for a file             |
| `POST` | `/api/file-summary`        | Generate or fetch cached file summary  |
| `WS`   | `/api/ws/status/{repo_id}` | Track repository processing status     |

---

## 📁 Generated Data

RepoXray generates and stores analysis output in:

```txt
server/Repo_Codes_data
server/cloned_repos
```

These folders may contain cloned source code, generated JSON files, graph data, and cached summaries.

For production deployment, avoid committing these folders unless needed for demo data.

Recommended `.gitignore` entries:

```gitignore
.env
__pycache__/
venv/
Repo_Codes_data/
cloned_repos/
*.log
```

---

## ⚠️ Deployment Notes

* Do not use `localhost` URLs in deployed frontend environment variables.
* Do not commit `.env` files.
* Render file storage is temporary unless a persistent disk is configured.
* Use Neon or another hosted PostgreSQL provider for production.
* Run `python init_db.py` once after setting `DATABASE_URL`.
* The backend host must have Git available because repositories are cloned during analysis.

---

## 🖤 Credits

RepoXray was built through the collaborative efforts of a passionate development team focused on repository intelligence, code analysis, and AI-powered developer tooling.

### Team Members

**Aayush Thakur**
Chief Frontend Developer, UI/UX Designer & System Integration Lead

**Om Upadhyay**
Frontend Developer & UI Development Support

**Aayansh Niranjan**
Chief Backend Developer

**Suryansh Chandel**
Backend Developer, Authentication & Database Management

---

Built with FastAPI, React, PostgreSQL, LangChain, and Groq to deliver intelligent repository analysis and developer-focused insights.

**RepoXray Team**

