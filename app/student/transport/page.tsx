'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Bus, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, Navigation,
  MapPin, Phone, Share2, Gauge, MessageCircle, Users, History, Search, Siren,
  Mic, Square, Play, Volume2, MessageSquare, Pin, Send, UserPlus, Radio,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';

interface BusInfo {
  busId: string; plateNumber: string; routeName?: string; routeFare?: number | null;
  routeId?: string | null; routePolyline?: [number, number][] | null; driverName?: string; driverPhone?: string | null;
  driverUserId?: string | null; tripActive: boolean; schoolName?: string;
  lat: number | null; lng: number | null; gpsUpdatedAt: string | null;
  absentToday: boolean; homeLat: number | null; homeLng: number | null;
}
interface EtaInfo { durationSeconds: number; distanceMeters: number; source: 'osrm' | 'estimate'; dest?: 'home' | 'school'; }

const BACKEND_WS = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function fmt(s: number) {
  if (s < 60) return 'Less than 1 min';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m !== 1 ? 's' : ''}`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}
function fmtDist(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`; }

function LiveMap({ busCoords, homeCoords, routePolyline, eta, connected }: {
  busCoords: { lat: number; lng: number } | null;
  homeCoords: { lat: number; lng: number } | null;
  routePolyline?: [number, number][] | null;
  eta?: EtaInfo | null;
  connected?: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inst = useRef<{ map: any; busMarker: any; routeLine: any } | null>(null);

  useEffect(() => {
    if (!mapRef.current || inst.current) return;
    if (!document.getElementById('leaflet-css')) {
      const l = document.createElement('link');
      l.id = 'leaflet-css'; l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    if (!document.getElementById('leaflet-z-fix')) {
      const s = document.createElement('style');
      s.id = 'leaflet-z-fix';
      s.textContent = `.leaflet-pane,.leaflet-top,.leaflet-bottom{z-index:1!important}.leaflet-control{z-index:2!important}
        @keyframes bus-pulse{0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,.5)}50%{box-shadow:0 0 0 12px rgba(124,58,237,0)}}
        .bus-pulse{animation:bus-pulse 1.5s ease infinite}`;
      document.head.appendChild(s);
    }
    import('leaflet').then(L => {
      if ((mapRef.current as any)?._leaflet_id) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const busIcon = L.divIcon({
        html: `<div class="bus-pulse" style="background:#7c3aed;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(124,58,237,.5);font-size:22px">🚌</div>`,
        className: '', iconSize: [44, 44], iconAnchor: [22, 22],
      });
      const homeIcon = L.divIcon({
        html: `<div style="background:#16a34a;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(22,163,74,.4);font-size:18px">🏠</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 36],
      });

      const center: [number, number] = busCoords ? [busCoords.lat, busCoords.lng] : homeCoords ? [homeCoords.lat, homeCoords.lng] : [9.082, 8.6753];
      const map = L.map(mapRef.current!, { zoomControl: false, attributionControl: false }).setView(center, 16);

      // Carto dark-matter tiles (Bolt/Uber style dark map)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Route polyline — thick glowing purple
      let routeLine: any = null;
      if (routePolyline?.length) {
        // Shadow line
        L.polyline(routePolyline, { color: '#4c1d95', weight: 8, opacity: 0.4 }).addTo(map);
        // Main line
        routeLine = L.polyline(routePolyline, { color: '#a855f7', weight: 4, opacity: 0.9 }).addTo(map);
      }

      // Draw straight ETA line from bus to home (if no polyline)
      if (!routePolyline?.length && busCoords && homeCoords) {
        L.polyline([[busCoords.lat, busCoords.lng], [homeCoords.lat, homeCoords.lng]], {
          color: '#a855f7', weight: 3, opacity: 0.7, dashArray: '8,6',
        }).addTo(map);
      }

      const busMarker = busCoords ? L.marker([busCoords.lat, busCoords.lng], { icon: busIcon }).addTo(map) : null;
      if (homeCoords) L.marker([homeCoords.lat, homeCoords.lng], { icon: homeIcon }).addTo(map).bindTooltip('Your stop', { permanent: false, className: 'text-xs' });

      // Fit bounds
      if (busCoords && homeCoords) {
        map.fitBounds([[busCoords.lat, busCoords.lng], [homeCoords.lat, homeCoords.lng]], { padding: [50, 50], maxZoom: 16 });
      } else if (routePolyline?.length) {
        map.fitBounds(routePolyline as any, { padding: [40, 40], maxZoom: 16 });
      }

      inst.current = { map, busMarker, routeLine };
    });
    return () => { if (inst.current) { inst.current.map.remove(); inst.current = null; } };
  }, []);

  useEffect(() => {
    if (!inst.current || !busCoords) return;
    const { map, busMarker } = inst.current;
    if (busMarker) {
      busMarker.setLatLng([busCoords.lat, busCoords.lng]);
    } else {
      import('leaflet').then(L => {
        const icon = L.divIcon({
          html: `<div class="bus-pulse" style="background:#7c3aed;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(124,58,237,.5);font-size:22px">🚌</div>`,
          className: '', iconSize: [44, 44], iconAnchor: [22, 22],
        });
        inst.current!.busMarker = L.marker([busCoords.lat, busCoords.lng], { icon }).addTo(inst.current!.map);
      });
    }
    if (homeCoords) {
      map.fitBounds([[busCoords.lat, busCoords.lng], [homeCoords.lat, homeCoords.lng]], { padding: [50, 50], maxZoom: 16, animate: true, duration: 0.8 });
    } else {
      map.panTo([busCoords.lat, busCoords.lng], { animate: true, duration: 0.5 });
    }
  }, [busCoords]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 320 }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Overlay: connection status */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-full">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
        {connected ? 'Live' : 'Connecting…'}
      </div>

      {/* Overlay: ETA pill */}
      {eta && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg">
          <Clock size={13} className="text-purple-300" />
          <span className="text-sm font-bold">{fmt(eta.durationSeconds)}</span>
          <span className="text-xs text-gray-300">· {fmtDist(eta.distanceMeters)}</span>
        </div>
      )}

      {/* No bus signal */}
      {!busCoords && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <div className="text-center text-white">
            <Bus size={32} className="mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium opacity-80">Waiting for GPS signal…</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Route progress ─────────────────────────────────────────────────────────
function routeProgress(polyline: [number, number][], busCoords: { lat: number; lng: number } | null) {
  if (!busCoords || !polyline.length) return 0;
  let minDist = Infinity, closestIdx = 0;
  polyline.forEach(([lat, lng], i) => {
    const d = Math.hypot(lat - busCoords.lat, lng - busCoords.lng);
    if (d < minDist) { minDist = d; closestIdx = i; }
  });
  return Math.round((closestIdx / (polyline.length - 1)) * 100);
}

export default function StudentTransportPage() {
  const router = useRouter();
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [busCoords, setBusCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [absent, setAbsent] = useState(false);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState<EtaInfo | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [settingHome, setSettingHome] = useState(false);
  const [homeMsg, setHomeMsg] = useState('');
  const [busMoving, setBusMoving] = useState<boolean | null>(null);
  const [busSpeed, setBusSpeed] = useState<number | null>(null);
  const [capacity, setCapacity] = useState<{ capacity: number; assigned: number } | null>(null);
  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosMsg, setSosMsg] = useState('');
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [complaintSending, setComplaintSending] = useState(false);
  const [busFee, setBusFee] = useState<{ fare: number; feeConfigured: boolean; status: string; paidAt: string | null; reference: string | null; history: any[] } | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [payingFee, setPayingFee] = useState(false);

  // Route chat state
  const [routeChat, setRouteChat] = useState<any[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showRouteChat, setShowRouteChat] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showBroadcasts, setShowBroadcasts] = useState(false);
  const [pinnedBroadcast, setPinnedBroadcast] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const etaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchEta = useCallback(async () => {
    setEtaLoading(true);
    try { const r = await api.get<any>('student/transport/eta'); setEta(r.data ?? null); }
    catch { setEta(null); } finally { setEtaLoading(false); }
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<any>('student/transport/bus'),
      api.get<any>('student/transport/capacity').catch(() => null),
      api.get<any>('student/transport/history').catch(() => null),
    ]).then(([busRes, capRes, histRes]) => {
      if (busRes.data) {
        setBusInfo(busRes.data);
        setAbsent(busRes.data.absentToday);
        if (busRes.data.lat && busRes.data.lng) setBusCoords({ lat: busRes.data.lat, lng: busRes.data.lng });
        if (busRes.data.homeLat && busRes.data.homeLng) setHomeCoords({ lat: busRes.data.homeLat, lng: busRes.data.homeLng });
        // Load bus fee status if bus is assigned
        setFeeLoading(true);
        api.get<any>('student/transport/bus-fee')
          .then(r => setBusFee(r.data ?? null))
          .catch(() => {})
          .finally(() => setFeeLoading(false));
      }
      if (capRes?.data) setCapacity(capRes.data);
      if (histRes?.data) setTripHistory(histRes.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!busInfo?.tripActive) { setEta(null); return; }
    fetchEta();
    etaTimerRef.current = setInterval(fetchEta, 30_000);
    return () => { if (etaTimerRef.current) clearInterval(etaTimerRef.current); };
  }, [busInfo?.tripActive, fetchEta]);

  useEffect(() => {
    if (!busInfo?.tripActive || !busInfo.busId) return;
    const socket = io(`${BACKEND_WS}/transport`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('student:watch', { busId: busInfo.busId });
      if (busInfo.routeId) socket.emit('route:join', { routeId: busInfo.routeId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('bus:location', (data: { lat: number; lng: number }) => {
      const now = Date.now();
      setBusCoords(prev => {
        if (prev) {
          const moved = Math.abs(data.lat - prev.lat) > 0.00001 || Math.abs(data.lng - prev.lng) > 0.00001;
          setBusMoving(moved);
          if (prevCoordsRef.current && moved) {
            const dt = (now - prevCoordsRef.current.time) / 1000;
            const R = 6371000;
            const dLat = (data.lat - prevCoordsRef.current.lat) * Math.PI / 180;
            const dLng = (data.lng - prevCoordsRef.current.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(data.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            const distM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (dt > 0) setBusSpeed(Math.round((distM / dt) * 3.6)); // km/h
          }
        }
        prevCoordsRef.current = { lat: data.lat, lng: data.lng, time: now };
        return { lat: data.lat, lng: data.lng };
      });
      if (eta && eta.durationSeconds <= 300 && Notification.permission === 'granted') {
        new Notification('🚌 Bus almost here!', { body: `Your bus is about ${fmt(eta.durationSeconds)} away.` });
      }
    });
    socket.on('route:chat', (msg: any) => {
      setRouteChat(prev => {
        const exists = prev.some(m => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });
    });
    socket.on('route:broadcast', (b: any) => {
      setBroadcasts(prev => {
        const exists = prev.some(x => x.id === b.id);
        if (exists) return prev;
        return [b, ...prev];
      });
      if (!b.expiresAt || new Date(b.expiresAt) > new Date()) {
        setPinnedBroadcast(b);
      }
    });
    return () => { socket.disconnect(); };
  }, [busInfo?.tripActive, busInfo?.busId, busInfo?.routeId, eta]);

  // Request notification permission once
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleAbsent = async () => {
    if (!busInfo) return;
    setAbsentLoading(true);
    try {
      const newAbsent = !absent;
      await api.post('student/transport/absent', { absent: newAbsent });
      setAbsent(newAbsent);
      setMessage(newAbsent ? 'Driver notified — your stop will be skipped today.' : 'Absence cancelled — driver will come to your stop.');
      setTimeout(() => setMessage(''), 4000);
    } catch { setMessage('Failed. Please try again.'); setTimeout(() => setMessage(''), 3000); }
    finally { setAbsentLoading(false); }
  };

  const pinHomeLocation = () => {
    if (!navigator.geolocation) { setHomeMsg('Geolocation not supported'); return; }
    setSettingHome(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('student/transport/home-location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setHomeCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setHomeMsg('Home location saved!'); setTimeout(() => setHomeMsg(''), 3000);
        } catch { setHomeMsg('Failed. Please try again.'); }
        finally { setSettingHome(false); }
      },
      (err) => { setHomeMsg(`GPS error: ${err.message}`); setSettingHome(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const geocodeAddress = async () => {
    if (!addressInput.trim()) return;
    setGeocoding(true);
    try {
      const r = await api.post<any>('student/transport/geocode', { address: addressInput });
      if (r.data) {
        await api.post('student/transport/home-location', { lat: r.data.lat, lng: r.data.lng });
        setHomeCoords({ lat: r.data.lat, lng: r.data.lng });
        setHomeMsg('Home location saved!'); setTimeout(() => setHomeMsg(''), 3000);
        setAddressInput('');
      }
    } catch { setHomeMsg('Address not found. Try a more specific address.'); }
    finally { setGeocoding(false); }
  };

  const sendSos = async () => {
    if (!navigator.geolocation) { setSosMsg('GPS not available'); return; }
    setSosLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('student/transport/sos', { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSosMsg('✅ SOS sent! Admin and driver have been alerted.'); setTimeout(() => setSosMsg(''), 6000);
        } catch { setSosMsg('Failed to send SOS. Please call the driver directly.'); }
        finally { setSosLoading(false); }
      },
      () => { setSosMsg('Could not get your location.'); setSosLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const sendComplaint = async () => {
    if (!complaint.trim()) return;
    setComplaintSending(true);
    try {
      await api.post('/student/messages', { message: `[Transport Complaint] ${complaint}` });
      setComplaint(''); setShowComplaint(false);
      setMessage('Complaint sent to admin.'); setTimeout(() => setMessage(''), 4000);
    } catch { setMessage('Failed to send complaint.'); setTimeout(() => setMessage(''), 3000); }
    finally { setComplaintSending(false); }
  };

  const loadRouteChat = async () => {
    if (!busInfo?.routeId) return;
    setChatLoading(true);
    try {
      const r = await api.get<any>(endpoints.student.transportRouteChat(busInfo.routeId));
      setRouteChat(r.data ?? []);
    } catch { /* silent */ }
    finally { setChatLoading(false); }
  };

  const sendRouteChatMessage = async () => {
    if (!chatMessage.trim() || !busInfo?.routeId) return;
    setChatLoading(true);
    try {
      await api.post(endpoints.student.transportRouteChat(busInfo.routeId), { message: chatMessage, type: 'text' });
      setChatMessage('');
    } catch { setMessage('Failed to send message'); setTimeout(() => setMessage(''), 3000); }
    finally { setChatLoading(false); }
  };

  const startVoiceNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('audio', blob, 'voice-note.webm');
        setChatLoading(true);
        try {
          const routeId = busInfo?.routeId;
          if (routeId) {
            await api.upload(endpoints.student.transportRouteChat(routeId), fd);
          }
        } catch { setMessage('Failed to send voice note'); setTimeout(() => setMessage(''), 3000); }
        finally { setChatLoading(false); }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(10);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t <= 1) {
            clearInterval(recordingTimerRef.current!);
            mediaRecorder.stop();
            setRecording(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch { setMessage('Microphone access denied'); setTimeout(() => setMessage(''), 3000); }
  };

  const loadBroadcasts = async () => {
    if (!busInfo?.routeId) return;
    try {
      const r = await api.get<any>(endpoints.student.transportRouteBroadcasts(busInfo.routeId));
      const list = r.data ?? [];
      setBroadcasts(list);
      const active = list.find((b: any) => !b.expiresAt || new Date(b.expiresAt) > new Date());
      setPinnedBroadcast(active || null);
    } catch { /* silent */ }
  };

  const shareTrackingLink = async () => {
    if (!busInfo?.driverUserId) return;
    try {
      const r = await api.get<any>(endpoints.student.transportParentTrackingLink(busInfo.driverUserId));
      const text = `Track my school bus live: ${r.data.trackingUrl}`;
      if (navigator.share) await navigator.share({ title: 'Bus Location', text, url: r.data.trackingUrl });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } catch { setMessage('Failed to generate tracking link'); setTimeout(() => setMessage(''), 3000); }
  };

  const payBusFee = async () => {
    setPayingFee(true);
    try {
      const r = await api.post<any>('student/transport/bus-fee/initialize');
      window.location.href = r.data.authorization_url;
    } catch (e: any) {
      setMessage(e?.message || 'Failed to initialize payment');
      setTimeout(() => setMessage(''), 4000);
    } finally { setPayingFee(false); }
  };

  const shareBusLocation = () => {
    if (!busCoords) return;
    const url = `https://www.google.com/maps?q=${busCoords.lat},${busCoords.lng}`;
    const text = `Track my school bus live: ${url}`;
    if (navigator.share) navigator.share({ title: 'Bus Location', text, url });
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const progress = busInfo?.routePolyline?.length ? routeProgress(busInfo.routePolyline, busCoords) : null;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <style>{`@keyframes drive{0%{transform:translateX(-80px)}100%{transform:translateX(80px)}}.car-drive{animation:drive 1.4s ease-in-out infinite alternate}@keyframes road-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.road-scroll{animation:road-scroll 0.7s linear infinite}@keyframes wheel-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.wheel-spin{animation:wheel-spin 0.5s linear infinite}`}</style>
      <div className="relative w-52 overflow-hidden">
        <div className="car-drive flex flex-col items-center mb-1">
          <Bus size={52} className="text-purple-600 drop-shadow-md" />
          <div className="flex gap-7 -mt-1">
            <div className="w-3 h-3 rounded-full border-2 border-purple-800 bg-gray-200 wheel-spin" />
            <div className="w-3 h-3 rounded-full border-2 border-purple-800 bg-gray-200 wheel-spin" />
          </div>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden relative mt-1">
          <div className="road-scroll absolute top-1/2 -translate-y-1/2 flex gap-4" style={{ width: '200%' }}>
            {[...Array(12)].map((_, i) => <div key={i} className="w-6 h-0.5 bg-yellow-400 rounded-full shrink-0" />)}
          </div>
        </div>
      </div>
      <p className="text-purple-500 text-sm font-medium animate-pulse">Loading transport info…</p>
    </div>
  );

  if (!busInfo) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Bus size={48} className="text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">No bus assigned</p>
      <p className="text-gray-400 text-sm mt-1">Contact your school admin to be assigned to a transport route.</p>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-0 pb-8">

      {/* HERO BANNER */}
      <div className="relative bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 rounded-b-3xl px-5 pt-6 pb-8 -mx-4 mb-4 shadow-xl overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm shrink-0">
              <Bus size={26} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-lg leading-tight">{busInfo.plateNumber}</p>
              <p className="text-white/60 text-xs mt-0.5">{busInfo.routeName ?? 'No route'}{busInfo.routeFare ? ` · ₦${busInfo.routeFare.toLocaleString()}` : ''}</p>
              {busInfo.driverName && <p className="text-white/50 text-xs">🧑‍✈️ {busInfo.driverName}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${busInfo.tripActive ? 'bg-green-400/20 border-green-400/40 text-green-200' : 'bg-white/10 border-white/20 text-white/50'}`}>
              <span className={`w-2 h-2 rounded-full ${busInfo.tripActive ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
              {busInfo.tripActive ? 'On the way' : 'Not active'}
            </span>
            {connected && busInfo.tripActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-300/80">
                <Wifi size={10} /> Live
              </span>
            )}
          </div>
        </div>

        {busInfo.tripActive && (
          <div className="relative z-10 bg-white/10 border border-white/15 backdrop-blur-sm rounded-2xl px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-0.5">
                {eta?.dest === 'school' ? 'ETA to school' : 'ETA to your stop'}
              </p>
              {etaLoading && !eta ? (
                <p className="text-white/60 text-sm animate-pulse">Calculating…</p>
              ) : eta ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{fmt(eta.durationSeconds)}</span>
                  <span className="text-white/50 text-xs flex items-center gap-1">
                    <Navigation size={10} />{fmtDist(eta.distanceMeters)}{eta.source === 'estimate' ? ' (est.)' : ''}
                  </span>
                </div>
              ) : (
                <p className="text-white/50 text-sm">Waiting for GPS…</p>
              )}
            </div>
            <div className="text-4xl opacity-20 select-none">🚌</div>
          </div>
        )}

        {busInfo.tripActive && busMoving !== null && (
          <div className="relative z-10 mt-2 flex items-center gap-2 px-1">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${busMoving ? 'bg-green-400/20 text-green-300' : 'bg-amber-400/20 text-amber-300'}`}>
              <Gauge size={12} />
              {busMoving ? `Moving${busSpeed ? ` · ${busSpeed} km/h` : ''}` : 'Stopped'}
            </div>
          </div>
        )}
      </div>

      {pinnedBroadcast && (
        <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Radio size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Admin Broadcast</p>
            <p className="text-sm text-gray-800">{pinnedBroadcast.message}</p>
            {pinnedBroadcast.expiresAt && (
              <p className="text-[10px] text-gray-400 mt-1">Expires {new Date(pinnedBroadcast.expiresAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className="mx-4 mb-2 text-sm text-center text-purple-700 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5">{message}</div>
      )}

      <div className="px-4 flex flex-col gap-4">

        {/* LIVE MAP */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><MapPin size={14} className="text-purple-500" /> Live Map</p>
            {busCoords && (
              <button onClick={shareBusLocation} className="text-xs text-purple-600 font-semibold flex items-center gap-1 hover:text-purple-800">
                <Share2 size={12} /> Share
              </button>
            )}
          </div>
          <LiveMap busCoords={busCoords} homeCoords={homeCoords} routePolyline={busInfo.routePolyline} eta={eta} connected={connected} />
        </div>

        {/* ROUTE PROGRESS */}
        {busInfo.tripActive && progress !== null && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800">Route Progress</p>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 relative">
              <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-500" style={{ width: `${progress}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-purple-600 border-2 border-white rounded-full shadow-md transition-all duration-500 flex items-center justify-center" style={{ left: `calc(${progress}% - 10px)` }}>
                <span className="text-[8px]">🚌</span>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 font-medium">
              <span>Start</span><span>End</span>
            </div>
          </div>
        )}

        {/* CAPACITY */}
        {capacity && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><Users size={14} className="text-purple-500" /> Bus Capacity</p>
              <span className="text-xs text-gray-500 font-medium">{capacity.assigned} / {capacity.capacity}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${capacity.assigned / capacity.capacity > 0.9 ? 'bg-red-500' : capacity.assigned / capacity.capacity > 0.7 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (capacity.assigned / capacity.capacity) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {capacity.assigned / capacity.capacity > 0.9 ? '⚠️ Almost full' : capacity.assigned / capacity.capacity > 0.7 ? 'Filling up' : '✓ Seats available'}
            </p>
          </div>
        )}

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className={`grid gap-3 ${busInfo.driverUserId ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {busInfo.driverPhone ? (
              <a href={`tel:${busInfo.driverPhone}`}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-colors">
                <Phone size={20} className="text-emerald-600" />
                <span className="text-[11px] font-bold">Call Driver</span>
              </a>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-gray-300">
                <Phone size={20} /><span className="text-[11px]">No phone</span>
              </div>
            )}
            {busInfo.driverUserId && (
              <button onClick={() => router.push(`/student/messages?userId=${busInfo.driverUserId}`)}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors">
                <MessageCircle size={20} className="text-blue-600" />
                <span className="text-[11px] font-bold">Message</span>
              </button>
            )}
            {busInfo.driverUserId && (
              <button onClick={shareTrackingLink}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-green-50 border border-green-100 text-green-700 hover:bg-green-100 transition-colors">
                <UserPlus size={20} className="text-green-600" />
                <span className="text-[11px] font-bold">Share Link</span>
              </button>
            )}
          </div>
        </div>

        {/* HOME LOCATION */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><MapPin size={14} className="text-purple-500" /> Home Stop</p>
            {homeCoords && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Saved</span>}
          </div>
          {!homeCoords && <p className="text-xs text-amber-600 mb-3">Not set — ETA requires your home location.</p>}
          {homeCoords && <p className="text-xs text-gray-400 mb-3">{homeCoords.lat.toFixed(5)}, {homeCoords.lng.toFixed(5)}</p>}
          <div className="flex gap-2 mb-2">
            <button onClick={pinHomeLocation} disabled={settingHome}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold disabled:opacity-60 transition-colors">
              <Pin size={13} />{settingHome ? 'Getting GPS…' : 'Use My GPS'}
            </button>
          </div>
          <div className="flex gap-2">
            <input value={addressInput} onChange={e => setAddressInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && geocodeAddress()}
              placeholder="Or type your home address…"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400 transition-colors" />
            <button onClick={geocodeAddress} disabled={geocoding || !addressInput.trim()}
              className="px-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 disabled:opacity-50 transition-colors">
              <Search size={15} />
            </button>
          </div>
          {homeMsg && <p className="mt-2 text-xs text-purple-600 font-medium">{homeMsg}</p>}
        </div>

        {/* BUS FEE */}
        {(busFee?.feeConfigured || feeLoading) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bus Fee</p>
            {feeLoading ? (
              <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
            ) : busFee && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-gray-900">₦{busFee.fare.toLocaleString()}</p>
                  {busFee.paidAt && <p className="text-xs text-gray-400 mt-0.5">Paid {new Date(busFee.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${busFee.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : busFee.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {busFee.status === 'SUCCESS' ? '✓ Paid' : busFee.status === 'PENDING' ? 'Pending' : 'Not Paid'}
                  </span>
                  {busFee.status !== 'SUCCESS' && (
                    <button onClick={payBusFee} disabled={payingFee}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60">
                      💳 {payingFee ? 'Redirecting…' : 'Pay Now'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABSENT TOGGLE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${absent ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {absent ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-red-500" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Not coming today?</p>
              <p className="text-xs text-gray-400">Notify the driver to skip your stop.</p>
            </div>
          </div>
          <button onClick={toggleAbsent} disabled={absentLoading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${absent ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100' : 'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-200'}`}>
            {absent ? <><CheckCircle size={16} />Cancel — I'm coming</> : <><AlertTriangle size={16} />I'm sick — skip my stop</>}
          </button>
        </div>

        {/* SOS */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Siren size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Emergency SOS</p>
              <p className="text-xs text-gray-500">Sends your GPS to admin + driver instantly.</p>
            </div>
          </div>
          <button onClick={sendSos} disabled={sosLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 active:scale-95">
            <Siren size={16} />{sosLoading ? 'Sending…' : '🆘 Send Emergency Alert'}
          </button>
          {sosMsg && <p className="mt-2 text-xs text-center text-red-600 font-medium">{sosMsg}</p>}
        </div>

        {/* COMPLAINT */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={() => setShowComplaint(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
            <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <MessageCircle size={15} className="text-purple-500" />Send Complaint
            </span>
            <span className="text-gray-400 text-xs">{showComplaint ? '▲' : '▼'}</span>
          </button>
          {showComplaint && (
            <div className="px-4 pb-4 flex flex-col gap-2 border-t border-gray-50 pt-3">
              <textarea value={complaint} onChange={e => setComplaint(e.target.value)}
                placeholder="Describe your issue (late bus, behaviour, safety concern…)"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 resize-none" />
              <button onClick={sendComplaint} disabled={complaintSending || !complaint.trim()}
                className="self-end flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
                <Send size={13} />{complaintSending ? 'Sending…' : 'Submit'}
              </button>
            </div>
          )}
        </div>

        {/* ROUTE CHAT */}
        {busInfo?.routeId && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => { setShowRouteChat(p => !p); if (!showRouteChat) loadRouteChat(); }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <MessageSquare size={15} className="text-purple-500" />Route Chat
              </span>
              <span className="text-gray-400 text-xs">{showRouteChat ? '▲' : '▼'}</span>
            </button>
            {showRouteChat && (
              <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
                  {chatLoading && routeChat.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 animate-pulse">Loading…</p>
                  ) : routeChat.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No messages yet.</p>
                  ) : routeChat.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.userId === busInfo.driverUserId ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${msg.userId === busInfo.driverUserId ? 'bg-gray-100 text-gray-900 rounded-bl-sm' : 'bg-purple-600 text-white rounded-br-sm'}`}>
                        <p className="font-semibold text-[10px] mb-0.5 opacity-60">{msg.user?.firstName || 'User'}</p>
                        <p>{msg.message}</p>
                        <p className="text-[9px] opacity-40 mt-0.5">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendRouteChatMessage()}
                    placeholder="Type a message…"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                  <button onClick={sendRouteChatMessage} disabled={chatLoading || !chatMessage.trim()}
                    className="px-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40">
                    <Send size={15} />
                  </button>
                  <button onClick={startVoiceNote} disabled={recording || chatLoading}
                    className={`px-3 rounded-xl ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'} disabled:opacity-40`}>
                    {recording ? <span className="text-xs font-bold">{recordingTime}s</span> : <Mic size={15} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRIP HISTORY */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={() => setShowHistory(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
            <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <History size={15} className="text-purple-500" />Trip History
              {tripHistory.length > 0 && <span className="text-[11px] bg-purple-100 text-purple-600 font-bold px-2 py-0.5 rounded-full">{tripHistory.length}</span>}
            </span>
            <span className="text-gray-400 text-xs">{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="px-4 pb-4 border-t border-gray-50 pt-3">
              {tripHistory.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No trip history yet.</p>
              ) : (
                <div className="space-y-2">
                  {tripHistory.map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                        <Bus size={15} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{t.routeName ?? 'Unknown route'}</p>
                        <p className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {t.plateNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ADMIN BROADCASTS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={() => { setShowBroadcasts(p => !p); if (!showBroadcasts) loadBroadcasts(); }}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
            <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Radio size={15} className="text-purple-500" />Admin Broadcasts
            </span>
            <span className="text-gray-400 text-xs">{showBroadcasts ? '▲' : '▼'}</span>
          </button>
          {showBroadcasts && (
            <div className="px-4 pb-4 border-t border-gray-50 pt-3">
              {broadcasts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No broadcasts yet.</p>
              ) : (
                <div className="space-y-2">
                  {broadcasts.map((b: any) => (
                    <div key={b.id} className={`p-3 rounded-xl text-xs ${b.expiresAt && new Date(b.expiresAt) < new Date() ? 'bg-gray-50 text-gray-400 line-through' : 'bg-amber-50 border border-amber-100 text-gray-800'}`}>
                      <p>{b.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(b.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      <div ref={bottomRef} />
    </div>
  );
}
