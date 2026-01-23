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
                    <i class="fas fa-image"></i> Upload
                </button>
                <input type="file" id="file-upload" accept="image/*" style="display:none">
                <button id="btn-save" style="background:var(--primary); border:none; color:white; padding:10px 25px; border-radius:12px; font-weight:bold; cursor:pointer;">
                    <i class="fas fa-paper-plane"></i> Publish
                </button>
            </div>
            
            <div style="width:340px; height:340px; background:repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 50% / 20px 20px; border-radius:24px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <canvas id="main-canvas" width="32" height="32" style="width:100%;height:100%;image-rendering:pixelated"></canvas>
            </div>
            
            <div style="margin-top:25px; display:flex; gap:12px; background:var(--glass); padding:15px; border-radius:20px; border:1px solid var(--glass-heavy);">
                <input type="color" id="color-picker" value="#3b82f6" style="width:45px;height:45px;border:none;background:none;cursor:pointer;border-radius:10px;">
                <button id="t-pencil" style="background:var(--primary); border:none; color:white; width:45px; height:45px; border-radius:10px; cursor:pointer;">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button id="t-eraser" style="background:var(--glass-heavy); border:none; color:white; width:45px; height:45px; border-radius:10px; cursor:pointer;">
                    <i class="fas fa-eraser"></i>
                </button>
                <button id="t-bucket" style="background:var(--glass-heavy); border:none; color:white; width:45px; height:45px; border-radius:10px; cursor:pointer;">
                    <i class="fas fa-fill-drip"></i>
                </button>
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
                
                <h2 id="d-title" style="margin:20px 0 10px"></h2>
                <div id="d-meta" style="display:flex; align-items:center; gap:8px; color:var(--text-dim); font-size:0.9rem; margin-bottom:20px;"></div>
                
                <div style="border-top:1px solid var(--glass-heavy); padding-top:20px;">
                    <h3 style="margin:0 0 15px 0;"><i class="fas fa-comments"></i> Komentar</h3>
                    <div id="comment-list" style="margin-bottom:15px; max-height:300px; overflow-y:auto;"></div>
                    <div style="display:flex; gap:10px;">
                        <input id="inp-comment" placeholder="Tulis komentar..." style="flex:1; background:var(--glass); border:1px solid var(--glass-heavy); color:white; padding:12px; border-radius:12px;">
                        <button id="btn-send" style="background:var(--primary); color:white; border:none; padding:10px 20px; border-radius:12px; cursor:pointer;">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="toast" id="toast">Notifikasi</div>
`;

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function render(c, d) { 
    if(!c) return; 
    c.clearRect(0,0,32,32); 
    d.forEach((p, i) => { 
        if(p) { 
            c.fillStyle = p; 
            c.fillRect(i%32, Math.floor(i/32), 1, 1); 
        } 
    }); 
}

function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
}
window.backHome = () => switchView('home');

onAuthStateChanged(auth, u => {
    currentUser = u;
    if(u) {
        onValue(ref(db, 'users/' + u.uid), snap => {
            if(snap.exists()) {
                userProfile = snap.val();
            } else {
                userProfile = {
                    name: u.displayName || 'User-' + u.uid.slice(0,5),
                    photo: u.photoURL || `https://ui-avatars.com/api/?name=${u.uid}`,
                    bio: 'Anggota baru Givary'
                };
                update(ref(db, 'users/' + u.uid), userProfile);
            }
            updateUI();
        }, { onlyOnce: true });
    } else {
        userProfile = {};
        updateUI();
    }
});

function updateUI() {
    const name = currentUser ? (userProfile.name || 'User') : 'Login';
    const photo = currentUser ? (userProfile.photo || `https://ui-avatars.com/api/?name=Guest`) : 'https://ui-avatars.com/api/?name=Guest';
    document.getElementById('u-name').innerText = name;
    document.getElementById('u-avatar').src = photo;
}

document.getElementById('btn-login').onclick = () => {
    if(currentUser) {
        openProfileModal();
    } else {
        openModal('modal-login');
    }
};

document.getElementById('btn-google-login').onclick = () => {
    signInWithPopup(auth, provider)
        .then(() => {
            closeModal('modal-login');
            showToast('Login Berhasil');
        })
        .catch(e => showToast('Login Gagal: ' + e.message));
};

document.getElementById('btn-close-login').onclick = () => closeModal('modal-login');

function openProfileModal() {
    document.getElementById('profile-avatar').src = userProfile.photo || 'https://ui-avatars.com/api/?name=User';
    document.getElementById('inp-profile-name').value = userProfile.name || '';
    document.getElementById('inp-profile-bio').value = userProfile.bio || '';
    openModal('modal-profile');
}

document.getElementById('btn-save-profile').onclick = () => {
    if(!currentUser) return;
    const newName = document.getElementById('inp-profile-name').value.trim();
    const newBio = document.getElementById('inp-profile-bio').value.trim();
    if(!newName) {
        showToast('Nama tidak boleh kosong');
        return;
    }
    update(ref(db, 'users/' + currentUser.uid), {
        name: newName,
        bio: newBio,
        photo: userProfile.photo
    }).then(() => {
        showToast('Profil diupdate');
        closeModal('modal-profile');
    });
};

document.getElementById('btn-logout').onclick = () => {
    if(confirm('Keluar dari akun?')) {
        signOut(auth).then(() => {
            closeModal('modal-profile');
            showToast('Logout Berhasil');
        });
    }
};

document.getElementById('btn-close-profile').onclick = () => closeModal('modal-profile');

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

onValue(ref(db, 'artworks'), snap => {
    const grid = document.getElementById('gallery-grid'); 
    grid.innerHTML = '';
    if(!snap.exists()) { 
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:50px;">Belum ada karya</p>'; 
        return; 
    }
    const artworks = [];
    snap.forEach(child => {
        artworks.push({ id: child.key, ...child.val() });
    });
    artworks.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    artworks.forEach(data => {
        const photo = data.authorPhoto || `https://ui-avatars.com/api/?name=${data.authorName}`;
        const div = document.createElement('div'); 
        div.className = 'art-card';
        div.innerHTML = `
            <div class="canvas-container">
                <canvas id="c-${data.id}" width="32" height="32"></canvas>
            </div>
            <div class="art-overlay">
                <b style="font-size:0.85rem">${data.title || 'Untitled'}</b>
                <div class="author-tag">
                    <img src="${photo}">
                    <span>${data.authorName || 'Anonim'}</span>
                </div>
            </div>
        `;
        div.onclick = () => openDetailView(data);
        grid.appendChild(div);
        setTimeout(() => {
            const c = document.getElementById(`c-${data.id}`);
            if(c) render(c.getContext('2d'), JSON.parse(data.pixels));
        }, 10);
    });
});

function openDetailView(data) {
    activeId = data.id;
    document.getElementById('d-title').innerText = data.title || 'Untitled';
    const photo = data.authorPhoto || `https://ui-avatars.com/api/?name=${data.authorName}`;
    document.getElementById('d-meta').innerHTML = `
        <img src="${photo}" style="width:24px; height:24px; border-radius:50%;">
        <span>Oleh <b>${data.authorName || 'Anonim'}</b></span>
    `;
    const detailCanvas = document.getElementById('detail-canvas');
    render(detailCanvas.getContext('2d'), JSON.parse(data.pixels));
    switchView('detail');
    loadComments(data.id);
}

function loadComments(id) {
    const list = document.getElementById('comment-list');
    onValue(ref(db, 'comments/' + id), s => {
        list.innerHTML = '';
        if(!s.exists()) { 
            list.innerHTML = '<p style="opacity:0.3; font-size:0.85rem; padding:10px;">Belum ada komentar</p>'; 
            return; 
        }
        s.forEach(c => {
            const v = c.val();
            list.innerHTML += `
                <div style="background:var(--glass); padding:10px; border-radius:10px; margin-bottom:8px; font-size:0.85rem">
                    <b style="color:var(--primary)">${v.authorName}</b>: ${v.text}
                </div>
            `;
        });
    });
}

document.getElementById('btn-send').onclick = () => {
    const text = document.getElementById('inp-comment').value.trim();
    if(!text) return;
    if(!currentUser) {
        showToast('Login diperlukan');
        openModal('modal-login');
        return;
    }
    push(ref(db, 'comments/' + activeId), { 
        text, 
        authorName: userProfile.name || 'Anonim',
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('inp-comment').value = '';
        showToast('Terkirim');
    });
};

const draw = (e) => {
    if(!drawing) return;
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.floor((cx-r.left)*(32/r.width));
    const y = Math.floor((cy-r.top)*(32/r.height));
    if(x>=0 && x<32 && y>=0 && y<32) {
        const idx = y*32+x;
        if(tool === 'pencil') {
            px[idx] = color;
        } else if(tool === 'eraser') {
            px[idx] = null;
        } else if(tool === 'bucket') {
            floodFill(x, y, color);
            drawing = false;
        }
        render(ctx, px);
    }
};

function floodFill(x, y, newColor) {
    const idx = y*32+x;
    const targetColor = px[idx];
    if(targetColor === newColor) return;
    const stack = [idx];
    const visited = new Set();
    while(stack.length) {
        const i = stack.pop();
        if(visited.has(i)) continue;
        const cx = i % 32;
        const cy = Math.floor(i / 32);
        if(cx < 0 || cx >= 32 || cy < 0 || cy >= 32) continue;
        if(px[i] !== targetColor) continue;
        px[i] = newColor;
        visited.add(i);
        stack.push(i-1, i+1, i-32, i+32);
    }
}

canvas.onmousedown = (e) => { drawing=true; draw(e); }
window.onmouseup = () => drawing = false;
canvas.onmousemove = draw;
canvas.ontouchstart = (e) => { e.preventDefault(); drawing=true; draw(e); }
canvas.ontouchmove = (e) => { e.preventDefault(); draw(e); }
canvas.ontouchend = () => drawing = false;

document.getElementById('color-picker').oninput = (e) => {
    color = e.target.value;
    tool = 'pencil';
    updateToolButtons();
};

document.getElementById('t-pencil').onclick = () => {
    tool = 'pencil';
    updateToolButtons();
};

document.getElementById('t-eraser').onclick = () => {
    tool = 'eraser';
    updateToolButtons();
};

document.getElementById('t-bucket').onclick = () => {
    tool = 'bucket';
    updateToolButtons();
};

function updateToolButtons() {
    document.getElementById('t-pencil').style.background = tool === 'pencil' ? 'var(--primary)' : 'var(--glass-heavy)';
    document.getElementById('t-eraser').style.background = tool === 'eraser' ? 'var(--primary)' : 'var(--glass-heavy)';
    document.getElementById('t-bucket').style.background = tool === 'bucket' ? 'var(--primary)' : 'var(--glass-heavy)';
}

document.getElementById('btn-upload-img').onclick = () => {
    document.getElementById('file-upload').click();
};

document.getElementById('file-upload').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
            const temp = document.createElement('canvas');
            temp.width = 32;
            temp.height = 32;
            const tempCtx = temp.getContext('2d');
            tempCtx.drawImage(img, 0, 0, 32, 32);
            const imageData = tempCtx.getImageData(0, 0, 32, 32);
            const data = imageData.data;
            for(let i = 0; i < 1024; i++) {
                const r = data[i*4];
                const g = data[i*4+1];
                const b = data[i*4+2];
                const a = data[i*4+3];
                if(a > 128) {
                    px[i] = `#${((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1)}`;
                } else {
                    px[i] = null;
                }
            }
            render(ctx, px);
            showToast('Konversi Berhasil');
            e.target.value = '';
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
};

document.getElementById('btn-new').onclick = () => {
    px.fill(null);
    render(ctx, px);
    switchView('editor');
};

document.getElementById('btn-save').onclick = () => {
    if(!currentUser) {
        showToast('Login diperlukan');
        openModal('modal-login');
        return;
    }
    openModal('modal-publish');
};

document.getElementById('btn-publish').onclick = () => {
    const title = document.getElementById('inp-title').value.trim();
    const desc = document.getElementById('inp-desc').value.trim();
    if(!title) {
        showToast('Judul diperlukan');
        return;
    }
    push(ref(db, 'artworks'), {
        title,
        description: desc,
        pixels: JSON.stringify(px),
        authorName: userProfile.name || 'Anonim',
        authorPhoto: userProfile.photo || `https://ui-avatars.com/api/?name=${currentUser.uid}`,
        authorUid: currentUser.uid,
        timestamp: Date.now()
    }).then(() => {
        showToast('Berhasil Publish');
        closeModal('modal-publish');
        document.getElementById('inp-title').value = '';
        document.getElementById('inp-desc').value = '';
        switchView('home');
    });
};

document.getElementById('btn-cancel-publish').onclick = () => {
    closeModal('modal-publish');
};
