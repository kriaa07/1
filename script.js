/* KRIAA STORE + ADMIN — Supabase */
const SUPABASE_URL="https://cytadjhcbqkzafvrlyys.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_BuZF3A3tXdXm4V4RlZxAOA_LDiZvavH";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

let products=[],selectedProduct=null,currentCategory="all",currentUser=null,currentUserIsAdmin=false;
let adminTab="dashboard",adminOrders=[],adminItems=[];
const STATUSES={new:"جديد",processing:"قيد المعالجة",confirmed:"تم التأكيد",shipping:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغى"};
const GOVS={
  Tunis:["Tunis","La Marsa","Carthage","Le Bardo","Sidi Bou Said"],Ariana:["Ariana","Raoued","La Soukra","Ettadhamen","Mnihla"],"Ben Arous":["Ben Arous","Hammam Lif","Hammam Chott","Mornag","Rades"],Manouba:["Manouba","Douar Hicher","Oued Ellil","Tebourba","Djedeida"],Nabeul:["Nabeul","Hammamet","Dar Chaabane","Korba","Kelibia","Menzel Temime"],Zaghouan:["Zaghouan","Zriba","El Fahs","Bir Mcherga"],Bizerte:["Bizerte","Menzel Bourguiba","Mateur","Ras Jebel","Sejnane"],Béja:["Béja","Medjez el Bab","Testour","Nefza","Teboursouk"],Jendouba:["Jendouba","Tabarka","Ain Draham","Bou Salem"],"Le Kef":["Le Kef","Dahmani","Tajerouine","Sakiet Sidi Youssef"],Siliana:["Siliana","Bou Arada","Makthar","Gaafour"],Sousse:["Sousse","Msaken","Hammam Sousse","Akouda","Kalaa Kebira"],Monastir:["Monastir","Moknine","Jemmal","Ksar Hellal","Sahline"],Mahdia:["Mahdia","Ksour Essef","Chebba","El Jem","Mellouleche"],Sfax:["Sfax","Sakiet Ezzit","Sakiet Eddaier","Gremda","El Ain","Agareb"],Kairouan:["Kairouan","Haffouz","Oueslatia","Sbikha","Nasrallah"],Kasserine:["Kasserine","Sbeitla","Foussana","Feriana","Thala"],"Sidi Bouzid":["Sidi Bouzid","Meknassy","Regueb","Jilma","Bir El Hafey"],Gabes:["Gabes","Mareth","Metouia","El Hamma","Chenini"],Medenine:["Medenine","Djerba Midoun","Houmt Souk","Zarzis","Ben Gardane"],Tataouine:["Tataouine","Ghomrassen","Remada","Dehiba"],Gafsa:["Gafsa","Metlaoui","Redeyef","Mdhilla","El Guettar"],Tozeur:["Tozeur","Nefta","Degueche","Hazoua"],Kebili:["Kebili","Douz","Souk Lahad","Faouar"]
};

const $=id=>document.getElementById(id);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function money(v){return `${Number(v||0).toFixed(2)} TND`;}
function toast(msg){alert(msg);}

function show(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(id)?.classList.add("active");$("mainNav")?.classList.remove("open");if(id==="portfolio")loadPortfolio();if(id==="admin")openAdminDashboard();}
function toggleMobileMenu(){$("mainNav")?.classList.toggle("open");}
function setCategory(c){currentCategory=c;document.querySelectorAll(".category-btn").forEach(b=>b.classList.toggle("active",b.dataset.category===c));renderProducts();}

async function isAdmin(){
  if(!currentUser){const r=await sb.auth.getUser();currentUser=r.data?.user||null;}
  if(!currentUser)return false;
  const {data,error}=await sb.rpc("check_is_admin");
  if(error){console.error("check_is_admin",error);return false;}
  return data===true;
}

async function updateUserInterface(){
  currentUserIsAdmin=await isAdmin();
  if($("adminButton"))$("adminButton").style.display=currentUserIsAdmin?"inline-block":"none";
  if($("logoutButton"))$("logoutButton").style.display=currentUser?"inline-block":"none";
  if($("loginButton"))$("loginButton").style.display=currentUser?"none":"inline-block";
}

function openLogin(){$("loginModal")?.classList.add("open");}
function closeLogin(){$("loginModal")?.classList.remove("open");}
async function login(){
  const email=$("loginEmail")?.value.trim(),password=$("loginPassword")?.value,msg=$("loginMessage");
  if(!email||!password){if(msg)msg.textContent="أدخل البريد وكلمة المرور.";return;}
  if(msg)msg.textContent="جاري تسجيل الدخول...";
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){if(msg)msg.textContent=error.message;return;}
  currentUser=data.user;await updateUserInterface();closeLogin();show("home");
}
function openSignup(){
  closeLogin();
  let m=$("signupModal");
  if(!m){m=document.createElement("div");m.id="signupModal";m.className="modal";m.innerHTML=`<div class="modal-box"><button class="close-modal" onclick="closeSignup()">×</button><span class="eyebrow">KRIAA</span><h2>إنشاء حساب</h2><input id="signupEmail" type="email" placeholder="البريد الإلكتروني"><input id="signupPassword" type="password" placeholder="كلمة المرور"><input id="signupPasswordConfirm" type="password" placeholder="تأكيد كلمة المرور"><button class="primary-btn full" onclick="signup()">إنشاء الحساب</button><p id="signupMessage"></p><button class="secondary-btn full" onclick="backToLogin()">لدي حساب</button></div>`;document.body.appendChild(m);}
  m.classList.add("open");
}
function closeSignup(){$("signupModal")?.classList.remove("open");}
function backToLogin(){closeSignup();openLogin();}
async function signup(){
  const email=$("signupEmail")?.value.trim(),p=$("signupPassword")?.value,c=$("signupPasswordConfirm")?.value,msg=$("signupMessage");
  if(!email||!p||!c){msg.textContent="أكمل المعلومات.";return;} if(p.length<6){msg.textContent="كلمة المرور 6 أحرف على الأقل.";return;} if(p!==c){msg.textContent="كلمتا المرور غير متطابقتين.";return;}
  msg.textContent="جاري إنشاء الحساب...";const {data,error}=await sb.auth.signUp({email,password:p});
  if(error){msg.textContent=error.message;return;}
  if(!data.session){msg.textContent="تم إنشاء الحساب. تحقق من البريد الإلكتروني إذا كان تأكيد البريد مفعّلًا.";return;}
  currentUser=data.user;await updateUserInterface();closeSignup();show("home");toast("تم إنشاء الحساب بنجاح");
}
async function logout(){await sb.auth.signOut();currentUser=null;currentUserIsAdmin=false;await updateUserInterface();show("home");}

async function loadProducts(){
  const {data,error}=await sb.from("products").select("*").eq("active",true).order("position",{ascending:true}).order("created_at",{ascending:false});
  if(error){console.error(error);$("productsContainer").innerHTML="<p>حدث خطأ في تحميل المنتجات.</p>";return;}products=data||[];renderProducts();
}
function renderProducts(){
  const el=$("productsContainer");
  if(!el)return;
  const q=($("searchInput")?.value||"").trim().toLowerCase();
  const list=products.filter(p=>
    (currentCategory==="all"||p.category===currentCategory)&&
    (!q||(p.name||"").toLowerCase().includes(q)||(p.description||"").toLowerCase().includes(q))
  );
  if(!list.length){el.innerHTML="<p>لا توجد منتجات حاليًا.</p>";return;}
  el.innerHTML=list.map((p,index)=>{
    const badge=p.badge?`<span class="badge">${esc(p.badge)}</span>`:"";
    const description=p.description?`<p>${esc(p.description)}</p>`:"";
    const oldPrice=p.old_price?`<span class="old-price">${money(p.old_price)}</span>`:"";
    const featured=p.featured?`<small class="featured-label">★ Featured</small>`:"";
    return `<article class="product-card reveal" tabindex="0" role="button" aria-label="${esc(p.name)}" onclick="openOrder('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openOrder('${p.id}')}" style="--reveal-delay:${Math.min(index,7)*45}ms"><div class="product-media">${badge}<img class="product-image" loading="lazy" decoding="async" src="${esc(p.image_url||"https://placehold.co/700x700?text=KRIAA")}" alt="${esc(p.name)}"></div><div class="product-info"><h3>${esc(p.name)}</h3>${description}<div class="price">${money(p.price)} ${oldPrice}</div>${featured}<button class="product-btn" onclick="event.stopPropagation();openOrder('${p.id}')">اطلب الآن</button></div></article>`;
  }).join("");
  requestAnimationFrame(()=>document.querySelectorAll('#productsContainer .reveal').forEach(el=>el.classList.add('is-visible')));
}

function populateGovernorates(){const s=$("orderGovernorate");if(!s)return;s.innerHTML='<option value="">اختر الولاية</option>'+Object.keys(GOVS).map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join("");s.onchange=()=>populateCities(s.value);}
function populateCities(g){const s=$("orderCity");if(!s)return;s.innerHTML='<option value="">اختر المدينة</option>'+(GOVS[g]||[]).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");}
function openOrder(id){
  selectedProduct=products.find(p=>p.id===id);if(!selectedProduct)return;
  $("orderTitle").textContent="طلب "+selectedProduct.name;$("orderSummary").textContent=`السعر: ${money(selectedProduct.price)}`;
  $("orderSize").innerHTML='<option value="">اختر المقاس</option>'+(selectedProduct.sizes||["S","M","L","XL","XXL"]).map(x=>`<option>${esc(x)}</option>`).join("");
  $("orderColor").innerHTML='<option value="">اختر اللون</option>'+(selectedProduct.colors||[]).map(x=>`<option>${esc(x)}</option>`).join("");
  $("orderQuantity").max=selectedProduct.stock||1;$("orderQuantity").value=1;$("orderMessage").textContent="";populateGovernorates();$("orderCity").innerHTML='<option value="">اختر المدينة</option>';$('orderModal').classList.add("open");
}
function closeOrder(){$("orderModal")?.classList.remove("open");}
async function submitOrder(){
  if(!selectedProduct)return;

  const name=$("orderUsername").value.trim();
  const size=$("orderSize").value;
  const color=$("orderColor").value;
  const qty=Math.max(1,Number($("orderQuantity").value||1));
  const whatsapp=$("orderWhatsApp").value.trim();
  const gov=$("orderGovernorate").value;
  const city=$("orderCity").value;
  const msg=$("orderMessage");

  if(!name||!size||!whatsapp||!gov||!city){
    msg.textContent="أكمل المعلومات المطلوبة.";
    return;
  }

  if(selectedProduct.stock<qty){
    msg.textContent="الكمية المطلوبة غير متوفرة.";
    return;
  }

  msg.textContent="جاري إرسال الطلب...";

  // ننشئ UUID للطلب محليًا حتى لا نحتاج SELECT بعد INSERT.
  // هذا مهم للزائر anon لأن لديه صلاحية INSERT فقط على orders.
  const orderId=(window.crypto&&typeof crypto.randomUUID==="function")
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
        const r=Math.random()*16|0;
        const v=c==="x"?r:(r&3|8);
        return v.toString(16);
      });

  const total=Number(selectedProduct.price)*qty;

  const {error:orderError}=await sb.from("orders").insert({
    id:orderId,
    customer_name:name,
    whatsapp,
    governorate:gov,
    city,
    total,
    user_id:currentUser?.id||null
  });

  if(orderError){
    console.error("ORDER ERROR:",orderError);
    msg.textContent="تعذر إرسال الطلب: "+orderError.message;
    return;
  }

  const {error:itemError}=await sb.from("order_items").insert({
    order_id:orderId,
    product_id:selectedProduct.id,
    product_name:selectedProduct.name,
    size,
    quantity:qty,
    price:Number(selectedProduct.price),
    color:color||null
  });

  if(itemError){
    console.error("ORDER ITEM ERROR:",itemError);
    msg.textContent="تم إنشاء الطلب لكن حدث خطأ في تفاصيل المنتج.";
    return;
  }

  const {data:stockOk,error:stockError}=await sb.rpc(
    "decrement_product_stock",
    {p_product_id:selectedProduct.id,p_quantity:qty}
  );

  if(stockError){
    console.error("STOCK ERROR:",stockError);
  }

  if(stockOk===false){
    console.warn("Stock was not decremented because quantity was no longer available.");
  }

  msg.textContent="تم إرسال طلبك بنجاح!";
  setTimeout(closeOrder,1200);
  loadProducts();
}

async function openAdminDashboard(){if(!currentUser){openLogin();return;}currentUserIsAdmin=await isAdmin();if(!currentUserIsAdmin){toast("ليس لديك صلاحية Admin");show("home");return;}showAdminPage();switchAdminTab(adminTab||"dashboard");}
function showAdminPage(){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$("admin")?.classList.add("active");}
function switchAdminTab(tab){if(!currentUserIsAdmin){openAdminDashboard();return;}adminTab=tab;document.querySelectorAll(".admin-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));const titles={dashboard:"Dashboard",products:"CLOTHES / المنتجات",orders:"ORDERS / الطلبات",portfolioAdmin:"PORTFOLIO",settings:"SETTINGS"};$("adminTitle").textContent=titles[tab]||"Dashboard";if(tab==="dashboard")renderDashboard();if(tab==="products")renderProductsAdmin();if(tab==="orders")renderOrdersAdmin();if(tab==="portfolioAdmin")renderPortfolioAdmin();if(tab==="settings")renderSettingsAdmin();}

async function getOrders(){const {data,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});if(error)throw error;return data||[];}
async function getOrderItems(){const {data,error}=await sb.from("order_items").select("*");if(error)throw error;return data||[];}
async function renderDashboard(){
  const el=$("adminContent");el.innerHTML='<div class="loading-box">جاري تحميل الإحصائيات...</div>';
  try{const orders=await getOrders(),items=await getOrderItems();const activeProducts=(await sb.from("products").select("id,stock",{count:"exact"}).eq("active",true)).data||[];const today=new Date();today.setHours(0,0,0,0);const todayOrders=orders.filter(o=>new Date(o.created_at)>=today);const sales=orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total||0),0);const low=activeProducts.filter(p=>Number(p.stock)<=5).length;const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const next=new Date(d);next.setDate(d.getDate()+1);days.push({label:`${d.getDate()}/${d.getMonth()+1}`,count:orders.filter(o=>new Date(o.created_at)>=d&&new Date(o.created_at)<next).length,sales:orders.filter(o=>o.status!=="cancelled"&&new Date(o.created_at)>=d&&new Date(o.created_at)<next).reduce((s,o)=>s+Number(o.total||0),0)});}const max=Math.max(1,...days.map(d=>d.count));
    el.innerHTML=`<div class="stats-grid"><div class="stat-card"><small>الطلبات اليوم</small><strong>${todayOrders.length}</strong></div><div class="stat-card"><small>إجمالي الطلبات</small><strong>${orders.length}</strong></div><div class="stat-card"><small>المبيعات</small><strong>${sales.toFixed(2)}</strong><small>TND</small></div><div class="stat-card"><small>المنتجات</small><strong>${activeProducts.length}</strong></div><div class="stat-card"><small>قليلة المخزون</small><strong>${low}</strong></div></div><div class="admin-grid"><div class="admin-box"><h3>الطلبات — آخر 7 أيام</h3><div class="chart">${days.map(d=>`<div class="bar-wrap"><strong>${d.count}</strong><div class="bar" style="height:${Math.max(3,d.count/max*160)}px"></div><span class="bar-label">${d.label}</span></div>`).join("")}</div></div><div class="admin-box"><h3>المبيعات — آخر 7 أيام</h3><div class="chart">${days.map(d=>{const mx=Math.max(1,...days.map(x=>x.sales));return `<div class="bar-wrap"><strong>${d.sales.toFixed(0)}</strong><div class="bar" style="height:${Math.max(3,d.sales/mx*160)}px"></div><span class="bar-label">${d.label}</span></div>`}).join("")}</div></div></div><div class="admin-box"><h3>آخر الطلبات</h3>${orders.slice(0,5).map(orderRowCompact).join("")||'<div class="empty">لا توجد طلبات</div>'}</div>`;
  }catch(e){console.error(e);el.innerHTML=`<div class="admin-box"><p>تعذر تحميل Dashboard.</p><small>${esc(e.message)}</small></div>`;}
}
function orderRowCompact(o){return `<div class="product-admin-row"><div><span class="status-badge status-${esc(o.status)}">${STATUSES[o.status]||esc(o.status)}</span></div><div><b>${esc(o.customer_name)}</b><br><small>${esc(o.governorate||"")} — ${esc(o.city||"")} · ${money(o.total)}</small></div><button class="mini-btn" onclick="switchAdminTab('orders')">فتح</button></div>`;}

async function renderProductsAdmin(){
  const el=$("adminContent");el.innerHTML='<div class="loading-box">جاري تحميل المنتجات...</div>';const {data,error}=await sb.from("products").select("*").order("position",{ascending:true}).order("created_at",{ascending:false});if(error){el.innerHTML=`<div class="admin-box">${esc(error.message)}</div>`;return;}
  const list=data||[];el.innerHTML=`<div class="admin-top-actions"><button class="primary-btn" onclick="openProductEditor()">＋ إضافة منتج جديد</button></div><div class="admin-box"><h3>المنتجات (${list.length})</h3>${list.map((p,i)=>`<div class="product-admin-row"><img src="${esc(p.image_url||'https://placehold.co/100x100?text=KRIAA')}" alt=""><div><b>${esc(p.name)}</b> ${p.badge?`<span class="badge">${esc(p.badge)}</span>`:""}<br><small>${money(p.price)} · Stock: ${p.stock} · ${p.active?'ظاهر':'مخفي'} ${p.featured?'· ★ Featured':''}</small></div><div class="admin-actions"><button onclick="openProductEditor('${p.id}')">✏️</button><button onclick="toggleProduct('${p.id}',${!p.active})">${p.active?'👁️':'🙈'}</button><button onclick="moveProduct('${p.id}',-1)">↑</button><button onclick="moveProduct('${p.id}',1)">↓</button><button class="danger" onclick="deleteProduct('${p.id}')">🗑️</button></div></div>`).join("")||'<div class="empty">لا توجد منتجات.</div>'}</div>`;
}
function closeEditor(){$("editorModal")?.classList.remove("open");}
async function openProductEditor(id=null){
  const p=id?(await sb.from("products").select("*").eq("id",id).single()).data:null;selectedProduct=p;const x=p||{name:"",description:"",price:0,old_price:"",category:"tshirts",sizes:["S","M","L","XL","XXL"],colors:[],stock:0,image_url:"",badge:"",featured:false,active:true,position:0};
  $("editorContent").innerHTML=`<span class="eyebrow">KRIAA CLOTHES</span><h2>${id?'تعديل المنتج':'إضافة منتج'}</h2><div class="admin-form"><div class="form-grid"><input id="pName" value="${esc(x.name)}" placeholder="اسم المنتج"><select id="pCategory"><option value="tshirts">T-SHIRTS</option><option value="hoodies">HOODIES</option><option value="autres">AUTRES</option></select><input id="pPrice" type="number" step="0.01" value="${x.price??0}" placeholder="السعر"><input id="pOldPrice" type="number" step="0.01" value="${x.old_price??''}" placeholder="السعر القديم"><input id="pBadge" value="${esc(x.badge||'')}" placeholder="Badge: NEW / SALE / LIMITED"><input id="pStock" type="number" min="0" value="${x.stock??0}" placeholder="Stock"><input id="pSizes" class="form-full" value="${esc((x.sizes||[]).join(', '))}" placeholder="المقاسات: S, M, L, XL, XXL"><input id="pColors" class="form-full" value="${esc((x.colors||[]).join(', '))}" placeholder="الألوان: Black, White, Red"><textarea id="pDescription" class="form-full" rows="4" placeholder="وصف المنتج">${esc(x.description||'')}</textarea><input id="pImageUrl" class="form-full" value="${esc(x.image_url||'')}" placeholder="رابط الصورة أو ارفع صورة أسفل"><input id="pImageFile" class="form-full" type="file" accept="image/*"><label class="checkbox-row"><input id="pFeatured" type="checkbox" ${x.featured?'checked':''}> Featured</label><label class="checkbox-row"><input id="pActive" type="checkbox" ${x.active!==false?'checked':''}> إظهار المنتج</label></div><button class="primary-btn full" onclick="saveProduct('${id||''}')">حفظ المنتج</button></div>`;$("editorModal").classList.add("open");$("pCategory").value=x.category||"autres";
}
async function uploadImage(file,bucket){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;}
async function saveProduct(id){try{const file=$("pImageFile").files[0];let image=$("pImageUrl").value.trim();if(file)image=await uploadImage(file,'product-images');const payload={name:$("pName").value.trim(),description:$("pDescription").value.trim(),price:Number($("pPrice").value||0),old_price:$("pOldPrice").value?Number($("pOldPrice").value):null,category:$("pCategory").value,sizes:$("pSizes").value.split(',').map(x=>x.trim()).filter(Boolean),colors:$("pColors").value.split(',').map(x=>x.trim()).filter(Boolean),stock:Math.max(0,Number($("pStock").value||0)),badge:$("pBadge").value.trim(),featured:$("pFeatured").checked,active:$("pActive").checked,image_url:image};let r=id?await sb.from("products").update(payload).eq("id",id):await sb.from("products").insert(payload);if(r.error)throw r.error;closeEditor();toast("تم حفظ المنتج");renderProductsAdmin();loadProducts();}catch(e){console.error(e);toast("تعذر حفظ المنتج: "+e.message);}}
async function deleteProduct(id){if(!confirm("حذف المنتج؟"))return;const {error}=await sb.from("products").delete().eq("id",id);if(error){toast("تعذر الحذف: "+error.message);return;}renderProductsAdmin();loadProducts();}
async function toggleProduct(id,active){const {error}=await sb.from("products").update({active}).eq("id",id);if(error)toast(error.message);else renderProductsAdmin();}
async function moveProduct(id,direction){const {data}=await sb.from("products").select("id,position").order("position",{ascending:true});const i=(data||[]).findIndex(x=>x.id===id),j=i+direction;if(i<0||j<0||j>=data.length)return;const a=data[i],b=data[j];await sb.from("products").update({position:b.position}).eq("id",a.id);await sb.from("products").update({position:a.position}).eq("id",b.id);renderProductsAdmin();loadProducts();}

async function renderOrdersAdmin(){
  const el=$("adminContent");el.innerHTML='<div class="loading-box">جاري تحميل الطلبات...</div>';try{adminOrders=await getOrders();adminItems=await getOrderItems();drawOrdersTable();}catch(e){console.error(e);el.innerHTML=`<div class="admin-box"><p>تعذر تحميل الطلبات.</p><small>${esc(e.message)}</small></div>`;}
}
function drawOrdersTable(){const el=$("adminContent");const q=($("orderSearch")?.value||"").toLowerCase();const f=$("orderFilter")?.value||"all";const list=adminOrders.filter(o=>(f==="all"||o.status===f)&&(!q||`${o.customer_name} ${o.whatsapp} ${o.city} ${o.governorate}`.toLowerCase().includes(q)));el.innerHTML=`<div class="admin-box"><div class="admin-filters"><input id="orderSearch" value="${esc(q)}" oninput="drawOrdersTable()" placeholder="ابحث عن طلب / اسم / رقم"><select id="orderFilter" onchange="drawOrdersTable()"><option value="all">كل الحالات</option>${Object.entries(STATUSES).map(([k,v])=>`<option value="${k}" ${f===k?'selected':''}>${v}</option>`).join("")}</select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>العميل</th><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>المكان</th><th>التاريخ</th><th>الحالة</th><th>WhatsApp</th><th>إجراء</th></tr></thead><tbody>${list.map(o=>{const its=adminItems.filter(i=>i.order_id===o.id);return `<tr><td><b>${esc(o.customer_name)}</b><br><small>${esc(o.whatsapp)}</small></td><td>${its.map(i=>esc(i.product_name)).join('<br>')||'-'}</td><td>${its.map(i=>esc(i.size)).join('<br>')||'-'}</td><td>${its.map(i=>esc(i.color||'-')).join('<br>')||'-'}</td><td>${its.map(i=>i.quantity).join('<br>')||'-'}</td><td>${esc(o.governorate||'')}<br>${esc(o.city||'')}</td><td>${new Date(o.created_at).toLocaleString('fr-TN')}</td><td><select onchange="changeOrderStatus('${o.id}',this.value)">${Object.entries(STATUSES).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join("")}</select></td><td><a class="whatsapp" target="_blank" href="https://wa.me/${encodeURIComponent(String(o.whatsapp).replace(/\D/g,''))}">فتح</a></td><td><button class="mini-btn" onclick="archiveOrder('${o.id}',${!o.archived})">${o.archived?'إلغاء الأرشفة':'أرشفة'}</button><button class="mini-btn danger" onclick="deleteOrder('${o.id}')">حذف</button></td></tr>`}).join("")||'<tr><td colspan="10" class="empty">لا توجد طلبات مطابقة.</td></tr>'}</tbody></table></div></div>`;}
async function changeOrderStatus(id,status){const {error}=await sb.from("orders").update({status}).eq("id",id);if(error)toast(error.message);else renderOrdersAdmin();}
async function archiveOrder(id,archived){const {error}=await sb.from("orders").update({archived}).eq("id",id);if(error)toast(error.message);else renderOrdersAdmin();}
async function deleteOrder(id){if(!confirm("حذف الطلب نهائيًا؟"))return;const {error}=await sb.from("orders").delete().eq("id",id);if(error)toast(error.message);else renderOrdersAdmin();}

async function loadPortfolio(){const {data,error}=await sb.from("portfolio").select("*").eq("active",true).order("position",{ascending:true});const el=$("portfolioContainer");if(!el)return;if(error){el.innerHTML="<p>تعذر تحميل Portfolio.</p>";return;}el.innerHTML=(data||[]).map(p=>`<article class="portfolio-card">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.title)}">`:''}<div class="p-body"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></div></article>`).join("")||'<p>لا توجد أعمال.</p>';}
async function renderPortfolioAdmin(){const {data,error}=await sb.from("portfolio").select("*").order("position",{ascending:true});const el=$("adminContent");if(error){el.innerHTML=`<div class="admin-box">${esc(error.message)}</div>`;return;}el.innerHTML=`<div class="admin-top-actions"><button class="primary-btn" onclick="openPortfolioEditor()">＋ إضافة صورة</button></div><div class="admin-box">${(data||[]).map(p=>`<div class="product-admin-row"><img src="${esc(p.image_url||'https://placehold.co/100x100?text=KRIAA')}" alt=""><div><b>${esc(p.title)}</b><br><small>${esc(p.description)}</small></div><div class="admin-actions"><button onclick="openPortfolioEditor('${p.id}')">✏️</button><button onclick="togglePortfolio('${p.id}',${!p.active})">${p.active?'👁️':'🙈'}</button><button class="danger" onclick="deletePortfolio('${p.id}')">🗑️</button></div></div>`).join("")||'<div class="empty">لا توجد صور.</div>'}</div>`;}
async function openPortfolioEditor(id=null){const p=id?(await sb.from("portfolio").select("*").eq("id",id).single()).data:null;const x=p||{title:'',description:'',image_url:'',active:true,position:0};$("editorContent").innerHTML=`<span class="eyebrow">PORTFOLIO</span><h2>${id?'تعديل الصورة':'إضافة صورة'}</h2><div class="admin-form"><input id="pfTitle" value="${esc(x.title)}" placeholder="العنوان"><textarea id="pfDescription" rows="4" placeholder="الوصف">${esc(x.description)}</textarea><input id="pfUrl" value="${esc(x.image_url||'')}" placeholder="رابط الصورة"><input id="pfFile" type="file" accept="image/*"><label class="checkbox-row"><input id="pfActive" type="checkbox" ${x.active!==false?'checked':''}> إظهار</label><button class="primary-btn full" onclick="savePortfolio('${id||''}')">حفظ</button></div>`;$("editorModal").classList.add("open");}
async function savePortfolio(id){try{const f=$("pfFile").files[0];let url=$("pfUrl").value.trim();if(f)url=await uploadImage(f,'portfolio-images');const payload={title:$("pfTitle").value.trim(),description:$("pfDescription").value.trim(),image_url:url,active:$("pfActive").checked};const r=id?await sb.from("portfolio").update(payload).eq("id",id):await sb.from("portfolio").insert(payload);if(r.error)throw r.error;closeEditor();renderPortfolioAdmin();loadPortfolio();}catch(e){toast("تعذر حفظ الصورة: "+e.message);}}
async function togglePortfolio(id,active){const {error}=await sb.from("portfolio").update({active}).eq("id",id);if(error)toast(error.message);else renderPortfolioAdmin();}
async function deletePortfolio(id){if(!confirm("حذف الصورة؟"))return;const {error}=await sb.from("portfolio").delete().eq("id",id);if(error)toast(error.message);else renderPortfolioAdmin();}

async function renderSettingsAdmin(){const {data,error}=await sb.from("store_settings").select("*").eq("id",1).single();const el=$("adminContent");if(error){el.innerHTML=`<div class="admin-box">${esc(error.message)}</div>`;return;}const s=data||{};el.innerHTML=`<div class="admin-box"><h3>إعدادات المتجر</h3><div class="admin-form"><div class="form-grid"><input id="sName" value="${esc(s.store_name||'KRIAA')}" placeholder="اسم المتجر"><input id="sCurrency" value="${esc(s.currency||'TND')}" placeholder="العملة"><input id="sLogo" class="form-full" value="${esc(s.logo_url||'')}" placeholder="رابط Logo"><input id="sLogoFile" class="form-full" type="file" accept="image/*"><input id="sSizes" class="form-full" value="${esc((s.default_sizes||[]).join(', '))}" placeholder="المقاسات الافتراضية"><input id="sColors" class="form-full" value="${esc((s.default_colors||[]).join(', '))}" placeholder="الألوان الافتراضية"><textarea id="sDelivery" class="form-full" rows="3" placeholder="إعدادات التوصيل">${esc(s.delivery_text||'')}</textarea><textarea id="sOrder" class="form-full" rows="3" placeholder="إعدادات الطلب">${esc(s.order_text||'')}</textarea></div><button class="primary-btn full" onclick="saveSettings()">حفظ الإعدادات</button></div></div><div class="admin-box"><h3>الحساب</h3><p>${esc(currentUser?.email||'')}</p><button class="secondary-btn" onclick="logout()">تسجيل الخروج</button></div>`;}
async function saveSettings(){try{const f=$("sLogoFile").files[0];let logo=$("sLogo").value.trim();if(f)logo=await uploadImage(f,'store-assets');const payload={store_name:$("sName").value.trim()||'KRIAA',currency:$("sCurrency").value.trim()||'TND',logo_url:logo,default_sizes:$("sSizes").value.split(',').map(x=>x.trim()).filter(Boolean),default_colors:$("sColors").value.split(',').map(x=>x.trim()).filter(Boolean),delivery_text:$("sDelivery").value.trim(),order_text:$("sOrder").value.trim(),updated_at:new Date().toISOString()};const {error}=await sb.from("store_settings").upsert({...payload,id:1});if(error)throw error;toast("تم حفظ الإعدادات");loadSettings();}catch(e){toast("تعذر حفظ الإعدادات: "+e.message);}}
async function loadSettings(){const {data}=await sb.from("store_settings").select("*").eq("id",1).single();if(data){$("heroStoreName").textContent=data.store_name||"KRIAA";document.title=data.store_name||"KRIAA";}}

sb.auth.onAuthStateChange((_event,session)=>{setTimeout(async()=>{currentUser=session?.user||null;currentUserIsAdmin=await isAdmin();await updateUserInterface();},0);});
sb.channel("kriaa-orders").on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>{if(currentUserIsAdmin&&adminTab) {if(adminTab==='dashboard')renderDashboard();if(adminTab==='orders')renderOrdersAdmin();}}).subscribe();

(async function start(){try{const {data}=await sb.auth.getUser();currentUser=data?.user||null;currentUserIsAdmin=await isAdmin();}catch(e){console.error(e);}populateGovernorates();await loadSettings();await loadProducts();await loadPortfolio();await updateUserInterface();})();
