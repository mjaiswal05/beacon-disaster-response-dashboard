// Shared types

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  north_east: Coordinate;
  south_west: Coordinate;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  trace_id: string;
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  trace_id: string;
}

// Transport - Bus

export interface Vehicle {
  id: string;
  city_id: string;
  vehicle_type: string;
  route_id: string;
  route_name: string;
  status: string;
  location: Coordinate;
  speed: number;
  heading: number;
  occupancy: number;
  capacity: number;
  last_updated: string;
  created_at: string;
}

export interface VehicleLocation {
  id: string;
  vehicle_id: string;
  location: Coordinate;
  speed: number;
  heading: number;
  timestamp: string;
}

export interface VehicleStatus {
  vehicle_id: string;
  status: string;
  last_location: Coordinate;
  last_updated: string;
  route_id: string;
  route_name: string;
  next_stop: string;
  delay_seconds: number;
}

export interface ListVehiclesParams {
  vehicle_type?: string;
  start?: string;
  end?: string;
  page_size?: number;
  page_offset?: number;
}

export interface ListVehicleLocationsParams {
  start?: string;
  end?: string;
  page_size?: number;
  page_offset?: number;
}

// Transport - Luas (Dublin Tram)

export interface LuasForecast {
  id: string;
  country_id: number;
  stop_code: string;
  stop_name: string;
  line: string;
  direction: string;
  destination: string;
  due_minutes: number;
  status_message: string;
  timestamp: string;
  ingested_at: string;
  latitude?: number;
  longitude?: number;
}

export interface ListLuasForecastsParams {
  line?: string;
  direction?: string;
  start?: string;
  end?: string;
  page_size?: number;
  page_offset?: number;
}

export interface GetStopForecastParams {
  direction?: string;
}

// Transport - Railway (Train)

export interface Train {
  id: string;
  country_id: number;
  train_code: string;
  train_status: string;
  location: Coordinate;
  train_date: string;
  public_message?: string;
  direction?: string;
  ingested_at: string;
}

export interface ListTrainsParams {
  train_status?: string;
  start?: string;
  end?: string;
  page_size?: number;
  page_offset?: number;
}

// Power

export interface PowerOutage {
  id: string;
  city_id: string;
  zone_id: string;
  affected_area: BoundingBox;
  status: string;
  cause: string;
  affected_count: number;
  start_time: string;
  estimated_restore: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OutageUpdate {
  timestamp: string;
  message: string;
  status: string;
}

export interface OutageDetails {
  outage: PowerOutage;
  affected_zones: string[];
  crews_assigned: number;
  repair_progress: number;
  updates: OutageUpdate[];
}

export interface ListPowerOutagesParams {
  page_size?: number;
  page_offset?: number;
}

// Social / News

export interface SocialAlert {
  id: string;
  platform: string;
  post_id: string;
  content: string;
  author: string;
  location?: Coordinate;
  alert_type: string;
  keywords: string[];
  sentiment: string;
  confidence: number;
  is_verified: boolean;
  engagement: number;
  timestamp: string;
  detected_at: string;
}

export interface KeywordHit {
  id: string;
  keyword: string;
  category: string;
  platform: string;
  post_id: string;
  content: string;
  author: string;
  location?: Coordinate;
  context: string;
  timestamp: string;
  detected_at: string;
}

export interface UnconfirmedWarning {
  id: string;
  warning_type: string;
  description: string;
  source: string;
  location?: Coordinate;
  report_count: number;
  first_reported: string;
  last_reported: string;
  credibility: number;
  status: string;
}

export interface ListKeywordHitsParams {
  category?: string;
  platform?: string;
  page_size?: number;
  page_offset?: number;
}

export interface ListUnconfirmedWarningsParams {
  warning_type?: string;
  status?: string;
  min_credibility?: number;
  page_size?: number;
  page_offset?: number;
}

export interface SearchPostsByLocationParams {
  latitude: number;
  longitude: number;
  radius_km: number;
  page_size?: number;
  page_offset?: number;
}

export interface CorrelateAlertRequest {
  correlation_type: string;
  correlated_id: string;
  confidence_score: number;
  reasoning: string;
}

export interface AlertCorrelation {
  alert_id: string;
  correlation_type: string;
  correlated_id: string;
  confidence_score: number;
  reasoning: string;
  correlated_at: string;
}

// Traffic

export interface TrafficFlow {
  id: string;
  city_id: string;
  road_segment_id: string;
  speed: number;
  density: number;
  flow_rate: number;
  status: string;
  location: Coordinate;
  timestamp: string;
}

export interface ListTrafficFlowsParams {
  start?: string;
  end?: string;
  page_size?: number;
  page_offset?: number;
}

export interface TrafficIncident {
  id: string;
  city_id: string;
  type: string;
  severity: string;
  description: string;
  location: Coordinate;
  start_time: string;
  end_time?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListTrafficIncidentsParams {
  filter?: string;
  page_size?: number;
  page_offset?: number;
  order_by?: string;
}

// Water Level

export interface SensorReading {
  id: string;
  country_id: number;
  station_id: string;
  station_name: string;
  water_level: number;
  water_level_units: string;
  timestamp: string;
  longitude: number;
  latitude: number;
  percentile_median?: number;
  percentile_highest?: number;
  ingested_at: string;
}

export interface ListSensorReadingsParams {
  page_size?: number;
  page_offset?: number;
}

// Weather

export interface WeatherWarning {
  id: string;
  country_id: number;
  source: string;
  item_guid: string;
  title: string;
  link: string;
  description: string;
  author: string;
  categories: string;
  image_url: string;
  thumbnail_url: string;
  published_at: string;
  ingested_at: string;
}

// Geographic - Reference Locations

export interface Country {
  id: number;
  name: string;
  iso3?: string;
  iso2?: string;
  capital?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeoState {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  fips_code?: string;
  iso2?: string;
  latitude?: number;
  longitude?: number;
}

export interface City {
  id: number;
  name: string;
  state_id: number;
  state_code: string;
  country_id: number;
  country_code: string;
  latitude: number;
  longitude: number;
}

export interface HospitalLocation {
  id: string;
  source_id: string;
  country_id: number;
  city_id: number;
  name: string;
  subcategory: string;
  address: string;
  municipality: string;
  county: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

export interface FireStationLocation {
  id: string;
  source_id: string;
  country_id: number;
  city_id: number;
  name: string;
  address: string;
  municipality: string;
  county: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

export interface PoliceStationLocation {
  id: string;
  source_id: string;
  country_id: number;
  city_id: number;
  name: string;
  division: string;
  station_type: string;
  address: string;
  municipality: string;
  county: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

export interface ShelterLocation {
  source_id: string;
  country_id: number;
  city_id: number;
  name: string;
  shelter_type: string;
  address: string;
  municipality: string;
  county: string;
  capacity: number;
  latitude: number;
  longitude: number;
  phone?: string;
}
