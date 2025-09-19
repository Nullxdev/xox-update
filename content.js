// ... (constructor ve diğer fonksiyonların başı aynı)

    createGameUI() {
        // ... (panelin ana yapısı aynı)
        panel.innerHTML = `
            <div class="xox-header"> ... </div>
            <div class="xox-nav"> ... </div>
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
                        <div class="form-group">
                            <label for="difficulty-select">Zorluk:</label>
                            <select id="difficulty-select" class="difficulty-select">
                                <option value="kolay">Kolay</option>
                                <option value="orta">Orta</option>
                                <option value="zor">Zor (Yenilmez)</option>
                            </select>
                        </div>
                        <button id="start-bot-game-btn">Maça Başla</button>
                    </div>
                </div>
                <div id="page-stats" class="page"><div id="stats-content">Yükleniyor...</div></div>
                <div id="page-game" class="page"> ... </div>
            </div>`;
        // ... (toggle button aynı)
    }
    
    // ... (extractPlayerName aynı)

    setupEventListeners() {
        document.getElementById('xox-toggle-btn').addEventListener('click', () => this.togglePanel());
        document.getElementById('close-panel-btn').addEventListener('click', () => this.togglePanel());
        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', e => this.showPage(e.target.dataset.page)));
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('game-board').addEventListener('click', e => this.handleCellClick(e));
        document.getElementById('start-bot-game-btn').addEventListener('click', () => this.startBotGame()); // YENİ
    }
    
    // ... (showPage, togglePanel, apiRequest, createRoom, joinRoom, watchRoom aynı)

    async handleCellClick(event) {
        // ... (mevcut multiplayer hamle mantığı aynı)
        
        // YENİ: Bot oyunu mantığı
        if (this.isBotGame && this.gameActive && this.currentPlayer === this.player.symbol) {
            const cell = event.target;
            if (!cell.classList.contains('cell') || cell.textContent !== '') return;
            const index = parseInt(cell.dataset.index);
            this.gameBoard[index] = this.player.symbol;
            this.renderGame(this); // Oyuncunun hamlesini anında göster

            const winInfo = this.checkWin(this.gameBoard);
            if(winInfo || this.checkDraw(this.gameBoard)) {
                this.gameActive = false;
                this.renderGame(this);
                return;
            }

            this.currentPlayer = 'O'; // Sırayı bota ver
            this.renderGame(this);
            setTimeout(() => this.makeBotMove(), 500); // Bot 0.5 saniye sonra oynasın
        }
    }
    
    // ... (leaveRoom, drawWinningLine, polling fonksiyonları aynı)

    renderStats(stats) {
        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Genel Sunucu İstatistikleri</h4>
                    <div class="stat-list">
                        <div class="stat-item">
                            <span>Toplam Oynanan El</span>
                            <span>${stats.totalRoundsPlayed || 0}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        document.getElementById('stats-content').innerHTML = statsHTML;
    }

    // --- YENİ BOT FONKSİYONLARI ---
    startBotGame() {
        this.isBotGame = true;
        this.botDifficulty = document.getElementById('difficulty-select').value;
        this.roomId = "BOT_GAME";
        this.player.symbol = 'X';
        this.players = [
            { name: this.player.name, symbol: 'X' },
            { name: `Bot (${this.botDifficulty})`, symbol: 'O' }
        ];
        this.gameBoard = Array(9).fill('');
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.winner = null; this.isDraw = false; this.gameFinished = false;
        this.roundWins = { [this.player.name]: 0, [this.players[1].name]: 0 };
        this.maxRounds = 1; this.currentRound = 1;

        this.showPage('game');
        this.renderGame(this);
    }
    
    makeBotMove() {
        if (!this.gameActive) return;
        let move;
        switch(this.botDifficulty) {
            case 'kolay':
                move = this.getBotMove_Easy();
                break;
            case 'orta':
                move = this.getBotMove_Medium();
                break;
            case 'zor':
                move = this.getBotMove_Hard();
                break;
        }

        if (move !== -1) {
            this.gameBoard[move] = 'O';
            this.currentPlayer = 'X';
            this.renderGame(this);
            const winInfo = this.checkWin(this.gameBoard);
             if(winInfo || this.checkDraw(this.gameBoard)) {
                this.gameActive = false;
                this.renderGame(this);
            }
        }
    }

    getBotMove_Easy() {
        const emptyCells = [];
        this.gameBoard.forEach((cell, index) => { if (cell === '') emptyCells.push(index); });
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    getBotMove_Medium() {
        // ... Orta seviye bot mantığı
    }

    getBotMove_Hard() {
        // ... Minimax algoritması ile zor bot mantığı
    }

    checkWin(board) { /* ... Sunucudaki checkWin'in aynısı ... */ }
    checkDraw(board) { /* ... Sunucudaki checkDraw'un aynısı ... */ }

    resetGame() {
        // ...
        this.isBotGame = false; // Bot oyununu sıfırla
        // ... (önceki resetGame mantığı aynı)
    }
}
// ... (new XOXGame() aynı)
