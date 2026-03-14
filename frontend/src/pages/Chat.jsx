import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, getChatRequests, acceptChatRequest, rejectChatRequest, getMessages, sendMessageRest, uploadChatFile, markMessagesRead, API_BASE } from '../api/client';
import { Loading } from '../components/UI';

export default function Chat() {
    const { conversationId } = useParams();
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [requests, setRequests] = useState({ received: [], sent: [] });
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeConvo, setActiveConvo] = useState(conversationId || null);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (activeConvo) loadMessages(activeConvo); }, [activeConvo]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchData = async () => {
        try {
            const [convosRes, reqsRes] = await Promise.all([
                getConversations().catch(() => ({ data: [] })),
                getChatRequests().catch(() => ({ data: [] })),
            ]);
            const convos = Array.isArray(convosRes.data) ? convosRes.data : [];
            setConversations(convos);
            const allRequests = Array.isArray(reqsRes.data) ? reqsRes.data : [];
            setRequests({
                received: allRequests.filter(r => r.receiverId === user?.id && r.status === 'PENDING'),
                sent: allRequests.filter(r => r.senderId === user?.id),
            });
        } catch (err) {
            console.error(err);
            setConversations([]);
            setRequests({ received: [], sent: [] });
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (convoId) => {
        try {
            const res = await getMessages(convoId);
            const msgs = res.data;
            const msgArray = Array.isArray(msgs) ? msgs : (msgs?.data || []);
            setMessages(msgArray);
            // Mark messages as read when opening conversation
            markMessagesRead(convoId).catch(() => {});
        } catch (err) {
            console.error(err);
            setMessages([]);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConvo) return;
        const content = newMessage.trim();
        setNewMessage('');
        try {
            const res = await sendMessageRest(activeConvo, { content });
            setMessages(prev => [...prev, res.data]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeConvo) return;
        fileInputRef.current.value = '';
        setUploading(true);
        try {
            const res = await uploadChatFile(activeConvo, file);
            setMessages(prev => [...prev, res.data]);
        } catch (err) {
            console.error('File upload failed:', err);
            alert(err.response?.data?.message || 'Failed to upload file. Allowed: images, PDF, TXT, ZIP (max 25MB)');
        } finally {
            setUploading(false);
        }
    };

    const handleAccept = async (id) => {
        try { await acceptChatRequest(id); fetchData(); } catch (err) { console.error(err); }
    };
    const handleReject = async (id) => {
        try { await rejectChatRequest(id); fetchData(); } catch (err) { console.error(err); }
    };

    const isImage = (type) => type && type.startsWith('image/');
    const getFileIcon = (name) => {
        if (!name) return '📎';
        const ext = name.split('.').pop()?.toLowerCase();
        return { pdf: '📄', zip: '📦', txt: '📝', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️', gif: '🖼️' }[ext] || '📎';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (loading) return <Loading />;
    const activeConversation = conversations.find(c => c.id === activeConvo);

    const renderAttachment = (msg) => {
        if (!msg.fileUrl) return null;
        const fullUrl = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_BASE}${msg.fileUrl}`;
        const isSent = msg.senderId === user?.id;

        if (isImage(msg.fileType)) {
            return (
                <div style={{ marginTop: msg.content ? 6 : 0, borderRadius: 8, overflow: 'hidden', maxWidth: 280 }}>
                    <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                        <img
                            src={fullUrl}
                            alt={msg.fileName}
                            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block', cursor: 'pointer' }}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                        <div style={{ display: 'none', alignItems: 'center', gap: 8, padding: 8, fontSize: '0.8rem' }}>
                            {getFileIcon(msg.fileName)} {msg.fileName}
                        </div>
                    </a>
                </div>
            );
        }

        return (
            <a href={fullUrl} target="_blank" rel="noopener noreferrer" download={msg.fileName}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginTop: msg.content ? 6 : 0,
                    borderRadius: 8, textDecoration: 'none',
                    backgroundColor: isSent ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                    color: 'inherit', transition: 'opacity 0.2s',
                }}>
                <span style={{ fontSize: '1.5rem' }}>{getFileIcon(msg.fileName)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.fileName}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        {formatSize(msg.fileSize)} • Click to download
                    </div>
                </div>
                <span style={{ fontSize: '1.1rem' }}>⬇️</span>
            </a>
        );
    };

    return (
        <div className="chat-layout">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <h3 style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>Messages</h3>

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

                <div className="chat-convo-list">
                    {conversations.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No conversations yet. Connect with freelancers from their profile!
                        </div>
                    ) : (
                        conversations.map(c => (
                            <div key={c.id} className={`chat-convo-item ${c.id === activeConvo ? 'active' : ''}`} onClick={() => setActiveConvo(c.id)}>
                                <div className="chat-convo-avatar">{c.otherUser.name?.[0]?.toUpperCase()}</div>
                                <div className="chat-convo-info">
                                    <div className="chat-convo-name">{c.otherUser.name}</div>
                                    {c.lastMessage && (
                                        <div className="chat-convo-preview">
                                            {c.lastMessage.fileUrl ? '📎 File' : (c.lastMessage.content?.length > 30 ? c.lastMessage.content.slice(0, 30) + '...' : c.lastMessage.content)}
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
                                        {msg.content && <div>{msg.content}</div>}
                                        {renderAttachment(msg)}
                                    </div>
                                    <div className="chat-msg-time">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar with file attach */}
                        <form onSubmit={handleSend} className="chat-input-bar">
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload}
                                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,application/zip" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                style={{
                                    background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer',
                                    padding: '4px 8px', color: 'var(--text-secondary)', opacity: uploading ? 0.5 : 1,
                                }}
                                title="Attach file">
                                {uploading ? '⏳' : '📎'}
                            </button>
                            <input
                                className="form-input"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                autoFocus
                                style={{ flex: 1 }}
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
