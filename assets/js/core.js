import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

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
        <button class="btn-add" id="btn-new">BUAT KARYA</button>
    </div>

    <div id="view-editor" class="view">
        <div style="padding:20px; display:flex; flex-direction:column; align-items:center;">
            <div style="width:100%; max-width:340px; display:flex; justify-content:space-between; margin-bottom:20px">
                <button onclick="location.reload()" style="background:var(--glass); border:none; color:white; padding:10px 15px; border-radius:12px">Batal</button>
                <button id="btn-save" style="background:var(--primary); border:none; color:white; padding:10px 25px; border-radius:12px; font-weight:bold">Publish</button>
            </div>
            <div style="width:340px; height:340px; background:white; border-radius:24px; overflow:hidden;">
                <canvas id="main-canvas" width="32" height="32" style="width:100%;height:100%;image-rendering:pixelated"></canvas>
            </div>
            <div style="margin-top:25px; display:flex; gap:12px; background:var(--glass); padding:10px; border-radius:20px">
                <input type="color" id="color-picker" value="#3b82f6" style="width:40px;height:40px;border:none;background:none">
                <button id="t-pencil" style="background:var(--primary); border:none; color:white; width:45px; height:45px; border-radius:10px"><i class="fas fa-pencil-alt"></i></button>
                <button id="t-eraser" style="background:var(--glass-heavy); border:none; color:white; width:45px; height:45px; border-radius:10px"><i class="fas fa-eraser"></i></button>
            </div>
        </div>
    </div>

    <div id="modal-detail" class="modal-overlay">
        <div class="modal-content">
            <div style="width:50px; height:5px; background:var(--glass-heavy); border-radius:10px; margin: 0 auto 20px"></div>
            <div class="canvas-container" style="border-radius:20px; background:#fff"><canvas id="detail-canvas" width="32" height="32"></canvas></div>
            <h2 id="d-title" style="margin:20px 0 5px"></h2>
            <div id="d-meta" style="display:flex; align-items:center; gap:8px; color:var(--text-dim); font-size:0.9rem"></div>
            <div style="margin-top:20px; border-top:1px solid var(--glass-heavy); padding-top:20px">
                <div id="comment-list"></div>
                <div style="display:flex; gap:10px; margin-top:15px">
                    <input id="inp-comment" placeholder="Ketik komentar..." style="flex:1; background:var(--glass); border:1px solid var(--glass-heavy); color:white; padding:12px; border-radius:12px">
                    <button id="btn-send" style="background:var(--primary); color:white; border:none; padding:10px 15px; border-radius:12px"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
            <button id="btn-close" style="width:100%; margin-top:20px; padding:10px; background:none; border:none; color:var(--text-dim)">Tutup</button>
        </div>
    </div>
`;

let px = new Array(1024).fill(null);
let tool = 'pencil'; let color = '#3b82f6'; let drawing = false; let activeId = null;
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

function render(c, d) { if(!c) return; c.clearRect(0,0,32,32); d.forEach((p, i) => { if(p) { c.fillStyle = p; c.fillRect(i%32, Math.floor(i/32), 1, 1); } }); }

onValue(ref(db, 'artworks'), snap => {
    const grid = document.getElementById('gallery-grid'); grid.innerHTML = '';
    if(!snap.exists()) { grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:50px;">Belum ada karya.</p>'; return; }
    Object.entries(snap.val()).reverse().forEach(([id, data]) => {
        const photo = data.authorPhoto || `https://ui-avatars.com/api/?name=${data.authorName}`;
        const div = document.createElement('div'); div.className = 'art-card';
        div.innerHTML = `
            <div class="canvas-container"><canvas id="c-${id}" width="32" height="32"></canvas></div>
            <div class="art-overlay">
                <b style="font-size:0.8rem">${data.title}</b>
                <div class="author-tag"><img src="${photo}"><span>${data.authorName}</span></div>
            </div>
        `;
        div.onclick = () => {
            activeId = id;
            document.getElementById('d-title').innerText = data.title;
            document.getElementById('d-meta').innerHTML = `<img src="${photo}" style="width:20px;border-radius:50%"> Oleh ${data.authorName}`;
            render(document.getElementById('detail-canvas').getContext('2d'), JSON.parse(data.pixels));
            document.getElementById('modal-detail').classList.add('open');
            loadComments(id);
        };
        grid.appendChild(div);
        render(document.getElementById(`c-${id}`).getContext('2d'), JSON.parse(data.pixels));
    });
});

function loadComments(id) {
    const l = document.getElementById('comment-list');
    onValue(ref(db, 'comments/'+id), s => {
        l.innerHTML = '';
        if(!s.exists()) { l.innerHTML = '<p style="opacity:0.3; font-size:0.8rem">Belum ada diskusi.</p>'; return; }
        s.forEach(c => {
            const v = c.val();
            l.innerHTML += `<div style="background:var(--glass); padding:8px; border-radius:10px; margin-bottom:8px; font-size:0.85rem"><b>${v.authorName}</b>: ${v.text}</div>`;
        });
    });
}

document.getElementById('btn-send').onclick = () => {
    const t = document.getElementById('inp-comment').value;
    if(!t || !auth.currentUser) return;
    push(ref(db, 'comments/'+activeId), { text: t, authorName: auth.currentUser.displayName });
    document.getElementById('inp-comment').value = '';
};

const draw = (e) => {
    if(!drawing) return;
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.floor((cx-r.left)*(32/r.width));
    const y = Math.floor((cy-r.top)*(32/r.height));
    if(x>=0 && x<32 && y>=0 && y<32) { px[y*32+x] = (tool === 'pencil') ? color : null; render(ctx, px); }
};
canvas.onmousedown = () => drawing = true; window.onmouseup = () => drawing = false; canvas.onmousemove = draw;
canvas.ontouchstart = (e) => { drawing=true; draw(e); }; canvas.ontouchmove = (e) => { e.preventDefault(); draw(e); };

document.getElementById('btn-new').onclick = () => { px.fill(null); render(ctx, px); document.getElementById('view-home').classList.remove('active'); document.getElementById('view-editor').classList.add('active'); };
document.getElementById('btn-close').onclick = () => document.getElementById('modal-detail').classList.remove('open');
document.getElementById('btn-login').onclick = () => signInWithPopup(auth, provider);
document.getElementById('color-picker').oninput = (e) => color = e.target.value;
document.getElementById('t-pencil').onclick = () => tool = 'pencil';
document.getElementById('t-eraser').onclick = () => tool = 'eraser';

onAuthStateChanged(auth, u => { if(u) { document.getElementById('u-name').innerText = u.displayName.split(' ')[0]; document.getElementById('u-avatar').src = u.photoURL; } });

document.getElementById('btn-save').onclick = () => {
    const t = prompt("Judul:"); if(!t || !auth.currentUser) return;
    push(ref(db, 'artworks'), {
        title: t, pixels: JSON.stringify(px),
        authorName: auth.currentUser.displayName,
        authorPhoto: auth.currentUser.photoURL
    }).then(() => location.reload());
};