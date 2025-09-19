class XOXGame {
    constructor() {
        this.apiUrl = "https://xox-update.onrender.com";
        this.player = { name: 'Misafir' + Math.floor(Math.random() * 1000), symbol: null };
        this.currentPage = 'rooms';
        this.isBotGame = false;
        this.botDifficulty = 'orta';
        this.init();
    }

    init() {
        if (!window.location.hostname.includes('cheatglobal.com')) return;
        this.createGameUI();
        this.extractPlayerName();
        this.setupEventListeners();
        this.startRoomMonitoring();
        this.checkForSavedGame();
    }

    createGameUI() {
        const panel = document.createElement('div');
        panel.id = 'xox-game-panel';
        panel.innerHTML = `
            <div class="xox-header"><span class="xox-title">CG XOX OYUNU</span><div class="header-stats"><span class="online-dot"></span> <span class="active-users-count">0</span> Aktif</div><span class="xox-username"></span><button id="close-panel-btn">×</button></div>
            <div class="xox-nav"><button class="nav-btn active" data-page="rooms">Odalar</button><button class="nav-btn" data-page="create">Oda Oluştur</button><button class="nav-btn" data-page="stats">İstatistik</button><button class="nav-btn" data-page="game" id="game-nav" style="display:none">Oyun</button></div>
            <div class="xox-content">
                <div id="page-rooms" class="page active"><div id="rooms-list" class="rooms-list"></div></div>
                <div id="page-create" class="page">
                    <div class="create-room-form">
                        <h3>Çok Oyunculu Oda Kur</h3>
                        <div class="form-group"><label>Kaç el oynanacak?</label><input type="number" id="max-rounds" min="1" max="10" value="3"></div>
                        <button id="create-room-btn">Oda Kur</button>
                    </div>
                    <hr class="divider">
                    <div class="bot-options">
                        <h3>Yapay Zekaya Karşı Oyna</h3>
                        <div class="form-group"><label for="difficulty-select">Zorluk:</label><select id="difficulty-select" class="difficulty-select"><option value="kolay">Kolay</option><option value="orta" selected>Orta</option><option value="zor">Zor (Yenilmez)</option></select></div>
                        <button id="start-bot-game-btn">Maça Başla</button>
                    </div>
                </div>
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
        if (nameEl && nameEl.innerText.trim()) { this.player.name = nameEl.innerText.trim(); }
        document.querySelector('#xox-game-panel .xox-username').textContent = this.player.name;
    }

    setupEventListeners() {
        document.getElementById('xox-toggle-btn').addEventListener('click', () => this.togglePanel());
        document.getElementById('close-panel-btn').addEventListener('click', () => this.togglePanel());
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', e => this.showPage(e.target.dataset.page)));
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('game-board').addEventListener('click', e => this.handleCellClick(e));
        document.getElementById('start-bot-game-btn').addEventListener('click', () => this.startBotGame());
    }
    
    showPage(pageName) {
        if (!pageName || this.isBotGame) return;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageName));
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${pageName}`).classList.add('active');
        this.currentPage = pageName;
        if (pageName === 'stats') this.loadStats();
    }

    togglePanel() {
        const panel = document.getElementById('xox-game-panel');
        panel.classList.toggle('panel-visible');
    }

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiUrl}/${endpoint}`, { method: 'GET', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Sunucu hatası" }));
                throw new Error(errorData.message);
            }
            return await response.json();
        } catch (error) { this.showNotification(error.message, "error"); throw error; }
    }

    async createRoom() {
        const maxRounds = document.getElementById('max-rounds').value;
        this.showNotification("Oda oluşturuluyor...", "info");
        try {
            const result = await this.apiRequest('rooms', { method: 'POST', body: JSON.stringify({ creatorName: this.player.name, maxRounds }) });
            if (result.success) {
                this.roomId = result.roomId; this.player.symbol = 'X';
                this.saveGameState(); this.showPage('game'); this.startPolling();
            }
        } catch (e) {}
    }

    async joinRoom(roomId) {
        try {
            const result = await this.apiRequest(`rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ playerName: this.player.name }) });
            if (result.success) {
                this.roomId = roomId; this.player.symbol = 'O';
                this.saveGameState(); this.showPage('game'); this.renderGame(result.room); this.startPolling();
            }
        } catch(e) {}
    }

    async watchRoom(roomId) {
        try {
            const result = await this.apiRequest(`rooms/${roomId}/watch`, { method: 'POST', body: JSON.stringify({ spectatorName: this.player.name }) });
            if (result.success) {
                this.roomId = roomId; this.player.symbol = null; 
                this.saveGameState(); this.showPage('game'); this.renderGame(result.room); this.startPolling();
            }
        } catch(e) {}
    }

    async handleCellClick(event) {
        const cell = event.target;
        if (!cell.classList.contains('cell') || cell.textContent !== '' || !this.gameActive || !this.canMove) return;
        
        if (this.isBotGame) {
            if (this.currentPlayer !== this.player.symbol) return;
            const index = parseInt(cell.dataset.index);
            this.gameBoard[index] = this.player.symbol;
            this.canMove = false;
            this.renderGame(this);
            const winInfo = this.checkWin(this.gameBoard);
            if(winInfo || this.checkDraw(this.gameBoard)) { this.gameActive = false; this.renderGame(this); return; }
            this.currentPlayer = 'O';
            this.renderGame(this);
            setTimeout(() => this.makeBotMove(), 600);
        } else {
            if (this.currentPlayer !== this.player.symbol) return;
            this.canMove = false;
            const index = cell.dataset.index;
            await this.apiRequest(`rooms/${this.roomId}/move`, { method: 'POST', body: JSON.stringify({ player: this.player, index }) });
            setTimeout(() => { this.canMove = true; }, 1000);
        }
    }

    async leaveRoom() {
        if (!this.roomId) { this.resetGame(); return; }
        if (!this.isBotGame) {
            await this.apiRequest(`rooms/${this.roomId}/leave`, { method: 'POST', body: JSON.stringify({playerName: this.player.name}) });
        }
        this.resetGame();
    }
    
    renderGame(room) {
        Object.assign(this, room);
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
                <div class="game-players-display"><span class="player-name p1">${player1Text}</span><span class="vs">${score1} - ${score2}</span><span class="player-name p2">${player2Text}</span></div>
                <button id="leave-room-btn">${this.player.symbol === null ? 'İzlemeyi Bırak' : 'Oyundan Ayrıl'}</button>
            </div>
            <div class="game-meta">Oda ID: ${this.isBotGame ? "BOT MAÇI" : this.roomId} | Tur: ${this.currentRound}/${this.maxRounds}</div>`;
        document.getElementById('game-info').innerHTML = gameInfoHTML;
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());

        gameBoardEl.innerHTML = this.gameBoard.map((cell, index) => `<div class="cell" data-index="${index}">${cell}</div>`).join('');
        gameBoardEl.className = 'game-board';

        const statusEl = document.getElementById('game-status');
        
        if (this.gameFinished) {
            const finalWinner = score1 > score2 ? p1.name : (score2 > score1 ? p2.name : "Kimse");
            statusEl.innerHTML = `<div class="final-winner">Oyun Bitti! Kazanan: ${finalWinner}</div>`;
            if(this.winningLine) this.drawWinningLine();
            if(!this.isBotGame) this.stopPolling();
        } else if (this.winner) {
            statusEl.innerText = `Bu turu ${this.winner} kazandı! Yeni tur başlıyor...`;
            this.drawWinningLine();
            if(!this.isBotGame) {
                this.stopPolling();
                setTimeout(() => {
                    if (this.players.length > 0 && this.players[0].name === this.player.name) { this.apiRequest(`rooms/${this.roomId}/next-round`, { method: 'POST' }); }
                    this.startPolling();
                }, 4000);
            }
        } else if (this.isDraw) {
            statusEl.innerText = 'Bu tur berabere! Yeni tur başlıyor...';
            if(!this.isBotGame) {
                this.stopPolling();
                setTimeout(() => {
                    if (this.players.length > 0 && this.players[0].name === this.player.name) { this.apiRequest(`rooms/${this.roomId}/next-round`, { method: 'POST' }); }
                    this.startPolling();
                }, 4000);
            }
        } else if (!this.gameActive) {
            statusEl.innerText = 'Rakip bekleniyor...';
        } else {
            const isMyTurn = this.currentPlayer === this.player.symbol;
            statusEl.innerText = this.player.symbol === null ? `Sıra: ${this.currentPlayer}` : (isMyTurn ? 'Sıra sende!' : 'Rakip oynuyor...');
        }
    }

    drawWinningLine() {
        if (!this.winningLine) return;
        const gameBoardEl = document.getElementById('game-board');
        this.winningLine.line.forEach(index => { gameBoardEl.children[index].classList.add('winning-cell'); });
        gameBoardEl.classList.add(`win-${this.winningLine.index}`);
    }

    startPolling() {
        if(this.isBotGame) return;
        this.stopPolling();
        this.pollInterval = setInterval(async () => {
            if (!this.roomId) return;
            try {
                const result = await this.apiRequest(`rooms/${this.roomId}`);
                this.pollingErrorCount = 0;
                if (result.success) this.renderGame(result.room);
                else { this.showNotification("Oda kapatıldı.", "info"); this.resetGame(); }
            } catch {
                this.pollingErrorCount++;
                if (this.pollingErrorCount >= 5) { this.showNotification("Bağlantı koptu", "error"); this.resetGame(); }
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
        } catch(e) {}
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
        if (this.allRooms.length === 0) { listEl.innerHTML = `<div class="no-rooms">Aktif oda bulunamadı</div>`; return; }
        listEl.innerHTML = this.allRooms.map(room => {
            const p1 = room.players[0]?.name || ''; const p2 = room.players[1]?.name || 'Rakip Bekliyor';
            const s1 = (room.roundWins && room.roundWins[p1]) || 0; const s2 = (room.roundWins && room.roundWins[p2]) || 0;
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
            if (result.success) this.renderStats(result.stats);
        } catch (e) { document.getElementById('stats-content').innerHTML = '<div class="no-data">İstatistikler yüklenemedi.</div>'; }
    }

    renderStats(stats) {
        const statsHTML = `
            <div class="stats-grid"><div class="stat-card"><h4>Genel Sunucu İstatistikleri</h4><div class="stat-list"><div class="stat-item"><span>Toplam Oynanan El</span><span>${stats.totalRoundsPlayed || 0}</span></div></div></div></div>`;
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
        this.stopPolling(); this.startRoomMonitoring(); this.clearGameState();
        this.roomId = null; this.player.symbol = null; this.canMove = true; this.isBotGame = false;
        document.getElementById('game-nav').style.display = 'none';
        this.showPage('rooms');
    }

    updateHeaderStats() {
        const countElement = document.querySelector('#xox-game-panel .active-users-count');
        if (countElement) { countElement.textContent = this.activeUsers || 0; }
    }

    saveGameState() { if (this.roomId && this.player && !this.isBotGame) { localStorage.setItem('xoxGameState', JSON.stringify({ roomId: this.roomId, player: this.player })); } }
    clearGameState() { localStorage.removeItem('xoxGameState'); }

    checkForSavedGame() {
        const savedStateJSON = localStorage.getItem('xoxGameState');
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState.roomId && savedState.player) {
                    this.roomId = savedState.roomId; this.player = savedState.player;
                    const panel = document.getElementById('xox-game-panel');
                    if (!panel.classList.contains('panel-visible')) panel.classList.add('panel-visible');
                    this.showPage('game'); this.startPolling();
                }
            } catch (e) { this.clearGameState(); }
        }
    }
    
    startBotGame() {
        this.isBotGame = true;
        this.botDifficulty = document.getElementById('difficulty-select').value;
        this.player.symbol = 'X';
        const botName = `Bot (${this.botDifficulty.charAt(0).toUpperCase() + this.botDifficulty.slice(1)})`;
        this.players = [ { name: this.player.name, symbol: 'X' }, { name: botName, symbol: 'O' } ];
        this.gameBoard = Array(9).fill(''); this.currentPlayer = 'X'; this.gameActive = true;
        this.winner = null; this.isDraw = false; this.gameFinished = false; this.winningLine = null;
        this.roundWins = { [this.player.name]: 0, [botName]: 0 };
        this.maxRounds = 1; this.currentRound = 1;
        this.stopRoomMonitoring(); this.stopPolling(); this.clearGameState();
        this.showPage('game'); this.renderGame(this);
    }
    
    makeBotMove() {
        if (!this.gameActive || this.currentPlayer !== 'O') return;
        let moveIndex;
        if (this.botDifficulty === 'kolay') moveIndex = this.getBotMove_Easy();
        else if (this.botDifficulty === 'orta') moveIndex = this.getBotMove_Medium();
        else moveIndex = this.getBotMove_Hard();
        if (moveIndex !== -1) {
            this.gameBoard[moveIndex] = 'O';
            const winInfo = this.checkWin(this.gameBoard);
            const isDraw = !winInfo && this.checkDraw(this.gameBoard);
            if (winInfo) { this.winner = this.players[1].name; this.gameActive = false; this.gameFinished = true; this.winningLine = winInfo; }
            else if (isDraw) { this.isDraw = true; this.gameActive = false; this.gameFinished = true; }
            else { this.currentPlayer = 'X'; }
            this.canMove = true;
            this.renderGame(this);
        }
    }
    
    getBotMove_Easy() {
        const emptyCells = this.gameBoard.map((c, i) => c === '' ? i : null).filter(i => i !== null);
        return emptyCells.length > 0 ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : -1;
    }

    getBotMove_Medium() {
        const winningMove = this.findWinningMove('O'); if (winningMove !== -1) return winningMove;
        const blockingMove = this.findWinningMove('X'); if (blockingMove !== -1) return blockingMove;
        return this.getBotMove_Easy();
    }
    
    findWinningMove(symbol) {
        for (let i = 0; i < 9; i++) {
            if (this.gameBoard[i] === '') {
                const tempBoard = [...this.gameBoard]; tempBoard[i] = symbol;
                if (this.checkWin(tempBoard)) return i;
            }
        }
        return -1;
    }

    getBotMove_Hard() {
        return this.minimax(this.gameBoard, 'O').index;
    }

    minimax(newBoard, player) {
        const emptyCells = newBoard.map((c, i) => c === '' ? i : null).filter(i => i !== null);
        const humanPlayer = 'X', aiPlayer = 'O';
        const winInfo = this.checkWin(newBoard);
        if (winInfo?.winnerSymbol === humanPlayer) return { score: -10 };
        else if (winInfo?.winnerSymbol === aiPlayer) return { score: 10 };
        else if (emptyCells.length === 0) return { score: 0 };
        const moves = [];
        for (let i = 0; i < emptyCells.length; i++) {
            const move = {};
            move.index = emptyCells[i];
            newBoard[emptyCells[i]] = player;
            if (player === aiPlayer) {
                const result = this.minimax(newBoard, humanPlayer);
                move.score = result.score;
            } else {
                const result = this.minimax(newBoard, aiPlayer);
                move.score = result.score;
            }
            newBoard[emptyCells[i]] = '';
            moves.push(move);
        }
        let bestMove;
        if (player === aiPlayer) {
            let bestScore = -10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score > bestScore) { bestScore = moves[i].score; bestMove = i; }
            }
        } else {
            let bestScore = 10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score < bestScore) { bestScore = moves[i].score; bestMove = i; }
            }
        }
        return moves[bestMove];
    }

    checkWin(board) {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winnerSymbol: board[a], line: lines[i], index: i };
            }
        }
        return null;
    }
    checkDraw(board) { return board.every(cell => cell !== ''); }
}

new XOXGame();
