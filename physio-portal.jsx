import { useState, useEffect } from "react";

/* ─── HELPERS ─────────────────────────────────────────────────── */
const daysUntil = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
};
const fmt = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NZ", { day:"numeric", month:"short", year:"numeric" });
};
const uid = () => Math.random().toString(36).slice(2,9);

const expiryStatus = (days) => {
  if (days === null) return { color:"#94A3B8", bg:"#F8FAFC", label:"Not set", dot:"#94A3B8" };
  if (days < 0)  return { color:"#DC2626", bg:"#FEE2E2", label:`Expired ${Math.abs(days)}d ago`, dot:"#DC2626" };
  if (days <= 30) return { color:"#DC2626", bg:"#FEE2E2", label:`${days}d left`, dot:"#DC2626" };
  if (days <= 90) return { color:"#D97706", bg:"#FEF3C7", label:`${days}d left`, dot:"#D97706" };
  return { color:"#059669", bg:"#D1FAE5", label:`${days}d left`, dot:"#059669" };
};

/* ─── INITIAL DATA ─────────────────────────────────────────────── */
const INITIAL_STAFF = [
  { id:"s1", name:"Sarah Mitchell", role:"Senior Physiotherapist", email:"sarah@clinic.co.nz", phone:"021 123 4567", startDate:"2021-03-15",
    apc:{ number:"APC-78421", expiry:"2026-03-31", driveLink:"" },
    firstAid:{ expiry:"2026-08-10", driveLink:"" },
    certs:[{ id:"c1", name:"Manual Therapy Level 2", expiry:"", driveLink:"" },{ id:"c2", name:"Dry Needling", expiry:"2026-05-20", driveLink:"" }],
    contractLink:"", policySignOff:true, notes:"",
    onboarding:{"Welcome & orientation":true,"Policies read & signed":true,"H&S induction":true,"Emergency procedures":true,"APC verified":true,"First aid verified":true,"Contract signed":true,"ACC provider setup":true,"IT & systems access":true,"Infection control":true,"Manual handling":false,"Cultural safety training":false}
  },
  { id:"s2", name:"James Taufa", role:"Physiotherapist", email:"james@clinic.co.nz", phone:"022 987 6543", startDate:"2023-07-10",
    apc:{ number:"APC-91032", expiry:"2026-06-15", driveLink:"" },
    firstAid:{ expiry:"2025-12-01", driveLink:"" },
    certs:[{ id:"c3", name:"Sports Taping", expiry:"2027-01-15", driveLink:"" }],
    contractLink:"", policySignOff:true, notes:"",
    onboarding:{"Welcome & orientation":true,"Policies read & signed":true,"H&S induction":true,"Emergency procedures":true,"APC verified":true,"First aid verified":true,"Contract signed":true,"ACC provider setup":false,"IT & systems access":true,"Infection control":true,"Manual handling":true,"Cultural safety training":false}
  },
  { id:"s3", name:"Priya Sharma", role:"Physiotherapist", email:"priya@clinic.co.nz", phone:"027 456 7890", startDate:"2024-11-01",
    apc:{ number:"APC-55201", expiry:"2026-09-30", driveLink:"" },
    firstAid:{ expiry:"2028-03-22", driveLink:"" },
    certs:[{ id:"c4", name:"Pilates Instructor", expiry:"2026-04-15", driveLink:"" },{ id:"c5", name:"Acupuncture", expiry:"2027-09-01", driveLink:"" }],
    contractLink:"", policySignOff:false, notes:"New starter — policy sign-off pending",
    onboarding:{"Welcome & orientation":true,"Policies read & signed":false,"H&S induction":true,"Emergency procedures":false,"APC verified":true,"First aid verified":true,"Contract signed":true,"ACC provider setup":false,"IT & systems access":true,"Infection control":false,"Manual handling":false,"Cultural safety training":false}
  },
];

const INITIAL_DOCS = [
  { id:"d1", category:"Policies & Procedures", name:"Clinical Services Policy", description:"Standards for physiotherapy service delivery", driveLink:"", updated:"2025-12-01" },
  { id:"d2", category:"Policies & Procedures", name:"Privacy & Confidentiality Policy", description:"Patient data handling and HIPC obligations", driveLink:"", updated:"2025-11-15" },
  { id:"d3", category:"Policies & Procedures", name:"Infection Prevention & Control", description:"Clinical hygiene and infection control procedures", driveLink:"", updated:"2026-01-10" },
  { id:"d4", category:"Policies & Procedures", name:"Complaints Management", description:"Process for handling patient complaints", driveLink:"", updated:"2025-10-20" },
  { id:"d5", category:"Legislation", name:"Health and Disability Commissioner Act 1994", description:"Rights of health and disability services consumers", driveLink:"https://www.legislation.govt.nz/act/public/1994/0088/latest/whole.html", updated:"" },
  { id:"d6", category:"Legislation", name:"Health and Safety at Work Act 2015", description:"Primary workplace H&S legislation", driveLink:"https://www.legislation.govt.nz/act/public/2015/0070/latest/whole.html", updated:"" },
  { id:"d7", category:"Legislation", name:"Privacy Act 2020", description:"Information privacy principles", driveLink:"https://www.legislation.govt.nz/act/public/2020/0031/latest/whole.html", updated:"" },
  { id:"d8", category:"Legislation", name:"Physiotherapy Practice Thresholds in Aotearoa NZ", description:"Physiotherapy Board practice framework", driveLink:"https://www.physioboard.org.nz/", updated:"" },
  { id:"d9", category:"Forms & Templates", name:"ACC32 – Physiotherapy Treatment Form", description:"Standard ACC treatment claim form", driveLink:"", updated:"" },
  { id:"d10", category:"Forms & Templates", name:"New Staff Orientation Checklist", description:"Printable onboarding checklist for new staff", driveLink:"", updated:"2026-01-01" },
  { id:"d11", category:"Forms & Templates", name:"Incident Report Form", description:"For recording workplace incidents", driveLink:"", updated:"2025-09-01" },
];

const INITIAL_EQUIPMENT = [
  { id:"e1", name:"Ultrasound Unit – Clinic Room 1", type:"Electrical/Clinical", lastService:"2025-06-15", nextService:"2026-06-15", status:"OK", notes:"", responsible:"Practice Manager" },
  { id:"e2", name:"TENS Machine x3", type:"Electrical/Clinical", lastService:"2025-08-20", nextService:"2026-08-20", status:"OK", notes:"", responsible:"Practice Manager" },
  { id:"e3", name:"Treatment Tables x4", type:"Furniture/Clinical", lastService:"2025-10-01", nextService:"2026-10-01", status:"OK", notes:"Table 3 leg needs re-tighten", responsible:"Practice Manager" },
  { id:"e4", name:"Portable Hydrotherapy Unit", type:"Electrical/Clinical", lastService:"2024-11-30", nextService:"2025-11-30", status:"Due", notes:"Overdue for electrical safety check", responsible:"Practice Manager" },
  { id:"e5", name:"Reception Computer x2", type:"IT/Electrical", lastService:"2025-07-15", nextService:"2026-07-15", status:"OK", notes:"", responsible:"Admin" },
];

const INITIAL_AUDITS = [
  { id:"a1", date:"2025-09-15", type:"External", standard:"DAA Allied Health Standards", auditor:"DAA Group", outcome:"Conditional", notes:"3 corrective actions raised — follow-up due March 2026", driveLink:"" },
  { id:"a2", date:"2026-02-10", type:"Internal", standard:"Infection Control", auditor:"Practice Manager", outcome:"Pass", notes:"All areas clean and compliant. Minor update needed to IPC register.", driveLink:"" },
  { id:"a3", date:"2026-03-05", type:"Internal", standard:"HR & Certification Review", auditor:"Practice Manager", outcome:"In Progress", notes:"Two staff APC renewals pending for March. First aid cert for James expired.", driveLink:"" },
];

const INITIAL_HS = [
  { id:"h1", date:"2026-01-12", type:"Inspection", description:"Annual H&S inspection — clinic premises", actionTaken:"No issues found. Fire exits clear, first aid kits stocked.", status:"Closed" },
  { id:"h2", date:"2026-02-28", type:"Incident", description:"Slip hazard — wet floor near hydro room", actionTaken:"Non-slip mat added. Signage updated.", status:"Closed" },
  { id:"h3", date:"2026-03-20", type:"Near Miss", description:"Sharps disposal bin overfull", actionTaken:"Increased collection frequency. Reminder to staff.", status:"Closed" },
];

const STANDARDS = [
  { id:"st1", area:"Governance & Management", items:[
    { id:"si1", text:"Governance structure documented and up to date", status:"compliant" },
    { id:"si2", text:"Strategic/business plan in place", status:"in-progress" },
    { id:"si3", text:"Policies reviewed annually", status:"compliant" },
    { id:"si4", text:"Financial management systems in place", status:"compliant" },
  ]},
  { id:"st2", area:"Consumer Rights", items:[
    { id:"si5", text:"HDC Code of Rights displayed and accessible", status:"compliant" },
    { id:"si6", text:"Complaints process documented and communicated", status:"compliant" },
    { id:"si7", text:"Informed consent process in place", status:"compliant" },
    { id:"si8", text:"Consumer feedback mechanism active", status:"in-progress" },
  ]},
  { id:"st3", area:"Clinical Service Delivery", items:[
    { id:"si9", text:"Clinical protocols and guidelines current", status:"compliant" },
    { id:"si10", text:"ACC provider requirements met", status:"compliant" },
    { id:"si11", text:"Referral and discharge processes documented", status:"in-progress" },
    { id:"si12", text:"Clinical records management policy in place", status:"compliant" },
  ]},
  { id:"st4", area:"Human Resources", items:[
    { id:"si13", text:"All staff APC current and on file", status:"in-progress" },
    { id:"si14", text:"Position descriptions for all roles", status:"compliant" },
    { id:"si15", text:"Staff appraisal system in place", status:"not-started" },
    { id:"si16", text:"Training & development records maintained", status:"in-progress" },
    { id:"si17", text:"New staff orientation completed", status:"in-progress" },
  ]},
  { id:"st5", area:"Health & Safety", items:[
    { id:"si18", text:"H&S policy and plan current", status:"compliant" },
    { id:"si19", text:"Hazard register maintained", status:"compliant" },
    { id:"si20", text:"Incident reporting system in place", status:"compliant" },
    { id:"si21", text:"Emergency procedures documented and practiced", status:"in-progress" },
    { id:"si22", text:"Equipment servicing records current", status:"in-progress" },
  ]},
  { id:"st6", area:"Infection Prevention & Control", items:[
    { id:"si23", text:"IPC policy current", status:"compliant" },
    { id:"si24", text:"Hand hygiene compliance monitored", status:"compliant" },
    { id:"si25", text:"Cleaning schedules documented and signed off", status:"in-progress" },
    { id:"si26", text:"Waste disposal procedures followed", status:"compliant" },
  ]},
  { id:"st7", area:"Cultural Responsiveness", items:[
    { id:"si27", text:"Te Tiriti o Waitangi obligations acknowledged", status:"in-progress" },
    { id:"si28", text:"Cultural safety training completed by staff", status:"not-started" },
    { id:"si29", text:"Equitable access policy in place", status:"in-progress" },
  ]},
  { id:"st8", area:"Quality Improvement", items:[
    { id:"si30", text:"Quality improvement plan current", status:"in-progress" },
    { id:"si31", text:"Audit schedule in place", status:"compliant" },
    { id:"si32", text:"Previous audit actions resolved", status:"in-progress" },
    { id:"si33", text:"Outcomes data collected and reviewed", status:"not-started" },
  ]},
];

/* ─── STYLES ───────────────────────────────────────────────────── */
const injectStyles = () => {
  const s = document.createElement("style");
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Outfit',sans-serif; background:#EDF4F4; color:#1E293B; }
    ::-webkit-scrollbar { width:5px; }
    ::-webkit-scrollbar-track { background:#E2EAE8; }
    ::-webkit-scrollbar-thumb { background:#9BBFBE; border-radius:99px; }
    input, textarea, select { font-family:'Outfit',sans-serif; }
    @media print {
      .no-print { display:none !important; }
      .print-only { display:block !important; }
      body { background:white; }
    }
    .badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; letter-spacing:.3px; }
    .card { background:white; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04); }
    .btn { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:9px; border:none; cursor:pointer; font-family:'Outfit',sans-serif; font-size:13px; font-weight:600; transition:all .15s; }
    .btn-primary { background:#0D6B6E; color:white; }
    .btn-primary:hover { background:#0B5C5F; transform:translateY(-1px); box-shadow:0 4px 12px rgba(13,107,110,.3); }
    .btn-ghost { background:transparent; color:#0D6B6E; border:1.5px solid #0D6B6E; }
    .btn-ghost:hover { background:#E0F5F5; }
    .btn-danger { background:#FEE2E2; color:#DC2626; }
    .btn-danger:hover { background:#FECACA; }
    .btn-sm { padding:6px 12px; font-size:12px; border-radius:7px; }
    .input { width:100%; padding:9px 12px; border:1.5px solid #E2E8F0; border-radius:8px; font-family:'Outfit',sans-serif; font-size:13px; color:#1E293B; outline:none; transition:border .15s; background:white; }
    .input:focus { border-color:#0D6B6E; box-shadow:0 0 0 3px rgba(13,107,110,.1); }
    .label { font-size:12px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; display:block; }
    .tab { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-family:'Outfit',sans-serif; font-size:13px; font-weight:500; background:transparent; color:#64748B; transition:all .15s; }
    .tab.active { background:white; color:#0D6B6E; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.1); }
    .tab:hover:not(.active) { background:rgba(255,255,255,.5); color:#1E293B; }
    .status-compliant { background:#D1FAE5; color:#059669; }
    .status-in-progress { background:#FEF3C7; color:#D97706; }
    .status-not-started { background:#F1F5F9; color:#64748B; }
    .modal-overlay { position:fixed; inset:0; background:rgba(15,30,30,.45); backdrop-filter:blur(4px); z-index:100; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto; }
    .modal { background:white; border-radius:18px; width:100%; max-width:600px; box-shadow:0 20px 60px rgba(0,0,0,.2); overflow:hidden; }
    .modal-header { padding:20px 24px; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center; }
    .modal-body { padding:24px; max-height:70vh; overflow-y:auto; }
    .section-divider { font-size:11px; font-weight:700; color:#0D6B6E; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #E0F5F5; }
    .drive-link { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:#0D6B6E; text-decoration:none; padding:4px 10px; background:#E0F5F5; border-radius:6px; font-weight:500; }
    .drive-link:hover { background:#C7ECEC; }
    .checklist-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; margin-bottom:4px; transition:background .1s; }
    .checklist-item:hover { background:#F8FAFC; }
    .checklist-cb { width:18px; height:18px; border-radius:4px; accent-color:#0D6B6E; cursor:pointer; flex-shrink:0; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    .animate-in { animation:fadeIn .25s ease-out forwards; }
    @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .slide-up { animation:slideUp .3s ease-out forwards; }
  `;
  document.head.appendChild(s);
};

/* ─── SMALL COMPONENTS ─────────────────────────────────────────── */
function ExpiryBadge({ expiry, small }) {
  const d = daysUntil(expiry);
  const s = expiryStatus(d);
  return (
    <span className="badge" style={{ background:s.bg, color:s.color, fontSize:small?"10px":"11px" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }}/>
      {s.label}
    </span>
  );
}

function DriveLink({ url, label }) {
  if (!url) return <span style={{fontSize:"12px",color:"#94A3B8"}}>No Drive link</span>;
  return <a href={url} target="_blank" rel="noreferrer" className="drive-link">📁 {label||"Open in Drive"}</a>;
}

function XBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background:"#F1F5F9", border:"none", borderRadius:"50%", width:32, height:32, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748B" }}>×</button>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px", color:"#94A3B8" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:500 }}>{text}</div>
    </div>
  );
}

/* ─── DASHBOARD ────────────────────────────────────────────────── */
function Dashboard({ staff, equipment, audits }) {
  const allCerts = [];
  staff.forEach(s => {
    if (s.apc?.expiry) allCerts.push({ name:`${s.name} — APC`, expiry:s.apc.expiry, staff:s.name });
    if (s.firstAid?.expiry) allCerts.push({ name:`${s.name} — First Aid`, expiry:s.firstAid.expiry, staff:s.name });
    (s.certs||[]).forEach(c => { if (c.expiry) allCerts.push({ name:`${s.name} — ${c.name}`, expiry:c.expiry, staff:s.name }); });
  });
  const alerts = allCerts.filter(c => { const d = daysUntil(c.expiry); return d !== null && d <= 90; })
    .sort((a,b) => daysUntil(a.expiry) - daysUntil(b.expiry));

  const equipmentDue = equipment.filter(e => { const d = daysUntil(e.nextService); return d !== null && d <= 60; });
  const onboardingPending = staff.filter(s => Object.values(s.onboarding||{}).some(v=>!v));
  const policyPending = staff.filter(s => !s.policySignOff);

  const lastAudit = [...audits].sort((a,b) => new Date(b.date)-new Date(a.date))[0];

  const completedStds = STANDARDS.flatMap(s=>s.items).filter(i=>i.status==="compliant").length;
  const totalStds = STANDARDS.flatMap(s=>s.items).length;

  return (
    <div style={{ padding:"24px", maxWidth:900 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#0D6B6E", lineHeight:1.1 }}>Good day 👋</h1>
        <p style={{ color:"#64748B", marginTop:4, fontSize:14 }}>{new Date().toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>

      {alerts.length > 0 && (
        <div className="card animate-in" style={{ border:"2px solid #FECACA", background:"#FFF7F7", padding:"16px 20px", marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <span style={{ fontWeight:700, color:"#DC2626", fontSize:15 }}>Action Required — {alerts.length} cert{alerts.length>1?"s":""} expiring within 90 days</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {alerts.map((c,i) => (
              <div key={i} style={{ background:"white", border:"1px solid #FECACA", borderRadius:8, padding:"7px 12px" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#1E293B" }}>{c.name}</div>
                <div style={{ marginTop:2 }}><ExpiryBadge expiry={c.expiry} small /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:28 }}>
        {[
          { icon:"👥", label:"Staff", value:staff.length, sub:"team members", color:"#0D6B6E" },
          { icon:"⚠️", label:"Expiring Certs", value:alerts.filter(a=>daysUntil(a.expiry)>=0&&daysUntil(a.expiry)<=90).length, sub:"within 90 days", color:"#D97706" },
          { icon:"✅", label:"Accreditation", value:`${completedStds}/${totalStds}`, sub:"standards met", color:"#059669" },
          { icon:"🔧", label:"Equipment Due", value:equipmentDue.length, sub:"service due", color:"#7C3AED" },
          { icon:"📋", label:"Onboarding", value:onboardingPending.length, sub:"staff incomplete", color:"#0891B2" },
        ].map((s,i) => (
          <div key={i} className="card animate-in" style={{ padding:"18px 20px", animationDelay:`${i*60}ms` }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, fontWeight:600, color:"#64748B", marginTop:1 }}>{s.label}</div>
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:18 }}>
        {/* Equipment due */}
        <div className="card animate-in" style={{ padding:"20px" }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
            🔧 <span>Equipment — Service Due</span>
          </div>
          {equipmentDue.length === 0
            ? <p style={{ color:"#94A3B8", fontSize:13 }}>All equipment servicing is up to date ✓</p>
            : equipmentDue.map(e => (
              <div key={e.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #F1F5F9" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{e.name}</div>
                  <div style={{ fontSize:11, color:"#94A3B8" }}>Due: {fmt(e.nextService)}</div>
                </div>
                <ExpiryBadge expiry={e.nextService} small />
              </div>
            ))}
        </div>

        {/* Recent audit */}
        <div className="card animate-in" style={{ padding:"20px" }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
            📊 <span>Latest Audit</span>
          </div>
          {lastAudit ? (
            <>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{lastAudit.standard}</div>
              <div style={{ fontSize:12, color:"#64748B", marginBottom:8 }}>{fmt(lastAudit.date)} · {lastAudit.type} · {lastAudit.auditor}</div>
              <span className={`badge status-${lastAudit.outcome === "Pass" ? "compliant" : lastAudit.outcome === "Conditional" ? "in-progress" : "not-started"}`}>{lastAudit.outcome}</span>
              {lastAudit.notes && <p style={{ fontSize:12, color:"#64748B", marginTop:10, lineHeight:1.5 }}>{lastAudit.notes}</p>}
            </>
          ) : <p style={{ color:"#94A3B8", fontSize:13 }}>No audits recorded yet</p>}
        </div>

        {/* Policy sign-off */}
        <div className="card animate-in" style={{ padding:"20px" }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
            📝 <span>Policy Sign-off Status</span>
          </div>
          {staff.map(s => (
            <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #F1F5F9" }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{s.name}</div>
              <span className={`badge ${s.policySignOff ? "status-compliant" : "status-not-started"}`}>{s.policySignOff ? "Signed ✓" : "Pending"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── STAFF ────────────────────────────────────────────────────── */
function StaffPage({ staff, setStaff }) {
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const [profileTab, setProfileTab] = useState("info");

  const openProfile = (s) => { setSelected(s); setProfileTab("info"); };

  const allComplete = (s) => Object.values(s.onboarding||{}).every(v=>v);
  const completeCount = (s) => Object.values(s.onboarding||{}).filter(v=>v).length;
  const totalCount = (s) => Object.keys(s.onboarding||{}).length;

  const updateStaff = (updated) => {
    setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
    setSelected(updated);
  };

  const newStaffTemplate = () => ({
    id: uid(), name:"", role:"", email:"", phone:"", startDate:"",
    apc:{ number:"", expiry:"", driveLink:"" },
    firstAid:{ expiry:"", driveLink:"" },
    certs:[], contractLink:"", policySignOff:false, notes:"",
    onboarding:{"Welcome & orientation":false,"Policies read & signed":false,"H&S induction":false,"Emergency procedures":false,"APC verified":false,"First aid verified":false,"Contract signed":false,"ACC provider setup":false,"IT & systems access":false,"Infection control":false,"Manual handling":false,"Cultural safety training":false}
  });

  return (
    <div style={{ padding:"24px", maxWidth:900 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#0D6B6E" }}>Staff</h2>
          <p style={{ color:"#64748B", fontSize:13, marginTop:2 }}>{staff.length} team members</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(newStaffTemplate()); setAdding(true); }}>+ Add Staff</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
        {staff.map(s => {
          const apcDays = daysUntil(s.apc?.expiry);
          const done = completeCount(s); const total = totalCount(s);
          return (
            <div key={s.id} className="card animate-in" style={{ padding:"20px", cursor:"pointer", transition:"transform .15s, box-shadow .15s" }}
              onClick={() => openProfile(s)}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg, #0D6B6E, #1A9FAD)`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:18, fontWeight:700, flexShrink:0 }}>
                  {s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{s.name}</div>
                  <div style={{ fontSize:12, color:"#64748B" }}>{s.role}</div>
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                <span style={{ fontSize:11, background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:6, padding:"3px 8px", color:"#475569", fontWeight:500 }}>APC: {s.apc?.expiry ? fmt(s.apc.expiry) : "—"}</span>
                <ExpiryBadge expiry={s.apc?.expiry} small />
              </div>
              <div style={{ background:"#F8FAFC", borderRadius:8, padding:"10px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:11, color:"#64748B", fontWeight:600 }}>Onboarding</span>
                  <span style={{ fontSize:11, color: allComplete(s) ? "#059669" : "#D97706", fontWeight:700 }}>{done}/{total}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:"#E2E8F0", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(done/total)*100}%`, background: allComplete(s) ? "#059669" : "#D97706", borderRadius:99, transition:"width .4s" }}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Profile Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setSelected(null); }}>
          <div className="modal slide-up" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#0D6B6E,#1A9FAD)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:18, fontWeight:700 }}>
                  {selected.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:16 }}>{selected.name}</div>
                  <div style={{ fontSize:13, color:"#64748B" }}>{selected.role}</div>
                </div>
              </div>
              <XBtn onClick={() => setSelected(null)} />
            </div>
            <div style={{ display:"flex", gap:4, padding:"12px 24px", borderBottom:"1px solid #F1F5F9", background:"#F8FAFC", overflowX:"auto" }}>
              {["info","certs","onboarding","documents"].map(t => (
                <button key={t} className={`tab ${profileTab===t?"active":""}`} onClick={() => setProfileTab(t)} style={{ textTransform:"capitalize", whiteSpace:"nowrap" }}>{t === "info" ? "Personal Info" : t === "certs" ? "Certifications" : t === "onboarding" ? "Onboarding" : "Documents"}</button>
              ))}
            </div>
            <div className="modal-body">
              {profileTab === "info" && <StaffInfoTab staff={selected} update={updateStaff} />}
              {profileTab === "certs" && <StaffCertsTab staff={selected} update={updateStaff} />}
              {profileTab === "onboarding" && <StaffOnboardingTab staff={selected} update={updateStaff} />}
              {profileTab === "documents" && <StaffDocsTab staff={selected} update={updateStaff} />}
            </div>
            <div style={{ padding:"14px 24px", borderTop:"1px solid #F1F5F9", display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button className="btn btn-danger btn-sm" onClick={() => { setStaff(prev=>prev.filter(s=>s.id!==selected.id)); setSelected(null); }}>Remove Staff</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {adding && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setAdding(false); }}>
          <div className="modal slide-up">
            <div className="modal-header">
              <div style={{ fontWeight:800, fontSize:16 }}>Add New Staff Member</div>
              <XBtn onClick={() => setAdding(false)} />
            </div>
            <div className="modal-body">
              <div style={{ display:"grid", gap:14 }}>
                {[["Full Name","name"],["Role / Title","role"],["Email","email"],["Phone","phone"],["Start Date","startDate","date"]].map(([lbl,key,type]) => (
                  <div key={key}>
                    <label className="label">{lbl}</label>
                    <input className="input" type={type||"text"} value={form[key]||""} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} />
                  </div>
                ))}
                <div>
                  <label className="label">APC Number</label>
                  <input className="input" value={form.apc?.number||""} onChange={e=>setForm(p=>({...p,apc:{...p.apc,number:e.target.value}}))} />
                </div>
                <div>
                  <label className="label">APC Expiry</label>
                  <input className="input" type="date" value={form.apc?.expiry||""} onChange={e=>setForm(p=>({...p,apc:{...p.apc,expiry:e.target.value}}))} />
                </div>
                <div>
                  <label className="label">First Aid Expiry</label>
                  <input className="input" type="date" value={form.firstAid?.expiry||""} onChange={e=>setForm(p=>({...p,firstAid:{...p.firstAid,expiry:e.target.value}}))} />
                </div>
              </div>
            </div>
            <div style={{ padding:"14px 24px", borderTop:"1px solid #F1F5F9", display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { if(!form.name) return; setStaff(p=>[...p,form]); setAdding(false); setForm({}); }}>Add Staff Member</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffInfoTab({ staff, update }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(staff);
  const save = () => { update(f); setEditing(false); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
        {editing
          ? <><button className="btn btn-ghost btn-sm" onClick={()=>{setF(staff);setEditing(false);}}>Cancel</button><button className="btn btn-primary btn-sm" style={{marginLeft:8}} onClick={save}>Save</button></>
          : <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(true)}>✏️ Edit</button>
        }
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {[["Full Name","name"],["Role","role"],["Email","email"],["Phone","phone"],["Start Date","startDate"]].map(([lbl,key]) => (
          <div key={key} style={{ gridColumn: key==="name"?"span 2":undefined }}>
            <label className="label">{lbl}</label>
            {editing
              ? <input className="input" type={key==="startDate"?"date":"text"} value={f[key]||""} onChange={e=>setF(p=>({...p,[key]:e.target.value}))} />
              : <div style={{ fontSize:14, color:"#1E293B", fontWeight:500 }}>{staff[key] ? (key==="startDate" ? fmt(staff[key]) : staff[key]) : <span style={{color:"#94A3B8"}}>—</span>}</div>
            }
          </div>
        ))}
        <div style={{ gridColumn:"span 2" }}>
          <label className="label">Notes</label>
          {editing
            ? <textarea className="input" rows={3} value={f.notes||""} onChange={e=>setF(p=>({...p,notes:e.target.value}))} />
            : <div style={{ fontSize:13, color:"#64748B" }}>{staff.notes || <span style={{color:"#94A3B8"}}>None</span>}</div>
          }
        </div>
      </div>
    </div>
  );
}

function StaffCertsTab({ staff, update }) {
  const [f, setF] = useState(staff);
  const [newCert, setNewCert] = useState({ name:"", expiry:"", driveLink:"" });
  const save = (updated) => { update(updated); setF(updated); };

  return (
    <div style={{ display:"grid", gap:20 }}>
      {/* APC */}
      <div>
        <div className="section-divider">Annual Practising Certificate (APC)</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label className="label">APC Number</label>
            <input className="input" value={f.apc?.number||""} onChange={e=>{const u={...f,apc:{...f.apc,number:e.target.value}};setF(u);}} onBlur={()=>save(f)} />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input className="input" type="date" value={f.apc?.expiry||""} onChange={e=>{const u={...f,apc:{...f.apc,expiry:e.target.value}};setF(u);save(u);}} />
          </div>
          <div style={{ gridColumn:"span 2" }}>
            <label className="label">Google Drive Link</label>
            <input className="input" placeholder="Paste Google Drive URL" value={f.apc?.driveLink||""} onChange={e=>{const u={...f,apc:{...f.apc,driveLink:e.target.value}};setF(u);}} onBlur={()=>save(f)} />
          </div>
        </div>
        {f.apc?.expiry && <div style={{ marginTop:8 }}><ExpiryBadge expiry={f.apc.expiry} /></div>}
      </div>

      {/* First Aid */}
      <div>
        <div className="section-divider">First Aid Certificate</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label className="label">Expiry Date</label>
            <input className="input" type="date" value={f.firstAid?.expiry||""} onChange={e=>{const u={...f,firstAid:{...f.firstAid,expiry:e.target.value}};setF(u);save(u);}} />
          </div>
          <div>
            <label className="label">Google Drive Link</label>
            <input className="input" placeholder="Paste Google Drive URL" value={f.firstAid?.driveLink||""} onChange={e=>{const u={...f,firstAid:{...f.firstAid,driveLink:e.target.value}};setF(u);}} onBlur={()=>save(f)} />
          </div>
        </div>
        {f.firstAid?.expiry && <div style={{ marginTop:8 }}><ExpiryBadge expiry={f.firstAid.expiry} /></div>}
      </div>

      {/* Other certs */}
      <div>
        <div className="section-divider">Additional Certifications / Courses</div>
        {(f.certs||[]).map((c,i) => (
          <div key={c.id} style={{ background:"#F8FAFC", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:6 }}>
              <div>
                <label className="label">Certificate Name</label>
                <input className="input" value={c.name} onChange={e=>{const certs=[...f.certs];certs[i]={...c,name:e.target.value};const u={...f,certs};setF(u);}} onBlur={()=>save(f)} />
              </div>
              <div>
                <label className="label">Expiry (if applicable)</label>
                <input className="input" type="date" value={c.expiry||""} onChange={e=>{const certs=[...f.certs];certs[i]={...c,expiry:e.target.value};const u={...f,certs};setF(u);save(u);}} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <label className="label">Drive Link</label>
                <input className="input" placeholder="Paste Google Drive URL" value={c.driveLink||""} onChange={e=>{const certs=[...f.certs];certs[i]={...c,driveLink:e.target.value};const u={...f,certs};setF(u);}} onBlur={()=>save(f)} />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              {c.expiry ? <ExpiryBadge expiry={c.expiry} small /> : <span/>}
              <button className="btn btn-danger btn-sm" onClick={()=>{const certs=f.certs.filter((_,j)=>j!==i);const u={...f,certs};setF(u);save(u);}}>Remove</button>
            </div>
          </div>
        ))}
        <div style={{ background:"#F0F9FF", border:"1.5px dashed #BAE6FD", borderRadius:10, padding:"12px 14px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#0369A1", marginBottom:10 }}>+ Add Certificate</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <input className="input" placeholder="Certificate name" value={newCert.name} onChange={e=>setNewCert(p=>({...p,name:e.target.value}))} />
            <input className="input" type="date" value={newCert.expiry} onChange={e=>setNewCert(p=>({...p,expiry:e.target.value}))} />
            <input className="input" style={{ gridColumn:"span 2" }} placeholder="Google Drive URL" value={newCert.driveLink} onChange={e=>setNewCert(p=>({...p,driveLink:e.target.value}))} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => {
            if (!newCert.name) return;
            const u = {...f, certs:[...(f.certs||[]), {...newCert,id:uid()}]};
            setF(u); save(u); setNewCert({name:"",expiry:"",driveLink:""});
          }}>Add</button>
        </div>
      </div>
    </div>
  );
}

function StaffOnboardingTab({ staff, update }) {
  const toggle = (key) => {
    const updated = {...staff, onboarding:{...staff.onboarding,[key]:!staff.onboarding[key]}};
    update(updated);
  };
  const done = Object.values(staff.onboarding||{}).filter(v=>v).length;
  const total = Object.keys(staff.onboarding||{}).length;
  const pct = Math.round((done/total)*100);

  return (
    <div>
      <div style={{ background:"#F8FAFC", borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:700 }}>Orientation Progress</span>
          <span style={{ fontSize:13, fontWeight:700, color: pct===100?"#059669":"#D97706" }}>{done}/{total} complete</span>
        </div>
        <div style={{ height:8, borderRadius:99, background:"#E2E8F0", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background: pct===100 ? "#059669" : "#D97706", borderRadius:99, transition:"width .4s" }}/>
        </div>
        {pct === 100 && <div style={{ marginTop:8, color:"#059669", fontSize:13, fontWeight:600 }}>🎉 All orientation items complete!</div>}
      </div>
      {Object.entries(staff.onboarding||{}).map(([key,val]) => (
        <div key={key} className="checklist-item" style={{ background: val ? "#F0FDF4" : undefined }}>
          <input type="checkbox" className="checklist-cb" checked={val} onChange={()=>toggle(key)} />
          <span style={{ fontSize:14, color: val ? "#059669" : "#1E293B", textDecoration: val ? "line-through" : "none", opacity: val ? .7 : 1 }}>{key}</span>
          {val && <span style={{ marginLeft:"auto", fontSize:11, color:"#059669", fontWeight:600 }}>✓</span>}
        </div>
      ))}
      <div style={{ marginTop:16, display:"flex", gap:8" }}>
        <button className="btn btn-ghost btn-sm no-print" onClick={()=>window.print()}>🖨️ Print Checklist</button>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto" }}>
          <label className="label" style={{ margin:0 }}>Policies signed off:</label>
          <input type="checkbox" className="checklist-cb" checked={!!staff.policySignOff} onChange={()=>update({...staff,policySignOff:!staff.policySignOff})} />
        </div>
      </div>
    </div>
  );
}

function StaffDocsTab({ staff, update }) {
  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <label className="label">Employment Contract</label>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input className="input" placeholder="Paste Google Drive URL for contract" value={staff.contractLink||""} onChange={e=>update({...staff,contractLink:e.target.value})} />
          {staff.contractLink && <DriveLink url={staff.contractLink} label="Open" />}
        </div>
      </div>
      <div style={{ background:"#F8FAFC", borderRadius:10, padding:"14px 16px", marginTop:16 }}>
        <div style={{ fontSize:12, color:"#64748B", lineHeight:1.7 }}>
          <strong>Tip:</strong> Store all staff documents in Google Drive and paste the sharing link above. For best access management, use a folder structure like:<br/><br/>
          <code style={{ fontFamily:"'IBM Plex Mono', monospace", background:"#E2E8F0", padding:"2px 6px", borderRadius:4, fontSize:11 }}>Staff / {staff.name} / APC / Contract / Certs</code>
        </div>
      </div>
    </div>
  );
}

/* ─── DOCUMENTS ────────────────────────────────────────────────── */
function DocumentsPage({ docs, setDocs }) {
  const [cat, setCat] = useState("Policies & Procedures");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category:"Policies & Procedures", name:"", description:"", driveLink:"", updated:"" });

  const cats = ["Policies & Procedures","Legislation","Forms & Templates"];
  const filtered = docs.filter(d => d.category === cat);

  return (
    <div style={{ padding:"24px", maxWidth:900 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#0D6B6E" }}>Document Centre</h2>
          <p style={{ fontSize:13, color:"#64748B", marginTop:2 }}>Policies, legislation & forms — linked to Google Drive</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setAdding(true)}>+ Add Document</button>
      </div>

      <div style={{ display:"flex", gap:6, padding:"6px", background:"#E8EFEF", borderRadius:12, marginBottom:24, width:"fit-content" }}>
        {cats.map(c => <button key={c} className={`tab ${cat===c?"active":""}`} onClick={()=>setCat(c)}>{c}</button>)}
      </div>

      {filtered.length === 0
        ? <EmptyState icon="📄" text="No documents yet — add one above" />
        : (
          <div style={{ display:"grid", gap:12 }}>
            {filtered.map(d => (
              <div key={d.id} className="card animate-in" style={{ padding:"18px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{d.name}</div>
                  {d.description && <div style={{ fontSize:13, color:"#64748B" }}>{d.description}</div>}
                  {d.updated && <div style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>Updated: {fmt(d.updated)}</div>}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                  {d.driveLink
                    ? <DriveLink url={d.driveLink} label="Open in Drive" />
                    : (
                      <input className="input" placeholder="Paste Drive URL" style={{ width:220, fontSize:12 }}
                        value={d.driveLink||""} onChange={e=>setDocs(prev=>prev.map(x=>x.id===d.id?{...x,driveLink:e.target.value}:x))} />
                    )
                  }
                  <button className="btn btn-danger btn-sm" onClick={()=>setDocs(p=>p.filter(x=>x.id!==d.id))}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {adding && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setAdding(false);}}>
          <div className="modal slide-up">
            <div className="modal-header">
              <div style={{ fontWeight:800, fontSize:16 }}>Add Document</div>
              <XBtn onClick={()=>setAdding(false)} />
            </div>
            <div className="modal-body">
              <div style={{ display:"grid", gap:14 }}>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                    {cats.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Document Name</label>
                  <input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Google Drive URL</label>
                  <input className="input" placeholder="https://drive.google.com/..." value={form.driveLink} onChange={e=>setForm(p=>({...p,driveLink:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Date Updated</label>
                  <input className="input" type="date" value={form.updated} onChange={e=>setForm(p=>({...p,updated:e.target.value}))} />
                </div>
              </div>
            </div>
            <div style={{ padding:"14px 24px", borderTop:"1px solid #F1F5F9", display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={()=>{ if(!form.name)return; setDocs(p=>[...p,{...form,id:uid()}]); setCat(form.category); setAdding(false); setForm({category:"Policies & Procedures",name:"",description:"",driveLink:"",updated:""}); }}>Save Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── COMPLIANCE ───────────────────────────────────────────────── */
function CompliancePage({ equipment, setEquipment, audits, setAudits, hsRecords, setHsRecords }) {
  const [tab, setTab] = useState("equipment");

  return (
    <div style={{ padding:"24px", maxWidth:900 }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#0D6B6E" }}>Management Hub</h2>
        <p style={{ fontSize:13, color:"#64748B", marginTop:2 }}>Equipment servicing, audits & health and safety records</p>
      </div>
      <div style={{ display:"flex", gap:6, padding:"6px", background:"#E8EFEF", borderRadius:12, marginBottom:24, width:"fit-content" }}>
        {["equipment","audits","h&s"].map(t => <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)} style={{ textTransform:"capitalize" }}>{t === "h&s" ? "Health & Safety" : t === "equipment" ? "⚙️ Equipment" : "📊 Audits"}</button>)}
      </div>
      {tab === "equipment" && <EquipmentTab equipment={equipment} setEquipment={setEquipment} />}
      {tab === "audits" && <AuditsTab audits={audits} setAudits={setAudits} />}
      {tab === "h&s" && <HSTab records={hsRecords} setRecords={setHsRecords} />}
    </div>
  );
}

function EquipmentTab({ equipment, setEquipment }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:"", type:"Electrical/Clinical", lastService:"", nextService:"", notes:"", responsible:"", status:"OK" });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="btn btn-primary" onClick={()=>setAdding(true)}>+ Add Equipment</button>
      </div>
      <div style={{ display:"grid", gap:12 }}>
        {equipment.map(e => {
          const d = daysUntil(e.nextService);
          const s = expiryStatus(d);
          return (
            <div key={e.id} className="card animate-in" style={{ padding:"18px 20px", borderLeft:`4px solid ${s.dot}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{e.name}</div>
                  <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{e.type} · Responsible: {e.responsible}</div>
                  {e.notes && <div style={{ fontSize:12, color:"#94A3B8", marginTop:4, fontStyle:"italic" }}>{e.notes}</div>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:12, color:"#64748B" }}>Last: {fmt(e.lastService)}</div>
                  <div style={{ fontSize:12, color:"#64748B", marginBottom:6 }}>Next: {fmt(e.nextService)}</div>
                  <ExpiryBadge expiry={e.nextService} small />
                </div>
              </div>
              <div style={{ marginTop:12, display:"flex", gap:8" }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>{
                  const today = new Date().toISOString().split("T")[0];
                  const next = new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().split("T")[0];
                  setEquipment(prev=>prev.map(x=>x.id===e.id?{...x,lastService:today,nextService:next,status:"OK"}:x));
                }}>✓ Mark Serviced Today</button>
                <button className="btn btn-danger btn-sm" onClick={()=>setEquipment(p=>p.filter(x=>x.id!==e.id))}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
      {adding && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setAdding(false);}}>
          <div className="modal slide-up">
            <div className="modal-header"><div style={{fontWeight:800,fontSize:16}}>Add Equipment</div><XBtn onClick={()=>setAdding(false)}/></div>
            <div className="modal-body">
              <div style={{display:"grid",gap:12}}>
                {[["Equipment Name","name"],["Type","type"],["Responsible Person","responsible"]].map(([l,k])=>(
                  <div key={k}><label className="label">{l}</label><input className="input" value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>
                ))}
                <div><label className="label">Last Serviced</label><input className="input" type="date" value={form.lastService} onChange={e=>setForm(p=>({...p,lastService:e.target.value}))}/></div>
                <div><label className="label">Next Service Due</label><input className="input" type="date" value={form.nextService} onChange={e=>setForm(p=>({...p,nextService:e.target.value}))}/></div>
                <div><label className="label">Notes</label><input className="input" value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
              </div>
            </div>
            <div style={{padding:"14px 24px",borderTop:"1px solid #F1F5F9",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={()=>{if(!form.name)return;setEquipment(p=>[...p,{...form,id:uid()}]);setAdding(false);setForm({name:"",type:"Electrical/Clinical",lastService:"",nextService:"",notes:"",responsible:"",status:"OK"});}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditsTab({ audits, setAudits }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date:"", type:"Internal", standard:"", auditor:"", outcome:"Pass", notes:"", driveLink:"" });
  const sorted = [...audits].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="btn btn-primary" onClick={()=>setAdding(true)}>+ Add Audit Record</button>
      </div>
      <div style={{ display:"grid", gap:12 }}>
        {sorted.map(a => (
          <div key={a.id} className="card animate-in" style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{a.standard}</div>
                <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{fmt(a.date)} · {a.type} audit · {a.auditor}</div>
                {a.notes && <div style={{ fontSize:13, color:"#475569", marginTop:8, lineHeight:1.5 }}>{a.notes}</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                <span className={`badge ${a.outcome==="Pass"?"status-compliant":a.outcome==="Conditional"?"status-in-progress":"status-not-started"}`}>{a.outcome}</span>
                {a.driveLink && <DriveLink url={a.driveLink} label="Report" />}
                <button className="btn btn-danger btn-sm" onClick={()=>setAudits(p=>p.filter(x=>x.id!==a.id))}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        {audits.length===0 && <EmptyState icon="📋" text="No audit records yet" />}
      </div>
      {adding && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setAdding(false);}}>
          <div className="modal slide-up">
            <div className="modal-header"><div style={{fontWeight:800,fontSize:16}}>Add Audit Record</div><XBtn onClick={()=>setAdding(false)}/></div>
            <div className="modal-body">
              <div style={{display:"grid",gap:12}}>
                <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label className="label">Type</label><select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}><option>Internal</option><option>External</option></select></div>
                  <div><label className="label">Outcome</label><select className="input" value={form.outcome} onChange={e=>setForm(p=>({...p,outcome:e.target.value}))}><option>Pass</option><option>Conditional</option><option>Fail</option><option>In Progress</option></select></div>
                </div>
                <div><label className="label">Standard / Area Audited</label><input className="input" value={form.standard} onChange={e=>setForm(p=>({...p,standard:e.target.value}))}/></div>
                <div><label className="label">Auditor / Organisation</label><input className="input" value={form.auditor} onChange={e=>setForm(p=>({...p,auditor:e.target.value}))}/></div>
                <div><label className="label">Notes / Findings</label><textarea className="input" rows={3} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
                <div><label className="label">Drive Link (report)</label><input className="input" placeholder="Google Drive URL" value={form.driveLink} onChange={e=>setForm(p=>({...p,driveLink:e.target.value}))}/></div>
              </div>
            </div>
            <div style={{padding:"14px 24px",borderTop:"1px solid #F1F5F9",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={()=>{if(!form.standard)return;setAudits(p=>[...p,{...form,id:uid()}]);setAdding(false);setForm({date:"",type:"Internal",standard:"",auditor:"",outcome:"Pass",notes:"",driveLink:""});}}>Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HSTab({ records, setRecords }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date:"", type:"Inspection", description:"", actionTaken:"", status:"Open" });
  const sorted = [...records].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const typeColors = { Inspection:"#0D6B6E", Incident:"#DC2626", "Near Miss":"#D97706", Review:"#7C3AED" };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="btn btn-primary" onClick={()=>setAdding(true)}>+ Add H&S Record</button>
      </div>
      <div style={{ display:"grid", gap:12 }}>
        {sorted.map(r => (
          <div key={r.id} className="card animate-in" style={{ padding:"18px 20px", borderLeft:`4px solid ${typeColors[r.type]||"#0D6B6E"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, background:typeColors[r.type]+"20", color:typeColors[r.type], padding:"3px 8px", borderRadius:6 }}>{r.type}</span>
                  <span style={{ fontSize:12, color:"#64748B" }}>{fmt(r.date)}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{r.description}</div>
                {r.actionTaken && <div style={{ fontSize:13, color:"#64748B" }}><strong>Action:</strong> {r.actionTaken}</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                <span className={`badge ${r.status==="Closed"?"status-compliant":"status-in-progress"}`}>{r.status}</span>
                <button className="btn btn-ghost btn-sm" onClick={()=>setRecords(p=>p.map(x=>x.id===r.id?{...x,status:x.status==="Closed"?"Open":"Closed"}:x))}>{r.status==="Closed"?"Reopen":"Close"}</button>
                <button className="btn btn-danger btn-sm" onClick={()=>setRecords(p=>p.filter(x=>x.id!==r.id))}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        {records.length===0 && <EmptyState icon="🛡️" text="No H&S records yet" />}
      </div>
      {adding && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setAdding(false);}}>
          <div className="modal slide-up">
            <div className="modal-header"><div style={{fontWeight:800,fontSize:16}}>Add H&S Record</div><XBtn onClick={()=>setAdding(false)}/></div>
            <div className="modal-body">
              <div style={{display:"grid",gap:12}}>
                <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
                <div><label className="label">Type</label><select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}><option>Inspection</option><option>Incident</option><option>Near Miss</option><option>Review</option></select></div>
                <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/></div>
                <div><label className="label">Action Taken</label><textarea className="input" rows={2} value={form.actionTaken} onChange={e=>setForm(p=>({...p,actionTaken:e.target.value}))}/></div>
                <div><label className="label">Status</label><select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Open</option><option>Closed</option></select></div>
              </div>
            </div>
            <div style={{padding:"14px 24px",borderTop:"1px solid #F1F5F9",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={()=>{if(!form.description)return;setRecords(p=>[...p,{...form,id:uid()}]);setAdding(false);setForm({date:"",type:"Inspection",description:"",actionTaken:"",status:"Open"});}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ACCREDITATION ────────────────────────────────────────────── */
function AccreditationPage({ standards, setStandards }) {
  const allItems = standards.flatMap(s=>s.items);
  const compliant = allItems.filter(i=>i.status==="compliant").length;
  const inProgress = allItems.filter(i=>i.status==="in-progress").length;
  const notStarted = allItems.filter(i=>i.status==="not-started").length;
  const pct = Math.round((compliant/allItems.length)*100);

  const setStatus = (areaId, itemId, status) => {
    setStandards(prev => prev.map(a => a.id===areaId ? {...a, items:a.items.map(i=>i.id===itemId?{...i,status}:i)} : a));
  };

  const statusOpts = [
    { value:"compliant", label:"Compliant", className:"status-compliant" },
    { value:"in-progress", label:"In Progress", className:"status-in-progress" },
    { value:"not-started", label:"Not Started", className:"status-not-started" },
  ];

  return (
    <div style={{ padding:"24px", maxWidth:900 }}>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#0D6B6E" }}>Accreditation — DAA Allied Health Standards</h2>
        <p style={{ fontSize:13, color:"#64748B", marginTop:2 }}>ACC-aligned accreditation readiness for the Allied Health Sector Service Specification</p>
      </div>

      {/* Summary bar */}
      <div className="card animate-in" style={{ padding:"20px 24px", marginBottom:28 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>Overall Compliance: <span style={{ color: pct>=80?"#059669":pct>=50?"#D97706":"#DC2626" }}>{pct}%</span></div>
          <div style={{ display:"flex", gap:12 }}>
            <span className="badge status-compliant">{compliant} Compliant</span>
            <span className="badge status-in-progress">{inProgress} In Progress</span>
            <span className="badge status-not-started">{notStarted} Not Started</span>
          </div>
        </div>
        <div style={{ height:10, borderRadius:99, background:"#E2E8F0", overflow:"hidden", display:"flex" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"#059669", borderRadius:99, transition:"width .5s" }}/>
        </div>
        <div style={{ marginTop:12, fontSize:12, color:"#64748B" }}>
          {pct >= 80 ? "🟢 Looking good — ready for audit!" : pct >= 50 ? "🟡 Making progress — keep working through the in-progress items" : "🔴 Several areas need attention before your next audit"}
        </div>
      </div>

      <div style={{ display:"grid", gap:16 }}>
        {standards.map(area => {
          const areaCompliant = area.items.filter(i=>i.status==="compliant").length;
          const areaTotal = area.items.length;
          return (
            <div key={area.id} className="card animate-in" style={{ overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#0D6B6E" }}>{area.area}</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:12, color:"#64748B" }}>{areaCompliant}/{areaTotal}</span>
                  <div style={{ width:60, height:5, borderRadius:99, background:"#E2E8F0", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(areaCompliant/areaTotal)*100}%`, background:"#059669", borderRadius:99 }}/>
                  </div>
                </div>
              </div>
              <div style={{ padding:"8px 12px" }}>
                {area.items.map(item => (
                  <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 8px", borderBottom:"1px solid #F8FAFC" }}>
                    <span style={{ fontSize:13, flex:1, marginRight:12 }}>{item.text}</span>
                    <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                      {statusOpts.map(opt => (
                        <button key={opt.value} onClick={()=>setStatus(area.id,item.id,opt.value)}
                          className={`badge ${item.status===opt.value?opt.className:"status-not-started"}`}
                          style={{ cursor:"pointer", border: item.status===opt.value?"2px solid currentColor":"2px solid transparent", opacity:item.status===opt.value?1:.5, transition:"all .1s", fontSize:10, whiteSpace:"nowrap" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:20, display:"flex", gap:10" }}>
        <button className="btn btn-ghost no-print" onClick={()=>window.print()}>🖨️ Print for Audit</button>
      </div>
    </div>
  );
}

/* ─── MAIN APP ─────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [equipment, setEquipment] = useState(INITIAL_EQUIPMENT);
  const [audits, setAudits] = useState(INITIAL_AUDITS);
  const [hsRecords, setHsRecords] = useState(INITIAL_HS);
  const [standards, setStandards] = useState(STANDARDS);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { injectStyles(); }, []);

  // Load from storage
  useEffect(() => {
    const load = async () => {
      try {
        const keys = ["staff","docs","equipment","audits","hsRecords","standards"];
        const setters = [setStaff,setDocs,setEquipment,setAudits,setHsRecords,setStandards];
        for (let i=0;i<keys.length;i++) {
          try {
            const r = await window.storage.get(keys[i]);
            if (r?.value) setters[i](JSON.parse(r.value));
          } catch {}
        }
      } catch {}
      setLoaded(true);
    };
    load();
  }, []);

  // Save to storage on change
  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      try {
        await window.storage.set("staff", JSON.stringify(staff));
        await window.storage.set("docs", JSON.stringify(docs));
        await window.storage.set("equipment", JSON.stringify(equipment));
        await window.storage.set("audits", JSON.stringify(audits));
        await window.storage.set("hsRecords", JSON.stringify(hsRecords));
        await window.storage.set("standards", JSON.stringify(standards));
      } catch {}
    };
    save();
  }, [staff, docs, equipment, audits, hsRecords, standards, loaded]);

  const navItems = [
    { key:"dashboard", icon:"🏠", label:"Dashboard" },
    { key:"staff", icon:"👥", label:"Staff" },
    { key:"documents", icon:"📁", label:"Documents" },
    { key:"compliance", icon:"🔧", label:"Management" },
    { key:"accreditation", icon:"✅", label:"Accreditation" },
  ];

  // Alert count for badge
  const allCerts = [];
  staff.forEach(s => {
    if (s.apc?.expiry) allCerts.push(s.apc.expiry);
    if (s.firstAid?.expiry) allCerts.push(s.firstAid.expiry);
    (s.certs||[]).forEach(c => { if (c.expiry) allCerts.push(c.expiry); });
  });
  const alertCount = allCerts.filter(e => { const d=daysUntil(e); return d!==null && d<=90 && d>=0; }).length;

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Outfit',sans-serif", background:"#EDF4F4" }}>
      {/* Desktop Sidebar */}
      <div className="no-print" style={{ width:220, background:"white", borderRight:"1px solid #E2E8F0", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:50, boxShadow:"2px 0 12px rgba(0,0,0,.04)" }}>
        {/* Logo */}
        <div style={{ padding:"24px 20px 16px", borderBottom:"1px solid #F1F5F9" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#0D6B6E,#1A9FAD)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🌿</div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:"#0D6B6E", lineHeight:1 }}>PhysioPortal</div>
              <div style={{ fontSize:10, color:"#94A3B8", marginTop:2 }}>NZ Allied Health</div>
            </div>
          </div>
        </div>
        {/* Nav */}
        <nav style={{ padding:"12px 10px", flex:1 }}>
          {navItems.map(n => (
            <button key={n.key} onClick={()=>setPage(n.key)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight: page===n.key?700:500, color: page===n.key?"#0D6B6E":"#475569", background: page===n.key?"#E0F5F5":"transparent", transition:"all .15s", marginBottom:2, textAlign:"left" }}>
              <span style={{ fontSize:16 }}>{n.icon}</span>
              {n.label}
              {n.key==="dashboard" && alertCount>0 && <span style={{ marginLeft:"auto", background:"#DC2626", color:"white", borderRadius:"99px", fontSize:10, fontWeight:700, padding:"1px 6px" }}>{alertCount}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 20px 20px", borderTop:"1px solid #F1F5F9" }}>
          <div style={{ fontSize:10, color:"#94A3B8", lineHeight:1.5 }}>DAA Accreditation<br/>Allied Health Standards<br/>ACC Provider</div>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="no-print" style={{ position:"fixed", top:0, left:0, right:0, height:56, background:"white", borderBottom:"1px solid #E2E8F0", display:"flex", alignItems:"center", padding:"0 16px", zIndex:60, display:"none" }} id="mobile-bar">
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#0D6B6E,#1A9FAD)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🌿</div>
          <div style={{ fontWeight:800, fontSize:14, color:"#0D6B6E" }}>PhysioPortal</div>
        </div>
        {alertCount>0 && <span style={{ background:"#DC2626", color:"white", borderRadius:"99px", fontSize:11, fontWeight:700, padding:"2px 8px", marginRight:8 }}>{alertCount} alerts</span>}
      </div>

      {/* Content */}
      <div style={{ marginLeft:220, flex:1, minHeight:"100vh", overflowX:"hidden" }}>
        {/* Mobile bottom nav */}
        <div className="no-print" style={{ position:"fixed", bottom:0, left:0, right:0, background:"white", borderTop:"1px solid #E2E8F0", display:"none", zIndex:60, padding:"6px 4px" }} id="bottom-nav">
          {navItems.map(n => (
            <button key={n.key} onClick={()=>setPage(n.key)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"6px 4px", border:"none", cursor:"pointer", background:"transparent", fontFamily:"'Outfit',sans-serif" }}>
              <span style={{ fontSize:20 }}>{n.icon}</span>
              <span style={{ fontSize:9, fontWeight:600, color: page===n.key?"#0D6B6E":"#94A3B8" }}>{n.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {page === "dashboard" && <Dashboard staff={staff} equipment={equipment} audits={audits} />}
        {page === "staff" && <StaffPage staff={staff} setStaff={setStaff} />}
        {page === "documents" && <DocumentsPage docs={docs} setDocs={setDocs} />}
        {page === "compliance" && <CompliancePage equipment={equipment} setEquipment={setEquipment} audits={audits} setAudits={setAudits} hsRecords={hsRecords} setHsRecords={setHsRecords} />}
        {page === "accreditation" && <AccreditationPage standards={standards} setStandards={setStandards} />}
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width:768px) {
          #bottom-nav { display:flex !important; }
          #mobile-bar { display:flex !important; }
          div[style*="marginLeft:220"] { margin-left:0 !important; padding-top:56px; padding-bottom:70px; }
          div[style*="width:220"] { display:none !important; }
        }
      `}</style>
    </div>
  );
}
