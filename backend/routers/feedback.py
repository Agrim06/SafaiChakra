from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from database import get_db
from services import sensor_service

router = APIRouter(tags=["feedback"])


@router.get("/feedback", response_class=HTMLResponse)
def feedback(bin_id: str, db: Session = Depends(get_db)):
    print(f"Feedback received for bin {bin_id}")
    
    # Try finding the actual bin in the DB to avoid case mismatch errors
    existing_bins = sensor_service.diagnose_all(db)
    actual_id = next((b["bin_id"] for b in existing_bins if b["bin_id"].upper() == bin_id.upper()), bin_id)
    
    # Trigger simulation for the provided bin
    sensor_service.simulate_failure(db, actual_id, scenario="disconnect")
    print(f"Injected sensor failure for {actual_id}")

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bin Info</title>

  <style>
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      color: white;
    }}

    .card {{
      width: 85%;
      max-width: 300px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
      border-radius: 18px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
    }}

    .icon {{
      font-size: 32px;
      margin-bottom: 10px;
    }}

    .title {{
      font-size: 14px;
      opacity: 0.6;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }}

    .bin {{
      font-size: 20px;
      font-weight: bold;
      margin: 8px 0 12px;
    }}

    .msg {{
      font-size: 14px;
      opacity: 0.85;
      line-height: 1.5;
    }}
  </style>
</head>

<body>
  <div class="card">
    <div class="icon">🗑️</div>
    <div class="title">Community Bin</div>
    <div class="bin">{bin_id}</div>

    <div class="msg">
      Thank you for helping keep the city clean.  
    </div>
  </div>
</body>
</html>
"""