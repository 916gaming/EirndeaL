
// Monopoly Deal - Online Multiplayer Frontend (React)
// Requires: npm install socket.io-client

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { FaMoneyBill, FaHome, FaExchangeAlt, FaMagic } from 'react-icons/fa';

const socket = io('http://localhost:3000'); // Update if deployed

export default function MonopolyDeal() {
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    socket.on('roomUpdate', (room) => {
      setPlayers(room.players);
    });
    socket.on('gameStarted', (state) => {
      setGameState(state);
      setGameStarted(true);
    });
    socket.on('gameUpdate', (state) => {
      setGameState(state);
    });
    socket.on('error', (msg) => alert(msg));
  }, []);

  const createRoom = () => {
    if (!roomId || !name) return alert('Enter room and name');
    socket.emit('createRoom', roomId, name);
    setInRoom(true);
  };

  const joinRoom = () => {
    if (!roomId || !name) return alert('Enter room and name');
    socket.emit('joinRoom', { roomId, name });
    setInRoom(true);
  };

  const startGame = () => {
    socket.emit('startGame', roomId);
  };

  const playCard = (cardIndex) => {
    socket.emit('playCard', { roomId, cardIndex });
  };

  const getCardIcon = (type) => {
    switch (type) {
      case 'money': return <FaMoneyBill className="inline mr-1" />;
      case 'property': return <FaHome className="inline mr-1" />;
      case 'action': return <FaExchangeAlt className="inline mr-1" />;
      case 'wild': return <FaMagic className="inline mr-1" />;
      default: return null;
    }
  };

  const renderCard = (card, idx) => {
    const label = `${card.value || card.color || card.action || (card.colors && card.colors.join('/'))}`;
    const isMyTurn = gameState?.currentPlayerId === socket.id;
    return (
      <button
        key={idx}
        onClick={() => isMyTurn && playCard(idx)}
        className={`border p-2 m-1 rounded w-36 h-20 shadow-md ${isMyTurn ? 'bg-white hover:bg-gray-200' : 'bg-gray-300'} text-black text-sm flex flex-col justify-center items-center`}
        disabled={!isMyTurn}
      >
        <span>{getCardIcon(card.type)}</span>
        <span>{card.type.toUpperCase()}</span>
        <span>{label}</span>
      </button>
    );
  };

  const checkWin = () => {
    const mySets = gameState?.propertySets?.[socket.id] || [];
    return mySets.length >= 3 ? '🎉 You Win!' : '';
  };

  return (
    <div className="p-4 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">🎴 Monopoly Deal Online</h1>
      {!inRoom ? (
        <div className="space-y-2">
          <input
            className="border p-2 w-full"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 w-full"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <div className="flex gap-2 justify-center">
            <button className="bg-green-500 text-white px-4 py-2" onClick={createRoom}>
              Create Room
            </button>
            <button className="bg-blue-500 text-white px-4 py-2" onClick={joinRoom}>
              Join Room
            </button>
          </div>
        </div>
      ) : !gameStarted ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">Room: {roomId}</h2>
          <h3 className="mb-4">Players:</h3>
          <ul className="mb-4">
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
          <button className="bg-purple-600 text-white px-6 py-2" onClick={startGame}>
            Start Game
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Game in Progress</h2>
          <p className="mb-2">{gameState?.currentPlayerId === socket.id ? "Your turn!" : "Waiting for other player..."}</p>
          {checkWin() && <h2 className="text-green-600 font-bold text-xl mb-2 animate-bounce">{checkWin()}</h2>}
          {gameState?.hands && (
            <div>
              <h3 className="mb-2">Your Hand:</h3>
              <div className="flex flex-wrap justify-center">
                {gameState.hands[socket.id]?.map((card, idx) => renderCard(card, idx))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
