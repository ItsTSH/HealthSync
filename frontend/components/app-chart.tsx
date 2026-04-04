"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "An interactive line chart"

const chartData = [
  { date: "2024-04-01", offline: 12, online: 4 },
  { date: "2024-04-02", offline: 9, online: 3 },
  { date: "2024-04-03", offline: 11, online: 2 },
  { date: "2024-04-04", offline: 14, online: 5 },
  { date: "2024-04-05", offline: 16, online: 6 },
  { date: "2024-04-06", offline: 13, online: 4 },
  { date: "2024-04-07", offline: 10, online: 3 },
  { date: "2024-04-08", offline: 15, online: 5 },
  { date: "2024-04-09", offline: 6, online: 2 },
  { date: "2024-04-10", offline: 12, online: 4 },
  { date: "2024-04-11", offline: 14, online: 6 },
  { date: "2024-04-12", offline: 13, online: 4 },
  { date: "2024-04-13", offline: 15, online: 7 },
  { date: "2024-04-14", offline: 8, online: 3 },
  { date: "2024-04-15", offline: 7, online: 2 },
  { date: "2024-04-16", offline: 9, online: 3 },
  { date: "2024-04-17", offline: 17, online: 6 },
  { date: "2024-04-18", offline: 16, online: 7 },
  { date: "2024-04-19", offline: 11, online: 3 },
  { date: "2024-04-20", offline: 5, online: 2 },
  { date: "2024-04-21", offline: 8, online: 3 },
  { date: "2024-04-22", offline: 10, online: 3 },
  { date: "2024-04-23", offline: 9, online: 4 },
  { date: "2024-04-24", offline: 14, online: 5 },
  { date: "2024-04-25", offline: 11, online: 4 },
  { date: "2024-04-26", offline: 6, online: 2 },
  { date: "2024-04-27", offline: 15, online: 8 },
  { date: "2024-04-28", offline: 7, online: 3 },
  { date: "2024-04-29", offline: 12, online: 4 },
  { date: "2024-04-30", offline: 16, online: 6 },
  { date: "2024-05-01", offline: 9, online: 3 },
  { date: "2024-05-02", offline: 13, online: 5 },
  { date: "2024-05-03", offline: 10, online: 3 },
  { date: "2024-05-04", offline: 15, online: 7 },
  { date: "2024-05-05", offline: 17, online: 6 },
  { date: "2024-05-06", offline: 18, online: 8 },
  { date: "2024-05-07", offline: 14, online: 4 },
  { date: "2024-05-08", offline: 8, online: 3 },
  { date: "2024-05-09", offline: 10, online: 2 },
  { date: "2024-05-10", offline: 13, online: 5 },
  { date: "2024-05-11", offline: 12, online: 4 },
  { date: "2024-05-12", offline: 9, online: 3 },
  { date: "2024-05-13", offline: 8, online: 2 },
  { date: "2024-05-14", offline: 17, online: 7 },
  { date: "2024-05-15", offline: 16, online: 6 },
  { date: "2024-05-16", offline: 14, online: 5 },
  { date: "2024-05-17", offline: 17, online: 6 },
  { date: "2024-05-18", offline: 13, online: 4 },
  { date: "2024-05-19", offline: 9, online: 2 },
  { date: "2024-05-20", offline: 7, online: 2 },
  { date: "2024-05-21", offline: 5, online: 1 },
  { date: "2024-05-22", offline: 4, online: 1 },
  { date: "2024-05-23", offline: 12, online: 4 },
  { date: "2024-05-24", offline: 11, online: 3 },
  { date: "2024-05-25", offline: 10, online: 4 },
  { date: "2024-05-26", offline: 9, online: 2 },
  { date: "2024-05-27", offline: 16, online: 7 },
  { date: "2024-05-28", offline: 10, online: 3 },
  { date: "2024-05-29", offline: 6, online: 2 },
  { date: "2024-05-30", offline: 14, online: 4 },
  { date: "2024-05-31", offline: 8, online: 3 },
  { date: "2024-06-01", offline: 9, online: 3 },
  { date: "2024-06-02", offline: 17, online: 6 },
  { date: "2024-06-03", offline: 7, online: 2 },
  { date: "2024-06-04", offline: 16, online: 5 },
  { date: "2024-06-05", offline: 6, online: 2 },
  { date: "2024-06-06", offline: 12, online: 4 },
  { date: "2024-06-07", offline: 13, online: 5 },
  { date: "2024-06-08", offline: 15, online: 5 },
  { date: "2024-06-09", offline: 17, online: 7 },
  { date: "2024-06-10", offline: 8, online: 3 },
  { date: "2024-06-11", offline: 6, online: 2 },
  { date: "2024-06-12", offline: 18, online: 6 },
  { date: "2024-06-13", offline: 5, online: 2 },
  { date: "2024-06-14", offline: 16, online: 5 },
  { date: "2024-06-15", offline: 14, online: 5 },
  { date: "2024-06-16", offline: 13, online: 4 },
  { date: "2024-06-17", offline: 17, online: 7 },
  { date: "2024-06-18", offline: 6, online: 2 },
  { date: "2024-06-19", offline: 13, online: 4 },
  { date: "2024-06-20", offline: 15, online: 6 },
  { date: "2024-06-21", offline: 8, online: 3 },
  { date: "2024-06-22", offline: 12, online: 4 },
  { date: "2024-06-23", offline: 17, online: 7 },
  { date: "2024-06-24", offline: 7, online: 2 },
  { date: "2024-06-25", offline: 8, online: 3 },
  { date: "2024-06-26", offline: 16, online: 5 },
  { date: "2024-06-27", offline: 17, online: 6 },
  { date: "2024-06-28", offline: 9, online: 3 },
  { date: "2024-06-29", offline: 7, online: 2 },
  { date: "2024-06-30", offline: 16, online: 6 },
];


const chartConfig = {
  views: {
    label: "Patients",
  },
  offline: {
    label: "Offline",
    color: "var(--chart-1)",
  },
  online: {
    label: "Online",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartLineInteractive() {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("offline")

  const total = React.useMemo(
    () => ({
      offline: chartData.reduce((acc, curr) => acc + curr.offline, 0),
      online: chartData.reduce((acc, curr) => acc + curr.online, 0),
    }),
    []
  )

  return (
    <Card className="py-4 sm:py-0 border-border drop-shadow">
      <CardHeader className="flex flex-col items-stretch border-border !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Total Patients</CardTitle>
          <CardDescription>
            No of patients in the last 3 months
          </CardDescription>
        </div>
        <div className="flex">
          {["offline", "online"].map((key) => {
            const chart = key as keyof typeof chartConfig
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 border-border drop-shadow"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={`var(--color-${activeChart})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}