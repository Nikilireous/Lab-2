# Лабораторная №3: Jakarta EE, Hibernate/JPA и PostgreSQL

Это новая серверная часть для интерфейса лабораторной №2 из `../JS/`. Django из `../django/` оставлен для лабораторной №2. Java-приложение запускается вместо Django на порту **8000**; статические HTML-файлы по-прежнему открываются отдельным сервером на порту **5500**. Основные HTML, JS и CSS второй лабораторной сохранены: добавлены страница входа и небольшой JS-слой, который передаёт JWT в существующих запросах.

## Что реализовано

- Хранение студентов и пользователей в PostgreSQL через Hibernate/JPA.
- REST-адреса `/api/students/` и `/api/students/{isuId}/`: список, карточка, POST, PUT, PATCH, DELETE.
- Поиск, фильтрация, сортировка и пагинация в базе данных. GET принимает параметры URL; метод QUERY принимает JSON с теми же полями (его использует существующий интерфейс при трёх и более фильтрах).
- Регистрация обычного пользователя, вход, обновление JWT и получение текущего пользователя.
- Роли: `USER` читает студентов, `ADMIN` читает и изменяет. Проверка прав выполняется на сервере.
- Проверка данных студентов и учётных записей, единый формат ошибок `{"errors":{"поле":"сообщение"}}`.
- Контроль CORS для адресов статического клиента. Ошибки сервера пишутся в журнал WildFly.
- [OpenAPI-описание](src/main/webapp/openapi.yaml) и [коллекция Postman](postman/Lab3.postman_collection.json).

## Требования

Java 17+, Maven 3.9+, PostgreSQL 16+, WildFly 39 (профиль Jakarta EE 10), PostgreSQL JDBC Driver 42.7.x. Пример ниже использует Unix/macOS shell. На Windows те же команды выполняются через `standalone.bat` и `jboss-cli.bat`, а переменные окружения задаются в терминале Windows.

## Подготовка PostgreSQL

Создайте отдельного пользователя и базу данных. Выберите свой пароль и укажите его же в `.env`:

```sql
CREATE ROLE lab3 LOGIN PASSWORD 'your_database_password';
CREATE DATABASE students_lab3 OWNER lab3;
```

Скопируйте `.env.example` в `.env`. Задайте `DB_URL`, `DB_USER`, `DB_PASSWORD`, случайный `JWT_SECRET` длиной не менее 32 байт, а также имя, почту и пароль первого администратора. Файл `.env` игнорируется Git. Администратор создаётся при первом запуске, если пользователя с этим именем ещё нет. Регистрация через API всегда выдаёт роль `USER`.

## Сборка и запуск

В примере переменная `WILDFLY_HOME` указывает на распакованный WildFly. Сервер занимает порт 8000; перед запуском остановите Django на этом порту.

```bash
cd java-backend
set -a
source .env
set +a
mvn clean package
"$WILDFLY_HOME/bin/standalone.sh" -Djboss.http.port=8000
```

Оставьте сервер работающим. В другом терминале добавьте PostgreSQL JDBC Driver в WildFly, затем источник данных. Драйвер можно скачать из Maven Central; в команде ниже укажите путь к его JAR:

```bash
cd java-backend
set -a
source .env
set +a
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="deploy /path/to/postgresql-42.7.14.jar --name=postgresql.jar"
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="data-source add --name=StudentsDS --jndi-name=java:/jdbc/StudentsDS --driver-name=postgresql.jar --connection-url=${DB_URL} --user-name=${DB_USER} --password=${DB_PASSWORD} --enabled=true"
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="/subsystem=datasources/data-source=StudentsDS:test-connection-in-pool"
"$WILDFLY_HOME/bin/jboss-cli.sh" --connect --command="deploy target/ROOT.war --name=ROOT.war --force"
```

Драйвер и источник данных настраиваются один раз для этого экземпляра WildFly. При повторной сборке достаточно последней команды с `--force`. Если PostgreSQL или WildFly запущены на другом адресе, измените `DB_URL` и адрес подключения CLI соответственно.

Статический интерфейс запускается отдельно:

```bash
cd JS
python3 -m http.server 5500
```

Откройте <http://127.0.0.1:5500/login.html>. Сначала войдите под администратором из `.env`, чтобы добавлять студентов. Обычного пользователя можно зарегистрировать на странице входа; ему доступен просмотр.

## Адреса API

| Метод | Адрес | Назначение | Роль |
|---|---|---|---|
| POST | `/api/auth/register` | Регистрация USER | Без токена |
| POST | `/api/auth/login` | Вход, выдача access и refresh JWT | Без токена |
| POST | `/api/auth/refresh` | Новая пара JWT по refresh-токену | Без токена |
| GET | `/api/auth/me` | Текущий пользователь | USER/ADMIN |
| GET | `/api/students/` | Список и фильтры | USER/ADMIN |
| QUERY | `/api/students/` | Фильтры в JSON-теле | USER/ADMIN |
| GET | `/api/students/{isuId}/` | Карточка | USER/ADMIN |
| POST | `/api/students/` | Создание | ADMIN |
| PUT | `/api/students/{isuId}/` | Полное обновление | ADMIN |
| PATCH | `/api/students/{isuId}/` | Частичное обновление | ADMIN |
| DELETE | `/api/students/{isuId}/` | Удаление | ADMIN |

Для защищённых запросов нужен заголовок `Authorization: Bearer <accessToken>`. Access-токен по умолчанию действует 15 минут, refresh-токен 7 дней; сроки меняются через `.env`. При HTTP 401 интерфейс автоматически получает новую пару по refresh-токену.

Фильтры: `fullName`, `group`, `isuId`, `dormitory`, `room`, `isForeign`, `settlementDate`, `dateFrom`, `dateTo`, `search`. Для порядка добавьте `sort` (`fullName`, `group`, `isuId`, `dormitory`, `room`, `settlementDate`, `isForeign`) и `order` (`asc`/`desc`). `page` и `size` включают пагинацию (размер до 100). Без этих двух параметров возвращается весь список: это сохраняет работу старого интерфейса. Общее число записей находится в заголовке `X-Total-Count`.

## Как устроен код

1. `api/` принимает HTTP-запросы и возвращает JSON; `ApiExceptionMapper` задаёт единый ответ при ошибке.
2. `security/SecurityFilter` проверяет подпись JWT, находит пользователя в базе и проверяет роль до вызова метода. `CorsFilter` обрабатывает адреса статического клиента и запросы OPTIONS.
3. `service/` проверяет данные и содержит операции над студентами и пользователями.
4. `repository/` выполняет запросы JPA. Список строится Criteria API: условия применяются в PostgreSQL, там же выполняются сортировка и пагинация.
5. `model/` описывает таблицы `students` и `app_users`. В базе хранится BCrypt-хеш пароля, а не пароль. Hibernate создаёт или обновляет таблицы при запуске учебного приложения.
6. `dto/` определяет JSON, который приходит и уходит по API. Это отделяет структуру ответа от таблиц базы.

## Проверка

После запуска Java-сервера на порту 8000:

```bash
cd java-backend
mvn test
python3 scripts/smoke_test.py
```

Smoke-тест проверяет вход, регистрацию, права USER/ADMIN, создание, список, GET и QUERY фильтры, карточку, PUT, PATCH, удаление, refresh, ошибки и CORS. Тестового студента он удаляет в конце. Для другого порта задайте `API_URL`, например `API_URL=http://127.0.0.1:18000/api/ python3 scripts/smoke_test.py`.

В Postman импортируйте коллекцию. В запросе «Вход ADMIN» замените демонстрационный пароль своим паролем из `.env`, затем выполняйте запросы по порядку. Для просмотра OpenAPI импортируйте файл `src/main/webapp/openapi.yaml` в Swagger Editor; нестандартный метод QUERY описан как расширение `x-query`.
