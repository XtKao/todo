// ==================== VARIABLES ====================
let currentUser = null; 

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

// ฟังก์ชันเช็ค Session (ทำงานเมื่อเปิดเว็บ)
window.checkSession = async function() {
    // รอแป๊บนึงเพื่อให้แน่ใจว่า Firebase module โหลดเสร็จ
    setTimeout(() => {
        const savedUser = localStorage.getItem("session_user");
        if (savedUser && typeof usersDB !== 'undefined') {
            const foundUser = usersDB.find(u => u.username === savedUser);
            if (foundUser) {
                currentUser = foundUser.username;
                loginToWorkspace(foundUser);
            }
        }
    }, 500);
}

// ฟังก์ชันล็อกอิน
window.checkLogin = function() {
    const userIn = usernameInput.value;
    const passIn = passwordInput.value;
    
    if (typeof usersDB === 'undefined') { alert("ไม่พบไฟล์ users.js"); return; }
    
    const foundUser = usersDB.find(u => u.username === userIn && u.password === passIn);
    
    if (foundUser) {
        currentUser = foundUser.username;
        localStorage.setItem("session_user", currentUser); // จำ Session ไว้ในเครื่อง
        alert("ยินดีต้อนรับคุณ " + foundUser.displayName + " !"); 
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
    
    document.getElementById('welcome-message').textContent = `กำลังโหลดข้อมูลจาก Cloud...`;
    
    loadTheme(); // โหลดธีมสี (ใช้ LocalStorage เหมือนเดิม)
    loadDataCloud(); // โหลดข้อมูล Todo/Note จาก Firebase
}

// ออกจากระบบ
window.logout = function() {
    currentUser = null;
    localStorage.removeItem("session_user");
    
    listContainer.innerHTML = ""; 
    noteListContainer.innerHTML = ""; 
    document.getElementById('feedback-btn-container').innerHTML = "";
    
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
window.addTask = async function() {
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
    await saveDataCloud(); // บันทึกขึ้น Cloud ทันที
}

listContainer.addEventListener("click", async function(e) {
    if (e.target.tagName === "LI") { 
        e.target.classList.toggle("checked"); 
        await saveDataCloud(); 
    } 
    else if (e.target.tagName === "SPAN" && e.target.classList.contains("close")) { 
        e.target.parentElement.remove(); 
        await saveDataCloud(); 
    }
}, false);

// ==================== 4. NOTES (CLOUD) ====================
window.addNote = async function() {
    if (noteInputBox.value === '') { alert("กรุณาพิมพ์โน้ต!"); return; }
    
    let li = document.createElement("li"); li.innerHTML = noteInputBox.value;
    let span = document.createElement("span"); span.innerHTML = "\u00d7"; span.className = "close note-close"; li.appendChild(span);
    noteListContainer.appendChild(li);
    
    noteInputBox.value = ""; 
    await saveDataCloud(); // บันทึกพร้อม Todo
}

noteListContainer.addEventListener("click", async function(e) {
    if (e.target.tagName === "SPAN") { 
        e.target.parentElement.remove(); 
        await saveDataCloud(); 
    }
}, false);

// ==================== 5. FIREBASE DATA HANDLER ====================
// บันทึก Todo และ Note ลง Firestore
async function saveDataCloud() {
    if (!currentUser || !window.db) return;
    try {
        const { doc, setDoc } = window.fbase;
        // บันทึกลง Collection "userData", Document ID เป็นชื่อ user (เช่น "12345")
        await setDoc(doc(window.db, "userData", currentUser), {
            todoHtml: listContainer.innerHTML,
            noteHtml: noteListContainer.innerHTML,
            lastUpdate: new Date().toISOString()
        });
        console.log("Saved to Cloud!");
    } catch (e) {
        console.error("Save Error:", e);
    }
}

// โหลดข้อมูล Todo และ Note จาก Firestore
async function loadDataCloud() {
    if (!currentUser || !window.db) return;
    try {
        const foundUser = usersDB.find(u => u.username === currentUser);
        document.getElementById('welcome-message').textContent = `ยินดีต้อนรับคุณ ${foundUser.displayName}`;

        const { doc, getDoc } = window.fbase;
        const docRef = doc(window.db, "userData", currentUser);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            listContainer.innerHTML = data.todoHtml || "";
            noteListContainer.innerHTML = data.noteHtml || "";
        } else {
            // User ใหม่ ยังไม่มีข้อมูล
            listContainer.innerHTML = "";
            noteListContainer.innerHTML = "";
        }
        
        // เช็ค Feedback ต่อ
        renderFeedbackButton();
        checkForAdminNotifications();
    } catch (e) {
        console.error("Load Error:", e);
        document.getElementById('welcome-message').textContent = "โหลดข้อมูลไม่สำเร็จ (เช็คเน็ต)";
    }
}

// ==================== 6. ADMIN & FEEDBACK (REALTIME-ISH) ====================
function isAdmin() { const foundUser = usersDB.find(u => u.username === currentUser); return foundUser && foundUser.isAdmin === true; }

// นับ Feedback ที่ยังไม่ได้อ่านจาก Cloud
async function getUnreadFeedbackCount() {
    if(!window.db) return 0;
    try {
        const { collection, getDocs } = window.fbase;
        // ดึงมาทั้งหมดแล้วนับ (สำหรับโปรเจกต์ขนาดเล็ก)
        const querySnapshot = await getDocs(collection(window.db, "feedbacks"));
        let count = 0;
        querySnapshot.forEach((doc) => {
            if (!doc.data().read) count++;
        });
        return count;
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

// ส่ง Feedback ขึ้น Cloud
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

// แจ้งเตือนแอดมิน
async function checkForAdminNotifications() {
    if (isAdmin()) { 
        const unreadCount = await getUnreadFeedbackCount();
        // แจ้งเตือนแค่ครั้งเดียวต่อการเปิดหน้าเว็บ
        if (unreadCount > 0 && !sessionStorage.getItem("notified")) {
            alert(`มี Feedback ใหม่ ${unreadCount} ข้อความ!`);
            sessionStorage.setItem("notified", "true");
        }
    }
}

// แสดงรายการ Feedback (Admin)
async function displayFeedbackHistoryCloud() {
    feedbackList.innerHTML = "<p style='text-align:center;'>กำลังโหลดข้อมูล...</p>";
    
    try {
        const { collection, getDocs, updateDoc, doc } = window.fbase;
        const querySnapshot = await getDocs(collection(window.db, "feedbacks"));
        
        let feedbacks = [];
        querySnapshot.forEach((doc) => {
            feedbacks.push({ id: doc.id, ...doc.data() });
        });

        // เรียงจากใหม่ไปเก่า
        feedbacks.sort((a, b) => (a.createdAt < b.createdAt) ? 1 : -1);

        let historyHtml = '';
        for (let f of feedbacks) {
            let statusClass = f.read ? 'read' : 'unread'; 
            let statusText = f.read ? 'อ่านแล้ว' : 'ใหม่';
            
            historyHtml += `<div class="feedback-item ${statusClass}"><span class="feedback-status-badge">${statusText}</span><p><strong>จาก:</strong> ${f.user} (${f.timestamp})</p><p class="feedback-message">${f.message}</p></div>`;
            
            // ถ้าเป็นข้อความใหม่ ให้แก้สถานะเป็น "อ่านแล้ว" บน Cloud ทันที
            if (!f.read) {
                const fRef = doc(window.db, "feedbacks", f.id);
                await updateDoc(fRef, { read: true });
            }
        }
        
        feedbackList.innerHTML = historyHtml === '' ? '<p style="text-align: center;">ไม่มี Feedback</p>' : historyHtml;
        
        renderFeedbackButton(); // อัปเดตตัวเลขแจ้งเตือน

    } catch(e) {
        console.error(e);
        feedbackList.innerHTML = "<p style='color:red; text-align:center;'>โหลดข้อมูลผิดพลาด</p>";
    }
}

// Event Listeners สำหรับปุ่ม Enter
passwordInput.addEventListener("keypress", function(event) { if (event.key === "Enter") checkLogin(); });
inputBox.addEventListener("keypress", function(event) { if (event.key === "Enter") addTask(); });
noteInputBox.addEventListener("keypress", function(event) { if (event.key === "Enter") addNote(); });

// เริ่มต้น: เช็ค Session ทันทีที่โหลด
window.checkSession();
