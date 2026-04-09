import math, requests, json

def _intersects(p1, p2, p3, p4):
    def ccw(A, B, C):
        return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

def _leg_intersects_traffic(start_coord, end_coord, traffic_lines):
    if not traffic_lines:
        return False
    p1 = (start_coord[0], start_coord[1])
    p2 = (end_coord[0], end_coord[1])
    for line in traffic_lines:
        if len(line) < 2: continue
        for i in range(len(line) - 1):
            p3 = (line[i][0], line[i][1])
            p4 = (line[i+1][0], line[i+1][1])
            if _intersects(p1, p2, p3, p4):
                return True
    return False

coords_map = {
    'BIN_01': (12.333285, 76.6125598),
    'BIN_02': (12.2933904, 76.6308591),
    'BIN_03': (12.2984766, 76.6284048),
    'BIN_07': (12.3579894, 76.6105084),
    'BIN_09': (12.3260989, 76.628297),
    'DEPOT_00': (12.2709, 76.6385),
}

lats = [v[0] for v in coords_map.values()]
lons = [v[1] for v in coords_map.values()]
mid_lat = (min(lats) + max(lats)) / 2
print(f"Lat range: {min(lats):.4f} - {max(lats):.4f}, mid: {mid_lat:.4f}")
print(f"Lon range: {min(lons):.4f} - {max(lons):.4f}")

# A traffic line slashing DIAGONALLY across the whole city - guaranteed to cross legs
traffic = [[[min(lats)-0.01, min(lons)-0.01], [max(lats)+0.01, max(lons)+0.01]]]
print(f"\nTraffic diagonal: {traffic}")

all_coords = list(coords_map.values())
all_ids = list(coords_map.keys())
print("\nIntersection tests:")
for i in range(len(all_coords)):
    for j in range(len(all_coords)):
        if i != j:
            hit = _leg_intersects_traffic(all_coords[i], all_coords[j], traffic)
            if hit:
                print(f"  PENALTY: {all_ids[i]} -> {all_ids[j]}")

print("\n--- Route WITHOUT traffic ---")
r1 = requests.post('http://localhost:8000/optimize-route', json={"threshold": 60, "traffic_lines": []})
d1 = r1.json()
print("Route:", d1.get('route'))
print("Dist:", d1.get('optimized_distance_km'))

print("\n--- Route WITH diagonal traffic ---")
r2 = requests.post('http://localhost:8000/optimize-route', json={"threshold": 60, "traffic_lines": traffic})
d2 = r2.json()
print("Route:", d2.get('route'))
print("Dist:", d2.get('optimized_distance_km'))
