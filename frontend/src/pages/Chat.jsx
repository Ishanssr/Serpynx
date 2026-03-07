import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, getChatRequests, acceptChatRequest, rejectChatRequest, getMessages, sendMessageRest } from '../api/client';
import { Loading } from '../components/UI';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Chat() {
    const { conversationId } = useParams();
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [requests, setRequests] = useState({ received: [], sent: [] });
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeConvo, setActiveConvo] = useState(conversationId || null);
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        fetchData();
        // Connect WebSocket
        const authToken = localStorage.getItem('serpynx_token');
        const socket = io(`${API_URL}/chat`, { auth: { token: authToken } });
        socketRef.current = socket;

        socket.on('new_message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('user_typing', () => setTyping(true));
        socket.on('user_stop_typing', () => setTyping(false));

        return () => { socket.disconnect(); };
    }, []);

    useEffect(() => {
        if (activeConvo) {
            loadMessages(activeConvo);
            socketRef.current?.emit('join_conversation', { conversationId: activeConvo });
            return () => {
                socketRef.current?.emit('leave_conversation', { conversationId: activeConvo });
            };
        }
    }, [activeConvo]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchData = async () => {
        try {
            const [convosRes, reqsRes] = await Promise.all([getConversations(), getChatRequests()]);
            setConversations(convosRes.data);
            setRequests(reqsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (convoId) => {
        try {
            const res = await getMessages(convoId);
            setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConvo) return;
        const content = newMessage.trim();
        setNewMessage('');

        // Try WebSocket first, fall back to REST
        if (socketRef.current?.connected) {
            socketRef.current.emit('send_message', { conversationId: activeConvo, content });
        } else {
            try {
                const res = await sendMessageRest(activeConvo, { content });
                setMessages(prev => [...prev, res.data]);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleTyping = () => {
        socketRef.current?.emit('typing', { conversationId: activeConvo });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current?.emit('stop_typing', { conversationId: activeConvo });
        }, 1000);
    };

    const handleAccept = async (id) => {
        try {
            await acceptChatRequest(id);
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleReject = async (id) => {
        try {
            await rejectChatRequest(id);
            fetchData();
        } catch (err) { console.error(err); }
    };

    if (loading) return <Loading />;

    const activeConversation = conversations.find(c => c.id === activeConvo);

    return (
        <div className="chat-layout">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <h3 style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>Messages</h3>

                {/* Pending requests */}
                {requests.received.length > 0 && (
                    <div className="chat-requests-section">
                        <div style={{ padding: '8px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Connection Requests ({requests.received.length})
                        </div>
                        {requests.received.map(r => (
                            <div key={r.id} className="chat-request-item">
                                <span className="chat-request-name">{r.sender.name}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleAccept(r.id)} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Accept</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleReject(r.id)} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Decline</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Conversations */}
                <div className="chat-convo-list">
                    {conversations.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No conversations yet. Connect with freelancers from their profile!
                        </div>
                    ) : (
                        conversations.map(c => (
                            <div
                                key={c.id}
                                className={`chat-convo-item ${c.id === activeConvo ? 'active' : ''}`}
                                onClick={() => setActiveConvo(c.id)}
                            >
                                <div className="chat-convo-avatar">{c.otherUser.name?.[0]?.toUpperCase()}</div>
                                <div className="chat-convo-info">
                                    <div className="chat-convo-name">{c.otherUser.name}</div>
                                    {c.lastMessage && (
                                        <div className="chat-convo-preview">
                                            {c.lastMessage.content.length > 30 ? c.lastMessage.content.slice(0, 30) + '...' : c.lastMessage.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="chat-main">
                {activeConvo && activeConversation ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-convo-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                                {activeConversation.otherUser.name?.[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{activeConversation.otherUser.name}</span>
                        </div>

                        <div className="chat-messages">
                            {messages.map(msg => (
                                <div key={msg.id} className={`chat-msg ${msg.senderId === user?.id ? 'sent' : 'received'}`}>
                                    <div className="chat-bubble">
                                        {msg.content}
                                    </div>
                                    <div className="chat-msg-time">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                            {typing && <div className="chat-typing">typing...</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="chat-input-bar">
                            <input
                                className="form-input"
                                value={newMessage}
                                onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                                placeholder="Type a message..."
                                autoFocus
                            />
                            <button className="btn btn-primary" type="submit" disabled={!newMessage.trim()}>
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="chat-empty">
                        <h3>Select a conversation</h3>
                        <p>Choose a chat from the sidebar or connect with freelancers from their profile</p>
                    </div>
                )}
            </div>
        </div>
    );
}
