// ******************************************************
// 📱 اپلیکیشن اصلی (js/app.js)
// وظیفه: مدیریت لیست درس‌ها، تب‌ها و رابط کاربری
// ******************************************************

// 📋 لیست درس‌ها (لینک‌های خود را اینجا قرار دهید)
const PLAYLIST = [
    { id: 1, title: "درس اول: تماشاخانه", url: "https://dl.bedoone.com/motalebi/p/farsi-5/1.mp4", time: "10:00" },
    { id: 2, title: "درس دوم: کوچ پرستوها", url: "https://dl.bedoone.com/motalebi/p/farsi-5/2.mp4", time: "12:30" },
    { id: 3, title: "درس سوم: راز زندگی", url: "https://dl.bedoone.com/motalebi/p/farsi-5/3.mp4", time: "08:45" },
    // درس‌های بعدی را همین شکلی اضافه کنید...
];

const App = {
    start: function() {
        console.log("🚀 App Started");
        this.renderList();
        this.setupTabs();
        this.updateHeader();
    },

    // ساختن لیست درس‌ها در صفحه
    renderList: function() {
        const container = document.getElementById('playlist-container');
        if(!container) return;
        
        container.innerHTML = ''; // پاک کردن لیست قبلی

        PLAYLIST.forEach(lesson => {
            // بررسی وضعیت پاس شدن درس از سیستم RankSystem
            const lid = lesson.id.toString();
            const isDone = RankSystem.data.completed.includes(lid);
            
            // تعیین استایل کارت (سبز یا عادی)
            const statusClass = isDone ? "lesson-card done" : "lesson-card";
            const icon = isDone ? "✅" : "🎥";
            const statusText = isDone ? "تکمیل شده" : "مشاهده درس";

            // ساخت HTML کارت
            const div = document.createElement('div');
            div.className = statusClass;
            div.onclick = () => {
                PlayerManager.open(lesson);
            };

            div.innerHTML = `
                <div class="card-icon">${icon}</div>
                <div class="card-info">
                    <h3>${toPersianNum(lesson.id)}. ${lesson.title}</h3>
                    <span>${toPersianNum(lesson.time)} دقیقه</span>
                </div>
                <div class="card-status">${statusText}</div>
            `;
            
            container.appendChild(div);
        });
    },

    // آپدیت کردن هدر (نام و امتیاز بالای صفحه)
    updateHeader: function() {
        if(AuthManager.user) {
            document.getElementById('headerUser').innerText = AuthManager.user;
            // مقادیر XP و لول توسط RankSystem آپدیت می‌شوند
            RankSystem.updateStats();
        }
    },

    // مدیریت تب‌ها (درس‌ها / رنکینگ)
    setupTabs: function() {
        const tabs = document.querySelectorAll('.nav-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 1. برداشتن کلاس active از همه
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                
                // 2. دادن کلاس active به دکمه کلیک شده
                e.currentTarget.classList.add('active');
                
                // 3. نمایش تب مربوطه
                const targetId = e.currentTarget.getAttribute('data-target');
                document.getElementById(targetId).classList.add('active');
            });
        });
    }
};

console.log("✅ App Logic Loaded");