import { BrowserRouter as Router, Routes, Route,Link } from 'react-router-dom';
import { useState } from 'react';

import HomePage from './HomePage/HomePage';
import Login from './Authentication/Login';
import MainArena from './GameArena/MainArena';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path='/mainarena' element={<MainArena />} />
      </Routes>
    </Router>
  );
}

export default App;
