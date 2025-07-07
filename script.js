const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('user-input');
const chatBody = document.getElementById('chat-messages');
const fileInput = document.getElementById('file-input');

const API_URL = `https://gemini-api-vercel.vercel.app/api/chat`;

const userData = {
    file: {
        data: null,
        mime_type: null
    }
};

const createMessageElement = (content, ...classes) => {
    const div = document.createElement('div');
    div.classList.add("message", ...classes);
    if (classes.includes('user') && userData.file.data && userData.file.mime_type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = `data:${userData.file.mime_type};base64,${userData.file.data}`;
        img.alt = 'Uploaded image';
        img.style.maxWidth = '120px';
        img.style.display = 'block';
        img.style.marginBottom = '8px';
        div.appendChild(img);
    }
    div.innerHTML += `<div class="message-content">${content}</div>`;
    return div;
};

const generateBotResponse = async (userMessage, loaderDiv) => {
    const parts = [{ text: userMessage }];

    if (userData.file.data) {
        parts.push({
            inline_data: {
                mime_type: userData.file.mime_type,
                data: userData.file.data
            }
        });
    }

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts }]
        })
    };

    try {
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error.message);

        let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I didn't understand that.";
        botReply = botReply
        .replace(/\*\*\*(.*?)\*\*\*/g, "$1") 
        .replace(/\*\*(.*?)\*\*/g, "$1")   
        .replace(/\*(.*?)\*/g, "$1") 
        .replace(/__(.*?)__/g, "$1") 
        .replace(/`(.*?)`/g, "$1") 
        .trim();
        const botMessageDiv = createMessageElement(botReply, "bot");

        loaderDiv.replaceWith(botMessageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;

        // Reset file
        userData.file = { data: null, mime_type: null };
    } catch (error) {
        const errorMessage = createMessageElement("Error: Could not get response.", "bot");
        loaderDiv.replaceWith(errorMessage);
        chatBody.scrollTop = chatBody.scrollHeight;
        console.error(error);
    }
};

const handleOutgoingMessage = (userMessage) => {
    const userMessageDiv = createMessageElement(userMessage, "user");
    chatBody.appendChild(userMessageDiv);

    const loaderHTML = `
      <div class="loader-dots">
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>`;

    const loaderDiv = createMessageElement(loaderHTML, "bot", "thinking");
    chatBody.appendChild(loaderDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    generateBotResponse(userMessage, loaderDiv);
};

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userMessage = messageInput.value.trim();
    if (userMessage) {
        handleOutgoingMessage(userMessage);
        messageInput.value = '';
    }
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64String = e.target.result.split(',')[1];
        userData.file = {
            data: base64String,
            mime_type: file.type
        };

        let fileMessage;
        if (file.type.startsWith('image/')) {
            fileMessage = createMessageElement(`📎 Uploaded file: <i>${file.name}</i>`, "user");
        } else {
            fileMessage = createMessageElement(`📎 Uploaded file: <i>${file.name}</i>`, "user");
        }
        chatBody.appendChild(fileMessage);
        chatBody.scrollTop = chatBody.scrollHeight;

        fileInput.value = '';
    };
    reader.readAsDataURL(file);
});

document.getElementById('upload-btn').addEventListener("click", () => fileInput.click());

const modeToggle = document.getElementById('mode-toggle');
        function setMode(mode) {
            document.body.setAttribute('data-theme', mode);
            modeToggle.textContent = mode === 'dark' ? '☀️' : '🌙';
            localStorage.setItem('chatbot-theme', mode);
        }
        modeToggle.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme') || 'light';
            setMode(current === 'light' ? 'dark' : 'light');
        });
        const saved = localStorage.getItem('chatbot-theme');
        if (saved) setMode(saved);
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setMode('dark');
        else setMode('light');