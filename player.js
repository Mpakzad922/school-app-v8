// ******************************************************
// 🎬 مدیر پخش ویدیو (js/player.js)
// وظیفه: کنترل پلیر، جلوگیری از تقلب و سوال امنیتی
// ******************************************************

const PlayerManager = {
    currentLesson: null,
    videoEl: null,
    progressBar: null,
    progressFill: null,
    maxSeenTime: 0,
    securityNextCheck: 0,
    
    // باز کردن ویدیو
    open: function(lesson) {
        this.currentLesson = lesson;
        const modal = document.getElementById('videoModal');
        const vContainer = document.getElementById('videoContainer');
        const titleEl = document.getElementById('videoTitle');
        
        // تنظیمات اولیه DOM
        this.videoEl = document.getElementById('mainVideo');
        this.progressBar = document.getElementById('customProgressBar');
        this.progressFill = document.getElementById('customProgressFill');
        
        // لود کردن اطلاعات
        titleEl.innerText = lesson.title;
        this.videoEl.src = lesson.url;
        modal.style.display = 'flex';
        vContainer.style.display = 'block';

        // بررسی سابقه بازدید (از RankSystem)
        const lid = lesson.id.toString();
        const isCompleted = RankSystem.data.completed.includes(lid);
        const savedTime = RankSystem.data.playback[lid] || 0;
        
        this.maxSeenTime = isCompleted ? 999999 : savedTime;
        this.videoEl.currentTime = isCompleted ? 0 : savedTime;
        
        // تنظیم زمان سوال امنیتی بعدی (5 دقیقه بعد + زمان تصادفی)
        this.securityNextCheck = this.videoEl.currentTime + CHECK_INTERVAL + (Math.random() * 60);

        // شروع پخش
        this.videoEl.play().catch(e => console.log("Auto-play blocked"));
        
        // لیسنرها
        this.videoEl.ontimeupdate = () => this.onTimeUpdate();
        this.videoEl.onended = () => this.onEnded();
    },

    // بستن ویدیو
    close: function() {
        if (this.videoEl) {
            this.videoEl.pause();
            // ذخیره آخرین وضعیت قبل از خروج
            this.saveProgress(true);
        }
        document.getElementById('videoModal').style.display = 'none';
        document.getElementById('videoContainer').style.display = 'none';
        this.videoEl.src = ""; // خالی کردن سورس برای توقف دانلود
        
        // رفرش کردن لیست درس‌ها برای آپدیت شدن تیک‌ها
        if(typeof App !== 'undefined') App.renderList();
    },

    // حلقه زمانی (هر ثانیه اجرا می‌شود)
    onTimeUpdate: function() {
        const ct = this.videoEl.currentTime;
        const dur = this.videoEl.duration;
        
        if (!dur) return;

        // آپدیت نوار پیشرفت
        const percent = (ct / dur) * 100;
        this.progressFill.style.width = percent + "%";
        document.getElementById('timeDisplay').innerText = 
            this.formatTime(ct) + " / " + this.formatTime(dur);

        // آپدیت ماکزیمم زمان دیده شده
        if (ct > this.maxSeenTime) {
            this.maxSeenTime = ct;
        }

        // 👮‍♂️ سوال امنیتی (Anti-AFK)
        if (ct > this.securityNextCheck && !RankSystem.data.completed.includes(this.currentLesson.id.toString())) {
            this.askSecurityQuestion();
        }

        // ذخیره در صف (هر 15 ثانیه - طبق آپدیت بهینه شما)
        if (Math.floor(ct) % 15 === 0) {
            this.saveProgress(false);
        }
    },

    // ذخیره پیشرفت در SyncManager
    saveProgress: function(force = false) {
        if (!this.currentLesson) return;
        
        const lid = this.currentLesson.id.toString();
        const ct = this.videoEl.currentTime;
        
        // آپدیت لوکال (برای دسترسی سریع)
        if (ct > (RankSystem.data.playback[lid] || 0)) {
            RankSystem.data.playback[lid] = ct;
        }

        // ارسال به صف
        if (typeof SyncManager !== 'undefined') {
            // فقط اگر زمانش بیشتر از قبل شده بفرست تا ترافیک کم شود
            SyncManager.addToQueue('sync', null, force);
        }
    },

    // وقتی کاربر روی نوار کلیک می‌کند (Scrubbing)
    seek: function(e) {
        if (!this.videoEl.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percent = Math.max(0, Math.min(1, clickX / width));
        const newTime = percent * this.videoEl.duration;

        // قانون: نمی‌تواند جلوتر از جایی که دیده برود
        if (newTime > this.maxSeenTime + 5) { // 5 ثانیه ارفاق
            // برگرداندن به آخرین جای مجاز
            this.progressFill.style.backgroundColor = "red";
            setTimeout(() => this.progressFill.style.backgroundColor = "#e67e22", 500);
            
            // نمایش پیام خطا (تست ساده)
            /* می‌توان اینجا یک Toast Message اضافه کرد */
        } else {
            this.videoEl.currentTime = newTime;
        }
    },

    // پایان ویدیو
    onEnded: function() {
        const lid = this.currentLesson.id.toString();
        
        // اگر قبلاً ندیده بود
        if (!RankSystem.data.completed.includes(lid)) {
            // 1. اضافه کردن به لیست تکمیل شده‌های لوکال
            RankSystem.data.completed.push(lid);
            
            // 2. محاسبه پاداش (مثلاً 500 امتیاز)
            const reward = 500;
            RankSystem.addXP(reward);
            
            // 3. ارسال درخواست جایزه به سرور
            SyncManager.addToQueue('claim_reward', { 
                lesson_id: lid,
                t: Date.now() 
            }, true); // force send

            alert(`🎉 تبریک! درس "${this.currentLesson.title}" تمام شد و ${toPersianNum(reward)} امتیاز گرفتی.`);
            this.close();
        } else {
            alert("✅ این درس قبلاً کامل شده است.");
            this.close();
        }
    },

    // سوال ریاضی
    askSecurityQuestion: function() {
        this.videoEl.pause();
        const n1 = Math.floor(Math.random() * 10) + 1;
        const n2 = Math.floor(Math.random() * 10) + 1;
        const ans = prompt(`👮‍♂️ کنترل نامحسوس!\nبرای ادامه پخش، حاصل جمع زیر را وارد کنید:\n${toPersianNum(n1)} + ${toPersianNum(n2)} = ؟`);
        
        if (ans && parseInt(ans) === (n1 + n2)) {
            this.videoEl.play();
            // چک بعدی: 5 دقیقه بعد
            this.securityNextCheck = this.videoEl.currentTime + CHECK_INTERVAL;
        } else {
            alert("❌ اشتباه بود! فیلم ۵ دقیقه به عقب برمی‌گردد.");
            this.videoEl.currentTime = Math.max(0, this.videoEl.currentTime - 300);
            this.videoEl.play();
            this.securityNextCheck = this.videoEl.currentTime + 60; // 1 دقیقه بعد دوباره بپرس
        }
    },

    // فرمت زمان (مثلاً 05:30)
    formatTime: function(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0'+sec : sec}`;
    },
    
    // دکمه عقب/جلو (۱۰ ثانیه)
    skip: function(sec) {
        const newTime = this.videoEl.currentTime + sec;
        // فقط در صورتی که عقب باشد یا در محدوده مجاز جلو باشد
        if (sec < 0 || newTime <= this.maxSeenTime + 2) {
            this.videoEl.currentTime = newTime;
        }
    }
};

console.log("✅ Player Manager Loaded");