/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Send, Bot, User, CheckCircle2, 
  AlertCircle, PlayCircle, RefreshCw, BarChart3, 
  Award, MessageSquare, ShieldCheck
} from 'lucide-react';

interface LogEntry {
  type: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
}

export default function App() {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{name: string, status: 'pass' | 'fail' | 'pending'}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], text: string) => {
    setLogs(prev => [...prev, {
      type,
      text,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const sendCommand = async (cmdStr: string, silent = false) => {
    const [command, ...args] = cmdStr.split(' ');
    if (!silent) addLog('user', cmdStr);

    try {
      const res = await fetch('/api/bot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          args,
          userId: 12345,
          username: 'TestUser'
        })
      });
      const data = await res.json();
      if (!silent) addLog('bot', data.response);
      return data.response;
    } catch (err) {
      if (!silent) addLog('system', 'Error connecting to bot server.');
      return null;
    }
  };

  const runAutomatedTest = async () => {
    setIsTesting(true);
    setLogs([]);
    addLog('system', '🚀 Starting Automated Command Test Suite...');
    
    const tests = [
      { name: 'Identity System (/nick)', cmd: '/nick MyNewName', expect: '✅ Nickname set to: MyNewName' },
      { name: 'Level System (/level)', cmd: '/level', expect: '📊 Level:' },
      { name: 'Karma System (Internal)', cmd: '/add_karma 15', expect: '➕ Added 15 karma.' },
      { name: 'Level Up Check', cmd: '/level', expect: '🌱 Initiate' },
      { name: 'Poll System (/poll)', cmd: '/poll Favorite Color? | Red | Blue', expect: '🗳️ Poll Created' },
      { name: 'Voting System (/vote)', cmd: '/vote 1 1', expect: '✅ Vote registered!' }
    ];

    const results = tests.map(t => ({ name: t.name, status: 'pending' as const }));
    setTestResults(results);

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const response = await sendCommand(t.cmd);
      const passed = response && response.includes(t.expect);
      
      setTestResults(prev => {
        const newRes = [...prev];
        newRes[i].status = passed ? 'pass' : 'fail';
        return newRes;
      });

      if (!passed) {
        addLog('system', `❌ Test Failed: ${t.name}`);
      } else {
        addLog('system', `✅ Test Passed: ${t.name}`);
      }
      
      await new Promise(r => setTimeout(r, 800));
    }

    addLog('system', '🏁 Test Suite Completed.');
    setIsTesting(false);
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E1E1E3] font-sans selection:bg-blue-500/30">
      {/* Sidebar / Status */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-[#16191E] border-r border-white/5 p-6 hidden lg:flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg leading-none">BotCore</h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mt-1">Command Validator</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-mono text-white/30 uppercase tracking-widest">Test Suite Status</h3>
          <div className="space-y-3">
            {testResults.map((res, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-3 bg-black/20 rounded-lg border border-white/5">
                <span className="text-white/60">{res.name}</span>
                {res.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {res.status === 'fail' && <AlertCircle className="w-4 h-4 text-red-500" />}
                {res.status === 'pending' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
              </div>
            ))}
            {testResults.length === 0 && (
              <p className="text-[10px] text-white/20 italic">No tests executed yet.</p>
            )}
          </div>
        </div>

        <div className="mt-auto p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
          <p className="text-[10px] text-blue-400 font-mono mb-2 uppercase tracking-tighter">System Info</p>
          <div className="space-y-1 text-[10px] font-mono text-white/40">
            <div className="flex justify-between"><span>Runtime:</span> <span className="text-white/60">Node.js v20</span></div>
            <div className="flex justify-between"><span>DB:</span> <span className="text-white/60">SQLite3</span></div>
            <div className="flex justify-between"><span>Status:</span> <span className="text-emerald-500">Live</span></div>
          </div>
        </div>
      </div>

      {/* Main Console */}
      <main className="lg:ml-80 min-h-screen flex flex-col">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0F1115]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-white/40">
              <Terminal className="w-3 h-3" />
              /dev/bot_console
            </div>
          </div>
          <button 
            onClick={runAutomatedTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <PlayCircle className="w-4 h-4" />
            Run Automated Test
          </button>
        </header>

        <div 
          ref={scrollRef}
          className="flex-1 p-8 overflow-y-auto space-y-4 font-mono text-sm"
        >
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
              <Bot className="w-16 h-16 mb-4" />
              <p className="uppercase tracking-[0.3em]">Console Ready</p>
              <p className="text-xs mt-2">Type a command or run the automated test suite.</p>
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex gap-4 ${log.type === 'system' ? 'bg-blue-500/5 p-3 rounded-lg border border-blue-500/10' : ''}`}
              >
                <span className="text-white/20 shrink-0">[{log.timestamp}]</span>
                <div className="flex gap-2">
                  {log.type === 'user' && <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                  {log.type === 'bot' && <Bot className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                  <span className={
                    log.type === 'user' ? 'text-blue-100' : 
                    log.type === 'bot' ? 'text-emerald-100' : 
                    'text-blue-400 italic'
                  }>
                    {log.text}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-8 border-t border-white/5 bg-[#16191E]">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                sendCommand(input);
                setInput('');
              }
            }}
            className="relative"
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a command (e.g. /nick MyName)..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm"
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-4 flex gap-4 text-[10px] font-mono text-white/20 uppercase tracking-widest">
            <span>Quick Commands:</span>
            <button onClick={() => setInput('/nick ')} className="hover:text-blue-400 transition-colors">/nick</button>
            <button onClick={() => setInput('/level')} className="hover:text-blue-400 transition-colors">/level</button>
            <button onClick={() => setInput('/poll Question | Yes | No')} className="hover:text-blue-400 transition-colors">/poll</button>
          </div>
        </div>
      </main>
    </div>
  );
}


