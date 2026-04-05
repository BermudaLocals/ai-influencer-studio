# 🎭 AI Influencer Studio

**Ultra-Realistic AI Influencer Generation Platform**

Generate photorealistic 3D AI influencer models with customizable personas, export to multiple formats, and play the "Real or AI?" survey game.

---

## ✨ Features

- 🤖 **5 Pre-built AI Personas** - Valentina, Emma, Raven, Scarlett, Marcus
- 🎨 **Pure Python 3D Generation** - No external tools required
- 📦 **Multiple Export Formats** - OBJ, STL, GLTF, GLB, PLY
- 🎮 **Real or AI Survey Game** - Test your detection skills
- 💰 **Pricing Tiers** - $200 to $5,000 packages
- 🔗 **Cross-Platform Integration** - Connect multiple services

---

## 🚀 Quick Start (Windows)

### Option 1: Double-Click Launch (Easiest)

1. **Install Python 3.8+** from [python.org](https://python.org)
   - ⚠️ Check "Add Python to PATH" during installation!

2. **Extract** the ZIP file to any folder

3. **Double-click** `launch.bat`

4. **Open browser** to http://localhost:5000

---

### Option 2: PowerShell Launch

```powershell
# Navigate to the extracted folder
cd C:\path\to\ai_influencer_studio

# Run the launcher (may need to allow script execution first)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\launch.ps1
```

---

### Option 3: Manual Setup

```powershell
# 1. Open PowerShell and navigate to folder
cd C:\path\to\ai_influencer_studio

# 2. Create virtual environment
python -m venv venv

# 3. Activate it
.\venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the main app
python app.py

# 6. (Optional) In another PowerShell window, start survey app
cd survey
python app.py
```

---

## 🌐 Access URLs

| Application | URL |
|-------------|-----|
| AI Influencer Studio | http://localhost:5000 |
| Real or AI Survey | http://localhost:5050 |

---

## 📁 Project Structure

```
ai_influencer_studio/
├── app.py                 # Main Flask application
├── launch.bat             # Windows batch launcher
├── launch.ps1             # PowerShell launcher
├── requirements.txt       # Python dependencies
├── core/                  # Core mesh classes
│   └── mesh.py
├── generators/            # 3D body generation
│   └── human_body.py
├── exporters/             # Export formats
│   └── mesh_exporter.py
├── presets/               # AI persona definitions
│   └── personas.py
├── textures/              # Skin texture generation
│   └── skin_generator.py
├── survey/                # Real or AI game
│   ├── app.py
│   └── survey_system.py
├── integrations/          # Platform integrations
│   └── hub.py
├── web/                   # Web templates
│   └── templates/
└── output/                # Generated files
    ├── meshes/
    └── renders/
```

---

## 🎭 Available Personas

| Persona | Type | Description |
|---------|------|-------------|
| **Valentina Rose** | Glamorous Model | Luxury lifestyle, high fashion |
| **Emma Sweet** | Girl Next Door | Approachable, relatable content |
| **Raven Hex** | Cosplay/Alt | Anime, gaming, alternative style |
| **Mistress Scarlett** | Dominant | BDSM, power dynamics |
| **Marcus Stone** | Mature DILF | Sophisticated, experienced |

---

## 💰 Pricing Tiers

| Package | Price | Features |
|---------|-------|----------|
| Starter | $200 | 1 persona, basic exports |
| Creator | $500 | 3 personas, all formats |
| Professional | $1,500 | 5 personas, animations |
| Enterprise | $5,000 | Unlimited, custom personas |

---

## 🛠️ Troubleshooting

### "Python not found"
- Install Python from https://python.org
- Make sure to check "Add Python to PATH"
- Restart PowerShell/CMD after installation

### "Script execution disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Port already in use"
```powershell
# Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### "Module not found"
```powershell
# Make sure venv is activated and reinstall
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main web interface |
| `/api/personas` | GET | List all personas |
| `/api/generate` | POST | Generate new mesh |
| `/api/status/<id>` | GET | Check generation status |
| `/api/download/<id>` | GET | Download generated mesh |

---

## 🔧 Requirements

- Python 3.8 or higher
- 4GB RAM minimum
- Windows 10/11, macOS, or Linux

---

## 📄 License

MIT License - Free for personal and commercial use.

---

## 🤝 Support

For issues or questions, create an issue on GitHub.

---

**Made with ❤️ by AI Influencer Studio**
