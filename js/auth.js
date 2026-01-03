// ******************************************************
// 🔐 مدیر احراز هویت (js/auth.js)
// وظیفه: لاگین، لاگ‌اوت و مدیریت دسترسی
// ******************************************************

const AuthManager = {
    user: null,

    // بررسی اینکه آیا کاربر قبلاً وارد شده؟
    check: async function() {
        const creds = JSON.parse(localStorage.getItem(DB_KEY + 'creds'));
        
        if (!creds) {
            // اگر اطلاعاتی نیست، صفحه لاگین را نشان بده
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
            return;
        }

        // نمایش لودینگ
        document.getElementById('loadingBox').style.display = 'flex';

        try {
            // تلاش برای تایید اعتبار با سرور
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: 'get_user_data', username: creds.u, password: creds.p })
            });
            const data = await res.json();

            if (data.status === 'success') {
                // آپدیت اطلاعات لوکال با اطلاعات تازه سرور
                creds.jsonData = data.user_data;
                localStorage.setItem(DB_KEY + 'creds', JSON.stringify(creds));
                
                this.loginSuccess(creds.u, creds.p, data.user_data);
            } else {
                // اگر رمز عوض شده یا اکانت پاک شده
                alert("⛔ " + data.message);
                this.logout(false); // خروج بدون سوال پرسیدن
            }
        } catch (e) {
            console.log("Offline Mode Active");
            // حالت آفلاین: اگر دیتای قدیمی داریم، با همان وارد شو
            if (creds.jsonData) {
                this.loginSuccess(creds.u, creds.p, creds.jsonData);
            } else {
                alert("❌ برای اولین ورود، اتصال به اینترنت الزامی است.");
                this.logout(false);
            }
        }
        document.getElementById('loadingBox').style.display = 'none';
    },

    // عملیات لاگین (وقتی دکمه ورود زده میشه)
    doLogin: async function() {
        const u = document.getElementById('uInput').value.toLowerCase().trim();
        const p = document.getElementById('pInput').value.trim();
        
        if (!u || !p) return alert("لطفاً نام کاربری و رمز عبور را وارد کنید");

        document.getElementById('loadingBox').style.display = 'flex';

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: 'login', username: u, password: p })
            });
            const data = await res.json();

            if (data.status === 'success') {
                // ذخیره نام و رمز در مرورگر
                localStorage.setItem(DB_KEY + 'creds', JSON.stringify({ u: u, p: p, jsonData: data.user_data }));
                this.loginSuccess(u, p, data.user_data);
            } else {
                alert("❌ " + data.message);
            }
        } catch (e) {
            alert("❌ خطای ارتباط با سرور. لطفاً اینترنت خود را بررسی کنید.");
        }
        document.getElementById('loadingBox').style.display = 'none';
    },

    // عملیات موفقیت‌آمیز ورود
    loginSuccess: function(user, pass, userData) {
        this.user = user;
        
        // تغییر صفحات
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';

        // 1. روشن کردن موتور اینترنت (Sync)
        if(typeof SyncManager !== 'undefined') SyncManager.init(user, pass);

        // 2. روشن کردن موتور امتیازدهی (Rank)
        if(typeof RankSystem !== 'undefined') RankSystem.init(userData);

        // 3. روشن کردن برنامه اصلی (لیست درس‌ها)
        // نکته: App در فایل بعدی (app.js) ساخته می‌شود
        if(typeof App !== 'undefined') App.start();
    },

    // خروج از حساب
    logout: function(ask = true) {
        if(!ask || confirm("آیا مطمئن هستید که می‌خواهید خارج شوید؟")) {
            localStorage.removeItem(DB_KEY + 'creds');
            location.reload();
        }
    }
};

console.log("✅ Auth Manager Loaded");