import { BrowserRouter as Router, Routes, Route,Link } from 'react-router-dom';
import { useState } from 'react';

import HomePage from './HomePage';
import Login from './Authentication/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
