# Deploying Bill Snap to Render 🚀

This guide provides step-by-step instructions for deploying both the **FastAPI Backend** and the **React Vite Frontend** on [Render](https://render.com) for free.

---

## Architecture on Render

```
┌─────────────────────────────────┐       API Calls       ┌─────────────────────────────────┐
│     bill-snap-frontend          │ ────────────────────> │         bill-snap-api           │
│  (Render Static Site - React)   │                       │   (Render Web Service - Python) │
│  https://bill-snap.onrender.com │                       │ https://bill-snap-api.onrender  │
└─────────────────────────────────┘                       └─────────────────────────────────┘
                                                                           │
                                                                           ▼
                                                                  Google Gemini API
```

---

## Method 1: Automatic Blueprint Deployment (Recommended)

Because this repository contains a pre-configured [`render.yaml`](../render.yaml), you can deploy both services together with 1 click:

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right corner and choose **Blueprint**.
3. Connect your GitHub repository: `yogeshwar08/bills`.
4. Render will detect the [`render.yaml`](../render.yaml) file and show two services:
   - `bill-snap-api` (Web Service)
   - `bill-snap-frontend` (Static Site)
5. Under `bill-snap-api` Environment Variables, enter your **GEMINI_API_KEY**:
   - `GEMINI_API_KEY`: *(paste your Gemini API key)*
6. Click **Apply**.
7. Once `bill-snap-api` finishes deploying, copy its URL (e.g. `https://bill-snap-api-xxxx.onrender.com`).
8. Go to `bill-snap-frontend` → **Environment** → Add environment variable:
   - `VITE_API_URL`: `https://bill-snap-api-xxxx.onrender.com`
9. Click **Manual Deploy** → **Clear build cache & deploy** on the frontend service.

---

## Method 2: Manual Setup via Render Dashboard

If you prefer to configure services manually, follow these steps:

### Step 1: Deploy Backend Web Service (`bill-snap-api`)

1. Go to [Render Dashboard](https://dashboard.render.com) → Click **New +** → **Web Service**.
2. Select your repository: `yogeshwar08/bills`.
3. Configure settings:
   - **Name**: `bill-snap-api`
   - **Region**: Choose closest (e.g., Oregon or Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
4. Add **Environment Variables**:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.11.9` | Ensures Python 3.11 runtime |
   | `GEMINI_API_KEY` | *(your Gemini API key)* | Secret key from Google AI Studio |
   | `GEMINI_MODEL` | `gemini-flash-lite-latest` | Fast, low-latency vision model |
5. Click **Create Web Service**.
6. Wait for the build to finish. Once healthy, copy your API URL (e.g., `https://bill-snap-api.onrender.com`).
7. Verify by opening `https://bill-snap-api.onrender.com/api/health` in your browser. It should return:
   ```json
   {"status":"healthy","gemini_configured":true,"model_name":"gemini-flash-lite-latest"}
   ```

---

### Step 2: Deploy Frontend Static Site (`bill-snap-frontend`)

1. Go to [Render Dashboard](https://dashboard.render.com) → Click **New +** → **Static Site**.
2. Select your repository: `yogeshwar08/bills`.
3. Configure settings:
   - **Name**: `bill-snap-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variable**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://bill-snap-api.onrender.com` *(from Step 1)* |
5. Add **Rewrite / Redirect Rule** (for client-side routing and PWA):
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.

---

## Testing Your Deployed App

1. Open your frontend URL: `https://bill-snap-frontend.onrender.com`.
2. Check the top bar: the green badge should say **"AI Ready"**.
3. Upload a receipt or photograph a bill.
4. Verify analysis, field confidence scores, editing, and local saving!

> [!NOTE]
> **Render Free Tier Spin-Down:**
> Render free web services spin down after 15 minutes of inactivity. The first request after sleep may take ~30-50 seconds to wake up the server. Once awake, requests respond in normal sub-second time.
