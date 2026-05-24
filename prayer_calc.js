/**
 * SAJDA Prayer Times Calculator
 * Based on Shuroi Ulamo parameters for Tajikistan
 * Fajr: 18 degrees, Isha: 17 degrees, Asr: Hanafi (shadow = 2x + noon shadow)
 * Maghrib: Sunset + 19 min safety margin (per Shuroi Ulamo table)
 */

const PrayerCalc = (function() {
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  // Shuroi Ulamo parameters
  const FAJR_ANGLE = 18;
  const ISHA_ANGLE = 17;
  const MAGHRIB_OFFSET = 19; // minutes after sunset for Shom start
  const ASR_METHOD = 2; // Hanafi: shadow = 2 * object + noon shadow

  // Dushanbe coordinates
  const DEFAULT_LAT = 38.56;
  const DEFAULT_LNG = 68.77;
  const TIMEZONE = 5; // UTC+5

  function julianDate(year, month, day) {
    if (month <= 2) { year--; month += 12; }
    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = (357.529 + 0.98560028 * D) % 360;
    var q = (280.459 + 0.98564736 * D) % 360;
    var L = (q + 1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG)) % 360;
    var e = 23.439 - 0.00000036 * D;
    var RA = Math.atan2(Math.cos(e * DEG) * Math.sin(L * DEG), Math.cos(L * DEG)) * RAD;
    var d = Math.asin(Math.sin(e * DEG) * Math.sin(L * DEG)) * RAD;
    RA = RA / 15;
    return { declination: d, rightAscension: RA, eqOfTime: q / 15 - RA };
  }

  function computeTransit(lng, eqTime, timezone) {
    return 12 + timezone - lng / 15 - eqTime;
  }

  function hourAngle(lat, dec, angle) {
    var cosHA = (Math.sin(-angle * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG)) /
                (Math.cos(lat * DEG) * Math.cos(dec * DEG));
    if (cosHA > 1) return null; // never rises
    if (cosHA < -1) return null; // never sets
    return Math.acos(cosHA) * RAD / 15;
  }

  function asrTime(lat, dec, factor) {
    var a = Math.atan(1 / (factor + Math.tan(Math.abs(lat - dec) * DEG))) * RAD;
    var cosHA = (Math.sin(a * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG)) /
                (Math.cos(lat * DEG) * Math.cos(dec * DEG));
    if (cosHA > 1 || cosHA < -1) return null;
    return Math.acos(cosHA) * RAD / 15;
  }

  function formatTime(hours) {
    if (hours === null || isNaN(hours)) return '--:--';
    hours = hours % 24;
    if (hours < 0) hours += 24;
    var h = Math.floor(hours);
    var m = Math.round((hours - h) * 60);
    if (m === 60) { h++; m = 0; }
    if (h >= 24) h -= 24;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function calculate(year, month, day, lat, lng) {
    lat = lat || DEFAULT_LAT;
    lng = lng || DEFAULT_LNG;

    var jd = julianDate(year, month, day);
    var sun = sunPosition(jd);
    var transit = computeTransit(lng, sun.eqOfTime, TIMEZONE);

    // Sunrise & Sunset (0.833 degrees for atmospheric refraction + sun radius)
    var haRise = hourAngle(lat, sun.declination, -0.833);
    var sunrise = haRise !== null ? transit - haRise : null;
    var sunset = haRise !== null ? transit + haRise : null;

    // Fajr (18 degrees below horizon)
    var haFajr = hourAngle(lat, sun.declination, FAJR_ANGLE);
    var fajr = haFajr !== null ? transit - haFajr : null;

    // Isha (17 degrees below horizon)
    var haIsha = hourAngle(lat, sun.declination, ISHA_ANGLE);
    var isha = haIsha !== null ? transit + haIsha : null;

    // Asr (Hanafi: factor = 2)
    var haAsr = asrTime(lat, sun.declination, ASR_METHOD);
    var asr = haAsr !== null ? transit + haAsr : null;

    // Maghrib = sunset + 19 minutes (Shuroi Ulamo adds safety margin)
    var maghrib = sunset !== null ? sunset + MAGHRIB_OFFSET / 60 : null;

    return {
      bomdod: formatTime(fajr),
      oftob: formatTime(sunrise),
      peshin: formatTime(transit),
      asr: formatTime(asr),
      shom: formatTime(maghrib),
      khuftan: formatTime(isha)
    };
  }

  // Public API
  return {
    calculate: calculate,
    DEFAULT_LAT: DEFAULT_LAT,
    DEFAULT_LNG: DEFAULT_LNG
  };
})();
