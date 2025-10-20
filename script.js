/* ==== Persistencia ==== */
const STORAGE_KEY = "studyplanner.tasks.v1";
let tasks = loadTasks();
let editingId = null;
function loadTasks(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

/* ==== Helpers ==== */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ==== Splash ==== */
const splash = $("#splash");
const btnStart = $("#btn-start");
function hideSplash(){ if (!splash) return; splash.classList.add("hide"); setTimeout(() => splash.remove(), 520); }
btnStart?.addEventListener("click", hideSplash);
window.addEventListener("load", () => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!prefersReduced) setTimeout(hideSplash, 1600);
});

/* ==== Navegación ==== */
const views = $$(".view");
function showView(name){
  views.forEach(v => v.classList.toggle("active", v.dataset.view === name));
  $$(".bottom-nav .nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.link === name));
  if (name === "tasks") renderList();
  if (name === "home")  renderStats();
  if (name === "editor"){ $("#task-title")?.focus(); }
}
$$(".bottom-nav [data-link]").forEach(b => b.addEventListener("click", () => showView(b.dataset.link)));
$("#btn-new-task")?.addEventListener("click", () => startCreate());
$("[data-link='tasks']")?.addEventListener("click", () => showView("tasks"));

/* ==== Toasts ==== */
const toastBox = $("#toasts");
function toast(msg, type="info", icon="i-info", timeout=2200){
  const el = document.createElement("div");
  el.className = "toast" + (type === "success" ? " ok" : type === "error" ? " err" : "");
  el.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg><span>${esc(msg)}</span>`;
  toastBox.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translate(-50%,-4px)"; }, timeout);
  setTimeout(() => el.remove(), timeout + 240);
}

/* ==== Formulario ==== */
const form    = $("#task-form");
const hint    = $("#form-hint");
const btnSave = $("#btn-save");
const btnSaveAdd = $("#btn-save-add");

function startCreate(){
  editingId = null;
  form.reset();                 // ← campos en blanco al crear
  hint.textContent = "Completá título, materia y fecha.";
  showView("editor");
}

function startEdit(id){
  const t = tasks.find(x => x.id === id); if (!t) return;
  editingId = id;
  $("#task-title").value   = t.title;
  $("#task-subject").value = t.subject;
  $("#task-date").value    = t.date;
  hint.textContent = "Editá los campos y guardá.";
  showView("editor");
}

async function handleSave({stayInEditor=false} = {}){
  const title   = $("#task-title").value.trim();
  const subject = $("#task-subject").value;
  const date    = $("#task-date").value;
  if (!title || !subject || !date){
    hint.textContent = "Falta completar algún campo.";
    toast("Completá todos los campos.", "error");
    return false;
  }

  // simulamos pequeña espera para feedback
  btnSave?.setAttribute("aria-busy","true");
  await new Promise(r => setTimeout(r, 160));

  if (editingId){
    tasks = tasks.map(t => t.id === editingId ? { ...t, title, subject, date } : t);
  } else {
    tasks.push({ id: genId(), title, subject, date, done:false });
  }
  saveTasks();
  hint.textContent = "";
  btnSave?.removeAttribute("aria-busy");
  editingId = null;

  toast("Tarea guardada", "success", "i-check");

  if (stayInEditor){
    form.reset();               // ← queda listo para cargar otra
    $("#task-title").focus();
    return true;
  } else {
    form.reset();               // ← también limpia si volvés a la lista
    showView("tasks");
    renderList();
    return true;
  }
}

form?.addEventListener("submit", async (e) => { e.preventDefault(); await handleSave({stayInEditor:false}); });
btnSaveAdd?.addEventListener("click", async () => { await handleSave({stayInEditor:true}); });
$("#btn-cancel")?.addEventListener("click", () => { editingId = null; showView("tasks"); });

/* ==== Lista + Filtro (chips + select sincronizados) ==== */
const list         = $("#task-list");
const emptyState   = $("#empty-state");
const filterSelect = $("#subject-filter");
const chipBar      = $(".subject-chips");

function setFilter(value){
  // sync select
  if (filterSelect) filterSelect.value = value;
  // sync chips
  $$(".chip", chipBar).forEach(c => c.classList.toggle("active", (c.dataset.subject || "") === value));
  renderList();
}
chipBar?.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip"); if (!btn) return;
  setFilter(btn.dataset.subject || "");
});
filterSelect?.addEventListener("change", () => setFilter(filterSelect.value || ""));

function renderList(){
  const subject = filterSelect?.value || "";
  const sorted  = [...tasks].sort((a,b) => a.date.localeCompare(b.date));
  const data    = subject ? sorted.filter(t => t.subject === subject) : sorted;

  list.innerHTML = "";
  if (data.length === 0){
    emptyState.hidden = false;
    renderStats();
    return;
  }
  emptyState.hidden = true;

  for (const t of data){
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " done" : "");
    li.innerHTML = `
      <main>
        <h3>${esc(t.title)}</h3>
        <small>${esc(t.subject)} · ${t.date}</small>
      </main>
      <div class="actions">
        <button class="btn" type="button" data-act="toggle" data-id="${t.id}">
          <svg class="icon"><use href="#i-check"/></svg><span class="sr-only">Completar</span>
        </button>
        <button class="btn" type="button" data-act="edit" data-id="${t.id}">
          <svg class="icon"><use href="#i-edit"/></svg><span class="sr-only">Editar</span>
        </button>
        <button class="btn" type="button" data-act="del" data-id="${t.id}">
          <svg class="icon"><use href="#i-trash"/></svg><span class="sr-only">Borrar</span>
        </button>
      </div>
    `;
    list.appendChild(li);
  }

  list.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id  = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === "toggle"){
        tasks = tasks.map(t => t.id === id ? ({ ...t, done: !t.done }) : t);
        saveTasks();
        toast("Estado actualizado", "success", "i-check", 1500);
        list.querySelector(`[data-id="${id}"]`)?.closest(".task")?.classList.add("flash");
      } else if (act === "edit"){
        return startEdit(id);
      } else if (act === "del"){
        const ok = confirm("¿Borrar esta tarea?"); if (!ok) return;
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        toast("Tarea eliminada");
      }
      renderList(); renderStats();
    });
  });

  renderStats();
}

/* ==== Stats ==== */
function renderStats(){
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  $("#stat-total").textContent   = total;
  $("#stat-done").textContent    = done;
  $("#stat-pending").textContent = pending;
}

/* ==== Inicio ==== */
document.addEventListener("DOMContentLoaded", () => {
  renderStats();
  // asegurar que chips y select arranquen sincronizados
  setFilter("");
  renderList();
});