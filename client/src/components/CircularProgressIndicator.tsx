interface CircularProgressIndicatorProps {
  value: number;
  maxValue: number;
  label: string;
  color: string;
}

export function CircularProgressIndicator({ 
  value, 
  maxValue, 
  label, 
  color 
}: CircularProgressIndicatorProps) {
  const percentage = (value / maxValue) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-gray-200"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="40"
          cx="50%"
          cy="50%"
        />
        <circle
          className="transition-all duration-300 ease-in-out"
          strokeWidth="8"
          stroke={color}
          fill="transparent"
          r="40"
          cx="50%"
          cy="50%"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xl font-bold">{value.toFixed(0)}%</span>
      </div>
    </div>
  );
} 