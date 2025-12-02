// ==================== VARIABLES ====================
let currentUser = null; 
let saveTimeout = null; // ตัวแปรสำหรับระบบ Debounce

// อ้างอิง Element
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

// ==================== 1. SESSION & LOGIN SYSTEM ====================

// ฟังก์ชันเช็ค Session (ทำงานทันที ไม่ต้องรอ 500ms)
window.checkSession = async function() {
    const savedUser = localStorage.getItem("session_user");
    // ตรวจสอบว่ามี usersDB หรือไม่ (ถ้าโหลด script users.js มาแล้ว)
    if (savedUser && typeof usersDB !== 'undefined') {
        const foundUser = usersDB.find(u => u.username === savedUser);
        if (foundUser) {
            currentUser = foundUser.username;
            loginToWorkspace(foundUser);
        } else {
            // ถ้า User ใน session ไม่ตรงกับ database ให้เคลียร์ทิ้ง
            localStorage.removeItem("session_user");
        }
    }
}

// ฟังก์ชันล็อกอิน
window.checkLogin = function() {
    const userIn = usernameInput.value;
    const passIn = passwordInput.value;
    
    if (typeof usersDB === 'undefined') { alert("กำลังโหลดข้อมูลผู้ใช้... กรุณารอสักครู่"); return; }
    
    const foundUser = usersDB.find(u => u.username === userIn && u.password === passIn);
    
    if (foundUser) {
        currentUser = foundUser.username;
        localStorage.setItem("session_user", currentUser); 
        // alert ตัดออกเพื่อให้เข้าไวขึ้น หรือจะเก็บไว้ก็ได้
        // alert("ยินดีต้อนรับคุณ " + foundUser.displayName + " !"); 
        loginToWorkspace(foundUser);
    } else { 
        alert("รหัสผิดครับ!"); 
    }
}

// เข้าสู่หน้า Workspace
function loginToWorkspace(userObj) {
    loginPage.style.display = "none"; 
    todoPage.style.display = "block"; 
    logoutBtn.style.display = "flex"; 
    
    document.getElementById('welcome-message').textContent = `ยินดีต้อนรับคุณ ${userObj.displayName}`;
    
    loadTheme(); 
    loadDataCloud(); 
}

// ออกจากระบบ
window.logout = function() {
    currentUser = null;
    localStorage.removeItem("session_user");
    
    listContainer.innerHTML = ""; 
    noteListContainer.innerHTML = ""; 
    feedbackBtnContainer.innerHTML = "";
    
    todoPage.style.display = "none"; 
    logoutBtn.style.display = "none";
    loginPage.style.display = "block";
    
    usernameInput.value = ""; passwordInput.value = "";
}

// ==================== 2. THEME SYSTEM ====================
window.toggleTheme = function() {
    document.body.classList.toggle("dark-mode");
    const btn = document.getElementById("theme-toggle-btn");
    
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        btn.innerHTML = "🖊️"; 
    } else {
        localStorage.setItem("theme", "light");
        btn.innerHTML = "🖋️"; 
    }
}

function loadTheme() {
    const btn = document.getElementById("theme-toggle-btn");
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        btn.innerHTML = "🖊️";
    } else {
        document.body.classList.remove("dark-mode");
        btn.innerHTML = "🖋️";
    }
}

// ==================== 3. TO-DO LIST (CLOUD) ====================
window.addTask = function() {
    if (inputBox.value === '') { alert("กรุณาพิมพ์ข้อความ!"); return; }
    
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
    let span = document.createElement("span"); span.innerHTML = "\u00d7"; span.className = "close"; li.appendChild(span);
    listContainer.appendChild(li);

    inputBox.value = ""; dateBox.value = ""; 
    saveDataCloudDebounced(); // ใช้การบันทึกแบบหน่วงเวลา
}

listContainer.addEventListener("click", function(e) {
    if (e.target.tagName === "LI") { 
        e.target.classList.toggle("checked"); 
        saveDataCloudDebounced(); 
    } 
    else if (e.target.tagName === "SPAN" && e.target.classList.contains("close")) { 
        e.target.parentElement.remove(); 
        saveDataCloudDebounced(); 
    }
}, false);

// ==================== 4. NOTES (CLOUD) ====================
window.addNote = function() {
    if (noteInputBox.value === '') { alert("กรุณาพิมพ์โน้ต!"); return; }
    
    let li = document.createElement("li"); li.innerHTML = noteInputBox.value;
    let span = document.createElement("span"); span.innerHTML = "\u00d7"; span.className = "close note-close"; li.appendChild(span);
    noteListContainer.appendChild(li);
    
    noteInputBox.value = ""; 
    saveDataCloudDebounced(); 
}

noteListContainer.addEventListener("click", function(e) {
    if (e.target.tagName === "SPAN") { 
        e.target.parentElement.remove(); 
        saveDataCloudDebounced(); 
    }
}, false);

// ==================== 5. FIREBASE DATA HANDLER (OPTIMIZED) ====================

// Debounce Function: รอให้ผู้ใช้หยุดทำกิจกรรม 1.5 วินาที แล้วค่อยส่งข้อมูลทีเดียว
// ช่วยลดการใช้งาน Read/Write ของ Firebase และทำให้เว็บไม่กระตุก
function saveDataCloudDebounced() {
    clearTimeout(saveTimeout);
    const statusSpan = document.getElementById('save-status');
    if(statusSpan) statusSpan.style.opacity = '1'; // แสดงสถานะว่า "กำลังรอ..."

    saveTimeout = setTimeout(async () => {
        await saveDataCloud();
        if(statusSpan) statusSpan.style.opacity = '0'; // ซ่อนสถานะเมื่อเสร็จ
    }, 1500);
}

async function saveDataCloud() {
    if (!currentUser || !window.db) return;
    try {
        const { doc, setDoc } = window.fbase;
        await setDoc(doc(window.db, "userData", currentUser), {
            todoHtml: listContainer.innerHTML,
            noteHtml: noteListContainer.innerHTML,
            lastUpdate: new Date().toISOString()
        });
        console.log("Auto-saved to Cloud!");
    } catch (e) {
        console.error("Save Error:", e);
    }
}

async function loadDataCloud() {
    if (!currentUser || !window.db) return;
    try {
        const { doc, getDoc } = window.fbase;
        const docRef = doc(window.db, "userData", currentUser);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            listContainer.innerHTML = data.todoHtml || "";
            noteListContainer.innerHTML = data.noteHtml || "";
        }
        
        renderFeedbackButton();
        checkForAdminNotifications();
    } catch (e) {
        console.error("Load Error:", e);
        document.getElementById('welcome-message').textContent = "โหลดข้อมูลไม่สำเร็จ (เช็คเน็ต)";
    }
}

// ==================== 6. ADMIN & FEEDBACK ====================
function isAdmin() { const foundUser = usersDB.find(u => u.username === currentUser); return foundUser && foundUser.isAdmin === true; }

async function getUnreadFeedbackCount() {
    if(!window.db) return 0;
    try {
        const { collection, getDocs, query, where } = window.fbase;
        // ใช้ Query แบบ where เพื่อดึงเฉพาะอันที่ยังไม่อ่าน (เร็วกว่าดึงทั้งหมด)
        const q = query(collection(window.db, "feedbacks"), where("read", "==", false));
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch(e) { return 0; }
}

async function renderFeedbackButton() {
    feedbackBtnContainer.innerHTML = ''; 
    if (isAdmin()) { 
        const unreadCount = await getUnreadFeedbackCount();
        const adminBtnHtml = `<button id="view-feedback-btn" onclick="openAdminHistoryModal()">ดู Feedback <span id="feedback-count-badge">${unreadCount}</span></button>`;
        feedbackBtnContainer.innerHTML = adminBtnHtml;
        if (unreadCount === 0) document.getElementById('feedback-count-badge').style.display = 'none';
    } else {
        const userBtnHtml = `<button id="feedback-btn" onclick="openUserFeedbackModal()">ส่ง Feedback</button>`;
        feedbackBtnContainer.innerHTML = userBtnHtml;
    }
}

window.openUserFeedbackModal = function() { feedbackModal.style.display = "block"; userFeedbackForm.style.display = "block"; adminFeedbackHistory.style.display = "none"; feedbackText.value = ""; }
window.openAdminHistoryModal = function() { feedbackModal.style.display = "block"; userFeedbackForm.style.display = "none"; adminFeedbackHistory.style.display = "block"; displayFeedbackHistoryCloud(); }
window.closeFeedbackModal = function() { feedbackModal.style.display = "none"; }

window.submitFeedback = async function() {
    const feedbackMsg = feedbackText.value.trim();
    if (feedbackMsg === '') { alert("กรุณาพิมพ์ข้อเสนอแนะ!"); return; }
    
    try {
        const { collection, addDoc } = window.fbase;
        await addDoc(collection(window.db, "feedbacks"), {
            user: currentUser,
            message: feedbackMsg,
            timestamp: new Date().toLocaleString('th-TH'),
            read: false,
            createdAt: new Date().toISOString()
        });
        alert("ส่งข้อเสนอแนะเรียบร้อยครับ!");
        closeFeedbackModal();
    } catch (e) {
        console.error(e);
        alert("ส่งไม่สำเร็จ! กรุณาเช็คอินเทอร์เน็ต");
    }
}

async function checkForAdminNotifications() {
    if (isAdmin()) { 
        const unreadCount = await getUnreadFeedbackCount();
        if (unreadCount > 0 && !sessionStorage.getItem("notified")) {
            // ใช้ Toast notification เล็กๆ แทน alert เพื่อไม่ให้ขัดจังหวะการใช้งาน
            console.log(`มี Feedback ใหม่ ${unreadCount} ข้อความ!`);
            sessionStorage.setItem("notified", "true");
        }
    }
}

async function displayFeedbackHistoryCloud() {
    feedbackList.innerHTML = "<p style='text-align:center;'>กำลังโหลดข้อมูล...</p>";
    try {
        const { collection, getDocs, updateDoc, doc, orderBy, query } = window.fbase;
        // ใช้ orderBy จาก Server เลย เร็วกว่ามา sort เอง
        const q = query(collection(window.db, "feedbacks"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        let historyHtml = '';
        querySnapshot.forEach((docSnap) => {
            let f = docSnap.data();
            let statusClass = f.read ? 'read' : 'unread'; 
            let statusText = f.read ? 'อ่านแล้ว' : 'ใหม่';
            historyHtml += `<div class="feedback-item ${statusClass}"><span class="feedback-status-badge">${statusText}</span><p><strong>จาก:</strong> ${f.user} (${f.timestamp})</p><p class="feedback-message">${f.message}</p></div>`;
            
            if (!f.read) {
                const fRef = doc(window.db, "feedbacks", docSnap.id);
                updateDoc(fRef, { read: true }); // ไม่ต้อง await เพื่อให้ UI แสดงผลเลยไม่ต้องรอ
            }
        });
        
        feedbackList.innerHTML = historyHtml === '' ? '<p style="text-align: center;">ไม่มี Feedback</p>' : historyHtml;
        renderFeedbackButton(); 
    } catch(e) {
        console.error(e);
        feedbackList.innerHTML = "<p style='color:red; text-align:center;'>โหลดข้อมูลผิดพลาด</p>";
    }
}

passwordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") checkLogin(); });
inputBox.addEventListener("keypress", function(event) { if (event.key === "Enter") addTask(); });
noteInputBox.addEventListener("keypress", function(event) { if (event.key === "Enter") addNote(); });

// เริ่มต้น: เช็ค Session 
window.checkSession();
