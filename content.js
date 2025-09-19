class XOXGame {
    constructor() {
        this.apiUrl = "https://xox-update.onrender.com";
        this.player = { name: 'Misafir' + Math.floor(Math.random() * 1000), symbol: null };
        this.currentPage = 'rooms';
        this.allRooms = [];
        this.activeUsers = 0; // Aktif kullanıcıları saklamak için
        this.pollingErrorCount = 0;
        this.roomId = null;
        this.canMove = true;
        this.init();
    }

    init() { /* Değişiklik Yok */ }

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
    renderGame(room) { /* Değişiklik Yok */ }
    drawWinningLine() { /* Değişiklik Yok */ }
    startPolling() { /* Değişiklik Yok */ }
    stopPolling() { /* Değişiklik Yok */ }
    
    async fetchRoomsAndUpdate() {
        try {
            const result = await this.apiRequest('rooms');
            if (result.success) {
                this.allRooms = result.rooms;
                this.activeUsers = result.activeUsers; // Sunucudan gelen yeni bilgiyi al
                this.updateRooms();
                this.updateHeaderStats(); // Başlıktaki sayıyı güncelle
            }
        } catch(e) { console.error("Oda listesi alınamadı", e) }
    }
    
    startRoomMonitoring() {
        this.stopRoomMonitoring();
        this.roomMonitorInterval = setInterval(() => this.fetchRoomsAndUpdate(), 5000); // 5 saniyede bir güncelle
        this.fetchRoomsAndUpdate();
    }

    stopRoomMonitoring() { /* Değişiklik Yok */ }
    updateRooms() { /* Değişiklik Yok */ }
    async loadStats() { /* Değişiklik Yok */ }
    renderStats(stats) { /* Değişiklik Yok */ }
    showNotification(message, type, duration) { /* Değişiklik Yok */ }
    resetGame() { /* Değişiklik Yok */ }

    // YENİ FONKSİYON
    updateHeaderStats() {
        const countElement = document.querySelector('#xox-game-panel .active-users-count');
        if (countElement) {
            countElement.textContent = this.activeUsers;
        }
    }
}
new XOXGame();
