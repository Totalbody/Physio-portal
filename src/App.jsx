import { useState } from "react";

// ─── COLOUR HELPERS ──────────────────────────────────────────────────────────
const C = {
  teal:"#0F6E56", tealL:"#E1F5EE", tealM:"#1D9E75",
  red:"#E24B4A",  redL:"#FCEBEB",
  amber:"#BA7517",amberL:"#FAEEDA",
  green:"#3B6D11",greenL:"#EAF3DE",
  blue:"#185FA5", blueL:"#E6F1FB",
  gray:"#5F5E5A", grayL:"#F1EFE8", grayXL:"#FAFAF8",
  border:"#e2e0d8",text:"#1a1a18",muted:"#6b6963",hint:"#9b9892",
  bg:"#f5f3ee",   card:"#ffffff",
};

const pillCfg = {
  expired:{ bg:C.redL,    fg:"#A32D2D" },
  ok:     { bg:C.greenL,  fg:C.green   },
  pending:{ bg:C.amberL,  fg:C.amber   },
  na:     { bg:C.grayL,   fg:C.gray    },
  due:    { bg:C.blueL,   fg:C.blue    },
};
const pillLabels = { expired:"Expired ⚠", ok:"Done ✓", pending:"Upload needed", na:"N/A", due:"Action needed" };

function Pill({ s, label }) {
  const p = pillCfg[s] || pillCfg.na;
  return <span style={{ background:p.bg, color:p.fg, fontSize:11, padding:"3px 9px", borderRadius:20, fontWeight:500, whiteSpace:"nowrap", display:"inline-block" }}>{label ?? pillLabels[s]}</span>;
}

function Chip({ color="teal", children }) {
  const map = { teal:{bg:C.tealL,fg:C.teal}, blue:{bg:C.blueL,fg:C.blue}, amber:{bg:C.amberL,fg:C.amber}, gray:{bg:C.grayL,fg:C.gray}, green:{bg:C.greenL,fg:C.green} };
  const m = map[color]||map.gray;
  return <span style={{ background:m.bg, color:m.fg, fontSize:10, padding:"2px 8px", borderRadius:20, fontWeight:500 }}>{children}</span>;
}

function Card({ children, style={} }) {
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.25rem", marginBottom:"1rem", ...style }}>{children}</div>;
}

function Alert({ type="amber", title, children }) {
  const map = { red:{bg:C.redL,border:C.red}, amber:{bg:C.amberL,border:C.amber}, green:{bg:C.greenL,border:C.teal} };
  const m = map[type];
  return <div style={{ background:m.bg, borderLeft:`3px solid ${m.border}`, borderRadius:6, padding:"0.75rem 1rem", marginBottom:"0.875rem" }}>
    <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{title}</div>
    <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{children}</div>
  </div>;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:C.muted, marginBottom:"0.625rem", fontWeight:500 }}>{children}</div>;
}

function Divider() { return <div style={{ borderTop:`1px solid ${C.border}`, margin:"0.875rem 0" }} />; }

// ─── DATA ────────────────────────────────────────────────────────────────────
const CLINICS = [
  { id:"pakuranga", name:"Pakuranga — Lloyd Elsmore", short:"Pakuranga", icon:"🏊", note:"Lloyd Elsmore Leisure Centre · Since 2002 · Pool & gym access" },
  { id:"titirangi", name:"Titirangi Village", short:"Titirangi", icon:"🌿", note:"Below Titirangi Medical Centre · Since 2004 · On-site gym" },
  { id:"panmure",   name:"Panmure — Lagoon Pools", short:"Panmure", icon:"🏊", note:"Inside Lagoon Pools complex · Newest clinic · Hydrotherapy access" },
  { id:"schools",   name:"Howick & Edgewater College", short:"Schools", icon:"🏫", note:"School term only · Hakinakina Hauora Health Services" },
];

const STAFF = {
  jade: {
    name:"Jade Warren", ini:"JW", color:"#0a3d2e",
    title:"Owner / Director · Physiotherapist",
    clinics:["pakuranga","titirangi","panmure"],
    type:"Owner",
    bio:"Founded Total Body Physio in 2000. Experienced physiotherapist and director overseeing all clinics and staff.",
    info:[["Role","Owner / Director"],["Clinics","All locations"],["Qualification","Physiotherapist"]],
    certs:[
      {n:"APC 2025/2026",       s:"pending", d:"Upload your renewed certificate"},
      {n:"First Aid / CPR",     s:"pending", d:"Upload current certificate"},
      {n:"Cultural Competency", s:"pending", d:"Upload certificate"},
      {n:"Peer Review 2026",    s:"pending", d:"Annual — due this year"},
      {n:"Performance Appraisal 2026", s:"na", d:"Owner — self review"},
      {n:"Orientation",         s:"ok",      d:"Completed"},
    ]
  },
  alistair: {
    name:"Alistair Burgess", ini:"AB", color:C.teal,
    title:"Senior Physiotherapist · Clinical Director · H&S Officer",
    clinics:["pakuranga","schools"],
    type:"Physiotherapist",
    bio:"M.Phty, B.App.Sc (Exercise & Sports Science), NZRP. Over 8 years in private practice. Specialist in Strength Training, Movement Assessment, and Shoulder & Core Rehabilitation. Former NZ U19 rugby player.",
    info:[["Role","Senior Physiotherapist"],["Additional roles","Clinical Director · H&S Officer"],["Qualification","M.Phty, B.App.Sc, NZRP"],["Registration","70-14433 / HPI: 29CMBK"],["Started","24 October 2023"],["Clinics","Pakuranga · Howick & Edgewater College (school term)"],["ACC role","Named Clinical Director — confirmed Nov 2023"]],
    certs:[
      {n:"APC 2025/2026",       s:"expired", d:"Last cert expired 31 March 2025 — upload 2025/26 now"},
      {n:"First Aid Level 1",   s:"expired", d:"Expired 10 August 2024 — renew with St John"},
      {n:"Mauriora Cultural Competency", s:"expired", d:"Expired Sept 2024 — re-enrol at mauriora.co.nz"},
      {n:"PNZ Membership",      s:"pending", d:"Upload renewal confirmation"},
      {n:"Peer Review 2026",    s:"pending", d:"Annual — due this year"},
      {n:"Performance Appraisal 2026", s:"pending", d:"Annual — due this year"},
      {n:"Orientation",         s:"ok",      d:"Completed on start — signed"},
      {n:"Job Description — Physiotherapist", s:"ok", d:"Signed 27 Sept 2023"},
      {n:"Job Description — Clinical Director", s:"ok", d:"Signed 24 Sept 2023"},
      {n:"Job Description — H&S Officer", s:"ok", d:"Signed 27 Sept 2023"},
      {n:"Employment Agreement", s:"ok",     d:"Signed 24 Oct 2023"},
    ]
  },
  timothy: {
    name:"Timothy Keung", ini:"TK", color:"#185FA5",
    title:"Physiotherapist",
    clinics:["pakuranga","titirangi","panmure"],
    type:"Contractor",
    bio:"Fluent in Mandarin, Cantonese, and English. Works across Auckland locations. Currently pursuing postgraduate study in acupuncture.",
    info:[["Role","Physiotherapist"],["Type","Contractor"],["Languages","Mandarin, Cantonese, English"],["Clinics","Pakuranga · Titirangi · Panmure"]],
    certs:[
      {n:"APC 2025/2026",       s:"pending", d:"Upload required"},
      {n:"First Aid / CPR",     s:"pending", d:"Upload certificate"},
      {n:"Cultural Competency", s:"pending", d:"Upload certificate"},
      {n:"PNZ Membership",      s:"pending", d:"Upload if applicable"},
      {n:"Peer Review 2026",    s:"pending", d:"Annual — due"},
      {n:"Performance Appraisal 2026", s:"pending", d:"Annual — due"},
      {n:"Orientation",         s:"ok",      d:"Completed"},
      {n:"Contract",            s:"pending", d:"Upload from Drive"},
    ]
  },
  hans: {
    name:"Hans Vermeulen", ini:"HV", color:"#533AB7",
    title:"Physiotherapist · Clinic Lead",
    clinics:["titirangi"],
    type:"Contractor",
    bio:"Nearly 20 years with Total Body Physio. Clinic lead at Titirangi. Experienced across a broad range of musculoskeletal conditions.",
    info:[["Role","Physiotherapist · Clinic Lead"],["Type","Contractor"],["Tenure","~20 years"],["Clinic","Titirangi Village"]],
    certs:[
      {n:"APC 2025/2026",       s:"pending", d:"Upload required"},
      {n:"First Aid / CPR",     s:"pending", d:"Upload certificate"},
      {n:"Cultural Competency", s:"pending", d:"Upload certificate"},
      {n:"PNZ Membership",      s:"pending", d:"Upload if applicable"},
      {n:"Peer Review 2026",    s:"ok",      d:"Completed — on file"},
      {n:"Performance Appraisal 2026", s:"pending", d:"Annual — due"},
      {n:"Orientation",         s:"ok",      d:"Long-standing staff"},
      {n:"Contract",            s:"pending", d:"Upload from Drive"},
    ]
  },
  dylan: {
    name:"Dylan Connolly", ini:"DC", color:"#D85A30",
    title:"Physiotherapist",
    clinics:["pakuranga"],
    type:"Physiotherapist",
    bio:"Manual therapy specialist. Employee from December 2025.",
    info:[["Role","Physiotherapist"],["Type","Employee"],["Speciality","Manual therapy"],["Started","December 2025"],["Clinic","Pakuranga — Lloyd Elsmore"]],
    certs:[
      {n:"APC 2025/2026",       s:"pending", d:"Upload required"},
      {n:"First Aid / CPR",     s:"pending", d:"Upload certificate"},
      {n:"Cultural Competency", s:"pending", d:"Upload certificate"},
      {n:"Peer Review",         s:"na",      d:"New staff — not due yet"},
      {n:"Performance Appraisal", s:"na",    d:"New staff — not due yet"},
      {n:"Orientation",         s:"pending", d:"In progress"},
      {n:"Employment Agreement",s:"pending", d:"Upload from Drive"},
    ]
  },
  ibrahim: {
    name:"Ibrahim", ini:"IB", color:C.tealM,
    title:"Physiotherapist · New graduate",
    clinics:["pakuranga"],
    type:"Physiotherapist",
    bio:"NZ-trained physiotherapist born and raised in South East Auckland. Strong interest in movement quality, injury prevention, and evidence-based care. Calm, professional, and approachable.",
    info:[["Role","Physiotherapist"],["Level","New graduate"],["Training","NZ-trained"],["Clinic","Pakuranga — Lloyd Elsmore"],["Note","Some compliance items not due yet"]],
    certs:[
      {n:"APC 2025/2026",       s:"due",     d:"New grad — confirm registration with Physio Board NZ"},
      {n:"First Aid / CPR",     s:"due",     d:"Not due yet — book when settled in"},
      {n:"Cultural Competency", s:"due",     d:"Complete within first year"},
      {n:"Peer Review",         s:"na",      d:"New staff"},
      {n:"Performance Appraisal", s:"na",    d:"New staff"},
      {n:"Orientation",         s:"pending", d:"In progress"},
      {n:"Contract",            s:"pending", d:"Upload from Drive"},
    ]
  },
  isabella: {
    name:"Isabella Yang", ini:"IY", color:"#D4537E",
    title:"Physiotherapist",
    clinics:["pakuranga"],
    type:"Physiotherapist",
    bio:"Otago University physio graduate. Local resident who grew up in the area and attended Macleans College. Hands-on techniques and exercise-based treatment approach.",
    info:[["Role","Physiotherapist"],["Type","Employee"],["Qualification","BPhty — University of Otago"],["Started","17 June 2024"],["Clinic","Pakuranga — Lloyd Elsmore"]],
    certs:[
      {n:"APC 2025/2026",       s:"pending", d:"Upload required"},
      {n:"First Aid / CPR",     s:"pending", d:"Upload certificate"},
      {n:"Cultural Competency", s:"pending", d:"Upload certificate"},
      {n:"PNZ Membership",      s:"pending", d:"Upload if applicable"},
      {n:"Peer Review 2026",    s:"pending", d:"First annual cycle — due"},
      {n:"Performance Appraisal 2026", s:"pending", d:"First annual cycle — due"},
      {n:"Orientation",         s:"ok",      d:"Completed on start"},
      {n:"Employment Agreement",s:"pending", d:"Upload from Drive"},
    ]
  },
  gwenne: {
    name:"Gwenne Manares", ini:"GM", color:"#639922",
    title:"Physiotherapist",
    clinics:["panmure"],
    type:"Contractor",
    bio:"Physiotherapist based at Total Body Physio Panmure, inside the Lagoon Pools complex.",
    info:[["Role","Physiotherapist"],["Type","Contractor"],["Clinic","Panmure — Lagoon Pools"]],
    certs:[
      {n:"APC 2025/2026",       s:"pending", d:"Upload required"},
      {n:"First Aid / CPR",     s:"pending", d:"Upload certificate"},
      {n:"Cultural Competency", s:"pending", d:"Upload certificate"},
      {n:"Peer Review",         s:"na",      d:"Confirm timing as contractor"},
      {n:"Performance Appraisal", s:"na",    d:"Confirm timing as contractor"},
      {n:"Orientation",         s:"pending", d:"In progress"},
      {n:"Contract",            s:"pending", d:"Upload from Drive"},
    ]
  },
};

const PAST_STAFF = ["Alice","Aoife","Vishwali","Jean Hong","Alonzo","Sasha McBain","Steven Gray","(2 further records)"];

const COMP_ROWS = [
  { id:"alistair", apc:"expired", fa:"expired", cult:"expired", pr:"pending" },
  { id:"timothy",  apc:"pending", fa:"pending", cult:"pending", pr:"pending" },
  { id:"hans",     apc:"pending", fa:"pending", cult:"pending", pr:"ok"      },
  { id:"dylan",    apc:"pending", fa:"pending", cult:"pending", pr:"na"      },
  { id:"ibrahim",  apc:"due",     fa:"due",     cult:"due",     pr:"na"      },
  { id:"isabella", apc:"pending", fa:"pending", cult:"pending", pr:"pending" },
  { id:"gwenne",   apc:"pending", fa:"pending", cult:"pending", pr:"na"      },
];

const INITIAL_MEETINGS = [
  { id:1, date:"2025-11-15", clinic:"All clinics", topic:"Q4 staff meeting — H&S review, CPD updates", attendees:"Jade, Alistair, Hans, Timothy, Isabella", notes:"Discussed APC renewal cycle, updated first aid booking process.", status:"done" },
  { id:2, date:"2025-08-10", clinic:"Titirangi", topic:"Titirangi clinic in-service — shoulder rehab protocols", attendees:"Hans, Alistair", notes:"Hans led session. Reviewed UniSportsOrtho shoulder stabilisation phases.", status:"done" },
];

const INITIAL_AUDITS = [
  { id:1, date:"2025-12-01", clinic:"Pakuranga", type:"H&S Audit", outcome:"Passed", notes:"Minor: Update first aid kit expiry dates. Actioned.", status:"done" },
  { id:2, date:"2025-12-03", clinic:"Titirangi", type:"H&S Audit", outcome:"Passed", notes:"All equipment checked. No issues.", status:"done" },
  { id:3, date:"2025-09-15", clinic:"Pakuranga", type:"Equipment Service", outcome:"Passed", notes:"Electrical equipment serviced. Certificates on file.", status:"done" },
];

// ─── UPLOAD BUTTON ────────────────────────────────────────────────────────────
const DRIVE_FOLDER = "https://drive.google.com/drive/folders/new";

function UploadBtn({ certName, staffName }) {
  const [uploaded, setUploaded] = useState(false);
  if (uploaded) return <span style={{ fontSize:11, color:C.teal, fontWeight:500 }}>✓ Marked uploaded</span>;
  return (
    <button
      onClick={() => {
        window.open(`https://drive.google.com`, "_blank");
        setTimeout(() => setUploaded(true), 500);
      }}
      style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"white", border:`1px solid ${C.border}`, cursor:"pointer", color:C.muted, whiteSpace:"nowrap" }}
    >
      Upload to Drive
    </button>
  );
}

// ─── CERT ITEM ────────────────────────────────────────────────────────────────
function CertItem({ cert, staffName }) {
  const bg    = { expired:C.redL, ok:C.greenL, pending:C.amberL, na:C.grayXL, due:C.blueL };
  const bdr   = { expired:"#f5c1c1", ok:"#c0dd97", pending:"#fac775", na:C.border, due:"#b5d4f4" };
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:6, border:`1px solid ${bdr[cert.s]}`, background:bg[cert.s], marginBottom:5 }}>
      <div>
        <div style={{ fontWeight:500, fontSize:13 }}>{cert.n}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{cert.d}</div>
      </div>
      {cert.s === "ok" ? (
        <span style={{ fontSize:11, color:C.green, fontWeight:500 }}>✓ On file</span>
      ) : cert.s === "na" ? (
        <span style={{ fontSize:11, color:C.gray }}>N/A</span>
      ) : (
        <UploadBtn certName={cert.n} staffName={staffName} />
      )}
    </div>
  );
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────
function ProfileModal({ id, onClose }) {
  const [tab, setTab] = useState("compliance");
  if (!id) return null;
  const s = STAFF[id];
  const clinicNames = s.clinics.map(c => CLINICS.find(cl => cl.id === c)?.short).join(" · ");
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"2rem 1rem", overflowY:"auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.card, borderRadius:12, width:"100%", maxWidth:680, overflow:"hidden", marginBottom:"2rem" }}>
        {/* Header */}
        <div style={{ background:s.color, padding:"1.5rem", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,0.25)", border:"2px solid rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"white", flexShrink:0 }}>{s.ini}</div>
          <div style={{ flex:1 }}>
            <div style={{ color:"white", fontSize:18, fontWeight:600 }}>{s.name}</div>
            <div style={{ color:"rgba(255,255,255,0.85)", fontSize:12, marginTop:3 }}>{s.title}</div>
            <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
              {s.clinics.map(c => {
                const cl = CLINICS.find(x => x.id===c);
                return <span key={c} style={{ background:"rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.9)", fontSize:10, padding:"2px 8px", borderRadius:20 }}>{cl?.short}</span>;
              })}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"white", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:18, flexShrink:0 }}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.grayXL }}>
          {["compliance","profile","upload"].map(t => (
            <div key={t} onClick={() => setTab(t)} style={{ padding:"9px 16px", fontSize:13, color:tab===t?C.teal:C.muted, cursor:"pointer", borderBottom:tab===t?`2px solid ${C.teal}`:"2px solid transparent", fontWeight:tab===t?500:400, textTransform:"capitalize" }}>{t === "upload" ? "📎 Upload docs" : t}</div>
          ))}
        </div>
        {/* Body */}
        <div style={{ padding:"1.25rem 1.5rem", maxHeight:"65vh", overflowY:"auto" }}>
          {tab === "profile" && (
            <div>
              {s.bio && <div style={{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:"1.25rem", padding:"0.75rem 1rem", background:C.grayXL, borderRadius:8 }}>{s.bio}</div>}
              <SectionTitle>Details</SectionTitle>
              {s.info.map(([l,v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                  <span style={{ color:C.muted }}>{l}</span><span style={{ fontWeight:500, textAlign:"right", maxWidth:"60%" }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "compliance" && (
            <div>
              <SectionTitle>Certifications &amp; compliance items</SectionTitle>
              {s.certs.map(c => <CertItem key={c.n} cert={c} staffName={s.name} />)}
            </div>
          )}
          {tab === "upload" && (
            <div>
              <Alert type="green" title="📁 Google Drive — Compliance Folder">
                All uploaded documents are saved to the shared <strong>TBP Compliance</strong> folder in Google Drive. Each staff member has their own sub-folder. Files are visible to management only.
              </Alert>
              <SectionTitle>Upload documents for {s.name}</SectionTitle>
              {["APC Certificate (2025/2026)","First Aid / CPR Certificate","Cultural Competency Certificate","Employment Agreement / Contract","Job Description","Peer Review Record","Performance Appraisal","PNZ Membership","Orientation Checklist","Other"].map(doc => (
                <div key={doc} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                  <span>{doc}</span>
                  <button
                    onClick={() => window.open("https://drive.google.com","_blank")}
                    style={{ fontSize:11, padding:"4px 12px", borderRadius:20, background:C.teal, border:"none", cursor:"pointer", color:"white" }}
                  >📎 Upload</button>
                </div>
              ))}
              <div style={{ marginTop:"1rem", fontSize:12, color:C.muted, lineHeight:1.6 }}>
                <strong style={{ color:C.text }}>How it works:</strong> Tap Upload → opens Google Drive → upload the file to the <em>TBP Compliance / {s.name}</em> folder → the file is saved and accessible to management. Staff can also take a photo of their cert directly from their phone and upload it here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [role, setRole]       = useState("owner");
  const [compTab, setCompTab] = useState("all");
  const [docsTab, setDocsTab] = useState("contracts");
  const [mgmtTab, setMgmtTab] = useState("meetings");
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [audits,   setAudits]   = useState(INITIAL_AUDITS);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [showAddAudit,   setShowAddAudit]   = useState(false);
  const [newMeeting, setNewMeeting] = useState({ date:"", clinic:"All clinics", topic:"", attendees:"", notes:"" });
  const [newAudit,   setNewAudit]   = useState({ date:"", clinic:"Pakuranga", type:"H&S Audit", outcome:"Passed", notes:"" });

  const roleNames   = { owner:"Jade Warren", alistair:"Alistair Burgess", hans:"Hans Vermeulen", staff:"Staff member" };
  const staffList   = Object.entries(STAFF).filter(([id]) => id !== "jade");
  const expiredCount = Object.values(STAFF).flatMap(s => s.certs).filter(c => c.s === "expired").length;

  const navItems = [
    { id:"dashboard",  label:"◈  Dashboard",   section:"Overview" },
    { id:"compliance", label:"✓  Compliance",   badge: expiredCount > 0 ? String(expiredCount) : null },
    { id:"staff",      label:"◉  All Staff",    section:"People" },
    { id:"archive",    label:"◎  Past Staff",   adminOnly:true },
    { id:"clinics",    label:"⊕  Clinics",      section:"Clinic" },
    { id:"inservice",  label:"◇  In-service",   },
    { id:"documents",  label:"◻  Documents",    section:"Admin" },
    { id:"management", label:"◈  Management",   adminOnly:true },
  ];

  function navItem(item) {
    if (item.adminOnly && role === "staff") return null;
    return (
      <div key={item.id}>
        {item.section && <div style={{ fontSize:10, color:C.hint, textTransform:"uppercase", letterSpacing:"0.06em", padding:"0.75rem 1rem 0.25rem" }}>{item.section}</div>}
        <div onClick={() => setPage(item.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 1rem", fontSize:13, color:page===item.id?C.teal:C.muted, cursor:"pointer", borderLeft:page===item.id?`3px solid ${C.teal}`:"3px solid transparent", background:page===item.id?C.tealL:"transparent", fontWeight:page===item.id?500:400 }}>
          {item.label}
          {item.badge && <span style={{ marginLeft:"auto", background:C.redL, color:C.red, fontSize:10, padding:"1px 6px", borderRadius:10, fontWeight:600 }}>{item.badge}</span>}
        </div>
      </div>
    );
  }

  function tabs(items, current, setter) {
    return (
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1rem" }}>
        {items.map(([id, label]) => (
          <div key={id} onClick={() => setter(id)} style={{ padding:"7px 14px", fontSize:13, color:current===id?C.teal:C.muted, cursor:"pointer", borderBottom:current===id?`2px solid ${C.teal}`:"2px solid transparent", fontWeight:current===id?500:400 }}>{label}</div>
        ))}
      </div>
    );
  }

  function PageHeader({ title, sub }) {
    return <><div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>{title}</div><div style={{ fontSize:13, color:C.muted, marginBottom:"1.25rem" }}>{sub}</div></>;
  }

  function tbl(headers, rows) {
    return (
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead><tr style={{ background:C.grayXL }}>{headers.map(h => <th key={h} style={{ textAlign:"left", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:C.muted, padding:"0.5rem 0.75rem", borderBottom:`1px solid ${C.border}`, fontWeight:500, whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }

  function td(content, i) {
    return <td key={i} style={{ padding:"0.75rem", borderBottom:`1px solid ${C.border}`, verticalAlign:"middle" }}>{content}</td>;
  }

  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  const Dashboard = () => (
    <div>
      <PageHeader title="Good morning, Jade 👋" sub="Total Body Physio — Compliance & HR Portal · April 2026" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1rem" }}>
        {[["7","Active staff",C.teal],[String(expiredCount),"Expired certs",C.red],["4","Clinics",C.blue],["2","Upcoming meetings",C.amber]].map(([n,l,c]) => (
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1rem", textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:700, color:c }}>{n}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>
      <Alert type="red" title="🔴 Urgent — Alistair Burgess">APC expired 31 March 2025 · First Aid expired Aug 2024 · Cultural Competency expired Sept 2024. Three items need immediate renewal for ACC compliance.</Alert>
      <Alert type="amber" title="🟡 APC renewals — April 2026 cycle">New APC cycle started 1 April 2026. Upload 2025/26 certificates for all staff. Tap any row below to open their profile.</Alert>
      <Alert type="green" title="🟢 Google Drive uploads active">Staff can upload certs directly from their phone — photo → Drive → done. All files save to the <strong>TBP Compliance</strong> shared folder.</Alert>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"1.25rem 0 1rem" }}>
        <div style={{ fontSize:14, fontWeight:600 }}>Compliance snapshot</div>
        <button onClick={() => setPage("staff")} style={{ background:C.teal, color:"white", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer" }}>View all staff →</button>
      </div>
      {tbl(["Staff","Clinic","Type","APC","First Aid","Cultural","Peer Review"],
        COMP_ROWS.map(r => {
          const s = STAFF[r.id];
          const clinicName = s.clinics.map(c => CLINICS.find(cl=>cl.id===c)?.short).join(", ");
          return (
            <tr key={r.id} onClick={() => setProfile(r.id)} style={{ cursor:"pointer" }}>
              {[<strong>{s.name}</strong>, clinicName, <Chip color={s.type==="Contractor"?"amber":"teal"}>{s.type}</Chip>,
                <Pill s={r.apc}/>, <Pill s={r.fa}/>, <Pill s={r.cult}/>, <Pill s={r.pr}/>
              ].map((c,i) => td(c,i))}
            </tr>
          );
        })
      )}
    </div>
  );

  // ── STAFF ───────────────────────────────────────────────────────────────────
  const StaffPage = () => (
    <div>
      <PageHeader title="All Staff" sub="Tap any card to view profile, compliance checklist and upload documents" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"0.875rem" }}>
        {Object.entries(STAFF).map(([id,s]) => {
          const expired = s.certs.filter(c=>c.s==="expired").length;
          const pending = s.certs.filter(c=>c.s==="pending").length;
          const total   = s.certs.length;
          const done    = s.certs.filter(c=>c.s==="ok").length;
          const pct     = Math.round((done/total)*100);
          const barColor = expired>0 ? C.red : pending>0 ? C.amber : C.teal;
          const clinicNames = s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(" · ");
          return (
            <div key={id} onClick={() => setProfile(id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", cursor:"pointer", transition:"box-shadow 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(15,110,86,0.12)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
              <div style={{ padding:"1rem 1rem 0.75rem", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:46, height:46, borderRadius:"50%", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"white", flexShrink:0 }}>{s.ini}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.title.split("·")[0].trim()}</div>
                </div>
              </div>
              <div style={{ padding:"0.75rem 1rem" }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
                  <Chip color={s.type==="Contractor"?"amber":"teal"}>{s.type}</Chip>
                  {s.clinics.map(c=><Chip key={c} color="blue">{CLINICS.find(cl=>cl.id===c)?.short}</Chip>)}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, height:5, background:C.grayL, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:3, background:barColor, width:`${pct}%` }} />
                  </div>
                  <span style={{ fontSize:11, color:barColor, whiteSpace:"nowrap" }}>
                    {expired>0 ? `${expired} expired` : pending>0 ? `${pending} to upload` : "All good ✓"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── COMPLIANCE ──────────────────────────────────────────────────────────────
  const CompliancePage = () => (
    <div>
      <PageHeader title="Compliance tracker" sub="APC cycle 1 April 2026 – 31 March 2027" />
      {tabs([["all","All staff"],["apc","APC"],["firstaid","First Aid"],["reviews","Reviews & appraisals"]], compTab, setCompTab)}
      {compTab === "all" && tbl(
        ["Staff","Clinic","APC 25/26","First Aid","Cultural","PNZ","Peer Review","Appraisal","Orientation"],
        Object.entries(STAFF).map(([id,s]) => {
          const certMap = Object.fromEntries(s.certs.map(c=>[c.n,c.s]));
          const apc   = certMap["APC 2025/2026"] || "pending";
          const fa    = certMap["First Aid / CPR"] || certMap["First Aid Level 1"] || "pending";
          const cult  = certMap["Mauriora Cultural Competency"] || certMap["Cultural Competency"] || "pending";
          const pnz   = certMap["PNZ Membership"] || "na";
          const pr    = certMap["Peer Review 2026"] || certMap["Peer Review"] || "na";
          const ap    = certMap["Performance Appraisal 2026"] || certMap["Performance Appraisal"] || "na";
          const ori   = certMap["Orientation"] || "pending";
          const clinicName = s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ");
          return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}}>
            {[<strong>{s.name}</strong>,clinicName,<Pill s={apc}/>,<Pill s={fa}/>,<Pill s={cult}/>,<Pill s={pnz}/>,<Pill s={pr}/>,<Pill s={ap}/>,<Pill s={ori}/>].map((c,i)=>td(c,i))}
          </tr>;
        })
      )}
      {compTab === "apc" && <>
        <Alert type="amber" title="APC — Annual Practising Certificate">Issued by Physiotherapy Board of NZ. Renews 1 April each year. All physios must hold a current APC to practise. New cycle: 1 April 2026 – 31 March 2027.</Alert>
        {tbl(["Staff","Last APC on file","Status"],
          Object.entries(STAFF).map(([id,s]) => {
            const apc = s.certs.find(c=>c.n.includes("APC"));
            return <tr key={id} onClick={()=>setProfile(id)} style={{cursor:"pointer"}}>
              {[<strong>{s.name}</strong>, id==="alistair"?"2024/25 — on file ✓":"Not yet uploaded", <Pill s={apc?.s||"pending"}/>].map((c,i)=>td(c,i))}
            </tr>;
          })
        )}
      </>}
      {compTab === "firstaid" && <Alert type="amber" title="First Aid / CPR">All staff require a current First Aid certificate. Valid for 2 years. Alistair's St John Level 1 expired 10 August 2024. Tap any staff member on the All Staff page to upload their cert via Drive.</Alert>}
      {compTab === "reviews" && tbl(
        ["Staff","Peer Review 2026","Appraisal 2026","Notes"],
        Object.entries(STAFF).map(([id,s]) => {
          const pr = s.certs.find(c=>c.n.includes("Peer Review"))?.s || "na";
          const ap = s.certs.find(c=>c.n.includes("Appraisal"))?.s   || "na";
          const note = id==="hans"?"Peer review on file":id==="dylan"||id==="ibrahim"||id==="gwenne"?"New/contractor — check timing":"First annual cycle";
          return <tr key={id}>{[<strong>{s.name}</strong>,<Pill s={pr}/>,<Pill s={ap}/>,<span style={{fontSize:12,color:C.muted}}>{note}</span>].map((c,i)=>td(c,i))}</tr>;
        })
      )}
    </div>
  );

  // ── ARCHIVE ─────────────────────────────────────────────────────────────────
  const ArchivePage = () => (
    <div>
      <PageHeader title="Past employees" sub="Archived records — kept for DAA / ACC audit purposes" />
      <Card>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:"0.75rem" }}>Former staff — 9 records</div>
        {PAST_STAFF.map(name => (
          <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:C.grayL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, color:C.gray, flexShrink:0 }}>{name.slice(0,2).toUpperCase()}</div>
            <div><strong style={{ fontSize:13 }}>{name}</strong><div style={{ fontSize:12, color:C.muted }}>Former physiotherapist · Records archived</div></div>
            <Chip color="gray" style={{ marginLeft:"auto" }}>Archived</Chip>
          </div>
        ))}
      </Card>
    </div>
  );

  // ── CLINICS ─────────────────────────────────────────────────────────────────
  const ClinicsPage = () => (
    <div>
      <PageHeader title="Clinics" sub="Total Body Physio — all locations" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"0.875rem" }}>
        {CLINICS.map(cl => {
          const clinicStaff = Object.values(STAFF).filter(s=>s.clinics.includes(cl.id));
          return (
            <Card key={cl.id}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>{cl.icon} {cl.name}</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:"0.75rem", lineHeight:1.5 }}>{cl.note}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {clinicStaff.map(s=><Chip key={s.name} color="teal">{s.name.split(" ")[0]}</Chip>)}
              </div>
            </Card>
          );
        })}
        <Card>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>🏫 School services</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:"0.75rem" }}>Hakinakina Hauora Health Services · School term only</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            <Chip color="blue">Howick College</Chip><Chip color="blue">Edgewater College</Chip>
          </div>
        </Card>
      </div>
    </div>
  );

  // ── IN-SERVICE ───────────────────────────────────────────────────────────────
  const InservicePage = () => (
    <div>
      <PageHeader title="In-service training log" sub="Annual requirement — at least one per clinic group per year" />
      <Alert type="amber" title="Logistics tip">Getting all sites together is tough. Hans can lead in-services for the Titirangi group. Each clinic just needs at least one documented session per year for ACC compliance.</Alert>
      <Card>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:"0.75rem" }}>2026 in-service log</div>
        {tbl(["Clinic","Topic","Date","Attendees","Status"],[
          ...["Pakuranga — Lloyd Elsmore","Titirangi Village","Panmure — Lagoon Pools"].map((clinic,i) => (
            <tr key={i}><td style={{ padding:"0.75rem", borderBottom:`1px solid ${C.border}` }}>{clinic}</td><td style={{ padding:"0.75rem", borderBottom:`1px solid ${C.border}`, color:C.hint, fontStyle:"italic" }}>Not yet scheduled</td><td style={{ padding:"0.75rem", borderBottom:`1px solid ${C.border}` }}>—</td><td style={{ padding:"0.75rem", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>{["Alistair, Timothy","Hans","Gwenne"][i]}</td><td style={{ padding:"0.75rem", borderBottom:`1px solid ${C.border}` }}><Pill s="pending" label="Plan required"/></td></tr>
          ))
        ])}
        <button style={{ marginTop:"1rem", background:"white", color:C.teal, border:`1px solid ${C.teal}`, borderRadius:6, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Log in-service session</button>
      </Card>
    </div>
  );

  // ── DOCUMENTS ───────────────────────────────────────────────────────────────
  const DocumentsPage = () => (
    <div>
      <PageHeader title="Documents" sub="Contracts, job descriptions & key legislation" />
      {tabs([["contracts","Contracts"],["jd","Job descriptions"],["leg","Legislation"]], docsTab, setDocsTab)}
      {docsTab === "contracts" && (
        <Card>
          {Object.entries(STAFF).map(([id,s]) => {
            const hasContract = s.certs.find(c=>c.n.includes("Agreement")||c.n.includes("Contract"));
            const contractStatus = hasContract?.s || "pending";
            return (
              <div key={id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:s.color+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:s.color, flexShrink:0 }}>{s.ini}</div>
                <div style={{ flex:1 }}>
                  <strong style={{ fontSize:13 }}>{s.name}</strong>
                  <div style={{ fontSize:12, color:C.muted }}>{s.type} · {s.clinics.map(c=>CLINICS.find(cl=>cl.id===c)?.short).join(", ")}</div>
                </div>
                <Pill s={contractStatus} label={contractStatus==="ok"?"Signed ✓":"Upload"} />
              </div>
            );
          })}
        </Card>
      )}
      {docsTab === "jd" && (
        <Card>
          {[["Physiotherapist — Job Description","Applies to all physios · Template signed by Alistair 27/9/2023","ok"],["Clinical Director — Job Description","Signed by Alistair 24/9/2023 · ACC confirmed Nov 2023","ok"],["Health & Safety Officer — Job Description","Signed by Alistair 27/9/2023","ok"],["All other staff — Job Descriptions","Timothy, Hans, Dylan, Ibrahim, Isabella, Gwenne · Upload from Drive","pending"]].map(([name,meta,s]) => (
            <div key={name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              <div><strong style={{ fontSize:13 }}>{name}</strong><div style={{ fontSize:12, color:C.muted }}>{meta}</div></div>
              <Pill s={s} label={s==="ok"?"On file ✓":"Upload"} />
            </div>
          ))}
        </Card>
      )}
      {docsTab === "leg" && (
        <Card>
          {[["Health Practitioners Competence Assurance Act 2003","Governs registration, APC, and scope of practice for all physios."],["Health and Safety at Work Act 2015","H&S obligations — Alistair is H&S Officer. Quarterly audits required."],["Privacy Act 2020","Patient and staff privacy obligations. All staff must comply."],["Employment Relations Act 2000","Employment agreements, disputes, good faith, restructuring."],["ACC Allied Health Services Contract (DAA Group)","Clinical Director requirements, 16th-visit case reviews, in-service obligations, orientation, audit standards. Audited by DAA Group."]].map(([title,desc]) => (
            <div key={title} style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              <strong style={{ fontSize:13 }}>{title}</strong>
              <div style={{ fontSize:12, color:C.muted, marginTop:2, lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );

  // ── MANAGEMENT ───────────────────────────────────────────────────────────────
  const ManagementPage = () => (
    <div>
      <PageHeader title="Management" sub="Staff meetings, audits, H&S, equipment servicing — DAA / ACC Allied Health Standards" />
      {tabs([["meetings","Staff Meetings"],["audits","H&S Audits"],["equipment","Equipment"],["accreditation","Accreditation"]], mgmtTab, setMgmtTab)}

      {mgmtTab === "meetings" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"1rem" }}>
            <button onClick={()=>setShowAddMeeting(true)} style={{ background:C.teal, color:"white", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Log meeting</button>
          </div>
          {showAddMeeting && (
            <Card style={{ borderColor:C.teal }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:"0.875rem" }}>Log new meeting</div>
              {[["date","Date","date"],["clinic","Clinic","text"],["topic","Topic / agenda","text"],["attendees","Attendees","text"],["notes","Notes / minutes","text"]].map(([key,label,type]) => (
                <div key={key} style={{ marginBottom:"0.625rem" }}>
                  <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:3 }}>{label}</label>
                  <input type={type} value={newMeeting[key]} onChange={e=>setNewMeeting({...newMeeting,[key]:e.target.value})} style={{ width:"100%", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, background:C.grayXL }}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:"0.75rem" }}>
                <button onClick={()=>{if(newMeeting.date&&newMeeting.topic){setMeetings([...meetings,{...newMeeting,id:Date.now(),status:"done"}]);setNewMeeting({date:"",clinic:"All clinics",topic:"",attendees:"",notes:""});setShowAddMeeting(false);}}} style={{ background:C.teal, color:"white", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, cursor:"pointer" }}>Save meeting</button>
                <button onClick={()=>setShowAddMeeting(false)} style={{ background:"white", color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 14px", fontSize:13, cursor:"pointer" }}>Cancel</button>
              </div>
            </Card>
          )}
          {[...meetings].reverse().map(m => (
            <Card key={m.id}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
                <div><strong style={{ fontSize:14 }}>{m.topic}</strong><div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{m.date} · {m.clinic}</div></div>
                <Pill s="ok" label="Completed" />
              </div>
              {m.attendees && <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}><strong style={{ color:C.text }}>Attendees:</strong> {m.attendees}</div>}
              {m.notes && <div style={{ fontSize:12, color:C.muted, background:C.grayXL, padding:"8px 10px", borderRadius:6, lineHeight:1.6 }}>{m.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {mgmtTab === "audits" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"1rem" }}>
            <button onClick={()=>setShowAddAudit(true)} style={{ background:C.teal, color:"white", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Log audit</button>
          </div>
          <Alert type="amber" title="H&S Audits — quarterly requirement">Alistair (H&S Officer) is responsible for completing a H&S audit at each clinic every 3 months. Results must be reviewed and any issues rectified promptly.</Alert>
          {showAddAudit && (
            <Card style={{ borderColor:C.teal }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:"0.875rem" }}>Log new audit / service</div>
              {[["date","Date","date"],["clinic","Clinic","text"],["type","Type (H&S Audit / Equipment Service / etc)","text"],["outcome","Outcome","text"],["notes","Notes / actions","text"]].map(([key,label,type]) => (
                <div key={key} style={{ marginBottom:"0.625rem" }}>
                  <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:3 }}>{label}</label>
                  <input type={type} value={newAudit[key]} onChange={e=>setNewAudit({...newAudit,[key]:e.target.value})} style={{ width:"100%", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, background:C.grayXL }}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:"0.75rem" }}>
                <button onClick={()=>{if(newAudit.date&&newAudit.type){setAudits([...audits,{...newAudit,id:Date.now(),status:"done"}]);setNewAudit({date:"",clinic:"Pakuranga",type:"H&S Audit",outcome:"Passed",notes:""});setShowAddAudit(false);}}} style={{ background:C.teal, color:"white", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, cursor:"pointer" }}>Save record</button>
                <button onClick={()=>setShowAddAudit(false)} style={{ background:"white", color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 14px", fontSize:13, cursor:"pointer" }}>Cancel</button>
              </div>
            </Card>
          )}
          {[...audits].reverse().map(a => (
            <Card key={a.id}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
                <div><strong style={{ fontSize:14 }}>{a.type} — {a.clinic}</strong><div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{a.date}</div></div>
                <Pill s={a.outcome==="Passed"?"ok":"pending"} label={a.outcome} />
              </div>
              {a.notes && <div style={{ fontSize:12, color:C.muted, background:C.grayXL, padding:"8px 10px", borderRadius:6, lineHeight:1.6 }}>{a.notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {mgmtTab === "equipment" && (
        <div>
          <Alert type="amber" title="Equipment servicing">Electrical equipment must be regularly serviced. Service certificates should be uploaded to Google Drive and logged here. Alistair (H&S Officer) is responsible.</Alert>
          <Card>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:"0.75rem" }}>Equipment service records</div>
            {tbl(["Clinic","Equipment","Last serviced","Next due","Status"],[
              ...["Pakuranga","Titirangi","Panmure"].map((clinic,i) => (
                <tr key={i}><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>{clinic}</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`,color:C.muted}}>All electrical equipment</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>Sept 2025</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}>Sept 2026</td><td style={{padding:"0.75rem",borderBottom:`1px solid ${C.border}`}}><Pill s="ok" label="Up to date"/></td></tr>
              ))
            ])}
            <button style={{ marginTop:"1rem", background:"white", color:C.teal, border:`1px solid ${C.teal}`, borderRadius:6, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Log service record</button>
          </Card>
        </div>
      )}

      {mgmtTab === "accreditation" && (
        <div>
          <Alert type="green" title="DAA Group — ACC Allied Health Standards">This portal is built to support your DAA accreditation. Compliance tracker, staff records, audit logs, in-service records, and meeting minutes all feed into your audit readiness.</Alert>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"0.875rem" }}>
            {[["Staff credentials","APC, First Aid, Cultural Competency — tracked per staff member",expiredCount>0?"expired":"ok"],["Clinical oversight","16th-visit case reviews by Clinical Director (Alistair)","pending"],["In-service training","Annual requirement per clinic group","pending"],["H&S audits","Quarterly per clinic — logged in audit section","ok"],["Staff meetings","Quarterly — minutes logged in meetings section","ok"],["Equipment servicing","Annual electrical servicing — certificates on file","ok"]].map(([title,desc,s]) => (
              <Card key={title}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{title}</div>
                  <Pill s={s} label={s==="ok"?"Compliant":"Action needed"} />
                </div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{desc}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── LAYOUT ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"-apple-system,'Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width:220, background:C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:10, overflowY:"auto" }}>
        <div style={{ padding:"1.25rem 1rem", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:C.teal, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg>
          </div>
          <div style={{ fontSize:13, fontWeight:600 }}>Total Body Physio</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>PhysioPortal</div>
        </div>
        <div style={{ padding:"0.75rem 1rem", borderBottom:`1px solid ${C.border}` }}>
          <label style={{ fontSize:10, color:C.hint, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>Viewing as</label>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{ width:"100%", padding:"5px 8px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, background:C.grayXL }}>
            <option value="owner">Jade — Owner</option>
            <option value="alistair">Alistair — Clinical Director</option>
            <option value="hans">Hans — Clinic Lead</option>
            <option value="staff">Staff member (own only)</option>
          </select>
        </div>
        <div style={{ padding:"0.5rem 0", flex:1 }}>{navItems.map(navItem)}</div>
        <div style={{ padding:"0.875rem 1rem", borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{roleNames[role]}</div>
          <div style={{ fontSize:11, color:C.muted }}>{role==="owner"?"Owner / Director":role==="alistair"?"Clinical Director":role==="hans"?"Clinic Lead — Titirangi":"Physiotherapist"}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft:220, flex:1, padding:"1.5rem", minHeight:"100vh" }}>
        {page==="dashboard"  && <Dashboard/>}
        {page==="staff"      && <StaffPage/>}
        {page==="compliance" && <CompliancePage/>}
        {page==="archive"    && <ArchivePage/>}
        {page==="clinics"    && <ClinicsPage/>}
        {page==="inservice"  && <InservicePage/>}
        {page==="documents"  && <DocumentsPage/>}
        {page==="management" && <ManagementPage/>}
      </div>

      {/* Profile modal */}
      <ProfileModal id={profile} onClose={()=>setProfile(null)}/>
    </div>
  );
}
