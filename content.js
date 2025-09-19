class XOXGame {
    constructor() {
        this.apiUrl = "https://xox-update.onrender.com";
        this.player = { name: 'Misafir' + Math.floor(Math.random() * 1000), symbol: null };
        this.currentPage = 'rooms';
        this.allRooms = [];
        this.activeUsers = 0;
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
        panel.innerHTML = `
            <div class="xox-header">
                <span class="xox-title">CG XOX OYUNU</span>
                <div class="header-stats">
                    <span class="online-dot"></span>
                    <span class="active-users-count">0</span> Aktif
                </div>
                <span class="xox-username"></span>
                <button id="close-panel-btn">×</button>
            </div>
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
        if (pageName === 'stats') {
            this.loadStats();
        }
    }

    togglePanel() {
        const panel = document.getElementById('xox-game-panel');
        const isVisible = panel.classList.toggle('panel-visible');
        if (isVisible) {
            this.fetchRoomsAndUpdate();
        }
    }

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiUrl}/${endpoint}`, { method: 'GET', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Sunucu hatası" }));
                throw new Error(errorData.message);
            }
            return await response.json();
        } catch (error) {
            this.showNotification(error.message, "error");
            throw error;
        }
    }

    async createRoom() {
        const maxRounds = document.getElementById('max-rounds').value;
        this.showNotification("Oda oluşturuluyor...", "info");
        try {
            const result = await this.apiRequest('rooms', { method: 'POST', body: JSON.stringify({ creatorName: this.player.name, maxRounds }) });
            if (result.success) {
                this.showNotification("Oda başarıyla oluşturuldu!", "success");
                this.roomId = result.roomId;
                this.player.symbol = 'X';
                this.showPage('game');
                this.startPolling();
            }
        } catch (e) {
            console.error("Oda oluşturulamadı:", e);
        }
    }

    async joinRoom(roomId) {
        try {
            const result = await this.apiRequest(`rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ playerName: this.player.name }) });
            if (result.success) {
                this.roomId = roomId;
                this.player.symbol = 'O';
                this.showPage('game');
                this.renderGame(result.room);
                this.startPolling();
            }
        } catch(e) { console.error("Odaya katılamadı:", e); }
    }

    async watchRoom(roomId) {
        try {
            const result = await this.apiRequest(`rooms/${roomId}/watch`, { method: 'POST', body: JSON.stringify({ spectatorName: this.player.name }) });
            if (result.success) {
                this.roomId = roomId;
                this.player.symbol = null; 
                this.showPage('game');
                this.renderGame(result.room);
                this.startPolling();
            }
        } catch(e) { console.error("Oda izlenemedi:", e); }
    }

    async handleCellClick(event) {
        const cell = event.target;
        if (!cell.classList.contains('cell') || cell.textContent !== '' || !this.gameActive || this.currentPlayer !== this.player.symbol || !this.canMove) {
            return;
        }
        this.canMove = false;
        const index = cell.dataset.index;
        await this.apiRequest(`rooms/${this.roomId}/move`, {
            method: 'POST',
            body: JSON.stringify({ player: this.player, index: parseInt(index) })
        });
        setTimeout(() => { this.canMove = true; }, 1000); 
    }

    async leaveRoom() {
        if (!this.roomId) return;
        await this.apiRequest(`rooms/${this.roomId}/leave`, { method: 'POST' });
        this.resetGame();
    }
    
    renderGame(room) {
        Object.assign(this, room);
        const playerIsSpectator = this.player.symbol === null;
        const gameBoardEl = document.getElementById('game-board');
        
        document.getElementById('game-nav').style.display = 'block';

        const p1 = room.players[0];
        const p2 = room.players[1];
        const score1 = room.roundWins[p1?.name] || 0;
        const score2 = room.roundWins[p2?.name] || 0;
        const player1Text = p1 ? `${p1.name} (X)` : '';
        const player2Text = p2 ? `${p2.name} (O)` : 'Rakip Bekleniyor...';
        
        const gameInfoHTML = `
            <div class="game-header">
                <div class="game-players-display">
                    <span class="player-name p1">${player1Text}</span>
                    <span class="vs">${score1} - ${score2}</span>
                    <span class="player-name p2">${player2Text}</span>
                </div>
                <button id="leave-room-btn">${playerIsSpectator ? 'İzlemeyi Bırak' : 'Odadan Ayrıl'}</button>
            </div>
            <div class="game-meta">Oda ID: ${this.roomId} | Tur: ${this.currentRound}/${this.maxRounds}</div>`;
        document.getElementById('game-info').innerHTML = gameInfoHTML;
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());

        gameBoardEl.innerHTML = this.gameBoard.map((cell, index) => `<div class="cell" data-index="${index}">${cell}</div>`).join('');
        gameBoardEl.className = 'game-board';

        const statusEl = document.getElementById('game-status');
        
        if (this.gameFinished) {
            const finalWinner = score1 > score2 ? p1.name : (score2 > score1 ? p2.name : "Kimse");
            const winnerMessage = finalWinner === "Kimse" ? "Oyun Berabere Bitti!" : `Oyun Bitti! Ana Kazanan: ${finalWinner}`;
            statusEl.innerHTML = `<div class="final-winner">${winnerMessage}</div>`;
            if(this.winningLine) this.drawWinningLine();
            this.stopPolling();
        } else if (this.winner) {
            statusEl.innerText = `Bu turu ${this.winner} kazandı! Yeni tur başlıyor...`;
            this.drawWinningLine();
            this.stopPolling();
            setTimeout(() => {
                if (this.players.length > 0 && this.players[0].name === this.player.name) {
                    this.apiRequest(`rooms/${this.roomId}/next-round`, { method: 'POST' });
                }
                this.startPolling();
            }, 4000);
        } else if (this.isDraw) {
            statusEl.innerText = 'Bu tur berabere! Yeni tur başlıyor...';
            this.stopPolling();
            setTimeout(() => {
                if (this.players.length > 0 && this.players[0].name === this.player.name) {
                    this.apiRequest(`rooms/${this.roomId}/next-round`, { method: 'POST' });
                }
                this.startPolling();
            }, 4000);
        } else if (!this.gameActive) {
            statusEl.innerText = 'Rakip bekleniyor...';
        } else {
            const isMyTurn = this.currentPlayer === this.player.symbol;
            statusEl.innerText = playerIsSpectator ? `Sıra: ${this.currentPlayer}` : (isMyTurn ? 'Sıra sende!' : 'Rakip oynuyor...');
        }
    }

    drawWinningLine() {
        if (!this.winningLine) return;
        const gameBoardEl = document.getElementById('game-board');
        this.winningLine.line.forEach(index => {
            gameBoardEl.children[index].classList.add('winning-cell');
        });
        gameBoardEl.classList.add(`win-${this.winningLine.index}`);
    }

    startPolling() {
        this.stopPolling();
        this.pollInterval = setInterval(async () => {
            if (!this.roomId) return;
            try {
                const result = await this.apiRequest(`rooms/${this.roomId}`);
                this.pollingErrorCount = 0;
                if (result.success) {
                    this.renderGame(result.room);
                } else {
                    this.showNotification("Oda kapatıldı.", "info");
                    this.resetGame();
                }
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
    
    async fetchRoomsAndUpdate() {
        try {
            const result = await this.apiRequest('rooms');
            if (result.success) {
                this.allRooms = result.rooms;
                this.activeUsers = result.activeUsers;
                this.updateRooms();
                this.updateHeaderStats();
            }
        } catch(e) { console.error("Oda listesi alınamadı", e) }
    }
    
    startRoomMonitoring() {
        this.stopRoomMonitoring();
        this.roomMonitorInterval = setInterval(() => this.fetchRoomsAndUpdate(), 5000);
        this.fetchRoomsAndUpdate();
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

    async loadStats() {
        try {
            document.getElementById('stats-content').innerHTML = 'Yükleniyor...';
            const result = await this.apiRequest('stats');
            if (result.success) {
                this.renderStats(result.stats);
            }
        } catch (e) {
            document.getElementById('stats-content').innerHTML = '<div class="no-data">İstatistikler yüklenemedi.</div>';
        }
    }

    renderStats(stats) {
        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Anlık Durum</h4>
                    <div class="stat-list">
                        <div class="stat-item">
                            <span>Aktif Oyuncular</span>
                            <span>${stats.activeUsers || 0}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        document.getElementById('stats-content').innerHTML = statsHTML;
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
        this.player.symbol = null;
        this.canMove = true;
        document.getElementById('game-nav').style.display = 'none';
        this.showPage('rooms');
    }

    updateHeaderStats() {
        const countElement = document.querySelector('#xox-game-panel .active-users-count');
        if (countElement) {
            countElement.textContent = this.activeUsers;
        }
    }
}
new XOXGame();
