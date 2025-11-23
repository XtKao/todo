let currentUser = null; 
const loginPage = document.getElementById("login-page");
const todoPage = document.getElementById("todo-page");
const logoutBtn = document.getElementById("logout-btn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const inputBox = document.getElementById("input-box");
const dateBox = document.getElementById("date-box");
const listContainer = document.getElementById("list-container");
const noteInputBox = document.getElementById("note-input-box");
const noteListContainer = document.getElementById("note-list-container");
const feedbackModal = document.getElementById("feedback-modal");
const feedbackText = document.getElementById("feedback-text");
const feedbackBtnContainer = document.getElementById('feedback-btn-container');
const userFeedbackForm = document.getElementById("user-feedback-form");
const adminFeedbackHistory = document.getElementById("admin-feedback-history");
const feedbackList = document.getElementById("feedback-list");

function checkLogin() {
    const userIn = usernameInput.value;
    const passIn = passwordInput.value;
    if (typeof usersDB === 'undefined') { alert("ไม่พบไฟล์ users.js"); return; }
    const foundUser = usersDB.find(u => u.username === userIn && u.password === passIn);
    if (foundUser) {
        currentUser = foundUser.username;
        alert("ยินดีต้อนรับคุณ " + foundUser.displayName + " !"); 
        loginPage.style.display = "none"; 
        todoPage.style.display = "block"; 
        logoutBtn.style.display = "flex"; 
        loadData(); 
        loadTheme(); 
        checkForAdminNotifications(); 
    } else { alert("รหัสผิดครับ!"); }
}

function logout() {
    currentUser = null;
    listContainer.innerHTML = ""; noteListContainer.innerHTML = ""; 
    document.getElementById('feedback-btn-container').innerHTML = "";
    todoPage.style.display = "none"; 
    logoutBtn.style.display = "none";
    loginPage.style.display = "block";
    usernameInput.value = ""; passwordInput.value = "";
}

// ==================== THEME TOGGLE (EMOJI) ====================
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const btn = document.getElementById("theme-toggle-btn");
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        btn.innerHTML = "🖊️"; // Dark Mode ให้โชว์ปากกา 1
    } else {
        localStorage.setItem("theme", "light");
        btn.innerHTML = "🖋️"; // Light Mode ให้โชว์ปากกา 2
    }
}

function loadTheme() {
    const btn = document.getElementById("theme-toggle-btn");
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        btn.innerHTML = "🖊️";
    } else {
        btn.innerHTML = "🖋️";
    }
}
// =============================================================

function addTask() {
    if (inputBox.value === '') { alert("กรุณาพิมพ์ข้อความก่อนกดเพิ่ม!"); } else {
        let li = document.createElement("li");
        let textNode = document.createTextNode(inputBox.value);
        li.appendChild(textNode);
        if (dateBox.value) {
            let dateObj = new Date(dateBox.value);
            let options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            let dateSpan = document.createElement("span");
            dateSpan.className = "task-date";
            dateSpan.innerHTML = `🕒 ${dateObj.toLocaleDateString('th-TH', options)}`;
            li.appendChild(dateSpan);
        }
        listContainer.appendChild(li);
        let span = document.createElement("span"); span.innerHTML = "\u00d7"; span.className = "close"; li.appendChild(span);
    }
    inputBox.value = ""; dateBox.value = ""; saveData(); 
}

listContainer.addEventListener("click", function(e) {
    if (e.target.tagName === "LI") { e.target.classList.toggle("checked"); saveData(); } 
    else if (e.target.tagName === "SPAN" && e.target.classList.contains("close")) { e.target.parentElement.remove(); saveData(); }
}, false);

function addNote() {
    if (noteInputBox.value === '') { alert("กรุณาพิมพ์โน้ตก่อนกดเพิ่ม!"); } else {
        let li = document.createElement("li"); li.innerHTML = noteInputBox.value;
        noteListContainer.appendChild(li);
        let span = document.createElement("span"); span.innerHTML = "\u00d7"; span.className = "close note-close"; li.appendChild(span);
    }
    noteInputBox.value = ""; saveNotes(); 
}

noteListContainer.addEventListener("click", function(e) {
    if (e.target.tagName === "SPAN") { e.target.parentElement.remove(); saveNotes(); }
}, false);

function saveData() { if (currentUser) localStorage.setItem("todo_" + currentUser, listContainer.innerHTML); }
function saveNotes() { if (currentUser) localStorage.setItem("notes_" + currentUser, noteListContainer.innerHTML); }

function loadData() { 
    if (currentUser) {
        const foundUser = usersDB.find(u => u.username === currentUser);
        document.getElementById('welcome-message').textContent = `ยินดีต้อนรับคุณ ${foundUser.displayName}`;
        listContainer.innerHTML = localStorage.getItem("todo_" + currentUser) || "";
        noteListContainer.innerHTML = localStorage.getItem("notes_" + currentUser) || "";
        renderFeedbackButton();
    }
}

function isAdmin() { const foundUser = usersDB.find(u => u.username === currentUser); return foundUser && foundUser.isAdmin === true; }
function getFeedbackCount() { const feedbacks = JSON.parse(localStorage.getItem('feedback_messages')) || []; return feedbacks.filter(f => f.read === false).length; }

function renderFeedbackButton() {
    feedbackBtnContainer.innerHTML = ''; 
    const unreadCount = getFeedbackCount();
    if (isAdmin()) { 
        const adminBtnHtml = `<button id="view-feedback-btn" onclick="openAdminHistoryModal()">ดู Feedback <span id="feedback-count-badge">${unreadCount}</span></button>`;
        feedbackBtnContainer.innerHTML = adminBtnHtml;
        if (unreadCount === 0) document.getElementById('feedback-count-badge').style.display = 'none';
    } else {
        const userBtnHtml = `<button id="feedback-btn" onclick="openUserFeedbackModal()">ส่ง Feedback</button>`;
        feedbackBtnContainer.innerHTML = userBtnHtml;
    }
}

function openUserFeedbackModal() { feedbackModal.style.display = "block"; userFeedbackForm.style.display = "block"; adminFeedbackHistory.style.display = "none"; feedbackText.value = ""; }
function openAdminHistoryModal() { feedbackModal.style.display = "block"; userFeedbackForm.style.display = "none"; adminFeedbackHistory.style.display = "block"; displayFeedbackHistory(); }
function closeFeedbackModal() { feedbackModal.style.display = "none"; }

function submitFeedback() {
    const feedbackMsg = feedbackText.value.trim();
    if (feedbackMsg === '') { alert("กรุณาพิมพ์ข้อเสนอแนะก่อนส่ง!"); return; }
    let allFeedback = JSON.parse(localStorage.getItem('feedback_messages')) || [];
    const newFeedback = { user: currentUser, timestamp: new Date().toLocaleString('th-TH'), message: feedbackMsg, read: false };
    allFeedback.push(newFeedback);
    localStorage.setItem('feedback_messages', JSON.stringify(allFeedback));
    alert("ส่งข้อเสนอแนะสำเร็จ!"); closeFeedbackModal();
}

function checkForAdminNotifications() {
    if (isAdmin()) { 
        const unreadCount = getFeedbackCount();
        if (unreadCount > 0) alert(`คุณมี Feedback ใหม่ที่ยังไม่ได้อ่าน ${unreadCount} ข้อความ!`);
    }
}

function displayFeedbackHistory() {
    let allFeedback = JSON.parse(localStorage.getItem('feedback_messages')) || [];
    let historyHtml = ''; let updatedFeedback = [];
    allFeedback.slice().reverse().forEach(f => {
        let statusClass = f.read ? 'read' : 'unread'; let statusText = f.read ? 'อ่านแล้ว' : 'ใหม่';
        historyHtml += `<div class="feedback-item ${statusClass}"><span class="feedback-status-badge">${statusText}</span><p><strong>จาก:</strong> ${f.user} (${f.timestamp})</p><p class="feedback-message">${f.message}</p></div>`;
        f.read = true; updatedFeedback.push(f);
    });
    feedbackList.innerHTML = historyHtml === '' ? '<p style="text-align: center; color: #9ca3af;">ไม่มี Feedback ในระบบ</p>' : historyHtml;
    localStorage.setItem('feedback_messages', JSON.stringify(updatedFeedback.reverse())); 
    renderFeedbackButton(); 
}

passwordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") checkLogin(); });
inputBox.addEventListener("keypress", function(event) { if (event.key === "Enter") addTask(); });
noteInputBox.addEventListener("keypress", function(event) { if (event.key === "Enter") addNote(); });
