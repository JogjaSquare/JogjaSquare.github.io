const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.08);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambient = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambient);

const flashlight = new THREE.SpotLight(0xffffff, 4, 30, Math.PI/7, 0.5);
flashlight.castShadow = true;
camera.add(flashlight);
camera.add(flashlight.target);
flashlight.target.position.set(0, 0, -1);
scene.add(camera);

// --- PROCEDURAL WOOD FLOOR TEXTURE ---
function createWoodTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const c = canvas.getContext('2d');
    c.fillStyle = '#3a2613'; c.fillRect(0,0,512,512);
    for(let i=0; i<512; i+=40) {
        c.strokeStyle = '#2a1a0a'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, i); c.lineTo(512, i); c.stroke();
    }
    for(let i=0; i<500; i++) {
        c.fillStyle = '#221100'; c.globalAlpha = 0.1;
        c.fillRect(Math.random()*512, Math.random()*512, 10, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(15, 15);
    return tex;
}

// --- BUILDING THE WORLD ---
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshStandardMaterial({map: createWoodTexture()}));
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const map = [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,2,1],
    [1,0,1,1,1,1,0,1,1,1],
    [1,0,0,0,2,1,0,0,0,1],
    [1,1,1,0,1,1,1,1,0,1],
    [1,2,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,2,1],
    [1,0,0,0,2,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1]
];

const walls = [], blocks = [];
map.forEach((row, z) => {
    row.forEach((type, x) => {
        const px = (x - 5) * 8; const pz = (z - 4) * 8;
        if(type === 1) {
            const w = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 8), wallMat);
            w.position.set(px, 6, pz); scene.add(w); walls.push(w);
        } else if(type === 2) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({color: 0x00ffff, emissive: 0x00ffff}));
            b.position.set(px, 1, pz); scene.add(b); blocks.push(b);
        }
    });
});

// --- ADVANCED BLUE MODEL (WITH ARMS) ---
const blue = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 3), new THREE.MeshStandardMaterial({color: 'blue'}));
const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 6), new THREE.MeshStandardMaterial({color: 'yellow'}));
crown.position.y = 2.5;

// Tangan Panjang
const armGeo = new THREE.CapsuleGeometry(0.3, 2.5);
const leftArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({color: 'blue'}));
leftArm.position.set(-1.5, 0.5, 0.5); leftArm.rotation.z = 0.2;
const rightArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({color: 'blue'}));
rightArm.position.set(1.5, 0.5, 0.5); rightArm.rotation.z = -0.2;

blue.add(body, crown, leftArm, rightArm);
blue.position.set(20, 2, 20);
scene.add(blue);

// --- GAME LOGIC ---
let isPlaying = false, isBox = false, score = 0, stamina = 100;
const input = { x: 0, y: 0 };
camera.position.set(-20, 3, -15);

function update() {
    requestAnimationFrame(update);
    if(!isPlaying) return;

    if(!isBox) {
        camera.rotation.y += input.x * 0.04;
        camera.translateZ(-input.y * 0.15);
        // Head bobbing
        if(input.y !== 0) camera.position.y = 3 + Math.sin(Date.now() * 0.01) * 0.1;
    }

    // AI Blue
    if(!isBox) {
        const dir = new THREE.Vector3().subVectors(camera.position, blue.position).normalize();
        blue.position.addScaledVector(dir, 0.07);
        blue.lookAt(camera.position.x, 2, camera.position.z);
        // Animasi Tangan (Swaying)
        leftArm.rotation.x = Math.sin(Date.now()*0.005) * 0.5;
        rightArm.rotation.x = Math.cos(Date.now()*0.005) * 0.5;
    }

    // Check Jumpscare
    if(camera.position.distanceTo(blue.position) < 3 && !isBox) {
        isPlaying = false;
        alert("BLUE CAUGHT YOU!"); location.reload();
    }

    // Collection
    blocks.forEach(b => {
        if(b.visible && camera.position.distanceTo(b.position) < 2) {
            b.visible = false; score++;
            document.getElementById('count').innerText = score;
            if(score >= 5) { alert("YOU WON!"); location.reload(); }
        }
    });

    renderer.render(scene, camera);
}

// --- CONTROLS ---
const joy = document.getElementById('joy-container'), stick = document.getElementById('joy-stick');
joy.addEventListener('touchstart', e => e.preventDefault());
window.addEventListener('touchmove', e => {
    const t = e.touches[0], r = joy.getBoundingClientRect();
    const dx = t.clientX - (r.left + 55), dy = t.clientY - (r.top + 55);
    const d = Math.min(Math.hypot(dx, dy), 45);
    const a = Math.atan2(dy, dx);
    input.x = -Math.cos(a + Math.PI/2) * (d/45);
    input.y = -Math.sin(a + Math.PI/2) * (d/45);
    stick.style.transform = `translate(${Math.cos(a)*d}px, ${Math.sin(a)*d}px)`;
});
window.addEventListener('touchend', () => { input.x = 0; input.y = 0; stick.style.transform = ''; });

document.getElementById('btn-box').onclick = () => {
    isBox = !isBox;
    document.getElementById('btn-box').style.background = isBox ? '#521' : '#852';
};

document.getElementById('start-btn').onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    isPlaying = true; update();
};
