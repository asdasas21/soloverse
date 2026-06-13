import { useEffect, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { TooltipComponent, RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

echarts.use([RadarChart, TooltipComponent, RadarComponent, CanvasRenderer]);

interface RadarDataItem {
  name: string;
  value: number;
}

interface RadarChartProps {
  data: RadarDataItem[];
  title?: string;
  animate?: boolean;
}

export default function RadarChartWrapper({ data, animate = false }: RadarChartProps) {
  const [animatedValues, setAnimatedValues] = useState<number[]>(
    animate ? data.map(() => 0) : data.map((d) => d.value),
  );

  useEffect(() => {
    if (!animate) {
      setAnimatedValues(data.map((d) => d.value));
      return;
    }
    const targets = data.map((d) => d.value);
    const duration = 1000;
    const interval = 20;
    const steps = duration / interval;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValues(targets.map((t) => Math.round(eased * t)));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [animate, data]);

  const indicator = data.map((d) => ({
    name: d.name,
    max: 100,
  }));

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(250,249,245,0.95)',
      borderColor: '#e8e6dc',
      textStyle: { color: '#141413', fontFamily: "'DM Sans', sans-serif" },
      formatter: (params: unknown) => {
        const p = params as { name?: string; value?: number[] };
        return p.value ? `${p.name}: ${p.value[0]}分` : '';
      },
    },
    radar: {
      indicator,
      shape: 'polygon',
      radius: '68%',
      axisName: {
        color: '#5e5d59',
        fontSize: 12,
        fontFamily: "'DM Sans', sans-serif",
      },
      splitArea: {
        areaStyle: { color: ['rgba(201,100,66,0.02)', 'rgba(201,100,66,0.05)'] },
      },
      splitLine: {
        lineStyle: { color: '#e8e6dc' },
      },
      axisLine: {
        lineStyle: { color: '#e8e6dc' },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: animatedValues,
            name: '能力画像',
            areaStyle: { color: 'rgba(201,100,66,0.2)' },
            lineStyle: { color: '#c96442', width: 2 },
            itemStyle: { color: '#c96442' },
            symbol: 'circle',
            symbolSize: 6,
          },
        ],
      },
    ],
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ width: '100%', height: '100%' }}
      notMerge
      lazyUpdate
    />
  );
}
