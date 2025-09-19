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

app.get("/rooms", async (req, res) => { /* Değişiklik Yok */ });
app.get("/rooms/:roomId", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/join", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/watch", async (req, res) => { /* Değişiklik Yok */ });

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
    
    if (winInfo) {
        const winner = room.players.find(p => p.symbol === winInfo.winner);
        if(winner) {
            room.roundWins[winner.name]++;
            room.winner = winner.name;
            room.winningLine = winInfo;
            room.gameActive = false;

            // --- DÜZELTME BURADA ---
            // "Best of" mantığı düzeltildi. Oyuncu, turların yarısından fazlasını kazanmalı.
            if (room.roundWins[winner.name] > room.maxRounds / 2 || room.currentRound >= room.maxRounds) {
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
        await redisClient.expire(roomKey, ROOM_EXPIRATION_SECONDS);
    } else {
        await redisClient.expire(roomKey, 30);
    }
    res.json({ success: true, room });
});

app.post("/rooms/:roomId/next-round", async (req, res) => { /* Değişiklik Yok */ });
app.post("/rooms/:roomId/leave", async (req, res) => { /* Değişiklik Yok */ });
app.get("/stats", (req, res) => { /* Değişiklik Yok */ });

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
