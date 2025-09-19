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

        const p1 = room.players[0];
        const p2 = room.players[1];
        const score1 = room.roundWins[p1?.name] || 0;
        const score2 = room.roundWins[p2?.name] || 0;
        const player1Text = p1 ? `${p1.name} (X)` : '';
        const player2Text = p2 ? `${p2.name} (O)` : 'Rakip Bekleniyor...';
        
        const gameInfoHTML = `
            <div class.game-header">
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
            const finalWinner = score1 > score2 ? p1.name : (score2 > score1 ? p2.name : "Berabere");
            statusEl.innerHTML = `<div class="final-winner">Oyun Bitti! Ana Kazanan: ${finalWinner}</div>`;
            if(this.winningLine) this.drawWinningLine();
            this.stopPolling();
        } else if (this.winner) {
            statusEl.innerText = `Bu turu ${this.winner} kazandı! Yeni tur başlıyor...`;
            this.drawWinningLine();
            this.stopPolling();
            setTimeout(() => {
                if (this.players[0].name === this.player.name) {
                    this.apiRequest(`rooms/${this.roomId}/next-round`, { method: 'POST' });
                }
                this.startPolling();
            }, 4000);
        } else if (this.isDraw) {
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

    drawWinningLine() { /* Değişiklik Yok */ }
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
