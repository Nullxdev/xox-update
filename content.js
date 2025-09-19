class XOXGame {
    constructor() {
        this.apiUrl = "https://xox-update.onrender.com";
        this.player = { name: 'Misafir' + Math.floor(Math.random() * 1000), symbol: null };
        this.currentPage = 'rooms';
        this.allRooms = [];
        this.pollingErrorCount = 0;
        this.roomId = null;
        this.canMove = true;
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
        // panel.style.display = 'none'; // Artık CSS ile kontrol edilecek
        panel.innerHTML = `
            <div class="xox-header"><span class="xox-title">CG XOX OYUNU</span><span class="xox-username"></span><button id="close-panel-btn">×</button></div>
            <div class="xox-nav">
                <button class="nav-btn active" data-page="rooms">Odalar</button><button class="nav-btn" data-page="create">Oda Oluştur</button>
                <button class="nav-btn" data-page="stats">İstatistik</button><button class="nav-btn" data-page="game" id="game-nav" style="display:none">Oyun</button>
            </div>
            <div class="xox-content">
                <div id="page-rooms" class="page active"><div id="rooms-list" class="rooms-list"></div></div>
                <div id="page-create" class="page"><div class="create-room-form"><h3>Yeni Oda Oluştur</h3><div class="form-group"><label>Kaç el oynanacak? (max 10)</label><input type="number" id="max-rounds" min="1" max="10" value="1"></div><button id="create-room-btn">Oda Oluştur</button></div></div>
                <div id="page-stats" class="page"><div id="stats-content">Yükleniyor...</div></div>
                <div id="page-game" class="page"><div class="game-container"><div id="game-info"></div><div id="game-board" class="game-board"></div><div id="game-status"></div></div></div>
            </div>`;
        document.body.appendChild(panel);
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'xox-toggle-btn';
        toggleBtn.innerHTML = `<span>🎲</span>`;
        document.body.appendChild(toggleBtn);
    }

    extractPlayerName() {
        const nameEl = document.querySelector('.p-navgroup-link .p-navgroup-linkText');
        if (nameEl && nameEl.innerText.trim()) {
            this.player.name = nameEl.innerText.trim();
        }
        document.querySelector('#xox-game-panel .xox-username').textContent = this.player.name;
    }

    setupEventListeners() {
        document.getElementById('xox-toggle-btn').addEventListener('click', () => this.togglePanel());
        document.getElementById('close-panel-btn').addEventListener('click', () => this.togglePanel());
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', e => this.showPage(e.target.dataset.page)));
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('game-board').addEventListener('click', e => this.handleCellClick(e));
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
        const isVisible = panel.classList.toggle('panel-visible');
        if (isVisible) {
            this.fetchRoomsAndUpdate(); // Panel açıldığında odaları anında yenile
        }
    }

    async apiRequest(endpoint, options = {}) { /* Değişiklik Yok */ }
    async createRoom() { /* Değişiklik Yok */ }
    async joinRoom(roomId) { /* Değişiklik Yok */ }
    async watchRoom(roomId) { /* Değişiklik Yok */ }
    async handleCellClick(event) { /* Değişiklik Yok */ }
    async leaveRoom() { /* Değişiklik Yok */ }
    renderGame(room) { /* Değişiklik Yok */ }
    drawWinningLine() { /* Değişiklik Yok */ }
    startPolling() { /* Değişiklik Yok */ }
    stopPolling() { /* Değişiklik Yok */ }
    
    async fetchRoomsAndUpdate() {
        try {
            const result = await this.apiRequest('rooms');
            if (result.success) {
                this.allRooms = result.rooms;
                this.updateRooms();
            }
        } catch {}
    }
    
    startRoomMonitoring() {
        this.stopRoomMonitoring();
        this.roomMonitorInterval = setInterval(() => this.fetchRoomsAndUpdate(), 3000);
        this.fetchRoomsAndUpdate(); // Başlangıçta bir kere çalıştır
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
            const p1 = room.players[0]?.name || '';
            const p2 = room.players[1]?.name || 'Rakip Bekliyor';
            const s1 = (room.roundWins && room.roundWins[p1]) || 0;
            const s2 = (room.roundWins && room.roundWins[p2]) || 0;
            const actionButton = room.players.length < 2 ? `<button class="join-room-btn" data-room-id="${room.id}">Katıl</button>` : `<button class="watch-room-btn" data-room-id="${room.id}">İzle</button>`;
            return `<div class="room-item"><div class="room-players-score"><span class="player-name">${p1}</span><span class="score score-p1">${s1}</span><span class="score-separator">vs</span><span class="score score-p2">${s2}</span><span class="player-name">${p2}</span></div><div class="room-actions">${actionButton}</div></div>`;
        }).join('');
        listEl.querySelectorAll('.join-room-btn').forEach(b => b.addEventListener('click', e => this.joinRoom(e.target.dataset.roomId)));
        listEl.querySelectorAll('.watch-room-btn').forEach(b => b.addEventListener('click', e => this.watchRoom(e.target.dataset.roomId)));
    }

    async loadStats() { /* Değişiklik Yok */ }
    renderStats(stats) { /* Değişiklik Yok */ }
    showNotification(message, type, duration) { /* Değişiklik Yok */ }
    resetGame() { /* Değişiklik Yok */ }
}
new XOXGame();
