/* ===================================================================
   4K Downscroller Rhythm Game Engine (Web Edition)
   Ported & Enhanced for Fengtao Wang's Personal Portfolio
   Based on: https://github.com/asdfaqer/4k-downscroller
   
   Features:
   - 4-Lane High Performance Core Engine (D, F, J, K)
   - Dynamic Note Rendering (Rounded rectangles + translucent Hold trails)
   - Web Audio API Sound Synthesizer (Synth-wave beat & hit claps)
   - Real-time Accuracy System (PERFECT, GREAT, GOOD, MISS)
   - Dynamic Combo Counter & Score Tracker
   - Confetti Victory Celebration
   =================================================================== */

class RhythmGameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Engine State
    this.isPlaying = false;
    this.isPaused = false;
    this.songTime = 0;
    this.songDuration = 45; // 45 seconds demo track
    this.bpm = 138;
    this.speed = 460; // Pixels per second downscroll speed
    this.hitLineY = 0;
    
    // Lanes configuration (4K: D, F, J, K)
    this.lanes = [
      { key: 'd', keyCode: 'KeyD', label: 'D', x: 0, width: 0, active: false },
      { key: 'f', keyCode: 'KeyF', label: 'F', x: 0, width: 0, active: false },
      { key: 'j', keyCode: 'KeyJ', label: 'J', x: 0, width: 0, active: false },
      { key: 'k', keyCode: 'KeyK', label: 'K', x: 0, width: 0, active: false }
    ];
    
    // Notes & Timing
    this.notes = [];
    this.hitJudgments = [];
    this.confettiParticles = [];
    
    // Scoring & Stats
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.greatCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.totalNotes = 0;
    
    // Audio Context
    this.audioCtx = null;
    this.nextBeatTime = 0;
    this.beatIndex = 0;
    
    // Bindings
    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.loop = this.loop.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    // Mobile Touch buttons
    document.querySelectorAll('.mobile-lane-btn').forEach((btn, index) => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerLanePress(index);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.triggerLaneRelease(index);
      });
      btn.addEventListener('mousedown', () => this.triggerLanePress(index));
      btn.addEventListener('mouseup', () => this.triggerLaneRelease(index));
    });
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.width = rect.width;
    this.height = rect.height;
    this.hitLineY = this.height - 85;
    
    // Lane width calculation
    const laneW = this.width / 4;
    for (let i = 0; i < 4; i++) {
      this.lanes[i].x = i * laneW;
      this.lanes[i].width = laneW;
    }
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSynthNote(freq, type = 'sine', duration = 0.12, gainLevel = 0.15) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(gainLevel, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  playHitSound() {
    this.playSynthNote(880, 'triangle', 0.08, 0.25);
  }

  playMissSound() {
    this.playSynthNote(160, 'sawtooth', 0.15, 0.15);
  }

  generateBeatmap() {
    this.notes = [];
    const beatInterval = 60 / this.bpm;
    const totalBeats = Math.floor(this.songDuration / beatInterval);
    
    // Procedural rhythm generation (featuring syncopated rhythms & hold notes)
    for (let b = 4; b < totalBeats - 2; b++) {
      // 1/2 beat divisions
      for (let sub = 0; sub < 2; sub++) {
        const time = (b + sub * 0.5) * beatInterval;
        
        // Probability of note on this division
        const isDownbeat = (sub === 0);
        const chance = isDownbeat ? 0.75 : 0.4;
        
        if (Math.random() < chance) {
          const lane = Math.floor(Math.random() * 4);
          
          // Occasional hold notes (translucent sky-blue bodies)
          const isHold = Math.random() < 0.25 && isDownbeat;
          const duration = isHold ? beatInterval * (Math.random() < 0.5 ? 1 : 1.5) : 0;
          
          this.notes.push({
            id: `${b}-${sub}-${lane}`,
            lane: lane,
            time: time,
            duration: duration,
            hit: false,
            holding: false,
            missed: false,
            active: true
          });
        }
      }
    }
    this.totalNotes = this.notes.length;
  }

  start() {
    this.initAudio();
    this.generateBeatmap();
    
    this.isPlaying = true;
    this.isPaused = false;
    this.songTime = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.greatCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.hitJudgments = [];
    this.confettiParticles = [];
    
    document.getElementById('gameOverlay').classList.add('hidden');
    this.updateStatsDisplay();
    
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  handleKeyDown(e) {
    if (!this.isPlaying) return;
    const key = e.key.toLowerCase();
    const laneIndex = this.lanes.findIndex(l => l.key === key);
    if (laneIndex !== -1 && !this.lanes[laneIndex].active) {
      this.triggerLanePress(laneIndex);
    }
  }

  handleKeyUp(e) {
    if (!this.isPlaying) return;
    const key = e.key.toLowerCase();
    const laneIndex = this.lanes.findIndex(l => l.key === key);
    if (laneIndex !== -1) {
      this.triggerLaneRelease(laneIndex);
    }
  }

  triggerLanePress(laneIndex) {
    this.lanes[laneIndex].active = true;
    
    // Find closest unhit note in this lane
    const windowSeconds = 0.16; // Hit tolerance window
    let bestNote = null;
    let minDiff = Infinity;
    
    for (const note of this.notes) {
      if (note.lane === laneIndex && !note.hit && !note.missed) {
        const diff = Math.abs(note.time - this.songTime);
        if (diff < windowSeconds && diff < minDiff) {
          minDiff = diff;
          bestNote = note;
        }
      }
    }
    
    if (bestNote) {
      bestNote.hit = true;
      if (bestNote.duration > 0) {
        bestNote.holding = true;
      }
      this.registerJudgment(minDiff, laneIndex);
      this.playHitSound();
    }
  }

  triggerLaneRelease(laneIndex) {
    this.lanes[laneIndex].active = false;
    for (const note of this.notes) {
      if (note.lane === laneIndex && note.holding) {
        note.holding = false;
      }
    }
  }

  registerJudgment(diff, laneIndex) {
    let text = 'MISS';
    let color = '#ff4d6d';
    let pts = 0;
    
    if (diff <= 0.045) {
      text = 'PERFECT';
      color = '#98E8DE'; // Aqua Glow
      pts = 1000;
      this.perfectCount++;
      this.combo++;
    } else if (diff <= 0.09) {
      text = 'GREAT';
      color = '#45A9A9'; // Ocean Teal
      pts = 650;
      this.greatCount++;
      this.combo++;
    } else if (diff <= 0.14) {
      text = 'GOOD';
      color = '#8e79db';
      pts = 300;
      this.goodCount++;
      this.combo++;
    } else {
      text = 'MISS';
      color = '#ff4d6d';
      pts = 0;
      this.missCount++;
      this.combo = 0;
    }
    
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    
    this.score += pts + this.combo * 15;
    
    // Add judgment popup
    this.hitJudgments.push({
      text: text,
      color: color,
      lane: laneIndex,
      y: this.hitLineY - 40,
      opacity: 1,
      scale: 1.3
    });
    
    this.updateStatsDisplay();
  }

  updateStatsDisplay() {
    const scoreEl = document.getElementById('gameScore');
    const comboEl = document.getElementById('gameCombo');
    const accEl = document.getElementById('gameAcc');
    
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
    if (comboEl) comboEl.textContent = this.combo;
    
    const judgedTotal = this.perfectCount + this.greatCount + this.goodCount + this.missCount;
    if (judgedTotal > 0 && accEl) {
      const acc = ((this.perfectCount * 100 + this.greatCount * 70 + this.goodCount * 40) / (judgedTotal * 100)) * 100;
      accEl.textContent = `${acc.toFixed(1)}%`;
    }
  }

  spawnConfetti() {
    const colors = ['#98E8DE', '#45A9A9', '#4E1F6E', '#3E3E75', '#ffffff'];
    for (let i = 0; i < 80; i++) {
      this.confettiParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * -this.height * 0.5,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8
      });
    }
  }

  endGame() {
    this.isPlaying = false;
    this.spawnConfetti();
    
    const overlay = document.getElementById('gameOverlay');
    const title = document.getElementById('gameOverlayTitle');
    const desc = document.getElementById('gameOverlayDesc');
    const startBtn = document.getElementById('gameStartBtn');
    
    title.innerHTML = 'STAGE <span>CLEAR!</span>';
    desc.innerHTML = `High Score: <strong>${this.score.toLocaleString()}</strong><br>Max Combo: <strong>${this.maxCombo}</strong> | Perfect: <strong>${this.perfectCount}</strong>`;
    startBtn.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  loop(timestamp) {
    if (!this.isPlaying) {
      // Continue rendering confetti if any remain
      if (this.confettiParticles.length > 0) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawConfetti();
        requestAnimationFrame(this.loop);
      }
      return;
    }
    
    const dt = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    this.songTime += dt;
    
    // Background rhythmic synthesizer beat
    const beatInterval = 60 / this.bpm;
    if (this.songTime >= this.nextBeatTime) {
      const freq = (this.beatIndex % 4 === 0) ? 140 : 80;
      this.playSynthNote(freq, 'triangle', 0.09, 0.2);
      this.beatIndex++;
      this.nextBeatTime += beatInterval;
    }
    
    // Check song finish
    if (this.songTime >= this.songDuration) {
      this.endGame();
      return;
    }
    
    // Update & Render
    this.updateNotes();
    this.draw();
    
    requestAnimationFrame(this.loop);
  }

  updateNotes() {
    for (const note of this.notes) {
      if (!note.hit && !note.missed && this.songTime > note.time + 0.16) {
        note.missed = true;
        this.missCount++;
        this.combo = 0;
        this.hitJudgments.push({
          text: 'MISS',
          color: '#ff4d6d',
          lane: note.lane,
          y: this.hitLineY - 40,
          opacity: 1,
          scale: 1.1
        });
        this.playMissSound();
        this.updateStatsDisplay();
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 1. Draw 4 Lanes
    for (let i = 0; i < 4; i++) {
      const lane = this.lanes[i];
      
      // Lane background sheen
      if (lane.active) {
        this.ctx.fillStyle = 'rgba(152, 232, 222, 0.12)';
        this.ctx.fillRect(lane.x, 0, lane.width, this.height);
      }
      
      // Divider line
      if (i > 0) {
        this.ctx.strokeStyle = 'rgba(62, 62, 117, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(lane.x, 0);
        this.ctx.lineTo(lane.x, this.height);
        this.ctx.stroke();
      }
      
      // Lane key target at bottom
      const padY = this.hitLineY;
      this.ctx.fillStyle = lane.active ? 'rgba(152, 232, 222, 0.4)' : 'rgba(62, 62, 117, 0.25)';
      this.ctx.strokeStyle = lane.active ? '#98E8DE' : 'rgba(152, 232, 222, 0.2)';
      this.ctx.lineWidth = lane.active ? 2 : 1;
      
      this.drawRoundedRect(lane.x + 6, padY - 8, lane.width - 12, 16, 6, true, true);
      
      // Key label
      this.ctx.fillStyle = lane.active ? '#98E8DE' : 'rgba(255, 255, 255, 0.5)';
      this.ctx.font = '600 13px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(lane.label, lane.x + lane.width / 2, this.height - 35);
    }
    
    // 2. Hit Judgment Line
    this.ctx.strokeStyle = 'rgba(152, 232, 222, 0.7)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.hitLineY);
    this.ctx.lineTo(this.width, this.hitLineY);
    this.ctx.stroke();
    
    // 3. Falling Notes
    for (const note of this.notes) {
      if (note.missed) continue;
      
      const timeDiff = note.time - this.songTime;
      const noteY = this.hitLineY - (timeDiff * this.speed);
      
      // Draw Hold Note Body if applicable
      if (note.duration > 0) {
        const holdHeight = note.duration * this.speed;
        const tailY = noteY - holdHeight;
        
        if (noteY > -50 && tailY < this.height + 50) {
          const lane = this.lanes[note.lane];
          const bodyW = lane.width - 24;
          const bodyX = lane.x + 12;
          
          // Translucent sky-blue / aqua hold body
          const grad = this.ctx.createLinearGradient(0, tailY, 0, noteY);
          grad.addColorStop(0, 'rgba(69, 169, 169, 0.35)');
          grad.addColorStop(1, 'rgba(152, 232, 222, 0.75)');
          
          this.ctx.fillStyle = grad;
          this.ctx.fillRect(bodyX, tailY, bodyW, holdHeight);
          
          // Hold border glow
          this.ctx.strokeStyle = '#98E8DE';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(bodyX, tailY, bodyW, holdHeight);
        }
      }
      
      // Normal Note Head
      if (noteY > -30 && noteY < this.height + 50 && !note.hit) {
        const lane = this.lanes[note.lane];
        const noteW = lane.width - 16;
        const noteH = 18;
        const noteX = lane.x + 8;
        
        // Rounded rectangle for modern aesthetic (as in 4k-downscroller)
        this.ctx.fillStyle = (note.lane === 1 || note.lane === 2) ? '#98E8DE' : '#45A9A9';
        this.ctx.shadowColor = '#98E8DE';
        this.ctx.shadowBlur = 10;
        this.drawRoundedRect(noteX, noteY - noteH / 2, noteW, noteH, 6, true, false);
        this.ctx.shadowBlur = 0;
      }
    }
    
    // 4. Hit Judgments & Popups
    for (let j = this.hitJudgments.length - 1; j >= 0; j--) {
      const item = this.hitJudgments[j];
      const lane = this.lanes[item.lane];
      
      this.ctx.save();
      this.ctx.globalAlpha = item.opacity;
      this.ctx.fillStyle = item.color;
      this.ctx.font = `800 ${18 * item.scale}px Outfit, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = item.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillText(item.text, lane.x + lane.width / 2, item.y);
      this.ctx.restore();
      
      item.y -= 0.8;
      item.opacity -= 0.035;
      item.scale = Math.max(1, item.scale - 0.02);
      
      if (item.opacity <= 0) {
        this.hitJudgments.splice(j, 1);
      }
    }
  }

  drawConfetti() {
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
      
      if (p.y > this.height + 20) {
        this.confettiParticles.splice(i, 1);
      }
    }
  }

  drawRoundedRect(x, y, width, height, radius, fill, stroke) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    if (fill) this.ctx.fill();
    if (stroke) this.ctx.stroke();
  }
}

// Global initialization hook
window.initRhythmGame = () => {
  const engine = new RhythmGameEngine('gameCanvas');
  const startBtn = document.getElementById('gameStartBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      engine.start();
    });
  }
};
