import { useEffect, useState } from 'react';

interface CountUpProps {
  target: number;
  suffix?: string;
  duration?: number;
}

export default function CountUp({ target, suffix = '', duration = 1500 }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return (
    <span className="font-['Playfair_Display'] text-5xl font-bold" style={{ color: 'var(--color-brand)' }}>
      {count}{suffix}
    </span>
  );
}
