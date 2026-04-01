import { useState, useRef, useCallback } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  teal:"#0F6E56", tealL:"#E1F5EE", red:"#E24B4A", redL:"#FCEBEB",
  amber:"#BA7517", amberL:"#FAEEDA", green:"#3B6D11", greenL:"#EAF3DE",
  blue:"#185FA5", blueL:"#E6F1FB", gray:"#5F5E5A", grayL:"#F1EFE8",
  grayXL:"#FAFAF8", border:"#e2e0d8", text:"#1a1a18", muted:"#6b6963",
  hint:"#9b9892", bg:"#f5f3ee", card:"#ffffff",
};

// ─── REAL LEGISLATION LINKS ───────────────────────────────────────────────────
const LEGISLATION = [
  { name:"Privacy Act 2020", url:"https://www.legislation.govt.nz/act/public/2020/0031/latest/LMS23223.html", desc:"Governs collection, use, storage and disclosure of personal information." },
  { name:"Children's Act 2014", url:"https://www.legislation.govt.nz/act/public/2014/0040/latest/DLM5501618.html", desc:"Obligations regarding safety checks for those working with children." },
  { name:"Health Information Privacy Code 2020", url:"https://www.privacy.org.nz/privacy-act-2020/codes-of-practice/hipc2020/", desc:"Rules for health agencies collecting and using health information." },
  { name:"Health Practitioners Competence Assurance Act 2003", url:"https://www.legislation.govt.nz/act/public/2003/0048/latest/DLM203312.html", desc:"Governs registration, APC and scope of practice for all health practitioners." },
  { name:"Health and Disability Commissioner Act 1994", url:"https://www.legislation.govt.nz/act/public/1994/0088/latest/DLM333584.html", desc:"Patient rights and complaints process — Code of Rights." },
  { name:"Code of Health & Disability Services Consumers' Rights", url:"https://www.hdc.org.nz/your-rights/about-the-code/code-of-health-and-disability-services-consumers-rights/", desc:"Ten rights of all health and disability consumers in New Zealand." },
  { name:"Health and Safety at Work Act 2015", url:"https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976660.html", desc:"H&S obligations for employers and employees. Alistair is H&S Officer." },
  { name:"PBNZ Code of Ethics and Professional Conduct", url:"https://www.physiotherapy.org.nz/professional-standards/code-of-ethics", desc:"Professional conduct standards for all NZ physiotherapists." },
  { name:"PBNZ Cultural Competence Standard", url:"https://www.physioboard.org.nz/registration/cultural-competence", desc:"Māori cultural safety and competence requirements." },
  { name:"ACC8310 Partnering with ACC", url:"https://www.acc.co.nz/assets/provider/acc8310-allied-health-services-agreement.pdf", desc:"ACC Allied Health Services Contract — clinical director, in-service and audit standards." },
  { name:"ACC1625 Māori Cultural Competency", url:"https://www.acc.co.nz/assets/provider/acc1625-maori-cultural-competency-standard.pdf", desc:"ACC Māori cultural competency standard for providers." },
  { name:"Employment Relations Act 2000", url:"https://www.legislation.govt.nz/act/public/2000/0024/latest/DLM58317.html", desc:"Employment agreements, disputes, good faith obligations, restructuring." },
];

// ─── CLINICS ──────────────────────────────────────────────────────────────────
const CLINICS = [
  { id:"pakuranga", name:"Pakuranga — Lloyd Elsmore", short:"Pakuranga", icon:"🏊", note:"Lloyd Elsmore Leisure Centre · Since 2002 · Pool & gym access" },
  { id:"flatbush",  name:"Flat Bush",                short:"Flat Bush", icon:"🏥", note:"Flat Bush clinic" },
  { id:"titirangi", name:"Titirangi Village",         short:"Titirangi", icon:"🌿", note:"Below Titirangi Medical Centre · Since 2004 · On-site gym" },
  { id:"panmure",   name:"Panmure — Lagoon Pools",    short:"Panmure",  icon:"🏊", note:"Inside Lagoon Pools complex · Hydrotherapy access" },
  { id:"schools",   name:"Howick & Edgewater College",short:"Schools",  icon:"🏫", note:"School term only · Hakinakina Hauora Health Services" },
];

// ─── COMPLIANCE ITEMS (universal — everyone needs these) ─────────────────────
const CORE_CERTS = [
  { key:"apc",       label:"APC 2025/2026",                  renews:"Annual — 1 April",  required:true },
  { key:"firstaid",  label:"First Aid / CPR",                renews:"Every 2 years",     required:true },
  { key:"cultural",  label:"Cultural Competency (Māori)",    renews:"Annual",            required:true },
  { key:"contract",  label:"Employment Agreement / Contract",renews:"One-off",           required:true },
  { key:"jd",        label:"Job Description",                renews:"One-off",           required:true },
  { key:"orientation",label:"Orientation checklist",         renews:"One-off",           required:true },
  { key:"peerreview",label:"Peer Review",                    renews:"Annual",            required:false },
  { key:"appraisal", label:"Performance Appraisal",          renews:"Annual",            required:false },
  { key:"pnz",       label:"PNZ Membership",                 renews:"Annual",            required:false },
];

// ─── STAFF ────────────────────────────────────────────────────────────────────
const STAFF = {
  jade:     { name:"Jade Warren",        ini:"JW", color:"#0a3d2e", title:"Owner / Director · Physiotherapist",         clinics:["pakuranga","flatbush","titirangi","panmure"], type:"Owner",          bio:"Founded Total Body Physio in 2000. Physiotherapist and director overseeing all clinics.", info:[["Role","Owner / Director"],["Clinics","All locations"]] },
  alistair: { name:"Alistair Burgess",   ini:"AB", color:"#0F6E56", title:"Senior Physiotherapist · Clinical Director · H&S Officer", clinics:["pakuranga","schools"], type:"Physiotherapist", bio:"M.Phty, B.App.Sc (Exercise & Sports Science), NZRP. 8+ years in private practice. Specialist in Strength Training, Movement Assessment, Shoulder & Core Rehabilitation. Former NZ U19 rugby.", info:[["Role","Senior Physiotherapist"],["Additional roles","Clinical Director · H&S Officer"],["Qualification","M.Phty, B.App.Sc, NZRP"],["Registration","70-14433 / HPI: 29CMBK"],["Started","24 October 2023"]] },
  timothy:  { name:"Timothy Keung",      ini:"TK", color:"#185FA5", title:"Physiotherapist",                            clinics:["pakuranga","titirangi","panmure"],            type:"Contractor",     bio:"Fluent in Mandarin, Cantonese, and English. Works across Auckland locations. Pursuing postgraduate study in acupuncture.", info:[["Role","Physiotherapist"],["Type","Contractor"],["Languages","Mandarin, Cantonese, English"]] },
  hans:     { name:"Hans Vermeulen",     ini:"HV", color:"#533AB7", title:"Physiotherapist · Clinic Lead",              clinics:["titirangi"],                                 type:"Contractor",     bio:"Nearly 20 years with Total Body Physio. Clinic lead at Titirangi.", info:[["Role","Physiotherapist · Clinic Lead"],["Type","Contractor"],["Tenure","~20 years"],["Clinic","Titirangi Village"]] },
  dylan:    { name:"Dylan Connolly",     ini:"DC", color:"#D85A30", title:"Physiotherapist",                            clinics:["pakuranga"],                                 type:"Physiotherapist",bio:"Manual therapy specialist. Employee from December 2025.", info:[["Role","Physiotherapist"],["Type","Employee"],["Started","December 2025"]] },
  ibrahim:  { name:"Ibrahim Al-Jumaily", ini:"IA", color:"#1D9E75", title:"Physiotherapist · New graduate",             clinics:["pakuranga","flatbush"],                       type:"Physiotherapist",bio:"NZ-trained physiotherapist, born and raised in South East Auckland. Strong interest in movement quality and injury prevention.", info:[["Role","Physiotherapist"],["Level","New graduate"],["Clinics","Pakuranga · Flat Bush"]] },
  isabella: { name:"Isabella Yang",      ini:"IY", color:"#D4537E", title:"Physiotherapist",                            clinics:["pakuranga","flatbush"],                       type:"Physiotherapist",bio:"Otago University physio graduate. Grew up locally, attended Macleans College. Hands-on techniques and exercise-based treatment.", info:[["Role","Physiotherapist"],["Type","Employee"],["Qualification","BPhty — University of Otago"],["Started","17 June 2024"]] },
  gwenne:   { name:"Gwenne Manares",     ini:"GM", color:"#639922", title:"Physiotherapist",                            clinics:["panmure"],                                   type:"Contractor",     bio:"Physiotherapist at Total Body Physio Panmure, inside the Lagoon Pools complex.", info:[["Role","Physiotherapist"],["Type","Contractor"],["Clinic","Panmure — Lagoon Pools"]] },
};

// ─── ORIENTATION SECTIONS ─────────────────────────────────────────────────────
const ORI_SECTIONS = [
  { title:"Documents read & understood", items:["Privacy Act 2020","Children's Act 2014","Health Information Privacy Code 2020","Health Practitioners Competence Assurance Act 2003","Health and Disability Commissioner Act 1994","Code of Health and Disability Services Consumers' Rights","Health and Safety at Work Act 2015","PBNZ Code of Ethics and Professional Conduct","PBNZ Māori Cultural Safety and Competence Standard","PBNZ Cultural Competence Standard","PBNZ Sexual and Emotional Boundaries Standard","ACC8310 Partnering with ACC","ACC1625 Māori Cultural Competency","TBP Policies and Procedures Manual","TBP Business Plan","TBP Health and Safety Plan"] },
  { title:"Clinic — tour & introduction", items:["Introduction to all staff","Waiting rooms and treatment areas shown","Cliniko notes system demonstrated","Toilets located","Kitchen area shown"] },
  { title:"Health & safety emergency procedures", items:["Fire exits, alarms and extinguisher locations known","Evacuation procedure and meeting areas understood","Incident reporting for patients explained","Incident reporting for staff explained","Electrical mains location known","First aid kit location known"] },
  { title:"Administration", items:["CPR certificate seen and copy in file","APC seen and copy in file","Employee Information sheet completed","Physio registration number recorded","Performance review dates set","CPD goals set and hours assessed","Contract signed, dated and in file"] },
  { title:"Clinic policy & procedures", items:["P&P manuals location confirmed (Google Drive)","Phone list and contact numbers location confirmed","Patient consent and confidentiality understood","Receiving and making calls — process understood","Privacy Act 2020 read","Health and Safety Act read","P&P in orientation folder read"] },
  { title:"Pool complex (Pakuranga)", items:["Reception area and reception staff met","First aid room located","Manager introduced","Fire exits and extinguishers located","Gym and gym staff met","Staff toilets and showers located","Staff room located","Car parking explained"] },
];

// ─── AUDIT FORMS ──────────────────────────────────────────────────────────────
const AUDIT_FORMS = {
  hygiene: { title:"Hygiene & Cleanliness Audit", icon:"🧼", sections:[
    { title:"Treatment rooms", items:["Treatment tables wiped between every patient","Paper/pillow slip changed between every patient","Floors clean and free of debris","All surfaces disinfected","Waste bins emptied and lined","No clutter on benches or work surfaces"] },
    { title:"Equipment", items:["All equipment wiped down after use","Ultrasound heads cleaned after each use","Exercise equipment clean and stored correctly","Single-use items disposed of immediately"] },
    { title:"Hand hygiene", items:["Hand sanitiser at each treatment room entrance","Staff following hand hygiene protocol","Soap and paper towels at sinks"] },
    { title:"Common areas", items:["Waiting room clean","Reception desk clean and tidy","Kitchen/staff room clean","Staff toilets clean and stocked"] },
    { title:"PPE & infection control", items:["PPE supplies stocked (gloves, masks)","Clinical waste disposed of correctly","No expired single-use items in clinical areas"] },
  ]},
  clinical_notes: { title:"Clinical Notes Audit", icon:"📋", sections:[
    { title:"Documentation standards", items:["Notes completed on day of treatment","SOATAP format used consistently","Legible and professional language used","No blank fields in required sections"] },
    { title:"Consent & patient information", items:["Informed consent documented at first visit","Patient details accurate and up to date","Privacy statement signed","ACC claim details correct"] },
    { title:"Treatment planning", items:["Initial assessment findings documented","Clinical diagnosis recorded","Treatment plan documented","Measurable goals set with patient"] },
    { title:"Progress & outcomes", items:["Progress notes reflect treatment plan","Outcome measures recorded","Any change in condition noted","Referrals documented where made"] },
    { title:"ACC compliance", items:["16th-visit review completed where required","Discharge summary sent to referrer","ACC forms completed accurately","Treatment codes correct"] },
  ]},
  hs_audit: { title:"H&S Workplace Audit", icon:"⚠️", sections:[
    { title:"Fire safety", items:["Fire exits clear and unobstructed","Fire exit signage visible and in good condition","Fire extinguishers present, tagged and in date","Evacuation plan posted in visible location","All staff aware of evacuation procedure"] },
    { title:"First aid", items:["First aid kit present and accessible","First aid kit contents checked and in date","At least one staff member holds current first aid cert","First aid kit location known to all staff"] },
    { title:"General safety", items:["No trip hazards in clinical or public areas","Floors dry and non-slip or clearly signed","Adequate lighting in all areas","Emergency contact list posted","Electrical mains clearly labelled and accessible"] },
    { title:"Equipment safety", items:["All electrical equipment tested and tagged","No damaged cords, plugs or sockets","Equipment stored safely when not in use","Service records up to date"] },
    { title:"Staff & workplace", items:["All staff have read and signed H&S policy","Incident reporting process understood by all","Hazard register up to date","PPE available and in good condition"] },
  ]},
  equipment: { title:"Equipment & Electrical Check", icon:"⚡", sections:[
    { title:"Testing & tagging", items:["All portable appliances have current test tag","Test tag dates within 12-month period","No equipment with expired/missing tags in use","Switchboard clearly labelled"] },
    { title:"Clinical equipment", items:["Ultrasound machines functioning correctly","TENS/IFC machines functioning correctly","Exercise equipment safe and functional","Traction equipment checked (if applicable)"] },
    { title:"Treatment room equipment", items:["Treatment tables in good condition","Pillow frames and headrests secure","Step stools stable","Sharps disposal containers not over-filled"] },
    { title:"Records", items:["Equipment register up to date","Service provider details recorded","Last service date recorded for each major item","Next service date scheduled"] },
  ]},
};

const PAST_STAFF = ["Alice","Aoife","Vishwali","Jean Hong","Alonzo","Sasha McBain","Steven Gray","(2 further records)"];

// ─── FILE STORAGE HELPERS ─────────────────────────────────────────────────────
function storageKey(staffId, certKey) { return `cert_${staffId}_${certKey}`; }

function saveFile(staffId, certKey, fileData) {
  try { localStorage.setItem(storageKey(staffId, certKey), JSON.stringify(fileData)); return true; }
  catch(e) { if (e.name === "QuotaExceededError") { alert("Storage full — please remove older files first."); } return false; }
}

function loadFile(staffId, certKey) {
  try { const d = localStorage.getItem(storageKey(staffId, certKey)); return d ? JSON.parse(d) : null; }
  catch { return null; }
}

function removeFile(staffId, certKey) {
  try { localStorage.removeItem(storageKey(staffId, certKey)); } catch {}
}

// ─── BASE UI ──────────────────────────────────────────────────────────────────
function Pill({ s, label }) {
  const p = { expired:{ bg:"#FCEBEB",fg:"#A32D2D" }, ok:{ bg:"#EAF3DE",fg:"#3B6D11" }, pending:{ bg:"#FAEEDA",fg:"#BA7517" }, na:{ bg:"#F1EFE8",fg:"#5F5E5A" }, due:{ bg:"#E6F1FB",fg:"#185FA5" } }[s] || { bg:C.grayL,fg:C.gray };
  const def = { expired:"Expired ⚠", ok:"Done ✓", pending:"Needed", na:"N/A", due:"Action" };
  return <span style={{ background:p.bg,color:p.fg,fontSize:11,padding:"3px 9px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap",display:"inline-block" }}>{label ?? def[s]}</span>;
}

function Chip({ color="teal", children }) {
  const m = { teal:{bg:"#E1F5EE",fg:C.teal},blue:{bg:C.blueL,fg:C.blue},amber:{bg:C.amberL,fg:C.amber},gray:{bg:C.grayL,fg:C.gray} }[color] || {bg:C.grayL,fg:C.gray};
  return <span style={{ background:m.bg,color:m.fg,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500 }}>{children}</span>;
}

function Card({ children, style={} }) { return <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1.25rem",marginBottom:"1rem",...style }}>{children}</div>; }

function Alert({ type="amber", title, children }) {
  const m = { red:{bg:"#FCEBEB",b:C.red},amber:{bg:C.amberL,b:C.amber},green:{bg:"#EAF3DE",b:C.teal},blue:{bg:C.blueL,b:C.blue} }[type];
  return <div style={{ background:m.bg,borderLeft:`3px solid ${m.b}`,borderRadius:6,padding:"0.75rem 1rem",marginBottom:"0.875rem" }}><div style={{ fontSize:13,fontWeight:600,marginBottom:2 }}>{title}</div><div style={{ fontSize:12,color:C.muted,lineHeight:1.6 }}>{children}</div></div>;
}

function Btn({ onClick, children, outline=false, danger=false, style={} }) {
  const bg = danger ? C.red : outline ? "white" : C.teal;
  const fg = outline ? (danger ? C.red : C.teal) : "white";
  const border = outline ? `1px solid ${danger ? C.red : C.teal}` : "none";
  return <button onClick={onClick} style={{ background:bg,color:fg,border,borderRadius:6,padding:"7px 14px",fontSize:13,fontWeight:500,cursor:"pointer",...style }}>{children}</button>;
}

function Input({ label, value, onChange, type="text", placeholder="" }) {
  return <div style={{ marginBottom:"0.625rem" }}><label style={{ fontSize:12,color:C.muted,display:"block",marginBottom:3 }}>{label}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box" }}/></div>;
}

function Textarea({ label, value, onChange, rows=3 }) {
  return <div style={{ marginBottom:"0.625rem" }}><label style={{ fontSize:12,color:C.muted,display:"block",marginBottom:3 }}>{label}</label><textarea value={value} onChange={onChange} rows={rows} style={{ width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,resize:"vertical",boxSizing:"border-box" }}/></div>;
}

function SLabel({ children }) { return <div style={{ fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",color:C.muted,marginBottom:"0.625rem",fontWeight:500 }}>{children}</div>; }
function Divider() { return <div style={{ borderTop:`1px solid ${C.border}`,margin:"0.875rem 0" }}/>; }

// ─── FILE VIEWER MODAL ────────────────────────────────────────────────────────
function FileViewer({ file, onClose }) {
  if (!file) return null;
  const isImage = file.fileType && file.fileType.startsWith("image/");
  const isPdf = file.fileType === "application/pdf";
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.card,borderRadius:12,overflow:"hidden",maxWidth:800,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column" }}>
        <div style={{ background:C.teal,padding:"1rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ color:"white",fontWeight:600,fontSize:14 }}>{file.fileName}</div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <span style={{ color:"rgba(255,255,255,0.7)",fontSize:11 }}>Uploaded {file.uploadedDate}</span>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>
        <div style={{ flex:1,overflow:"auto",padding:"1.25rem",display:"flex",alignItems:"center",justifyContent:"center",minHeight:300 }}>
          {isImage && <img src={file.dataUrl} alt={file.fileName} style={{ maxWidth:"100%",maxHeight:"70vh",borderRadius:6,objectFit:"contain" }}/>}
          {isPdf && <iframe src={file.dataUrl} style={{ width:"100%",height:"65vh",border:"none",borderRadius:6 }} title={file.fileName}/>}
          {!isImage && !isPdf && <div style={{ textAlign:"center",color:C.muted }}><div style={{ fontSize:48,marginBottom:"0.75rem" }}>📄</div><div style={{ fontSize:14 }}>{file.fileName}</div><div style={{ fontSize:12,color:C.muted,marginTop:4 }}>Preview not available for this file type</div><a href={file.dataUrl} download={file.fileName} style={{ display:"inline-block",marginTop:"1rem",color:C.teal,fontSize:13,fontWeight:500 }}>⬇ Download file</a></div>}
        </div>
        <div style={{ padding:"0.75rem 1.25rem",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:12,color:C.muted }}>{file.fileName} · {file.uploadedDate}</span>
          <a href={file.dataUrl} download={file.fileName} style={{ color:C.teal,fontSize:12,fontWeight:500,textDecoration:"none" }}>⬇ Download</a>
        </div>
      </div>
    </div>
  );
}

// ─── CERT UPLOAD CARD ─────────────────────────────────────────────────────────
function CertCard({ staffId, cert, onViewFile }) {
  const fileInputRef = useRef();
  const [file, setFile] = useState(() => loadFile(staffId, cert.key));
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    // Warn if file is large
    if (f.size > 3 * 1024 * 1024) { alert("File is over 3MB. Please use a smaller image or compress it first."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const fileData = { fileName:f.name, dataUrl:ev.target.result, fileType:f.type, uploadedDate:new Date().toLocaleDateString("en-NZ"), certKey:cert.key };
      const saved = saveFile(staffId, cert.key, fileData);
      if (saved) setFile(fileData);
      setUploading(false);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function handleRemove() {
    if (!window.confirm("Remove this uploaded file?")) return;
    removeFile(staffId, cert.key);
    setFile(null);
  }

  const status = file ? "ok" : cert.required ? "pending" : "na";
  const bg = { ok:"#EAF3DE", pending:cert.required?"#FAEEDA":"#F1EFE8", na:"#F1EFE8" }[status];
  const bd = { ok:"#c0dd97", pending:cert.required?"#fac775":C.border, na:C.border }[status];

  const isImage = file && file.fileType && file.fileType.startsWith("image/");
  const isPdf = file && file.fileType === "application/pdf";

  return (
    <div style={{ background:bg, border:`1px solid ${bd}`, borderRadius:8, padding:"10px 12px", marginBottom:6 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        {/* Thumbnail */}
        {isImage && (
          <div onClick={() => onViewFile(file)} style={{ width:44, height:44, borderRadius:6, overflow:"hidden", flexShrink:0, cursor:"pointer", border:`1px solid ${C.border}` }}>
            <img src={file.dataUrl} alt="cert" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </div>
        )}
        {isPdf && (
          <div onClick={() => onViewFile(file)} style={{ width:44, height:44, borderRadius:6, background:C.redL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer", border:`1px solid ${C.border}`, fontSize:20 }}>📄</div>
        )}

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ fontWeight:500, fontSize:13, color:C.text }}>{cert.label}</div>
            <Pill s={status} label={file ? "On file ✓" : cert.required ? "Required" : "Optional"} />
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{cert.renews}</div>
          {file && <div style={{ fontSize:11, color:C.muted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.fileName} · {file.uploadedDate}</div>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
        {file ? (
          <>
            <button onClick={() => onViewFile(file)} style={{ fontSize:11, padding:"4px 12px", borderRadius:20, background:C.teal, border:"none", color:"white", cursor:"pointer", fontWeight:500 }}>👁 View</button>
            <button onClick={() => { fileInputRef.current.click(); }} style={{ fontSize:11, padding:"4px 12px", borderRadius:20, background:"white", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer" }}>Replace</button>
            <button onClick={handleRemove} style={{ fontSize:11, padding:"4px 12px", borderRadius:20, background:"white", border:`1px solid #f5c1c1`, color:C.red, cursor:"pointer" }}>Remove</button>
          </>
        ) : (
          <>
            <button onClick={() => fileInputRef.current.click()} style={{ fontSize:11, padding:"4px 12px", borderRadius:20, background:cert.required?C.teal:"white", border:cert.required?"none":`1px solid ${C.border}`, color:cert.required?"white":C.muted, cursor:"pointer", fontWeight:cert.required?500:400 }}>📷 Photo / file</button>
          </>
        )}
        {uploading && <span style={{ fontSize:11, color:C.muted }}>Uploading…</span>}
      </div>

      {/* Hidden file input — accepts images, PDFs, and camera */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx" style={{ display:"none" }} onChange={handleFileChange} />
    </div>
  );
}

// ─── COMPLIANCE SUMMARY for a staff member ───────────────────────────────────
function staffCompliance(staffId) {
  const required = CORE_CERTS.filter(c => c.required);
  const done = required.filter(c => !!loadFile(staffId, c.key)).length;
  return { done, total: required.length, pct: Math.round((done / required.length) * 100) };
}

// ─── ORIENTATION CHECKLIST ────────────────────────────────────────────────────
function OrientationModal({ staffId, onClose }) {
  const s = STAFF[staffId];
  const storKey = `orientation_${staffId}`;
  const [checks, setChecks] = useState(() => { try { return JSON.parse(localStorage.getItem(storKey) || "{}"); } catch { return {}; } });
  const [sig, setSig] = useState("");
  const [done, setDone] = useState(() => !!localStorage.getItem(`orientation_done_${staffId}`));
  const [doneDate] = useState(() => localStorage.getItem(`orientation_date_${staffId}`) || "");
  const allItems = ORI_SECTIONS.flatMap(sec => sec.items);
  const checked = Object.values(checks).filter(Boolean).length;
  const pct = Math.round((checked / allItems.length) * 100);

  function toggle(key) {
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    try { localStorage.setItem(storKey, JSON.stringify(next)); } catch {}
  }

  function submit() {
    if (checked < allItems.length) { alert(`${allItems.length - checked} items not yet ticked. Please complete all items.`); return; }
    if (!sig.trim()) { alert("Please type your full name to sign."); return; }
    const date = new Date().toLocaleDateString("en-NZ");
    try { localStorage.setItem(`orientation_done_${staffId}`, "true"); localStorage.setItem(`orientation_date_${staffId}`, date); } catch {}
    // Also save as a cert file record
    saveFile(staffId, "orientation", { fileName:`Orientation_${s.name.replace(/ /g,"_")}_signed.txt`, dataUrl:"data:text/plain;base64," + btoa(`Orientation completed by ${s.name}\nSigned: ${sig}\nDate: ${date}\nItems completed: ${checked}/${allItems.length}`), fileType:"text/plain", uploadedDate:date, certKey:"orientation" });
    setDone(true);
  }

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.card,borderRadius:12,width:"100%",maxWidth:680,marginBottom:"2rem" }}>
        <div style={{ background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div><div style={{ color:"white",fontSize:16,fontWeight:600 }}>Orientation Checklist</div><div style={{ color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:2 }}>{s.name}</div></div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ textAlign:"right" }}><div style={{ color:"white",fontSize:22,fontWeight:700 }}>{pct}%</div><div style={{ color:"rgba(255,255,255,0.7)",fontSize:11 }}>{checked}/{allItems.length}</div></div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>
        {done ? (
          <div style={{ padding:"2rem",textAlign:"center" }}>
            <div style={{ fontSize:52,marginBottom:"0.75rem" }}>✅</div>
            <div style={{ fontSize:16,fontWeight:600 }}>Orientation complete</div>
            <div style={{ fontSize:13,color:C.muted,marginTop:4 }}>Signed by {s.name} · {doneDate}</div>
            <div style={{ marginTop:"1.5rem" }}><Btn outline onClick={onClose}>Close</Btn></div>
          </div>
        ) : (
          <div style={{ padding:"1.25rem 1.5rem",maxHeight:"72vh",overflowY:"auto" }}>
            <div style={{ height:8,background:C.grayL,borderRadius:4,overflow:"hidden",marginBottom:"1.25rem" }}>
              <div style={{ height:"100%",borderRadius:4,background:pct===100?C.teal:C.amber,width:`${pct}%`,transition:"width 0.3s" }}/>
            </div>
            {ORI_SECTIONS.map((sec, si) => (
              <div key={si} style={{ marginBottom:"1.25rem" }}>
                <div style={{ fontSize:13,fontWeight:600,marginBottom:"0.5rem",paddingBottom:"0.375rem",borderBottom:`1px solid ${C.border}` }}>{sec.title}</div>
                {sec.items.map((item, ii) => {
                  const key = `${si}-${ii}`;
                  const ticked = !!checks[key];
                  return (
                    <div key={ii} onClick={() => toggle(key)} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",cursor:"pointer",borderBottom:`1px solid ${C.grayL}` }}>
                      <div style={{ width:20,height:20,borderRadius:4,border:`2px solid ${ticked?C.teal:C.border}`,background:ticked?C.teal:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                        {ticked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span style={{ fontSize:13,color:ticked?C.muted:C.text,textDecoration:ticked?"line-through":"none" }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{ background:C.grayXL,borderRadius:8,padding:"1rem",marginTop:"0.5rem",border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:13,fontWeight:600,marginBottom:8 }}>Declaration & digital signature</div>
              <div style={{ fontSize:12,color:C.muted,marginBottom:"0.875rem",lineHeight:1.6 }}>I confirm that I have read all the documents listed above and understood them to the best of my ability. I understand that should I have any queries or concerns, I must discuss these with the Administrative Manager prior to signing.</div>
              <Input label="Type your full name to sign" value={sig} onChange={e => setSig(e.target.value)} placeholder={s.name}/>
              <div style={{ fontSize:11,color:C.muted,marginBottom:"0.875rem" }}>Date: {new Date().toLocaleDateString("en-NZ")}</div>
              <Btn onClick={submit} style={{ opacity: checked < allItems.length || !sig.trim() ? 0.5 : 1 }}>✓ Submit signed checklist</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AUDIT FORM ───────────────────────────────────────────────────────────────
function AuditModal({ type, onClose, onComplete }) {
  const form = AUDIT_FORMS[type];
  const allItems = form.sections.flatMap(s => s.items);
  const [checks, setChecks] = useState({});
  const [itemNotes, setItemNotes] = useState({});
  const [meta, setMeta] = useState({ clinic:CLINICS[0].short, auditor:"", date:new Date().toISOString().split("T")[0] });
  const [overallNotes, setOverallNotes] = useState("");
  const passed = Object.values(checks).filter(v => v === "pass").length;
  const failed = Object.values(checks).filter(v => v === "fail").length;
  const na = Object.values(checks).filter(v => v === "na").length;
  const answered = passed + failed + na;
  const pct = Math.round((answered / allItems.length) * 100);

  function submit() {
    if (!meta.auditor.trim()) { alert("Please enter the auditor name."); return; }
    if (answered < allItems.length && !window.confirm(`${allItems.length - answered} items unanswered. Submit anyway?`)) return;
    const failNotes = Object.entries(itemNotes).filter(([, v]) => v).map(([k, v]) => `• ${k}: ${v}`).join("\n");
    onComplete({ id:Date.now(), type, title:form.title, icon:form.icon, clinic:meta.clinic, auditor:meta.auditor, date:meta.date, passed, failed, na, total:allItems.length, outcome:failed===0?"Passed":`${failed} issue${failed>1?"s":""} found`, notes:(failNotes + (overallNotes ? `\nOverall: ${overallNotes}` : "")).trim() });
  }

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.card,borderRadius:12,width:"100%",maxWidth:720,marginBottom:"2rem" }}>
        <div style={{ background:C.teal,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div><div style={{ color:"white",fontSize:16,fontWeight:600 }}>{form.icon} {form.title}</div></div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ textAlign:"right" }}><div style={{ color:"white",fontSize:22,fontWeight:700 }}>{pct}%</div><div style={{ color:"rgba(255,255,255,0.7)",fontSize:11 }}>{answered}/{allItems.length}</div></div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>
        <div style={{ padding:"1.25rem 1.5rem",maxHeight:"75vh",overflowY:"auto" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"1.25rem" }}>
            {[["Clinic","clinic","select",[...CLINICS.map(c=>c.short)]],["Auditor","auditor","text",null],["Date","date","date",null]].map(([label,key,type,opts]) => (
              <div key={key}>
                <label style={{ fontSize:12,color:C.muted,display:"block",marginBottom:3 }}>{label}</label>
                {type==="select" ? (
                  <select value={meta[key]} onChange={e => setMeta({...meta,[key]:e.target.value})} style={{ width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={type} value={meta[key]} onChange={e => setMeta({...meta,[key]:e.target.value})} style={{ width:"100%",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.grayXL,boxSizing:"border-box" }}/>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:16,marginBottom:"0.875rem",fontSize:12,color:C.muted,alignItems:"center" }}>
            <span style={{ fontWeight:500,color:C.text }}>For each item:</span>
            <span style={{ color:"#3B6D11",fontWeight:600 }}>✓ Pass</span>
            <span style={{ color:C.red,fontWeight:600 }}>✗ Fail</span>
            <span style={{ color:C.gray,fontWeight:600 }}>— N/A</span>
          </div>
          {form.sections.map((sec, si) => (
            <div key={si} style={{ marginBottom:"1.5rem" }}>
              <div style={{ fontSize:13,fontWeight:600,padding:"0.5rem 0.75rem",background:C.grayXL,borderRadius:6,marginBottom:"0.5rem",borderLeft:`3px solid ${C.teal}` }}>{sec.title}</div>
              {sec.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const val = checks[key];
                return (
                  <div key={ii} style={{ borderBottom:`1px solid ${C.grayL}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0" }}>
                      <span style={{ flex:1,fontSize:13 }}>{item}</span>
                      <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                        {[["pass","✓","#EAF3DE","#3B6D11"],["fail","✗","#FCEBEB",C.red],["na","N/A",C.grayL,C.gray]].map(([v,lbl,bg,fg]) => (
                          <button key={v} onClick={() => setChecks(p => ({...p,[key]:p[key]===v?undefined:v}))} style={{ fontSize:11,padding:"3px 9px",borderRadius:4,border:`1.5px solid ${val===v?fg:C.border}`,background:val===v?bg:"white",color:val===v?fg:C.muted,cursor:"pointer",fontWeight:val===v?600:400 }}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                    {val==="fail" && <div style={{ paddingBottom:8 }}><input placeholder="Issue / action required…" value={itemNotes[key]||""} onChange={e => setItemNotes(p=>({...p,[key]:e.target.value}))} style={{ width:"100%",padding:"5px 8px",border:`1px solid ${C.red}`,borderRadius:5,fontSize:12,background:"#FCEBEB",boxSizing:"border-box" }}/></div>}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ background:C.grayXL,borderRadius:8,padding:"1rem",border:`1px solid ${C.border}` }}>
            <div style={{ display:"flex",gap:20,marginBottom:"0.875rem" }}>
              <span style={{ fontSize:13 }}><b style={{ color:"#3B6D11" }}>{passed}</b> passed</span>
              <span style={{ fontSize:13 }}><b style={{ color:C.red }}>{failed}</b> failed</span>
              <span style={{ fontSize:13 }}><b style={{ color:C.gray }}>{na}</b> N/A</span>
              <span style={{ fontSize:13,color:C.muted }}>{allItems.length-answered} unanswered</span>
            </div>
            <Textarea label="Overall notes / actions" value={overallNotes} onChange={e=>setOverallNotes(e.target.value)} rows={2}/>
            <Btn onClick={submit}>Submit audit record</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE MODAL ─────────────────────────────────────────────────────────────
function ProfileModal({ id, onClose }) {
  const [tab, setTab] = useState("certs");
  const [showOri, setShowOri] = useState(false);
  const [viewFile, setViewFile] = useState(null);
  const [, forceUpdate] = useState(0);
  if (!id) return null;
  const s = STAFF[id];
  const comp = staffCompliance(id);

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"1.5rem 1rem",overflowY:"auto" }}>
        <div onClick={e => e.stopPropagation()} style={{ background:C.card,borderRadius:12,width:"100%",maxWidth:700,overflow:"hidden",marginBottom:"2rem" }}>
          {/* Header */}
          <div style={{ background:s.color,padding:"1.5rem",display:"flex",alignItems:"center",gap:16 }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.25)",border:"2px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"white",flexShrink:0 }}>{s.ini}</div>
            <div style={{ flex:1 }}>
              <div style={{ color:"white",fontSize:18,fontWeight:600 }}>{s.name}</div>
              <div style={{ color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:3 }}>{s.title}</div>
              <div style={{ display:"flex",gap:5,marginTop:6,flexWrap:"wrap",alignItems:"center" }}>
                {s.clinics.map(c => { const cl = CLINICS.find(x=>x.id===c); return cl ? <span key={c} style={{ background:"rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.9)",fontSize:10,padding:"2px 8px",borderRadius:20 }}>{cl.short}</span> : null; })}
                <span style={{ background:`rgba(255,255,255,${comp.pct===100?0.35:0.15})`,color:"white",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>{comp.done}/{comp.total} required ✓</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:18,flexShrink:0 }}>✕</button>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex",borderBottom:`1px solid ${C.border}`,background:C.grayXL,overflowX:"auto" }}>
            {[["certs","📋 Compliance"],["profile","👤 Profile"],["orientation","✓ Orientation"]].map(([t,l]) => (
              <div key={t} onClick={() => setTab(t)} style={{ padding:"9px 14px",fontSize:12,color:tab===t?C.teal:C.muted,cursor:"pointer",borderBottom:tab===t?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:tab===t?500:400,whiteSpace:"nowrap" }}>{l}</div>
            ))}
          </div>
          {/* Body */}
          <div style={{ padding:"1.25rem 1.5rem",maxHeight:"60vh",overflowY:"auto" }}>
            {tab==="certs" && (
              <div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.875rem" }}>
                  <SLabel>Required certifications — tap to upload or view</SLabel>
                  <div style={{ height:6,width:120,background:C.grayL,borderRadius:3,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:comp.pct===100?C.teal:comp.pct>50?C.amber:C.red,width:`${comp.pct}%`,borderRadius:3 }}/>
                  </div>
                </div>
                {CORE_CERTS.map(cert => (
                  <CertCard key={cert.key} staffId={id} cert={cert} onViewFile={f => setViewFile(f)}/>
                ))}
                <div style={{ fontSize:11,color:C.muted,marginTop:"0.5rem",lineHeight:1.5 }}>
                  📷 Tap "Photo / file" to take a photo or upload from your phone. Accepted: photos, PDFs, Word docs. Files saved locally in the app.
                </div>
              </div>
            )}
            {tab==="profile" && (
              <div>
                {s.bio && <div style={{ fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:"1.25rem",padding:"0.75rem 1rem",background:C.grayXL,borderRadius:8 }}>{s.bio}</div>}
                <SLabel>Details</SLabel>
                {s.info.map(([l,v]) => (
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13 }}>
                    <span style={{ color:C.muted }}>{l}</span><span style={{ fontWeight:500,textAlign:"right",maxWidth:"60%" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {tab==="orientation" && (
              <div>
                {localStorage.getItem(`orientation_done_${id}`) ? (
                  <Alert type="green" title="✅ Orientation completed">
                    Signed by {s.name} on {localStorage.getItem(`orientation_date_${id}`)}. The signed record is saved in the Compliance tab.
                  </Alert>
                ) : (
                  <Alert type="amber" title="Orientation not yet completed">
                    {s.name} needs to complete and sign the orientation checklist. All items must be ticked before the digital signature can be submitted.
                  </Alert>
                )}
                <Btn onClick={() => setShowOri(true)}>
                  {localStorage.getItem(`orientation_done_${id}`) ? "View / reopen checklist" : "Start orientation checklist →"}
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>
      {showOri && <OrientationModal staffId={id} onClose={() => { setShowOri(false); forceUpdate(n => n+1); }}/>}
      {viewFile && <FileViewer file={viewFile} onClose={() => setViewFile(null)}/>}
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const INIT_MEETINGS = [
  { id:1,date:"2025-11-15",clinic:"All clinics",topic:"Q4 staff meeting — H&S review, CPD updates",attendees:"Jade, Alistair, Hans, Timothy, Isabella",notes:"Discussed APC renewal cycle, updated first aid booking process." },
  { id:2,date:"2025-08-10",clinic:"Titirangi",topic:"In-service — shoulder rehab protocols",attendees:"Hans, Alistair",notes:"Hans led session. Reviewed UniSportsOrtho shoulder stabilisation phases." },
];
const INIT_AUDITS = [
  { id:1,date:"2025-12-01",type:"hs_audit",icon:"⚠️",title:"H&S Workplace Audit",clinic:"Pakuranga",auditor:"Alistair Burgess",passed:22,failed:1,na:0,total:23,outcome:"1 issue found",notes:"Minor: first aid kit expiry dates needed updating. Actioned same day." },
  { id:2,date:"2025-12-03",type:"hs_audit",icon:"⚠️",title:"H&S Workplace Audit",clinic:"Titirangi",auditor:"Alistair Burgess",passed:23,failed:0,na:0,total:23,outcome:"Passed",notes:"All clear." },
  { id:3,date:"2025-09-15",type:"equipment",icon:"⚡",title:"Equipment & Electrical Check",clinic:"Pakuranga",auditor:"Jade Warren",passed:15,failed:0,na:2,total:17,outcome:"Passed",notes:"2 items N/A. All test tags current." },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("owner");
  const [compTab, setCompTab] = useState("overview");
  const [mgmtTab, setMgmtTab] = useState("audits");
  const [docsTab, setDocsTab] = useState("contracts");
  const [meetings, setMeetings] = useState(INIT_MEETINGS);
  const [audits, setAudits] = useState(INIT_AUDITS);
  const [activeAudit, setActiveAudit] = useState(null);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [nm, setNm] = useState({ date:"",clinic:"All clinics",topic:"",attendees:"",notes:"" });
  const [, forceUpdate] = useState(0);

  // Trigger re-render when files are uploaded
  function refresh() { forceUpdate(n => n+1); }

  const roleNames = { owner:"Jade Warren",alistair:"Alistair Burgess",hans:"Hans Vermeulen",staff:"Staff member" };

  const navItems = [
    { id:"dashboard", label:"◈  Dashboard",   section:"Overview" },
    { id:"compliance",label:"✓  Compliance",   },
    { id:"staff",     label:"◉  All Staff",    section:"People" },
    { id:"archive",   label:"◎  Past Staff",   adminOnly:true },
    { id:"clinics",   label:"⊕  Clinics",      section:"Clinic" },
    { id:"inservice", label:"◇  In-service" },
    { id:"documents", label:"◻  Documents",    section:"Admin" },
    { id:"management",label:"◈  Management",   adminOnly:true },
  ];

  function TblHead({ headers }) { return <tr style={{ background:C.grayXL }}>{headers.map(h=><th key={h} style={{ textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:C.muted,padding:"0.5rem 0.75rem",borderBottom:`1px solid ${C.border}`,fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>)}</tr>; }
  function Td({ children }) { return <td style={{ padding:"0.75rem",borderBottom:`1px solid ${C.border}`,verticalAlign:"middle" }}>{children}</td>; }
  function PH({ title, sub }) { return <><div style={{ fontSize:20,fontWeight:600,marginBottom:3 }}>{title}</div><div style={{ fontSize:13,color:C.muted,marginBottom:"1.25rem" }}>{sub}</div></>; }
  function TabBar({ items, current, setter }) { return <div style={{ display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:"1rem",overflowX:"auto" }}>{items.map(([id,label])=><div key={id} onClick={()=>setter(id)} style={{ padding:"7px 14px",fontSize:13,color:current===id?C.teal:C.muted,cursor:"pointer",borderBottom:current===id?`2px solid ${C.teal}`:"2px solid transparent",fontWeight:current===id?500:400,whiteSpace:"nowrap" }}>{label}</div>)}</div>; }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const Dashboard = () => {
    const staffArr = Object.entries(STAFF);
    const totalRequired = staffArr.length * CORE_CERTS.filter(c=>c.required).length;
    const totalDone = staffArr.reduce((acc,[id]) => acc + staffCompliance(id).done, 0);
    const overallPct = Math.round((totalDone/totalRequired)*100);
    return (
      <div>
        <PH title="Good morning, Jade 👋" sub="Total Body Physio — Compliance & HR Portal · April 2026"/>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1rem" }}>
          {[["8","Staff",C.teal],[`${overallPct}%`,"Overall compliance",overallPct===100?C.teal:overallPct>50?C.amber:C.red],[String(audits.length),"Audit records",C.blue],["5","Clinics","#533AB7"]].map(([n,l,c])=>(
            <div key={l} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",textAlign:"center" }}>
              <div style={{ fontSize:26,fontWeight:700,color:c }}>{n}</div>
              <div style={{ fontSize:11,color:C.muted,marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <Alert type="red" title="🔴 Urgent — Alistair Burgess">APC expired 31 March 2025 · First Aid expired Aug 2024 · Cultural Competency expired Sept 2024. Upload renewed documents immediately for ACC compliance.</Alert>
        <Alert type="amber" title="🟡 APC cycle 2025/26 started 1 April 2026">All staff need their current APC uploaded. Tap any staff member below to open their profile and upload directly from your phone.</Alert>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",margin:"1.25rem 0 0.875rem" }}>
          <div style={{ fontSize:14,fontWeight:600 }}>Staff compliance — tap to view &amp; upload</div>
          <Btn onClick={()=>setPage("staff")}>View all →</Btn>
        </div>
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
            <thead><TblHead headers={["Staff","Clinic","APC","First Aid","Cultural","Contract","Orientation","Progress"]}/></thead>
            <tbody>
              {Object.entries(STAFF).map(([id,s])=>{
                const fileStatus = (key) => loadFile(id,key) ? "ok" : "pending";
                const comp = staffCompliance(id);
                return (
                  <tr key={id} onClick={()=>{setProfile(id);}} style={{ cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <Td><strong>{s.name}</strong></Td>
                    <Td>{s.clinics.slice(0,2).map(c=><Chip key={c} color="blue">{CLINICS.find(cl=>cl.id===c)?.short}</Chip>)}</Td>
                    <Td><Pill s={fileStatus("apc")}/></Td>
                    <Td><Pill s={fileStatus("firstaid")}/></Td>
                    <Td><Pill s={fileStatus("cultural")}/></Td>
                    <Td><Pill s={fileStatus("contract")}/></Td>
                    <Td><Pill s={fileStatus("orientation")}/></Td>
                    <Td>
                      <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                        <div style={{ width:60,height:5,background:C.grayL,borderRadius:3,overflow:"hidden" }}>
                          <div style={{ height:"100%",background:comp.pct===100?C.teal:comp.pct>50?C.amber:C.red,width:`${comp.pct}%` }}/>
                        </div>
                        <span style={{ fontSize:11,color:C.muted }}>{comp.done}/{comp.total}</span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize:11,color:C.muted,marginTop:"0.625rem" }}>Tap any row to open profile and upload certificates directly from camera or files.</div>
      </div>
    );
  };

  // ── STAFF ──────────────────────────────────────────────────────────────────
  const StaffPage = () => (
    <div>
      <PH title="All Staff" sub="Tap any card to view compliance, upload certs, or complete orientation"/>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",gap:"0.875rem" }}>
        {Object.entries(STAFF).map(([id,s])=>{
          const comp = staffCompliance(id);
          const barColor = comp.pct===100?C.teal:comp.pct>50?C.amber:C.red;
          return (
            <div key={id} onClick={()=>setProfile(id)} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(15,110,86,0.12)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{ padding:"1rem 1rem 0.75rem",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:46,height:46,borderRadius:"50%",background:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"white",flexShrink:0 }}>{s.ini}</div>
                <div>
                  <div style={{ fontSize:14,fontWeight:600 }}>{s.name}</div>
                  <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{s.type}</div>
                </div>
              </div>
              <div style={{ padding:"0.75rem 1rem" }}>
                <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:8 }}>
                  {s.clinics.slice(0,2).map(c=><Chip key={c} color="blue">{CLINICS.find(cl=>cl.id===c)?.short}</Chip>)}
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                  <div style={{ flex:1,height:6,background:C.grayL,borderRadius:3,overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:3,background:barColor,width:`${comp.pct}%` }}/>
                  </div>
                  <span style={{ fontSize:11,color:barColor,whiteSpace:"nowrap",fontWeight:500 }}>{comp.done}/{comp.total} required</span>
                </div>
                <div style={{ fontSize:11,color:C.muted }}>{comp.pct===100?"All required docs uploaded ✓":comp.pct===0?"No documents uploaded yet":`${comp.total-comp.done} required document${comp.total-comp.done>1?"s":""} missing`}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── COMPLIANCE ─────────────────────────────────────────────────────────────
  const CompliancePage = () => (
    <div>
      <PH title="Compliance tracker" sub="All staff must hold all required certifications. APC cycle: 1 April 2026 – 31 March 2027."/>
      <Alert type="blue" title="📌 Universal requirements">Every staff member — employees and contractors — must have a current APC, First Aid certificate, Cultural Competency certificate, signed employment agreement, signed job description, and completed orientation. Peer review and appraisal are required for staff employed more than 12 months.</Alert>
      <TabBar items={[["overview","Overview"],["apc","APC"],["firstaid","First Aid"],["cultural","Cultural"],["reviews","Reviews"]]} current={compTab} setter={setCompTab}/>
      {compTab==="overview" && (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead><TblHead headers={["Staff","APC","First Aid","Cultural","Contract","JD","Orientation","Peer Review","Appraisal"]}/></thead>
            <tbody>
              {Object.entries(STAFF).map(([id,s])=>(
                <tr key={id} onClick={()=>setProfile(id)} style={{ cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.background=C.grayXL} onMouseLeave={e=>e.currentTarget.style.background=""}>
                  {["",... CORE_CERTS.map(c=>c.key)].map((key,i)=>(
                    i===0 ? <Td key="name"><strong>{s.name}</strong></Td> : <Td key={key}><Pill s={loadFile(id,key)?"ok":"pending"}/></Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {compTab==="apc" && <><Alert type="amber" title="Annual Practising Certificate">Issued by Physiotherapy Board of NZ. Renews 1 April. Must be sighted and copy on file for all staff.</Alert><div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}><table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}><thead><TblHead headers={["Staff","APC on file","Evidence"]}/></thead><tbody>{Object.entries(STAFF).map(([id,s])=>{const f=loadFile(id,"apc");return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}}><Td><strong>{s.name}</strong></Td><Td><Pill s={f?"ok":"pending"} label={f?`Uploaded ${f.uploadedDate}`:"Not yet uploaded"}/></Td><Td>{f?<span style={{fontSize:12,color:C.teal,cursor:"pointer",fontWeight:500}}>📄 {f.fileName}</span>:<span style={{fontSize:12,color:C.muted}}>—</span>}</Td></tr>;})}</tbody></table></div></>}
      {compTab==="firstaid" && <Alert type="amber" title="First Aid / CPR — all staff required">Valid for 2 years. Must be sighted and copy on file. Alistair's St John Level 1 expired 10 August 2024. Tap any staff member to upload.</Alert>}
      {compTab==="cultural" && <Alert type="amber" title="Cultural Competency (Māori) — all staff required">Valid for 1 year. Alistair's Mauriora cert expired Sept 2024. Re-enrol at <a href="https://www.mauriora.co.nz" target="_blank" rel="noreferrer" style={{color:C.blue}}>mauriora.co.nz</a>. ACC1625 standard applies to all staff.</Alert>}
      {compTab==="reviews" && <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}><table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}><thead><TblHead headers={["Staff","Peer Review","Appraisal","Notes"]}/></thead><tbody>{Object.entries(STAFF).map(([id,s])=>{const pr=loadFile(id,"peerreview");const ap=loadFile(id,"appraisal");const note={alistair:"Clinical Director — reviews own CPD",hans:"On file",dylan:"New staff — Dec 2025",ibrahim:"New grad — not due yet",gwenne:"Confirm timing"}[id]||"First annual cycle";return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}}><Td><strong>{s.name}</strong></Td><Td><Pill s={pr?"ok":"pending"}/></Td><Td><Pill s={ap?"ok":"pending"}/></Td><Td><span style={{fontSize:12,color:C.muted}}>{note}</span></Td></tr>;})} </tbody></table></div>}
    </div>
  );

  // ── ARCHIVE ────────────────────────────────────────────────────────────────
  const ArchivePage = () => (
    <div>
      <PH title="Past employees" sub="Archived records — kept for DAA / ACC audit purposes"/>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,marginBottom:"0.75rem" }}>Former staff — 9 records</div>
        {PAST_STAFF.map(name=>(
          <div key={name} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:C.grayL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.gray,flexShrink:0 }}>{name.slice(0,2).toUpperCase()}</div>
            <div><strong style={{ fontSize:13 }}>{name}</strong><div style={{ fontSize:12,color:C.muted }}>Former physiotherapist · Records archived</div></div>
            <span style={{ marginLeft:"auto" }}><Chip color="gray">Archived</Chip></span>
          </div>
        ))}
      </Card>
    </div>
  );

  // ── CLINICS ────────────────────────────────────────────────────────────────
  const ClinicsPage = () => (
    <div>
      <PH title="Clinics" sub="Total Body Physio — all locations"/>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"0.875rem" }}>
        {CLINICS.map(cl=>{
          const staff=Object.values(STAFF).filter(s=>s.clinics.includes(cl.id));
          return <Card key={cl.id}><div style={{ fontSize:15,fontWeight:600,marginBottom:4 }}>{cl.icon} {cl.name}</div><div style={{ fontSize:12,color:C.muted,marginBottom:"0.75rem",lineHeight:1.5 }}>{cl.note}</div><div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>{staff.map(s=><Chip key={s.name} color="teal">{s.name.split(" ")[0]}</Chip>)}</div></Card>;
        })}
      </div>
    </div>
  );

  // ── IN-SERVICE ─────────────────────────────────────────────────────────────
  const InservicePage = () => (
    <div>
      <PH title="In-service training log" sub="Annual requirement — at least one per clinic group per year"/>
      <Alert type="amber" title="Logistics tip">Getting all sites together is hard. Hans can lead Titirangi. Each clinic needs at least one documented session per year for ACC compliance.</Alert>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,marginBottom:"0.75rem" }}>2026 in-service log</div>
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
            <thead><TblHead headers={["Clinic","Topic","Date","Attendees","Status"]}/></thead>
            <tbody>
              {[["Pakuranga","Not yet scheduled","—","Alistair, Timothy, Dylan, Ibrahim, Isabella","pending"],["Flat Bush","Not yet scheduled","—","Ibrahim, Isabella","pending"],["Titirangi","Shoulder rehab protocols","10 Aug 2025","Hans, Alistair","ok"],["Panmure","Not yet scheduled","—","Gwenne","pending"]].map(([clinic,topic,date,att,s])=>(
                <tr key={clinic}><Td>{clinic}</Td><Td style={{ fontStyle:s==="pending"?"italic":"normal",color:s==="pending"?C.hint:C.text }}>{topic}</Td><Td>{date}</Td><Td style={{ fontSize:12 }}>{att}</Td><Td><Pill s={s} label={s==="ok"?"Completed ✓":"Needed"}/></Td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:"1rem" }}><Btn outline onClick={()=>alert("Log in-service — coming soon. Use the Meetings section to document sessions for now.")}>+ Log in-service session</Btn></div>
      </Card>
    </div>
  );

  // ── DOCUMENTS ──────────────────────────────────────────────────────────────
  const DocumentsPage = () => (
    <div>
      <PH title="Documents" sub="Contracts, job descriptions & legislation"/>
      <TabBar items={[["contracts","Contracts"],["jd","Job descriptions"],["leg","Legislation"]]} current={docsTab} setter={setDocsTab}/>
      {docsTab==="contracts"&&<Card>{Object.entries(STAFF).map(([id,s])=>{const f=loadFile(id,"contract");return(<div key={id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}` }}><div style={{ width:34,height:34,borderRadius:"50%",background:s.color+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:s.color,flexShrink:0 }}>{s.ini}</div><div style={{ flex:1 }}><strong style={{ fontSize:13 }}>{s.name}</strong><div style={{ fontSize:12,color:C.muted }}>{s.type} · {s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ")}</div></div><Pill s={f?"ok":"pending"} label={f?`On file ✓`:"Upload needed"}/></div>);})} </Card>}
      {docsTab==="jd"&&<Card>{[["Physiotherapist — Job Description","Template · Signed by Alistair 27/9/2023","ok"],["Clinical Director — Job Description","Signed by Alistair 24/9/2023 · ACC confirmed Nov 2023","ok"],["Health & Safety Officer — Job Description","Signed by Alistair 27/9/2023","ok"],["All other staff — Job Descriptions","Upload via each staff member's profile","pending"]].map(([n,m,s])=><div key={n} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}` }}><div><strong style={{ fontSize:13 }}>{n}</strong><div style={{ fontSize:12,color:C.muted }}>{m}</div></div><Pill s={s} label={s==="ok"?"On file ✓":"Upload"}/></div>)}</Card>}
      {docsTab==="leg"&&(
        <div>
          <Alert type="blue" title="Key legislation — click any link to view the full document">All staff must be familiar with this legislation as part of their orientation. Links go directly to the source document.</Alert>
          {LEGISLATION.map(leg=>(
            <Card key={leg.name} style={{ marginBottom:"0.625rem",padding:"0.875rem 1rem" }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                <div>
                  <a href={leg.url} target="_blank" rel="noreferrer" style={{ fontSize:13,fontWeight:600,color:C.blue,textDecoration:"none" }}>{leg.name} ↗</a>
                  <div style={{ fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5 }}>{leg.desc}</div>
                </div>
                <a href={leg.url} target="_blank" rel="noreferrer" style={{ fontSize:11,padding:"4px 10px",borderRadius:20,background:C.blueL,color:C.blue,textDecoration:"none",fontWeight:500,whiteSpace:"nowrap",flexShrink:0 }}>View ↗</a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ── MANAGEMENT ─────────────────────────────────────────────────────────────
  const ManagementPage = () => (
    <div>
      <PH title="Management" sub="Audits, staff meetings, equipment — DAA / ACC Allied Health Standards"/>
      <TabBar items={[["audits","Audits"],["meetings","Staff Meetings"],["equipment","Equipment"],["accreditation","Accreditation"]]} current={mgmtTab} setter={setMgmtTab}/>

      {mgmtTab==="audits"&&(
        <div>
          <div style={{ marginBottom:"1.25rem" }}>
            <div style={{ fontSize:14,fontWeight:600,marginBottom:"0.75rem" }}>Start a new audit</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:"0.75rem" }}>
              {Object.entries(AUDIT_FORMS).map(([key,f])=>(
                <div key={key} onClick={()=>setActiveAudit(key)} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem",cursor:"pointer" }} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.boxShadow="0 2px 12px rgba(15,110,86,0.1)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{ fontSize:26,marginBottom:6 }}>{f.icon}</div>
                  <div style={{ fontSize:13,fontWeight:600,marginBottom:3 }}>{f.title}</div>
                  <div style={{ fontSize:11,color:C.muted }}>{f.sections.flatMap(s=>s.items).length} items · {f.sections.length} sections</div>
                  <div style={{ marginTop:"0.625rem",color:C.teal,fontSize:11,fontWeight:500 }}>Start →</div>
                </div>
              ))}
            </div>
          </div>
          <Divider/>
          <div style={{ fontSize:14,fontWeight:600,marginBottom:"0.75rem" }}>Audit history ({audits.length})</div>
          {[...audits].reverse().map(a=>(
            <Card key={a.id}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6 }}>
                <div><div style={{ fontSize:14,fontWeight:600 }}>{a.icon} {a.title}</div><div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{a.date} · {a.clinic} · {a.auditor}</div></div>
                <Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome}/>
              </div>
              <div style={{ display:"flex",gap:16,fontSize:12,marginBottom:a.notes?6:0 }}>
                <span style={{ color:"#3B6D11",fontWeight:500 }}>{a.passed} passed</span>
                <span style={{ color:C.red,fontWeight:500 }}>{a.failed} failed</span>
                <span style={{ color:C.gray }}>{a.na} N/A</span>
                <span style={{ color:C.muted }}>{a.total} total</span>
              </div>
              {a.notes&&<div style={{ fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6,whiteSpace:"pre-line" }}>{a.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {mgmtTab==="meetings"&&(
        <div>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:"1rem" }}><Btn onClick={()=>setShowAddMeeting(true)}>+ Log meeting</Btn></div>
          {showAddMeeting&&(
            <Card style={{ borderColor:C.teal }}>
              <div style={{ fontSize:14,fontWeight:600,marginBottom:"0.875rem" }}>Log new meeting</div>
              <Input label="Date" value={nm.date} onChange={e=>setNm({...nm,date:e.target.value})} type="date"/>
              <Input label="Clinic / location" value={nm.clinic} onChange={e=>setNm({...nm,clinic:e.target.value})}/>
              <Input label="Topic / agenda" value={nm.topic} onChange={e=>setNm({...nm,topic:e.target.value})}/>
              <Input label="Attendees" value={nm.attendees} onChange={e=>setNm({...nm,attendees:e.target.value})}/>
              <Textarea label="Notes / minutes" value={nm.notes} onChange={e=>setNm({...nm,notes:e.target.value})}/>
              <div style={{ display:"flex",gap:8 }}>
                <Btn onClick={()=>{if(nm.date&&nm.topic){setMeetings([...meetings,{...nm,id:Date.now()}]);setNm({date:"",clinic:"All clinics",topic:"",attendees:"",notes:""});setShowAddMeeting(false);}}}>Save</Btn>
                <Btn outline onClick={()=>setShowAddMeeting(false)}>Cancel</Btn>
              </div>
            </Card>
          )}
          {[...meetings].reverse().map(m=>(
            <Card key={m.id}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6 }}>
                <div><strong style={{ fontSize:14 }}>{m.topic}</strong><div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{m.date} · {m.clinic}</div></div>
                <Pill s="ok" label="Completed ✓"/>
              </div>
              {m.attendees&&<div style={{ fontSize:12,color:C.muted,marginBottom:4 }}><strong style={{ color:C.text }}>Attendees:</strong> {m.attendees}</div>}
              {m.notes&&<div style={{ fontSize:12,color:C.muted,background:C.grayXL,padding:"7px 10px",borderRadius:6,lineHeight:1.6 }}>{m.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {mgmtTab==="equipment"&&(
        <div>
          <Alert type="amber" title="Equipment servicing — annual requirement">All electrical equipment must be tested and tagged annually. Service certificates should be uploaded here.</Alert>
          <Card>
            <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                <thead><TblHead headers={["Clinic","Last serviced","Next due","Status","Evidence"]}/></thead>
                <tbody>
                  {["Pakuranga","Flat Bush","Titirangi","Panmure"].map(clinic=>(
                    <tr key={clinic}><Td>{clinic}</Td><Td>Sept 2025</Td><Td>Sept 2026</Td><Td><Pill s="ok" label="Up to date"/></Td><Td><button onClick={()=>alert("Upload service certificate for "+clinic)} style={{ fontSize:11,padding:"3px 10px",borderRadius:20,background:C.blueL,border:"none",color:C.blue,cursor:"pointer" }}>Upload cert</button></Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:"1rem" }}><Btn outline onClick={()=>setActiveAudit("equipment")}>Run equipment audit →</Btn></div>
          </Card>
        </div>
      )}

      {mgmtTab==="accreditation"&&(
        <div>
          <Alert type="green" title="DAA Group — ACC Allied Health Standards">All sections of this portal feed directly into DAA audit readiness. Use the checklist below to track your overall position.</Alert>
          {[["Staff credentials — APC, First Aid, Cultural Competency",Object.values(STAFF).every(s=>CORE_CERTS.slice(0,3).every(c=>loadFile(Object.entries(STAFF).find(([,v])=>v===s)?.[0]||"",c.key)))?"ok":"pending","All staff hold current APC, First Aid and Cultural Competency"],["Clinical Director oversight","ok","Alistair Burgess — confirmed by ACC Nov 2023"],["16th-visit case reviews","pending","Log completed reviews in Meeting notes"],["Orientation — all staff","pending","Complete digital orientation checklist for each staff member"],["In-service training","pending","At least one session per clinic per year — log above"],["H&S audits","ok","Quarterly per clinic — records in audit history"],["Staff meetings","ok","Quarterly — minutes logged above"],["Equipment servicing","ok","Annual — records on file"],["Clinical notes audit","pending","Run from audit section — random record check"]].map(([title,s,desc])=>(
            <Card key={title} style={{ marginBottom:"0.625rem",padding:"0.875rem 1rem" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
                <div><div style={{ fontSize:13,fontWeight:600 }}>{title}</div><div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{desc}</div></div>
                <Pill s={s} label={s==="ok"?"Compliant ✓":"Action needed"}/>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,'Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width:220,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:10,overflowY:"auto" }}>
        <div style={{ padding:"1.25rem 1rem",borderBottom:`1px solid ${C.border}` }}>
          <div style={{ width:34,height:34,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg></div>
          <div style={{ fontSize:13,fontWeight:600 }}>Total Body Physio</div>
          <div style={{ fontSize:11,color:C.muted,marginTop:1 }}>PhysioPortal</div>
        </div>
        <div style={{ padding:"0.75rem 1rem",borderBottom:`1px solid ${C.border}` }}>
          <label style={{ fontSize:10,color:C.hint,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:5 }}>Viewing as</label>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{ width:"100%",padding:"5px 8px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,background:C.grayXL }}>
            <option value="owner">Jade — Owner</option>
            <option value="alistair">Alistair — Clinical Director</option>
            <option value="hans">Hans — Clinic Lead</option>
            <option value="staff">Staff member</option>
          </select>
        </div>
        <div style={{ padding:"0.5rem 0",flex:1 }}>
          {navItems.map(item=>{
            if(item.adminOnly&&role==="staff")return null;
            return (
              <div key={item.id}>
                {item.section&&<div style={{ fontSize:10,color:C.hint,textTransform:"uppercase",letterSpacing:"0.06em",padding:"0.75rem 1rem 0.25rem" }}>{item.section}</div>}
                <div onClick={()=>setPage(item.id)} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 1rem",fontSize:13,color:page===item.id?C.teal:C.muted,cursor:"pointer",borderLeft:page===item.id?`3px solid ${C.teal}`:"3px solid transparent",background:page===item.id?"#E1F5EE":"transparent",fontWeight:page===item.id?500:400 }}>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"0.875rem 1rem",borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13,fontWeight:600 }}>{roleNames[role]}</div>
          <div style={{ fontSize:11,color:C.muted }}>{role==="owner"?"Owner / Director":role==="alistair"?"Clinical Director":role==="hans"?"Clinic Lead — Titirangi":"Physiotherapist"}</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft:220,flex:1,padding:"1.5rem",minHeight:"100vh" }}>
        {page==="dashboard"  && <Dashboard/>}
        {page==="staff"      && <StaffPage/>}
        {page==="compliance" && <CompliancePage/>}
        {page==="archive"    && <ArchivePage/>}
        {page==="clinics"    && <ClinicsPage/>}
        {page==="inservice"  && <InservicePage/>}
        {page==="documents"  && <DocumentsPage/>}
        {page==="management" && <ManagementPage/>}
      </div>

      {/* Modals */}
      <ProfileModal id={profile} onClose={()=>{setProfile(null);refresh();}}/>
      {activeAudit && (
        <AuditModal type={activeAudit} onClose={()=>setActiveAudit(null)} onComplete={result=>{setAudits(p=>[...p,result]);setActiveAudit(null);setPage("management");setMgmtTab("audits");}}/>
      )}
    </div>
  );
}
