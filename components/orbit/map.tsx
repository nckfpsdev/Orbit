"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type * as Leaflet from "leaflet";
import { MapPin, LocateFixed, Layers3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Business } from "@/lib/domain/types";
import { WEBSITE_LABELS } from "@/lib/domain/constants";
interface Props {
  businesses: Business[];
  center: { latitude: number; longitude: number };
  radius: number;
  selectedId?: string;
  onSelect: (b: Business) => void;
  onBounds: (b: [number, number, number, number]) => void;
  onSearchArea: () => void;
  busy: boolean;
  city: string;
}
export function BusinessMap({
  businesses,
  center,
  radius,
  selectedId,
  onSelect,
  onBounds,
  onSearchArea,
  busy,
  city,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const initialCenter = useRef(center);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!ready || !container.current) return;
    const observer = new ResizeObserver(() =>
      map.current?.invalidateSize({ pan: false }),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [ready]);
  useEffect(() => {
    let cancelled = false;
    let tileFailures = 0;
    void import("leaflet")
      .then((L) => {
        if (cancelled || !container.current) return;
        lib.current = L;
        const m = L.map(container.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          keyboard: true,
          minZoom: 3,
          maxZoom: 18,
        });
        map.current = m;
        L.control
          .zoom({
            position: "topright",
            zoomInTitle: "Ampliar mapa",
            zoomOutTitle: "Reduzir mapa",
          })
          .addTo(m);
        m.setView(
          [initialCenter.current.latitude, initialCenter.current.longitude],
          12,
        );
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
          detectRetina: false,
        })
          .on("tileerror", () => {
            tileFailures++;
            if (tileFailures >= 8) setTileError(true);
          })
          .on("tileload", () => setTileError(false))
          .addTo(m);
        layer.current = L.layerGroup().addTo(m);
        setReady(true);
      })
      .catch(() => setTileError(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (ready) map.current?.setView([center.latitude, center.longitude], 12);
  }, [ready, center.latitude, center.longitude]);
  const draw = useCallback(() => {
    const m = map.current,
      L = lib.current,
      group = layer.current;
    if (!m || !L || !group) return;
    group.clearLayers();
    L.circle([center.latitude, center.longitude], {
      radius: radius * 1000,
      color: "#8978e1",
      weight: 1.5,
      dashArray: "5 7",
      fillColor: "#9588e5",
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(group);
    const clusters = new Map<string, Business[]>();
    for (const b of businesses) {
      const point = m.latLngToContainerPoint([b.latitude, b.longitude]);
      const key =
        m.getZoom() >= 14
          ? b.id
          : `${Math.floor(point.x / 44)}:${Math.floor(point.y / 44)}`;
      clusters.set(key, [...(clusters.get(key) ?? []), b]);
    }
    for (const items of clusters.values()) {
      if (items.length > 1) {
        const lat = items.reduce((s, b) => s + b.latitude, 0) / items.length,
          lon = items.reduce((s, b) => s + b.longitude, 0) / items.length;
        const marker = L.marker([lat, lon], {
          title: `${items.length} negócios. Clique para aproximar.`,
          icon: L.divIcon({
            className: "orbit-marker",
            html: `<span class="cluster-marker">${items.length}</span>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          }),
        });
        marker.on("click", () => m.setView([lat, lon], m.getZoom() + 2));
        marker.on("add", () =>
          marker
            .getElement()
            ?.setAttribute(
              "aria-label",
              `${items.length} negócios. Clique para aproximar.`,
            ),
        );
        marker.addTo(group);
        continue;
      }
      const b = items[0];
      const type = b.saved
        ? "saved"
        : b.website_status === "own_website"
          ? "own"
          : b.website_status === "social_only" ||
              b.website_status === "aggregator"
            ? "social"
            : "";
      const label = b.saved
        ? "✓"
        : b.lead_score >= 80
          ? "★"
          : b.website_status === "own_website"
            ? "●"
            : "!";
      const marker = L.marker([b.latitude, b.longitude], {
        title: `${b.business_name} · ${b.lead_score}/100 · ${WEBSITE_LABELS[b.website_status]}`,
        keyboard: true,
        icon: L.divIcon({
          className: "orbit-marker",
          html: `<div class="marker-inner ${type} ${b.id === selectedId ? "selected" : ""}"><span>${label}</span></div>`,
          iconSize: [34, 40],
          iconAnchor: [17, 34],
        }),
      });
      marker.on("click", () => onSelect(b));
      marker.on("add", () =>
        marker
          .getElement()
          ?.setAttribute(
            "aria-label",
            `${b.business_name} · oportunidade ${b.lead_score} de 100 · ${WEBSITE_LABELS[b.website_status]}`,
          ),
      );
      marker.addTo(group);
    }
    const bounds = m.getBounds();
    onBounds([
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
    ]);
  }, [
    businesses,
    center.latitude,
    center.longitude,
    radius,
    selectedId,
    onSelect,
    onBounds,
  ]);
  useEffect(() => {
    if (!ready) return;
    draw();
    const m = map.current;
    m?.on("moveend zoomend", draw);
    return () => {
      m?.off("moveend zoomend", draw);
    };
  }, [ready, draw]);
  return (
    <div className="map-wrap">
      <div
        ref={container}
        className="map-canvas"
        role="region"
        aria-label={`Mapa de negócios em ${city}. Use as setas para mover e os controles para ampliar.`}
      />
      {tileError && (
        <div className="map-fallback">
          <Layers3 size={28} />
          <strong>O mapa base está indisponível.</strong>
          <p>
            A lista continua disponível. Os marcadores serão retomados quando a
            conexão permitir.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setTileError(false);
              map.current?.invalidateSize();
              map.current?.eachLayer((l) => {
                if (lib.current && l instanceof lib.current.TileLayer)
                  l.redraw();
              });
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      <div className="map-overlay">
        <MapPin size={18} />
        <div>
          <strong>{city}</strong>
          <small>
            {radius} km · {businesses.length} negócios
          </small>
        </div>
      </div>
      <Button
        className="map-area-button"
        variant="outline"
        onClick={onSearchArea}
        disabled={busy}
      >
        <RefreshCw size={14} />
        {busy ? "Pesquisando…" : "Pesquisar nesta área"}
      </Button>
      <div className="map-legend">
        <span>
          <i className="none">!</i>Sem site identificado
        </span>
        <span>
          <i className="own">●</i>Site próprio
        </span>
        <span>
          <i className="saved">✓</i>Salvo
        </span>
      </div>
      <button
        className="map-center-button"
        onClick={() =>
          map.current?.setView([center.latitude, center.longitude], 12)
        }
        aria-label="Centralizar mapa"
      >
        <LocateFixed size={17} />
      </button>
    </div>
  );
}
