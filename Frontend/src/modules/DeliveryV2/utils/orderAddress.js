/**
 * Resolve a human-readable customer delivery address from order payload shapes
 * (socket offer, accept response, current-trip sync).
 */
export function resolveCustomerAddress(order) {
  if (!order) return '';

  const saved =
    order.customerAddress ||
    order.customer_address ||
    order.deliveryAddress?.formattedAddress ||
    order.deliveryAddress?.address ||
    '';

  if (String(saved).trim()) return String(saved).trim();

  const deliveryAddress = order.deliveryAddress || {};
  const addressParts = [
    deliveryAddress.street,
    deliveryAddress.additionalDetails,
    deliveryAddress.city,
    deliveryAddress.state,
    deliveryAddress.zipCode,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  return addressParts.length ? addressParts.join(', ') : '';
}

/** Open Google Maps with a searchable address (fallback search pattern). */
export function openGoogleMapsForAddress(address) {
  const query = String(address || '').trim();
  if (!query) return false;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    '_blank',
  );
  return true;
}

/** Open Google Maps in turn-by-turn driving navigation mode directly to target lat/lng or address. */
export function openGoogleMapsNavigation({ lat, lng, address } = {}) {
  let destination = '';
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const hasCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && (parsedLat !== 0 || parsedLng !== 0);

  if (hasCoords) {
    destination = `${parsedLat},${parsedLng}`;
  } else if (address && String(address).trim()) {
    destination = encodeURIComponent(String(address).trim());
  }

  if (!destination) return false;

  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  if (isAndroid && hasCoords) {
    url = `geo:${parsedLat},${parsedLng}?q=${parsedLat},${parsedLng}`;
  } else if (isIOS && hasCoords) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  }

  try {
    if (typeof document !== 'undefined' && document.body) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }
  } catch (_) {
    // Fallback if DOM element creation fails
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

