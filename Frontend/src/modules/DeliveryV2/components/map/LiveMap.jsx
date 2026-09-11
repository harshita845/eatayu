import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  GoogleMap,
  Marker,
  DirectionsService,
  Polygon,
  Polyline,
  useJsApiLoader,
  OverlayView
} from '@react-google-maps/api';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { zoneAPI } from '@food/api';
import { isGoogleOrderRoadDistanceEnabled } from '@food/utils/googleDistanceFeatures';
import { openGoogleMapsNavigation } from '@/modules/DeliveryV2/utils/orderAddress';
import {
  Navigation,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  RotateCcw,
  MapPin,
  List,
  ChevronDown,
  ChevronUp,
  LocateFixed,
  Store,
  UserCheck,
  Compass
} from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  inset: 0
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fee2e2" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#991b1b" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#bae6fd" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#0284c7" }] }
  ]
};
const LIBRARIES = ['places', 'geometry'];

// Helper to pick maneuver icon based on instruction or maneuver string
const getManeuverIcon = (maneuver = '', text = '') => {
  const m = maneuver.toLowerCase();
  const t = text.toLowerCase();

  if (m.includes('right') || t.includes('turn right') || t.includes('slight right')) {
    return <CornerUpRight className="w-6 h-6 text-emerald-400 animate-bounce" />;
  }
  if (m.includes('left') || t.includes('turn left') || t.includes('slight left')) {
    return <CornerUpLeft className="w-6 h-6 text-emerald-400 animate-bounce" />;
  }
  if (m.includes('uturn') || t.includes('u-turn') || t.includes('make a u-turn')) {
    return <RotateCcw className="w-6 h-6 text-amber-400" />;
  }
  if (m.includes('straight') || t.includes('continue') || t.includes('head')) {
    return <ArrowUp className="w-6 h-6 text-emerald-400" />;
  }
  return <Navigation className="w-6 h-6 text-emerald-400 animate-pulse" />;
};

export const LiveMap = ({ onMapClick, onMapLoad, onPathReceived, onPolylineReceived, zoom = 12 }) => {
  const { riderLocation, activeOrder, tripStatus, setRouteMetrics, clearRouteMetrics } = useDeliveryStore();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [directions, setDirections] = useState(null);
  const [map, setMapInternal] = useState(null);
  const [zones, setZones] = useState([]);
  const [lastDirectionsAt, setLastDirectionsAt] = useState(0);
  const [googleDirectionsEnabled, setGoogleDirectionsEnabled] = useState(true);
  const [showStepsDrawer, setShowStepsDrawer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isGoogleOrderRoadDistanceEnabled().then((enabled) => {
      if (!cancelled) setGoogleDirectionsEnabled(Boolean(enabled));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMapLoad = (mapInstance) => {
    mapInstance.setOptions({
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false
    });
    setMapInternal(mapInstance);
    if (onMapLoad) onMapLoad(mapInstance);
  };

  useEffect(() => {
    if (!activeOrder || tripStatus === 'COMPLETED' || tripStatus === 'IDLE') {
      setLastDirectionsAt(0);
      setDirections(null);
      clearRouteMetrics();
    }
  }, [tripStatus, activeOrder?._id, activeOrder, clearRouteMetrics]);

  const targetLocation = useMemo(() => {
    if (!activeOrder) return null;
    let rawLoc = null;
    if (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') {
      rawLoc = activeOrder.restaurantLocation ||
               activeOrder.restaurantId?.location ||
               activeOrder.restaurant?.location ||
               (activeOrder.restaurantLat && activeOrder.restaurantLng ? { lat: activeOrder.restaurantLat, lng: activeOrder.restaurantLng } : null);
    } else if (tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP') {
      rawLoc = activeOrder.customerLocation ||
               activeOrder.deliveryAddress?.location ||
               activeOrder.deliveryAddress ||
               (activeOrder.customerLat && activeOrder.customerLng ? { lat: activeOrder.customerLat, lng: activeOrder.customerLng } : null);
    }
    if (!rawLoc) return null;

    let lat = null, lng = null;
    if (Array.isArray(rawLoc.coordinates) && rawLoc.coordinates.length >= 2) {
      lat = parseFloat(rawLoc.coordinates[1]);
      lng = parseFloat(rawLoc.coordinates[0]);
    } else {
      lat = parseFloat(rawLoc.lat || rawLoc.latitude);
      lng = parseFloat(rawLoc.lng || rawLoc.longitude);
    }
    return (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) ? { lat, lng } : null;
  }, [activeOrder, tripStatus]);

  // Reset directions when active target changes
  const targetKey = targetLocation
    ? `${targetLocation.lat.toFixed(5)},${targetLocation.lng.toFixed(5)}`
    : null;
  useEffect(() => {
    setDirections(null);
    setLastDirectionsAt(0);
    clearRouteMetrics();
  }, [targetKey, clearRouteMetrics]);

  const parsedRiderLocation = useMemo(() => {
    if (!riderLocation) return null;
    const lat = parseFloat(riderLocation.lat || riderLocation.latitude);
    const lng = parseFloat(riderLocation.lng || riderLocation.longitude);
    return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng, heading: parseFloat(riderLocation.heading || 0) } : null;
  }, [riderLocation]);

  useEffect(() => { if (map && !targetLocation) map.setZoom(zoom); }, [zoom, map, targetLocation]);

  // Fit bounds helper to frame both rider and destination on map
  const fitRouteBounds = useCallback(() => {
    if (!map || !parsedRiderLocation || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(parsedRiderLocation);
    if (targetLocation) {
      bounds.extend(targetLocation);
      map.fitBounds(bounds, { top: 140, bottom: 260, left: 50, right: 50 });
    } else {
      map.panTo(parsedRiderLocation);
      map.setZoom(15);
    }
  }, [map, parsedRiderLocation, targetLocation]);

  // Auto-fit bounds when targetLocation or directions ready
  useEffect(() => {
    if (map && parsedRiderLocation && targetLocation) {
      fitRouteBounds();
    }
  }, [map, targetKey, fitRouteBounds]);

  const shouldUpdateRoute = useMemo(() => {
    const now = Date.now();
    if (!directions) return true;
    let throttleMs = 20000;
    if (parsedRiderLocation && targetLocation && window.google) {
      try {
        const p1 = new window.google.maps.LatLng(parsedRiderLocation.lat, parsedRiderLocation.lng);
        const p2 = new window.google.maps.LatLng(targetLocation.lat, targetLocation.lng);
        const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
        if (dist > 2000) throttleMs = 60000;
        else if (dist > 500) throttleMs = 20000;
        else throttleMs = 5000;
      } catch (e) { }
    }
    return (now - lastDirectionsAt) >= throttleMs;
  }, [lastDirectionsAt, directions, parsedRiderLocation, targetLocation]);

  useEffect(() => {
    if (directions && onPathReceived) {
      const path = directions.routes[0]?.overview_path;
      if (path) {
        const simplePath = path.map(p => ({
          lat: typeof p.lat === 'function' ? p.lat() : (p.lat || p.latitude),
          lng: typeof p.lng === 'function' ? p.lng() : (p.lng || p.longitude)
        }));
        onPathReceived(simplePath);
      }
    }
  }, [directions, onPathReceived]);

  const directionsCallback = useCallback((result, status) => {
    setLastDirectionsAt(Date.now());
    if (status === 'OK' && result) {
      setDirections(result);
      const encodedPolyline = result.routes[0]?.overview_polyline;
      if (encodedPolyline && onPolylineReceived) onPolylineReceived(encodedPolyline);

      const legs = result.routes[0]?.legs || [];
      let distanceMeters = 0;
      let durationSeconds = 0;
      for (const leg of legs) {
        distanceMeters += leg.distance?.value || 0;
        durationSeconds += leg.duration?.value || 0;
      }
      if (distanceMeters > 0) {
        setRouteMetrics({
          distanceMeters,
          durationMins: Math.max(1, Math.ceil(durationSeconds / 60)),
        });
      }
    } else {
      console.warn(`[LiveMap] Directions API status: ${status}`);
    }
  }, [onPolylineReceived, setRouteMetrics]);

  useEffect(() => {
    (async () => {
      try {
        const response = await zoneAPI.getPublicZones();
        if (response?.data?.success && response.data.data?.zones) {
          const formattedZones = response.data.data.zones.map(zone => ({
            ...zone,
            paths: (zone.coordinates || []).map(coord => ({ lat: coord.latitude, lng: coord.longitude }))
          })).filter(z => z.paths.length >= 3);
          setZones(formattedZones);
        }
      } catch (err) { }
    })();
  }, []);

  const restaurantMarkerUrl = useMemo(() => {
    if (!activeOrder) return 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png';
    return activeOrder.restaurantImage || activeOrder.restaurant?.logo || activeOrder.restaurant?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png';
  }, [activeOrder]);

  const customerMarkerUrl = useMemo(() => {
    if (!activeOrder) return 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png';
    return activeOrder.customerImage || activeOrder.user?.logo || activeOrder.user?.profileImage || 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png';
  }, [activeOrder]);

  const remainingPath = useMemo(() => {
    if (!directions || !parsedRiderLocation || !window.google) return [];
    const fullPath = directions.routes[0].overview_path;
    let closestIndex = 0;
    let minDist = Infinity;
    const rPos = new window.google.maps.LatLng(parsedRiderLocation.lat, parsedRiderLocation.lng);
    for (let i = 0; i < fullPath.length; i++) {
      const d = window.google.maps.geometry.spherical.computeDistanceBetween(rPos, fullPath[i]);
      if (d < minDist) { minDist = d; closestIndex = i; }
    }
    return [{ lat: parsedRiderLocation.lat, lng: parsedRiderLocation.lng }, ...fullPath.slice(closestIndex + 1)];
  }, [directions, parsedRiderLocation]);

  // Turn-by-Turn Navigation Details for Banner Overlay & Steps List
  const navigationInfo = useMemo(() => {
    if (!activeOrder || tripStatus === 'IDLE' || tripStatus === 'COMPLETED') return null;

    const isPickupStage = tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP';
    const destinationLabel = isPickupStage
      ? (activeOrder.restaurantName || activeOrder.restaurant_name || activeOrder.restaurant?.name || 'Restaurant')
      : (activeOrder.userName || activeOrder.user?.name || 'Customer');

    const destinationAddress = isPickupStage
      ? (activeOrder.restaurantAddress || activeOrder.restaurant_address || activeOrder.restaurant?.location?.address || '')
      : (activeOrder.customerAddress || activeOrder.customer_address || activeOrder.deliveryAddress?.formattedAddress || '');

    let nextInstruction = isPickupStage ? 'Head towards Restaurant for Pickup' : 'Head towards Customer for Delivery';
    let stepDistance = '';
    let currentManeuver = '';
    let totalDistanceStr = '';
    let totalDurationStr = '';
    let stepsList = [];

    if (directions?.routes?.[0]?.legs?.[0]) {
      const leg = directions.routes[0].legs[0];
      totalDistanceStr = leg.distance?.text || '';
      totalDurationStr = leg.duration?.text || '';

      const steps = leg.steps || [];
      stepsList = steps.map(s => {
        const raw = s.html_instructions || '';
        const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return {
          instruction: clean,
          distance: s.distance?.text || '',
          duration: s.duration?.text || '',
          maneuver: s.maneuver || ''
        };
      });

      if (steps.length > 0) {
        const firstStep = steps[0];
        const rawText = firstStep.html_instructions || '';
        const cleanText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanText) nextInstruction = cleanText;
        if (firstStep.distance?.text) stepDistance = firstStep.distance.text;
        currentManeuver = firstStep.maneuver || '';
      }
    }

    return {
      isPickupStage,
      destinationLabel,
      destinationAddress,
      nextInstruction,
      stepDistance,
      currentManeuver,
      totalDistanceStr,
      totalDurationStr,
      stepsList,
      targetLocation
    };
  }, [activeOrder, tripStatus, directions, targetLocation]);

  const mapCenter = useMemo(() => {
    if (parsedRiderLocation) return { lat: parsedRiderLocation.lat, lng: parsedRiderLocation.lng };
    if (targetLocation) return { lat: targetLocation.lat, lng: targetLocation.lng };
    return { lat: 20.5937, lng: 78.9629 }; // Default India fallback center
  }, [parsedRiderLocation, targetLocation]);

  if (loadError) return <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-red-500 font-bold">Map Load Error</div>;
  if (!isLoaded) return <div className="absolute inset-0 flex items-center justify-center bg-slate-100"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const directionsServiceOptions = (parsedRiderLocation && targetLocation) ? {
    origin: parsedRiderLocation,
    destination: targetLocation,
    travelMode: 'DRIVING',
  } : null;

  return (
    <div className="absolute inset-0 z-0 text-gray-900 overflow-hidden flex flex-col">
      {/* ── Floating Turn-by-Turn Navigation Header Banner Overlay ── */}
      {navigationInfo && (
        <div className="absolute top-14 inset-x-3 sm:inset-x-4 z-[180] pointer-events-auto transition-all duration-300">
          <div className="bg-slate-950/95 backdrop-blur-md text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                  {getManeuverIcon(navigationInfo.currentManeuver, navigationInfo.nextInstruction)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                      {navigationInfo.isPickupStage ? (
                        <><Store className="w-3 h-3 inline" /> Pickup Route</>
                      ) : (
                        <><UserCheck className="w-3 h-3 inline" /> Customer Delivery</>
                      )}
                    </span>
                    {navigationInfo.stepDistance && (
                      <span className="text-[10px] text-gray-300 font-medium">• {navigationInfo.stepDistance}</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-white truncate mt-0.5" title={navigationInfo.nextInstruction}>
                    {navigationInfo.nextInstruction}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                    <span>{navigationInfo.destinationLabel}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {navigationInfo.totalDistanceStr && (
                  <div className="text-right hidden sm:block pr-1">
                    <p className="text-xs font-black text-emerald-400">{navigationInfo.totalDistanceStr}</p>
                    <p className="text-[10px] text-gray-400">{navigationInfo.totalDurationStr}</p>
                  </div>
                )}
                
                {/* Steps List Toggle Button */}
                {navigationInfo.stepsList.length > 0 && (
                  <button
                    onClick={() => setShowStepsDrawer(!showStepsDrawer)}
                    className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs p-2.5 rounded-xl flex items-center justify-center transition-all"
                    title="Toggle Step-by-Step Directions"
                  >
                    <List className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => openGoogleMapsNavigation({
                    lat: navigationInfo.targetLocation?.lat,
                    lng: navigationInfo.targetLocation?.lng,
                    address: navigationInfo.destinationAddress
                  })}
                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
                  title="Open Google Maps App Navigation Mode"
                >
                  <Navigation className="w-4 h-4" />
                  <span className="hidden sm:inline">Google Maps</span>
                  <span className="sm:hidden">Nav</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Directions Drawer Overlay */}
            {showStepsDrawer && navigationInfo.stepsList.length > 0 && (
              <div className="mt-2 pt-3 border-t border-white/10 max-h-60 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-white/20">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 pb-1">
                  <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-emerald-400" /> Turn-by-Turn Route Steps</span>
                  <button onClick={() => setShowStepsDrawer(false)} className="text-gray-400 hover:text-white">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
                {navigationInfo.stepsList.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-white/5 p-2.5 rounded-xl text-xs">
                    <div className="mt-0.5 shrink-0">
                      {getManeuverIcon(step.maneuver, step.instruction)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-200 leading-snug">{step.instruction}</p>
                      {step.distance && (
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{step.distance} {step.duration ? `• ${step.duration}` : ''}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recenter & Fit Route Floating Control Button */}
      {parsedRiderLocation && (
        <div className="absolute bottom-28 right-4 z-[170]">
          <button
            onClick={fitRouteBounds}
            className="w-12 h-12 bg-slate-900/90 text-emerald-400 hover:bg-slate-900 rounded-full shadow-2xl border border-white/20 flex items-center justify-center active:scale-95 transition-all"
            title="Recenter & Fit Driving Route on Map"
          >
            <LocateFixed className="w-6 h-6 animate-pulse" />
          </button>
        </div>
      )}

      <GoogleMap
        onLoad={handleMapLoad}
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={14}
        onClick={(e) => onMapClick?.(e.latLng.lat(), e.latLng.lng())}
        options={mapOptions}
      >
        {directionsServiceOptions && shouldUpdateRoute && googleDirectionsEnabled && (
          <DirectionsService options={directionsServiceOptions} callback={directionsCallback} />
        )}

        {/* Outer Glow Polyline for Road Route */}
        {remainingPath.length > 0 ? (
          <>
            <Polyline
              path={remainingPath}
              options={{ strokeColor: '#059669', strokeOpacity: 0.4, strokeWeight: 10, zIndex: 9 }}
            />
            <Polyline
              path={remainingPath}
              options={{ strokeColor: '#10b981', strokeOpacity: 0.95, strokeWeight: 6, zIndex: 10 }}
            />
          </>
        ) : (
          parsedRiderLocation && targetLocation && (
            <Polyline
              path={[parsedRiderLocation, targetLocation]}
              options={{ strokeColor: '#10b981', strokeOpacity: 0.85, strokeWeight: 5, zIndex: 5 }}
            />
          )
        )}

        {/* Subtle Background Overview Route */}
        {directions && (
          <Polyline
            path={directions.routes[0].overview_path}
            options={{
              strokeColor: '#64748b',
              strokeOpacity: 0.3,
              strokeWeight: 4,
              zIndex: 1
            }}
          />
        )}

        {/* Animated Rider Marker */}
        {parsedRiderLocation && (
          <OverlayView position={parsedRiderLocation} mapPaneName={OverlayView.MARKER_LAYER}>
            <div
              style={{
                transform: `translate(-50%, -50%) rotate(${parsedRiderLocation.heading || 0}deg)`,
                transition: 'transform 0.5s linear'
              }}
              className="relative w-[72px] h-[72px]"
            >
              <img src="/MapRider.png" alt="Rider" className="w-full h-full object-contain" />
            </div>
          </OverlayView>
        )}

        {/* Destination Target Marker */}
        {targetLocation && (
          <Marker
            position={targetLocation}
            icon={{
              url: (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') ? restaurantMarkerUrl : customerMarkerUrl,
              scaledSize: new window.google.maps.Size(44, 44),
              anchor: new window.google.maps.Point(22, 22)
            }}
          />
        )}

        {/* Service Zones */}
        {zones.map((zone) => (
          <Polygon
            key={zone._id}
            paths={zone.paths}
            options={{
              fillColor: "#10b981",
              fillOpacity: 0.08,
              strokeColor: "#10b981",
              strokeOpacity: 0.35,
              strokeWeight: 2,
              zIndex: 1
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default LiveMap;

