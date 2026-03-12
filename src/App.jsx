import { useState, useEffect, useCallback } from "react";

const MASTER_RECOVERY_KEY = "isal-e-sawab-786";
const DEFAULT_PASSWORD = "Awhahum";
const STORAGE_AMAL = "isal-amal-v1";
const STORAGE_NAMES = "isal-names-v1";
const STORAGE_PASS = "isal-pass-v1";
const STORAGE_PENDING_NAMES = "isal-pending-names-v1";
const STORAGE_PENDING_AMAL = "isal-pending-amal-v1";

const AMAL_ALIASES = {
  "درود": ["durood","darood","درود","durood sharif","darood sharif","durood pak","darood pak","درود شریف","الصلاة على النبي","صلوات","salawat","salat alan nabi","salavat"],
  "قرآن": ["quran","quraan","قرآن","kalaam","kalam","kalaam e pak","kalam pak","قرآن پاک","القرآن","quran pak","quraan pak","tilawat","tilaawat"],
  "تسبیح": ["tasbeeh","tasbih","تسبیح","zikr","zikar","ذکر","subhanallah","alhamdulillah","allahu akbar","subhan allah"],
  "نماز": ["namaz","salah","salat","نماز","الصلاة","prayer","namaz e janaza","namaz janaza"],
  "صدقہ": ["sadqa","sadqah","صدقہ","khairaat","khairat","charity","donation","الصدقة"],
  "فاتحہ": ["fatiha","fatihah","فاتحہ","surah fatiha","al fatiha","الفاتحة"],
  "دعا": ["dua","duaa","دعا","الدعاء","supplication"],
  "کلمہ": ["kalma","kalima","کلمہ","shahada","شہادت","لا إله إلا الله"],
};

function normalizeAmal(text) {
  const lower = text.toLowerCase().trim();
  for (const [urduName, aliases] of Object.entries(AMAL_ALIASES)) {
    if (aliases.some(a => lower.includes(a))) return urduName;
  }
  return null;
}

async function parseMessageWithAI(message) {
  const prompt = `You are an Islamic sawab tracker. Extract amals from this message (Urdu/English/Roman Urdu/Arabic).
Message: "${message}"
Reply ONLY with JSON:
{"amals":[{"name":"amal name","count":number}],"personName":"name or null"}
Common amals: Quran/قرآن, Durood/درود, Tasbeeh/تسبیح, Namaz/نماز, Sadqa/صدقہ, Fatiha/فاتحہ, Dua/دعا, Kalma/کلمہ
Extract count from مرتبہ/بار/times/x. Default count=1.`;
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return { amals: [], personName: null }; }
}

function IslamicPattern() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',opacity:0.04,pointerEvents:'none',zIndex:0}}>
      <defs>
        <pattern id="ip" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <polygon points="25,2 48,14 48,36 25,48 2,36 2,14" fill="none" stroke="#D4AF37" strokeWidth="1"/>
          <polygon points="25,10 40,18 40,32 25,40 10,32 10,18" fill="none" stroke="#D4AF37" strokeWidth="0.5"/>
          <circle cx="25" cy="25" r="3" fill="#D4AF37"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ip)"/>
    </svg>
  );
}

function PublicSubmitTabs({ publicMsg, setPublicMsg, publicProcessing, publicResult, handlePublicSubmit, publicName, setPublicName, publicNameResult, handlePublicNameSubmit }) {
  const [tab, setTab] = useState("sawab");
  return (
    <>
      <div className="public-tabs">
        <button className={`pub-tab ${tab==='sawab'?'active':''}`} onClick={()=>setTab('sawab')}>🤲 ثواب بھیجیں</button>
        <button className={`pub-tab ${tab==='name'?'active':''}`} onClick={()=>setTab('name')}>🌹 نام تجویز کریں</button>
      </div>
      {tab === 'sawab' && (
        <>
          <textarea className="textarea-f" placeholder="اپنا ثواب لکھیں... مثلاً: 100 بار درود پڑھا، قرآن کی تلاوت کی، Quran 2 pages..." value={publicMsg} onChange={e=>setPublicMsg(e.target.value)} rows={3}/>
          <button className="btn-gold" style={{marginTop:'10px'}} onClick={handlePublicSubmit} disabled={publicProcessing||!publicMsg.trim()}>
            {publicProcessing
              ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>پروسیس ہو رہا ہے <span className="loading-dots"><span/><span/><span/></span></span>
              : '📤 ثواب بھیجیں'}
          </button>
          {publicResult && <div className="result-msg">{publicResult}</div>}
        </>
      )}
      {tab === 'name' && (
        <>
          <input className="inp" placeholder="نام لکھیں جسے ثواب بھیجنا ہو..." value={publicName} onChange={e=>setPublicName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handlePublicNameSubmit()}/>
          <button className="btn-gold" onClick={handlePublicNameSubmit} disabled={!publicName.trim()}>📤 نام بھیجیں</button>
          {publicNameResult && <div className="result-msg">{publicNameResult}</div>}
        </>
      )}
    </>
  );
}

export default function App() {
  const [view, setView] = useState("public");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(DEFAULT_PASSWORD);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginMode, setLoginMode] = useState("login");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassForgot, setNewPassForgot] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [changePassMode, setChangePassMode] = useState(false);
  const [oldPassInput, setOldPassInput] = useState("");
  const [newPassInput, setNewPassInput] = useState("");
  const [confirmPassInput, setConfirmPassInput] = useState("");
  const [changePassMsg, setChangePassMsg] = useState("");
  const [amalData, setAmalData] = useState({});
  const [names, setNames] = useState([]);
  const [pendingNames, setPendingNames] = useState([]);
  const [pendingAmal, setPendingAmal] = useState([]);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState(null);
  const [editNameVal, setEditNameVal] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState("entry");
  const [storageReady, setStorageReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [publicMsg, setPublicMsg] = useState("");
  const [publicProcessing, setPublicProcessing] = useState(false);
  const [publicResult, setPublicResult] = useState("");
  const [publicName, setPublicName] = useState("");
  const [publicNameResult, setPublicNameResult] = useState("");

  useEffect(() => {
    async function loadData() {
      try { const r = await window.storage.get(STORAGE_PASS); if (r) setCurrentPassword(r.value); } catch {}
      try { const r = await window.storage.get(STORAGE_AMAL); if (r) setAmalData(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(STORAGE_NAMES); if (r) setNames(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(STORAGE_PENDING_NAMES); if (r) setPendingNames(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(STORAGE_PENDING_AMAL); if (r) setPendingAmal(JSON.parse(r.value)); } catch {}
      setStorageReady(true);
    }
    loadData();
  }, []);

  const saveAmal = useCallback(async (d) => { await window.storage.set(STORAGE_AMAL, JSON.stringify(d)); }, []);
  const saveNames = useCallback(async (d) => { await window.storage.set(STORAGE_NAMES, JSON.stringify(d)); }, []);
  const savePendingNames = useCallback(async (d) => { await window.storage.set(STORAGE_PENDING_NAMES, JSON.stringify(d)); }, []);
  const savePendingAmal = useCallback(async (d) => { await window.storage.set(STORAGE_PENDING_AMAL, JSON.stringify(d)); }, []);

  function handleLogin() {
    if (password === currentPassword) { setAdminLoggedIn(true); setLoginError(""); setPassword(""); setLoginMode("login"); }
    else setLoginError("غلط پاس ورڈ!");
  }

  function handleForgotReset() {
    setForgotError(""); setForgotSuccess("");
    if (recoveryKey !== MASTER_RECOVERY_KEY) { setForgotError("❌ غلط ریکوری کی!"); return; }
    if (!newPassForgot.trim() || newPassForgot.length < 4) { setForgotError("❌ پاس ورڈ کم از کم 4 حروف کا ہو!"); return; }
    setCurrentPassword(newPassForgot);
    window.storage.set(STORAGE_PASS, newPassForgot);
    setForgotSuccess("✅ پاس ورڈ بدل دیا گیا!");
    setRecoveryKey(""); setNewPassForgot("");
    setTimeout(() => { setLoginMode("login"); setForgotSuccess(""); }, 2000);
  }

  function handleChangePassword() {
    setChangePassMsg("");
    if (oldPassInput !== currentPassword) { setChangePassMsg("❌ پرانا پاس ورڈ غلط ہے!"); return; }
    if (!newPassInput.trim() || newPassInput.length < 4) { setChangePassMsg("❌ نیا پاس ورڈ کم از کم 4 حروف کا ہو!"); return; }
    if (newPassInput !== confirmPassInput) { setChangePassMsg("❌ دونوں پاس ورڈ ایک جیسے نہیں!"); return; }
    setCurrentPassword(newPassInput);
    window.storage.set(STORAGE_PASS, newPassInput);
    setChangePassMsg("✅ پاس ورڈ کامیابی سے بدل دیا گیا!");
    setOldPassInput(""); setNewPassInput(""); setConfirmPassInput("");
    setTimeout(() => { setChangePassMode(false); setChangePassMsg(""); }, 2000);
  }

  async function handleMessageSubmit() {
    if (!message.trim()) return;
    setProcessing(true); setResultMsg("");
    try {
      const result = await parseMessageWithAI(message);
      const updatedAmal = { ...amalData };
      let addedItems = [];
      for (const item of result.amals || []) {
        const normalized = normalizeAmal(item.name) || item.name;
        const count = parseInt(item.count) || 1;
        updatedAmal[normalized] = (updatedAmal[normalized] || 0) + count;
        addedItems.push(`${normalized}: +${count}`);
      }
      setAmalData(updatedAmal); await saveAmal(updatedAmal);
      setResultMsg(addedItems.length > 0 ? `✅ کامیاب! ${addedItems.join(" | ")}` : "⚠️ کوئی عمل نہیں ملا");
      setMessage("");
    } catch { setResultMsg("❌ خرابی آئی، دوبارہ کوشش کریں"); }
    setProcessing(false);
  }

  async function handlePublicSubmit() {
    if (!publicMsg.trim()) return;
    setPublicProcessing(true); setPublicResult("");
    try {
      const result = await parseMessageWithAI(publicMsg);
      if (!result.amals || result.amals.length === 0) {
        setPublicResult("⚠️ کوئی عمل نہیں ملا، دوبارہ لکھیں");
        setPublicProcessing(false); return;
      }
      const entry = { id: Date.now(), message: publicMsg, amals: result.amals, time: new Date().toLocaleString('ur-PK') };
      const updated = [...pendingAmal, entry];
      setPendingAmal(updated); await savePendingAmal(updated);
      setPublicResult("✅ آپ کا ثواب ایڈمن کی منظوری کے بعد شامل ہو جائے گا! جزاک اللہ 🤲");
      setPublicMsg("");
    } catch { setPublicResult("❌ خرابی آئی، دوبارہ کوشش کریں"); }
    setPublicProcessing(false);
  }

  async function handlePublicNameSubmit() {
    if (!publicName.trim()) return;
    const entry = { id: Date.now(), name: publicName.trim(), time: new Date().toLocaleString('ur-PK') };
    const updated = [...pendingNames, entry];
    setPendingNames(updated); await savePendingNames(updated);
    setPublicNameResult("✅ نام ایڈمن کی منظوری کے بعد شامل ہو جائے گا! 🤲");
    setPublicName("");
    setTimeout(() => setPublicNameResult(""), 4000);
  }

  async function approvePendingAmal(item) {
    const updatedAmal = { ...amalData };
    for (const a of item.amals || []) {
      const normalized = normalizeAmal(a.name) || a.name;
      const count = parseInt(a.count) || 1;
      updatedAmal[normalized] = (updatedAmal[normalized] || 0) + count;
    }
    setAmalData(updatedAmal); await saveAmal(updatedAmal);
    const updated = pendingAmal.filter(p => p.id !== item.id);
    setPendingAmal(updated); await savePendingAmal(updated);
  }

  async function rejectPendingAmal(id) {
    const updated = pendingAmal.filter(p => p.id !== id);
    setPendingAmal(updated); await savePendingAmal(updated);
  }

  async function approvePendingName(item) {
    const updated = [...names, { id: Date.now(), name: item.name }];
    setNames(updated); await saveNames(updated);
    const updatedP = pendingNames.filter(p => p.id !== item.id);
    setPendingNames(updatedP); await savePendingNames(updatedP);
  }

  async function rejectPendingName(id) {
    const updated = pendingNames.filter(p => p.id !== id);
    setPendingNames(updated); await savePendingNames(updated);
  }

  async function handleReset() {
    setAmalData({}); await saveAmal({});
    setConfirmReset(false); setResultMsg("✅ تمام اعمال صفر کر دیے گئے، نام محفوظ ہیں");
  }

  async function addName() {
    if (!newName.trim()) return;
    const updated = [...names, { id: Date.now(), name: newName.trim() }];
    setNames(updated); await saveNames(updated); setNewName("");
  }

  async function removeName(id) {
    const updated = names.filter(n => n.id !== id);
    setNames(updated); await saveNames(updated);
  }

  async function saveName(id) {
    const updated = names.map(n => n.id === id ? { ...n, name: editNameVal } : n);
    setNames(updated); await saveNames(updated); setEditingName(null);
  }

  const amalEntries = Object.entries(amalData).filter(([, v]) => v > 0);
  const totalSawab = amalEntries.reduce((sum, [, v]) => sum + v, 0);
  const pendingCount = pendingAmal.length + pendingNames.length;

  if (!storageReady) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#071120',color:'#D4AF37',fontFamily:'serif',fontSize:'20px',direction:'rtl'}}>
      لوڈ ہو رہا ہے...
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: 16px; -webkit-text-size-adjust: 100%; }
        body { background: #071120; min-height: 100vh; overflow-x: hidden; }
        .app { min-height: 100vh; background: linear-gradient(135deg, #071120 0%, #0d1f3c 50%, #071120 100%); font-family: 'Scheherazade New','Amiri',serif; direction: rtl; position: relative; }

        .header { background: rgba(7,17,32,0.96); border-bottom: 1px solid rgba(212,175,55,0.22); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .header-inner { max-width: 1100px; margin: 0 auto; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .logo-title { font-size: clamp(15px, 4vw, 24px); font-weight: 700; color: #D4AF37; text-shadow: 0 0 18px rgba(212,175,55,0.3); line-height: 1.2; }
        .logo-institute { font-size: clamp(11px, 2.5vw, 14px); color: rgba(212,175,55,0.8); font-weight: 600; }
        .logo-sub { font-size: clamp(9px, 1.8vw, 11px); color: rgba(212,175,55,0.38); letter-spacing: 1px; }
        .nav-btns { display: flex; gap: 7px; flex-shrink: 0; }
        .nav-btn { padding: 7px 14px; border: 1px solid rgba(212,175,55,0.32); border-radius: 8px; background: transparent; color: #D4AF37; font-family: 'Scheherazade New',serif; font-size: clamp(12px,2.5vw,15px); cursor: pointer; transition: all 0.22s; white-space: nowrap; position: relative; }
        .nav-btn:hover,.nav-btn.active { background: rgba(212,175,55,0.13); border-color: #D4AF37; }
        .badge-dot { position: absolute; top: -6px; left: -6px; width: 18px; height: 18px; background: #ff4444; border-radius: 50%; font-size: 10px; color: white; display: flex; align-items: center; justify-content: center; font-family: Arial; font-weight: bold; }

        .main { max-width: 1100px; margin: 0 auto; padding: clamp(14px,4vw,32px) clamp(10px,4vw,22px) 60px; position: relative; z-index: 1; }
        .sec-title { text-align: center; margin-bottom: clamp(18px,4vw,28px); }
        .sec-title h2 { font-size: clamp(20px,5vw,30px); color: #D4AF37; font-weight: 700; text-shadow: 0 0 25px rgba(212,175,55,0.28); }
        .divider { display: flex; align-items: center; gap: 10px; justify-content: center; margin-top: 8px; }
        .div-line { width: 45px; height: 1px; background: linear-gradient(90deg,transparent,#D4AF37,transparent); }
        .div-diamond { width: 7px; height: 7px; background: #D4AF37; transform: rotate(45deg); }

        .total-card { background: linear-gradient(135deg,rgba(212,175,55,0.1),rgba(212,175,55,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: clamp(10px,3vw,18px); padding: clamp(18px,5vw,28px); text-align: center; margin-bottom: clamp(18px,4vw,26px); position: relative; overflow: hidden; }
        .total-card::before { content:''; position:absolute; top:-60%; left:50%; transform:translateX(-50%); width:260px; height:260px; background:radial-gradient(circle,rgba(212,175,55,0.07),transparent 70%); pointer-events:none; }
        .total-label { font-size: clamp(13px,2.5vw,16px); color: rgba(212,175,55,0.62); margin-bottom: 5px; }
        .total-number { font-size: clamp(38px,10vw,58px); font-weight: 700; color: #D4AF37; text-shadow: 0 0 30px rgba(212,175,55,0.45); line-height: 1; }
        .total-sub { font-size: clamp(11px,2vw,13px); color: rgba(255,255,255,0.28); margin-top: 5px; }

        .amal-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(clamp(130px,28vw,190px),1fr)); gap: clamp(9px,2.5vw,14px); margin-bottom: clamp(20px,4vw,30px); }
        .amal-card { background: linear-gradient(145deg,rgba(13,31,60,0.8),rgba(7,17,32,0.9)); border: 1px solid rgba(212,175,55,0.17); border-radius: clamp(9px,2.5vw,14px); padding: clamp(14px,3.5vw,22px) clamp(10px,2.5vw,16px); text-align: center; transition: all 0.28s; position: relative; overflow: hidden; }
        .amal-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#D4AF37,transparent); opacity:0; transition:opacity 0.28s; }
        .amal-card:hover { border-color: rgba(212,175,55,0.42); transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0,0,0,0.32); }
        .amal-card:hover::after { opacity:1; }
        .amal-name { font-size: clamp(17px,3.5vw,21px); color: #e8d5a0; font-weight: 600; margin-bottom: 7px; }
        .amal-count { font-size: clamp(26px,6.5vw,38px); font-weight: 700; color: #D4AF37; text-shadow: 0 0 18px rgba(212,175,55,0.38); }
        .amal-count-label { font-size: clamp(10px,1.8vw,12px); color: rgba(255,255,255,0.28); margin-top: 2px; }
        .empty-state { text-align: center; padding: clamp(28px,7vw,50px) 20px; color: rgba(212,175,55,0.38); font-size: clamp(15px,3.5vw,19px); }

        .names-section { background: linear-gradient(145deg,rgba(13,31,60,0.52),rgba(7,17,32,0.72)); border: 1px solid rgba(212,175,55,0.17); border-radius: clamp(10px,3vw,16px); padding: clamp(16px,4vw,24px); margin-bottom: 20px; }
        .names-title { font-size: clamp(16px,3.5vw,20px); color: #D4AF37; margin-bottom: 14px; text-align: center; }
        .names-grid { display: flex; flex-wrap: wrap; gap: 9px; justify-content: center; }
        .name-badge { background: linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.06)); border: 1px solid rgba(212,175,55,0.28); border-radius: 100px; padding: 7px 16px; color: #e8d5a0; font-size: clamp(14px,2.8vw,17px); display: flex; align-items: center; gap: 6px; }
        .name-dot { width:6px; height:6px; background:#D4AF37; border-radius:50%; flex-shrink:0; }

        .public-submit-box { background: linear-gradient(145deg,rgba(13,31,60,0.6),rgba(7,17,32,0.8)); border: 1px solid rgba(212,175,55,0.22); border-radius: clamp(10px,3vw,16px); padding: clamp(16px,4vw,24px); margin-bottom: 20px; }
        .public-submit-title { font-size: clamp(16px,3.5vw,20px); color: #D4AF37; margin-bottom: 5px; }
        .public-submit-desc { font-size: clamp(13px,2.5vw,15px); color: rgba(255,255,255,0.42); margin-bottom: 14px; line-height: 1.7; }
        .public-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
        .pub-tab { flex:1; padding:8px; background:transparent; border:1px solid rgba(212,175,55,0.2); border-radius:8px; color:rgba(212,175,55,0.55); font-family:'Scheherazade New',serif; font-size:clamp(13px,2.5vw,15px); cursor:pointer; transition:all 0.22s; }
        .pub-tab.active { background:rgba(212,175,55,0.12); color:#D4AF37; border-color:rgba(212,175,55,0.4); }

        .inp { width:100%; padding:10px 14px; background:rgba(255,255,255,0.05); border:1px solid rgba(212,175,55,0.28); border-radius:9px; color:white; font-family:'Scheherazade New',serif; font-size:clamp(14px,2.8vw,17px); outline:none; transition:border-color 0.25s; text-align:right; direction:rtl; margin-bottom:10px; }
        .inp:focus { border-color:#D4AF37; }
        .inp.no-mb { margin-bottom:0; }
        .textarea-f { width:100%; padding:12px 14px; background:rgba(255,255,255,0.05); border:1px solid rgba(212,175,55,0.28); border-radius:9px; color:white; font-family:'Scheherazade New',serif; font-size:clamp(14px,2.8vw,16px); outline:none; resize:vertical; min-height:90px; transition:border-color 0.25s; text-align:right; direction:rtl; }
        .textarea-f:focus { border-color:#D4AF37; }

        .btn-gold { width:100%; padding:11px 20px; background:linear-gradient(135deg,#D4AF37,#B8960C); border:none; border-radius:9px; color:#071120; font-family:'Scheherazade New',serif; font-size:clamp(15px,3vw,18px); font-weight:700; cursor:pointer; transition:all 0.25s; }
        .btn-gold:hover { background:linear-gradient(135deg,#e8c84a,#D4AF37); transform:translateY(-1px); box-shadow:0 5px 18px rgba(212,175,55,0.28); }
        .btn-gold:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .result-msg { margin-top:10px; padding:9px 14px; background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.22); border-radius:8px; color:#e8d5a0; font-size:clamp(13px,2.5vw,15px); text-align:center; line-height:1.7; }
        .suc { color:#90ee90; font-size:clamp(13px,2.5vw,15px); margin-bottom:8px; }
        .err { color:#ff8888; font-size:clamp(13px,2.5vw,15px); margin-bottom:8px; }

        .login-card { background:linear-gradient(145deg,rgba(13,31,60,0.92),rgba(7,17,32,0.97)); border:1px solid rgba(212,175,55,0.28); border-radius:18px; padding:clamp(28px,6vw,48px) clamp(20px,5vw,40px); text-align:center; max-width:400px; margin:clamp(40px,8vw,80px) auto; }
        .login-icon { font-size:clamp(36px,8vw,48px); margin-bottom:12px; }
        .login-title { font-size:clamp(22px,5vw,28px); color:#D4AF37; margin-bottom:6px; }
        .login-sub { font-size:clamp(12px,2.5vw,14px); color:rgba(255,255,255,0.35); margin-bottom:24px; }
        .forgot-link { background:transparent; border:none; color:rgba(212,175,55,0.55); font-family:'Scheherazade New',serif; font-size:clamp(13px,2.5vw,14px); cursor:pointer; margin-top:6px; }
        .forgot-link:hover { color:#D4AF37; }
        .forgot-hint { color:rgba(255,255,255,0.4); font-size:clamp(13px,2.5vw,14px); margin-bottom:12px; line-height:1.6; text-align:right; }

        .admin-container { max-width:720px; margin:0 auto; }
        .admin-header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:9px; }
        .admin-header-title { font-size:clamp(16px,4vw,21px); color:#D4AF37; }
        .admin-actions { display:flex; gap:7px; align-items:center; flex-wrap:wrap; }
        .btn-outline-gold { padding:7px 14px; border:1px solid rgba(212,175,55,0.38); border-radius:8px; background:transparent; color:#D4AF37; font-family:'Scheherazade New',serif; font-size:clamp(12px,2.5vw,14px); cursor:pointer; transition:all 0.2s; }
        .btn-outline-gold:hover { background:rgba(212,175,55,0.12); }
        .logout-btn { padding:6px 12px; border:1px solid rgba(255,80,80,0.26); border-radius:7px; background:transparent; color:#ff8888; font-family:'Scheherazade New',serif; font-size:clamp(12px,2.5vw,14px); cursor:pointer; }
        .logout-btn:hover { background:rgba(255,80,80,0.08); }

        .admin-tabs { display:flex; gap:6px; margin-bottom:20px; background:rgba(255,255,255,0.03); border:1px solid rgba(212,175,55,0.13); border-radius:11px; padding:5px; flex-wrap:wrap; }
        .tab-btn { flex:1; min-width:70px; padding:8px 8px; background:transparent; border:none; border-radius:8px; color:rgba(212,175,55,0.55); font-family:'Scheherazade New',serif; font-size:clamp(12px,2.3vw,14px); cursor:pointer; transition:all 0.25s; white-space:nowrap; position:relative; }
        .tab-btn.active { background:rgba(212,175,55,0.14); color:#D4AF37; }

        .admin-card { background:linear-gradient(145deg,rgba(13,31,60,0.75),rgba(7,17,32,0.88)); border:1px solid rgba(212,175,55,0.18); border-radius:14px; padding:clamp(16px,4vw,24px); margin-bottom:16px; }
        .card-title { font-size:clamp(16px,3.5vw,19px); color:#D4AF37; margin-bottom:14px; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }

        .pending-item { background:rgba(255,255,255,0.03); border:1px solid rgba(212,175,55,0.15); border-radius:10px; padding:12px 14px; margin-bottom:10px; }
        .pending-msg { color:#e8d5a0; font-size:clamp(14px,2.8vw,16px); margin-bottom:6px; line-height:1.6; }
        .pending-amals { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
        .pending-chip { background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.25); border-radius:100px; padding:2px 10px; color:#D4AF37; font-size:clamp(12px,2.2vw,13px); }
        .pending-time { font-size:12px; color:rgba(255,255,255,0.28); margin-bottom:8px; direction:ltr; text-align:left; }
        .pending-actions { display:flex; gap:7px; justify-content:flex-start; }
        .empty-pending { text-align:center; color:rgba(255,255,255,0.28); font-size:clamp(14px,2.8vw,16px); padding:18px; }

        .names-admin { display:flex; flex-direction:column; gap:8px; }
        .name-row { display:flex; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(212,175,55,0.12); border-radius:9px; gap:7px; flex-wrap:wrap; }
        .name-text { color:#e8d5a0; font-size:clamp(14px,3vw,17px); flex:1; min-width:80px; }
        .name-edit-inp { flex:1; min-width:80px; padding:5px 10px; background:rgba(255,255,255,0.07); border:1px solid rgba(212,175,55,0.35); border-radius:7px; color:white; font-family:'Scheherazade New',serif; font-size:clamp(14px,2.8vw,16px); outline:none; direction:rtl; }
        .name-actions { display:flex; gap:5px; flex-shrink:0; }
        .add-name-row { display:flex; gap:8px; margin-bottom:12px; }
        .add-name-inp { flex:1; padding:9px 13px; background:rgba(255,255,255,0.05); border:1px solid rgba(212,175,55,0.26); border-radius:9px; color:white; font-family:'Scheherazade New',serif; font-size:clamp(14px,2.8vw,16px); outline:none; text-align:right; direction:rtl; min-width:0; }
        .add-name-inp:focus { border-color:#D4AF37; }
        .btn-add { padding:9px 14px; background:linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.08)); border:1px solid rgba(212,175,55,0.42); border-radius:9px; color:#D4AF37; font-family:'Scheherazade New',serif; font-size:clamp(13px,2.5vw,15px); cursor:pointer; transition:all 0.22s; white-space:nowrap; flex-shrink:0; }
        .btn-add:hover { background:rgba(212,175,55,0.26); }

        .btn-sm { padding:5px 12px; border-radius:6px; border:1px solid rgba(212,175,55,0.35); background:transparent; color:#D4AF37; font-family:'Scheherazade New',serif; font-size:clamp(11px,2.2vw,13px); cursor:pointer; transition:all 0.18s; white-space:nowrap; }
        .btn-sm:hover { background:rgba(212,175,55,0.12); }
        .btn-danger { border-color:rgba(255,80,80,0.35); color:#ff8888; }
        .btn-danger:hover { background:rgba(255,80,80,0.09); border-color:#ff8888; }
        .btn-success { border-color:rgba(80,200,80,0.4); color:#90ee90; }
        .btn-success:hover { background:rgba(80,200,80,0.1); }

        .btn-reset { padding:10px 24px; background:rgba(255,80,80,0.06); border:1px solid rgba(255,80,80,0.26); border-radius:9px; color:#ff8888; font-family:'Scheherazade New',serif; font-size:clamp(14px,3vw,16px); cursor:pointer; transition:all 0.28s; }
        .btn-reset:hover { background:rgba(255,80,80,0.13); border-color:#ff8888; }
        .confirm-box { background:rgba(255,80,80,0.06); border:1px solid rgba(255,80,80,0.2); border-radius:11px; padding:14px; text-align:center; margin-top:12px; }
        .confirm-text { color:#ffaaaa; font-size:clamp(13px,3vw,15px); margin-bottom:11px; }
        .confirm-btns { display:flex; gap:9px; justify-content:center; flex-wrap:wrap; }

        .change-pass-card { background:rgba(212,175,55,0.04); border:1px solid rgba(212,175,55,0.18); border-radius:12px; padding:16px 14px; margin-bottom:16px; }
        .change-pass-title { color:#D4AF37; font-size:clamp(14px,3vw,16px); margin-bottom:12px; }
        .change-pass-btns { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
        .count-chips { display:flex; flex-wrap:wrap; gap:6px; }
        .chip { background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.2); border-radius:100px; padding:3px 12px; color:#e8d5a0; font-size:clamp(12px,2.2vw,14px); }

        .loading-dots { display:inline-flex; gap:4px; }
        .loading-dots span { width:6px; height:6px; background:#071120; border-radius:50%; animation:bounce 1s infinite; }
        .loading-dots span:nth-child(2) { animation-delay:0.15s; }
        .loading-dots span:nth-child(3) { animation-delay:0.3s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }
      `}</style>

      <div className="app">
        <IslamicPattern/>
        <header className="header">
          <div className="header-inner">
            <div>
              <div className="logo-title">🕌 ایصالِ ثواب ٹریکر</div>
              <div className="logo-institute">ادارہ تسلیمِ اسلام</div>
              <div className="logo-sub">Isal-e-Sawab Tracker</div>
            </div>
            <div className="nav-btns">
              <button className={`nav-btn ${view==='public'?'active':''}`} onClick={()=>setView('public')}>عوامی</button>
              <button className={`nav-btn ${view==='admin'?'active':''}`} onClick={()=>setView('admin')}>
                ایڈمن
                {pendingCount > 0 && <span className="badge-dot">{pendingCount}</span>}
              </button>
            </div>
          </div>
        </header>

        <div className="main">
          {view === 'public' && (
            <>
              <div className="sec-title">
                <h2>ایصالِ ثواب کا حساب</h2>
                <div className="divider"><div className="div-line"/><div className="div-diamond"/><div className="div-line"/></div>
              </div>
              <div className="total-card">
                <div className="total-label">مجموعی ثواب</div>
                <div className="total-number">{totalSawab.toLocaleString('ur-PK')}</div>
                <div className="total-sub">کل اعمال جمع ہوئے</div>
              </div>
              {amalEntries.length === 0
                ? <div className="empty-state">ابھی تک کوئی ثواب درج نہیں ہوا 🤲</div>
                : <div className="amal-grid">
                    {amalEntries.map(([name,count]) => (
                      <div key={name} className="amal-card">
                        <div className="amal-name">{name}</div>
                        <div className="amal-count">{count.toLocaleString('ur-PK')}</div>
                        <div className="amal-count-label">مرتبہ</div>
                      </div>
                    ))}
                  </div>
              }
              <div className="names-section">
                <div className="names-title">🌹 جن کو ثواب بھیجا جائے گا</div>
                {names.length === 0
                  ? <div style={{textAlign:'center',color:'rgba(212,175,55,0.38)',fontSize:'15px'}}>ابھی کوئی نام نہیں</div>
                  : <div className="names-grid">{names.map(n=><div key={n.id} className="name-badge"><div className="name-dot"/>{n.name}</div>)}</div>
                }
              </div>
              <div className="public-submit-box">
                <div className="public-submit-title">🤲 ثواب یا نام بھیجیں</div>
                <div className="public-submit-desc">آپ بھی اپنا ثواب شامل کر سکتے ہیں یا کوئی نام تجویز کر سکتے ہیں — ایڈمن کی منظوری کے بعد شامل ہو گا</div>
                <PublicSubmitTabs
                  publicMsg={publicMsg} setPublicMsg={setPublicMsg}
                  publicProcessing={publicProcessing} publicResult={publicResult}
                  handlePublicSubmit={handlePublicSubmit}
                  publicName={publicName} setPublicName={setPublicName}
                  publicNameResult={publicNameResult} handlePublicNameSubmit={handlePublicNameSubmit}
                />
              </div>
            </>
          )}

          {view === 'admin' && (
            <>
              {!adminLoggedIn ? (
                <div className="login-card">
                  {loginMode === 'login' ? (
                    <>
                      <div className="login-icon">🔐</div>
                      <div className="login-title">ایڈمن لاگ ان</div>
                      <div className="login-sub">Admin Login</div>
                      {loginError && <div className="err">{loginError}</div>}
                      <input className="inp" type="password" placeholder="پاس ورڈ" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoComplete="current-password"/>
                      <button className="btn-gold" onClick={handleLogin}>داخل ہوں</button>
                      <br/>
                      <button className="forgot-link" onClick={()=>{setLoginMode('forgot');setLoginError('');}}>🔑 پاس ورڈ بھول گئے؟</button>
                    </>
                  ) : (
                    <>
                      <div className="login-icon">🔑</div>
                      <div className="login-title">پاس ورڈ ری سیٹ</div>
                      <div className="forgot-hint">ریکوری کی درج کریں اور نیا پاس ورڈ لکھیں</div>
                      {forgotError && <div className="err">{forgotError}</div>}
                      {forgotSuccess && <div className="suc">{forgotSuccess}</div>}
                      <input className="inp" type="password" placeholder="ریکوری کی" value={recoveryKey} onChange={e=>setRecoveryKey(e.target.value)}/>
                      <input className="inp" type="password" placeholder="نیا پاس ورڈ" value={newPassForgot} onChange={e=>setNewPassForgot(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleForgotReset()}/>
                      <button className="btn-gold" onClick={handleForgotReset}>پاس ورڈ بدلیں</button>
                      <br/>
                      <button className="forgot-link" onClick={()=>setLoginMode('login')}>← واپس لاگ ان</button>
                    </>
                  )}
                </div>
              ) : (
                <div className="admin-container">
                  <div className="admin-header-row">
                    <div className="admin-header-title">⚙️ ایڈمن پینل</div>
                    <div className="admin-actions">
                      <button className="btn-outline-gold" onClick={()=>{setChangePassMode(!changePassMode);setChangePassMsg('');}}>🔒 پاس ورڈ بدلیں</button>
                      <button className="logout-btn" onClick={()=>{setAdminLoggedIn(false);setChangePassMode(false);}}>لاگ آوٹ</button>
                    </div>
                  </div>

                  {changePassMode && (
                    <div className="change-pass-card">
                      <div className="change-pass-title">🔒 پاس ورڈ تبدیل کریں</div>
                      {changePassMsg && <div className={changePassMsg.startsWith('✅')?'suc':'err'}>{changePassMsg}</div>}
                      <input className="inp" type="password" placeholder="پرانا پاس ورڈ" value={oldPassInput} onChange={e=>setOldPassInput(e.target.value)}/>
                      <input className="inp" type="password" placeholder="نیا پاس ورڈ" value={newPassInput} onChange={e=>setNewPassInput(e.target.value)}/>
                      <input className="inp no-mb" type="password" placeholder="نیا پاس ورڈ دوبارہ" value={confirmPassInput} onChange={e=>setConfirmPassInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleChangePassword()}/>
                      <div className="change-pass-btns">
                        <button className="btn-gold" style={{flex:1}} onClick={handleChangePassword}>محفوظ کریں</button>
                        <button className="btn-sm btn-danger" style={{padding:'9px 14px'}} onClick={()=>setChangePassMode(false)}>منسوخ</button>
                      </div>
                    </div>
                  )}

                  <div className="admin-tabs">
                    <button className={`tab-btn ${activeAdminTab==='entry'?'active':''}`} onClick={()=>setActiveAdminTab('entry')}>📥 ثواب داخل</button>
                    <button className={`tab-btn ${activeAdminTab==='pending'?'active':''}`} onClick={()=>setActiveAdminTab('pending')}>
                      ⏳ زیرِ غور {pendingCount>0&&<span style={{background:'#ff4444',borderRadius:'50%',padding:'1px 5px',fontSize:'10px',color:'white',fontFamily:'Arial',marginRight:'3px'}}>{pendingCount}</span>}
                    </button>
                    <button className={`tab-btn ${activeAdminTab==='names'?'active':''}`} onClick={()=>setActiveAdminTab('names')}>👥 نام</button>
                    <button className={`tab-btn ${activeAdminTab==='reset'?'active':''}`} onClick={()=>setActiveAdminTab('reset')}>🔄 ری سیٹ</button>
                  </div>

                  {activeAdminTab==='entry' && (
                    <div className="admin-card">
                      <div className="card-title">📱 واٹس ایپ پیغام پیسٹ کریں</div>
                      <textarea className="textarea-f" placeholder="یہاں پیغام پیسٹ کریں..." value={message} onChange={e=>setMessage(e.target.value)} rows={4}/>
                      <button className="btn-gold" style={{marginTop:'10px'}} onClick={handleMessageSubmit} disabled={processing||!message.trim()}>
                        {processing ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>AI پروسیس کر رہا ہے <span className="loading-dots"><span/><span/><span/></span></span> : '✨ AI سے ثواب شامل کریں'}
                      </button>
                      {resultMsg && <div className="result-msg">{resultMsg}</div>}
                      {amalEntries.length>0 && <div style={{marginTop:'12px'}}><div style={{color:'rgba(212,175,55,0.6)',fontSize:'13px',marginBottom:'6px'}}>موجودہ ثواب:</div><div className="count-chips">{amalEntries.map(([name,count])=><span key={name} className="chip">{name}: {count}</span>)}</div></div>}
                    </div>
                  )}

                  {activeAdminTab==='pending' && (
                    <>
                      <div className="admin-card">
                        <div className="card-title">⏳ زیرِ غور ثواب ({pendingAmal.length})</div>
                        {pendingAmal.length===0
                          ? <div className="empty-pending">کوئی ثواب زیرِ غور نہیں ✅</div>
                          : pendingAmal.map(item=>(
                            <div key={item.id} className="pending-item">
                              <div className="pending-msg">📝 {item.message}</div>
                              <div className="pending-amals">{(item.amals||[]).map((a,i)=><span key={i} className="pending-chip">{normalizeAmal(a.name)||a.name}: {a.count}</span>)}</div>
                              <div className="pending-time">{item.time}</div>
                              <div className="pending-actions">
                                <button className="btn-sm btn-success" onClick={()=>approvePendingAmal(item)}>✅ منظور</button>
                                <button className="btn-sm btn-danger" onClick={()=>rejectPendingAmal(item.id)}>❌ رد کریں</button>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                      <div className="admin-card">
                        <div className="card-title">⏳ زیرِ غور نام ({pendingNames.length})</div>
                        {pendingNames.length===0
                          ? <div className="empty-pending">کوئی نام زیرِ غور نہیں ✅</div>
                          : pendingNames.map(item=>(
                            <div key={item.id} className="pending-item">
                              <div className="pending-msg">🌹 {item.name}</div>
                              <div className="pending-time">{item.time}</div>
                              <div className="pending-actions">
                                <button className="btn-sm btn-success" onClick={()=>approvePendingName(item)}>✅ منظور</button>
                                <button className="btn-sm btn-danger" onClick={()=>rejectPendingName(item.id)}>❌ رد کریں</button>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </>
                  )}

                  {activeAdminTab==='names' && (
                    <div className="admin-card">
                      <div className="card-title">👥 منظور شدہ نام</div>
                      <div className="add-name-row">
                        <input className="add-name-inp" placeholder="نیا نام لکھیں..." value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addName()}/>
                        <button className="btn-add" onClick={addName}>+ شامل کریں</button>
                      </div>
                      <div className="names-admin">
                        {names.length===0 && <div style={{textAlign:'center',color:'rgba(255,255,255,0.26)',padding:'14px',fontSize:'14px'}}>کوئی نام نہیں</div>}
                        {names.map(n=>(
                          <div key={n.id} className="name-row">
                            {editingName===n.id
                              ? <><input className="name-edit-inp" value={editNameVal} onChange={e=>setEditNameVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveName(n.id)} autoFocus/><div className="name-actions"><button className="btn-sm" onClick={()=>saveName(n.id)}>محفوظ</button><button className="btn-sm btn-danger" onClick={()=>setEditingName(null)}>منسوخ</button></div></>
                              : <><span className="name-text">🌹 {n.name}</span><div className="name-actions"><button className="btn-sm" onClick={()=>{setEditingName(n.id);setEditNameVal(n.name);}}>ترمیم</button><button className="btn-sm btn-danger" onClick={()=>removeName(n.id)}>حذف</button></div></>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAdminTab==='reset' && (
                    <div className="admin-card">
                      <div className="card-title">🔄 ری سیٹ آپشن</div>
                      <div style={{color:'rgba(255,255,255,0.42)',fontSize:'clamp(13px,2.5vw,15px)',marginBottom:'18px',lineHeight:'1.9'}}>
                        ری سیٹ سے صرف <strong style={{color:'#ffaaaa'}}>اعمال صفر</strong> ہوں گے۔ نام <strong style={{color:'#7ddb90'}}>محفوظ</strong> رہیں گے۔
                      </div>
                      <div style={{textAlign:'center'}}>
                        <button className="btn-reset" onClick={()=>setConfirmReset(true)}>🔄 تمام اعمال ری سیٹ کریں</button>
                        {confirmReset && (
                          <div className="confirm-box">
                            <div className="confirm-text">⚠️ کیا واقعی تمام اعمال صفر کریں؟</div>
                            <div className="confirm-btns">
                              <button className="btn-sm btn-danger" style={{padding:'8px 16px'}} onClick={handleReset}>ہاں، ری سیٹ کریں</button>
                              <button className="btn-sm" style={{padding:'8px 16px'}} onClick={()=>setConfirmReset(false)}>منسوخ</button>
                            </div>
                          </div>
                        )}
                      </div>
                      {resultMsg && <div className="result-msg" style={{marginTop:'14px'}}>{resultMsg}</div>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
