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
        this.checkForSavedGame(); // YENİ: Sayfa yüklendiğinde kayıtlı oyun var mı diye kontrol et.
    }

    createGameUI() { /* Öncekiyle aynı, değişiklik yok */ }
    extractPlayerName() { /* Öncekiyle aynı, değişiklik yok */ }
    setupEventListeners() { /* Öncekiyle aynı, değişiklik yok */ }
    showPage(pageName) { /* Öncekiyle aynı, değişiklik yok */ }
    togglePanel() { /* Öncekiyle aynı, değişiklik yok */ }
    async apiRequest(endpoint, options = {}) { /* Öncekiyle aynı, değişiklik yok */ }

    async createRoom() {
        const maxRounds = document.getElementById('max-rounds').value;
        this.showNotification("Oda oluşturuluyor...", "info");
        try {
            const result = await this.apiRequest('rooms', { method: 'POST', body: JSON.stringify({ creatorName: this.player.name, maxRounds }) });
            if (result.success) {
                this.roomId = result.roomId;
                this.player.symbol = 'X';
                this.saveGameState(); // YENİ: Oyun durumunu kaydet
                this.showPage('game');
                this.startPolling();
            }
        } catch (e) { console.error("Oda oluşturulamadı:", e); }
    }

    async joinRoom(roomId) {
        try {
            const result = await this.apiRequest(`rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ playerName: this.player.name }) });
            if (result.success) {
                this.roomId = result.roomId;
                this.player.symbol = 'O';
                this.saveGameState(); // YENİ: Oyun durumunu kaydet
                this.showPage('game');
                this.renderGame(result.room);
                this.startPolling();
            }
        } catch (e) { console.error("Odaya katılamadı:", e); }
    }

    async watchRoom(roomId) {
        try {
            const result = await this.apiRequest(`rooms/${roomId}/watch`, { method: 'POST', body: JSON.stringify({ spectatorName: this.player.name }) });
            if (result.success) {
                this.roomId = result.roomId;
                this.player.symbol = null;
                this.saveGameState(); // YENİ: Oyun durumunu kaydet
                this.showPage('game');
                this.renderGame(result.room);
                this.startPolling();
            }
        } catch (e) { console.error("Oda izlenemedi:", e); }
    }

    async handleCellClick(event) { /* Öncekiyle aynı, değişiklik yok */ }
    async leaveRoom() { /* Öncekiyle aynı, değişiklik yok */ }
    renderGame(room) { /* Öncekiyle aynı, değişiklik yok */ }
    drawWinningLine() { /* Öncekiyle aynı, değişiklik yok */ }
    startPolling() { /* Öncekiyle aynı, değişiklik yok */ }
    stopPolling() { /* Öncekiyle aynı, değişiklik yok */ }
    async fetchRoomsAndUpdate() { /* Öncekiyle aynı, değişiklik yok */ }
    startRoomMonitoring() { /* Öncekiyle aynı, değişiklik yok */ }
    stopRoomMonitoring() { /* Öncekiyle aynı, değişiklik yok */ }
    updateRooms() { /* Öncekiyle aynı, değişiklik yok */ }
    async loadStats() { /* Öncekiyle aynı, değişiklik yok */ }
    renderStats(stats) { /* Öncekiyle aynı, değişiklik yok */ }
    showNotification(message, type, duration) { /* Öncekiyle aynı, değişiklik yok */ }
    updateHeaderStats() { /* Öncekiyle aynı, değişiklik yok */ }

    // --- YENİ FONKSİYONLAR ---
    saveGameState() {
        if (this.roomId && this.player) {
            const gameState = { roomId: this.roomId, player: this.player };
            localStorage.setItem('xoxGameState', JSON.stringify(gameState));
        }
    }

    clearGameState() {
        localStorage.removeItem('xoxGameState');
    }

    checkForSavedGame() {
        const savedStateJSON = localStorage.getItem('xoxGameState');
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState.roomId && savedState.player) {
                    console.log('Kaydedilmiş oyun bulundu, yeniden bağlanılıyor...', savedState);
                    this.roomId = savedState.roomId;
                    this.player = savedState.player;

                    const panel = document.getElementById('xox-game-panel');
                    if (!panel.classList.contains('panel-visible')) {
                        panel.classList.add('panel-visible');
                    }
                    this.showPage('game');
                    this.startPolling();
                }
            } catch (e) {
                this.clearGameState(); // Bozuk veriyi temizle
            }
        }
    }
    // --- YENİ FONKSİYONLAR BİTTİ ---
    
    resetGame() {
        this.stopPolling();
        this.startRoomMonitoring();
        this.clearGameState(); // YENİ: Oyun bitince veya odadan ayrılınca durumu temizle
        this.roomId = null;
        this.player.symbol = null;
        this.canMove = true;
        document.getElementById('game-nav').style.display = 'none';
        this.showPage('rooms');
    }
}

new XOXGame();
