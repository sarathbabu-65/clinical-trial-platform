import os
from fpdf import FPDF

def create_protocol_pdf(filename, nct_id, title, indication, phase, target):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="Clinical Trial Protocol", ln=True, align='C')
    
    pdf.set_font("Arial", size=12)
    pdf.ln(10)
    pdf.cell(200, 10, txt=f"NCT ID: {nct_id}", ln=True)
    pdf.cell(200, 10, txt=f"Study Title: {title}", ln=True)
    pdf.cell(200, 10, txt=f"Indication: {indication}", ln=True)
    pdf.cell(200, 10, txt=f"Phase: {phase}", ln=True)
    pdf.cell(200, 10, txt=f"Target Enrollment: {target} participants", ln=True)
    
    pdf.ln(10)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="Inclusion Criteria:", ln=True)
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, txt="- Age 18 or older\n- Confirmed diagnosis matching indication\n- Able to provide informed consent")

    pdf.ln(5)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="Exclusion Criteria:", ln=True)
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, txt="- Pregnant or nursing\n- History of severe allergic reactions\n- Currently enrolled in another trial")

    pdf.output(filename)

os.makedirs("mock_protocols", exist_ok=True)

trials = [
    ("NCT00000001", "Efficacy of Novel Inhibitor in Hypertension", "Hypertension", "Phase 3", 300),
    ("NCT00000002", "Immunotherapy in Non-Small Cell Lung Cancer", "NSCLC", "Phase 2", 150),
    ("NCT00000003", "Safety of Metformin Adjunct in Type 2 Diabetes", "Type 2 Diabetes", "Phase 4", 500),
    ("NCT00000004", "Next-Gen Beta Blockers for Heart Failure", "Heart Failure", "Phase 3", 450),
    ("NCT00000005", "Inhaled Corticosteroids in Severe Asthma", "Asthma", "Phase 2", 200)
]

for i, trial in enumerate(trials, 1):
    create_protocol_pdf(f"mock_protocols/Protocol_Sample_{i}.pdf", *trial)

print("Successfully generated 5 PDF protocols in the 'mock_protocols' directory.")