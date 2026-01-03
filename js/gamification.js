// ******************************************************
// 🎮 مدیر بازی‌سازی و امتیازات (js/gamification.js)
// وظیفه: محاسبه لول، مدیریت مقام‌ها و نمایش پیشرفت
// ******************************************************

const RANKS = [
    { min: 0, title: "سرباز صفر", color: "#7f8c8d" },
    { min: 500, title: "سرباز یکم", color: "#95a5a6" },
    { min: 1200, title: "سرجوخه", color: "#34495e" },
    { min: 2500, title: "گروهبان سوم", color: "#27ae60" },
    { min: 4500, title: "گروهبان دوم", color: "#2ecc71" },
    { min: 7000, title: "گروهبان یکم", color: "#16a085" },
    { min: 10000, title: "استوار دوم", color: "#f1c40f" },
    { min: 14000, title: "استوار یکم", color: "#f39c12" },
    { min: 19000, title: "ستوان سوم", color: "#e67e22" },
    { min: 25000, title: "ستوان دوم", color: "#d35400" },
    { min: 32000, title: "ستوان یکم", color: "#e74c3c" },
    { min: 40000, title: "سروان", color: "#c0392b" },
    { min: 50000, title: "سرگرد", color: "#8e44ad" },
    { min: 65000, title: "سرهنگ دوم", color: "#9b59b6" },
    { min: 80000, title: "سرهنگ تمام", color: "#2980b9" },
    { min: 100000, title: "سرتیپ دوم", color: "#3498db" },
    { min: 150000, title: "سرتیپ تمام", color: "#1abc9c" },
    { min: 250000, title: "سرلشکر", color: "#2c3e50" },
    { min: 500000, title: "سپهبد", color: "#e74c3c" },
    { min: 1000000, title: "ارتشبد", color: "#c0392b" }
];

const RankSystem = {
    data: { 
        xp: 0, 
        completed: [], 
        playback: {}, 
        exams: {}, // { exam_id: score }
        last_seen: Date.now() 
    },

    init: function(serverData) {
        if(serverData) {
            // ترکیب هوشمند دیتای لوکال و سرور (برای جلوگیری از بازگشت به عقب)
            if(serverData.xp > this.data.xp) this.data.xp = serverData.xp;
            
            // مرج کردن لیست تکمیل شده‌ها
            if(serverData.completed) {
                const set = new Set([...this.data.completed, ...serverData.completed]);
                this.data.completed = Array.from(set);
            }
            
            // مرج کردن نمرات آزمون (نمره بالاتر حفظ می‌شود)
            if(serverData.exams) {
                for(let eid in serverData.exams) {
                    if(!this.data.exams[eid] || serverData.exams[eid] > this.data.exams[eid]) {
                        this.data.exams[eid] = serverData.exams[eid];
                    }
                }
            }
            
            // مرج کردن زمان پخش (زمان جلوتر حفظ می‌شود)
            if(serverData.playback) {
                for(let vid in serverData.playback) {
                    if(!this.data.playback[vid] || serverData.playback[vid] > this.data.playback[vid]) {
                        this.data.playback[vid] = serverData.playback[vid];
                    }
                }
            }
        }
        
        this.updateStats();
    },

    updateStats: function() {
        // محاسبه لول و XP
        const info = this.getLevelInfo(this.data.xp);
        
        // بروزرسانی UI (اگر المان‌ها در صفحه باشند)
        if(document.getElementById('userXP')) {
            document.getElementById('userXP').innerText = toPersianNum(this.data.xp);
        }
        if(document.getElementById('userRank')) {
            document.getElementById('userRank').innerText = info.rank.title;
            document.getElementById('userRank').style.color = info.rank.color;
        }
        if(document.getElementById('nextLevelXP')) {
            document.getElementById('nextLevelXP').innerText = `تا درجه بعد: ${toPersianNum(info.nextXp - this.data.xp)} امتیاز`;
        }
        
        // نوار پیشرفت لول
        if(document.getElementById('levelProgress')) {
            const currentLevelStart = info.rank.min;
            const levelRange = info.nextXp - currentLevelStart;
            const progress = this.data.xp - currentLevelStart;
            const percent = Math.min(100, Math.max(0, (progress / levelRange) * 100));
            document.getElementById('levelProgress').style.width = percent + "%";
            document.getElementById('levelProgress').style.background = info.rank.color;
        }
    },

    getLevelInfo: function(xp) {
        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (xp >= RANKS[i].min) {
                return {
                    rank: RANKS[i],
                    nextXp: RANKS[i + 1] ? RANKS[i + 1].min : 10000000 // سقف نهایی
                };
            }
        }
        return { rank: RANKS[0], nextXp: RANKS[1].min };
    },
    
    // تابع کمکی برای اضافه کردن XP موقت (سمت کلاینت)
    // نکته: تایید نهایی با سرور است، اما برای حس خوب کاربر اینجا هم اضافه می‌کنیم
    addXP: function(amount) {
        this.data.xp += amount;
        this.updateStats();
        // ذخیره تغییرات در صف برای ارسال به سرور
        if(typeof SyncManager !== 'undefined') {
            SyncManager.addToQueue('sync', null, true);
        }
    }
};

console.log("✅ Gamification Loaded");