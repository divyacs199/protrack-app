 import { useState, useEffect, useRef } from "react";

const getUsers = () => {
  try { return JSON.parse(localStorage.getItem("protrack_users") || "[]"); }
  catch { return []; }
};
const saveUsers = (u) => localStorage.setItem("protrack_users", JSON.stringify(u));

const TIPS = [
  { tip: "Break your big goals into smaller daily tasks — progress compounds!", icon: "🎯" },
  { tip: "Time-block your calendar. Deep work sessions = maximum productivity!", icon: "⏰" },
  { tip: "Review your tasks every morning. 5 mins of planning saves 2 hours!", icon: "📋" },
  { tip: "Done is better than perfect. Ship it, then improve it!", icon: "🚀" },
  { tip: "Say no to low-priority work. Focus protects your best energy!", icon: "🛡️" },
  { tip: "Take a 10-min walk after every 90 mins of work. It resets your brain!", icon: "🚶" },
  { tip: "Write down 3 wins at end of day. Momentum builds confidence!", icon: "✍️" },
  { tip: "Automate repetitive tasks. Your time is worth more than that!", icon: "⚡" },
];

const IMAGES = [
  { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=220&fit=crop", caption: "Build something great today 💼" },
  { url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=220&fit=crop", caption: "Teamwork makes the dream work 🤝" },
  { url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=220&fit=crop", caption: "Dress for the success you want 🎯" },
];

const CATEGORY_TYPES = [
  { value: "project",    label: "Project",    icon: "🗂️", taskLabel: "Milestones"  },
  { value: "skill",      label: "Skill",      icon: "🧠", taskLabel: "Modules"     },
  { value: "goal",       label: "Goal",       icon: "🎯", taskLabel: "Action Items" },
  { value: "department", label: "Department", icon: "🏢", taskLabel: "Tasks"        },
];

const COLORS = ["#667eea","#f093fb","#4ecdc4","#f5576c","#fda085","#43e97b"];
const EMOJIS = ["🗂️","🧠","🎯","🏢","💻","📊","🚀","⚙️","📱","🌐"];
const INIT_CATEGORIES = [];
const INIT_TASKS = [];

const SOUNDS = [
  { id: "gentle",  label: "🔔 Gentle Chime",  desc: "Soft bell tones"     },
  { id: "classic", label: "📢 Classic Beep",   desc: "Simple alert beep"   },
  { id: "urgent",  label: "🚨 Urgent Alert",   desc: "Fast urgent beeping" },
  { id: "pulse",   label: "💫 Soft Pulse",     desc: "Rhythmic pulses"     },
  { id: "morning", label: "🌅 Morning Bell",   desc: "Ascending chime"     },
];

const TIMER_PRESETS = [
  { label: "15 / 3",  work: 15, break: 3  },
  { label: "25 / 5",  work: 25, break: 5  },
  { label: "30 / 5",  work: 30, break: 5  },
  { label: "45 / 10", work: 45, break: 10 },
  { label: "50 / 10", work: 50, break: 10 },
  { label: "60 / 15", work: 60, break: 15 },
];

let alarmInterval = null;

function playSound(soundId, loop) {
  if (loop === undefined) loop = false;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var patterns = {
      gentle:  [[523,0.3,0],[659,0.3,0.4],[784,0.4,0.8]],
      classic: [[880,0.15,0],[880,0.15,0.25],[880,0.15,0.5]],
      urgent:  [[1000,0.1,0],[1000,0.1,0.15],[1000,0.1,0.3],[1000,0.1,0.45],[1000,0.1,0.6]],
      pulse:   [[440,0.3,0],[440,0.3,0.5],[440,0.3,1.0]],
      morning: [[330,0.25,0],[392,0.25,0.3],[494,0.25,0.6],[523,0.4,0.9]],
    };
    var notes = patterns[soundId] || patterns.gentle;
    notes.forEach(function(note) {
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = note[0];
      osc.type = (soundId === "gentle" || soundId === "morning") ? "sine" : "square";
      gain.gain.setValueAtTime(0, ctx.currentTime + note[2]);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + note[2] + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + note[2] + note[1]);
      osc.start(ctx.currentTime + note[2]);
      osc.stop(ctx.currentTime + note[2] + note[1] + 0.05);
    });
    if (loop) {
      var totalDur = Math.max.apply(null, notes.map(function(n) { return n[2] + n[1]; })) + 1.5;
      alarmInterval = setTimeout(function() { playSound(soundId, true); }, totalDur * 1000);
    }
  } catch(e) {}
}

function stopSound() {
  if (alarmInterval) { clearTimeout(alarmInterval); alarmInterval = null; }
}

function sendNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body: body });
}

function validatePassword(p) {
  var e = [];
  if (p.length < 8 || p.length > 10) e.push("❌ Password must be 8–10 characters long");
  if (!/^[A-Z]/.test(p)) e.push("❌ Must start with a capital letter");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) e.push("❌ Must contain a special character");
  return e;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function getPct(tasks, categoryId) {
  var t = tasks.filter(function(x) { return x.categoryId === categoryId; });
  if (!t.length) return 0;
  return Math.round((t.filter(function(x) { return x.done; }).length / t.length) * 100);
}

function getCatType(type) {
  return CATEGORY_TYPES.find(function(c) { return c.value === type; }) || CATEGORY_TYPES[0];
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: "#f0f0f0", borderRadius: 99, height: 8 }}>
      <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 99, transition: "width .6s ease" }} />
    </div>
  );
}

// ── ALARM MODAL ───────────────────────────────────────────────────────────────
function AlarmModal({ todo, onDismiss, onSnooze, onRemindLater }) {
  const [snoozeMins, setSnoozeMins] = useState(5);
  useEffect(function() {
    if (todo && todo.alarmSound) playSound(todo.alarmSound, true);
    return function() { stopSound(); };
  }, [todo]);
  if (!todo) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ background: "white", borderRadius: 28, padding: "40px 36px", maxWidth: 420, width: "90%", textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}`}</style>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#f5576c,#f093fb)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, animation: "pulse 1s infinite" }}>⏰</div>
        <p style={{ color: "#f5576c", fontSize: 12, fontWeight: 800, letterSpacing: 2, margin: "0 0 8px" }}>ALARM</p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 8px" }}>{todo.text}</h2>
        <p style={{ color: "gray", fontSize: 14, margin: "0 0 6px" }}>Deadline: {todo.deadlineDate} {todo.deadlineTime ? "at " + todo.deadlineTime : ""}</p>
        <p style={{ color: "#667eea", fontSize: 13, fontWeight: 700, margin: "0 0 28px" }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        <div style={{ background: "#f8f9ff", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "gray", margin: "0 0 10px", fontWeight: 600 }}>Snooze for:</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[5,10,15].map(function(m) {
              return <button key={m} onClick={function() { setSnoozeMins(m); }} style={{ padding: "8px 18px", borderRadius: 10, border: "2px solid " + (snoozeMins === m ? "#667eea" : "#eee"), background: snoozeMins === m ? "#667eea11" : "white", cursor: "pointer", fontWeight: 700, fontSize: 14, color: snoozeMins === m ? "#667eea" : "gray" }}>{m} min</button>;
            })}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={function() { onSnooze(snoozeMins); }} style={{ padding: 13, background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Snooze {snoozeMins} minutes</button>
          <button onClick={onRemindLater} style={{ padding: 12, background: "#fda08511", border: "2px solid #fda085", color: "#fda085", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>🔔 Remind Me Later (30 min)</button>
          <button onClick={onDismiss} style={{ padding: 12, background: "#f5f5f5", border: "none", color: "gray", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE PAGE (SIMPLE) ─────────────────────────────────────────────────────
function ProfilePage({ user, onGoHome }) {
  var storageKey = "protrack_profile_" + user.email;
  const [profile, setProfile] = useState(function() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch(e) { return {}; }
  });
  const [editing, setEditing] = useState(false);
  const [dob,     setDob]     = useState(profile.dob     || "");
  const [gender,  setGender]  = useState(profile.gender  || "");
  const [city,    setCity]    = useState(profile.city    || "");
  const [saved,   setSaved]   = useState(false);

  function saveProfile() {
    var updated = { dob: dob, gender: gender, city: city };
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setProfile(updated); setEditing(false); setSaved(true);
    setTimeout(function() { setSaved(false); }, 2500);
  }

  function cancelEdit() {
    setDob(profile.dob || ""); setGender(profile.gender || ""); setCity(profile.city || "");
    setEditing(false);
  }

  function calcAge(dobStr) {
    if (!dobStr) return null;
    var today = new Date(), birth = new Date(dobStr);
    var age = today.getFullYear() - birth.getFullYear();
    var m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  var age = calcAge(profile.dob);

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 520, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>👤 My Profile</h2>
          <p style={{ color: "gray", margin: 0 }}>Your personal information</p>
        </div>
        <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "rgba(255,255,255,0.8)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🏠 Home Page</button>
      </div>

      <div style={{ background: "white", borderRadius: 24, padding: 32, boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>

        {/* Avatar + Name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "white", marginBottom: 14 }}>
            {user.name[0].toUpperCase()}
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>{user.name}</h3>
          {age !== null && <span style={{ background: "#667eea11", color: "#667eea", fontSize: 13, fontWeight: 700, padding: "3px 12px", borderRadius: 99 }}>Age {age}</span>}
        </div>

        {/* Read-only info */}
        <div style={{ background: "#f8f9ff", borderRadius: 16, padding: "18px 20px", marginBottom: 20, border: "1px solid #e8eeff" }}>
          <p style={{ fontSize: 11, color: "#667eea", fontWeight: 800, letterSpacing: 1, margin: "0 0 14px" }}>🔒 ACCOUNT DETAILS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["👤 Name", user.name], ["✉️ Email", user.email], ["📱 Mobile", user.phone || "—"]].map(function(item) {
              return (
                <div key={item[0]} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "gray", fontWeight: 600 }}>{item[0]}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{item[1]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save success */}
        {saved && (
          <div style={{ background: "#f0fdf4", border: "1.5px solid #4ecdc4", borderRadius: 12, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span>✅</span>
            <p style={{ color: "#166534", fontWeight: 700, margin: 0, fontSize: 14 }}>Profile saved!</p>
          </div>
        )}

        {/* Editable fields */}
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "gray", fontWeight: 700, display: "block", marginBottom: 6 }}>🎂 DATE OF BIRTH</label>
              <input type="date" value={dob} onChange={function(e) { setDob(e.target.value); }}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "2px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a" }}
                onFocus={function(e) { e.target.style.borderColor = "#667eea"; }}
                onBlur={function(e) { e.target.style.borderColor = "#eee"; }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "gray", fontWeight: 700, display: "block", marginBottom: 8 }}>⚧ GENDER</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Male", "Female", "Other"].map(function(g) {
                  return (
                    <button key={g} onClick={function() { setGender(g); }}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "2px solid " + (gender === g ? "#667eea" : "#eee"), background: gender === g ? "#667eea11" : "white", color: gender === g ? "#667eea" : "gray", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "gray", fontWeight: 700, display: "block", marginBottom: 6 }}>📍 CITY</label>
              <input type="text" value={city} onChange={function(e) { setCity(e.target.value); }} placeholder="e.g. Bengaluru"
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "2px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={function(e) { e.target.style.borderColor = "#667eea"; }}
                onBlur={function(e) { e.target.style.borderColor = "#eee"; }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={cancelEdit} style={{ flex: 1, padding: 13, background: "#f5f5f5", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", color: "gray", fontSize: 14 }}>Cancel</button>
              <button onClick={saveProfile} style={{ flex: 2, padding: 13, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", color: "white", fontSize: 14 }}>💾 Save Profile</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {[
                ["🎂 Date of Birth", profile.dob ? new Date(profile.dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + (age !== null ? "  (Age " + age + ")" : "") : "Not set"],
                ["⚧ Gender",        profile.gender || "Not set"],
                ["📍 City",         profile.city   || "Not set"],
              ].map(function(item) {
                return (
                  <div key={item[0]} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8f9ff", borderRadius: 12 }}>
                    <span style={{ fontSize: 13, color: "gray", fontWeight: 600 }}>{item[0]}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: item[1] === "Not set" ? "#ccc" : "#0f172a", fontStyle: item[1] === "Not set" ? "italic" : "normal" }}>{item[1]}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={function() { setEditing(true); }} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: 14, fontWeight: 700, cursor: "pointer", color: "white", fontSize: 15 }}>✏️ Edit Profile</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, user, onLogout, onGoHome }) {
  var nav1 = [
    { id: "dashboard",  icon: "📊", label: "Dashboard"  },
    { id: "categories", icon: "🗂️", label: "Categories" },
    { id: "tasks",      icon: "✅", label: "Tasks"       },
    { id: "deadlines",  icon: "📅", label: "Deadlines"  },
  ];
  var nav2 = [
    { id: "focus", icon: "⏱️", label: "Focus Mode", badge: "NEW" },
    { id: "todo",  icon: "📝", label: "To-Do List" },
  ];
  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", padding: "28px 14px", position: "fixed", top: 0, left: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 8, marginBottom: 36 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💼</div>
        <span style={{ color: "white", fontSize: 17, fontWeight: 900 }}>ProTrack</span>
      </div>
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "0 14px", margin: "0 0 4px" }}>WORKSPACE</p>
        {nav1.map(function(n) {
          return (
            <button key={n.id} onClick={function() { setPage(n.id); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: "none", background: page === n.id ? "rgba(102,126,234,0.2)" : "transparent", color: page === n.id ? "#a5b4fc" : "rgba(255,255,255,0.5)", fontWeight: page === n.id ? 700 : 400, fontSize: 14, cursor: "pointer", textAlign: "left", transition: "all .2s" }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
              {page === n.id && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#a5b4fc" }} />}
            </button>
          );
        })}
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "12px 14px 4px", margin: 0 }}>PRODUCTIVITY</p>
        {nav2.map(function(n) {
          return (
            <button key={n.id} onClick={function() { setPage(n.id); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: "none", background: page === n.id ? "rgba(102,126,234,0.2)" : "transparent", color: page === n.id ? "#a5b4fc" : "rgba(255,255,255,0.5)", fontWeight: page === n.id ? 700 : 400, fontSize: 14, cursor: "pointer", textAlign: "left", transition: "all .2s" }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
              {n.badge && <span style={{ marginLeft: "auto", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 9, padding: "2px 6px", borderRadius: 99, fontWeight: 700 }}>{n.badge}</span>}
              {page === n.id && !n.badge && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#a5b4fc" }} />}
            </button>
          );
        })}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 16, paddingTop: 12 }}>
          <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 14, cursor: "pointer", textAlign: "left", width: "100%", transition: "all .2s" }}
            onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
            <span style={{ fontSize: 16 }}>🏠</span> Home Page
          </button>
        </div>
      </nav>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
        <div onClick={function() { setPage("profile"); }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 12, cursor: "pointer", borderRadius: 12, transition: "all .2s", border: page === "profile" ? "1.5px solid rgba(102,126,234,0.5)" : "1.5px solid transparent", background: page === "profile" ? "rgba(102,126,234,0.15)" : "transparent" }}
          onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = page === "profile" ? "rgba(102,126,234,0.15)" : "transparent"; }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#f093fb)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 15, flexShrink: 0 }}>{user.name[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", fontSize: 13, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
          </div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>›</span>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: 9, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Log Out</button>
      </div>
    </aside>
  );
}

// ── TODO PAGE ─────────────────────────────────────────────────────────────────
function TodoPage({ onGoHome }) {
  const [todos, setTodos] = useState(function() {
    try { return JSON.parse(localStorage.getItem("protrack_todos") || "[]"); } catch(e) { return []; }
  });
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [alarmTodo, setAlarmTodo] = useState(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const [addText, setAddText] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addAlarmType, setAddAlarmType] = useState("none");
  const [addSound, setAddSound] = useState("gentle");
  const [addPriority, setAddPriority] = useState("normal");

  function saveTodos(updated) { setTodos(updated); localStorage.setItem("protrack_todos", JSON.stringify(updated)); }

  useEffect(function() {
    function checkAlarms() {
      var now = new Date();
      var stored = JSON.parse(localStorage.getItem("protrack_todos") || "[]");
      var triggered = stored.find(function(t) {
        return !t.done && !t.alarmDismissed && t.deadlineDate && t.deadlineTime && t.addAlarmType === "alarm" &&
          new Date(t.deadlineDate + "T" + t.deadlineTime) <= now &&
          new Date(t.deadlineDate + "T" + t.deadlineTime) > new Date(now - 60000);
      });
      if (triggered) setAlarmTodo(triggered);
      stored.forEach(function(t) {
        if (!t.done && !t.notifSent && t.deadlineDate && t.deadlineTime && t.addAlarmType === "notify" &&
          new Date(t.deadlineDate + "T" + t.deadlineTime) <= now &&
          new Date(t.deadlineDate + "T" + t.deadlineTime) > new Date(now - 60000)) {
          sendNotification("ProTrack Reminder", t.text);
          var updated = stored.map(function(x) { return x.id === t.id ? Object.assign({}, x, { notifSent: true }) : x; });
          localStorage.setItem("protrack_todos", JSON.stringify(updated)); setTodos(updated);
        }
      });
    }
    var interval = setInterval(checkAlarms, 30000);
    return function() { clearInterval(interval); };
  }, []);

  useEffect(function() { setNotifGranted("Notification" in window && Notification.permission === "granted"); }, []);

  function handleAddAlarmType(type) {
    setAddAlarmType(type);
    if (type === "notify" && "Notification" in window) Notification.requestPermission().then(function(p) { setNotifGranted(p === "granted"); });
  }

  function addTodo() {
    if (!addText.trim()) return;
    saveTodos([{ id: Date.now(), text: addText.trim(), done: false, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), priority: addPriority, deadlineDate: addDate, deadlineTime: addTime, addAlarmType: addAlarmType, alarmSound: addSound, alarmDismissed: false, notifSent: false }].concat(todos));
    setAddText(""); setAddDate(""); setAddTime(""); setAddAlarmType("none"); setAddPriority("normal"); setShowAdd(false);
  }

  function handleSnooze(mins) {
    stopSound(); if (!alarmTodo) return;
    var t2 = new Date(Date.now() + mins * 60000);
    var hh = String(t2.getHours()).padStart(2,"0"), mm = String(t2.getMinutes()).padStart(2,"0"), dd = t2.toISOString().split("T")[0];
    saveTodos(todos.map(function(t) { return t.id === alarmTodo.id ? Object.assign({}, t, { deadlineDate: dd, deadlineTime: hh+":"+mm, alarmDismissed: false, notifSent: false }) : t; }));
    setAlarmTodo(null);
  }
  function handleRemindLater() {
    stopSound(); if (!alarmTodo) return;
    var t2 = new Date(Date.now() + 30*60000);
    var hh = String(t2.getHours()).padStart(2,"0"), mm = String(t2.getMinutes()).padStart(2,"0"), dd = t2.toISOString().split("T")[0];
    saveTodos(todos.map(function(t) { return t.id === alarmTodo.id ? Object.assign({}, t, { deadlineDate: dd, deadlineTime: hh+":"+mm, alarmDismissed: false, notifSent: false }) : t; }));
    setAlarmTodo(null);
  }
  function handleDismiss() { stopSound(); saveTodos(todos.map(function(t) { return t.id === alarmTodo.id ? Object.assign({}, t, { alarmDismissed: true }) : t; })); setAlarmTodo(null); }
  function toggle(id) { saveTodos(todos.map(function(t) { return t.id === id ? Object.assign({}, t, { done: !t.done }) : t; })); }
  function remove(id) { saveTodos(todos.filter(function(t) { return t.id !== id; })); }
  function clearDone() { saveTodos(todos.filter(function(t) { return !t.done; })); }
  function saveEdit(id) { if (!editVal.trim()) return; saveTodos(todos.map(function(t) { return t.id === id ? Object.assign({}, t, { text: editVal.trim() }) : t; })); setEditId(null); }
  function togglePriority(id) { saveTodos(todos.map(function(t) { return t.id === id ? Object.assign({}, t, { priority: t.priority === "high" ? "normal" : "high" }) : t; })); }

  var filtered = todos.filter(function(t) { return filter === "all" ? true : filter === "done" ? t.done : !t.done; });
  var doneCount = todos.filter(function(t) { return t.done; }).length;
  var pendingCount = todos.filter(function(t) { return !t.done; }).length;

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {alarmTodo && <AlarmModal todo={alarmTodo} onDismiss={handleDismiss} onSnooze={handleSnooze} onRemindLater={handleRemindLater} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>📝 To-Do List</h2>
          <p style={{ color: "gray", margin: 0 }}>Quick tasks with smart alarms</p>
        </div>
        <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "rgba(255,255,255,0.8)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🏠 Home Page</button>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[["📝", todos.length, "Total", "#667eea"],["⏳", pendingCount, "Pending", "#fda085"],["✅", doneCount, "Completed", "#4ecdc4"]].map(function(item) {
          return (
            <div key={item[2]} style={{ background: "white", borderRadius: 14, padding: "14px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 100 }}>
              <span style={{ fontSize: 22 }}>{item[0]}</span>
              <div><p style={{ fontSize: 22, fontWeight: 900, color: item[3], margin: 0 }}>{item[1]}</p><p style={{ fontSize: 12, color: "gray", margin: 0 }}>{item[2]}</p></div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 14, display: "flex", gap: 10 }}>
        <input placeholder="Quick add — press Enter" value={input} onChange={function(e) { setInput(e.target.value); }}
          onKeyDown={function(e) { if (e.key === "Enter" && input.trim()) { saveTodos([{ id: Date.now(), text: input.trim(), done: false, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), priority: "normal", addAlarmType: "none" }].concat(todos)); setInput(""); } }}
          style={{ flex: 1, border: "2px solid #eee", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none" }}
          onFocus={function(e) { e.target.style.borderColor = "#667eea"; }} onBlur={function(e) { e.target.style.borderColor = "#eee"; }} />
        <button onClick={function() { setShowAdd(true); }} style={{ padding: "10px 18px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add with Options</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", background: "white", border: "2px solid #eee", borderRadius: 10, overflow: "hidden" }}>
          {["all","pending","done"].map(function(f) {
            return <button key={f} onClick={function() { setFilter(f); }} style={{ padding: "9px 16px", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === f ? "linear-gradient(135deg,#667eea,#764ba2)" : "white", color: filter === f ? "white" : "gray" }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>;
          })}
        </div>
        {doneCount > 0 && <button onClick={clearDone} style={{ padding: "9px 14px", background: "#fff5f5", border: "1.5px solid #f5576c33", borderRadius: 10, color: "#f5576c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Clear Done ({doneCount})</button>}
      </div>
      {todos.length > 0 && (
        <div style={{ background: "white", borderRadius: 12, padding: "12px 16px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Today's Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#667eea" }}>{Math.round((doneCount / todos.length) * 100)}%</span>
          </div>
          <ProgressBar pct={Math.round((doneCount / todos.length) * 100)} color="#667eea" />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(function(t) {
          return (
            <div key={t.id} style={{ background: "white", borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12, opacity: t.done ? 0.65 : 1, borderLeft: "4px solid " + (t.priority === "high" ? "#f5576c" : t.done ? "#4ecdc4" : "#667eea") }}>
              <button onClick={function() { toggle(t.id); }} style={{ width: 22, height: 22, borderRadius: 6, border: "2px solid " + (t.done ? "#4ecdc4" : "#667eea"), background: t.done ? "#4ecdc4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", fontSize: 13, fontWeight: 700, flex: "none" }}>{t.done ? "✓" : ""}</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editId === t.id ? (
                  <input value={editVal} onChange={function(e) { setEditVal(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") saveEdit(t.id); if (e.key === "Escape") setEditId(null); }} autoFocus style={{ width: "100%", border: "2px solid #667eea", borderRadius: 8, padding: "6px 10px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                ) : (
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", textDecoration: t.done ? "line-through" : "none", color: t.done ? "gray" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "gray" }}>{t.createdAt}</span>
                      {t.deadlineDate && <span style={{ background: "#667eea11", color: "#667eea", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>📅 {t.deadlineDate}{t.deadlineTime ? " " + t.deadlineTime : ""}</span>}
                      {t.addAlarmType === "alarm"  && <span style={{ background: "#f5576c11", color: "#f5576c", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>⏰ Alarm</span>}
                      {t.addAlarmType === "notify" && <span style={{ background: "#fda08511", color: "#fda085", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>🔔 Notify</span>}
                      {t.priority === "high" && <span style={{ background: "#f5576c11", color: "#f5576c", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>🔥 High</span>}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flex: "none" }}>
                <button onClick={function() { togglePriority(t.id); }} style={{ background: t.priority === "high" ? "#fff5f5" : "#f5f5f5", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.priority === "high" ? "🔥" : "⚑"}</button>
                {editId === t.id
                  ? <button onClick={function() { saveEdit(t.id); }} style={{ background: "#667eea22", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button>
                  : <button onClick={function() { setEditId(t.id); setEditVal(t.text); }} style={{ background: "#f5f5f5", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>}
                <button onClick={function() { remove(t.id); }} style={{ background: "#fff5f5", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#f5576c", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>{filter === "done" ? "🎯" : "📝"}</p>
            <p style={{ color: "gray", fontSize: 15 }}>{filter === "done" ? "No completed tasks yet!" : "No to-dos! Add one above."}</p>
          </div>
        )}
      </div>
      {showAdd && (
        <div onClick={function() { setShowAdd(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: "white", borderRadius: 24, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontWeight: 900, fontSize: 20, color: "#0f172a", margin: 0 }}>New To-Do</h3>
              <button onClick={function() { setShowAdd(false); }} style={{ background: "#f5f5f5", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input placeholder="What needs to be done?" value={addText} onChange={function(e) { setAddText(e.target.value); }} autoFocus onKeyDown={function(e) { if (e.key === "Enter") addTodo(); }} style={{ padding: "12px 14px", borderRadius: 12, border: "2px solid #eee", fontSize: 14, outline: "none" }} onFocus={function(e) { e.target.style.borderColor = "#667eea"; }} onBlur={function(e) { e.target.style.borderColor = "#eee"; }} />
              <div>
                <p style={{ fontSize: 12, color: "gray", fontWeight: 700, marginBottom: 8 }}>PRIORITY</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["normal","Normal","#667eea"],["high","🔥 High","#f5576c"]].map(function(item) {
                    return <button key={item[0]} onClick={function() { setAddPriority(item[0]); }} style={{ flex: 1, padding: 9, borderRadius: 10, border: "2px solid " + (addPriority === item[0] ? item[2] : "#eee"), background: addPriority === item[0] ? item[2] + "11" : "white", cursor: "pointer", fontWeight: 700, fontSize: 13, color: addPriority === item[0] ? item[2] : "gray" }}>{item[1]}</button>;
                  })}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "gray", fontWeight: 700, marginBottom: 8 }}>DEADLINE (OPTIONAL)</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="date" value={addDate} onChange={function(e) { setAddDate(e.target.value); }} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }} />
                  <input type="time" value={addTime} onChange={function(e) { setAddTime(e.target.value); }} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }} />
                </div>
              </div>
              {(addDate || addTime) && (
                <div>
                  <p style={{ fontSize: 12, color: "gray", fontWeight: 700, marginBottom: 8 }}>ALERT TYPE</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[["none","🔕","No Alert","Deadline saved silently"],["notify","🔔","Notification","Silent push notification"],["alarm","⏰","Alarm with Sound","Plays a sound + alarm popup"]].map(function(item) {
                      var ac = item[0] === "alarm" ? "#f5576c" : item[0] === "notify" ? "#fda085" : "#667eea";
                      return (
                        <button key={item[0]} onClick={function() { handleAddAlarmType(item[0]); }} style={{ padding: "11px 14px", borderRadius: 12, border: "2px solid " + (addAlarmType === item[0] ? ac : "#eee"), background: addAlarmType === item[0] ? ac + "11" : "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                          <span style={{ fontSize: 20 }}>{item[1]}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: addAlarmType === item[0] ? ac : "#0f172a" }}>{item[2]}</p>
                            <p style={{ fontSize: 12, color: "gray", margin: 0 }}>{item[3]}</p>
                          </div>
                          {item[0] === "notify" && (notifGranted ? <span style={{ fontSize: 11, background: "#4ecdc411", color: "#4ecdc4", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>Allowed</span> : <span style={{ fontSize: 11, background: "#fda08511", color: "#fda085", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>Allow</span>)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {addAlarmType === "alarm" && (
                <div style={{ background: "#f8f9ff", borderRadius: 16, padding: 16 }}>
                  <p style={{ fontSize: 12, color: "gray", fontWeight: 700, marginBottom: 10 }}>SELECT ALARM SOUND</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {SOUNDS.map(function(s) {
                      return (
                        <div key={s.id} onClick={function() { setAddSound(s.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: "2px solid " + (addSound === s.id ? "#667eea" : "#eee"), background: addSound === s.id ? "#667eea11" : "white", cursor: "pointer" }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: addSound === s.id ? "#667eea" : "#0f172a" }}>{s.label}</p>
                            <p style={{ fontSize: 11, color: "gray", margin: 0 }}>{s.desc}</p>
                          </div>
                          <button onClick={function(e) { e.stopPropagation(); playSound(s.id); }} style={{ padding: "5px 12px", background: "#667eea22", border: "none", borderRadius: 8, color: "#667eea", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Test</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={function() { setShowAdd(false); }} style={{ flex: 1, padding: 12, background: "#f5f5f5", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", color: "gray", fontSize: 14 }}>Cancel</button>
                <button onClick={addTodo} style={{ flex: 2, padding: 12, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", color: "white", fontSize: 14 }}>Add To-Do</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FOCUS PAGE ────────────────────────────────────────────────────────────────
function FocusPage({ tasks, categories, setPage, onGoHome }) {
  var DEFAULT_MODES = [
    { label: "Pomodoro",    work: 25, break: 5,  color: "#f5576c" },
    { label: "Short Focus", work: 15, break: 3,  color: "#fda085" },
    { label: "Deep Work",   work: 50, break: 10, color: "#667eea" },
    { label: "Custom",      work: 30, break: 5,  color: "#43e97b" },
  ];
  const [modes,          setModes]          = useState(DEFAULT_MODES);
  const [modeIdx,        setModeIdx]        = useState(0);
  const [phase,          setPhase]          = useState("work");
  const [running,        setRunning]        = useState(false);
  const [seconds,        setSeconds]        = useState(DEFAULT_MODES[0].work * 60);
  const [sessions,       setSessions]       = useState(0);
  const [selectedTask,   setSelectedTask]   = useState(null);
  const [finished,       setFinished]       = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [editWork,       setEditWork]       = useState(DEFAULT_MODES[0].work);
  const [editBreak,      setEditBreak]      = useState(DEFAULT_MODES[0].break);
  const intervalRef = useRef(null);

  var mode = modes[modeIdx];
  var totalSecs = phase === "work" ? mode.work * 60 : mode.break * 60;
  var progress = ((totalSecs - seconds) / totalSecs) * 100;
  var mins = String(Math.floor(seconds / 60)).padStart(2,"0");
  var secs = String(seconds % 60).padStart(2,"0");
  var R = 90, circ = 2 * Math.PI * R, strokeDash = circ - (progress / 100) * circ;

  useEffect(function() {
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(function() {});
    return function() { if (document.fullscreenElement) document.exitFullscreen().catch(function() {}); };
  }, []);

  useEffect(function() {
    function onKey(e) { if (e.key === "Escape") { e.preventDefault(); exitFocus(); } }
    document.addEventListener("keydown", onKey, true);
    return function() { document.removeEventListener("keydown", onKey, true); };
  });

  useEffect(function() {
    if (running) {
      intervalRef.current = setInterval(function() {
        setSeconds(function(s) {
          if (s <= 1) { clearInterval(intervalRef.current); setRunning(false); setFinished(true); if (phase === "work") setSessions(function(n) { return n + 1; }); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return function() { clearInterval(intervalRef.current); };
  }, [running, phase]);

  function switchMode(idx) {
    clearInterval(intervalRef.current);
    setModeIdx(idx); setPhase("work"); setRunning(false); setFinished(false);
    setSeconds(modes[idx].work * 60);
    setEditWork(modes[idx].work); setEditBreak(modes[idx].break);
  }

  function applyToCurrentMode() {
    var w = Math.max(1, Math.min(180, Number(editWork) || 1));
    var b = Math.max(1, Math.min(60,  Number(editBreak) || 1));
    var updated = modes.map(function(m, i) { return i === modeIdx ? Object.assign({}, m, { work: w, break: b }) : m; });
    setModes(updated); clearInterval(intervalRef.current);
    setPhase("work"); setRunning(false); setFinished(false);
    setSeconds(w * 60); setShowTimerModal(false);
  }

  function applyAsCustom() {
    var w = Math.max(1, Math.min(180, Number(editWork) || 1));
    var b = Math.max(1, Math.min(60,  Number(editBreak) || 1));
    var updated = modes.map(function(m, i) { return i === 3 ? Object.assign({}, m, { work: w, break: b }) : m; });
    setModes(updated); clearInterval(intervalRef.current);
    setModeIdx(3); setPhase("work"); setRunning(false); setFinished(false);
    setSeconds(w * 60); setShowTimerModal(false);
  }

  function startBreak() { setPhase("break"); setRunning(true); setFinished(false); setSeconds(mode.break * 60); }
  function reset() { clearInterval(intervalRef.current); setPhase("work"); setRunning(false); setFinished(false); setSeconds(mode.work * 60); }
  function exitFocus() {
    clearInterval(intervalRef.current);
    if (document.fullscreenElement) { document.exitFullscreen().catch(function() {}).finally(function() { setPage("dashboard"); }); }
    else { setPage("dashboard"); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: phase === "work" ? "linear-gradient(135deg,#0f172a,#1e3a5f)" : "linear-gradient(135deg,#064e3b,#1a4731)", fontFamily: "sans-serif", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💼</div>
          <span style={{ color: "white", fontSize: 17, fontWeight: 900 }}>ProTrack · Focus Mode</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, padding: "7px 14px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <kbd style={{ background: "rgba(255,255,255,0.15)", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 5, fontFamily: "monospace", fontWeight: 700 }}>ESC</kbd>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>to exit</span>
          </div>
          <button onClick={onGoHome} style={{ padding: "9px 16px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🏠 Home</button>
          <button onClick={exitFocus} style={{ padding: "9px 20px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Back to Dashboard</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, padding: "0 40px 40px", maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 4 }}>
            {modes.map(function(m, i) {
              return (
                <button key={m.label} onClick={function() { switchMode(i); }}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: modeIdx === i ? m.color : "transparent", color: modeIdx === i ? "white" : "rgba(255,255,255,0.45)", transition: "all .2s", lineHeight: 1.3 }}>
                  {m.label}
                  {i === 3 && <span style={{ display: "block", fontSize: 10, opacity: 0.8, fontWeight: 500 }}>{m.work}m/{m.break}m</span>}
                </button>
              );
            })}
          </div>
          <button onClick={function() { setEditWork(mode.work); setEditBreak(mode.break); setShowTimerModal(true); }}
            style={{ marginBottom: 20, padding: "13px 32px", background: "rgba(255,255,255,0.1)", border: "2px dashed rgba(255,255,255,0.3)", borderRadius: 14, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all .2s" }}
            onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.borderColor = mode.color; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}>
            <span style={{ fontSize: 18 }}>⏱️</span>
            <span>Set Timer</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
            <span style={{ color: mode.color, fontWeight: 900 }}>{mode.work} min work</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>/</span>
            <span style={{ color: "#10b981", fontWeight: 900 }}>{mode.break} min break</span>
            <span style={{ fontSize: 16 }}>✏️</span>
          </button>
          <div style={{ background: phase === "work" ? mode.color + "33" : "#10b98133", border: "1px solid " + (phase === "work" ? mode.color : "#10b981"), borderRadius: 99, padding: "5px 20px", marginBottom: 20 }}>
            <span style={{ color: phase === "work" ? mode.color : "#10b981", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{phase === "work" ? "🔥 FOCUS TIME" : "☕ BREAK TIME"}</span>
          </div>
          {selectedTask && (
            <div style={{ background: "rgba(102,126,234,0.2)", border: "1px solid rgba(102,126,234,0.4)", borderRadius: 14, padding: "10px 22px", marginBottom: 18, textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, margin: "0 0 3px", fontWeight: 700, letterSpacing: 1 }}>FOCUSING ON</p>
              <p style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>🎯 {selectedTask.title}</p>
            </div>
          )}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <svg width={240} height={240} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={120} cy={120} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} />
              <circle cx={120} cy={120} r={R} fill="none" stroke={phase === "work" ? mode.color : "#10b981"} strokeWidth={14} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={strokeDash} style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 58, fontWeight: 900, letterSpacing: -3, lineHeight: 1 }}>{mins}:{secs}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6 }}>{phase === "work" ? mode.work + " min session" : mode.break + " min break"}</span>
            </div>
          </div>
          {finished && (
            <div style={{ background: phase === "work" ? "#f5576c22" : "#10b98122", border: "1px solid " + (phase === "work" ? "#f5576c" : "#10b981"), borderRadius: 14, padding: "14px 28px", marginBottom: 20, textAlign: "center" }}>
              <p style={{ color: "white", fontWeight: 700, fontSize: 17, margin: 0 }}>{phase === "work" ? "🎉 Session Complete!" : "✅ Break over!"}</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {!running && !finished && <button onClick={function() { setRunning(true); }} style={{ padding: "14px 44px", background: mode.color, color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 24px " + mode.color + "55" }}>{seconds === mode.work * 60 ? "▶ Start Focus" : "▶ Resume"}</button>}
            {running && <button onClick={function() { clearInterval(intervalRef.current); setRunning(false); }} style={{ padding: "14px 44px", background: "rgba(255,255,255,0.1)", color: "white", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>⏸ Pause</button>}
            {finished && phase === "work" && <button onClick={startBreak} style={{ padding: "14px 32px", background: "#10b981", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>☕ Take Break</button>}
            <button onClick={reset} style={{ padding: "14px 24px", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, fontSize: 15, cursor: "pointer", fontWeight: 700 }}>↺ Reset</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Sessions:</span>
            <div style={{ display: "flex", gap: 5 }}>{Array.from({ length: Math.max(sessions, 4) }).map(function(_, i) { return <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < sessions ? mode.color : "rgba(255,255,255,0.1)" }} />; })}</div>
            <span style={{ color: mode.color, fontWeight: 700, fontSize: 13 }}>{sessions} done</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: 20, border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: "white", margin: "0 0 4px" }}>🎯 Focus On Task</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "0 0 12px" }}>Pick a task to lock in on</p>
            {selectedTask ? (
              <div style={{ background: "rgba(102,126,234,0.2)", borderRadius: 12, padding: "12px 14px", border: "2px solid #667eea44" }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "white", margin: "0 0 6px" }}>{selectedTask.title}</p>
                {(function() { var cat = categories.find(function(c) { return c.id === selectedTask.categoryId; }); return cat ? <span style={{ background: cat.color + "33", color: cat.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{cat.emoji} {cat.name}</span> : null; })()}
                <button onClick={function() { setSelectedTask(null); }} style={{ display: "block", marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 12, cursor: "pointer", fontWeight: 700, padding: 0 }}>✕ Clear</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {tasks.filter(function(t) { return !t.done; }).length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No pending tasks. Add tasks first!</p>}
                {tasks.filter(function(t) { return !t.done; }).map(function(t) {
                  var cat = categories.find(function(c) { return c.id === t.categoryId; });
                  return (
                    <div key={t.id} onClick={function() { setSelectedTask(t); }} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", background: "rgba(255,255,255,0.04)" }}
                      onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(102,126,234,0.2)"; }}
                      onMouseLeave={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 2px", color: "white" }}>{t.title}</p>
                      {cat && <span style={{ background: cat.color + "33", color: cat.color, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{cat.emoji} {cat.name}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ background: "linear-gradient(135deg,rgba(102,126,234,0.3),rgba(118,75,162,0.3))", borderRadius: 18, padding: "18px 20px", border: "1px solid rgba(102,126,234,0.3)" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 7px" }}>FOCUS TIP</p>
            <p style={{ color: "white", fontSize: 13, lineHeight: 1.7, margin: 0 }}>One task. One screen. One goal. Close mental tabs and get it done. 🚀</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>Press ESC or click Back to exit fullscreen</p>
          </div>
        </div>
      </div>

      {showTimerModal && (
        <div onClick={function() { setShowTimerModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: "#1e293b", borderRadius: 28, padding: 36, width: "100%", maxWidth: 500, boxShadow: "0 32px 80px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div>
                <h2 style={{ color: "white", fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>⏱️ Set Your Timer</h2>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>Choose a preset or set custom minutes</p>
              </div>
              <button onClick={function() { setShowTimerModal(false); }} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 10px" }}>QUICK PRESETS (work / break in minutes)</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 28 }}>
              {TIMER_PRESETS.map(function(p) {
                var active = Number(editWork) === p.work && Number(editBreak) === p.break;
                return (
                  <button key={p.label} onClick={function() { setEditWork(p.work); setEditBreak(p.break); }}
                    style={{ padding: "12px 8px", borderRadius: 12, border: "2px solid " + (active ? mode.color : "rgba(255,255,255,0.12)"), background: active ? mode.color + "22" : "rgba(255,255,255,0.05)", color: active ? mode.color : "rgba(255,255,255,0.7)", fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "all .15s" }}>
                    {p.label}
                    <span style={{ display: "block", fontSize: 10, opacity: 0.6, fontWeight: 400, marginTop: 2 }}>min</span>
                  </button>
                );
              })}
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 14px" }}>CUSTOM DURATION</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ color: mode.color, fontSize: 12, fontWeight: 800, letterSpacing: 1, margin: "0 0 12px", textAlign: "center" }}>🔥 WORK (min)</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 10 }}>
                  <button onClick={function() { setEditWork(function(v) { return Math.max(1, Number(v) - 5); }); }} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                  <input type="number" value={editWork} onChange={function(e) { var v = Number(e.target.value); if (!isNaN(v)) setEditWork(Math.max(1, Math.min(180, v))); }} min={1} max={180}
                    style={{ width: 64, textAlign: "center", background: "rgba(255,255,255,0.1)", border: "2px solid " + mode.color, borderRadius: 10, padding: "8px", color: "white", fontSize: 22, fontWeight: 900, outline: "none" }} />
                  <button onClick={function() { setEditWork(function(v) { return Math.min(180, Number(v) + 5); }); }} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                </div>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                  {[15,20,25,30,45,60].map(function(v) {
                    return <button key={v} onClick={function() { setEditWork(v); }} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid " + (Number(editWork) === v ? mode.color : "rgba(255,255,255,0.15)"), background: Number(editWork) === v ? mode.color + "33" : "transparent", color: Number(editWork) === v ? mode.color : "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{v}</button>;
                  })}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ color: "#10b981", fontSize: 12, fontWeight: 800, letterSpacing: 1, margin: "0 0 12px", textAlign: "center" }}>☕ BREAK (min)</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 10 }}>
                  <button onClick={function() { setEditBreak(function(v) { return Math.max(1, Number(v) - 1); }); }} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                  <input type="number" value={editBreak} onChange={function(e) { var v = Number(e.target.value); if (!isNaN(v)) setEditBreak(Math.max(1, Math.min(60, v))); }} min={1} max={60}
                    style={{ width: 64, textAlign: "center", background: "rgba(255,255,255,0.1)", border: "2px solid #10b981", borderRadius: 10, padding: "8px", color: "white", fontSize: 22, fontWeight: 900, outline: "none" }} />
                  <button onClick={function() { setEditBreak(function(v) { return Math.min(60, Number(v) + 1); }); }} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                </div>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                  {[3,5,8,10,15,20].map(function(v) {
                    return <button key={v} onClick={function() { setEditBreak(v); }} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid " + (Number(editBreak) === v ? "#10b981" : "rgba(255,255,255,0.15)"), background: Number(editBreak) === v ? "#10b98133" : "transparent", color: Number(editBreak) === v ? "#10b981" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{v}</button>;
                  })}
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(102,126,234,0.1)", borderRadius: 14, padding: "12px 18px", marginBottom: 20, border: "1px solid rgba(102,126,234,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: mode.color, fontSize: 20, fontWeight: 900 }}>{editWork} min</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>work +</span>
              <span style={{ color: "#10b981", fontSize: 20, fontWeight: 900 }}>{editBreak} min</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>break =</span>
              <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>{Number(editWork) + Number(editBreak)} min total</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function() { setShowTimerModal(false); }} style={{ flex: 1, padding: 13, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "rgba(255,255,255,0.5)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={applyAsCustom} style={{ flex: 1, padding: 13, background: "rgba(67,233,123,0.15)", border: "1px solid #43e97b55", borderRadius: 14, color: "#43e97b", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save as Custom</button>
              <button onClick={applyToCurrentMode} style={{ flex: 2, padding: 13, background: "linear-gradient(135deg," + mode.color + ",#764ba2)", border: "none", borderRadius: 14, color: "white", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>Apply Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardPage({ user, categories, tasks, onGoHome, setDashPage }) {
  var total = tasks.length, done = tasks.filter(function(t) { return t.done; }).length;
  var overall = total ? Math.round((done / total) * 100) : 0;
  var overdue = tasks.filter(function(t) { return t.dueDate && t.dueDate < todayStr() && !t.done; }).length;
  var upcoming = tasks.filter(function(t) { return t.dueDate && t.dueDate >= todayStr() && !t.done; }).length;
  var high = tasks.filter(function(t) { return t.priority === "high" && !t.done; }).length;
  var stats = [
    { label: "Total Categories",   value: categories.length, icon: "🗂️", color: "#667eea", nav: "categories", hint: "Click to manage" },
    { label: "Tasks Completed",    value: done + "/" + total, icon: "✅", color: "#4ecdc4", nav: "tasks",      hint: "Click to view" },
    { label: "Overall Progress",   value: overall + "%",      icon: "📊", color: "#f093fb", nav: "tasks",      hint: "Click to view" },
    { label: "Overdue Tasks",      value: overdue,            icon: "⚠️", color: "#f5576c", nav: "deadlines",  hint: "Click to view" },
    { label: "Upcoming Deadlines", value: upcoming,           icon: "📅", color: "#fda085", nav: "deadlines",  hint: "Click to view" },
    { label: "High Priority",      value: high,               icon: "🔥", color: "#764ba2", nav: "tasks",      hint: "Click to view" },
  ];
  var priorityTasks = tasks.filter(function(t) { return !t.done && t.priority === "high"; }).slice(0, 4);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>Welcome back, <span style={{ color: "#667eea" }}>{user.name}</span> 👋</h2>
          <p style={{ color: "gray", margin: 0, fontSize: 15 }}>Here's your work overview — {todayStr()}</p>
        </div>
        <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "rgba(255,255,255,0.8)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🏠 Home Page</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map(function(s) {
          return (
            <div key={s.label} onClick={function() { setDashPage(s.nav); }}
              style={{ background: "white", borderRadius: 16, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderTop: "4px solid " + s.color, cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={function(e) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
              onMouseLeave={function(e) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: "0 0 4px" }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "gray", margin: "0 0 4px" }}>{s.label}</p>
              <p style={{ fontSize: 10, color: s.color, margin: 0, fontWeight: 600, opacity: 0.7 }}>{s.hint} →</p>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Category Progress</h3>
          {categories.length === 0 ? (
            <div style={{ background: "white", borderRadius: 14, padding: "32px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <p style={{ fontSize: 36, marginBottom: 10 }}>🗂️</p>
              <p style={{ color: "#bbb", fontSize: 14, margin: "0 0 12px" }}>No categories yet</p>
              <button onClick={function() { setDashPage("categories"); }} style={{ padding: "8px 20px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add Category</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {categories.map(function(c) {
                var pct = getPct(tasks, c.id), cnt = tasks.filter(function(t) { return t.categoryId === c.id; }), ct = getCatType(c.type);
                return (
                  <div key={c.id} style={{ background: "white", borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{c.emoji}</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{c.name}</p>
                          <span style={{ background: c.color + "22", color: c.color, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{ct.icon} {ct.label}</span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: c.color, fontSize: 15 }}>{pct}%</span>
                    </div>
                    <ProgressBar pct={pct} color={c.color} />
                    <p style={{ fontSize: 11, color: "gray", margin: "6px 0 0" }}>{cnt.filter(function(t) { return t.done; }).length} of {cnt.length} done</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>🔥 High Priority Tasks</h3>
          {priorityTasks.length === 0 ? (
            <div style={{ background: "white", borderRadius: 14, padding: "32px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <p style={{ fontSize: 36, marginBottom: 10 }}>🎯</p>
              <p style={{ color: "#bbb", fontSize: 14, margin: "0 0 12px" }}>{tasks.length === 0 ? "No tasks yet!" : "No high priority tasks!"}</p>
              <button onClick={function() { setDashPage("tasks"); }} style={{ padding: "8px 20px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add Task</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {priorityTasks.map(function(t) {
                var cat = categories.find(function(c) { return c.id === t.categoryId; });
                return (
                  <div key={t.id} style={{ background: "white", borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderLeft: "4px solid #f5576c" }}>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 5px", color: "#0f172a" }}>{t.title}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {cat && <span style={{ background: cat.color + "22", color: cat.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{cat.emoji} {cat.name}</span>}
                      {t.dueDate && <span style={{ background: "#fff5f5", color: "#f5576c", fontSize: 10, padding: "2px 8px", borderRadius: 99 }}>📅 {t.dueDate}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", borderRadius: 14, padding: "16px 18px", marginTop: 14 }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: "0 0 5px" }}>PRO TIP</p>
            <p style={{ color: "white", fontSize: 13, lineHeight: 1.6, margin: 0 }}>Focus on your top 3 tasks today. Everything else is secondary!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────
function CategoriesPage({ categories, setCategories, tasks, onGoHome }) {
  const [modal, setModal] = useState(false);
  const [name,  setName]  = useState("");
  const [type,  setType]  = useState("project");
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  function add() {
    if (!name.trim()) return;
    setCategories(function(prev) { return prev.concat([{ id: Date.now(), name: name.trim(), type: type, color: color, emoji: emoji }]); });
    setName(""); setModal(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>Categories</h2>
          <p style={{ color: "gray", margin: 0 }}>{categories.length} categories</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "rgba(255,255,255,0.8)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🏠 Home Page</button>
          <button onClick={function() { setModal(true); }} style={{ padding: "10px 22px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Add Category</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {CATEGORY_TYPES.map(function(ct) {
          var count = categories.filter(function(c) { return c.type === ct.value; }).length;
          return <div key={ct.value} style={{ background: "white", borderRadius: 99, padding: "6px 16px", fontSize: 13, fontWeight: 600, color: "#667eea", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1.5px solid #667eea22" }}>{ct.icon} {ct.label}s <span style={{ background: "#667eea22", borderRadius: 99, padding: "1px 7px", fontSize: 11 }}>{count}</span></div>;
        })}
      </div>
      {categories.length === 0 ? (
        <div style={{ background: "white", borderRadius: 20, padding: "60px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🗂️</p>
          <h3 style={{ color: "#0f172a", fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No categories yet</h3>
          <p style={{ color: "gray", fontSize: 14, margin: "0 0 20px" }}>Create your first category to start organizing work</p>
          <button onClick={function() { setModal(true); }} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>+ Add First Category</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
          {categories.map(function(c) {
            var pct = getPct(tasks, c.id), cnt = tasks.filter(function(t) { return t.categoryId === c.id; }).length, ct = getCatType(c.type);
            return (
              <div key={c.id} style={{ background: "white", borderRadius: 16, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderTop: "4px solid " + c.color, position: "relative" }}>
                <button onClick={function() { setCategories(function(p) { return p.filter(function(x) { return x.id !== c.id; }); }); }} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#ccc", fontSize: 16, cursor: "pointer" }}>✕</button>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>{c.emoji}</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, margin: "0 0 4px", color: "#0f172a" }}>{c.name}</h3>
                <span style={{ background: c.color + "22", color: c.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{ct.icon} {ct.label}</span>
                <p style={{ fontSize: 12, color: "gray", margin: "8px 0 10px" }}>{cnt} {ct.taskLabel}</p>
                <ProgressBar pct={pct} color={c.color} />
                <p style={{ fontSize: 12, color: c.color, fontWeight: 700, margin: "6px 0 0" }}>{pct}% complete</p>
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <div onClick={function() { setModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontWeight: 900, fontSize: 20, marginBottom: 20, color: "#0f172a" }}>New Category</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input placeholder="Category name" value={name} onChange={function(e) { setName(e.target.value); }} autoFocus style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }} />
              <div>
                <p style={{ fontSize: 12, color: "gray", marginBottom: 8 }}>Type</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {CATEGORY_TYPES.map(function(ct) {
                    return <button key={ct.value} onClick={function() { setType(ct.value); }} style={{ padding: 10, borderRadius: 10, border: "2px solid " + (type === ct.value ? "#667eea" : "#eee"), background: type === ct.value ? "#667eea11" : "white", cursor: "pointer", fontWeight: 600, fontSize: 13, color: type === ct.value ? "#667eea" : "#666" }}>{ct.icon} {ct.label}</button>;
                  })}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "gray", marginBottom: 8 }}>Color</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {COLORS.map(function(c) { return <div key={c} onClick={function() { setColor(c); }} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "3px solid #0f172a" : "3px solid transparent" }} />; })}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "gray", marginBottom: 8 }}>Emoji</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {EMOJIS.map(function(em) { return <div key={em} onClick={function() { setEmoji(em); }} style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, cursor: "pointer", background: emoji === em ? "#667eea22" : "#f5f5f5", border: "2px solid " + (emoji === em ? "#667eea" : "transparent") }}>{em}</div>; })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={function() { setModal(false); }} style={{ flex: 1, padding: 11, background: "#f5f5f5", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "gray" }}>Cancel</button>
                <button onClick={add} style={{ flex: 1, padding: 11, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "white" }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TASKS ─────────────────────────────────────────────────────────────────────
function TasksPage({ categories, tasks, setTasks, onGoHome }) {
  const [modal,    setModal]    = useState(false);
  const [filter,   setFilter]   = useState("all");
  const [priority, setPriority] = useState("all");
  const [search,   setSearch]   = useState("");
  const [selCat,   setSelCat]   = useState("all");
  const [title,    setTitle]    = useState("");
  const [catId,    setCatId]    = useState(categories[0] ? categories[0].id : "");
  const [dueDate,  setDueDate]  = useState("");
  const [prio,     setPrio]     = useState("medium");
  var prioColors = { high: "#f5576c", medium: "#fda085", low: "#4ecdc4" };

  var filtered = tasks.filter(function(t) {
    return (selCat === "all" || t.categoryId === Number(selCat)) &&
      (filter === "all" || (filter === "done" ? t.done : !t.done)) &&
      (priority === "all" || t.priority === priority) &&
      t.title.toLowerCase().includes(search.toLowerCase());
  });

  function addTask() {
    if (!title.trim() || !catId) return;
    setTasks(function(prev) { return prev.concat([{ id: Date.now(), categoryId: Number(catId), title: title.trim(), done: false, dueDate: dueDate, priority: prio }]); });
    setTitle(""); setDueDate(""); setModal(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>Tasks</h2>
          <p style={{ color: "gray", margin: 0 }}>{filtered.length} tasks shown</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "rgba(255,255,255,0.8)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🏠 Home Page</button>
          <button onClick={function() { setModal(true); }} style={{ padding: "10px 22px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Add Task</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input placeholder="Search tasks..." value={search} onChange={function(e) { setSearch(e.target.value); }} style={{ flex: 1, minWidth: 140, padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }} />
        <select value={selCat} onChange={function(e) { setSelCat(e.target.value); }} style={{ padding: "10px 12px", borderRadius: 10, border: "2px solid #eee", fontSize: 13, outline: "none", background: "white" }}>
          <option value="all">All Categories</option>
          {categories.map(function(c) { return <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>; })}
        </select>
        <select value={priority} onChange={function(e) { setPriority(e.target.value); }} style={{ padding: "10px 12px", borderRadius: 10, border: "2px solid #eee", fontSize: 13, outline: "none", background: "white" }}>
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div style={{ display: "flex", background: "white", border: "2px solid #eee", borderRadius: 10, overflow: "hidden" }}>
          {["all","done","pending"].map(function(f) {
            return <button key={f} onClick={function() { setFilter(f); }} style={{ padding: "10px 12px", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === f ? "linear-gradient(135deg,#667eea,#764ba2)" : "white", color: filter === f ? "white" : "gray" }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>;
          })}
        </div>
      </div>
      {tasks.length === 0 ? (
        <div style={{ background: "white", borderRadius: 20, padding: "60px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>✅</p>
          <h3 style={{ color: "#0f172a", fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No tasks yet</h3>
          <p style={{ color: "gray", fontSize: 14, margin: "0 0 20px" }}>{categories.length === 0 ? "Create a category first, then add tasks!" : "Click '+ Add Task' to create your first task"}</p>
          <button onClick={function() { if (categories.length > 0) setModal(true); }} style={{ padding: "12px 28px", background: categories.length > 0 ? "linear-gradient(135deg,#667eea,#764ba2)" : "#ccc", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: categories.length > 0 ? "pointer" : "default" }}>+ Add First Task</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(function(t) {
            var cat = categories.find(function(c) { return c.id === t.categoryId; });
            var pc = prioColors[t.priority] || "#ccc";
            var isOverdue = t.dueDate && t.dueDate < todayStr() && !t.done;
            return (
              <div key={t.id} style={{ background: "white", borderRadius: 14, padding: "14px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12, opacity: t.done ? 0.7 : 1, borderLeft: "4px solid " + pc }}>
                <button onClick={function() { setTasks(function(p) { return p.map(function(x) { return x.id === t.id ? Object.assign({}, x, { done: !x.done }) : x; }); }); }} style={{ width: 22, height: 22, borderRadius: 6, border: "2px solid " + (cat ? cat.color : "#667eea"), background: t.done ? (cat ? cat.color : "#667eea") : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", fontSize: 13, fontWeight: 700, flex: "none" }}>{t.done ? "✓" : ""}</button>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", textDecoration: t.done ? "line-through" : "none", color: t.done ? "gray" : "#0f172a" }}>{t.title}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {cat && <span style={{ background: cat.color + "22", color: cat.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{cat.emoji} {cat.name}</span>}
                    <span style={{ background: pc + "22", color: pc, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{t.priority === "high" ? "🔥" : t.priority === "medium" ? "🟡" : "🟢"} {t.priority}</span>
                    {t.dueDate && <span style={{ background: isOverdue ? "#fff5f5" : "#f5f5f5", color: isOverdue ? "#f5576c" : "gray", fontSize: 11, padding: "2px 8px", borderRadius: 99 }}>{isOverdue ? "Overdue" : "📅"} {t.dueDate}</span>}
                  </div>
                </div>
                <button onClick={function() { setTasks(function(p) { return p.filter(function(x) { return x.id !== t.id; }); }); }} style={{ background: "none", border: "none", color: "#ccc", fontSize: 16, cursor: "pointer" }}>✕</button>
              </div>
            );
          })}
          {!filtered.length && <p style={{ color: "gray", textAlign: "center", padding: "40px 0" }}>No tasks match your filters.</p>}
        </div>
      )}
      {modal && (
        <div onClick={function() { setModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontWeight: 900, fontSize: 20, marginBottom: 20, color: "#0f172a" }}>New Task</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input placeholder="Task title" value={title} onChange={function(e) { setTitle(e.target.value); }} autoFocus style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }} />
              <select value={catId} onChange={function(e) { setCatId(e.target.value); }} style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none" }}>
                {categories.map(function(c) { return <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>; })}
              </select>
              <div>
                <p style={{ fontSize: 12, color: "gray", marginBottom: 8 }}>Priority</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["high","🔥 High","#f5576c"],["medium","🟡 Medium","#fda085"],["low","🟢 Low","#4ecdc4"]].map(function(item) {
                    return <button key={item[0]} onClick={function() { setPrio(item[0]); }} style={{ flex: 1, padding: 9, borderRadius: 10, border: "2px solid " + (prio === item[0] ? item[2] : "#eee"), background: prio === item[0] ? item[2] + "22" : "white", cursor: "pointer", fontWeight: 600, fontSize: 12, color: prio === item[0] ? item[2] : "gray" }}>{item[1]}</button>;
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "gray", marginBottom: 6, display: "block" }}>Due Date (optional)</label>
                <input type="date" value={dueDate} onChange={function(e) { setDueDate(e.target.value); }} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={function() { setModal(false); }} style={{ flex: 1, padding: 11, background: "#f5f5f5", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "gray" }}>Cancel</button>
                <button onClick={addTask} style={{ flex: 1, padding: 11, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "white" }}>Add Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DEADLINES ─────────────────────────────────────────────────────────────────
function DeadlinesPage({ categories, tasks, onGoHome }) {
  var today = todayStr();
  var withDate  = tasks.filter(function(t) { return t.dueDate; }).sort(function(a,b) { return a.dueDate.localeCompare(b.dueDate); });
  var overdue   = withDate.filter(function(t) { return t.dueDate < today && !t.done; });
  var todayArr  = withDate.filter(function(t) { return t.dueDate === today && !t.done; });
  var upcoming  = withDate.filter(function(t) { return t.dueDate > today && !t.done; });
  var completed = withDate.filter(function(t) { return t.done; });
  var prioColors = { high: "#f5576c", medium: "#fda085", low: "#4ecdc4" };

  function TaskItem({ t, dotColor }) {
    var cat = categories.find(function(c) { return c.id === t.categoryId; });
    return (
      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flex: "none" }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 4px", color: "#0f172a", textDecoration: t.done ? "line-through" : "none" }}>{t.title}</p>
          <div style={{ display: "flex", gap: 6 }}>
            {cat && <span style={{ background: cat.color + "22", color: cat.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{cat.emoji} {cat.name}</span>}
            <span style={{ background: (prioColors[t.priority] || "#ccc") + "22", color: prioColors[t.priority], fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{t.priority === "high" ? "🔥" : t.priority === "medium" ? "🟡" : "🟢"} {t.priority}</span>
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: dotColor }}>{t.dueDate}</span>
      </div>
    );
  }

  function Section({ title, items, color }) {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 26 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
          {title}<span style={{ background: color + "22", color: color, fontSize: 12, padding: "2px 10px", borderRadius: 99, marginLeft: 8 }}>{items.length}</span>
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(function(t) { return <TaskItem key={t.id} t={t} dotColor={color} />; })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>Deadlines</h2>
          <p style={{ color: "gray", margin: 0 }}>Today is {today} · {withDate.length} tasks with due dates</p>
        </div>
        <button onClick={onGoHome} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "rgba(255,255,255,0.8)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🏠 Home Page</button>
      </div>
      {withDate.length === 0 ? (
        <div style={{ background: "white", borderRadius: 20, padding: "60px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>📅</p>
          <h3 style={{ color: "#0f172a", fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No deadlines yet</h3>
          <p style={{ color: "gray", fontSize: 14, margin: 0 }}>Add due dates to your tasks to see them here</p>
        </div>
      ) : (
        <div>
          <Section title="Overdue"   items={overdue}   color="#f5576c" />
          <Section title="Due Today" items={todayArr}  color="#fda085" />
          <Section title="Upcoming"  items={upcoming}  color="#667eea" />
          <Section title="Completed" items={completed} color="#4ecdc4" />
        </div>
      )}
    </div>
  );
}

// ── FEATURES PAGE ─────────────────────────────────────────────────────────────
function FeaturesPage() {
  const [selectedIdx, setSelectedIdx] = useState(null);
  var features = [
    { icon: "🗂️", title: "Flexible Categories", desc: "Organize by Projects, Skills, Goals or Departments.", detail: "Create unlimited categories with custom colors and emojis. Each tracks its own progress bar and completion rate.", steps: ["Click 'Categories' in sidebar","Click '+ Add Category'","Choose type, color & emoji","Start adding tasks to it!"], color: "#667eea" },
    { icon: "✅", title: "Task Management", desc: "Add tasks, set priorities and track completion.", detail: "Every task has a priority level, due date, and category. Search and filter by category, priority or status.", steps: ["Go to 'Tasks' in sidebar","Click '+ Add Task'","Set priority and due date","Check off tasks as you complete them!"], color: "#4ecdc4" },
    { icon: "📊", title: "Progress Dashboard", desc: "Visual progress bars and stats at a glance.", detail: "Dashboard shows 6 live stat cards. All cards are clickable and navigate to the relevant section.", steps: ["Log in to see your Dashboard","View stat cards at the top","Click any card to navigate","See per-category progress bars"], color: "#f093fb" },
    { icon: "⏰", title: "Smart Alarms", desc: "Deadline alarms with snooze, remind later and 5 ringtones.", detail: "Set alarms on any To-Do item. Choose from 5 ringtones. When alarm fires — snooze, remind later, or dismiss.", steps: ["Open 'To-Do List'","Click '+ Add with Options'","Set deadline date & time","Choose 'Alarm with Sound' & pick ringtone"], color: "#f5576c" },
    { icon: "⏱️", title: "Focus Mode", desc: "Fullscreen Pomodoro timer with adjustable duration.", detail: "Four timer modes including Custom. Set any work/break duration using presets or custom input.", steps: ["Click 'Focus Mode' in sidebar","Choose your timer mode","Click 'Set Timer' to customize","Click Start Focus!"], color: "#fda085" },
    { icon: "📝", title: "Smart To-Do List", desc: "Quick tasks with deadlines, alarms and notifications.", detail: "Quick-add with Enter key, or use '+ Add with Options' for full control: deadline, priority, alarm type, ringtone.", steps: ["Click 'To-Do List' in sidebar","Type a task and press Enter for quick add","Or click '+ Add with Options' for alarm setup","Mark done when complete!"], color: "#43e97b" },
  ];
  var selected = selectedIdx !== null ? features[selectedIdx] : null;
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", padding: "80px 48px 60px", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "white", fontSize: 42, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>Features</h1>
      <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", fontSize: 18, marginBottom: 48 }}>Built for professionals · <span style={{ color: "#a5b4fc" }}>Click any card to learn more</span></p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24, maxWidth: 980, margin: "0 auto" }}>
        {features.map(function(f, idx) {
          return (
            <div key={f.title} onClick={function() { setSelectedIdx(idx); }}
              style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 28, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all .25s", position: "relative", overflow: "hidden" }}
              onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.11)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = f.color + "66"; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg," + f.color + "," + f.color + "88)", borderRadius: "20px 20px 0 0" }} />
              <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ color: "white", fontSize: 18, marginBottom: 8, fontWeight: 800 }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>{f.desc}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: f.color, fontSize: 13, fontWeight: 700 }}><span>Learn more</span><span>→</span></div>
            </div>
          );
        })}
      </div>
      {selected && (
        <div onClick={function() { setSelectedIdx(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: "#0f172a", borderRadius: 24, padding: 36, width: "100%", maxWidth: 520, border: "2px solid " + selected.color + "33" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: selected.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{selected.icon}</div>
                <div>
                  <h2 style={{ color: "white", fontSize: 22, fontWeight: 900, margin: 0 }}>{selected.title}</h2>
                  <div style={{ height: 3, background: "linear-gradient(90deg," + selected.color + ",transparent)", borderRadius: 99, marginTop: 4 }} />
                </div>
              </div>
              <button onClick={function() { setSelectedIdx(null); }} style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
              {features.map(function(_, i) { return <div key={i} onClick={function() { setSelectedIdx(i); }} style={{ width: i === selectedIdx ? 20 : 8, height: 8, borderRadius: 99, background: i === selectedIdx ? selected.color : "rgba(255,255,255,0.2)", cursor: "pointer", transition: "all .3s" }} />; })}
            </div>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 1.75, marginBottom: 24 }}>{selected.detail}</p>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "18px 20px", marginBottom: 24 }}>
              <p style={{ color: selected.color, fontSize: 12, fontWeight: 800, letterSpacing: 1, margin: "0 0 12px" }}>HOW TO USE</p>
              {selected.steps.map(function(step, i) {
                return (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < selected.steps.length - 1 ? 10 : 0 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: selected.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "white", flex: "none" }}>{i + 1}</div>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>{step}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function() { setSelectedIdx(function(idx) { return (idx - 1 + features.length) % features.length; }); }} style={{ flex: 1, padding: 11, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Previous</button>
              <button onClick={function() { setSelectedIdx(null); }} style={{ flex: 1, padding: 11, background: "linear-gradient(135deg," + selected.color + "," + selected.color + "bb)", border: "none", borderRadius: 12, color: "white", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>Got it</button>
              <button onClick={function() { setSelectedIdx(function(idx) { return (idx + 1) % features.length; }); }} style={{ flex: 1, padding: 11, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ABOUT PAGE ────────────────────────────────────────────────────────────────
function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", padding: "80px 48px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>💼</div>
        <h1 style={{ color: "white", fontSize: 42, fontWeight: 800, marginBottom: 16 }}>About ProTrack</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 18, lineHeight: 1.8, marginBottom: 40 }}>ProTrack helps working professionals stay on top of projects, skills, goals and deadlines — all in one clean dashboard.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {[["🎯","Our Mission","Help professionals achieve more with less stress"],["💡","Our Vision","A world where every professional works at their best"],["❤️","Our Values","Clarity, focus and consistent execution"]].map(function(item) {
            return (
              <div key={item[1]} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{item[0]}</div>
                <h3 style={{ color: "white", fontSize: 15, marginBottom: 8 }}>{item[1]}</h3>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{item[2]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page,       setPage]       = useState("home");
  const [dashPage,   setDashPage]   = useState("dashboard");
  const [mode,       setMode]       = useState("login");
  const [showForm,   setShowForm]   = useState(false);
  const [name,       setName]       = useState("");
  const [phone,      setPhone]      = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [errors,     setErrors]     = useState([]);
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [user,       setUser]       = useState(null);
  const [categories, setCategories] = useState(INIT_CATEGORIES);
  const [tasks,      setTasks]      = useState(INIT_TASKS);
  const [tipIndex,   setTipIndex]   = useState(function() { return Math.floor(Math.random() * TIPS.length); });
  const [imgIndex,   setImgIndex]   = useState(0);
  const [redirectTo, setRedirectTo] = useState(null);

  useEffect(function() { var t = setInterval(function() { setTipIndex(function(p) { return (p + 1) % TIPS.length; }); }, 8000); return function() { clearInterval(t); }; }, []);
  useEffect(function() { var t = setInterval(function() { setImgIndex(function(p) { return (p + 1) % IMAGES.length; }); }, 4000); return function() { clearInterval(t); }; }, []);

  function goHome() { setLoggedIn(false); setPage("home"); setDashPage("dashboard"); }

  function handleSubmit() {
    var newErrors = [];
    if (mode === "signup") {
      if (!name.trim()) newErrors.push("Please enter your full name");
      if (!/^\d{10}$/.test(phone)) newErrors.push("Mobile number must be exactly 10 digits");
      if (!email.includes("@") || !email.includes(".")) newErrors.push("Enter a valid email address");
      var existingUsers = getUsers();
      if (existingUsers.find(function(u) { return u.phone === phone; })) newErrors.push("Mobile number already registered");
      if (existingUsers.find(function(u) { return u.email === email; })) newErrors.push("Email already registered");
      validatePassword(password).forEach(function(e) { newErrors.push(e); });
      if (newErrors.length > 0) { setErrors(newErrors); return; }
      saveUsers(existingUsers.concat([{ name: name, phone: phone, email: email, password: password }]));
      setUser({ name: name, email: email, phone: phone });
      setLoggedIn(true); setShowForm(false);
      if (redirectTo) { setDashPage(redirectTo); setRedirectTo(null); }
    } else {
      if (!email.trim()) { setErrors(["Please enter your email or mobile number"]); return; }
      if (!password.trim()) { setErrors(["Please enter your password"]); return; }
      var found = getUsers().find(function(u) { return u.email === email || u.phone === email; });
      if (!found) { setErrors(["No account found. Please Sign Up first!"]); return; }
      if (found.password !== password) {
        var pe = ["Incorrect password! Reminders:"];
        if (!/^[A-Z]/.test(password)) pe.push("Must START with a Capital letter");
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) pe.push("Must contain a Special character");
        if (password.length < 8 || password.length > 10) pe.push("Must be 8–10 characters");
        if (pe.length === 1) pe.push("Password does not match.");
        setErrors(pe); return;
      }
      setUser(found); setLoggedIn(true); setShowForm(false);
      if (redirectTo) { setDashPage(redirectTo); setRedirectTo(null); }
    }
  }

  function switchMode(m) { setMode(m); setErrors([]); setName(""); setPhone(""); setEmail(""); setPassword(""); }

  if (loggedIn) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "sans-serif" }}>
        {dashPage !== "focus" && (
          <Sidebar page={dashPage} setPage={setDashPage} user={user} onGoHome={goHome}
            onLogout={function() { setLoggedIn(false); setUser(null); setPage("home"); setDashPage("dashboard"); }} />
        )}
        <main style={{ marginLeft: dashPage === "focus" ? 0 : 220, flex: 1, padding: dashPage === "focus" ? 0 : "36px 40px" }}>
          {dashPage === "dashboard"  && <DashboardPage  user={user} categories={categories} tasks={tasks} onGoHome={goHome} setDashPage={setDashPage} />}
          {dashPage === "categories" && <CategoriesPage categories={categories} setCategories={setCategories} tasks={tasks} onGoHome={goHome} />}
          {dashPage === "tasks"      && <TasksPage      categories={categories} tasks={tasks} setTasks={setTasks} onGoHome={goHome} />}
          {dashPage === "deadlines"  && <DeadlinesPage  categories={categories} tasks={tasks} onGoHome={goHome} />}
          {dashPage === "focus"      && <FocusPage      tasks={tasks} categories={categories} setPage={setDashPage} onGoHome={goHome} />}
          {dashPage === "todo"       && <TodoPage       onGoHome={goHome} />}
          {dashPage === "profile"    && <ProfilePage    user={user} onGoHome={goHome} />}
        </main>
      </div>
    );
  }

  var currentTip = TIPS[tipIndex], currentImg = IMAGES[imgIndex];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 48px", position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: page === "home" ? "rgba(15,23,42,0.7)" : "white", backdropFilter: "blur(14px)", borderBottom: page === "home" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eee" }}>
        <div onClick={function() { setPage("home"); }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💼</div>
          <span style={{ fontSize: 20, fontWeight: 900, color: page === "home" ? "white" : "#0f172a" }}>ProTrack</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["Features","About"].map(function(item) {
            return <button key={item} onClick={function() { setPage(item.toLowerCase()); }} style={{ padding: "8px 18px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, background: page === item.toLowerCase() ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent", color: page === item.toLowerCase() ? "white" : (page === "home" ? "rgba(255,255,255,0.8)" : "#444") }}>{item}</button>;
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={function() { switchMode("login"); setShowForm(true); }} style={{ padding: "9px 22px", background: "transparent", cursor: "pointer", color: page === "home" ? "white" : "#667eea", border: "2px solid " + (page === "home" ? "rgba(255,255,255,0.4)" : "#667eea"), borderRadius: 10, fontSize: 14, fontWeight: 700 }}>Log In</button>
          <button onClick={function() { switchMode("signup"); setShowForm(true); }} style={{ padding: "9px 22px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Sign Up</button>
        </div>
      </nav>

      {page === "features" && <div style={{ paddingTop: 74 }}><FeaturesPage /></div>}
      {page === "about"    && <div style={{ paddingTop: 74 }}><AboutPage /></div>}

      {page === "home" && (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", paddingTop: 74, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "rgba(102,126,234,0.06)", top: -150, left: -150, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "50px 64px 0", position: "relative", zIndex: 2, gap: 40, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(102,126,234,0.2)", borderRadius: 99, padding: "8px 18px", marginBottom: 24, border: "1px solid rgba(102,126,234,0.3)" }}>
                <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>💼 For IT · Managers · Freelancers · All Professionals</span>
              </div>
              <h1 style={{ color: "white", fontSize: 58, fontWeight: 900, lineHeight: 1.05, margin: "0 0 24px", letterSpacing: "-2px" }}>Work Smarter,<br />Deliver Faster!</h1>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 17, lineHeight: 1.7, marginBottom: 32, maxWidth: 460 }}>Track projects, skills, goals and deadlines. Set smart alarms that ring, notify, snooze and remind — all in one dashboard.</p>
              <div style={{ background: "rgba(102,126,234,0.15)", borderRadius: 14, padding: "16px 20px", marginBottom: 32, borderLeft: "4px solid #667eea" }}>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, fontStyle: "italic", margin: "0 0 4px" }}>"The key is not to prioritize what's on your schedule, but to schedule your priorities."</p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>— Stephen Covey</p>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <button onClick={function() { switchMode("signup"); setShowForm(true); }} style={{ padding: "15px 34px", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Get Started →</button>
                <button onClick={function() { setPage("features"); }} style={{ padding: "15px 34px", background: "rgba(255,255,255,0.06)", color: "white", border: "2px solid rgba(255,255,255,0.15)", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>See Features</button>
              </div>
              <div style={{ display: "flex", gap: 28, marginTop: 44, flexWrap: "wrap" }}>
                {[["⏰","Smart Alarms","Ring, snooze & notify","todo"],["⏱️","Focus Mode","Pomodoro built-in","focus"],["📝","To-Do + Alarm","Never miss a task","todo"]].map(function(item) {
                  return (
                    <div key={item[1]} onClick={function() { setRedirectTo(item[3]); switchMode("login"); setShowForm(true); }}
                      style={{ cursor: "pointer", transition: "all .2s" }}
                      onMouseEnter={function(e) { e.currentTarget.style.transform = "translateY(-3px)"; }}
                      onMouseLeave={function(e) { e.currentTarget.style.transform = "translateY(0)"; }}>
                      <p style={{ color: "white", fontSize: 17, fontWeight: 800, margin: "0 0 2px" }}>{item[0]} {item[1]}</p>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0 }}>{item[2]}</p>
                      <div style={{ height: 2, background: "linear-gradient(90deg,#667eea,#764ba2)", borderRadius: 99, marginTop: 4, opacity: 0.6 }} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 360, flexShrink: 0 }}>
              <div style={{ borderRadius: 22, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.4)", position: "relative" }}>
                <img src={currentImg.url} alt="work" style={{ width: "100%", height: 210, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.7))", padding: "28px 18px 14px" }}>
                  <p style={{ color: "white", fontSize: 14, fontWeight: 700, margin: 0 }}>{currentImg.caption}</p>
                </div>
                <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 5 }}>
                  {IMAGES.map(function(_, i) { return <div key={i} onClick={function() { setImgIndex(i); }} style={{ width: i === imgIndex ? 18 : 7, height: 7, borderRadius: 99, background: i === imgIndex ? "white" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.3s" }} />; })}
                </div>
              </div>
              <div style={{ background: "rgba(102,126,234,0.12)", borderRadius: 20, padding: "20px 22px", border: "1px solid rgba(102,126,234,0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{currentTip.icon}</span>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: 0 }}>PRO TIP</p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={function() { setTipIndex(function(p) { return (p - 1 + TIPS.length) % TIPS.length; }); }} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>‹</button>
                    <button onClick={function() { setTipIndex(function(p) { return (p + 1) % TIPS.length; }); }} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>›</button>
                  </div>
                </div>
                <p style={{ color: "white", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{currentTip.tip}</p>
                <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                  {TIPS.map(function(_, i) { return <div key={i} onClick={function() { setTipIndex(i); }} style={{ height: 3, flex: 1, borderRadius: 99, background: i === tipIndex ? "#667eea" : "rgba(255,255,255,0.15)", transition: "background 0.4s", cursor: "pointer" }} />; })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div onClick={function() { setShowForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: "white", borderRadius: 24, padding: 36, width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#667eea,#764ba2)", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>💼</div>
              <h2 style={{ margin: "0 0 4px", fontSize: 22 }}>{mode === "login" ? "Welcome Back!" : "Create Account"}</h2>
              <p style={{ color: "gray", fontSize: 13, margin: 0 }}>ProTrack · Your productivity companion</p>
              {redirectTo && <p style={{ color: "#667eea", fontSize: 12, fontWeight: 700, marginTop: 6 }}>You will be taken to {redirectTo === "focus" ? "Focus Mode" : "To-Do List"} after login</p>}
            </div>
            <div style={{ display: "flex", background: "#f5f5f5", borderRadius: 12, padding: 4, marginBottom: 18 }}>
              {["login","signup"].map(function(m) {
                return <button key={m} onClick={function() { switchMode(m); }} style={{ flex: 1, padding: 9, border: "none", borderRadius: 10, cursor: "pointer", fontWeight: "bold", fontSize: 14, background: mode === m ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent", color: mode === m ? "white" : "gray" }}>{m === "login" ? "Log In" : "Sign Up"}</button>;
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mode === "signup" && (
                <div>
                  <input placeholder="Full Name" value={name} onChange={function(e) { setName(e.target.value); }} style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", marginBottom: 12 }} />
                  <input placeholder="10-digit Mobile Number" value={phone} onChange={function(e) { setPhone(e.target.value.replace(/\D/g, "")); }} maxLength={10} style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }} />
                </div>
              )}
              <input placeholder={mode === "login" ? "Email or Mobile Number" : "Email Address"} value={email} onChange={function(e) { setEmail(e.target.value); }} style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }} />
              <input placeholder="Password" type="password" value={password} onChange={function(e) { setPassword(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") handleSubmit(); }} style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }} />
              {mode === "signup" && <p style={{ fontSize: 11, color: "gray", margin: "-4px 0 0" }}>Password: 8–10 chars · Starts with capital · Has special character</p>}
              {errors.length > 0 && (
                <div style={{ background: "#fff5f5", border: "1.5px solid #ff4444", borderRadius: 10, padding: "12px 14px" }}>
                  {errors.map(function(err, i) { return <p key={i} style={{ color: "#cc0000", fontSize: 13, margin: i === 0 ? 0 : "6px 0 0", fontWeight: 500 }}>{err}</p>; })}
                </div>
              )}
              <button onClick={handleSubmit} style={{ padding: 13, border: "none", borderRadius: 12, fontSize: 15, fontWeight: "bold", cursor: "pointer", color: "white", background: "linear-gradient(135deg,#667eea,#764ba2)", marginTop: 4 }}>
                {mode === "login" ? "Log In" : "Create Account"}
              </button>
              <p style={{ textAlign: "center", fontSize: 13, color: "gray", margin: "4px 0 0" }}>
                {mode === "login" ? "No account? " : "Already have one? "}
                <span onClick={function() { switchMode(mode === "login" ? "signup" : "login"); }} style={{ color: "#667eea", fontWeight: "bold", cursor: "pointer" }}>
                  {mode === "login" ? "Sign Up" : "Log In"}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}