"""Master Integration Hub
Connects all platforms together:
- AI Influencer Studio (3D mesh generation)
- Real vs AI Survey (gamified detection)
- ProfitHack AI (monetization platform)
- SynthClone (voice cloning)
- Digital Twin (video generation)

Features:
- Unified user accounts
- Cross-platform rewards
- Shared credits/tokens
- API gateway
"""
import os
import json
import hashlib
import time
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any
from enum import Enum
import uuid


class Platform(Enum):
    AI_INFLUENCER = "ai_influencer"
    SURVEY = "real_or_ai"
    PROFITHACK = "profithack"
    SYNTHCLONE = "synthclone"
    DIGITAL_TWIN = "digital_twin"


@dataclass
class UnifiedUser:
    """Unified user account across all platforms"""
    id: str
    email: str
    username: str

    # Platform-specific IDs
    platform_ids: Dict[str, str] = field(default_factory=dict)

    # Unified wallet
    credits: int = 0
    tokens: int = 0
    cash_balance: float = 0.0

    # Subscription
    subscription_tier: str = "free"  # free, basic, pro, enterprise
    subscription_expires: str = ""

    # Stats across platforms
    total_ai_generated: int = 0
    total_voices_cloned: int = 0
    total_videos_created: int = 0
    survey_accuracy: float = 0.0
    survey_points: int = 0

    # Achievements
    achievements: List[str] = field(default_factory=list)

    # Timestamps
    created_at: str = ""
    last_active: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        self.last_active = datetime.now().isoformat()


@dataclass
class CrossPlatformReward:
    """Reward that can be used across platforms"""
    id: str
    user_id: str
    source_platform: Platform
    reward_type: str  # credits, tokens, subscription_days, feature_unlock
    amount: float
    description: str
    redeemable_on: List[Platform]
    redeemed: bool = False
    redeemed_on: Optional[Platform] = None
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()


class IntegrationHub:
    """Central hub for all platform integrations"""

    def __init__(self, data_dir: str = "/root/ai_influencer_studio/integrations/data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

        self.users: Dict[str, UnifiedUser] = {}
        self.rewards: Dict[str, CrossPlatformReward] = {}

        # Platform endpoints (would be real URLs in production)
        self.endpoints = {
            Platform.AI_INFLUENCER: "http://localhost:5000",
            Platform.SURVEY: "http://localhost:5050",
            Platform.PROFITHACK: "http://localhost:5100",
            Platform.SYNTHCLONE: "http://localhost:5200",
            Platform.DIGITAL_TWIN: "http://localhost:5300",
        }

        self._load_data()

    def _load_data(self):
        """Load saved data"""
        users_file = f"{self.data_dir}/unified_users.json"
        if os.path.exists(users_file):
            with open(users_file, 'r') as f:
                data = json.load(f)
                for uid, udata in data.items():
                    self.users[uid] = UnifiedUser(**udata)

    def _save_data(self):
        """Save data to disk"""
        users_file = f"{self.data_dir}/unified_users.json"
        with open(users_file, 'w') as f:
            json.dump({uid: asdict(u) for uid, u in self.users.items()}, f, indent=2)

    # ==================== User Management ====================

    def create_unified_account(self, email: str, username: str) -> UnifiedUser:
        """Create a new unified account"""
        user_id = str(uuid.uuid4())
        user = UnifiedUser(
            id=user_id,
            email=email,
            username=username,
            credits=100,  # Welcome bonus
            tokens=10
        )
        self.users[user_id] = user
        self._save_data()
        return user

    def link_platform_account(self, unified_id: str, platform: Platform, platform_user_id: str) -> bool:
        """Link a platform-specific account to unified account"""
        if unified_id not in self.users:
            return False

        self.users[unified_id].platform_ids[platform.value] = platform_user_id
        self._save_data()
        return True

    def get_user(self, unified_id: str) -> Optional[UnifiedUser]:
        """Get unified user"""
        return self.users.get(unified_id)

    def find_by_email(self, email: str) -> Optional[UnifiedUser]:
        """Find user by email"""
        for user in self.users.values():
            if user.email == email:
                return user
        return None

    # ==================== Credits & Tokens ====================

    def add_credits(self, user_id: str, amount: int, source: str = "") -> bool:
        """Add credits to user account"""
        if user_id not in self.users:
            return False

        self.users[user_id].credits += amount
        self._save_data()
        return True

    def spend_credits(self, user_id: str, amount: int, purpose: str = "") -> bool:
        """Spend credits from user account"""
        if user_id not in self.users:
            return False

        if self.users[user_id].credits < amount:
            return False

        self.users[user_id].credits -= amount
        self._save_data()
        return True

    def transfer_credits(self, from_user: str, to_user: str, amount: int) -> bool:
        """Transfer credits between users"""
        if from_user not in self.users or to_user not in self.users:
            return False

        if self.users[from_user].credits < amount:
            return False

        self.users[from_user].credits -= amount
        self.users[to_user].credits += amount
        self._save_data()
        return True

    # ==================== Cross-Platform Rewards ====================

    def create_reward(self, user_id: str, source: Platform, reward_type: str,
                     amount: float, description: str, 
                     redeemable_on: List[Platform] = None) -> CrossPlatformReward:
        """Create a cross-platform reward"""
        if redeemable_on is None:
            redeemable_on = list(Platform)

        reward = CrossPlatformReward(
            id=str(uuid.uuid4()),
            user_id=user_id,
            source_platform=source,
            reward_type=reward_type,
            amount=amount,
            description=description,
            redeemable_on=redeemable_on
        )

        self.rewards[reward.id] = reward
        return reward

    def redeem_reward(self, reward_id: str, platform: Platform) -> Dict:
        """Redeem a reward on a specific platform"""
        if reward_id not in self.rewards:
            return {"error": "Reward not found"}

        reward = self.rewards[reward_id]

        if reward.redeemed:
            return {"error": "Reward already redeemed"}

        if platform not in reward.redeemable_on:
            return {"error": f"Reward not redeemable on {platform.value}"}

        # Apply reward
        user = self.users.get(reward.user_id)
        if not user:
            return {"error": "User not found"}

        if reward.reward_type == "credits":
            user.credits += int(reward.amount)
        elif reward.reward_type == "tokens":
            user.tokens += int(reward.amount)
        elif reward.reward_type == "subscription_days":
            # Extend subscription
            pass
        elif reward.reward_type == "cash":
            user.cash_balance += reward.amount

        reward.redeemed = True
        reward.redeemed_on = platform
        self._save_data()

        return {
            "success": True,
            "reward_type": reward.reward_type,
            "amount": reward.amount,
            "platform": platform.value
        }

    # ==================== Platform Sync ====================

    def sync_survey_stats(self, user_id: str, points: int, accuracy: float):
        """Sync stats from Real or AI survey"""
        if user_id not in self.users:
            return

        self.users[user_id].survey_points = points
        self.users[user_id].survey_accuracy = accuracy

        # Convert survey points to credits (10 points = 1 credit)
        credits_earned = points // 10
        if credits_earned > 0:
            self.users[user_id].credits += credits_earned

        self._save_data()

    def sync_ai_generation(self, user_id: str, count: int = 1):
        """Track AI influencer generations"""
        if user_id not in self.users:
            return

        self.users[user_id].total_ai_generated += count
        self._save_data()

    def sync_voice_clone(self, user_id: str, count: int = 1):
        """Track voice clones"""
        if user_id not in self.users:
            return

        self.users[user_id].total_voices_cloned += count
        self._save_data()

    def sync_video_creation(self, user_id: str, count: int = 1):
        """Track video creations"""
        if user_id not in self.users:
            return

        self.users[user_id].total_videos_created += count
        self._save_data()

    # ==================== Feature Access ====================

    def check_feature_access(self, user_id: str, feature: str) -> Dict:
        """Check if user has access to a feature"""
        if user_id not in self.users:
            return {"access": False, "reason": "User not found"}

        user = self.users[user_id]

        # Feature requirements
        requirements = {
            # AI Influencer features
            "custom_freckles": {"level": 5, "credits": 0},
            "advanced_skin_textures": {"level": 10, "credits": 0},
            "custom_personas": {"level": 15, "credits": 50},
            "unlimited_exports": {"subscription": "pro"},
            "api_access": {"subscription": "enterprise"},

            # SynthClone features
            "premium_voices": {"survey_accuracy": 80},
            "unlimited_clones": {"achievement": "impossible_master"},
            "hd_export": {"achievement": "centurion"},

            # Survey features
            "expert_mode": {"survey_points": 500},
            "impossible_mode": {"survey_points": 2000},
        }

        if feature not in requirements:
            return {"access": True}  # Unknown features are allowed

        req = requirements[feature]

        # Check level
        if "level" in req:
            level = (user.survey_points // 1000) + 1
            if level < req["level"]:
                return {"access": False, "reason": f"Requires level {req['level']}"}

        # Check credits
        if "credits" in req and user.credits < req["credits"]:
            return {"access": False, "reason": f"Requires {req['credits']} credits"}

        # Check subscription
        if "subscription" in req:
            tier_order = ["free", "basic", "pro", "enterprise"]
            if tier_order.index(user.subscription_tier) < tier_order.index(req["subscription"]):
                return {"access": False, "reason": f"Requires {req['subscription']} subscription"}

        # Check survey accuracy
        if "survey_accuracy" in req and user.survey_accuracy < req["survey_accuracy"]:
            return {"access": False, "reason": f"Requires {req['survey_accuracy']}% survey accuracy"}

        # Check survey points
        if "survey_points" in req and user.survey_points < req["survey_points"]:
            return {"access": False, "reason": f"Requires {req['survey_points']} survey points"}

        # Check achievement
        if "achievement" in req and req["achievement"] not in user.achievements:
            return {"access": False, "reason": f"Requires '{req['achievement']}' achievement"}

        return {"access": True}

    # ==================== Pricing ====================

    def get_pricing(self) -> Dict:
        """Get pricing for all services"""
        return {
            "ai_influencer": {
                "basic_mesh": {"credits": 10, "usd": 2.00},
                "detailed_mesh": {"credits": 25, "usd": 5.00},
                "ultra_realistic": {"credits": 50, "usd": 10.00},
                "custom_persona": {"credits": 100, "usd": 20.00},
                "full_package": {"credits": 200, "usd": 40.00},  # Mesh + Voice + Animations
            },
            "voice_clone": {
                "basic_clone": {"credits": 15, "usd": 3.00},
                "hd_clone": {"credits": 30, "usd": 6.00},
                "emotional_range": {"credits": 50, "usd": 10.00},
            },
            "video_generation": {
                "30_second": {"credits": 20, "usd": 4.00},
                "60_second": {"credits": 35, "usd": 7.00},
                "custom_length": {"credits": 50, "usd": 10.00},
            },
            "subscriptions": {
                "basic": {"monthly": 9.99, "yearly": 99.99, "credits_monthly": 100},
                "pro": {"monthly": 29.99, "yearly": 299.99, "credits_monthly": 500},
                "enterprise": {"monthly": 99.99, "yearly": 999.99, "credits_monthly": 2000},
            },
            "credit_packs": {
                "starter": {"credits": 100, "usd": 10.00},
                "popular": {"credits": 500, "usd": 40.00},
                "pro": {"credits": 1000, "usd": 70.00},
                "enterprise": {"credits": 5000, "usd": 300.00},
            }
        }

    # ==================== Analytics ====================

    def get_platform_stats(self) -> Dict:
        """Get overall platform statistics"""
        total_users = len(self.users)
        total_credits = sum(u.credits for u in self.users.values())
        total_ai_generated = sum(u.total_ai_generated for u in self.users.values())
        total_voices = sum(u.total_voices_cloned for u in self.users.values())
        total_videos = sum(u.total_videos_created for u in self.users.values())
        avg_accuracy = sum(u.survey_accuracy for u in self.users.values()) / max(1, total_users)

        return {
            "total_users": total_users,
            "total_credits_in_circulation": total_credits,
            "total_ai_influencers_generated": total_ai_generated,
            "total_voices_cloned": total_voices,
            "total_videos_created": total_videos,
            "average_survey_accuracy": round(avg_accuracy, 1),
            "platforms_connected": len(self.endpoints)
        }


# Pricing tiers for the complete system
COMPLETE_PRICING = {
    "starter": {
        "price": 200,
        "credits": 1000,
        "features": [
            "5 AI Influencer personas",
            "Basic mesh generation",
            "Standard skin textures",
            "OBJ/GLB export",
            "Survey game access",
            "Basic voice cloning (3 voices)",
            "Email support"
        ]
    },
    "professional": {
        "price": 500,
        "credits": 3000,
        "features": [
            "Unlimited AI personas",
            "Ultra-realistic mesh generation",
            "Advanced skin (freckles, pores, imperfections)",
            "All export formats",
            "Full survey game + rewards",
            "HD voice cloning (10 voices)",
            "Animation presets",
            "Priority support",
            "API access"
        ]
    },
    "enterprise": {
        "price": 1500,
        "credits": 10000,
        "features": [
            "Everything in Professional",
            "Custom persona development",
            "White-label solution",
            "Unlimited voice cloning",
            "Custom animations",
            "Video generation",
            "Platform integration",
            "Dedicated support",
            "Source code access",
            "Commercial license"
        ]
    },
    "lifetime": {
        "price": 5000,
        "credits": 50000,
        "features": [
            "Everything in Enterprise",
            "Lifetime updates",
            "Priority feature requests",
            "1-on-1 onboarding",
            "Custom development hours (10)",
            "Reseller rights"
        ]
    }
}
