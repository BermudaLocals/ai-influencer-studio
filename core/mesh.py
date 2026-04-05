"""
AI Influencer Studio - Core 3D Mesh Engine
Pure Python 3D mesh generation without external tools
"""
import numpy as np
import math
import json
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass, field
import struct
import base64

@dataclass
class Vector3:
    """3D Vector class"""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def __add__(self, other):
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other):
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)

    def __mul__(self, scalar):
        return Vector3(self.x * scalar, self.y * scalar, self.z * scalar)

    def __truediv__(self, scalar):
        return Vector3(self.x / scalar, self.y / scalar, self.z / scalar)

    def dot(self, other):
        return self.x * other.x + self.y * other.y + self.z * other.z

    def cross(self, other):
        return Vector3(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x
        )

    def length(self):
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)

    def normalize(self):
        l = self.length()
        if l > 0:
            return self / l
        return Vector3(0, 0, 0)

    def to_tuple(self):
        return (self.x, self.y, self.z)

    def to_array(self):
        return np.array([self.x, self.y, self.z])

@dataclass
class Vector2:
    """2D Vector for UV coordinates"""
    u: float = 0.0
    v: float = 0.0

    def to_tuple(self):
        return (self.u, self.v)

@dataclass
class Vertex:
    """Vertex with position, normal, and UV"""
    position: Vector3
    normal: Vector3 = None
    uv: Vector2 = None

    def __post_init__(self):
        if self.normal is None:
            self.normal = Vector3(0, 1, 0)
        if self.uv is None:
            self.uv = Vector2(0, 0)

@dataclass
class Face:
    """Triangle face with vertex indices"""
    v1: int
    v2: int
    v3: int
    material_id: int = 0

@dataclass
class Material:
    """Material definition"""
    name: str
    diffuse_color: Tuple[float, float, float] = (0.8, 0.8, 0.8)
    specular_color: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    ambient_color: Tuple[float, float, float] = (0.2, 0.2, 0.2)
    shininess: float = 32.0
    opacity: float = 1.0
    texture_path: str = None

@dataclass
class BoneWeight:
    """Bone weight for skinning"""
    bone_index: int
    weight: float

@dataclass
class Bone:
    """Skeleton bone"""
    name: str
    parent_index: int = -1
    position: Vector3 = None
    rotation: Tuple[float, float, float, float] = (0, 0, 0, 1)  # Quaternion
    scale: Vector3 = None

    def __post_init__(self):
        if self.position is None:
            self.position = Vector3(0, 0, 0)
        if self.scale is None:
            self.scale = Vector3(1, 1, 1)

class Mesh:
    """3D Mesh container"""

    def __init__(self, name: str = "mesh"):
        self.name = name
        self.vertices: List[Vertex] = []
        self.faces: List[Face] = []
        self.materials: List[Material] = [Material("default")]
        self.bones: List[Bone] = []
        self.vertex_weights: Dict[int, List[BoneWeight]] = {}

    def add_vertex(self, position: Vector3, normal: Vector3 = None, uv: Vector2 = None) -> int:
        """Add vertex and return index"""
        vertex = Vertex(position, normal, uv)
        self.vertices.append(vertex)
        return len(self.vertices) - 1

    def add_face(self, v1: int, v2: int, v3: int, material_id: int = 0):
        """Add triangle face"""
        self.faces.append(Face(v1, v2, v3, material_id))

    def add_quad(self, v1: int, v2: int, v3: int, v4: int, material_id: int = 0):
        """Add quad as two triangles"""
        self.add_face(v1, v2, v3, material_id)
        self.add_face(v1, v3, v4, material_id)

    def calculate_normals(self):
        """Calculate vertex normals from faces"""
        # Reset normals
        for v in self.vertices:
            v.normal = Vector3(0, 0, 0)

        # Accumulate face normals
        for face in self.faces:
            v0 = self.vertices[face.v1].position
            v1 = self.vertices[face.v2].position
            v2 = self.vertices[face.v3].position

            edge1 = v1 - v0
            edge2 = v2 - v0
            normal = edge1.cross(edge2).normalize()

            self.vertices[face.v1].normal = self.vertices[face.v1].normal + normal
            self.vertices[face.v2].normal = self.vertices[face.v2].normal + normal
            self.vertices[face.v3].normal = self.vertices[face.v3].normal + normal

        # Normalize
        for v in self.vertices:
            v.normal = v.normal.normalize()

    def transform(self, matrix: np.ndarray):
        """Apply 4x4 transformation matrix"""
        for v in self.vertices:
            pos = np.array([v.position.x, v.position.y, v.position.z, 1.0])
            new_pos = matrix @ pos
            v.position = Vector3(new_pos[0], new_pos[1], new_pos[2])
        self.calculate_normals()

    def translate(self, offset: Vector3):
        """Translate mesh"""
        for v in self.vertices:
            v.position = v.position + offset

    def scale(self, factor: Vector3):
        """Scale mesh"""
        for v in self.vertices:
            v.position = Vector3(
                v.position.x * factor.x,
                v.position.y * factor.y,
                v.position.z * factor.z
            )

    def merge(self, other: "Mesh"):
        """Merge another mesh into this one"""
        offset = len(self.vertices)

        for v in other.vertices:
            self.vertices.append(Vertex(
                Vector3(v.position.x, v.position.y, v.position.z),
                Vector3(v.normal.x, v.normal.y, v.normal.z),
                Vector2(v.uv.u, v.uv.v)
            ))

        for f in other.faces:
            self.faces.append(Face(
                f.v1 + offset,
                f.v2 + offset,
                f.v3 + offset,
                f.material_id
            ))

    def get_bounds(self) -> Tuple[Vector3, Vector3]:
        """Get bounding box"""
        if not self.vertices:
            return Vector3(0, 0, 0), Vector3(0, 0, 0)

        min_v = Vector3(float('inf'), float('inf'), float('inf'))
        max_v = Vector3(float('-inf'), float('-inf'), float('-inf'))

        for v in self.vertices:
            min_v.x = min(min_v.x, v.position.x)
            min_v.y = min(min_v.y, v.position.y)
            min_v.z = min(min_v.z, v.position.z)
            max_v.x = max(max_v.x, v.position.x)
            max_v.y = max(max_v.y, v.position.y)
            max_v.z = max(max_v.z, v.position.z)

        return min_v, max_v

    def center_origin(self):
        """Center mesh at origin"""
        min_v, max_v = self.get_bounds()
        center = Vector3(
            (min_v.x + max_v.x) / 2,
            min_v.y,  # Keep feet at ground
            (min_v.z + max_v.z) / 2
        )
        self.translate(Vector3(-center.x, -center.y, -center.z))

    def subdivide(self):
        """Subdivide mesh (Catmull-Clark style)"""
        new_vertices = list(self.vertices)
        new_faces = []
        edge_midpoints = {}

        for face in self.faces:
            # Get face vertices
            v0 = self.vertices[face.v1]
            v1 = self.vertices[face.v2]
            v2 = self.vertices[face.v3]

            # Calculate face center
            center_pos = Vector3(
                (v0.position.x + v1.position.x + v2.position.x) / 3,
                (v0.position.y + v1.position.y + v2.position.y) / 3,
                (v0.position.z + v1.position.z + v2.position.z) / 3
            )
            center_uv = Vector2(
                (v0.uv.u + v1.uv.u + v2.uv.u) / 3,
                (v0.uv.v + v1.uv.v + v2.uv.v) / 3
            )
            center_idx = len(new_vertices)
            new_vertices.append(Vertex(center_pos, None, center_uv))

            # Get or create edge midpoints
            edges = [(face.v1, face.v2), (face.v2, face.v3), (face.v3, face.v1)]
            edge_indices = []

            for e in edges:
                edge_key = tuple(sorted(e))
                if edge_key not in edge_midpoints:
                    va = self.vertices[e[0]]
                    vb = self.vertices[e[1]]
                    mid_pos = Vector3(
                        (va.position.x + vb.position.x) / 2,
                        (va.position.y + vb.position.y) / 2,
                        (va.position.z + vb.position.z) / 2
                    )
                    mid_uv = Vector2(
                        (va.uv.u + vb.uv.u) / 2,
                        (va.uv.v + vb.uv.v) / 2
                    )
                    mid_idx = len(new_vertices)
                    new_vertices.append(Vertex(mid_pos, None, mid_uv))
                    edge_midpoints[edge_key] = mid_idx
                edge_indices.append(edge_midpoints[edge_key])

            # Create 4 new faces
            m01, m12, m20 = edge_indices
            new_faces.append(Face(face.v1, m01, center_idx, face.material_id))
            new_faces.append(Face(m01, face.v2, center_idx, face.material_id))
            new_faces.append(Face(face.v2, m12, center_idx, face.material_id))
            new_faces.append(Face(m12, face.v3, center_idx, face.material_id))
            new_faces.append(Face(face.v3, m20, center_idx, face.material_id))
            new_faces.append(Face(m20, face.v1, center_idx, face.material_id))

        self.vertices = new_vertices
        self.faces = new_faces
        self.calculate_normals()

    def smooth(self, iterations: int = 1, factor: float = 0.5):
        """Laplacian smoothing"""
        # Build adjacency
        adjacency = {i: set() for i in range(len(self.vertices))}
        for face in self.faces:
            adjacency[face.v1].update([face.v2, face.v3])
            adjacency[face.v2].update([face.v1, face.v3])
            adjacency[face.v3].update([face.v1, face.v2])

        for _ in range(iterations):
            new_positions = []
            for i, v in enumerate(self.vertices):
                if adjacency[i]:
                    avg = Vector3(0, 0, 0)
                    for j in adjacency[i]:
                        avg = avg + self.vertices[j].position
                    avg = avg / len(adjacency[i])
                    new_pos = v.position + (avg - v.position) * factor
                    new_positions.append(new_pos)
                else:
                    new_positions.append(v.position)

            for i, pos in enumerate(new_positions):
                self.vertices[i].position = pos

        self.calculate_normals()

    def vertex_count(self) -> int:
        return len(self.vertices)

    def face_count(self) -> int:
        return len(self.faces)

    def __repr__(self):
        return f"Mesh('{self.name}', vertices={self.vertex_count()}, faces={self.face_count()})"


class MeshPrimitives:
    """Factory for primitive shapes"""

    @staticmethod
    def create_sphere(radius: float = 1.0, segments: int = 32, rings: int = 16) -> Mesh:
        """Create UV sphere"""
        mesh = Mesh("sphere")

        for i in range(rings + 1):
            phi = math.pi * i / rings
            for j in range(segments):
                theta = 2 * math.pi * j / segments

                x = radius * math.sin(phi) * math.cos(theta)
                y = radius * math.cos(phi)
                z = radius * math.sin(phi) * math.sin(theta)

                u = j / segments
                v = i / rings

                mesh.add_vertex(
                    Vector3(x, y, z),
                    Vector3(x, y, z).normalize(),
                    Vector2(u, v)
                )

        for i in range(rings):
            for j in range(segments):
                next_j = (j + 1) % segments

                v1 = i * segments + j
                v2 = i * segments + next_j
                v3 = (i + 1) * segments + next_j
                v4 = (i + 1) * segments + j

                if i > 0:
                    mesh.add_face(v1, v2, v3)
                if i < rings - 1:
                    mesh.add_face(v1, v3, v4)

        return mesh

    @staticmethod
    def create_cylinder(radius: float = 1.0, height: float = 2.0, segments: int = 32) -> Mesh:
        """Create cylinder"""
        mesh = Mesh("cylinder")
        half_height = height / 2

        # Side vertices
        for i in range(2):
            y = half_height if i == 0 else -half_height
            for j in range(segments):
                theta = 2 * math.pi * j / segments
                x = radius * math.cos(theta)
                z = radius * math.sin(theta)

                mesh.add_vertex(
                    Vector3(x, y, z),
                    Vector3(x, 0, z).normalize(),
                    Vector2(j / segments, i)
                )

        # Side faces
        for j in range(segments):
            next_j = (j + 1) % segments
            v1 = j
            v2 = next_j
            v3 = segments + next_j
            v4 = segments + j
            mesh.add_quad(v1, v2, v3, v4)

        # Caps
        top_center = mesh.add_vertex(Vector3(0, half_height, 0), Vector3(0, 1, 0), Vector2(0.5, 0.5))
        bottom_center = mesh.add_vertex(Vector3(0, -half_height, 0), Vector3(0, -1, 0), Vector2(0.5, 0.5))

        for j in range(segments):
            next_j = (j + 1) % segments
            mesh.add_face(top_center, j, next_j)
            mesh.add_face(bottom_center, segments + next_j, segments + j)

        return mesh

    @staticmethod
    def create_capsule(radius: float = 0.5, height: float = 2.0, segments: int = 16, rings: int = 8) -> Mesh:
        """Create capsule (cylinder with hemisphere caps)"""
        mesh = Mesh("capsule")
        half_height = (height - 2 * radius) / 2

        # Top hemisphere
        for i in range(rings // 2 + 1):
            phi = math.pi * i / rings
            for j in range(segments):
                theta = 2 * math.pi * j / segments

                x = radius * math.sin(phi) * math.cos(theta)
                y = radius * math.cos(phi) + half_height
                z = radius * math.sin(phi) * math.sin(theta)

                mesh.add_vertex(
                    Vector3(x, y, z),
                    Vector3(x - 0, y - half_height, z).normalize(),
                    Vector2(j / segments, i / rings)
                )

        # Cylinder middle
        for i in range(2):
            y = half_height if i == 0 else -half_height
            for j in range(segments):
                theta = 2 * math.pi * j / segments
                x = radius * math.cos(theta)
                z = radius * math.sin(theta)

                mesh.add_vertex(
                    Vector3(x, y, z),
                    Vector3(x, 0, z).normalize(),
                    Vector2(j / segments, 0.5)
                )

        # Bottom hemisphere
        for i in range(rings // 2, rings + 1):
            phi = math.pi * i / rings
            for j in range(segments):
                theta = 2 * math.pi * j / segments

                x = radius * math.sin(phi) * math.cos(theta)
                y = radius * math.cos(phi) - half_height
                z = radius * math.sin(phi) * math.sin(theta)

                mesh.add_vertex(
                    Vector3(x, y, z),
                    Vector3(x, y + half_height, z).normalize(),
                    Vector2(j / segments, i / rings)
                )

        # Generate faces (simplified)
        total_rings = rings + 3
        for i in range(total_rings):
            for j in range(segments):
                next_j = (j + 1) % segments
                v1 = i * segments + j
                v2 = i * segments + next_j
                v3 = (i + 1) * segments + next_j
                v4 = (i + 1) * segments + j

                if v3 < len(mesh.vertices) and v4 < len(mesh.vertices):
                    mesh.add_face(v1, v2, v3)
                    mesh.add_face(v1, v3, v4)

        mesh.calculate_normals()
        return mesh

    @staticmethod
    def create_box(width: float = 1.0, height: float = 1.0, depth: float = 1.0) -> Mesh:
        """Create box/cube"""
        mesh = Mesh("box")
        w, h, d = width / 2, height / 2, depth / 2

        # Vertices for each face (with proper normals)
        # Front
        mesh.add_vertex(Vector3(-w, -h, d), Vector3(0, 0, 1), Vector2(0, 0))
        mesh.add_vertex(Vector3(w, -h, d), Vector3(0, 0, 1), Vector2(1, 0))
        mesh.add_vertex(Vector3(w, h, d), Vector3(0, 0, 1), Vector2(1, 1))
        mesh.add_vertex(Vector3(-w, h, d), Vector3(0, 0, 1), Vector2(0, 1))
        mesh.add_quad(0, 1, 2, 3)

        # Back
        mesh.add_vertex(Vector3(w, -h, -d), Vector3(0, 0, -1), Vector2(0, 0))
        mesh.add_vertex(Vector3(-w, -h, -d), Vector3(0, 0, -1), Vector2(1, 0))
        mesh.add_vertex(Vector3(-w, h, -d), Vector3(0, 0, -1), Vector2(1, 1))
        mesh.add_vertex(Vector3(w, h, -d), Vector3(0, 0, -1), Vector2(0, 1))
        mesh.add_quad(4, 5, 6, 7)

        # Top
        mesh.add_vertex(Vector3(-w, h, d), Vector3(0, 1, 0), Vector2(0, 0))
        mesh.add_vertex(Vector3(w, h, d), Vector3(0, 1, 0), Vector2(1, 0))
        mesh.add_vertex(Vector3(w, h, -d), Vector3(0, 1, 0), Vector2(1, 1))
        mesh.add_vertex(Vector3(-w, h, -d), Vector3(0, 1, 0), Vector2(0, 1))
        mesh.add_quad(8, 9, 10, 11)

        # Bottom
        mesh.add_vertex(Vector3(-w, -h, -d), Vector3(0, -1, 0), Vector2(0, 0))
        mesh.add_vertex(Vector3(w, -h, -d), Vector3(0, -1, 0), Vector2(1, 0))
        mesh.add_vertex(Vector3(w, -h, d), Vector3(0, -1, 0), Vector2(1, 1))
        mesh.add_vertex(Vector3(-w, -h, d), Vector3(0, -1, 0), Vector2(0, 1))
        mesh.add_quad(12, 13, 14, 15)

        # Right
        mesh.add_vertex(Vector3(w, -h, d), Vector3(1, 0, 0), Vector2(0, 0))
        mesh.add_vertex(Vector3(w, -h, -d), Vector3(1, 0, 0), Vector2(1, 0))
        mesh.add_vertex(Vector3(w, h, -d), Vector3(1, 0, 0), Vector2(1, 1))
        mesh.add_vertex(Vector3(w, h, d), Vector3(1, 0, 0), Vector2(0, 1))
        mesh.add_quad(16, 17, 18, 19)

        # Left
        mesh.add_vertex(Vector3(-w, -h, -d), Vector3(-1, 0, 0), Vector2(0, 0))
        mesh.add_vertex(Vector3(-w, -h, d), Vector3(-1, 0, 0), Vector2(1, 0))
        mesh.add_vertex(Vector3(-w, h, d), Vector3(-1, 0, 0), Vector2(1, 1))
        mesh.add_vertex(Vector3(-w, h, -d), Vector3(-1, 0, 0), Vector2(0, 1))
        mesh.add_quad(20, 21, 22, 23)

        return mesh

    @staticmethod
    def create_torus(major_radius: float = 1.0, minor_radius: float = 0.3, 
                     major_segments: int = 32, minor_segments: int = 16) -> Mesh:
        """Create torus"""
        mesh = Mesh("torus")

        for i in range(major_segments):
            theta = 2 * math.pi * i / major_segments
            for j in range(minor_segments):
                phi = 2 * math.pi * j / minor_segments

                x = (major_radius + minor_radius * math.cos(phi)) * math.cos(theta)
                y = minor_radius * math.sin(phi)
                z = (major_radius + minor_radius * math.cos(phi)) * math.sin(theta)

                # Normal
                nx = math.cos(phi) * math.cos(theta)
                ny = math.sin(phi)
                nz = math.cos(phi) * math.sin(theta)

                mesh.add_vertex(
                    Vector3(x, y, z),
                    Vector3(nx, ny, nz),
                    Vector2(i / major_segments, j / minor_segments)
                )

        for i in range(major_segments):
            next_i = (i + 1) % major_segments
            for j in range(minor_segments):
                next_j = (j + 1) % minor_segments

                v1 = i * minor_segments + j
                v2 = next_i * minor_segments + j
                v3 = next_i * minor_segments + next_j
                v4 = i * minor_segments + next_j

                mesh.add_quad(v1, v2, v3, v4)

        return mesh


if __name__ == "__main__":
    # Test
    sphere = MeshPrimitives.create_sphere(1.0, 16, 8)
    print(f"Created: {sphere}")

    cylinder = MeshPrimitives.create_cylinder(0.5, 2.0, 16)
    print(f"Created: {cylinder}")

    box = MeshPrimitives.create_box(1, 1, 1)
    print(f"Created: {box}")
