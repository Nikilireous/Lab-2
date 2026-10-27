const api = `http://${location.hostname || 'localhost'}:8000/api/auth/`;
const form = document.getElementById('auth-form');
const error = document.getElementById('auth-error');
let registering = false;

document.getElementById('auth-switch').addEventListener('click', () => {
  registering = !registering;
  document.getElementById('auth-title').textContent = registering ? 'Регистрация' : 'Вход';
  document.getElementById('auth-hint').textContent = registering
    ? 'Новая учётная запись получает роль USER и может просматривать студентов.'
    : 'Войдите, чтобы открыть список студентов.';
  document.getElementById('email-row').hidden = !registering;
  document.getElementById('email').required = registering;
  document.getElementById('auth-submit').textContent = registering ? 'Зарегистрироваться' : 'Войти';
  document.getElementById('auth-switch').textContent = registering ? 'Уже есть аккаунт? Войти' : 'Создать учётную запись';
  error.hidden = true;
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.hidden = true;
  const data = {
    username: form.elements.namedItem('username').value.trim(),
    password: form.elements.namedItem('password').value
  };
  if (registering) data.email = form.elements.namedItem('email').value.trim();

  const submit = document.getElementById('auth-submit');
  submit.disabled = true;
  try {
    const response = await fetch(api + (registering ? 'register' : 'login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(Object.values(result.errors || {}).join('; ') || 'Ошибка входа');
    }
    localStorage.setItem('lab3-auth', JSON.stringify(result));
    const next = new URLSearchParams(location.search).get('next');
    const destination = next && /^(index|student-profile|student-form)\.html(?:\?|$)/.test(next)
      ? next : 'index.html?v=students-api-3';
    location.replace(destination);
  } catch (cause) {
    error.textContent = cause.message;
    error.hidden = false;
  } finally {
    submit.disabled = false;
  }
});
