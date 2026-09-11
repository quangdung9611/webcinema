import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../styles/AiChat.css';

/* ==========================================================
   TYPING INDICATOR (3 chấm nhảy)
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
   MAIN CHATBOX
========================================================== */
const AIChatBox = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Xin chào! Mình là trợ lý AI của Quang Dũng Cinema. Bạn muốn xem phim gì hôm nay? 🎬',
      movies: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* Auto scroll xuống cuối */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* Focus input khi mở */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasNewMessage(false);
    }
  }, [isOpen]);

  /* Hiệu ứng "có tin nhắn mới" khi chatbox đóng */
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  /* =========================================================
     GỬI TIN NHẮN
  ========================================================= */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.post('/api/ai/chat', {
        message: text,
        history
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.reply,
          movies: res.data.movies || []
        }
      ]);
    } catch (error) {
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
      {/* FLOATING BUTTON */}
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
              <Sparkles size={22} />
            </motion.span>
          )}
        </AnimatePresence>

        {hasNewMessage && !isOpen && <span className="ai-badge" />}
      </motion.button>

      {/* CHAT PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ai-chat-panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* HEADER */}
            <div className="ai-chat-header">
              <div className="ai-header-left">
                <div className="ai-avatar">
                  <Bot size={18} />
                </div>

                <div>
                  <h4>Cinema Assistant</h4>
                  <span className="ai-status">
                    <span className="ai-dot" />
                    Đang hoạt động
                  </span>
                </div>
              </div>

              <button
                className="ai-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
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
                      <Bot size={14} />
                    )}
                  </div>

                  <div className="ai-msg-content">
                    <div className="ai-msg-bubble">{msg.content}</div>

                    {msg.movies && msg.movies.length > 0 && (
                      <div className="ai-movie-list">
                        {msg.movies.map(m => (
                          <MovieSuggestCard
                            key={m.movie_id}
                            movie={m}
                            onClick={() => handleMovieClick(m.slug)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="ai-msg bot">
                  <div className="ai-msg-avatar">
                    <Bot size={14} />
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
                placeholder="Hỏi mình về phim..."
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
    </>
  );
};

export default AIChatBox;