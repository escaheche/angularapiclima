import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeatherService, CombinedWeather } from '../../services/weather';
import { finalize } from 'rxjs';

type Status = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weather.html',
  styleUrl: './weather.scss',
})
export class Weather {
  private weatherService = inject(WeatherService);

  city = signal('Temuco');
  status = signal<Status>('idle');
  error = signal<{ status: number; message: string } | null>(null);
  data = signal<CombinedWeather | null>(null);
  // Para mostrar 401 redirect fake
  showLoginRedirect = signal(false);

  search() {
    const query = this.city().trim();
    if (!query) {
      this.status.set('error');
      this.error.set({ status: 400, message: 'Por favor ingresa una ciudad.' });
      return;
    }
    if (query.length < 2) {
      this.status.set('error');
      this.error.set({ status: 400, message: 'Mínimo 2 caracteres. Ej: "Lima", "Temuco"' });
      return;
    }

    this.status.set('loading');
    this.error.set(null);
    this.showLoginRedirect.set(false);
    this.data.set(null);

    this.weatherService.getWeatherByCity(query)
      .pipe(finalize(() => {
        // spinner se oculta solo via status change
      }))
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.status.set('success'); // 200 OK -> renderizar
        },
        error: (err: any) => {
          this.status.set('error');
          const mapped = {
            status: err.status || 500,
            message: err.message || 'Error inesperado'
          };
          this.error.set(mapped);

          // Acción Frontend según tabla de códigos
          if (mapped.status === 401) {
            this.showLoginRedirect.set(true);
            // Simular redirect
            setTimeout(() => alert('🔒 401 Unauthorized → Redirigiendo a Login... (simulado)'), 300);
          }
        }
      });
  }

  onKeyEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') this.search();
  }

  get info() {
    const d = this.data();
    if (!d) return null;
    return this.weatherService.getWeatherInfo(d.weather.current.weather_code);
  }

  get clothingTip() {
    const d = this.data();
    if (!d) return '';
    return this.weatherService.getClothingAdvice(d.weather.current.temperature_2m, d.weather.current.weather_code);
  }

  get dailyForecast() {
    const d = this.data();
    if (!d) return [];
    return d.weather.daily.time.map((date, i) => ({
      date,
      max: d.weather.daily.temperature_2m_max[i],
      min: d.weather.daily.temperature_2m_min[i],
      code: d.weather.daily.weather_code[i],
      precip: d.weather.daily.precipitation_sum[i],
      info: this.weatherService.getWeatherInfo(d.weather.daily.weather_code[i])
    }));
  }

  // helpers UI
  formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  quickCities = ['Temuco', 'Santiago', 'Lima', 'Bogotá', 'Buenos Aires', 'Madrid', 'Ciudad de México'];

  selectQuick(city: string) {
    this.city.set(city);
    this.search();
  }
}
