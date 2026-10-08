
/* =====================================================================
   KRIAA — PRODUCT PAGE + DIRECT CHECKOUT  (à coller à la FIN de script.js)
   - Aucune fonction existante n'est supprimée.
   - renderProducts() et loadSettings() sont redéfinies (la dernière déclaration gagne).
   - Même système de commandes : tables orders / order_items + rpc decrement_product_stock.
   ===================================================================== */

// Numéro WhatsApp du magasin (format 216XXXXXXXX). Laisser "" pour utiliser store_settings.whatsapp si présent,
// sinon wa.me s'ouvre sans destinataire et le client choisit le contact.
const KRIAA_WHATSAPP = "";
// La table orders n'a pas de colonne "adresse". Si vous en ajoutez une (ex: "address"), mettez son nom ici.
// Sinon l'adresse est ajoutée à la colonne city sous la forme "Ville — Rue…" (visible dans l'Admin).
const KRIAA_ADDRESS_COLUMN = null;

let storeSettings = {};
let draft = { product: null, size: "", color: "", qty: 1 };
let kxImgs = [], kxLbIndex = 0;

/* ---------- helpers ---------- */
function kxList(v){
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
  return [];
}
function kxPrice(v){
  const n = Number(v || 0), cur = storeSettings.currency || "TND";
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ${cur === "TND" ? "DT" : cur}`;
}
function productImages(p){
  let a = [];
  if (Array.isArray(p.images)) a = p.images;
  else if (typeof p.images === "string" && p.images.trim()) {
    try { a = JSON.parse(p.images); } catch(e){ a = p.images.split(/[\n,]/); }
  }
  a = a.map(x => String(x || "").trim()).filter(Boolean);
  if (p.image_url) a.unshift(String(p.image_url).trim());
  a = [...new Set(a)];
  return a.length ? a : ["https://placehold.co/900x1100?text=KRIAA"];
}
function kxHighlights(p){
  const h = p.highlights;
  if (Array.isArray(h)) return h.map(x => String(x).trim()).filter(Boolean);
  if (typeof h === "string") return h.split(/[\n;]/).map(x => x.trim()).filter(Boolean);
  return [];
}

/* ---------- settings (même table, on garde aussi les valeurs) ---------- */
async function loadSettings(){
  const {data} = await sb.from("store_settings").select("*").eq("id",1).single();
  if (data) {
    storeSettings = data;
    if ($("heroStoreName")) $("heroStoreName").textContent = data.store_name || "KRIAA";
    document.title = data.store_name || "KRIAA";
  }
}

/* ---------- shop grid : la carte ouvre la page produit ---------- */
function renderProducts(){
  const el = $("productsContainer"); if (!el) return;
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const list = products.filter(p => (currentCategory === "all" || p.category === currentCategory) &&
    (!q || (p.name||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q)));
  if (!list.length) { el.innerHTML = "<p>لا توجد منتجات حاليًا.</p>"; return; }
  el.innerHTML = list.map(p => `<article class="product-card">
    <img class="product-image" style="cursor:pointer" onclick="openProduct('${p.id}')" src="${esc(p.image_url || "https://placehold.co/700x700?text=KRIAA")}" alt="${esc(p.name)}">
    <div class="product-info">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
      <h3 style="cursor:pointer" onclick="openProduct('${p.id}')">${esc(p.name)}</h3>
      <p>${esc(p.description || "")}</p>
      <div class="price">${money(p.price)} ${p.old_price ? `<span class="old-price">${money(p.old_price)}</span>` : ""}</div>
      ${p.featured ? "<small>★ Featured</small>" : ""}
      <button class="product-btn" onclick="openProduct('${p.id}')">اطلب الآن</button>
    </div></article>`).join("");
}

/* ---------- création des sections (aucune modif de index.html nécessaire) ---------- */
function ensureKriaaPages(){
  if ($("productPage")) return;
  const f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap";
  document.head.appendChild(f);

  document.querySelector("main").insertAdjacentHTML("beforeend",
    `<section id="productPage" class="page kx" dir="ltr"></section><section id="checkoutPage" class="page kx" dir="ltr"></section>`);

  const lb = document.createElement("div");
  lb.id = "kxLightbox"; lb.className = "kx-lb"; lb.setAttribute("dir","ltr");
  lb.innerHTML = `<button class="kx-lb-x" onclick="kxCloseLightbox()" aria-label="Fermer">×</button>
    <button class="kx-lb-n kx-lb-prev" onclick="kxLbStep(-1)" aria-label="Précédent">‹</button>
    <img id="kxLbImg" alt=""><button class="kx-lb-n kx-lb-next" onclick="kxLbStep(1)" aria-label="Suivant">›</button>
    <div class="kx-lb-c" id="kxLbCount"></div>`;
  document.body.appendChild(lb);

  let sx = 0;
  lb.addEventListener("touchstart", e => { sx = e.changedTouches[0].clientX; }, {passive:true});
  lb.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) kxLbStep(dx < 0 ? 1 : -1);
  }, {passive:true});
  lb.addEventListener("click", e => { if (e.target === lb) kxCloseLightbox(); });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") kxCloseLightbox();
    if (e.key === "ArrowLeft") kxLbStep(-1);
    if (e.key === "ArrowRight") kxLbStep(1);
  });
}

/* ---------- PRODUCT PAGE ---------- */
function openProduct(id){
  const p = products.find(x => x.id === id); if (!p) return;
  selectedProduct = p;
  const colors = kxList(p.colors);
  draft = { product: p, size: "", color: colors.length === 1 ? colors[0] : "", qty: 1 };
  renderProductPage();
  show("productPage");
  window.scrollTo(0, 0);
}

function renderProductPage(){
  const p = draft.product, imgs = productImages(p), sizes = kxList(p.sizes), colors = kxList(p.colors);
  const out = Number(p.stock) <= 0, hl = kxHighlights(p), del = (storeSettings.delivery_text || "").trim();
  kxImgs = imgs;

  $("productPage").innerHTML = `<div class="kx-wrap">
  <button class="kx-back" onclick="show('shop')">← BOUTIQUE</button>
  <div class="kx-layout">
    <div class="kx-gallery">
      <div class="kx-track" id="kxTrack" onscroll="kxGalleryScroll()">
        ${imgs.map((s,i) => `<div class="kx-slide"><img src="${esc(s)}" alt="${esc(p.name)}" loading="${i ? "lazy" : "eager"}" onclick="kxOpenLightbox(${i})"></div>`).join("")}
      </div>
      ${imgs.length > 1 ? `<button class="kx-arrow kx-arrow-l" onclick="kxGo(-1)" aria-label="Précédent">‹</button><button class="kx-arrow kx-arrow-r" onclick="kxGo(1)" aria-label="Suivant">›</button>
      <div class="kx-dots" id="kxDots">${imgs.map((_,i) => `<span class="kx-dot${i === 0 ? " on" : ""}"></span>`).join("")}</div>` : ""}
    </div>

    <div class="kx-info">
      ${p.badge ? `<span class="kx-badge">${esc(p.badge)}</span>` : ""}
      <h1 class="kx-name">${esc(p.name)}</h1>
      <div class="kx-prices"><span class="kx-price">${esc(kxPrice(p.price))}</span>${p.old_price && Number(p.old_price) > Number(p.price) ? `<span class="kx-old">${esc(kxPrice(p.old_price))}</span>` : ""}</div>
      ${p.description ? `<p class="kx-desc">${esc(p.description).replace(/\n/g,"<br>")}</p>` : ""}

      ${sizes.length ? `<div class="kx-block"><div class="kx-label">TAILLE</div><div class="kx-opts">
        ${sizes.map(s => `<button type="button" class="kx-opt" data-v="${esc(s)}" onclick="kxPick('size',this)">${esc(s)}</button>`).join("")}</div></div>` : ""}

      ${colors.length > 1 ? `<div class="kx-block"><div class="kx-label">COULEUR</div><div class="kx-opts">
        ${colors.map(c => `<button type="button" class="kx-opt" data-v="${esc(c)}" onclick="kxPick('color',this)">${esc(c)}</button>`).join("")}</div></div>` : ""}

      <div class="kx-block"><div class="kx-label">QUANTITÉ</div>
        <div class="kx-qty"><button type="button" onclick="kxQty(-1)" aria-label="Moins">−</button><span class="kx-qty-v">1</span><button type="button" onclick="kxQty(1)" aria-label="Plus">+</button></div>
      </div>

      <p class="kx-msg" id="kxMsg"></p>
      <button type="button" class="kx-cta" ${out ? "disabled" : ""} onclick="kxOrderNow()">${out ? "ÉPUISÉ" : "COMMANDER"}</button>
      <button type="button" class="kx-wa" onclick="kxWhatsApp()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 2.1 17.8L1 23l5.3-1.4A11.8 11.8 0 0 0 12 23.1h0A11.8 11.8 0 0 0 20.5 3.5zM12 21.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.1.8.8-3-.2-.4a9.8 9.8 0 1 1 7.9 4.2zm5.4-7.3c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1-.8.9-.9 1.1-.3.2-.6.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.8-1.5a.6.6 0 0 0 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c1.9.8 2.6.9 3.5.7a3 3 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z"/></svg>
        COMMANDER SUR WHATSAPP</button>

      ${del ? `<div class="kx-del"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 6h13v10H1zM14 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        <div><div class="kx-label">LIVRAISON</div><div class="kx-del-t">${esc(del).replace(/\n/g,"<br>")}</div></div></div>` : ""}

      ${hl.length ? `<div class="kx-block"><div class="kx-label">HIGHLIGHTS</div><ul class="kx-hl">${hl.map(h => `<li>${esc(h)}</li>`).join("")}</ul></div>` : ""}
    </div>
  </div></div>`;

  // pré-sélection (couleur unique ou valeur déjà choisie)
  document.querySelectorAll("#productPage .kx-opt").forEach(b => {
    const t = b.closest(".kx-block").querySelector(".kx-label").textContent;
    if ((t === "TAILLE" && draft.size === b.dataset.v) || (t === "COULEUR" && draft.color === b.dataset.v)) b.classList.add("on");
  });
}

/* gallery */
function kxGalleryScroll(){
  const t = $("kxTrack"); if (!t || !t.clientWidth) return;
  const i = Math.round(t.scrollLeft / t.clientWidth);
  document.querySelectorAll("#kxDots .kx-dot").forEach((d,k) => d.classList.toggle("on", k === i));
}
function kxGo(d){ const t = $("kxTrack"); if (t) t.scrollBy({left: d * t.clientWidth, behavior: "smooth"}); }
function kxOpenLightbox(i){ kxLbIndex = i; kxLbDraw(); $("kxLightbox").classList.add("open"); document.body.style.overflow = "hidden"; }
function kxCloseLightbox(){ $("kxLightbox").classList.remove("open"); document.body.style.overflow = ""; }
function kxLbStep(d){ if (kxImgs.length < 2) return; kxLbIndex = (kxLbIndex + d + kxImgs.length) % kxImgs.length; kxLbDraw(); }
function kxLbDraw(){
  $("kxLbImg").src = kxImgs[kxLbIndex];
  $("kxLbCount").textContent = kxImgs.length > 1 ? `${kxLbIndex + 1} / ${kxImgs.length}` : "";
  document.querySelectorAll(".kx-lb-n").forEach(b => b.style.display = kxImgs.length > 1 ? "" : "none");
}

/* options + quantité */
function kxPick(type, el){
  draft[type] = el.dataset.v;
  el.parentElement.querySelectorAll(".kx-opt").forEach(b => b.classList.toggle("on", b === el));
  if ($("kxMsg")) $("kxMsg").textContent = "";
}
function kxQty(d){
  const max = Math.max(1, Number(draft.product.stock) || 1);
  draft.qty = Math.min(max, Math.max(1, draft.qty + d));
  document.querySelectorAll(".kx-qty-v").forEach(e => e.textContent = draft.qty);
  if ($("kxCoTotals")) kxCoTotals();
}
function kxValid(){
  const p = draft.product;
  if (Number(p.stock) <= 0) return "Produit épuisé.";
  if (kxList(p.sizes).length && !draft.size) return "Veuillez choisir une taille.";
  if (kxList(p.colors).length > 1 && !draft.color) return "Veuillez choisir une couleur.";
  return "";
}

/* commande directe (pas de panier) */
function kxOrderNow(){
  const err = kxValid();
  if (err) { $("kxMsg").textContent = err; return; }
  openCheckout();
}
function kxWhatsApp(){
  const err = kxValid();
  if (err) { $("kxMsg").textContent = err; return; }
  const p = draft.product, lines = ["Bonjour KRIAA, je souhaite commander :", `Produit : ${p.name}`];
  if (draft.size) lines.push(`Taille : ${draft.size}`);
  if (draft.color) lines.push(`Couleur : ${draft.color}`);
  lines.push(`Quantité : ${draft.qty}`, `Prix : ${kxPrice(p.price)}`);
  const num = String(KRIAA_WHATSAPP || storeSettings.whatsapp || storeSettings.whatsapp_number || "").replace(/\D/g, "");
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

/* ---------- CHECKOUT ---------- */
function openCheckout(){
  renderCheckout();
  show("checkoutPage");
  window.scrollTo(0, 0);
}

function renderCheckout(){
  const p = draft.product, sizes = kxList(p.sizes), colors = kxList(p.colors), img = productImages(p)[0];
  const max = Math.max(1, Number(p.stock) || 1);
  $("checkoutPage").innerHTML = `<div class="kx-wrap kx-co">
  <button class="kx-back" onclick="show('productPage')">← RETOUR AU PRODUIT</button>
  <div id="kxCoBody">
    <p class="kx-eyebrow">COMMANDE</p>
    <h1 class="kx-title">Finaliser la commande</h1>

    <div class="kx-sum"><img src="${esc(img)}" alt="${esc(p.name)}"><div><h3>${esc(p.name)}</h3><p>${esc(kxPrice(p.price))}</p></div></div>

    <div class="kx-grid">
      ${sizes.length ? `<label class="kx-f"><span>TAILLE *</span><select id="kxCoSize" onchange="draft.size=this.value;kxCoTotals()">
        <option value="">Choisir…</option>${sizes.map(s => `<option ${draft.size === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>` : ""}
      ${colors.length > 1 ? `<label class="kx-f"><span>COULEUR *</span><select id="kxCoColor" onchange="draft.color=this.value;kxCoTotals()">
        <option value="">Choisir…</option>${colors.map(c => `<option ${draft.color === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}
      <div class="kx-f"><span>QUANTITÉ</span><div class="kx-qty"><button type="button" onclick="kxQty(-1)" aria-label="Moins">−</button><span class="kx-qty-v">${draft.qty}</span><button type="button" onclick="kxQty(1)" aria-label="Plus">+</button></div></div>
    </div>

    <h2 class="kx-h2">Vos informations</h2>
    <div class="kx-grid">
      <label class="kx-f"><span>PRÉNOM *</span><input id="kxFn" placeholder="Prénom" autocomplete="given-name"></label>
      <label class="kx-f"><span>NOM *</span><input id="kxLn" placeholder="Nom" autocomplete="family-name"></label>
      <label class="kx-f kx-full"><span>TÉLÉPHONE *</span><input id="kxPhone" type="tel" inputmode="tel" placeholder="+216 XX XXX XXX" autocomplete="tel"></label>
      <label class="kx-f"><span>GOUVERNORAT *</span><select id="kxGov" onchange="kxCities(this.value)"><option value="">Choisir…</option>
        ${Object.keys(GOVS).map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}</select></label>
      <label class="kx-f"><span>VILLE *</span><select id="kxCity"><option value="">Choisir…</option></select></label>
      <label class="kx-f kx-full"><span>ADRESSE *</span><input id="kxAddr" placeholder="Rue, ville…" autocomplete="street-address"></label>
    </div>

    <div class="kx-totals" id="kxCoTotals"></div>
    <p class="kx-msg" id="kxCoMsg"></p>
    <button type="button" class="kx-cta" id="kxConfirm" onclick="kxSubmit()">CONFIRMER LA COMMANDE</button>
  </div></div>`;
  kxCoTotals();
}

function kxCities(g){
  $("kxCity").innerHTML = '<option value="">Choisir…</option>' + (GOVS[g] || []).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
}

function kxCoTotals(){
  const el = $("kxCoTotals"); if (!el) return;
  const p = draft.product, total = Number(p.price) * draft.qty, del = (storeSettings.delivery_text || "").trim();
  const row = (a,b) => `<div class="kx-row"><span>${a}</span><b>${b}</b></div>`;
  el.innerHTML =
    row("Produit", esc(p.name)) +
    (kxList(p.sizes).length ? row("Taille", esc(draft.size || "—")) : "") +
    (kxList(p.colors).length ? row("Couleur", esc(draft.color || "—")) : "") +
    row("Quantité", draft.qty) +
    row("Prix", esc(kxPrice(p.price))) +
    (del && del.length <= 40 ? row("Livraison", esc(del)) : "") +
    `<div class="kx-row kx-total"><span>TOTAL</span><b>${esc(kxPrice(total))}</b></div>` +
    (del && del.length > 40 ? `<p class="kx-note">${esc(del).replace(/\n/g,"<br>")}</p>` : "");
}

function kxPhone(v){
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00216")) d = d.slice(2);
  if (d.startsWith("216") && d.length === 11) d = d.slice(3);
  return /^[2-9]\d{7}$/.test(d) ? "216" + d : "";
}

async function kxSubmit(){
  const p = draft.product; if (!p) return;
  const msg = $("kxCoMsg"), btn = $("kxConfirm");
  const fn = $("kxFn").value.trim(), ln = $("kxLn").value.trim(), addr = $("kxAddr").value.trim();
  const gov = $("kxGov").value, city = $("kxCity").value, phone = kxPhone($("kxPhone").value);
  const qty = Math.max(1, Number(draft.qty) || 1);

  if (kxList(p.sizes).length && !draft.size) { msg.textContent = "Veuillez choisir une taille."; return; }
  if (kxList(p.colors).length > 1 && !draft.color) { msg.textContent = "Veuillez choisir une couleur."; return; }
  if (!fn || !ln || !gov || !city || !addr) { msg.textContent = "Veuillez remplir tous les champs obligatoires."; return; }
  if (!phone) { msg.textContent = "Numéro de téléphone invalide (8 chiffres, ex : +216 20 123 456)."; return; }
  if (Number(p.stock) < qty) { msg.textContent = "Quantité demandée non disponible."; return; }

  btn.disabled = true; msg.textContent = "Envoi de la commande…";

  const orderId = (window.crypto && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c === "x" ? r : (r&3|8)).toString(16); });
  const total = Number(p.price) * qty;

  const orderRow = {
    id: orderId,
    customer_name: `${fn} ${ln}`,
    whatsapp: phone,
    governorate: gov,
    city: KRIAA_ADDRESS_COLUMN ? city : `${city} — ${addr}`,
    total,
    user_id: currentUser?.id || null
  };
  if (KRIAA_ADDRESS_COLUMN) orderRow[KRIAA_ADDRESS_COLUMN] = addr;

  const {error: orderError} = await sb.from("orders").insert(orderRow);
  if (orderError) {
    console.error("ORDER ERROR:", orderError);
    msg.textContent = "Impossible d'envoyer la commande : " + orderError.message;
    btn.disabled = false; return;
  }

  const {error: itemError} = await sb.from("order_items").insert({
    order_id: orderId,
    product_id: p.id,
    product_name: p.name,
    size: draft.size || "",
    quantity: qty,
    price: Number(p.price),
    color: draft.color || null
  });
  if (itemError) {
    console.error("ORDER ITEM ERROR:", itemError);
    msg.textContent = "La commande est créée mais les détails du produit n'ont pas pu être enregistrés.";
    btn.disabled = false; return;
  }

  const {data: stockOk, error: stockError} = await sb.rpc("decrement_product_stock", {p_product_id: p.id, p_quantity: qty});
  if (stockError) console.error("STOCK ERROR:", stockError);
  if (stockOk === false) console.warn("Stock was not decremented because quantity was no longer available.");

  $("kxCoBody").innerHTML = `<div class="kx-ok"><div class="kx-ok-i">✓</div><h1 class="kx-title">Merci</h1>
    <p>Votre commande a bien été envoyée. Nous vous contacterons très bientôt pour la confirmer.</p>
    <button type="button" class="kx-cta" onclick="show('shop')">CONTINUER VOS ACHATS</button></div>`;
  window.scrollTo(0, 0);
  loadProducts();
}

ensureKriaaPages();
