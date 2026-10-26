# -*- coding: utf-8 -*-
"""
Orbit - circular ducted assistant drone, parametric frame for FreeCAD.

How to run
  GUI:      Macro > Macros... > Create/Edit, paste this file, then Execute
            (or Macro > Execute macro and pick this file).
  Headless: freecadcmd orbit_frame.py

Change any value in P below and run again: the old document is replaced.
All lengths are millimetres, angles are degrees. Origin is the frame centre,
z = 0 is the underside of the ring; +X is the front of the drone.

Set PRESET below to switch between the 30-minute and the small indoor version.

Outputs (in Documents/OrbitDrone): OrbitDrone.FCStd, one STEP per part, and an STL for
each printable part (Frame, HubLid, ElectronicsDeck).
"""

import math
import os

import FreeCAD as App
import Part

V = App.Vector

P = {
    # outer ring
    "ring_od": 330.0,
    "ring_wall": 1.6,
    "ring_h": 30.0,
    # ducts
    "prop_d": 89.0,          # 3.5 in prop
    "tip_gap": 1.5,          # radial gap between prop tip and duct
    "duct_wall": 1.2,
    "duct_h": 36.0,
    "duct_lip_r": 5.0,       # radius of the rounded inlet lip
    "duct_center_r": 105.0,  # distance from frame centre to duct axis
    "duct_angles": (45.0, 135.0, 225.0, 315.0),
    "bridge_w": 6.0,         # web joining each duct to hub and ring
    # motor mount inside each duct
    "mount_top_z": 10.0,     # top face of the motor boss
    "mount_boss_d": 28.0,
    "mount_boss_t": 4.0,
    "mount_center_hole_d": 7.0,
    "mount_hole_spacing": 16.0,  # 16 x 16 mm motor pattern
    "mount_hole_d": 2.2,         # M2 clearance
    "strut_w": 3.0,
    "strut_h": 8.0,
    # central hub
    "hub_od": 100.0,
    "hub_h": 70.0,
    "hub_wall": 1.6,
    "hub_floor": 2.0,
    "deck_ledge_z": 26.0,    # top of the ledge the electronics deck rests on
    "deck_ledge_w": 2.5,
    "deck_t": 2.0,
    "fc_stack_spacing": 20.0,    # 20 x 20 mm flight controller / ESC stack
    "fc_stack_x": -22.0,
    "standoff_d": 5.0,
    "standoff_h": 6.0,
    "standoff_hole_d": 1.8,      # M2 tap size
    "flow_window": (18.0, 14.0),  # optical flow sensor window in hub floor
    "flow_window_x": 26.0,
    # lid
    "lid_t": 2.5,
    "lid_lip_depth": 5.0,
    "lid_lip_wall": 2.0,
    "lid_clearance": 0.3,
    # spokes between ducts (hub to ring, at 0/90/180/270)
    "spoke_w": 6.0,
    "spoke_h": 8.0,
    "spoke_angles": (0.0, 90.0, 180.0, 270.0),
    # sensor windows in the ring
    "tof_window": (10.0, 8.0),   # width, height
    "tof_window_z": 18.0,        # window centre height
    "tof_angles": (10.0, 90.0, 180.0, 270.0),  # front one sits beside the camera
    "camera_window": (14.0, 14.0),
    "camera_window_z": 15.0,
    # landing feet, under the spokes
    "foot_d": 12.0,
    "foot_h": 15.0,
    "foot_r": 115.0,
    # visual-only parts
    "motor_d": 25.0,
    "motor_h": 15.0,
    "prop_t": 2.0,
    "battery": (75.0, 35.0, 35.0),  # 4S 1500 mAh, L x W x H
    "battery_y": -10.0,  # offset so the strap slots clear the deck wire hole
}

# Pick a preset. "orbit30" is the 30-minute version (6 in ducts, 4S2P
# Li-ion); "indoor" is the small 330 mm, 3.5 in version (about 8 minutes).
PRESET = "orbit30"

PRESETS = {
    "indoor": {},
    "orbit30": {
        "ring_od": 462.0,
        "prop_d": 152.0,          # 6 in
        "tip_gap": 2.0,
        "duct_h": 45.0,
        "duct_lip_r": 6.0,
        "duct_center_r": 143.0,
        "mount_boss_d": 34.0,
        "mount_hole_d": 3.2,      # M3, 16 x 16 mm (2306 class motors)
        "strut_w": 4.0,
        "strut_h": 10.0,
        "hub_od": 116.0,
        "hub_h": 82.0,
        "flow_window_x": 30.0,
        "fc_stack_spacing": 30.5,  # 30 x 30 stack fits the bigger hub
        "fc_stack_x": -24.0,
        "foot_r": 150.0,
        "foot_h": 20.0,
        "motor_d": 29.0,
        "motor_h": 20.0,
        "battery": (84.0, 70.0, 44.0),  # 4S2P 21700 Li-ion, cells lying flat
        "battery_y": 0.0,
    },
}
P.update(PRESETS[PRESET])

DOC_NAME = "OrbitDrone"
OUT_DIR = os.path.join(os.path.expanduser("~"), "Documents", "OrbitDrone")


def cyl(r, h, x=0.0, y=0.0, z=0.0):
    return Part.makeCylinder(r, h, V(x, y, z))


def tube(r_out, r_in, h, x=0.0, y=0.0, z=0.0):
    return cyl(r_out, h, x, y, z).cut(cyl(r_in, h + 2, x, y, z - 1))


def radial_box(r0, r1, w, z0, h, angle_deg):
    """Box from radius r0 to r1 along the direction angle_deg, width w."""
    b = Part.makeBox(r1 - r0, w, h, V(r0, -w / 2.0, z0))
    b.rotate(V(0, 0, 0), V(0, 0, 1), angle_deg)
    return b


def polar(r, angle_deg):
    a = math.radians(angle_deg)
    return r * math.cos(a), r * math.sin(a)


def fuse_all(shapes):
    s = shapes[0]
    for other in shapes[1:]:
        s = s.fuse(other)
    return s.removeSplitter()


def duct_air(x, y):
    """The air volume of one duct, including the flared inlet."""
    r_in = P["prop_d"] / 2.0 + P["tip_gap"]
    lip = P["duct_lip_r"]
    h = P["duct_h"]
    air = cyl(r_in, h + 2, x, y, -1)
    slab = cyl(r_in + lip, lip + 1, x, y, h - lip)
    torus = Part.makeTorus(r_in + lip, lip, V(x, y, h - lip))
    return air.fuse(slab.cut(torus))


def duct_solid(x, y):
    r_in = P["prop_d"] / 2.0 + P["tip_gap"]
    lip = P["duct_lip_r"]
    h = P["duct_h"]
    wall = cyl(r_in + P["duct_wall"], h - lip, x, y, 0)
    lip_band = cyl(r_in + lip, lip, x, y, h - lip)
    return wall.fuse(lip_band)


def motor_mount(x, y, duct_angle):
    r_in = P["prop_d"] / 2.0 + P["tip_gap"]
    top = P["mount_top_z"]
    boss_r = P["mount_boss_d"] / 2.0
    boss = cyl(boss_r, P["mount_boss_t"], x, y, top - P["mount_boss_t"])
    parts = [boss]
    # one strut points at the hub (wire route), the other two at +/-120
    for k in (180.0, 60.0, -60.0):
        s = radial_box(boss_r - 1.0, r_in + 0.5, P["strut_w"],
                       top - P["strut_h"], P["strut_h"], duct_angle + k)
        s.translate(V(x, y, 0))
        parts.append(s)
    m = fuse_all(parts)
    holes = [cyl(P["mount_center_hole_d"] / 2.0, 20, x, y, top - 10)]
    half = P["mount_hole_spacing"] / 2.0
    for dx, dy in ((half, half), (half, -half), (-half, half), (-half, -half)):
        holes.append(cyl(P["mount_hole_d"] / 2.0, 20, x + dx, y + dy, top - 10))
    for h in holes:
        m = m.cut(h)
    return m


def ring_window(w, h, zc, angle_deg):
    r_out = P["ring_od"] / 2.0
    b = Part.makeBox(P["ring_wall"] + 4.0, w, h,
                     V(r_out - P["ring_wall"] - 2.0, -w / 2.0, zc - h / 2.0))
    b.rotate(V(0, 0, 0), V(0, 0, 1), angle_deg)
    return b


def build_frame():
    r_ring = P["ring_od"] / 2.0
    r_hub = P["hub_od"] / 2.0
    shapes = [tube(r_ring, r_ring - P["ring_wall"], P["ring_h"])]

    # hub shell with floor, open top
    hub = cyl(r_hub, P["hub_h"]).cut(
        cyl(r_hub - P["hub_wall"], P["hub_h"], 0, 0, P["hub_floor"]))
    shapes.append(hub)

    # ledge for the electronics deck
    lz = P["deck_ledge_z"]
    shapes.append(tube(r_hub - P["hub_wall"] + 0.01,
                       r_hub - P["hub_wall"] - P["deck_ledge_w"], 2.0,
                       z=lz - 2.0))

    # ducts and the webs that tie them to hub and ring
    for a in P["duct_angles"]:
        x, y = polar(P["duct_center_r"], a)
        shapes.append(duct_solid(x, y))
        shapes.append(radial_box(r_hub - 1.0, r_ring - 1.0, P["bridge_w"],
                                 0, min(P["duct_h"], P["ring_h"]), a))

    # spokes between ducts
    for a in P["spoke_angles"]:
        shapes.append(radial_box(r_hub - 1.0, r_ring - 1.0, P["spoke_w"],
                                 0, P["spoke_h"], a))

    # landing feet
    for a in P["spoke_angles"]:
        fx, fy = polar(P["foot_r"], a)
        shapes.append(cyl(P["foot_d"] / 2.0, P["foot_h"], fx, fy, -P["foot_h"]))

    # flight controller standoffs on the hub floor
    half = P["fc_stack_spacing"] / 2.0
    fcx = P["fc_stack_x"]
    for dx, dy in ((half, half), (half, -half), (-half, half), (-half, -half)):
        shapes.append(cyl(P["standoff_d"] / 2.0, P["standoff_h"],
                          fcx + dx, dy, P["hub_floor"] - 0.01))

    frame = fuse_all(shapes)

    # clear the air path through each duct (also trims the webs)
    for a in P["duct_angles"]:
        x, y = polar(P["duct_center_r"], a)
        frame = frame.cut(duct_air(x, y))

    # motor mounts go in after the air cut
    mounts = []
    for a in P["duct_angles"]:
        x, y = polar(P["duct_center_r"], a)
        mounts.append(motor_mount(x, y, a))
    frame = fuse_all([frame] + mounts)

    # holes and windows
    cuts = []
    for dx, dy in ((half, half), (half, -half), (-half, half), (-half, -half)):
        cuts.append(cyl(P["standoff_hole_d"] / 2.0, P["standoff_h"] + 2,
                        fcx + dx, dy, 0.5))
    fw, fl = P["flow_window"]
    cuts.append(Part.makeBox(fw, fl, P["hub_floor"] + 2,
                             V(P["flow_window_x"] - fw / 2.0, -fl / 2.0, -1)))
    tw, th = P["tof_window"]
    for a in P["tof_angles"]:
        cuts.append(ring_window(tw, th, P["tof_window_z"], a))
    cw, ch = P["camera_window"]
    cuts.append(ring_window(cw, ch, P["camera_window_z"], 0.0))
    for c in cuts:
        frame = frame.cut(c)
    return frame.removeSplitter()


def build_lid():
    r_hub = P["hub_od"] / 2.0
    z = P["hub_h"]
    disc = cyl(r_hub, P["lid_t"], z=z)
    lip_out = r_hub - P["hub_wall"] - P["lid_clearance"]
    lip = tube(lip_out, lip_out - P["lid_lip_wall"], P["lid_lip_depth"],
               z=z - P["lid_lip_depth"])
    lid = disc.fuse(lip)
    # two mic holes and a speaker grille
    for mx in (-30.0, 30.0):
        lid = lid.cut(cyl(1.0, 10, 0, mx, z - 5))
    lid = lid.cut(cyl(1.5, 10, 0, 0, z - 5))
    for k in range(6):
        gx, gy = polar(6.0, k * 60.0)
        lid = lid.cut(cyl(1.5, 10, gx, gy, z - 5))
    return lid.removeSplitter()


def build_deck():
    r = P["hub_od"] / 2.0 - P["hub_wall"] - 0.4
    deck = cyl(r, P["deck_t"], z=P["deck_ledge_z"])
    deck = deck.cut(cyl(6.0, 10, 0, 22.0, P["deck_ledge_z"] - 5))  # wire pass
    bl, bw, _ = P["battery"]
    for sy in (P["battery_y"] - bw / 2.0 - 4.0, P["battery_y"] + bw / 2.0 + 1.0):
        # battery strap slots either side of the pack
        deck = deck.cut(Part.makeBox(22.0, 3.0, 10,
                                     V(-11.0, sy, P["deck_ledge_z"] - 5)))
    return deck


def build_visuals():
    motors, props = [], []
    r_prop = P["prop_d"] / 2.0
    for a in P["duct_angles"]:
        x, y = polar(P["duct_center_r"], a)
        motors.append(cyl(P["motor_d"] / 2.0, P["motor_h"], x, y,
                          P["mount_top_z"]))
        props.append(cyl(r_prop, P["prop_t"], x, y,
                         P["mount_top_z"] + P["motor_h"] + 1.0))
    bl, bw, bh = P["battery"]
    bat = Part.makeBox(bl, bw, bh,
                       V(-bl / 2.0, P["battery_y"] - bw / 2.0,
                         P["deck_ledge_z"] + P["deck_t"]))
    return fuse_all(motors), fuse_all(props), bat


def main():
    if DOC_NAME in App.listDocuments():
        App.closeDocument(DOC_NAME)
    doc = App.newDocument(DOC_NAME)

    frame = build_frame()
    lid = build_lid()
    deck = build_deck()
    motors, props, bat = build_visuals()

    objs = {}
    for name, shape in (("Frame", frame), ("HubLid", lid),
                        ("ElectronicsDeck", deck), ("Motors", motors),
                        ("Props", props), ("Battery", bat)):
        o = doc.addObject("Part::Feature", name)
        o.Shape = shape
        objs[name] = o
    doc.recompute()

    if App.GuiUp:
        import FreeCADGui as Gui
        colours = {"Frame": (0.85, 0.85, 0.88), "HubLid": (0.2, 0.6, 0.9),
                   "ElectronicsDeck": (0.3, 0.7, 0.3), "Motors": (0.2, 0.2, 0.2),
                   "Props": (0.95, 0.5, 0.1), "Battery": (0.8, 0.2, 0.2)}
        for name, col in colours.items():
            objs[name].ViewObject.ShapeColor = col
        objs["Props"].ViewObject.Transparency = 60
        Gui.activeDocument().activeView().viewIsometric()
        Gui.SendMsgToActiveView("ViewFit")

    os.makedirs(OUT_DIR, exist_ok=True)
    doc.saveAs(os.path.join(OUT_DIR, DOC_NAME + ".FCStd"))
    for name, o in objs.items():
        o.Shape.exportStep(os.path.join(OUT_DIR, name + ".step"))
    import Mesh
    for name in ("Frame", "HubLid", "ElectronicsDeck"):
        mesh = Mesh.Mesh(objs[name].Shape.tessellate(0.1))
        mesh.write(os.path.join(OUT_DIR, name + ".stl"))

    App.Console.PrintMessage(
        "Orbit frame built: %.0f cm3, about %.0f g in PETG or %.0f g in LW-PLA. "
        "Files in %s\n" % (frame.Volume / 1000.0, frame.Volume / 1000.0 * 1.27,
                           frame.Volume / 1000.0 * 0.6, OUT_DIR))
    return doc


main()
