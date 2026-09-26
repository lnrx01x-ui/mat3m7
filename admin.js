"use strict";

(() => {
    const config = window.supabaseConfig;
    const client = window.supabase && config
        ? window.supabase.createClient(config.url, config.key)
        : null;
    const loginSection = document.querySelector("#login-section");
    const dashboard = document.querySelector("#dashboard-content");
    const loginForm = document.querySelector("#login-form");
    const loginMessage = document.querySelector("#login-message");
    const signOut = document.querySelector("#sign-out");
    const ordersList = document.querySelector("#orders-list");
    const refreshButton = document.querySelector("#refresh-orders");
    const lastUpdated = document.querySelector("#last-updated");
    const search = document.querySelector("#order-search");
    const statusFilter = document.querySelector("#status-filter");
    const sort = document.querySelector("#sort-orders");
    const notificationsButton = document.querySelector("#notifications-toggle");
    const stats = {
        total: document.querySelector("#total-orders"),
        fresh: document.querySelector("#new-orders"),
        sales: document.querySelector("#total-sales"),
        active: document.querySelector("#active-orders"),
    };

    if (
        !(client) ||
        !(loginSection instanceof HTMLElement) ||
        !(dashboard instanceof HTMLElement) ||
        !(loginForm instanceof HTMLFormElement) ||
        !(loginMessage instanceof HTMLElement) ||
        !(signOut instanceof HTMLButtonElement) ||
        !(ordersList instanceof HTMLElement)
    ) {
        console.error("تعذر تهيئة لوحة التحكم أو إعداد Supabase غير موجود.");
        return;
    }

    const labels = {
        new: "طلب جديد",
        accepted: "تم قبول الطلب",
        preparing: "جاري التحضير",
        delivering: "خرج للتوصيل",
        delivered: "تم التسليم",
        cancelled: "ملغي",
    };
    let orders = [];
    let notificationsEnabled = false;

    const setAuthenticated = (authenticated) => {
        loginSection.hidden = authenticated;
        dashboard.hidden = !authenticated;
    };

    const normalize = (order) => ({
        id: order.id,
        orderNumber: order.order_number,
        customer: {
            name: order.customer_name,
            phone: order.phone,
            address: order.address,
            notes: order.notes || "",
        },
        items: (order.order_items || []).map((item) => ({
            name: item.product_name,
            size: item.size,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
        })),
        total: Number(order.total),
        status: order.status,
        createdAt: order.created_at,
    });

    const showError = (message) => {
        lastUpdated.textContent = message;
        ordersList.replaceChildren();
        const error = document.createElement("p");
        error.className = "empty-orders";
        error.textContent = message;
        ordersList.append(error);
    };

    const loadOrders = async () => {
        const { data, error } = await client
            .from("orders")
            .select("*, order_items (*)")
            .order("created_at", { ascending: false });
        if (error) {
            console.error("فشل تحميل الطلبات:", error);
            showError("تعذر تحميل الطلبات. تحقق من صلاحيات حساب المدير.");
            return false;
        }
        orders = data.map(normalize);
        return true;
    };

    const updateStats = () => {
        stats.total.textContent = String(orders.length);
        stats.fresh.textContent = String(orders.filter((order) => order.status === "new").length);
        stats.active.textContent = String(orders.filter((order) => (
            ["accepted", "preparing", "delivering"].includes(order.status)
        )).length);
        stats.sales.textContent = `${orders
            .filter((order) => order.status !== "cancelled")
            .reduce((sum, order) => sum + order.total, 0)} ج.م`;
    };

    const visibleOrders = () => {
        const query = search.value.trim().toLowerCase();
        const filtered = orders.filter((order) => {
            const text = `${order.orderNumber} ${order.customer.name} ${order.customer.phone} ${order.customer.address}`.toLowerCase();
            return (statusFilter.value === "all" || order.status === statusFilter.value)
                && (!query || text.includes(query));
        });
        return filtered.sort((first, second) => {
            if (sort.value === "highest") return second.total - first.total;
            const firstTime = new Date(first.createdAt).getTime();
            const secondTime = new Date(second.createdAt).getTime();
            return sort.value === "oldest" ? firstTime - secondTime : secondTime - firstTime;
        });
    };

    const updateStatus = async (order, status) => {
        const { error } = await client.from("orders").update({ status }).eq("id", order.id);
        if (error) {
            console.error("فشل تحديث حالة الطلب:", error);
            return;
        }
        order.status = status;
        render();
    };

    const render = () => {
        updateStats();
        ordersList.replaceChildren();
        const filtered = visibleOrders();
        if (!filtered.length) {
            const empty = document.createElement("p");
            empty.className = "empty-orders";
            empty.textContent = orders.length ? "لا توجد نتائج مطابقة." : "لا توجد طلبات حتى الآن.";
            ordersList.append(empty);
            return;
        }

        filtered.forEach((order) => {
            const card = document.createElement("article");
            card.className = `admin-order status-${order.status}`;
            const heading = document.createElement("div");
            heading.className = "order-heading";
            const title = document.createElement("h2");
            title.textContent = `#${order.orderNumber}`;
            const time = document.createElement("time");
            time.textContent = new Date(order.createdAt).toLocaleString("ar-EG");
            heading.append(title, time);

            const customer = document.createElement("div");
            customer.className = "customer-info";
            const details = document.createElement("span");
            details.textContent = `${order.customer.name} — ${order.customer.phone}`;
            const address = document.createElement("span");
            address.textContent = `العنوان: ${order.customer.address}`;
            customer.append(details, address);
            if (order.customer.notes) {
                const notes = document.createElement("span");
                notes.className = "order-notes";
                notes.textContent = `ملاحظات: ${order.customer.notes}`;
                customer.append(notes);
            }

            const items = document.createElement("div");
            items.className = "order-items";
            order.items.forEach((item) => {
                const line = document.createElement("div");
                line.className = "order-line";
                const name = document.createElement("strong");
                name.textContent = `${item.quantity} × ${item.name} (${item.size})`;
                const price = document.createElement("small");
                price.textContent = `${item.unitPrice * item.quantity} ج.م`;
                line.append(name, price);
                items.append(line);
            });

            const footer = document.createElement("div");
            footer.className = "order-footer";
            const total = document.createElement("strong");
            total.textContent = `${order.total} ج.م`;
            const controls = document.createElement("div");
            controls.className = "footer-actions";
            const call = document.createElement("a");
            call.href = `tel:${order.customer.phone}`;
            call.textContent = "اتصال";
            const print = document.createElement("button");
            print.type = "button";
            print.className = "print-order";
            print.textContent = "طباعة";
            print.addEventListener("click", () => window.print());
            const select = document.createElement("select");
            select.className = "status-select";
            select.setAttribute("aria-label", `حالة الطلب ${order.orderNumber}`);
            Object.entries(labels).forEach(([value, label]) => {
                select.append(new Option(label, value, value === order.status, value === order.status));
            });
            select.addEventListener("change", () => void updateStatus(order, select.value));
            controls.append(call, print, select);
            footer.append(total, controls);
            card.append(heading, customer, items, footer);
            ordersList.append(card);
        });
    };

    const refresh = async () => {
        refreshButton.disabled = true;
        const loaded = await loadOrders();
        refreshButton.disabled = false;
        if (loaded) {
            lastUpdated.textContent = `آخر تحديث: ${new Date().toLocaleTimeString("ar-EG")}`;
            render();
        }
    };

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        loginMessage.textContent = "جاري تسجيل الدخول...";
        const email = document.querySelector("#admin-email").value.trim();
        const password = document.querySelector("#admin-password").value;
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("فشل تسجيل الدخول:", error);
            loginMessage.textContent = "بيانات الدخول غير صحيحة أو الحساب غير مصرح له.";
            return;
        }
        loginForm.reset();
        loginMessage.textContent = "";
        setAuthenticated(true);
        await refresh();
    });

    signOut.addEventListener("click", async () => {
        const { error } = await client.auth.signOut();
        if (error) console.error("فشل تسجيل الخروج:", error);
        setAuthenticated(false);
    });
    [search, statusFilter, sort].forEach((control) => {
        control.addEventListener("input", render);
        control.addEventListener("change", render);
    });
    refreshButton.addEventListener("click", () => void refresh());
    notificationsButton.addEventListener("click", async () => {
        if (!("Notification" in window)) {
            notificationsButton.textContent = "⚠️ المتصفح لا يدعم التنبيهات";
            return;
        }
        if (Notification.permission === "default") {
            await Notification.requestPermission();
        }
        if (Notification.permission !== "granted") {
            notificationsEnabled = false;
            notificationsButton.textContent = "🔕 التنبيهات (مرفوضة من المتصفح)";
            return;
        }
        notificationsEnabled = !notificationsEnabled;
        notificationsButton.textContent = notificationsEnabled ? "🔔 التنبيهات مفعلة" : "🔕 التنبيهات";
    });

    client.auth.onAuthStateChange((_event, session) => {
        setAuthenticated(Boolean(session));
        if (session) void refresh();
    });
    client.auth.getSession().then(({ data }) => {
        setAuthenticated(Boolean(data.session));
        if (data.session) void refresh();
    });

    client.channel("orders-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void refresh())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, ({ new: newOrder }) => {
            if (!notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") {
                return;
            }
            new Notification("طلب جديد 🔔", {
                body: `طلب رقم ${newOrder.order_number} بقيمة ${newOrder.total} ج.م`,
            });
        })
        .subscribe();
})();
