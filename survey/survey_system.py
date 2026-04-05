"""Real vs AI Survey System
A gamified survey where users try to distinguish between real humans and AI-generated influencers.
Features:
- Ultra-realistic AI images with freckles, pores, imperfections
- Real human comparison images
- Scoring system with rewards
- Integration with ProfitHack AI, SynthClone, and other platforms
- Leaderboards and achievements
- Crypto/token rewards
"""
import os
import json
import random
import hashlib
import time
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple
from enum import Enum
import uuid


class Difficulty(Enum):
    EASY = "easy"           # Obvious differences
    MEDIUM = "medium"       # Subtle differences
    HARD = "hard"           # Nearly indistinguishable
    EXPERT = "expert"       # Pixel-perfect AI
    IMPOSSIBLE = "impossible"  # Even experts can't tell


class RewardType(Enum):
    POINTS = "points"
    TOKENS = "tokens"       # Crypto tokens
    CREDITS = "credits"     # Platform credits
    CASH = "cash"           # Real money
    NFT = "nft"             # NFT rewards
    SUBSCRIPTION = "subscription"  # Free subscription time


@dataclass
class Reward:
    type: RewardType
    amount: float
    description: str
    claimed: bool = False
    claim_code: str = ""

    def __post_init__(self):
        if not self.claim_code:
            self.claim_code = hashlib.md5(f"{self.type.value}{self.amount}{time.time()}".encode()).hexdigest()[:12].upper()


@dataclass
class SurveyImage:
    id: str
    image_path: str
    is_ai: bool
    difficulty: Difficulty
    persona_id: Optional[str] = None  # If AI, which persona
    source: str = ""  # Source of real image or AI generator
    features: List[str] = field(default_factory=list)  # Notable features (freckles, etc)
    metadata: Dict = field(default_factory=dict)


@dataclass
class SurveyQuestion:
    id: str
    images: List[SurveyImage]  # Can be single or comparison
    question_type: str = "single"  # single, comparison, spot_the_ai
    time_limit: int = 30  # seconds
    points: int = 10
    hint_available: bool = True
    hint_cost: int = 5  # points to use hint


@dataclass
class UserAnswer:
    question_id: str
    user_guess: bool  # True = thinks it's AI
    correct: bool
    time_taken: float
    used_hint: bool = False
    confidence: int = 50  # 0-100


@dataclass
class UserProfile:
    id: str
    username: str
    email: str = ""
    total_points: int = 0
    total_correct: int = 0
    total_answered: int = 0
    streak: int = 0
    best_streak: int = 0
    level: int = 1
    xp: int = 0
    rewards: List[Reward] = field(default_factory=list)
    achievements: List[str] = field(default_factory=list)
    answers: List[UserAnswer] = field(default_factory=list)
    created_at: str = ""
    last_active: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        self.last_active = datetime.now().isoformat()

    @property
    def accuracy(self) -> float:
        if self.total_answered == 0:
            return 0.0
        return (self.total_correct / self.total_answered) * 100

    def add_xp(self, amount: int):
        self.xp += amount
        # Level up every 1000 XP
        new_level = (self.xp // 1000) + 1
        if new_level > self.level:
            self.level = new_level
            return True  # Leveled up
        return False


@dataclass
class Achievement:
    id: str
    name: str
    description: str
    icon: str
    requirement: Dict
    reward: Reward
    secret: bool = False


# Achievement definitions
ACHIEVEMENTS = {
    "first_correct": Achievement(
        id="first_correct",
        name="Eagle Eye",
        description="Get your first correct answer",
        icon="🦅",
        requirement={"correct": 1},
        reward=Reward(RewardType.POINTS, 50, "First correct bonus")
    ),
    "streak_5": Achievement(
        id="streak_5",
        name="On Fire",
        description="Get 5 correct answers in a row",
        icon="🔥",
        requirement={"streak": 5},
        reward=Reward(RewardType.POINTS, 100, "5 streak bonus")
    ),
    "streak_10": Achievement(
        id="streak_10",
        name="Unstoppable",
        description="Get 10 correct answers in a row",
        icon="⚡",
        requirement={"streak": 10},
        reward=Reward(RewardType.TOKENS, 10, "10 streak token reward")
    ),
    "streak_25": Achievement(
        id="streak_25",
        name="AI Detective",
        description="Get 25 correct answers in a row",
        icon="🕵️",
        requirement={"streak": 25},
        reward=Reward(RewardType.CREDITS, 50, "25 streak credits")
    ),
    "accuracy_90": Achievement(
        id="accuracy_90",
        name="Sharp Shooter",
        description="Maintain 90%+ accuracy over 50 questions",
        icon="🎯",
        requirement={"accuracy": 90, "min_questions": 50},
        reward=Reward(RewardType.TOKENS, 25, "High accuracy reward")
    ),
    "speed_demon": Achievement(
        id="speed_demon",
        name="Speed Demon",
        description="Answer correctly in under 3 seconds",
        icon="💨",
        requirement={"time": 3, "correct": True},
        reward=Reward(RewardType.POINTS, 75, "Speed bonus")
    ),
    "expert_hunter": Achievement(
        id="expert_hunter",
        name="Expert Hunter",
        description="Correctly identify 10 expert-level AI images",
        icon="🏆",
        requirement={"expert_correct": 10},
        reward=Reward(RewardType.CASH, 5.00, "$5 cash reward")
    ),
    "impossible_master": Achievement(
        id="impossible_master",
        name="Impossible Master",
        description="Correctly identify an impossible-level AI image",
        icon="👑",
        requirement={"impossible_correct": 1},
        reward=Reward(RewardType.NFT, 1, "Exclusive NFT reward"),
        secret=True
    ),
    "centurion": Achievement(
        id="centurion",
        name="Centurion",
        description="Answer 100 questions",
        icon="💯",
        requirement={"total_answered": 100},
        reward=Reward(RewardType.SUBSCRIPTION, 7, "7 days free premium")
    ),
    "freckle_finder": Achievement(
        id="freckle_finder",
        name="Freckle Finder",
        description="Correctly identify AI by noticing freckle patterns",
        icon="✨",
        requirement={"freckle_detection": 5},
        reward=Reward(RewardType.POINTS, 200, "Detail detection bonus")
    ),
}


class SurveyGame:
    """Main survey game engine"""

    def __init__(self, data_dir: str = "/root/ai_influencer_studio/survey/data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

        self.users: Dict[str, UserProfile] = {}
        self.questions: List[SurveyQuestion] = []
        self.leaderboard: List[Dict] = []

        self._load_data()

    def _load_data(self):
        """Load saved data"""
        users_file = f"{self.data_dir}/users.json"
        if os.path.exists(users_file):
            with open(users_file, 'r') as f:
                data = json.load(f)
                for uid, udata in data.items():
                    # Convert rewards back to Reward objects
                    rewards = [Reward(**r) if isinstance(r, dict) else r for r in udata.get('rewards', [])]
                    udata['rewards'] = rewards
                    self.users[uid] = UserProfile(**udata)

    def _save_data(self):
        """Save data to disk"""
        users_file = f"{self.data_dir}/users.json"
        data = {}
        for uid, user in self.users.items():
            user_dict = asdict(user)
            # Convert Reward objects to dicts
            user_dict['rewards'] = [asdict(r) if hasattr(r, '__dataclass_fields__') else r for r in user.rewards]
            data[uid] = user_dict
        with open(users_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)

    def register_user(self, username: str, email: str = "") -> UserProfile:
        """Register a new user"""
        user_id = str(uuid.uuid4())
        user = UserProfile(
            id=user_id,
            username=username,
            email=email
        )
        self.users[user_id] = user
        self._save_data()
        return user

    def get_user(self, user_id: str) -> Optional[UserProfile]:
        """Get user by ID"""
        return self.users.get(user_id)

    def generate_question(self, difficulty: Difficulty = None) -> SurveyQuestion:
        """Generate a new survey question"""
        if difficulty is None:
            difficulty = random.choice(list(Difficulty))

        # Determine if showing AI or real
        is_ai = random.choice([True, False])

        # Create image reference
        if is_ai:
            personas = ["valentina_rose", "emma_sweet", "raven_hex", "mistress_scarlett", "marcus_stone"]
            persona_id = random.choice(personas)
            image_path = f"/root/ai_influencer_studio/output/personas/{persona_id}/{persona_id}.glb"
            features = self._get_ai_features(persona_id, difficulty)
        else:
            image_path = f"/root/ai_influencer_studio/survey/real_images/sample_{random.randint(1,100)}.jpg"
            features = ["natural lighting", "real skin texture", "authentic expression"]

        image = SurveyImage(
            id=str(uuid.uuid4()),
            image_path=image_path,
            is_ai=is_ai,
            difficulty=difficulty,
            persona_id=persona_id if is_ai else None,
            features=features
        )

        # Points based on difficulty
        points_map = {
            Difficulty.EASY: 5,
            Difficulty.MEDIUM: 10,
            Difficulty.HARD: 20,
            Difficulty.EXPERT: 50,
            Difficulty.IMPOSSIBLE: 100
        }

        question = SurveyQuestion(
            id=str(uuid.uuid4()),
            images=[image],
            points=points_map[difficulty],
            time_limit=30 if difficulty in [Difficulty.EASY, Difficulty.MEDIUM] else 45
        )

        return question

    def _get_ai_features(self, persona_id: str, difficulty: Difficulty) -> List[str]:
        """Get notable AI features based on difficulty"""
        base_features = {
            "valentina_rose": ["subtle freckles", "high cheekbones", "green eyes"],
            "emma_sweet": ["prominent freckles", "dimples", "natural blush"],
            "raven_hex": ["pale skin", "sharp features", "dark makeup"],
            "mistress_scarlett": ["flawless skin", "defined jawline", "intense gaze"],
            "marcus_stone": ["stubble", "weathered skin", "strong brow"]
        }

        features = base_features.get(persona_id, [])

        # Add difficulty-specific features
        if difficulty == Difficulty.EASY:
            features.append("visible rendering artifacts")
        elif difficulty == Difficulty.MEDIUM:
            features.append("slightly uniform skin texture")
        elif difficulty == Difficulty.HARD:
            features.append("near-perfect skin detail")
        elif difficulty == Difficulty.EXPERT:
            features.append("photorealistic pores and freckles")
        elif difficulty == Difficulty.IMPOSSIBLE:
            features.append("indistinguishable from real")

        return features

    def submit_answer(self, user_id: str, question: SurveyQuestion, 
                     user_guess: bool, time_taken: float, 
                     confidence: int = 50, used_hint: bool = False) -> Dict:
        """Submit an answer and calculate results"""
        user = self.users.get(user_id)
        if not user:
            return {"error": "User not found"}

        # Check if correct
        actual_is_ai = question.images[0].is_ai
        correct = (user_guess == actual_is_ai)

        # Calculate points
        points = 0
        if correct:
            points = question.points
            # Bonus for confidence
            if confidence >= 80:
                points = int(points * 1.5)
            # Bonus for speed
            if time_taken < 5:
                points = int(points * 1.25)
            # Penalty for hint
            if used_hint:
                points = int(points * 0.5)

            user.total_correct += 1
            user.streak += 1
            if user.streak > user.best_streak:
                user.best_streak = user.streak
        else:
            user.streak = 0

        user.total_points += points
        user.total_answered += 1

        # Add XP
        xp_gained = points // 2 + 5
        leveled_up = user.add_xp(xp_gained)

        # Record answer
        answer = UserAnswer(
            question_id=question.id,
            user_guess=user_guess,
            correct=correct,
            time_taken=time_taken,
            used_hint=used_hint,
            confidence=confidence
        )
        user.answers.append(answer)

        # Check achievements
        new_achievements = self._check_achievements(user, answer, question)

        # Save
        self._save_data()

        return {
            "correct": correct,
            "actual_is_ai": actual_is_ai,
            "points_earned": points,
            "xp_gained": xp_gained,
            "leveled_up": leveled_up,
            "new_level": user.level if leveled_up else None,
            "streak": user.streak,
            "total_points": user.total_points,
            "accuracy": user.accuracy,
            "new_achievements": new_achievements,
            "features_hint": question.images[0].features if not correct else []
        }

    def _check_achievements(self, user: UserProfile, answer: UserAnswer, 
                           question: SurveyQuestion) -> List[Achievement]:
        """Check and award achievements"""
        new_achievements = []

        for ach_id, ach in ACHIEVEMENTS.items():
            if ach_id in user.achievements:
                continue

            earned = False
            req = ach.requirement

            if "correct" in req and req["correct"] == 1 and user.total_correct >= 1:
                earned = True
            elif "streak" in req and user.streak >= req["streak"]:
                earned = True
            elif "accuracy" in req and "min_questions" in req:
                if user.total_answered >= req["min_questions"] and user.accuracy >= req["accuracy"]:
                    earned = True
            elif "time" in req and answer.correct and answer.time_taken < req["time"]:
                earned = True
            elif "total_answered" in req and user.total_answered >= req["total_answered"]:
                earned = True

            if earned:
                user.achievements.append(ach_id)
                user.rewards.append(ach.reward)
                new_achievements.append(ach)

        return new_achievements

    def get_leaderboard(self, limit: int = 100) -> List[Dict]:
        """Get top users by points"""
        sorted_users = sorted(
            self.users.values(),
            key=lambda u: (u.total_points, u.accuracy, u.best_streak),
            reverse=True
        )

        return [
            {
                "rank": i + 1,
                "username": u.username,
                "points": u.total_points,
                "accuracy": round(u.accuracy, 1),
                "streak": u.best_streak,
                "level": u.level
            }
            for i, u in enumerate(sorted_users[:limit])
        ]

    def get_user_stats(self, user_id: str) -> Dict:
        """Get detailed user statistics"""
        user = self.users.get(user_id)
        if not user:
            return {"error": "User not found"}

        return {
            "username": user.username,
            "level": user.level,
            "xp": user.xp,
            "xp_to_next": 1000 - (user.xp % 1000),
            "total_points": user.total_points,
            "total_correct": user.total_correct,
            "total_answered": user.total_answered,
            "accuracy": round(user.accuracy, 1),
            "current_streak": user.streak,
            "best_streak": user.best_streak,
            "achievements": len(user.achievements),
            "total_achievements": len(ACHIEVEMENTS),
            "unclaimed_rewards": len([r for r in user.rewards if not r.claimed]),
            "rank": self._get_user_rank(user_id)
        }

    def _get_user_rank(self, user_id: str) -> int:
        """Get user's rank on leaderboard"""
        sorted_users = sorted(
            self.users.values(),
            key=lambda u: u.total_points,
            reverse=True
        )
        for i, u in enumerate(sorted_users):
            if u.id == user_id:
                return i + 1
        return 0

    def claim_reward(self, user_id: str, reward_code: str) -> Dict:
        """Claim a reward"""
        user = self.users.get(user_id)
        if not user:
            return {"error": "User not found"}

        for reward in user.rewards:
            if reward.claim_code == reward_code and not reward.claimed:
                reward.claimed = True
                self._save_data()
                return {
                    "success": True,
                    "reward_type": reward.type.value,
                    "amount": reward.amount,
                    "description": reward.description
                }

        return {"error": "Reward not found or already claimed"}


class PlatformIntegration:
    """Integration with other platforms"""

    @staticmethod
    def integrate_profithack(user_id: str, points: int) -> Dict:
        """Send rewards to ProfitHack AI platform"""
        # Integration endpoint
        return {
            "platform": "ProfitHack AI",
            "user_id": user_id,
            "credits_added": points // 10,
            "status": "pending"
        }

    @staticmethod
    def integrate_synthclone(user_id: str, achievement: str) -> Dict:
        """Unlock SynthClone features based on achievements"""
        unlocks = {
            "expert_hunter": "premium_voices",
            "impossible_master": "unlimited_clones",
            "centurion": "hd_export"
        }
        return {
            "platform": "SynthClone",
            "user_id": user_id,
            "feature_unlocked": unlocks.get(achievement, None),
            "status": "pending"
        }

    @staticmethod
    def integrate_ai_influencer(user_id: str, level: int) -> Dict:
        """Unlock AI Influencer features based on level"""
        unlocks = {
            5: "custom_freckles",
            10: "advanced_skin_textures",
            15: "custom_personas",
            20: "unlimited_exports",
            25: "api_access"
        }
        unlocked = [v for k, v in unlocks.items() if level >= k]
        return {
            "platform": "AI Influencer Studio",
            "user_id": user_id,
            "features_unlocked": unlocked,
            "status": "active"
        }


# Reward tiers
REWARD_TIERS = {
    "bronze": {
        "min_points": 100,
        "rewards": [
            Reward(RewardType.POINTS, 50, "Bronze tier bonus"),
        ]
    },
    "silver": {
        "min_points": 500,
        "rewards": [
            Reward(RewardType.TOKENS, 10, "Silver tier tokens"),
            Reward(RewardType.CREDITS, 25, "Silver tier credits"),
        ]
    },
    "gold": {
        "min_points": 1000,
        "rewards": [
            Reward(RewardType.TOKENS, 50, "Gold tier tokens"),
            Reward(RewardType.SUBSCRIPTION, 30, "30 days premium"),
        ]
    },
    "platinum": {
        "min_points": 5000,
        "rewards": [
            Reward(RewardType.CASH, 25.00, "$25 cash reward"),
            Reward(RewardType.NFT, 1, "Exclusive Platinum NFT"),
        ]
    },
    "diamond": {
        "min_points": 10000,
        "rewards": [
            Reward(RewardType.CASH, 100.00, "$100 cash reward"),
            Reward(RewardType.NFT, 1, "Legendary Diamond NFT"),
            Reward(RewardType.SUBSCRIPTION, 365, "1 year premium"),
        ]
    }
}
