import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DataItem {
  name: string;
  hodnota: number;
  barva: string;
}

interface PieChartProps {
  data: DataItem[];
  title: string;
  totalValue: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, title, totalValue }) => {
  return (
    <div className="chart-container half">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="hodnota"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.barva} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`$${value} (${((value/totalValue)*100).toFixed(1)}%)`, ""]} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;