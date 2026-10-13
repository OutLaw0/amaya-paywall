# Amaya — мобильный paywall

Тестовая покупка без денег и платёжного SDK. [Макет Figma](https://www.figma.com/design/w5pacUQ9UkczKkJRdzQLMS?node-id=2-25) · [Живое приложение](https://amaya-paywall-beige.vercel.app). Исходники — в этом репозитории.

## Запуск

Node **24.15+**, npm. Выполнить `npm ci`, скопировать `.env.example` в `.env`, указать `NUXT_SUPABASE_URL` и серверный `NUXT_SUPABASE_SECRET_KEY`, затем `npm run dev`. Сначала применить `supabase/migrations/202610130001_purchases.sql` к своему Supabase-проекту. Без настроенной БД тарифы доступны, покупка и восстановление возвращают 503.

## Структура и поведение

Frontend — `app/` (Vue-компоненты, composable, CSS); API-типы — `shared/types/`. `server/api/` содержит `GET /api/offers`, `POST /api/purchase` и `POST /api/restore`. Работа с БД — `server/utils/database.ts`; проверка запросов и сроки доступа — `server/utils/purchases.ts`. Покупка хранит тариф, UUID устройства/запроса и время. Уникальный UUID запроса предотвращает дубли при повторе. Доступ: календарный месяц или год; без автопродления. Восстановление — по UUID этого браузера в localStorage, без авторизации; очистка данных или другое устройство теряют связь с покупкой.

## Деплой и БД

**Vercel + Supabase PostgreSQL**: Vercel запускает Nitro server routes, Supabase сохраняет данные независимо от перезапуска функций. В Vercel выбрать Nuxt, Node 24, добавить две переменные из `.env` и выполнить deploy. `vercel.json` содержит настройки сборки. Секретный API-ключ используется только на сервере; таблица закрыта RLS и не доступна anonymous/authenticated клиентам. Это демонстрация, не система защиты платного контента.

## Проверки и AI

AI-инструменты: Codex для реализации и тестов, Figma-интеграция для создания редактируемого макета, Supabase-интеграция для миграции. Выполнены `npm run check` (lint, TypeScript, 20 серверных/HTTP-тестов, build) и 12 Playwright-сценариев Chromium/WebKit: клавиатура, загрузка/ошибка/повтор, успех, восстановление, localStorage и ширины 360/390/430 px. Браузерные покупки используют mock API. Реальная запись, повтор без дубля и восстановление проверены через локальный Nitro и опубликованный Vercel API; сохранение подтверждено SQL-запросом в Supabase. Агент визуально просмотрел скриншот; pixelmatch показал **0,942%** расхождения с Figma при 390×844, DPR 1 и grayscale-сглаживании (порог цвета 0.1, допуск ≤1%). Повтор: `npm run test:e2e`, затем `npm run visual:compare`. Реальный iOS/Android webview пока не проверен.

На Vercel покупка и восстановление после перезагрузки проверены во встроенном браузере. Playwright против внешнего домена остановлен из-за таймаута навигации; успешные 12 сценариев относятся к локальной production-сборке.

За следующие 2 часа: проверить настоящие WKWebView/Android WebView и safe-area, добавить ограничение частоты запросов и серверный device token. Установленные зависимости имеют транзитивные npm audit notices в tooling Nuxt (braces/node-forge); исправлений в опубликованных версиях пока нет, DevTools отключены.
