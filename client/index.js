
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import MonopolyDeal from './client/MonopolyDeal'; // ❌ WRONG (if not in a subfolder)


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MonopolyDeal />);
