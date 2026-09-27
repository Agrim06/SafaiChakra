from __future__ import annotations

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder

from database import SessionLocal
from services import bin_service, sensor_service
from services.websocket_manager import manager
from schemas import SensorHealthItem


logger = logging.getLogger("safai_ws")
router = APIRouter(prefix="/ws",tags=["websocket"])

def get_current_system_snapshot():
    
    db = SessionLocal()
    try:
        all_bins = bin_service.get_all_bins(db)
        status_map = {}

        for bin_id in all_bins:
            reading = bin_service.get_latest_reading(db, bin_id)
            
            if reading:
                status_map[bin_id] = {
                    "bin_id": reading.bin_id,
                    "fill_pct": reading.fill_pct,
                    "distance_cm": reading.distance_cm,
                    "latitude": reading.latitude,
                    "longitude": reading.longitude,
                    "is_alert": reading.is_alert,
                    "sensor_status": reading.sensor_status,
                    "message": "Collection needed!" if reading.is_alert else "All good.",
                    "created_at": reading.created_at.isoformat() if reading.created_at else None,
                    "spillover_risk": bin_service.calculate_predictive_risk(db, reading.bin_id, reading.fill_pct),
                }

        diagnostics = sensor_service.diagnose_all(db)
        items = [SensorHealthItem(**d) for d in diagnostics]
        sensor_health = {
            "sensors": [item.model_dump() for item in items],
            "summary": {
                "total": len(items),
                "healthy": sum(1 for i in items if i.severity == "OK"),
                "warnings": sum(1 for i in items if i.severity == "WARNING"),
                "failures": sum(1 for i in items if i.severity == "FAILURE"),
            },
        }

        return {
            "all_bins": all_bins,
            "statuses": status_map,
            "sensor_health": sensor_health,
        }
    finally:
        db.close()


@router.websocket("/bins")
async def websocket_bin_endpoint(websocket: WebSocket):
    print(f"\n[WS SERVER] Incoming handshake from {websocket.client}", flush=True)
    await manager.connect(websocket)
    print(f"[WS SERVER] Handshake accepted for {websocket.client}", flush=True)

    try:
        print("[WS SERVER] Fetching initial snapshot...", flush=True)
        snapshot = get_current_system_snapshot()
        print(f"[WS SERVER] Snapshot fetched: {len(snapshot.get('all_bins', []))} bins. Sending to client...", flush=True)
        await manager.send_personal_message(
            {
                "event": "INIT_SNAPSHOT",
                "data": jsonable_encoder(snapshot),
            },
            websocket,
        )
        print("[WS SERVER] Snapshot delivered successfully!", flush=True)

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        print(f"[WS SERVER] Client disconnected: {websocket.client}", flush=True)
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS SERVER] Error in websocket loop: {type(e)} {e}", flush=True)
        import traceback
        traceback.print_exc()
        manager.disconnect(websocket)


