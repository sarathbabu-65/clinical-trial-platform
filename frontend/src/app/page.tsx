"use client";
import React, { useState } from "react";

export default function Home() {
  const [activeView, setActiveView] = useState("protocol");
  
  // App State
  const [protocol, setProtocol] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  // UI State
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [docTypes, setDocTypes] = useState<string[]>(["FDA_1572"]);

  const API_BASE = "http://localhost:8000";

  // --- HELPER: Toggle Site Selection ---
  const toggleSite = (id: string) => {
    setSelectedSites(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // --- API CALL: Upload & Parse PDF ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/protocol/parse`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Failed to parse protocol");
      
      const data = await res.json();
      setProtocol(data);
      setActiveView("sites"); // Auto-advance to the next step
    } catch (error) {
      console.error(error);
      alert("Error parsing PDF. Is the backend running?");
    } finally {
      setUploading(false);
    }
  };

  // --- API CALL: Rank Sites ---
  const handleRank = async () => {
    try {
      const res = await fetch(`${API_BASE}/sites/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol })
      });
      const data = await res.json();
      setSites(data.top_sites);
    } catch (error) {
      console.error(error);
      alert("Error ranking sites.");
    }
  };

  // --- API CALL: Simulate ---
  const handleSimulate = async () => {
    try {
      const res = await fetch(`${API_BASE}/enrollment/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol, selected_site_ids: selectedSites })
      });
      const data = await res.json();
      setSimulation(data);
    } catch (error) {
      console.error(error);
      alert("Error running simulation.");
    }
  };

  // --- API CALL: Download Docs ---
  const handleDownload = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol, selected_site_ids: selectedSites, doc_types: docTypes })
      });
      
      if (!res.ok) throw new Error("Failed to generate documents");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Activation_Docs.zip`;
      a.click();
    } catch (error) {
      console.error(error);
      alert("Error generating documents.");
    }
  };

  // --- NAVIGATION MAP ---
  const navItems = [
    { id: "protocol", label: "1. Protocol Setup", disabled: false },
    { id: "sites", label: "2. Site Selection", disabled: !protocol },
    { id: "simulation", label: "3. Simulation", disabled: selectedSites.length === 0 },
    { id: "documents", label: "4. Activation Docs", disabled: !simulation },
    { id: "api", label: "Developer API", disabled: false },
  ];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r shadow-sm p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-900 mb-8 leading-tight">Study Start-Up<br/><span className="text-sm font-normal text-gray-500">Acceleration Platform</span></h1>
          <nav className="space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setActiveView(item.id)}
                className={`w-full text-left px-4 py-3 rounded transition-colors ${
                  activeView === item.id 
                    ? "bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600" 
                    : item.disabled 
                      ? "text-gray-400 cursor-not-allowed" 
                      : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* VIEW 1: PROTOCOL UPLOAD */}
        {activeView === "protocol" && (
          <div className="max-w-4xl bg-white p-8 rounded shadow-sm border-t-4 border-blue-600">
            <h2 className="text-2xl font-semibold mb-2">Protocol Intelligence</h2>
            <p className="text-gray-600 mb-8">Upload a PDF protocol to automatically extract structured criteria.</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50 hover:bg-gray-100 transition">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleFileUpload} 
                className="hidden" 
                id="file-upload" 
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="bg-blue-600 text-white px-6 py-3 rounded font-medium shadow hover:bg-blue-700">
                  {uploading ? "Parsing PDF..." : "Browse PDF Files"}
                </span>
              </label>
            </div>

            {protocol && (
              <div className="mt-8">
                <h3 className="font-bold text-green-700 mb-2 border-b pb-2">✓ Successfully Extracted</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Title:</strong> {protocol.title}</div>
                  <div><strong>Indication:</strong> {protocol.indication}</div>
                  <div><strong>Target:</strong> {protocol.target_enrollment} participants</div>
                  <div><strong>Phase:</strong> {protocol.phase}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SITE SELECTION */}
        {activeView === "sites" && (
          <div className="max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold">AI Site Selection Engine</h2>
                <p className="text-gray-600">Dynamic ranking based on CMS/NPI metrics.</p>
              </div>
              <button onClick={handleRank} className="bg-indigo-600 text-white px-6 py-2 rounded font-medium shadow hover:bg-indigo-700">
                Run Ranking Engine
              </button>
            </div>

            {sites.length > 0 && (
              <div className="bg-white rounded shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4 w-12"></th>
                      <th className="p-4">Site Name</th>
                      <th className="p-4">Org Type</th>
                      <th className="p-4">State</th>
                      <th className="p-4">AI Score</th>
                      <th className="p-4">Velocity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((s) => (
                      <React.Fragment key={s.site.site_id}>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <input type="checkbox" className="w-4 h-4 cursor-pointer"
                              checked={selectedSites.includes(s.site.site_id)}
                              onChange={() => {
                                toggleSite(s.site.site_id);
                                if (!selectedSites.includes(s.site.site_id)) setExpandedSite(s.site.site_id);
                              }} 
                            />
                          </td>
                          <td className="p-4 font-medium text-blue-800 cursor-pointer" onClick={() => setExpandedSite(expandedSite === s.site.site_id ? null : s.site.site_id)}>
                            {s.site.name} <span className="text-xs text-gray-400 ml-2">(Click to expand)</span>
                          </td>
                          <td className="p-4 capitalize">{s.site.organization_type}</td>
                          <td className="p-4">{s.site.location.state}</td>
                          <td className="p-4 font-bold text-green-600">{(s.score * 100).toFixed(0)}%</td>
                          <td className="p-4">{s.site.metrics.past_enrollment_rate}/mo</td>
                        </tr>
                        
                        {/* EXPANDABLE EXPLAINABILITY UI */}
                        {expandedSite === s.site.site_id && (
                          <tr className="bg-indigo-50 border-b">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-2 gap-8 text-sm">
                                <div>
                                  <h4 className="font-bold text-indigo-900 mb-2 uppercase text-xs tracking-wider">Score Explainability Breakdown</h4>
                                  <ul className="space-y-1 text-gray-700 list-disc list-inside">
                                    <li><strong>Historical Enrollment (40%):</strong> Site scored {(s.breakdown.enrollment_rate_component * 100).toFixed(1)}% due to their {s.site.metrics.past_enrollment_rate}/mo velocity.</li>
                                    <li><strong>Patient Availability (30%):</strong> Site scored {(s.breakdown.patient_availability_component * 100).toFixed(1)}% based on a local pool of {s.site.metrics.patient_pool_size}.</li>
                                    <li><strong>Therapeutic Match (20%):</strong> Site scored {(s.breakdown.therapeutic_match_component * 100).toFixed(1)}% for overlapping specialties.</li>
                                    <li><strong>Geographic Match (10%):</strong> Site scored {(s.breakdown.geography_match_component * 100).toFixed(1)}% for operating in {s.site.location.state}.</li>
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-bold text-indigo-900 mb-2 uppercase text-xs tracking-wider">Site Capabilities & Metadata</h4>
                                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                                    <p><strong>NPI:</strong> {s.site.npi}</p>
                                    <p><strong>Specialty:</strong> {s.site.specialty}</p>
                                    <p><strong>Staff Count:</strong> {s.site.capabilities.staff_count}</p>
                                    <p><strong>Avg Activation:</strong> {s.site.metrics.activation_time_days} days</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SIMULATION */}
        {activeView === "simulation" && (
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold mb-2">Enrollment Simulation</h2>
            
            {/* EXPLAINABILITY BOX */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-sm text-blue-800 shadow-sm">
              <strong>Understanding the Model:</strong> This simulation applies real-world CMS behavioral patterns. Instead of assuming a flat enrollment rate, the engine injects a ±20% fluctuation per site, per month, to account for real-world variables like staff turnover, holidays, and competitive trial saturation.
            </div>

            <button onClick={handleSimulate} className="bg-emerald-600 text-white px-6 py-2 rounded font-medium shadow hover:bg-emerald-700 mb-8 transition">
              Run CMS-Pattern Simulation
            </button>

            {simulation && (
              <div className="bg-white p-6 rounded shadow-sm border">
                <div className="flex gap-12 mb-8">
                  <div>
                    <p className="text-sm text-gray-500 uppercase font-bold">Time to Target</p>
                    <p className="text-4xl font-black text-emerald-600">{simulation.estimated_completion_month} <span className="text-lg font-normal">Months</span></p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase font-bold">Active Sites</p>
                    <p className="text-4xl font-black text-emerald-600">{simulation.total_sites_active}</p>
                  </div>
                </div>
                
                <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Cumulative Timeline</h4>
                <div className="flex gap-2 overflow-x-auto pb-4">
                  {simulation.timeline.map((t: any) => (
                    <div key={t.month} className="bg-gray-50 p-4 rounded text-center min-w-[120px] border border-gray-200">
                      <div className="text-xs text-gray-500 font-bold uppercase mb-1">Month {t.month}</div>
                      <div className="text-2xl font-black text-gray-800">{t.cumulative_enrolled}</div>
                      <div className="text-xs text-emerald-600 mt-1 font-medium">+{t.monthly_enrolled} this mo.</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: DOCUMENTS */}
        {activeView === "documents" && (
          <div className="max-w-3xl bg-white p-8 rounded shadow-sm border-t-4 border-purple-600">
            <h2 className="text-2xl font-semibold mb-4">Activation Workflow Automation</h2>
            <p className="text-gray-600 mb-8">Select the required regulatory and operational documents. The system will automatically populate them using the extracted protocol parameters and site metadata.</p>
            
            <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded border">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" 
                  checked={docTypes.includes("FDA_1572")} 
                  onChange={(e) => setDocTypes(prev => e.target.checked ? [...prev, "FDA_1572"] : prev.filter(d => d !== "FDA_1572"))} 
                />
                <span className="font-medium">FDA Form 1572 (Statement of Investigator)</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" 
                  checked={docTypes.includes("CDA")} 
                  onChange={(e) => setDocTypes(prev => e.target.checked ? [...prev, "CDA"] : prev.filter(d => d !== "CDA"))} 
                />
                <span className="font-medium">Confidential Disclosure Agreement (CDA)</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" 
                  checked={docTypes.includes("PROTOCOL_SIGNATURE")} 
                  onChange={(e) => setDocTypes(prev => e.target.checked ? [...prev, "PROTOCOL_SIGNATURE"] : prev.filter(d => d !== "PROTOCOL_SIGNATURE"))} 
                />
                <span className="font-medium">Protocol Signature Page</span>
              </label>
            </div>

            <button 
              onClick={handleDownload} 
              disabled={docTypes.length === 0} 
              className="w-full bg-purple-600 disabled:bg-gray-400 text-white px-6 py-4 rounded font-bold hover:bg-purple-700 transition shadow"
            >
              Generate & Download Documents (.zip)
            </button>
          </div>
        )}

        {/* VIEW 5: API DOCS */}
        {activeView === "api" && (
           <div className="h-full">
            <h2 className="text-2xl font-semibold mb-4">Developer API Documentation</h2>
            <p className="text-gray-600 mb-4">Powered by FastAPI. You can test endpoints interactively below.</p>
            <iframe src={`${API_BASE}/docs`} className="w-full h-[80%] bg-white rounded shadow border-0" />
           </div>
        )}

      </main>
    </div>
  );
}