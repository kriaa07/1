const SUPABASE_URL = 'https://cytadjhcbqkzafvrlyys.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BuZF3A3tXdXm4V4RlZxAOA_LDiZvavH';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let products = [];
let currentCategory = "all";
let selectedProduct = null;
let currentUser = null;

function show(id){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  const page=document.getElementById(id);
  if(page) page.classList.add("active");
  document.getElementById("mainNav")?.classList.remove("open");
  if(id==="admin") renderAdmin();
}
function toggleMobileMenu(){document.getElementById("mainNav")?.classList.toggle("open")}
function setCategory(c){
  currentCategory=c;
  document.querySelectorAll(".category-btn").forEach(b=>b.classList.toggle("active",b.dataset.category===c));
  renderProducts();
}

async function loadProducts(){
  const {data,error}=await sb.from("products").select("*").eq("active",true).order("position").order("created_at",{ascending:false});
  if(error){console.error(error);document.getElementById("productsContainer").innerHTML="<p>حدث خطأ في تحميل المنتجات.</p>";return;}
  products=data||[];
  renderProducts();
}

function renderProducts(){
  const q=(document.getElementById("searchInput")?.value||"").trim().toLowerCase();
  let list=products.filter(p=>
    (currentCategory==="all"||p.category===currentCategory) &&
    (!q || (p.name||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q))
  );
  const el=document.getElementById("productsContainer");
  if(!list.length){el.innerHTML="<p>لا توجد منتجات حاليًا.</p>";return;}
  el.innerHTML=list.map(p=>{
    const img=p.image_url||"https://placehold.co/700x700?text=KRIAA";
    return `<article class="product-card">
      <img class="product-image" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}">
      <div class="product-info">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description||"")}</p>
        <div class="price">${Number(p.price).toFixed(2)} DT ${p.old_price?`<span class="old-price">${Number(p.old_price).toFixed(2)} DT</span>`:""}</div>
        <button class="product-btn" onclick="openOrder('${p.id}')">اطلب الآن</button>
      </div>
    </article>`;
  }).join("");
}

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function openOrder(id){
  selectedProduct=products.find(p=>p.id===id);
  if(!selectedProduct)return;
  document.getElementById("orderTitle").textContent="طلب "+selectedProduct.name;
  document.getElementById("orderSummary").textContent=`السعر: ${Number(selectedProduct.price).toFixed(2)} DT`;
  const sizes=selectedProduct.sizes?.length?selectedProduct.sizes:["S","M","L","XL","XXL"];
  document.getElementById("orderSize").innerHTML='<option value="">اختر المقاس</option>'+sizes.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  document.getElementById("orderMessage").textContent="";
  document.getElementById("orderModal").classList.add("open");
}
function closeOrder(){document.getElementById("orderModal").classList.remove("open")}

async function submitOrder(){
  if(!selectedProduct)return;
  const customer_name=document.getElementById("orderUsername").value.trim();
  const size=document.getElementById("orderSize").value;
  const whatsapp=document.getElementById("orderWhatsApp").value.trim();
  const city=document.getElementById("orderCity").value;
  const msg=document.getElementById("orderMessage");
  if(!customer_name||!size||!whatsapp||!city){msg.textContent="أكمل جميع المعلومات المطلوبة.";return;}
  msg.textContent="جاري إرسال الطلب...";
  const total=Number(selectedProduct.price);
  const {data:order,error}=await sb.from("orders").insert({customer_name,whatsapp,city,total}).select("id").single();
  if(error){console.error(error);msg.textContent="تعذر إرسال الطلب.";return;}
  const {error:itemError}=await sb.from("order_items").insert({
    order_id:order.id,product_id:selectedProduct.id,product_name:selectedProduct.name,
    size,quantity:1,price:Number(selectedProduct.price)
  });
  if(itemError){console.error(itemError);msg.textContent="تم إنشاء الطلب لكن حدث خطأ في التفاصيل.";return;}
  msg.textContent="تم إرسال طلبك بنجاح!";
  setTimeout(closeOrder,1200);
}

function openLogin(){document.getElementById("loginModal").classList.add("open")}
function closeLogin(){document.getElementById("loginModal").classList.remove("open")}

async function login(){
  const email=document.getElementById("loginEmail").value.trim();
  const password=document.getElementById("loginPassword").value;
  const msg=document.getElementById("loginMessage");
  msg.textContent="جاري تسجيل الدخول...";
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){msg.textContent=error.message;return;}
  currentUser=data.user;
  const admin=await isAdmin();
  if(!admin){await sb.auth.signOut();msg.textContent="هذا الحساب ليس Admin.";return;}
  closeLogin(); updateAdminButtons(); show("admin"); renderAdmin();
}

async function isAdmin(){
  if(!currentUser){const r=await sb.auth.getUser();currentUser=r.data.user;}
  if(!currentUser)return false;
  const {data,error}=await sb.from("admin_users").select("user_id").eq("user_id",currentUser.id).maybeSingle();
  return !error && !!data;
}

async function updateAdminButtons(){
  const admin=await isAdmin();
  document.getElementById("adminButton").style.display=admin?"inline-block":"none";
  document.getElementById("logoutButton").style.display=admin?"inline-block":"none";
  document.getElementById("loginButton").style.display=admin?"none":"inline-block";
}

async function logout(){
  await sb.auth.signOut();currentUser=null;updateAdminButtons();show("home");
}

async function renderAdmin(){
  const ok=await isAdmin();
  const el=document.getElementById("adminContent");
  if(!ok){el.innerHTML="<div class='admin-box'><p>يجب تسجيل الدخول كـ Admin.</p></div>";return;}
  const {data:orders,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});
  if(error){el.innerHTML="<div class='admin-box'>تعذر تحميل الطلبات.</div>";return;}
  el.innerHTML=`<div class="admin-box"><h3>الطلبات (${orders?.length||0})</h3>
  <table class="admin-table"><thead><tr><th>العميل</th><th>WhatsApp</th><th>الولاية</th><th>المجموع</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
  <tbody>${(orders||[]).map(o=>`<tr><td>${escapeHtml(o.customer_name)}</td><td>${escapeHtml(o.whatsapp)}</td><td>${escapeHtml(o.city)}</td><td>${Number(o.total).toFixed(2)} DT</td><td><span class="status">${escapeHtml(o.status)}</span></td><td>${new Date(o.created_at).toLocaleString("fr-TN")}</td><td class="admin-actions"><button onclick="changeStatus('${o.id}','confirmed')">تأكيد</button><button onclick="changeStatus('${o.id}','shipping')">شحن</button><button onclick="changeStatus('${o.id}','completed')">مكتمل</button><button onclick="changeStatus('${o.id}','cancelled')">إلغاء</button></td></tr>`).join("")}</tbody></table></div>`;
}

async function changeStatus(id,status){
  const {error}=await sb.from("orders").update({status}).eq("id",id);
  if(error)alert("تعذر تغيير الحالة");
  else renderAdmin();
}

sb.auth.onAuthStateChange(async (_event,session)=>{
  currentUser=session?.user||null;
  await updateAdminButtons();
});

(async()=>{
  await loadProducts();
  await updateAdminButtons();
  const channel=sb.channel("kriaa-orders").on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>renderAdmin()).subscribe();
})();
