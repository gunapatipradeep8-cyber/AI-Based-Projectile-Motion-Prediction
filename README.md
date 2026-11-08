# AI-Based Projectile Motion Prediction

A full-stack web application designed for college Physics students and educators to simulate, visualize, and predict projectile motion trajectories using classical physics and Machine Learning.

---

## ⚠️ Important: Place Your Trained ML Model Here

Your pre-trained `.pkl` model file must be placed in:

```
backend/app/models/projectile_model.pkl
```

> **Target Path:**
> `AI-Based-Projectile-Motion-Prediction/backend/app/models/projectile_model.pkl`

Once you have pasted your `.pkl` model file into this directory, please provide your model's details (such as input feature names, expected units, and output target format) so the backend API and frontend simulator inputs can be configured to match it precisely.

---

## Project Structure

```text
AI-Based-Projectile-Motion-Prediction/
│
├── frontend/
│   ├── public/
│   │   ├── images/
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── ProjectileSimulator.jsx
│   │   │   ├── PredictionResults.jsx
│   │   │   ├── TrajectoryGraph.jsx
│   │   │   ├── AIChatbot.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Simulator.jsx
│   │   │   ├── About.jsx
│   │   │   └── LearnPhysics.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── prediction.py
│   │   │   └── chatbot.py
│   │   │
│   │   ├── models/
│   │   │   ├── README.md
│   │   │   └── projectile_model.pkl   <-- [PASTE YOUR TRAINED MODEL HERE]
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ml_service.py
│   │   │   └── physics_service.py
│   │   │
│   │   └── database/
│   │       ├── __init__.py
│   │       └── database.py
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── README.md
└── .gitignore
```

---

## How to Open in VS Code

1. Launch **Visual Studio Code**.
2. Go to **File** > **Open Folder...** (or press `Ctrl + K`, `Ctrl + O`).
3. Select the project folder:
   ```
   AI-Based-Projectile-Motion-Prediction
   ```
4. Open the integrated terminal (`Ctrl + ~` or **Terminal** > **New Terminal**).

---

## Installation & Setup Guide

### 1. Backend Setup (FastAPI & Python)

From the project root:

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.\venv\Scripts\activate.bat
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
copy .env.example .env   # Windows
# or: cp .env.example .env # macOS/Linux

# Run the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

FastAPI interactive documentation will be accessible at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

### 2. Frontend Setup (React + Vite + Tailwind CSS)

From the project root (in a separate terminal window):

```bash
# Navigate to the frontend directory
cd frontend

# Install npm packages
npm install

# Start the Vite development server
npm run dev
```

The frontend will be accessible at:
- `http://localhost:5173`

---

## Next Steps

1. Paste your `projectile_model.pkl` into `backend/app/models/`.
2. Confirm with the developer once pasted, specifying:
   - Expected input features (e.g. angle, initial velocity, launch height, air resistance coefficient).
   - Expected output format (e.g. range, max height, flight time, or coordinates).

## 📡 Backend API Endpoints

The FastAPI backend exposes the following REST endpoints:

- `POST /predict` – Accepts a JSON payload with the input features required by your ML model and returns the predicted trajectory data (range, max height, flight time, and optional coordinate list). Example request body:
  ```json
  {
    "angle": 45,
    "initial_velocity": 30,
    "launch_height": 1.5,
    "air_resistance": 0.02
  }
  ```
  The response mirrors the model output format you defined in the *Next Steps* section.

- `POST /chat` – Sends a user message to the integrated AI chatbot (powered by Gemini) and returns the assistant’s reply. The chatbot can answer physics‑related questions, explain the model predictions, or provide tutoring.

- `GET /health` – Simple health‑check endpoint returning `{"status":"ok"}`. Useful for deployment monitors.

All endpoints are documented automatically at `http://127.0.0.1:8000/docs` (Swagger UI) and `http://127.0.0.1:8000/redoc` (ReDoc).

---

## 🎨 Frontend Component Overview

The React/Vite frontend is organized under `src/components`:

- **Navbar.jsx** – Top navigation bar with links to Home, Simulator, About, and Learn Physics pages.
- **Hero.jsx** – Eye‑catching landing section describing the project.
- **ProjectileSimulator.jsx** – Core UI for entering launch parameters, triggering predictions, and visualising the trajectory.
- **PredictionResults.jsx** – Shows numeric results (range, height, flight time) and a downloadable CSV of trajectory points.
- **TrajectoryGraph.jsx** – Interactive Plotly graph rendering the projectile’s path.
- **AIChatbot.jsx** – Chat window that communicates with the `/chat` backend endpoint.
- **LoadingSpinner.jsx** – Re‑usable spinner component for async operations.

Utility files:

- `services/api.js` – Wrapper around `fetch` that calls the backend endpoints and handles errors.
- `assets/` – Static images and icons used throughout the UI.

---

## 🚀 Running the Full Stack Application

1. **Start the backend** (in one terminal):
   ```bash
   cd backend
   .\\venv\\Scripts\\Activate.ps1   # or activate.bat if you prefer cmd
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. Open a browser and navigate to `http://localhost:5173`. The UI will automatically call the backend at `http://127.0.0.1:8000`.

> **Note** – If you change the backend host/port, update the `BASE_URL` constant in `frontend/src/services/api.js`.

---

## 🛠️ Adding Your Trained Model

1. Place the `projectile_model.pkl` file inside `backend/app/models/` (the placeholder comment is already present).
2. Open `backend/app/services/ml_service.py` and adjust the `load_model()` function if your model requires custom deserialization.
3. Define the expected input feature names and their units in `backend/app/services/ml_service.py` – the API will validate incoming JSON against this schema.
4. (Optional) Update `frontend/src/components/ProjectileSimulator.jsx` to match the exact field names or add dropdowns for unit selection.

---

## 🤝 Contributing

Contributions are welcome! Follow these steps to submit a pull request:

1. Fork the repository.
2. Create a new branch for your feature or bug‑fix: `git checkout -b my-feature`.
3. Make your changes and ensure all tests pass (`npm test` for frontend, `pytest` for backend if tests exist).
4. Commit with a clear message and push to your fork.
5. Open a pull request against the `main` branch.

Please adhere to the existing code style (Prettier for JavaScript/React, Black for Python) and include documentation updates where appropriate.

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 📬 Contact & Support

If you run into any issues or have suggestions, feel free to open an issue on GitHub or reach out via the **AIChatbot** built into the app!

---

## 🔮 Future Work & Enhancements

- **Real‑time physics engine** – Replace the simple analytical equations with a high‑performance physics simulation (e.g., using `pybox2d` or `pymunk`) to support wind, spin, and non‑uniform gravity.
- **Model versioning** – Integrate a model registry (MLflow or DVC) so users can switch between multiple trained models via a dropdown in the UI.
- **Batch predictions** – Add an endpoint `/batch-predict` that accepts an array of launch parameters and returns a CSV file for bulk analysis.
- **3‑D visualisation** – Extend `TrajectoryGraph.jsx` with a WebGL‑based 3‑D view (e.g., `three.js` or `react‑three‑fiber`).
- **Educational content** – Embed interactive tutorials that explain the underlying physics formulas and how the ML model was trained.
- **Docker / CI‑CD** – Provide Dockerfiles and GitHub Actions workflows for automated builds, tests, and deployments to cloud platforms (GCP Cloud Run, Azure App Service, etc.).

---

## 🙏 Acknowledgements

- The project scaffold was generated with the **AI‑Based Project Generator** plugin.
- Front‑end styling uses **Tailwind CSS** and the **Plotly.js** library for interactive graphs.
- Backend API built with **FastAPI** – thanks to the FastAPI community for excellent documentation.
- The chatbot integration leverages **Google Gemini** via the `gemini-api` plugin.
- Special thanks to all open‑source contributors whose packages make this project possible.

---

## 🐞 Troubleshooting

| Issue | Likely Cause | Fix |
|-------|---------------|-----|
| `Unable to import uvicorn` | Missing dependency in virtual environment | Run `pip install uvicorn` inside the activated venv |
| `CORS error` when frontend calls backend | Backend CORS not configured | Ensure `FastAPI` includes `from fastapi.middleware.cors import CORSMiddleware` and add `app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])` |
| `Model file not found` | `.pkl` not placed correctly | Verify the file exists at `backend/app/models/projectile_model.pkl` and that the path in `ml_service.py` matches |
| `Front‑end cannot reach backend` | Backend running on different host/port | Update `BASE_URL` in `frontend/src/services/api.js` to match the actual backend URL |
| `npm install` hangs | Corrupt `package-lock.json` | Delete `node_modules` and `package-lock.json`, then run `npm install` again |

---

## 📦 Deployment Options

- **Docker Compose** – Build both services with a single `docker-compose.yml`.
- **Google Cloud Run** – Deploy the FastAPI container; configure the frontend as a static site in **Firebase Hosting**.
- **Vercel / Netlify** – Host the Vite app with automatic SSR support; proxy API calls to a managed backend.

For detailed Docker instructions, see the `docker/` folder (to be added).

---

*Happy coding and enjoy exploring projectile motion with AI!*

## 📡 Backend API Endpoints

The FastAPI backend exposes the following REST endpoints:

- `POST /predict` – Accepts a JSON payload with the input features required by your ML model and returns the predicted trajectory data (range, max height, flight time, and optional coordinate list). Example request body:
  ```json
  {
    "angle": 45,
    "initial_velocity": 30,
    "launch_height": 1.5,
    "air_resistance": 0.02
  }
  ```
  The response mirrors the model output format you defined in the *Next Steps* section.

- `POST /chat` – Sends a user message to the integrated AI chatbot (powered by Gemini) and returns the assistant’s reply. The chatbot can answer physics‑related questions, explain the model predictions, or provide tutoring.

- `GET /health` – Simple health‑check endpoint returning `{"status":"ok"}`. Useful for deployment monitors.

All endpoints are documented automatically at `http://127.0.0.1:8000/docs` (Swagger UI) and `http://127.0.0.1:8000/redoc` (ReDoc).

---

## 🎨 Frontend Component Overview

The React/Vite frontend is organized under `src/components`:

- **Navbar.jsx** – Top navigation bar with links to Home, Simulator, About, and Learn Physics pages.
- **Hero.jsx** – Eye‑catching landing section describing the project.
- **ProjectileSimulator.jsx** – Core UI for entering launch parameters, triggering predictions, and visualising the trajectory.
- **PredictionResults.jsx** – Shows numeric results (range, height, flight time) and a downloadable CSV of trajectory points.
- **TrajectoryGraph.jsx** – Interactive Plotly graph rendering the projectile’s path.
- **AIChatbot.jsx** – Chat window that communicates with the `/chat` backend endpoint.
- **LoadingSpinner.jsx** – Re‑usable spinner component for async operations.

Utility files:

- `services/api.js` – Wrapper around `fetch` that calls the backend endpoints and handles errors.
- `assets/` – Static images and icons used throughout the UI.

---

## 🚀 Running the Full Stack Application

1. **Start the backend** (in one terminal):
   ```bash
   cd backend
   .\\venv\\Scripts\\Activate.ps1   # or activate.bat if you prefer cmd
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. Open a browser and navigate to `http://localhost:5173`. The UI will automatically call the backend at `http://127.0.0.1:8000`.

> **Note** – If you change the backend host/port, update the `BASE_URL` constant in `frontend/src/services/api.js`.

---

## 🛠️ Adding Your Trained Model

1. Place the `projectile_model.pkl` file inside `backend/app/models/` (the placeholder comment is already present).
2. Open `backend/app/services/ml_service.py` and adjust the `load_model()` function if your model requires custom deserialization.
3. Define the expected input feature names and their units in `backend/app/services/ml_service.py` – the API will validate incoming JSON against this schema.
4. (Optional) Update `frontend/src/components/ProjectileSimulator.jsx` to match the exact field names or add dropdowns for unit selection.

---

## 🤝 Contributing

Contributions are welcome! Follow these steps to submit a pull request:

1. Fork the repository.
2. Create a new branch for your feature or bug‑fix: `git checkout -b my-feature`.
3. Make your changes and ensure all tests pass (`npm test` for frontend, `pytest` for backend if tests exist).
4. Commit with a clear message and push to your fork.
5. Open a pull request against the `main` branch.

Please adhere to the existing code style (Prettier for JavaScript/React, Black for Python) and include documentation updates where appropriate.

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 📬 Contact & Support

If you run into any issues or have suggestions, feel free to open an issue on GitHub or reach out via the **AIChatbot** built into the app!

---

## 🔮 Future Work & Enhancements

- **Real‑time physics engine** – Replace the simple analytical equations with a high‑performance physics simulation (e.g., using `pybox2d` or `pymunk`) to support wind, spin, and non‑uniform gravity.
- **Model versioning** – Integrate a model registry (MLflow or DVC) so users can switch between multiple trained models via a dropdown in the UI.
- **Batch predictions** – Add an endpoint `/batch-predict` that accepts an array of launch parameters and returns a CSV file for bulk analysis.
- **3‑D visualisation** – Extend `TrajectoryGraph.jsx` with a WebGL‑based 3‑D view (e.g., `three.js` or `react‑three‑fiber`).
- **Educational content** – Embed interactive tutorials that explain the underlying physics formulas and how the ML model was trained.
- **Docker / CI‑CD** – Provide Dockerfiles and GitHub Actions workflows for automated builds, tests, and deployments to cloud platforms (GCP Cloud Run, Azure App Service, etc.).

---

## 🙏 Acknowledgements

- The project scaffold was generated with the **AI‑Based Project Generator** plugin.
- Front‑end styling uses **Tailwind CSS** and the **Plotly.js** library for interactive graphs.
- Backend API built with **FastAPI** – thanks to the FastAPI community for excellent documentation.
- The chatbot integration leverages **Google Gemini** via the `gemini-api` plugin.
- Special thanks to all open‑source contributors whose packages make this project possible.

---

## 🐞 Troubleshooting

| Issue | Likely Cause | Fix |
|-------|---------------|-----|
| `Unable to import uvicorn` | Missing dependency in virtual environment | Run `pip install uvicorn` inside the activated venv |
| `CORS error` when frontend calls backend | Backend CORS not configured | Ensure `FastAPI` includes `from fastapi.middleware.cors import CORSMiddleware` and add `app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])` |
| `Model file not found` | `.pkl` not placed correctly | Verify the file exists at `backend/app/models/projectile_model.pkl` and that the path in `ml_service.py` matches |
| `Front‑end cannot reach backend` | Backend running on different host/port | Update `BASE_URL` in `frontend/src/services/api.js` to match the actual backend URL |
| `npm install` hangs | Corrupt `package-lock.json` | Delete `node_modules` and `package-lock.json`, then run `npm install` again |

---

## 📦 Deployment Options

- **Docker Compose** – Build both services with a single `docker-compose.yml`.
- **Google Cloud Run** – Deploy the FastAPI container; configure the frontend as a static site in **Firebase Hosting**.
- **Vercel / Netlify** – Host the Vite app with automatic SSR support; proxy API calls to a managed backend.

For detailed Docker instructions, see the `docker/` folder (to be added).

---

*Happy coding and enjoy exploring projectile motion with AI!*