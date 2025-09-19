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

    init() { /* Değişiklik Yok */ }
    createGameUI() { /* Değişiklik Yok */ }
    extractPlayerName() { /* Değişiklik Yok */ }
    setupEventListeners() { /* Değişiklik Yok */ }
    
    showPage(pageName) {
        if (!pageName) return;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageName));
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${pageName}`).classList.add('active');
        this.currentPage = pageName;
        // --- DEĞİŞİKLİK BURADA ---
        if (pageName === 'stats') {
            this.loadStats(); // Artık istatistikleri yüklüyoruz.
        }
    }

    togglePanel() { /* Değişiklik Yok */ }
    async apiRequest(endpoint, options = {}) { /* Değişiklik Yok */ }

    async createRoom() {
        const maxRounds = document.getElementById('max-rounds').value;
        this.showNotification("Oda oluşturuluyor...", "info"); // Kullanıcıya bilgi ver
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
            // Hata mesajını zaten apiRequest fonksiyonu gösteriyor.
        }
    }

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
                this.activeUsers = result.activeUsers;
                this.updateRooms();
                this.updateHeaderStats();
            }
        } catch(e) { console.error("Oda listesi alınamadı", e) }
    }

    startRoomMonitoring() { /* Değişiklik Yok */ }
    stopRoomMonitoring() { /* Değişiklik Yok */ }
    updateRooms() { /* Değişiklik Yok */ }

    // --- DEĞİŞEN FONKSİYONLAR ---
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
    // --- DEĞİŞİKLİK BİTTİ ---

    showNotification(message, type, duration) { /* Değişiklik Yok */ }
    resetGame() { /* Değişiklik Yok */ }
    updateHeaderStats() { /* Değişiklik Yok */ }
}
new XOXGame();
