import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBg2Qc6mmOX-dZy77vi-22R1tOWoTRZbJA",
    authDomain: "givary-community.firebaseapp.com",
    projectId: "givary-community",
    storageBucket: "givary-community.firebasestorage.app",
    messagingSenderId: "950353597505",
    appId: "1:950353597505:web:617258d049aff4bd66e2c0",
    databaseURL: "https://givary-community-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let userProfile = {};
let px = new Array(1024).fill(null);
let history = [];
let redoStack = [];
let tool = 'pencil'; 
let color = '#3b82f6'; 
let drawing = false; 
let activeId = null;

document.getElementById('givary-app').innerHTML = `
    <header class="app-header">
        <span class="brand-name">GIVARY - COMMUNITY</span>
        <div id="btn-login" class="user-pill">
            <span id="u-name" style="font-size:0.8rem">Login</span>
            <img id="u-avatar" src="https://ui-avatars.com/api/?name=Guest">
        </div>
    </header>

    <div id="view-home" class="view active">
        <div class="art-grid" id="gallery-grid"></div>
        <button class="btn-add" id="btn-new"><i class="fas fa-plus"></i> BUAT KARYA</button>
    </div>

    <div id="view-editor" class="view">
        <div style="padding:20px; display:flex; flex-direction:column; align-items:center;">
            <div style="width:100%; max-width:340px; display:flex; justify-content:space-between; margin-bottom:20px; gap:10px;">
                <button onclick="backHome()" style="background:var(--glass); border:none; color:white; padding:10px 15px; border-radius:12px; cursor:pointer;">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
                <button id="btn-upload-img" style="background:var(--glass); border:none; color:white; padding:10px 15px; border-radius:12px; cursor:pointer;">
                    <i class="fas fa-image"></i>
                </button>
                <input type="file" id="file-upload" accept="image/*" style="display:none">
                <button id="btn-save" style="background:var(--primary); border:none; color:white; padding:10px 25px; border-radius:12px; font-weight:bold; cursor:pointer;">
                    <i class="fas fa-paper-plane"></i> Publish
                </button>
            </div>
            
            <div style="width:340px; height:340px; background:repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 50% / 20px 20px; border-radius:24px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <canvas id="main-canvas" width="32" height="32" style="width:100%;height:100%;image-rendering:pixelated"></canvas>
            </div>
            
            <div class="editor-tools">
                <input type="color" id="color-picker" value="#3b82f6" style="width:42px;height:42px;border:none;background:none;cursor:pointer;">
                <button id="t-pencil" class="tool-btn active"><i class="fas fa-pencil-alt"></i></button>
                <button id="t-eraser" class="tool-btn"><i class="fas fa-eraser"></i></button>
                <button id="t-bucket" class="tool-btn"><i class="fas fa-fill-drip"></i></button>
                <div style="width:1px; background:var(--glass-heavy); margin:0 5px;"></div>
                <button id="t-undo" class="tool-btn"><i class="fas fa-undo"></i></button>
                <button id="t-redo" class="tool-btn"><i class="fas fa-redo"></i></button>
            </div>
        </div>
    </div>

    <div id="view-detail" class="view">
        <div style="padding:20px;">
            <button onclick="backHome()" style="background:var(--glass); border:none; color:white; padding:10px 15px; border-radius:12px; margin-bottom:20px; cursor:pointer;">
                <i class="fas fa-arrow-left"></i> Kembali
            </button>
            <div style="width:100%; max-width:400px; margin:0 auto;">
                <div class="canvas-container" style="border-radius:20px; margin-bottom:20px;">
                    <canvas id="detail-canvas" width="32" height="32"></canvas>
                </div>
                
                <h2 id="d-title" style="margin:20px 0 5px"></h2>
                <div id="d-meta" style="display:flex; align-items:center; gap:8px; color:var(--text-dim); font-size:0.9rem; margin-bottom:20px;"></div>
                
                <div style="background:var(--glass-heavy); padding:15px; border-radius:15px; border-left:4px solid var(--primary); margin-bottom:25px;">
                    <small style="display:block; color:var(--primary); font-weight:bold; text-transform:uppercase; font-size:0.7rem; margin-bottom:5px;">
                        <i class="fas fa-info-circle"></i> Deskripsi Karya
                    </small>
                    <p id="d-desc" style="color:white; font-size:0.95rem; line-height:1.5; margin:0;"></p>
                </div>

                <div style="border-top:1px solid var(--glass-heavy); padding-top:20px;">
                    <h3 style="margin:0 0 15px 0; font-size:1.1rem;"><i class="fas fa-comments"></i> Komentar</h3>
                    <div id="comment-list" style="margin-bottom:15px; max-height:300px; overflow-y:auto;"></div>
                    <div style="display:flex; gap:10px;">
                        <input id="inp-comment" placeholder="Tulis komentar..." style="flex:1; background:var(--glass); border:1px solid var(--glass-heavy); color:white; padding:12px; border-radius:12px;">
                        <button id="btn-send" style="background:var(--primary); color:white; border:none; padding:10px 20px; border-radius:12px; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="toast" id="toast">Notifikasi</div>
`;

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

// --- HISTORY LOGIC ---
function saveHistory() {
    history.push([...px]);
    if (history.length > 30) history.shift();
    redoStack = [];
}

function undo() {
    if (history.length > 0) {
        redoStack.push([...px]);
        px = history.pop();
        render(ctx, px);
    }
}

function redo() {
    if (redoStack.length > 0) {
        history.push([...px]);
        px = redoStack.pop();
        render(ctx, px);
    }
}

// --- RENDERING ---
function render(c, d) { 
    if(!c) return; 
    c.clearRect(0,0,32,32); 
    d.forEach((p, i) => { if(p) { c.fillStyle = p; c.fillRect(i%32, Math.floor(i/32), 1, 1); } }); 
}

// --- SYSTEM ---
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
}
window.backHome = () => switchView('home');

// --- AUTH & USER PROFILE ---
onAuthStateChanged(auth, u => {
    currentUser = u;
    if(u) {
        onValue(ref(db, 'users/' + u.uid), snap => {
            if(snap.exists()) { userProfile = snap.val(); } 
            else {
                userProfile = { name: u.displayName || 'User-' + u.uid.slice(0,5), photo: u.photoURL || `https://ui-avatars.com/api/?name=${u.uid}`, bio: 'Anggota baru Givary' };
                update(ref(db, 'users/' + u.uid), userProfile);
            }
            updateUI();
        });
    } else { userProfile = {}; updateUI(); }
});

function updateUI() {
    document.getElementById('u-name').innerText = currentUser ? (userProfile.name || 'User') : 'Login';
    document.getElementById('u-avatar').src = currentUser ? (userProfile.photo || `https://ui-avatars.com/api/?name=Guest`) : 'https://ui-avatars.com/api/?name=Guest';
}

document.getElementById('btn-login').onclick = () => { if(currentUser) { openProfileModal(); } else { openModal('modal-login'); } };
document.getElementById('btn-google-login').onclick = () => {
    signInWithPopup(auth, provider).then(() => { closeModal('modal-login'); showToast('Login Berhasil'); }).catch(() => showToast('Login Gagal'));
};

function openProfileModal() {
    document.getElementById('profile-avatar').src = userProfile.photo;
    document.getElementById('inp-profile-name').value = userProfile.name;
    document.getElementById('inp-profile-bio').value = userProfile.bio;
    openModal('modal-profile');
}

document.getElementById('btn-save-profile').onclick = () => {
    const newName = document.getElementById('inp-profile-name').value.trim();
    if(!newName) return showToast('Nama tidak boleh kosong');
    update(ref(db, 'users/' + currentUser.uid), { 
        name: newName, 
        bio: document.getElementById('inp-profile-bio').value.trim(), 
        photo: userProfile.photo 
    }).then(() => { showToast('Profil diupdate'); closeModal('modal-profile'); });
};

document.getElementById('btn-logout').onclick = () => { if(confirm('Logout dari akun?')) signOut(auth).then(() => closeModal('modal-profile')); };

// --- GALLERY & DYNAMIC NAMES ---
onValue(ref(db, 'artworks'), snap => {
    const grid = document.getElementById('gallery-grid'); 
    grid.innerHTML = '';
    if(!snap.exists()) return grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:50px;">Belum ada karya</p>';
    
    const artworks = [];
    snap.forEach(child => { artworks.push({ id: child.key, ...child.val() }); });
    artworks.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    artworks.forEach(data => {
        const div = document.createElement('div'); 
        div.className = 'art-card';
        const nameId = `n-${data.id}`;
        const picId = `p-${data.id}`;

        div.innerHTML = `
            <div class="canvas-container"><canvas id="c-${data.id}" width="32" height="32"></canvas></div>
            <div class="art-overlay">
                <b style="font-size:0.85rem">${data.title || 'Untitled'}</b>
                <div class="author-tag">
                    <img id="${picId}" src="https://ui-avatars.com/api/?name=...">
                    <span id="${nameId}">Loading...</span>
                </div>
            </div>`;
        
        div.onclick = () => openDetailView(data);
        grid.appendChild(div);

        // Update nama/foto secara real-time berdasarkan authorUid
        onValue(ref(db, 'users/' + data.authorUid), uSnap => {
            const u = uSnap.val();
            const elN = document.getElementById(nameId);
            const elP = document.getElementById(picId);
            if(u && elN && elP) {
                elN.innerText = u.name;
                elP.src = u.photo;
                data.authorName = u.name;
                data.authorPhoto = u.photo;
            }
        });

        setTimeout(() => { const c = document.getElementById(`c-${data.id}`); if(c) render(c.getContext('2d'), JSON.parse(data.pixels)); }, 10);
    });
});

function openDetailView(data) {
    activeId = data.id;
    onValue(ref(db, 'users/' + data.authorUid), s => {
        const u = s.val();
        if(u) {
            document.getElementById('d-title').innerText = data.title || 'Untitled';
            document.getElementById('d-desc').innerText = data.description || 'Tidak ada deskripsi.';
            document.getElementById('d-meta').innerHTML = `<img src="${u.photo}" style="width:24px; height:24px; border-radius:50%;"><span>Oleh <b>${u.name}</b></span>`;
        }
    }, { onlyOnce: true });

    render(document.getElementById('detail-canvas').getContext('2d'), JSON.parse(data.pixels));
    switchView('detail');
    loadComments(data.id);
}

function loadComments(id) {
    const list = document.getElementById('comment-list');
    onValue(ref(db, 'comments/' + id), s => {
        list.innerHTML = '';
        if(!s.exists()) return list.innerHTML = '<p style="opacity:0.3; font-size:0.85rem; padding:10px;">Belum ada komentar</p>';
        s.forEach(c => { 
            const v = c.val(); 
            list.innerHTML += `<div style="background:var(--glass); padding:10px; border-radius:10px; margin-bottom:8px; font-size:0.85rem"><b style="color:var(--primary)">${v.authorName}</b>: ${v.text}</div>`; 
        });
    });
}

document.getElementById('btn-send').onclick = () => {
    const text = document.getElementById('inp-comment').value.trim();
    if(!text || !currentUser) return;
    push(ref(db, 'comments/' + activeId), { text, authorName: userProfile.name, timestamp: Date.now() }).then(() => { document.getElementById('inp-comment').value = ''; });
};

// --- DRAWING TOOLS ---
const draw = (e) => {
    if(!drawing) return;
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.floor((cx-r.left)*(32/r.width));
    const y = Math.floor((cy-r.top)*(32/r.height));
    if(x>=0 && x<32 && y>=0 && y<32) {
        const idx = y*32+x;
        if(tool === 'pencil') px[idx] = color;
        else if(tool === 'eraser') px[idx] = null;
        else if(tool === 'bucket') { floodFill(x, y, color); drawing = false; }
        render(ctx, px);
    }
};

function floodFill(x, y, newColor) {
    const idx = y*32+x;
    const targetColor = px[idx];
    if(targetColor === newColor) return;
    const stack = [idx];
    while(stack.length) {
        const i = stack.pop();
        const cx = i % 32; const cy = Math.floor(i / 32);
        if(cx < 0 || cx >= 32 || cy < 0 || cy >= 32 || px[i] !== targetColor) continue;
        px[i] = newColor;
        stack.push(i-1, i+1, i-32, i+32);
    }
}

canvas.onmousedown = (e) => { saveHistory(); drawing=true; draw(e); }
window.onmouseup = () => drawing = false;
canvas.onmousemove = draw;
canvas.ontouchstart = (e) => { e.preventDefault(); saveHistory(); drawing=true; draw(e); }
canvas.ontouchmove = (e) => { e.preventDefault(); draw(e); }
canvas.ontouchend = () => drawing = false;

document.getElementById('t-undo').onclick = undo;
document.getElementById('t-redo').onclick = redo;
document.getElementById('color-picker').oninput = (e) => { color = e.target.value; tool = 'pencil'; updateToolButtons(); };
document.getElementById('t-pencil').onclick = () => { tool = 'pencil'; updateToolButtons(); };
document.getElementById('t-eraser').onclick = () => { tool = 'eraser'; updateToolButtons(); };
document.getElementById('t-bucket').onclick = () => { tool = 'bucket'; updateToolButtons(); };

function updateToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('t-' + tool).classList.add('active');
}

document.getElementById('btn-upload-img').onclick = () => document.getElementById('file-upload').click();
document.getElementById('file-upload').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
            saveHistory();
            const tempCtx = document.createElement('canvas').getContext('2d');
            tempCtx.canvas.width = 32; tempCtx.canvas.height = 32;
            tempCtx.drawImage(img, 0, 0, 32, 32);
            const data = tempCtx.getImageData(0, 0, 32, 32).data;
            for(let i = 0; i < 1024; i++) {
                const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
                px[i] = a > 128 ? `#${((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1)}` : null;
            }
            render(ctx, px);
            showToast('Konversi Berhasil');
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
};

// --- MODALS ---
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.getElementById('btn-close-login').onclick = () => closeModal('modal-login');
document.getElementById('btn-close-profile').onclick = () => closeModal('modal-profile');

document.getElementById('btn-new').onclick = () => { px.fill(null); history = []; redoStack = []; render(ctx, px); switchView('editor'); };
document.getElementById('btn-save').onclick = () => { if(!currentUser) { showToast('Login diperlukan'); openModal('modal-login'); return; } openModal('modal-publish'); };

document.getElementById('btn-publish').onclick = () => {
    const title = document.getElementById('inp-title').value.trim();
    if(!title) return showToast('Judul diperlukan');
    push(ref(db, 'artworks'), {
        title, 
        description: document.getElementById('inp-desc').value.trim(),
        pixels: JSON.stringify(px), 
        authorUid: currentUser.uid, 
        timestamp: Date.now()
    }).then(() => { 
        showToast('Berhasil Publish'); 
        closeModal('modal-publish'); 
        switchView('home'); 
    });
};
document.getElementById('btn-cancel-publish').onclick = () => closeModal('modal-publish');
