class XOXGame {
    constructor() {
        this.apiUrl = "https://xox-update.onrender.com";
        this.playerName = 'Misafir' + Math.floor(Math.random() * 1000);
        this.currentPage = 'rooms';
        this.allRooms = [];
        this.pollingErrorCount = 0;
        this.init();
    }

    init() {
        if (!window.location.hostname.includes('cheatglobal.com')) return;
        this.createGameUI();
        this.extractPlayerName();
        this.setupEventListeners();
        this.startRoomMonitoring();
    }

    createGameUI() {
        const panel = document.createElement('div');
        panel.id = 'xox-game-panel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="xox-header">
                <span class="xox-title">CG XOX OYUNU</span>
                <span class="xox-username"></span>
                <button id="close-panel-btn">×</button>
            </div>
            <div class="xox-nav">
                <button class="nav-btn active" data-page="rooms">Odalar</button>
                <button class="nav-btn" data-page="create">Oda Oluştur</button>
                <button class="nav-btn" data-page="stats">İstatistik</button>
                <button class="nav-btn" data-page="game" id="game-nav" style="display:none">Oyun</button>
            </div>
            <div class="xox-content">
                <div id="page-rooms" class="page active"><div id="rooms-list" class="rooms-list"></div></div>
                <div id="page-create" class="page">
                    <div class="create-room-form">
                        <h3>Yeni Oda Oluştur</h3>
                        <div class="form-group"><label>Kaç el oynanacak? (max 10)</label><input type="number" id="max-rounds" min="1" max="10" value="1"></div>
                        <button id="create-room-btn">Oda Oluştur</button>
                    </div>
                </div>
                <div id="page-stats" class="page"><div id="stats-content">Yükleniyor...</div></div>
                <div id="page-game" class="page">
                    <div class="game-container"><div id="game-info"></div><div id="game-board" class="game-board"></div><div id="game-status"></div></div>
                </div>
            </div>`;
        document.body.appendChild(panel);

        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'xox-toggle-btn';
        toggleBtn.innerHTML = `<span>🎲</span>`;
        document.body.appendChild(toggleBtn);
    }

    extractPlayerName() {
        const nameEl = document.querySelector('.p-navgroup-link--user .p-navgroup-username');
        if (nameEl) this.playerName = nameEl.innerText.trim();
        document.querySelector('#xox-game-panel .xox-username').textContent = this.playerName;
    }

    setupEventListeners() {
        document.getElementById('xox-toggle-btn').addEventListener('click', () => this.togglePanel());
        document.getElementById('close-panel-btn').addEventListener('click', () => this.togglePanel());
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', e => this.showPage(e.target.dataset.page)));
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
    }
    
    showPage(pageName) {
        if (!pageName) return;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageName));
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${pageName}`).classList.add('active');
        this.currentPage = pageName;
        if (pageName === 'stats') this.loadStats();
    }

    togglePanel() {
        const panel = document.getElementById('xox-game-panel');
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    }

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiUrl}/${endpoint}`, {
                method: 'GET',
                ...options,
                headers: { 'Content-Type': 'application/json', ...options.headers },
            });
            if (!response.ok) throw new Error((await response.json()).message || "Sunucu hatası");
            return await response.json();
        } catch (error) {
            this.showNotification(error.message, "error");
            throw error;
        }
    }

    async createRoom() {
        const maxRounds = document.getElementById('max-rounds').value;
        const result = await this.apiRequest('rooms', {
            method: 'POST',
            body: JSON.stringify({ creatorName: this.playerName, maxRounds })
        });
        if (result.success) {
            this.roomId = result.roomId;
            this.playerSymbol = 'X';
            document.getElementById('game-nav').style.display = 'block';
            this.showPage('game');
            this.startPolling();
            this.stopRoomMonitoring();
        }
    }

    async joinRoom(roomId) {
        const result = await this.apiRequest(`rooms/${roomId}/join`, {
            method: 'POST',
            body: JSON.stringify({ playerName: this.playerName })
        });
        if (result.success) {
            this.roomId = roomId;
            this.playerSymbol = 'O';
            document.getElementById('game-nav').style.display = 'block';
            this.showPage('game');
            this.startPolling();
            this.stopRoomMonitoring();
        }
    }
    
    renderGame(room) {
        Object.assign(this, room);
        document.getElementById('game-info').innerHTML = `<div class="game-info-item"><span>Oda: <strong>${this.roomId}</strong></span><span>El: <strong>${this.currentRound}/${this.maxRounds}</strong></span><span>Sembol: <strong>${this.playerSymbol}</strong></span></div>`;
        document.getElementById('game-board').innerHTML = this.gameBoard.map((cell, index) => `<div class="cell" data-index="${index}">${cell}</div>`).join('');
        document.getElementById('game-status').innerText = this.gameActive ? (this.currentPlayer === this.playerSymbol ? 'Sıra sende!' : 'Rakip bekleniyor...') : 'Oyuncu bekleniyor...';
    }

    async startPolling() {
        this.stopPolling();
        this.pollInterval = setInterval(async () => {
            if (!this.roomId) return;
            try {
                const result = await this.apiRequest(`rooms/${this.roomId}`);
                this.pollingErrorCount = 0;
                if (result.success) this.renderGame(result.room);
                else this.resetGame();
            } catch {
                this.pollingErrorCount++;
                if (this.pollingErrorCount >= 5) {
                    this.showNotification("Bağlantı koptu", "error");
                    this.resetGame();
                }
            }
        }, 2000);
    }

    stopPolling() { clearInterval(this.pollInterval); }
    
    async startRoomMonitoring() {
        this.stopRoomMonitoring();
        const fetchRooms = async () => {
            try {
                const result = await this.apiRequest('rooms');
                if (result.success) {
                    this.allRooms = result.rooms;
                    if (this.currentPage === 'rooms') this.updateRooms();
                }
            } catch {}
        };
        this.roomMonitorInterval = setInterval(fetchRooms, 3000);
        fetchRooms();
    }

    stopRoomMonitoring() { clearInterval(this.roomMonitorInterval); }

    updateRooms() {
        const listEl = document.getElementById('rooms-list');
        if (!listEl) return;
        if (this.allRooms.length === 0) {
            listEl.innerHTML = `<div class="no-rooms">Aktif oda bulunamadı</div>`;
            return;
        }
        listEl.innerHTML = this.allRooms.map(room => {
            const p1 = room.players[0] || '';
            const p2 = room.players[1] || 'Rakip Bekliyor';
            const s1 = (room.roundWins && room.roundWins[p1]) || 0;
            const s2 = (room.roundWins && room.roundWins[p2]) || 0;
            const actionButton = room.players.length === 1 ? `<button class="join-room-btn" data-room-id="${room.id}">Katıl</button>` : `<button class="watch-room-btn" data-room-id="${room.id}">İzle</button>`;
            return `<div class="room-item"><div class="room-players-score"><span class="player-name">${p1}</span><span class="score score-p1">${s1}</span><span class="score-separator">vs</span><span class="score score-p2">${s2}</span><span class="player-name">${p2}</span></div><div class="room-actions">${actionButton}</div></div>`;
        }).join('');
        listEl.querySelectorAll('.join-room-btn').forEach(b => b.addEventListener('click', e => this.joinRoom(e.target.dataset.roomId)));
    }

    async loadStats() {
        const result = await this.apiRequest('stats');
        if (result.success) this.renderStats(result.stats);
    }

    renderStats(stats) {
        const formatTime = t => new Date(t || Date.now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const logs = stats.recentGames?.length ? stats.recentGames.map(g => `<div class="log-item"><span class="log-time">[${formatTime(g.timestamp)}]</span><span class="log-winner">${g.winner}</span> kazandı</div>`).join('') : '<div class="no-data">Henüz oyun tamamlanmadı.</div>';
        document.getElementById('stats-content').innerHTML = `<div class="stat-card"><h4>Oyun Logları</h4><div class="stat-list log-container">${logs}</div></div>`;
    }

    showNotification(message, type = "info", duration = 3000) {
        document.querySelectorAll('.xox-notification').forEach(n => n.remove());
        const el = document.createElement('div');
        el.className = `xox-notification xox-notification-${type}`;
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), duration);
    }
    
    resetGame() {
        this.stopPolling();
        this.startRoomMonitoring();
        this.roomId = null;
        this.playerSymbol = null;
        document.getElementById('game-nav').style.display = 'none';
        this.showPage('rooms');
    }
}
new XOXGame();
