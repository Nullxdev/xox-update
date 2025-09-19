const express = require("express");
const cors = require("cors");
const redis = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let redisClient;
(async () => {
    try {
        if (!process.env.REDIS_URL) throw new Error("REDIS_URL bulunamadı.");
        redisClient = redis.createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Hatası', err));
        await redisClient.connect();
        console.log("✅ Redis'e başarıyla bağlanıldı.");
    } catch (err) {
        console.error("❌ Redis bağlantısı kurulamadı:", err.message);
    }
})();

const ROOMS_SET_KEY = "xox_rooms_set";
const getRoomKey = (roomId) => `xox_room:${roomId}`;
let gameStats = { recentGames: [] };

// Diğer yardımcı fonksiyonlar (checkWin, checkDraw, prepareNextRound) aynı kalacak...

app.get("/", (req, res) => res.json({ success: true, message: "CG XOX Sunucusu Aktif" }));

app.get("/rooms", async (req, res) => {
    try {
        if (!redisClient?.isOpen) return res.status(503).json({ success: false, message: "Veritabanı hazır değil." });
        const roomIds = await redisClient.sMembers(ROOMS_SET_KEY);
        if (roomIds.length === 0) return res.json({ success: true, rooms: [], activeUsers: 0 });
        
        const roomsData = await redisClient.mGet(roomIds.map(getRoomKey));
        // ... (Öncekiyle aynı hayalet oda temizleme mantığı) ...

        const roomList = validRoomsData.map(roomStr => JSON.parse(roomStr));
        const activeUsers = roomList.reduce((acc, room) => acc + (room.players?.length || 0) + (room.spectators?.length || 0), 0);
        const filteredRoomList = roomList.filter(room => room && !room.gameFinished)
            .map(room => ({ id: room.id, players: room.players, spectators: room.spectators || [], roundWins: room.roundWins || {} }));

        res.json({ success: true, rooms: filteredRoomList, activeUsers: activeUsers });
    } catch (err) {
        res.status(500).json({ success: false, message: "Odalar alınamadı." });
    }
});

// Diğer endpointler (/rooms/:roomId, /rooms, /join, /watch, /move, /next-round, /leave) aynı kalacak...

app.get("/stats", async (req, res) => {
    try {
        if (!redisClient?.isOpen) return res.status(503).json({ success: false, message: "Veritabanı hazır değil." });
        const roomIds = await redisClient.sMembers(ROOMS_SET_KEY);
        if (roomIds.length === 0) return res.json({ success: true, stats: { ...gameStats, activeUsers: 0 } });

        const roomsData = await redisClient.mGet(roomIds.map(getRoomKey));
        const roomList = roomsData.filter(Boolean).map(roomStr => JSON.parse(roomStr));
        const activeUsers = roomList.reduce((acc, room) => acc + (room.players?.length || 0) + (room.spectators?.length || 0), 0);

        res.json({ success: true, stats: { ...gameStats, activeUsers: activeUsers } });
    } catch (err) {
        res.status(500).json({ success: false, message: "İstatistikler alınamadı." });
    }
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
