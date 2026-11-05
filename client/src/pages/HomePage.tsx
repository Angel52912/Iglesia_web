import { useAuth } from '../auth/useAuth';
import { DashboardPanel } from '../features/dashboard/DashboardPanel';

const longDate = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function HomePage(): React.JSX.Element {
  const { user } = useAuth();
  if (!user) return <></>;

  const now = new Date();
  const firstName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;

  return (
    <main className="page">
      <section className="hero" aria-label="Bienvenida">
        <p className="hero__date">{longDate.format(now)}</p>
        <h1 className="hero__title">
          {greeting(now.getHours())}, {firstName}
        </h1>
        <blockquote className="hero__verse">
          <p>“Todo lo que hagan, háganlo de corazón, como para el Señor.”</p>
          <cite>Colosenses 3:23</cite>
        </blockquote>
      </section>
      <DashboardPanel />
    </main>
  );
}
