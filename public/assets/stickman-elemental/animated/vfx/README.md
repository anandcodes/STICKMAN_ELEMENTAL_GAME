# Elemental VFX Pack

This pack includes procedural VFX sprite sheets and atlases for:
- `fire`
- `water`
- `earth`
- `air`

Animations per element:
- `trail`
- `impact`
- `charge`
- `explode`

Frame size: `128x128`  
Frames per animation: `8`

## Paths
- Sheets: `assets/animated/vfx/spritesheets/png/<element>_<animation>.png`
- Atlases image: `assets/animated/vfx/atlases/png/<element>_vfx_atlas.png`
- Atlases json: `assets/animated/vfx/atlases/json/<element>_vfx_atlas.json`
- Manifest: `assets/animated/vfx/vfx-asset-manifest.json`

## Generate

```bash
python game/tools/generate_vfx_atlases.py
```
