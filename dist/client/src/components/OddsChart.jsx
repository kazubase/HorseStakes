import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export default function OddsChart(_a) {
    var raceId = _a.raceId, horseName = _a.horseName;
    var _b = useQuery({
        queryKey: ["/api/odds-history/".concat(raceId, "/").concat(horseName)],
        refetchInterval: 30000, // 30秒ごとに更新
    }), oddsHistory = _b.data, isLoading = _b.isLoading;
    if (isLoading) {
        return (<Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48"/>
            <Skeleton className="h-[300px] w-full"/>
          </div>
        </CardContent>
      </Card>);
    }
    var formattedData = oddsHistory === null || oddsHistory === void 0 ? void 0 : oddsHistory.map(function (data) { return ({
        time: format(new Date(data.timestamp), 'HH:mm'),
        odds: data.odds,
    }); });
    return (<Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">オッズ推移</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted"/>
              <XAxis dataKey="time" tick={{ fontSize: 12 }} tickLine={{ stroke: 'hsl(var(--muted))' }}/>
              <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: 'hsl(var(--muted))' }} domain={['auto', 'auto']}/>
              <Tooltip contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
        }} labelStyle={{ color: 'hsl(var(--muted-foreground))' }}/>
              <Legend />
              <Line type="monotone" dataKey="odds" name="オッズ" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>);
}
