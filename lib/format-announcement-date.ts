const announcementDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatAnnouncementDateTime(value: string) {
  return announcementDateTimeFormatter.format(new Date(value));
}
