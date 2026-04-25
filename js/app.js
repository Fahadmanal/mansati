// ===== الوظائف المشتركة =====

function getSidebar(active) {
  const teacher = JSON.parse(localStorage.getItem('currentTeacher') || '{}');
  const initials = teacher.name ? teacher.name.split(' ').slice(0,2).map(w=>w[0]).join('') : 'م';
  const pages = [
    {icon:'🏠', label:'الرئيسية',    href:'dashboard.html',  key:'dashboard'},
    {icon:'📚', label:'فصولي',        href:'classes.html',    key:'classes'},
    {icon:'⚡', label:'التحديات',     href:'challenges.html', key:'challenges'},
    {icon:'📝', label:'الاختبارات',  href:'tests.html',      key:'tests'},
    {icon:'📊', label:'التقارير',    href:'reports.html',    key:'reports'},
    {icon:'📖', label:'المكتبة',      href:'library.html',    key:'library'},
    {icon:'🎁', label:'الهدايا',      href:'gifts.html',      key:'gifts'},
    {icon:'⚙️', label:'الإعدادات',   href:'settings.html',   key:'settings'},
  ];

  return `
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-mark">م</div>
      <div class="logo-text">
        <h2>منصتي</h2>
        <p>المنصة التعليمية الذكية</p>
      </div>
    </div>
    <div class="sidebar-user">
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${teacher.name || 'المعلم'}</div>
        <div class="user-role">👨‍🏫 ${teacher.subject || 'معلم'}</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-group-label">القائمة الرئيسية</div>
      ${pages.map(p => `
        <a href="${p.href}" class="nav-item ${active===p.key?'active':''}">
          <span class="nav-icon">${p.icon}</span>
          ${p.label}
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="logout()">🚪 تسجيل الخروج</button>
    </div>
  </aside>`;
}

function logout() {
  localStorage.removeItem('currentTeacher');
  window.location.href = 'index.html';
}

function checkAuth() {
  const teacher = JSON.parse(localStorage.getItem('currentTeacher') || 'null');
  if (!teacher) window.location.href = 'index.html';
  return teacher;
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = (type==='success' ? '✅ ' : '❌ ') + msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function generateCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, ()=>c[Math.floor(Math.random()*c.length)]).join('');
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ تم';
    setTimeout(() => btn.textContent = orig, 1500);
  });
}

/** حذف اختبارات ونتائج وطلاب مرتبطين بفصل (عند حذف الفصل) */
function purgeClassData(classId) {
  const id = Number(classId);
  const tests = JSON.parse(localStorage.getItem('tests') || '[]').filter(t => Number(t.classId) !== id);
  localStorage.setItem('tests', JSON.stringify(tests));
  const results = JSON.parse(localStorage.getItem('results') || '[]').filter(r => Number(r.classId) !== id);
  localStorage.setItem('results', JSON.stringify(results));
  const students = JSON.parse(localStorage.getItem('students') || '[]').filter(s => Number(s.classId) !== id);
  localStorage.setItem('students', JSON.stringify(students));
}

function getScoreClass(s) { return s>=80?'score-high':s>=60?'score-mid':'score-low'; }
function getTypeBadge(type) {
  const m = {test:'badge-test 📝 اختبار', challenge:'badge-challenge ⚡ تحدي', homework:'badge-homework 📖 واجب'};
  const [cls, ...rest] = (m[type]||'badge-test 📝 اختبار').split(' ');
  return `<span class="badge ${cls}">${rest.join(' ')}</span>`;
}
