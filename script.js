/* ====== State & constants ====== */
let cart = [];
let currentProduct = null;
const WHATSAPP_NUMBER = "5511993945539";
const CASHBACK_REWARD = 10;
const CASHBACK_THRESHOLD = 100; // R$ >= 100 earns reward
let currentUser = null; // {name,pass,cashback}

/* ====== UI helpers: toast & popup (no alerts) ====== */
function showToast(msg, ms=2000){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=> t.style.display='none', ms);
}
function showPopup(msg, buttons=[{text:'OK', primary:true, cb:()=>{}}]){
  const el = document.getElementById('popup');
  el.innerHTML = '';
  const p = document.createElement('div'); p.style.marginBottom='10px'; p.innerHTML = msg.replace(/\n/g,'<br>');
  el.appendChild(p);
  const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='flex-end'; row.style.gap='8px';
  buttons.forEach(b=>{
    const btn = document.createElement('button');
    btn.className = b.primary? 'btn-primary' : 'btn-ghost';
    btn.textContent = b.text;
    btn.onclick = ()=>{ try{ b.cb && b.cb(); } finally { closePopup(); } };
    row.appendChild(btn);
  });
  el.appendChild(row);
  el.style.display = 'block';
}
function closePopup(){ document.getElementById('popup').style.display='none'; }

/* ====== Clock ====== */
function atualizarRelogio(){
  const clockEl = document.getElementById('clock');
  const now = new Date();
  const dia = String(now.getDate()).padStart(2,'0');
  const mes = String(now.getMonth()+1).padStart(2,'0');
  const ano = now.getFullYear();
  const horas = String(now.getHours()).padStart(2,'0');
  const minutos = String(now.getMinutes()).padStart(2,'0');
  clockEl.textContent = `${dia}/${mes}/${ano} — ${horas}:${minutos}`;
}
setInterval(atualizarRelogio,1000);
atualizarRelogio();

/* ====== Cart functions ====== */
function renderCart(){
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  let total = 0;
  cart.forEach((it, idx) => {
    total += it.price * it.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<div style="display:flex;gap:10px;align-items:center;min-width:0">
        <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;background:#111">
          <img src="${it.img}" style="width:100%;height:100%;object-fit:cover" alt="">
        </div>
        <div style="min-width:0">
          <strong style="display:block">${it.name}</strong>
          <small>R$ ${it.price.toFixed(2)} x ${it.qty}</small>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
        <div><button class="btn-ghost" onclick="changeQty(${idx},1)">+</button> <button class="btn-ghost" onclick="changeQty(${idx},-1)">-</button></div>
        <button class="btn-ghost" style="color:#f66" onclick="removeFromCart(${idx})">Remover</button>
      </div>`;
    container.appendChild(div);
  });
  document.getElementById('cartTotal').textContent = `Total: R$ ${total.toFixed(2)}`;
  document.getElementById('cartCount').textContent = cart.length;
  updateCashbackUI();
}
function changeQty(i, delta){
  cart[i].qty = Math.max(1, (cart[i].qty||1) + delta);
  renderCart();
}
function addToCartByData(data){
  const item = { name: data.name, price: Number(data.price), img: data.img, qty: 1 };
  cart.push(item);
  renderCart();
  showToast('Item adicionado!');
}
function addCurrentToCart(){
  if(!currentProduct) return;
  const qty = parseInt(document.getElementById('productQty').value) || 1;
  const it = { name: currentProduct.name, price: currentProduct.price, img: currentProduct.img, qty };
  cart.push(it);
  closeProductModal();
  renderCart();
  showToast('Item adicionado!');
}
function removeFromCart(i){ cart.splice(i,1); renderCart(); }
function toggleCart(){ const el = document.getElementById('cartPanel'); el.classList.toggle('open'); el.setAttribute('aria-hidden', !el.classList.contains('open')); }

/* ====== Product modal (delegation) ====== */
document.addEventListener('click', (e)=>{
  const card = e.target.closest('.product-card');
  if(card){
    openProductModalFromCard(card);
  }
});
function openProductModalFromCard(card){
  const name = card.dataset.name;
  const price = Number(card.dataset.price);
  const img = card.dataset.img;
  const desc = card.dataset.desc || '';
  currentProduct = { name, price, img, desc };
  document.getElementById('productModalTitle').textContent = name;
  document.getElementById('productModalImg').src = img;
  document.getElementById('productModalDesc').textContent = desc;
  document.getElementById('productModalPrice').textContent = `R$ ${price.toFixed(2)}`;
  document.getElementById('productQty').value = 1;
  document.getElementById('productModal').style.display = 'flex';
}
function closeProductModal(){ document.getElementById('productModal').style.display = 'none'; currentProduct = null; }

/* Close modals when clicking outside */
document.addEventListener('click', (e)=>{
  ['productModal','loginModal','ratingModal'].forEach(id=>{
    const el = document.getElementById(id);
    if(el && el.style.display === 'flex' && e.target === el) el.style.display = 'none';
  });
});

/* ====== Login / account (localStorage simple) ====== */
function openLogin(){ document.getElementById('loginModal').style.display = 'flex'; openLoginView(); }
function openLoginView(){ document.getElementById('loginForm').style.display='block'; document.getElementById('createForm').style.display='none'; document.getElementById('loginTitle').textContent='Entrar'; }
function openCreateAccount(){ document.getElementById('loginModal').style.display='flex'; document.getElementById('loginForm').style.display='none'; document.getElementById('createForm').style.display='block'; document.getElementById('loginTitle').textContent='Criar Conta'; }
function closeLoginModal(){ document.getElementById('loginModal').style.display = 'none'; }

function doCreate(){
  const name = document.getElementById('createName').value.trim();
  const pass = document.getElementById('createPass').value;
  if(!name || !pass){ showPopup('Preencha nome e senha'); return; }
  const key = `saf_user_${name}`;
  if(localStorage.getItem(key)){ showPopup('Usuário já existe'); return; }
  const data = { name, pass, cashback: 0 };
  localStorage.setItem(key, JSON.stringify(data));
  showToast('Conta criada');
  loginAs(name, pass, document.getElementById('loginStay').checked);
  closeLoginModal();
}
function doLogin(){
  const name = document.getElementById('loginName').value.trim();
  const pass = document.getElementById('loginPass').value;
  if(!name || !pass){ showPopup('Preencha nome e senha'); return; }
  loginAs(name, pass, document.getElementById('loginStay').checked);
}
function loginAs(name, pass, stay){
  const key = `saf_user_${name}`;
  const raw = localStorage.getItem(key);
  if(!raw){ showPopup('Usuário não encontrado'); return; }
  const data = JSON.parse(raw);
  if(data.pass !== pass){ showPopup('Senha incorreta'); return; }
  currentUser = data;
  localStorage.setItem('saf_current', name);
  if(stay) localStorage.setItem('saf_stay', 'true'); else localStorage.removeItem('saf_stay');
  updateUserUI();
  showToast(`Bem-vindo(a), ${currentUser.name}!`);
  closeLoginModal();
}
function doLogout(){
  currentUser = null;
  localStorage.removeItem('saf_current');
  localStorage.removeItem('saf_stay');
  updateUserUI();
  showToast('Você saiu');
}
function initUserFromStorage(){
  const name = localStorage.getItem('saf_current');
  if(name){
    const raw = localStorage.getItem(`saf_user_${name}`);
    if(raw) currentUser = JSON.parse(raw);
  }
  updateUserUI();
}
function updateUserUI(){
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  const cashbackBtn = document.getElementById('cashbackBtn');
  const cartName = document.getElementById('cartCustomerName');
  const applyCashbackBtn = document.getElementById('applyCashbackBtn');

  if(currentUser){
    btnLogin.textContent = currentUser.name;
    btnLogin.classList.add('user-bubble');
    btnLogout.style.display = 'inline-block';
    cashbackBtn.disabled = false;
    applyCashbackBtn.disabled = false;
    document.getElementById('cashbackAmount').textContent = `R$ ${Number(currentUser.cashback||0).toFixed(2)}`;
    cartName.value = currentUser.name;
    cartName.disabled = true;
  } else {
    btnLogin.textContent = 'Entrar';
    btnLogin.classList.remove('user-bubble');
    btnLogout.style.display = 'none';
    cashbackBtn.disabled = true;
    applyCashbackBtn.disabled = true;
    document.getElementById('cashbackAmount').textContent = `R$ 0,00`;
    cartName.value = '';
    cartName.disabled = false;
  }
  updateCashbackUI();
}

/* ====== Cashback logic ====== */
function openCashback(){
  if(!currentUser){ showPopup('Você precisa estar logado para ver o cashback.', [{text:'Entrar', primary:true, cb: openLogin}, {text:'Fechar'}]); return; }
  showPopup(`Seu cashback disponível: R$ ${Number(currentUser.cashback || 0).toFixed(2)}`, [{text:'Fechar'}]);
}
function updateCashbackUI(){
  const applyBtn = document.getElementById('applyCashbackBtn');
  const useBox = document.getElementById('cartUseCashbackInput');
  if(currentUser && Number(currentUser.cashback || 0) > 0){
    applyBtn.disabled = false;
    useBox.disabled = false;
  } else {
    applyBtn.disabled = true;
    useBox.disabled = true;
    useBox.checked = false;
  }
}
function applyCashback(){
  if(!currentUser){ showPopup('Faça login para usar cashback.', [{text:'Entrar', primary:true, cb: openLogin}, {text:'Fechar'}]); return; }
  const available = Number(currentUser.cashback || 0);
  if(available <= 0){ showPopup('Você não tem cashback disponível.'); return; }
  showPopup(`Você tem R$ ${available.toFixed(2)} de cashback disponível. Para usar, marque "Usar Cashback" no carrinho.`, [{text:'Fechar'}]);
}

/* ====== Finalize / WhatsApp (mold solicitado) ====== */
function finalizeOrder(){
  if(cart.length === 0){ showToast('Seu carrinho está vazio!'); return; }
  const cartNameInput = document.getElementById('cartCustomerName');
  const name = (cartNameInput.value || (currentUser?currentUser.name:'')).trim();
  if(!name){ showPopup('Informe seu nome no campo do carrinho.'); return; }

  const notes = document.getElementById('cartCustomerNotes').value.trim();
  const useCashback = document.getElementById('cartUseCashbackInput').checked && currentUser && Number(currentUser.cashback || 0) > 0;

  let subtotal = 0;
  let itemsText = '';
  cart.forEach((it, idx)=>{
    itemsText += `${idx+1}) ${it.name} x ${it.qty} - R$ ${(it.price*it.qty).toFixed(2)}%0A`;
    subtotal += it.price*it.qty;
  });

  let finalTotal = subtotal;
  let appliedCashback = 0;
  if(useCashback && currentUser){
    appliedCashback = Math.min(Number(currentUser.cashback||0), finalTotal);
    finalTotal = Math.max(0, finalTotal - appliedCashback);
  }

  // message mold requested
  let mensagem = `|| Pedido ||%0A%0ACliente: ${encodeURIComponent(name)}%0A%0A------%0A%0AItens:%0A${itemsText}%0ATotal: R$ ${finalTotal.toFixed(2)}%0A%0A|| Pedido ||`;
  if(notes) mensagem += `%0A%0AObservações: ${encodeURIComponent(notes)}`;
  if(appliedCashback > 0) mensagem += `%0A%0ACashback aplicado: R$ ${appliedCashback.toFixed(2)}`;

  // open whatsapp
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
  window.open(link, '_blank');

  // reward cashback if subtotal >= threshold
  if(subtotal >= CASHBACK_THRESHOLD && currentUser){
    currentUser.cashback = (Number(currentUser.cashback || 0) + CASHBACK_REWARD);
    localStorage.setItem(`saf_user_${currentUser.name}`, JSON.stringify(currentUser));
    document.getElementById('cashbackAmount').textContent = `R$ ${Number(currentUser.cashback).toFixed(2)}`;
    showToast(`Você ganhou R$ ${CASHBACK_REWARD.toFixed(2)} de cashback para próximas compras!`);
  }

  // if used cashback, deduct applied amount
  if(appliedCashback > 0 && currentUser){
    currentUser.cashback = Math.max(0, Number(currentUser.cashback || 0) - appliedCashback);
    localStorage.setItem(`saf_user_${currentUser.name}`, JSON.stringify(currentUser));
    document.getElementById('cashbackAmount').textContent = `R$ ${Number(currentUser.cashback).toFixed(2)}`;
  }

  // clear cart & fields
  cart = [];
  renderCart();
  document.getElementById('cartCustomerNotes').value = '';
  document.getElementById('cartUseCashbackInput').checked = false;
  showToast('Pedido pronto para envio no WhatsApp!');
}

/* ====== Rating modal ====== */
let ratingCurrent = 0;
function openRating(){ document.getElementById('ratingModal').style.display='flex'; ratingCurrent=0; highlightStars(0); }
function closeRating(){ document.getElementById('ratingModal').style.display='none'; }
const starEls = Array.from(document.querySelectorAll('#ratingStars span'));
starEls.forEach(s=>{
  s.addEventListener('mouseover', ()=> highlightStars(Number(s.dataset.value)));
  s.addEventListener('click', ()=> { ratingCurrent = Number(s.dataset.value); highlightStars(ratingCurrent); });
});
function highlightStars(r){
  starEls.forEach(s => s.style.color = (Number(s.dataset.value) <= r) ? 'var(--accent)' : 'var(--subtext)');
  starEls.forEach(s => s.innerHTML = (Number(s.dataset.value) <= r) ? '\u2605' : '\u2606');
}
function submitRating(){
  const name = document.getElementById('ratingName').value.trim() || 'Anônimo';
  const comment = document.getElementById('ratingComment').value.trim();
  showPopup(`Obrigado pela avaliação!\nNota: ${ratingCurrent}\nNome: ${name}\nComentário: ${comment}`, [{text:'Fechar'}]);
  closeRating();
}

/* ====== Init ====== */
function init(){
  // load user if present
  initUserFromStorage();
  renderCart();
  // ensure product placeholder exists if missing (do nothing here)
}
init();

/* small helper for clicking outside modals handled earlier */