
import sys
import os

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi  = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def _intersects(p1, p2, p3, p4):
    def ccw(A, B, C):
        return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

def _dist_km(p1, p2):
    return _haversine_km(p1[0], p1[1], p2[0], p2[1])

def _dist_to_segment(p, a, b):
    lat_p, lon_p = p
    lat_a, lon_a = a
    lat_b, lon_b = b
    l2 = (lat_b - lat_a)**2 + (lon_b - lon_a)**2
    if l2 == 0: return _dist_km(p, a)
    t = max(0, min(1, ((lat_p - lat_a) * (lat_b - lat_a) + (lon_p - lon_a) * (lon_b - lon_a)) / l2))
    projection = (lat_a + t * (lat_b - lat_a), lon_a + t * (lon_b - lon_a))
    return _dist_km(p, projection)

# The logic I implemented in route_optimizer.py
def _leg_intersects_traffic_REFINED(start_coord, end_coord, traffic_lines, buffer_km=0.15):
    if not traffic_lines:
        return 0
    p1 = (start_coord[0], start_coord[1])
    p2 = (end_coord[0], end_coord[1])
    leg_min_lat, leg_max_lat = min(p1[0], p2[0]), max(p1[0], p2[0])
    leg_min_lon, leg_max_lon = min(p1[1], p2[1]), max(p1[1], p2[1])
    leg_min_lat -= 0.002; leg_max_lat += 0.002
    leg_min_lon -= 0.002; leg_max_lon += 0.002
    total_penalty = 0
    for line in traffic_lines:
        pts = line
        if len(pts) < 2: continue
        lats = [p[0] for p in pts]
        lons = [p[1] for p in pts]
        # ADDED BUFFER IN MY FIX:
        line_min_lat, line_max_lat = min(lats) - 0.001, max(lats) + 0.001
        line_min_lon, line_max_lon = min(lons) - 0.001, max(lons) + 0.001
        if (leg_max_lat < line_min_lat or leg_min_lat > line_max_lat or
            leg_max_lon < line_min_lon or leg_min_lon > line_max_lon):
            continue
        line_has_buffer_penalty = False
        for i in range(len(pts) - 1):
            p3, p4 = pts[i], pts[i+1]
            if _intersects(p1, p2, p3, p4):
                total_penalty += 2000000 
            if not line_has_buffer_penalty:
                mid = ((p1[0]+p2[0])/2, (p1[1]+p2[1])/2)
                if (_dist_to_segment(p1, p3, p4) < buffer_km or 
                    _dist_to_segment(p2, p3, p4) < buffer_km or 
                    _dist_to_segment(mid, p3, p4) < buffer_km):
                    total_penalty += 5000
                    line_has_buffer_penalty = True
    return total_penalty

# Test Case: Leg near a tiny scribble but not exactly in its bounding box
# Leg from 12.0 to 12.1
p1 = (12.0, 76.0)
p2 = (12.1, 76.0)
# Scribble at 12.101
traffic = [[[12.101, 76.001], [12.101, 76.002]]]

# Without fix, leg_max_lat (12.102) < line_min_lat (12.101) ? NO.
# Let's try: Scribble at 12.103. 
# leg_max_lat = 12.1 + 0.002 = 12.102.
# line_min_lat = 12.103. 
# 12.102 < 12.103 is TRUE -> it would CONTINUE (skip).
# But distance between 12.1 and 12.103 is small.

p1 = (12.0, 76.0)
p2 = (12.1, 76.0) # leg_max_lat will be 12.102
traffic = [[[12.1025, 76.0], [12.1025, 76.001]]] # line_min_lat is 12.1025

# Old logic: 12.102 < 12.1025 is TRUE -> skip.
# New logic: line_min_lat becomes 12.1025 - 0.001 = 12.1015.
# 12.102 < 12.1015 is FALSE -> overlap!

pen = _leg_intersects_traffic_REFINED(p1, p2, traffic)
print(f"Penalty for near leg (should be 5000): {pen}")
