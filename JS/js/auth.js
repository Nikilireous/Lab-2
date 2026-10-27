// Общий слой авторизации для существующих страниц лабораторной №2.
// Основной код страниц менять не требуется: здесь добавляется Bearer-токен к fetch.
(() => {
  const api = `http://${location.hostname || 'localhost'}:8000/api/`;
  const storageKey = 'lab3-auth';
  const originalFetch = window.fetch.bind(window);

  function saved() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
    catch { return {}; }
  }

  function loginPage() {
    localStorage.removeItem(storageKey);
    const next = location.pathname.split('/').pop() + location.search;
    location.replace(`login.html?next=${encodeURIComponent(next)}`);
  }

  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith(api + 'students/')) return originalFetch(input, options);

    async function send(accessToken) {
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      return originalFetch(input, { ...options, headers });
    }

    let auth = saved();
    if (!auth.accessToken) {
      loginPage();
      return new Response('{}', { status: 401 });
    }

    let response = await send(auth.accessToken);
    if (response.status !== 401) return response;

    const refreshed = await originalFetch(api + 'auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken })
    });
    if (!refreshed.ok) {
      loginPage();
      return response;
    }

    auth = await refreshed.json();
    localStorage.setItem(storageKey, JSON.stringify(auth));
    response = await send(auth.accessToken);
    if (response.status === 401) loginPage();
    return response;
  };

  document.addEventListener('DOMContentLoaded', () => {
    const auth = saved();
    if (!auth.accessToken) {
      loginPage();
      return;
    }

    const header = document.querySelector('.header-container');
    if (header) {
      const panel = document.createElement('div');
      panel.className = 'account-panel';
      const name = document.createElement('span');
      name.className = 'account-name';
      name.textContent = `${auth.user?.username || 'Пользователь'} (${auth.user?.role || 'USER'})`;
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.textContent = 'Выйти';
      logout.className = 'btn btn-secondary';
      logout.addEventListener('click', loginPage);
      panel.append(name, logout);
      header.appendChild(panel);
    }

    if (auth.user?.role !== 'ADMIN') {
      if (location.pathname.endsWith('student-form.html')) {
        location.replace('index.html?v=students-api-3');
        return;
      }
      const hideWriteActions = () => {
        document.querySelectorAll('a[href*="student-form.html"], .action-delete, #edit-btn, #delete-btn')
          .forEach(element => { element.style.display = 'none'; });
        const emptyText = document.getElementById('empty-text');
        if (emptyText?.textContent === 'Добавьте первого студента') {
          emptyText.textContent = 'Студенты пока не добавлены';
        }
      };
      hideWriteActions();
      new MutationObserver(hideWriteActions).observe(document.body, { childList: true, subtree: true });
    }
  });
})();
