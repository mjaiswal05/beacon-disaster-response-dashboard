// Authenticated service for all /api/observability/v1 endpoints.
// See src/utils/request.ts for the underlying HTTP utility.
import { DEFAULT_CITY_ID } from "../hooks/useGeoDefaults";
import type {
  AlertCorrelation,
  City,
  CorrelateAlertRequest,
  Country,
  FireStationLocation,
  GeoState,
  GetStopForecastParams,
  HospitalLocation,
  KeywordHit,
  ListKeywordHitsParams,
  ListLuasForecastsParams,
  ListPowerOutagesParams,
  ListSensorReadingsParams,
  ListTrafficFlowsParams,
  ListTrafficIncidentsParams,
  ListTrainsParams,
  ListUnconfirmedWarningsParams,
  ListVehicleLocationsParams,
  ListVehiclesParams,
  LuasForecast,
  OutageDetails,
  PaginatedResponse,
  PoliceStationLocation,
  PowerOutage,
  SearchPostsByLocationParams,
  SensorReading,
  ShelterLocation,
  SingleResponse,
  TrafficFlow,
  TrafficIncident,
  Train,
  UnconfirmedWarning,
  Vehicle,
  VehicleLocation,
  VehicleStatus,
  WeatherWarning,
} from "../types/observability.types";
import { request } from "../utils/request";

export type {
  AlertCorrelation,
  City,
  Country, FireStationLocation, GeoState, HospitalLocation,
  KeywordHit,
  LuasForecast,
  OutageDetails,
  PoliceStationLocation,
  PowerOutage,
  SensorReading,
  ShelterLocation,
  SocialAlert,
  TrafficFlow,
  TrafficIncident,
  Train,
  UnconfirmedWarning,
  Vehicle,
  VehicleLocation,
  VehicleStatus,
  WeatherWarning
} from "../types/observability.types";

const OBS = "/api/observability/v1";

// Transport - Bus

/** List vehicles in a city */
export async function listVehicles(
  cityId: string,
  params: ListVehiclesParams = {},
): Promise<Vehicle[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.vehicle_type) queryParams.vehicle_type = params.vehicle_type;
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<Vehicle>>(
    `${OBS}/cities/${encodeURIComponent(cityId)}/transport/vehicles`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Stream vehicle locations URL */
export function streamVehicleLocationsUrl(vehicleId: string): string {
  return `${OBS}/transport/vehicles/${encodeURIComponent(vehicleId)}/locations/stream`;
}

/** List vehicle locations */
export async function listVehicleLocations(
  vehicleId: string,
  params: ListVehicleLocationsParams = {},
): Promise<VehicleLocation[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<VehicleLocation>>(
    `${OBS}/transport/vehicles/${encodeURIComponent(vehicleId)}/locations`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Get vehicle status */
export async function getVehicleStatus(
  vehicleId: string,
): Promise<VehicleStatus> {
  const result = await request.get<SingleResponse<VehicleStatus>>(
    `${OBS}/transport/vehicles/${encodeURIComponent(vehicleId)}/status`,
  );
  return result.data;
}

// Transport - Luas (Tram)

/** List Luas forecasts for a country */
export async function listLuasForecasts(
  countryId: number,
  params: ListLuasForecastsParams = {},
): Promise<LuasForecast[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.line) queryParams.line = params.line;
  if (params.direction) queryParams.direction = params.direction;
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<LuasForecast>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/transport/luas/forecasts`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Get forecasts for a specific Luas stop */
export async function getStopForecast(
  countryId: number,
  stopCode: string,
  params: GetStopForecastParams = {},
): Promise<LuasForecast[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.direction) queryParams.direction = params.direction;

  const result = await request.get<SingleResponse<LuasForecast[]>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/transport/luas/stops/${encodeURIComponent(stopCode)}/forecasts`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** EventSource URL for streaming Luas forecasts */
export function streamLuasForecastsUrl(
  countryId: number,
  params?: { line?: string },
): string {
  const qs = new URLSearchParams();
  if (params?.line) qs.set("line", params.line);
  const query = qs.toString();
  return `${OBS}/countries/${encodeURIComponent(countryId)}/transport/luas/forecasts/stream${query ? `?${query}` : ""}`;
}

// Transport - Railway (Train)

/** List trains for a country */
export async function listTrains(
  countryId: number,
  params: ListTrainsParams = {},
): Promise<Train[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.train_status) queryParams.train_status = params.train_status;
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<Train>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/transport/railway/trains`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Get a specific train by code */
export async function getTrain(
  countryId: number,
  trainCode: string,
): Promise<Train> {
  const result = await request.get<SingleResponse<Train>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/transport/railway/trains/${encodeURIComponent(trainCode)}`,
  );
  return result.data;
}

/** EventSource URL for streaming train positions */
export function streamTrainPositionsUrl(countryId: number): string {
  return `${OBS}/countries/${encodeURIComponent(countryId)}/transport/railway/trains/stream`;
}

// Traffic

/** List traffic flows for a city */
export async function listTrafficFlows(
  cityId: string,
  params: ListTrafficFlowsParams = {},
): Promise<TrafficFlow[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.start) queryParams.start = params.start;
  if (params.end) queryParams.end = params.end;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<TrafficFlow>>(
    `${OBS}/cities/${encodeURIComponent(cityId)}/traffic/flows`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** EventSource URL for streaming traffic flows */
export function streamTrafficFlowsUrl(cityId: string): string {
  return `${OBS}/cities/${encodeURIComponent(cityId)}/traffic/flows/stream`;
}

/** List traffic incidents for a city */
export async function listTrafficIncidents(
  cityId: string,
  params: ListTrafficIncidentsParams = {},
): Promise<TrafficIncident[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.filter) queryParams.filter = params.filter;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;
  if (params.order_by) queryParams.order_by = params.order_by;

  const result = await request.get<PaginatedResponse<TrafficIncident>>(
    `${OBS}/cities/${encodeURIComponent(cityId)}/traffic/incidents`,
    { params: queryParams },
  );
  return result.data ?? [];
}

// Power

/** List power outages for a city */
export async function listPowerOutages(
  cityId: string,
  params: ListPowerOutagesParams = {},
): Promise<PowerOutage[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<PowerOutage>>(
    `${OBS}/cities/${encodeURIComponent(cityId)}/power/outages`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Get outage details */
export async function getOutageDetails(
  outageId: string,
): Promise<OutageDetails> {
  const result = await request.get<SingleResponse<OutageDetails>>(
    `${OBS}/power/outages/${encodeURIComponent(outageId)}`,
  );
  return result.data;
}

/** EventSource URL for streaming power usage */
export function streamPowerUsageUrl(cityId: string): string {
  return `${OBS}/cities/${encodeURIComponent(cityId)}/power/usage/stream`;
}

// Social / News

/** List keyword hits */
export async function listKeywordHits(
  params: ListKeywordHitsParams = {},
): Promise<KeywordHit[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.category) queryParams.category = params.category;
  if (params.platform) queryParams.platform = params.platform;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<KeywordHit>>(
    `${OBS}/cities/${encodeURIComponent(DEFAULT_CITY_ID)}/social/keyword-hits`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** List unconfirmed warnings */
export async function listUnconfirmedWarnings(
  params: ListUnconfirmedWarningsParams = {},
): Promise<UnconfirmedWarning[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.warning_type) queryParams.warning_type = params.warning_type;
  if (params.status) queryParams.status = params.status;
  if (params.min_credibility)
    queryParams.min_credibility = params.min_credibility;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<UnconfirmedWarning>>(
    `${OBS}/cities/${encodeURIComponent(DEFAULT_CITY_ID)}/social/warnings/unconfirmed`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Search social posts by location */
export async function searchPostsByLocation(
  params: SearchPostsByLocationParams,
): Promise<any[]> {
  const queryParams: Record<string, string | number> = {
    latitude: params.latitude,
    longitude: params.longitude,
    radius_km: params.radius_km,
  };
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/social/posts/search`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Correlate a social alert with an incident */
export async function correlateAlert(
  alertId: string,
  payload: CorrelateAlertRequest,
): Promise<AlertCorrelation> {
  const result = await request.post<SingleResponse<AlertCorrelation>>(
    `${OBS}/social/alerts/${encodeURIComponent(alertId)}/correlate`,
    payload,
  );
  return result.data;
}

/** EventSource URL for streaming social alerts */
export function streamSocialAlertsUrl(): string {
  return `${OBS}/social/alerts/stream`;
}

// Weather

/** Get current weather */
export async function getCurrentWeather(): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/weather/current`,
  );
  return result.data;
}

/** List rainfall intensity */
export async function listRainfallIntensity(): Promise<any[]> {
  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/weather/rainfall-intensity`,
  );
  return result.data ?? [];
}

/** List active weather warnings */
export async function listActiveWeatherWarnings(): Promise<WeatherWarning[]> {
  const result = await request.get<PaginatedResponse<WeatherWarning>>(
    `${OBS}/weather/warnings`,
  );
  return result.data ?? [];
}

/** Get air quality index */
export async function getAirQualityIndex(): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/weather/air-quality`,
  );
  return result.data;
}

// Water Level

/** List sensor readings for a country */
export async function listSensorReadings(
  countryId: number,
  params: ListSensorReadingsParams = {},
): Promise<SensorReading[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_offset) queryParams.page_offset = params.page_offset;

  const result = await request.get<PaginatedResponse<SensorReading>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/water/sensors/readings`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Get sensor status */
export async function getSensorStatus(
  countryId: number,
  sensorId: string,
): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/water/sensors/${encodeURIComponent(sensorId)}/status`,
  );
  return result.data;
}

/** List flood risk areas for a country */
export async function listFloodRiskAreas(countryId: number): Promise<any[]> {
  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/water/flood-risk-areas`,
  );
  return result.data ?? [];
}

/** EventSource URL for streaming river levels */
export function streamRiverLevelsUrl(countryId: number): string {
  return `${OBS}/countries/${encodeURIComponent(countryId)}/water/river-levels/stream`;
}

// Hospitals

/** List hospital statuses for a country */
export async function listHospitalStatuses(countryId: number): Promise<any[]> {
  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/hospitals/statuses`,
  );
  return result.data ?? [];
}

/** Get bed count for a hospital */
export async function getHospitalBedCount(
  countryId: number,
  hospitalId: string,
): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/hospitals/${encodeURIComponent(hospitalId)}/beds`,
  );
  return result.data;
}

/** List nearby hospitals */
export async function listNearHospitals(
  countryId: number,
  params?: { latitude?: number; longitude?: number; radius_km?: number },
): Promise<any[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.latitude) queryParams.latitude = params.latitude;
  if (params?.longitude) queryParams.longitude = params.longitude;
  if (params?.radius_km) queryParams.radius_km = params.radius_km;

  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/hospitals/near`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Get hospital capacity rating */
export async function getHospitalCapacityRating(
  countryId: number,
  hospitalId: string,
): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/hospitals/${encodeURIComponent(hospitalId)}/capacity`,
  );
  return result.data;
}

// Ambulance

/** List ambulance locations for a country */
export async function listAmbulanceLocations(
  countryId: number,
): Promise<any[]> {
  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/ambulances/locations`,
  );
  return result.data ?? [];
}

/** Get closest ambulance */
export async function getClosestAmbulance(
  countryId: number,
  params: { latitude: number; longitude: number },
): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/ambulances/closest`,
    { params },
  );
  return result.data;
}

/** List ambulance dispatches */
export async function listDispatches(countryId: number): Promise<any[]> {
  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/ambulances/dispatches`,
  );
  return result.data ?? [];
}

/** EventSource URL for streaming ambulance locations */
export function streamAmbulanceLocationsUrl(countryId: number): string {
  return `${OBS}/countries/${encodeURIComponent(countryId)}/ambulances/locations/stream`;
}

// Emergency Services

/** List emergency service units for a country */
export async function listServiceUnits(countryId: number): Promise<any[]> {
  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/emergency/units`,
  );
  return result.data ?? [];
}

/** Get unit coordination for an incident */
export async function getUnitCoordination(
  countryId: number,
  incidentId: string,
): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/emergency/incidents/${encodeURIComponent(incidentId)}/coordination`,
  );
  return result.data;
}

/** Search available emergency resources */
export async function searchAvailableResources(
  countryId: number,
  params?: {
    type?: string;
    latitude?: number;
    longitude?: number;
    radius_km?: number;
  },
): Promise<any[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.type) queryParams.type = params.type;
  if (params?.latitude) queryParams.latitude = params.latitude;
  if (params?.longitude) queryParams.longitude = params.longitude;
  if (params?.radius_km) queryParams.radius_km = params.radius_km;

  const result = await request.get<PaginatedResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/emergency/resources/search`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** Get closest emergency unit by type */
export async function getClosestUnitByType(
  countryId: number,
  params: { latitude: number; longitude: number; unit_type: string },
): Promise<any> {
  const result = await request.get<SingleResponse<any>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/emergency/units/closest`,
    { params },
  );
  return result.data;
}

/** EventSource URL for streaming emergency unit locations */
export function streamServiceUnitLocationsUrl(countryId: number): string {
  return `${OBS}/countries/${encodeURIComponent(countryId)}/emergency/units/locations/stream`;
}

// Geographic

/** List countries */
export async function listCountries(): Promise<Country[]> {
  const result = await request.get<PaginatedResponse<Country>>(
    `${OBS}/countries`,
  );
  return result.data ?? [];
}

/** Get a country by ID */
export async function getCountry(countryId: number): Promise<Country> {
  const result = await request.get<SingleResponse<Country>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}`,
  );
  return result.data;
}

/** List states/counties for a country */
export async function listStates(
  countryId: number,
  params?: { filter?: string; page_size?: number; page_offset?: number },
): Promise<GeoState[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.filter) queryParams.filter = params.filter;
  if (params?.page_size) queryParams.page_size = params.page_size;
  if (params?.page_offset) queryParams.page_offset = params.page_offset;
  const result = await request.get<PaginatedResponse<GeoState>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/states`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** List cities for a country */
export async function listCities(countryId: number): Promise<City[]> {
  const result = await request.get<PaginatedResponse<City>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/cities`,
  );
  return result.data ?? [];
}

/** List hospital reference locations for a country */
export async function listHospitalLocations(
  countryId: number,
  params?: { bbox?: string },
): Promise<HospitalLocation[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.bbox) queryParams.bbox = params.bbox;
  const result = await request.get<PaginatedResponse<HospitalLocation>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/geographic/hospitals`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** List fire station reference locations for a country */
export async function listFireStationLocations(
  countryId: number,
  params?: { bbox?: string },
): Promise<FireStationLocation[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.bbox) queryParams.bbox = params.bbox;
  const result = await request.get<PaginatedResponse<FireStationLocation>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/geographic/fire-stations`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** List police station reference locations for a country */
export async function listPoliceStationLocations(
  countryId: number,
  params?: { bbox?: string },
): Promise<PoliceStationLocation[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.bbox) queryParams.bbox = params.bbox;
  const result = await request.get<PaginatedResponse<PoliceStationLocation>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/geographic/police-stations`,
    { params: queryParams },
  );
  return result.data ?? [];
}

/** List shelter reference locations for a country */
export async function listShelterLocations(
  countryId: number,
): Promise<ShelterLocation[]> {
  const result = await request.get<PaginatedResponse<ShelterLocation>>(
    `${OBS}/countries/${encodeURIComponent(countryId)}/geographic/shelters`,
  );
  return result.data ?? [];
}
