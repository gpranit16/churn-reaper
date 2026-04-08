# Churn Reaper - Local Setup Commands (Simple English)

Use this file when a **new person** opens the project for the first time.

Everything below is for **Windows CMD**.

---

## 0) Install these first (one-time)

- Git
- Python 3.11+
- Node.js 18+ (npm comes with Node)

---

## 1) Download project from GitHub

Open CMD and run:

```cmd
git clone https://github.com/gpranit16/churn-reaper.git
cd churn-reaper
```

---

## 2) Backend first-time setup and run

### Step A: Create virtual environment + install Python packages

```cmd
cd backend
python -m venv ..\venv
..\venv\Scripts\python.exe -m pip install --upgrade pip
..\venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Step B: Create backend environment file

Create file: `backend\.env`

Paste this:

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL_NAME=llama-3.1-8b-instant
GROQ_TIMEOUT_SECONDS=6
GROQ_MAX_RETRIES=0
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOW_CREDENTIALS=false
```

### Step C: Run backend server

```cmd
..\venv\Scripts\python.exe main.py
```

Backend URLs:

- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs

Keep this terminal running.

---

## 3) Frontend first-time setup and run (new CMD window)

Open a **new CMD** and run:

```cmd
cd /d path\to\churn-reaper\frontend
npm install
npm run dev
```

Usually frontend opens on:

- http://localhost:5173

If 5173 is busy:

```cmd
npm run dev -- --port 5174
```

Then open:

- http://localhost:5174

---

## 4) Quick check commands (optional)

Open third CMD:

```cmd
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/sample-customer
```

If health shows `{"status":"ok"}`, backend is working.

---

## 5) Next time (daily run) - short commands only

After first setup, you do NOT need install again.

### Backend (Terminal 1)

```cmd
cd /d path\to\churn-reaper\backend
..\venv\Scripts\python.exe main.py
```

### Frontend (Terminal 2)

```cmd
cd /d path\to\churn-reaper\frontend
npm run dev
```

---

## 6) Common issues and quick fixes

### Problem: `python` not found

Try:

```cmd
py -m venv ..\venv
```

### Problem: frontend network error

- Check backend terminal is running
- Check backend health URL works
- Refresh browser once (`Ctrl + F5`)

### Problem: CORS error in local

Check `backend\.env` has:

- `CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
- `CORS_ALLOW_CREDENTIALS=false`

Then restart backend.

---

## 7) Stop servers

In each running terminal, press:

```text
Ctrl + C
```
