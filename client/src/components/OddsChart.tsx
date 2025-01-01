import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const demoData = [
  { time: "12:00", odds: 3.5 },
  { time: "12:05", odds: 3.7 },
  { time: "12:10", odds: 3.2 },
  { time: "12:15", odds: 3.4 },
  { time: "12:20", odds: 3.6 },
];

export default function OddsChart() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Odds Movement</h2>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={demoData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="odds"
              stroke="hsl(var(--primary))"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
