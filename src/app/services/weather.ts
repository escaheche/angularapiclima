import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone: string;
  population?: number;
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
  generationtime_ms: number;
}

export interface WeatherCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
  precipitation: number;
}

export interface WeatherDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  precipitation_sum: number[];
}

export interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: WeatherCurrent;
  daily: WeatherDaily;
  hourly?: WeatherHourly;
  current_units?: any;
}

export interface CombinedWeather {
  location: GeocodingResult;
  weather: WeatherResponse;
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);

  private geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  private forecastUrl = 'https://api.open-meteo.com/v1/forecast';

  searchCity(city: string): Observable<GeocodingResult[]> {
    if (!city || city.trim().length < 2) {
      return throwError(() => ({ status: 400, message: 'Ingresa al menos 2 caracteres' }));
    }
    const params = new HttpParams()
      .set('name', city.trim())
      .set('count', '5')
      .set('language', 'es')
      .set('format', 'json');
    return this.http.get<GeocodingResponse>(this.geocodingUrl, { params }).pipe(
      map(res => {
        if (!res.results || res.results.length === 0) {
          throw { status: 404, message: `No se encontró "${city}". Verifica el nombre de la ciudad.` };
        }
        return res.results;
      }),
      catchError(this.handleError)
    );
  }

  getWeather(lat: number, lon: number): Observable<WeatherResponse> {
    const params = new HttpParams()
      .set('latitude', lat.toString())
      .set('longitude', lon.toString())
      .set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation')
      .set('hourly', 'temperature_2m,weather_code')
      .set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum')
      .set('timezone', 'auto')
      .set('forecast_days', '5');

    return this.http.get<WeatherResponse>(this.forecastUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getWeatherByCity(city: string): Observable<CombinedWeather> {
    return this.searchCity(city).pipe(
      switchMap(results => {
        const first = results[0];
        return this.getWeather(first.latitude, first.longitude).pipe(
          map(weather => ({ location: first, weather }))
        );
      }),
      catchError(this.handleError)
    );
  }

  private handleError = (error: HttpErrorResponse | any) => {
    // Si ya es nuestro error custom (404 del search vacío)
    if (error.status === 404 || error.status === 400) {
      return throwError(() => error);
    }
    if (error instanceof HttpErrorResponse) {
      let custom: any = { status: error.status, message: '' };
      switch (error.status) {
        case 400:
          custom.message = 'Solicitud incorrecta. Verifica el nombre de la ciudad.';
          break;
        case 401:
          custom.message = 'No autorizado. Serás redirigido al login.';
          break;
        case 404:
          custom.message = 'Ciudad no encontrada.';
          break;
        case 500:
        case 502:
        case 503:
          custom.message = 'Error del servidor. Intenta más tarde.';
          break;
        case 0:
          custom.message = 'Sin conexión. Verifica tu internet.';
          break;
        default:
          custom.message = error.message || 'Error inesperado';
      }
      return throwError(() => custom);
    }
    return throwError(() => error);
  };

  // WMO Weather interpretation codes  https://open-meteo.com/en/docs
  getWeatherInfo(code: number): { label: string; icon: string; desc: string; clothing: string } {
    const map: Record<number, any> = {
      0: { label: 'Despejado', icon: '☀️', desc: 'Cielo completamente despejado', clothing: 'Ropa ligera, gafas de sol y bloqueador' },
      1: { label: 'Mayormente despejado', icon: '🌤️', desc: 'Ligeramente nublado', clothing: 'Ropa ligera, ideal para salir' },
      2: { label: 'Parcialmente nublado', icon: '⛅', desc: 'Nubes dispersas', clothing: 'Lleva una chaqueta ligera por si acaso' },
      3: { label: 'Nublado', icon: '☁️', desc: 'Cielo cubierto', clothing: 'Chaqueta y ropa cómoda' },
      45: { label: 'Niebla', icon: '🌫️', desc: 'Niebla', clothing: 'Abrigo y conduce con precaución' },
      48: { label: 'Niebla con escarcha', icon: '🌫️', desc: 'Niebla densa', clothing: 'Abrigo grueso, bufanda' },
      51: { label: 'Llovizna ligera', icon: '🌦️', desc: 'Llovizna suave', clothing: 'Paraguas o impermeable ligero' },
      53: { label: 'Llovizna moderada', icon: '🌦️', desc: 'Llovizna', clothing: 'Impermeable y paraguas' },
      55: { label: 'Llovizna intensa', icon: '🌧️', desc: 'Llovizna fuerte', clothing: 'Impermeable, botas' },
      61: { label: 'Lluvia ligera', icon: '🌧️', desc: 'Lluvia suave', clothing: 'Paraguas, chaqueta impermeable' },
      63: { label: 'Lluvia moderada', icon: '🌧️', desc: 'Lluvia', clothing: 'Impermeable, evita ropa clara' },
      65: { label: 'Lluvia intensa', icon: '⛈️', desc: 'Lluvia fuerte', clothing: 'Impermeable total, quédate bajo techo si puedes' },
      71: { label: 'Nieve ligera', icon: '🌨️', desc: 'Nevada suave', clothing: 'Abrigo térmico, gorro y guantes' },
      73: { label: 'Nieve moderada', icon: '❄️', desc: 'Nevada', clothing: 'Ropa de invierno completa' },
      75: { label: 'Nieve intensa', icon: '❄️', desc: 'Nevada fuerte', clothing: 'Abrigo grueso, botas de nieve' },
      80: { label: 'Chubascos ligeros', icon: '🌦️', desc: 'Chubascos aislados', clothing: 'Paraguas a mano' },
      81: { label: 'Chubascos moderados', icon: '🌧️', desc: 'Chubascos', clothing: 'Impermeable' },
      82: { label: 'Chubascos fuertes', icon: '⛈️', desc: 'Chubascos intensos', clothing: 'No salgas sin impermeable' },
      95: { label: 'Tormenta', icon: '⛈️', desc: 'Tormenta eléctrica', clothing: 'Evita salir, ropa abrigada' },
      96: { label: 'Tormenta con granizo', icon: '⛈️', desc: 'Tormenta con granizo leve', clothing: 'Permanecer bajo techo' },
      99: { label: 'Tormenta con granizo', icon: '⛈️', desc: 'Tormenta con granizo fuerte', clothing: 'No salir' },
    };
    return map[code] || { label: `Código ${code}`, icon: '🌡️', desc: 'Condición variable', clothing: 'Viste por capas' };
  }

  getClothingAdvice(temp: number, code: number): string {
    if (temp <= 0) return '¡Mucho frío! Parka, gorro, guantes y bufanda.';
    if (temp <= 10) return 'Frío. Abrigo grueso y ropa en capas.';
    if (temp <= 18) return 'Fresco. Chaqueta ligera o suéter.';
    if (temp <= 25) return 'Templado. Polera y pantalón cómodo.';
    if (temp <= 32) return 'Calor. Ropa ligera, hidrátate bien.';
    return 'Mucho calor. Ropa muy ligera, gorro y agua.';
  }
}
