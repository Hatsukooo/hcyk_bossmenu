import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FinanceData } from '../../types';

interface BarChartProps {
  data: FinanceData[];
  title: string;
  dataKey: string;
  color: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, title, dataKey, color }) => {
  return (
    <div className="chart-container half">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => [`$${value}`, ""]} />
          <Bar dataKey={dataKey} fill={color} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;