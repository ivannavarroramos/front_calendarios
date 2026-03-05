import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, FileText, Loader2, Search, Bot, User } from 'lucide-react';
import api from '../api/axiosConfig';
import { useAuth } from '../modules/auth/core/Auth';
import { atisaStyles } from '../styles/atisaStyles';
import PageHeader from './ui/PageHeader';

// ==========================================
// INTERFACES & TIPOS
// ==========================================
export interface DocumentoConsultado {
    id: number;
    nombre: string;
    url_descarga?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'agent';
    content: string;
    reformulaciones?: string[];
    documentos_consultados?: DocumentoConsultado[];
}

// ==========================================
// COMPONENTES SECUNDARIOS
// ==========================================

const DocumentBadge: React.FC<{ docId: string; fragId: string; pag: string; docs?: DocumentoConsultado[] }> = ({ docId, fragId, pag, docs }) => {
    const docInfo = docs?.find(d => String(d.id) === docId);
    const docName = docInfo?.nombre || `Documento Ref. ${docId}`;

    return (
        <span className="relative group inline-block mx-1 align-middle font-['Lato']">
            <button className="bg-[#e5f6fc] text-[#00A1DE] text-[11px] font-medium px-2 py-0.5 rounded-md border border-[#00A1DE]/30 hover:bg-[#ccebf9] transition-colors inline-flex items-center gap-1 shadow-sm">
                <FileText size={12} />
                Doc {docId}, pág {pag}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[200px] p-2 bg-[#00505C] text-white text-xs rounded shadow-lg z-10 text-center">
                <strong className="block mb-1 font-['Aleo']">{docName}</strong>
                <span className="opacity-80">Fragmento: {fragId} | Página: {pag}</span>
            </div>
        </span>
    );
};

const FuentesConsultadasList: React.FC<{ docs?: DocumentoConsultado[] }> = ({ docs }) => {
    const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

    const handleDownload = async (doc: DocumentoConsultado) => {
        if (!doc.url_descarga || downloadingIds.has(doc.id)) return;

        try {
            setDownloadingIds(prev => new Set(prev).add(doc.id));

            const response = await api.get(doc.url_descarga, {
                responseType: 'blob'
            });

            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = doc.nombre;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Error descargando el documento:', error);
            // Aquí puedes cambiarlo por un Toast si lo prefieres
            alert('Error descargando el documento. Puede que el archivo ya no exista o tu sesión haya expirado.');
        } finally {
            setDownloadingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(doc.id);
                return newSet;
            });
        }
    };

    if (!docs || docs.length === 0) return null;

    return (
        <div className="mt-4 p-3 bg-[#f8fafc] rounded-lg border border-[#00505C]/10 font-['Lato']">
            <span className="font-bold text-sm text-[#00505C] mb-2 block font-['Aleo']">
                📄 Fuentes consultadas / Descargas disponibles:
            </span>
            <div className="flex flex-wrap gap-2">
                {docs.map((doc) => {
                    if (doc.url_descarga) {
                        const isDownloading = downloadingIds.has(doc.id);
                        return (
                            <button
                                key={doc.id}
                                onClick={() => handleDownload(doc)}
                                disabled={isDownloading}
                                title={`Descargar ${doc.nombre}`}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors shadow-sm ${isDownloading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#9CBA39] hover:bg-[#7AB800]'
                                    }`}
                            >
                                {isDownloading ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                )}
                                {isDownloading ? 'Descargando...' : doc.nombre}
                            </button>
                        );
                    }

                    return (
                        <span key={doc.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#00505C] bg-white rounded-md border border-[#00505C]/20 shadow-sm">
                            <FileText size={14} className="text-[#00A1DE]" /> {doc.nombre}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

// Removed FilterPanel component as per user request
const ChatLoading: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
    const steps = ["Orquestando búsqueda...", "Buscando en T-SQL...", "Generando respuesta..."];
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        if (!isLoading) { setStepIndex(0); return; }
        const interval = setInterval(() => {
            setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
        }, 2000);
        return () => clearInterval(interval);
    }, [isLoading]);

    if (!isLoading) return null;

    return (
        <div className="flex gap-3 text-[#00505C] items-center p-4 bg-[#f8fafc] rounded-2xl w-fit border border-[#00505C]/10 font-['Lato'] shadow-sm">
            <Loader2 className="animate-spin text-[#9CBA39]" size={18} />
            <span className="text-sm font-medium animate-pulse">{steps[stepIndex]}</span>
        </div>
    );
};

const ChatBubble: React.FC<{ message: Message; onSendReformulation: (q: string) => void }> = ({ message, onSendReformulation }) => {
    const isUser = message.role === 'user';

    // Preprocesamos Markdown para inyectar tags interpretables por react-markdown
    const preprocessText = (text: string) => {
        return text.replace(/\[doc:(\d+)\s+frag:(\d+)\s+pág:(\d+)\]/gi, '[$1:$2:$3](citation)');
    };

    return (
        <div className={`flex gap-4 w-full ${isUser ? 'justify-end' : 'justify-start'} font-['Lato']`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[#e5f6fc] flex items-center justify-center flex-shrink-0 border border-[#00A1DE]/30">
                    <Bot size={18} className="text-[#00A1DE]" />
                </div>
            )}

            <div className={`max-w-[85%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-5 py-3.5 shadow-sm text-sm bg-white border border-[#00505C]/10 text-gray-800 rounded-2xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                    <div className="prose prose-sm max-w-none leading-relaxed prose-p:my-1 prose-headings:font-['Aleo'] prose-headings:text-[#00505C] prose-strong:text-[#00505C]">
                        <ReactMarkdown
                            components={{
                                a: ({ href, children }) => {
                                    if (href === 'citation') {
                                        const parts = String(children).split(':');
                                        if (parts.length === 3) return <DocumentBadge docId={parts[0]} fragId={parts[1]} pag={parts[2]} docs={message.documentos_consultados} />;
                                    }
                                    return <a href={href} className="text-[#00A1DE] font-semibold hover:underline" target="_blank" rel="noreferrer">{children}</a>;
                                }
                            }}
                        >
                            {preprocessText(message.content)}
                        </ReactMarkdown>
                    </div>
                    {!isUser && message.documentos_consultados && message.documentos_consultados.length > 0 && (
                        <FuentesConsultadasList docs={message.documentos_consultados} />
                    )}
                </div>

                {/* Reformulaciones / Sugerencias */}
                {message.reformulaciones && message.reformulaciones.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {message.reformulaciones.map((req, idx) => (
                            <button key={idx} onClick={() => onSendReformulation(req)} className="text-[11px] bg-white hover:bg-[#e5f6fc] hover:text-[#00A1DE] hover:border-[#00A1DE] text-[#00505C] py-1.5 px-3 rounded-full transition-colors border border-[#00505C]/20 shadow-sm flex items-center gap-1.5 font-medium">
                                <Search size={10} />
                                {req}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {isUser && (
                <div className="w-8 h-8 rounded-full bg-[#9CBA39] flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User size={18} className="text-white" />
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL (EXPORT)
// ==========================================

export default function DocumentSearchChat() {
    const { auth, currentUser } = useAuth();

    const getCurrentAutor = (): string => {
        if (auth?.api_token) {
            try {
                const payload = JSON.parse(atob(auth.api_token.split('.')[1]));
                return payload.numeross || payload.username || 'usuario';
            } catch (error) {
                console.warn('Error decodificando token JWT:', error);
            }
        }
        return currentUser?.username || 'usuario';
    };

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    // Auto-scroll al recibir mensajes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (query: string = inputValue) => {
        if (!query.trim() || isLoading) return;

        setInputValue("");
        const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: query };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            const payload = {
                numeross: getCurrentAutor(),
                pregunta: query
            };

            // Llamada Axios/Fetch real a "/search"
            console.log("Enviando Payload:", payload);
            const res = await api.post('/search', payload);
            const data = res.data;

            const realResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: data.respuesta_markdown || "Lo siento, no tengo respuesta en este momento.",
                reformulaciones: data.reformulaciones || [],
                documentos_consultados: data.documentos_consultados || []
            };

            setMessages(prev => [...prev, realResponse]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = { id: Date.now().toString(), role: 'agent', content: "Lo siento, ha ocurrido un error de conexión al consultar los documentos." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="container-fluid"
            style={{
                fontFamily: atisaStyles.fonts.secondary,
                backgroundColor: '#f8f9fa',
                minHeight: '100vh',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <PageHeader
                title="Asistente Documental"
                subtitle="Consulta Inteligente de Normativas y Documentos"
                icon="robot"
            />

            <div
                className="flex-grow-1 d-flex flex-column bg-white shadow-sm border"
                style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    maxHeight: 'calc(100vh - 200px)',
                    minHeight: '500px'
                }}
            >
                {/* ÁREA DE HISTORIAL DE CHAT */}
                <div
                    className="flex-grow-1 overflow-auto p-4 p-md-6"
                    style={{
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                    }}
                    ref={scrollRef}
                >
                    {messages.length === 0 ? (
                        <div className="d-flex h-100 align-items-center justify-content-center text-center px-4">
                            <div style={{ maxWidth: '500px' }}>
                                <div
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        backgroundColor: '#e5f6fc',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 24px',
                                        border: '1px solid rgba(0, 161, 222, 0.2)',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <Bot size={40} style={{ color: '#00A1DE' }} />
                                </div>
                                <h3
                                    style={{
                                        fontFamily: atisaStyles.fonts.primary,
                                        color: atisaStyles.colors.primary,
                                        fontSize: '24px',
                                        fontWeight: '700',
                                        marginBottom: '12px'
                                    }}
                                >
                                    ¿En qué puedo ayudarte hoy?
                                </h3>
                                <p className="text-muted" style={{ lineHeight: '1.6' }}>
                                    Realiza consultas sobre políticas, procedimientos, normativas o cualquier documento de la empresa. Mi respuesta incluirá referencias directas a las fuentes.
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <ChatBubble key={msg.id} message={msg} onSendReformulation={handleSend} />
                        ))
                    )}
                    <ChatLoading isLoading={isLoading} />
                </div>

                {/* ÁREA DE ENTRADA */}
                <div className="p-4 bg-white border-top">
                    <div
                        className="d-flex align-items-center gap-3 p-3 border-2"
                        style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '16px',
                            border: '2px solid #e2e8f0',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                            }}
                            placeholder="Escribe tu pregunta aquí..."
                            className="form-control bg-transparent border-0 flex-grow-1 shadow-none"
                            style={{
                                resize: 'none',
                                padding: '8px 12px',
                                fontSize: '14px',
                                color: atisaStyles.colors.primary,
                                minHeight: '44px',
                                maxHeight: '150px'
                            }}
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim() || isLoading}
                            className="btn d-flex align-items-center justify-content-center"
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                backgroundColor: atisaStyles.colors.secondary,
                                color: 'white',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = atisaStyles.colors.accent}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <div className="mt-3 text-center">
                        <span
                            style={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                fontWeight: '600',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}
                        >
                            <i className="bi bi-info-circle me-1"></i>
                            IA Generativa — Verifique siempre con la documentación original
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
