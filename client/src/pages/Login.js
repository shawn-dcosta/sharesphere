// import { useState } from 'react';
// import axios from 'axios';
// import { Link } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { LogIn } from 'lucide-react';

// export default function Login() {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     try {
//       const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
//       login(res.data);
//     } catch (err) {
//       setError('Failed to login. Please check your credentials.');
//       console.error(err);
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex items-center justify-center h-screen bg-gray-900 px-4">
//       <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl">
//         <div className="text-center">
//             <h1 className="text-4xl font-bold text-white">Share<span className="text-blue-500">Sphere</span></h1>
//             <p className="text-gray-400 mt-2">Sign in to start sharing files instantly.</p>
//         </div>
//         <form className="space-y-6" onSubmit={handleLogin}>
//           <div>
//             <label className="text-sm font-bold text-gray-400">Username</label>
//             <input
//               type="text"
//               required
//               className="w-full p-3 mt-1 text-gray-200 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//               onChange={(e) => setUsername(e.target.value)}
//             />
//           </div>
//           <div>
//             <label className="text-sm font-bold text-gray-400">Password</label>
//             <input
//               type="password"
//               required
//               className="w-full p-3 mt-1 text-gray-200 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//               onChange={(e) => setPassword(e.target.value)}
//             />
//           </div>
//           {error && <p className="text-red-500 text-sm text-center">{error}</p>}
//           <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed">
//             {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <LogIn size={20}/>}
//             <span>{loading ? 'Signing In...' : 'Sign In'}</span>
//           </button>
//         </form>
//         <p className="text-sm text-center text-gray-400">
//           Don't have an account? <Link to="/register" className="font-medium text-blue-500 hover:underline">Register here</Link>
//         </p>
//       </div>
//     </div>
//   );
// }



// ---------------------------------------------------------------------------------------------------------------------------


// File: /client/src/pages/Login.js

import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}}/api/auth/login`, { email, password });
      login(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white">Share<span className="text-blue-500">Sphere</span></h1>
            <p className="text-gray-400 mt-2">Sign in to start sharing files instantly.</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="text-sm font-bold text-gray-400">Email</label>
            <input
              type="email"
              required
              className="w-full p-3 mt-1 text-gray-200 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-400">Password</label>
            <input
              type="password"
              required
              className="w-full p-3 mt-1 text-gray-200 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed">
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <LogIn size={20}/>}
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>
        <p className="text-sm text-center text-gray-400">
          Don't have an account? <Link to="/register" className="font-medium text-blue-500 hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}