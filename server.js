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
        if (!process.env.REDIS_URL) {
            throw new Error("REDIS_URL environment değişkeni bulunamadı.");
        }
        redisClient = redis.createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Client Hatası', err));
        await redisClient.connect();
        console.log("✅ Redis'e başarıyla bağlanıldı.");
    } catch (err) {
        console.error("❌ Redis bağlantısı kurulamadı:", err.message);
    }
})();

const ROOMS_SET_KEY = "xox_rooms_set";
const getRoomKey = (roomId) => `xox_room:${roomId}`;
let gameStats = { recentGames: [] };

app.get("/", (req, res) => res.json({ success: true, message: "CG XOX Sunucusu Aktif (Redis)" }));

app.get("/rooms", async (req, res) => {
    try {
        if (!redisClient?.isOpen) return res.status(503).json({ success: false, message: "Veritabanı bağlantısı hazır değil." });
        
        const roomIds = await redisClient.sMembers(ROOMS_SET_KEY);
        if (roomIds.length === 0) return res.json({ success: true, rooms: [] });
        
        const roomsData = await redisClient.mGet(roomIds.map(getRoomKey));
        const roomList = roomsData
            .filter(Boolean)
            .map(roomStr => JSON.parse(roomStr))
            .filter(room => room && !room.gameFinished)
            .map(room => ({ id: room.id, players: room.players, spectators: room.spectators || [], roundWins: room.roundWins || {} }));
        res.json({ success: true, rooms: roomList });
    } catch (err) {
        res.status(500).json({ success: false, message: "Odalar alınırken sunucu hatası oluştu." });
    }
});

app.get("/rooms/:roomId", async (req, res) => {
    const roomData = await redisClient.get(getRoomKey(req.params.roomId));
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    res.json({ success: true, room: JSON.parse(roomData) });
});

app.post("/rooms", async (req, res) => {
    const { creatorName, maxRounds } = req.body;
    if (!creatorName) return res.status(400).json({ success: false, message: "Oyuncu adı gerekli" });

    const roomId = "XOX" + Math.random().toString(36).substr(2, 4).toUpperCase();
    const room = {
        id: roomId, players: [creatorName], gameBoard: Array(9).fill(''),
        currentPlayer: 'X', gameActive: false, winner: null, isDraw: false,
        maxRounds: Math.min(maxRounds || 1, 10), currentRound: 1,
        roundWins: { [creatorName]: 0 }, spectators: [], chatMessages: [], gameFinished: false,
    };

    await redisClient.sAdd(ROOMS_SET_KEY, roomId);
    await redisClient.set(getRoomKey(roomId), JSON.stringify(room), { EX: 3600 });

    console.log(`✨ Yeni oda (Redis): ${roomId} (${creatorName})`);
    res.status(201).json({ success: true, roomId });
});

app.post("/rooms/:roomId/join", async (req, res) => {
    const { playerName } = req.body;
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });

    let room = JSON.parse(roomData);
    if (room.players.length >= 2) return res.status(409).json({ success: false, message: "Oda dolu" });

    room.players.push(playerName);
    room.roundWins[playerName] = 0;
    room.gameActive = true;

    await redisClient.set(roomKey, JSON.stringify(room), { KEEPTTL: true });
    console.log(`🎮 ${playerName} odaya katıldı (Redis): ${room.id}. Oyun başladı!`);
    res.json({ success: true, symbol: 'O', ...room });
});

app.get("/stats", (req, res) => res.json({ success: true, stats: gameStats }));

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
