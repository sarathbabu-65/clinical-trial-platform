# AI-Enabled Clinical Trial Study Start-Up Acceleration Platform (POC)

An intelligent, cloud-native enterprise application designed to accelerate clinical trial feasibility and site selection. This platform bridges unstructured protocol PDFs with live site intelligence and highly relational patient demographic data to predict enrollment feasibility and automate study start-up artifacts.

## ✨ Key Features

1. Protocol Intelligence: Upload a clinical trial protocol (PDF) to automatically extract structured criteria (Indication, Phase, Target Enrollment, Inclusion/Exclusion Criteria) using the Groq LPU engine.
2. AI Site Selection: Pings the live ClinicalTrials.gov API to fetch real-world research facilities actively studying the extracted indication, mapped strictly to target US geographies.
3. Patient Feasibility (EHR Integration): Groq translates complex clinical inclusion criteria into standard EHR search terms, executing relational fuzzy SQL joins (ilike) across a cloud-hosted Supabase database containing synthetic patient records. Results are visualized on a responsive Tailwind CSS Heat-Grid.
4. Predictive Enrollment Simulation: Feeds real-world site metadata (past enrollment rates, activation delays) and target metrics into an LLM to generate a non-linear, CMS-pattern ramp-up timeline.
5. Activation Workflow Automation: Dynamically injects protocol and site metadata into template artifacts (FDA 1572, CDAs) and bundles them into a downloadable .zip archive.

## 🏗️ Architecture & Tech Stack

* Frontend: Next.js (React), Tailwind CSS
* Backend: FastAPI (Python), Uvicorn
* Database: Supabase (PostgreSQL) - Hosting Synthea EHR data
* AI / LLM Engine: Groq API (llama-3.3-70b-versatile)
* External APIs: ClinicalTrials.gov API (v2)
* Document Processing: PyPDF2, python-docx

## 🚀 Getting Started (Local Development)

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* A Supabase project with `patients` and `conditions` tables uploaded. (Note: Row Level Security (RLS) must be disabled for the `anon` key for this MVP).
* A Groq API Key.

### 1. Backend Setup
Navigate to the backend directory:
cd backend

Create a virtual environment and install dependencies:
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt

Create a .env file in the backend folder and add your credentials:
GROQ_API_KEY="your_groq_api_key"
SUPABASE_URL="your_supabase_project_url"
SUPABASE_KEY="your_supabase_anon_public_key"

Start the FastAPI server:
uvicorn main:app --reload

### 2. Frontend Setup
Navigate to the frontend directory:
cd frontend

Install dependencies and start the development server:
npm install
npm run dev

Open http://localhost:3000 in your browser. Ensure the API_BASE variable in src/app/page.tsx points to your local backend (http://localhost:8000) during local testing.

## ☁️ Deployment

* Backend (Render): Deploy as a Web Service. Ensure the Build Command is `pip install -r requirements.txt` and the Start Command is `uvicorn main:app --host 0.0.0.0 --port $PORT`. Add the three environment variables to the Render dashboard.
* Frontend (Vercel): Deploy via Vercel's zero-config Next.js integration. Update the API_BASE variable in page.tsx to point to your live Render URL before deploying.

## ⚠️ Notes for Demo Environments
* Geographic Fence: Patient data queries and site selection are explicitly fenced to 8 target US states (CA, NY, TX, FL, VA, MD, NC, DC) to ensure high-density visual rendering on the Heat-Grid based on the current synthetic dataset.
* Cold Starts: If utilizing Render's free tier for the backend API, the service will sleep after 15 minutes of inactivity. Initial PDF parsing on a cold boot may take 30–50 seconds.

## About the Author

Hi, I'm **Sarathkumar Babu**. 

I am a Technical Product Manager based in Bangalore with a deep passion for leveraging AI, machine learning, and data-driven systems to solve complex operational bottlenecks. With a background spanning sophisticated platforms and modern tech stacks, I specialize in translating ambiguous problems into structured, scalable, and intelligent software solutions. 

This project reflects my focus on building intuitive, API-first orchestration platforms that replace fragmented manual workflows with cohesive, intelligent automation.
