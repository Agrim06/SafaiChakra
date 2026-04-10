
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from route_optimizer import _leg_intersects_traffic

# Mock data
# Leg from A to B
p1 = (12.3, 76.6)
p2 = (12.4, 76.7)

# Traffic line that crosses the leg
traffic_lines = [
    [[12.3, 76.7], [12.4, 76.6]]
]

penalty = _leg_intersects_traffic(p1, p2, traffic_lines)
print(f"Penalty for CROSSING: {penalty}")

# Traffic line that is NEAR but not crossing
traffic_lines_near = [
    [[12.351, 76.65], [12.351, 76.66]]
]
# Midpoint of leg is (12.35, 76.65). 
# Point (12.351, 76.65) is ~110m away from midpoint.
penalty_near = _leg_intersects_traffic(p1, p2, traffic_lines_near)
print(f"Penalty for NEAR: {penalty_near}")

# Traffic line that's far away
traffic_lines_far = [
    [[12.5, 76.8], [12.6, 76.9]]
]
penalty_far = _leg_intersects_traffic(p1, p2, traffic_lines_far)
print(f"Penalty for FAR: {penalty_far}")
