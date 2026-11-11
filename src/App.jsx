import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Home as HomeIcon, Newspaper, MessageCircle, User as UserIcon, Send, Plus, Search,
  ArrowLeft, Heart, MessageSquare, Trash2, X, LogOut, UserPlus, Users,
} from "lucide-react";
import { supabase, isConfigured } from "./supabaseClient";
import * as api from "./api";
import { AVATAR_COLORS, colorFor, cleanUser, dmKey, fmtTime, dayKey, fmtDay, rel, sortChats } from "./helpers";

/* Personal display preferences stay on this device */
const DEFAULT_SETTINGS = { theme: "system", textSize: "md", enterToSend: true };
const loadSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("nook:settings") || "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
};
const saveSettings = (s) => {
  try {
    localStorage.setItem("nook:settings", JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const DARK_VARS = `--ink:#e6efe9;--muted:#93a69d;--line:#24352f;--bg:#0c1512;--panel:#121f1a;--soft:#192a23;--pine:#071410;--me:#1d5a3f;--them:#1b2b25;--wall:#0e1a15;--wall-dot:#162821;--leaf-ink:#6fe0a8;--field:#0f1a16;`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=Figtree:wght@400;500;600&display=swap');
.nk{--ink:#16231f;--muted:#5d6f68;--line:#dfe6e1;--bg:#eef2ee;--panel:#fff;--soft:#f3f6f3;--pine:#0e3b30;--leaf:#22a06b;--leaf-ink:#0b5a3b;--me:#d9f2b4;--them:#fff;--wall:#e5ebe5;--wall-dot:#d3dcd4;--danger:#c9443a;--field:#fff;
  font-family:'Figtree',system-ui,sans-serif;color:var(--ink);background:var(--bg);height:100vh;height:100dvh;display:flex;overflow:hidden;font-size:15px;line-height:1.45}
.nk.dark{${DARK_VARS}}
@media (prefers-color-scheme:dark){.nk.system{${DARK_VARS}}}
.nk.ts-lg{font-size:17px}
.nk *{box-sizing:border-box}
.nk button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
.nk input,.nk textarea{font:inherit;color:var(--ink)}
.nk h1,.nk h2,.nk h3{font-family:'Bricolage Grotesque','Figtree',system-ui,sans-serif;margin:0;letter-spacing:-0.01em}
.nk button:focus-visible,.nk input:focus-visible,.nk textarea:focus-visible{outline:2px solid var(--leaf);outline-offset:2px}
.nk .muted{color:var(--muted)}
.nk .grow{flex:1;min-width:0}
.nk .trunc{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* rail */
.nk-rail{width:80px;flex-shrink:0;background:var(--pine);display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:6px}
.nk-logo{width:42px;height:42px;border-radius:14px 14px 14px 4px;background:var(--leaf);display:grid;place-items:center;color:#fff;margin-bottom:14px}
.nk-nav{position:relative;width:60px;padding:9px 0 7px;border-radius:14px;color:#a9c7bb;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11.5px;font-weight:500;transition:background .15s,color .15s}
.nk-nav:hover{background:rgba(255,255,255,.08);color:#fff}
.nk-nav.on{background:rgba(255,255,255,.14);color:#fff}
.nk-badge{position:absolute;top:3px;right:9px;min-width:18px;height:18px;border-radius:9px;background:var(--leaf);color:#fff;font-size:11px;font-weight:600;display:grid;place-items:center;padding:0 5px}
.nk-spacer{flex:1}
.nk-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.nk-page{flex:1;overflow-y:auto}
.nk-wrap{max-width:760px;margin:0 auto;padding:28px 20px 48px}

/* common */
.nk-av{border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:600;flex-shrink:0;user-select:none}
.nk-av[role=button]{cursor:pointer}
.nk-btn{background:var(--leaf);color:#fff!important;font-weight:600;padding:9px 18px;border-radius:999px;transition:filter .15s}
.nk-btn:hover{filter:brightness(1.07)}
.nk-btn:disabled{opacity:.45;cursor:not-allowed}
.nk-btn.ghost{background:transparent;color:var(--ink)!important;border:1px solid var(--line)}
.nk-btn.danger{background:var(--danger)}
.nk-btn.sm{padding:6px 14px;font-size:14px}
.nk-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:var(--muted);transition:background .15s}
.nk-icon:hover{background:var(--soft);color:var(--ink)}
.nk-icon.sm{width:28px;height:28px}
.nk-input{width:100%;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.nk-input:focus{border-color:var(--leaf)}
.nk-label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}
.nk-link{font-weight:600;text-align:left}
.nk-link:hover{text-decoration:underline}
.nk-err{color:var(--danger);font-size:14px;margin-top:10px}
.nk-empty{padding:36px 20px;text-align:center;color:var(--muted)}
.nk-empty strong{display:block;color:var(--ink);font-family:'Bricolage Grotesque',sans-serif;font-size:18px;margin-bottom:4px}
.nk-panel{background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.nk-panel-h{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line)}
.nk-panel-h h2{font-size:17px}
.nk-page-h{font-size:28px;margin-bottom:4px}

/* auth */
.nk-auth{flex:1;display:grid;place-items:center;padding:20px;overflow-y:auto}
.nk-auth-box{width:min(420px,100%);background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:28px}
.nk-auth h1{font-size:34px;margin:14px 0 4px}
.nk-tabs{display:flex;background:var(--soft);border-radius:999px;padding:4px;margin:20px 0 4px}
.nk-tabs button{flex:1;padding:8px;border-radius:999px;font-weight:600;color:var(--muted)}
.nk-tabs button.on{background:var(--panel);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.12)}

/* posts */
.nk-composer{display:flex;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}
.nk-composer textarea{width:100%;border:0;background:transparent;resize:none;min-height:56px;outline:none!important}
.nk-composer-foot{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.nk-post{display:flex;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}
.nk-post:last-child{border-bottom:0}
.nk-post-body{flex:1;min-width:0}
.nk-post-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nk-post-text{margin:4px 0 8px;white-space:pre-wrap;word-break:break-word}
.nk-post-actions{display:flex;gap:18px}
.nk-act{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:14px}
.nk-act:hover{color:var(--ink)}
.nk-act.on{color:#d1456b}
.nk-comments{margin-top:10px;padding:10px 12px;background:var(--soft);border-radius:14px}
.nk-comment{padding:5px 0;font-size:14px;word-break:break-word}
.nk-comment-form{display:flex;gap:8px;margin-top:8px}

/* home */
.nk-hello{font-size:34px;line-height:1.1}
.nk-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px}
.nk-row{display:flex;align-items:center;gap:12px;padding:11px 18px;width:100%;text-align:left;border-bottom:1px solid var(--line)}
.nk-row:last-child{border-bottom:0}
button.nk-row:hover{background:var(--soft)}

/* messages */
.nk-msgs{flex:1;display:flex;min-height:0}
.nk-list{width:350px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.nk-list-h{display:flex;align-items:center;gap:4px;padding:16px 14px 8px 18px}
.nk-list-h h2{font-size:24px;flex:1}
.nk-search{display:flex;align-items:center;gap:8px;margin:6px 14px 10px;padding:8px 12px;background:var(--soft);border-radius:12px;color:var(--muted)}
.nk-search input{border:0;background:transparent;outline:none!important;width:100%}
.nk-chats{flex:1;overflow-y:auto}
.nk-item{display:flex;align-items:center;gap:12px;padding:11px 16px;width:100%;text-align:left}
.nk-item:hover{background:var(--soft)}
.nk-item.on{background:var(--soft);box-shadow:inset 3px 0 0 var(--leaf)}
.nk-item .top{display:flex;justify-content:space-between;gap:8px}
.nk-item .top b{font-weight:600}
.nk-item .time{font-size:12px;color:var(--muted);flex-shrink:0}
.nk-item .bot{display:flex;justify-content:space-between;gap:8px;font-size:14px;color:var(--muted)}
.nk-unread{background:var(--leaf);color:#fff;font-size:12px;font-weight:600;min-width:20px;height:20px;border-radius:10px;display:grid;place-items:center;padding:0 6px}
.nk-chat{flex:1;min-width:0;display:flex;flex-direction:column;background-color:var(--wall);background-image:radial-gradient(var(--wall-dot) 1.3px,transparent 1.4px);background-size:22px 22px}
.nk-chat-h{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--panel);border-bottom:1px solid var(--line)}
.nk-chat-h .who{flex:1;min-width:0;text-align:left;cursor:pointer}
.nk-chat-h .who b{display:block;font-weight:600}
.nk-chat-h .who span{font-size:13px;color:var(--muted)}
.nk-back{display:none}
.nk-scroll{flex:1;overflow-y:auto;padding:16px 5% 10px;display:flex;flex-direction:column;gap:3px}
.nk-day{align-self:center;background:var(--panel);color:var(--muted);font-size:12.5px;padding:3px 12px;border-radius:999px;margin:10px 0;box-shadow:0 1px 1px rgba(0,0,0,.06)}
.nk-b{max-width:min(74%,520px);padding:6px 10px 5px;border-radius:12px;background:var(--them);box-shadow:0 1px 1px rgba(0,0,0,.08);align-self:flex-start;border-top-left-radius:4px;word-break:break-word;white-space:pre-wrap}
.nk-b.me{align-self:flex-end;background:var(--me);border-top-left-radius:12px;border-top-right-radius:4px}
.nk-b .nm{font-size:13px;font-weight:600;display:block;cursor:pointer}
.nk-b .tm{float:right;margin:7px 0 0 12px;font-size:11px;color:var(--muted)}
.nk-compose{display:flex;align-items:flex-end;gap:10px;padding:10px 14px;background:var(--panel);border-top:1px solid var(--line)}
.nk-compose textarea{flex:1;resize:none;max-height:120px;border:1px solid var(--line);background:var(--field);border-radius:20px;padding:10px 14px;outline:none!important}
.nk-compose textarea:focus{border-color:var(--leaf)}
.nk-send{width:42px;height:42px;border-radius:50%;background:var(--leaf);color:#fff;display:grid;place-items:center;flex-shrink:0}
.nk-send:disabled{opacity:.4;cursor:not-allowed}
.nk-none{flex:1;display:grid;place-items:center;text-align:center;padding:30px}

/* account */
.nk-hero{display:flex;gap:18px;align-items:center;padding:22px 20px}
.nk-stats{display:flex;border-top:1px solid var(--line)}
.nk-stats div{flex:1;padding:12px;text-align:center;border-right:1px solid var(--line)}
.nk-stats div:last-child{border-right:0}
.nk-stats b{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:22px}
.nk-sec{margin-top:18px}
.nk-sec-b{padding:6px 18px 18px}
.nk-set{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--line)}
.nk-set:last-child{border-bottom:0}
.nk-sw{width:46px;height:26px;border-radius:13px;background:var(--line);position:relative;transition:background .15s;flex-shrink:0}
.nk-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s}
.nk-sw.on{background:var(--leaf)}
.nk-sw.on::after{transform:translateX(20px)}
.nk-seg{display:flex;background:var(--soft);border-radius:999px;padding:3px}
.nk-seg button{padding:5px 12px;border-radius:999px;font-size:14px;color:var(--muted)}
.nk-seg button.on{background:var(--panel);color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.nk-swatches{display:flex;gap:8px;flex-wrap:wrap}
.nk-swatch{width:30px;height:30px;border-radius:50%;border:3px solid transparent}
.nk-swatch.on{border-color:var(--ink)}
.nk-dl{display:grid;grid-template-columns:120px 1fr;gap:8px 12px;margin:0;padding:14px 0 4px}
.nk-dl dt{color:var(--muted)}
.nk-dl dd{margin:0}

/* modal + toast */
.nk-overlay{position:fixed;inset:0;background:rgba(8,22,17,.55);display:grid;place-items:center;z-index:50;padding:16px}
.nk-modal{width:min(440px,100%);max-height:84vh;background:var(--panel);border-radius:20px;display:flex;flex-direction:column;overflow:hidden;color:var(--ink)}
.nk-modal-h{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px 20px}
.nk-modal-h h2{font-size:20px}
.nk-modal-b{padding:0 20px 20px;overflow-y:auto}
.nk-pick{display:flex;align-items:center;gap:12px;padding:9px 6px;width:100%;text-align:left;border-radius:12px}
.nk-pick:hover{background:var(--soft)}
.nk-check{width:22px;height:22px;border-radius:7px;border:2px solid var(--line);display:grid;place-items:center;color:#fff;flex-shrink:0}
.nk-check.on{background:var(--leaf);border-color:var(--leaf)}
.nk-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 18px;border-radius:999px;font-size:14px;z-index:60}

@media (max-width:820px){
  .nk{flex-direction:column-reverse}
  .nk-rail{width:100%;flex-direction:row;justify-content:space-around;padding:4px 6px;gap:0}
  .nk-logo,.nk-spacer{display:none}
  .nk-nav{flex:1;max-width:96px;padding:6px 0 5px}
  .nk-badge{right:calc(50% - 22px)}
  .nk-grid{grid-template-columns:1fr}
  .nk-hello{font-size:28px}
  .nk-list{width:100%;border-right:0}
  .nk-msgs.has-active .nk-list{display:none}
  .nk-msgs.no-active .nk-chat{display:none}
  .nk-back{display:grid}
  .nk-scroll{padding:12px 12px 8px}
  .nk-b{max-width:85%}
  .nk-toast{bottom:80px}
}
@media (prefers-reduced-motion:reduce){.nk *{transition:none!important;animation:none!important}}
`;

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function Avatar({ user, name, size = 40, color, group, onClick }) {
  const n = user?.name || name || "?";
  const c = color || user?.color || colorFor(user?.username || n);
  const init = n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="nk-av"
      style={{ width: size, height: size, background: c, fontSize: size * 0.38 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? "View profile of " + n : undefined}
    >
      {group ? <Users size={size * 0.48} /> : init}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="nk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nk-modal" role="dialog" aria-label={title}>
        <div className="nk-modal-h">
          <h2>{title}</h2>
          <button className="nk-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="nk-modal-b">{children}</div>
      </div>
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return <button className={"nk-sw" + (on ? " on" : "")} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */
function Auth() {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    setNotice("");
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return setErr("Enter a valid email address.");
    if (pw.length < 6) return setErr("Password needs at least 6 characters.");
    setBusy(true);
    if (mode === "signup") {
      const u = cleanUser(username);
      if (u.length < 3) {
        setBusy(false);
        return setErr("Username needs at least 3 letters or numbers.");
      }
      const r = await api.signUp({ email: em, password: pw, username: u, name: name.trim() || u });
      if (r.error) setErr(r.error);
      else if (r.notice) setNotice(r.notice);
    } else {
      const r = await api.signIn({ email: em, password: pw });
      if (r.error) setErr(r.error);
    }
    setBusy(false);
  }

  return (
    <div className="nk-auth">
      <div className="nk-auth-box">
        <div className="nk-logo" style={{ marginBottom: 0 }}><MessageCircle size={22} /></div>
        <h1>Nook</h1>
        <p className="muted" style={{ margin: 0 }}>Post to everyone, message one person, or chat with a group.</p>
        <div className="nk-tabs">
          <button className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(""); setNotice(""); }}>Create account</button>
          <button className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setErr(""); setNotice(""); }}>Sign in</button>
        </div>
        <label className="nk-label" htmlFor="em">Email</label>
        <input id="em" className="nk-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        {mode === "signup" && (
          <>
            <label className="nk-label" htmlFor="u">Username</label>
            <input id="u" className="nk-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. maya_r" autoComplete="username" />
            <label className="nk-label" htmlFor="n">Display name</label>
            <input id="n" className="nk-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Rivera" maxLength={30} />
          </>
        )}
        <label className="nk-label" htmlFor="p">Password</label>
        <input id="p" className="nk-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        {err && <div className="nk-err" role="alert">{err}</div>}
        {notice && <div className="muted" style={{ marginTop: 10, fontSize: 14 }} role="status">{notice}</div>}
        <button className="nk-btn" style={{ width: "100%", marginTop: 18 }} onClick={submit} disabled={busy}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

function SetupNotice({ css }) {
  return (
    <div className="nk system">
      <style>{css}</style>
      <div className="nk-auth">
        <div className="nk-auth-box">
          <h1>Almost there</h1>
          <p className="muted">Nook can't reach its database yet. Add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> as environment variables (a local <code>.env</code> file, or your hosting dashboard), then restart or redeploy. The README lists every step.</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Posts                                                              */
/* ------------------------------------------------------------------ */
function PostComposer({ me, onPost, placeholder = "What's on your mind?" }) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onPost(text.trim());
    setText("");
  };
  return (
    <div className="nk-composer">
      <Avatar user={me} size={42} />
      <div className="grow">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={500} aria-label="Write a post" />
        <div className="nk-composer-foot">
          <span className="muted" style={{ fontSize: 13 }}>{text.length}/500 · Everyone can see this</span>
          <button className="nk-btn sm" onClick={submit} disabled={!text.trim()}>Post</button>
        </div>
      </div>
    </div>
  );
}

function PostItem({ post, me, users, onLike, onComment, onDelete, onProfile }) {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState("");
  const u = users[post.author];
  const liked = post.likes.includes(me.username);
  const sendComment = () => {
    if (!c.trim()) return;
    onComment(post, c.trim());
    setC("");
  };
  return (
    <article className="nk-post">
      <Avatar user={u} name={post.author} size={42} onClick={() => onProfile(post.author)} />
      <div className="nk-post-body">
        <div className="nk-post-head">
          <button className="nk-link" onClick={() => onProfile(post.author)}>{u?.name || post.author}</button>
          <span className="muted">@{post.author}</span>
          <span className="muted">{rel(post.ts)}</span>
          <span className="grow" />
          {post.author === me.username && (
            <button className="nk-icon sm" aria-label="Delete post" onClick={() => onDelete(post)}><Trash2 size={16} /></button>
          )}
        </div>
        <p className="nk-post-text">{post.text}</p>
        <div className="nk-post-actions">
          <button className={"nk-act" + (liked ? " on" : "")} onClick={() => onLike(post)} aria-pressed={liked} aria-label="Like">
            <Heart size={17} fill={liked ? "currentColor" : "none"} />{post.likes.length || ""}
          </button>
          <button className="nk-act" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Comments">
            <MessageSquare size={17} />{post.comments.length || ""}
          </button>
        </div>
        {open && (
          <div className="nk-comments">
            {post.comments.length === 0 && <div className="muted" style={{ fontSize: 14 }}>No replies yet. Start the conversation.</div>}
            {post.comments.map((cm) => (
              <div className="nk-comment" key={cm.id}>
                <b>{users[cm.author]?.name || cm.author}</b> <span className="muted">{rel(cm.ts)}</span>
                <div>{cm.text}</div>
              </div>
            ))}
            <div className="nk-comment-form">
              <input className="nk-input" value={c} onChange={(e) => setC(e.target.value)} placeholder="Write a reply"
                maxLength={300} onKeyDown={(e) => e.key === "Enter" && sendComment()} aria-label="Write a reply" />
              <button className="nk-btn sm" onClick={sendComment} disabled={!c.trim()}>Reply</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function PostsPage({ me, users, posts, actions, onProfile }) {
  return (
    <div className="nk-page">
      <div className="nk-wrap">
        <h1 className="nk-page-h">Posts</h1>
        <p className="muted" style={{ margin: "0 0 18px" }}>Everything here is visible to everyone on Nook.</p>
        <div className="nk-panel">
          <PostComposer me={me} onPost={actions.createPost} />
          {posts.length === 0 ? (
            <div className="nk-empty"><strong>No posts yet</strong>Be the first to share something.</div>
          ) : (
            posts.map((p) => (
              <PostItem key={p.id} post={p} me={me} users={users} onLike={actions.like} onComment={actions.comment} onDelete={actions.deletePost} onProfile={onProfile} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home                                                               */
/* ------------------------------------------------------------------ */
function HomePage({ me, users, posts, chats, unreadOf, actions, setTab, openChat, onProfile }) {
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const groupCount = chats.filter((c) => c.kind === "group").length;
  const chatTitle = (c) => (c.kind === "dm" ? users[c.other]?.name || c.other : c.group.name);
  const preview = (c) => {
    const m = c.msgs[c.msgs.length - 1];
    if (!m) return c.kind === "group" ? "Group created" : "No messages yet";
    return (m.from === me.username ? "You: " : c.kind === "group" ? (users[m.from]?.name || m.from).split(" ")[0] + ": " : "") + m.text;
  };
  return (
    <div className="nk-page">
      <div className="nk-wrap" style={{ maxWidth: 900 }}>
        <h1 className="nk-hello">{greet}, {me.name.split(" ")[0]}.</h1>
        <p className="muted" style={{ margin: "8px 0 20px" }}>
          {Object.keys(users).length} {Object.keys(users).length === 1 ? "person is" : "people are"} on Nook · {posts.length} {posts.length === 1 ? "post" : "posts"} shared · You're in {groupCount} {groupCount === 1 ? "group" : "groups"}
        </p>
        <div className="nk-panel">
          <PostComposer me={me} onPost={actions.createPost} placeholder="Share something with everyone" />
        </div>
        <div className="nk-grid">
          <section className="nk-panel">
            <div className="nk-panel-h">
              <h2>Your chats</h2>
              <button className="nk-btn ghost sm" onClick={() => setTab("messages")}>Open messages</button>
            </div>
            {chats.length === 0 ? (
              <div className="nk-empty"><strong>No chats yet</strong>Message someone directly or start a group.</div>
            ) : (
              chats.slice(0, 5).map((c) => (
                <button key={c.key} className="nk-row" onClick={() => openChat(c.kind === "dm" ? { kind: "dm", other: c.other } : { kind: "group", id: c.group.id })}>
                  <Avatar user={c.kind === "dm" ? users[c.other] : null} name={chatTitle(c)} group={c.kind === "group"} color={c.kind === "group" ? c.group.color : undefined} size={40} />
                  <div className="grow">
                    <div className="trunc"><b>{chatTitle(c)}</b></div>
                    <div className="trunc muted" style={{ fontSize: 14 }}>{preview(c)}</div>
                  </div>
                  {unreadOf(c) > 0 && <span className="nk-unread">{unreadOf(c)}</span>}
                </button>
              ))
            )}
          </section>
          <section className="nk-panel">
            <div className="nk-panel-h">
              <h2>Latest posts</h2>
              <button className="nk-btn ghost sm" onClick={() => setTab("posts")}>See all</button>
            </div>
            {posts.length === 0 ? (
              <div className="nk-empty"><strong>Quiet in here</strong>Post something to get things going.</div>
            ) : (
              posts.slice(0, 4).map((p) => (
                <div className="nk-row" key={p.id} style={{ alignItems: "flex-start" }}>
                  <Avatar user={users[p.author]} name={p.author} size={36} onClick={() => onProfile(p.author)} />
                  <div className="grow">
                    <div><b>{users[p.author]?.name || p.author}</b> <span className="muted" style={{ fontSize: 13 }}>{rel(p.ts)}</span></div>
                    <div style={{ fontSize: 14, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.text}</div>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */
function ChatView({ me, users, active, chat, settings, onSend, onBack, onInfo, onProfile }) {
  const [text, setText] = useState("");
  const scroller = useRef(null);
  const msgs = chat?.msgs || [];
  const isGroup = active.kind === "group";
  const other = users[active.other];

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs.length, active.id, active.other]);
  useEffect(() => setText(""), [active.id, active.other]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  let prevDay = "";
  return (
    <div className="nk-chat">
      <div className="nk-chat-h">
        <button className="nk-icon nk-back" onClick={onBack} aria-label="Back to chats"><ArrowLeft size={20} /></button>
        {isGroup ? (
          <>
            <Avatar name={chat.group.name} group color={chat.group.color} size={40} />
            <button className="who" onClick={onInfo}>
              <b className="trunc">{chat.group.name}</b>
              <span className="trunc" style={{ display: "block" }}>{chat.group.members.map((m) => users[m]?.name?.split(" ")[0] || m).join(", ")}</span>
            </button>
            <button className="nk-icon" onClick={onInfo} aria-label="Group info"><UserPlus size={20} /></button>
          </>
        ) : (
          <>
            <Avatar user={other} name={active.other} size={40} onClick={() => onProfile(active.other)} />
            <button className="who" onClick={() => onProfile(active.other)}>
              <b className="trunc">{other?.name || active.other}</b>
              <span className="trunc" style={{ display: "block" }}>{other?.about || "@" + active.other}</span>
            </button>
          </>
        )}
      </div>
      <div className="nk-scroll" ref={scroller}>
        {msgs.length === 0 && (
          <div className="nk-none" style={{ margin: "auto" }}>
            <div><strong style={{ fontFamily: "Bricolage Grotesque", fontSize: 18 }}>No messages yet</strong><div className="muted">Say hello to {isGroup ? "the group" : other?.name || active.other}.</div></div>
          </div>
        )}
        {msgs.map((m) => {
          const d = dayKey(m.ts);
          const sep = d !== prevDay;
          prevDay = d;
          const mine = m.from === me.username;
          return (
            <React.Fragment key={m.id}>
              {sep && <div className="nk-day">{fmtDay(m.ts)}</div>}
              <div className={"nk-b" + (mine ? " me" : "")}>
                {isGroup && !mine && (
                  <span className="nm" style={{ color: colorFor(m.from) }} onClick={() => onProfile(m.from)}>{users[m.from]?.name || m.from}</span>
                )}
                {m.text}
                <span className="tm">{fmtTime(m.ts)}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div className="nk-compose">
        <textarea
          rows={1} value={text} placeholder="Type a message" aria-label="Type a message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && settings.enterToSend) { e.preventDefault(); send(); }
          }}
        />
        <button className="nk-send" onClick={send} disabled={!text.trim()} aria-label="Send message"><Send size={19} /></button>
      </div>
    </div>
  );
}

function MessagesPage({ me, users, chats, active, setActive, unreadOf, settings, actions, onProfile, openModal }) {
  const [q, setQ] = useState("");
  const title = (c) => (c.kind === "dm" ? users[c.other]?.name || c.other : c.group.name);
  const filtered = chats.filter((c) => title(c).toLowerCase().includes(q.toLowerCase()));
  const activeKey = active ? (active.kind === "dm" ? dmKey(me.username, active.other) : "group:" + active.id) : null;
  const activeChat = chats.find((c) => c.key === activeKey);
  const groupMissing = active?.kind === "group" && !activeChat;

  return (
    <div className={"nk-msgs " + (active && !groupMissing ? "has-active" : "no-active")}>
      <aside className="nk-list" aria-label="Chats">
        <div className="nk-list-h">
          <h2>Messages</h2>
          <button className="nk-icon" onClick={() => openModal({ type: "newchat" })} aria-label="New message"><Plus size={22} /></button>
          <button className="nk-icon" onClick={() => openModal({ type: "newgroup" })} aria-label="New group"><Users size={21} /></button>
        </div>
        <label className="nk-search">
          <Search size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
        </label>
        <div className="nk-chats">
          {filtered.length === 0 && (
            <div className="nk-empty">
              <strong>{chats.length === 0 ? "No chats yet" : "No matches"}</strong>
              {chats.length === 0 ? "Tap + to message someone, or create a group." : "Try a different name."}
            </div>
          )}
          {filtered.map((c) => {
            const m = c.msgs[c.msgs.length - 1];
            const un = unreadOf(c);
            const isOn = c.key === activeKey;
            return (
              <button key={c.key} className={"nk-item" + (isOn ? " on" : "")}
                onClick={() => setActive(c.kind === "dm" ? { kind: "dm", other: c.other } : { kind: "group", id: c.group.id })}>
                <Avatar user={c.kind === "dm" ? users[c.other] : null} name={title(c)} group={c.kind === "group"} color={c.kind === "group" ? c.group.color : undefined} size={46} />
                <div className="grow">
                  <div className="top"><b className="trunc">{title(c)}</b><span className="time">{m ? rel(m.ts) : ""}</span></div>
                  <div className="bot">
                    <span className="trunc">
                      {m ? (m.from === me.username ? "You: " : c.kind === "group" ? (users[m.from]?.name || m.from).split(" ")[0] + ": " : "") + m.text : c.kind === "group" ? "Group created" : "No messages yet"}
                    </span>
                    {un > 0 && <span className="nk-unread">{un}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
      {active && !groupMissing ? (
        <ChatView
          me={me} users={users} active={active} chat={activeChat} settings={settings}
          onSend={(t) => actions.sendMessage(active, t)}
          onBack={() => setActive(null)}
          onInfo={() => openModal({ type: "groupinfo" })}
          onProfile={onProfile}
        />
      ) : (
        <div className="nk-chat nk-none">
          <div>
            <h2 style={{ fontSize: 22 }}>Pick a chat to start talking</h2>
            <p className="muted" style={{ margin: "6px 0 16px" }}>Direct messages are one-to-one. Group messages go to everyone in the group.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="nk-btn" onClick={() => openModal({ type: "newchat" })}>New message</button>
              <button className="nk-btn ghost" onClick={() => openModal({ type: "newgroup" })}>New group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modals                                                             */
/* ------------------------------------------------------------------ */
function PersonRow({ u, onClick, right }) {
  return (
    <button className="nk-pick" onClick={onClick}>
      <Avatar user={u} size={40} />
      <div className="grow">
        <div className="trunc"><b>{u.name}</b> <span className="muted">@{u.username}</span></div>
        <div className="trunc muted" style={{ fontSize: 14 }}>{u.about}</div>
      </div>
      {right}
    </button>
  );
}

function NewChatModal({ me, users, onPick, onClose }) {
  const [q, setQ] = useState("");
  const list = Object.values(users).filter((u) => u.username !== me.username &&
    (u.name + u.username).toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title="New message" onClose={onClose}>
      <input className="nk-input" autoFocus placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
      <div style={{ marginTop: 10 }}>
        {list.length === 0 && <div className="nk-empty">No one to message yet. Ask a friend to create an account.</div>}
        {list.map((u) => <PersonRow key={u.username} u={u} onClick={() => onPick(u.username)} />)}
      </div>
    </Modal>
  );
}

function NewGroupModal({ me, users, onCreate, onClose }) {
  const [name, setName] = useState("");
  const [sel, setSel] = useState([]);
  const [q, setQ] = useState("");
  const list = Object.values(users).filter((u) => u.username !== me.username &&
    (u.name + u.username).toLowerCase().includes(q.toLowerCase()));
  const toggle = (u) => setSel((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]));
  return (
    <Modal title="New group" onClose={onClose}>
      <label className="nk-label" style={{ marginTop: 0 }} htmlFor="gn">Group name</label>
      <input id="gn" className="nk-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Weekend plans" />
      <label className="nk-label" htmlFor="gs">Add members ({sel.length} selected)</label>
      <input id="gs" className="nk-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" />
      <div style={{ marginTop: 8 }}>
        {list.length === 0 && <div className="nk-empty">No one else has joined yet.</div>}
        {list.map((u) => (
          <PersonRow key={u.username} u={u} onClick={() => toggle(u.username)}
            right={<span className={"nk-check" + (sel.includes(u.username) ? " on" : "")}>{sel.includes(u.username) && "✓"}</span>} />
        ))}
      </div>
      <button className="nk-btn" style={{ width: "100%", marginTop: 14 }} disabled={!name.trim() || sel.length === 0} onClick={() => onCreate(name.trim(), sel)}>
        Create group
      </button>
    </Modal>
  );
}

function GroupInfoModal({ me, users, group, onAdd, onLeave, onClose }) {
  const others = Object.values(users).filter((u) => !group.members.includes(u.username));
  return (
    <Modal title={group.name} onClose={onClose}>
      <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>{group.members.length} members</h3>
      {group.members.map((m) => (
        <div className="nk-pick" key={m} style={{ cursor: "default" }}>
          <Avatar user={users[m]} name={m} size={36} />
          <div className="grow"><b>{users[m]?.name || m}</b> <span className="muted">@{m}</span></div>
          {group.admin === m && <span className="muted" style={{ fontSize: 13 }}>Admin</span>}
        </div>
      ))}
      {group.admin === me.username && others.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, margin: "16px 0 4px" }}>Add people</h3>
          {others.map((u) => <PersonRow key={u.username} u={u} onClick={() => onAdd(u.username)} right={<Plus size={18} />} />)}
        </>
      )}
      <button className="nk-btn danger" style={{ width: "100%", marginTop: 18 }} onClick={onLeave}>Leave group</button>
    </Modal>
  );
}

function ProfileModal({ me, user, onMessage, onClose }) {
  if (!user) return <Modal title="Profile" onClose={onClose}><div className="nk-empty">This account no longer exists.</div></Modal>;
  return (
    <Modal title="Profile" onClose={onClose}>
      <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Avatar user={user} size={84} /></div>
        <h2 style={{ marginTop: 12 }}>{user.name}</h2>
        <div className="muted">@{user.username}</div>
        <p style={{ margin: "12px 0 4px" }}>{user.about}</p>
        <div className="muted" style={{ fontSize: 14 }}>Joined {new Date(user.joined).toLocaleDateString([], { month: "long", year: "numeric" })}</div>
      </div>
      {user.username !== me.username && <button className="nk-btn" style={{ width: "100%" }} onClick={() => onMessage(user.username)}>Send message</button>}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Account                                                            */
/* ------------------------------------------------------------------ */
function AccountPage({ me, stats, settings, updateSettings, saveProfile, changePass, signOut, deleteAccount }) {
  const [name, setName] = useState(me.name);
  const [about, setAbout] = useState(me.about || "");
  const [color, setColor] = useState(me.color);
  const [saved, setSaved] = useState(false);
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [passMsg, setPassMsg] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const dirty = name.trim() !== me.name || about !== me.about || color !== me.color;

  return (
    <div className="nk-page">
      <div className="nk-wrap">
        <h1 className="nk-page-h">Account</h1>
        <div className="nk-panel" style={{ marginTop: 14 }}>
          <div className="nk-hero">
            <Avatar user={{ ...me, name, color }} size={76} />
            <div className="grow">
              <h2 style={{ fontSize: 24 }}>{name || me.username}</h2>
              <div className="muted">@{me.username}</div>
              <div style={{ marginTop: 4 }}>{about}</div>
            </div>
          </div>
          <div className="nk-stats">
            <div><b>{stats.posts}</b><span className="muted">Posts</span></div>
            <div><b>{stats.chats}</b><span className="muted">Chats</span></div>
            <div><b>{stats.groups}</b><span className="muted">Groups</span></div>
          </div>
        </div>

        <section className="nk-panel nk-sec">
          <div className="nk-panel-h"><h2>Account details</h2></div>
          <div className="nk-sec-b">
            <dl className="nk-dl">
              <dt className="muted">Username</dt><dd>@{me.username}</dd>
              <dt className="muted">Member since</dt><dd>{new Date(me.joined).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}</dd>
              <dt className="muted">Email</dt><dd>{me.email}</dd>
            </dl>
          </div>
        </section>

        <section className="nk-panel nk-sec">
          <div className="nk-panel-h"><h2>Edit profile</h2></div>
          <div className="nk-sec-b">
            <label className="nk-label" htmlFor="pn">Display name</label>
            <input id="pn" className="nk-input" value={name} maxLength={30} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
            <label className="nk-label" htmlFor="pa">About</label>
            <input id="pa" className="nk-input" value={about} maxLength={80} onChange={(e) => { setAbout(e.target.value); setSaved(false); }} />
            <div className="nk-label">Avatar color</div>
            <div className="nk-swatches">
              {AVATAR_COLORS.map((c) => (
                <button key={c} className={"nk-swatch" + (color === c ? " on" : "")} style={{ background: c }} aria-label={"Use color " + c} onClick={() => { setColor(c); setSaved(false); }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
              <button className="nk-btn" disabled={!dirty || !name.trim()} onClick={async () => { await saveProfile({ name: name.trim(), about, color }); setSaved(true); }}>Save changes</button>
              {saved && <span className="muted">Saved</span>}
            </div>
          </div>
        </section>

        <section className="nk-panel nk-sec">
          <div className="nk-panel-h"><h2>Settings</h2></div>
          <div className="nk-sec-b">
            <div className="nk-set">
              <div><b>Theme</b><div className="muted" style={{ fontSize: 14 }}>Match your device or pick one.</div></div>
              <div className="nk-seg" role="group" aria-label="Theme">
                {["system", "light", "dark"].map((t) => (
                  <button key={t} className={settings.theme === t ? "on" : ""} onClick={() => updateSettings({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="nk-set">
              <div><b>Text size</b></div>
              <div className="nk-seg" role="group" aria-label="Text size">
                <button className={settings.textSize === "md" ? "on" : ""} onClick={() => updateSettings({ textSize: "md" })}>Normal</button>
                <button className={settings.textSize === "lg" ? "on" : ""} onClick={() => updateSettings({ textSize: "lg" })}>Large</button>
              </div>
            </div>
            <div className="nk-set">
              <div><b>Enter sends message</b><div className="muted" style={{ fontSize: 14 }}>Off: Enter adds a new line, use the send button.</div></div>
              <Switch on={settings.enterToSend} onChange={(v) => updateSettings({ enterToSend: v })} label="Enter sends message" />
            </div>
          </div>
        </section>

        <section className="nk-panel nk-sec">
          <div className="nk-panel-h"><h2>Change password</h2></div>
          <div className="nk-sec-b">
            <label className="nk-label" htmlFor="cp">Current password</label>
            <input id="cp" type="password" className="nk-input" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
            <label className="nk-label" htmlFor="np">New password</label>
            <input id="np" type="password" className="nk-input" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" />
            {passMsg && <div className={passMsg.ok ? "muted" : "nk-err"} style={{ marginTop: 10 }} role="status">{passMsg.text}</div>}
            <button className="nk-btn" style={{ marginTop: 16 }} disabled={!cur || nw.length < 6}
              onClick={async () => { const r = await changePass(cur, nw); setPassMsg(r); if (r.ok) { setCur(""); setNw(""); } }}>
              Update password
            </button>
          </div>
        </section>

        <section className="nk-panel nk-sec">
          <div className="nk-panel-h"><h2>Session</h2></div>
          <div className="nk-sec-b" style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 16 }}>
            <button className="nk-btn ghost" onClick={signOut}><LogOut size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Sign out</button>
            {!confirmDel ? (
              <button className="nk-btn ghost" style={{ color: "var(--danger)!important" }} onClick={() => setConfirmDel(true)}>Delete account</button>
            ) : (
              <>
                <button className="nk-btn danger" onClick={deleteAccount}>Yes, delete my account and posts</button>
                <button className="nk-btn ghost" onClick={() => setConfirmDel(false)}>Cancel</button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  if (!isConfigured) return <SetupNotice css={CSS} />;
  return <Nook />;
}

function Nook() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [reads, setReads] = useState({});
  const [users, setUsers] = useState({});
  const [posts, setPosts] = useState([]);
  const [chats, setChats] = useState([]);
  const [tab, setTab] = useState("home");
  const [active, setActive] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const writeRef = useRef(0);
  const timerRef = useRef(null);

  const flash = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2400);
  };

  /* ---- session ---- */
  useEffect(() => {
    let on = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!on) return;
      setSession(data.session);
      if (!data.session) setBooting(false);
    });
    // Keep this callback synchronous: just store the session; the effect below loads the profile.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      on = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setMe(null); setChats([]); setPosts([]); setActive(null); setModal(null); setReads({});
      return;
    }
    let on = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (!on) return;
      if (data) setMe({ ...api.toUser(data), email: session.user.email });
      setBooting(false);
    })();
    return () => { on = false; };
  }, [session?.user?.id]);

  /* ---- data loading ---- */
  const refresh = useCallback(async () => {
    if (!me) return;
    const t0 = Date.now();
    try {
      const u = await api.fetchUsers();
      const [p, c] = await Promise.all([api.fetchPosts(u), api.fetchChats(me, u)]);
      setUsers(u);
      if (writeRef.current > t0) return; // a local change happened mid-fetch; a newer refresh is coming
      setPosts(p);
      setChats(c);
    } catch (e) {
      console.error("Refresh failed:", e);
    }
  }, [me?.id, me?.username]);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refresh, 300);
  }, [refresh]);

  /* ---- live updates: refresh whenever the database changes ---- */
  useEffect(() => {
    if (!me) return;
    refresh();
    const channel = supabase.channel("nook-changes");
    ["posts", "post_likes", "post_comments", "messages", "chats", "chat_members"].forEach((table) =>
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh)
    );
    channel.subscribe();
    const poll = setInterval(refresh, 20000); // safety net if the live connection drops
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [me?.id, refresh, scheduleRefresh]);

  /* ---- unread tracking (stored in the database per member) ---- */
  const unreadOf = useCallback(
    (c) => c.msgs.filter((m) => m.from !== me?.username && m.ts > Math.max(reads[c.key] || 0, c.lastRead || 0)).length,
    [reads, me]
  );
  const totalUnread = useMemo(() => chats.reduce((n, c) => n + unreadOf(c), 0), [chats, unreadOf]);

  useEffect(() => {
    if (tab !== "messages" || !active || !me) return;
    const key = active.kind === "dm" ? dmKey(me.username, active.other) : "group:" + active.id;
    const chat = chats.find((c) => c.key === key);
    const last = chat?.msgs.length ? chat.msgs[chat.msgs.length - 1].ts : 0;
    if (chat && last > Math.max(reads[key] || 0, chat.lastRead || 0)) {
      setReads((r) => ({ ...r, [key]: last }));
      if (chat.id) api.markRead(chat.id);
    }
  }, [tab, active, chats, me, reads]);

  /* ---- account ---- */
  const signOut = async () => { await supabase.auth.signOut(); };

  function updateSettings(patch) {
    const n = { ...settings, ...patch };
    setSettings(n);
    saveSettings(n);
  }
  async function saveProfile(patch) {
    const { data, error } = await api.updateProfile(me.id, patch);
    if (error) return flash("Couldn't save your profile. Try again.");
    const next = { ...api.toUser(data), email: me.email };
    setMe(next);
    setUsers((p) => ({ ...p, [next.username]: next }));
  }
  const changePass = (cur, nw) => api.changePassword(me.email, cur, nw);
  async function deleteAccount() {
    const { error } = await api.deleteAccount();
    if (error) return flash("Couldn't delete your account. Try again.");
    await supabase.auth.signOut();
  }

  /* ---- posts + messages ---- */
  const patchPost = (id, fn) => setPosts((p) => p.map((x) => (x.id === id ? fn(x) : x)));
  const touch = () => { writeRef.current = Date.now(); };

  const actions = {
    async createPost(text) {
      touch();
      setPosts((p) => [{ id: "tmp-" + Date.now(), author: me.username, text, ts: Date.now(), likes: [], comments: [] }, ...p]);
      const { error } = await api.createPost(me, text);
      if (error) flash("Couldn't post. Try again.");
      touch();
      scheduleRefresh();
    },
    async like(post) {
      if (String(post.id).startsWith("tmp-")) return;
      touch();
      const liked = post.likes.includes(me.username);
      patchPost(post.id, (p) => ({ ...p, likes: liked ? p.likes.filter((x) => x !== me.username) : [...p.likes, me.username] }));
      await api.toggleLike(me, post);
      touch();
      scheduleRefresh();
    },
    async comment(post, text) {
      if (String(post.id).startsWith("tmp-")) return;
      touch();
      patchPost(post.id, (p) => ({ ...p, comments: [...p.comments, { id: "tmp-" + Date.now(), author: me.username, text, ts: Date.now() }] }));
      const { error } = await api.addComment(me, post, text);
      if (error) flash("Couldn't send your reply.");
      touch();
      scheduleRefresh();
    },
    async deletePost(post) {
      touch();
      setPosts((p) => p.filter((x) => x.id !== post.id));
      if (!String(post.id).startsWith("tmp-")) await api.deletePost(post.id);
      touch();
      scheduleRefresh();
    },
    async sendMessage(a, text) {
      const isDm = a.kind === "dm";
      const chatKey = isDm ? dmKey(me.username, a.other) : "group:" + a.id;
      const existing = chats.find((c) => c.key === chatKey);
      const msg = { id: "tmp-" + Date.now(), from: me.username, text, ts: Date.now() };
      touch();
      setChats((prev) => {
        const has = prev.find((c) => c.key === chatKey);
        const next = has
          ? prev.map((c) => (c.key === chatKey ? { ...c, msgs: [...c.msgs, msg] } : c))
          : [{ kind: "dm", key: chatKey, other: a.other, msgs: [msg], lastRead: 0 }, ...prev];
        return sortChats(next);
      });
      try {
        let chatId = existing?.id;
        if (!chatId) {
          const other = users[a.other];
          if (!other) throw new Error("User not found");
          chatId = await api.startDm(other.id); // finds or creates the private chat
        }
        const { error } = await api.sendMessage(me, chatId, text);
        if (error) throw error;
      } catch (e) {
        console.error(e);
        flash("Message didn't send. Try again.");
      }
      touch();
      scheduleRefresh();
    },
  };

  /* ---- groups ---- */
  async function createGroup(name, usernames) {
    const ids = usernames.map((u) => users[u]?.id).filter(Boolean);
    const color = colorFor(name);
    const { data: id, error } = await api.createGroup(name, color, ids);
    if (error || !id) return flash("Couldn't create the group. Try again.");
    const g = { id, name, members: [me.username, ...usernames], admin: me.username, created: Date.now(), color };
    touch();
    setChats((p) => sortChats([{ kind: "group", key: "group:" + id, id, group: g, msgs: [], lastRead: 0 }, ...p]));
    setModal(null);
    setActive({ kind: "group", id });
    scheduleRefresh();
  }
  async function addMember(username) {
    const id = active?.id;
    const target = users[username];
    if (!id || !target) return;
    const { error } = await api.addMember(id, target.id);
    if (error) return flash("Only the group admin can add people.");
    touch();
    setChats((p) => p.map((c) => (c.key === "group:" + id ? { ...c, group: { ...c.group, members: [...c.group.members, username] } } : c)));
    scheduleRefresh();
  }
  async function leaveGroup(id) {
    const { error } = await api.leaveChat(id);
    if (error) return flash("Couldn't leave the group. Try again.");
    touch();
    setChats((p) => p.filter((c) => c.key !== "group:" + id));
    setActive(null);
    setModal(null);
    flash("You left the group");
    scheduleRefresh();
  }

  /* ---- navigation ---- */
  function openChat(a) {
    setActive(a);
    setTab("messages");
    setModal(null);
  }
  const profileUser = modal?.type === "profile" ? users[modal.username] : null;
  const activeGroup = active?.kind === "group" ? chats.find((c) => c.key === "group:" + active.id)?.group : null;

  const stats = {
    posts: posts.filter((p) => p.author === me?.username).length,
    chats: chats.length,
    groups: chats.filter((c) => c.kind === "group").length,
  };
  const themeClass = settings.theme + (settings.textSize === "lg" ? " ts-lg" : "");

  if (booting) {
    return (
      <div className={"nk " + themeClass}>
        <style>{CSS}</style>
        <div className="nk-none muted" style={{ flex: 1 }}>Loading Nook…</div>
      </div>
    );
  }
  if (!me) {
    return (
      <div className={"nk " + themeClass}>
        <style>{CSS}</style>
        <Auth />
      </div>
    );
  }

  const nav = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "posts", label: "Posts", icon: Newspaper },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: totalUnread },
  ];
  const showProfile = (u) => setModal({ type: "profile", username: u });

  return (
    <div className={"nk " + themeClass}>
      <style>{CSS}</style>
      <nav className="nk-rail" aria-label="Main">
        <div className="nk-logo"><MessageCircle size={22} /></div>
        {nav.map((n) => (
          <button key={n.id} className={"nk-nav" + (tab === n.id ? " on" : "")} onClick={() => setTab(n.id)} aria-current={tab === n.id ? "page" : undefined}>
            <n.icon size={22} />
            {n.label}
            {n.badge > 0 && <span className="nk-badge">{n.badge > 99 ? "99+" : n.badge}</span>}
          </button>
        ))}
        <div className="nk-spacer" />
        <button className={"nk-nav" + (tab === "account" ? " on" : "")} onClick={() => setTab("account")} aria-current={tab === "account" ? "page" : undefined}>
          <UserIcon size={22} />
          Account
        </button>
      </nav>

      <main className="nk-main">
        {tab === "home" && (
          <HomePage me={me} users={users} posts={posts} chats={chats} unreadOf={unreadOf} actions={actions}
            setTab={setTab} openChat={openChat} onProfile={showProfile} />
        )}
        {tab === "posts" && <PostsPage me={me} users={users} posts={posts} actions={actions} onProfile={showProfile} />}
        {tab === "messages" && (
          <MessagesPage me={me} users={users} chats={chats} active={active} setActive={setActive} unreadOf={unreadOf}
            settings={settings} actions={actions} onProfile={showProfile} openModal={setModal} />
        )}
        {tab === "account" && (
          <AccountPage me={me} stats={stats} settings={settings} updateSettings={updateSettings}
            saveProfile={saveProfile} changePass={changePass} signOut={signOut} deleteAccount={deleteAccount} />
        )}
      </main>

      {modal?.type === "newchat" && (
        <NewChatModal me={me} users={users} onClose={() => setModal(null)} onPick={(u) => openChat({ kind: "dm", other: u })} />
      )}
      {modal?.type === "newgroup" && <NewGroupModal me={me} users={users} onClose={() => setModal(null)} onCreate={createGroup} />}
      {modal?.type === "groupinfo" && activeGroup && (
        <GroupInfoModal me={me} users={users} group={activeGroup} onClose={() => setModal(null)}
          onAdd={addMember} onLeave={() => leaveGroup(activeGroup.id)} />
      )}
      {modal?.type === "profile" && (
        <ProfileModal me={me} user={profileUser} onClose={() => setModal(null)} onMessage={(u) => openChat({ kind: "dm", other: u })} />
      )}
      {toast && <div className="nk-toast" role="status">{toast}</div>}
    </div>
  );
}
