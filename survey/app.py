"""Real vs AI Survey Web Application
Modern gamified interface for the AI detection survey
"""
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import os
import sys
import json
import uuid

sys.path.insert(0, "/root/ai_influencer_studio")
sys.path.insert(0, "/root/ai_influencer_studio/survey")

from survey_system import SurveyGame, Difficulty, PlatformIntegration, ACHIEVEMENTS, REWARD_TIERS

app = Flask(__name__, 
            template_folder="/root/ai_influencer_studio/survey/templates",
            static_folder="/root/ai_influencer_studio/survey/static")
app.secret_key = os.urandom(24)
CORS(app)

# Initialize game
game = SurveyGame()


@app.route("/")
def index():
    """Main landing page"""
    return render_template("index.html")


@app.route("/play")
def play():
    """Game play page"""
    if "user_id" not in session:
        return redirect(url_for("index"))
    return render_template("play.html")


@app.route("/leaderboard")
def leaderboard():
    """Leaderboard page"""
    return render_template("leaderboard.html")


@app.route("/rewards")
def rewards():
    """Rewards page"""
    if "user_id" not in session:
        return redirect(url_for("index"))
    return render_template("rewards.html")


# API Endpoints
@app.route("/api/register", methods=["POST"])
def api_register():
    """Register new user"""
    data = request.json
    username = data.get("username", "")
    email = data.get("email", "")

    if not username:
        return jsonify({"error": "Username required"}), 400

    user = game.register_user(username, email)
    session["user_id"] = user.id

    return jsonify({
        "success": True,
        "user_id": user.id,
        "username": user.username
    })


@app.route("/api/login", methods=["POST"])
def api_login():
    """Login existing user"""
    data = request.json
    user_id = data.get("user_id", "")

    user = game.get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    session["user_id"] = user.id
    return jsonify({
        "success": True,
        "user_id": user.id,
        "username": user.username
    })


@app.route("/api/question", methods=["GET"])
def api_get_question():
    """Get a new question"""
    difficulty = request.args.get("difficulty", None)
    if difficulty:
        difficulty = Difficulty(difficulty)

    question = game.generate_question(difficulty)

    # Store question in session for validation
    session["current_question"] = {
        "id": question.id,
        "is_ai": question.images[0].is_ai,
        "difficulty": question.images[0].difficulty.value,
        "points": question.points
    }

    return jsonify({
        "question_id": question.id,
        "image_path": question.images[0].image_path,
        "difficulty": question.images[0].difficulty.value,
        "time_limit": question.time_limit,
        "points": question.points,
        "hint_available": question.hint_available
    })


@app.route("/api/answer", methods=["POST"])
def api_submit_answer():
    """Submit an answer"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    if "current_question" not in session:
        return jsonify({"error": "No active question"}), 400

    data = request.json
    user_guess = data.get("is_ai", False)
    time_taken = data.get("time_taken", 30)
    confidence = data.get("confidence", 50)
    used_hint = data.get("used_hint", False)

    q_data = session["current_question"]

    # Create minimal question object for scoring
    from survey_system import SurveyQuestion, SurveyImage
    image = SurveyImage(
        id=str(uuid.uuid4()),
        image_path="",
        is_ai=q_data["is_ai"],
        difficulty=Difficulty(q_data["difficulty"])
    )
    question = SurveyQuestion(
        id=q_data["id"],
        images=[image],
        points=q_data["points"]
    )

    result = game.submit_answer(
        session["user_id"],
        question,
        user_guess,
        time_taken,
        confidence,
        used_hint
    )

    # Clear current question
    del session["current_question"]

    # Add achievement details
    if result.get("new_achievements"):
        result["new_achievements"] = [
            {
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "reward": {
                    "type": a.reward.type.value,
                    "amount": a.reward.amount,
                    "description": a.reward.description
                }
            }
            for a in result["new_achievements"]
        ]

    return jsonify(result)


@app.route("/api/hint", methods=["GET"])
def api_get_hint():
    """Get hint for current question"""
    if "current_question" not in session:
        return jsonify({"error": "No active question"}), 400

    q_data = session["current_question"]

    # Generate contextual hint based on difficulty
    hints = {
        "easy": "Look for obvious digital artifacts or unnatural lighting.",
        "medium": "Check the skin texture - AI often has too-perfect or too-uniform skin.",
        "hard": "Examine the eyes closely - reflections and catchlights can reveal AI.",
        "expert": "Look at hair strands near the edges and ear details.",
        "impossible": "Even experts struggle here. Trust your instincts."
    }

    return jsonify({
        "hint": hints.get(q_data["difficulty"], "Look carefully at the details."),
        "cost": 5
    })


@app.route("/api/stats", methods=["GET"])
def api_get_stats():
    """Get user statistics"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    stats = game.get_user_stats(session["user_id"])
    return jsonify(stats)


@app.route("/api/leaderboard", methods=["GET"])
def api_get_leaderboard():
    """Get leaderboard"""
    limit = request.args.get("limit", 100, type=int)
    leaderboard = game.get_leaderboard(limit)
    return jsonify({"leaderboard": leaderboard})


@app.route("/api/achievements", methods=["GET"])
def api_get_achievements():
    """Get all achievements"""
    user_achievements = []
    if "user_id" in session:
        user = game.get_user(session["user_id"])
        if user:
            user_achievements = user.achievements

    achievements = [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description if not a.secret or a.id in user_achievements else "???",
            "icon": a.icon,
            "earned": a.id in user_achievements,
            "secret": a.secret
        }
        for a in ACHIEVEMENTS.values()
    ]

    return jsonify({"achievements": achievements})


@app.route("/api/rewards", methods=["GET"])
def api_get_rewards():
    """Get user rewards"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    user = game.get_user(session["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    rewards = [
        {
            "type": r.type.value,
            "amount": r.amount,
            "description": r.description,
            "claimed": r.claimed,
            "claim_code": r.claim_code if not r.claimed else None
        }
        for r in user.rewards
    ]

    return jsonify({"rewards": rewards})


@app.route("/api/claim", methods=["POST"])
def api_claim_reward():
    """Claim a reward"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.json
    claim_code = data.get("claim_code", "")

    result = game.claim_reward(session["user_id"], claim_code)
    return jsonify(result)


@app.route("/api/integrate/<platform>", methods=["POST"])
def api_integrate(platform):
    """Integrate with other platforms"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    user = game.get_user(session["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    if platform == "profithack":
        result = PlatformIntegration.integrate_profithack(user.id, user.total_points)
    elif platform == "synthclone":
        achievement = request.json.get("achievement", "")
        result = PlatformIntegration.integrate_synthclone(user.id, achievement)
    elif platform == "ai_influencer":
        result = PlatformIntegration.integrate_ai_influencer(user.id, user.level)
    else:
        return jsonify({"error": "Unknown platform"}), 400

    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
