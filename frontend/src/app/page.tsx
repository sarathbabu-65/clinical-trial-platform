"use client";
import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [activeView, setActiveView] = useState("protocol");
  
  // App State
  const [protocol, setProtocol] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [patientDistribution, setPatientDistribution] = useState<Record<string, number>>({});
  const [simulation, setSimulation] = useState<any>(null);
  
  // Loading & Error States
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isRanking, setIsRanking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // UI State
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [docTypes, setDocTypes] = useState<string[]>(["FDA_1572"]);

  // LOCKED PRODUCTION API URL
  const API_BASE = "https://clinical-trial-api-j45u.onrender.com";

  // --- MAP CONFIGURATION ---
  const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
  const stateNames: Record<string, string> = {
    "CA": "California", "NY": "New York", "TX": "Texas", "FL": "Florida",
    "VA": "Virginia", "MD": "Maryland", "NC": "North Carolina", "DC": "District of Columbia"
  };
  const stateCoords: Record<string, [number, number]> = {
    "CA": [-119.4179, 36.7783], "NY": [-75.5060, 42.7128], "TX": [-99.9018, 31.9686],
    "FL": [-81.5158, 27.6648], "VA": [-78.6569, 37.4316], "MD": [-76.6413, 39.0458],
    "NC": [-79.0193, 35.7596], "DC": [-77.0369, 38.9072]
  };

  const navItems = [
    { id: "protocol", label: "1. Protocol Setup", disabled: false },
    { id: "sites", label: "2. Site Selection", disabled: !protocol },
    { id: "simulation", label: "3. Simulation", disabled: selectedSites.length === 0 },
    { id: "documents", label: "4. Activation Docs", disabled: !simulation },
    { id: "api", label: "Developer API", disabled: false },
  ];

  const navigate = (direction: 'next' | 'back') => {
    const currentIndex = navItems.findIndex(i => i.id === activeView);
    if (direction === 'next' && currentIndex < navItems.length - 2) {
      setActiveView(navItems[currentIndex + 1].id);
    } else if (direction === 'back' && currentIndex > 0) {
      setActiveView(navItems[currentIndex - 1].id);
    }
  };

  const toggleSite = (id: string) => {
    setSelectedSites(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/protocol/parse`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Connection failed. Is the backend running?");
      
      const data = await res.json();
      if (!data.title || data.title.includes("UNKNOWN") || !data.indication) {
        throw new Error("No protocol data found. Please ensure the uploaded file is a valid clinical trial protocol.");
      }

      setProtocol(data);
    } catch (error: any) {
      setUploadError(error.message || "An error occurred while parsing the document.");
    } finally {
      setUploading(false);
    }
  };

  const handleRank = async () => {
    setIsRanking(true);
    try {
      const resSites = await fetch(`${API_BASE}/sites/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol })
      });
      const dataSites = await resSites.json();
      setSites(dataSites.top_sites);

      const resPatients = await fetch(`${API_BASE}/participants/filter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol })
      });
      const dataPatients = await resPatients.json();
      setPatientDistribution(dataPatients.distribution_by_state || {});

    } catch (error) {
      alert("Error ranking sites and fetching patient data.");
    } finally {
      setIsRanking(false);
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/enrollment/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol, selected_site_ids: selectedSites })
      });
      const data = await res.json();
      setSimulation(data);
    } catch (error) {
      alert("Error running simulation.");
    } finally {
      setIsSimulating(false);
    }
  };

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
      alert("Error generating documents.");
    }
  };

  if (!mounted) return null;

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
              <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="bg-blue-600 text-white px-6 py-3 rounded font-medium shadow hover:bg-blue-700 transition">
                  {uploading ? "Analyzing via Groq AI..." : "Browse PDF Files"}
                </span>
              </label>
            </div>

            {uploadError && (
              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
                <strong>Upload Failed: </strong> {uploadError}
              </div>
            )}

            {protocol && !uploadError && (
              <div className="mt-8 bg-green-50 p-6 rounded border border-green-200">
                <h3 className="font-bold text-green-800 mb-4 border-b border-green-200 pb-2">✓ Successfully Extracted Data</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-green-900">
                  <div><strong>Title:</strong> {protocol.title}</div>
                  <div><strong>Indication:</strong> {protocol.indication}</div>
                  <div><strong>Target:</strong> {protocol.target_enrollment} participants</div>
                  <div><strong>Phase:</strong> {protocol.phase}</div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={() => navigate('next')} className="bg-green-700 text-white px-6 py-2 rounded font-medium shadow hover:bg-green-800 transition">
                        Proceed to Site Selection →
                    </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SITE SELECTION & FEASIBILITY MAP */}
        {activeView === "sites" && (
          <div className="max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold">AI Site Selection & Feasibility</h2>
                <p className="text-gray-600">Map eligible patient density and rank site infrastructure.</p>
              </div>
              <button 
                onClick={handleRank} 
                disabled={isRanking}
                className="bg-indigo-600 disabled:bg-indigo-400 text-white px-6 py-2 rounded font-medium shadow hover:bg-indigo-700 transition flex items-center"
              >
                {isRanking ? "Processing..." : "Run Feasibility Engine"}
              </button>
            </div>

            {/* LOADING STATE UI */}
            {isRanking ? (
              <div className="bg-white rounded shadow-sm border p-16 flex flex-col items-center justify-center text-center">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500 mb-6"></div>
                 <h3 className="text-xl font-bold text-orange-900 mb-2">Groq LPU Engine Processing</h3>
                 <p className="text-gray-500 max-w-md">Llama 3.3 70B is cross-referencing protocol indication <strong>"{protocol?.indication || 'the indication'}"</strong> against site therapeutic metadata and querying the synthetic patient database...</p>
              </div>
            ) : sites.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="col-span-2 bg-white rounded shadow-sm border p-4 flex flex-col items-center">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 w-full text-left">Patient Density Heatmap</h3>
                    <div className="w-full flex justify-center items-center overflow-hidden bg-white">
                      <ComposableMap projection="geoAlbersUsa" width={800} height={450} style={{ width: "100%", height: "auto", maxHeight: "400px" }}>
                        <Geographies geography={geoUrl}>
                          {({ geographies }) =>
                            geographies.map((geo) => {
                              const stateName = geo.properties.name;
                              const stateAbbr = Object.keys(stateNames).find(key => stateNames[key] === stateName);
                              const patientCount = stateAbbr ? (patientDistribution[stateAbbr] || 0) : 0;
                              const maxPatients = Math.max(...Object.values(patientDistribution), 1);
                              
                              const opacity = patientCount > 0 ? 0.2 + (0.8 * (patientCount / maxPatients)) : 0;
                              const fill = patientCount > 0 ? `rgba(79, 70, 229, ${opacity})` : "#F3F4F6";

                              return <Geography key={geo.rsmKey} geography={geo} fill={fill} stroke="#D1D5DB" strokeWidth={0.5} />;
                            })
                          }
                        </Geographies>
                        
                        {selectedSites.map(siteId => {
                           const site = sites.find(s => s.site.site_id === siteId)?.site;
                           if (!site || !stateCoords[site.location.state]) return null;
                           const jitterX = (Math.random() - 0.5) * 2.0;
                           const jitterY = (Math.random() - 0.5) * 2.0;
                           return (
                             <Marker key={siteId} coordinates={[stateCoords[site.location.state][0] + jitterX, stateCoords[site.location.state][1] + jitterY]}>
                               <circle r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5} />
                             </Marker>
                           );
                        })}
                      </ComposableMap>
                    </div>
                  </div>
                  <div className="col-span-1 bg-white rounded shadow-sm border p-6 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Feasibility Stats</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-3xl font-black text-indigo-600">{Object.values(patientDistribution).reduce((a, b) => a + b, 0)}</p>
                            <p className="text-sm text-gray-600">Total Eligible Patients</p>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-red-500">{selectedSites.length}</p>
                            <p className="text-sm text-gray-600">Selected Sites</p>
                        </div>
                    </div>
                  </div>
                </div>

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
                          <tr className="border-b hover:bg-gray-50 transition">
                            <td className="p-4">
                              <input type="checkbox" className="w-4 h-4 cursor-pointer text-indigo-600"
                                checked={selectedSites.includes(s.site.site_id)}
                                onChange={() => toggleSite(s.site.site_id)} 
                              />
                            </td>
                            <td className="p-4 font-medium text-blue-800 cursor-pointer" onClick={() => setExpandedSite(expandedSite === s.site.site_id ? null : s.site.site_id)}>
                              {s.site.name} <span className="text-xs text-gray-400 ml-2">(Click details)</span>
                            </td>
                            <td className="p-4 capitalize">{s.site.organization_type}</td>
                            <td className="p-4">{s.site.location.state}</td>
                            <td className="p-4 font-bold text-green-600">{(s.score * 100).toFixed(0)}%</td>
                            <td className="p-4">{s.site.metrics.past_enrollment_rate}/mo</td>
                          </tr>
                          
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

                <div className="mt-8 flex justify-between pt-6">
                    <button onClick={() => navigate('back')} className="text-gray-500 hover:text-gray-800 font-medium">← Back to Protocol</button>
                    <button disabled={selectedSites.length === 0} onClick={() => navigate('next')} className="bg-indigo-600 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium shadow hover:bg-indigo-700 transition">
                        Proceed to Simulation →
                    </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 3: SIMULATION */}
        {activeView === "simulation" && (
          <div className="max-w-5xl">
            <h2 className="text-2xl font-semibold mb-2">Enrollment Simulation</h2>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-sm text-blue-800 shadow-sm">
              <strong>Understanding the Model:</strong> This simulation feeds the selected site metadata directly into Groq LPU to predict non-linear ramp-up times and behavioral enrollment drops.
            </div>

            <button 
              onClick={handleSimulate} 
              disabled={isSimulating}
              className="bg-emerald-600 disabled:bg-emerald-400 text-white px-6 py-2 rounded font-medium shadow hover:bg-emerald-700 mb-8 transition flex items-center"
            >
              {isSimulating ? "Simulating Timeline..." : "Run CMS-Pattern Simulation"}
            </button>

            {/* LOADING STATE UI */}
            {isSimulating ? (
              <div className="bg-white rounded shadow-sm border p-16 flex flex-col items-center justify-center text-center">
                 <div className="animate-pulse rounded-full h-12 w-12 bg-orange-500 mb-6"></div>
                 <h3 className="text-xl font-bold text-orange-900 mb-2">Generating Predictive Timeline</h3>
                 <p className="text-gray-500 max-w-md">Llama 3.3 70B is factoring in site activation delays, non-linear enrollment ramp-up, and localized real-world friction...</p>
              </div>
            ) : simulation && (
              <div className="bg-white p-6 rounded shadow-sm border">
                <div className="flex gap-12 mb-8">
                  <div>
                    <p className="text-sm text-gray-500 uppercase font-bold">Time to Target</p>
                    <p className="text-4xl font-black text-emerald-600">{simulation.estimated_completion_month} <span className="text-lg font-normal">Months</span></p>
                  </div>
                </div>
                
                <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Cumulative Timeline Projection</h4>
                <div className="flex gap-2 overflow-x-auto pb-4">
                  {simulation.timeline?.map((t: any) => (
                    <div key={t.month} className="bg-gray-50 p-4 rounded text-center min-w-[120px] border border-gray-200 shadow-sm">
                      <div className="text-xs text-gray-500 font-bold uppercase mb-1">Month {t.month}</div>
                      <div className="text-2xl font-black text-gray-800">{t.cumulative_enrolled}</div>
                      <div className="text-xs text-emerald-600 mt-1 font-medium">+{t.monthly_enrolled} new</div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-between border-t pt-6">
                    <button onClick={() => navigate('back')} className="text-gray-500 hover:text-gray-800 font-medium">← Back to Sites</button>
                    <button onClick={() => navigate('next')} className="bg-emerald-600 text-white px-6 py-2 rounded font-medium shadow hover:bg-emerald-700 transition">
                        Proceed to Documents →
                    </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: DOCUMENTS */}
        {activeView === "documents" && (
          <div className="max-w-3xl bg-white p-8 rounded shadow-sm border-t-4 border-purple-600">
            <h2 className="text-2xl font-semibold mb-4">Activation Workflow Automation</h2>
            <p className="text-gray-600 mb-8">Generate finalized artifacts bundled in a .zip archive.</p>
            
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

            <button onClick={handleDownload} disabled={docTypes.length === 0} className="w-full bg-purple-600 disabled:bg-gray-400 text-white px-6 py-4 rounded font-bold hover:bg-purple-700 transition shadow">
              Generate & Download Documents (.zip)
            </button>

            <div className="mt-8 flex justify-between pt-6 border-t">
                <button onClick={() => navigate('back')} className="text-gray-500 hover:text-gray-800 font-medium">← Back to Simulation</button>
            </div>
          </div>
        )}

        {/* VIEW 5: DEVELOPER API */}
        {activeView === "api" && (
          <div className="max-w-4xl bg-white p-8 rounded shadow-sm border-t-4 border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Developer API Documentation</h2>
                <p className="text-gray-600">Integrate clinical trial start-up capabilities directly into your existing infrastructure.</p>
              </div>
              <a 
                href={`${API_BASE}/docs`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-gray-800 text-white px-6 py-2 rounded font-medium shadow hover:bg-gray-900 transition flex items-center"
              >
                Open Interactive Swagger UI ↗
              </a>
            </div>

            <div className="bg-gray-50 border rounded-lg p-6 mb-8 font-mono text-sm text-gray-800">
              <h3 className="text-gray-500 uppercase font-bold tracking-wider mb-4 text-xs">Production Base URL</h3>
              <p className="bg-gray-200 p-2 rounded inline-block">{API_BASE}</p>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-4">Core Endpoints</h3>
            <div className="space-y-6">
              
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                  <h4 className="font-bold text-gray-800 flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-3 font-black">POST</span>
                    /protocol/parse
                  </h4>
                  <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border">Llama 3.3 Engine</span>
                </div>
                <div className="p-4 bg-gray-900 text-green-400 font-mono text-xs overflow-x-auto">
                  <p>curl -X POST "{API_BASE}/protocol/parse" \</p>
                  <p>  -H "accept: application/json" \</p>
                  <p>  -H "Content-Type: multipart/form-data" \</p>
                  <p>  -F "file=@your_protocol.pdf"</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                  <h4 className="font-bold text-gray-800 flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-3 font-black">POST</span>
                    /sites/rank
                  </h4>
                  <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border">Llama 3.3 Engine</span>
                </div>
                <div className="p-4 bg-white text-gray-600 text-sm">
                  Analyzes available site infrastructure against protocol requirements and returns a scored JSON array of the top 15 optimal locations.
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}