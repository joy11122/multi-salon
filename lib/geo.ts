export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

export function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(toLat - fromLat);
  const dLng = radians(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
