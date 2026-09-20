import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Send,
    User,
    Trash2,
    Copy,
    Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import Modal from './Modal';
import GeminiIcon from './GeminiIcon';
import { useAuth } from '../../context/AuthContext';
import '../styles/AiChat.css';

/* ==========================================================
   LOCALSTORAGE
========================================================== */
const STORAGE_KEY = 'cinema_ai_chat_history';
const STORAGE_MAX_MESSAGES = 100;

const loadMessagesFromStorage = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length === 0) return null;

        return parsed;
    } catch (err) {
        console.warn('[AiChatBox] Không load được chat history:', err);
        return null;
    }
};

const saveMessagesToStorage = (msgs) => {
    try {
        const toSave = msgs.slice(-STORAGE_MAX_MESSAGES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
        console.warn('[AiChatBox] Không save được chat history:', err);
    }
};

/* ==========================================================
   DEFAULT MESSAGES — Có tên user
========================================================== */
const buildDefaultMessages = (userName = null) => {
    const greeting = userName
        ? `Xin chào ${userName}! 😊`
        : 'Xin chào bạn! 😊';

    return [
        {
            role: 'assistant',
            content: `${greeting} Mình là trợ lý AI của Quang Dũng Cinema. Bạn muốn hỏi mình về phim, giá vé hay rạp chiếu hôm nay ạ?`,
            movies: []
        }
    ];
};

/* ==========================================================
   QUICK SUGGESTIONS
========================================================== */
const QUICK_SUGGESTIONS = [
    'Phim đang chiếu hôm nay?',
    'Giá vé ghế VIP bao nhiêu?',
    'Rạp có khuyến mãi gì?',
    'Rạp ở đâu?'
];

/* ==========================================================
   TYPING INDICATOR
========================================================== */
const TypingIndicator = () => (
    <div className="ai-typing">
        <span></span>
        <span></span>
        <span></span>
    </div>
);

/* ==========================================================
   MOVIE SUGGEST CARD
========================================================== */
const MovieSuggestCard = ({ movie, onClick }) => {
    const posterUrl = movie.movie_poster || '/poster-placeholder.jpg';

    return (
        <div className="ai-movie-card" onClick={onClick}>
            <img src={posterUrl} alt={movie.title} loading="lazy" />

            <div className="ai-movie-info">
                <h5>{movie.title}</h5>

                <div className="ai-movie-meta">
                    {movie.age_rating > 0 && (
                        <span className="ai-age">T{movie.age_rating}</span>
                    )}
                    {movie.duration && <span>{movie.duration}p</span>}
                </div>

                {movie.genres?.length > 0 && (
                    <p className="ai-movie-genre">
                        {movie.genres.join(', ')}
                    </p>
                )}
            </div>
        </div>
    );
};

/* ==========================================================
   MESSAGE BUBBLE
========================================================== */
const MessageBubble = ({ msg }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(msg.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.warn('[Copy] Không copy được:', err);
        }
    };

    return (
        <div className="ai-msg-bubble-wrapper">
            <div className="ai-msg-bubble">{msg.content}</div>

            {msg.role === 'assistant' && !msg.isError && (
                <button
                    type="button"
                    className="ai-msg-copy"
                    onClick={handleCopy}
                    title="Sao chép"
                    aria-label="Sao chép tin nhắn"
                >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
            )}
        </div>
    );
};

/* ==========================================================
   MAIN CHATBOX
========================================================== */
const AiChatBox = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [isOpen, setIsOpen] = useState(false);

    /* ✅ Lấy tên user (ưu tiên full_name > username) */
    const userName =
        user?.full_name ||
        user?.username ||
        null;

    const [messages, setMessages] = useState(() => {
        const saved = loadMessagesFromStorage();
        if (saved && saved.length > 0) {
            return saved;
        }
        return buildDefaultMessages(userName);
    });

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);

    /* =========================================================
       AUTO SAVE
    ========================================================= */
    useEffect(() => {
        if (messages.length > 0) {
            saveMessagesToStorage(messages);
        }
    }, [messages]);

    /* =========================================================
       UPDATE GREETING KHI USER ĐĂNG NHẬP/ĐĂNG XUẤT
    ========================================================= */
    useEffect(() => {
        // Chỉ cập nhật nếu messages chỉ có 1 tin nhắn chào (chưa chat gì)
        if (messages.length === 1 && messages[0].role === 'assistant') {
            setMessages(buildDefaultMessages(userName));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userName]);

    /* Auto scroll */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    /* Focus input */
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
            setHasNewMessage(false);
        }
    }, [isOpen]);

    /* Badge tin nhắn mới */
    useEffect(() => {
        if (!isOpen && messages.length > 1) {
            setHasNewMessage(true);
        }
    }, [messages, isOpen]);

    /* Cleanup */
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    /* =========================================================
       XÓA LỊCH SỬ
    ========================================================= */
    const handleOpenClearModal = () => {
        setShowClearModal(true);
    };

    const handleConfirmClear = () => {
        abortControllerRef.current?.abort();

        localStorage.removeItem(STORAGE_KEY);
        setMessages(buildDefaultMessages(userName));
        setInput('');
        setIsTyping(false);
        setShowClearModal(false);
    };

    const handleCancelClear = () => {
        setShowClearModal(false);
    };

    /* =========================================================
       GỬI TIN NHẮN
    ========================================================= */
    const sendChatRequest = async (text) => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        try {
            const history = messages
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            const res = await api.post(
                '/api/ai/chat',
                {
                    message: text,
                    history,
                    userName
                },
                { signal: abortControllerRef.current.signal }
            );

            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: res.data.reply,
                    movies: res.data.movies || []
                }
            ]);
        } catch (error) {
            if (
                error.name === 'CanceledError' ||
                error.code === 'ERR_CANCELED'
            ) {
                return;
            }

            console.error('AI chat error:', error);

            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        error.response?.data?.error ||
                        'Xin lỗi, mình đang bận. Bạn thử lại sau nhé!',
                    movies: [],
                    isError: true
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isTyping) return;

        const userMsg = { role: 'user', content: text };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        await sendChatRequest(text);
    };

    const sendSuggestion = async (text) => {
        if (isTyping) return;

        const userMsg = { role: 'user', content: text };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        await sendChatRequest(text);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleMovieClick = (slug) => {
        if (!slug) return;
        setIsOpen(false);
        navigate(`/movie/${slug}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <>
            {/* FAB */}
            <motion.button
                className="ai-chat-fab"
                onClick={() => setIsOpen(v => !v)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                animate={{
                    boxShadow: hasNewMessage
                        ? [
                            '0 0 0 0 rgba(159,183,210,0.7)',
                            '0 0 0 16px rgba(159,183,210,0)'
                        ]
                        : '0 8px 24px rgba(0,0,0,0.3)'
                }}
                transition={{
                    boxShadow: {
                        duration: 1.6,
                        repeat: hasNewMessage ? Infinity : 0
                    }
                }}
                aria-label="Mở chatbox AI"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.span
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X size={22} />
                        </motion.span>
                    ) : (
                        <motion.span
                            key="open"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <GeminiIcon size={26} />
                        </motion.span>
                    )}
                </AnimatePresence>

                {hasNewMessage && !isOpen && <span className="ai-badge" />}
            </motion.button>

            {/* PANEL */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="ai-chat-panel"
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        transition={{
                            duration: 0.35,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                    >
                        {/* HEADER */}
                        <div className="ai-chat-header">
                            <div className="ai-header-left">
                                <div className="ai-avatar">
                                    <GeminiIcon size={20} />
                                </div>

                                <div>
                                    <h4>Gemini Assistant</h4>
                                    <span className="ai-status">
                                        <span className="ai-dot" />
                                        Đang hoạt động
                                    </span>
                                </div>
                            </div>

                            <div className="ai-header-actions">
                                <button
                                    className="ai-close-btn"
                                    onClick={handleOpenClearModal}
                                    title="Xóa cuộc trò chuyện"
                                    aria-label="Xóa cuộc trò chuyện"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <button
                                    className="ai-close-btn"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Đóng"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* MESSAGES */}
                        <div className="ai-chat-body">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`ai-msg ${
                                        msg.role === 'user' ? 'user' : 'bot'
                                    } ${msg.isError ? 'error' : ''}`}
                                >
                                    <div className="ai-msg-avatar">
                                        {msg.role === 'user' ? (
                                            <User size={14} />
                                        ) : (
                                            <GeminiIcon size={14} />
                                        )}
                                    </div>

                                    <div className="ai-msg-content">
                                        <MessageBubble msg={msg} />

                                        {msg.movies && msg.movies.length > 0 && (
                                            <div className="ai-movie-list">
                                                {msg.movies.map(m => (
                                                    <MovieSuggestCard
                                                        key={m.movie_id}
                                                        movie={m}
                                                        onClick={() =>
                                                            handleMovieClick(m.slug)
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* QUICK SUGGESTIONS */}
                            {messages.length <= 1 && !isTyping && (
                                <div className="ai-quick-suggestions">
                                    {QUICK_SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className="ai-suggestion-btn"
                                            onClick={() => sendSuggestion(s)}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* TYPING */}
                            {isTyping && (
                                <div className="ai-msg bot">
                                    <div className="ai-msg-avatar">
                                        <GeminiIcon size={14} />
                                    </div>
                                    <div className="ai-msg-content">
                                        <div className="ai-msg-bubble">
                                            <TypingIndicator />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT */}
                        <div className="ai-chat-input">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Hỏi Gemini về phim..."
                                maxLength={500}
                                disabled={isTyping}
                            />

                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isTyping}
                                className="ai-send-btn"
                                aria-label="Gửi"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL */}
            <Modal
                show={showClearModal}
                type="warning"
                title="Xóa cuộc trò chuyện"
                message="Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                onConfirm={handleConfirmClear}
                onCancel={handleCancelClear}
            />
        </>
    );
};

export default AiChatBox;