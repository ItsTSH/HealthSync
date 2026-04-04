"use client";

export function TodayDate() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return <h3 className="py-2 text-muted-foreground">{today}</h3>;
}