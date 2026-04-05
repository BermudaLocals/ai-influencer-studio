"""
AI Influencer Studio - Main Application
Automatic AI Influencer Mesh Generator with Web Interface
"""
import os
import sys
import json
import uuid
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import asdict

# Add project to path
sys.path.insert(0, "/root/ai_influencer_studio")

from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

from core.mesh import Mesh, Vector3, MeshPrimitives
from generators.human_body import HumanBodyGenerator, BodyParameters
from exporters.mesh_exporter import OBJExporter, STLExporter, GLTFExporter, PLYExporter
from presets.personas import ALL_PERSONAS, get_persona, list_personas, AIInfluencerPersona

# Initialize Flask app
app = Flask(__name__, 
            template_folder="/root/ai_influencer_studio/web/templates",
            static_folder="/root/ai_influencer_studio/web/static")
CORS(app)

# Configuration
OUTPUT_DIR = "/root/ai_influencer_studio/output"
MESHES_DIR = f"{OUTPUT_DIR}/meshes"
RENDERS_DIR = f"{OUTPUT_DIR}/renders"

# Ensure directories exist
os.makedirs(MESHES_DIR, exist_ok=True)
os.makedirs(RENDERS_DIR, exist_ok=True)

# Generation queue/status
generation_jobs: Dict[str, Dict] = {}


class AIInfluencerGenerator:
    """Main generator class that orchestrates mesh creation"""

    def __init__(self):
        self.current_job = None

    def generate_from_persona(self, persona_id: str, job_id: str) -> Dict:
        """Generate mesh from preset persona"""
        persona = get_persona(persona_id)
        return self._generate(persona.body_params, persona.name, job_id, persona)

    def generate_from_params(self, params: Dict, name: str, job_id: str) -> Dict:
        """Generate mesh from custom parameters"""
        body_params = BodyParameters(**params)
        return self._generate(body_params, name, job_id)

    def _generate(self, body_params: BodyParameters, name: str, job_id: str, 
                  persona: AIInfluencerPersona = None) -> Dict:
        """Internal generation method"""
        start_time = time.time()

        # Update job status
        generation_jobs[job_id]["status"] = "generating"
        generation_jobs[job_id]["progress"] = 10

        # Generate mesh
        generator = HumanBodyGenerator(body_params)
        generation_jobs[job_id]["progress"] = 20

        mesh = generator.generate()
        generation_jobs[job_id]["progress"] = 60

        # Create output directory for this job
        job_dir = f"{MESHES_DIR}/{job_id}"
        os.makedirs(job_dir, exist_ok=True)

        # Export to all formats
        generation_jobs[job_id]["status"] = "exporting"
        generation_jobs[job_id]["progress"] = 70

        safe_name = name.lower().replace(" ", "_")
        exports = {}

        # OBJ
        obj_path = f"{job_dir}/{safe_name}.obj"
        OBJExporter.export(mesh, obj_path)
        exports["obj"] = obj_path
        generation_jobs[job_id]["progress"] = 75

        # STL
        stl_path = f"{job_dir}/{safe_name}.stl"
        STLExporter.export_binary(mesh, stl_path)
        exports["stl"] = stl_path
        generation_jobs[job_id]["progress"] = 80

        # GLTF
        gltf_path = f"{job_dir}/{safe_name}.gltf"
        GLTFExporter.export(mesh, gltf_path)
        exports["gltf"] = gltf_path
        generation_jobs[job_id]["progress"] = 85

        # GLB
        glb_path = f"{job_dir}/{safe_name}.glb"
        GLTFExporter.export_glb(mesh, glb_path)
        exports["glb"] = glb_path
        generation_jobs[job_id]["progress"] = 90

        # Save metadata
        metadata = {
            "job_id": job_id,
            "name": name,
            "persona_id": persona.id if persona else None,
            "created_at": datetime.now().isoformat(),
            "generation_time": time.time() - start_time,
            "vertex_count": mesh.vertex_count(),
            "face_count": mesh.face_count(),
            "exports": exports,
            "body_params": {
                "gender": body_params.gender,
                "height": body_params.height,
                "breast_size": body_params.breast_size,
                "hip_width": body_params.hip_width,
                "waist_size": body_params.waist_size
            }
        }

        if persona:
            metadata["persona"] = {
                "name": persona.name,
                "stage_name": persona.stage_name,
                "archetype": persona.archetype,
                "tagline": persona.tagline
            }

        with open(f"{job_dir}/metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        generation_jobs[job_id]["progress"] = 100
        generation_jobs[job_id]["status"] = "completed"
        generation_jobs[job_id]["result"] = metadata

        return metadata


# Initialize generator
generator = AIInfluencerGenerator()


# ============================================================================
# API ROUTES
# ============================================================================

@app.route("/")
def index():
    """Main page"""
    return render_template("index.html")


@app.route("/api/personas", methods=["GET"])
def api_list_personas():
    """List all available personas"""
    return jsonify({
        "success": True,
        "personas": list_personas()
    })


@app.route("/api/personas/<persona_id>", methods=["GET"])
def api_get_persona(persona_id: str):
    """Get detailed persona info"""
    try:
        persona = get_persona(persona_id)
        return jsonify({
            "success": True,
            "persona": {
                "id": persona.id,
                "name": persona.name,
                "stage_name": persona.stage_name,
                "tagline": persona.tagline,
                "archetype": persona.archetype,
                "age": persona.age,
                "nationality": persona.nationality,
                "bio": persona.bio,
                "gender": persona.body_params.gender,
                "height": persona.body_params.height,
                "subscription_price": persona.subscription_price,
                "instagram": persona.instagram_handle,
                "twitter": persona.twitter_handle,
                "onlyfans": persona.onlyfans_handle
            }
        })
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 404


@app.route("/api/generate/persona", methods=["POST"])
def api_generate_from_persona():
    """Generate mesh from preset persona"""
    data = request.json
    persona_id = data.get("persona_id")

    if not persona_id:
        return jsonify({"success": False, "error": "persona_id required"}), 400

    if persona_id not in ALL_PERSONAS:
        return jsonify({"success": False, "error": f"Unknown persona: {persona_id}"}), 404

    # Create job
    job_id = str(uuid.uuid4())[:8]
    generation_jobs[job_id] = {
        "id": job_id,
        "type": "persona",
        "persona_id": persona_id,
        "status": "queued",
        "progress": 0,
        "created_at": datetime.now().isoformat()
    }

    # Generate (synchronous for now)
    try:
        result = generator.generate_from_persona(persona_id, job_id)
        return jsonify({
            "success": True,
            "job_id": job_id,
            "result": result
        })
    except Exception as e:
        generation_jobs[job_id]["status"] = "error"
        generation_jobs[job_id]["error"] = str(e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/generate/custom", methods=["POST"])
def api_generate_custom():
    """Generate mesh from custom parameters"""
    data = request.json
    name = data.get("name", "Custom Model")
    params = data.get("params", {})

    # Create job
    job_id = str(uuid.uuid4())[:8]
    generation_jobs[job_id] = {
        "id": job_id,
        "type": "custom",
        "name": name,
        "status": "queued",
        "progress": 0,
        "created_at": datetime.now().isoformat()
    }

    # Generate
    try:
        result = generator.generate_from_params(params, name, job_id)
        return jsonify({
            "success": True,
            "job_id": job_id,
            "result": result
        })
    except Exception as e:
        generation_jobs[job_id]["status"] = "error"
        generation_jobs[job_id]["error"] = str(e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/jobs/<job_id>", methods=["GET"])
def api_get_job(job_id: str):
    """Get job status"""
    if job_id not in generation_jobs:
        return jsonify({"success": False, "error": "Job not found"}), 404

    return jsonify({
        "success": True,
        "job": generation_jobs[job_id]
    })


@app.route("/api/jobs", methods=["GET"])
def api_list_jobs():
    """List all jobs"""
    return jsonify({
        "success": True,
        "jobs": list(generation_jobs.values())
    })


@app.route("/api/download/<job_id>/<format>", methods=["GET"])
def api_download(job_id: str, format: str):
    """Download generated mesh"""
    if job_id not in generation_jobs:
        return jsonify({"success": False, "error": "Job not found"}), 404

    job = generation_jobs[job_id]
    if job["status"] != "completed":
        return jsonify({"success": False, "error": "Job not completed"}), 400

    if format not in job["result"]["exports"]:
        return jsonify({"success": False, "error": f"Format {format} not available"}), 404

    filepath = job["result"]["exports"][format]
    return send_file(filepath, as_attachment=True)


@app.route("/api/models", methods=["GET"])
def api_list_models():
    """List all generated models"""
    models = []
    for job_dir in os.listdir(MESHES_DIR):
        metadata_path = f"{MESHES_DIR}/{job_dir}/metadata.json"
        if os.path.exists(metadata_path):
            with open(metadata_path) as f:
                models.append(json.load(f))

    return jsonify({
        "success": True,
        "models": sorted(models, key=lambda x: x["created_at"], reverse=True)
    })


@app.route("/api/body-params", methods=["GET"])
def api_body_params():
    """Get available body parameters with ranges"""
    return jsonify({
        "success": True,
        "parameters": {
            "basic": {
                "gender": {"type": "select", "options": ["female", "male"], "default": "female"},
                "height": {"type": "range", "min": 1.5, "max": 2.0, "step": 0.01, "default": 1.7, "unit": "m"},
                "weight": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "muscle_mass": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "body_fat": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "age": {"type": "range", "min": 18, "max": 60, "step": 1, "default": 25}
            },
            "torso": {
                "shoulder_width": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "chest_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "waist_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "hip_width": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "torso_length": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5}
            },
            "breasts": {
                "breast_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5, "label": "Size (A-DD+)"},
                "breast_perkiness": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "breast_spacing": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "nipple_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "areola_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5}
            },
            "buttocks": {
                "butt_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "butt_roundness": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "butt_perkiness": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5}
            },
            "limbs": {
                "arm_length": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "arm_thickness": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "leg_length": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "thigh_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "thigh_gap": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5}
            },
            "genitalia": {
                "genital_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "genital_detail": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5}
            },
            "face": {
                "face_shape": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5, "label": "Round to Angular"},
                "jaw_width": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "lip_fullness": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5},
                "eye_size": {"type": "range", "min": 0, "max": 1, "step": 0.05, "default": 0.5}
            }
        }
    })


# Serve static files for 3D viewer
@app.route("/meshes/<path:filename>")
def serve_mesh(filename):
    return send_from_directory(MESHES_DIR, filename)


if __name__ == "__main__":
    print("="*60)
    print("🎭 AI INFLUENCER STUDIO")
    print("="*60)
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print(f"🌐 Starting server on http://0.0.0.0:5000")
    print("="*60)
    app.run(host="0.0.0.0", port=5000, debug=True)
