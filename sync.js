// ******************************************************
// 📡 مدیر همگام‌سازی (js/sync.js)
// وظیفه: مدیریت صف ارسال، اینترنت و ارتباط با سرور
// ******************************************************

const SyncManager = {
    queue: [], 
    username: null, 
    password: null,
    isSyncing: false,

    init: function(user, pass) {
        this.username = user; 
        this.password = pass;
        // 💾 بازیابی صف از دیسک (با کلید عمومی تعریف شده در config)
        this.queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        
        this.processQueue();
        
        // تلاش دوره‌ای برای ارسال (اگر اینترنت قطع و وصل شد)
        setInterval(() => this.processQueue(), 5000);
        
        // لیسنر وضعیت آنلاین/آفلاین
        window.addEventListener('online', () => this.processQueue());
        window.addEventListener('offline', () => this.updateOfflineBadge());
    },

    addToQueue: function(action, logData = null, forcePlayback = false) {
        let extraParams = {};
        if (action === 'claim_reward' && logData) {
            extraParams = { ...logData };
        }

        const item = {
            action: action, 
            username: this.username, 
            password: this.password,
            // ⚠️ نکته: RankSystem در فایل بعدی تعریف می‌شود، پس چک می‌کنیم که موجود باشد
            jsonData: (typeof RankSystem !== 'undefined') ? JSON.stringify(RankSystem.data) : "{}", 
            logData: logData,
            timestamp: Date.now(),
            force_playback: forcePlayback,
            ...extraParams
        };

        // ✅ بهینه‌سازی هوشمند: ادغام درخواست‌های تکراری Sync
        if(action === 'sync' && !forcePlayback && this.queue.length > 0) {
             const lastItem = this.queue[this.queue.length-1];
             if (lastItem.action === 'sync') {
                 this.queue[this.queue.length-1] = item; // جایگزینی با دیتای جدیدتر
             } else {
                 this.queue.push(item);
             }
        } else {
             this.queue.push(item);
        }
        
        this.saveQueue();
        this.processQueue();
    },

    saveQueue: function() {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
        this.updateOfflineBadge();
    },

    updateOfflineBadge: function() {
        const badge = document.getElementById('offlineBadge');
        if(badge) {
            // از تابع toPersianNum که در config.js ساختیم استفاده می‌کنیم
            if(this.queue.length > 0 && !navigator.onLine) { 
                badge.style.display = 'block'; 
                badge.innerText = `📡 در انتظار اینترنت... (${toPersianNum(this.queue.length)})`; 
                badge.style.background = "#c0392b"; 
            } else if (this.queue.length > 0 && navigator.onLine) {
                badge.style.display = 'block'; 
                badge.innerText = `🔄 در حال ارسال...`; 
                badge.style.background = "#f39c12";
            } else { 
                badge.style.display = 'none'; 
            }
        }
    },

    processQueue: function() {
        if(this.queue.length === 0 || !navigator.onLine || this.isSyncing) {
            this.updateOfflineBadge();
            return;
        }

        this.isSyncing = true;
        const item = this.queue[0]; // گرفتن اولین آیتم
        
        // قبل از ارسال، مطمئن می‌شویم آخرین وضعیت دیتا را دارد
        if(item.action === 'sync' && typeof RankSystem !== 'undefined') {
            item.jsonData = JSON.stringify(RankSystem.data); 
        }
        
        fetch(API_URL, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                // ✅ موفقیت
                this.queue.shift(); // حذف از صف
                this.saveQueue();
                
                // اگر سرور دیتای جدید فرستاد، آپدیت کن
                if (data.serverData && typeof RankSystem !== 'undefined') {
                    console.log("Server data received & updated.");
                    RankSystem.init(data.serverData);
                    
                    // آپدیت کردشال در لوکال (برای اینکه اگر رفرش کرد، امتیاز جدید بماند)
                    const credsKey = DB_KEY + 'creds';
                    const creds = JSON.parse(localStorage.getItem(credsKey) || "{}");
                    creds.jsonData = data.serverData;
                    localStorage.setItem(credsKey, JSON.stringify(creds));
                    
                    if (data.added && data.added > 0) {
                        alert(`🎉 تبریک! ${toPersianNum(data.added)} امتیاز از سرور دریافت شد.`);
                    }
                }

                this.isSyncing = false;
                if(this.queue.length > 0) setTimeout(() => this.processQueue(), 100);
            } else {
                console.error("Server Logic Error:", data.message);
                if(data.message && data.message.includes('مسدود')) {
                    alert("⛔ حساب شما مسدود شده است.");
                    this.queue = [];
                    this.saveQueue();
                } else {
                    this.queue.shift();
                    this.saveQueue();
                }
                this.isSyncing = false;
            }
        })
        .catch(err => {
            console.log("Network Error (Retrying later)", err);
            this.isSyncing = false;
            this.updateOfflineBadge();
        });
    }
};

console.log("✅ Sync Manager Loaded");