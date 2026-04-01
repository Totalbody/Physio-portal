<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PhysioPortal — Total Body Physio</title>
<style>
  :root {
    --teal: #0F6E56; --teal-light: #E1F5EE; --teal-mid: #1D9E75;
    --red: #E24B4A; --red-light: #FCEBEB;
    --amber: #BA7517; --amber-light: #FAEEDA;
    --green: #3B6D11; --green-light: #EAF3DE;
    --gray: #5F5E5A; --gray-light: #F1EFE8; --gray-lighter: #FAFAF8;
    --blue: #185FA5; --blue-light: #E6F1FB;
    --border: #e2e0d8; --text: #1a1a18; --muted: #6b6963; --hint: #9b9892;
    --bg: #f5f3ee; --card: #ffffff;
    --radius: 10px; --radius-sm: 6px;
    font-family: -apple-system, 'Segoe UI', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); min-height: 100vh; }
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 220px; background: var(--card); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 10; overflow-y: auto; }
  .main { margin-left: 220px; flex: 1; padding: 1.5rem; }
  .sb-logo { padding: 1.25rem 1rem; border-bottom: 1px solid var(--border); }
  .sb-mark { width: 32px; height: 32px; border-radius: 50%; background: var(--teal); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
  .sb-mark svg { width: 18px; height: 18px; fill: white; }
  .sb-name { font-size: 13px; font-weight: 600; }
  .sb-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }
  .sb-role { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
  .sb-role label { font-size: 10px; color: var(--hint); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 5px; }
  .sb-role select { width: 100%; padding: 5px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12px; background: var(--gray-lighter); }
  .sb-nav { padding: 0.5rem 0; flex: 1; }
  .sb-sec { font-size: 10px; color: var(--hint); text-transform: uppercase; letter-spacing: 0.06em; padding: 0.625rem 1rem 0.25rem; }
  .sb-item { display: flex; align-items: center; gap: 8px; padding: 8px 1rem; font-size: 13px; color: var(--muted); cursor: pointer; border-left: 3px solid transparent; transition: all 0.12s; }
  .sb-item:hover { background: var(--gray-light); color: var(--text); }
  .sb-item.active { background: var(--teal-light); color: var(--teal); border-left-color: var(--teal); font-weight: 500; }
  .sb-badge { margin-left: auto; background: var(--red-light); color: var(--red); font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 600; }
  .sb-footer { padding: 0.875rem 1rem; border-top: 1px solid var(--border); }
  .sb-user strong { display: block; font-size: 13px; color: var(--text); }
  .sb-user span { font-size: 11px; color: var(--muted); }

  .page { display: none; }
  .page.active { display: block; }
  .page-title { font-size: 20px; font-weight: 600; margin-bottom: 3px; }
  .page-sub { font-size: 13px; color: var(--muted); margin-bottom: 1.25rem; }

  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1rem; }
  .card-title { font-size: 14px; font-weight: 600; margin-bottom: 0.75rem; }

  .stat-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.75rem; margin-bottom: 1rem; }
  .stat { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; text-align: center; }
  .stat-n { font-size: 28px; font-weight: 700; }
  .stat-n.r { color: var(--red); } .stat-n.a { color: var(--amber); } .stat-n.g { color: var(--teal); } .stat-n.b { color: var(--blue); }
  .stat-l { font-size: 11px; color: var(--muted); margin-top: 3px; }

  .alert { border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 0.75rem; border-left: 3px solid; }
  .alert.r { background: var(--red-light); border-color: var(--red); }
  .alert.a { background: var(--amber-light); border-color: var(--amber); }
  .alert.g { background: var(--green-light); border-color: var(--teal); }
  .alert strong { font-size: 13px; display: block; margin-bottom: 2px; }
  .alert p { font-size: 12px; line-height: 1.5; color: var(--muted); }

  .staff-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(270px,1fr)); gap: 0.875rem; }
  .sc { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: all 0.15s; }
  .sc:hover { border-color: var(--teal); box-shadow: 0 2px 12px rgba(15,110,86,0.1); transform: translateY(-1px); }
  .sc-head { padding: 1rem 1rem 0.75rem; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
  .sc-av { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; color: white; flex-shrink: 0; }
  .sc-n { font-size: 14px; font-weight: 600; }
  .sc-r { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .sc-body { padding: 0.75rem 1rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0.5rem; }
  .chip { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
  .ct { background: var(--teal-light); color: var(--teal); }
  .cg { background: var(--gray-light); color: var(--gray); }
  .cb { background: var(--blue-light); color: var(--blue); }
  .ca { background: var(--amber-light); color: var(--amber); }
  .cr { background: var(--red-light); color: var(--red); }
  .sc-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .sc-bar { flex: 1; height: 5px; background: var(--gray-light); border-radius: 3px; overflow: hidden; }
  .sc-bar-fill { height: 100%; border-radius: 3px; }
  .sc-bar-lbl { font-size: 11px; white-space: nowrap; }

  .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tbl th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); background: var(--gray-lighter); font-weight: 500; }
  .tbl td { padding: 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:hover td { background: var(--gray-lighter); }

  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; white-space: nowrap; }
  .pill.ok { background: var(--green-light); color: var(--green); }
  .pill.expired { background: var(--red-light); color: var(--red); }
  .pill.pending { background: var(--amber-light); color: var(--amber); }
  .pill.na { background: var(--gray-light); color: var(--gray); }
  .pill.due { background: var(--blue-light); color: var(--blue); }
  .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

  .tabs { display: flex; gap: 0; margin-bottom: 1rem; border-bottom: 1px solid var(--border); }
  .tab { padding: 7px 14px; font-size: 13px; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--teal); border-bottom-color: var(--teal); font-weight: 500; }
  .tc { display: none; }
  .tc.active { display: block; }

  .modal-bg { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 100; align-items: flex-start; justify-content: center; padding: 2rem 1rem; overflow-y: auto; }
  .modal-bg.open { display: flex; }
  .modal { background: var(--card); border-radius: var(--radius); width: 100%; max-width: 660px; overflow: hidden; }
  .mh { padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 14px; }
  .mav { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: white; border: 2px solid rgba(255,255,255,0.3); flex-shrink: 0; }
  .mn { color: white; font-size: 17px; font-weight: 600; }
  .mt { color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 3px; }
  .mcl { margin-left: auto; background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; }
  .mb { padding: 1.25rem 1.5rem; max-height: 70vh; overflow-y: auto; }
  .ms-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.625rem; font-weight: 500; }
  .ir { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .ir:last-child { border-bottom: none; }
  .il { color: var(--muted); }
  .iv { font-weight: 500; }
  .cert-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 12px; margin-bottom: 5px; }
  .cert-item.expired { background: var(--red-light); border-color: #f5c1c1; }
  .cert-item.ok { background: var(--green-light); border-color: #c0dd97; }
  .cert-item.pending { background: var(--amber-light); border-color: #fac775; }
  .cert-item.na { background: var(--gray-lighter); }
  .cert-item.due { background: var(--blue-light); border-color: #b5d4f4; }
  .ci-name { font-weight: 500; font-size: 13px; }
  .ci-date { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .up-btn { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: white; border: 1px solid var(--border); cursor: pointer; color: var(--muted); white-space: nowrap; }
  .up-btn:hover { background: var(--teal); color: white; border-color: var(--teal); }

  .row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .row:last-child { border-bottom: none; }
  .av-sm { width: 32px; height: 32px; border-radius: 50%; background: var(--gray-light); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: var(--gray); flex-shrink: 0; }
  .sec-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
  .btn-p { background: var(--teal); color: white; }
  .btn-o { background: white; color: var(--teal); border: 1px solid var(--teal); }
  .divider { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
  .empty { text-align: center; padding: 2rem; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
<div class="app">

<div class="sidebar">
  <div class="sb-logo">
    <div class="sb-mark"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/></svg></div>
    <div class="sb-name">Total Body Physio</div>
    <div class="sb-sub">PhysioPortal</div>
  </div>
  <div class="sb-role">
    <label>Viewing as</label>
    <select onchange="switchRole(this.value)">
      <option value="owner">Jade — Owner</option>
      <option value="alistair">Alistair — Clinical Director</option>
      <option value="hans">Hans — Clinic Lead</option>
      <option value="staff">Staff member (own only)</option>
    </select>
  </div>
  <div class="sb-nav">
    <div class="sb-sec">Overview</div>
    <div class="sb-item active" onclick="nav('dashboard',this)">◈ Dashboard</div>
    <div class="sb-item" onclick="nav('compliance',this)">✓ Compliance <span class="sb-badge">7</span></div>
    <div class="sb-sec">People</div>
    <div class="sb-item" onclick="nav('staff',this)">◉ All Staff</div>
    <div class="sb-item admin-only" onclick="nav('archive',this)">◎ Past Staff</div>
    <div class="sb-sec">Clinic</div>
    <div class="sb-item" onclick="nav('clinics',this)">⊕ Clinics</div>
    <div class="sb-item" onclick="nav('inservice',this)">◇ In-service Log</div>
    <div class="sb-sec">Admin</div>
    <div class="sb-item" onclick="nav('documents',this)">◻ Documents</div>
    <div class="sb-item admin-only" onclick="nav('management',this)">◈ Management</div>
  </div>
  <div class="sb-footer">
    <div class="sb-user"><strong id="sb-name">Jade Warren</strong><span>Owner / Director</span></div>
  </div>
</div>

<div class="main">

<!-- DASHBOARD -->
<div class="page active" id="page-dashboard">
  <div class="page-title">Good morning, Jade 👋</div>
  <div class="page-sub">Total Body Physio — Compliance &amp; HR Portal · April 2026</div>
  <div class="stat-row">
    <div class="stat"><div class="stat-n g">7</div><div class="stat-l">Active staff</div></div>
    <div class="stat"><div class="stat-n r">3</div><div class="stat-l">Expired certs</div></div>
    <div class="stat"><div class="stat-n a">18</div><div class="stat-l">Uploads needed</div></div>
    <div class="stat"><div class="stat-n b">4</div><div class="stat-l">Clinics</div></div>
  </div>
  <div class="alert r"><strong>🔴 Urgent — Alistair Burgess</strong><p>APC expired 31 March 2025 · First Aid expired Aug 2024 · Cultural Competency expired Sept 2024. Three items need renewal now for ACC compliance.</p></div>
  <div class="alert a"><strong>🟡 New APC cycle started — 1 April 2026</strong><p>Upload 2025/26 APC certificates for all 7 physios. APCs renew annually on 1 April.</p></div>
  <div class="alert g"><strong>🟢 System ready</strong><p>Click any staff row to open their profile and upload missing certificates. Past staff records are archived in the sidebar.</p></div>
  <div class="sec-hdr" style="margin-top:1.25rem">
    <div style="font-size:14px;font-weight:600">Staff compliance snapshot</div>
    <button class="btn btn-p" onclick="nav('staff',null)">View all staff →</button>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <table class="tbl">
      <thead><tr><th>Staff member</th><th>Type</th><th>Clinic</th><th>APC</th><th>First Aid</th><th>Cultural</th><th>Peer Review</th></tr></thead>
      <tbody>
        <tr onclick="openProfile('alistair')" style="cursor:pointer"><td><strong>Alistair Burgess</strong></td><td>Employee</td><td><span class="chip cb">Pakuranga</span></td><td><span class="pill expired"><span class="dot" style="background:var(--red)"></span>Expired</span></td><td><span class="pill expired"><span class="dot" style="background:var(--red)"></span>Expired</span></td><td><span class="pill expired"><span class="dot" style="background:var(--red)"></span>Expired</span></td><td><span class="pill pending">Due</span></td></tr>
        <tr onclick="openProfile('tim')" style="cursor:pointer"><td><strong>Tim</strong></td><td>Contractor 60%</td><td><span class="chip cb">Longbay</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Due</span></td></tr>
        <tr onclick="openProfile('hans')" style="cursor:pointer"><td><strong>Hans</strong></td><td>Contractor 60%</td><td><span class="chip cb">Meadowlands</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill ok">Done ✓</span></td></tr>
        <tr onclick="openProfile('dylan')" style="cursor:pointer"><td><strong>Dylan</strong></td><td>Employee</td><td><span class="chip cg">TBC</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill na">New</span></td></tr>
        <tr onclick="openProfile('ibrahim')" style="cursor:pointer"><td><strong>Ibrahim</strong></td><td>New grad</td><td><span class="chip cg">TBC</span></td><td><span class="pill due">Confirm</span></td><td><span class="pill due">Not due yet</span></td><td><span class="pill due">Not due yet</span></td><td><span class="pill na">New</span></td></tr>
        <tr onclick="openProfile('isabella')" style="cursor:pointer"><td><strong>Isabella Yang</strong></td><td>Employee</td><td><span class="chip cg">TBC</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Due</span></td></tr>
        <tr onclick="openProfile('gwenne')" style="cursor:pointer"><td><strong>Gwenne Manares</strong></td><td>Contractor 60%</td><td><span class="chip cb">Pools</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill na">Check</span></td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- STAFF -->
<div class="page" id="page-staff">
  <div class="page-title">All Staff</div>
  <div class="page-sub">Tap any card to view full compliance profile</div>
  <div class="staff-grid">
    <div class="sc" onclick="openProfile('alistair')"><div class="sc-head"><div class="sc-av" style="background:#0F6E56">AB</div><div><div class="sc-n">Alistair Burgess</div><div class="sc-r">Senior Physiotherapist</div></div></div><div class="sc-body"><div class="chips"><span class="chip ct">Clinical Director</span><span class="chip ct">H&amp;S Officer</span><span class="chip cg">Employee</span><span class="chip cb">Pakuranga</span></div><div class="sc-bar-wrap"><div class="sc-bar"><div class="sc-bar-fill" style="width:30%;background:var(--red)"></div></div><span class="sc-bar-lbl" style="color:var(--red)">3 expired</span></div></div></div>
    <div class="sc" onclick="openProfile('tim')"><div class="sc-head"><div class="sc-av" style="background:#185FA5">TI</div><div><div class="sc-n">Tim</div><div class="sc-r">Physiotherapist</div></div></div><div class="sc-body"><div class="chips"><span class="chip ca">Contractor 60%</span><span class="chip cb">Longbay / Elmhurst</span></div><div class="sc-bar-wrap"><div class="sc-bar"><div class="sc-bar-fill" style="width:45%;background:var(--amber)"></div></div><span class="sc-bar-lbl" style="color:var(--amber)">Uploads needed</span></div></div></div>
    <div class="sc" onclick="openProfile('hans')"><div class="sc-head"><div class="sc-av" style="background:#533AB7">HA</div><div><div class="sc-n">Hans</div><div class="sc-r">Physiotherapist · Clinic Lead</div></div></div><div class="sc-body"><div class="chips"><span class="chip ca">Contractor 60%</span><span class="chip ct">Clinic Lead</span><span class="chip cb">Meadowlands</span></div><div class="sc-bar-wrap"><div class="sc-bar"><div class="sc-bar-fill" style="width:60%;background:var(--amber)"></div></div><span class="sc-bar-lbl" style="color:var(--amber)">Uploads needed</span></div></div></div>
    <div class="sc" onclick="openProfile('dylan')"><div class="sc-head"><div class="sc-av" style="background:#D85A30">DY</div><div><div class="sc-n">Dylan</div><div class="sc-r">Physiotherapist</div></div></div><div class="sc-body"><div class="chips"><span class="chip cg">Employee</span><span class="chip ct">Dec 2025</span></div><div class="sc-bar-wrap"><div class="sc-bar"><div class="sc-bar-fill" style="width:35%;background:var(--amber)"></div></div><span class="sc-bar-lbl" style="color:var(--amber)">Onboarding</span></div></div></div>
    <div class="sc" onclick="openProfile('ibrahim')"><div class="sc-head"><div class="sc-av" style="background:#1D9E75">IB</div><div><div class="sc-n">Ibrahim</div><div class="sc-r">Physiotherapist · New grad</div></div></div><div class="sc-body"><div class="chips"><span class="chip ct">New grad</span><span class="chip cg">New starter</span></div><div class="sc-bar-wrap"><div class="sc-bar"><div class="sc-bar-fill" style="width:20%;background:var(--blue)"></div></div><span class="sc-bar-lbl" style="color:var(--blue)">Some not due yet</span></div></div></div>
    <div class="sc" onclick="openProfile('isabella')"><div class="sc-head"><div class="sc-av" style="background:#D4537E">IY</div><div><div class="sc-n">Isabella Yang</div><div class="sc-r">Physiotherapist</div></div></div><div class="sc-body"><div class="chips"><span class="chip cg">Employee</span><span class="chip cb">Jun 2024</span></div><div class="sc-bar-wrap"><div class="sc-bar"><div class="sc-bar-fill" style="width:50%;background:var(--amber)"></div></div><span class="sc-bar-lbl" style="color:var(--amber)">Uploads needed</span></div></div></div>
    <div class="sc" onclick="openProfile('gwenne')"><div class="sc-head"><div class="sc-av" style="background:#639922">GM</div><div><div class="sc-n">Gwenne Manares</div><div class="sc-r">Physiotherapist</div></div></div><div class="sc-body"><div class="chips"><span class="chip ca">Contractor 60%</span><span class="chip cb">Pools</span></div><div class="sc-bar-wrap"><div class="sc-bar"><div class="sc-bar-fill" style="width:40%;background:var(--amber)"></div></div><span class="sc-bar-lbl" style="color:var(--amber)">Uploads needed</span></div></div></div>
  </div>
</div>

<!-- COMPLIANCE -->
<div class="page" id="page-compliance">
  <div class="page-title">Compliance tracker</div>
  <div class="page-sub">Annual requirements — APC cycle 1 April 2026 – 31 March 2027</div>
  <div class="tabs">
    <div class="tab active" onclick="showTab('comp','all',this)">All requirements</div>
    <div class="tab" onclick="showTab('comp','apc',this)">APC</div>
    <div class="tab" onclick="showTab('comp','firstaid',this)">First Aid</div>
    <div class="tab" onclick="showTab('comp','reviews',this)">Reviews &amp; appraisals</div>
  </div>
  <div class="tc active" id="comp-all">
    <div class="card" style="padding:0;overflow:hidden;overflow-x:auto">
      <table class="tbl">
        <thead><tr><th>Staff</th><th>APC 25/26</th><th>First Aid</th><th>Cultural</th><th>PNZ Mbr</th><th>Peer Review</th><th>Appraisal</th><th>Orientation</th><th>Contract</th></tr></thead>
        <tbody>
          <tr><td><strong>Alistair</strong></td><td><span class="pill expired">Expired</span></td><td><span class="pill expired">Expired</span></td><td><span class="pill expired">Expired</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Due</span></td><td><span class="pill pending">Due</span></td><td><span class="pill ok">Done</span></td><td><span class="pill ok">Signed</span></td></tr>
          <tr><td><strong>Tim</strong></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Due</span></td><td><span class="pill pending">Due</span></td><td><span class="pill ok">Done</span></td><td><span class="pill pending">Upload</span></td></tr>
          <tr><td><strong>Hans</strong></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill ok">Done</span></td><td><span class="pill pending">Due</span></td><td><span class="pill ok">Done</span></td><td><span class="pill pending">Upload</span></td></tr>
          <tr><td><strong>Dylan</strong></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill na">N/A</span></td><td><span class="pill na">New</span></td><td><span class="pill na">New</span></td><td><span class="pill pending">In progress</span></td><td><span class="pill pending">Upload</span></td></tr>
          <tr><td><strong>Ibrahim</strong></td><td><span class="pill due">Confirm</span></td><td><span class="pill due">Not due</span></td><td><span class="pill due">Not due</span></td><td><span class="pill na">N/A</span></td><td><span class="pill na">New</span></td><td><span class="pill na">New</span></td><td><span class="pill pending">In progress</span></td><td><span class="pill pending">Upload</span></td></tr>
          <tr><td><strong>Isabella</strong></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill na">N/A</span></td><td><span class="pill pending">Due</span></td><td><span class="pill pending">Due</span></td><td><span class="pill ok">Done</span></td><td><span class="pill pending">Upload</span></td></tr>
          <tr><td><strong>Gwenne</strong></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill pending">Upload</span></td><td><span class="pill na">N/A</span></td><td><span class="pill na">Check</span></td><td><span class="pill na">Check</span></td><td><span class="pill pending">In progress</span></td><td><span class="pill pending">Upload</span></td></tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:0.5rem">Tap any staff row on the dashboard to open their profile and upload certificates directly.</p>
  </div>
  <div class="tc" id="comp-apc">
    <div class="alert a"><strong>APC — Annual Practising Certificate</strong><p>Issued by Physiotherapy Board of NZ. Renews 1 April each year. All physios must hold a current APC to practise. Employer covers the cost per Alistair's contract.</p></div>
    <div class="card" style="padding:0;overflow:hidden"><table class="tbl"><thead><tr><th>Staff</th><th>Last APC on file</th><th>Expiry</th><th>2025/26 status</th></tr></thead><tbody>
      <tr><td><strong>Alistair</strong></td><td>2024/25 — on file ✓</td><td>31 March 2025</td><td><span class="pill expired">Upload 2025/26 now</span></td></tr>
      <tr><td><strong>Tim</strong></td><td>Not yet uploaded</td><td>—</td><td><span class="pill pending">Upload required</span></td></tr>
      <tr><td><strong>Hans</strong></td><td>Not yet uploaded</td><td>—</td><td><span class="pill pending">Upload required</span></td></tr>
      <tr><td><strong>Dylan</strong></td><td>Not yet uploaded</td><td>—</td><td><span class="pill pending">Upload required</span></td></tr>
      <tr><td><strong>Ibrahim</strong></td><td>Not yet uploaded</td><td>—</td><td><span class="pill due">Confirm new grad status</span></td></tr>
      <tr><td><strong>Isabella</strong></td><td>Not yet uploaded</td><td>—</td><td><span class="pill pending">Upload required</span></td></tr>
      <tr><td><strong>Gwenne</strong></td><td>Not yet uploaded</td><td>—</td><td><span class="pill pending">Upload required</span></td></tr>
    </tbody></table></div>
  </div>
  <div class="tc" id="comp-firstaid">
    <div class="alert a"><strong>First Aid / CPR</strong><p>All staff require a current First Aid certificate. Alistair's St John Level 1 (Training ID: 835976) expired 10 August 2024. Certificates are valid for 2 years. Book refreshers at St John or equivalent NZQA provider.</p></div>
    <div class="empty">Upload each staff member's First Aid cert via their profile card on the Staff page.</div>
  </div>
  <div class="tc" id="comp-reviews">
    <div class="alert a"><strong>Peer reviews &amp; performance appraisals</strong><p>Annual requirement for ACC compliance. Peer reviews must be documented. Appraisals can be a simple recorded conversation — doesn't have to be elaborate. Alistair as Clinical Director oversees clinical peer review.</p></div>
    <div class="card" style="padding:0;overflow:hidden"><table class="tbl"><thead><tr><th>Staff</th><th>Peer review 2026</th><th>Appraisal 2026</th><th>Notes</th></tr></thead><tbody>
      <tr><td><strong>Alistair</strong></td><td><span class="pill pending">Due</span></td><td><span class="pill pending">Due</span></td><td>Clinical Director reviews own CPD</td></tr>
      <tr><td><strong>Tim</strong></td><td><span class="pill pending">Due</span></td><td><span class="pill pending">Due</span></td><td></td></tr>
      <tr><td><strong>Hans</strong></td><td><span class="pill ok">Done ✓</span></td><td><span class="pill pending">Due</span></td><td>Peer review on file</td></tr>
      <tr><td><strong>Dylan</strong></td><td><span class="pill na">New staff</span></td><td><span class="pill na">New staff</span></td><td>Not due — started Dec 2025</td></tr>
      <tr><td><strong>Ibrahim</strong></td><td><span class="pill na">New staff</span></td><td><span class="pill na">New staff</span></td><td>Not due — new grad</td></tr>
      <tr><td><strong>Isabella</strong></td><td><span class="pill pending">Due</span></td><td><span class="pill pending">Due</span></td><td>Started Jun 2024 — first annual cycle</td></tr>
      <tr><td><strong>Gwenne</strong></td><td><span class="pill na">Check</span></td><td><span class="pill na">Check</span></td><td>Confirm as contractor</td></tr>
    </tbody></table></div>
  </div>
</div>

<!-- ARCHIVE -->
<div class="page" id="page-archive">
  <div class="page-title">Past employees</div>
  <div class="page-sub">Archived records — kept for DAA / ACC audit purposes</div>
  <div class="card">
    <div class="card-title">Former staff — 9 records</div>
    <div class="row"><div class="av-sm">AL</div><div><strong>Alice</strong><div style="font-size:12px;color:var(--muted)">Former physio · Records archived</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
    <div class="row"><div class="av-sm">AO</div><div><strong>Aoife</strong><div style="font-size:12px;color:var(--muted)">Former physio · Records archived</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
    <div class="row"><div class="av-sm">VI</div><div><strong>Vishwali</strong><div style="font-size:12px;color:var(--muted)">Former physio · Records archived</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
    <div class="row"><div class="av-sm">JH</div><div><strong>Jean Hong</strong><div style="font-size:12px;color:var(--muted)">Former physio · Records archived</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
    <div class="row"><div class="av-sm">AN</div><div><strong>Alonzo</strong><div style="font-size:12px;color:var(--muted)">Former physio · Records archived</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
    <div class="row"><div class="av-sm">SM</div><div><strong>Sasha McBain</strong><div style="font-size:12px;color:var(--muted)">Former physio · Records archived</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
    <div class="row"><div class="av-sm">SG</div><div><strong>Steven Gray</strong><div style="font-size:12px;color:var(--muted)">Former physio · Records archived</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
    <div class="row"><div class="av-sm">+2</div><div><strong>2 further records</strong><div style="font-size:12px;color:var(--muted)">Names to be confirmed</div></div><span class="chip cg" style="margin-left:auto">Archived</span></div>
  </div>
</div>

<!-- CLINICS -->
<div class="page" id="page-clinics">
  <div class="page-title">Clinics</div>
  <div class="page-sub">Total Body Physio — all sites</div>
  <div class="staff-grid">
    <div class="card"><div class="card-title">🏥 Meadowlands / Pakuranga</div><p style="font-size:12px;color:var(--muted);margin-bottom:0.75rem">Main clinic</p><div class="chips"><span class="chip ct">Alistair</span><span class="chip ct">Hans (lead)</span></div><div class="divider"></div><p style="font-size:12px;color:var(--muted)">H&S audit quarterly · In-service log required annually</p></div>
    <div class="card"><div class="card-title">🏥 Longbay / Elmhurst</div><p style="font-size:12px;color:var(--muted);margin-bottom:0.75rem">Satellite clinic</p><div class="chips"><span class="chip cb">Tim</span></div><div class="divider"></div><p style="font-size:12px;color:var(--muted)">H&S audit quarterly</p></div>
    <div class="card"><div class="card-title">🏊 Pools clinic</div><p style="font-size:12px;color:var(--muted);margin-bottom:0.75rem">Part-time service</p><div class="chips"><span class="chip ct">Gwenne Manares</span></div><div class="divider"></div><p style="font-size:12px;color:var(--muted)">Contractor 60% · Sessions at the pools</p></div>
    <div class="card"><div class="card-title">🏫 Howick / Edgewater College</div><p style="font-size:12px;color:var(--muted);margin-bottom:0.75rem">School term — Hakinakina Hauora</p><div class="chips"><span class="chip cb">Alistair</span></div><div class="divider"></div><p style="font-size:12px;color:var(--muted)">School term only · Hakinakina policies apply · Howick College &amp; Edgewater College</p></div>
    <div class="card"><div class="card-title">🏥 Flat Bush / Titirangi</div><p style="font-size:12px;color:var(--muted);margin-bottom:0.75rem">Additional locations</p><div class="chips"><span class="chip cg">As required</span></div></div>
  </div>
</div>

<!-- IN-SERVICE -->
<div class="page" id="page-inservice">
  <div class="page-title">In-service training log</div>
  <div class="page-sub">Annual requirement — at least one per clinic group per year</div>
  <div class="alert a"><strong>Logistics tip</strong><p>Getting all sites together is tough. Hans can lead in-services for the Meadowlands group. Each clinic just needs at least one documented in-service per year for ACC compliance — a small focused session counts.</p></div>
  <div class="card">
    <div class="card-title">2026 in-service log</div>
    <table class="tbl">
      <thead><tr><th>Clinic group</th><th>Topic</th><th>Date</th><th>Attendees</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Meadowlands</td><td style="color:var(--muted)"><em>Not yet scheduled</em></td><td>—</td><td>Hans, Alistair + others</td><td><span class="pill pending">Plan required</span></td></tr>
        <tr><td>Longbay</td><td style="color:var(--muted)"><em>Not yet scheduled</em></td><td>—</td><td>Tim</td><td><span class="pill pending">Plan required</span></td></tr>
        <tr><td>Pools</td><td style="color:var(--muted)"><em>Not yet scheduled</em></td><td>—</td><td>Gwenne</td><td><span class="pill pending">Plan required</span></td></tr>
      </tbody>
    </table>
    <div style="margin-top:1rem"><button class="btn btn-o">+ Log in-service session</button></div>
  </div>
</div>

<!-- DOCUMENTS -->
<div class="page" id="page-documents">
  <div class="page-title">Documents</div>
  <div class="page-sub">Contracts, job descriptions, policies &amp; legislation</div>
  <div class="tabs">
    <div class="tab active" onclick="showTab('docs','contracts',this)">Contracts</div>
    <div class="tab" onclick="showTab('docs','jd',this)">Job descriptions</div>
    <div class="tab" onclick="showTab('docs','leg',this)">Legislation</div>
  </div>
  <div class="tc active" id="docs-contracts">
    <div class="card">
      <div class="row"><div class="av-sm" style="background:var(--teal-light);color:var(--teal)">AB</div><div style="flex:1"><strong>Alistair Burgess — Employment Agreement</strong><div style="font-size:12px;color:var(--muted)">Signed 24/9/2023 · Senior Physiotherapist · $80,000 p.a. · On file ✓</div></div><span class="pill ok">Signed</span></div>
      <div class="row"><div class="av-sm" style="background:var(--blue-light);color:var(--blue)">TI</div><div style="flex:1"><strong>Tim — Contractor agreement</strong><div style="font-size:12px;color:var(--muted)">60% · Longbay/Elmhurst · Upload from Drive</div></div><span class="pill pending">Upload</span></div>
      <div class="row"><div class="av-sm" style="background:var(--gray-light);color:var(--gray)">HA</div><div style="flex:1"><strong>Hans — Contractor agreement</strong><div style="font-size:12px;color:var(--muted)">60% · Meadowlands · Upload from Drive</div></div><span class="pill pending">Upload</span></div>
      <div class="row"><div class="av-sm" style="background:var(--amber-light);color:var(--amber)">DY</div><div style="flex:1"><strong>Dylan — Employment agreement</strong><div style="font-size:12px;color:var(--muted)">Employee · Started Dec 2025 · Upload from Drive</div></div><span class="pill pending">Upload</span></div>
      <div class="row"><div class="av-sm" style="background:var(--teal-light);color:var(--teal)">IB</div><div style="flex:1"><strong>Ibrahim — Contract</strong><div style="font-size:12px;color:var(--muted)">New grad · Upload from Drive</div></div><span class="pill pending">Upload</span></div>
      <div class="row"><div class="av-sm" style="background:var(--red-light);color:var(--red)">IY</div><div style="flex:1"><strong>Isabella Yang — Employment agreement</strong><div style="font-size:12px;color:var(--muted)">Employee · Started 17 June 2024 · $75,000 p.a. · Upload from Drive</div></div><span class="pill pending">Upload</span></div>
      <div class="row"><div class="av-sm" style="background:var(--green-light);color:var(--green)">GM</div><div style="flex:1"><strong>Gwenne Manares — Contractor agreement</strong><div style="font-size:12px;color:var(--muted)">60% · Pools · Upload from Drive</div></div><span class="pill pending">Upload</span></div>
    </div>
  </div>
  <div class="tc" id="docs-jd">
    <div class="card">
      <div class="row"><div style="flex:1"><strong>Physiotherapist — Job Description</strong><div style="font-size:12px;color:var(--muted)">Signed by Alistair 27/9/2023 · On file ✓</div></div><span class="pill ok">On file</span></div>
      <div class="row"><div style="flex:1"><strong>Clinical Director — Job Description</strong><div style="font-size:12px;color:var(--muted)">Signed by Alistair 24/9/2023 · ACC confirmed Nov 2023 · On file ✓</div></div><span class="pill ok">On file</span></div>
      <div class="row"><div style="flex:1"><strong>Health &amp; Safety Officer — Job Description</strong><div style="font-size:12px;color:var(--muted)">Signed by Alistair 27/9/2023 · On file ✓</div></div><span class="pill ok">On file</span></div>
      <div class="row"><div style="flex:1"><strong>All other staff — Job Descriptions</strong><div style="font-size:12px;color:var(--muted)">Tim, Hans, Dylan, Ibrahim, Isabella, Gwenne · Upload from Drive</div></div><span class="pill pending">Upload</span></div>
    </div>
  </div>
  <div class="tc" id="docs-leg">
    <div class="card">
      <div style="font-size:13px;line-height:1.8;color:var(--muted)">
        <p><strong style="color:var(--text)">Health Practitioners Competence Assurance Act 2003</strong><br>Governs registration and APC requirements for all physios.</p><br>
        <p><strong style="color:var(--text)">Health and Safety at Work Act 2015</strong><br>H&S obligations — Alistair is H&S Officer. Quarterly audits required.</p><br>
        <p><strong style="color:var(--text)">Privacy Act 2020</strong><br>Patient and staff privacy obligations. All staff must comply.</p><br>
        <p><strong style="color:var(--text)">Employment Relations Act 2000</strong><br>Employment agreements, disputes, restructuring provisions.</p><br>
        <p><strong style="color:var(--text)">ACC Allied Health Services Contract (DAA Group)</strong><br>Clinical Director requirements, 16th-visit reviews, in-service obligations, orientation, audit standards. Audited by DAA Group.</p>
      </div>
    </div>
  </div>
</div>

<!-- MANAGEMENT -->
<div class="page" id="page-management">
  <div class="page-title">Management</div>
  <div class="page-sub">Audits, H&S, equipment servicing, accreditation — DAA / ACC Allied Health Standards</div>
  <div class="staff-grid">
    <div class="card"><div class="card-title">📋 H&S Audits</div><p style="font-size:13px;color:var(--muted);margin-bottom:0.75rem">Quarterly per clinic. Alistair (H&S Officer) responsible. Due every 3 months.</p><span class="pill pending">Q1 2026 — schedule now</span></div>
    <div class="card"><div class="card-title">⚡ Equipment servicing</div><p style="font-size:13px;color:var(--muted);margin-bottom:0.75rem">Electrical equipment service records for all clinics.</p><span class="pill pending">Upload service reports</span></div>
    <div class="card"><div class="card-title">🚨 Incident reports</div><p style="font-size:13px;color:var(--muted);margin-bottom:0.75rem">All incidents and near misses. Reviewed by H&S Officer and reported at staff meetings.</p><span class="pill ok">0 open incidents</span></div>
    <div class="card"><div class="card-title">🏆 DAA Accreditation</div><p style="font-size:13px;color:var(--muted);margin-bottom:0.75rem">ACC Allied Health Standards audit prep. This compliance tracker directly supports audit readiness.</p><span class="pill pending">Prep in progress</span></div>
    <div class="card"><div class="card-title">👥 Staff meetings</div><p style="font-size:13px;color:var(--muted);margin-bottom:0.75rem">Every 3 months. Minutes and attendance logged here for audit trail.</p><span class="pill pending">Schedule Q2 2026</span></div>
    <div class="card"><div class="card-title">📄 16th-visit reviews</div><p style="font-size:13px;color:var(--muted);margin-bottom:0.75rem">Clinical Director (Alistair) reviews each ACC client prior to their 16th consultation.</p><span class="pill pending">Log reviews here</span></div>
  </div>
</div>

</div><!-- /main -->
</div><!-- /app -->

<!-- PROFILE MODAL -->
<div class="modal-bg" id="modal-bg" onclick="if(event.target===this)this.classList.remove('open')">
  <div class="modal">
    <div class="mh" id="mh">
      <div class="mav" id="mav">AB</div>
      <div><div class="mn" id="mn">Name</div><div class="mt" id="mt">Role</div></div>
      <button class="mcl" onclick="document.getElementById('modal-bg').classList.remove('open')">✕</button>
    </div>
    <div class="mb" id="mb"></div>
  </div>
</div>

<script>
const staffData = {
  alistair: { name:'Alistair Burgess', ini:'AB', color:'#0F6E56', title:'Senior Physio · Clinical Director · H&S Officer',
    info:[['Employment','Employee (permanent)'],['Start date','24 October 2023'],['Qualification','M.Phty (Physiotherapy) — Australia'],['Registration no.','70-14433 / HPI: 29CMBK'],['Clinic','Meadowlands/Pakuranga + Howick/Edgewater (school term)'],['ACC role','Clinical Director — confirmed by ACC Nov 2023']],
    certs:[{n:'APC 2025/2026',s:'expired',d:'Expired 31 March 2025 — upload 2025/26 now'},{n:'First Aid Level 1 (St John, ID:835976)',s:'expired',d:'Expired 10 August 2024 — renew with St John'},{n:'Mauriora Cultural Competency',s:'expired',d:'Expired Sept 2024 — re-enrol at mauriora.co.nz'},{n:'PNZ Membership',s:'pending',d:'Upload renewal confirmation'},{n:'Peer Review 2026',s:'pending',d:'Annual — due this year'},{n:'Performance Appraisal 2026',s:'pending',d:'Annual — due this year'},{n:'Orientation',s:'ok',d:'Completed on start — signed'},{n:'Job Description — Physiotherapist',s:'ok',d:'Signed 27 Sept 2023'},{n:'Job Description — Clinical Director',s:'ok',d:'Signed 24 Sept 2023 — ACC confirmed'},{n:'Job Description — H&S Officer',s:'ok',d:'Signed 27 Sept 2023'},{n:'Employment Agreement',s:'ok',d:'Signed 24/9/2023 · $80,000 p.a.'}]},
  tim: { name:'Tim', ini:'TI', color:'#185FA5', title:'Physiotherapist · Contractor 60%',
    info:[['Employment','Contractor (60%)'],['Tenure','Several years'],['Clinic','Longbay / Elmhurst']],
    certs:[{n:'APC 2025/2026',s:'pending',d:'Upload required'},{n:'First Aid / CPR',s:'pending',d:'Upload certificate'},{n:'Cultural Competency',s:'pending',d:'Upload certificate'},{n:'PNZ Membership',s:'pending',d:'Upload if applicable'},{n:'Peer Review 2026',s:'pending',d:'Annual — due'},{n:'Performance Appraisal 2026',s:'pending',d:'Annual — due'},{n:'Orientation',s:'ok',d:'Completed'},{n:'Contract',s:'pending',d:'Upload from Drive'}]},
  hans: { name:'Hans', ini:'HA', color:'#533AB7', title:'Physiotherapist · Contractor 60% · Clinic Lead',
    info:[['Employment','Contractor (60%)'],['Tenure','~20 years'],['Role','Clinic lead — Meadowlands'],['Clinic','Meadowlands']],
    certs:[{n:'APC 2025/2026',s:'pending',d:'Upload required'},{n:'First Aid / CPR',s:'pending',d:'Upload certificate'},{n:'Cultural Competency',s:'pending',d:'Upload certificate'},{n:'PNZ Membership',s:'pending',d:'Upload if applicable'},{n:'Peer Review 2026',s:'ok',d:'Completed — on file'},{n:'Performance Appraisal 2026',s:'pending',d:'Annual — due'},{n:'Orientation',s:'ok',d:'Long-standing staff'},{n:'Contract',s:'pending',d:'Upload from Drive'}]},
  dylan: { name:'Dylan', ini:'DY', color:'#D85A30', title:'Physiotherapist · Employee',
    info:[['Employment','Employee'],['Start date','December 2025'],['Clinic','TBC — confirm with Jade']],
    certs:[{n:'APC 2025/2026',s:'pending',d:'Upload required'},{n:'First Aid / CPR',s:'pending',d:'Upload certificate'},{n:'Cultural Competency',s:'pending',d:'Upload certificate'},{n:'Peer Review',s:'na',d:'New staff — not due yet'},{n:'Appraisal',s:'na',d:'New staff — not due yet'},{n:'Orientation',s:'pending',d:'In progress'},{n:'Contract',s:'pending',d:'Upload from Drive'}]},
  ibrahim: { name:'Ibrahim', ini:'IB', color:'#1D9E75', title:'Physiotherapist · New graduate',
    info:[['Employment','New starter'],['Level','New graduate'],['Note','Some compliance items not due yet']],
    certs:[{n:'APC 2025/2026',s:'due',d:'New grad — confirm registration status with Physio Board'},{n:'First Aid / CPR',s:'due',d:'Not due yet — book when settled in'},{n:'Cultural Competency',s:'due',d:'Not due yet — complete within first year'},{n:'Peer Review',s:'na',d:'New staff'},{n:'Appraisal',s:'na',d:'New staff'},{n:'Orientation',s:'pending',d:'In progress'},{n:'Contract',s:'pending',d:'Upload from Drive'}]},
  isabella: { name:'Isabella Yang', ini:'IY', color:'#D4537E', title:'Physiotherapist · Employee',
    info:[['Employment','Employee'],['Start date','17 June 2024'],['Salary','$75,000 p.a.'],['Clinic','TBC — confirm']],
    certs:[{n:'APC 2025/2026',s:'pending',d:'Upload required'},{n:'First Aid / CPR',s:'pending',d:'Upload certificate'},{n:'Cultural Competency',s:'pending',d:'Upload certificate'},{n:'PNZ Membership',s:'pending',d:'Upload if applicable'},{n:'Peer Review 2026',s:'pending',d:'First annual cycle — due'},{n:'Performance Appraisal 2026',s:'pending',d:'First annual cycle — due'},{n:'Orientation',s:'ok',d:'Completed on start'},{n:'Contract',s:'pending',d:'Upload from Drive'}]},
  gwenne: { name:'Gwenne Manares', ini:'GM', color:'#639922', title:'Physiotherapist · Contractor 60%',
    info:[['Employment','Contractor (60%)'],['Clinic','Pools clinic'],['Note','Also known as Cormell']],
    certs:[{n:'APC 2025/2026',s:'pending',d:'Upload required'},{n:'First Aid / CPR',s:'pending',d:'Upload certificate'},{n:'Cultural Competency',s:'pending',d:'Upload certificate'},{n:'Peer Review',s:'na',d:'Confirm timing as contractor'},{n:'Appraisal',s:'na',d:'Confirm timing as contractor'},{n:'Orientation',s:'pending',d:'In progress'},{n:'Contract',s:'pending',d:'Upload from Drive'}]}
};

function openProfile(id) {
  const s = staffData[id];
  document.getElementById('mav').textContent = s.ini;
  document.getElementById('mav').style.background = s.color+'50';
  document.getElementById('mn').textContent = s.name;
  document.getElementById('mt').textContent = s.title;
  document.getElementById('mh').style.background = s.color;
  let b = `<div style="margin-bottom:1.25rem"><div class="ms-title">Employment details</div>`;
  s.info.forEach(([l,v]) => b += `<div class="ir"><span class="il">${l}</span><span class="iv">${v}</span></div>`);
  b += `</div><div><div class="ms-title">Certifications &amp; compliance</div>`;
  s.certs.forEach(c => {
    const lbls = {ok:'View',expired:'Upload',pending:'Upload',na:'N/A',due:'Action'};
    b += `<div class="cert-item ${c.s}"><div><div class="ci-name">${c.n}</div><div class="ci-date">${c.d}</div></div><button class="up-btn">${lbls[c.s]||'Upload'}</button></div>`;
  });
  b += `</div>`;
  document.getElementById('mb').innerHTML = b;
  document.getElementById('modal-bg').classList.add('open');
}

function nav(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el) el.classList.add('active');
}

function showTab(group, id, el) {
  document.querySelectorAll('[id^="'+group+'-"]').forEach(t => t.classList.remove('active'));
  document.getElementById(group+'-'+id).classList.add('active');
  el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function switchRole(role) {
  const names = {owner:'Jade Warren',alistair:'Alistair Burgess',hans:'Hans',staff:'Staff member'};
  document.getElementById('sb-name').textContent = names[role];
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = (role==='staff') ? 'none' : 'flex';
  });
}
</script>
</body>
</html>
