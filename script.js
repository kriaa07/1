

/* =========================================================
   SUBMIT ORDER
   ========================================================= */

async function submitOrder() {

    if (!selectedProduct) return;


    const customerName =
        document.getElementById("orderUsername")
            ?.value.trim();

    const size =
        document.getElementById("orderSize")
            ?.value;

    const whatsapp =
        document.getElementById("orderWhatsApp")
            ?.value.trim();

    const city =
        document.getElementById("orderCity")
            ?.value;

    const message =
        document.getElementById("orderMessage");


    if (
        !customerName ||
        !size ||
        !whatsapp ||
        !city
    ) {

        if (message) {
            message.textContent =
                "أكمل جميع المعلومات المطلوبة.";
        }

        return;
    }


    if (message) {
        message.textContent =
            "جاري إرسال الطلب...";
    }


    const total =
        Number(selectedProduct.price);


    const {
        data: order,
        error: orderError
    } = await sb
        .from("orders")
        .insert({

            customer_name: customerName,
            whatsapp: whatsapp,
            city: city,
            total: total

        })
        .select("id")
        .single();


    if (orderError) {

        console.error(
            "Order error:",
            orderError
        );

        if (message) {
            message.textContent =
                "تعذر إرسال الطلب.";
        }

        return;
    }


    const {
        error: itemError
    } = await sb
        .from("order_items")
        .insert({

            order_id: order.id,
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            size: size,
            quantity: 1,
            price: Number(selectedProduct.price)

        });


    if (itemError) {

        console.error(
            "Order item error:",
            itemError
        );

        if (message) {
            message.textContent =
                "تم إنشاء الطلب لكن حدث خطأ في التفاصيل.";
        }

        return;
    }


    if (message) {
        message.textContent =
            "تم إرسال طلبك بنجاح!";
    }


    setTimeout(() => {
        closeOrder();
    }, 1500);
}


/* =========================================================
   LOGIN MODAL
   ========================================================= */

function openLogin() {

    document
        .getElementById("loginModal")
        ?.classList.add("open");

    addSignupButton();
}


function closeLogin() {

    document
        .getElementById("loginModal")
        ?.classList.remove("open");
}


/* =========================================================
   ADD SIGNUP BUTTON AUTOMATICALLY
   ========================================================= */

function addSignupButton() {

    const modalBox =
        document.querySelector("#loginModal .modal-box");

    if (!modalBox) return;

    if (document.getElementById("signupButton")) {
        return;
    }


    const button =
        document.createElement("button");

    button.id = "signupButton";

    button.type = "button";

    button.textContent =
        "إنشاء حساب جديد";

    button.style.width = "100%";
    button.style.marginTop = "10px";
    button.style.padding = "12px";
    button.style.border = "1px solid #17130f";
    button.style.borderRadius = "8px";
    button.style.background = "transparent";
    button.style.cursor = "pointer";
    button.style.fontWeight = "700";


    button.onclick = openSignup;


    modalBox.appendChild(button);
}


/* =========================================================
   SIGN UP
   ========================================================= */

function openSignup() {

    closeLogin();


    let modal =
        document.getElementById("signupModal");


    if (!modal) {

        modal =
            document.createElement("div");

        modal.id = "signupModal";

        modal.className = "modal";


        modal.innerHTML = `

            <div class="modal-box">

                <button
                    class="close-modal"
                    onclick="closeSignup()"
                >
                    ×
                </button>

                <span class="eyebrow">
                    KRIAA
                </span>

                <h2>
                    إنشاء حساب
                </h2>

                <input
                    id="signupEmail"
                    type="email"
                    placeholder="البريد الإلكتروني"
                >

                <input
                    id="signupPassword"
                    type="password"
                    placeholder="كلمة المرور"
                >

                <input
                    id="signupPasswordConfirm"
                    type="password"
                    placeholder="تأكيد كلمة المرور"
                >

                <button
                    class="primary-btn full"
                    onclick="signup()"
                >
                    إنشاء الحساب
                </button>

                <p id="signupMessage"></p>

            </div>

        `;


        document.body.appendChild(modal);
    }


    modal.classList.add("open");
}


function closeSignup() {

    document
        .getElementById("signupModal")
        ?.classList.remove("open");
}


/* =========================================================
   CREATE ACCOUNT
   ========================================================= */

async function signup() {

    const email =
        document.getElementById("signupEmail")
            ?.value.trim();

    const password =
        document.getElementById("signupPassword")
            ?.value;

    const confirmPassword =
        document.getElementById("signupPasswordConfirm")
            ?.value;

    const message =
        document.getElementById("signupMessage");


    if (!email || !password || !confirmPassword) {

        if (message) {
            message.textContent =
                "أكمل جميع المعلومات.";
        }

        return;
    }


    if (password.length < 6) {

        if (message) {
            message.textContent =
                "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
        }

        return;
    }


    if (password !== confirmPassword) {

        if (message) {
            message.textContent =
                "كلمتا المرور غير متطابقتين.";
        }

        return;
    }


    if (message) {
        message.textContent =
            "جاري إنشاء الحساب...";
    }


    const {
        data,
        error
    } = await sb.auth.signUp({

        email: email,

        password: password

    });


    if (error) {

        console.error(
            "Signup error:",
            error
        );

        if (message) {
            message.textContent =
                error.message;
        }

        return;
    }


    /*
       إذا كان تأكيد البريد الإلكتروني مفعّلًا
       فلن يكون هناك Session مباشرة.
    */

    if (!data.session) {

        if (message) {
            message.textContent =
                "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.";
        }

        return;
    }


    currentUser =
        data.user;

    currentUserIsAdmin =
        await isAdmin();


    closeSignup();

    await updateUserInterface();

    show("home");


    alert(
        "تم إنشاء حسابك بنجاح!"
    );
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

    const email =
        document.getElementById("loginEmail")
            ?.value.trim();

    const password =
        document.getElementById("loginPassword")
            ?.value;

    const message =
        document.getElementById("loginMessage");


    if (!email || !password) {

        if (message) {
            message.textContent =
                "أدخل البريد الإلكتروني وكلمة المرور.";
        }

        return;
    }


    if (message) {
        message.textContent =
            "جاري تسجيل الدخول...";
    }


    const {
        data,
        error
    } = await sb.auth.signInWithPassword({

        email: email,

        password: password

    });


    if (error) {

        console.error(
            "Login error:",
            error
        );

        if (message) {
            message.textContent =
                "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        }

        return;
    }


    currentUser =
        data.user;


    currentUserIsAdmin =
        await isAdmin();


    closeLogin();

    await updateUserInterface();


    /*
       المستخدم العادي يدخل إلى المتجر.
       الـAdmin يستطيع فتح لوحة الإدارة.
    */

    show("home");


    if (currentUserIsAdmin) {

        console.log(
            "KRIAA: Admin logged in."
        );

    } else {

        console.log(
            "KRIAA: Normal user logged in."
        );

    }
}


/* =========================================================
   ADMIN CHECK
   ========================================================= */

async function isAdmin() {

    if (!currentUser) {

        const {
            data
        } = await sb.auth.getUser();

        currentUser =
            data?.user || null;
    }


    if (!currentUser) {
        return false;
    }


    const {
        data,
        error
    } = await sb.rpc(
        "check_is_admin"
    );


    if (error) {

        console.error(
            "Admin check error:",
            error
        );

        return false;
    }


    return data === true;
}


/* =========================================================
   USER INTERFACE
   ========================================================= */

async function updateUserInterface() {

    const adminButton =
        document.getElementById("adminButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const loginButton =
        document.getElementById("loginButton");


    if (!currentUser) {

        currentUserIsAdmin = false;


        if (adminButton) {
            adminButton.style.display = "none";
        }

        if (logoutButton) {
            logoutButton.style.display = "none";
        }

        if (loginButton) {
            loginButton.style.display = "inline-block";
        }

        return;
    }


    currentUserIsAdmin =
        await isAdmin();


    if (adminButton) {

        adminButton.style.display =
            currentUserIsAdmin
                ? "inline-block"
                : "none";
    }


    if (logoutButton) {

        logoutButton.style.display =
            "inline-block";
    }


    if (loginButton) {

        loginButton.style.display =
            "none";
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    await sb.auth.signOut();

    currentUser = null;

    currentUserIsAdmin = false;

    await updateUserInterface();

    show("home");
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

async function openAdminDashboard() {

    if (!currentUser) {

        openLogin();

        return;
    }


    currentUserIsAdmin =
        await isAdmin();


    if (!currentUserIsAdmin) {

        alert(
            "ليس لديك صلاحية Admin."
        );

        return;
    }


    show("admin");

    renderAdmin();
}


/* =========================================================
   ADMIN ORDERS
   ========================================================= */

async function renderAdmin() {

    const container =
        document.getElementById("adminContent");

    if (!container) return;


    currentUserIsAdmin =
        await isAdmin();


    if (!currentUserIsAdmin) {

        container.innerHTML = `
            <div class="admin-box">
                <p>
                    هذه الصفحة خاصة بالإدارة.
                </p>
            </div>
        `;

        return;
    }


    const {
        data: orders,
        error
    } = await sb
        .from("orders")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Orders error:",
            error
        );

        container.innerHTML = `
            <div class="admin-box">
                <p>
                    تعذر تحميل الطلبات.
                </p>
            </div>
        `;

        return;
    }


    const orderList =
        orders || [];


    container.innerHTML = `

        <div class="admin-box">

            <h3>
                الطلبات (${orderList.length})
            </h3>

            ${
                orderList.length === 0

                ?

                "<p>لا توجد طلبات حاليًا.</p>"

                :

                `
                <table class="admin-table">

                    <thead>

                        <tr>

                            <th>العميل</th>
                            <th>WhatsApp</th>
                            <th>الولاية</th>
                            <th>المجموع</th>
                            <th>الحالة</th>
                            <th>التاريخ</th>
                            <th>إجراء</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${
                            orderList
                                .map(order => {

                                    return `

                                    <tr>

                                        <td>
                                            ${escapeHtml(
                                                order.customer_name
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                order.whatsapp
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                order.city
                                            )}
                                        </td>

                                        <td>
                                            ${Number(
                                                order.total
                                            ).toFixed(2)}
                                            DT
                                        </td>

                                        <td>

                                            <span class="status">
                                                ${escapeHtml(
                                                    order.status
                                                )}
                                            </span>

                                        </td>

                                        <td>

                                            ${new Date(
                                                order.created_at
                                            ).toLocaleString(
                                                "fr-TN"
                                            )}

                                        </td>

                                        <td class="admin-actions">

                                            <button
                                                onclick="changeStatus(
                                                    '${order.id}',
                                                    'confirmed'
                                                )"
                                            >
                                                تأكيد
                                            </button>

                                            <button
                                                onclick="changeStatus(
                                                    '${order.id}',
                                                    'shipping'
                                                )"
                                            >
                                                شحن
                                            </button>

                                            <button
                                                onclick="changeStatus(
                                                    '${order.id}',
                                                    'completed'
                                                )"
                                            >
                                                مكتمل
                                            </button>

                                            <button
                                                onclick="changeStatus(
                                                    '${order.id}',
                                                    'cancelled'
                                                )"
                                            >
                                                إلغاء
                                            </button>

                                        </td>

                                    </tr>

                                    `;

                                })
                                .join("")
                        }

                    </tbody>

                </table>
                `
            }

        </div>

    `;
}


/* =========================================================
   CHANGE ORDER STATUS
   ========================================================= */

async function changeStatus(
    orderId,
    status
) {

    currentUserIsAdmin =
        await isAdmin();


    if (!currentUserIsAdmin) {

        alert(
            "ليس لديك صلاحية Admin."
        );

        return;
    }


    const {
        error
    } = await sb
        .from("orders")
        .update({
            status: status
        })
        .eq("id", orderId);


    if (error) {

        console.error(
            "Status error:",
            error
        );

        alert(
            "تعذر تغيير حالة الطلب."
        );

        return;
    }


    renderAdmin();
}


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange(
    async (event, session) => {

        currentUser =
            session?.user || null;


        if (currentUser) {

            /*
               ننتظر قليلًا حتى لا تتداخل
               عملية Auth مع طلب RPC.
            */

            setTimeout(async () => {

                currentUserIsAdmin =
                    await isAdmin();

                await updateUserInterface();

            }, 0);

        } else {

            currentUserIsAdmin = false;

            await updateUserInterface();
        }

    }
);


/* =========================================================
   REALTIME ORDERS
   ========================================================= */

sb.channel("kriaa-orders")

    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "orders"
        },
        () => {

            const adminPage =
                document.getElementById("admin");

            if (
                adminPage &&
                adminPage.classList.contains("active") &&
                currentUserIsAdmin
            ) {

                renderAdmin();

            }

        }
    )

    .subscribe();


/* =========================================================
   START KRIAA
   ========================================================= */

(async function startKRIAA() {

    try {

        const {
            data
        } = await sb.auth.getUser();

        currentUser =
            data?.user || null;


        if (currentUser) {

            currentUserIsAdmin =
                await isAdmin();

        }

    } catch (error) {

        console.error(
            "Auth startup error:",
            error
        );

    }


    await loadProducts();

    await updateUserInterface();

    addSignupButton();

})();
