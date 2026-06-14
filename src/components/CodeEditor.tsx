import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// ── 类型定义 ──
interface CodeEditorProps {
  sessionId: string;   // 试炼 session ID
  language?: string;   // 编程语言（默认 javascript）
  onChange?: (code: string) => void;
}

type EventType = 'edit' | 'search' | 'paste' | 'delete' | 'refactor' | 'test_run' | 'idle';

interface CodingEvent {
  event_type: EventType;
  payload: any;
  chars_added?: number;
  chars_deleted?: number;
  occurred_at?: string;
}

interface BehaviorStats {
  totalEdits: number;
  pasteCount: number;
  searchCount: number;
  idleMs: number;
  totalCharsAdded: number;
}

// ── 语法高亮关键字表 ──
const KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'new', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'switch', 'case', 'break', 'continue', 'do', 'yield', 'delete', 'void', 'null', 'undefined', 'true', 'false'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'new', 'this', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'switch', 'case', 'break', 'continue', 'do', 'yield', 'delete', 'void', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum', 'implements', 'public', 'private', 'protected', 'readonly', 'as', 'is', 'namespace', 'abstract', 'declare'],
};

const API_BASE = '/api';

// ── 简单语法高亮（正则替换，不需要完美）──
function highlightCode(code: string, language: string): string {
  // 先转义 HTML，防止注入
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const keywords = KEYWORDS[language] || KEYWORDS.javascript;
  const kwPattern = keywords.join('|');

  // 统一匹配：注释 | 字符串 | 关键字 | 数字
  const regex = new RegExp(
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' +                                          // 注释
    '|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)' +         // 字符串
    '|\\b(' + kwPattern + ')\\b' +                                                       // 关键字
    '|\\b(\\d+\\.?\\d*)\\b',                                                             // 数字
    'g'
  );

  return escaped.replace(regex, (match, comment, str, kw, num) => {
    if (comment) return '<span style="color:#6c7086">' + comment + '</span>';
    if (str) return '<span style="color:#a6e3a1">' + str + '</span>';
    if (kw) return '<span style="color:#cba6f7">' + kw + '</span>';
    if (num) return '<span style="color:#fab387">' + num + '</span>';
    return match;
  });
}

export default function CodeEditor({ sessionId, language = 'javascript', onChange }: CodeEditorProps) {
  const [code, setCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<BehaviorStats>({
    totalEdits: 0,
    pasteCount: 0,
    searchCount: 0,
    idleMs: 0,
    totalCharsAdded: 0,
  });
  const [pendingCount, setPendingCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayInnerRef = useRef<HTMLDivElement>(null);
  const lineNumbersInnerRef = useRef<HTMLDivElement>(null);

  // 行为追踪相关 ref
  const eventQueue = useRef<CodingEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEditTime = useRef<number>(Date.now());
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const startTimeRef = useRef<number>(Date.now());

  // ── 批量上报 ──
  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;
    const events = [...eventQueue.current];
    eventQueue.current = [];
    setPendingCount(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${API_BASE}/coding-events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, events }),
      });
    } catch {
      // 上报失败不影响编码体验，静默丢弃
    }
  }, [sessionId]);

  const queueEvent = useCallback((event: CodingEvent) => {
    eventQueue.current.push({ ...event, occurred_at: new Date().toISOString() });
    setPendingCount(eventQueue.current.length);

    // 5 秒批量上报一次
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushEvents, 5000);
  }, [flushEvents]);

  // ── 编辑事件处理 ──
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const addedChars = Math.max(0, newValue.length - code.length);
    const deletedChars = Math.max(0, code.length - newValue.length);
    const now = Date.now();
    const timeSinceLastEdit = now - lastEditTime.current;

    // 检测是否之前有选区（用于重构判定）
    const hadSelection = lastSelectionRef.current.start !== lastSelectionRef.current.end;

    // 检测粘贴（短时间内大量字符增加）
    if (addedChars > 50 && timeSinceLastEdit < 100) {
      queueEvent({ event_type: 'paste', payload: { chars: addedChars }, chars_added: addedChars });
      setStats((prev) => ({ ...prev, pasteCount: prev.pasteCount + 1 }));
    }
    // 检测删除（大量字符删除）
    else if (deletedChars > 20 && addedChars === 0) {
      queueEvent({ event_type: 'delete', payload: { chars: deletedChars }, chars_deleted: deletedChars });
    }
    // 检测重构（选中代码后替换输入）
    else if (hadSelection && addedChars > 0) {
      queueEvent({
        event_type: 'refactor',
        payload: { selection_len: lastSelectionRef.current.end - lastSelectionRef.current.start, added: addedChars },
        chars_added: addedChars,
      });
    }

    // 普通编辑（每次都记录）
    queueEvent({ event_type: 'edit', payload: {}, chars_added: addedChars, chars_deleted: deletedChars });

    lastEditTime.current = now;
    setCode(newValue);
    onChange?.(newValue);

    // 更新统计
    setStats((prev) => ({
      ...prev,
      totalEdits: prev.totalEdits + 1,
      totalCharsAdded: prev.totalCharsAdded + addedChars,
    }));
  };

  // ── Tab 键支持（插入空格而非切换焦点）──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newValue);
      onChange?.(newValue);
      // 恢复光标位置
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  // ── 选区追踪（用于重构检测）──
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    lastSelectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  };

  // ── 搜索：回车时记录 search 事件 ──
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      queueEvent({ event_type: 'search', payload: { query: searchQuery.trim() } });
      setStats((prev) => ({ ...prev, searchCount: prev.searchCount + 1 }));
    }
  };

  // ── 运行测试（仅记录行为，不执行代码）──
  const handleRunTest = () => {
    queueEvent({ event_type: 'test_run', payload: { code_length: code.length } });
  };

  // ── 停滞检测：30 秒无编辑活动 → idle 事件 ──
  useEffect(() => {
    const timer = setTimeout(() => {
      queueEvent({ event_type: 'idle', payload: { duration_ms: 30000 } });
      setStats((prev) => ({ ...prev, idleMs: prev.idleMs + 30000 }));
    }, 30000);
    return () => clearTimeout(timer);
  }, [code, queueEvent]);

  // ── 组件卸载时 flush 剩余事件 ──
  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      // 同步 flush（卸载时尽力上报剩余事件）
      const events = [...eventQueue.current];
      eventQueue.current = [];
      if (events.length === 0) return;
      void (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          await fetch(`${API_BASE}/coding-events/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ sessionId, events }),
          });
        } catch {
          // 静默丢弃
        }
      })();
    };
    // 仅在 sessionId 变化时重新绑定卸载逻辑
  }, [sessionId]);

  // ── 滚动同步：高亮层 + 行号 与 textarea 同步 ──
  const handleScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const offset = `translateY(-${ta.scrollTop}px)`;
    if (overlayInnerRef.current) overlayInnerRef.current.style.transform = offset;
    if (lineNumbersInnerRef.current) lineNumbersInnerRef.current.style.transform = offset;
  };

  // 行号列表
  const lineCount = Math.max(code.split('\n').length, 1);

  // 编辑速度（字符/分钟）
  const elapsedMin = Math.max((Date.now() - startTimeRef.current) / 60000, 1 / 60);
  const editSpeed = Math.round(stats.totalCharsAdded / elapsedMin);

  // 维度影响提示
  const hints: { text: string; tone: 'pos' | 'warn' }[] = [];
  if (stats.searchCount >= 3) {
    hints.push({ text: '你的搜索频率体现了良好的事实验证习惯', tone: 'pos' });
  }
  if (stats.pasteCount >= 3) {
    hints.push({ text: '检测到大量粘贴，建议独立思考', tone: 'warn' });
  }

  // 高亮后的 HTML（useMemo 缓存避免每次按键重新计算）
  const overlayHtml = useMemo(() => {
    if (code.length === 0) return '<span style="color:#6c7086">// 在此编写代码...</span>';
    return highlightCode(code, language);
  }, [code, language]);

  return (
    <div className="flex gap-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* 编辑器主体 */}
      <div className="flex-1 rounded-xl overflow-hidden" style={{ background: '#1e1e2e' }}>
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #313244' }}>
          <span className="text-xs font-medium" style={{ color: '#87867f' }}>{language}</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="搜索代码..."
              className="text-xs px-2 py-1 rounded outline-none"
              style={{ background: '#313244', color: '#cdd6f4', width: '140px', border: 'none' }}
            />
            <i className="bi bi-search" style={{ color: '#87867f', fontSize: '12px' }} />
          </div>
        </div>

        {/* 编辑区：行号 + 代码 */}
        <div className="flex" style={{ height: '420px' }}>
          {/* 行号栏 */}
          <div
            className="overflow-hidden"
            style={{ width: '40px', flexShrink: 0, background: '#181825' }}
          >
            <div ref={lineNumbersInnerRef} style={{ padding: '12px 8px 12px 0', textAlign: 'right' }}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{ color: '#87867f', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.6' }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* 代码区：高亮层 + textarea 覆盖 */}
          <div className="relative flex-1">
            {/* 高亮覆盖层（不可交互，仅展示着色）*/}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                ref={overlayInnerRef}
                style={{
                  padding: '12px',
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#cdd6f4',
                }}
                dangerouslySetInnerHTML={{ __html: overlayHtml }}
              />
            </div>
            {/* textarea：透明文字 + 可见光标，与高亮层完全对齐 */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onSelect={handleSelect}
              onScroll={handleScroll}
              spellCheck={false}
              className="absolute inset-0 overflow-auto resize-none outline-none"
              style={{
                padding: '12px',
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'transparent',
                color: 'transparent',
                caretColor: '#cdd6f4',
                border: 'none',
              }}
            />
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid #313244' }}>
          <span className="text-xs" style={{ color: '#87867f' }}>已记录 {pendingCount} 条待上报</span>
          <button
            onClick={handleRunTest}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-transform hover:scale-105"
            style={{ background: '#c96442' }}
          >
            <i className="bi bi-play-fill" style={{ marginRight: '4px' }} />运行测试
          </button>
        </div>
      </div>

      {/* 行为统计面板 */}
      <div className="rounded-lg p-4" style={{ width: '200px', background: '#faf9f5', flexShrink: 0 }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#141413' }}>行为统计</h3>
        <div className="space-y-2 text-xs" style={{ color: '#3a3a38' }}>
          <div className="flex justify-between">
            <span>编辑次数</span>
            <span className="font-semibold">{stats.totalEdits}</span>
          </div>
          <div className="flex justify-between">
            <span>粘贴次数</span>
            <span className="font-semibold" style={{ color: stats.pasteCount >= 3 ? '#c96442' : '#3a3a38' }}>
              {stats.pasteCount}{stats.pasteCount >= 3 ? ' ⚠' : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span>搜索次数</span>
            <span className="font-semibold" style={{ color: stats.searchCount >= 3 ? '#4a8c6f' : '#3a3a38' }}>
              {stats.searchCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span>停滞时长</span>
            <span className="font-semibold">{Math.round(stats.idleMs / 1000)}s</span>
          </div>
          <div className="flex justify-between">
            <span>编辑速度</span>
            <span className="font-semibold">{editSpeed} 字/分</span>
          </div>
        </div>

        {/* 维度影响提示 */}
        {hints.length > 0 && (
          <div className="mt-4 space-y-2">
            {hints.map((h, i) => (
              <div
                key={i}
                className="text-[11px] leading-relaxed p-2 rounded"
                style={{
                  background: h.tone === 'warn' ? 'rgba(201,100,66,0.08)' : 'rgba(74,140,111,0.08)',
                  color: h.tone === 'warn' ? '#c96442' : '#4a8c6f',
                }}
              >
                {h.tone === 'warn' ? '⚠ ' : '✓ '}{h.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
