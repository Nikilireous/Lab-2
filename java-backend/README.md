# Лабораторная №3: Jakarta EE, Hibernate/JPA и PostgreSQL

Это Java API лабораторной №3 для Angular-клиента лабораторной №4. Django и старый JavaScript-клиент сохранены как исходники предыдущих работ. В текущем запуске Angular работает на порту **5500**, Java API — на **8000**. Авторизация использует JWT в cookies.

Рекомендуемый запуск всего проекта — `docker compose up -d --build` из корня репозитория после заполнения корневого `.env`. Клиент доступен на `http://127.0.0.1:5500/login`, Swagger UI — на `http://127.0.0.1:8081/`. Команда `bash scripts/test-docker.sh` проверяет API на временной отдельной базе и удаляет её. Дальнейшие команды в этом файле описывают ручной запуск без Docker.

## Что реализовано

- Хранение студентов и пользователей в PostgreSQL через Hibernate/JPA.
- REST-адреса `/api/students/` и `/api/students/{isuId}/`: список, карточка, POST, PUT, PATCH, DELETE.
- Поиск, фильтрация, сортировка и пагинация в базе данных. GET принимает параметры URL; метод QUERY принимает JSON с теми же полями (его использует существующий интерфейс при трёх и более фильтрах).
- Регистрация обычного пользователя, вход, обновление JWT и получение текущего пользователя.
- Refresh-токены хранятся в отдельной таблице `refresh_tokens` в виде SHA-256-хешей. Access-токены в базе не хранятся. Браузер отправляет оба JWT в `HttpOnly` cookies; `/auth/refresh` обновляет access-cookie без JSON с токеном. Запросы, меняющие данные, дополнительно проверяются по `X-XSRF-TOKEN`.
- Роли: `USER` читает студентов, `ADMIN` читает и изменяет. Проверка прав выполняется на сервере.
- Проверка данных студентов и учётных записей, единый формат ошибок `{"errors":{"поле":"сообщение"}}`.
- Контроль CORS для разрешённых адресов клиента. Ошибки сервера пишутся в журнал WildFly.
- [OpenAPI-описание](src/main/webapp/openapi.yaml) и [коллекция Postman](postman/Lab3.postman_collection.json).

## Требования

Java 17+, Maven 3.9+, PostgreSQL 16+, WildFly 39 (профиль Jakarta EE 10), PostgreSQL JDBC Driver 42.7.x. Пример ниже использует Unix/macOS shell. На Windows те же команды выполняются через `standalone.bat` и `jboss-cli.bat`, а переменные окружения задаются в терминале Windows.

## Подготовка PostgreSQL

Создайте отдельного пользователя и базу данных. Выберите свой пароль и укажите его же в `.env`:

```sql
CREATE ROLE lab3 LOGIN PASSWORD 'your_database_password';
CREATE DATABASE students_lab3 OWNER lab3;
```

Перед этим запустите PostgreSQL. Например, на macOS с Homebrew: `brew services start postgresql@16`.

Скопируйте `.env.example` в `.env`. Задайте `DB_URL`, `DB_USER`, `DB_PASSWORD`, случайный `JWT_SECRET` длиной не менее 32 байт, а также имя, почту и пароль первого администратора. Файл `.env` игнорируется Git. Администратор создаётся при первом запуске, если пользователя с этим именем ещё нет. Регистрация через API всегда выдаёт роль `USER`.

## Сборка и запуск

В примере переменная `WILDFLY_HOME` указывает на распакованный WildFly. Сервер занимает порт 8000; перед запуском остановите Django на этом порту.

```bash
cd java-backend
export WILDFLY_HOME=/path/to/wildfly-39.0.1.Final
set -a
source .env
set +a
mvn clean package
"$WILDFLY_HOME/bin/standalone.sh" -Djboss.http.port=8000
```

Оставьте сервер работающим. В другом терминале добавьте PostgreSQL JDBC Driver в WildFly, затем источник данных. Драйвер можно скачать из Maven Central; в команде ниже укажите путь к его JAR:

```bash
cd java-backend
export WILDFLY_HOME=/path/to/wildfly-39.0.1.Final
set -a
source .env
set +a
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="deploy /path/to/postgresql-42.7.14.jar --name=postgresql.jar"
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="data-source add --name=StudentsDS --jndi-name=java:/jdbc/StudentsDS --driver-name=postgresql.jar --connection-url=${DB_URL} --user-name=${DB_USER} --password=${DB_PASSWORD} --enabled=true"
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="/subsystem=datasources/data-source=StudentsDS:test-connection-in-pool"
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="deploy target/ROOT.war --name=ROOT.war --force"
```

Драйвер и источник данных настраиваются один раз для этого экземпляра WildFly. При повторной сборке достаточно последней команды с `--force`. Если PostgreSQL или WildFly запущены на другом адресе, измените `DB_URL` и адрес подключения CLI соответственно.

Для разработки Angular-клиента в другом терминале выполните `npm ci && npm start` в каталоге `angular-frontend/` и откройте <http://localhost:4200/login>. Встроенный proxy направит `/api` на Java-сервер. Основной способ запуска всей системы — Docker Compose, описанный выше.

## Адреса API

| Метод | Адрес | Назначение | Роль |
|---|---|---|---|
| POST | `/api/auth/register` | Регистрация USER | Без входа |
| POST | `/api/auth/login` | Вход, установка HttpOnly cookies | Без входа |
| POST | `/api/auth/refresh` | Новая access-cookie по refresh-cookie | Без access-токена |
| GET | `/api/auth/me` | Текущий пользователь | USER/ADMIN |
| GET | `/api/students/` | Список и фильтры | USER/ADMIN |
| QUERY | `/api/students/` | Фильтры в JSON-теле | USER/ADMIN |
| GET | `/api/students/{isuId}/` | Карточка | USER/ADMIN |
| POST | `/api/students/` | Создание | ADMIN |
| PUT | `/api/students/{isuId}/` | Полное обновление | ADMIN |
| PATCH | `/api/students/{isuId}/` | Частичное обновление | ADMIN |
| DELETE | `/api/students/{isuId}/` | Удаление | ADMIN |

Для защищённых запросов браузер автоматически отправляет `lab4_access` cookie. `lab4_refresh` используется только для обновления сеанса и выхода. Оба JWT имеют флаг `HttpOnly`, поэтому JavaScript не может их прочитать. Access-cookie действует 15 минут, refresh-cookie — 7 дней; сроки меняются через `.env`. Для `POST`, `PUT`, `PATCH` и `DELETE` клиент передаёт значение читаемой cookie `XSRF-TOKEN` в заголовке `X-XSRF-TOKEN`; сервер проверяет его. В локальном HTTP-запуске `COOKIE_SECURE=false`, при запуске через HTTPS задайте `COOKIE_SECURE=true`.

Фильтры: `fullName`, `group`, `isuId`, `dormitory`, `room`, `isForeign`, `settlementDate`, `dateFrom`, `dateTo`, `search`. Для порядка добавьте `sort` (`fullName`, `group`, `isuId`, `dormitory`, `room`, `settlementDate`, `isForeign`) и `order` (`asc`/`desc`). Ответ всегда разбит на страницы: по умолчанию `page=1`, `size=20`, максимальный размер — 100. Общее число записей находится в заголовке `X-Total-Count`.

## Как устроен код

1. `api/` принимает HTTP-запросы и возвращает JSON; `ApiExceptionMapper` задаёт единый ответ при ошибке.
2. `security/SecurityFilter` проверяет подпись JWT, находит пользователя в базе и проверяет роль до вызова метода. `CorsFilter` обрабатывает адреса статического клиента и запросы OPTIONS.
3. `service/` проверяет данные и содержит операции над студентами и пользователями.
4. `repository/` выполняет запросы JPA. Список строится Criteria API: условия применяются в PostgreSQL, там же выполняются сортировка и пагинация.
5. `model/` описывает таблицы `students` и `app_users`. В базе хранится BCrypt-хеш пароля, а не пароль. Hibernate создаёт или обновляет таблицы при запуске учебного приложения.
6. `dto/` определяет JSON, который приходит и уходит по API. Это отделяет структуру ответа от таблиц базы.

## Проверка

После ручного запуска Java-сервера на порту 8000 запускайте только модульные тесты:

```bash
cd java-backend
mvn test
```

Интеграционный smoke-тест запускается командой `bash scripts/test-docker.sh` из корня проекта. Он проверяет вход, регистрацию, права USER/ADMIN, создание, список, GET и QUERY фильтры, карточку, PUT, PATCH, удаление, refresh, ошибки и CORS. Тестовая база живёт в отдельном Compose-проекте и удаляется по завершении.

В Postman импортируйте коллекцию. В запросе «Вход ADMIN» замените демонстрационный пароль своим паролем из `.env`, затем выполняйте запросы по порядку: Postman хранит cookies, а коллекция передаёт CSRF-заголовок. Swagger UI показывает OpenAPI-контракт; браузерный Swagger UI не умеет вручную устанавливать cookie через кнопку Authorize, поэтому для проверки cookie-сценариев удобнее Postman или приложение. Нестандартный метод QUERY описан как `x-query`.
