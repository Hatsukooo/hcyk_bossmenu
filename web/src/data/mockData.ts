import { Employee, Position, Candidate, Player, FinanceData, ExpenseData } from '../types';

export const employees: Employee[] = [
  { id: 1, name: "John Doe", role: "Manager", salary: 1500, level: 3, performance: 85 },
  { id: 2, name: "Jane Smith", role: "Associate", salary: 900, level: 1, performance: 72 },
  { id: 3, name: "Mike Johnson", role: "Security", salary: 1100, level: 2, performance: 65 },
];

export const positions: Position[] = [
  { id: 1, name: "Manager", baseSalary: 1500, requirements: "Leadership, Management skills" },
  { id: 2, name: "Security", baseSalary: 1100, requirements: "Physical fitness, Combat experience" },
  { id: 3, name: "Associate", baseSalary: 900, requirements: "Customer service, Sales experience" },
  { id: 4, name: "Driver", baseSalary: 950, requirements: "Valid driver's license, Clean record" },
];

export const nearbyPlayers: Player[] = [
  { id: 1, name: "Alex Brown" },
  { id: 2, name: "Sarah Lee" },
  { id: 3, name: "Tom Wilson" },
  { id: 4, name: "Emily Davis" },
];

export const financeData: FinanceData[] = [
  { month: 'Led', příjmy: 18500, výdaje: 14800, zisk: 3700 },
  { month: 'Úno', příjmy: 20300, výdaje: 16200, zisk: 4100 },
  { month: 'Bře', příjmy: 19700, výdaje: 15900, zisk: 3800 },
  { month: 'Dub', příjmy: 22400, výdaje: 17300, zisk: 5100 },
  { month: 'Kvě', příjmy: 21800, výdaje: 16800, zisk: 5000 },
  { month: 'Čvn', příjmy: 23900, výdaje: 17500, zisk: 6400 },
  { month: 'Čvc', příjmy: 24500, výdaje: 18300, zisk: 6200 },
];

export const expensesData: ExpenseData[] = [
  { name: 'Mzdy zaměstnanců', hodnota: 12600, barva: '#ff3b30' },
  { name: 'Provozní náklady', hodnota: 3800, barva: '#ff9500' },
  { name: 'Údržba', hodnota: 1200, barva: '#5ac8fa' },
  { name: 'Ostatní', hodnota: 700, barva: '#5856d6' },
];