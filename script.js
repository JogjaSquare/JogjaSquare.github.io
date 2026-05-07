const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Inisialisasi Ukuran Layar
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- KONFIGURASI GAME ---
let isPlaying = false;
let currentChapter = 0;
let isBoxing = false;
let isRunning = false;
const input = { dx: 0, dy: 0, active: false };

const config = [
    { 
        ch: 1, name: "RED", task: "CARI BLOK", goal: 5, 
        col: "#0066ff", monster: "BLUE", monCol: "blue",
        msg: "Selamat datang di Odd World. Kumpulkan 5 blok biru sebelum Blue menemukanmu!" 
    },
    { 
        ch: 2, name: "TECHNICIAN", task: "CARI BATERAI", goal: 8, 
        col: "#ffff00", monster: "GREEN", monCol: "green",
        msg: "Bagus! Sekarang cari 8 baterai kuning. Hati-hati, Green punya tangan yang panjang!" 
    }
];

// --- KELAS ENTITAS ---
class Player {
    constructor() {
        this.x = 0; this.y = 0;
        this.stamina = 100;
        this.score = 0;
    }
    update() {
        if (isBoxing) return; // Player tidak bisa jalan saat di dalam box
        
        let speed = isRunning && this.stamina > 0 ? 8 : 4.5;
        this.x += input.dx * speed;
        this.y += input.dy * speed;

        // Atur Stamina
        if (isRunning && (input.dx !== 0 || input.dy !== 0)) {
            this.stamina = Math.max(0, this.stamina - 0.7);
        } else {
            this.stamina = Math.min(100, this.stamina + 0.4);
        }
        document.getElementById('stamina-fill').style.width = this.stamina + "%";
    }
}

class Monster {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.x = 1000; this.y = 1000; // Mulai jauh dari player
        this.speed = name === "BLUE" ? 4 : 5;
    }
    update(p) {
        let dist = Math.hypot(p.x - this.x, p.y - this.y);
        
        // AI: Mengejar jika player tidak sembunyi
        if (!isBoxing && dist < 1200) {
            let angle = Math.atan2(p.y - this.y, p.x - this.x);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        } else {
            // Patroli acak jika player sembunyi
            this.x += Math.sin(Date.now() / 1000) * 2;
            this.y += Math.cos(Date.now() / 1000) * 2;
        }

        // Cek Jumpscare
        if (dist < 50 && !isBoxing) triggerJumpscare();
    }
}

const p = new Player();
let monster = null;
let items = [];

// --- LOGIKA UTAMA ---
function initLevel() {
    const data = config[currentChapter];
    isPlaying = false;
    
    // Tampilkan Dialog
    const diag = document.getElementById('dialogue-container');
    diag.style.display = 'block';
    document.getElementById('speaker-name').innerText = data.name;
    document.getElementById('message').innerText = data.msg;

    diag.onclick = () => {
        diag.style.display = 'none';
        p.x = 0; p.y = 0; p.score = 0;
        monster = new Monster(data.monster, data.monCol);
        
        // Sebar Item
        items = Array.from({length: data.goal}, () => ({
            x: (Math.random() - 0.5) * 3000,
            y: (Math.random() - 0.5) * 3000,
            active: true
        }));
        
        updateUI();
        isPlaying = true;
    };
}

function updateUI() {
    const data = config[currentChapter];
    document.getElementById('info-ch').innerText = "CHAPTER " + data.ch;
    document.getElementById('info-task').innerText = data.task;
    document.getElementById('info-progress').innerText = `DIKUMPULKAN: ${p.score} / ${data.goal}`;
}

function triggerJumpscare() {
    isPlaying = false;
    document.getElementById('jumpscare').style.display = 'flex';
    setTimeout(() => location.reload(), 3000);
}

function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isPlaying) {
        const camX = canvas.width / 2 - p.x;
        const camY = canvas.height / 2 - p.y;

        // Gambar Lantai (Grid Horor)
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        for (let x = -2000; x <= 2000; x += 150) {
            ctx.beginPath();
            ctx.moveTo(x + camX, -2000 + camY);
            ctx.lineTo(x + camX, 2000 + camY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-2000 + camX, x + camY);
            ctx.lineTo(2000 + camX, x + camY);
            ctx.stroke();
        }

        p.update();

        // Render & Cek Item
        items.forEach(it => {
            if (it.active) {
                ctx.fillStyle = config[currentChapter].col;
                ctx.shadowBlur = 15; ctx.shadowColor = config[currentChapter].col;
                ctx.fillRect(it.x + camX - 25, it.y + camY - 25, 50, 50);
                ctx.shadowBlur = 0;

                if (Math.hypot(p.x - it.x, p.y - it.y) < 60) {
                    it.active = false;
                    p.score++;
                    updateUI();
                    if (p.score >= config[currentChapter].goal) {
                        currentChapter++;
                        if (currentChapter < config.length) initLevel();
                        else { alert("SELAMAT! KAMU MENANG!"); location.reload(); }
                    }
                }
            }
        });

        // Render Monster
        if (monster) {
            monster.update(p);
            ctx.fillStyle = monster.color;
            ctx.beginPath();
            ctx.arc(monster.x + camX, monster.y + camY, 45, 0, Math.PI * 2);
            ctx.fill();
            // Mata Berkilau
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(monster.x + camX - 15, monster.y + camY - 10, 12, 0, Math.PI * 2);
            ctx.arc(monster.x + camX + 15, monster.y + camY - 10, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render Player (Box Mode)
        ctx.fillStyle = isBoxing ? "#5d4037" : "#00ff00";
        if (isBoxing) {
            ctx.fillRect(canvas.width / 2 - 30, canvas.height / 2 - 30, 60, 60);
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 4;
            ctx.strokeRect(canvas.width / 2 - 30, canvas.height / 2 - 30, 60, 60);
        } else {
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    requestAnimationFrame(draw);
}

// --- SISTEM KONTROL ---
const base = document.getElementById('joystick-base');
const knob = document.getElementById('joystick-knob');

base.addEventListener('touchstart', (e) => { e.preventDefault(); input.active = true; });
window.addEventListener('touchmove', (e) => {
    if (!input.active) return;
    const t = e.touches[0];
    const r = base.getBoundingClientRect();
    const cx = r.left + 65, cy = r.top + 65;
    let dist = Math.hypot(t.clientX - cx, t.clientY - cy);
    let ang = Math.atan2(t.clientY - cy, t.clientX - cx);
    let m = Math.min(dist, 50);
    input.dx = Math.cos(ang) * (m / 50);
    input.dy = Math.sin(ang) * (m / 50);
    knob.style.transform = `translate(${Math.cos(ang)*m}px, ${Math.sin(ang)*m}px)`;
});
window.addEventListener('touchend', () => {
    input.active = false; input.dx = 0; input.dy = 0;
    knob.style.transform = "translate(0,0)";
});

document.getElementById('btn-run').ontouchstart = (e) => { e.preventDefault(); isRunning = true; };
document.getElementById('btn-run').ontouchend = () => isRunning = false;
document.getElementById('btn-box').ontouchstart = (e) => { e.preventDefault(); isBoxing = true; };
document.getElementById('btn-box').ontouchend = () => isBoxing = false;

document.getElementById('start-btn').onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    initLevel();
};

draw();
