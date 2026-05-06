import { useEffect, useState } from "react";
import "./App.css";

const API =
  import.meta?.env?.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://neurnexus-backend-8.onrender.com";
export default function App() {
  const [token, setToken] = useState(null);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);

  const [loading, setLoading] = useState(false);

  // ================= INIT =================
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      loadChats(t);
    }
  }, []);

  // ================= AUTH =================
  const signup = async () => {
    setAuthError("");
    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Signup failed");
        return;
      }

      setMode("login");
      setAuthError("Account created! Please login.");
    } catch {
      setAuthError("Network error");
    }
  };

  const login = async () => {
    setAuthError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      loadChats(data.token);
    } catch {
      setAuthError("Network error");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setChats([]);
    setMessages([]);
    setChatId(null);
  };

  // ================= CHATS =================
  const loadChats = async (t) => {
    const useToken = t || token;
    if (!useToken) return;

    try {
      const res = await fetch(`${API}/chats`, {
        headers: {
          Authorization: `Bearer ${useToken}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Chat load error:", err);
    }
  };

  const openChat = (c) => {
    setChatId(c._id);
    setMessages(Array.isArray(c.messages) ? c.messages : []);
  };

  const newChat = () => {
    setMessages([]);
    setChatId(null);
  };

  const deleteChat = async (id) => {
    try {
      await fetch(`${API}/chat/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (chatId === id) {
        setChatId(null);
        setMessages([]);
      }

      loadChats(token);
    } catch (err) {
      console.log(err);
    }
  };

  // ================= CHAT =================
  const sendMessage = async () => {
    if (!input.trim() || loading || !token) return;

    const userMsg = input;
    setInput("");
    setLoading(true);

    // ONLY push user message
    setMessages((prev) => [
      ...prev,
      { text: userMsg, sender: "user" },
    ]);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMsg, chatId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Chat failed");

      if (data.chatId && !chatId) {
        setChatId(data.chatId);
      }

      setMessages((prev) => [
        ...prev,
        {
          text: data.reply || "⚠️ No response from AI",
          sender: "ai",
        },
      ]);

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          text: "⚠️ Server error / waking up... try again",
          sender: "ai",
        },
      ]);
    } finally {
      setLoading(false);
      loadChats(token);
    }
  };

  // ================= LOGIN UI =================
  if (!token) {
    return (
      <div className="auth">
        <div className="authBox">
          <h1>🧠 NeuroNexus AI</h1>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authError && <p style={{ color: "salmon" }}>{authError}</p>}

          {mode === "login" ? (
            <>
              <button onClick={login}>Login</button>
              <p onClick={() => { setMode("signup"); setAuthError(""); }}>
                Create account
              </p>
            </>
          ) : (
            <>
              <button onClick={signup}>Signup</button>
              <p onClick={() => { setMode("login"); setAuthError(""); }}>
                Back to login
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ================= MAIN UI =================
  return (
    <div className="app">

      <div className="sidebar">
        <button className="newChat" onClick={newChat}>
          + New Chat
        </button>

        <div className="chatList">
          {chats.map((c) => (
            <div key={c._id} className="chatItem">
              <span onClick={() => openChat(c)}>
                {c.title || "Untitled"}
              </span>
              <button onClick={() => deleteChat(c._id)}>🗑</button>
            </div>
          ))}
        </div>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="chatArea">

        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.sender}`}>
              {m.text}
            </div>
          ))}

          {loading && (
            <div className="typing">
              Thinking...
            </div>
          )}
        </div>

        <div className="inputBox">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message NeuroNexus..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading}>
            Send
          </button>
        </div>

      </div>
    </div>
  );
}