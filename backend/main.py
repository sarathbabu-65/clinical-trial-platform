from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from faker import Faker
import random
from datetime import datetime
from docx import Document
import io
import zipfile
import PyPDF2
from fastapi.responses import StreamingResponse

# --- LIVE LLM IMPORTS & SECURITY ---
import json
import os
import google.generativeai as genai

# Fetch the API key safely from the environment
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable is not set. LLM parsing will fail.")
else:
    genai.configure(api_key=api_key)

# =====================================================================
# STEP 1: CANONICAL SCHEMAS (Pydantic Data Models)
# =====================================================================

class StructuredCriteria(BaseModel):
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    conditions_required: List[str] = []
    conditions_excluded: List[str] = []

class Protocol(BaseModel):
    protocol_id: str
    nct_id: str
    title: str
    indication: str
    phase: str
    target_enrollment: int
    inclusion_criteria: List[str]
    exclusion_criteria: List[str]
    structured_criteria: StructuredCriteria
    geographies: List[str]
    created_at: str

class SiteLocation(BaseModel):
    city: str
    state: str
    zip: str

class SiteMetrics(BaseModel):
    past_enrollment_rate: float
    activation_time_days: int
    patient_pool_size: int
    performance_score: float

class SiteCapabilities(BaseModel):
    has_trial_experience: bool
    staff_count: int

class Site(BaseModel):
    site_id: str
    npi: str
    name: str
    organization_type: str   
    specialty: str           
    location: SiteLocation
    therapeutic_areas: List[str]
    metrics: SiteMetrics
    capabilities: SiteCapabilities

class PatientDemographics(BaseModel):
    age: int
    gender: str

class PatientLocation(BaseModel):
    state: str
    zip: str

class PatientUtilization(BaseModel):
    encounters_per_year: int

class Patient(BaseModel):
    patient_id: str
    demographics: PatientDemographics
    conditions: List[str]
    location: PatientLocation
    utilization: PatientUtilization

# --- Request/Response Models ---
class FilterRequest(BaseModel):
    protocol: Protocol

class SiteRankingRequest(BaseModel):
    protocol: Protocol

class SimulationRequest(BaseModel):
    protocol: Protocol
    selected_site_ids: List[str]

class DocGenerationRequest(BaseModel):
    protocol: Protocol
    selected_site_ids: List[str]
    doc_types: List[str]


# =====================================================================
# SEPARATE MODULE: SYNTHETIC DATA GENERATOR
# Handles Sites and Patients 
# =====================================================================

class SyntheticDataGenerator:
    def __init__(self):
        self.fake = Faker()
        self.target_states = ["VA", "MD", "DC", "CA", "NY", "TX", "NC", "FL"]
        self.conditions = ["hypertension", "type 2 diabetes", "heart failure", "nsclc", "asthma", "stroke"]
        self.therapeutic_areas = ["cardiology", "endocrinology", "oncology", "pulmonology", "neurology"]
        self.org_types = ["hospital", "clinic", "academic medical center", "private practice"]

    def generate_sites(self, num_records=100) -> List[dict]:
        sites = []
        for _ in range(num_records):
            is_high_performer = random.random() > 0.8 
            
            if is_high_performer:
                past_enrollment = round(random.uniform(8.0, 20.0), 1)
                pool_size = random.randint(3000, 8000)
                activation_time = random.randint(14, 30)
            else:
                past_enrollment = round(random.uniform(0.5, 5.0), 1)
                pool_size = random.randint(500, 2500)
                activation_time = random.randint(45, 120)

            specialty = random.choice(self.therapeutic_areas)

            sites.append({
                "site_id": f"S-{self.fake.unique.random_int(min=10000, max=99999)}",
                "npi": str(self.fake.unique.random_number(digits=10, fix_len=True)),
                "name": self.fake.company() + " Medical Center",
                "organization_type": random.choice(self.org_types),
                "specialty": specialty,
                "location": {
                    "city": self.fake.city(),
                    "state": random.choice(self.target_states),
                    "zip": self.fake.zipcode()
                },
                "therapeutic_areas": [specialty],
                "metrics": {
                    "past_enrollment_rate": past_enrollment,
                    "activation_time_days": activation_time,
                    "patient_pool_size": pool_size,
                    "performance_score": 0.0
                },
                "capabilities": {
                    "has_trial_experience": is_high_performer or random.choice([True, False]),
                    "staff_count": random.randint(5, 50) if is_high_performer else random.randint(2, 15)
                }
            })
        return sites

    def generate_patients(self, num_records=5000) -> List[dict]:
        patients = []
        for _ in range(num_records):
            age = int(random.gauss(60, 15))
            age = max(18, min(age, 90))
            
            patient_conditions = []
            rand_val = random.random()
            if rand_val < 0.30: patient_conditions.append("hypertension")
            if rand_val < 0.15: patient_conditions.append("type 2 diabetes")
            if 0.40 < rand_val < 0.45: patient_conditions.append("nsclc")
            if 0.50 < rand_val < 0.55: patient_conditions.append("asthma")
            
            patients.append({
                "patient_id": f"PT-{self.fake.unique.random_number(digits=8, fix_len=True)}",
                "demographics": {
                    "age": age,
                    "gender": random.choice(["M", "F"])
                },
                "conditions": patient_conditions,
                "location": {
                    "state": random.choice(self.target_states), 
                    "zip": self.fake.zipcode()
                },
                "utilization": {
                    "encounters_per_year": random.randint(1, 15)
                }
            })
        return patients

    def build_all(self):
        print("Initializing Synthetic Data Engine...")
        sites = self.generate_sites(100)
        patients = self.generate_patients(5000)
        print(f"Generated: {len(sites)} Sites, {len(patients)} Patients.")
        return sites, patients

# --- HELPER: Robust JSON Parser ---
def parse_llm_json(raw_text: str) -> dict:
    clean_text = raw_text.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
    return json.loads(clean_text.strip())

# =====================================================================
# FASTAPI APPLICATION & API ENDPOINTS
# =====================================================================

app = FastAPI(title="Clinical Trial Start-Up API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db_sites = []
db_patients = []

@app.on_event("startup")
def load_data():
    global db_sites, db_patients
    generator = SyntheticDataGenerator()
    db_sites, db_patients = generator.build_all()

@app.post("/protocol/parse")
async def parse_protocol(file: UploadFile = File(...)):
    try:
        if not api_key: raise HTTPException(status_code=500, detail="Gemini API Key missing.")

        pdf_reader = PyPDF2.PdfReader(file.file)
        extracted_text = "".join([page.extract_text() for page in pdf_reader.pages])
            
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        You are an expert clinical trial data extraction AI. 
        Read the following protocol text and extract the key parameters.
        DO NOT include markdown formatting like ```json. Return ONLY the raw JSON object.
        
        Required JSON structure:
        {{
            "protocol_id": "Generate a random ID like P-102",
            "nct_id": "Extract NCT ID or use 'UNKNOWN'",
            "title": "Extract full study title",
            "indication": "Extract the primary disease or condition being studied in lowercase",
            "phase": "Extract trial phase (e.g., 'Phase 3')",
            "target_enrollment": <integer of target participants>,
            "inclusion_criteria": ["criteria 1", "criteria 2"],
            "exclusion_criteria": ["criteria 1", "criteria 2"],
            "structured_criteria": {{
                "age_min": <integer or null>,
                "age_max": <integer or null>,
                "conditions_required": ["extract specific required diseases/conditions in lowercase"],
                "conditions_excluded": ["extract specific excluded diseases/conditions in lowercase"]
            }},
            "geographies": ["VA", "MD", "DC", "CA", "NY", "TX", "NC", "FL"],
            "created_at": "{datetime.now().isoformat()}"
        }}

        Protocol Text:
        {extracted_text}
        """
        
        response = model.generate_content(prompt, generation_config=genai.GenerationConfig(response_mime_type="application/json"))
        structured_data = parse_llm_json(response.text)
        
        structured_data["title"] = f"[AI Extracted: {file.filename}] " + structured_data.get("title", "Unknown Title")
        if not structured_data.get("geographies"):
             structured_data["geographies"] = ["VA", "MD", "DC", "CA", "NY", "TX", "NC", "FL"]
             
        return structured_data

    except Exception as e:
        print(f"Parsing Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/participants/filter")
async def filter_participants(req: FilterRequest):
    criteria = req.protocol.structured_criteria
    eligible_patients = []
    site_counts = {state: 0 for state in req.protocol.geographies}

    for pt in db_patients:
        pt_state = pt["location"]["state"]
        if pt_state not in req.protocol.geographies: continue
            
        age = pt["demographics"]["age"]
        if criteria.age_min and age < criteria.age_min: continue
        if criteria.age_max and age > criteria.age_max: continue
            
        pt_conditions = set([c.lower() for c in pt["conditions"]])
        req_conditions = set([c.lower() for c in criteria.conditions_required])
        excl_conditions = set([c.lower() for c in criteria.conditions_excluded])
        
        if req_conditions and not req_conditions.issubset(pt_conditions): continue
        if excl_conditions and not excl_conditions.isdisjoint(pt_conditions): continue
            
        eligible_patients.append(pt)
        if pt_state in site_counts: site_counts[pt_state] += 1

    return {
        "total_eligible": len(eligible_patients),
        "distribution_by_state": site_counts,
        "sample": eligible_patients[:5]
    }

@app.post("/sites/rank")
async def rank_sites(req: SiteRankingRequest):
    """Uses Live Gemini AI to intelligently rank sites based on protocol metadata"""
    try:
        if not api_key: raise HTTPException(status_code=500, detail="Gemini API Key missing.")
        
        # Compress the data payload to save context window and speed up the LLM response
        compressed_sites = [
            {
                "id": s["site_id"],
                "state": s["location"]["state"],
                "specialties": s["therapeutic_areas"],
                "enrollment_rate": s["metrics"]["past_enrollment_rate"],
                "pool_size": s["metrics"]["patient_pool_size"]
            } for s in db_sites
        ]

        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""
        You are an expert Clinical Feasibility AI.
        
        Protocol Target Indication: "{req.protocol.indication}"
        Target Geographies: {req.protocol.geographies}
        
        Available Sites Metadata:
        {json.dumps(compressed_sites)}
        
        Task: Analyze the Available Sites and select the top 15 optimal sites for this protocol.
        1. Heavily weight sites where their "specialties" match or are highly relevant to the "Protocol Target Indication".
        2. Give bonuses to sites located in the Target Geographies.
        3. Factor in the enrollment_rate and pool_size to break ties.
        
        DO NOT use markdown backticks. Return ONLY strict JSON in this exact structure:
        {{
            "top_sites": [
                {{
                    "site_id": "string",
                    "score": <float between 0.0 and 1.0>,
                    "breakdown": {{
                        "enrollment_rate_component": <float>,
                        "patient_availability_component": <float>,
                        "therapeutic_match_component": <float>,
                        "geography_match_component": <float>
                    }}
                }}
            ]
        }}
        """

        response = model.generate_content(prompt, generation_config=genai.GenerationConfig(response_mime_type="application/json"))
        llm_results = parse_llm_json(response.text)

        # Re-attach the LLM's scores to our rich database objects for the UI
        ranked_sites = []
        for item in llm_results.get("top_sites", []):
            site_obj = next((s for s in db_sites if s["site_id"] == item["site_id"]), None)
            if site_obj:
                site_copy = site_obj.copy()
                site_copy["metrics"]["performance_score"] = item["score"]
                ranked_sites.append({
                    "site": site_copy,
                    "score": item["score"],
                    "breakdown": item["breakdown"]
                })

        # Ensure they are sorted highest to lowest score
        ranked_sites.sort(key=lambda x: x["score"], reverse=True)
        return {"top_sites": ranked_sites}

    except Exception as e:
        print(f"AI Ranking Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/enrollment/simulate")
async def simulate_enrollment(req: SimulationRequest):
    """Uses Live Gemini AI to simulate realistic, non-linear enrollment velocity"""
    try:
        if not api_key: raise HTTPException(status_code=500, detail="Gemini API Key missing.")

        selected = [s for s in db_sites if s["site_id"] in req.selected_site_ids]
        if not selected: raise HTTPException(status_code=400, detail="No sites selected")

        target = req.protocol.target_enrollment or 100
        
        compressed_sites = [{"site_id": s["site_id"], "avg_monthly_enrollment": s["metrics"]["past_enrollment_rate"], "activation_days": s["metrics"]["activation_time_days"]} for s in selected]

        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""
        You are an AI Clinical Trial Projection Engine.
        
        Target Total Enrollment: {target}
        Selected Sites Data:
        {json.dumps(compressed_sites)}
        
        Task: Simulate a realistic month-by-month enrollment timeline.
        - Important: Look at the 'activation_days' for each site. Sites with 45+ activation days will NOT enroll anyone in Month 1.
        - Apply a "ramp-up" curve: sites enroll slower in their first active month.
        - Apply random real-world variances (e.g., occasional slow months due to holidays or staff turnover).
        - Keep generating month objects until the 'cumulative_enrolled' meets or slightly exceeds the Target Total Enrollment.
        - Cap at 60 months maximum.
        
        DO NOT use markdown backticks. Return ONLY strict JSON in this exact structure:
        {{
            "estimated_completion_month": <integer>,
            "timeline": [
                {{
                    "month": <integer>,
                    "monthly_enrolled": <integer>,
                    "cumulative_enrolled": <integer>
                }}
            ]
        }}
        """

        response = model.generate_content(prompt, generation_config=genai.GenerationConfig(response_mime_type="application/json"))
        llm_timeline = parse_llm_json(response.text)

        return {
            "protocol_id": req.protocol.protocol_id,
            "estimated_completion_month": llm_timeline.get("estimated_completion_month", 0),
            "total_sites_active": len(selected),
            "timeline": llm_timeline.get("timeline", [])
        }

    except Exception as e:
        print(f"AI Simulation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/generate")
async def generate_document(req: DocGenerationRequest):
    selected = [s for s in db_sites if s["site_id"] in req.selected_site_ids]
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for site in selected:
            if "FDA_1572" in req.doc_types:
                doc = Document()
                doc.add_heading('FDA Form 1572', 0)
                doc.add_paragraph(f"NCT ID: {req.protocol.nct_id}")
                doc.add_paragraph(f"Indication: {req.protocol.indication.title()}")
                doc.add_paragraph(f"Site: {site['name']} (NPI: {site['npi']})")
                f = io.BytesIO()
                doc.save(f)
                zip_file.writestr(f"FDA_1572_{site['npi']}.docx", f.getvalue())
                
            if "CDA" in req.doc_types:
                doc = Document()
                doc.add_heading('CDA', 0)
                doc.add_paragraph(f"Agreement between Sponsor and {site['name']}.")
                f = io.BytesIO()
                doc.save(f)
                zip_file.writestr(f"CDA_{site['npi']}.docx", f.getvalue())
                
            if "PROTOCOL_SIGNATURE" in req.doc_types:
                doc = Document()
                doc.add_heading('Protocol Signature Page', 0)
                doc.add_paragraph(f"Protocol: {req.protocol.title}")
                f = io.BytesIO()
                doc.save(f)
                zip_file.writestr(f"Signature_{site['npi']}.docx", f.getvalue())

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=Docs_{req.protocol.protocol_id}.zip"}
    )