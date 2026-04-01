import { useState } from "react";

const staffData = {
  alistair: {
    name: "Alistair Burgess", ini: "AB", color: "#0F6E56",
    title: "Senior Physio · Clinical Director · H&S Officer",
    info: [["Employment","Employee (permanent)"],["Start date","24 October 2023"],["Qualification","M.Phty (Physiotherapy) — Australia"],["Registration no.","70-14433 / HPI: 29CMBK"],["Clinic","Meadowlands/Pakuranga + Howick/Edgewater (school term)"],["ACC role","Clinical Director — confirmed by ACC Nov 2023"]],
    certs: [{n:"APC 2025/2026",s:"expired",d:"Expired 31 March 2025 — upload 2025/26 now"},{n:"First Aid Level 1 (St John)",s:"expired",d:"Expired 10 August 2024 — renew with St John"},{n:"Mauriora Cultural Competency",s:"expired",d:"Expired Sept 2024 — re-enrol at mauriora.co.nz"},{n:"PNZ Membership",s:"pending",d:"Upload renewal confirmation"},{n:"Peer Review 2026",s:"pending",d:"Annual — due this year"},{n:"Performance Appraisal 2026",s:"pending",d:"Annual — due this year"},{n:"Orientation",s:"ok",d:"Completed on start"},{n:"Job Description — Physiotherapist",s:"ok",d:"Signed 27 Sept 2023"},{n:"Job Description — Clinical Director",s:"ok",d:"Signed 24 Sept 2023 — ACC confirmed"},{n:"Job Description — H&S Officer",s:"ok",d:"Signed 27 Sept 2023"},{n:"Employment Agreement",s:"ok",d:"Signed 24/9/2023 · $80,000 p.a."}]
  },
  tim: {
    name: "Tim", ini: "TI", color: "#185FA5",
    title: "Physiotherapist · Contractor 60%",
    info: [["Employment","Contractor (60%)"],["Tenure","Several years"],["Clinic","Longbay / Elmhurst"]],
    certs: [{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"PNZ Membership",s:"pending",d:"Upload if applicable"},{n:"Peer Review 2026",s:"pending",d:"Annual — due"},{n:"Performance Appraisal 2026",s:"pending",d:"Annual — due"},{n:"Orientation",s:"ok",d:"Completed"},{n:"Contract",s:"pending",d:"Upload from Drive"}]
  },
  hans: {
    name: "Hans", ini: "HA", color: "#533AB7",
    title: "Physiotherapist · Contractor 60% · Clinic Lead",
    info: [["Employment","Contractor (60%)"],["Tenure","~20 years"],["Role","Clinic lead — Meadowlands"],["Clinic","Meadowlands"]],
    certs: [{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"PNZ Membership",s:"pending",d:"Upload if applicable"},{n:"Peer Review 2026",s:"ok",d:"Completed — on file"},{n:"Performance Appraisal 2026",s:"pending",d:"Annual — due"},{n:"Orientation",s:"ok",d:"Long-standing staff"},{n:"Contract",s:"pending",d:"Upload from Drive"}]
  },
  dylan: {
    name: "Dylan", ini: "DY", color: "#D85A30",
    title: "Physiotherapist · Employee",
    info: [["Employment","Employee"],["Start date","December 2025"],["Clinic","TBC — confirm with Jade"]],
    certs: [{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"Peer Review",s:"na",d:"New staff — not due yet"},{n:"Appraisal",s:"na",d:"New staff — not due yet"},{n:"Orientation",s:"pending",d:"In progress"},{n:"Contract",s:"pending",d:"Upload from Drive"}]
  },
  ibrahim: {
    name: "Ibrahim", ini: "IB", color: "#1D9E75",
    title: "Physiotherapist · New graduate",
    info: [["Employment","New starter"],["Level","New graduate"],["Note","Some compliance items not due yet"]],
    certs: [{n:"APC 2025/2026",s:"due",d:"New grad — confirm registration with Physio Board"},{n:"First Aid / CPR",s:"due",d:"Not due yet — book when settled in"},{n:"Cultural Competency",s:"due",d:"Not due yet — complete within first year"},{n:"Peer Review",s:"na",d:"New staff"},{n:"Appraisal",s:"na",d:"New staff"},{n:"Orientation",s:"pending",d:"In progress"},{n:"Contract",s:"pending",d:"Upload from Drive"}]
  },
  isabella: {
    name: "Isabella Yang", ini: "IY", color: "#D4537E",
    title: "Physiotherapist · Employee",
    info: [["Employment","Employee"],["Start date","17 June 2024"],["Salary","$75,000 p.a."],["Clinic","TBC — confirm"]],
    certs: [{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"PNZ Membership",s:"pending",d:"Upload if applicable"},{n:"Peer Review 2026",s:"pending",d:"First annual cycle — due"},{n:"Performance Appraisal 2026",s:"pending",d:"First annual cycle — due"},{n:"Orientation",s:"ok",d:"Completed on start"},{n:"Contract",s:"pending",d:"Upload from Drive"}]
  },
  gwenne: {
    name: "Gwenne Manares", ini: "GM", color: "#639922",
    title: "Physiotherapist · Contractor 60%",
    info: [["Employment","Contractor (60%)"],["Clinic","Pools clinic"],["Note","Also known as Cormell"]],
    certs: [{n:"APC 2025/2026",s:"pending",d:"Upload required"},{n:"First Aid / CPR",s:"pending",d:"Upload certificate"},{n:"Cultural Competency",s:"pending",d:"Upload certificate"},{n:"Peer Review",s:"na",d:"Confirm timing as contractor"},{n:"Appraisal",s:"na",d:"Confirm timing as contractor"},{n:"Orientation",s:"pending",d:"In progress"},{n:"Contract",s:"pending",d:"Upload from Drive"}]
  }
};

const pastStaff = ["Alice","Aoife","Vishwali","Jean Hong","Alonzo","Sasha McBain","Steven Gray","(2 further records)"];

const pillStyle = {
  expired: { background:"#FCEBEB", color:"#A32D2D" },
  ok:      { background:"#EAF3DE", color:"#3B6D11" },
  pending: { background:"#FAEEDA", color:"#BA7517" },
  na:      { background:"#F1EFE8", color:"#5F5E5A" },
  due:     { background:"#E6F1FB", color:"#185FA5" },
};

function Pill({ s, label }) {
  return <span style={{ ...pillStyle[s], fontSize:11, padding:"3px 9px", borderRadius:20, fontWeight:500, whiteSpace:"nowrap", display:"inline-block" }}>{label || s}</span>;
}

function CertItem({ cert }) {
  const bg = { expired:"#FCEBEB", ok:"#EAF3DE", pending:"#FAEEDA", na:"#FAFAF8", due:"#E6F1FB" };
  const border = { expired:"#f5c1c1", ok:"#c0dd97", pending:"#fac775", na:"#e2e0d8", due:"#b5d4f4" };
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:6, border:`1px solid ${border[cert.s]}`, background:bg[cert.s], marginBottom:5 }}>
      <div>
        <div style={{ fontWeight:500, fontSize:13 }}>{cert.n}</div>
        <div style={{ fontSize:11, color:"#6b6963", marginTop:2 }}>{cert.d}</div>
      </div>
      <button style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"white", border:"1px solid #e2e0d8", cursor:"pointer", color:"#6b6963", whiteSpace:"nowrap" }}>
        {cert.s === "ok" ? "View" : "Upload"}
      </button>
    </div>
  );
}

function ProfileModal({ id, onClose }) {
  if (!id) return null;
  const s = staffData[id];
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:100, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"2rem 1rem", overflowY:"auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"white", borderRadius:10, width:"100%", maxWidth:660, overflow:"hidden", marginBottom:"2rem" }}>
        <div style={{ background:s.color, padding:"1.25rem 1.5rem", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:s.color+"50", border:"2px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:600, color:"white", flexShrink:0 }}>{s.ini}</div>
          <div>
            <div style={{ color:"white", fontSize:17, fontWeight:600 }}>{s.name}</div>
            <div style={{ color:"rgba(255,255,255,0.8)", fontSize:12, marginTop:3 }}>{s.title}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:"auto", background:"rgba(255,255,255,0.2)", border:"none", color:"white", width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        <div style={{ padding:"1.25rem 1.5rem", maxHeight:"70vh", overflowY:"auto" }}>
          <div style={{ marginBottom:"1.25rem" }}>
            <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:"#6b6963", marginBottom:"0.625rem", fontWeight:500 }}>Employment details</div>
            {s.info.map(([l,v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #e2e0d8", fontSize:13 }}>
                <span style={{ color:"#6b6963" }}>{l}</span>
                <span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:"#6b6963", marginBottom:"0.625rem", fontWeight:500 }}>Certifications &amp; compliance</div>
            {s.certs.map(c => <CertItem key={c.n} cert={c} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

const compRows = [
  { id:"alistair", name:"Alistair Burgess", type:"Employee",   clinic:"Pakuranga",   apc:"expired", fa:"expired", cult:"expired", pr:"pending" },
  { id:"tim",      name:"Tim",             type:"Contractor 60%", clinic:"Longbay",  apc:"pending", fa:"pending", cult:"pending", pr:"pending" },
  { id:"hans",     name:"Hans",            type:"Contractor 60%", clinic:"Meadowlands", apc:"pending", fa:"pending", cult:"pending", pr:"ok" },
  { id:"dylan",    name:"Dylan",           type:"Employee",    clinic:"TBC",         apc:"pending", fa:"pending", cult:"pending", pr:"na" },
  { id:"ibrahim",  name:"Ibrahim",         type:"New grad",    clinic:"TBC",         apc:"due",     fa:"due",     cult:"due",     pr:"na" },
  { id:"isabella", name:"Isabella Yang",   type:"Employee",    clinic:"TBC",         apc:"pending", fa:"pending", cult:"pending", pr:"pending" },
  { id:"gwenne",   name:"Gwenne Manares",  type:"Contractor 60%", clinic:"Pools",    apc:"pending", fa:"pending", cult:"pending", pr:"na" },
];

const pillLabel = { expired:"Expired", ok:"Done ✓", pending:"Upload", na:"New", due:"Confirm" };

const chipColors = {
  teal: { background:"#E1F5EE", color:"#0F6E56" },
  gray: { background:"#F1EFE8", color:"#5F5E5A" },
  blue: { background:"#E6F1FB", color:"#185FA5" },
  amber: { background:"#FAEEDA", color:"#BA7517" },
};

function Chip({ color, children }) {
  return <span style={{ ...chipColors[color], fontSize:10, padding:"2px 8px", borderRadius:20, fontWeight:500 }}>{children}</span>;
}

const staffAvatarColors = { alistair:"#0F6E56", tim:"#185FA5", hans:"#533AB7", dylan:"#D85A30", ibrahim:"#1D9E75", isabella:"#D4537E", gwenne:"#639922" };

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("owner");
  const [compTab, setCompTab] = useState("all");
  const [docsTab, setDocsTab] = useState("contracts");

  const sidebarItems = [
    { id:"dashboard", label:"◈ Dashboard", section:"Overview" },
    { id:"compliance", label:"✓ Compliance", section:null, badge:"7" },
    { id:"staff", label:"◉ All Staff", section:"People" },
    { id:"archive", label:"◎ Past Staff", section:null, adminOnly:true },
    { id:"clinics", label:"⊕ Clinics", section:"Clinics" },
    { id:"inservice", label:"◇ In-service Log", section:null },
    { id:"documents", label:"◻ Documents", section:"Admin" },
    { id:"management", label:"◈ Management", section:null, adminOnly:true },
  ];

  const roleNames = { owner:"Jade Warren", alistair:"Alistair Burgess", hans:"Hans", staff:"Staff member" };

  const s = { background:"white", color:"#1a1a18", minHeight:"100vh", fontFamily:"-apple-system,'Segoe UI',sans-serif", display:"flex" };

  return (
    <div style={s}>
      {/* SIDEBAR */}
      <div style={{ width:220, background:"white", borderRight:"1px solid #e2e0d8", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:10, overflowY:"auto" }}>
        <div style={{ padding:"1.25rem 1rem", borderBottom:"1px solid #e2e0d8" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#0F6E56", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg>
          </div>
          <div style={{ fontSize:13, fontWeight:600 }}>Total Body Physio</div>
          <div style={{ fontSize:11, color:"#6b6963", marginTop:1 }}>PhysioPortal</div>
        </div>
        <div style={{ padding:"0.75rem 1rem", borderBottom:"1px solid #e2e0d8" }}>
          <label style={{ fontSize:10, color:"#9b9892", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>Viewing as</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width:"100%", padding:"5px 8px", border:"1px solid #e2e0d8", borderRadius:6, fontSize:12, background:"#fafaf8" }}>
            <option value="owner">Jade — Owner</option>
            <option value="alistair">Alistair — Clinical Director</option>
            <option value="hans">Hans — Clinic Lead</option>
            <option value="staff">Staff member (own only)</option>
          </select>
        </div>
        <div style={{ padding:"0.5rem 0", flex:1 }}>
          {sidebarItems.map(item => {
            if (item.adminOnly && role === "staff") return null;
            return (
              <div key={item.id}>
                {item.section && <div style={{ fontSize:10, color:"#9b9892", textTransform:"uppercase", letterSpacing:"0.06em", padding:"0.625rem 1rem 0.25rem" }}>{item.section}</div>}
                <div onClick={() => setPage(item.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 1rem", fontSize:13, color: page===item.id ? "#0F6E56" : "#6b6963", cursor:"pointer", borderLeft: page===item.id ? "3px solid #0F6E56" : "3px solid transparent", background: page===item.id ? "#E1F5EE" : "transparent", fontWeight: page===item.id ? 500 : 400 }}>
                  {item.label}
                  {item.badge && <span style={{ marginLeft:"auto", background:"#FCEBEB", color:"#E24B4A", fontSize:10, padding:"1px 6px", borderRadius:10, fontWeight:600 }}>{item.badge}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"0.875rem 1rem", borderTop:"1px solid #e2e0d8" }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{roleNames[role]}</div>
          <div style={{ fontSize:11, color:"#6b6963" }}>{role === "owner" ? "Owner / Director" : role === "alistair" ? "Clinical Director" : role === "hans" ? "Clinic Lead" : "Staff member"}</div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft:220, flex:1, padding:"1.5rem", background:"#f5f3ee", minHeight:"100vh" }}>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>Good morning, Jade 👋</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Total Body Physio — Compliance & HR Portal · April 2026</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1rem" }}>
              {[["7","Active staff","#0F6E56"],["3","Expired certs","#E24B4A"],["18","Uploads needed","#BA7517"],["4","Clinics","#185FA5"]].map(([n,l,c]) => (
                <div key={l} style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1rem", textAlign:"center" }}>
                  <div style={{ fontSize:28, fontWeight:700, color:c }}>{n}</div>
                  <div style={{ fontSize:11, color:"#6b6963", marginTop:3 }}>{l}</div>
                </div>
              ))}
            </div>
            {[
              { c:"r", bg:"#FCEBEB", border:"#E24B4A", title:"🔴 Urgent — Alistair Burgess", text:"APC expired 31 March 2025 · First Aid expired Aug 2024 · Cultural Competency expired Sept 2024. Three items need renewal now for ACC compliance." },
              { c:"a", bg:"#FAEEDA", border:"#BA7517", title:"🟡 New APC cycle — 1 April 2026", text:"Upload 2025/26 APC certificates for all 7 physios. APCs renew annually on 1 April." },
              { c:"g", bg:"#EAF3DE", border:"#0F6E56", title:"🟢 System ready", text:"Tap any staff row below to open their profile and upload missing certificates." },
            ].map(a => (
              <div key={a.title} style={{ background:a.bg, borderLeft:`3px solid ${a.border}`, borderRadius:6, padding:"0.75rem 1rem", marginBottom:"0.75rem" }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{a.title}</div>
                <div style={{ fontSize:12, color:"#6b6963", lineHeight:1.5 }}>{a.text}</div>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"1.25rem 0 1rem" }}>
              <div style={{ fontSize:14, fontWeight:600 }}>Staff compliance snapshot</div>
              <button onClick={() => setPage("staff")} style={{ background:"#0F6E56", color:"white", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer" }}>View all staff →</button>
            </div>
            <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#fafaf8" }}>
                    {["Staff member","Type","Clinic","APC","First Aid","Cultural","Peer Review"].map(h => (
                      <th key={h} style={{ textAlign:"left", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"#6b6963", padding:"0.5rem 0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compRows.map(r => (
                    <tr key={r.id} onClick={() => setProfile(r.id)} style={{ cursor:"pointer" }}>
                      <td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><strong>{r.name}</strong></td>
                      <td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8", fontSize:12, color:"#6b6963" }}>{r.type}</td>
                      <td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Chip color="blue">{r.clinic}</Chip></td>
                      <td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={r.apc} label={pillLabel[r.apc]} /></td>
                      <td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={r.fa} label={pillLabel[r.fa]} /></td>
                      <td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={r.cult} label={pillLabel[r.cult]} /></td>
                      <td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={r.pr} label={pillLabel[r.pr]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STAFF */}
        {page === "staff" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>All Staff</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Tap any card to view full compliance profile</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"0.875rem" }}>
              {Object.entries(staffData).map(([id, s]) => (
                <div key={id} onClick={() => setProfile(id)} style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, overflow:"hidden", cursor:"pointer", transition:"all 0.15s" }}>
                  <div style={{ padding:"1rem 1rem 0.75rem", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid #e2e0d8" }}>
                    <div style={{ width:44, height:44, borderRadius:"50%", background:staffAvatarColors[id], display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:600, color:"white", flexShrink:0 }}>{s.ini}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:"#6b6963", marginTop:2 }}>{s.title.split("·")[0]}</div>
                    </div>
                  </div>
                  <div style={{ padding:"0.75rem 1rem" }}>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
                      {id === "alistair" && <><Chip color="teal">Clinical Director</Chip><Chip color="teal">H&S Officer</Chip><Chip color="gray">Employee</Chip></>}
                      {id === "tim" && <><Chip color="amber">Contractor 60%</Chip><Chip color="blue">Longbay</Chip></>}
                      {id === "hans" && <><Chip color="amber">Contractor 60%</Chip><Chip color="teal">Clinic Lead</Chip><Chip color="blue">Meadowlands</Chip></>}
                      {id === "dylan" && <><Chip color="gray">Employee</Chip><Chip color="teal">Dec 2025</Chip></>}
                      {id === "ibrahim" && <><Chip color="teal">New grad</Chip><Chip color="gray">New starter</Chip></>}
                      {id === "isabella" && <><Chip color="gray">Employee</Chip><Chip color="blue">Jun 2024</Chip></>}
                      {id === "gwenne" && <><Chip color="amber">Contractor 60%</Chip><Chip color="blue">Pools</Chip></>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:5, background:"#F1EFE8", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:3, background: id==="alistair" ? "#E24B4A" : id==="ibrahim" ? "#185FA5" : "#BA7517", width: id==="alistair" ? "30%" : id==="hans" ? "60%" : id==="ibrahim" ? "20%" : id==="isabella" ? "50%" : "40%" }} />
                      </div>
                      <span style={{ fontSize:11, color: id==="alistair" ? "#E24B4A" : id==="ibrahim" ? "#185FA5" : "#BA7517", whiteSpace:"nowrap" }}>
                        {id==="alistair" ? "3 expired" : id==="ibrahim" ? "Some not due yet" : id==="dylan" ? "Onboarding" : "Uploads needed"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLIANCE */}
        {page === "compliance" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>Compliance tracker</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Annual requirements — APC cycle 1 April 2026 – 31 March 2027</div>
            <div style={{ display:"flex", borderBottom:"1px solid #e2e0d8", marginBottom:"1rem" }}>
              {["all","apc","firstaid","reviews"].map(t => (
                <div key={t} onClick={() => setCompTab(t)} style={{ padding:"7px 14px", fontSize:13, color: compTab===t ? "#0F6E56" : "#6b6963", cursor:"pointer", borderBottom: compTab===t ? "2px solid #0F6E56" : "2px solid transparent", fontWeight: compTab===t ? 500 : 400 }}>
                  {t==="all" ? "All requirements" : t==="apc" ? "APC" : t==="firstaid" ? "First Aid" : "Reviews & appraisals"}
                </div>
              ))}
            </div>
            {compTab === "all" && (
              <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, overflow:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ background:"#fafaf8" }}>{["Staff","APC 25/26","First Aid","Cultural","PNZ","Peer Review","Appraisal","Orientation","Contract"].map(h => <th key={h} style={{ textAlign:"left", fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", color:"#6b6963", padding:"0.5rem 0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:500, whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[
                      ["Alistair","expired","expired","expired","pending","pending","pending","ok","ok"],
                      ["Tim","pending","pending","pending","pending","pending","pending","ok","pending"],
                      ["Hans","pending","pending","pending","pending","ok","pending","ok","pending"],
                      ["Dylan","pending","pending","pending","na","na","na","pending","pending"],
                      ["Ibrahim","due","due","due","na","na","na","pending","pending"],
                      ["Isabella","pending","pending","pending","na","pending","pending","ok","pending"],
                      ["Gwenne","pending","pending","pending","na","na","na","pending","pending"],
                    ].map(([name,...cells]) => (
                      <tr key={name}><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:600 }}>{name}</td>{cells.map((c,i) => <td key={i} style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={c} label={pillLabel[c]} /></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {compTab === "apc" && (
              <div>
                <div style={{ background:"#FAEEDA", borderLeft:"3px solid #BA7517", borderRadius:6, padding:"0.75rem 1rem", marginBottom:"0.75rem" }}>
                  <strong style={{ fontSize:13, display:"block", marginBottom:2 }}>APC — Annual Practising Certificate</strong>
                  <span style={{ fontSize:12, color:"#6b6963" }}>Issued by Physiotherapy Board of NZ. Renews 1 April each year. All physios must hold a current APC to practise.</span>
                </div>
                <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead><tr style={{ background:"#fafaf8" }}>{["Staff","Last APC on file","Expiry","2025/26 status"].map(h => <th key={h} style={{ textAlign:"left", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"#6b6963", padding:"0.5rem 0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:500 }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[["Alistair","2024/25 — on file ✓","31 March 2025","expired"],["Tim","Not yet uploaded","—","pending"],["Hans","Not yet uploaded","—","pending"],["Dylan","Not yet uploaded","—","pending"],["Ibrahim","Not yet uploaded","—","due"],["Isabella","Not yet uploaded","—","pending"],["Gwenne","Not yet uploaded","—","pending"]].map(([n,l,e,s]) => (
                        <tr key={n}><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:600 }}>{n}</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}>{l}</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}>{e}</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={s} label={s==="expired" ? "Upload 2025/26 now" : s==="due" ? "Confirm new grad status" : "Upload required"} /></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {compTab === "firstaid" && <div style={{ background:"#FAEEDA", borderLeft:"3px solid #BA7517", borderRadius:6, padding:"0.75rem 1rem" }}><strong style={{ fontSize:13, display:"block", marginBottom:2 }}>First Aid / CPR</strong><span style={{ fontSize:12, color:"#6b6963" }}>All staff require a current First Aid cert. Alistair's St John Level 1 expired 10 August 2024. Certs are valid for 2 years. Upload via each staff member's profile card.</span></div>}
            {compTab === "reviews" && (
              <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead><tr style={{ background:"#fafaf8" }}>{["Staff","Peer review 2026","Appraisal 2026","Notes"].map(h => <th key={h} style={{ textAlign:"left", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"#6b6963", padding:"0.5rem 0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:500 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[["Alistair","pending","pending","Clinical Director reviews own CPD"],["Tim","pending","pending",""],["Hans","ok","pending","Peer review on file"],["Dylan","na","na","Not due — started Dec 2025"],["Ibrahim","na","na","Not due — new grad"],["Isabella","pending","pending","First annual cycle"],["Gwenne","na","na","Confirm as contractor"]].map(([n,pr,ap,note]) => (
                      <tr key={n}><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:600 }}>{n}</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={pr} label={pillLabel[pr]} /></td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s={ap} label={pillLabel[ap]} /></td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8", fontSize:12, color:"#6b6963" }}>{note}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ARCHIVE */}
        {page === "archive" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>Past employees</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Archived records — kept for DAA / ACC audit purposes</div>
            <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1.25rem" }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:"0.75rem" }}>Former staff — 9 records</div>
              {pastStaff.map(name => (
                <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #e2e0d8" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"#F1EFE8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, color:"#5F5E5A" }}>{name.slice(0,2).toUpperCase()}</div>
                  <div><strong style={{ fontSize:13 }}>{name}</strong><div style={{ fontSize:12, color:"#6b6963" }}>Former physio · Records archived</div></div>
                  <Chip color="gray" style={{ marginLeft:"auto" }}>Archived</Chip>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLINICS */}
        {page === "clinics" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>Clinics</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Total Body Physio — all sites</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"0.875rem" }}>
              {[
                { icon:"🏥", name:"Meadowlands / Pakuranga", sub:"Main clinic", staff:["Alistair","Hans (lead)"], note:"H&S audit quarterly · In-service required annually" },
                { icon:"🏥", name:"Longbay / Elmhurst", sub:"Satellite clinic", staff:["Tim"], note:"H&S audit quarterly" },
                { icon:"🏊", name:"Pools clinic", sub:"Part-time service", staff:["Gwenne Manares"], note:"Contractor 60% · Sessions at the pools" },
                { icon:"🏫", name:"Howick / Edgewater College", sub:"School term — Hakinakina Hauora", staff:["Alistair"], note:"School term only · Hakinakina policies apply" },
                { icon:"🏥", name:"Flat Bush / Titirangi", sub:"Additional locations", staff:["As required"], note:"" },
              ].map(c => (
                <div key={c.name} style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1.25rem" }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{c.icon} {c.name}</div>
                  <div style={{ fontSize:12, color:"#6b6963", marginBottom:"0.75rem" }}>{c.sub}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:"0.75rem" }}>
                    {c.staff.map(s => <Chip key={s} color="teal">{s}</Chip>)}
                  </div>
                  {c.note && <div style={{ borderTop:"1px solid #e2e0d8", paddingTop:"0.75rem", fontSize:12, color:"#6b6963" }}>{c.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IN-SERVICE */}
        {page === "inservice" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>In-service training log</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Annual requirement — at least one per clinic group per year</div>
            <div style={{ background:"#FAEEDA", borderLeft:"3px solid #BA7517", borderRadius:6, padding:"0.75rem 1rem", marginBottom:"1rem" }}>
              <strong style={{ fontSize:13, display:"block", marginBottom:2 }}>Logistics tip</strong>
              <span style={{ fontSize:12, color:"#6b6963" }}>Getting all sites together is tough. Hans can lead in-services for the Meadowlands group. Each clinic just needs at least one documented session per year for ACC compliance.</span>
            </div>
            <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1.25rem" }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:"0.75rem" }}>2026 in-service log</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ background:"#fafaf8" }}>{["Clinic group","Topic","Date","Attendees","Status"].map(h => <th key={h} style={{ textAlign:"left", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"#6b6963", padding:"0.5rem 0.75rem", borderBottom:"1px solid #e2e0d8", fontWeight:500 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[["Meadowlands","Hans, Alistair + others"],["Longbay","Tim"],["Pools","Gwenne"]].map(([clinic, attendees]) => (
                    <tr key={clinic}><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}>{clinic}</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8", color:"#9b9892", fontStyle:"italic" }}>Not yet scheduled</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}>—</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8", fontSize:12 }}>{attendees}</td><td style={{ padding:"0.75rem", borderBottom:"1px solid #e2e0d8" }}><Pill s="pending" label="Plan required" /></td></tr>
                  ))}
                </tbody>
              </table>
              <button style={{ marginTop:"1rem", background:"white", color:"#0F6E56", border:"1px solid #0F6E56", borderRadius:6, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Log in-service session</button>
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {page === "documents" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>Documents</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Contracts, job descriptions &amp; legislation</div>
            <div style={{ display:"flex", borderBottom:"1px solid #e2e0d8", marginBottom:"1rem" }}>
              {["contracts","jd","leg"].map(t => (
                <div key={t} onClick={() => setDocsTab(t)} style={{ padding:"7px 14px", fontSize:13, color: docsTab===t ? "#0F6E56" : "#6b6963", cursor:"pointer", borderBottom: docsTab===t ? "2px solid #0F6E56" : "2px solid transparent", fontWeight: docsTab===t ? 500 : 400 }}>
                  {t==="contracts" ? "Contracts" : t==="jd" ? "Job descriptions" : "Legislation"}
                </div>
              ))}
            </div>
            {docsTab === "contracts" && (
              <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1.25rem" }}>
                {[["AB","#E1F5EE","#0F6E56","Alistair Burgess — Employment Agreement","Signed 24/9/2023 · Senior Physiotherapist · $80,000 p.a. · On file ✓","ok"],
                  ["TI","#E6F1FB","#185FA5","Tim — Contractor agreement","60% · Longbay/Elmhurst · Upload from Drive","pending"],
                  ["HA","#F1EFE8","#5F5E5A","Hans — Contractor agreement","60% · Meadowlands · Upload from Drive","pending"],
                  ["DY","#FAEEDA","#BA7517","Dylan — Employment agreement","Employee · Started Dec 2025 · Upload from Drive","pending"],
                  ["IB","#E1F5EE","#0F6E56","Ibrahim — Contract","New grad · Upload from Drive","pending"],
                  ["IY","#FCEBEB","#E24B4A","Isabella Yang — Employment agreement","Employee · Started 17 June 2024 · $75,000 p.a. · Upload from Drive","pending"],
                  ["GM","#EAF3DE","#3B6D11","Gwenne Manares — Contractor agreement","60% · Pools · Upload from Drive","pending"],
                ].map(([ini,bg,c,name,meta,s]) => (
                  <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #e2e0d8" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, color:c, flexShrink:0 }}>{ini}</div>
                    <div style={{ flex:1 }}><strong style={{ fontSize:13 }}>{name}</strong><div style={{ fontSize:12, color:"#6b6963" }}>{meta}</div></div>
                    <Pill s={s} label={s==="ok" ? "Signed" : "Upload"} />
                  </div>
                ))}
              </div>
            )}
            {docsTab === "jd" && (
              <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1.25rem" }}>
                {[["Physiotherapist — Job Description","Signed by Alistair 27/9/2023 · On file ✓","ok"],["Clinical Director — Job Description","Signed by Alistair 24/9/2023 · ACC confirmed Nov 2023 · On file ✓","ok"],["Health & Safety Officer — Job Description","Signed by Alistair 27/9/2023 · On file ✓","ok"],["All other staff — Job Descriptions","Tim, Hans, Dylan, Ibrahim, Isabella, Gwenne · Upload from Drive","pending"]].map(([name,meta,s]) => (
                  <div key={name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #e2e0d8" }}>
                    <div><strong style={{ fontSize:13 }}>{name}</strong><div style={{ fontSize:12, color:"#6b6963" }}>{meta}</div></div>
                    <Pill s={s} label={s==="ok" ? "On file" : "Upload"} />
                  </div>
                ))}
              </div>
            )}
            {docsTab === "leg" && (
              <div style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1.25rem" }}>
                {[["Health Practitioners Competence Assurance Act 2003","Governs registration and APC requirements for all physios."],["Health and Safety at Work Act 2015","H&S obligations — Alistair is H&S Officer. Quarterly audits required."],["Privacy Act 2020","Patient and staff privacy obligations."],["Employment Relations Act 2000","Employment agreements, disputes, restructuring provisions."],["ACC Allied Health Services Contract (DAA Group)","Clinical Director requirements, 16th-visit reviews, in-service obligations, orientation, audit standards."]].map(([title,desc]) => (
                  <div key={title} style={{ padding:"10px 0", borderBottom:"1px solid #e2e0d8" }}>
                    <strong style={{ fontSize:13 }}>{title}</strong>
                    <div style={{ fontSize:12, color:"#6b6963", marginTop:2 }}>{desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MANAGEMENT */}
        {page === "management" && (
          <div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:3 }}>Management</div>
            <div style={{ fontSize:13, color:"#6b6963", marginBottom:"1.25rem" }}>Audits, H&S, equipment servicing — DAA / ACC Allied Health Standards</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"0.875rem" }}>
              {[["📋 H&S Audits","Quarterly per clinic. Alistair (H&S Officer) responsible.","pending","Q1 2026 — schedule now"],["⚡ Equipment servicing","Electrical equipment service records for all clinics.","pending","Upload service reports"],["🚨 Incident reports","All incidents and near misses logged and reviewed at staff meetings.","ok","0 open incidents"],["🏆 DAA Accreditation","ACC Allied Health Standards audit prep. Compliance tracker supports audit readiness.","pending","Prep in progress"],["👥 Staff meetings","Every 3 months. Minutes and attendance logged for audit trail.","pending","Schedule Q2 2026"],["📄 16th-visit reviews","Clinical Director (Alistair) reviews each ACC client prior to 16th consultation.","pending","Log reviews here"]].map(([title, desc, s, label]) => (
                <div key={title} style={{ background:"white", border:"1px solid #e2e0d8", borderRadius:10, padding:"1.25rem" }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{title}</div>
                  <div style={{ fontSize:13, color:"#6b6963", marginBottom:"0.75rem" }}>{desc}</div>
                  <Pill s={s} label={label} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* PROFILE MODAL */}
      <ProfileModal id={profile} onClose={() => setProfile(null)} />
    </div>
  );
}
