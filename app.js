"use strict";

(() => {
    const supabaseConfig = window.supabaseConfig;
    const supabaseClient = window.supabase && supabaseConfig
        ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.key)
        : null;
    const menuToggle = document.querySelector("#menu-toggle");
    const menu = document.querySelector("#menu");
    const menuSections = document.querySelector("#menu-sections");
    const menuStatus = document.querySelector("#menu-status");
    const themeToggle = document.querySelector("#theme-toggle");
    const themeColorMeta = document.querySelector("#theme-color");
    const orderModal = document.querySelector("#order-modal");
    const orderForm = document.querySelector("#order-form");
    const orderTitle = document.querySelector("#order-title");
    const orderTotal = document.querySelector("#order-total");
    const orderMessage = document.querySelector("#order-message");
    const sizeFieldset = document.querySelector("#size-fieldset");
    const quantityInput = document.querySelector("#quantity");
    const cartToggle = document.querySelector("#cart-toggle");
    const cartModal = document.querySelector("#cart-modal");
    const cartCount = document.querySelector("#cart-count");
    const cartItems = document.querySelector("#cart-items");
    const cartTotal = document.querySelector("#cart-total");
    const checkoutButton = document.querySelector("#checkout-button");
    const continueShopping = document.querySelector("#continue-shopping");
    const checkoutModal = document.querySelector("#checkout-modal");
    const checkoutForm = document.querySelector("#checkout-form");
    const checkoutMessage = document.querySelector("#checkout-message");
    const checkoutSubmit = checkoutForm?.querySelector("button[type='submit']");

    if (
        !(menuToggle instanceof HTMLButtonElement) ||
        !(menu instanceof HTMLElement) ||
        !(menuSections instanceof HTMLElement) ||
        !(menuStatus instanceof HTMLElement)
    ) {
        console.error("تعذر تهيئة قائمة الطعام: عناصر التحكم المطلوبة غير موجودة.");
        return;
    }

    const updateMenuState = (isOpen) => {
        menu.hidden = !isOpen;
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.textContent = isOpen ? "إخفاء القائمة" : "استعرض القائمة";
    };

    menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
        updateMenuState(!isOpen);

        if (!isOpen) {
            menu.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    updateMenuState(false);

    if (!(themeToggle instanceof HTMLButtonElement)) {
        console.error("تعذر تهيئة تبديل المظهر: زر المظهر غير موجود.");
        return;
    }

    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light";

    const updateTheme = (theme) => {
        const isDark = theme === "dark";
        document.documentElement.dataset.theme = theme;
        themeToggle.textContent = isDark ? "☀️ الوضع الفاتح" : "🌙 الوضع الداكن";
        if (themeColorMeta instanceof HTMLMetaElement) {
            themeColorMeta.content = isDark ? "#17120d" : "#fbf1e4";
        }
        themeToggle.setAttribute(
            "aria-label",
            isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن",
        );
        themeToggle.setAttribute("aria-pressed", String(isDark));
    };

    updateTheme(initialTheme);

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.dataset.theme;
        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        updateTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
    });

    if (
        !(orderModal instanceof HTMLElement) ||
        !(orderForm instanceof HTMLFormElement) ||
        !(orderTitle instanceof HTMLElement) ||
        !(orderTotal instanceof HTMLElement) ||
        !(orderMessage instanceof HTMLElement) ||
        !(sizeFieldset instanceof HTMLFieldSetElement) ||
        !(quantityInput instanceof HTMLInputElement) ||
        !(checkoutSubmit instanceof HTMLButtonElement)
    ) {
        console.error("تعذر تهيئة نموذج الطلب: عناصر النموذج المطلوبة غير موجودة.");
        return;
    }

    if (!(continueShopping instanceof HTMLButtonElement)) {
        console.error("تعذر تهيئة زر متابعة التسوق.");
        return;
    }

    // ------- القائمة: بتتحمّل من جدول products في Supabase، نفس المصدر -------
    // اللي دالة create_order بتسعّر منه الطلب، فمفيش احتمال يختلف السعر
    // المعروض عن السعر المحسوب فعليًا.
    const CATEGORY_NOTES = {
        الصواني: "جميع الصواني تُقدَّم مع عيش وشطة.",
    };
    const VARIANT_LEGENDS = {
        المشويات: "اختر الوزن",
        السندوتشات: "اختر نوع العيش",
    };

    const buildCards = (products) => {
        const cards = [];
        const cardByKey = new Map();
        products.forEach((product) => {
            const key = product.variant_label
                ? `${product.category}::${product.name}`
                : `standalone::${product.id}`;
            let card = cardByKey.get(key);
            if (!card) {
                card = {
                    category: product.category,
                    name: product.name,
                    description: product.description || "",
                    variants: [],
                };
                cardByKey.set(key, card);
                cards.push(card);
            }
            card.variants.push({
                id: product.id,
                label: product.variant_label || null,
                price: Number(product.price),
            });
        });
        return cards;
    };

    const groupByCategory = (cards) => {
        const map = new Map();
        cards.forEach((card) => {
            if (!map.has(card.category)) map.set(card.category, []);
            map.get(card.category).push(card);
        });
        return map;
    };

    const buildProductElement = (card) => {
        const article = document.createElement("article");
        article.className = "product";
        const info = document.createElement("div");
        const name = document.createElement("h4");
        name.textContent = card.name;
        info.append(name);
        if (card.description) {
            const desc = document.createElement("p");
            desc.textContent = card.description;
            info.append(desc);
        }
        const priceEl = document.createElement("strong");
        if (card.variants.length > 1) {
            const min = Math.min(...card.variants.map((variant) => variant.price));
            priceEl.textContent = `من ${min} ج.م`;
        } else {
            priceEl.textContent = `${card.variants[0].price} ج.م`;
        }
        const button = document.createElement("button");
        button.className = "product-action";
        button.type = "button";
        button.textContent = "اطلب";
        button.addEventListener("click", () => openOrderModal(card));
        article.append(info, priceEl, button);
        return article;
    };

    const renderMenu = (products) => {
        const cards = buildCards(products);
        const byCategory = groupByCategory(cards);
        menuSections.replaceChildren();
        byCategory.forEach((categoryCards, category) => {
            const section = document.createElement("section");
            section.className = "menu-section";
            const heading = document.createElement("h3");
            heading.textContent = category;
            section.append(heading);
            const note = CATEGORY_NOTES[category];
            if (note) {
                const noteEl = document.createElement("p");
                noteEl.className = "category-note";
                noteEl.textContent = note;
                section.append(noteEl);
            }
            categoryCards.forEach((card) => section.append(buildProductElement(card)));
            menuSections.append(section);
        });
    };

    const loadMenu = async () => {
        if (!supabaseClient) {
            menuStatus.textContent = "تعذر تحميل القائمة. تأكد من اتصالك بالإنترنت ثم حدّث الصفحة.";
            return;
        }
        menuStatus.hidden = false;
        menuStatus.textContent = "جاري تحميل القائمة...";
        const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .order("sort_order", { ascending: true });
        if (error || !data) {
            console.error("فشل تحميل القائمة:", error);
            menuStatus.textContent = "تعذر تحميل القائمة. تأكد من اتصالك بالإنترنت ثم حدّث الصفحة.";
            return;
        }
        menuStatus.hidden = true;
        renderMenu(data);
    };

    // ------- نافذة الطلب: بتتبني ديناميكيًا حسب الصنف (بحجم/بدون حجم) -------
    let selectedCard = null;

    const currentVariant = () => {
        if (!selectedCard) return null;
        if (selectedCard.variants.length === 1) return selectedCard.variants[0];
        const checked = sizeFieldset.querySelector("input[name='variant']:checked");
        return selectedCard.variants.find((variant) => variant.id === checked?.value)
            || selectedCard.variants[0];
    };

    const updateOrderTotal = () => {
        const variant = currentVariant();
        if (!variant) return;
        const quantity = Math.min(20, Math.max(1, Number(quantityInput.value) || 1));
        quantityInput.value = String(quantity);
        orderTotal.textContent = `${variant.price * quantity} ج.م`;
    };

    const openOrderModal = (card) => {
        selectedCard = card;
        orderTitle.textContent = card.name;
        orderMessage.textContent = "";
        quantityInput.value = "1";
        sizeFieldset.replaceChildren();
        if (card.variants.length > 1) {
            sizeFieldset.hidden = false;
            const legend = document.createElement("legend");
            legend.textContent = VARIANT_LEGENDS[card.category] || "اختر النوع";
            sizeFieldset.append(legend);
            card.variants.forEach((variant, index) => {
                const label = document.createElement("label");
                const input = document.createElement("input");
                input.type = "radio";
                input.name = "variant";
                input.value = variant.id;
                if (index === 0) input.checked = true;
                const span = document.createElement("span");
                span.textContent = variant.label;
                const small = document.createElement("small");
                small.textContent = `${variant.price} ج.م`;
                span.append(" ", small);
                label.append(input, span);
                sizeFieldset.append(label);
            });
        } else {
            sizeFieldset.hidden = true;
        }
        orderModal.hidden = false;
        document.body.style.overflow = "hidden";
        updateOrderTotal();
        const firstRadio = sizeFieldset.querySelector("input[name='variant']");
        if (firstRadio instanceof HTMLInputElement) {
            firstRadio.focus();
        } else {
            quantityInput.focus();
        }
    };

    const closeOrderModal = () => {
        orderModal.hidden = true;
        document.body.style.overflow = "";
        selectedCard = null;
    };

    orderForm.addEventListener("change", updateOrderTotal);
    quantityInput.addEventListener("input", updateOrderTotal);

    orderModal.querySelectorAll("[data-close-modal]").forEach((element) => {
        element.addEventListener("click", closeOrderModal);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !orderModal.hidden) closeOrderModal();
    });

    orderForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const variant = currentVariant();
        if (!selectedCard || !variant) return;

        const quantity = Number(quantityInput.value);
        const displayName = variant.label ? `${selectedCard.name} (${variant.label})` : selectedCard.name;
        const existingItem = cart.find((cartItem) => cartItem.productId === variant.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                productId: variant.id,
                name: displayName,
                quantity,
                unitPrice: variant.price,
            });
        }
        saveCart();
        renderCart();
        closeOrderModal();
        openModal(cartModal, cartToggle);
    });

    // ------- السلة -------
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    const saveCart = () => localStorage.setItem("cart", JSON.stringify(cart));

    const renderCart = () => {
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        cartCount.textContent = String(itemCount);
        cartTotal.textContent = `${total} ج.م`;
        checkoutButton.disabled = cart.length === 0;
        cartItems.replaceChildren();
        if (cart.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-cart";
            emptyMessage.textContent = "السلة فارغة حاليًا.";
            cartItems.append(emptyMessage);
            return;
        }

        cart.forEach((item, index) => {
            const cartItem = document.createElement("div");
            cartItem.className = "cart-item";
            const details = document.createElement("div");
            const name = document.createElement("strong");
            const summary = document.createElement("small");
            const removeButton = document.createElement("button");

            name.textContent = item.name;
            summary.textContent = `${item.quantity} × ${item.unitPrice} ج.م = ${item.unitPrice * item.quantity} ج.م`;
            removeButton.className = "remove-item";
            removeButton.type = "button";
            removeButton.textContent = "حذف";
            removeButton.addEventListener("click", () => {
                cart.splice(index, 1);
                saveCart();
                renderCart();
            });
            details.append(name, summary);
            cartItem.append(details, removeButton);
            cartItems.append(cartItem);
        });
    };

    const openModal = (modal, trigger) => {
        modal.hidden = false;
        trigger?.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    };

    const closeModal = (modal, trigger) => {
        modal.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
        if (orderModal.hidden && cartModal.hidden && checkoutModal.hidden) {
            document.body.style.overflow = "";
        }
    };

    cartToggle.addEventListener("click", () => {
        if (cartModal.hidden) {
            renderCart();
            openModal(cartModal, cartToggle);
        } else {
            closeModal(cartModal, cartToggle);
        }
    });

    cartModal.querySelectorAll("[data-close-cart]").forEach((element) => {
        element.addEventListener("click", () => closeModal(cartModal, cartToggle));
    });

    checkoutButton.addEventListener("click", () => {
        closeModal(cartModal, cartToggle);
        checkoutMessage.textContent = "";
        openModal(checkoutModal);
        checkoutModal.querySelector("input").focus();
    });

    continueShopping.addEventListener("click", () => {
        closeModal(cartModal, cartToggle);
        menu.hidden = false;
        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.textContent = "إخفاء القائمة";
        menu.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    checkoutModal.querySelectorAll("[data-close-checkout]").forEach((element) => {
        element.addEventListener("click", () => closeModal(checkoutModal));
    });

    // ------- إتمام الطلب: بيبعت product_id + quantity بس، والسيرفر بيسعّر -------
    checkoutForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        checkoutSubmit.disabled = true;
        checkoutMessage.textContent = "جاري إرسال الطلب...";
        if (!supabaseClient) {
            checkoutMessage.textContent = "تعذر الاتصال بخدمة الطلبات. حاول مرة أخرى بعد قليل.";
            checkoutSubmit.disabled = false;
            return;
        }

        const formData = new FormData(checkoutForm);
        const customer = Object.fromEntries(formData.entries());
        let response;
        try {
            response = await supabaseClient.rpc("create_order", {
                order_data: {
                    customer_name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    notes: customer.notes || "",
                    payment_method: customer.paymentMethod,
                },
                items_data: cart.map((item) => ({
                    product_id: item.productId,
                    quantity: item.quantity,
                })),
            });
        } catch (error) {
            console.error("حدث خطأ أثناء الاتصال بخدمة الطلبات:", error);
            checkoutMessage.textContent = "تعذر إرسال الطلب. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.";
            checkoutSubmit.disabled = false;
            return;
        }

        const { data, error } = response;
        if (error || !data?.order_number) {
            console.error("فشل حفظ الطلب في قاعدة البيانات:", error);
            checkoutMessage.textContent = "تعذر إرسال الطلب. برجاء المحاولة مرة أخرى.";
            checkoutSubmit.disabled = false;
            return;
        }

        localStorage.removeItem("cart");
        cart.length = 0;
        renderCart();
        checkoutForm.reset();
        checkoutMessage.textContent = `تم استلام طلبك رقم ${data.order_number}. سنتواصل معك للتأكيد.`;
        checkoutSubmit.disabled = false;
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!orderModal.hidden) closeOrderModal();
        else if (!cartModal.hidden) closeModal(cartModal, cartToggle);
        else if (!checkoutModal.hidden) closeModal(checkoutModal);
    });

    renderCart();
    void loadMenu();
})();
