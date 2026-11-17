// Авторизация старых страниц лабораторной №3 через cookies API.
(() => {
  const api = `http://${location.hostname || 'localhost'}:8000/api/`;
  const originalFetch = window.fetch.bind(window);

  function csrfToken() {
    const cookie = document.cookie.split('; ').find(part => part.startsWith('XSRF-TOKEN='));
    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
  }

  function loginPage() {
    const next = location.pathname.split('/').pop() + location.search;
    location.replace(`login.html?next=${encodeURIComponent(next)}`);
  }

  async function send(input, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers);
    if (!['GET', 'HEAD', 'QUERY'].includes(method)) headers.set('X-XSRF-TOKEN', csrfToken());
    return originalFetch(input, { ...options, headers, credentials: 'include' });
  }

  window.fetch = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith(api + 'students/')) return originalFetch(input, options);

    let response = await send(input, options);
    if (response.status !== 401) return response;

    const refreshed = await send(api + 'auth/refresh', { method: 'POST' });
    if (!refreshed.ok) {
      loginPage();
      return response;
    }
    response = await send(input, options);
    if (response.status === 401) loginPage();
    return response;
  };

  document.addEventListener('DOMContentLoaded', async () => {
    let response = await send(api + 'auth/me');
    if (response.status === 401) {
      const refreshed = await send(api + 'auth/refresh', { method: 'POST' });
      if (refreshed.ok) response = await send(api + 'auth/me');
    }
    if (!response.ok) {
      loginPage();
      return;
    }

    const user = await response.json();
    const header = document.querySelector('.header-container');
    if (header) {
      const panel = document.createElement('div');
      panel.className = 'account-panel';
      const name = document.createElement('span');
      name.className = 'account-name';
      name.textContent = `${user.username} (${user.role})`;
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.textContent = 'Выйти';
      logout.className = 'btn btn-secondary';
      logout.addEventListener('click', async () => {
        await send(api + 'auth/logout', { method: 'POST' });
        loginPage();
      });
      panel.append(name, logout);
      header.appendChild(panel);
    }

    if (user.role !== 'ADMIN') {
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
