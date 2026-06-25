import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Icons
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export function GeminiChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hi! I am your AI assistant. How can I help you with your code today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Read API key from environment variable (VITE_GEMINI_API_KEY)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsTyping(true);

        if (!apiKey) {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    role: 'model',
                    text: 'Error: API key is missing. Please set VITE_GEMINI_API_KEY in your frontend/.env file.'
                }]);
                setIsTyping(false);
            }, 500);
            return;
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            // Transform messages to Gemini format (excluding the very first generic greeting if we want pure history)
            const history = messages.slice(1).map(m => ({
                role: m.role,
                parts: [{ text: m.text }],
            }));

            const chat = model.startChat({
                history,
                systemInstruction: {
                    role: "system",
                    parts: [{ text: "You are a helpful and concise coding assistant for students learning web development. Help them with HTML, CSS, and JS problems without giving away the complete solution immediately." }]
                }
            });

            const result = await chat.sendMessage(userMessage);
            const responseText = result.response.text();

            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (err) {
            console.error('Gemini error:', err);
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start sm:bottom-5 sm:left-auto sm:right-5 sm:items-end lg:bottom-6 lg:right-6">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[min(360px,calc(100vw-2rem))] h-[min(500px,calc(100vh-7rem))] bg-[var(--bg-base)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col mb-3 sm:mb-4 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">

                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-[#2f80ed]/20 to-[#4e9af1]/10 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#2f80ed]/30 border border-[#2f80ed]/50 flex items-center justify-center text-[#4e9af1]">
                                <SparklesIcon />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-strong)] leading-tight">AI Assistant</h3>
                                <p className="text-[10px] text-[var(--text-muted)]">Powered by Gemini</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--text-strong)]/10 rounded-lg transition-colors"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    <div className="w-6 h-6 rounded-full bg-[#2f80ed]/20 border border-[#2f80ed]/30 flex items-center justify-center shrink-0 mr-2 mt-1">
                                        <SparklesIcon />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] px-3 py-2 text-[13px] leading-relaxed rounded-2xl ${msg.role === 'user'
                                            ? 'bg-[#2f80ed] text-[var(--text-strong)] rounded-br-sm'
                                            : 'bg-[var(--bg-surface-alt)] border border-[var(--border-color)] text-[#ddd] rounded-bl-sm'
                                        }`}
                                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="w-6 h-6 rounded-full bg-[#2f80ed]/20 border border-[#2f80ed]/30 flex items-center justify-center shrink-0 mr-2 mt-1">
                                    <SparklesIcon />
                                </div>
                                <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] px-3 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                                    <div className="w-1.5 h-1.5 bg-[#4e9af1] rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 bg-[#4e9af1] rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 bg-[#4e9af1] rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-color)] shrink-0">
                        {!apiKey && (
                            <p className="text-[10px] text-[#f85149] mb-2 px-1">
                                Warning: VITE_GEMINI_API_KEY is not set. Chat will not work.
                            </p>
                        )}
                        <div className="flex gap-2">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about your assignment..."
                                className="flex-1 bg-[var(--bg-surface-alt)] border border-[var(--border-color)] text-[var(--text-strong)] text-[13px] rounded-xl px-3 py-2.5 resize-none h-10 max-h-32 focus:outline-none focus:border-[#4e9af1] transition-colors scrollbar-thin"
                                rows={1}
                                disabled={isTyping}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="w-10 h-10 bg-[#2f80ed] hover:bg-[#1a6cda] active:scale-95 text-[var(--text-strong)] rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50 disabled:active:scale-100"
                            >
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-tr from-[#2f80ed] to-[#4e9af1] hover:shadow-[0_0_20px_rgba(78,154,241,0.4)] text-[var(--text-strong)] rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 group"
                >
                    <div className="group-hover:rotate-12 transition-transform duration-300">
                        <SparklesIcon />
                    </div>
                </button>
            )}
        </div>
    );
}
