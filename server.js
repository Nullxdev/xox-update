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
const USER_ROOM_MAP_KEY = "xox_user_rooms"; // Oyuncuların hangi odada olduğunu tutar
const STATS_KEY = "xox_stats"; // Genel istatistikleri tutar
const getRoomKey = (roomId) => `xox_room:${roomId}`;
const ROOM_EXPIRATION_SECONDS = 180;

// ... (checkWin, checkDraw, prepareNextRound fonksiyonları öncekiyle aynı)

app.get("/", (req, res) => res.json({ success: true, message: "CG XOX Sunucusu Aktif" }));
app.get("/rooms", async (req, res) => { /* Değişiklik Yok */ });
app.get("/rooms/:roomId", async (req, res) => { /* Değişiklik Yok */ });

app.post("/rooms", async (req, res) => {
    const { creatorName, maxRounds } = req.body;

    // YENİ: Oyuncunun zaten bir odada olup olmadığını kontrol et
    const existingRoom = await redisClient.hGet(USER_ROOM_MAP_KEY, creatorName);
    if (existingRoom) {
        return res.status(409).json({ success: false, message: "Zaten başka bir odadasınız. Yeni oda kuramazsınız." });
    }

    const roomId = "XOX" + Math.random().toString(36).substr(2, 4).toUpperCase();
    const room = {
        id: roomId, players: [{name: creatorName, symbol: 'X'}], gameBoard: Array(9).fill(''),
        currentPlayer: 'X', gameActive: false, winner: null, isDraw: false, winningLine: null,
        maxRounds: Math.min(parseInt(maxRounds) || 1, 10), currentRound: 1,
        roundWins: { [creatorName]: 0 }, spectators: [], gameFinished: false,
    };
    await redisClient.sAdd(ROOMS_SET_KEY, roomId);
    await redisClient.set(getRoomKey(roomId), JSON.stringify(room), { EX: ROOM_EXPIRATION_SECONDS });
    await redisClient.hSet(USER_ROOM_MAP_KEY, creatorName, roomId); // Oyuncuyu odayla eşleştir

    res.status(201).json({ success: true, roomId });
});

app.post("/rooms/:roomId/join", async (req, res) => {
    const { playerName } = req.body;

    // YENİ: Oyuncunun zaten bir odada olup olmadığını kontrol et
    const existingRoom = await redisClient.hGet(USER_ROOM_MAP_KEY, playerName);
    if (existingRoom) {
        return res.status(409).json({ success: false, message: "Zaten başka bir odadasınız. Başka bir odaya katılamazsınız." });
    }

    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    let room = JSON.parse(roomData);
    if (room.players.length >= 2) return res.status(409).json({ success: false, message: "Oda dolu" });
    
    room.players.push({name: playerName, symbol: 'O'});
    room.roundWins[playerName] = 0;
    room.gameActive = true;
    
    await redisClient.set(roomKey, JSON.stringify(room), { KEEPTTL: true });
    await redisClient.expire(roomKey, ROOM_EXPIRATION_SECONDS);
    await redisClient.hSet(USER_ROOM_MAP_KEY, playerName, req.params.roomId); // Oyuncuyu odayla eşleştir
    
    res.json({ success: true, room });
});

app.post("/rooms/:roomId/watch", async (req, res) => { /* Değişiklik Yok */ });

app.post("/rooms/:roomId/move", async (req, res) => {
    const { player, index } = req.body;
    // ... (önceki move mantığı aynı)
    const winInfo = checkWin(room.gameBoard);
    
    if (winInfo || checkDraw(room.gameBoard)) {
        // Bir tur bittiğinde toplam oynanan tur sayısını artır
        await redisClient.hIncrBy(STATS_KEY, 'totalRoundsPlayed', 1);
    }
    
    // ... (önceki move mantığının geri kalanı aynı)
});

app.post("/rooms/:roomId/next-round", async (req, res) => { /* Değişiklik Yok */ });

app.post("/rooms/:roomId/leave", async (req, res) => {
    const { playerName } = req.body; // Ayrılan oyuncunun adını almalıyız
    // Oyuncuyu odadan çıkar ve haritadan sil
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if(roomData){
        let room = JSON.parse(roomData);
        room.players.forEach(p => {
            redisClient.hDel(USER_ROOM_MAP_KEY, p.name);
        });
    }
    await redisClient.sRem(ROOMS_SET_KEY, req.params.roomId);
    await redisClient.del(roomKey);
    res.json({ success: true });
});

app.get("/stats", async (req, res) => {
    try {
        if (!redisClient?.isOpen) return res.status(503).json({ success: false, message: "Veritabanı hazır değil." });
        const totalRoundsPlayed = await redisClient.hGet(STATS_KEY, 'totalRoundsPlayed') || 0;
        res.json({ success: true, stats: { totalRoundsPlayed: parseInt(totalRoundsPlayed) } });
    } catch (err) {
        res.status(500).json({ success: false, message: "İstatistikler alınamadı." });
    }
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
