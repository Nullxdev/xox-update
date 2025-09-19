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
const ROOM_EXPIRATION_SECONDS = 180;
let gameStats = { recentGames: [] };

const WINNING_COMBINATIONS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const checkWin = (board) => { /* Değişiklik Yok */ };
const checkDraw = (board) => { /* Değişiklik Yok */ };
const prepareNextRound = (room) => { /* Değişiklik Yok */ };

app.get("/", (req, res) => res.json({ success: true, message: "CG XOX Sunucusu Aktif" }));

app.get("/rooms", async (req, res) => {
    try {
        if (!redisClient?.isOpen) return res.status(503).json({ success: false, message: "Veritabanı hazır değil." });
        const roomIds = await redisClient.sMembers(ROOMS_SET_KEY);
        if (roomIds.length === 0) return res.json({ success: true, rooms: [], activeUsers: 0 });
        
        const roomsData = await redisClient.mGet(roomIds.map(getRoomKey));
        
        const validRoomsData = [];
        const ghostRoomIds = [];
        for(let i = 0; i < roomsData.length; i++) {
            if(roomsData[i]) {
                validRoomsData.push(roomsData[i]);
            } else {
                ghostRoomIds.push(roomIds[i]);
            }
        }
        if(ghostRoomIds.length > 0) {
            await redisClient.sRem(ROOMS_SET_KEY, ghostRoomIds);
        }

        const roomList = validRoomsData.map(roomStr => JSON.parse(roomStr));
        
        // --- DEĞİŞİKLİK BURADA ---
        // Aktif kullanıcı sayısını hesapla (oyuncular + izleyiciler)
        const activeUsers = roomList.reduce((acc, room) => {
            return acc + (room.players?.length || 0) + (room.spectators?.length || 0);
        }, 0);
        
        const filteredRoomList = roomList
            .filter(room => room && !room.gameFinished)
            .map(room => ({ id: room.id, players: room.players, spectators: room.spectators || [], roundWins: room.roundWins || {} }));

        res.json({ success: true, rooms: filteredRoomList, activeUsers: activeUsers });
        // --- DEĞİŞİKLİK BİTTİ ---

    } catch (err) {
        res.status(500).json({ success: false, message: "Odalar alınamadı." });
    }
});

app.get("/rooms/:roomId", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/join", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/watch", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/move", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/next-round", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/leave", async (req, res) => { /* Değişiklik Yok */ });
app.get("/stats", (req, res) => { /* Değişiklik Yok */ });

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
