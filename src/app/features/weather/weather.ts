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
  showLoginRedirect = signal(false);

  // Toast éxito 200 OK
  toastVisible = signal(false);
  toastMessage = signal('');
  private toastTimer: any = null;

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

    this.weatherService.getWeatherByCity(query)
      .pipe(finalize(() => {}))
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.status.set('success');
          this.showToast(`✓ 200 OK — ${res.location.name} cargado correctamente`);
        },
        error: (err: any) => {
          this.status.set('error');
          const mapped = {
            status: err.status || 500,
            message: err.message || 'Error inesperado'
          };
          this.error.set(mapped);
          if (mapped.status === 401) {
            this.showLoginRedirect.set(true);
            setTimeout(() => alert('🔒 401 Unauthorized → Redirigiendo a Login... (simulado)'), 300);
          }
        }
      });
  }

  private showToast(msg: string) {
    this.toastMessage.set(msg);
    this.toastVisible.set(true);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible.set(false), 3500);
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

  // ---- Gráfico horario ----
  get hourlyChart() {
    const d = this.data();
    if (!d?.weather.hourly) return [];
    const hourly = d.weather.hourly;
    const currentTime = d.weather.current.time; // ej "2026-08-28T20:00"
    // buscar índice más cercano a currentTime
    let startIdx = hourly.time.findIndex(t => t === currentTime);
    if (startIdx === -1) {
      // fallback: buscar la hora actual más cercana
      const now = new Date(currentTime).getTime();
      let best = 0, bestDiff = Infinity;
      hourly.time.forEach((t, i) => {
        const diff = Math.abs(new Date(t).getTime() - now);
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      });
      startIdx = best;
    }
    const slice = [];
    for (let i = startIdx; i < Math.min(startIdx + 24, hourly.time.length); i++) {
      const temp = hourly.temperature_2m[i];
      const code = hourly.weather_code[i];
      slice.push({
        time: hourly.time[i],
        temp,
        code,
        info: this.weatherService.getWeatherInfo(code),
        label: new Date(hourly.time[i]).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        hour: new Date(hourly.time[i]).getHours()
      });
    }
    return slice;
  }

  get hourlyStats() {
    const chart = this.hourlyChart;
    if (!chart.length) return { min: 0, max: 0, avg: 0 };
    const temps = chart.map(c => c.temp);
    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((a, b) => a + b, 0) / temps.length
    };
  }

  // SVG helpers
  get chartPoints(): string {
    const chart = this.hourlyChart;
    if (!chart.length) return '';
    const { min, max } = this.hourlyStats;
    const range = max - min || 1;
    const w = 800, h = 100, pad = 12;
    // 24 puntos equidistantes
    return chart.map((p, i) => {
      const x = pad + (i / (chart.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.temp - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
  }

  get chartAreaPoints(): string {
    const pts = this.chartPoints;
    if (!pts) return '';
    const w = 800, h = 100, pad = 12;
    // cerrar área abajo
    const firstX = pts.split(' ')[0].split(',')[0];
    const lastX = pts.split(' ').at(-1)!.split(',')[0];
    return `${pts} ${lastX},${h - pad} ${firstX},${h - pad}`;
  }

  get chartDots() {
    const chart = this.hourlyChart;
    const { min, max } = this.hourlyStats;
    const range = max - min || 1;
    const w = 800, h = 100, pad = 12;
    return chart.map((p, i) => ({
      x: pad + (i / (chart.length - 1)) * (w - pad * 2),
      y: h - pad - ((p.temp - min) / range) * (h - pad * 2),
      temp: p.temp,
      label: p.label
    }));
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  quickCities = ['Temuco', 'Santiago', 'Lima', 'Bogotá', 'Buenos Aires', 'Madrid', 'Ciudad de México'];

  selectQuick(city: string) {
    this.city.set(city);
    this.search();
  }
}
