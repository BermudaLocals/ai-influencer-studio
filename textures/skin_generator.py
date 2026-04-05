"""Ultra-Realistic Skin Texture Generator
Generates procedural skin textures with:
- Freckles
- Pores
- Skin imperfections
- Subsurface scattering maps
- Normal maps
- Roughness maps
"""
import random
import math
import struct
from dataclasses import dataclass
from typing import List, Tuple, Optional
from enum import Enum

class SkinTone(Enum):
    PALE = "pale"
    FAIR = "fair"
    LIGHT = "light"
    MEDIUM = "medium"
    OLIVE = "olive"
    TAN = "tan"
    BROWN = "brown"
    DARK = "dark"

@dataclass
class SkinColor:
    r: int
    g: int
    b: int

    def to_tuple(self) -> Tuple[int, int, int]:
        return (self.r, self.g, self.b)

    def blend(self, other: "SkinColor", factor: float) -> "SkinColor":
        return SkinColor(
            int(self.r + (other.r - self.r) * factor),
            int(self.g + (other.g - self.g) * factor),
            int(self.b + (other.b - self.b) * factor)
        )

# Realistic skin tone base colors
SKIN_TONES = {
    SkinTone.PALE: SkinColor(255, 235, 220),
    SkinTone.FAIR: SkinColor(250, 220, 196),
    SkinTone.LIGHT: SkinColor(240, 200, 170),
    SkinTone.MEDIUM: SkinColor(220, 175, 140),
    SkinTone.OLIVE: SkinColor(200, 160, 120),
    SkinTone.TAN: SkinColor(180, 140, 100),
    SkinTone.BROWN: SkinColor(140, 100, 70),
    SkinTone.DARK: SkinColor(80, 55, 40),
}

@dataclass
class FreckleConfig:
    density: float = 0.3  # 0-1
    size_min: float = 0.5
    size_max: float = 2.0
    color_variation: float = 0.2
    clustering: float = 0.5  # How much freckles cluster together
    face_concentration: float = 0.8  # Higher density on face
    shoulder_concentration: float = 0.6

@dataclass
class PoreConfig:
    density: float = 0.8
    size: float = 0.3
    depth: float = 0.5
    nose_density: float = 1.0
    cheek_density: float = 0.7
    forehead_density: float = 0.6

@dataclass
class ImperfectionConfig:
    moles: int = 3
    beauty_marks: int = 2
    subtle_scars: int = 1
    skin_variation: float = 0.1

@dataclass
class SkinTextureConfig:
    tone: SkinTone = SkinTone.FAIR
    freckles: FreckleConfig = None
    pores: PoreConfig = None
    imperfections: ImperfectionConfig = None
    subsurface_intensity: float = 0.3
    oiliness: float = 0.2
    age_spots: int = 0

    def __post_init__(self):
        if self.freckles is None:
            self.freckles = FreckleConfig()
        if self.pores is None:
            self.pores = PoreConfig()
        if self.imperfections is None:
            self.imperfections = ImperfectionConfig()


class SkinTextureGenerator:
    """Generates ultra-realistic procedural skin textures"""

    def __init__(self, config: SkinTextureConfig, width: int = 2048, height: int = 2048):
        self.config = config
        self.width = width
        self.height = height
        self.base_color = SKIN_TONES[config.tone]

        # Initialize texture buffers
        self.diffuse = [[self.base_color for _ in range(width)] for _ in range(height)]
        self.normal = [[(128, 128, 255) for _ in range(width)] for _ in range(height)]
        self.roughness = [[128 for _ in range(width)] for _ in range(height)]
        self.subsurface = [[int(config.subsurface_intensity * 255) for _ in range(width)] for _ in range(height)]

    def generate(self) -> dict:
        """Generate all texture maps"""
        print("Generating ultra-realistic skin textures...")

        # Layer 1: Base skin variation
        self._generate_skin_variation()
        print("  ✓ Base skin variation")

        # Layer 2: Pores
        self._generate_pores()
        print("  ✓ Pores")

        # Layer 3: Freckles
        self._generate_freckles()
        print("  ✓ Freckles")

        # Layer 4: Imperfections (moles, beauty marks)
        self._generate_imperfections()
        print("  ✓ Imperfections")

        # Layer 5: Fine details (wrinkles, creases)
        self._generate_fine_details()
        print("  ✓ Fine details")

        # Layer 6: Subsurface scattering map
        self._generate_subsurface()
        print("  ✓ Subsurface scattering")

        return {
            "diffuse": self.diffuse,
            "normal": self.normal,
            "roughness": self.roughness,
            "subsurface": self.subsurface,
            "width": self.width,
            "height": self.height
        }

    def _generate_skin_variation(self):
        """Add natural skin color variation"""
        variation = self.config.imperfections.skin_variation
        for y in range(self.height):
            for x in range(self.width):
                # Perlin-like noise for natural variation
                noise = self._noise(x * 0.01, y * 0.01) * variation
                color = self.diffuse[y][x]
                self.diffuse[y][x] = SkinColor(
                    max(0, min(255, int(color.r + noise * 30))),
                    max(0, min(255, int(color.g + noise * 20))),
                    max(0, min(255, int(color.b + noise * 15)))
                )

    def _generate_pores(self):
        """Generate realistic skin pores"""
        pore_cfg = self.config.pores
        num_pores = int(self.width * self.height * pore_cfg.density * 0.001)

        for _ in range(num_pores):
            x = random.randint(0, self.width - 1)
            y = random.randint(0, self.height - 1)

            # Pore affects normal map (creates depth)
            size = int(pore_cfg.size * 3)
            for dy in range(-size, size + 1):
                for dx in range(-size, size + 1):
                    px, py = x + dx, y + dy
                    if 0 <= px < self.width and 0 <= py < self.height:
                        dist = math.sqrt(dx*dx + dy*dy)
                        if dist <= size:
                            # Darken diffuse slightly
                            factor = 1 - (1 - dist/size) * 0.1
                            color = self.diffuse[py][px]
                            self.diffuse[py][px] = SkinColor(
                                int(color.r * factor),
                                int(color.g * factor),
                                int(color.b * factor)
                            )
                            # Add to roughness
                            self.roughness[py][px] = min(255, self.roughness[py][px] + 10)

    def _generate_freckles(self):
        """Generate realistic freckles with clustering"""
        freckle_cfg = self.config.freckles
        if freckle_cfg.density <= 0:
            return

        num_freckles = int(self.width * self.height * freckle_cfg.density * 0.0005)

        # Generate cluster centers
        num_clusters = max(1, num_freckles // 20)
        clusters = [(random.randint(0, self.width-1), random.randint(0, self.height-1)) 
                   for _ in range(num_clusters)]

        freckle_color = SkinColor(
            max(0, self.base_color.r - 60),
            max(0, self.base_color.g - 50),
            max(0, self.base_color.b - 40)
        )

        for _ in range(num_freckles):
            # Choose near a cluster or random
            if random.random() < freckle_cfg.clustering:
                cx, cy = random.choice(clusters)
                x = cx + int(random.gauss(0, 50))
                y = cy + int(random.gauss(0, 50))
            else:
                x = random.randint(0, self.width - 1)
                y = random.randint(0, self.height - 1)

            x = max(0, min(self.width - 1, x))
            y = max(0, min(self.height - 1, y))

            # Freckle size
            size = random.uniform(freckle_cfg.size_min, freckle_cfg.size_max)

            # Draw freckle with soft edges
            radius = int(size * 2)
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    px, py = x + dx, y + dy
                    if 0 <= px < self.width and 0 <= py < self.height:
                        dist = math.sqrt(dx*dx + dy*dy)
                        if dist <= radius:
                            # Soft falloff
                            factor = 1 - (dist / radius) ** 2
                            factor *= 0.3 + random.random() * freckle_cfg.color_variation

                            color = self.diffuse[py][px]
                            self.diffuse[py][px] = color.blend(freckle_color, factor * 0.5)

    def _generate_imperfections(self):
        """Generate moles, beauty marks, subtle scars"""
        imp_cfg = self.config.imperfections

        # Moles
        mole_color = SkinColor(60, 40, 30)
        for _ in range(imp_cfg.moles):
            x = random.randint(50, self.width - 50)
            y = random.randint(50, self.height - 50)
            size = random.randint(3, 8)

            for dy in range(-size, size + 1):
                for dx in range(-size, size + 1):
                    px, py = x + dx, y + dy
                    if 0 <= px < self.width and 0 <= py < self.height:
                        dist = math.sqrt(dx*dx + dy*dy)
                        if dist <= size:
                            factor = 1 - (dist / size) ** 2
                            color = self.diffuse[py][px]
                            self.diffuse[py][px] = color.blend(mole_color, factor * 0.8)

        # Beauty marks (lighter, smaller)
        for _ in range(imp_cfg.beauty_marks):
            x = random.randint(50, self.width - 50)
            y = random.randint(50, self.height - 50)
            size = random.randint(2, 4)

            beauty_color = SkinColor(80, 50, 40)
            for dy in range(-size, size + 1):
                for dx in range(-size, size + 1):
                    px, py = x + dx, y + dy
                    if 0 <= px < self.width and 0 <= py < self.height:
                        dist = math.sqrt(dx*dx + dy*dy)
                        if dist <= size:
                            factor = 1 - (dist / size) ** 2
                            color = self.diffuse[py][px]
                            self.diffuse[py][px] = color.blend(beauty_color, factor * 0.6)

    def _generate_fine_details(self):
        """Generate fine skin details like micro-wrinkles"""
        # Add subtle line patterns
        num_lines = 50
        for _ in range(num_lines):
            x1 = random.randint(0, self.width - 1)
            y1 = random.randint(0, self.height - 1)
            length = random.randint(10, 30)
            angle = random.random() * math.pi * 2

            for i in range(length):
                x = int(x1 + math.cos(angle) * i)
                y = int(y1 + math.sin(angle) * i)
                if 0 <= x < self.width and 0 <= y < self.height:
                    # Subtle darkening
                    color = self.diffuse[y][x]
                    factor = 0.98
                    self.diffuse[y][x] = SkinColor(
                        int(color.r * factor),
                        int(color.g * factor),
                        int(color.b * factor)
                    )

    def _generate_subsurface(self):
        """Generate subsurface scattering map"""
        # Areas with more blood flow (redder)
        for y in range(self.height):
            for x in range(self.width):
                noise = self._noise(x * 0.02, y * 0.02)
                self.subsurface[y][x] = int(self.config.subsurface_intensity * 255 * (0.8 + noise * 0.4))

    def _noise(self, x: float, y: float) -> float:
        """Simple noise function"""
        return (math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1

    def save_ppm(self, filepath: str, texture_type: str = "diffuse"):
        """Save texture as PPM image"""
        data = getattr(self, texture_type)

        with open(filepath, 'wb') as f:
            f.write(f"P6\n{self.width} {self.height}\n255\n".encode())
            for row in data:
                for pixel in row:
                    if isinstance(pixel, SkinColor):
                        f.write(bytes([pixel.r, pixel.g, pixel.b]))
                    elif isinstance(pixel, tuple):
                        f.write(bytes(pixel))
                    else:
                        f.write(bytes([pixel, pixel, pixel]))


# Preset skin configurations for each persona
PERSONA_SKIN_CONFIGS = {
    "valentina_rose": SkinTextureConfig(
        tone=SkinTone.FAIR,
        freckles=FreckleConfig(density=0.1, clustering=0.3),
        pores=PoreConfig(density=0.6),
        imperfections=ImperfectionConfig(moles=2, beauty_marks=1),
        subsurface_intensity=0.35,
        oiliness=0.15
    ),
    "emma_sweet": SkinTextureConfig(
        tone=SkinTone.LIGHT,
        freckles=FreckleConfig(density=0.5, clustering=0.7, face_concentration=0.9),
        pores=PoreConfig(density=0.5),
        imperfections=ImperfectionConfig(moles=3, beauty_marks=2),
        subsurface_intensity=0.4,
        oiliness=0.1
    ),
    "raven_hex": SkinTextureConfig(
        tone=SkinTone.PALE,
        freckles=FreckleConfig(density=0.05),
        pores=PoreConfig(density=0.4),
        imperfections=ImperfectionConfig(moles=1, beauty_marks=1),
        subsurface_intensity=0.25,
        oiliness=0.3
    ),
    "mistress_scarlett": SkinTextureConfig(
        tone=SkinTone.MEDIUM,
        freckles=FreckleConfig(density=0.0),
        pores=PoreConfig(density=0.5),
        imperfections=ImperfectionConfig(moles=2, beauty_marks=1),
        subsurface_intensity=0.3,
        oiliness=0.25
    ),
    "marcus_stone": SkinTextureConfig(
        tone=SkinTone.TAN,
        freckles=FreckleConfig(density=0.1),
        pores=PoreConfig(density=0.9),
        imperfections=ImperfectionConfig(moles=4, beauty_marks=0, subtle_scars=2),
        subsurface_intensity=0.2,
        oiliness=0.35
    )
}
