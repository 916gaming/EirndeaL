const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let rooms = {};

function shuffleDeck() {
  const allCards = [
    { type: 'money', value: 1 }, { type: 'money', value: 2 },
    { type: 'property', color: 'blue' }, { type: 'property', color: 'red' },
    { type: 'property', color: 'green' }, { type: 'property', color: 'yellow' },
    { type: 'action', action: 'steal' }, { type: 'action', action: 'rent' },
    { type: 'wild', colors: ['red', 'yellow'] }, { type: 'wild', colors: ['blue', 'green'] },
  ];
  const deck = [...allCards, ...allCards, ...allCards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCards(deck, count) {
  const drawn = [];
  for (let i = 0; i < count && deck.length > 0; i++) {
    drawn.push(deck.pop());
  }
  return drawn;
}

function nextPlayer(room) {
  const playerIds = room.players.map(p => p.id);
  const currentIndex = playerIds.indexOf(room.gameState.currentPlayerId);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  room.gameState.currentPlayerId = playerIds[nextIndex];
}

function checkWinCondition(room) {
  const sets = room.gameState.propertySets || {};
  for (const pid in sets) {
    if (sets[pid].length >= 3) {
      io.to(pid).emit('gameUpdate', { ...room.gameState, winner: pid });
      return true;
    }
  }
  return false;
}

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', (roomId, name) => {
    rooms[roomId] = {
      players: [{ id: socket.id, name }],
      gameState: null,
    };
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
  });

  socket.on('joinRoom', ({ roomId, name }) => {
    if (!rooms[roomId]) return socket.emit('error', 'Room not found');
    rooms[roomId].players.push({ id: socket.id, name });
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
  });

  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    const deck = shuffleDeck();
    const hands = {};
    room.players.forEach(p => {
      hands[p.id] = drawCards(deck, 5);
    });
    room.gameState = {
      deck,
      hands,
      currentPlayerId: room.players[0].id,
      played: {},
      propertySets: {}
    };
    io.to(roomId).emit('gameStarted', room.gameState);
  });

  socket.on('playCard', ({ roomId, cardIndex }) => {
    const room = rooms[roomId];
    if (!room || !room.gameState) return;

    const playerId = socket.id;
    if (playerId !== room.gameState.currentPlayerId) return;

    const hand = room.gameState.hands[playerId];
    if (!hand || cardIndex < 0 || cardIndex >= hand.length) return;

    const card = hand.splice(cardIndex, 1)[0];

    if (!room.gameState.played[playerId]) room.gameState.played[playerId] = [];
    room.gameState.played[playerId].push(card);

    if (card.type === 'property' || card.type === 'wild') {
      if (!room.gameState.propertySets[playerId]) room.gameState.propertySets[playerId] = [];
      room.gameState.propertySets[playerId].push(card);
    }

    if (checkWinCondition(room)) return;

    nextPlayer(room);
    io.to(roomId).emit('gameUpdate', room.gameState);
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
