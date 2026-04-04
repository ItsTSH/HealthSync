export function toDateKey(date: Date) {
  return date.toLocaleDateString("en-CA") // YYYY-MM-DD, local TZ
}