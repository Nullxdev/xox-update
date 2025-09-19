class XOXGame {
    constructor() {
        this.apiUrl = "https://xox-update.onrender.com";
        this.player = { name: 'Misafir' + Math.floor(Math.random() * 1000), symbol: null };
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
        // ... Bu fonksiyon öncekiyle aynı, değişiklik yok ...
    }

    extractPlayerName() {
        const nameEl = document.querySelector('.p-navgroup-link .p-navgroup-linkText'); // İSTENEN YENİ SEÇİCİ
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
        // ... Bu fonksiyon öncekiyle aynı, değişiklik yok ...
    }

    togglePanel() {
        // ... Bu fonksiyon öncekiyle aynı, değişiklik yok ...
    }

    async apiRequest(endpoint, options = {}) {
        // ... Bu fonksiyon öncekiyle aynı, değişiklik yok ...
    }

    async createRoom() {
        const maxRounds = document.getElementById('max-rounds').value;
        const result = await this.apiRequest('rooms', { method: 'POST', body: JSON.stringify({ creatorName: this.player.name, maxRounds }) });
        if (result.success) {
            this.roomId = result.roomId;
            this.player.symbol = 'X';
            this.showPage('game');
            this.startPolling();
        }
    }

    async joinRoom(roomId) {
        const result = await this.apiRequest(`rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ playerName: this.player.name }) });
        if (result.success) {
            this.roomId = result.roomId;
            this.player.symbol = 'O';
            this.showPage('game');
            this.startPolling();
        }
    }

    async watchRoom(roomId) {
        const result = await this.apiRequest(`rooms/${roomId}/watch`, { method: 'POST', body: JSON.stringify({ spectatorName: this.player.name }) });
        if (result.success) {
            this.roomId = roomId;
            this.player.symbol = null; // İzleyicinin sembolü olmaz
            this.showPage('game');
            this.startPolling();
        }
    }

    async handleCellClick(event) {
        const cell = event.target;
        if (!cell.classList.contains('cell') || cell.textContent !== '' || !this.gameActive || this.currentPlayer !== this.player.symbol) {
            return;
        }
        const index = cell.dataset.index;
        await this.apiRequest(`rooms/${this.roomId}/move`, {
            method: 'POST',
            body: JSON.stringify({ player: this.player, index: parseInt(index) })
        });
    }

    async leaveRoom() {
        if (!this.roomId) return;
        await this.apiRequest(`rooms/${this.roomId}/leave`, { method: 'POST', body: JSON.stringify({ playerName: this.player.name }) });
        this.resetGame();
    }
    
    renderGame(room) {
        Object.assign(this, room);
        const playerIsSpectator = !this.player.symbol;
        const playerInGame = room.players.find(p => p.name === this.player.name);

        document.getElementById('game-info').innerHTML = `
            <div class="game-info-item"><span>Oda: <strong>${this.roomId}</strong></span></div>
            <button id="leave-room-btn">${playerIsSpectator ? 'İzlemeyi Bırak' : 'Odadan Ayrıl'}</button>`;
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());

        document.getElementById('game-board').innerHTML = this.gameBoard.map((cell, index) => `<div class="cell" data-index="${index}">${cell}</div>`).join('');
        
        const statusEl = document.getElementById('game-status');
        if (this.winner) {
            statusEl.innerText = `Kazanan: ${this.winner}!`;
        } else if (this.isDraw) {
            statusEl.innerText = 'Berabere!';
        } else if (!this.gameActive) {
            statusEl.innerText = 'Rakip bekleniyor...';
        } else {
            const isMyTurn = this.currentPlayer === this.player.symbol;
            statusEl.innerText = isMyTurn ? 'Sıra sende!' : 'Rakip oynuyor...';
        }
    }

    startPolling() {
        this.stopRoomMonitoring();
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
        }, 1500);
    }

    stopPolling() { clearInterval(this.pollInterval); }
    
    startRoomMonitoring() {
        this.stopPolling();
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

    async loadStats() { /* ... */ }
    renderStats(stats) { /* ... */ }
    showNotification(message, type = "info", duration = 3000) { /* ... */ }
    
    resetGame() {
        this.stopPolling();
        this.startRoomMonitoring();
        this.roomId = null;
        this.player.symbol = null;
        document.getElementById('game-nav').style.display = 'none';
        this.showPage('rooms');
    }
}
new XOXGame();
