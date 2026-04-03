# AI-Enabled Clinical Trial Study Start-Up Acceleration Platform (POC)

## Overview
Clinical trial start-up—particularly site selection, feasibility assessment, and participant enrollment—is traditionally a slow, manual, and fragmented process. This Minimum Viable Product (MVP) transforms this workflow into a data-driven, predictive, and automated system. 

Built with an API-first architecture, this platform combines protocol intelligence, AI-driven site scoring, behavioral enrollment simulation, and document automation to dramatically reduce trial start-up times.

### Key Capabilities
* **Protocol Intelligence:** Ingests unstructured clinical trial protocols (PDFs) and extracts structured criteria.
* **AI Site Selection Engine:** Dynamically ranks clinical sites based on historical CMS/NPI metrics, patient availability, and therapeutic match.
* **Enrollment Simulation:** Projects time-to-target enrollment using real-world behavioral realism, injecting ±20% site-level variance to account for operational friction.
* **Activation Workflow Automation:** Automatically generates populated, compliance-ready `.docx` artifacts (e.g., FDA Form 1572, CDAs) bundled in a `.zip` archive.

## Tech Stack
* **Frontend:** React, Next.js, Tailwind CSS
* **Backend:** Python, FastAPI
* **Data Processing:** PyPDF2 (Parsing), python-docx (Generation), Faker (Synthetic Data)

---

## Getting Started

### Prerequisites
* **Node.js** (v16 or higher) installed for the frontend.
* **Python** (v3.8 or higher) installed for the backend.

### 1. Backend Setup (FastAPI)
Open a terminal and navigate to the `backend` directory:
```bash
cd backend
```

Create and activate a virtual environment:
* **Windows:** `python -m venv venv` then `.\venv\Scripts\activate`
* **Mac/Linux:** `python3 -m venv venv` then `source venv/bin/activate`

Install the required dependencies:
```bash
pip install fastapi uvicorn pydantic faker python-docx python-multipart PyPDF2
```

Generate the mock PDF protocol files required for testing the upload feature:
```bash
python generate_pdfs.py
```

Start the backend server:
```bash
python -m uvicorn main:app --reload
```
*The API will be live at `http://localhost:8000` and interactive API documentation will be available at `http://localhost:8000/docs`.*

### 2. Frontend Setup (Next.js)
Open a **new** terminal window and navigate to the `frontend` directory:
```bash
cd frontend
```

Install the Node modules:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000` to access the platform.

---

## About the Author

Hi, I'm **Sarathkumar Babu**. 

I am a Technical Product Manager based in Bangalore with a deep passion for leveraging AI, machine learning, and data-driven systems to solve complex operational bottlenecks. With a background spanning sophisticated platforms and modern tech stacks, I specialize in translating ambiguous problems into structured, scalable, and intelligent software solutions. 

This project reflects my focus on building intuitive, API-first orchestration platforms that replace fragmented manual workflows with cohesive, intelligent automation.
