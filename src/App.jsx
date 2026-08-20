import { HashRouter, Routes, Route } from 'react-router-dom';
import Landing from './Pages/Landing';
import Sign from './Pages/Sign';
import Login from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import DashAdmin from './components/admin/DashAdmin';
import SuperDash from './components/supervisor/SuperDash';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path='/sign' element={<Sign/>} />
        <Route path='/login' element={<Login/>} />
        <Route path='/dashboard' element={<Dashboard/>} />
        <Route path='/admin-dashboard' element={<DashAdmin/>} />
         <Route path='/supervisor-dashboard' element={<SuperDash/>} />
        
      </Routes>
    </HashRouter>
  );
}

export default App;