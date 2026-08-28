# ⛅ ClimaAhora — angularapiclima

> **"Como usuario, quiero ver el clima de mi ciudad, para saber cómo vestirme."**

App **Angular 22** con diseño moderno (glassmorphism) que consume las **APIs libres de Open-Meteo** (sin API Key). Ingresa una ciudad escrita y obtén datos geográficos + clima actual + pronóstico 5 días + consejo de vestimenta.

**Demo en vivo:** https://escaheche.github.io/angularapiclima/

![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular)
![Open-Meteo](https://img.shields.io/badge/API-Open--Meteo-0EA5E9?style=for-the-badge)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?style=for-the-badge&logo=github)
![Standalone](https://img.shields.io/badge/Standalone-Components-8B5CF6?style=for-the-badge)

---

## 📸 Preview
- **Búsqueda** por ciudad escrita (`input` + `Enter` + chips rápidos: Temuco, Santiago, Lima...)
- **Card principal** con temperatura, sensación térmica, humedad, viento, precipitación
- **Banner "¿Cómo vestirme?"** según `temperature_2m` + `weather_code` (WMO)
- **Pronóstico 5 días** con iconos y `temp_max / temp_min`
- **Estados**: `idle` / `loading` / `success` / `error`
- **Tabla HTTP** integrada en la vista

---

## 🎯 Historia de Usuario & Criterios

> **HU:** Como usuario, quiero ver el clima de mi ciudad, para saber cómo vestirme.

| Criterio de aceptación | Implementación |
|---|---|
| Al buscar `Temuco` debe mostrar clima actual | `WeatherService.getWeatherByCity('Temuco')` → geocoding + forecast |
| Manejar loading, éxito y error | `status: 'idle' \| 'loading' \| 'success' \| 'error'` en `weather.ts:7` |
| Diseño moderno, responsive y accesible | `weather.scss` con gradientes, glass, grid responsive |
| Mensajes amigables por código HTTP | `handleError()` mapea 400/401/404/500 |
| Consejo de vestimenta | `getClothingAdvice()` + `getWeatherInfo()` WMO |

---

## 🧩 Tecnologías que interactúan

| Capa | Tecnología | Rol |
|---|---|---|
| **Framework** | **Angular 22** Standalone, `provideRouter`, `provideHttpClient` | SPA, routing, DI |
| **Lenguaje** | TypeScript 6 + SCSS | Tipado, estilos modernos |
| **Estado UI** | `signal()` (`city`, `status`, `data`, `error`) | Reactividad sin RxState |
| **HTTP** | `HttpClient` + `HttpParams` + `catchError` + `switchMap` | Consumo API |
| **Reactivo** | RxJS `Observable`, `throwError`, `finalize` | Flujo encadenado |
| **API 1 - Geocoding** | `https://geocoding-api.open-meteo.com/v1/search` | Convierte `name=Temuco` → `latitude, longitude, timezone, country` |
| **API 2 - Forecast** | `https://api.open-meteo.com/v1/forecast` | `current=temperature_2m,apparent_temperature,weather_code...` + `daily=...&forecast_days=5` |
| **Deploy** | `angular-cli-ghpages` + GitHub Actions `deploy.yml` | Build con `--base-href` + `404.html` para SPA |
| **Tooling** | Angular CLI 22.1.6, Vite, Vitest, Prettier | Dev / Build / Test |

**Flujo:**
```
Usuario escribe "Temuco" → Weather.search() → WeatherService.searchCity() 
→ GET geocoding → toma results[0] (lat/lon) → switchMap → GET forecast → 
CombinedWeather {location, weather} → render 200 OK / loading / error
```

### APIs usadas

```http
# 1. Geocoding (la que pediste)
GET https://geocoding-api.open-meteo.com/v1/search?name=Temuco&count=1&language=es&format=json

# 2. Forecast (clima)
GET https://api.open-meteo.com/v1/forecast?latitude=-38.73&longitude=-72.59&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum&timezone=auto&forecast_days=5
```

Sin API Key, CORS habilitado, gratis.

---

## 🎨 Diseñando los estados de la pantalla

Implementado en `src/app/features/weather/weather.html` + `weather.ts:7`:

| Estado | Cuándo | UI |
|---|---|---|
| **Cargando** | `status() === 'loading'` durante espera de red | Spinner + skeleton shimmer + botón deshabilitado para evitar doble petición |
| **Éxito** | API respondió `200 OK` | Renderiza `weather-result` con datos limpios mapeados. WMO `weather_code` → icono/ropa |
| **Error** | `catchError` captura `4xx / 5xx` | Mensaje amigable, no técnico. Botones demo 400/401/404/500 |
| **Idle** | Inicial | Mensaje de bienvenida + criterios |

### Tabla de códigos HTTP → Acción en Frontend

| Código | Significado Técnico | Acción en el Frontend |
|---|---|---|
| `200 OK` | La petición fue exitosa | Ocultar spinner, renderizar datos |
| `400 Bad Request` | Datos mal formateados (ej. falta campo) | Mostrar error de validación en formulario |
| `401 Unauthorized` | Falta token / no autenticado | Redirigir a Login automáticamente (simulado con `alert`) |
| `404 Not Found` | Recurso no existe en BD | Mostrar estado vacío / "No encontrado" |
| `0 / 500` | Sin conexión / error servidor | "Verifica tu internet / Intenta más tarde" |

Código: `src/app/services/weather.ts:109` `handleError()` y `src/app/features/weather/weather.ts:53` `showLoginRedirect`.

---

## ✨ Features

- ✅ Búsqueda debounced vía `Enter` y botón con `disabled` en loading
- ✅ Validación `400` si ciudad < 2 chars
- ✅ Chips rápidos para probar ciudades
- ✅ Iconos WMO `0-99` (☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ ❄️ 🌫️) + descripción
- ✅ `getClothingAdvice(temp)` : `<=0° Parka` / `<=10° Abrigo` / `<=18° Chaqueta` / `<=25° Polera` / `>32° Mucho calor`
- ✅ Métricas: humedad, viento, precipitación
- ✅ 5 días: `daily.time` + `temperature_2m_max/min` + `precipitation_sum`
- ✅ Responsive (mobile 1 col, desktop 5 col)
- ✅ Accesible (`aria-label`, contraste)

---

## 📁 Estructura

```
src/
 ├─ app/
 │   ├─ app.config.ts        # provideHttpClient, provideRouter
 │   ├─ app.routes.ts        # lazy load Weather
 │   ├─ services/weather.ts  # Geocoding + Forecast + WMO map + handleError
 │   └─ features/weather/
 │        ├─ weather.ts      # signals + search() + estados
 │        ├─ weather.html    # estados + tabla HTTP
 │        └─ weather.scss    # glass + gradients
 ├─ styles.scss
 └─ index.html               # base href /
```

---

## 🚀 Instalación y uso

```bash
# 1. Clonar
git clone https://github.com/escaheche/angularapiclima.git
cd angularapiclima

# o si clonaste el folder clima-app:
cd clima-app

# 2. Instalar
npm install

# 3. Dev
npm start
# o
ng serve
# → http://localhost:4200

# 4. Build producción
npm run build
# dist/clima-app/browser

# 5. Build para GitHub Pages (base-href importante)
npm run build:ghpages
# ng build --base-href /angularapiclima/
```

---

## 🌍 Deploy a GitHub Pages

El repo ya trae 2 formas:

**A) Automático con GitHub Actions (recomendado)**
- Archivo: `.github/workflows/deploy.yml`
- Hace `npm ci` → `ng build --base-href /angularapiclima/` → `cp index.html 404.html` (fix SPA) → `actions/deploy-pages@v4`
- Actívalo: en GitHub ve a **Settings → Pages → Source: GitHub Actions**
- Cada `git push` a `master`/`main` despliega a `https://escaheche.github.io/angularapiclima/`

**B) Manual con angular-cli-ghpages**
```bash
npm run deploy
# = npm run build:ghpages && copy 404.html && npx angular-cli-ghpages --dir=dist/clima-app/browser
# Luego en Settings/Pages → Source: Deploy from a branch → gh-pages /root
```

> Si cambias el nombre del repo, cambia `/angularapiclima/` en `package.json:8` y `deploy.yml:30`.

---

## 🧪 Tests

```bash
ng test        # Vitest
```

---

## 🔮 Mejoras futuras

- Autocomplete con `count=5` del geocoding (selector de ciudades)
- Geolocalización `navigator.geolocation`
- Gráfico horario con `hourly=temperature_2m`
- i18n + PWA

---

## 👨‍💻 Autor

**escaheche** — https://github.com/escaheche/angularapiclima

Generado con Angular CLI 22.1.6. APIs por [Open-Meteo](https://open-meteo.com/).
