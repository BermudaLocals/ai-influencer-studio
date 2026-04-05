"""
AI Influencer Studio - Parametric Human Body Generator
Generates anatomically detailed human meshes from parameters
Pure Python - No external 3D tools required
"""
import numpy as np
import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
import sys
sys.path.insert(0, "/root/ai_influencer_studio")
from core.mesh import Mesh, Vector3, Vector2, MeshPrimitives, Vertex, Face, Bone

@dataclass
class BodyParameters:
    """Complete body customization parameters"""
    # Basic info
    gender: str = "female"  # female, male
    height: float = 1.7  # meters

    # Body proportions (0.0 to 1.0 scale, 0.5 = average)
    weight: float = 0.5  # thin to heavy
    muscle_mass: float = 0.5  # low to high
    body_fat: float = 0.5  # low to high

    # Torso
    shoulder_width: float = 0.5
    chest_size: float = 0.5
    waist_size: float = 0.5
    hip_width: float = 0.5
    torso_length: float = 0.5

    # Breasts (female) / Pecs (male)
    breast_size: float = 0.5  # A to DD+
    breast_perkiness: float = 0.5
    breast_spacing: float = 0.5
    nipple_size: float = 0.5
    areola_size: float = 0.5

    # Buttocks
    butt_size: float = 0.5
    butt_roundness: float = 0.5
    butt_perkiness: float = 0.5

    # Arms
    arm_length: float = 0.5
    arm_thickness: float = 0.5
    bicep_size: float = 0.5
    forearm_size: float = 0.5

    # Legs
    leg_length: float = 0.5
    thigh_size: float = 0.5
    calf_size: float = 0.5
    thigh_gap: float = 0.5

    # Genitalia
    genital_size: float = 0.5
    genital_detail: float = 0.5

    # Face
    face_shape: float = 0.5  # round to angular
    jaw_width: float = 0.5
    cheekbone_height: float = 0.5
    nose_size: float = 0.5
    lip_fullness: float = 0.5
    eye_size: float = 0.5
    eye_spacing: float = 0.5

    # Skin
    skin_tone: Tuple[float, float, float] = (0.9, 0.75, 0.65)  # RGB
    skin_smoothness: float = 0.8

    # Age appearance
    age: float = 25.0


class HumanBodyGenerator:
    """Generates complete human body meshes from parameters"""

    def __init__(self, params: BodyParameters = None):
        self.params = params or BodyParameters()
        self.mesh = Mesh("human_body")
        self.bones: List[Bone] = []

    def _lerp(self, a: float, b: float, t: float) -> float:
        """Linear interpolation"""
        return a + (b - a) * t

    def _map_param(self, value: float, min_val: float, max_val: float) -> float:
        """Map 0-1 parameter to actual value range"""
        return self._lerp(min_val, max_val, value)

    def _create_ring(self, center: Vector3, radius_x: float, radius_z: float, 
                     segments: int, y_offset: float = 0, tilt: float = 0) -> List[int]:
        """Create a ring of vertices and return indices"""
        indices = []
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            x = center.x + radius_x * math.cos(angle)
            z = center.z + radius_z * math.sin(angle)
            y = center.y + y_offset + tilt * math.cos(angle)

            idx = self.mesh.add_vertex(
                Vector3(x, y, z),
                Vector3(math.cos(angle), 0, math.sin(angle)),
                Vector2(i / segments, 0)
            )
            indices.append(idx)
        return indices

    def _connect_rings(self, ring1: List[int], ring2: List[int], material_id: int = 0):
        """Connect two rings with faces"""
        n = len(ring1)
        for i in range(n):
            next_i = (i + 1) % n
            self.mesh.add_quad(ring1[i], ring1[next_i], ring2[next_i], ring2[i], material_id)

    def _create_sphere_section(self, center: Vector3, radius: float, 
                               segments: int, rings: int, 
                               start_angle: float = 0, end_angle: float = math.pi) -> List[List[int]]:
        """Create a section of a sphere"""
        all_rings = []
        for i in range(rings + 1):
            phi = start_angle + (end_angle - start_angle) * i / rings
            ring_radius = radius * math.sin(phi)
            y_offset = radius * math.cos(phi)

            ring = self._create_ring(
                Vector3(center.x, center.y + y_offset, center.z),
                ring_radius, ring_radius, segments
            )
            all_rings.append(ring)

        # Connect rings
        for i in range(len(all_rings) - 1):
            self._connect_rings(all_rings[i], all_rings[i + 1])

        return all_rings

    def _generate_torso(self) -> Dict[str, List[int]]:
        """Generate torso mesh"""
        p = self.params
        segments = 24

        # Calculate dimensions based on parameters
        base_height = self._map_param(p.height, 1.5, 2.0)
        torso_height = base_height * 0.3 * self._map_param(p.torso_length, 0.9, 1.1)

        shoulder_w = self._map_param(p.shoulder_width, 0.35, 0.55) if p.gender == "male" else self._map_param(p.shoulder_width, 0.30, 0.45)
        chest_depth = self._map_param(p.chest_size, 0.15, 0.25)
        waist_w = self._map_param(p.waist_size, 0.20, 0.40)
        waist_d = self._map_param(p.waist_size, 0.12, 0.22)
        hip_w = self._map_param(p.hip_width, 0.30, 0.50) if p.gender == "female" else self._map_param(p.hip_width, 0.28, 0.42)
        hip_d = self._map_param(p.hip_width, 0.15, 0.25)

        # Weight/fat adjustments
        fat_mult = self._map_param(p.body_fat, 0.9, 1.3)
        waist_w *= fat_mult
        waist_d *= fat_mult

        rings = {}
        y_base = base_height * 0.5  # Start from middle of body

        # Create torso rings from bottom to top
        ring_data = [
            ("pelvis", 0.0, hip_w, hip_d),
            ("lower_hip", 0.08, hip_w * 0.98, hip_d * 0.95),
            ("upper_hip", 0.15, hip_w * 0.90, hip_d * 0.85),
            ("waist_low", 0.25, waist_w * 1.05, waist_d * 1.05),
            ("waist", 0.35, waist_w, waist_d),
            ("waist_high", 0.45, waist_w * 1.1, waist_d * 1.1),
            ("ribcage_low", 0.55, waist_w * 1.2, chest_depth * 0.9),
            ("ribcage", 0.65, shoulder_w * 0.85, chest_depth),
            ("chest_low", 0.75, shoulder_w * 0.95, chest_depth * 1.05),
            ("chest", 0.85, shoulder_w, chest_depth * 1.1),
            ("shoulder_base", 0.95, shoulder_w * 0.98, chest_depth * 0.95),
            ("neck_base", 1.0, shoulder_w * 0.25, chest_depth * 0.3),
        ]

        prev_ring = None
        for name, height_pct, width, depth in ring_data:
            y = y_base - torso_height/2 + torso_height * height_pct
            ring = self._create_ring(Vector3(0, y, 0), width, depth, segments)
            rings[name] = ring

            if prev_ring is not None:
                self._connect_rings(prev_ring, ring)
            prev_ring = ring

        return rings

    def _generate_breasts(self, torso_rings: Dict[str, List[int]]):
        """Generate breasts for female or pecs for male"""
        p = self.params

        if p.gender == "female":
            # Female breasts
            size = self._map_param(p.breast_size, 0.06, 0.18)
            perkiness = self._map_param(p.breast_perkiness, -0.03, 0.05)
            spacing = self._map_param(p.breast_spacing, 0.08, 0.15)

            for side in [-1, 1]:
                # Breast center position
                center_x = side * spacing
                center_y = self.params.height * 0.65
                center_z = self._map_param(p.chest_size, 0.12, 0.20) + size * 0.5

                # Create breast as deformed sphere
                breast_mesh = Mesh("breast")
                segments = 16
                rings = 12

                for i in range(rings + 1):
                    phi = math.pi * i / rings * 0.6  # Only front half
                    for j in range(segments):
                        theta = 2 * math.pi * j / segments

                        # Base sphere
                        r = size
                        # Teardrop deformation
                        r *= 1.0 + 0.3 * math.sin(phi) * (1 - abs(math.cos(theta)))
                        # Perkiness (lift)
                        y_mod = perkiness * (1 - i / rings)

                        x = center_x + r * math.sin(phi) * math.cos(theta) * 0.9
                        y = center_y + r * math.cos(phi) + y_mod
                        z = center_z + r * math.sin(phi) * math.sin(theta)

                        breast_mesh.add_vertex(
                            Vector3(x, y, z),
                            Vector3(math.sin(phi) * math.cos(theta), 
                                   math.cos(phi), 
                                   math.sin(phi) * math.sin(theta)),
                            Vector2(j / segments, i / rings)
                        )

                # Connect breast rings
                for i in range(rings):
                    for j in range(segments):
                        next_j = (j + 1) % segments
                        v1 = i * segments + j
                        v2 = i * segments + next_j
                        v3 = (i + 1) * segments + next_j
                        v4 = (i + 1) * segments + j
                        breast_mesh.add_quad(v1, v2, v3, v4)

                # Add nipple
                nipple_size = self._map_param(p.nipple_size, 0.008, 0.02)
                nipple_z = center_z + size * 0.9
                nipple = MeshPrimitives.create_sphere(nipple_size, 8, 6)
                nipple.translate(Vector3(center_x, center_y, nipple_z))
                breast_mesh.merge(nipple)

                self.mesh.merge(breast_mesh)
        else:
            # Male pecs
            pec_size = self._map_param(p.muscle_mass, 0.02, 0.06)
            for side in [-1, 1]:
                center_x = side * 0.1
                center_y = self.params.height * 0.68
                center_z = self._map_param(p.chest_size, 0.12, 0.18)

                pec = MeshPrimitives.create_sphere(pec_size, 12, 8)
                pec.scale(Vector3(1.5, 0.8, 0.6))
                pec.translate(Vector3(center_x, center_y, center_z))
                self.mesh.merge(pec)

    def _generate_buttocks(self, torso_rings: Dict[str, List[int]]):
        """Generate buttocks"""
        p = self.params

        size = self._map_param(p.butt_size, 0.08, 0.18)
        roundness = self._map_param(p.butt_roundness, 0.8, 1.2)
        perkiness = self._map_param(p.butt_perkiness, -0.02, 0.04)

        for side in [-1, 1]:
            center_x = side * self._map_param(p.hip_width, 0.10, 0.18)
            center_y = self.params.height * 0.48 + perkiness
            center_z = -self._map_param(p.hip_width, 0.10, 0.15)

            butt_cheek = MeshPrimitives.create_sphere(size, 16, 12)
            butt_cheek.scale(Vector3(roundness, 1.1, 0.9))
            butt_cheek.translate(Vector3(center_x, center_y, center_z))
            self.mesh.merge(butt_cheek)

    def _generate_genitalia(self):
        """Generate genitalia based on gender"""
        p = self.params

        if p.gender == "female":
            # Female genitalia
            detail = self._map_param(p.genital_detail, 0.5, 1.0)

            # Vulva base
            center_y = self.params.height * 0.45
            center_z = self._map_param(p.hip_width, 0.02, 0.05)

            # Outer labia
            for side in [-1, 1]:
                labia_outer = MeshPrimitives.create_capsule(0.015 * detail, 0.08, 8, 6)
                labia_outer.scale(Vector3(0.6, 1.0, 0.8))
                labia_outer.translate(Vector3(side * 0.02, center_y, center_z))
                self.mesh.merge(labia_outer)

            # Inner labia (if detail is high)
            if detail > 0.7:
                for side in [-1, 1]:
                    labia_inner = MeshPrimitives.create_capsule(0.008, 0.05, 6, 4)
                    labia_inner.scale(Vector3(0.4, 1.0, 0.6))
                    labia_inner.translate(Vector3(side * 0.012, center_y, center_z + 0.01))
                    self.mesh.merge(labia_inner)

            # Clitoris hood
            clit = MeshPrimitives.create_sphere(0.006 * detail, 6, 4)
            clit.translate(Vector3(0, center_y + 0.035, center_z + 0.015))
            self.mesh.merge(clit)

        else:
            # Male genitalia
            size = self._map_param(p.genital_size, 0.08, 0.18)
            detail = self._map_param(p.genital_detail, 0.5, 1.0)

            center_y = self.params.height * 0.45
            center_z = self._map_param(p.hip_width, 0.05, 0.10)

            # Penis shaft
            shaft_length = size
            shaft_radius = size * 0.15
            shaft = MeshPrimitives.create_cylinder(shaft_radius, shaft_length, 16)
            # Rotate to hang down
            shaft.translate(Vector3(0, center_y - shaft_length * 0.3, center_z))
            self.mesh.merge(shaft)

            # Glans
            glans = MeshPrimitives.create_sphere(shaft_radius * 1.2, 12, 8)
            glans.scale(Vector3(1.0, 0.8, 1.0))
            glans.translate(Vector3(0, center_y - shaft_length * 0.8, center_z))
            self.mesh.merge(glans)

            # Testicles
            for side in [-1, 1]:
                testicle = MeshPrimitives.create_sphere(size * 0.2, 10, 8)
                testicle.scale(Vector3(0.9, 1.1, 0.9))
                testicle.translate(Vector3(side * size * 0.15, center_y - size * 0.5, center_z - 0.02))
                self.mesh.merge(testicle)

    def _generate_arms(self, torso_rings: Dict[str, List[int]]) -> Dict[str, List[int]]:
        """Generate arms"""
        p = self.params
        segments = 12

        arm_length = self._map_param(p.arm_length, 0.55, 0.75) * p.height
        upper_arm_len = arm_length * 0.45
        forearm_len = arm_length * 0.40
        hand_len = arm_length * 0.15

        bicep_r = self._map_param(p.bicep_size, 0.035, 0.07)
        forearm_r = self._map_param(p.forearm_size, 0.025, 0.05)
        wrist_r = forearm_r * 0.7

        arm_rings = {}

        for side in [-1, 1]:
            side_name = "left" if side == -1 else "right"
            shoulder_x = side * self._map_param(p.shoulder_width, 0.30, 0.50)
            shoulder_y = p.height * 0.78

            # Upper arm
            rings = []
            for i in range(6):
                t = i / 5
                y = shoulder_y - upper_arm_len * t
                r = self._lerp(bicep_r * 0.9, bicep_r, 0.5 - abs(t - 0.5))
                ring = self._create_ring(Vector3(shoulder_x, y, 0), r, r, segments)
                rings.append(ring)

            for i in range(len(rings) - 1):
                self._connect_rings(rings[i], rings[i + 1])

            arm_rings[f"{side_name}_upper"] = rings

            # Forearm
            elbow_y = shoulder_y - upper_arm_len
            rings = []
            for i in range(5):
                t = i / 4
                y = elbow_y - forearm_len * t
                r = self._lerp(forearm_r, wrist_r, t)
                ring = self._create_ring(Vector3(shoulder_x, y, 0), r, r, segments)
                rings.append(ring)

            for i in range(len(rings) - 1):
                self._connect_rings(rings[i], rings[i + 1])

            arm_rings[f"{side_name}_forearm"] = rings

            # Hand (simplified)
            wrist_y = elbow_y - forearm_len
            hand = MeshPrimitives.create_box(wrist_r * 2, hand_len, wrist_r * 1.5)
            hand.translate(Vector3(shoulder_x, wrist_y - hand_len / 2, 0))
            self.mesh.merge(hand)

        return arm_rings

    def _generate_legs(self, torso_rings: Dict[str, List[int]]) -> Dict[str, List[int]]:
        """Generate legs"""
        p = self.params
        segments = 16

        leg_length = self._map_param(p.leg_length, 0.75, 0.95) * p.height
        thigh_len = leg_length * 0.45
        calf_len = leg_length * 0.42
        foot_len = leg_length * 0.13

        thigh_r = self._map_param(p.thigh_size, 0.07, 0.14)
        calf_r = self._map_param(p.calf_size, 0.04, 0.08)
        ankle_r = calf_r * 0.6

        # Thigh gap adjustment
        gap = self._map_param(p.thigh_gap, 0.02, 0.08)

        leg_rings = {}
        hip_y = p.height * 0.45

        for side in [-1, 1]:
            side_name = "left" if side == -1 else "right"
            hip_x = side * (self._map_param(p.hip_width, 0.12, 0.20) + gap / 2)

            # Thigh
            rings = []
            for i in range(8):
                t = i / 7
                y = hip_y - thigh_len * t
                # Thigh shape - thicker at top
                r = thigh_r * (1.0 - 0.3 * t)
                x_offset = hip_x * (1.0 - 0.3 * t)  # Legs come together
                ring = self._create_ring(Vector3(x_offset, y, 0), r, r * 0.95, segments)
                rings.append(ring)

            for i in range(len(rings) - 1):
                self._connect_rings(rings[i], rings[i + 1])

            leg_rings[f"{side_name}_thigh"] = rings

            # Calf
            knee_y = hip_y - thigh_len
            knee_x = hip_x * 0.7
            rings = []
            for i in range(7):
                t = i / 6
                y = knee_y - calf_len * t
                # Calf shape - bulge in middle
                bulge = math.sin(t * math.pi) * 0.2
                r = self._lerp(calf_r * 1.1, ankle_r, t) * (1 + bulge)
                ring = self._create_ring(Vector3(knee_x, y, 0), r, r * 0.9, segments)
                rings.append(ring)

            for i in range(len(rings) - 1):
                self._connect_rings(rings[i], rings[i + 1])

            leg_rings[f"{side_name}_calf"] = rings

            # Foot (simplified)
            ankle_y = knee_y - calf_len
            foot = MeshPrimitives.create_box(ankle_r * 2, 0.03, foot_len)
            foot.translate(Vector3(knee_x, ankle_y - 0.015, foot_len * 0.3))
            self.mesh.merge(foot)

        return leg_rings

    def _generate_head(self) -> Dict[str, List[int]]:
        """Generate head and face"""
        p = self.params

        head_y = p.height * 0.9
        head_radius = 0.10

        # Base head shape
        face_shape = self._map_param(p.face_shape, 0.8, 1.2)  # round to angular
        jaw_width = self._map_param(p.jaw_width, 0.7, 1.1)

        # Create head as deformed sphere
        head = Mesh("head")
        segments = 20
        rings = 16

        for i in range(rings + 1):
            phi = math.pi * i / rings
            for j in range(segments):
                theta = 2 * math.pi * j / segments

                # Base sphere
                r = head_radius

                # Face shape modifications
                # Flatten back of head slightly
                if math.cos(theta) < -0.3:
                    r *= 0.95

                # Jaw shape
                if phi > math.pi * 0.6:  # Lower part of head
                    jaw_factor = (phi - math.pi * 0.6) / (math.pi * 0.4)
                    r *= self._lerp(1.0, jaw_width * 0.85, jaw_factor)

                # Cheekbones
                cheek_height = self._map_param(p.cheekbone_height, 0.0, 0.02)
                if 0.4 < phi / math.pi < 0.6 and abs(math.sin(theta)) > 0.5:
                    r += cheek_height

                x = r * math.sin(phi) * math.cos(theta) * face_shape
                y = head_y + r * math.cos(phi)
                z = r * math.sin(phi) * math.sin(theta)

                head.add_vertex(
                    Vector3(x, y, z),
                    Vector3(math.sin(phi) * math.cos(theta),
                           math.cos(phi),
                           math.sin(phi) * math.sin(theta)),
                    Vector2(j / segments, i / rings)
                )

        # Connect head rings
        for i in range(rings):
            for j in range(segments):
                next_j = (j + 1) % segments
                v1 = i * segments + j
                v2 = i * segments + next_j
                v3 = (i + 1) * segments + next_j
                v4 = (i + 1) * segments + j
                head.add_quad(v1, v2, v3, v4)

        self.mesh.merge(head)

        # Eyes
        eye_size = self._map_param(p.eye_size, 0.012, 0.02)
        eye_spacing = self._map_param(p.eye_spacing, 0.025, 0.04)
        eye_y = head_y + head_radius * 0.15
        eye_z = head_radius * 0.85

        for side in [-1, 1]:
            # Eyeball
            eye = MeshPrimitives.create_sphere(eye_size, 12, 8)
            eye.translate(Vector3(side * eye_spacing, eye_y, eye_z))
            self.mesh.merge(eye)

            # Pupil
            pupil = MeshPrimitives.create_sphere(eye_size * 0.4, 8, 6)
            pupil.translate(Vector3(side * eye_spacing, eye_y, eye_z + eye_size * 0.8))
            self.mesh.merge(pupil)

        # Nose
        nose_size = self._map_param(p.nose_size, 0.015, 0.03)
        nose_y = head_y - head_radius * 0.1
        nose_z = head_radius * 0.95

        nose = MeshPrimitives.create_sphere(nose_size, 8, 6)
        nose.scale(Vector3(0.6, 1.2, 1.0))
        nose.translate(Vector3(0, nose_y, nose_z))
        self.mesh.merge(nose)

        # Lips
        lip_fullness = self._map_param(p.lip_fullness, 0.008, 0.018)
        lip_y = head_y - head_radius * 0.35
        lip_z = head_radius * 0.88

        # Upper lip
        upper_lip = MeshPrimitives.create_torus(0.02, lip_fullness * 0.7, 16, 8)
        upper_lip.scale(Vector3(1.5, 0.5, 0.8))
        upper_lip.translate(Vector3(0, lip_y + lip_fullness, lip_z))
        self.mesh.merge(upper_lip)

        # Lower lip
        lower_lip = MeshPrimitives.create_torus(0.022, lip_fullness, 16, 8)
        lower_lip.scale(Vector3(1.4, 0.6, 0.8))
        lower_lip.translate(Vector3(0, lip_y - lip_fullness * 0.5, lip_z))
        self.mesh.merge(lower_lip)

        # Ears
        ear_y = head_y
        for side in [-1, 1]:
            ear = MeshPrimitives.create_sphere(0.025, 8, 6)
            ear.scale(Vector3(0.3, 1.0, 0.6))
            ear.translate(Vector3(side * (head_radius * face_shape + 0.01), ear_y, 0))
            self.mesh.merge(ear)

        return {}

    def _generate_neck(self, torso_rings: Dict[str, List[int]]):
        """Generate neck connecting head to torso"""
        p = self.params
        segments = 12

        neck_base_y = p.height * 0.82
        neck_top_y = p.height * 0.88
        neck_radius = 0.04 if p.gender == "female" else 0.05

        rings = []
        for i in range(4):
            t = i / 3
            y = self._lerp(neck_base_y, neck_top_y, t)
            r = neck_radius * (1.0 - 0.1 * t)
            ring = self._create_ring(Vector3(0, y, 0), r, r * 0.9, segments)
            rings.append(ring)

        for i in range(len(rings) - 1):
            self._connect_rings(rings[i], rings[i + 1])

    def _generate_skeleton(self):
        """Generate skeleton for rigging"""
        p = self.params

        # Root bone
        self.bones.append(Bone("root", -1, Vector3(0, p.height * 0.5, 0)))

        # Spine
        self.bones.append(Bone("spine_01", 0, Vector3(0, p.height * 0.52, 0)))
        self.bones.append(Bone("spine_02", 1, Vector3(0, p.height * 0.58, 0)))
        self.bones.append(Bone("spine_03", 2, Vector3(0, p.height * 0.65, 0)))
        self.bones.append(Bone("chest", 3, Vector3(0, p.height * 0.72, 0)))
        self.bones.append(Bone("neck", 4, Vector3(0, p.height * 0.82, 0)))
        self.bones.append(Bone("head", 5, Vector3(0, p.height * 0.88, 0)))

        # Left arm
        shoulder_x = -self._map_param(p.shoulder_width, 0.30, 0.50)
        self.bones.append(Bone("clavicle_l", 4, Vector3(shoulder_x * 0.3, p.height * 0.78, 0)))
        self.bones.append(Bone("upperarm_l", 7, Vector3(shoulder_x, p.height * 0.78, 0)))
        self.bones.append(Bone("forearm_l", 8, Vector3(shoulder_x, p.height * 0.60, 0)))
        self.bones.append(Bone("hand_l", 9, Vector3(shoulder_x, p.height * 0.45, 0)))

        # Right arm
        shoulder_x = self._map_param(p.shoulder_width, 0.30, 0.50)
        self.bones.append(Bone("clavicle_r", 4, Vector3(shoulder_x * 0.3, p.height * 0.78, 0)))
        self.bones.append(Bone("upperarm_r", 11, Vector3(shoulder_x, p.height * 0.78, 0)))
        self.bones.append(Bone("forearm_r", 12, Vector3(shoulder_x, p.height * 0.60, 0)))
        self.bones.append(Bone("hand_r", 13, Vector3(shoulder_x, p.height * 0.45, 0)))

        # Left leg
        hip_x = -self._map_param(p.hip_width, 0.12, 0.20)
        self.bones.append(Bone("thigh_l", 0, Vector3(hip_x, p.height * 0.45, 0)))
        self.bones.append(Bone("calf_l", 15, Vector3(hip_x * 0.7, p.height * 0.25, 0)))
        self.bones.append(Bone("foot_l", 16, Vector3(hip_x * 0.7, p.height * 0.05, 0)))

        # Right leg
        hip_x = self._map_param(p.hip_width, 0.12, 0.20)
        self.bones.append(Bone("thigh_r", 0, Vector3(hip_x, p.height * 0.45, 0)))
        self.bones.append(Bone("calf_r", 18, Vector3(hip_x * 0.7, p.height * 0.25, 0)))
        self.bones.append(Bone("foot_r", 19, Vector3(hip_x * 0.7, p.height * 0.05, 0)))

        self.mesh.bones = self.bones

    def generate(self) -> Mesh:
        """Generate complete human body mesh"""
        print(f"Generating {self.params.gender} body (height: {self.params.height}m)...")

        # Generate body parts
        print("  - Generating torso...")
        torso_rings = self._generate_torso()

        print("  - Generating breasts/chest...")
        self._generate_breasts(torso_rings)

        print("  - Generating buttocks...")
        self._generate_buttocks(torso_rings)

        print("  - Generating genitalia...")
        self._generate_genitalia()

        print("  - Generating arms...")
        self._generate_arms(torso_rings)

        print("  - Generating legs...")
        self._generate_legs(torso_rings)

        print("  - Generating neck...")
        self._generate_neck(torso_rings)

        print("  - Generating head...")
        self._generate_head()

        print("  - Generating skeleton...")
        self._generate_skeleton()

        # Post-processing
        print("  - Calculating normals...")
        self.mesh.calculate_normals()

        print("  - Centering mesh...")
        self.mesh.center_origin()

        print(f"✅ Generated mesh: {self.mesh.vertex_count()} vertices, {self.mesh.face_count()} faces")
        return self.mesh


if __name__ == "__main__":
    # Test generation
    params = BodyParameters(
        gender="female",
        height=1.68,
        breast_size=0.7,
        hip_width=0.6,
        waist_size=0.4
    )

    generator = HumanBodyGenerator(params)
    mesh = generator.generate()
    print(f"\nResult: {mesh}")
