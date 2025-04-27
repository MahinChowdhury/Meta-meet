import { BrowserRouter as Router, Routes, Route,Link } from 'react-router-dom';
import { useState } from 'react';

import HomePage from './HomePage/HomePage';
import Login from './Authentication/Login';
import MainArena from './GameArena/MainArena';
import ProfilePage from './Users/Profile';
import SpaceCreation from './Space/SpaceCreation';
import SpaceList from './Space/SpaceList';
import SpaceEditor from './Space/SpaceEditor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path='/mainarena' element={<MainArena />} />
        <Route path='/space/create' element={<SpaceCreation />} />
        <Route path='/space/list' element={<SpaceList />} />
        <Route path='/space/editor' element={<SpaceEditor />} />
      </Routes>
    </Router>
  );
}

export default App;
