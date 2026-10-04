/* =========================================================
   KRIAA STORE
   Supabase + Customers + Login + Signup + Admin
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://cytadjhcbqkzafvrlyys.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_BuZF3A3tXdXm4V4RlZxAOA_LDiZvavH";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let products = [];
let currentCategory = "all";
let selectedProduct = null;

let currentUser = null;
let currentUserIsAdmin = false;


/* =========================================================
   HELPER
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/[&<>"']/g, character => {

      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return map[character];
    });
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function show(id) {

  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });


  const page =
    document.getElementById(id);

  if (page) {
    page.classList.add("active");
  }


  document
    .getElementById("mainNav")
    ?.classList.remove("open");


  if (id === "admin") {
    openAdminDashboard();
  }
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function toggleMobileMenu() {

  document
    .getElementById("mainNav")
    ?.classList.toggle("open");
}


/* =========================================================
   CATEGORIES
   ========================================================= */

function setCategory(category) {

  currentCategory = category;


  document
    .querySelectorAll(".category-btn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.category === category
      );

    });


  renderProducts();
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

  const {
    data,
    error
  } = await sb
    .from("products")
    .select("*")
    .eq("active", true)
    .order("position", {
      ascending: true
    })
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.error(
      "Products loading error:",
      error
    );


    const container =
      document.getElementById(
        "productsContainer"
      );


    if (container) {

      container.innerHTML =
        "<p>حدث خطأ في تحميل المنتجات.</p>";

    }

    return;
  }


  products = data || [];

  renderProducts();
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts() {

  const container =
    document.getElementById(
      "productsContainer"
    );


  if (!container) return;


  const search =
    (
      document.getElementById(
        "searchInput"
      )?.value || ""
    )
      .trim()
      .toLowerCase();


  const filtered =
    products.filter(product => {

      const categoryOK =
        currentCategory === "all" ||
        product.category === currentCategory;


      const searchOK =
        !search ||
        (product.name || "")
          .toLowerCase()
          .includes(search) ||

        (product.description || "")
          .toLowerCase()
          .includes(search);


      return categoryOK && searchOK;
    });


  if (!filtered.length) {

    container.innerHTML =
      "<p>لا توجد منتجات حاليًا.</p>";

    return;
  }


  container.innerHTML =
    filtered
      .map(product => {

        const image =
          product.image_url ||
          "https://placehold.co/700x700?text=KRIAA";


        const oldPrice =
          product.old_price
            ? `
              <span class="old-price">
                ${Number(
                  product.old_price
                ).toFixed(2)} DT
              </span>
            `
            : "";


        return `
          <article class="product-card">

            <img
              class="product-image"
              src="${escapeHtml(image)}"
              alt="${escapeHtml(product.name)}"
            >

            <div class="product-info">

              <h3>
                ${escapeHtml(product.name)}
              </h3>

              <p>
                ${escapeHtml(
                  product.description || ""
                )}
              </p>

              <div class="price">
                ${Number(
                  product.price
                ).toFixed(2)} DT

                ${oldPrice}
              </div>

              <button
                class="product-btn"
                onclick="openOrder('${product.id}')"
              >
                اطلب الآن
              </button>

            </div>

          </article>
        `;

      })
      .join("");
}


/* =========================================================
   SEARCH
   ========================================================= */

document.addEventListener(
  "input",
  event => {

    if (
      event.target &&
      event.target.id === "searchInput"
    ) {

      renderProducts();
    }

  }
);


/* =========================================================
   ORDER MODAL
   ========================================================= */

function openOrder(productId) {

  selectedProduct =
    products.find(
      product => product.id === productId
    );


  if (!selectedProduct) {
    return;
  }


  const title =
    document.getElementById(
      "orderTitle"
    );


  const summary =
    document.getElementById(
      "orderSummary"
    );


  const size =
    document.getElementById(
      "orderSize"
    );


  const message =
    document.getElementById(
      "orderMessage"
    );


  if (title) {

    title.textContent =
      "طلب " +
      selectedProduct.name;

  }


  if (summary) {

    summary.textContent =
      "السعر: " +
      Number(
        selectedProduct.price
      ).toFixed(2) +
      " DT";

  }


  const sizes =
    selectedProduct.sizes?.length
      ? selectedProduct.sizes
      : [
          "S",
          "M",
          "L",
          "XL",
          "XXL"
        ];


  if (size) {

    size.innerHTML =
      `
        <option value="">
          اختر المقاس
        </option>
      ` +

      sizes
        .map(item => {

          return `
            <option value="${escapeHtml(item)}">
              ${escapeHtml(item)}
            </option>
          `;

        })
        .join("");
  }


  if (message) {
    message.textContent = "";
  }


  document
    .getElementById("orderModal")
    ?.classList.add("open");
}


/* =========================================================
   CLOSE ORDER
   ========================================================= */

function closeOrder() {

  document
    .getElementById("orderModal")
    ?.classList.remove("open");
}


/* =========================================================
   SUBMIT ORDER
   ========================================================= */

async function submitOrder() {

  if (!selectedProduct) {
    return;
  }


  const customerName =
    document
      .getElementById("orderUsername")
      ?.value.trim();


  const size =
    document
      .getElementById("orderSize")
      ?.value;


  const whatsapp =
    document
      .getElementById("orderWhatsApp")
      ?.value.trim();


  const city =
    document
      .getElementById("orderCity")
      ?.value;


  const message =
    document.getElementById(
      "orderMessage"
    );


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
    Number(
      selectedProduct.price
    );


  /* إنشاء الطلب */

  const {
    data: order,
    error: orderError
  } = await sb
    .from("orders")
    .insert({

      customer_name:
        customerName,

      whatsapp:
        whatsapp,

      city:
        city,

      total:
        total

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


  /* تفاصيل الطلب */

  const {
    error: itemError
  } = await sb
    .from("order_items")
    .insert({

      order_id:
        order.id,

      product_id:
        selectedProduct.id,

      product_name:
        selectedProduct.name,

      size:
        size,

      quantity:
        1,

      price:
        Number(
          selectedProduct.price
        )

    });


  if (itemError) {

    console.error(
      "Order item error:",
      itemError
    );


    if (message) {

      message.textContent =
        "تم إنشاء الطلب لكن حدث خطأ في تفاصيله.";

    }

    return;
  }


  if (message) {

    message.textContent =
      "تم إرسال طلبك بنجاح!";

  }


  setTimeout(() => {

    closeOrder();

  }, 1200);
}


/* =========================================================
   LOGIN MODAL
   ========================================================= */

function openLogin() {

  const modal =
    document.getElementById(
      "loginModal"
    );


  if (modal) {
    modal.classList.add("open");
  }
}


function closeLogin() {

  const modal =
    document.getElementById(
      "loginModal"
    );


  if (modal) {
    modal.classList.remove("open");
  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

  const email =
    document
      .getElementById("loginEmail")
      ?.value.trim();


  const password =
    document
      .getElementById("loginPassword")
      ?.value;


  const message =
    document.getElementById(
      "loginMessage"
    );


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

    email:
      email,

    password:
      password

  });


  if (error) {

    console.error(
      "Login error:",
      error
    );


    if (message) {

      message.textContent =
        "خطأ في تسجيل الدخول: " +
        error.message;

    }

    return;
  }


  /* مهم:
     لا نطرد المستخدم إذا لم يكن Admin.
  */

  currentUser =
    data.user;


  currentUserIsAdmin =
    await isAdmin();


  closeLogin();

  await updateUserInterface();

  show("home");


  console.log(
    currentUserIsAdmin
      ? "KRIAA: Admin logged in."
      : "KRIAA: Customer logged in."
  );
}


/* =========================================================
   SIGNUP MODAL
   ========================================================= */

function openSignup() {

  let modal =
    document.getElementById(
      "signupModal"
    );


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );


    modal.id =
      "signupModal";


    modal.className =
      "modal";


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
          إنشاء حساب جديد
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

        <button
          type="button"
          onclick="backToLogin()"
          style="
            width:100%;
            margin-top:10px;
            padding:10px;
            background:transparent;
            border:1px solid #ddd;
            border-radius:8px;
            cursor:pointer;
          "
        >
          لدي حساب بالفعل
        </button>

      </div>

    `;


    document.body.appendChild(
      modal
    );
  }


  modal.classList.add(
    "open"
  );
}


function closeSignup() {

  document
    .getElementById(
      "signupModal"
    )
    ?.classList.remove(
      "open"
    );
}


function backToLogin() {

  closeSignup();

  openLogin();
}


/* =========================================================
   CREATE ACCOUNT
   ========================================================= */

async function signup() {

  const email =
    document
      .getElementById(
        "signupEmail"
      )
      ?.value.trim();


  const password =
    document
      .getElementById(
        "signupPassword"
      )
      ?.value;


  const confirmPassword =
    document
      .getElementById(
        "signupPasswordConfirm"
      )
      ?.value;


  const message =
    document.getElementById(
      "signupMessage"
    );


  if (
    !email ||
    !password ||
    !confirmPassword
  ) {

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


  if (
    password !==
    confirmPassword
  ) {

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

    email:
      email,

    password:
      password

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
     إذا كان تأكيد البريد مفعّلًا
     فلن تكون هناك جلسة مباشرة.
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
    "تم إنشاء الحساب بنجاح!"
  );
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


  /*
     نستخدم RPC وليس القراءة المباشرة
     من admin_users.
  */

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
   UPDATE HEADER BUTTONS
   ========================================================= */

async function updateUserInterface() {

  const adminButton =
    document.getElementById(
      "adminButton"
    );


  const logoutButton =
    document.getElementById(
      "logoutButton"
    );


  const loginButton =
    document.getElementById(
      "loginButton"
    );


  /* لا يوجد مستخدم */

  if (!currentUser) {

    currentUserIsAdmin = false;


    if (adminButton) {
      adminButton.style.display =
        "none";
    }


    if (logoutButton) {
      logoutButton.style.display =
        "none";
    }


    if (loginButton) {
      loginButton.style.display =
        "inline-block";
    }


    return;
  }


  /* يوجد مستخدم */

  currentUserIsAdmin =
    await isAdmin();


  /*
     زر Admin للـAdmin فقط
  */

  if (adminButton) {

    adminButton.style.display =
      currentUserIsAdmin
        ? "inline-block"
        : "none";
  }


  /*
     زر Logout لأي مستخدم
  */

  if (logoutButton) {

    logoutButton.style.display =
      "inline-block";
  }


  /*
     إخفاء Login بعد الدخول
  */

  if (loginButton) {

    loginButton.style.display =
      "none";
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  const {
    error
  } = await sb.auth.signOut();


  if (error) {

    console.error(
      "Logout error:",
      error
    );

    return;
  }


  currentUser = null;

  currentUserIsAdmin = false;


  await updateUserInterface();

  show("home");
}


/* =========================================================
   OPEN ADMIN DASHBOARD
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
      "ليس لديك صلاحية للوصول إلى لوحة الإدارة."
    );

    show("home");

    return;
  }


  /*
     هنا فقط ندخل للـAdmin
  */

  const adminPage =
    document.getElementById(
      "admin"
    );


  if (adminPage) {
    adminPage.classList.add(
      "active"
    );
  }


  await renderAdmin();
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

async function renderAdmin() {

  const container =
    document.getElementById(
      "adminContent"
    );


  if (!container) {
    return;
  }


  currentUserIsAdmin =
    await isAdmin();


  if (!currentUserIsAdmin) {

    container.innerHTML = `
      <div class="admin-box">
        <p>
          يجب تسجيل الدخول كـ Admin.
        </p>
      </div>
    `;

    return;
  }


  container.innerHTML = `
    <div class="admin-box">
      <p>جاري تحميل الطلبات...</p>
    </div>
  `;


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
      "Orders loading error:",
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


  if (!orderList.length) {

    container.innerHTML = `
      <div class="admin-box">

        <h3>
          الطلبات (0)
        </h3>

        <p>
          لا توجد طلبات حاليًا.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div class="admin-box">

      <h3>
        الطلبات (${orderList.length})
      </h3>

      <div style="overflow-x:auto">

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
                          onclick="
                            changeStatus(
                              '${order.id}',
                              'confirmed'
                            )
                          "
                        >
                          تأكيد
                        </button>

                        <button
                          onclick="
                            changeStatus(
                              '${order.id}',
                              'shipping'
                            )
                          "
                        >
                          شحن
                        </button>

                        <button
                          onclick="
                            changeStatus(
                              '${order.id}',
                              'completed'
                            )
                          "
                        >
                          مكتمل
                        </button>

                        <button
                          onclick="
                            changeStatus(
                              '${order.id}',
                              'cancelled'
                            )
                          "
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

      </div>

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
    .eq(
      "id",
      orderId
    );


  if (error) {

    console.error(
      "Status update error:",
      error
    );


    alert(
      "تعذر تغيير حالة الطلب."
    );

    return;
  }


  await renderAdmin();
}


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange(
  (event, session) => {

    currentUser =
      session?.user || null;


    /*
       نستخدم setTimeout حتى لا نحاول
       تنفيذ طلبات Supabase داخل callback
       الخاص بالـAuth مباشرة.
    */

    setTimeout(async () => {

      if (currentUser) {

        currentUserIsAdmin =
          await isAdmin();

      } else {

        currentUserIsAdmin =
          false;
      }


      await updateUserInterface();

    }, 0);
  }
);


/* =========================================================
   REALTIME ORDERS
   ========================================================= */

sb
  .channel("kriaa-orders")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "orders"
    },
    () => {

      if (
        currentUserIsAdmin &&
        document
          .getElementById("admin")
          ?.classList.contains("active")
      ) {

        renderAdmin();
      }

    }
  )
  .subscribe();


/* =========================================================
   START WEBSITE
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

    } else {

      currentUserIsAdmin =
        false;
    }


  } catch (error) {

    console.error(
      "Startup auth error:",
      error
    );

  }


  await loadProducts();

  await updateUserInterface();

})();
