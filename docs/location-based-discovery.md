# Free location-based salon discovery

The public salon directory supports GPS-based nearby search and manual city/area search without a paid maps API.

## Free services used

- Browser Geolocation API: reads the visitor's current coordinates only after permission is granted.
- MongoDB 2dsphere index: searches salons by distance using GeoJSON points.
- OpenStreetMap: provides free map links for salon locations.
- No Google Maps, Mapbox, geocoding API key, or additional npm package is required.

OpenStreetMap's public map services have a usage policy and are not an unlimited tile-hosting service. This implementation links to OpenStreetMap rather than downloading or proxying map tiles.

## Publish a salon's coordinates

A salon owner, admin, or manager can:

1. Open the salon workspace.
2. Go to **Settings**.
3. Enter the salon address.
4. Use **Use this device GPS** while physically at the salon, or enter latitude and longitude copied from OpenStreetMap.
5. Save settings.

Both latitude and longitude are required. Valid ranges are latitude -90 to 90 and longitude -180 to 180. Coordinates are stored as a GeoJSON Point in the salon document:

```json
{
  "type": "Point",
  "coordinates": [89.5403, 22.8456]
}
```

The order is longitude first, latitude second, as required by GeoJSON.

## Visitor experience

On **Find a Salon**, visitors can:

- Choose **Use my location** and allow browser GPS permission.
- Search within 1, 5, 10, 25, or 50 km.
- Search by city or area without sharing GPS coordinates.
- Open a salon's location on OpenStreetMap.

Visitor GPS coordinates are sent to the nearby-search endpoint for that request only. They are not written to the database or associated with an account. The browser Geolocation API generally requires HTTPS (localhost is also allowed during development).

## Database index

The application creates a 2dsphere index named `salon_location_2dsphere`. MongoDB 2dsphere indexes are sparse by default, so salon documents without a GeoJSON `location` are not indexed. The public discovery endpoint ensures this index exists before running a geospatial query.

Salons without coordinates remain discoverable by name/address through manual area search, but they cannot appear in GPS radius results until an owner adds their coordinates.

## Operational note

OpenStreetMap's search links can locate an address, but they do not automatically geocode an address into precise coordinates in this application. For accurate nearby ranking, salon owners should save the salon's actual coordinates.
