"""Mesh Exporters - Export 3D meshes to various formats"""
import struct
import json
import base64
import sys
sys.path.insert(0, "/root/ai_influencer_studio")
from core.mesh import Mesh, Vector3


class OBJExporter:
    """Export mesh to Wavefront OBJ format"""

    @staticmethod
    def export(mesh: Mesh, filepath: str, include_normals: bool = True) -> None:
        with open(filepath, 'w') as f:
            f.write("# AI Influencer Studio - OBJ Export\n")
            f.write(f"# Vertices: {mesh.vertex_count()}\n")
            f.write(f"# Faces: {mesh.face_count()}\n\n")

            # Write vertices
            for v in mesh.vertices:
                pos = v.position
                f.write(f"v {pos.x:.6f} {pos.y:.6f} {pos.z:.6f}\n")

            # Write normals
            if include_normals:
                f.write("\n")
                for v in mesh.vertices:
                    if v.normal:
                        n = v.normal
                        f.write(f"vn {n.x:.6f} {n.y:.6f} {n.z:.6f}\n")

            # Write faces (1-indexed) - Face has v1, v2, v3 attributes
            f.write("\n")
            for face in mesh.faces:
                i1, i2, i3 = face.v1 + 1, face.v2 + 1, face.v3 + 1
                if include_normals:
                    f.write(f"f {i1}//{i1} {i2}//{i2} {i3}//{i3}\n")
                else:
                    f.write(f"f {i1} {i2} {i3}\n")


class STLExporter:
    """Export mesh to STL format"""

    @staticmethod
    def export_binary(mesh: Mesh, filepath: str) -> None:
        triangles = []
        for face in mesh.faces:
            v0 = mesh.vertices[face.v1].position
            v1 = mesh.vertices[face.v2].position
            v2 = mesh.vertices[face.v3].position

            edge1 = Vector3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z)
            edge2 = Vector3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z)
            normal = edge1.cross(edge2).normalize()

            triangles.append((normal, v0, v1, v2))

        with open(filepath, 'wb') as f:
            header = b"AI Influencer Studio Binary STL" + b" " * 48
            f.write(header[:80])
            f.write(struct.pack('<I', len(triangles)))

            for normal, v0, v1, v2 in triangles:
                f.write(struct.pack('<fff', normal.x, normal.y, normal.z))
                f.write(struct.pack('<fff', v0.x, v0.y, v0.z))
                f.write(struct.pack('<fff', v1.x, v1.y, v1.z))
                f.write(struct.pack('<fff', v2.x, v2.y, v2.z))
                f.write(struct.pack('<H', 0))


class GLTFExporter:
    """Export mesh to GLTF/GLB format"""

    @staticmethod
    def export(mesh: Mesh, filepath: str) -> None:
        vertices_flat = []
        for v in mesh.vertices:
            pos = v.position
            vertices_flat.extend([pos.x, pos.y, pos.z])

        indices = []
        for face in mesh.faces:
            indices.extend([face.v1, face.v2, face.v3])

        min_pos = [float('inf')] * 3
        max_pos = [float('-inf')] * 3
        for v in mesh.vertices:
            pos = v.position
            min_pos[0] = min(min_pos[0], pos.x)
            min_pos[1] = min(min_pos[1], pos.y)
            min_pos[2] = min(min_pos[2], pos.z)
            max_pos[0] = max(max_pos[0], pos.x)
            max_pos[1] = max(max_pos[1], pos.y)
            max_pos[2] = max(max_pos[2], pos.z)

        vertex_data = struct.pack(f'<{len(vertices_flat)}f', *vertices_flat)
        index_data = struct.pack(f'<{len(indices)}I', *indices)

        while len(vertex_data) % 4 != 0:
            vertex_data += b'\x00'
        while len(index_data) % 4 != 0:
            index_data += b'\x00'

        buffer_data = vertex_data + index_data

        gltf = {
            "asset": {"version": "2.0", "generator": "AI Influencer Studio"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"mesh": 0, "name": "Body"}],
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "mode": 4}], "name": "BodyMesh"}],
            "accessors": [
                {"bufferView": 0, "componentType": 5126, "count": len(mesh.vertices), "type": "VEC3", "min": min_pos, "max": max_pos},
                {"bufferView": 1, "componentType": 5125, "count": len(indices), "type": "SCALAR"}
            ],
            "bufferViews": [
                {"buffer": 0, "byteOffset": 0, "byteLength": len(vertex_data), "target": 34962},
                {"buffer": 0, "byteOffset": len(vertex_data), "byteLength": len(index_data), "target": 34963}
            ],
            "buffers": [{"uri": "data:application/octet-stream;base64," + base64.b64encode(buffer_data).decode(), "byteLength": len(buffer_data)}]
        }

        with open(filepath, 'w') as f:
            json.dump(gltf, f)

    @staticmethod
    def export_glb(mesh: Mesh, filepath: str) -> None:
        vertices_flat = []
        for v in mesh.vertices:
            pos = v.position
            vertices_flat.extend([pos.x, pos.y, pos.z])

        indices = []
        for face in mesh.faces:
            indices.extend([face.v1, face.v2, face.v3])

        min_pos = [float('inf')] * 3
        max_pos = [float('-inf')] * 3
        for v in mesh.vertices:
            pos = v.position
            min_pos[0] = min(min_pos[0], pos.x)
            min_pos[1] = min(min_pos[1], pos.y)
            min_pos[2] = min(min_pos[2], pos.z)
            max_pos[0] = max(max_pos[0], pos.x)
            max_pos[1] = max(max_pos[1], pos.y)
            max_pos[2] = max(max_pos[2], pos.z)

        vertex_data = struct.pack(f'<{len(vertices_flat)}f', *vertices_flat)
        index_data = struct.pack(f'<{len(indices)}I', *indices)

        while len(vertex_data) % 4 != 0:
            vertex_data += b'\x00'
        while len(index_data) % 4 != 0:
            index_data += b'\x00'

        buffer_data = vertex_data + index_data

        gltf = {
            "asset": {"version": "2.0", "generator": "AI Influencer Studio"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"mesh": 0, "name": "Body"}],
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "mode": 4}], "name": "BodyMesh"}],
            "accessors": [
                {"bufferView": 0, "componentType": 5126, "count": len(mesh.vertices), "type": "VEC3", "min": min_pos, "max": max_pos},
                {"bufferView": 1, "componentType": 5125, "count": len(indices), "type": "SCALAR"}
            ],
            "bufferViews": [
                {"buffer": 0, "byteOffset": 0, "byteLength": len(vertex_data), "target": 34962},
                {"buffer": 0, "byteOffset": len(vertex_data), "byteLength": len(index_data), "target": 34963}
            ],
            "buffers": [{"byteLength": len(buffer_data)}]
        }

        json_str = json.dumps(gltf, separators=(',', ':'))
        json_bytes = json_str.encode('utf-8')
        while len(json_bytes) % 4 != 0:
            json_bytes += b' '

        with open(filepath, 'wb') as f:
            total_length = 12 + 8 + len(json_bytes) + 8 + len(buffer_data)
            f.write(b'glTF')
            f.write(struct.pack('<I', 2))
            f.write(struct.pack('<I', total_length))
            f.write(struct.pack('<I', len(json_bytes)))
            f.write(b'JSON')
            f.write(json_bytes)
            f.write(struct.pack('<I', len(buffer_data)))
            f.write(b'BIN\x00')
            f.write(buffer_data)


class PLYExporter:
    """Export mesh to PLY format"""

    @staticmethod
    def export(mesh: Mesh, filepath: str) -> None:
        with open(filepath, 'w') as f:
            f.write("ply\n")
            f.write("format ascii 1.0\n")
            f.write(f"element vertex {mesh.vertex_count()}\n")
            f.write("property float x\n")
            f.write("property float y\n")
            f.write("property float z\n")
            f.write(f"element face {mesh.face_count()}\n")
            f.write("property list uchar int vertex_indices\n")
            f.write("end_header\n")

            for v in mesh.vertices:
                pos = v.position
                f.write(f"{pos.x:.6f} {pos.y:.6f} {pos.z:.6f}\n")

            for face in mesh.faces:
                f.write(f"3 {face.v1} {face.v2} {face.v3}\n")
