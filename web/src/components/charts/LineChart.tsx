import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FinanceData } from '../../types';

interface LineChartProps {
  data: FinanceData[];
  title: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, title }) => {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => [`$${value}`, ""]} />
          <Legend />
          <Line type="monotone" dataKey="příjmy" stroke="#4cd964" strokeWidth={2} />
          <Line type="monotone" dataKey="výdaje" stroke="#ff3b30" strokeWidth={2} />
          <Line type="monotone" dataKey="zisk" stroke="#4a90e2" strokeWidth={2} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;