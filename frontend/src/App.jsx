import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import Editor from '@monaco-editor/react';
import './App.css';

const isDev = window.location.port.startsWith('517');
const BACKEND_URL = isDev ? 'http://localhost:8001' : window.location.origin;
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = isDev ? 'ws://localhost:8001/ws' : `${protocol}//${window.location.host}/ws`;

const LANGUAGES = [
  { label: 'Python', value: 'python', default: 'def hello():\n    print("Hello from Python!")\n\nhello()' },
  { label: 'JavaScript', value: 'javascript', default: 'function hello() {\n    console.log("Hello from JavaScript!");\n}\n\nhello();' }
];

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [sessionName, setSessionName] = useState('');
  const [language, setLanguage] = useState(LANGUAGES[0].value);
  const [output, setOutput] = useState('Welcome! Select a language and click "Run Code".\n');
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState(null);
  
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const docRef = useRef(null);
  const [binding, setBinding] = useState(null);

  // Initialize Session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('session');
    if (id) {
      setSessionId(id);
      fetch(`${BACKEND_URL}/sessions/${id}`)
        .then(res => res.json())
        .then(data => setSessionName(data.name || 'Interview Session'))
        .catch(() => setSessionName('Interview Session'));
    }
  }, []);

  // Initialize Pyodide from Global script tag
  useEffect(() => {
    async function initPyodide() {
      if (window.loadPyodide) {
        try {
          const py = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
          });
          setPyodide(py);
          setOutput(prev => prev + 'Python environment ready.\n');
        } catch (err) {
          setOutput(prev => prev + 'Error initializing Python: ' + err.message + '\n');
        }
      } else {
        setOutput(prev => prev + 'Pyodide script not found in index.html. Python disabled.\n');
      }
    }
    initPyodide();
  }, []);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    if (sessionId) {
      setupCollaboration(editor, sessionId);
    }
  };

  const setupCollaboration = (editor, id) => {
    if (providerRef.current) providerRef.current.destroy();
    if (docRef.current) docRef.current.destroy();
    
    const doc = new Y.Doc();
    docRef.current = doc;
    
    const provider = new WebsocketProvider(WS_URL, id, doc);
    providerRef.current = provider;

    const type = doc.getText('monaco');
    const newBinding = new MonacoBinding(type, editor.getModel(), new Set([editor]), provider.awareness);
    setBinding(newBinding);
  };

  useEffect(() => {
    if (sessionId && editorRef.current) {
      setupCollaboration(editorRef.current, sessionId);
    }
  }, [sessionId]);

  const createSession = async () => {
    const name = prompt('Enter a name for the interview session:', 'New Interview');
    if (!name) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      const newUrl = `${window.location.origin}${window.location.pathname}?session=${data.id}`;
      window.history.pushState({}, '', newUrl);
      setSessionId(data.id);
      setSessionName(data.name);
    } catch (err) {
      alert('Error creating session: ' + err.message);
    }
  };

  const runCode = async () => {
    const code = editorRef.current.getValue();
    setIsRunning(true);
    setOutput('');

    if (language === 'python') {
      if (!pyodide) {
        setOutput('Python environment is still loading or failed to load.\n');
        setIsRunning(false);
        return;
      }
      try {
        await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
        `);
        await pyodide.runPythonAsync(code);
        const stdout = pyodide.runPython("sys.stdout.getvalue()");
        setOutput(stdout || 'Code executed successfully (no output).\n');
      } catch (err) {
        setOutput('Python Error: ' + err.message);
      }
    } else if (language === 'javascript') {
      try {
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.map(a => String(a)).join(' '));
        
        // Use Function constructor for a slightly safer (but still client-side) execution
        new Function(code)();
        
        console.log = originalLog;
        setOutput(logs.join('\n') || 'Code executed successfully (no output).\n');
      } catch (err) {
        setOutput('JavaScript Error: ' + err.message);
      }
    }
    setIsRunning(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <span>⚡</span> CodeInterview
        </div>
        <div className="header-right">
          <select 
            className="btn" 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{ marginRight: '16px' }}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
          {sessionId ? (
            <div className="share-link">
              <span>{sessionName}</span>
              <button className="btn" onClick={copyLink}>Copy Share Link</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={createSession}>Create New Interview</button>
          )}
        </div>
      </header>

      <main className="main-content">
        <section className="editor-pane">
          <div className="pane-header">
            <span>Editor ({language === 'python' ? 'Python' : 'JavaScript'})</span>
            <button 
              className="btn btn-primary" 
              onClick={runCode} 
              disabled={isRunning || (language === 'python' && !pyodide)}
            >
              {isRunning ? <div className="loader"></div> : 'Run Code'}
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={LANGUAGES.find(l => l.value === language).default}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 }
              }}
            />
          </div>
        </section>

        <section className="terminal-pane">
          <div className="pane-header">
            <span>Console Output</span>
          </div>
          <div className="terminal-output">
            {output}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
