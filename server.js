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
const USER_ROOM_MAP_KEY = "xox_user_rooms";
const STATS_KEY = "xox_stats";
const getRoomKey = (roomId) => `xox_room:${roomId}`;
const ROOM_EXPIRATION_SECONDS = 180;

const WINNING_COMBINATIONS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const checkWin = (board) => {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
        const [a, b, c] = WINNING_COMBINATIONS[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winnerSymbol: board[a], line: WINNING_COMBINATIONS[i], index: i };
        }
    }
    return null;
};
const checkDraw = (board) => board.every(cell => cell !== '');

const prepareNextRound = (room) => {
    room.currentRound++;
    room.gameBoard = Array(9).fill('');
    room.winner = null;
    room.isDraw = false;
    room.winningLine = null;
    room.currentPlayer = room.players[(room.currentRound - 1) % 2].symbol;
    room.gameActive = true;
};

app.get("/", (req, res) => res.json({ success: true, message: "CG XOX Sunucusu Aktif" }));

app.get("/rooms", async (req, res) => {
    try {
        if (!redisClient?.isOpen) return res.status(503).json({ success: false, message: "Veritabanı hazır değil." });
        const roomIds = await redisClient.sMembers(ROOMS_SET_KEY);
        if (roomIds.length === 0) return res.json({ success: true, rooms: [] });
        const roomsData = await redisClient.mGet(roomIds.map(getRoomKey));
        const validRoomsData = [];
        const ghostRoomIds = [];
        roomsData.forEach((data, index) => {
            if(data) validRoomsData.push(data);
            else ghostRoomIds.push(roomIds[index]);
        });
        if(ghostRoomIds.length > 0) await redisClient.sRem(ROOMS_SET_KEY, ghostRoomIds);
        const roomList = validRoomsData.map(r => JSON.parse(r))
            .filter(r => r && !r.gameFinished)
            .map(r => ({ id: r.id, players: r.players, spectators: r.spectators || [], roundWins: r.roundWins || {} }));
        res.json({ success: true, rooms: roomList });
    } catch (err) { res.status(500).json({ success: false, message: "Odalar alınamadı." }); }
});

app.get("/rooms/:roomId", async (req, res) => {
    const roomData = await redisClient.get(getRoomKey(req.params.roomId));
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    res.json({ success: true, room: JSON.parse(roomData) });
});

app.post("/rooms", async (req, res) => {
    const { creatorName, maxRounds } = req.body;
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
    await redisClient.hSet(USER_ROOM_MAP_KEY, creatorName, roomId);
    res.status(201).json({ success: true, roomId });
});

app.post("/rooms/:roomId/join", async (req, res) => {
    const { playerName } = req.body;
    const existingRoom = await redisClient.hGet(USER_ROOM_MAP_KEY, playerName);
    if (existingRoom) {
        return res.status(409).json({ success: false, message: "Zaten başka bir odadasınız." });
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
    await redisClient.hSet(USER_ROOM_MAP_KEY, playerName, req.params.roomId);
    res.json({ success: true, room });
});

app.post("/rooms/:roomId/watch", async (req, res) => {
    // ... (Öncekiyle aynı)
});

app.post("/rooms/:roomId/move", async (req, res) => {
    const { player, index } = req.body;
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    let room = JSON.parse(roomData);
    if (!room.gameActive || room.currentPlayer !== player.symbol || room.gameBoard[index] !== '') {
        return res.status(400).json({ success: false, message: "Geçersiz hamle" });
    }
    room.gameBoard[index] = player.symbol;
    const winInfo = checkWin(room.gameBoard);
    const isDraw = !winInfo && checkDraw(room.gameBoard);
    if (winInfo || isDraw) {
        await redisClient.hIncrBy(STATS_KEY, 'totalRoundsPlayed', 1);
        if (winInfo) {
            const winner = room.players.find(p => p.symbol === winInfo.winnerSymbol);
            if(winner) {
                room.roundWins[winner.name]++;
                room.winner = winner.name;
                room.winningLine = winInfo;
                if (room.roundWins[winner.name] > room.maxRounds / 2 || room.currentRound >= room.maxRounds) room.gameFinished = true;
            }
        } else {
            room.isDraw = true;
            if (room.currentRound >= room.maxRounds) room.gameFinished = true;
        }
        room.gameActive = false;
    } else {
        room.currentPlayer = player.symbol === 'X' ? 'O' : 'X';
    }
    await redisClient.set(roomKey, JSON.stringify(room), { KEEPTTL: true });
    if (!room.gameFinished) await redisClient.expire(roomKey, ROOM_EXPIRATION_SECONDS);
    else await redisClient.expire(roomKey, 30);
    res.json({ success: true, room });
});

app.post("/rooms/:roomId/next-round", async (req, res) => {
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    let room = JSON.parse(roomData);
    if (room.gameFinished) return res.status(400).json({ success: false, message: "Oyun zaten bitti." });
    prepareNextRound(room);
    await redisClient.set(roomKey, JSON.stringify(room), { KEEPTTL: true });
    await redisClient.expire(roomKey, ROOM_EXPIRATION_SECONDS);
    res.json({ success: true, room });
});

app.post("/rooms/:roomId/leave", async (req, res) => {
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if(roomData){
        let room = JSON.parse(roomData);
        for (const p of room.players) {
            await redisClient.hDel(USER_ROOM_MAP_KEY, p.name);
        }
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
