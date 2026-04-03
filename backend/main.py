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

# =====================================================================
# STEP 1: CANONICAL SCHEMAS (Pydantic Data Models)
# 100% Adherence to Unified Data Model & Mock Schema Anchors
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
# Handles Steps 2, 3, and 4 of the Synthetic Data Generation Plan
# =====================================================================

class SyntheticDataGenerator:
    def __init__(self):
        self.fake = Faker()
        # Establish Relationships: Locked set of geographies to GUARANTEE overlap
        self.target_states = ["VA", "MD", "DC", "CA", "NY", "TX", "NC", "FL"]
        self.conditions = ["hypertension", "type 2 diabetes", "heart failure", "nsclc", "asthma", "stroke"]
        self.therapeutic_areas = ["cardiology", "endocrinology", "oncology", "pulmonology", "neurology"]
        self.org_types = ["hospital", "clinic", "academic medical center", "private practice"]

    def generate_protocols(self) -> List[dict]:
        """Generates realistic protocols based on ClinicalTrials.gov structure"""
        return [
            {
                "protocol_id": "P-001",
                "nct_id": "NCT12345678",
                "title": "Efficacy of Novel Inhibitor in Hypertension",
                "indication": "hypertension",
                "phase": "Phase 3",
                "target_enrollment": 300,
                "inclusion_criteria": ["Age 50-75", "Diagnosis of hypertension"],
                "exclusion_criteria": ["History of stroke"],
                "structured_criteria": {
                    "age_min": 50,
                    "age_max": 75,
                    "conditions_required": ["hypertension"],
                    "conditions_excluded": ["stroke"]
                },
                "geographies": ["VA", "MD", "DC", "NY"],
                "created_at": datetime.now().isoformat()
            }
        ]

    def generate_sites(self, num_records=100) -> List[dict]:
        """Generates 100 Sites based on NPI/CMS structure with Behavioral Realism"""
        sites = []
        for _ in range(num_records):
            # Behavioral Realism (High vs Low performing sites)
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
        """Generates 5000 Patients based on Sentinel CDM structure"""
        patients = []
        for _ in range(num_records):
            age = int(random.gauss(60, 15))
            age = max(18, min(age, 90))
            
            # Pre-seed condition prevalence to ensure eligibility matching
            patient_conditions = []
            rand_val = random.random()
            if rand_val < 0.30: patient_conditions.append("hypertension")
            if rand_val < 0.15: patient_conditions.append("type 2 diabetes")
            if 0.40 < rand_val < 0.45: patient_conditions.append("nsclc")
            
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
        protocols = self.generate_protocols()
        sites = self.generate_sites(100)
        patients = self.generate_patients(5000)
        print(f"Generated: {len(protocols)} Protocols, {len(sites)} Sites, {len(patients)} Patients.")
        return protocols, sites, patients


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

# In-Memory Database
db_protocols = []
db_sites = []
db_patients = []

@app.on_event("startup")
def load_data():
    global db_protocols, db_sites, db_patients
    generator = SyntheticDataGenerator()
    db_protocols, db_sites, db_patients = generator.build_all()

@app.post("/protocol/parse")
async def parse_protocol(file: UploadFile = File(...)):
    """Reads uploaded PDF, extracts text, and simulates AI extraction to structured JSON"""
    try:
        pdf_reader = PyPDF2.PdfReader(file.file)
        extracted_text = ""
        for page in pdf_reader.pages:
            extracted_text += page.extract_text()
            
        # Mocking LLM extraction for MVP. In production, pass `extracted_text` to LLM.
        mock_response = db_protocols[0].copy()
        mock_response["title"] = f"[{file.filename}] " + mock_response["title"]
        return mock_response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing PDF: {str(e)}")

@app.post("/participants/filter")
async def filter_participants(req: FilterRequest):
    """Filters the 5000 Sentinel patients based on MedAlign-inspired structured criteria"""
    criteria = req.protocol.structured_criteria
    eligible_patients = []
    site_counts = {state: 0 for state in req.protocol.geographies}

    for pt in db_patients:
        pt_state = pt["location"]["state"]
        if pt_state not in req.protocol.geographies:
            continue
            
        age = pt["demographics"]["age"]
        if criteria.age_min and age < criteria.age_min: continue
        if criteria.age_max and age > criteria.age_max: continue
            
        pt_conditions = set(pt["conditions"])
        req_conditions = set(criteria.conditions_required)
        excl_conditions = set(criteria.conditions_excluded)
        
        if req_conditions and not req_conditions.issubset(pt_conditions): continue
        if excl_conditions and not excl_conditions.isdisjoint(pt_conditions): continue
            
        eligible_patients.append(pt)
        if pt_state in site_counts:
            site_counts[pt_state] += 1

    return {
        "total_eligible": len(eligible_patients),
        "distribution_by_state": site_counts,
        "sample": eligible_patients[:5]
    }

@app.post("/sites/rank")
async def rank_sites(req: SiteRankingRequest):
    """Scores sites based on historical performance, patient availability, and therapeutic match"""
    protocol = req.protocol
    ranked_sites = []
    
    MAX_ENROLL_RATE = 20.0
    MAX_POOL = 8000.0

    for site in db_sites:
        geo_score = 1.0 if site["location"]["state"] in protocol.geographies else 0.0
        thera_score = 1.0 if protocol.indication in site["therapeutic_areas"] else 0.0
        enroll_score = min(site["metrics"]["past_enrollment_rate"] / MAX_ENROLL_RATE, 1.0)
        pool_score = min(site["metrics"]["patient_pool_size"] / MAX_POOL, 1.0)
        
        total_score = (0.4 * enroll_score) + (0.3 * pool_score) + (0.2 * thera_score) + (0.1 * geo_score)
        
        site_copy = site.copy()
        site_copy["metrics"]["performance_score"] = round(total_score, 3)
        
        ranked_sites.append({
            "site": site_copy,
            "score": round(total_score, 3),
            "breakdown": {
                "enrollment_rate_component": round(enroll_score * 0.4, 3),
                "patient_availability_component": round(pool_score * 0.3, 3),
                "therapeutic_match_component": round(thera_score * 0.2, 3),
                "geography_match_component": round(geo_score * 0.1, 3)
            }
        })
        
    ranked_sites.sort(key=lambda x: x["score"], reverse=True)
    return {"top_sites": ranked_sites[:15]}

@app.post("/enrollment/simulate")
async def simulate_enrollment(req: SimulationRequest):
    """Simulates enrollment velocity over time based on CMS patterns and synthetic assumptions"""
    selected = [s for s in db_sites if s["site_id"] in req.selected_site_ids]
    if not selected:
        raise HTTPException(status_code=400, detail="No valid sites selected")

    timeline = []
    cumulative = 0
    month = 1
    
    while cumulative < req.protocol.target_enrollment and month <= 60:
        monthly_total = 0
        for site in selected:
            base_rate = site["metrics"]["past_enrollment_rate"]
            # Inject ±20% fluctuation per site, per month (CMS Pattern Simulation)
            variance = random.uniform(0.80, 1.20) 
            monthly_total += int(base_rate * variance)
            
        cumulative += monthly_total
        if cumulative > req.protocol.target_enrollment:
            cumulative = req.protocol.target_enrollment
            
        timeline.append({
            "month": month, 
            "monthly_enrolled": monthly_total,
            "cumulative_enrolled": cumulative
        })
        month += 1

    return {
        "protocol_id": req.protocol.protocol_id,
        "estimated_completion_month": month - 1,
        "total_sites_active": len(selected),
        "timeline": timeline
    }

@app.post("/documents/generate")
async def generate_document(req: DocGenerationRequest):
    """Generates selected synthetic documents and returns them as a ZIP archive"""
    selected = [s for s in db_sites if s["site_id"] in req.selected_site_ids]
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for site in selected:
            
            if "FDA_1572" in req.doc_types:
                doc = Document()
                doc.add_heading('FDA Form 1572 - Statement of Investigator', 0)
                doc.add_paragraph(f"NCT ID: {req.protocol.nct_id}")
                doc.add_paragraph(f"Indication: {req.protocol.indication.title()}")
                doc.add_paragraph(f"Site: {site['name']} (NPI: {site['npi']})")
                doc.add_paragraph(f"Organization Type: {site['organization_type'].title()}")
                doc.add_paragraph(f"Address: {site['location']['city']}, {site['location']['state']} {site['location']['zip']}")
                f = io.BytesIO()
                doc.save(f)
                zip_file.writestr(f"FDA_1572_{site['npi']}.docx", f.getvalue())
                
            if "CDA" in req.doc_types:
                doc = Document()
                doc.add_heading('Confidential Disclosure Agreement (CDA)', 0)
                doc.add_paragraph(f"This agreement is between the Sponsor and {site['name']}.")
                doc.add_paragraph(f"Regarding Protocol: {req.protocol.title}")
                doc.add_paragraph(f"Date Generated: {datetime.now().strftime('%Y-%m-%d')}")
                f = io.BytesIO()
                doc.save(f)
                zip_file.writestr(f"CDA_{site['npi']}.docx", f.getvalue())
                
            if "PROTOCOL_SIGNATURE" in req.doc_types:
                doc = Document()
                doc.add_heading('Protocol Signature Page', 0)
                doc.add_paragraph(f"Protocol: {req.protocol.title}")
                doc.add_paragraph("I agree to conduct the study in compliance with the protocol.")
                doc.add_paragraph("Investigator Signature: _________________________")
                doc.add_paragraph("Date: _________________________")
                f = io.BytesIO()
                doc.save(f)
                zip_file.writestr(f"Signature_Page_{site['npi']}.docx", f.getvalue())

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=Activation_Docs_{req.protocol.protocol_id}.zip"}
    )