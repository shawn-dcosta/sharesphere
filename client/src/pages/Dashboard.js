// import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
// import io from 'socket.io-client';
// import { User, Send, File as FileIcon, LogOut, Download, UploadCloud, CheckCircle, XCircle, Clock } from 'lucide-react';
// import fileSaver from 'file-saver';
// import { useAuth } from '../context/AuthContext';
// import axios from 'axios';

// export default function Dashboard() {
//   const { user, logout } = useAuth();
//   const [onlineUsers, setOnlineUsers] = useState({});
//   const [transfers, setTransfers] = useState({});
//   const [history, setHistory] = useState([]);
  
//   const socket = useRef(null);
//   const peerConnections = useRef({});
//   const fileChunks = useRef({});
//   const fileInputRef = useRef(null);
//   const targetUserRef = useRef(null);

//   const SOCKET_URL = 'http://localhost:5000';
//   const PC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
//   const CHUNK_SIZE = 65536; // 64KB
//   const BUFFER_THRESHOLD = CHUNK_SIZE * 10; // Pause sending if buffer exceeds 640KB

//   const fetchHistory = useCallback(async () => {
//     if (!user?._id) return;
//     try {
//         const res = await axios.get(`${SOCKET_URL}/api/history/${user._id}`);
//         setHistory(res.data);
//     } catch (error) {
//         console.error("Failed to fetch history", error);
//     }
//   }, [user?._id]);

//   const addTransferLog = useCallback(async (receiverId, fileName, fileSize) => {
//     if (!user?._id) return;
//     try {
//         await axios.post(`${SOCKET_URL}/api/history`, {
//             senderId: user._id,
//             receiverId,
//             fileName,
//             fileSize
//         });
//     } catch (error) {
//         console.error("Failed to log transfer", error);
//     }
//   }, [user?._id]);


//   const handleDataChannelMessage = useCallback((message, from) => {
//     try {
//         if (message.data instanceof ArrayBuffer) {
//             if (!fileChunks.current[from]) {
//                 fileChunks.current[from] = [];
//             }
//             fileChunks.current[from].push(message.data);
            
//             setTransfers(prev => {
//                 const state = prev[from];
//                 if (!state) return prev;
//                 const receivedSize = (fileChunks.current[from] || []).reduce((acc, chunk) => acc + chunk.byteLength, 0);
//                 const progress = Math.round((receivedSize / state.fileSize) * 100);
//                 return { ...prev, [from]: {...state, progress: progress} };
//             });
//         } else if (message.data === 'EOF') {
//             setTransfers(prev => {
//                 const state = prev[from];
//                 if (state && fileChunks.current[from]) {
//                     const file = new Blob(fileChunks.current[from]);
//                     fileSaver.saveAs(file, state.fileName);

//                     delete fileChunks.current[from];
                    
//                     fetchHistory();
                    
//                     return { ...prev, [from]: { ...state, status: 'completed', progress: 100 } };
//                 }
//                 return prev;
//             });
//         }
//     } catch (error) {
//         console.error("Error processing received data", error);
//         setTransfers(prev => ({ ...prev, [from]: {...(prev[from] || {}), status: 'failed'} }));
//     }
//   }, [fetchHistory]);

//   useEffect(() => {
//     socket.current = io(SOCKET_URL);
    
//     socket.current.emit('join', user._id);
//     fetchHistory();

//     socket.current.on('online-users', (users) => {
//       const otherUsers = {};
//       users.forEach(uId => {
//         if (uId !== user._id) otherUsers[uId] = uId.substring(0, 8);
//       });
//       setOnlineUsers(otherUsers);
//     });

//     socket.current.on('offer', async (payload) => {
//       const { from, sdp, fileName, fileSize } = payload;
      
//       const pc = new RTCPeerConnection(PC_CONFIG);
//       peerConnections.current[from] = pc;
      
//       setTransfers(prev => ({ ...prev, [from]: { status: 'receiving', progress: 0, fileName, fileSize, type: 'in' } }));
      
//       pc.ondatachannel = (event) => {
//         event.channel.onmessage = (message) => handleDataChannelMessage(message, from);
//       };
      
//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           socket.current.emit('ice-candidate', { target: from, candidate: event.candidate });
//         }
//       };

//       await pc.setRemoteDescription(new RTCSessionDescription(sdp));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);

//       socket.current.emit('answer', { target: from, sdp: pc.localDescription });
//     });

//     socket.current.on('answer', async (payload) => {
//       const pc = peerConnections.current[payload.from];
//       if (pc) {
//         await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
//       }
//     });

//     socket.current.on('ice-candidate', (payload) => {
//       const pc = peerConnections.current[payload.from];
//       if (pc) {
//         pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(e => console.error("Error adding ICE candidate", e));
//       }
//     });

//     return () => {
//       socket.current.disconnect();
//       Object.values(peerConnections.current).forEach(pc => pc.close());
//     };
//   }, [user._id, fetchHistory, handleDataChannelMessage]);
  
//   const handleSendFile = async (file, targetId) => {
//     const pc = new RTCPeerConnection(PC_CONFIG);
//     peerConnections.current[targetId] = pc;

//     const dataChannel = pc.createDataChannel('file-transfer', { ordered: true });
//     setTransfers(prev => ({...prev, [targetId]: {status: 'connecting', progress: 0, fileName: file.name, fileSize: file.size, type: 'out'}}));

//     dataChannel.onopen = () => {
//       setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], status: 'sending'}}));
//       const reader = new FileReader();
//       let offset = 0;

//       const readNextChunk = () => {
//         if (offset >= file.size) {
//             return;
//         }
//         const slice = file.slice(offset, offset + CHUNK_SIZE);
//         reader.readAsArrayBuffer(slice);
//       };

//       reader.onload = async (e) => {
//         // Wait until the buffer is clear enough to send
//         while (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
//             await new Promise(resolve => setTimeout(resolve, 100));
//         }
        
//         dataChannel.send(e.target.result);
//         offset += e.target.result.byteLength;
        
//         const progress = Math.round((offset / file.size) * 100);
//         setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], progress: progress}}));
        
//         if (offset < file.size) {
//             readNextChunk();
//         } else {
//             dataChannel.send('EOF');
//             setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], status: 'completed'}}));
//             await addTransferLog(targetId, file.name, file.size);
//             await fetchHistory();
//         }
//       };
      
//       // Start the sending process
//       readNextChunk();
//     };
    
//     dataChannel.onclose = () => {
//         console.log(`Data channel to ${targetId} closed.`);
//         delete peerConnections.current[targetId];
//     }

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.current.emit('ice-candidate', { target: targetId, candidate: event.candidate });
//       }
//     };
    
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);

//     socket.current.emit('offer', { target: targetId, sdp: pc.localDescription, fileName: file.name, fileSize: file.size });
//   };
  
//   const onFileChange = (e) => {
//       const file = e.target.files[0];
//       if (file && targetUserRef.current) {
//           handleSendFile(file, targetUserRef.current);
//       }
//       e.target.value = null;
//   }

//   const handleUserClick = (userId) => {
//     targetUserRef.current = userId;
//     fileInputRef.current.click();
//   }

//   const getStatusIcon = (status) => {
//     switch(status) {
//         case 'connecting': return <Clock size={16} className="text-yellow-400 animate-pulse-fast" />;
//         case 'sending':
//         case 'receiving': return <UploadCloud size={16} className="text-blue-400 animate-pulse-fast" />;
//         case 'completed': return <CheckCircle size={16} className="text-green-400" />;
//         case 'failed': return <XCircle size={16} className="text-red-400" />;
//         default: return null;
//     }
//   }

//   const activeTransfers = useMemo(() => {
//     return Object.entries(transfers).filter(([key, value]) => value.status !== 'completed' && value.status !== 'failed');
//   }, [transfers]);

//   return (
//     <div className="container mx-auto p-4 md:p-6 max-w-7xl">
//       <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
//         <h1 className="text-3xl md:text-4xl font-bold text-white">Share<span className="text-blue-500">Sphere</span></h1>
//         <div className="flex items-center space-x-4">
//             <span className="text-gray-300 hidden sm:block">Welcome, <span className="font-semibold text-blue-400">{user.username}</span></span>
//             <button onClick={logout} className="p-2 rounded-full bg-gray-700 hover:bg-red-600 transition-colors" title="Logout">
//                 <LogOut size={20} />
//             </button>
//         </div>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
//         <div className="lg:col-span-1 flex flex-col gap-6">
//             <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
//               <h2 className="text-xl font-semibold mb-4 flex items-center"><User className="mr-2 text-blue-500"/>Online Users</h2>
//               <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
//                 {Object.keys(onlineUsers).length > 0 ? Object.entries(onlineUsers).map(([userId, username]) => (
//                   <div key={userId} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-md hover:bg-gray-700 transition-colors">
//                     <span className="font-mono text-sm">{username}</span>
//                     <button onClick={() => handleUserClick(userId)} className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors" title={`Send file to ${username}`}>
//                       <Send size={16}/>
//                     </button>
//                   </div>
//                 )) : <p className="text-gray-400 text-center py-4">No other users online.</p>}
//               </div>
//               <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />
//             </div>

//             <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
//               <h2 className="text-xl font-semibold mb-4 flex items-center"><Download className="mr-2 text-blue-500"/>Active Transfers</h2>
//               <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
//                 {activeTransfers.length > 0 ? activeTransfers.map(([userId, state]) => (
//                     <div key={userId} className="bg-gray-700/50 p-3 rounded-lg">
//                         <div className="flex justify-between items-center mb-2">
//                             <p className="text-sm font-medium truncate w-4/5" title={state.fileName}>{state.fileName}</p>
//                             <div className="flex items-center gap-2">
//                                 {getStatusIcon(state.status)}
//                                 <span className="text-xs font-semibold capitalize">{state.status}</span>
//                             </div>
//                         </div>
//                         <div className="w-full bg-gray-600 rounded-full h-2">
//                             <div className="bg-blue-600 h-2 rounded-full transition-all duration-150" style={{ width: `${state.progress || 0}%` }}></div>
//                         </div>
//                     </div>
//                 )) : <p className="text-gray-400 text-center py-4">No active file transfers.</p>}
//               </div>
//             </div>
//         </div>

//         <div className="lg:col-span-2 bg-gray-800 rounded-lg p-5 shadow-lg">
//           <h2 className="text-xl font-semibold mb-4 flex items-center"><FileIcon className="mr-2 text-blue-500"/>Transfer History</h2>
//           <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-2">
//             {history.length > 0 ? history.map(item => (
//                 <div key={item._id} className="grid grid-cols-3 items-center p-3 bg-gray-700/50 rounded-md text-sm">
//                     <div className="truncate" title={item.fileName}>{item.fileName}</div>
//                     <div className="text-center text-gray-400">
//                         {item.sender.username === user.username ? `To: ${item.receiver.username}` : `From: ${item.sender.username}`}
//                     </div>
//                     <div className="text-right text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
//                 </div>
//             )) : <p className="text-gray-400 text-center py-4">No transfer history found.</p>}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// ------------------------------------------------------------------------------------------------
// File: /client/src/pages/Dashboard.js

// import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
// import io from 'socket.io-client';
// import { User, Send, File as FileIcon, LogOut, Download, UploadCloud, CheckCircle, XCircle, Clock } from 'lucide-react';
// import fileSaver from 'file-saver';
// import { useAuth } from '../context/AuthContext';
// import axios from 'axios';

// export default function Dashboard() {
//   const { user, logout } = useAuth();
//   const [onlineUsers, setOnlineUsers] = useState([]);
//   const [transfers, setTransfers] = useState({});
//   const [history, setHistory] = useState([]);
  
//   const socket = useRef(null);
//   const peerConnections = useRef({});
//   const fileChunks = useRef({});
//   const fileInputRef = useRef(null);
//   const targetUserRef = useRef(null);
//   const transferMeta = useRef({}); // **FIX**: Ref to hold non-stale metadata

//   // const SOCKET_URL = 'http://localhost:5000';
//   const SOCKET_URL = '';
//   const PC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
//   const CHUNK_SIZE = 65536; // 64KB
//   const BUFFER_THRESHOLD = CHUNK_SIZE * 10; // Pause sending if buffer exceeds 640KB

//   const fetchHistory = useCallback(async () => {
//     if (!user?._id) return;
//     try {
//         const res = await axios.get(`${SOCKET_URL}/api/history/${user._id}`);
//         setHistory(res.data);
//     } catch (error) {
//         console.error("Failed to fetch history", error);
//     }
//   }, [user?._id]);

//   const addTransferLog = useCallback(async (receiverId, fileName, fileSize) => {
//     if (!user?._id) return;
//     try {
//         await axios.post(`${SOCKET_URL}/api/history`, {
//             senderId: user._id,
//             receiverId,
//             fileName,
//             fileSize
//         });
//     } catch (error) {
//         console.error("Failed to log transfer", error);
//     }
//   }, [user?._id]);


//   const handleDataChannelMessage = useCallback((message, from) => {
//     try {
//         if (message.data instanceof ArrayBuffer) {
//             if (!fileChunks.current[from]) {
//                 fileChunks.current[from] = [];
//             }
//             fileChunks.current[from].push(message.data);
            
//             setTransfers(prev => {
//                 const state = prev[from];
//                 if (!state) return prev;
//                 const receivedSize = (fileChunks.current[from] || []).reduce((acc, chunk) => acc + chunk.byteLength, 0);
//                 const progress = Math.round((receivedSize / state.fileSize) * 100);
//                 return { ...prev, [from]: {...state, progress: progress} };
//             });
//         } else if (message.data === 'EOF') {
//             const meta = transferMeta.current[from];
//             const chunks = fileChunks.current[from];

//             if (meta && chunks) {
//                 const file = new Blob(chunks);
//                 fileSaver.saveAs(file, meta.fileName); // **FIX**: Use filename from ref

//                 delete fileChunks.current[from];
//                 delete transferMeta.current[from];
                
//                 fetchHistory();
                
//                 setTransfers(prev => {
//                     const { [from]: removed, ...newState } = prev;
//                     return newState;
//                 });
//             }
//         }
//     } catch (error) {
//         console.error("Error processing received data", error);
//         setTransfers(prev => ({ ...prev, [from]: {...(prev[from] || {}), status: 'failed'} }));
//     }
//   }, [fetchHistory]);

//   useEffect(() => {
//     if (!user) return;
//     socket.current = io(SOCKET_URL);
    
//     socket.current.emit('join', { userId: user._id, username: user.username });
//     fetchHistory();

//     socket.current.on('online-users', (users) => {
//       setOnlineUsers(users.filter(u => u.id !== user._id));
//     });

//     socket.current.on('offer', async (payload) => {
//       const { from, sdp, fileName, fileSize } = payload;
      
//       const pc = new RTCPeerConnection(PC_CONFIG);
//       peerConnections.current[from] = pc;
      
//       // **FIX**: Store metadata in the ref as soon as the offer is received
//       transferMeta.current[from] = { fileName, fileSize };
      
//       setTransfers(prev => ({ ...prev, [from]: { status: 'receiving', progress: 0, fileName, fileSize, type: 'in' } }));
      
//       pc.ondatachannel = (event) => {
//         event.channel.onmessage = (message) => handleDataChannelMessage(message, from);
//       };
      
//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           socket.current.emit('ice-candidate', { target: from, candidate: event.candidate });
//         }
//       };

//       await pc.setRemoteDescription(new RTCSessionDescription(sdp));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);

//       socket.current.emit('answer', { target: from, sdp: pc.localDescription });
//     });

//     socket.current.on('answer', async (payload) => {
//       const pc = peerConnections.current[payload.from];
//       if (pc) {
//         await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
//       }
//     });

//     socket.current.on('ice-candidate', (payload) => {
//       const pc = peerConnections.current[payload.from];
//       if (pc) {
//         pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(e => console.error("Error adding ICE candidate", e));
//       }
//     });

//     return () => {
//       socket.current.disconnect();
//       Object.values(peerConnections.current).forEach(pc => pc.close());
//     };
//   }, [user, fetchHistory, handleDataChannelMessage]);
  
//   const handleSendFile = async (file, targetId) => {
//     const pc = new RTCPeerConnection(PC_CONFIG);
//     peerConnections.current[targetId] = pc;

//     const dataChannel = pc.createDataChannel('file-transfer', { ordered: true });
//     setTransfers(prev => ({...prev, [targetId]: {status: 'connecting', progress: 0, fileName: file.name, fileSize: file.size, type: 'out'}}));

//     dataChannel.onopen = () => {
//       setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], status: 'sending'}}));
//       const reader = new FileReader();
//       let offset = 0;

//       const sendChunk = () => {
//         if (offset >= file.size) {
//             dataChannel.send('EOF');
//             addTransferLog(targetId, file.name, file.size).then(() => {
//                 fetchHistory();
//                 setTransfers(prev => {
//                     const { [targetId]: removed, ...newState } = prev;
//                     return newState;
//                 });
//             });
//             return;
//         }

//         if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
//             dataChannel.onbufferedamountlow = () => {
//                 dataChannel.onbufferedamountlow = null;
//                 sendChunk();
//             };
//             return;
//         }

//         const slice = file.slice(offset, offset + CHUNK_SIZE);
//         reader.readAsArrayBuffer(slice);
//       };

//       reader.onload = (e) => {
//         try {
//             if (dataChannel.readyState === 'open') {
//                 dataChannel.send(e.target.result);
//                 offset += e.target.result.byteLength;
                
//                 const progress = Math.round((offset / file.size) * 100);
//                 setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], progress: progress}}));
                
//                 sendChunk();
//             }
//         } catch (error) {
//             console.error("Send error:", error);
//             setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], status: 'failed'}}));
//         }
//       };
      
//       sendChunk();
//     };
    
//     dataChannel.onclose = () => {
//         console.log(`Data channel to ${targetId} closed.`);
//         delete peerConnections.current[targetId];
//     }

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.current.emit('ice-candidate', { target: targetId, candidate: event.candidate });
//       }
//     };
    
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);

//     socket.current.emit('offer', { target: targetId, sdp: pc.localDescription, fileName: file.name, fileSize: file.size });
//   };
  
//   const onFileChange = (e) => {
//       const file = e.target.files[0];
//       if (file && targetUserRef.current) {
//           handleSendFile(file, targetUserRef.current);
//       }
//       e.target.value = null;
//   }

//   const handleUserClick = (userId) => {
//     targetUserRef.current = userId;
//     fileInputRef.current.click();
//   }

//   const getStatusIcon = (status) => {
//     switch(status) {
//         case 'connecting': return <Clock size={16} className="text-yellow-400 animate-pulse-fast" />;
//         case 'sending':
//         case 'receiving': return <UploadCloud size={16} className="text-blue-400 animate-pulse-fast" />;
//         case 'completed': return <CheckCircle size={16} className="text-green-400" />;
//         case 'failed': return <XCircle size={16} className="text-red-400" />;
//         default: return null;
//     }
//   }

//   const activeTransfers = useMemo(() => {
//     return Object.entries(transfers);
//   }, [transfers]);

//   return (
//     <div className="container mx-auto p-4 md:p-6 max-w-7xl">
//       <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
//         <h1 className="text-3xl md:text-4xl font-bold text-white">Share<span className="text-blue-500">Sphere</span></h1>
//         <div className="flex items-center space-x-4">
//             <span className="text-gray-300 hidden sm:block">Welcome, <span className="font-semibold text-blue-400">{user?.username}</span></span>
//             <button onClick={logout} className="p-2 rounded-full bg-gray-700 hover:bg-red-600 transition-colors" title="Logout">
//                 <LogOut size={20} />
//             </button>
//         </div>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
//         <div className="lg:col-span-1 flex flex-col gap-6">
//             <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
//               <h2 className="text-xl font-semibold mb-4 flex items-center"><User className="mr-2 text-blue-500"/>Online Users</h2>
//               <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
//                 {onlineUsers.length > 0 ? onlineUsers.map((onlineUser) => (
//                   <div key={onlineUser.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-md hover:bg-gray-700 transition-colors">
//                     <span className="font-medium text-sm">{onlineUser.username}</span>
//                     <button onClick={() => handleUserClick(onlineUser.id)} className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors" title={`Send file to ${onlineUser.username}`}>
//                       <Send size={16}/>
//                     </button>
//                   </div>
//                 )) : <p className="text-gray-400 text-center py-4">No other users online.</p>}
//               </div>
//               <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />
//             </div>

//             <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
//               <h2 className="text-xl font-semibold mb-4 flex items-center"><Download className="mr-2 text-blue-500"/>Active Transfers</h2>
//               <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
//                 {activeTransfers.length > 0 ? activeTransfers.map(([userId, state]) => (
//                     <div key={userId} className="bg-gray-700/50 p-3 rounded-lg">
//                         <div className="flex justify-between items-center mb-2">
//                             <p className="text-sm font-medium truncate w-4/5" title={state.fileName}>{state.fileName}</p>
//                             <div className="flex items-center gap-2">
//                                 {getStatusIcon(state.status)}
//                                 <span className="text-xs font-semibold capitalize">{state.status}</span>
//                             </div>
//                         </div>
//                         <div className="w-full bg-gray-600 rounded-full h-2">
//                             <div className="bg-blue-600 h-2 rounded-full transition-all duration-150" style={{ width: `${state.progress || 0}%` }}></div>
//                         </div>
//                     </div>
//                 )) : <p className="text-gray-400 text-center py-4">No active file transfers.</p>}
//               </div>
//             </div>
//         </div>

//         <div className="lg:col-span-2 bg-gray-800 rounded-lg p-5 shadow-lg">
//           <h2 className="text-xl font-semibold mb-4 flex items-center"><FileIcon className="mr-2 text-blue-500"/>Transfer History</h2>
//           <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-2">
//             {history.length > 0 ? history.map(item => (
//                 <div key={item._id} className="grid grid-cols-3 items-center p-3 bg-gray-700/50 rounded-md text-sm">
//                     <div className="truncate" title={item.fileName}>{item.fileName}</div>
//                     <div className="text-center text-gray-400">
//                         {item.sender.username === user.username ? `To: ${item.receiver.username}` : `From: ${item.sender.username}`}
//                     </div>
//                     <div className="text-right text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
//                 </div>
//             )) : <p className="text-gray-400 text-center py-4">No transfer history found.</p>}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// -------------------------------------------------------------------------------------------------------------------
// File: /client/src/pages/Dashboard.js


import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { User, Send, File as FileIcon, LogOut, Download, UploadCloud, CheckCircle, XCircle, Clock } from 'lucide-react';
import fileSaver from 'file-saver';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [transfers, setTransfers] = useState({});
  const [history, setHistory] = useState([]);
  
  const socket = useRef(null);
  const peerConnections = useRef({});
  const fileChunks = useRef({});
  const fileInputRef = useRef(null);
  const targetUserRef = useRef(null);

  const SOCKET_URL = import.meta.env.VITE_API_URL; // Use relative path for deployment
  const PC_CONFIG = useMemo(() => ({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }), []);
  const CHUNK_SIZE = 65536; // 64KB
  const BUFFER_THRESHOLD = CHUNK_SIZE * 10; // Pause sending if buffer exceeds 640KB

  const fetchHistory = useCallback(async () => {
    if (!user?._id) return;
    try {
        const res = await axios.get(`${SOCKET_URL}/api/history/${user._id}`);
        setHistory(res.data);
    } catch (error) {
        console.error("Failed to fetch history", error);
    }
  }, [user?._id]);

  const addTransferLog = useCallback(async (receiverId, fileName, fileSize) => {
    if (!user?._id) return;
    try {
        await axios.post(`${SOCKET_URL}/api/history`, {
            senderId: user._id,
            receiverId,
            fileName,
            fileSize
        });
    } catch (error) {
        console.error("Failed to log transfer", error);
    }
  }, [user?._id]);


  const handleDataChannelMessage = useCallback((message, from) => {
    try {
        if (message.data instanceof ArrayBuffer) {
            if (!fileChunks.current[from]) {
                fileChunks.current[from] = [];
            }
            fileChunks.current[from].push(message.data);
            
            setTransfers(prev => {
                const state = prev[from];
                if (!state) return prev;
                const receivedSize = (fileChunks.current[from] || []).reduce((acc, chunk) => acc + chunk.byteLength, 0);
                const progress = Math.round((receivedSize / state.fileSize) * 100);
                return { ...prev, [from]: {...state, progress: progress} };
            });
        } else if (message.data === 'EOF') {
            setTransfers(prev => {
                const state = prev[from];
                if (state && fileChunks.current[from]) {
                    const file = new Blob(fileChunks.current[from]);
                    fileSaver.saveAs(file, state.fileName);

                    delete fileChunks.current[from];
                    
                    fetchHistory();
                    
                    return { ...prev, [from]: { ...state, status: 'completed', progress: 100 } };
                }
                return prev;
            });
        }
    } catch (error) {
        console.error("Error processing received data", error);
        setTransfers(prev => ({ ...prev, [from]: {...(prev[from] || {}), status: 'failed'} }));
    }
  }, [fetchHistory]);

  useEffect(() => {
    if (!user) return;
    socket.current = io(SOCKET_URL);
    
    socket.current.emit('join', { userId: user._id, username: user.username });
    fetchHistory();

    socket.current.on('online-users', (users) => {
      setOnlineUsers(users.filter(u => u.id !== user._id));
    });

    socket.current.on('offer', async (payload) => {
      const { from, sdp, fileName, fileSize } = payload;
      
      const pc = new RTCPeerConnection(PC_CONFIG);
      peerConnections.current[from] = pc;
      
      setTransfers(prev => ({ ...prev, [from]: { status: 'receiving', progress: 0, fileName, fileSize, type: 'in' } }));
      
      pc.ondatachannel = (event) => {
        event.channel.onmessage = (message) => handleDataChannelMessage(message, from);
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current.emit('ice-candidate', { target: from, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.current.emit('answer', { target: from, sdp: pc.localDescription });
    });

    socket.current.on('answer', async (payload) => {
      const pc = peerConnections.current[payload.from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });

    socket.current.on('ice-candidate', (payload) => {
      const pc = peerConnections.current[payload.from];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(e => console.error("Error adding ICE candidate", e));
      }
    });

    // **THE FIX**: Create local variables for the cleanup function to use.
    const currentSocket = socket.current;
    const currentPeerConnections = peerConnections.current;

    return () => {
      currentSocket.disconnect();
      Object.values(currentPeerConnections).forEach(pc => pc.close());
    };
    // **THE FIX**: Add PC_CONFIG to the dependency array.
  }, [user, fetchHistory, handleDataChannelMessage, PC_CONFIG]);
  
  const handleSendFile = async (file, targetId) => {
    const pc = new RTCPeerConnection(PC_CONFIG);
    peerConnections.current[targetId] = pc;

    const dataChannel = pc.createDataChannel('file-transfer', { ordered: true });
    setTransfers(prev => ({...prev, [targetId]: {status: 'connecting', progress: 0, fileName: file.name, fileSize: file.size, type: 'out'}}));

    dataChannel.onopen = () => {
      setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], status: 'sending'}}));
      const reader = new FileReader();
      let offset = 0;

      const sendChunk = () => {
        if (offset >= file.size) {
            dataChannel.send('EOF');
            addTransferLog(targetId, file.name, file.size).then(() => {
                fetchHistory();
                setTransfers(prev => {
                    const { [targetId]: removed, ...newState } = prev;
                    return newState;
                });
            });
            return;
        }

        if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
            dataChannel.onbufferedamountlow = () => {
                dataChannel.onbufferedamountlow = null;
                sendChunk();
            };
            return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        try {
            if (dataChannel.readyState === 'open') {
                dataChannel.send(e.target.result);
                offset += e.target.result.byteLength;
                
                const progress = Math.round((offset / file.size) * 100);
                setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], progress: progress}}));
                
                sendChunk();
            }
        } catch (error) {
            console.error("Send error:", error);
            setTransfers(prev => ({...prev, [targetId]: {...prev[targetId], status: 'failed'}}));
        }
      };
      
      sendChunk();
    };
    
    dataChannel.onclose = () => {
        console.log(`Data channel to ${targetId} closed.`);
        delete peerConnections.current[targetId];
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', { target: targetId, candidate: event.candidate });
      }
    };
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.current.emit('offer', { target: targetId, sdp: pc.localDescription, fileName: file.name, fileSize: file.size });
  };
  
  const onFileChange = (e) => {
      const file = e.target.files[0];
      if (file && targetUserRef.current) {
          handleSendFile(file, targetUserRef.current);
      }
      e.target.value = null;
  }

  const handleUserClick = (userId) => {
    targetUserRef.current = userId;
    fileInputRef.current.click();
  }

  const getStatusIcon = (status) => {
    switch(status) {
        case 'connecting': return <Clock size={16} className="text-yellow-400 animate-pulse-fast" />;
        case 'sending':
        case 'receiving': return <UploadCloud size={16} className="text-blue-400 animate-pulse-fast" />;
        case 'completed': return <CheckCircle size={16} className="text-green-400" />;
        case 'failed': return <XCircle size={16} className="text-red-400" />;
        default: return null;
    }
  }

  const activeTransfers = useMemo(() => {
    return Object.entries(transfers).filter(([key, value]) => value.status !== 'completed' && value.status !== 'failed');
  }, [transfers]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Share<span className="text-blue-500">Sphere</span></h1>
        <div className="flex items-center space-x-4">
            <span className="text-gray-300 hidden sm:block">Welcome, <span className="font-semibold text-blue-400">{user?.username}</span></span>
            <button onClick={logout} className="p-2 rounded-full bg-gray-700 hover:bg-red-600 transition-colors" title="Logout">
                <LogOut size={20} />
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><User className="mr-2 text-blue-500"/>Online Users</h2>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {onlineUsers.length > 0 ? onlineUsers.map((onlineUser) => (
                  <div key={onlineUser.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-md hover:bg-gray-700 transition-colors">
                    <span className="font-medium text-sm">{onlineUser.username}</span>
                    <button onClick={() => handleUserClick(onlineUser.id)} className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors" title={`Send file to ${onlineUser.username}`}>
                      <Send size={16}/>
                    </button>
                  </div>
                )) : <p className="text-gray-400 text-center py-4">No other users online.</p>}
              </div>
              <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />
            </div>

            <div className="bg-gray-800 rounded-lg p-5 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center"><Download className="mr-2 text-blue-500"/>Active Transfers</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {activeTransfers.length > 0 ? activeTransfers.map(([userId, state]) => (
                    <div key={userId} className="bg-gray-700/50 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium truncate w-4/5" title={state.fileName}>{state.fileName}</p>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(state.status)}
                                <span className="text-xs font-semibold capitalize">{state.status}</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-150" style={{ width: `${state.progress || 0}%` }}></div>
                        </div>
                    </div>
                )) : <p className="text-gray-400 text-center py-4">No active file transfers.</p>}
              </div>
            </div>
        </div>

        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center"><FileIcon className="mr-2 text-blue-500"/>Transfer History</h2>
          <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-2">
            {history.length > 0 ? history.map(item => (
                <div key={item._id} className="grid grid-cols-3 items-center p-3 bg-gray-700/50 rounded-md text-sm">
                    <div className="truncate" title={item.fileName}>{item.fileName}</div>
                    <div className="text-center text-gray-400">
                        {item.sender.username === user.username ? `To: ${item.receiver.username}` : `From: ${item.sender.username}`}
                    </div>
                    <div className="text-right text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
            )) : <p className="text-gray-400 text-center py-4">No transfer history found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
