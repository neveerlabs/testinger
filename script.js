import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 3;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const starCount = 3000;
const starGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(starCount * 3);
const alphas = new Float32Array(starCount);
const offsets = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1500;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1500;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1500;
    alphas[i] = Math.random() * 0.5 + 0.4;
    offsets[i] = Math.random() * 6.28;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
starGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
starGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));

const starMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0.0 } },
    vertexShader: `
        attribute float alpha;
        attribute float offset;
        varying float vAlpha;
        varying float vOffset;
        void main() {
            vAlpha = alpha;
            vOffset = offset;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 1.8 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform float time;
        varying float vAlpha;
        varying float vOffset;
        void main() {
            float tw = sin(time + vOffset) * 0.2;
            float finalAlpha = clamp(vAlpha + tw, 0.0, 1.0);
            gl_FragColor = vec4(1.0, 1.0, 1.0, finalAlpha);
        }
    `,
    transparent: true
});

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x101010));

const textureLoader = new THREE.TextureLoader();
const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg'),
        bumpMap: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_bump.jpg'),
        bumpScale: 0.08,
        shininess: 0
    })
);
scene.add(moon);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    starMaterial.uniforms.time.value = time;
    moon.rotation.y += 0.001;
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const audioAlarm = new Audio('/sound/alarm.mp3');
const audioAdzan = new Audio('/sound/adzan.mp3');
audioAlarm.volume = 1.0;
audioAdzan.volume = 1.0;

let musicPlaylist = [];
let currentTrackIndex = -1;
let musicAudio = new Audio();
let isMusicPlaying = false;
let wasPlayingBeforeAdhan = false;

const trackNameEl = document.getElementById('track-name');
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseIcon = playPauseBtn.querySelector('i');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const notificationBox = document.getElementById('notification-box');
const notificationMsg = document.getElementById('notification-message');
const closeNotif = document.getElementById('close-notification');

let currentLocation = { lat: -6.2088, lon: 106.8456 };
let prayerTimings = {};
let prayerTimeouts = [];

closeNotif.addEventListener('click', () => notificationBox.classList.add('hidden'));

function showNotification(message) {
    notificationMsg.textContent = message;
    notificationBox.classList.remove('hidden');
}

function pauseMusic() {
    if (musicAudio && !musicAudio.paused) {
        musicAudio.pause();
        isMusicPlaying = false;
        playPauseIcon.className = 'fas fa-play';
    }
}

function resumeMusic() {
    if (musicAudio.src && currentTrackIndex !== -1) {
        musicAudio.play().catch(() => {});
        isMusicPlaying = true;
        playPauseIcon.className = 'fas fa-pause';
    }
}

function playTrack(index) {
    if (!musicPlaylist.length || index < 0 || index >= musicPlaylist.length) return;
    currentTrackIndex = index;
    const url = musicPlaylist[currentTrackIndex].url;
    const name = musicPlaylist[currentTrackIndex].name;
    musicAudio.src = url;
    musicAudio.load();
    musicAudio.play().then(() => {
        isMusicPlaying = true;
        playPauseIcon.className = 'fas fa-pause';
        trackNameEl.textContent = name;
    }).catch(() => {});
}

musicAudio.addEventListener('ended', () => {
    if (currentTrackIndex < musicPlaylist.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else {
        isMusicPlaying = false;
        playPauseIcon.className = 'fas fa-play';
        trackNameEl.textContent = '—  selesai  —';
    }
});

playPauseBtn.addEventListener('click', () => {
    if (!musicPlaylist.length) return;
    if (isMusicPlaying) {
        musicAudio.pause();
        isMusicPlaying = false;
        playPauseIcon.className = 'fas fa-play';
    } else {
        if (musicAudio.src) {
            musicAudio.play().catch(() => {});
            isMusicPlaying = true;
            playPauseIcon.className = 'fas fa-pause';
        } else if (musicPlaylist.length) {
            playTrack(0);
        }
    }
});

prevBtn.addEventListener('click', () => {
    if (musicPlaylist.length && currentTrackIndex > 0) playTrack(currentTrackIndex - 1);
});

nextBtn.addEventListener('click', () => {
    if (musicPlaylist.length && currentTrackIndex < musicPlaylist.length - 1) playTrack(currentTrackIndex + 1);
});

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const url = URL.createObjectURL(file);
        musicPlaylist.push({ url, name: file.name });
    });
    if (!isMusicPlaying && !musicAudio.src) playTrack(0);
});

function setVolumeMaxAndPauseForAlarm() {
    pauseMusic();
    audioAlarm.volume = 1.0;
    audioAlarm.play().catch(() => {});
    showNotification('⏰ alarm • '.concat(new Date().toLocaleTimeString('id')));
}

function handleAdhan(prayerName) {
    wasPlayingBeforeAdhan = isMusicPlaying;
    pauseMusic();
    audioAdzan.volume = 1.0;
    audioAdzan.play().catch(() => {});
    showNotification('🕋 waktu sholat • '.concat(prayerName));
}

audioAdzan.addEventListener('ended', () => {
    if (wasPlayingBeforeAdhan) resumeMusic();
});

async function fetchPrayerTimes(lat, lon) {
    const date = new Date();
    const res = await fetch(`https://api.aladhan.com/v1/timings/${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}?latitude=${lat}&longitude=${lon}&method=2`);
    const data = await res.json();
    return data.data.timings;
}

function schedulePrayerEvents(timings) {
    prayerTimeouts.forEach(clearTimeout);
    prayerTimeouts = [];
    const now = new Date();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    prayers.forEach(name => {
        const timeStr = timings[name];
        if (!timeStr) return;
        const [h, m] = timeStr.split(':').map(Number);
        const prayerDate = new Date(now);
        prayerDate.setHours(h, m, 0, 0);
        if (prayerDate < now) prayerDate.setDate(prayerDate.getDate() + 1);
        const adhanTime = prayerDate.getTime();
        const alarmTime = adhanTime - 10 * 60 * 1000;
        const nowTime = now.getTime();
        if (alarmTime > nowTime) {
            prayerTimeouts.push(setTimeout(() => {
                setVolumeMaxAndPauseForAlarm();
            }, alarmTime - nowTime));
        }
        if (adhanTime > nowTime) {
            prayerTimeouts.push(setTimeout(() => {
                handleAdhan(name);
            }, adhanTime - nowTime));
        }
    });
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    prayerTimeouts.push(setTimeout(() => {
        fetchAndSchedule();
    }, midnight.getTime() - nowTime));
}

function updateNextPrayerUI(timings) {
    const now = new Date();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let next = null;
    let nextName = '';
    for (let name of prayers) {
        const timeStr = timings[name];
        if (!timeStr) continue;
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        if (d < now) d.setDate(d.getDate() + 1);
        if (!next || d < next) {
            next = d;
            nextName = name;
        }
    }
    if (next) {
        const diff = next - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        document.getElementById('next-prayer').innerHTML = `${nextName} <span style="opacity:0.8;">•</span> ${next.toLocaleTimeString('id', {hour:'2-digit', minute:'2-digit'})}`;
        document.getElementById('countdown').textContent = `${hours}j ${minutes}m`;
    }
}

async function fetchAndSchedule() {
    try {
        const timings = await fetchPrayerTimes(currentLocation.lat, currentLocation.lon);
        prayerTimings = timings;
        schedulePrayerEvents(timings);
        updateNextPrayerUI(timings);
    } catch {
        document.getElementById('next-prayer').textContent = 'jadwal tidak tersedia';
    }
}

function getLocationAndFetch() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                currentLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                fetchAndSchedule();
            },
            () => {
                fetch('https://ipapi.co/json/')
                    .then(r => r.json())
                    .then(d => {
                        if (d.latitude && d.longitude) {
                            currentLocation = { lat: d.latitude, lon: d.longitude };
                            fetchAndSchedule();
                        } else fetchAndSchedule();
                    })
                    .catch(() => fetchAndSchedule());
            }
        );
    } else fetchAndSchedule();
}

document.getElementById('refresh-location').addEventListener('click', getLocationAndFetch);
getLocationAndFetch();
setInterval(() => {
    if (prayerTimings) updateNextPrayerUI(prayerTimings);
}, 1000);