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

    init() { /* Değişiklik Yok */ }
    createGameUI() { /* Değişiklik Yok */ }
    extractPlayerName() { /* Değişiklik Yok */ }
    setupEventListeners() { /* Değişiklik Yok */ }
    showPage(pageName) { /* Değişiklik Yok */ }
    togglePanel() { /* Değişiklik Yok */ }
    async apiRequest(endpoint, options = {}) { /* Değişiklik Yok */ }
    async createRoom() { /* Değişiklik Yok */ }
    async joinRoom(roomId) { /* Değişiklik Yok */ }
    async watchRoom(roomId) { /* Değişiklik Yok */ }
    async handleCellClick(event) { /* Değişiklik Yok */ }
    async leaveRoom() { /* Değişiklik Yok */ }
    
    renderGame(room) {
        Object.assign(this, room);
        const playerIsSpectator = this.player.symbol === null;
        const gameBoardEl = document.getElementById('game-board');
        
        document.getElementById('game-nav').style.display = 'block';

        const player1 = room.players[0] ? `${room.players[0].name} (X)` : '';
        const player2 = room.players[1] ? `${room.players[1].name} (O)` : 'Rakip Bekleniyor...';
        
        const gameInfoHTML = `
            <div class="game-header"><div class="game-players-display"><span class="player-name p1">${player1}</span><span class="vs">vs</span><span class="player-name p2">${player2}</span></div><button id="leave-room-btn">${playerIsSpectator ? 'İzlemeyi Bırak' : 'Odadan Ayrıl'}</button></div>
            <div class="game-meta">Oda ID: ${this.roomId} | Tur: ${this.currentRound}/${this.maxRounds}</div>`;
        document.getElementById('game-info').innerHTML = gameInfoHTML;
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());

        gameBoardEl.innerHTML = this.gameBoard.map((cell, index) => `<div class="cell" data-index="${index}">${cell}</div>`).join('');
        gameBoardEl.className = 'game-board'; // Reset winning line class

        const statusEl = document.getElementById('game-status');
        
        if (this.winner && !this.gameFinished) { // Tur kazananı var
            statusEl.innerText = `Bu turu ${this.winner} kazandı! Yeni tur başlıyor...`;
            this.drawWinningLine();
            this.stopPolling();
            setTimeout(() => {
                if (this.players[0].name === this.player.name) { // Sadece host yeni turu tetikler
                    this.apiRequest(`rooms/${this.roomId}/next-round`, { method: 'POST' });
                }
                this.startPolling();
            }, 4000);
        } else if (this.gameFinished) { // Oyun tamamen bitti
            statusEl.innerText = `Oyun Bitti! Kazanan: ${this.winner}!`;
            this.drawWinningLine();
            this.stopPolling();
        } else if (this.isDraw) { // Tur berabere
             statusEl.innerText = 'Bu tur berabere! Yeni tur başlıyor...';
             this.stopPolling();
             setTimeout(() => {
                if (this.players[0].name === this.player.name) {
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

    startPolling() { /* Değişiklik Yok */ }
    stopPolling() { /* Değişiklik Yok */ }
    startRoomMonitoring() { /* Değişiklik Yok */ }
    stopRoomMonitoring() { /* Değişiklik Yok */ }
    updateRooms() { /* Değişiklik Yok */ }
    async loadStats() { /* Değişiklik Yok */ }
    renderStats(stats) { /* Değişiklik Yok */ }
    showNotification(message, type, duration) { /* Değişiklik Yok */ }
    resetGame() { /* Değişiklik Yok */ }
}
new XOXGame();
