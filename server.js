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
const ROOM_EXPIRATION_SECONDS = 180; // 3 Dakika

let gameStats = { recentGames: [] };

const WINNING_COMBINATIONS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const checkWin = (board) => {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
        const [a, b, c] = WINNING_COMBINATIONS[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: WINNING_COMBINATIONS[i], index: i };
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
        
        // Ömrü dolmuş ama listede kalmış "hayalet" odaları temizle
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

        const roomList = validRoomsData.map(roomStr => JSON.parse(roomStr))
            .filter(room => room && !room.gameFinished)
            .map(room => ({ id: room.id, players: room.players, spectators: room.spectators || [], roundWins: room.roundWins || {} }));

        res.json({ success: true, rooms: roomList });
    } catch (err) {
        res.status(500).json({ success: false, message: "Odalar alınamadı." });
    }
});

app.get("/rooms/:roomId", async (req, res) => {
    const roomData = await redisClient.get(getRoomKey(req.params.roomId));
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    res.json({ success: true, room: JSON.parse(roomData) });
});

app.post("/rooms", async (req, res) => {
    const { creatorName, maxRounds } = req.body;
    const roomId = "XOX" + Math.random().toString(36).substr(2, 4).toUpperCase();
    const room = {
        id: roomId, players: [{name: creatorName, symbol: 'X'}], gameBoard: Array(9).fill(''),
        currentPlayer: 'X', gameActive: false, winner: null, isDraw: false, winningLine: null,
        maxRounds: Math.min(parseInt(maxRounds) || 1, 10), currentRound: 1,
        roundWins: { [creatorName]: 0 }, spectators: [], gameFinished: false,
    };
    await redisClient.sAdd(ROOMS_SET_KEY, roomId);
    await redisClient.set(getRoomKey(roomId), JSON.stringify(room), { EX: ROOM_EXPIRATION_SECONDS });
    res.status(201).json({ success: true, roomId });
});

app.post("/rooms/:roomId/join", async (req, res) => {
    const { playerName } = req.body;
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    let room = JSON.parse(roomData);
    if (room.players.some(p => p.name === playerName)) return res.status(409).json({ success: false, message: "Zaten bu odadasınız." });
    if (room.players.length >= 2) return res.status(409).json({ success: false, message: "Oda dolu" });
    
    room.players.push({name: playerName, symbol: 'O'});
    room.roundWins[playerName] = 0;
    room.gameActive = true;
    
    await redisClient.set(roomKey, JSON.stringify(room));
    await redisClient.expire(roomKey, ROOM_EXPIRATION_SECONDS); // Sayaç sıfırla
    
    res.json({ success: true, room });
});

app.post("/rooms/:roomId/watch", async (req, res) => { /* Değişiklik Yok */ });

app.post("/rooms/:roomId/move", async (req, res) => {
    const { player, index } = req.body;
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    
    let room = JSON.parse(roomData);
    const playerInRoom = room.players.find(p => p.name === player.name);

    if (!room.gameActive || !playerInRoom || room.currentPlayer !== player.symbol || room.gameBoard[index] !== '') {
        return res.status(400).json({ success: false, message: "Geçersiz hamle" });
    }

    room.gameBoard[index] = player.symbol;
    const winInfo = checkWin(room.gameBoard);
    
    if (winInfo) {
        const winner = room.players.find(p => p.symbol === winInfo.winner);
        if(winner) {
            room.roundWins[winner.name]++;
            room.winner = winner.name;
            room.winningLine = winInfo;
            room.gameActive = false;
            if (room.roundWins[winner.name] >= Math.ceil(room.maxRounds / 2) || room.currentRound >= room.maxRounds) {
                room.gameFinished = true;
            }
        }
    } else if (checkDraw(room.gameBoard)) {
        room.isDraw = true;
        room.gameActive = false;
        if (room.currentRound >= room.maxRounds) {
            room.gameFinished = true;
        }
    } else {
        room.currentPlayer = player.symbol === 'X' ? 'O' : 'X';
    }

    await redisClient.set(roomKey, JSON.stringify(room));
    if (!room.gameFinished) {
        await redisClient.expire(roomKey, ROOM_EXPIRATION_SECONDS); // Sayaç sıfırla
    } else {
        await redisClient.expire(roomKey, 30); // Biten oyun 30 saniye daha dursun
    }

    res.json({ success: true, room });
});

app.post("/rooms/:roomId/next-round", async (req, res) => {
    const roomKey = getRoomKey(req.params.roomId);
    let roomData = await redisClient.get(roomKey);
    if (!roomData) return res.status(404).json({ success: false, message: "Oda bulunamadı" });
    let room = JSON.parse(roomData);
    if (room.gameFinished) return res.status(400).json({ success: false, message: "Oyun zaten bitti." });
    
    prepareNextRound(room);

    await redisClient.set(roomKey, JSON.stringify(room));
    await redisClient.expire(roomKey, ROOM_EXPIRATION_SECONDS); // Sayaç sıfırla

    res.json({ success: true, room });
});

app.post("/rooms/:roomId/leave", async (req, res) => {
    await redisClient.sRem(ROOMS_SET_KEY, req.params.roomId);
    await redisClient.del(getRoomKey(req.params.roomId));
    res.json({ success: true });
});

app.get("/stats", (req, res) => { /* Değişiklik Yok */ });

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
