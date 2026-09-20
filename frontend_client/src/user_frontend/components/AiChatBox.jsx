import React, {
    useEffect,
    useRef,
    useState,
    useCallback
} from 'react';

import {
    motion,
    AnimatePresence
} from 'framer-motion';

import {
    X,
    Send,
    User,
    Trash2,
    Copy,
    Check,
    Sparkles
} from 'lucide-react';

import {
    useNavigate
} from 'react-router-dom';

import Modal from './Modal';
import GeminiIcon from './GeminiIcon';

import { useAuth } from '../../context/AuthContext';

import '../styles/AiChat.css';

/* ==========================================================
   API
========================================================== */

const API_BASE_URL =
    'https://api.quangdungcinema.id.vn';

/* ==========================================================
   LOCAL STORAGE
========================================================== */

const STORAGE_KEY =
    'cinema_ai_chat_history';

const STORAGE_MAX_MESSAGES = 100;

/* ==========================================================
   LOAD HISTORY
========================================================== */

const loadMessagesFromStorage = () => {
    try {
        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!saved) {
            return null;
        }

        const parsed =
            JSON.parse(saved);

        if (
            !Array.isArray(parsed) ||
            parsed.length === 0
        ) {
            return null;
        }

        return parsed;

    } catch (error) {
        console.warn(
            '[AiChatBox] Không load được chat history:',
            error
        );

        return null;
    }
};

/* ==========================================================
   SAVE HISTORY
========================================================== */

const saveMessagesToStorage = (
    messages
) => {
    try {
        /*
         * Không lưu message đang stream.
         */
        const cleaned =
            messages
                .filter(
                    (msg) =>
                        !msg.isStreaming &&
                        !msg.isThinking
                )
                .slice(
                    -STORAGE_MAX_MESSAGES
                );

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cleaned)
        );

    } catch (error) {
        console.warn(
            '[AiChatBox] Không save được chat:',
            error
        );
    }
};

/* ==========================================================
   DEFAULT MESSAGE
========================================================== */

const buildDefaultMessages = (
    userName = null
) => {
    const greeting = userName
        ? `Xin chào ${userName}! 😊`
        : 'Xin chào bạn! 😊';

    return [
        {
            role: 'assistant',

            content:
                `${greeting} Mình là trợ lý AI của Quang Dũng Cinema. ` +
                `Bạn muốn hỏi mình về phim, giá vé hay rạp chiếu hôm nay ạ?`,

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
   THINKING INDICATOR
========================================================== */

const AiThinking = () => {
    return (
        <div className="ai-thinking">
            <div className="ai-thinking-icon">
                <GeminiIcon size={15} />
            </div>

            <div className="ai-thinking-content">
                <div className="ai-thinking-dots">
                    <span />
                    <span />
                    <span />
                </div>

                <span className="ai-thinking-text">
                    Đang suy nghĩ
                </span>
            </div>
        </div>
    );
};

/* ==========================================================
   STREAMING CURSOR
========================================================== */

const StreamingCursor = () => (
    <span
        className="ai-streaming-cursor"
        aria-hidden="true"
    >
        ▍
    </span>
);

/* ==========================================================
   MOVIE CARD
========================================================== */

const MovieSuggestCard = ({
    movie,
    onClick
}) => {
    const posterUrl =
        movie.movie_poster ||
        '/poster-placeholder.jpg';

    return (
        <motion.div
            className="ai-movie-card"
            onClick={onClick}
            whileHover={{
                y: -3
            }}
            whileTap={{
                scale: 0.98
            }}
        >
            <img
                src={posterUrl}
                alt={movie.title}
                loading="lazy"
            />

            <div className="ai-movie-info">
                <h5>
                    {movie.title}
                </h5>

                <div className="ai-movie-meta">
                    {movie.age_rating > 0 && (
                        <span className="ai-age">
                            T{movie.age_rating}
                        </span>
                    )}

                    {movie.duration && (
                        <span>
                            {movie.duration}p
                        </span>
                    )}
                </div>

                {movie.genres?.length > 0 && (
                    <p className="ai-movie-genre">
                        {movie.genres.join(', ')}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

/* ==========================================================
   MESSAGE BUBBLE
========================================================== */

const MessageBubble = ({
    msg
}) => {
    const [
        copied,
        setCopied
    ] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(
                msg.content
            );

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 1500);

        } catch (error) {
            console.warn(
                '[Copy] Không copy được:',
                error
            );
        }
    };

    /*
     * Thinking message
     */
    if (
        msg.role === 'assistant' &&
        msg.isThinking
    ) {
        return (
            <AiThinking />
        );
    }

    return (
        <div className="ai-msg-bubble-wrapper">
            <div
                className={[
                    'ai-msg-bubble',
                    msg.isError
                        ? 'ai-msg-error'
                        : ''
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {msg.content}

                {msg.isStreaming && (
                    <StreamingCursor />
                )}
            </div>

            {msg.role === 'assistant' &&
                !msg.isError &&
                !msg.isStreaming &&
                msg.content && (
                    <button
                        type="button"
                        className="ai-msg-copy"
                        onClick={handleCopy}
                        title="Sao chép"
                        aria-label="Sao chép tin nhắn"
                    >
                        {copied ? (
                            <Check size={13} />
                        ) : (
                            <Copy size={13} />
                        )}
                    </button>
                )}
        </div>
    );
};

/* ==========================================================
   MAIN CHATBOX
========================================================== */

const AiChatBox = () => {
    const navigate =
        useNavigate();

    const { user } =
        useAuth();

    /* --------------------------------------------------------
       OPEN
    -------------------------------------------------------- */

    const [
        isOpen,
        setIsOpen
    ] = useState(false);

    /* --------------------------------------------------------
       USER
    -------------------------------------------------------- */

    const userName =
        user?.full_name ||
        user?.username ||
        null;

    /* --------------------------------------------------------
       MESSAGES
    -------------------------------------------------------- */

    const [
        messages,
        setMessages
    ] = useState(() => {
        const saved =
            loadMessagesFromStorage();

        if (
            saved &&
            saved.length > 0
        ) {
            return saved;
        }

        return buildDefaultMessages(
            userName
        );
    });

    /* --------------------------------------------------------
       INPUT
    -------------------------------------------------------- */

    const [
        input,
        setInput
    ] = useState('');

    /* --------------------------------------------------------
       BADGE
    -------------------------------------------------------- */

    const [
        hasNewMessage,
        setHasNewMessage
    ] = useState(false);

    /* --------------------------------------------------------
       CLEAR MODAL
    -------------------------------------------------------- */

    const [
        showClearModal,
        setShowClearModal
    ] = useState(false);

    /* --------------------------------------------------------
       REFS
    -------------------------------------------------------- */

    const messagesEndRef =
        useRef(null);

    const inputRef =
        useRef(null);

    const abortControllerRef =
        useRef(null);

    /*
     * Buffer dùng để tạo hiệu ứng
     * trả lời từng chữ.
     */
    const streamBufferRef =
        useRef('');

    /*
     * RAF đang chạy hay chưa.
     */
    const streamFrameRef =
        useRef(null);

    /*
     * Index message assistant hiện tại.
     */
    const streamingMessageIdRef =
        useRef(null);

    /* ========================================================
       AUTO SAVE
    ======================================================== */

    useEffect(() => {
        if (messages.length > 0) {
            saveMessagesToStorage(
                messages
            );
        }
    }, [messages]);

    /* ========================================================
       UPDATE GREETING
    ======================================================== */

    useEffect(() => {
        if (
            messages.length === 1 &&
            messages[0].role === 'assistant'
        ) {
            setMessages(
                buildDefaultMessages(
                    userName
                )
            );
        }

        // eslint-disable-next-line
    }, [userName]);

    /* ========================================================
       AUTO SCROLL
    ======================================================== */

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView(
            {
                behavior: 'smooth'
            }
        );
    }, [messages]);

    /* ========================================================
       FOCUS
    ======================================================== */

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);

            setHasNewMessage(false);
        }
    }, [isOpen]);

    /* ========================================================
       NEW MESSAGE BADGE
    ======================================================== */

    useEffect(() => {
        if (
            !isOpen &&
            messages.length > 1
        ) {
            const last =
                messages[
                    messages.length - 1
                ];

            if (
                last.role === 'assistant' &&
                !last.isStreaming &&
                !last.isThinking
            ) {
                setHasNewMessage(true);
            }
        }
    }, [
        messages,
        isOpen
    ]);

    /* ========================================================
       CLEANUP
    ======================================================== */

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();

            if (
                streamFrameRef.current
            ) {
                cancelAnimationFrame(
                    streamFrameRef.current
                );
            }
        };
    }, []);

    /* ========================================================
       CLEAR CHAT
    ======================================================== */

    const handleOpenClearModal =
        () => {
            setShowClearModal(true);
        };

    const handleConfirmClear =
        () => {
            abortControllerRef.current?.abort();

            if (
                streamFrameRef.current
            ) {
                cancelAnimationFrame(
                    streamFrameRef.current
                );
            }

            streamBufferRef.current =
                '';

            streamingMessageIdRef.current =
                null;

            localStorage.removeItem(
                STORAGE_KEY
            );

            setMessages(
                buildDefaultMessages(
                    userName
                )
            );

            setInput('');

            setShowClearModal(false);
        };

    const handleCancelClear =
        () => {
            setShowClearModal(false);
        };

    /* ========================================================
       UPDATE STREAMING MESSAGE
    ======================================================== */

    const updateStreamingMessage =
        useCallback(
            (content) => {
                setMessages((prev) => {
                    const updated =
                        [...prev];

                    const index =
                        updated.findIndex(
                            (msg) =>
                                msg.id ===
                                streamingMessageIdRef.current
                        );

                    if (
                        index === -1
                    ) {
                        return prev;
                    }

                    updated[index] = {
                        ...updated[index],

                        content,

                        isThinking:
                            false,

                        isStreaming:
                            true
                    };

                    return updated;
                });
            },
            []
        );

    /* ========================================================
       TYPE STREAM BUFFER
    ======================================================== */

    const startTypewriter =
        useCallback(() => {
            /*
             * Nếu RAF đã chạy thì không tạo
             * thêm RAF.
             */
            if (
                streamFrameRef.current
            ) {
                return;
            }

            const tick = () => {
                const buffer =
                    streamBufferRef.current;

                if (!buffer) {
                    streamFrameRef.current =
                        null;

                    return;
                }

                /*
                 * Lấy nhiều ký tự mỗi frame
                 * để không bị quá chậm.
                 *
                 * ~2-4 ký tự/frame.
                 */
                const charsPerFrame =
                    buffer.length > 60
                        ? 4
                        : buffer.length > 25
                            ? 3
                            : 2;

                const output =
                    buffer.slice(
                        0,
                        charsPerFrame
                    );

                streamBufferRef.current =
                    buffer.slice(
                        charsPerFrame
                    );

                setMessages(
                    (prev) => {
                        const updated =
                            [...prev];

                        const index =
                            updated.findIndex(
                                (msg) =>
                                    msg.id ===
                                    streamingMessageIdRef.current
                            );

                        if (
                            index === -1
                        ) {
                            return prev;
                        }

                        const current =
                            updated[index];

                        updated[index] = {
                            ...current,

                            content:
                                current.content +
                                output,

                            isThinking:
                                false,

                            isStreaming:
                                true
                        };

                        return updated;
                    }
                );

                if (
                    streamBufferRef.current
                ) {
                    streamFrameRef.current =
                        requestAnimationFrame(
                            tick
                        );
                } else {
                    streamFrameRef.current =
                        null;
                }
            };

            streamFrameRef.current =
                requestAnimationFrame(
                    tick
                );
        }, []);

    /* ========================================================
       SEND CHAT REQUEST
    ======================================================== */

    const sendChatRequest =
        async (text) => {
            /*
             * Hủy request cũ.
             */
            abortControllerRef.current?.abort();

            abortControllerRef.current =
                new AbortController();

            /*
             * Reset stream buffer.
             */
            streamBufferRef.current =
                '';

            /*
             * Tạo ID duy nhất cho message.
             */
            const messageId =
                `ai-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`;

            streamingMessageIdRef.current =
                messageId;

            /*
             * Tạo message thinking
             * NGAY LẬP TỨC.
             */
            setMessages((prev) => [
                ...prev,

                {
                    id: messageId,

                    role: 'assistant',

                    content: '',

                    movies: [],

                    isThinking: true,

                    isStreaming: false
                }
            ]);

            try {
                /*
                 * Lấy history TRƯỚC request.
                 */
                const history =
                    messages
                        .slice(-10)
                        .map((m) => ({
                            role:
                                m.role,
                            content:
                                m.content
                        }));

                /* ------------------------------------------------
                   FETCH SSE
                ------------------------------------------------ */

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/ai/chat/stream`,
                        {
                            method: 'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({
                                    message:
                                        text,

                                    history,

                                    userName
                                }),

                            signal:
                                abortControllerRef
                                    .current
                                    .signal
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }

                if (
                    !response.body
                ) {
                    throw new Error(
                        'Browser không hỗ trợ streaming.'
                    );
                }

                /* ------------------------------------------------
                   STREAM READER
                ------------------------------------------------ */

                const reader =
                    response.body.getReader();

                const decoder =
                    new TextDecoder(
                        'utf-8'
                    );

                let buffer = '';

                let finalMovies = [];

                let streamFinished =
                    false;

                /* ------------------------------------------------
                   READ LOOP
                ------------------------------------------------ */

                while (!streamFinished) {
                    const {
                        done,
                        value
                    } =
                        await reader.read();

                    if (done) {
                        break;
                    }

                    buffer +=
                        decoder.decode(
                            value,
                            {
                                stream: true
                            }
                        );

                    /*
                     * SSE event kết thúc bằng
                     *
                     * \n\n
                     */
                    const events =
                        buffer.split(
                            '\n\n'
                        );

                    /*
                     * Event cuối có thể chưa hoàn chỉnh.
                     */
                    buffer =
                        events.pop() || '';

                    for (
                        const event
                        of events
                    ) {
                        const lines =
                            event.split(
                                '\n'
                            );

                        for (
                            const line
                            of lines
                        ) {
                            if (
                                !line.startsWith(
                                    'data: '
                                )
                            ) {
                                continue;
                            }

                            const jsonStr =
                                line
                                    .slice(6)
                                    .trim();

                            if (
                                !jsonStr
                            ) {
                                continue;
                            }

                            let data;

                            try {
                                data =
                                    JSON.parse(
                                        jsonStr
                                    );
                            } catch (
                                parseError
                            ) {
                                console.warn(
                                    '[AI Stream] Parse event failed:',
                                    parseError
                                );

                                continue;
                            }

                            /* ------------------------------------
                               TEXT
                            ------------------------------------ */

                            if (
                                data.type ===
                                'text'
                            ) {
                                /*
                                 * Gemini chunk
                                 * đi vào buffer.
                                 */
                                streamBufferRef.current +=
                                    data.content ||
                                    '';

                                /*
                                 * Bắt đầu typewriter.
                                 */
                                startTypewriter();

                                /*
                                 * Tắt thinking.
                                 */
                                setMessages(
                                    (prev) =>
                                        prev.map(
                                            (msg) =>
                                                msg.id ===
                                                messageId
                                                    ? {
                                                        ...msg,

                                                        isThinking:
                                                            false,

                                                        isStreaming:
                                                            true
                                                    }
                                                    : msg
                                        )
                                );
                            }

                            /* ------------------------------------
                               DONE
                            ------------------------------------ */

                            else if (
                                data.type ===
                                'done'
                            ) {
                                finalMovies =
                                    data.movies ||
                                    [];

                                streamFinished =
                                    true;
                            }

                            /* ------------------------------------
                               ERROR
                            ------------------------------------ */

                            else if (
                                data.type ===
                                'error'
                            ) {
                                throw new Error(
                                    data.message ||
                                    'AI stream error'
                                );
                            }
                        }
                    }
                }

                /*
                 * Nếu stream kết thúc nhưng buffer
                 * vẫn còn ký tự chưa render,
                 * chờ render hết.
                 */
                await new Promise(
                    (resolve) => {
                        const waitForBuffer =
                            () => {
                                if (
                                    !streamBufferRef.current &&
                                    !streamFrameRef.current
                                ) {
                                    resolve();
                                    return;
                                }

                                requestAnimationFrame(
                                    waitForBuffer
                                );
                            };

                        waitForBuffer();
                    }
                );

                /* ------------------------------------------------
                   FINISH MESSAGE
                ------------------------------------------------ */

                setMessages((prev) =>
                    prev.map(
                        (msg) =>
                            msg.id ===
                            messageId
                                ? {
                                    ...msg,

                                    movies:
                                        finalMovies,

                                    isThinking:
                                        false,

                                    isStreaming:
                                        false
                                }
                                : msg
                    )
                );

                streamingMessageIdRef.current =
                    null;

            } catch (error) {
                if (
                    error?.name ===
                    'AbortError'
                ) {
                    return;
                }

                console.error(
                    '[AI Chat] Error:',
                    error
                );

                streamBufferRef.current =
                    '';

                setMessages((prev) =>
                    prev.map(
                        (msg) =>
                            msg.id ===
                            messageId
                                ? {
                                    ...msg,

                                    content:
                                        'Xin lỗi, mình đang bận. Bạn thử lại sau nhé!',

                                    isThinking:
                                        false,

                                    isStreaming:
                                        false,

                                    isError:
                                        true
                                }
                                : msg
                    )
                );

                streamingMessageIdRef.current =
                    null;
            }
        };

    /* ========================================================
       SEND MESSAGE
    ======================================================== */

    const sendMessage =
        async () => {
            const text =
                input.trim();

            if (
                !text ||
                isStreaming
            ) {
                return;
            }

            const userMsg = {
                id:
                    `user-${Date.now()}`,

                role: 'user',

                content: text
            };

            setMessages(
                (prev) => [
                    ...prev,
                    userMsg
                ]
            );

            setInput('');

            await sendChatRequest(
                text
            );
        };

    /* ========================================================
       SEND SUGGESTION
    ======================================================== */

    const sendSuggestion =
        async (text) => {
            if (
                isStreaming
            ) {
                return;
            }

            const userMsg = {
                id:
                    `user-${Date.now()}`,

                role: 'user',

                content: text
            };

            setMessages(
                (prev) => [
                    ...prev,
                    userMsg
                ]
            );

            setInput('');

            await sendChatRequest(
                text
            );
        };

    /* ========================================================
       KEYBOARD
    ======================================================== */

    const handleKeyDown =
        (event) => {
            if (
                event.key ===
                    'Enter' &&
                !event.shiftKey
            ) {
                event.preventDefault();

                sendMessage();
            }
        };

    /* ========================================================
       MOVIE CLICK
    ======================================================== */

    const handleMovieClick =
        (slug) => {
            if (!slug) {
                return;
            }

            setIsOpen(false);

            navigate(
                `/movie/${slug}`
            );

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };

    /* ========================================================
       STREAMING STATE
    ======================================================== */

    const isStreaming =
        messages.some(
            (msg) =>
                msg.isStreaming ||
                msg.isThinking
        );

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <>
            {/* ==================================================
                FAB
            ================================================== */}

            <motion.button
                className="ai-chat-fab"
                onClick={() =>
                    setIsOpen(
                        (value) =>
                            !value
                    )
                }
                whileHover={{
                    scale: 1.08
                }}
                whileTap={{
                    scale: 0.94
                }}
                animate={{
                    boxShadow:
                        hasNewMessage
                            ? [
                                '0 0 0 0 rgba(159,183,210,0.65)',
                                '0 0 0 16px rgba(159,183,210,0)'
                            ]
                            : '0 8px 24px rgba(0,0,0,0.3)'
                }}
                transition={{
                    boxShadow: {
                        duration: 1.6,

                        repeat:
                            hasNewMessage
                                ? Infinity
                                : 0
                    }
                }}
                aria-label="Mở chatbox AI"
            >
                <AnimatePresence
                    mode="wait"
                >
                    {isOpen ? (
                        <motion.span
                            key="close"
                            initial={{
                                rotate: -90,
                                opacity: 0
                            }}
                            animate={{
                                rotate: 0,
                                opacity: 1
                            }}
                            exit={{
                                rotate: 90,
                                opacity: 0
                            }}
                            transition={{
                                duration: 0.2
                            }}
                        >
                            <X size={22} />
                        </motion.span>
                    ) : (
                        <motion.span
                            key="open"
                            initial={{
                                rotate: 90,
                                opacity: 0
                            }}
                            animate={{
                                rotate: 0,
                                opacity: 1
                            }}
                            exit={{
                                rotate: -90,
                                opacity: 0
                            }}
                            transition={{
                                duration: 0.2
                            }}
                        >
                            <GeminiIcon
                                size={26}
                            />
                        </motion.span>
                    )}
                </AnimatePresence>

                {hasNewMessage &&
                    !isOpen && (
                        <span className="ai-badge" />
                    )}
            </motion.button>

            {/* ==================================================
                PANEL
            ================================================== */}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="ai-chat-panel"
                        initial={{
                            opacity: 0,
                            y: 40,
                            scale: 0.95
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1
                        }}
                        exit={{
                            opacity: 0,
                            y: 40,
                            scale: 0.95
                        }}
                        transition={{
                            duration: 0.35,
                            ease: [
                                0.22,
                                1,
                                0.36,
                                1
                            ]
                        }}
                    >
                        {/* ======================================
                            HEADER
                        ====================================== */}

                        <div className="ai-chat-header">
                            <div className="ai-header-left">
                                <div className="ai-avatar">
                                    <GeminiIcon
                                        size={20}
                                    />
                                </div>

                                <div>
                                    <h4>
                                        Gemini Assistant
                                    </h4>

                                    <span className="ai-status">
                                        <span className="ai-dot" />

                                        {isStreaming
                                            ? 'Đang trả lời...'
                                            : 'Đang hoạt động'}
                                    </span>
                                </div>
                            </div>

                            <div className="ai-header-actions">
                                <button
                                    className="ai-close-btn"
                                    onClick={
                                        handleOpenClearModal
                                    }
                                    title="Xóa cuộc trò chuyện"
                                    aria-label="Xóa cuộc trò chuyện"
                                >
                                    <Trash2
                                        size={16}
                                    />
                                </button>

                                <button
                                    className="ai-close-btn"
                                    onClick={() =>
                                        setIsOpen(
                                            false
                                        )
                                    }
                                    aria-label="Đóng"
                                >
                                    <X
                                        size={18}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* ======================================
                            MESSAGES
                        ====================================== */}

                        <div className="ai-chat-body">
                            {messages.map(
                                (
                                    msg,
                                    index
                                ) => (
                                    <motion.div
                                        key={
                                            msg.id ||
                                            index
                                        }
                                        className={[
                                            'ai-msg',

                                            msg.role ===
                                            'user'
                                                ? 'user'
                                                : 'bot',

                                            msg.isError
                                                ? 'error'
                                                : '',

                                            msg.isThinking
                                                ? 'thinking'
                                                : ''
                                        ]
                                            .filter(
                                                Boolean
                                            )
                                            .join(
                                                ' '
                                            )}
                                        initial={{
                                            opacity: 0,
                                            y: 8
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0
                                        }}
                                        transition={{
                                            duration:
                                                0.2
                                        }}
                                    >
                                        <div className="ai-msg-avatar">
                                            {msg.role ===
                                            'user' ? (
                                                <User
                                                    size={
                                                        14
                                                    }
                                                />
                                            ) : (
                                                <GeminiIcon
                                                    size={
                                                        14
                                                    }
                                                />
                                            )}
                                        </div>

                                        <div className="ai-msg-content">
                                            <MessageBubble
                                                msg={
                                                    msg
                                                }
                                            />

                                            {msg.movies &&
                                                msg.movies
                                                    .length >
                                                    0 && (
                                                    <div className="ai-movie-list">
                                                        {msg.movies.map(
                                                            (
                                                                movie
                                                            ) => (
                                                                <MovieSuggestCard
                                                                    key={
                                                                        movie.movie_id
                                                                    }
                                                                    movie={
                                                                        movie
                                                                    }
                                                                    onClick={() =>
                                                                        handleMovieClick(
                                                                            movie.slug
                                                                        )
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </motion.div>
                                )
                            )}

                            {/* ==================================
                                QUICK SUGGESTIONS
                            ================================== */}

                            {messages.length <=
                                1 &&
                                !isStreaming && (
                                    <div className="ai-quick-suggestions">
                                        {QUICK_SUGGESTIONS.map(
                                            (
                                                suggestion,
                                                index
                                            ) => (
                                                <motion.button
                                                    key={
                                                        index
                                                    }
                                                    type="button"
                                                    className="ai-suggestion-btn"
                                                    onClick={() =>
                                                        sendSuggestion(
                                                            suggestion
                                                        )
                                                    }
                                                    whileHover={{
                                                        y: -2
                                                    }}
                                                    whileTap={{
                                                        scale: 0.98
                                                    }}
                                                >
                                                    {suggestion}
                                                </motion.button>
                                            )
                                        )}
                                    </div>
                                )}

                            <div
                                ref={
                                    messagesEndRef
                                }
                            />
                        </div>

                        {/* ======================================
                            INPUT
                        ====================================== */}

                        <div className="ai-chat-input">
                            <input
                                ref={
                                    inputRef
                                }
                                type="text"
                                value={input}
                                onChange={(event) =>
                                    setInput(
                                        event.target
                                            .value
                                    )
                                }
                                onKeyDown={
                                    handleKeyDown
                                }
                                placeholder={
                                    isStreaming
                                        ? 'AI đang trả lời...'
                                        : 'Hỏi Gemini về phim...'
                                }
                                maxLength={
                                    500
                                }
                                disabled={
                                    isStreaming
                                }
                            />

                            <button
                                onClick={
                                    sendMessage
                                }
                                disabled={
                                    !input.trim() ||
                                    isStreaming
                                }
                                className="ai-send-btn"
                                aria-label="Gửi"
                            >
                                {isStreaming ? (
                                    <Sparkles
                                        size={17}
                                    />
                                ) : (
                                    <Send
                                        size={18}
                                    />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ==================================================
                CLEAR MODAL
            ================================================== */}

            <Modal
                show={
                    showClearModal
                }
                type="warning"
                title="Xóa cuộc trò chuyện"
                message="Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                onConfirm={
                    handleConfirmClear
                }
                onCancel={
                    handleCancelClear
                }
            />
        </>
    );
};

export default AiChatBox;