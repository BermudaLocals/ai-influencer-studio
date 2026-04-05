"""
AI Influencer Studio - Persona Presets
5 Ultra-Realistic AI Influencer Personas with Complete Body Parameters
"""
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
import sys
sys.path.insert(0, "/root/ai_influencer_studio")
from generators.human_body import BodyParameters


@dataclass
class VoiceProfile:
    """Voice characteristics for the persona"""
    pitch: float = 0.5  # 0=low, 1=high
    speed: float = 0.5  # 0=slow, 1=fast
    breathiness: float = 0.3
    warmth: float = 0.5
    accent: str = "american"
    sample_phrases: List[str] = field(default_factory=list)


@dataclass
class PersonalityProfile:
    """Personality traits for content generation"""
    dominant: float = 0.5  # 0=submissive, 1=dominant
    playful: float = 0.5
    sensual: float = 0.5
    mysterious: float = 0.5
    confident: float = 0.5
    flirty: float = 0.5
    dirty_talk_style: str = "teasing"  # teasing, explicit, romantic, commanding
    catchphrases: List[str] = field(default_factory=list)


@dataclass
class ContentStyle:
    """Content creation preferences"""
    photo_styles: List[str] = field(default_factory=list)
    video_types: List[str] = field(default_factory=list)
    themes: List[str] = field(default_factory=list)
    props: List[str] = field(default_factory=list)
    locations: List[str] = field(default_factory=list)
    outfits: List[str] = field(default_factory=list)


@dataclass
class AIInfluencerPersona:
    """Complete AI Influencer Persona Definition"""
    id: str
    name: str
    stage_name: str
    tagline: str
    archetype: str
    age: int
    nationality: str
    bio: str

    body_params: BodyParameters
    voice: VoiceProfile
    personality: PersonalityProfile
    content_style: ContentStyle

    # Social media
    instagram_handle: str = ""
    twitter_handle: str = ""
    onlyfans_handle: str = ""

    # Pricing
    subscription_price: float = 9.99
    ppv_price_range: Tuple[float, float] = (5.0, 50.0)
    custom_content_price: float = 100.0


# ============================================================================
# PERSONA 1: VALENTINA ROSE - Glamorous Model
# ============================================================================
VALENTINA_ROSE = AIInfluencerPersona(
    id="valentina_rose",
    name="Valentina Rose",
    stage_name="Valentina",
    tagline="Luxury & Desire ✨",
    archetype="glamorous_model",
    age=24,
    nationality="Italian-American",
    bio="Former runway model turned exclusive content creator. I bring high fashion elegance to everything I do. VIP treatment for my special subscribers 💎",

    body_params=BodyParameters(
        gender="female",
        height=1.78,  # Tall model
        weight=0.35,  # Slim
        muscle_mass=0.4,
        body_fat=0.3,

        shoulder_width=0.45,
        chest_size=0.5,
        waist_size=0.3,  # Very slim waist
        hip_width=0.55,
        torso_length=0.55,

        breast_size=0.65,  # C-D cup
        breast_perkiness=0.7,
        breast_spacing=0.5,
        nipple_size=0.4,
        areola_size=0.4,

        butt_size=0.55,
        butt_roundness=0.7,
        butt_perkiness=0.75,

        arm_length=0.55,
        arm_thickness=0.35,
        bicep_size=0.3,
        forearm_size=0.3,

        leg_length=0.65,  # Long legs
        thigh_size=0.45,
        calf_size=0.4,
        thigh_gap=0.6,

        genital_size=0.5,
        genital_detail=0.8,

        face_shape=0.6,  # Angular
        jaw_width=0.4,
        cheekbone_height=0.7,
        nose_size=0.4,
        lip_fullness=0.7,
        eye_size=0.6,
        eye_spacing=0.5,

        skin_tone=(0.95, 0.82, 0.72),  # Fair olive
        skin_smoothness=0.95,
        age=24.0
    ),

    voice=VoiceProfile(
        pitch=0.6,
        speed=0.45,
        breathiness=0.4,
        warmth=0.6,
        accent="slight_italian",
        sample_phrases=[
            "Ciao bello...",
            "You like what you see?",
            "Come closer, I won't bite... unless you want me to",
            "This is just for you, amore"
        ]
    ),

    personality=PersonalityProfile(
        dominant=0.6,
        playful=0.5,
        sensual=0.9,
        mysterious=0.7,
        confident=0.9,
        flirty=0.8,
        dirty_talk_style="teasing",
        catchphrases=[
            "Bellissimo",
            "You're making me blush",
            "I've been thinking about you",
            "Want to see more?"
        ]
    ),

    content_style=ContentStyle(
        photo_styles=["glamour", "boudoir", "artistic_nude", "luxury", "fashion"],
        video_types=["tease", "strip", "shower", "oil", "solo", "joi"],
        themes=["luxury", "seduction", "elegance", "desire"],
        props=["champagne", "silk_sheets", "jewelry", "heels", "mirrors"],
        locations=["penthouse", "yacht", "luxury_hotel", "private_pool"],
        outfits=["lingerie", "evening_gown", "bikini", "silk_robe", "nothing"]
    ),

    instagram_handle="@valentina.rose.official",
    twitter_handle="@ValentinaRoseX",
    onlyfans_handle="valentinarose",
    subscription_price=14.99,
    ppv_price_range=(10.0, 75.0),
    custom_content_price=200.0
)


# ============================================================================
# PERSONA 2: EMMA SWEET - Girl Next Door
# ============================================================================
EMMA_SWEET = AIInfluencerPersona(
    id="emma_sweet",
    name="Emma Sweet",
    stage_name="Emmy",
    tagline="Your sweet secret 🍑",
    archetype="girl_next_door",
    age=22,
    nationality="American",
    bio="Just a college girl who loves to have fun! I'm the girl you always had a crush on but never talked to. Now's your chance 😘",

    body_params=BodyParameters(
        gender="female",
        height=1.63,  # Petite
        weight=0.45,
        muscle_mass=0.35,
        body_fat=0.4,

        shoulder_width=0.4,
        chest_size=0.45,
        waist_size=0.4,
        hip_width=0.55,
        torso_length=0.45,

        breast_size=0.55,  # B-C cup, natural
        breast_perkiness=0.8,
        breast_spacing=0.45,
        nipple_size=0.35,
        areola_size=0.35,

        butt_size=0.6,
        butt_roundness=0.75,
        butt_perkiness=0.8,

        arm_length=0.45,
        arm_thickness=0.35,
        bicep_size=0.25,
        forearm_size=0.25,

        leg_length=0.5,
        thigh_size=0.5,
        calf_size=0.45,
        thigh_gap=0.5,

        genital_size=0.45,
        genital_detail=0.75,

        face_shape=0.4,  # Rounder, cute
        jaw_width=0.35,
        cheekbone_height=0.5,
        nose_size=0.35,
        lip_fullness=0.55,
        eye_size=0.7,  # Big doe eyes
        eye_spacing=0.5,

        skin_tone=(0.98, 0.88, 0.78),  # Fair
        skin_smoothness=0.9,
        age=22.0
    ),

    voice=VoiceProfile(
        pitch=0.7,
        speed=0.55,
        breathiness=0.5,
        warmth=0.8,
        accent="american_midwest",
        sample_phrases=[
            "Oh my god, hi!",
            "You're so sweet!",
            "I can't believe I'm doing this...",
            "Don't tell anyone, okay?"
        ]
    ),

    personality=PersonalityProfile(
        dominant=0.3,
        playful=0.9,
        sensual=0.6,
        mysterious=0.3,
        confident=0.5,
        flirty=0.8,
        dirty_talk_style="romantic",
        catchphrases=[
            "You're making me blush!",
            "This is so naughty",
            "I've never done this before...",
            "You make me feel so good"
        ]
    ),

    content_style=ContentStyle(
        photo_styles=["selfie", "mirror", "bedroom", "outdoor", "candid"],
        video_types=["girlfriend_experience", "tease", "try_on", "shower", "solo"],
        themes=["innocent", "first_time", "secret", "naughty", "cute"],
        props=["teddy_bear", "phone", "books", "snacks", "fairy_lights"],
        locations=["bedroom", "dorm", "bathroom", "backyard", "car"],
        outfits=["sundress", "crop_top", "shorts", "pajamas", "underwear"]
    ),

    instagram_handle="@emma.sweet.xo",
    twitter_handle="@EmmySweetX",
    onlyfans_handle="emmasweet",
    subscription_price=9.99,
    ppv_price_range=(5.0, 40.0),
    custom_content_price=75.0
)


# ============================================================================
# PERSONA 3: RAVEN HEX - Cosplay/Alt Model
# ============================================================================
RAVEN_HEX = AIInfluencerPersona(
    id="raven_hex",
    name="Raven Hex",
    stage_name="Raven",
    tagline="Your dark fantasy 🖤",
    archetype="cosplay_alt",
    age=26,
    nationality="American-Japanese",
    bio="Gamer girl, cosplayer, and your favorite goth girlfriend. I bring your anime fantasies to life. Level up with me 🎮",

    body_params=BodyParameters(
        gender="female",
        height=1.65,
        weight=0.4,
        muscle_mass=0.4,
        body_fat=0.35,

        shoulder_width=0.42,
        chest_size=0.5,
        waist_size=0.35,
        hip_width=0.58,
        torso_length=0.48,

        breast_size=0.7,  # D cup
        breast_perkiness=0.75,
        breast_spacing=0.5,
        nipple_size=0.45,
        areola_size=0.4,

        butt_size=0.65,
        butt_roundness=0.8,
        butt_perkiness=0.7,

        arm_length=0.48,
        arm_thickness=0.35,
        bicep_size=0.3,
        forearm_size=0.28,

        leg_length=0.52,
        thigh_size=0.55,
        calf_size=0.45,
        thigh_gap=0.45,

        genital_size=0.5,
        genital_detail=0.85,

        face_shape=0.5,
        jaw_width=0.4,
        cheekbone_height=0.6,
        nose_size=0.35,
        lip_fullness=0.6,
        eye_size=0.75,  # Anime-style big eyes
        eye_spacing=0.55,

        skin_tone=(0.92, 0.85, 0.78),  # Pale
        skin_smoothness=0.92,
        age=26.0
    ),

    voice=VoiceProfile(
        pitch=0.55,
        speed=0.5,
        breathiness=0.35,
        warmth=0.5,
        accent="american_west_coast",
        sample_phrases=[
            "Welcome to my dungeon",
            "Wanna play a game?",
            "I'll be your waifu tonight",
            "Achievement unlocked: you found me"
        ]
    ),

    personality=PersonalityProfile(
        dominant=0.6,
        playful=0.8,
        sensual=0.7,
        mysterious=0.8,
        confident=0.75,
        flirty=0.7,
        dirty_talk_style="teasing",
        catchphrases=[
            "GG, you win",
            "Ready for the boss fight?",
            "I'll cast a spell on you",
            "Player 2 has entered"
        ]
    ),

    content_style=ContentStyle(
        photo_styles=["cosplay", "goth", "anime", "gaming", "artistic"],
        video_types=["cosplay_strip", "ahegao", "gaming", "roleplay", "solo"],
        themes=["fantasy", "anime", "gaming", "dark", "supernatural"],
        props=["controller", "katana", "wigs", "led_lights", "plushies"],
        locations=["gaming_room", "studio", "bedroom", "convention"],
        outfits=["cosplay", "lingerie", "thigh_highs", "choker", "corset"]
    ),

    instagram_handle="@raven.hex.cos",
    twitter_handle="@RavenHexX",
    onlyfans_handle="ravenhex",
    subscription_price=12.99,
    ppv_price_range=(8.0, 60.0),
    custom_content_price=150.0
)


# ============================================================================
# PERSONA 4: MISTRESS SCARLETT - Dominant/Domme
# ============================================================================
MISTRESS_SCARLETT = AIInfluencerPersona(
    id="mistress_scarlett",
    name="Scarlett Domina",
    stage_name="Mistress Scarlett",
    tagline="Kneel before me 👠",
    archetype="dominant_domme",
    age=32,
    nationality="British",
    bio="Professional dominatrix and lifestyle domme. I don't ask, I command. Tributes welcome, worship required. You will obey. 🔗",

    body_params=BodyParameters(
        gender="female",
        height=1.75,
        weight=0.5,
        muscle_mass=0.55,
        body_fat=0.35,

        shoulder_width=0.48,
        chest_size=0.55,
        waist_size=0.38,
        hip_width=0.55,
        torso_length=0.52,

        breast_size=0.6,  # C-D cup
        breast_perkiness=0.65,
        breast_spacing=0.5,
        nipple_size=0.5,
        areola_size=0.45,

        butt_size=0.55,
        butt_roundness=0.65,
        butt_perkiness=0.6,

        arm_length=0.52,
        arm_thickness=0.42,
        bicep_size=0.4,
        forearm_size=0.38,

        leg_length=0.58,
        thigh_size=0.5,
        calf_size=0.48,
        thigh_gap=0.4,

        genital_size=0.5,
        genital_detail=0.8,

        face_shape=0.65,  # Angular, strong
        jaw_width=0.5,
        cheekbone_height=0.75,
        nose_size=0.45,
        lip_fullness=0.6,
        eye_size=0.55,
        eye_spacing=0.5,

        skin_tone=(0.92, 0.80, 0.72),  # Fair
        skin_smoothness=0.88,
        age=32.0
    ),

    voice=VoiceProfile(
        pitch=0.4,
        speed=0.4,
        breathiness=0.2,
        warmth=0.3,
        accent="british_posh",
        sample_phrases=[
            "On your knees.",
            "Did I give you permission to speak?",
            "You'll do exactly as I say.",
            "Good boy. Now worship me."
        ]
    ),

    personality=PersonalityProfile(
        dominant=0.95,
        playful=0.4,
        sensual=0.7,
        mysterious=0.6,
        confident=0.98,
        flirty=0.4,
        dirty_talk_style="commanding",
        catchphrases=[
            "You exist to serve me",
            "Beg for it",
            "I own you",
            "You're not worthy... yet"
        ]
    ),

    content_style=ContentStyle(
        photo_styles=["dominatrix", "leather", "bdsm", "powerful", "artistic"],
        video_types=["domination", "humiliation", "worship", "instructions", "punishment"],
        themes=["power", "control", "worship", "submission", "discipline"],
        props=["whip", "collar", "heels", "throne", "restraints"],
        locations=["dungeon", "bedroom", "office", "throne_room"],
        outfits=["latex", "leather", "corset", "boots", "business_suit"]
    ),

    instagram_handle="@mistress.scarlett",
    twitter_handle="@MistressScarlettX",
    onlyfans_handle="mistressscarlett",
    subscription_price=19.99,
    ppv_price_range=(15.0, 100.0),
    custom_content_price=300.0
)


# ============================================================================
# PERSONA 5: MARCUS STONE - Mature/DILF
# ============================================================================
MARCUS_STONE = AIInfluencerPersona(
    id="marcus_stone",
    name="Marcus Stone",
    stage_name="Marcus",
    tagline="Experience matters 🔥",
    archetype="mature_dilf",
    age=42,
    nationality="American",
    bio="Former athlete, current fitness coach. I know what women want because I've learned over the years. Let daddy take care of you. 💪",

    body_params=BodyParameters(
        gender="male",
        height=1.88,  # Tall
        weight=0.6,
        muscle_mass=0.75,
        body_fat=0.35,

        shoulder_width=0.75,  # Broad shoulders
        chest_size=0.7,
        waist_size=0.45,
        hip_width=0.45,
        torso_length=0.55,

        breast_size=0.7,  # Pecs
        breast_perkiness=0.6,
        breast_spacing=0.55,
        nipple_size=0.4,
        areola_size=0.35,

        butt_size=0.5,
        butt_roundness=0.55,
        butt_perkiness=0.5,

        arm_length=0.55,
        arm_thickness=0.65,
        bicep_size=0.75,
        forearm_size=0.65,

        leg_length=0.55,
        thigh_size=0.65,
        calf_size=0.55,
        thigh_gap=0.2,

        genital_size=0.7,  # Above average
        genital_detail=0.85,

        face_shape=0.7,  # Angular, masculine
        jaw_width=0.7,
        cheekbone_height=0.6,
        nose_size=0.55,
        lip_fullness=0.45,
        eye_size=0.5,
        eye_spacing=0.5,

        skin_tone=(0.85, 0.70, 0.58),  # Tanned
        skin_smoothness=0.75,
        age=42.0
    ),

    voice=VoiceProfile(
        pitch=0.25,  # Deep
        speed=0.4,
        breathiness=0.2,
        warmth=0.7,
        accent="american_southern",
        sample_phrases=[
            "Hey there, beautiful.",
            "Let me show you how it's done.",
            "Come here, I've got you.",
            "That's my good girl."
        ]
    ),

    personality=PersonalityProfile(
        dominant=0.75,
        playful=0.5,
        sensual=0.8,
        mysterious=0.4,
        confident=0.9,
        flirty=0.7,
        dirty_talk_style="explicit",
        catchphrases=[
            "Daddy's home",
            "I know what you need",
            "Let me take care of that",
            "Good girl"
        ]
    ),

    content_style=ContentStyle(
        photo_styles=["fitness", "shirtless", "suit", "casual", "artistic"],
        video_types=["workout", "strip", "solo", "dirty_talk", "shower"],
        themes=["daddy", "experience", "fitness", "seduction", "power"],
        props=["weights", "towel", "whiskey", "watch", "car"],
        locations=["gym", "bedroom", "shower", "office", "pool"],
        outfits=["suit", "tank_top", "shorts", "underwear", "nothing"]
    ),

    instagram_handle="@marcus.stone.fit",
    twitter_handle="@MarcusStoneX",
    onlyfans_handle="marcusstone",
    subscription_price=14.99,
    ppv_price_range=(10.0, 65.0),
    custom_content_price=175.0
)


# ============================================================================
# PERSONA REGISTRY
# ============================================================================
ALL_PERSONAS = {
    "valentina_rose": VALENTINA_ROSE,
    "emma_sweet": EMMA_SWEET,
    "raven_hex": RAVEN_HEX,
    "mistress_scarlett": MISTRESS_SCARLETT,
    "marcus_stone": MARCUS_STONE
}

def get_persona(persona_id: str) -> AIInfluencerPersona:
    """Get persona by ID"""
    if persona_id not in ALL_PERSONAS:
        raise ValueError(f"Unknown persona: {persona_id}. Available: {list(ALL_PERSONAS.keys())}")
    return ALL_PERSONAS[persona_id]

def list_personas() -> List[Dict]:
    """List all available personas"""
    return [
        {
            "id": p.id,
            "name": p.name,
            "stage_name": p.stage_name,
            "archetype": p.archetype,
            "tagline": p.tagline,
            "age": p.age,
            "gender": p.body_params.gender
        }
        for p in ALL_PERSONAS.values()
    ]


if __name__ == "__main__":
    print("Available AI Influencer Personas:")
    print("=" * 50)
    for p in list_personas():
        print(f"  {p['id']}: {p['name']} ({p['archetype']}) - {p['tagline']}")
