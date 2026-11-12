# -*- coding: utf-8 -*-
"""
Orbit Pod - owen's sketched body, parametric, for FreeCAD.

From owen's pencil sketch: a smooth capsule body runs front to back down the
middle, four round duct pods hug its sides in an X, a camera eye sits on the
nose between the front ducts, and a hexagonal hatch sits on top.

The running gear is Orbit 30's: four 6 in props in ducts, 2306/2207 motors and
a 4S2P 21700 Li-ion pack, which rides inside the capsule.

How to run
  GUI:      Macro > Macros... > Create, paste this file, Execute.
  Headless: freecadcmd orbit_pod.py

All lengths mm, angles degrees. Origin = frame centre, z = 0 is the underside
of the capsule and the ducts; +X is the front (the camera eye).

Outputs (in OUT_DIR): OrbitPod.FCStd, a STEP per part, STL of printable parts.
"""

import math
import os

import FreeCAD as App
import Part

V = App.Vector

P = {
    # capsule body (an ellipsoid with a flat floor)
    "body_len": 300.0,        # along X
    "body_w": 120.0,          # along Y
    "body_h": 90.0,           # full ellipsoid height; the floor cuts the bottom off
    "body_cz": 30.0,          # ellipsoid centre height
    "body_wall": 2.0,
    "floor_t": 2.0,
    # ducts (Orbit 30 sizes)
    "prop_d": 152.0,          # 6 in
    "tip_gap": 2.0,
    "duct_wall": 1.6,
    "duct_h": 45.0,
    "duct_lip_r": 6.0,
    "duct_x": 118.0,          # duct centres at (+-duct_x, +-duct_y)
    "duct_y": 138.0,          # body_w / 2 + duct inner radius, so the duct wall merges with the body
    "bridge_w": 24.0,         # shoulder joining each duct to the body
    "bridge_h": 10.0,
    "rail_w": 6.0,            # rail tying the front and rear duct on each side
    "rail_h": 10.0,
    # motor mount inside each duct
    "mount_top_z": 10.0,
    "mount_boss_d": 34.0,
    "mount_boss_t": 4.0,
    "mount_center_hole_d": 7.0,
    "mount_hole_spacing": 16.0,
    "mount_hole_d": 3.2,      # M3, 2306 class motors
    "strut_w": 4.0,
    "strut_h": 10.0,
    # nose camera eye
    "eye_d": 22.0,
    "eye_z": 34.0,
    "eye_bezel_d": 34.0,
    "eye_bezel_t": 4.0,
    # hexagonal top hatch (the cut-out piece of the shell becomes the lid)
    "hatch_r": 40.0,          # hexagon corner radius
    "hatch_clear": 0.4,
    "hatch_z": 58.0,          # hatch opening starts at this height
    # inner tray above the battery
    "tray": (140.0, 80.0, 2.0),
    "tray_z": 50.0,
    "post_d": 6.0,
    "post_xy": (52.0, 30.0),
    "fc_stack_spacing": 30.5,
    "fc_stack_x": 30.0,
    "standoff_d": 5.0,
    "standoff_h": 6.0,
    "standoff_hole_d": 2.6,
    # landing feet under the body
    "foot_d": 12.0,
    "foot_h": 15.0,
    "foot_xy": (70.0, 26.0),   # must sit inside the flat floor
    # visual-only parts
    "motor_d": 29.0,
    "motor_h": 20.0,
    "prop_t": 2.0,
    "battery": (84.0, 70.0, 44.0),  # 4S2P 21700, cells lying flat
    "battery_z": 4.0,
}

DOC_NAME = "OrbitPod"
OUT_DIR = os.path.join(os.path.expanduser("~"), "Documents", "OrbitDrone")


def cyl(r, h, x=0.0, y=0.0, z=0.0, d=None):
    return Part.makeCylinder(r, h, V(x, y, z), d or V(0, 0, 1))


def fuse_all(shapes):
    s = shapes[0]
    for other in shapes[1:]:
        s = s.fuse(other)
    return s.removeSplitter()


def ellipsoid(a, b, c, cz):
    m = App.Matrix()
    m.scale(a, b, c)
    e = Part.makeSphere(1.0).transformGeometry(m)
    e.translate(V(0, 0, cz))
    return e


def hexagon(r, z0, h):
    pts = [V(r * math.cos(math.radians(30 + 60 * i)),
             r * math.sin(math.radians(30 + 60 * i)), z0) for i in range(6)]
    face = Part.Face(Part.makePolygon(pts + [pts[0]]))
    return face.extrude(V(0, 0, h))


def duct_centres():
    dx, dy = P["duct_x"], P["duct_y"]
    return [(dx, dy), (-dx, dy), (-dx, -dy), (dx, -dy)]


def r_in():
    return P["prop_d"] / 2.0 + P["tip_gap"]


def duct_solid(x, y):
    lip, h = P["duct_lip_r"], P["duct_h"]
    wall = cyl(r_in() + P["duct_wall"], h - lip, x, y, 0)
    return wall.fuse(cyl(r_in() + lip, lip, x, y, h - lip))


def duct_air(x, y):
    lip, h = P["duct_lip_r"], P["duct_h"]
    air = cyl(r_in(), h + 2, x, y, -1)
    slab = cyl(r_in() + lip, lip + 1, x, y, h - lip)
    torus = Part.makeTorus(r_in() + lip, lip, V(x, y, h - lip))
    return air.fuse(slab.cut(torus))


def strut(x, y, angle_deg):
    """Strut from the motor boss out to the duct wall."""
    boss_r = P["mount_boss_d"] / 2.0
    top = P["mount_top_z"]
    b = Part.makeBox(r_in() + 0.5 - (boss_r - 1.0), P["strut_w"], P["strut_h"],
                     V(boss_r - 1.0, -P["strut_w"] / 2.0, top - P["strut_h"]))
    b.rotate(V(0, 0, 0), V(0, 0, 1), angle_deg)
    b.translate(V(x, y, 0))
    return b


def motor_mount(x, y):
    top = P["mount_top_z"]
    boss = cyl(P["mount_boss_d"] / 2.0, P["mount_boss_t"], x, y, top - P["mount_boss_t"])
    inward = math.degrees(math.atan2(-y, 0.0))   # straight at the body, the wire route
    parts = [boss] + [strut(x, y, inward + k) for k in (0.0, 120.0, -120.0)]
    m = fuse_all(parts)
    m = m.cut(cyl(P["mount_center_hole_d"] / 2.0, 20, x, y, top - 10))
    half = P["mount_hole_spacing"] / 2.0
    for dx, dy in ((half, half), (half, -half), (-half, half), (-half, -half)):
        m = m.cut(cyl(P["mount_hole_d"] / 2.0, 20, x + dx, y + dy, top - 10))
    return m


def hatch_cutter(extra=0.0):
    return hexagon(P["hatch_r"] + extra, P["hatch_z"], P["body_cz"] + P["body_h"])


def body_shell():
    a, b, c = P["body_len"] / 2.0, P["body_w"] / 2.0, P["body_h"] / 2.0
    w, cz = P["body_wall"], P["body_cz"]
    outer = ellipsoid(a, b, c, cz)
    inner = ellipsoid(a - w, b - w, c - w, cz)
    below = Part.makeBox(4 * a, 4 * b, 2 * c, V(-2 * a, -2 * b, -2 * c))
    shell = outer.cut(inner).cut(below)
    floor = outer.common(Part.makeBox(4 * a, 4 * b, P["floor_t"], V(-2 * a, -2 * b, 0)))
    return outer, shell.fuse(floor)


def build_frame():
    outer, shell = body_shell()
    shapes = [shell]
    for x, y in duct_centres():
        shapes.append(duct_solid(x, y))
        sy = 1.0 if y > 0 else -1.0
        # shoulder from well inside the body out to the duct centre (the body
        # is narrow near the floor, so it has to reach in to join)
        y0 = sy * 20.0
        shapes.append(Part.makeBox(P["bridge_w"], abs(y - y0), P["bridge_h"],
                                   V(x - P["bridge_w"] / 2.0, min(y, y0), 0)))
    for sy in (1.0, -1.0):
        y = sy * P["duct_y"]
        shapes.append(Part.makeBox(2 * P["duct_x"], P["rail_w"], P["rail_h"],
                                   V(-P["duct_x"], y - P["rail_w"] / 2.0, 0)))
    fx, fy = P["foot_xy"]
    for sx in (1, -1):
        for sy in (1, -1):
            shapes.append(cyl(P["foot_d"] / 2.0, P["foot_h"] + 1.0, sx * fx, sy * fy, -P["foot_h"]))
    # posts that carry the tray
    px, py = P["post_xy"]
    for sx in (1, -1):
        for sy in (1, -1):
            shapes.append(cyl(P["post_d"] / 2.0, P["tray_z"] - P["floor_t"],
                              sx * px, sy * py, P["floor_t"] - 0.01))
    # camera bezel on the nose
    a = P["body_len"] / 2.0
    shapes.append(cyl(P["eye_bezel_d"] / 2.0, P["eye_bezel_t"] + 6.0,
                      a - 6.0, 0, P["eye_z"], V(1, 0, 0)))
    frame = fuse_all(shapes)

    for x, y in duct_centres():
        frame = frame.cut(duct_air(x, y))
    frame = fuse_all([frame] + [motor_mount(x, y) for x, y in duct_centres()])

    # camera eye through the nose, hatch opening on top
    frame = frame.cut(cyl(P["eye_d"] / 2.0, 30.0, a - 20.0, 0, P["eye_z"], V(1, 0, 0)))
    frame = frame.cut(hatch_cutter(P["hatch_clear"]))
    return frame.removeSplitter(), outer


def build_hatch(outer):
    """The hexagon of shell that was cut out, plus a lip that keys it in place."""
    a, b, c = P["body_len"] / 2.0, P["body_w"] / 2.0, P["body_h"] / 2.0
    w, cz = P["body_wall"], P["body_cz"]
    skin = outer.cut(ellipsoid(a - w, b - w, c - w, cz)).common(hatch_cutter())
    lip = hexagon(P["hatch_r"] - 0.2, P["hatch_z"] + 6.0, 4.0).cut(
        hexagon(P["hatch_r"] - 3.0, P["hatch_z"], 20.0))
    lip = lip.common(ellipsoid(a - w - 0.3, b - w - 0.3, c - w - 0.3, cz))
    return skin.fuse(lip).removeSplitter()


def build_tray():
    L, W, T = P["tray"]
    z = P["tray_z"]
    tray = Part.makeBox(L, W, T, V(-L / 2.0, -W / 2.0, z))
    half = P["fc_stack_spacing"] / 2.0
    fcx = P["fc_stack_x"]
    parts = [tray]
    for dx, dy in ((half, half), (half, -half), (-half, half), (-half, -half)):
        parts.append(cyl(P["standoff_d"] / 2.0, P["standoff_h"], fcx + dx, dy, z + T - 0.01))
    t = fuse_all(parts)
    for dx, dy in ((half, half), (half, -half), (-half, half), (-half, -half)):
        t = t.cut(cyl(P["standoff_hole_d"] / 2.0, 20, fcx + dx, dy, z - 1))
    # wire hole down to the battery
    t = t.cut(Part.makeBox(30, 16, 10, V(-55, -8, z - 2)))
    return t


def build_visuals():
    motors, props = [], []
    for x, y in duct_centres():
        motors.append(cyl(P["motor_d"] / 2.0, P["motor_h"], x, y, P["mount_top_z"]))
        props.append(cyl(P["prop_d"] / 2.0, P["prop_t"], x, y,
                         P["mount_top_z"] + P["motor_h"] + 1.0))
    L, W, H = P["battery"]
    bat = Part.makeBox(L, W, H, V(-L / 2.0, -W / 2.0, P["battery_z"]))
    return fuse_all(motors), fuse_all(props), bat


def check(objs):
    """Every part one valid solid, and no part overlaps the frame or another part."""
    problems = []
    for n, s in objs.items():
        if not s.isValid():
            problems.append(n + " is not a valid shape")
    names = list(objs)
    for i, n1 in enumerate(names):
        for n2 in names[i + 1:]:
            v = objs[n1].common(objs[n2]).Volume
            if v > 1.0:
                problems.append("%s overlaps %s by %.1f mm3" % (n1, n2, v))
    return problems


def main():
    if DOC_NAME in App.listDocuments():
        App.closeDocument(DOC_NAME)
    doc = App.newDocument(DOC_NAME)

    frame, outer = build_frame()
    hatch = build_hatch(outer)
    tray = build_tray()
    motors, props, bat = build_visuals()
    shapes = {"Frame": frame, "Hatch": hatch, "Tray": tray,
              "Motors": motors, "Props": props, "Battery": bat}

    objs = {}
    for name, shape in shapes.items():
        o = doc.addObject("Part::Feature", name)
        o.Shape = shape
        objs[name] = o
    doc.recompute()

    if App.GuiUp:
        import FreeCADGui as Gui
        colours = {"Frame": (0.92, 0.92, 0.94), "Hatch": (0.2, 0.22, 0.26),
                   "Tray": (0.35, 0.38, 0.43), "Motors": (0.15, 0.15, 0.15),
                   "Props": (0.6, 0.75, 1.0), "Battery": (0.5, 0.55, 0.6)}
        for name, col in colours.items():
            objs[name].ViewObject.ShapeColor = col
        objs["Props"].ViewObject.Transparency = 70
        Gui.activeDocument().activeView().viewIsometric()
        Gui.SendMsgToActiveView("ViewFit")

    os.makedirs(OUT_DIR, exist_ok=True)
    doc.saveAs(os.path.join(OUT_DIR, DOC_NAME + ".FCStd"))
    import Mesh
    for name, o in objs.items():
        o.Shape.exportStep(os.path.join(OUT_DIR, DOC_NAME + "_" + name + ".step"))
    for name in ("Frame", "Hatch", "Tray"):
        Mesh.Mesh(objs[name].Shape.tessellate(0.1)).write(
            os.path.join(OUT_DIR, DOC_NAME + "_" + name + ".stl"))

    bb = frame.BoundBox
    problems = check(shapes)
    App.Console.PrintMessage(
        "Orbit Pod built: %.0f x %.0f x %.0f mm, frame %.0f cm3 (about %.0f g in LW-PLA, "
        "%.0f g in PETG), %d solid(s). Checks: %s. Files in %s\n"
        % (bb.XLength, bb.YLength, bb.ZLength, frame.Volume / 1000.0,
           frame.Volume / 1000.0 * 0.6, frame.Volume / 1000.0 * 1.27,
           len(frame.Solids), "; ".join(problems) or "all passed", OUT_DIR))
    return doc


main()
