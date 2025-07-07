const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('user-input');
const chatBody = document.getElementById('chat-messages');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const modeToggle = document.getElementById('mode-toggle');
const newChatBtn = document.getElementById('new-chat-btn');
const BOT_NAME = 'LOGESH';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyAFqKTZgOinSBTjK8xyeFWxjEerecwGYZw`;
const userData = { file: { data: null, mime_type: null, name: null } };

function isNameQuestion(text) {
    return /\b(what('?s| is) your name\??|your name\??|name please\??|who are you\??|tell your name\??|name\??)\b/i.test(text.trim());
}
function truncateFileName(name, maxLength = 16) {
    if (!name || name.length <= maxLength) return name;
    return name.slice(0, 8) + '...' + name.slice(-4);
}
function saveChat() {
    localStorage.setItem('chat-messages', chatBody.innerHTML);
}
function restoreChat() {
    const saved = localStorage.getItem('chat-messages');
    if (saved) chatBody.innerHTML = saved;
}
function createMessageElement(content, ...classes) {
    const div = document.createElement('div');
    div.classList.add('message', ...classes);
    if (classes.includes('user') && userData.file.data) {
        if (userData.file.mime_type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = `data:${userData.file.mime_type};base64,${userData.file.data}`;
            img.alt = 'Uploaded image';
            img.style.maxWidth = '120px';
            img.style.display = 'block';
            img.style.marginBottom = '8px';
            div.appendChild(img);
        } else {
            const fileNameDiv = document.createElement('div');
            fileNameDiv.className = 'file-name';
            fileNameDiv.textContent = '📎 ' + truncateFileName(userData.file.name || 'Attached file');
            fileNameDiv.style.fontSize = '0.95em';
            fileNameDiv.style.marginBottom = '6px';
            div.appendChild(fileNameDiv);
        }
    } else if (classes.includes('user') && content.startsWith('[FILE]')) {
        const match = content.match(/^\[FILE\] ([^\n]+)\n/);
        if (match) {
            const fileNameDiv = document.createElement('div');
            fileNameDiv.className = 'file-name';
            fileNameDiv.textContent = '📎 ' + truncateFileName(match[1]);
            fileNameDiv.style.fontSize = '0.95em';
            fileNameDiv.style.marginBottom = '6px';
            div.appendChild(fileNameDiv);
            content = content.replace(/^\[FILE\] ([^\n]+)\n/, '');
        }
    }
    if (classes.includes('user') && content.startsWith('[FILE]')) {
        content = content.replace(/^\[FILE\] ([^\n]+)\n?/, '');
    }
    div.innerHTML += `<div class="message-content">${content.replace(/\n/g, '<br>')}</div>`;
    return div;
}
function showFilePreview(file) {
    filePreview.innerHTML = '';
    filePreview.style.display = 'block';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.title = 'Remove file';
    removeBtn.style.marginLeft = '8px';
    removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = () => {
        fileInput.value = '';
        filePreview.innerHTML = '';
        filePreview.style.display = 'none';
        userData.file = { data: null, mime_type: null, name: null };
    };
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            img.style.maxWidth = '80px';
            img.style.maxHeight = '60px';
            img.style.verticalAlign = 'middle';
            img.style.marginRight = '8px';
            filePreview.appendChild(img);
            filePreview.appendChild(removeBtn);
            userData.file = {
                data: e.target.result.split(',')[1],
                mime_type: file.type,
                name: file.name
            };
        };
        reader.readAsDataURL(file);
    } else {
        filePreview.appendChild(document.createTextNode(truncateFileName(file.name)));
        filePreview.appendChild(removeBtn);
        const reader = new FileReader();
        reader.onload = e => {
            userData.file = {
                data: e.target.result.split(',')[1],
                mime_type: file.type,
                name: file.name
            };
        };
        reader.readAsDataURL(file);
    }
}
async function generateBotResponse(userMessage, loaderDiv) {
    const parts = [{ text: userMessage }];
    if (userData.file.data) {
        parts.push({ inline_data: { mime_type: userData.file.mime_type, data: userData.file.data } });
    }
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);
        let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I didn't understand that.";
        botReply = botReply.replace(/\*\*\*(.*?)\*\*\*/g, "$1")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1")
            .replace(/__(.*?)__/g, "$1")
            .replace(/`(.*?)`/g, "$1").trim();
        loaderDiv.replaceWith(createMessageElement(botReply, 'bot'));
        chatBody.scrollTop = chatBody.scrollHeight;
        userData.file = { data: null, mime_type: null, name: null };
    } catch (error) {
        loaderDiv.replaceWith(createMessageElement('Error: Could not get response.', 'bot'));
        chatBody.scrollTop = chatBody.scrollHeight;
        console.error(error);
    }
}
function handleOutgoingMessage(userMessage) {
    let messageToSend = userMessage;
    if (userData.file.data && !userData.file.mime_type.startsWith('image/')) {
        messageToSend = `[FILE] ${userData.file.name}\n` + userMessage;
    }
    chatBody.appendChild(createMessageElement(messageToSend, 'user'));
    if (isNameQuestion(userMessage)) {
        chatBody.appendChild(createMessageElement(`My name is ${BOT_NAME}.`, 'bot'));
        chatBody.scrollTop = chatBody.scrollHeight;
        return;
    }
    const loaderHTML = `<div class="loader-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    const loaderDiv = createMessageElement(loaderHTML, 'bot', 'thinking');
    chatBody.appendChild(loaderDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    generateBotResponse(userMessage, loaderDiv);
}
chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;
    handleOutgoingMessage(userMessage);
    messageInput.value = '';
    messageInput.style.height = '24px';
    messageInput.style.overflowY = 'hidden';
    filePreview.innerHTML = '';
    filePreview.style.display = 'none';
});
messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
});
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    const maxRows = 3, lineHeight = 24;
    const lines = this.value.split('\n').length;
    const scrollHeight = this.scrollHeight;
    if (lines <= maxRows && scrollHeight <= maxRows * lineHeight + 8) {
        this.style.overflowY = 'hidden';
        this.style.height = scrollHeight + 'px';
    } else {
        this.style.overflowY = 'auto';
        this.style.height = (maxRows * lineHeight) + 'px';
    }
});
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) showFilePreview(file);
});
document.getElementById('upload-btn').addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
});
function setMode(mode) {
    document.body.setAttribute('data-theme', mode);
    modeToggle.textContent = mode === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('chatbot-theme', mode);
}
modeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme') || 'light';
    setMode(current === 'light' ? 'dark' : 'light');
});
const savedTheme = localStorage.getItem('chatbot-theme');
if (savedTheme) setMode(savedTheme);
else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setMode('dark');
else setMode('light');
restoreChat();
const observer = new MutationObserver(saveChat);
observer.observe(chatBody, { childList: true, subtree: true });
if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        chatBody.innerHTML = `<div class="message bot-message thinking"><div class="message-text">Hi, how can i help you?</div></div>`;
        localStorage.removeItem('chat-messages');
    });
}