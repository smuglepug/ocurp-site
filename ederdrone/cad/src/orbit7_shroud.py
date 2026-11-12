# -*- coding: utf-8 -*-
"""
Orbit 7 - circular ducted shroud for the Ederdrone build, parametric, for FreeCAD.

The Chimera7 carbon frame stays as the skeleton. This macro designs the printed
parts that turn it into a circular drone: four 7 in ducts that clip onto the
carbon arms, joined by an outer ring, plus a top canopy over the stack.

How to run
  GUI:      Macro > Macros... > Create, paste this file, Execute.
  Headless: FreeCADCmd orbit7_shroud.py

MEASURE YOUR FRAME FIRST. The arm values below (arm_w, arm_t, motor_angles,
motor_r) are estimates for a Chimera7 Pro V2. The DeadCat layout spreads the
front arms wider than a true X, so measure where each motor shaft sits
(distance from frame centre and angle) and put the numbers in P.

The shroud is 535 mm across, so it is also split into 4 duct modules and
8 ring arcs that each fit a 220 x 220 mm print bed (see PrintPieces).

All lengths mm, angles degrees. Origin = frame centre, z = 0 is the top face
of the carbon arms. +X is the front of the drone.

Outputs (in OUT_DIR): Orbit7.FCStd, STEP of every part, STL of printable parts.
"""

import math
import os

import FreeCAD as App
import Part

V = App.Vector

P = {
    # carbon frame (Chimera7 Pro V2, estimates: measure yours)
    "motor_r": 163.5,                     # 327 mm wheelbase / 2
    "motor_angles": (45.0, 135.0, 225.0, 315.0),
    "arm_w": 14.0,                        # arm width where the duct crosses it
    "arm_t": 6.0,                         # carbon arm thickness
    "body": (120.0, 44.0, 40.0),          # stack area L x W x H above the arms
    # propulsion (EMAX ECO II 2807 + 7040 props)
    "prop_d": 178.0,                      # 7 in
    "tip_gap": 3.0,                       # 7 in blades flex, keep the gap generous
    "motor_d": 34.0,
    "motor_h": 22.0,
    "prop_z": 30.0,                       # prop plane height above the arm top
    # ducts
    "duct_wall": 1.6,
    "duct_bottom_z": -15.0,               # duct starts below the arm
    "duct_h": 55.0,                       # prop plane sits just under the inlet lip
    "duct_lip_r": 8.0,
    "arm_slot_clear": 0.6,                # clearance around the arm in the duct slot
    "clamp_len": 24.0,                    # saddle that grips the arm at the duct wall
    "clamp_wall": 3.0,
    "zip_slot": (4.0, 2.0),               # zip-tie slot through each clamp (w x h)
    # outer ring
    "ring_wall": 2.0,
    "ring_h": 30.0,
    "ring_z": 0.0,                        # ring bottom height
    "ring_gap": 2.0,                      # radial gap between duct lip and ring
    "web_w": 6.0,
    "ring_segments": 8,                   # ring printed in this many arcs
    # canopy over the stack
    "canopy_len": 160.0,                  # stadium shape that fits between the ducts
    "canopy_w": 64.0,
    "canopy_h": 55.0,
    "canopy_wall": 1.6,
    "gps_boss_d": 30.0,
    # visual-only
    "battery": (75.0, 45.0, 72.0),        # 6S1P 21700 pack, approx
}

DOC_NAME = "Orbit7"
OUT_DIR = os.path.join(os.path.expanduser("~"), "Documents", "OrbitDrone")


def cyl(r, h, x=0.0, y=0.0, z=0.0):
    return Part.makeCylinder(r, h, V(x, y, z))


def polar(r, a):
    a = math.radians(a)
    return r * math.cos(a), r * math.sin(a)


def radial_box(r0, r1, w, z0, h, a):
    b = Part.makeBox(r1 - r0, w, h, V(r0, -w / 2.0, z0))
    b.rotate(V(0, 0, 0), V(0, 0, 1), a)
    return b


def fuse_all(shapes):
    s = shapes[0]
    for o in shapes[1:]:
        s = s.fuse(o)
    return s.removeSplitter()


def r_in():
    return P["prop_d"] / 2.0 + P["tip_gap"]


def duct_top():
    return P["duct_bottom_z"] + P["duct_h"]


def duct_solid(x, y):
    lip = P["duct_lip_r"]
    z0 = P["duct_bottom_z"]
    wall = cyl(r_in() + P["duct_wall"], P["duct_h"] - lip, x, y, z0)
    band = cyl(r_in() + lip, lip, x, y, duct_top() - lip)
    return wall.fuse(band)


def duct_air(x, y):
    lip = P["duct_lip_r"]
    z0 = P["duct_bottom_z"]
    air = cyl(r_in(), P["duct_h"] + 2, x, y, z0 - 1)
    slab = cyl(r_in() + lip, lip + 1, x, y, duct_top() - lip)
    torus = Part.makeTorus(r_in() + lip, lip, V(x, y, duct_top() - lip))
    return air.fuse(slab.cut(torus))


def arm_shape(a, clear=0.0):
    """Carbon arm from the centre to just past the motor."""
    w = P["arm_w"] + 2 * clear
    return radial_box(0.0, P["motor_r"] + 20.0, w,
                      -P["arm_t"] - clear, P["arm_t"] + 2 * clear, a)


def clamp(a):
    """Saddle around the arm where it passes through the inner duct wall."""
    x, y = polar(P["motor_r"], a)
    r_cross = P["motor_r"] - r_in()          # where the arm meets the duct wall
    L = P["clamp_len"]
    cw = P["clamp_wall"]
    w = P["arm_w"] + 2 * (cw + P["arm_slot_clear"])
    h = P["arm_t"] + 2 * (cw + P["arm_slot_clear"])
    c = radial_box(r_cross - L / 2.0, r_cross + L / 2.0, w,
                   -P["arm_t"] - cw - P["arm_slot_clear"], h, a)
    # zip-tie slot through the clamp, across the arm
    zw, zh = P["zip_slot"]
    slot = radial_box(r_cross - zw / 2.0, r_cross + zw / 2.0, w + 2,
                      -P["arm_t"] - P["arm_slot_clear"] - zh - 0.5, h + 4, a)
    slot = slot.cut(arm_shape(a, P["arm_slot_clear"] + zh))
    return c.cut(slot)


def build_shroud():
    ring_r_in = P["motor_r"] + r_in() + P["duct_lip_r"] + P["ring_gap"]
    ring_r_out = ring_r_in + P["ring_wall"]
    shapes = [cyl(ring_r_out, P["ring_h"], z=P["ring_z"]).cut(
        cyl(ring_r_in, P["ring_h"] + 2, z=P["ring_z"] - 1))]
    for a in P["motor_angles"]:
        x, y = polar(P["motor_r"], a)
        shapes.append(duct_solid(x, y))
        shapes.append(clamp(a))
        # web from duct to ring, on the arm line
        shapes.append(radial_box(P["motor_r"] + r_in(), ring_r_in + 0.5,
                                 P["web_w"], P["ring_z"], P["ring_h"], a))
    # bridges tying each pair of neighbouring ducts together (air cut trims them)
    angles = P["motor_angles"]
    for i, a1 in enumerate(angles):
        a2 = angles[(i + 1) % len(angles)]
        x1, y1 = polar(P["motor_r"], a1)
        x2, y2 = polar(P["motor_r"], a2)
        length = math.hypot(x2 - x1, y2 - y1)
        br = Part.makeBox(length, P["web_w"], P["ring_h"],
                          V(0, -P["web_w"] / 2.0, P["ring_z"]))
        br.rotate(V(0, 0, 0), V(0, 0, 1),
                  math.degrees(math.atan2(y2 - y1, x2 - x1)))
        br.translate(V(x1, y1, 0))
        shapes.append(br)
    s = fuse_all(shapes)
    for a in P["motor_angles"]:
        x, y = polar(P["motor_r"], a)
        s = s.cut(duct_air(x, y))
        s = s.cut(arm_shape(a, P["arm_slot_clear"]))
    return s.removeSplitter()


def stadium(length, width, h, z):
    """Rounded slot along X: two half-circles joined by a box."""
    r = width / 2.0
    d = length / 2.0 - r
    box = Part.makeBox(2 * d, width, h, V(-d, -r, z))
    return box.fuse(cyl(r, h, d, 0, z)).fuse(cyl(r, h, -d, 0, z))


def sector(r, z0, h, a0, span):
    c = Part.makeCylinder(r, h, V(0, 0, z0), V(0, 0, 1), span)
    c.rotate(V(0, 0, 0), V(0, 0, 1), a0)
    return c


def split_for_printing(shroud):
    """The shroud is far bigger than a print bed: cut it into 4 duct modules
    (split through the duct-to-duct bridges) and ring segments (joints offset
    from the webs). Glue the joints with CA or epoxy."""
    ring_r_in = P["motor_r"] + r_in() + P["duct_lip_r"] + P["ring_gap"]
    big = ring_r_in + P["ring_wall"] + 10.0
    z0, h = P["duct_bottom_z"] - 5.0, P["duct_h"] + 30.0
    annulus = cyl(big, h, z=z0).cut(cyl(ring_r_in - 0.01, h + 2, z=z0 - 1))
    ring = shroud.common(annulus)
    body = shroud.cut(annulus)
    pieces = {}
    for i, a in enumerate(P["motor_angles"]):
        pieces["Duct%d" % (i + 1)] = body.common(
            sector(big, z0, h, a - 45.0, 90.0)).removeSplitter()
    n = P["ring_segments"]
    for k in range(n):
        a0 = P["motor_angles"][0] - 180.0 / n + k * 360.0 / n
        pieces["Ring%d" % (k + 1)] = ring.common(
            sector(big, z0, h, a0, 360.0 / n)).removeSplitter()
    return pieces


def build_canopy():
    t = P["canopy_wall"]
    h = P["canopy_h"]
    r = P["canopy_len"] / 2.0
    z0 = 2.0
    outer = stadium(P["canopy_len"], P["canopy_w"], h, z0)
    inner = stadium(P["canopy_len"] - 2 * t, P["canopy_w"] - 2 * t, h - t, z0 - 0.01)
    c = outer.cut(inner)
    # GPS pad on top
    c = c.fuse(cyl(P["gps_boss_d"] / 2.0, 2.0, z=z0 + h))
    # front camera window and rear vents
    c = c.cut(radial_box(r - 5, r + 5, 24.0, z0 + 8, 22.0, 0.0))
    for a in (150.0, 180.0, 210.0):
        c = c.cut(radial_box(r - 5, r + 5, 8.0, z0 + 10, 25.0, a))
    # battery strap slots
    for sy in (-20.0, 20.0):
        c = c.cut(Part.makeBox(4.0, 22.0, 10, V(-2.0, sy - 11.0, z0 + h - 5)))
    return c.removeSplitter()


def build_visuals():
    arms = fuse_all([arm_shape(a) for a in P["motor_angles"]])
    bl, bw, bh = P["body"]
    body = Part.makeBox(bl, bw, bh, V(-bl / 2.0, -bw / 2.0, 0))
    motors, props = [], []
    for a in P["motor_angles"]:
        x, y = polar(P["motor_r"], a)
        motors.append(cyl(P["motor_d"] / 2.0, P["motor_h"], x, y, 0))
        props.append(cyl(P["prop_d"] / 2.0, 2.0, x, y, P["prop_z"]))
    L, W, H = P["battery"]
    bat = Part.makeBox(L, W, H, V(-L / 2.0, -W / 2.0, 2.0 + P["canopy_h"] + 2.0))
    return arms.fuse(body), fuse_all(motors), fuse_all(props), bat


def main():
    if DOC_NAME in App.listDocuments():
        App.closeDocument(DOC_NAME)
    doc = App.newDocument(DOC_NAME)
    shroud = build_shroud()
    canopy = build_canopy()
    core, motors, props, bat = build_visuals()
    objs = {}
    for name, shape in (("Shroud", shroud), ("Canopy", canopy),
                        ("Chimera7Core", core), ("Motors", motors),
                        ("Props", props), ("Battery", bat)):
        o = doc.addObject("Part::Feature", name)
        o.Shape = shape
        objs[name] = o
    doc.recompute()
    if App.GuiUp:
        import FreeCADGui as Gui
        colours = {"Shroud": (0.85, 0.85, 0.88), "Canopy": (0.2, 0.6, 0.9),
                   "Chimera7Core": (0.15, 0.15, 0.15), "Motors": (0.4, 0.4, 0.4),
                   "Props": (0.9, 0.15, 0.15), "Battery": (0.95, 0.75, 0.1)}
        for n, col in colours.items():
            objs[n].ViewObject.ShapeColor = col
        objs["Props"].ViewObject.Transparency = 60
        Gui.activeDocument().activeView().viewIsometric()
        Gui.SendMsgToActiveView("ViewFit")
    os.makedirs(OUT_DIR, exist_ok=True)
    doc.saveAs(os.path.join(OUT_DIR, DOC_NAME + ".FCStd"))
    import Mesh
    for n, o in objs.items():
        o.Shape.exportStep(os.path.join(OUT_DIR, DOC_NAME + "_" + n + ".step"))
    Mesh.Mesh(canopy.tessellate(0.1)).write(
        os.path.join(OUT_DIR, DOC_NAME + "_Canopy.stl"))
    # printable pieces: one STL each, laid out in their flight position
    pieces = split_for_printing(shroud)
    grp = doc.addObject("App::DocumentObjectGroup", "PrintPieces")
    for n, shp in pieces.items():
        o = doc.addObject("Part::Feature", n)
        o.Shape = shp
        grp.addObject(o)
        if App.GuiUp:
            o.ViewObject.Visibility = False
        Mesh.Mesh(shp.tessellate(0.1)).write(
            os.path.join(OUT_DIR, DOC_NAME + "_" + n + ".stl"))
    doc.recompute()
    doc.save()
    ring_od = 2 * (P["motor_r"] + r_in() + P["duct_lip_r"] + P["ring_gap"]
                   + P["ring_wall"])
    App.Console.PrintMessage(
        "Orbit 7 built: %.0f mm across, shroud %.0f cm3 (about %.0f g in LW-PLA, "
        "%.0f g in PETG). Files in %s\n"
        % (ring_od, shroud.Volume / 1000.0, shroud.Volume / 1000.0 * 0.6,
           shroud.Volume / 1000.0 * 1.27, OUT_DIR))
    return doc


main()
